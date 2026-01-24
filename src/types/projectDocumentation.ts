/**
 * Project Documentation System Types
 *
 * Captures and organizes all artifacts from the app building process:
 * - App concept (from wizard or builder chat)
 * - Layout design with preview screenshots
 * - Implementation plan (phase plan)
 * - Phase execution details and progress
 */

import type {
  Feature,
  TechnicalRequirements,
  UIPreferences,
  UserRole,
  Workflow,
} from './appConcept';
import type { LayoutManifest } from './schema';
import type { DynamicPhasePlan } from './dynamicPhases';
import type { ChatMessage } from './aiBuilderTypes';
import type { ArchitectureSpec } from './architectureSpec';

// ============================================================================
// ARTIFACT SNAPSHOT TYPES
// ============================================================================

/**
 * Snapshot of app concept at a point in time
 * Captures COMPREHENSIVE data from AppConcept including architecture
 */
export interface ConceptSnapshot {
  id: string;
  capturedAt: string; // ISO 8601
  source: 'wizard' | 'builder-chat' | 'import' | 'manual';

  // === BASIC INFO ===
  name: string;
  description: string;
  purpose: string;
  targetUsers: string;

  // === FEATURES (comprehensive with priorities and dependencies) ===
  features: Feature[];

  // === TECHNICAL (full requirements including dataModels, i18n, caching, etc.) ===
  technical: TechnicalRequirements;

  // === UI PREFERENCES (full design tokens) ===
  uiPreferences: UIPreferences;

  // === ROLES & WORKFLOWS (complete with permissions and descriptions) ===
  roles?: UserRole[]; // Full UserRole with capabilities AND permissions
  workflows?: Workflow[]; // Full Workflow with description, steps, involvedRoles

  // === ARCHITECTURE (critical - full backend architecture spec) ===
  architectureSpec?: ArchitectureSpec;

  // === LAYOUT DESIGN REFERENCE ===
  layoutDesignId?: string; // Reference to LayoutSnapshot if design was captured

  // === CONVERSATION CONTEXT ===
  conversationContext?: string; // Full conversation text for rich detail preservation
  conversationSummary?: string; // AI-generated summary
  builderChatHistory?: ChatMessage[]; // For builder-chat source, raw conversation
  messageCountAtCapture?: number; // For tracking incremental captures

  // === METADATA ===
  originalCreatedAt?: string; // When concept was first created
  originalUpdatedAt?: string; // Last concept update before snapshot
}

/**
 * Layout design snapshot with visual preview
 */
export interface LayoutSnapshot {
  id: string;
  capturedAt: string;
  source: 'layout-builder' | 'import' | 'ai-generated';

  // Design data - LayoutManifest from Gemini 3 system
  layoutManifest?: LayoutManifest;

  // Visual preview
  previewImageUrl?: string; // Supabase storage URL

  // Reference images used during design
  referenceImages?: Array<{
    id: string;
    url: string;
    description?: string;
  }>;

  // Design notes from conversation
  designNotes?: string;
}

/**
 * Implementation plan snapshot
 */
export interface PlanSnapshot {
  id: string;
  capturedAt: string;

  // Full plan data
  plan: DynamicPhasePlan;

  // Computed summaries for quick display
  totalPhases: number;
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  featureBreakdown: Record<string, number>; // domain -> count
}

/**
 * Individual phase execution record
 */
export interface PhaseExecutionRecord {
  phaseNumber: number;
  phaseName: string;
  domain: string;

  // What was planned
  plannedFeatures: string[];
  plannedDescription: string;
  estimatedTokens: number;

  // What happened
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number; // milliseconds

  // Results
  generatedCode?: string;
  generatedFiles?: string[];
  implementedFeatures?: string[];
  errors?: string[];

  // Quality metrics
  tokensUsed?: {
    input: number;
    output: number;
  };
}

// ============================================================================
// MAIN PROJECT DOCUMENTATION TYPE
// ============================================================================

/**
 * Build status for the project
 */
export type BuildStatus = 'planning' | 'ready' | 'building' | 'completed' | 'failed' | 'paused';

/**
 * Summary statistics for documentation
 */
export interface DocumentationStats {
  totalFeatures: number;
  implementedFeatures: number;
  totalPhases: number;
  completedPhases: number;
  failedPhases: number;
  skippedPhases: number;
  totalBuildTime?: number; // milliseconds
  totalTokensUsed?: number;
}

/**
 * Complete project documentation
 */
export interface ProjectDocumentation {
  id: string;
  appId: string; // Reference to generated_apps.id
  userId: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: number;

  // Project identification
  projectName: string;
  projectDescription?: string;

  // Artifact snapshots (captured at specific times)
  conceptSnapshot?: ConceptSnapshot;
  layoutSnapshot?: LayoutSnapshot;
  planSnapshot?: PlanSnapshot;

  // Build execution tracking
  buildStartedAt?: string;
  buildCompletedAt?: string;
  buildStatus: BuildStatus;
  phaseExecutions: PhaseExecutionRecord[];

  // Summary stats
  stats: DocumentationStats;

  // User notes and annotations
  notes?: string;
  tags?: string[];
}

// ============================================================================
// CAPTURE EVENT TYPES
// ============================================================================

/**
 * Events that trigger documentation capture
 */
export type CaptureEvent =
  | 'wizard_message_milestone' // Every 15-20 wizard messages
  | 'wizard_complete' // When NaturalConversationWizard completes
  | 'builder_chat_milestone' // Every 15-20 builder chat messages in PLAN mode
  | 'plan_mode_complete' // When switching from PLAN to ACT mode
  | 'layout_save' // When layout design is saved or tab switched
  | 'plan_generate' // When phase plan is generated
  | 'build_start' // When build execution begins
  | 'phase_start' // When a phase starts
  | 'phase_complete' // After each phase completes
  | 'build_complete' // When entire build finishes
  | 'build_failed' // When build fails
  | 'manual_save'; // User manually saves

/**
 * Capture request for the service
 */
export interface CaptureRequest {
  event: CaptureEvent;
  appId: string;
  userId: string;
  data: {
    concept?: Partial<ConceptSnapshot>;
    layout?: LayoutManifest;
    plan?: DynamicPhasePlan;
    phaseResult?: Partial<PhaseExecutionRecord>;
    previewImageUrl?: string;
    chatMessages?: ChatMessage[];
    conversationContext?: string;
  };
}

// ============================================================================
// DATABASE ROW TYPE (matches Supabase schema)
// ============================================================================

/**
 * Database row type for project_documentation table
 */
export interface ProjectDocumentationRow {
  id: string;
  app_id: string;
  user_id: string;
  project_name: string;
  project_description: string | null;
  concept_snapshot: ConceptSnapshot | null;
  layout_snapshot: LayoutSnapshot | null;
  plan_snapshot: PlanSnapshot | null;
  build_status: BuildStatus;
  build_started_at: string | null;
  build_completed_at: string | null;
  phase_executions: PhaseExecutionRecord[];
  stats: DocumentationStats;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  version: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create empty documentation stats
 */
export function createEmptyStats(): DocumentationStats {
  return {
    totalFeatures: 0,
    implementedFeatures: 0,
    totalPhases: 0,
    completedPhases: 0,
    failedPhases: 0,
    skippedPhases: 0,
  };
}

/**
 * Map database row to ProjectDocumentation
 */
export function mapRowToDocumentation(row: ProjectDocumentationRow): ProjectDocumentation {
  return {
    id: row.id,
    appId: row.app_id,
    userId: row.user_id,
    projectName: row.project_name,
    projectDescription: row.project_description ?? undefined,
    conceptSnapshot: row.concept_snapshot ?? undefined,
    layoutSnapshot: row.layout_snapshot ?? undefined,
    planSnapshot: row.plan_snapshot ?? undefined,
    buildStatus: row.build_status,
    buildStartedAt: row.build_started_at ?? undefined,
    buildCompletedAt: row.build_completed_at ?? undefined,
    phaseExecutions: row.phase_executions ?? [],
    stats: row.stats ?? createEmptyStats(),
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };
}

/**
 * Map ProjectDocumentation to database row for insert/update
 */
export function mapDocumentationToRow(
  doc: Partial<ProjectDocumentation>
): Partial<ProjectDocumentationRow> {
  const row: Partial<ProjectDocumentationRow> = {};

  if (doc.appId !== undefined) row.app_id = doc.appId;
  if (doc.userId !== undefined) row.user_id = doc.userId;
  if (doc.projectName !== undefined) row.project_name = doc.projectName;
  if (doc.projectDescription !== undefined)
    row.project_description = doc.projectDescription ?? null;
  if (doc.conceptSnapshot !== undefined) row.concept_snapshot = doc.conceptSnapshot ?? null;
  if (doc.layoutSnapshot !== undefined) row.layout_snapshot = doc.layoutSnapshot ?? null;
  if (doc.planSnapshot !== undefined) row.plan_snapshot = doc.planSnapshot ?? null;
  if (doc.buildStatus !== undefined) row.build_status = doc.buildStatus;
  if (doc.buildStartedAt !== undefined) row.build_started_at = doc.buildStartedAt ?? null;
  if (doc.buildCompletedAt !== undefined) row.build_completed_at = doc.buildCompletedAt ?? null;
  if (doc.phaseExecutions !== undefined) row.phase_executions = doc.phaseExecutions;
  if (doc.stats !== undefined) row.stats = doc.stats;
  if (doc.notes !== undefined) row.notes = doc.notes ?? null;
  if (doc.tags !== undefined) row.tags = doc.tags ?? null;

  return row;
}

/**
 * Calculate stats from phase executions
 */
export function calculateStats(
  doc: Pick<
    ProjectDocumentation,
    'conceptSnapshot' | 'planSnapshot' | 'phaseExecutions' | 'buildStartedAt' | 'buildCompletedAt'
  >
): DocumentationStats {
  const executions = doc.phaseExecutions ?? [];

  const completedPhases = executions.filter((p) => p.status === 'completed').length;
  const failedPhases = executions.filter((p) => p.status === 'failed').length;
  const skippedPhases = executions.filter((p) => p.status === 'skipped').length;

  const implementedFeatures = executions
    .filter((p) => p.status === 'completed')
    .flatMap((p) => p.implementedFeatures ?? []).length;

  const totalTokensUsed = executions.reduce((sum, p) => {
    const tokens = p.tokensUsed;
    return sum + (tokens?.input ?? 0) + (tokens?.output ?? 0);
  }, 0);

  let totalBuildTime: number | undefined;
  if (doc.buildStartedAt && doc.buildCompletedAt) {
    totalBuildTime =
      new Date(doc.buildCompletedAt).getTime() - new Date(doc.buildStartedAt).getTime();
  }

  return {
    totalFeatures: doc.conceptSnapshot?.features?.length ?? 0,
    implementedFeatures,
    totalPhases: doc.planSnapshot?.totalPhases ?? 0,
    completedPhases,
    failedPhases,
    skippedPhases,
    totalBuildTime,
    totalTokensUsed: totalTokensUsed > 0 ? totalTokensUsed : undefined,
  };
}
