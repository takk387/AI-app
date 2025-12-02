/**
 * Streaming Types for Real-Time Progress
 *
 * Defines event types for Server-Sent Events (SSE) streaming
 * during app generation, providing real-time progress updates to the UI.
 */

// ============================================================================
// PROGRESS EVENT TYPES
// ============================================================================

/**
 * Types of streaming events
 */
export type StreamEventType =
  | 'start'           // Generation started
  | 'thinking'        // AI is thinking/planning
  | 'file_start'      // Starting to generate a file
  | 'file_progress'   // Progress on current file (token chunks)
  | 'file_complete'   // File generation complete
  | 'validation'      // Validating generated code
  | 'complete'        // All generation complete
  | 'error';          // Error occurred

/**
 * Base event structure
 */
export interface BaseStreamEvent {
  type: StreamEventType;
  timestamp: number;
}

/**
 * Generation started event
 */
export interface StartEvent extends BaseStreamEvent {
  type: 'start';
  message: string;
  estimatedFiles?: number;
  phaseNumber?: number;
  phaseName?: string;
}

/**
 * AI thinking event
 */
export interface ThinkingEvent extends BaseStreamEvent {
  type: 'thinking';
  message: string;
  thinkingTokens?: number;
}

/**
 * File generation started
 */
export interface FileStartEvent extends BaseStreamEvent {
  type: 'file_start';
  filePath: string;
  fileIndex: number;
  totalFiles: number;
}

/**
 * File generation progress (streaming tokens)
 */
export interface FileProgressEvent extends BaseStreamEvent {
  type: 'file_progress';
  filePath: string;
  chunkSize: number;
  totalChars: number;
}

/**
 * File generation complete
 */
export interface FileCompleteEvent extends BaseStreamEvent {
  type: 'file_complete';
  filePath: string;
  fileIndex: number;
  totalFiles: number;
  charCount: number;
}

/**
 * Code validation event
 */
export interface ValidationEvent extends BaseStreamEvent {
  type: 'validation';
  message: string;
  filesValidated: number;
  totalFiles: number;
  errorsFound: number;
  autoFixed: number;
}

/**
 * Generation complete event with final data
 */
export interface CompleteEvent extends BaseStreamEvent {
  type: 'complete';
  success: boolean;
  data: {
    name: string;
    description: string;
    appType: string;
    changeType: string;
    changeSummary: string;
    files: Array<{ path: string; content: string; description: string }>;
    dependencies: Record<string, string>;
    setupInstructions: string;
    validationWarnings?: {
      hasWarnings: boolean;
      message: string;
      details: unknown[];
    };
  };
  stats: {
    totalTime: number;
    filesGenerated: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
  };
}

/**
 * Error event
 */
export interface ErrorEvent extends BaseStreamEvent {
  type: 'error';
  message: string;
  code?: string;
  recoverable: boolean;
}

/**
 * Union of all stream events
 */
export type StreamEvent =
  | StartEvent
  | ThinkingEvent
  | FileStartEvent
  | FileProgressEvent
  | FileCompleteEvent
  | ValidationEvent
  | CompleteEvent
  | ErrorEvent;

// ============================================================================
// CLIENT-SIDE STATE
// ============================================================================

/**
 * Progress state tracked on the client
 */
export interface StreamingProgress {
  isStreaming: boolean;
  phase: 'idle' | 'starting' | 'thinking' | 'generating' | 'validating' | 'complete' | 'error';
  message: string;
  currentFile: string | null;
  currentFileIndex: number;
  totalFiles: number;
  filesCompleted: string[];
  startTime: number | null;
  elapsedTime: number;
  stats: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
  };
}

/**
 * Initial/reset state for streaming progress
 */
export const initialStreamingProgress: StreamingProgress = {
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
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse an SSE data line into a StreamEvent
 */
export function parseStreamEvent(data: string): StreamEvent | null {
  try {
    return JSON.parse(data) as StreamEvent;
  } catch {
    console.error('Failed to parse stream event:', data);
    return null;
  }
}

/**
 * Create an SSE formatted message
 */
export function formatSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Get a human-readable message for a phase
 */
export function getPhaseMessage(phase: StreamingProgress['phase']): string {
  switch (phase) {
    case 'idle': return '';
    case 'starting': return 'Initializing generation...';
    case 'thinking': return 'AI is analyzing your request...';
    case 'generating': return 'Generating code...';
    case 'validating': return 'Validating generated code...';
    case 'complete': return 'Generation complete!';
    case 'error': return 'An error occurred';
    default: return '';
  }
}
