/**
 * Concept Change Detection
 *
 * Utilities for detecting meaningful changes in WizardState
 * that should trigger phase plan regeneration.
 */

import type { TechnicalRequirements } from '@/types/appConcept';

interface WizardState {
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;
  features: Array<{ name: string; description?: string; priority: 'high' | 'medium' | 'low' }>;
  technical: Partial<TechnicalRequirements>;
  uiPreferences: Record<string, unknown>;
  roles?: Array<{ name: string; capabilities: string[] }>;
  workflows?: Array<{
    name: string;
    description?: string;
    steps: string[];
    involvedRoles: string[];
  }>;
  isComplete: boolean;
  readyForPhases: boolean;
  /** True when user has confirmed the plan (prevents auto-regeneration) */
  planConfirmed?: boolean;
}

export interface ConceptChangeResult {
  hasSignificantChanges: boolean;
  changes: {
    featuresChanged: boolean;
    featureCount: { before: number; after: number };
    technicalChanged: boolean;
    rolesChanged: boolean;
    changedFields: string[];
  };
}

/**
 * Compute a deterministic signature of the structurally significant parts
 * of the wizard state. This is used to detect meaningful changes.
 */
export function computeConceptSignature(state: WizardState): string {
  const significantParts = {
    // Feature names and priorities (sorted for determinism)
    featureNames: state.features.map((f) => f.name).sort(),
    featurePriorities: state.features.map((f) => `${f.name}:${f.priority}`).sort(),
    // Technical requirements that affect architecture
    technicalFlags: {
      needsAuth: state.technical.needsAuth ?? false,
      needsDatabase: state.technical.needsDatabase ?? false,
      needsRealtime: state.technical.needsRealtime ?? false,
      needsFileUpload: state.technical.needsFileUpload ?? false,
      needsAPI: state.technical.needsAPI ?? false,
    },
    // Role names (sorted for determinism)
    roleNames: state.roles?.map((r) => r.name).sort() ?? [],
    // Workflow names (sorted for determinism)
    workflowNames: state.workflows?.map((w) => w.name).sort() ?? [],
  };

  return JSON.stringify(significantParts);
}

/**
 * Detect changes between two wizard states and return detailed change info.
 */
export function detectConceptChanges(
  prev: WizardState | null,
  current: WizardState
): ConceptChangeResult {
  // If no previous state, consider it a significant change (initial state)
  if (!prev) {
    return {
      hasSignificantChanges: true,
      changes: {
        featuresChanged: true,
        featureCount: { before: 0, after: current.features.length },
        technicalChanged: true,
        rolesChanged: current.roles !== undefined && current.roles.length > 0,
        changedFields: ['initial'],
      },
    };
  }

  const changedFields: string[] = [];

  // Check feature changes
  const prevFeatureNames = new Set(prev.features.map((f) => f.name));
  const currentFeatureNames = new Set(current.features.map((f) => f.name));
  const featuresChanged =
    prev.features.length !== current.features.length ||
    ![...currentFeatureNames].every((name) => prevFeatureNames.has(name)) ||
    prev.features.some((pf) => {
      const cf = current.features.find((f) => f.name === pf.name);
      return cf && cf.priority !== pf.priority;
    });

  if (featuresChanged) {
    changedFields.push('features');
  }

  // Check technical requirement changes
  const technicalChanged =
    prev.technical.needsAuth !== current.technical.needsAuth ||
    prev.technical.needsDatabase !== current.technical.needsDatabase ||
    prev.technical.needsRealtime !== current.technical.needsRealtime ||
    prev.technical.needsFileUpload !== current.technical.needsFileUpload ||
    prev.technical.needsAPI !== current.technical.needsAPI;

  if (technicalChanged) {
    changedFields.push('technical');
  }

  // Check role changes
  const prevRoleNames = new Set(prev.roles?.map((r) => r.name) ?? []);
  const currentRoleNames = new Set(current.roles?.map((r) => r.name) ?? []);
  const rolesChanged =
    (prev.roles?.length ?? 0) !== (current.roles?.length ?? 0) ||
    ![...currentRoleNames].every((name) => prevRoleNames.has(name));

  if (rolesChanged) {
    changedFields.push('roles');
  }

  // Check workflow changes
  const prevWorkflowNames = new Set(prev.workflows?.map((w) => w.name) ?? []);
  const currentWorkflowNames = new Set(current.workflows?.map((w) => w.name) ?? []);
  const workflowsChanged =
    (prev.workflows?.length ?? 0) !== (current.workflows?.length ?? 0) ||
    ![...currentWorkflowNames].every((name) => prevWorkflowNames.has(name));

  if (workflowsChanged) {
    changedFields.push('workflows');
  }

  const hasSignificantChanges =
    featuresChanged || technicalChanged || rolesChanged || workflowsChanged;

  return {
    hasSignificantChanges,
    changes: {
      featuresChanged,
      featureCount: { before: prev.features.length, after: current.features.length },
      technicalChanged,
      rolesChanged,
      changedFields,
    },
  };
}

/**
 * Determine if changes are significant enough to warrant plan regeneration.
 * This is a convenience wrapper around detectConceptChanges.
 */
export function shouldRegeneratePlan(
  prev: WizardState | null,
  current: WizardState,
  hasPlan: boolean
): boolean {
  // Only regenerate if a plan already exists
  if (!hasPlan) {
    return false;
  }

  // Don't regenerate if there's no previous state to compare
  if (!prev) {
    return false;
  }

  const changes = detectConceptChanges(prev, current);
  return changes.hasSignificantChanges;
}
