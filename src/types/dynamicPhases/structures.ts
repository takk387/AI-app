/**
 * Dynamic Phase Generation System - Dynamic Phase Structure
 *
 * Core data structures for phases, files, features, and plans.
 */

import type { AppConcept, UIPreferences, UserRole } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type { ArchitectureSpec, APIRouteSpec, BackendFileSpec } from '@/types/architectureSpec';
import type { AppFile } from '@/types/railway';
import type { FeatureDomain, FeatureClassification } from './classification';
import type { ImportInfo } from './integrity';

// ============================================================================
// DYNAMIC PHASE STRUCTURE
// ============================================================================

/**
 * Feature specification with rich details from conversation
 */
export interface FeatureSpecification {
  name: string;
  userStories: string[];
  acceptanceCriteria: string[];
  technicalNotes: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * Workflow specification with steps and actors
 */
export interface WorkflowSpecification {
  name: string;
  trigger: string;
  steps: Array<{ action: string; actor: string }>;
  errorHandling?: string;
}

/**
 * Validation rule for fields/forms
 */
export interface ValidationRule {
  field: string;
  rules: string[];
  errorMessages: string[];
}

/**
 * UI pattern/component specification
 */
export interface UIPattern {
  component: string;
  pattern: string;
  requirements: string[];
}

/**
 * Integration point with external service
 */
export interface IntegrationPoint {
  service: string;
  purpose: string;
  endpoints: string[];
  authRequired: boolean;
}

/**
 * Concept context preserved for each phase.
 * Ensures phase execution has access to full app vision.
 *
 * CONTEXT PRECEDENCE (highest to lowest):
 *   1. architectureContext — phase-specific backend specs from BackendArchitectureAgent
 *   2. phaseConceptContext — extracted from conversation for this domain
 *   3. extractedPhaseContext — serialized domain context from wizard (SerializedPhaseContext)
 *   4. fullConcept — global app context (always available as PhaseExecutionContext.fullConcept)
 *
 * At execution time, the prompt builder in phaseExecution/promptBuilder.ts merges
 * these layers. If a field exists in a higher-precedence source, it wins.
 * layoutManifest is always injected from fullConcept regardless of precedence.
 */
export interface PhaseConceptContext {
  purpose?: string;
  targetUsers?: string;
  uiPreferences?: UIPreferences;
  roles?: UserRole[];
  conversationContext?: string;
  dataModels?: Array<{
    name: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
  }>;

  // NEW: Structured context fields for rich detail preservation
  featureSpecs?: FeatureSpecification[];
  workflowSpecs?: WorkflowSpecification[];
  technicalConstraints?: string[];
  integrationPoints?: IntegrationPoint[];
  validationRules?: ValidationRule[];
  uiPatterns?: UIPattern[];

  // CRITICAL: Full layout manifest specification for design-aware code generation
  // This preserves ALL design details (typography, colors, spacing, components)
  // that would otherwise be lost in the UIPreferences simplification
  layoutManifest?: LayoutManifest;
}

/**
 * A dynamically generated phase
 */
export interface DynamicPhase {
  number: number;
  name: string;
  description: string;
  domain: FeatureDomain;
  features: string[];
  featureDetails: FeatureClassification[];
  estimatedTokens: number;
  estimatedTime: string;
  dependencies: number[]; // Phase numbers this depends on
  dependencyNames: string[]; // Human-readable dependency names
  testCriteria: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  generatedCode?: string;
  completedAt?: string;
  errors?: string[];

  // Phase Comparison: What was actually built (populated after execution)
  implementedFeatures?: string[]; // Features actually implemented
  builtSummary?: string; // Concise summary of what was built
  builtFiles?: string[]; // Files created/modified in this phase

  // Rich concept context for phase execution (preserves detail)
  conceptContext?: PhaseConceptContext;

  // If true, this phase injects pre-built layout code from Layout Builder
  // instead of generating code from scratch via AI
  isLayoutInjection?: boolean;

  // Role context: which user roles interact with this phase's features
  relevantRoles?: string[];

  // Architecture context for backend phases (from BackendArchitectureAgent)
  architectureContext?: {
    files: BackendFileSpec[];
    prismaSchema?: string;
    apiRoutes?: APIRouteSpec[];
  };
}

/**
 * Rich file tracking with metadata
 */
export interface AccumulatedFile {
  path: string;
  type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
  exports: string[];
  dependencies: string[];
  summary: string;
  // Phase integrity tracking (P1)
  contentHash?: string; // Hash for change detection
  createdInPhase?: number; // Phase that first created this file
  lastModifiedPhase?: number; // Phase that last changed it
  previousVersionHash?: string; // Hash before modification (for rollback)
  // Import validation (P2)
  imports?: ImportInfo[]; // Parsed imports for validation
}

/**
 * Rich feature tracking with implementation details
 */
export interface AccumulatedFeature {
  name: string;
  status: 'complete' | 'partial' | 'pending';
  implementedIn: string[];
  apiEndpoints: string[];
  components: string[];
  dataModels: string[];
  testCoverage: boolean;
}

/**
 * API contract for endpoint documentation
 */
export interface APIContract {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestSchema?: string;
  responseSchema?: string;
  authentication: boolean;
}

/**
 * Phase-specific context extracted from conversation
 * Serializable version of PhaseContext for API responses
 */
export interface SerializedPhaseContext {
  phaseType: FeatureDomain;
  extractedRequirements: string[];
  userDecisions: string[];
  technicalNotes: string[];
  validationRules: string[];
  uiPatterns: string[];
  contextSummary: string;
  tokenEstimate: number;
}

/**
 * Complete phase plan for an application
 */
export interface DynamicPhasePlan {
  id: string;
  appName: string;
  appDescription: string;
  totalPhases: number;
  phases: DynamicPhase[];
  estimatedTotalTime: string;
  estimatedTotalTokens: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  concept: AppConcept;

  // Execution tracking
  currentPhaseNumber: number;
  completedPhaseNumbers: number[];
  failedPhaseNumbers: number[];

  /**
   * DUAL TRACKING (legacy + enhanced):
   *
   * - accumulatedFiles: string[]              — Flat file path list. Used in prompt construction
   *                                              and legacy APIs. Always a projection of accumulatedFilesRich[].path.
   * - accumulatedFilesRich?: AccumulatedFile[] — Rich metadata per file. Used for P1 conflict detection,
   *                                              smart context (CodeContextService), and phase integrity system.
   *
   * - accumulatedFeatures: string[]                — Flat feature name list. Used in prompt construction.
   * - accumulatedFeaturesRich?: AccumulatedFeature[] — Rich metadata per feature.
   *
   * PhaseExecutionManager.recordPhaseResult() keeps both in sync.
   * Single source of truth: accumulatedFilesRich / accumulatedFeaturesRich.
   * The string[] arrays are projections derived from the rich arrays.
   */
  accumulatedFiles: string[];
  accumulatedFeatures: string[];

  accumulatedFilesRich?: AccumulatedFile[];
  accumulatedFeaturesRich?: AccumulatedFeature[];
  establishedPatterns?: string[];
  sharedState?: string[];
  apiContracts?: APIContract[];

  // Phase-specific context extracted from conversation (domain -> context)
  phaseContexts?: Record<FeatureDomain, SerializedPhaseContext>;

  // Backend architecture specification (from BackendArchitectureAgent)
  architectureSpec?: ArchitectureSpec;

  // Pre-built layout files from Layout Builder (for layout injection phase)
  layoutBuilderFiles?: AppFile[];

  // Flag to indicate phases were regenerated with full architecture context
  // Prevents double-regeneration on the review page
  hasArchitectureContext?: boolean;
}

/**
 * Result of phase plan generation
 */
export interface PhasePlanGenerationResult {
  success: boolean;
  plan?: DynamicPhasePlan;
  error?: string;
  warnings: string[];
  analysisDetails: {
    totalFeatures: number;
    complexFeatures: number;
    domainBreakdown: Record<FeatureDomain, number>;
    estimatedContextPerPhase: number;
  };
}
