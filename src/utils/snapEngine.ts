/**
 * Snap Engine
 *
 * Pure utility for calculating alignment snap lines and snapping bounds
 * during drag/resize operations. No state, no side effects.
 *
 * Used by useDirectManipulation hook and ManipulationOverlay component.
 */

import type { Bounds, SnapLine } from '@/types/manipulation';

/** Threshold in percentage points for snapping (1% of canvas) */
const DEFAULT_SNAP_THRESHOLD = 1;

// ============================================================================
// SNAP LINE CALCULATION
// ============================================================================

/**
 * Calculate snap lines for a target bounds against all other component bounds.
 * Returns lines where the target aligns with edges or centers of other components.
 */
export function calculateSnapLines(
  target: Bounds,
  others: Array<{ id: string; bounds: Bounds }>,
  threshold: number = DEFAULT_SNAP_THRESHOLD
): SnapLine[] {
  const lines: SnapLine[] = [];

  const targetEdges = getBoundsEdges(target);

  for (const other of others) {
    const otherEdges = getBoundsEdges(other.bounds);

    // Vertical snap lines (left/right edges and center)
    const verticalPairs: Array<{ targetVal: number; otherVal: number; type: SnapLine['type'] }> = [
      { targetVal: targetEdges.left, otherVal: otherEdges.left, type: 'edge' },
      { targetVal: targetEdges.right, otherVal: otherEdges.right, type: 'edge' },
      { targetVal: targetEdges.left, otherVal: otherEdges.right, type: 'edge' },
      { targetVal: targetEdges.right, otherVal: otherEdges.left, type: 'edge' },
      { targetVal: targetEdges.centerX, otherVal: otherEdges.centerX, type: 'center' },
    ];

    for (const pair of verticalPairs) {
      if (Math.abs(pair.targetVal - pair.otherVal) <= threshold) {
        lines.push({
          orientation: 'vertical',
          position: pair.otherVal,
          type: pair.type,
          sourceId: other.id,
        });
      }
    }

    // Horizontal snap lines (top/bottom edges and center)
    const horizontalPairs: Array<{ targetVal: number; otherVal: number; type: SnapLine['type'] }> =
      [
        { targetVal: targetEdges.top, otherVal: otherEdges.top, type: 'edge' },
        { targetVal: targetEdges.bottom, otherVal: otherEdges.bottom, type: 'edge' },
        { targetVal: targetEdges.top, otherVal: otherEdges.bottom, type: 'edge' },
        { targetVal: targetEdges.bottom, otherVal: otherEdges.top, type: 'edge' },
        { targetVal: targetEdges.centerY, otherVal: otherEdges.centerY, type: 'center' },
      ];

    for (const pair of horizontalPairs) {
      if (Math.abs(pair.targetVal - pair.otherVal) <= threshold) {
        lines.push({
          orientation: 'horizontal',
          position: pair.otherVal,
          type: pair.type,
          sourceId: other.id,
        });
      }
    }
  }

  // Deduplicate lines at the same position and orientation
  return deduplicateSnapLines(lines);
}

// ============================================================================
// SNAP APPLICATION
// ============================================================================

/**
 * Snap bounds to the nearest snap lines within threshold.
 * Returns adjusted bounds that align to the closest guides.
 */
export function snapBounds(
  bounds: Bounds,
  snapLines: SnapLine[],
  threshold: number = DEFAULT_SNAP_THRESHOLD
): Bounds {
  let { top, left } = bounds;
  const { width, height } = bounds;
  const edges = getBoundsEdges(bounds);

  // Snap horizontally (adjust top)
  const horizontalLines = snapLines.filter((l) => l.orientation === 'horizontal');
  let bestHSnap: { delta: number; newTop: number } | null = null;

  for (const line of horizontalLines) {
    // Try snapping top edge
    const topDelta = Math.abs(edges.top - line.position);
    if (topDelta <= threshold) {
      if (!bestHSnap || topDelta < Math.abs(bestHSnap.delta)) {
        bestHSnap = { delta: topDelta, newTop: line.position };
      }
    }
    // Try snapping bottom edge
    const bottomDelta = Math.abs(edges.bottom - line.position);
    if (bottomDelta <= threshold) {
      if (!bestHSnap || bottomDelta < Math.abs(bestHSnap.delta)) {
        bestHSnap = { delta: bottomDelta, newTop: line.position - height };
      }
    }
    // Try snapping center
    const centerDelta = Math.abs(edges.centerY - line.position);
    if (centerDelta <= threshold && line.type === 'center') {
      if (!bestHSnap || centerDelta < Math.abs(bestHSnap.delta)) {
        bestHSnap = { delta: centerDelta, newTop: line.position - height / 2 };
      }
    }
  }

  if (bestHSnap) {
    top = bestHSnap.newTop;
  }

  // Snap vertically (adjust left)
  const verticalLines = snapLines.filter((l) => l.orientation === 'vertical');
  let bestVSnap: { delta: number; newLeft: number } | null = null;

  for (const line of verticalLines) {
    // Try snapping left edge
    const leftDelta = Math.abs(edges.left - line.position);
    if (leftDelta <= threshold) {
      if (!bestVSnap || leftDelta < Math.abs(bestVSnap.delta)) {
        bestVSnap = { delta: leftDelta, newLeft: line.position };
      }
    }
    // Try snapping right edge
    const rightDelta = Math.abs(edges.right - line.position);
    if (rightDelta <= threshold) {
      if (!bestVSnap || rightDelta < Math.abs(bestVSnap.delta)) {
        bestVSnap = { delta: rightDelta, newLeft: line.position - width };
      }
    }
    // Try snapping center
    const centerDelta = Math.abs(edges.centerX - line.position);
    if (centerDelta <= threshold && line.type === 'center') {
      if (!bestVSnap || centerDelta < Math.abs(bestVSnap.delta)) {
        bestVSnap = { delta: centerDelta, newLeft: line.position - width / 2 };
      }
    }
  }

  if (bestVSnap) {
    left = bestVSnap.newLeft;
  }

  return { top, left, width, height };
}

// ============================================================================
// HELPERS
// ============================================================================

interface BoundsEdges {
  top: number;
  left: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function getBoundsEdges(bounds: Bounds): BoundsEdges {
  return {
    top: bounds.top,
    left: bounds.left,
    right: bounds.left + bounds.width,
    bottom: bounds.top + bounds.height,
    centerX: bounds.left + bounds.width / 2,
    centerY: bounds.top + bounds.height / 2,
  };
}

function deduplicateSnapLines(lines: SnapLine[]): SnapLine[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = `${line.orientation}-${line.position.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
