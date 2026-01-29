/**
 * Layout Analysis Types
 *
 * Structured result types for the layout analysis pipeline.
 * These types ensure that design specifications, components, and errors
 * are all propagated through the system rather than being discarded.
 */

import type { DetectedComponentEnhanced } from './layoutDesign';
import type { DesignSpec } from './designSpec';

/**
 * Result from layout image analysis (two-stage process)
 * Includes both components AND the design specification
 */
export interface LayoutAnalysisResult {
  /** Whether the analysis completed successfully */
  success: boolean;

  /** Detected components from the image */
  components: DetectedComponentEnhanced[];

  /** Extracted design specification (colors, typography, spacing, etc.) */
  designSpec: DesignSpec | null;

  /** Errors that occurred during analysis */
  errors: string[];

  /** Non-critical warnings */
  warnings: string[];

  /** Metadata about the analysis process */
  metadata: {
    /** Number of components detected */
    componentCount: number;
    /** Number of JSON parse attempts made */
    parseAttempts: number;
    /** Number of components recovered from partial data */
    recoveredComponents: number;
    /** Whether Stage 1 (DesignSpec extraction) succeeded */
    designSpecExtracted: boolean;
    /** Whether Stage 2 (component building) succeeded */
    componentsBuilt: boolean;
  };
}

/**
 * Enhanced critique result with structured corrections
 * Used by the self-healing vision loop
 */
export interface LayoutCritiqueEnhanced {
  /** Overall fidelity score (0-100) */
  fidelityScore: number;

  /** Human-readable assessment */
  overallAssessment: string;

  /** List of specific discrepancies with corrections */
  discrepancies: LayoutDiscrepancy[];

  /** Whether the layout passes the fidelity threshold */
  passesThreshold: boolean;

  /** Recommended action */
  recommendation: 'accept' | 'refine' | 'regenerate';
}

/**
 * Individual discrepancy found during critique
 */
export interface LayoutDiscrepancy {
  /** ID of the affected component */
  componentId: string;

  /** Type of issue detected */
  issue:
    | 'color_drift'
    | 'spacing_error'
    | 'typography_mismatch'
    | 'position_offset'
    | 'size_mismatch'
    | 'missing_element'
    | 'extra_element'
    | 'content_mismatch';

  /** Severity of the discrepancy */
  severity: 'minor' | 'moderate' | 'critical';

  /** What was expected */
  expected: string;

  /** What was actually found */
  actual: string;

  /** JSON patch to apply as correction */
  correctionJSON?: Partial<DetectedComponentEnhanced>;
}

/**
 * Configuration for the self-healing vision loop
 */
export interface SelfHealingConfig {
  /** Maximum number of refinement iterations (default: 3) */
  maxIterations: number;

  /** Target fidelity score to achieve (default: 95) */
  targetFidelity: number;

  /** Minimum improvement required to continue (default: 2) */
  minImprovementThreshold: number;

  /** Whether to save version snapshots before each iteration */
  saveSnapshots: boolean;
}

/**
 * Result from a self-healing loop execution
 */
export interface SelfHealingResult {
  /** Final components after all refinements */
  finalComponents: DetectedComponentEnhanced[];

  /** Final design spec (may be updated during healing) */
  finalDesignSpec: DesignSpec | null;

  /** Number of iterations performed */
  iterations: number;

  /** Final fidelity score achieved */
  finalFidelityScore: number;

  /** Whether the target fidelity was reached */
  targetReached: boolean;

  /** Why the loop stopped */
  stopReason: 'target_reached' | 'max_iterations' | 'diminishing_returns' | 'user_cancelled' | 'error';

  /** History of each iteration */
  history: SelfHealingIteration[];
}

/**
 * Record of a single self-healing iteration
 */
export interface SelfHealingIteration {
  /** Iteration number (1-based) */
  iteration: number;

  /** Fidelity score at this iteration */
  fidelityScore: number;

  /** Score improvement from previous iteration */
  improvement: number;

  /** Number of changes applied */
  changesApplied: number;

  /** IDs of components that were modified */
  modifiedComponentIds: string[];

  /** Version snapshot ID (if saveSnapshots enabled) */
  snapshotId?: string;
}

/**
 * Request for screenshot API
 */
export interface ScreenshotRequest {
  /** Rendered HTML to screenshot */
  html: string;

  /** Optional CSS to inject */
  css?: string;

  /** Viewport dimensions */
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Response from screenshot API
 */
export interface ScreenshotResponse {
  /** Whether the screenshot was captured successfully */
  success: boolean;

  /** Base64 encoded PNG image */
  image?: string;

  /** Error message if failed */
  error?: string;
}
