/**
 * Streaming Full-App Generation Route
 *
 * Provides real-time progress updates via Server-Sent Events (SSE)
 * during app generation for improved user experience on large apps.
 */

import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import { buildFullAppPrompt } from '@/prompts/builder';
import {
  analytics,
  generateRequestId,
  categorizeError,
  PerformanceTracker,
} from '@/utils/analytics';
import { type StreamEvent, formatSSE, type CompleteEvent } from '@/types/streaming';
import {
  detectTruncation,
  getTokenBudget,
  type PhaseContext,
  type Phase,
} from '../full-app/generation-logic';
import { generateDesignFilesArray } from '@/utils/designSystemGenerator';
import type { LayoutDesign } from '@/types/layoutDesign';

// Vercel serverless function config
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();
  const startTime = Date.now();

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

  // Start the generation in the background
  (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestBody: any;

    try {
      // Parse request body with error handling
      try {
        requestBody = await request.json();
      } catch (parseError) {
        await writeEvent({
          type: 'error',
          timestamp: Date.now(),
          message:
            'Invalid request: ' +
            (parseError instanceof Error ? parseError.message : 'Failed to parse JSON'),
          code: 'INVALID_REQUEST',
          recoverable: false,
        });
        await closeWriter();
        return;
      }

      const {
        prompt,
        conversationHistory,
        contextSummary,
        isModification,
        currentAppName,
        image,
        hasImage,
        isPhaseBuilding,
        phaseContext: rawPhaseContext,
        currentAppState,
        layoutDesign,
      } = requestBody as {
        prompt: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        contextSummary?: string; // Compressed context from older messages
        isModification?: boolean;
        currentAppName?: string;
        image?: string;
        hasImage?: boolean;
        isPhaseBuilding?: boolean;
        phaseContext?: {
          phaseNumber?: number;
          phaseName?: string;
          previousPhaseCode?: string | null;
          allPhases?: Phase[];
          completedPhases?: number[];
          cumulativeFeatures?: string[];
        };
        currentAppState?: {
          name?: string;
          appType?: string;
          files?: Array<{ path: string; content: string }>;
        };
        layoutDesign?: LayoutDesign;
      };

      perfTracker.checkpoint('request_parsed');

      // Send start event
      await writeEvent({
        type: 'start',
        timestamp: Date.now(),
        message: 'Starting app generation...',
        phaseNumber: rawPhaseContext?.phaseNumber,
        phaseName: rawPhaseContext?.phaseName,
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
        hasConversationHistory: !!conversationHistory,
        isModification: !!isModification,
        hasImage: !!hasImage,
        isPhaseBuilding: !!isPhaseBuilding,
        phaseNumber: rawPhaseContext?.phaseNumber,
      });

      // Build current app context
      let currentAppContext = '';
      if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
        currentAppContext = `

===CURRENT APP CONTEXT===
The user has an existing app loaded. Here is the current state:

App Name: ${currentAppState.name || 'Unnamed App'}
App Type: ${currentAppState.appType || 'Unknown'}
Files in the app:
${currentAppState.files.map((f: { path: string }) => `- ${f.path}`).join('\n')}

FILE CONTENTS:
${currentAppState.files
  .map(
    (f: { path: string; content: string }) => `
--- ${f.path} ---
${f.content}
--- END ${f.path} ---
`
  )
  .join('\n')}
===END CURRENT APP CONTEXT===

When building new features or making changes, reference the actual code above. Preserve existing functionality unless explicitly asked to change it.`;
      }

      const baseInstructions = `You are an expert FULL-STACK Next.js application architect. Generate complete, production-ready applications with both frontend AND backend capabilities.

## QUALITY-FIRST REQUIREMENT
Generate production-ready code that passes quality review on FIRST generation.
Your code will be automatically reviewed for:
- React hooks violations (CRITICAL - blocks build)
- Missing key props in lists (HIGH)
- Security vulnerabilities (CRITICAL - blocks build)
- Performance anti-patterns (MEDIUM)
- Incomplete error handling (MEDIUM)

Generate code that passes ALL checks. Do NOT rely on post-generation fixes.

## PRODUCTION FEATURES (REQUIRED IN ALL APPS)
1. ErrorBoundary: Wrap main App component in ErrorBoundary with fallback UI and retry button
2. Accessibility: Semantic HTML (nav, main, section, footer), ARIA labels, keyboard navigation
3. SEO: Include <title> and <meta name="description"> tags
4. Loading States: Show spinner or skeleton while fetching data
5. Error States: Handle errors gracefully with user-friendly messages and retry options
${currentAppContext ? '\nIMPORTANT: The user has an existing app loaded. See CURRENT APP CONTEXT at the end of this prompt. When adding features, integrate with the existing code structure.' : ''}

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games (preview sandbox)
- FULL_STACK: Database, auth, API routes (local dev required)

COMPLEX APPS - STAGING STRATEGY:
- Target 8K-10K tokens for Stage 1 (core architecture + 2-3 features)
- Build complete apps through conversation, not simplified versions
- NEVER truncate code mid-line/tag/string/function
- Stage 1: Solid foundation, invite extensions
- Conversational descriptions: "I've created your [app]! Want to add [X], [Y], [Z]?"

${
  isModification
    ? `
MODIFICATION MODE for "${currentAppName}":
- Classify: MAJOR_CHANGE (new features, redesigns) or MINOR_CHANGE (bug fixes, tweaks)
- PRESERVE all existing UI/styling/functionality not mentioned
- Use EXACT delimiter format (===NAME===, ===FILE:===, etc.)
`
    : ''
}${currentAppContext}`;

      const systemPrompt = buildFullAppPrompt(
        baseInstructions,
        hasImage,
        isModification,
        layoutDesign
      );
      perfTracker.checkpoint('prompt_built');

      // Build conversation context
      const messages: Anthropic.MessageParam[] = [];

      // Add compressed context summary if available (provides context from older messages)
      if (contextSummary) {
        messages.push({
          role: 'user',
          content: `[Context from earlier conversation]\n${contextSummary}`,
        });
        messages.push({
          role: 'assistant',
          content: 'I understand the context. Proceeding with the request.',
        });
      }

      if (conversationHistory && Array.isArray(conversationHistory)) {
        conversationHistory.forEach((msg: { role: string; content: string }) => {
          if (msg.role === 'user') {
            messages.push({ role: 'user', content: msg.content });
          } else if (msg.role === 'assistant') {
            messages.push({ role: 'assistant', content: msg.content });
          }
        });
      }

      // Add user message with optional image
      if (hasImage && image) {
        const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (imageMatch) {
          const mediaType = imageMatch[1] as
            | 'image/jpeg'
            | 'image/png'
            | 'image/gif'
            | 'image/webp';
          const base64Data = imageMatch[2];

          messages.push({
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          });
        } else {
          messages.push({ role: 'user', content: prompt });
        }
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      // Build phase context
      const phaseContext: PhaseContext | undefined =
        isPhaseBuilding && rawPhaseContext
          ? {
              phaseNumber: rawPhaseContext.phaseNumber || 1,
              previousPhaseCode: rawPhaseContext.previousPhaseCode || null,
              allPhases: rawPhaseContext.allPhases || [],
              completedPhases: rawPhaseContext.completedPhases || [],
              cumulativeFeatures: rawPhaseContext.cumulativeFeatures || [],
            }
          : undefined;

      const modelName = 'claude-sonnet-4-5-20250929';
      const phaseNumber = phaseContext?.phaseNumber || 1;
      const tokenBudget = getTokenBudget(phaseNumber);

      // Send thinking event
      await writeEvent({
        type: 'thinking',
        timestamp: Date.now(),
        message: 'AI is analyzing your request and planning the app structure...',
      });

      perfTracker.checkpoint('ai_request_sent');

      // Check if client disconnected before starting expensive AI call
      if (writerClosed) {
        return;
      }

      // Stream from Claude with abort signal
      const aiStream = await anthropic.messages.stream({
        model: modelName,
        max_tokens: tokenBudget.max_tokens,
        temperature: 1,
        thinking: {
          type: 'enabled',
          budget_tokens: tokenBudget.thinking_budget,
        },
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      });

      // Monitor abort signal and cancel AI stream if needed
      abortController.signal.addEventListener('abort', () => {
        aiStream.abort();
      });

      // Collect response with real-time progress
      let responseText = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let cachedTokens = 0;
      let currentFilePath: string | null = null;
      let fileCount = 0;
      let lastProgressUpdate = Date.now();
      let lastFileCheckPosition = 0; // Track where we've checked for file markers
      const timeout = tokenBudget.timeout;

      try {
        for await (const chunk of aiStream) {
          // Check if client disconnected
          if (writerClosed) {
            break;
          }

          // Check timeout
          if (Date.now() - startTime > timeout) {
            throw new Error(`AI response timeout after ${timeout / 1000}s`);
          }

          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            responseText += text;

            // Check for file markers in the accumulated response (handles markers spanning chunks)
            // Only check the new portion plus some overlap for partial markers
            const searchStart = Math.max(0, lastFileCheckPosition - 50);
            const searchText = responseText.slice(searchStart);

            // Use a safe regex match with bounds checking
            let match;
            const fileRegex = /===FILE:(.*?)===/g;
            fileRegex.lastIndex = 0;

            while ((match = fileRegex.exec(searchText)) !== null) {
              const matchPosition = searchStart + match.index;

              // Only process if this is a new match we haven't seen
              if (matchPosition >= lastFileCheckPosition) {
                const newFilePath = match[1].trim();

                // If we were working on a file, mark it complete
                if (currentFilePath && currentFilePath !== newFilePath) {
                  await writeEvent({
                    type: 'file_complete',
                    timestamp: Date.now(),
                    filePath: currentFilePath,
                    fileIndex: fileCount,
                    totalFiles: fileCount + 1,
                    charCount: 0,
                  });
                }

                if (currentFilePath !== newFilePath) {
                  fileCount++;
                  currentFilePath = newFilePath;

                  await writeEvent({
                    type: 'file_start',
                    timestamp: Date.now(),
                    filePath: newFilePath,
                    fileIndex: fileCount,
                    totalFiles: fileCount,
                  });
                }
              }
            }
            lastFileCheckPosition = responseText.length;

            // Send progress updates every 500ms during generation
            if (Date.now() - lastProgressUpdate > 500 && currentFilePath) {
              await writeEvent({
                type: 'file_progress',
                timestamp: Date.now(),
                filePath: currentFilePath,
                chunkSize: text.length,
                totalChars: responseText.length,
              });
              lastProgressUpdate = Date.now();
            }
          }

          // Capture token usage from final message
          if (chunk.type === 'message_stop') {
            const finalMessage = await aiStream.finalMessage();
            inputTokens = finalMessage.usage.input_tokens || 0;
            outputTokens = finalMessage.usage.output_tokens || 0;
            cachedTokens = finalMessage.usage.cache_read_input_tokens || 0;
          }
        }

        // Mark last file complete
        if (currentFilePath) {
          await writeEvent({
            type: 'file_complete',
            timestamp: Date.now(),
            filePath: currentFilePath,
            fileIndex: fileCount,
            totalFiles: fileCount,
            charCount: 0,
          });
        }
      } catch (streamError) {
        await writeEvent({
          type: 'error',
          timestamp: Date.now(),
          message: streamError instanceof Error ? streamError.message : 'Stream failed',
          recoverable: false,
        });
        await closeWriter();
        return;
      }

      perfTracker.checkpoint('ai_response_received');

      if (!responseText) {
        await writeEvent({
          type: 'error',
          timestamp: Date.now(),
          message: 'No response from Claude',
          code: 'EMPTY_RESPONSE',
          recoverable: true,
        });
        await closeWriter();
        return;
      }

      // Parse response
      const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===/);
      const descriptionMatch = responseText.match(/===DESCRIPTION===\s*([\s\S]*?)\s*===/);
      const appTypeMatch = responseText.match(/===APP_TYPE===\s*([\s\S]*?)\s*===/);
      const changeTypeMatch = responseText.match(/===CHANGE_TYPE===\s*([\s\S]*?)\s*===/);
      const changeSummaryMatch = responseText.match(/===CHANGE_SUMMARY===\s*([\s\S]*?)\s*===/);
      const dependenciesMatch = responseText.match(/===DEPENDENCIES===\s*([\s\S]*?)\s*===/);
      const setupMatch = responseText.match(/===SETUP===\s*([\s\S]*?)===END===/);

      if (!nameMatch || !descriptionMatch) {
        await writeEvent({
          type: 'error',
          timestamp: Date.now(),
          message: 'Invalid response format - missing required delimiters',
          code: 'PARSE_ERROR',
          recoverable: true,
        });
        await closeWriter();
        return;
      }

      const name = nameMatch[1].trim().split('\n')[0].trim();
      const descriptionText = descriptionMatch[1].trim().split('\n')[0].trim();
      const appType = appTypeMatch ? appTypeMatch[1].trim().split('\n')[0].trim() : 'FRONTEND_ONLY';

      // Extract files
      const fileMatches = responseText.matchAll(
        /===FILE:([\s\S]*?)===\s*([\s\S]*?)(?====FILE:|===DEPENDENCIES===|===SETUP===|===END===|$)/g
      );
      const files: Array<{ path: string; content: string; description: string }> = [];

      for (const match of fileMatches) {
        const path = match[1].trim();
        const content = match[2].trim();
        files.push({
          path,
          content,
          description: `${path.split('/').pop()} file`,
        });
      }

      if (files.length === 0) {
        await writeEvent({
          type: 'error',
          timestamp: Date.now(),
          message: 'No files generated in response',
          code: 'NO_FILES',
          recoverable: true,
        });
        await closeWriter();
        return;
      }

      // Check for truncation
      const truncationInfo = detectTruncation(responseText, files);
      if (truncationInfo.isTruncated && truncationInfo.salvageableFiles > 0) {
        const completeFiles = files.slice(0, truncationInfo.salvageableFiles);
        files.length = 0;
        files.push(...completeFiles);
      }

      // Validation
      await writeEvent({
        type: 'validation',
        timestamp: Date.now(),
        message: 'Validating generated code...',
        filesValidated: 0,
        totalFiles: files.length,
        errorsFound: 0,
        autoFixed: 0,
      });

      const validationErrors: Array<{ file: string; errors: ValidationError[] }> = [];
      let totalErrors = 0;
      let autoFixedCount = 0;

      for (let i = 0; i < files.length; i++) {
        // Check if client disconnected
        if (writerClosed) {
          break;
        }

        const file = files[i];
        if (
          file.path.endsWith('.tsx') ||
          file.path.endsWith('.ts') ||
          file.path.endsWith('.jsx') ||
          file.path.endsWith('.js')
        ) {
          try {
            const validation = await validateGeneratedCode(file.content, file.path);

            if (!validation.valid) {
              totalErrors += validation.errors.length;

              const fixedCode = autoFixCode(file.content, validation.errors);
              if (fixedCode !== file.content) {
                file.content = fixedCode;
                autoFixedCount += validation.errors.filter(
                  (e) => e.type === 'UNCLOSED_STRING'
                ).length;

                const revalidation = await validateGeneratedCode(fixedCode, file.path);
                if (!revalidation.valid) {
                  validationErrors.push({ file: file.path, errors: revalidation.errors });
                }
              } else {
                validationErrors.push({ file: file.path, errors: validation.errors });
              }
            }
          } catch (validationError) {
            console.error(`Validation error for ${file.path}:`, validationError);
            // Continue with other files even if one fails validation
          }
        }

        // Update validation progress
        await writeEvent({
          type: 'validation',
          timestamp: Date.now(),
          message: `Validated ${file.path}`,
          filesValidated: i + 1,
          totalFiles: files.length,
          errorsFound: totalErrors,
          autoFixed: autoFixedCount,
        });
      }

      perfTracker.checkpoint('validation_complete');

      // Inject design system files if layoutDesign is provided
      if (layoutDesign) {
        const designFiles = generateDesignFilesArray(layoutDesign);
        const existingPaths = new Set(files.map((f) => f.path));
        const filesToAdd = designFiles.filter((df) => !existingPaths.has(df.path));
        const filesToReplace = designFiles.filter((df) => existingPaths.has(df.path));

        // Replace existing files with design system versions
        for (let i = 0; i < files.length; i++) {
          const replacement = filesToReplace.find((df) => df.path === files[i].path);
          if (replacement) {
            files[i] = {
              ...files[i],
              content: replacement.content,
              description: `Design system: ${files[i].path}`,
            };
          }
        }

        // Add new design files at the beginning
        files.unshift(
          ...filesToAdd.map((df) => ({
            path: df.path,
            content: df.content,
            description: `Design system: ${df.path}`,
          }))
        );
      }

      // Parse dependencies
      const dependencies: Record<string, string> = {};
      if (dependenciesMatch) {
        const depsText = dependenciesMatch[1].trim();
        const depsLines = depsText.split('\n');
        for (const line of depsLines) {
          const [pkg, version] = line.split(':').map((s) => s.trim());
          if (pkg && version) {
            dependencies[pkg] = version;
          }
        }
      }

      const changeType = changeTypeMatch
        ? changeTypeMatch[1].trim().split('\n')[0].trim()
        : 'NEW_APP';
      const changeSummary = changeSummaryMatch ? changeSummaryMatch[1].trim() : '';
      const setupInstructions = setupMatch
        ? setupMatch[1].trim()
        : 'Run npm install && npm run dev';

      const validationWarnings =
        validationErrors.length > 0
          ? {
              hasWarnings: true,
              message: `Code validation detected ${totalErrors - autoFixedCount} potential issue(s).`,
              details: validationErrors,
            }
          : undefined;

      // Send complete event with all data
      const completeEvent: CompleteEvent = {
        type: 'complete',
        timestamp: Date.now(),
        success: true,
        data: {
          name,
          description: descriptionText,
          appType,
          changeType,
          changeSummary,
          files,
          dependencies,
          setupInstructions,
          validationWarnings,
        },
        stats: {
          totalTime: Date.now() - startTime,
          filesGenerated: files.length,
          inputTokens,
          outputTokens,
          cachedTokens,
        },
      };

      await writeEvent(completeEvent);

      // Log successful completion (wrapped in try-catch to avoid masking errors)
      try {
        analytics.logRequestComplete(requestId, {
          modelUsed: modelName,
          promptLength: Math.round(systemPrompt.length / 4),
          responseLength: responseText.length,
          validationRan: true,
          validationIssuesFound: totalErrors,
          validationIssuesFixed: autoFixedCount,
          metadata: {
            appName: name,
            appType: appType,
            changeType: changeType,
            isModification: isModification,
            hasImage: hasImage,
            filesGenerated: files.length,
            hasDependencies: Object.keys(dependencies).length > 0,
            streaming: true,
          },
        });
      } catch (analyticsError) {
        console.error('Analytics logging failed:', analyticsError);
        // Don't fail the request due to analytics
      }

      if (process.env.NODE_ENV === 'development') {
        try {
          perfTracker.log('Full-App-Stream Route');
        } catch (perfError) {
          console.error('Performance tracking failed:', perfError);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);

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
      await closeWriter();
    }
  })();

  // Return the readable stream as SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
