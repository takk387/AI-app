/**
 * useSendMessage Types
 *
 * Type definitions for the useSendMessage hook.
 * Extracted for modularity.
 */

import type {
  ChatMessage,
  GeneratedComponent,
  PendingDiff,
  AppVersion,
} from '@/types/aiBuilderTypes';
import type { AppConcept } from '@/types/appConcept';
import type { PhaseExecutionResult, DynamicPhasePlan } from '@/types/dynamicPhases';

// Re-export WizardState from consolidated types for backwards compatibility
export type { WizardState } from '@/types/wizardState';
import type { WizardState } from '@/types/wizardState';

/**
 * Return type from useMessageSender hook
 */
export interface MessageSenderReturn {
  isQuestion: (input: string) => boolean;
  getProgressMessages: (isQuestion: boolean, isModification: boolean) => string[];
}

/**
 * Return type from useStreamingGeneration hook
 */
export interface StreamingGenerationReturn {
  generate: (requestBody: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
}

/**
 * Return type from useVersionControl hook
 */
export interface VersionControlReturn {
  pushToUndoStack: (version: AppVersion) => void;
  clearRedoStack: () => void;
}

/**
 * Dynamic build phases interface (subset of useDynamicBuildPhases)
 */
export interface DynamicBuildPhasesReturn {
  currentPhase: { number: number; name: string; features: string[] } | null;
  completePhase: (result: PhaseExecutionResult) => void;
  plan: DynamicPhasePlan | null;
}

/**
 * Options for useSendMessage hook
 */
export interface UseSendMessageOptions {
  wizardState: WizardState;
  appConcept: AppConcept | null;
  messageSender: MessageSenderReturn;
  streaming: StreamingGenerationReturn;
  versionControl: VersionControlReturn;
  dynamicBuildPhases: DynamicBuildPhasesReturn;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  // Callbacks
  onWizardStateUpdate: (state: WizardState) => void;
  onSaveComponent: (
    component: GeneratedComponent
  ) => Promise<{ success: boolean; error?: unknown }>;
  saveVersion: (
    component: GeneratedComponent,
    changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE',
    description: string
  ) => GeneratedComponent;
}

/**
 * Suggested action for PLAN mode
 */
export interface SuggestedAction {
  label: string;
  action: string;
}

/**
 * Return type for useSendMessage hook
 */
export interface UseSendMessageReturn {
  sendMessage: () => Promise<void>;
  suggestedActions: SuggestedAction[];
  clearSuggestedActions: () => void;
}
