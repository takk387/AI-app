/**
 * Direct Manipulation Types
 *
 * Types for the drag/resize/snap interaction layer (Gap 3).
 * Used by useDirectManipulation hook and ManipulationOverlay component.
 */

/** Component bounds as percentages (0-100) */
export interface Bounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Which resize handle is being dragged */
export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

/** A snap alignment guide line */
export interface SnapLine {
  /** Orientation of the guide */
  orientation: 'horizontal' | 'vertical';
  /** Position as percentage (0-100) */
  position: number;
  /** What this line snaps to */
  type: 'edge' | 'center' | 'spacing';
  /** Source component ID (what we're snapping to) */
  sourceId: string;
}

/** Current drag/resize state */
export interface DragState {
  /** Component being manipulated */
  componentId: string;
  /** Type of manipulation */
  mode: 'move' | 'resize';
  /** Resize handle being dragged (if mode === 'resize') */
  handle?: ResizeHandle;
  /** Starting bounds before manipulation */
  startBounds: Bounds;
  /** Starting mouse position in canvas percentage coords */
  startPointer: { x: number; y: number };
  /** Current bounds during manipulation */
  currentBounds: Bounds;
  /** Active snap lines */
  activeSnapLines: SnapLine[];
}
