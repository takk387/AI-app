/**
 * Media Source Types
 *
 * Tracks which uploaded media file (image/video) produced which components.
 * Used by the multi-source merge pipeline (Gap 1).
 * Completely independent from the future preset library pipeline.
 */

import type { DesignSpec } from '@/types/designSpec';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { VideoMotionAnalysis } from '@/types/motionConfig';

/** A single uploaded media file with its analysis results */
export interface MediaSource {
  /** Unique identifier for this source */
  id: string;
  /** Source type */
  type: 'image' | 'video';
  /** Original filename */
  name: string;
  /** Base64 encoded media data */
  base64: string;
  /** Thumbnail for UI display (base64 or object URL) */
  thumbnail?: string;
  /** ISO timestamp when source was added */
  addedAt: string;
  /** Design spec extracted from this source (images only) */
  designSpec?: DesignSpec;
  /** Motion analysis extracted from this source (videos only) */
  motionAnalysis?: VideoMotionAnalysis;
  /** IDs of components extracted from this source */
  componentIds: string[];
  /** User instructions associated with this source */
  instructions?: string;
  /** Analysis status */
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  /** Error message if analysis failed */
  error?: string;
}

/** Strategy for merging multiple sources into a unified layout */
export interface MergeStrategy {
  /** Merge approach */
  type: 'additive' | 'selective' | 'replace';
  /** Which source IDs to include */
  sourceIds: string[];
  /** How to resolve conflicting design specs */
  designSpecStrategy: 'first' | 'last' | 'blend';
  /** How to handle spatially overlapping components */
  overlapStrategy: 'stack' | 'offset' | 'layer';
}

/** Result of a merge operation */
export interface MergedResult {
  components: DetectedComponentEnhanced[];
  designSpec: DesignSpec;
  warnings: string[];
}
