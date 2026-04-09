/**
 * useStreamingGeneration Hook
 *
 * Handles Server-Sent Events (SSE) streaming for real-time
 * progress updates during app generation.
 */

import { useState, useCallback, useRef } from 'react';
import {
  type StreamEvent,
  type StreamingProgress,
  type CompleteEvent,
  initialStreamingProgress,
  parseStreamEvent,
} from '@/types/streaming';
import { friendlyErrorMessage } from '@/utils/errorMessages';

export interface StreamingGenerationOptions {
  onStart?: () => void;
  onProgress?: (progress: StreamingProgress) => void;
  onFileStart?: (filePath: string, index: number, total: number) => void;
  onFileComplete?: (filePath: string, index: number, total: number) => void;
  onComplete?: (data: CompleteEvent['data'], stats: CompleteEvent['stats']) => void;
  onError?: (message: string, recoverable: boolean) => void;
}

export interface StreamingGenerationReturn {
  progress: StreamingProgress;
  isStreaming: boolean;
  generate: (requestBody: Record<string, unknown>) => Promise<CompleteEvent['data'] | null>;
  abort: () => void;
}

/**
 * Hook for streaming app generation with real-time progress
 */
export function useStreamingGeneration(
  options: StreamingGenerationOptions = {}
): StreamingGenerationReturn {
  const [progress, setProgress] = useState<StreamingProgress>(initialStreamingProgress);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  // Tracks whether abort was user-initiated (vs timeout-initiated)
  const userAbortedRef = useRef(false);

  const updateProgress = useCallback(
    (updates: Partial<StreamingProgress>) => {
      setProgress((prev) => {
        const newProgress = { ...prev, ...updates };
        if (startTimeRef.current > 0) {
          newProgress.elapsedTime = Date.now() - startTimeRef.current;
        }
        options.onProgress?.(newProgress);
        return newProgress;
      });
    },
    [options]
  );

  const handleEvent = useCallback(
    (event: StreamEvent): CompleteEvent['data'] | null => {
      switch (event.type) {
        case 'start':
          startTimeRef.current = Date.now();
          updateProgress({
            isStreaming: true,
            phase: 'starting',
            message: event.message,
            startTime: Date.now(),
          });
          options.onStart?.();
          break;

        case 'thinking':
          updateProgress({
            phase: 'thinking',
            message: event.message,
          });
          break;

        case 'file_start':
          updateProgress({
            phase: 'generating',
            message: `Generating ${event.filePath}...`,
            currentFile: event.filePath,
            currentFileIndex: event.fileIndex,
            totalFiles: event.totalFiles,
          });
          options.onFileStart?.(event.filePath, event.fileIndex, event.totalFiles);
          break;

        case 'file_progress':
          updateProgress({
            message: `Generating ${event.filePath}... (${Math.round(event.totalChars / 100) / 10}k chars)`,
          });
          break;

        case 'file_complete':
          setProgress((prev) => ({
            ...prev,
            filesCompleted: [...prev.filesCompleted, event.filePath],
            message: `Completed ${event.filePath}`,
            totalFiles: event.totalFiles,
          }));
          options.onFileComplete?.(event.filePath, event.fileIndex, event.totalFiles);
          break;

        case 'validation':
          updateProgress({
            phase: 'validating',
            message: event.message,
          });
          break;

        case 'complete':
          updateProgress({
            isStreaming: false,
            phase: 'complete',
            message: 'Generation complete!',
            stats: {
              inputTokens: event.stats.inputTokens,
              outputTokens: event.stats.outputTokens,
              cachedTokens: event.stats.cachedTokens,
            },
          });
          options.onComplete?.(event.data, event.stats);
          return event.data;

        case 'error': {
          const friendly = friendlyErrorMessage(event.code, event.message);
          updateProgress({
            isStreaming: false,
            phase: 'error',
            message: friendly.message,
          });
          options.onError?.(friendly.message, event.recoverable);
          break;
        }
      }
      return null;
    },
    [updateProgress, options]
  );

  const generate = useCallback(
    async (requestBody: Record<string, unknown>): Promise<CompleteEvent['data'] | null> => {
      // Timeouts: 120s between chunks (allows for extended thinking phase), 5min total
      const CHUNK_TIMEOUT_MS = 120_000;
      const TOTAL_TIMEOUT_MS = 300_000;

      // Reset progress
      setProgress(initialStreamingProgress);
      startTimeRef.current = 0;
      userAbortedRef.current = false;

      // Create abort controller
      abortControllerRef.current = new AbortController();
      const totalTimer = setTimeout(() => abortControllerRef.current?.abort(), TOTAL_TIMEOUT_MS);

      try {
        const response = await fetch('/api/ai-builder/full-app-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: CompleteEvent['data'] | null = null;

        while (true) {
          // Per-chunk timeout: abort if no data arrives within CHUNK_TIMEOUT_MS
          const chunkTimer = setTimeout(
            () => abortControllerRef.current?.abort(),
            CHUNK_TIMEOUT_MS
          );
          const { done, value } = await reader.read();
          clearTimeout(chunkTimer);

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              const event = parseStreamEvent(data);
              if (event) {
                const eventResult = handleEvent(event);
                if (eventResult) {
                  result = eventResult;
                }
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6);
          const event = parseStreamEvent(data);
          if (event) {
            const eventResult = handleEvent(event);
            if (eventResult) {
              result = eventResult;
            }
          }
        }

        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (userAbortedRef.current) {
            updateProgress({
              isStreaming: false,
              phase: 'idle',
              message: 'Generation cancelled',
            });
          } else {
            const friendly = friendlyErrorMessage(undefined, 'timeout');
            updateProgress({
              isStreaming: false,
              phase: 'error',
              message: friendly.message,
            });
            options.onError?.(friendly.message, true);
          }
          return null;
        }

        const rawMessage = error instanceof Error ? error.message : 'Generation failed';
        const friendly = friendlyErrorMessage(undefined, rawMessage);
        updateProgress({
          isStreaming: false,
          phase: 'error',
          message: friendly.message,
        });
        options.onError?.(friendly.message, false);
        return null;
      } finally {
        clearTimeout(totalTimer);
        abortControllerRef.current = null;
      }
    },
    [handleEvent, updateProgress, options]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      userAbortedRef.current = true;
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    progress,
    isStreaming: progress.isStreaming,
    generate,
    abort,
  };
}

export default useStreamingGeneration;
