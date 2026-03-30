/**
 * Dynamic Phase Generation System - Utility Types
 *
 * Grouped features, dependency graph, and plan validation types.
 */

import type { FeatureDomain, FeatureClassification } from './classification';

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Grouped features by domain
 */
export type FeaturesByDomain = Map<FeatureDomain, FeatureClassification[]>;

/**
 * Phase dependency graph
 */
export interface PhaseDependencyGraph {
  nodes: number[]; // Phase numbers
  edges: Array<{ from: number; to: number }>; // Dependencies
}

/**
 * Validation result for a phase plan
 */
export interface PhasePlanValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
