/**
 * Dynamic Phase Generation System - Phase Execution Context
 *
 * Types for phase execution context and results.
 */

import type { TechnicalRequirements, UIPreferences, UserRole, Workflow } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type { APIRouteSpec, BackendFileSpec } from '@/types/architectureSpec';
import type { AppFile } from '@/types/railway';
import type { DynamicPhase, PhaseConceptContext, SerializedPhaseContext } from './structures';
import type { FileConflict } from './integrity';

// ============================================================================
// PHASE EXECUTION CONTEXT
// ============================================================================

/**
 * Context passed to each phase during execution
 */
export interface PhaseExecutionContext {
  phaseNumber: number;
  totalPhases: number;
  phaseName: string;
  phaseDescription: string;

  // What this phase should build
  features: string[];
  testCriteria: string[];

  // Context from previous phases
  previousPhaseCode: string | null;
  allPhases: DynamicPhase[];
  completedPhases: number[];

  // Accumulated state
  cumulativeFeatures: string[];
  cumulativeFiles: string[];

  // App context
  appName: string;
  appDescription: string;
  appType: string;
  techStack: TechnicalRequirements;

  // ENHANCED: Full concept context for rich detail preservation
  fullConcept?: {
    purpose?: string;
    targetUsers?: string;
    uiPreferences?: UIPreferences;
    roles?: UserRole[];
    conversationContext?: string;
    dataModels?: Array<{
      name: string;
      fields: Array<{ name: string; type: string; required: boolean }>;
    }>;
    // Full layout manifest for design-aware code generation
    layoutManifest?: LayoutManifest;
    // User workflows for multi-step process generation
    workflows?: Workflow[];
  };

  // Phase-specific concept context
  phaseConceptContext?: PhaseConceptContext;

  // Which user roles this phase serves
  relevantRoles?: string[];

  // Extracted context from conversation for this specific phase
  extractedPhaseContext?: SerializedPhaseContext;

  // Context truncation notice (tells AI what conversation context was dropped)
  truncationNotice?: string;

  // Architecture context for backend phases (from BackendArchitectureAgent)
  // This provides phase-specific backend implementation details
  architectureContext?: {
    files: BackendFileSpec[];
    prismaSchema?: string;
    apiRoutes?: APIRouteSpec[];
  };

  // Layout injection: if true, inject pre-built layout code instead of AI generation
  isLayoutInjection?: boolean;
  // Pre-built layout files to inject for layout injection phases
  layoutBuilderFiles?: AppFile[];
}

/**
 * Result of executing a single phase
 */
export interface PhaseExecutionResult {
  phaseNumber: number;
  phaseName: string;
  success: boolean;
  generatedCode: string;
  generatedFiles: string[];
  implementedFeatures: string[];
  duration: number;
  tokensUsed: {
    input: number;
    output: number;
    thinking?: number;
  };
  errors?: string[];
  warnings?: string[];
  testResults?: {
    passed: boolean;
    details: string[];
  };
  // Phase Comparison: Summary of what was built
  builtSummary?: string;
  // Phase integrity (P1): File conflicts detected during this phase
  fileConflicts?: FileConflict[];
}
