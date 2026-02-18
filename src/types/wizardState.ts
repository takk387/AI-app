/**
 * Consolidated WizardState Type
 *
 * Used across all wizard-related components and hooks.
 * This is the single source of truth for wizard state structure.
 */

import { nanoid } from 'nanoid';
import type { TechnicalRequirements, UIPreferences } from './appConcept';

/**
 * Feature as captured during wizard conversation
 * Note: `id` is optional during wizard but required when converting to AppConcept
 */
export interface WizardFeature {
  id?: string;
  name: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Role as captured during wizard conversation
 */
export interface WizardRole {
  name: string;
  capabilities: string[];
}

/**
 * Workflow as captured during wizard conversation
 */
export interface WizardWorkflow {
  name: string;
  description?: string;
  steps: string[];
  involvedRoles: string[];
}

/**
 * The main wizard state structure
 * Tracks app concept as it develops through conversation
 */
export interface WizardState {
  // Core identity
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;

  // Features (id optional during wizard)
  features: WizardFeature[];

  // Technical requirements
  technical: Partial<TechnicalRequirements>;

  // UI preferences
  uiPreferences?: Partial<UIPreferences>;

  // Roles and workflows
  roles?: WizardRole[];
  workflows?: WizardWorkflow[];

  // State flags
  isComplete: boolean;
  readyForPhases?: boolean;

  /** True when user has confirmed the plan (prevents auto-regeneration) */
  planConfirmed?: boolean;

  /** Vision Document — rich PRD built progressively via parallel AI extraction */
  visionDocument?: VisionDocument;
}

// ============================================================================
// Vision Document Types (VisionBoard-format PRD)
// ============================================================================

/**
 * A feature with rich specification detail — user stories, behavior states,
 * acceptance criteria, edge cases, and UX notes.
 */
export interface VisionFeature {
  id: string;
  title: string;
  userStory: string;
  description: string;
  behavior: string;
  acceptanceCriteria: string[];
  edgeCases: string;
  uxNotes: string;
  complexityLevel: 'low' | 'medium' | 'high';
}

/**
 * A rich Vision Document (PRD) progressively built during wizard conversation.
 * Contains specification-grade detail for every aspect of the app.
 */
export interface VisionDocument {
  name?: string;
  overview?: string;
  corePurpose?: string;
  targetAudience?: string;
  competitiveEdge?: string;
  features: VisionFeature[];
  userFlow?: string;
  pageBreakdown?: string;
  designMood?: string;
}

/**
 * Generate a stable, unique feature ID using nanoid
 * Use this instead of index-based IDs like `feature-${index}`
 */
export function generateFeatureId(): string {
  return `feat_${nanoid(8)}`;
}

/**
 * Helper to convert WizardFeature[] to Feature[] with generated IDs
 * Ensures all features have stable IDs when converting to AppConcept
 */
export function wizardFeaturesToFeatures(wizardFeatures: WizardFeature[]): Array<{
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}> {
  return wizardFeatures.map((f) => ({
    id: f.id || generateFeatureId(),
    name: f.name,
    description: f.description || '',
    priority: f.priority,
  }));
}
