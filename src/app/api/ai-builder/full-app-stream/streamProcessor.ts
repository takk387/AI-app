/**
 * SSE streaming processor for the full-app-stream route.
 * Handles the Anthropic messages.stream() call, heartbeat, and real-time chunk processing.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { StreamResult, SSEWriter } from './types';

interface StreamProcessorParams {
  anthropic: Anthropic;
  modelName: string;
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tokenBudget: { max_tokens: number; thinking_budget: number; timeout: number };
  abortController: AbortController;
  startTime: number;
  sse: SSEWriter;
}

/**
 * Stream response from Claude, emitting real-time file progress events.
 * Returns the accumulated response text and token usage, or null if streaming failed.
 */
export async function processStream(params: StreamProcessorParams): Promise<StreamResult | null> {
  const {
    anthropic,
    modelName,
    systemPrompt,
    messages,
    tokenBudget,
    abortController,
    startTime,
    sse,
  } = params;

  // Keep-alive heartbeat during Claude's thinking phase
  // Sends a "thinking" SSE event every 10s to prevent client chunk timeout
  let thinkingHeartbeat: ReturnType<typeof setInterval> | null = setInterval(async () => {
    if (!sse.isWriterClosed()) {
      try {
        await sse.writeEvent({
          type: 'thinking',
          timestamp: Date.now(),
          message: 'AI is still thinking...',
        });
      } catch {
        // Writer closed, will be cleaned up below
      }
    }
  }, 10_000);

  try {
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
        // Stop heartbeat once real chunks arrive
        if (thinkingHeartbeat) {
          clearInterval(thinkingHeartbeat);
          thinkingHeartbeat = null;
        }

        // Check if client disconnected
        if (sse.isWriterClosed()) {
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
                await sse.writeEvent({
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

                await sse.writeEvent({
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
            await sse.writeEvent({
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
        await sse.writeEvent({
          type: 'file_complete',
          timestamp: Date.now(),
          filePath: currentFilePath,
          fileIndex: fileCount,
          totalFiles: fileCount,
          charCount: 0,
        });
      }
    } catch (streamError) {
      await sse.writeEvent({
        type: 'error',
        timestamp: Date.now(),
        message: streamError instanceof Error ? streamError.message : 'Stream failed',
        recoverable: false,
      });
      await sse.closeWriter();
      return null;
    }

    if (!responseText) {
      await sse.writeEvent({
        type: 'error',
        timestamp: Date.now(),
        message: 'No response from Claude',
        code: 'EMPTY_RESPONSE',
        recoverable: true,
      });
      await sse.closeWriter();
      return null;
    }

    return {
      responseText,
      inputTokens,
      outputTokens,
      cachedTokens,
    };
  } finally {
    if (thinkingHeartbeat) {
      clearInterval(thinkingHeartbeat);
      thinkingHeartbeat = null;
    }
  }
}
