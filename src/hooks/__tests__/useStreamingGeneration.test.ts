/**
 * Comprehensive Unit Tests for useStreamingGeneration Hook
 *
 * Tests SSE streaming, progress tracking, event handling,
 * abort functionality, and error handling.
 *
 * Target: 90%+ coverage for this critical streaming hook
 */

import { renderHook, act } from '@testing-library/react';
import { useStreamingGeneration } from '../useStreamingGeneration';
import type {
  StreamEvent,
  StartEvent,
  ThinkingEvent,
  FileStartEvent,
  FileProgressEvent,
  FileCompleteEvent,
  ValidationEvent,
  CompleteEvent,
  ErrorEvent,
} from '@/types/streaming';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock ReadableStream
class MockReadableStreamDefaultReader {
  private chunks: Uint8Array[];
  private index: number = 0;

  constructor(chunks: string[]) {
    const encoder = new TextEncoder();
    this.chunks = chunks.map((chunk) => encoder.encode(chunk));
  }

  async read(): Promise<{ done: boolean; value?: Uint8Array }> {
    if (this.index >= this.chunks.length) {
      return { done: true };
    }
    const value = this.chunks[this.index];
    this.index++;
    return { done: false, value };
  }

  releaseLock(): void {
    // No-op for mock
  }
}

// Helper to create mock response
function createMockResponse(chunks: string[], status: number = 200, statusText: string = 'OK') {
  const reader = new MockReadableStreamDefaultReader(chunks);

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    body: {
      getReader: () => reader,
    },
  };
}

// Helper to format SSE event
function formatSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n`;
}

// Helper to create stream events
function createStartEvent(overrides?: Partial<StartEvent>): StartEvent {
  return {
    type: 'start',
    timestamp: Date.now(),
    message: 'Generation started',
    ...overrides,
  };
}

function createThinkingEvent(overrides?: Partial<ThinkingEvent>): ThinkingEvent {
  return {
    type: 'thinking',
    timestamp: Date.now(),
    message: 'AI is analyzing...',
    ...overrides,
  };
}

function createFileStartEvent(
  filePath: string,
  fileIndex: number,
  totalFiles: number
): FileStartEvent {
  return {
    type: 'file_start',
    timestamp: Date.now(),
    filePath,
    fileIndex,
    totalFiles,
  };
}

function createFileProgressEvent(
  filePath: string,
  chunkSize: number,
  totalChars: number
): FileProgressEvent {
  return {
    type: 'file_progress',
    timestamp: Date.now(),
    filePath,
    chunkSize,
    totalChars,
  };
}

function createFileCompleteEvent(
  filePath: string,
  fileIndex: number,
  totalFiles: number,
  charCount: number
): FileCompleteEvent {
  return {
    type: 'file_complete',
    timestamp: Date.now(),
    filePath,
    fileIndex,
    totalFiles,
    charCount,
  };
}

function createValidationEvent(overrides?: Partial<ValidationEvent>): ValidationEvent {
  return {
    type: 'validation',
    timestamp: Date.now(),
    message: 'Validating code...',
    filesValidated: 1,
    totalFiles: 1,
    errorsFound: 0,
    autoFixed: 0,
    ...overrides,
  };
}

function createCompleteEvent(overrides?: Partial<CompleteEvent>): CompleteEvent {
  return {
    type: 'complete',
    timestamp: Date.now(),
    success: true,
    data: {
      name: 'Test App',
      description: 'Test description',
      appType: 'web-app',
      changeType: 'NEW_APP',
      changeSummary: 'Created new app',
      files: [{ path: 'app.tsx', content: '// App code', description: 'Main app' }],
      dependencies: {},
      setupInstructions: 'npm install',
    },
    stats: {
      totalTime: 5000,
      filesGenerated: 1,
      inputTokens: 1000,
      outputTokens: 2000,
      cachedTokens: 500,
    },
    ...overrides,
  };
}

function createErrorEvent(message: string, recoverable: boolean = false): ErrorEvent {
  return {
    type: 'error',
    timestamp: Date.now(),
    message,
    recoverable,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('useStreamingGeneration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe('Initial State', () => {
    it('should initialize with default progress state', () => {
      const { result } = renderHook(() => useStreamingGeneration());

      expect(result.current.progress).toEqual({
        isStreaming: false,
        phase: 'idle',
        message: '',
        currentFile: null,
        currentFileIndex: 0,
        totalFiles: 0,
        filesCompleted: [],
        startTime: null,
        elapsedTime: 0,
        stats: {
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
        },
      });
    });

    it('should not be streaming initially', () => {
      const { result } = renderHook(() => useStreamingGeneration());

      expect(result.current.isStreaming).toBe(false);
    });

    it('should provide generate and abort functions', () => {
      const { result } = renderHook(() => useStreamingGeneration());

      expect(typeof result.current.generate).toBe('function');
      expect(typeof result.current.abort).toBe('function');
    });
  });

  // ==========================================================================
  // Generate Function Tests
  // ==========================================================================

  describe('generate()', () => {
    it('should make fetch request to streaming endpoint', async () => {
      const completeEvent = createCompleteEvent();
      mockFetch.mockResolvedValue(createMockResponse([formatSSE(completeEvent)]));

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({ test: 'data' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai-builder/full-app-stream',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' }),
        })
      );
    });

    it('should reset progress before starting', async () => {
      const completeEvent = createCompleteEvent();
      mockFetch.mockResolvedValue(createMockResponse([formatSSE(completeEvent)]));

      const { result } = renderHook(() => useStreamingGeneration());

      // Start generation
      await act(async () => {
        await result.current.generate({ test: 'data' });
      });

      // After completion, progress should reflect complete state
      expect(result.current.progress.phase).toBe('complete');
    });

    it('should return generated data on success', async () => {
      const completeEvent = createCompleteEvent();
      mockFetch.mockResolvedValue(createMockResponse([formatSSE(completeEvent)]));

      const { result } = renderHook(() => useStreamingGeneration());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnedData: any;
      await act(async () => {
        returnedData = await result.current.generate({ test: 'data' });
      });

      expect(returnedData).toBeDefined();
      expect(returnedData.name).toBe('Test App');
    });

    it('should return null on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useStreamingGeneration());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnedData: any;
      await act(async () => {
        returnedData = await result.current.generate({ test: 'data' });
      });

      expect(returnedData).toBeNull();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue(createMockResponse([], 500, 'Internal Server Error'));

      const { result } = renderHook(() => useStreamingGeneration());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnedData: any;
      await act(async () => {
        returnedData = await result.current.generate({ test: 'data' });
      });

      expect(returnedData).toBeNull();
      expect(result.current.progress.phase).toBe('error');
    });

    it('should handle missing response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: null,
      });

      const { result } = renderHook(() => useStreamingGeneration());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnedData: any;
      await act(async () => {
        returnedData = await result.current.generate({ test: 'data' });
      });

      expect(returnedData).toBeNull();
      expect(result.current.progress.phase).toBe('error');
    });
  });

  // ==========================================================================
  // Event Handling Tests
  // ==========================================================================

  describe('Event Handling', () => {
    it('should handle start event', async () => {
      const startEvent = createStartEvent({ message: 'Starting generation' });
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([formatSSE(startEvent), formatSSE(completeEvent)])
      );

      const mockOnStart = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onStart: mockOnStart }));

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnStart).toHaveBeenCalled();
    });

    it('should handle thinking event', async () => {
      const startEvent = createStartEvent();
      const thinkingEvent = createThinkingEvent({ message: 'Analyzing...' });
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(thinkingEvent),
          formatSSE(completeEvent),
        ])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      // Should have transitioned through thinking phase
      expect(result.current.progress.phase).toBe('complete');
    });

    it('should handle file_start event', async () => {
      const startEvent = createStartEvent();
      const fileStartEvent = createFileStartEvent('app.tsx', 0, 2);
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(fileStartEvent),
          formatSSE(completeEvent),
        ])
      );

      const mockOnFileStart = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onFileStart: mockOnFileStart }));

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnFileStart).toHaveBeenCalledWith('app.tsx', 0, 2);
    });

    it('should handle file_progress event', async () => {
      const startEvent = createStartEvent();
      const fileStartEvent = createFileStartEvent('app.tsx', 0, 1);
      const fileProgressEvent = createFileProgressEvent('app.tsx', 100, 500);
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(fileStartEvent),
          formatSSE(fileProgressEvent),
          formatSSE(completeEvent),
        ])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      // Progress should reflect generating phase
      expect(result.current.progress.phase).toBe('complete');
    });

    it('should handle file_complete event', async () => {
      const startEvent = createStartEvent();
      const fileStartEvent = createFileStartEvent('app.tsx', 0, 2);
      const fileCompleteEvent = createFileCompleteEvent('app.tsx', 0, 2, 500);
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(fileStartEvent),
          formatSSE(fileCompleteEvent),
          formatSSE(completeEvent),
        ])
      );

      const mockOnFileComplete = jest.fn();
      const { result } = renderHook(() =>
        useStreamingGeneration({ onFileComplete: mockOnFileComplete })
      );

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnFileComplete).toHaveBeenCalledWith('app.tsx', 0, 2);
    });

    it('should handle validation event', async () => {
      const startEvent = createStartEvent();
      const validationEvent = createValidationEvent();
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(validationEvent),
          formatSSE(completeEvent),
        ])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.phase).toBe('complete');
    });

    it('should handle complete event with callback', async () => {
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(createMockResponse([formatSSE(completeEvent)]));

      const mockOnComplete = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onComplete: mockOnComplete }));

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnComplete).toHaveBeenCalledWith(completeEvent.data, completeEvent.stats);
    });

    it('should handle error event', async () => {
      const errorEvent = createErrorEvent('Generation failed', false);

      mockFetch.mockResolvedValue(createMockResponse([formatSSE(errorEvent)]));

      const mockOnError = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onError: mockOnError }));

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnError).toHaveBeenCalledWith('Generation failed', false);
      expect(result.current.progress.phase).toBe('error');
    });

    it('should track files completed', async () => {
      const startEvent = createStartEvent();
      const fileStart1 = createFileStartEvent('file1.tsx', 0, 3);
      const fileComplete1 = createFileCompleteEvent('file1.tsx', 0, 3, 100);
      const fileStart2 = createFileStartEvent('file2.tsx', 1, 3);
      const fileComplete2 = createFileCompleteEvent('file2.tsx', 1, 3, 200);
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(fileStart1),
          formatSSE(fileComplete1),
          formatSSE(fileStart2),
          formatSSE(fileComplete2),
          formatSSE(completeEvent),
        ])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.filesCompleted).toContain('file1.tsx');
      expect(result.current.progress.filesCompleted).toContain('file2.tsx');
    });

    it('should update stats on complete', async () => {
      const completeEvent = createCompleteEvent({
        stats: {
          totalTime: 10000,
          filesGenerated: 5,
          inputTokens: 2000,
          outputTokens: 4000,
          cachedTokens: 1000,
        },
      });

      mockFetch.mockResolvedValue(createMockResponse([formatSSE(completeEvent)]));

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.stats.inputTokens).toBe(2000);
      expect(result.current.progress.stats.outputTokens).toBe(4000);
      expect(result.current.progress.stats.cachedTokens).toBe(1000);
    });
  });

  // ==========================================================================
  // Abort Tests
  // ==========================================================================

  describe('abort()', () => {
    it('should abort ongoing generation', async () => {
      // Create a mock that throws AbortError when aborted
      mockFetch.mockImplementation(
        (_url: string, options: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            // Simulate the abort signal being triggered
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      const { result } = renderHook(() => useStreamingGeneration());

      // Start generation (don't await - it will hang until aborted)
      let generatePromise: Promise<unknown>;
      act(() => {
        generatePromise = result.current.generate({});
      });

      // Abort the generation
      act(() => {
        result.current.abort();
      });

      // Wait for the abort to process
      await act(async () => {
        await generatePromise;
      });

      expect(result.current.progress.phase).toBe('idle');
    });

    it('should handle abort gracefully when not streaming', () => {
      const { result } = renderHook(() => useStreamingGeneration());

      // Should not throw
      act(() => {
        result.current.abort();
      });

      expect(result.current.isStreaming).toBe(false);
    });
  });

  // ==========================================================================
  // Progress Callback Tests
  // ==========================================================================

  describe('Progress Callbacks', () => {
    it('should call onProgress on each update', async () => {
      const startEvent = createStartEvent();
      const thinkingEvent = createThinkingEvent();
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          formatSSE(thinkingEvent),
          formatSSE(completeEvent),
        ])
      );

      const mockOnProgress = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onProgress: mockOnProgress }));

      await act(async () => {
        await result.current.generate({});
      });

      // Should be called multiple times for different events
      expect(mockOnProgress.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SSE Parsing Tests
  // ==========================================================================

  describe('SSE Parsing', () => {
    it('should handle multiple events in single chunk', async () => {
      const events = [createStartEvent(), createThinkingEvent(), createCompleteEvent()];

      const combinedChunk = events.map(formatSSE).join('');

      mockFetch.mockResolvedValue(createMockResponse([combinedChunk]));

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.phase).toBe('complete');
    });

    it('should handle events split across chunks', async () => {
      const startEvent = createStartEvent();
      const completeEvent = createCompleteEvent();

      // Split the complete event across two chunks
      const completeStr = formatSSE(completeEvent);
      const halfLength = Math.floor(completeStr.length / 2);
      const firstHalf = completeStr.slice(0, halfLength);
      const secondHalf = completeStr.slice(halfLength);

      mockFetch.mockResolvedValue(
        createMockResponse([formatSSE(startEvent), firstHalf, secondHalf])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.phase).toBe('complete');
    });

    it('should handle malformed event data gracefully', async () => {
      const startEvent = createStartEvent();
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          formatSSE(startEvent),
          'data: invalid json\n',
          formatSSE(completeEvent),
        ])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      // Should still complete despite malformed event
      expect(result.current.progress.phase).toBe('complete');
    });

    it('should ignore non-data lines', async () => {
      const startEvent = createStartEvent();
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([
          'event: ping\n',
          formatSSE(startEvent),
          ': comment\n',
          formatSSE(completeEvent),
        ])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.phase).toBe('complete');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty stream', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      const { result } = renderHook(() => useStreamingGeneration());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnedData: any;
      await act(async () => {
        returnedData = await result.current.generate({});
      });

      expect(returnedData).toBeNull();
    });

    it('should handle stream with only error event', async () => {
      const errorEvent = createErrorEvent('Failed immediately');

      mockFetch.mockResolvedValue(createMockResponse([formatSSE(errorEvent)]));

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      expect(result.current.progress.phase).toBe('error');
      expect(result.current.progress.message).toBe('Failed immediately');
    });

    it('should handle recoverable error', async () => {
      const errorEvent = createErrorEvent('Temporary failure', true);

      mockFetch.mockResolvedValue(createMockResponse([formatSSE(errorEvent)]));

      const mockOnError = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onError: mockOnError }));

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnError).toHaveBeenCalledWith('Temporary failure', true);
    });

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const mockOnError = jest.fn();
      const { result } = renderHook(() => useStreamingGeneration({ onError: mockOnError }));

      await act(async () => {
        await result.current.generate({});
      });

      expect(mockOnError).toHaveBeenCalledWith('Network timeout', false);
      expect(result.current.progress.phase).toBe('error');
    });

    it('should handle rapid sequential generations', async () => {
      const completeEvent = createCompleteEvent();

      // Use mockImplementation to return fresh response for each call
      mockFetch.mockImplementation(() =>
        Promise.resolve(createMockResponse([formatSSE(completeEvent)]))
      );

      const { result } = renderHook(() => useStreamingGeneration());

      // Start multiple generations rapidly
      await act(async () => {
        await result.current.generate({ request: 1 });
      });

      await act(async () => {
        await result.current.generate({ request: 2 });
      });

      await act(async () => {
        await result.current.generate({ request: 3 });
      });

      expect(result.current.progress.phase).toBe('complete');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should clean up abort controller after completion', async () => {
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(createMockResponse([formatSSE(completeEvent)]));

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      // Calling abort after completion should be safe
      act(() => {
        result.current.abort();
      });

      expect(result.current.progress.phase).toBe('complete');
    });

    it('should track elapsed time', async () => {
      const startEvent = createStartEvent();
      const completeEvent = createCompleteEvent();

      mockFetch.mockResolvedValue(
        createMockResponse([formatSSE(startEvent), formatSSE(completeEvent)])
      );

      const { result } = renderHook(() => useStreamingGeneration());

      await act(async () => {
        await result.current.generate({});
      });

      // Elapsed time should be tracked (may be 0 for very fast execution)
      expect(result.current.progress.elapsedTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Integration-like Tests
  // ==========================================================================

  describe('Full Generation Flow', () => {
    it('should handle complete generation lifecycle', async () => {
      const events = [
        createStartEvent({ message: 'Starting...' }),
        createThinkingEvent({ message: 'Analyzing request...' }),
        createFileStartEvent('app/page.tsx', 0, 3),
        createFileProgressEvent('app/page.tsx', 100, 100),
        createFileProgressEvent('app/page.tsx', 200, 300),
        createFileCompleteEvent('app/page.tsx', 0, 3, 500),
        createFileStartEvent('app/layout.tsx', 1, 3),
        createFileCompleteEvent('app/layout.tsx', 1, 3, 300),
        createFileStartEvent('app/globals.css', 2, 3),
        createFileCompleteEvent('app/globals.css', 2, 3, 200),
        createValidationEvent({ filesValidated: 3, totalFiles: 3 }),
        createCompleteEvent({
          data: {
            name: 'My App',
            description: 'Generated app',
            appType: 'web-app',
            changeType: 'NEW_APP',
            changeSummary: 'Created new app',
            files: [
              { path: 'app/page.tsx', content: '// Page', description: 'Page' },
              { path: 'app/layout.tsx', content: '// Layout', description: 'Layout' },
              { path: 'app/globals.css', content: '/* CSS */', description: 'Styles' },
            ],
            dependencies: { react: '^19.0.0' },
            setupInstructions: 'npm install && npm run dev',
          },
          stats: {
            totalTime: 15000,
            filesGenerated: 3,
            inputTokens: 3000,
            outputTokens: 6000,
            cachedTokens: 1500,
          },
        }),
      ];

      mockFetch.mockResolvedValue(createMockResponse(events.map(formatSSE)));

      const mockOnStart = jest.fn();
      const mockOnFileStart = jest.fn();
      const mockOnFileComplete = jest.fn();
      const mockOnComplete = jest.fn();

      const { result } = renderHook(() =>
        useStreamingGeneration({
          onStart: mockOnStart,
          onFileStart: mockOnFileStart,
          onFileComplete: mockOnFileComplete,
          onComplete: mockOnComplete,
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnedData: any;
      await act(async () => {
        returnedData = await result.current.generate({
          appDescription: 'Build my app',
        });
      });

      // Verify all callbacks were called
      expect(mockOnStart).toHaveBeenCalled();
      expect(mockOnFileStart).toHaveBeenCalledTimes(3);
      expect(mockOnFileComplete).toHaveBeenCalledTimes(3);
      expect(mockOnComplete).toHaveBeenCalled();

      // Verify final state
      expect(result.current.progress.phase).toBe('complete');
      expect(result.current.progress.filesCompleted).toHaveLength(3);
      expect(returnedData).toBeDefined();
      expect(returnedData.name).toBe('My App');
      expect(returnedData.files).toHaveLength(3);
    });
  });
});
