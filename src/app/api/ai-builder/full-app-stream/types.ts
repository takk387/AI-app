/**
 * Shared types for the full-app-stream route modules.
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { LayoutManifest } from '@/types/schema';
import type { ArchitectureSpec } from '@/types/architectureSpec';
import type { SerializedPhaseContext } from '@/types/dynamicPhases';
import type { PhaseContext } from '../full-app/generation-logic';
import type { ValidationError } from '@/utils/codeValidator';

/** Parsed and validated request body */
export interface ValidatedRequest {
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  contextSummary?: string;
  isModification?: boolean;
  currentAppName?: string;
  image?: string;
  hasImage?: boolean;
  isPhaseBuilding?: boolean;
  rawPhaseContext?: {
    phaseNumber?: number;
    phaseName?: string;
    previousPhaseCode?: string | null;
    allPhases?: import('../full-app/generation-logic').Phase[];
    completedPhases?: number[];
    cumulativeFeatures?: string[];
  };
  currentAppState?: {
    name?: string;
    appType?: string;
    files?: Array<{ path: string; content: string }>;
  };
  layoutManifest?: LayoutManifest;
  architectureSpec?: ArchitectureSpec;
  phaseContexts?: Record<string, SerializedPhaseContext>;
  useAgenticValidation?: boolean;
}

/** Return type from prompt assembly */
export interface AssembledPrompt {
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  phaseContext: PhaseContext | undefined;
  modelName: string;
  tokenBudget: { max_tokens: number; thinking_budget: number; timeout: number };
}

/** Generated file entry */
export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

/** Parsed response metadata */
export interface ParsedResponse {
  name: string;
  description: string;
  appType: string;
  changeType: string;
  changeSummary: string;
  files: GeneratedFile[];
  dependencies: Record<string, string>;
  setupInstructions: string;
  validationWarnings?: {
    hasWarnings: true;
    message: string;
    details: Array<{ file: string; errors: ValidationError[] }>;
  };
}

/** Result from streaming or agentic processing */
export interface StreamResult {
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  agenticToolCalls?: number;
}

/** SSE writer helpers passed to processors */
export interface SSEWriter {
  writeEvent: (event: import('@/types/streaming').StreamEvent) => Promise<void>;
  closeWriter: () => Promise<void>;
  isWriterClosed: () => boolean;
}
