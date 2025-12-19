/**
 * Type definitions for AIBuilder component
 * Extracted from AIBuilder.tsx for modular architecture
 */

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

// ============================================================================
// PHASE BUILD TYPES (inline version used in AIBuilder)
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
  /** Preview sharing - slug for public preview URL */
  previewSlug?: string | null;
  /** Preview sharing - whether preview is enabled */
  previewEnabled?: boolean;
  /** Preview sharing - whether the app is publicly accessible */
  isPublic?: boolean;
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
