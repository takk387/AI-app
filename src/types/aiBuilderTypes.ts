/**
 * Type definitions for MainBuilderView component
 * Extracted from MainBuilderView.tsx for modular architecture
 */

import type { DynamicPhasePlan } from './dynamicPhases';
import type { ImplementationPlan as RuntimeImplementationPlan } from './appConcept';

// ============================================================================
// CHAT TYPES
// ============================================================================

/**
 * Chat message in the conversation history
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  componentCode?: string;
  componentPreview?: boolean;
}

// ============================================================================
// VERSION CONTROL TYPES
// ============================================================================

/**
 * A saved version/snapshot of an app
 */
export interface AppVersion {
  id: string;
  versionNumber: number;
  code: string;
  description: string;
  timestamp: string;
  changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE';
}

/**
 * Source information for a branch (where it was created from)
 */
export interface BranchSource {
  branchId: string;
  branchName: string;
  versionNumber?: number;
}

/**
 * A branch within an app - allows multiple development paths
 * that share the same app_id and Railway project
 */
export interface AppBranch {
  id: string;
  name: string;
  description?: string;
  code: string;
  versions: AppVersion[];
  conversationHistory: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  createdFrom: BranchSource | null;
  isDefault: boolean;
}

// ============================================================================
// PHASE BUILD TYPES (inline version used in MainBuilderView)
// ============================================================================

/**
 * Status of a build phase
 */
export type PhaseStatus = 'pending' | 'building' | 'complete';

/**
 * A single phase in the build plan
 */
export interface Phase {
  number: number;
  name: string;
  description: string;
  features: string[];
  status: PhaseStatus;
}

/**
 * Stage/phase plan for multi-phase builds
 */
export interface StagePlan {
  totalPhases: number;
  currentPhase: number;
  phases: Phase[];
}

// ============================================================================
// COMPONENT TYPES
// ============================================================================

/**
 * A generated app/component with its full state
 */
export interface GeneratedComponent {
  id: string;
  name: string;
  code: string;
  description: string;
  timestamp: string;
  isFavorite: boolean;
  conversationHistory: ChatMessage[];
  versions?: AppVersion[];
  /** Phase build progress - null when complete or not applicable */
  stagePlan?: StagePlan | null;
  /** Dynamic phase plan - AI-generated phase structure for multi-phase builds */
  dynamicPhasePlan?: DynamicPhasePlan | null;
  /** Implementation plan snapshot - Build strategy and approach metadata for DB persistence */
  implementationPlan?: ImplementationPlanSnapshot | null;
  /** Preview sharing - slug for public preview URL */
  previewSlug?: string | null;
  /** Preview sharing - whether preview is enabled */
  previewEnabled?: boolean;
  /** Preview sharing - whether the app is publicly accessible */
  isPublic?: boolean;
  /** All branches for this app (optional for backward compatibility) */
  branches?: AppBranch[];
  /** Currently active branch ID */
  activeBranchId?: string;
}

/**
 * Implementation plan snapshot - stores the build strategy and approach metadata
 * for database persistence. This is distinct from the runtime ImplementationPlan
 * in appConcept.ts which contains the full AppConcept and BuildPhase objects.
 */
export interface ImplementationPlanSnapshot {
  id: string;
  appName: string;
  approach: string;
  phases: Array<{
    name: string;
    description: string;
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
  }>;
  technicalDecisions: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert runtime ImplementationPlan to ImplementationPlanSnapshot for DB persistence.
 * Extracts only the lightweight metadata needed for storage.
 */
export function toImplementationPlanSnapshot(
  plan: RuntimeImplementationPlan
): ImplementationPlanSnapshot {
  // Extract technical decisions from the technical requirements object
  const technicalDecisions: string[] = [];
  const tech = plan.concept.technical;
  if (tech.needsAuth) technicalDecisions.push(`Auth: ${tech.authType || 'simple'}`);
  if (tech.needsDatabase) technicalDecisions.push('Database required');
  if (tech.needsAPI) technicalDecisions.push('API endpoints required');
  if (tech.needsFileUpload) technicalDecisions.push('File upload support');
  if (tech.needsRealtime) technicalDecisions.push('Realtime features');

  return {
    id: `impl-${plan.concept.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    appName: plan.concept.name,
    approach: plan.concept.description || plan.concept.purpose || '',
    phases: plan.phases.map((phase) => ({
      name: phase.name,
      description: phase.description,
      estimatedComplexity: phase.estimatedComplexity,
    })),
    technicalDecisions,
    createdAt: plan.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// CHANGE MANAGEMENT TYPES
// ============================================================================

/**
 * Pending change awaiting user approval
 */
export interface PendingChange {
  id: string;
  changeDescription: string;
  newCode: string;
  timestamp: string;
}

/**
 * Diff-based change for targeted modifications
 */
export interface PendingDiff {
  id: string;
  summary: string;
  files: Array<{
    path: string;
    action: 'MODIFY' | 'CREATE' | 'DELETE';
    changes: Array<{
      type: 'ADD_IMPORT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'REPLACE' | 'DELETE' | 'APPEND';
      searchFor?: string;
      content?: string;
      replaceWith?: string;
    }>;
  }>;
  timestamp: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Layout mode for the builder interface
 */
export type LayoutMode = 'split' | 'preview' | 'code';

/**
 * Active tab in the builder
 */
export type ActiveTab = 'chat' | 'preview' | 'code';

/**
 * Content tab in the library modal
 */
export type ContentTab = 'apps' | 'files';

/**
 * Mode toggle between planning and acting
 */
export type BuilderMode = 'PLAN' | 'ACT';

// ============================================================================
// QUALITY & PERFORMANCE TYPES
// ============================================================================

/**
 * Individual quality issue
 */
export interface QualityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Quality metrics for an app
 */
export interface QualityMetrics {
  accessibility: number;
  bestPractices: number;
  seo: number;
  codeQuality: number;
  overall: number;
}

/**
 * Quality report for an app
 */
export interface QualityReport {
  id: string;
  appId: string;
  timestamp: string;
  issues: QualityIssue[];
  metrics: QualityMetrics;
  passed: boolean;
}

/**
 * Individual performance issue
 */
export interface PerformanceIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendation?: string;
}

/**
 * Performance metrics for an app
 */
export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  bundleSize: number;
  renderTime: number;
}

/**
 * Performance report for an app
 */
export interface PerformanceReport {
  id: string;
  appId: string;
  timestamp: string;
  issues: PerformanceIssue[];
  metrics: PerformanceMetrics;
  passed: boolean;
}

// ============================================================================
// STAGE PLAN TYPES (for modifications)
// ============================================================================

/**
 * Current stage plan for multi-stage modifications
 */
export interface CurrentStagePlan {
  currentStage: number;
  totalStages: number;
  stageDescription: string;
  nextStages: string[];
}

// ============================================================================
// COMPARE VERSIONS
// ============================================================================

/**
 * Versions being compared
 */
export interface CompareVersions {
  v1: AppVersion | null;
  v2: AppVersion | null;
}
