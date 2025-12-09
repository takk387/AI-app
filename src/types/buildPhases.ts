/**
 * Type definitions for Phase-Driven Build System
 * Structures complex application generation into manageable phases
 */

// Phase IDs as a union type for type safety
export type PhaseId = 'foundation' | 'features' | 'integration' | 'optimization' | 'polish';

// Status types for phases and tasks
export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';
export type TaskStatus = 'pending' | 'completed' | 'failed';
export type ValidationType = 'render' | 'console' | 'functionality' | 'performance';

/**
 * Validation check for a phase
 */
export interface ValidationCheck {
  id: string;
  name: string;
  type: ValidationType;
  passed: boolean;
  message?: string;
}

/**
 * Individual task within a phase
 */
export interface PhaseTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  generatedCode?: string;
  errors?: string[];
}

/**
 * Build phase configuration
 */
export interface BuildPhase {
  id: PhaseId;
  name: string;
  description: string;
  order: number;
  status: PhaseStatus;
  estimatedTime: string;
  tasks: PhaseTask[];
  validationChecks: ValidationCheck[];
}

/**
 * Result of executing a phase
 */
export interface PhaseResult {
  phaseId: PhaseId;
  success: boolean;
  tasksCompleted: number;
  totalTasks: number;
  generatedCode?: string;
  errors?: string[];
  warnings?: string[];
  duration: number; // milliseconds
}

/**
 * Result of validating a phase
 */
export interface ValidationResult {
  phaseId: PhaseId;
  passed: boolean;
  checks: ValidationCheck[];
  canProceed: boolean;
  warnings?: string[];
}

/**
 * Overall build progress
 */
export interface BuildProgress {
  currentPhaseId: PhaseId | null;
  currentPhaseIndex: number;
  totalPhases: number;
  completedPhases: PhaseId[];
  percentComplete: number;
  estimatedTimeRemaining: string;
  startedAt: string;
  lastUpdated: string;
}

/**
 * Phase prompt configuration for AI generation
 */
export interface PhasePromptConfig {
  phaseId: PhaseId;
  focus: string;
  generates: string[];
  validation: string[];
  restrictions: string[];
}

// Note: PhasedAppConcept, DEFAULT_PHASES, PHASE_FOCUS_AREAS, and PHASE_VALIDATION_CRITERIA
// were removed as they belonged to the legacy static 5-phase system.
// The codebase now uses DynamicPhaseGenerator for variable-count phases (3-25+).
