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

  const updateProgress = useCallback((updates: Partial<StreamingProgress>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...updates };
      if (startTimeRef.current > 0) {
        newProgress.elapsedTime = Date.now() - startTimeRef.current;
      }
      options.onProgress?.(newProgress);
      return newProgress;
    });
  }, [options]);

  const handleEvent = useCallback((event: StreamEvent): CompleteEvent['data'] | null => {
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
        setProgress(prev => ({
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

      case 'error':
        updateProgress({
          isStreaming: false,
          phase: 'error',
          message: event.message,
        });
        options.onError?.(event.message, event.recoverable);
        break;
    }
    return null;
  }, [updateProgress, options]);

  const generate = useCallback(async (
    requestBody: Record<string, unknown>
  ): Promise<CompleteEvent['data'] | null> => {
    // Reset progress
    setProgress(initialStreamingProgress);
    startTimeRef.current = 0;

    // Create abort controller
    abortControllerRef.current = new AbortController();

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
        const { done, value } = await reader.read();

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
        updateProgress({
          isStreaming: false,
          phase: 'idle',
          message: 'Generation cancelled',
        });
        return null;
      }

      const message = error instanceof Error ? error.message : 'Generation failed';
      updateProgress({
        isStreaming: false,
        phase: 'error',
        message,
      });
      options.onError?.(message, false);
      return null;

    } finally {
      abortControllerRef.current = null;
    }
  }, [handleEvent, updateProgress, options]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
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
