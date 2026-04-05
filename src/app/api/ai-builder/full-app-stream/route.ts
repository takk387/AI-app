/**
 * Streaming Full-App Generation Route
 *
 * Provides real-time progress updates via Server-Sent Events (SSE)
 * during app generation for improved user experience on large apps.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createSSEResponse } from '@/lib/createSSEResponse';
import {
  analytics,
  generateRequestId,
  categorizeError,
  PerformanceTracker,
} from '@/utils/analytics';
import { createObservableRequest } from '@/lib/observability';
import { type StreamEvent, formatSSE } from '@/types/streaming';
import type { SSEWriter } from './types';
import { validateRequest } from './requestValidator';
import { assemblePrompt } from './promptAssembler';
import { parseResponse, validateFiles, buildCompleteEvent } from './responseParser';
import { processStream } from './streamProcessor';
import { processAgentic } from './agenticProcessor';

// Next.js Route Segment Config
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Global timeout for entire SSE operation (10 minutes for large apps)
const GLOBAL_TIMEOUT_MS = 10 * 60 * 1000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();
  const startTime = Date.now();
  const obs = createObservableRequest('/api/ai-builder/full-app-stream');

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let writerClosed = false;

  // Create abort controller for AI stream cancellation
  const abortController = new AbortController();

  // Helper to write events (checks if writer is still open)
  const writeEvent = async (event: StreamEvent) => {
    if (!writerClosed) {
      try {
        await writer.write(encoder.encode(formatSSE(event)));
      } catch {
        // Writer was closed (client likely disconnected), mark it and abort AI stream
        writerClosed = true;
        abortController.abort('Client disconnected');
      }
    }
  };

  // Helper to close writer safely (only once)
  const closeWriter = async () => {
    if (!writerClosed) {
      writerClosed = true;
      abortController.abort('Stream closing');
      try {
        await writer.close();
      } catch {
        // Already closed, ignore
      }
    }
  };

  const sse: SSEWriter = {
    writeEvent,
    closeWriter,
    isWriterClosed: () => writerClosed,
  };

  // Start the generation in the background
  (async () => {
    // Global timeout - abort if entire operation takes too long
    const globalTimeoutId = setTimeout(() => {
      abortController.abort('Global timeout exceeded');
    }, GLOBAL_TIMEOUT_MS);

    try {
      // Step 1: Validate request
      const validatedRequest = await validateRequest(request, sse);
      if (!validatedRequest) return;

      perfTracker.checkpoint('request_parsed');

      // Send start event
      await writeEvent({
        type: 'start',
        timestamp: Date.now(),
        message: 'Starting app generation...',
        phaseNumber: validatedRequest.rawPhaseContext?.phaseNumber,
        phaseName: validatedRequest.rawPhaseContext?.phaseName,
      });

      if (!process.env.ANTHROPIC_API_KEY) {
        await writeEvent({
          type: 'error',
          timestamp: Date.now(),
          message: 'Anthropic API key not configured',
          code: 'NO_API_KEY',
          recoverable: false,
        });
        await closeWriter();
        return;
      }

      // Log request start
      analytics.logRequestStart('ai-builder/full-app-stream', requestId, {
        hasConversationHistory: !!validatedRequest.conversationHistory,
        isModification: !!validatedRequest.isModification,
        hasImage: !!validatedRequest.hasImage,
        isPhaseBuilding: !!validatedRequest.isPhaseBuilding,
        phaseNumber: validatedRequest.rawPhaseContext?.phaseNumber,
      });

      // Step 2: Assemble prompt
      const assembled = assemblePrompt(validatedRequest);
      perfTracker.checkpoint('prompt_built');

      // Send thinking event
      await writeEvent({
        type: 'thinking',
        timestamp: Date.now(),
        message: validatedRequest.useAgenticValidation
          ? 'AI is analyzing your request with real-time validation...'
          : 'AI is analyzing your request and planning the app structure...',
      });

      perfTracker.checkpoint('ai_request_sent');

      // Check if client disconnected before starting expensive AI call
      if (writerClosed) return;

      // Step 3: Generate response (agentic or streaming path)
      const gen = obs.startGeneration('full-app-stream', {
        model: assembled.modelName,
        input: `[${assembled.messages.length} messages]`,
        modelParameters: { tokenBudget: assembled.tokenBudget },
      });

      let streamResult;

      if (validatedRequest.useAgenticValidation) {
        streamResult = await processAgentic({
          anthropic,
          modelName: assembled.modelName,
          systemPrompt: assembled.systemPrompt,
          messages: assembled.messages,
          tokenBudget: assembled.tokenBudget,
          sse,
        });

        if (!streamResult) {
          clearTimeout(globalTimeoutId);
          await closeWriter();
          return;
        }

        // Send file events for agentic response (parsed after the fact)
        const fileMatches = streamResult.responseText.matchAll(/===FILE:([\s\S]*?)===\s*/g);
        let fileIdx = 0;
        for (const match of fileMatches) {
          fileIdx++;
          await writeEvent({
            type: 'file_complete',
            timestamp: Date.now(),
            filePath: match[1].trim(),
            fileIndex: fileIdx,
            totalFiles: fileIdx,
            charCount: 0,
          });
        }
      } else {
        streamResult = await processStream({
          anthropic,
          modelName: assembled.modelName,
          systemPrompt: assembled.systemPrompt,
          messages: assembled.messages,
          tokenBudget: assembled.tokenBudget,
          abortController,
          startTime,
          sse,
        });

        if (!streamResult) {
          clearTimeout(globalTimeoutId);
          return; // streamProcessor already closed the writer
        }
      }

      perfTracker.checkpoint('ai_response_received');

      gen.end({
        output: `[${streamResult.responseText.length} chars]`,
        usage: {
          input: streamResult.inputTokens,
          output: streamResult.outputTokens,
        },
      });

      // Step 4: Parse response
      const parsed = await parseResponse(streamResult.responseText, sse);
      if (!parsed) {
        clearTimeout(globalTimeoutId);
        return; // parseResponse already closed the writer
      }

      // Step 5: Validate generated code
      const validationMessage = validatedRequest.useAgenticValidation
        ? 'Running post-generation validation (safety net)...'
        : 'Validating generated code...';
      const validationResults = await validateFiles(parsed.files, sse, validationMessage);

      perfTracker.checkpoint('validation_complete');

      // TODO: Design system file injection pending migration to LayoutManifest
      // if (layoutManifest) {
      //   const designFiles = generateDesignFilesArray(layoutManifest);
      //   ... (disabled until generateDesignFilesArray is migrated)
      // }

      // Step 6: Build and send complete event
      const completeEvent = buildCompleteEvent(parsed, streamResult, startTime, validationResults);
      await writeEvent(completeEvent);

      // Log successful completion (wrapped in try-catch to avoid masking errors)
      try {
        analytics.logRequestComplete(requestId, {
          modelUsed: assembled.modelName,
          promptLength: Math.round(assembled.systemPrompt.length / 4),
          responseLength: streamResult.responseText.length,
          validationRan: true,
          validationIssuesFound: validationResults.totalErrors,
          validationIssuesFixed: validationResults.autoFixedCount,
          metadata: {
            appName: parsed.name,
            appType: parsed.appType,
            changeType: parsed.changeType,
            isModification: validatedRequest.isModification,
            hasImage: validatedRequest.hasImage,
            filesGenerated: parsed.files.length,
            hasDependencies: Object.keys(parsed.dependencies).length > 0,
            streaming: !validatedRequest.useAgenticValidation,
            ...(validatedRequest.useAgenticValidation && {
              agenticMode: true,
              agenticToolCalls: streamResult.agenticToolCalls,
            }),
          },
        });
      } catch (analyticsError) {
        console.error('Analytics logging failed:', analyticsError);
      }

      if (process.env.NODE_ENV === 'development') {
        try {
          const label = validatedRequest.useAgenticValidation
            ? 'Full-App-Stream Route (Agentic)'
            : 'Full-App-Stream Route';
          perfTracker.log(label);
        } catch (perfError) {
          console.error('Performance tracking failed:', perfError);
        }
      }
    } catch (error) {
      obs.captureError(error);

      // Log error (wrapped to avoid masking original error)
      try {
        analytics.logRequestError(requestId, error as Error, categorizeError(error as Error));
      } catch (analyticsError) {
        console.error('Analytics error logging failed:', analyticsError);
      }

      // Try to send error event if writer still open
      await writeEvent({
        type: 'error',
        timestamp: Date.now(),
        message: error instanceof Error ? error.message : 'Generation failed',
        recoverable: false,
      });
    } finally {
      clearTimeout(globalTimeoutId);
      await obs.finish();
      await closeWriter();
    }
  })();

  // Return the readable stream as SSE response
  return createSSEResponse(stream.readable);
}
