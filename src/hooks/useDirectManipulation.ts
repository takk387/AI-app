/**
 * useDirectManipulation Hook
 *
 * Manages drag/resize interaction state for the canvas overlay.
 * Converts pixel-based pointer events to percentage-based bounds updates.
 *
 * Features:
 * - Move: drag component body to reposition
 * - Resize: 8 handles (4 corners + 4 edges)
 * - Snap: alignment guides to other components
 * - Keyboard: arrow keys for nudge
 * - Lock: respects component.locked flag
 */

import { useState, useCallback, useRef } from 'react';
import type { Bounds, ResizeHandle, DragState, SnapLine } from '@/types/manipulation';
import { calculateSnapLines, snapBounds } from '@/utils/snapEngine';

// ============================================================================
// TYPES
// ============================================================================

interface UseDirectManipulationReturn {
  /** Current drag/resize state (null when idle) */
  dragState: DragState | null;

  /** Active snap guide lines */
  activeSnapLines: SnapLine[];

  /** Whether edit mode is enabled */
  editMode: boolean;

  /** Toggle edit mode on/off */
  setEditMode: (enabled: boolean) => void;

  /** Start a move operation */
  startMove: (
    componentId: string,
    startBounds: Bounds,
    pointerX: number,
    pointerY: number,
    canvasRect: DOMRect
  ) => void;

  /** Start a resize operation */
  startResize: (
    componentId: string,
    handle: ResizeHandle,
    startBounds: Bounds,
    pointerX: number,
    pointerY: number,
    canvasRect: DOMRect
  ) => void;

  /** Update during drag (call on pointermove) */
  updateDrag: (
    pointerX: number,
    pointerY: number,
    canvasRect: DOMRect,
    otherComponents: Array<{ id: string; bounds: Bounds }>
  ) => Bounds | null;

  /** End drag and return final bounds */
  endDrag: () => Bounds | null;

  /** Nudge selected component by percentage */
  nudge: (
    componentId: string,
    currentBounds: Bounds,
    deltaTop: number,
    deltaLeft: number
  ) => Bounds;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDirectManipulation(): UseDirectManipulationReturn {
  const [editMode, setEditMode] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<SnapLine[]>([]);
  const dragStateRef = useRef<DragState | null>(null);

  /**
   * Convert pixel coordinates to percentage of canvas.
   */
  const pixelToPercent = useCallback(
    (px: number, py: number, canvasRect: DOMRect): { x: number; y: number } => ({
      x: ((px - canvasRect.left) / canvasRect.width) * 100,
      y: ((py - canvasRect.top) / canvasRect.height) * 100,
    }),
    []
  );

  const startMove = useCallback(
    (
      componentId: string,
      startBounds: Bounds,
      pointerX: number,
      pointerY: number,
      canvasRect: DOMRect
    ) => {
      const startPointer = pixelToPercent(pointerX, pointerY, canvasRect);
      const state: DragState = {
        componentId,
        mode: 'move',
        startBounds: { ...startBounds },
        startPointer,
        currentBounds: { ...startBounds },
        activeSnapLines: [],
      };
      dragStateRef.current = state;
      setDragState(state);
      setActiveSnapLines([]);
    },
    [pixelToPercent]
  );

  const startResize = useCallback(
    (
      componentId: string,
      handle: ResizeHandle,
      startBounds: Bounds,
      pointerX: number,
      pointerY: number,
      canvasRect: DOMRect
    ) => {
      const startPointer = pixelToPercent(pointerX, pointerY, canvasRect);
      const state: DragState = {
        componentId,
        mode: 'resize',
        handle,
        startBounds: { ...startBounds },
        startPointer,
        currentBounds: { ...startBounds },
        activeSnapLines: [],
      };
      dragStateRef.current = state;
      setDragState(state);
      setActiveSnapLines([]);
    },
    [pixelToPercent]
  );

  const updateDrag = useCallback(
    (
      pointerX: number,
      pointerY: number,
      canvasRect: DOMRect,
      otherComponents: Array<{ id: string; bounds: Bounds }>
    ): Bounds | null => {
      const current = dragStateRef.current;
      if (!current) return null;

      const pointer = pixelToPercent(pointerX, pointerY, canvasRect);
      const deltaX = pointer.x - current.startPointer.x;
      const deltaY = pointer.y - current.startPointer.y;

      let newBounds: Bounds;

      if (current.mode === 'move') {
        newBounds = {
          top: current.startBounds.top + deltaY,
          left: current.startBounds.left + deltaX,
          width: current.startBounds.width,
          height: current.startBounds.height,
        };
      } else {
        newBounds = applyResize(current.startBounds, current.handle!, deltaX, deltaY);
      }

      // Clamp to canvas boundaries (0-100%)
      newBounds = clampBounds(newBounds);

      // Calculate and apply snap
      const snaps = calculateSnapLines(newBounds, otherComponents);
      const snapped = snapBounds(newBounds, snaps);
      setActiveSnapLines(snaps);

      const updated: DragState = {
        ...current,
        currentBounds: snapped,
        activeSnapLines: snaps,
      };
      dragStateRef.current = updated;
      setDragState(updated);

      return snapped;
    },
    [pixelToPercent]
  );

  const endDrag = useCallback((): Bounds | null => {
    const current = dragStateRef.current;
    if (!current) return null;

    const finalBounds = { ...current.currentBounds };
    dragStateRef.current = null;
    setDragState(null);
    setActiveSnapLines([]);

    return finalBounds;
  }, []);

  const nudge = useCallback(
    (_componentId: string, currentBounds: Bounds, deltaTop: number, deltaLeft: number): Bounds => {
      return clampBounds({
        top: currentBounds.top + deltaTop,
        left: currentBounds.left + deltaLeft,
        width: currentBounds.width,
        height: currentBounds.height,
      });
    },
    []
  );

  return {
    dragState,
    activeSnapLines,
    editMode,
    setEditMode,
    startMove,
    startResize,
    updateDrag,
    endDrag,
    nudge,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Apply resize deltas to bounds based on which handle is being dragged.
 */
function applyResize(start: Bounds, handle: ResizeHandle, deltaX: number, deltaY: number): Bounds {
  const minSize = 2; // Minimum 2% width/height
  let { top, left, width, height } = start;

  switch (handle) {
    case 'top-left':
      top += deltaY;
      left += deltaX;
      width -= deltaX;
      height -= deltaY;
      break;
    case 'top':
      top += deltaY;
      height -= deltaY;
      break;
    case 'top-right':
      top += deltaY;
      width += deltaX;
      height -= deltaY;
      break;
    case 'right':
      width += deltaX;
      break;
    case 'bottom-right':
      width += deltaX;
      height += deltaY;
      break;
    case 'bottom':
      height += deltaY;
      break;
    case 'bottom-left':
      left += deltaX;
      width -= deltaX;
      height += deltaY;
      break;
    case 'left':
      left += deltaX;
      width -= deltaX;
      break;
  }

  // Enforce minimum size
  width = Math.max(width, minSize);
  height = Math.max(height, minSize);

  return { top, left, width, height };
}

/**
 * Clamp bounds to canvas boundaries (0-100%).
 */
function clampBounds(bounds: Bounds): Bounds {
  return {
    top: Math.max(0, Math.min(bounds.top, 100 - bounds.height)),
    left: Math.max(0, Math.min(bounds.left, 100 - bounds.width)),
    width: Math.max(2, Math.min(bounds.width, 100)),
    height: Math.max(2, Math.min(bounds.height, 100)),
  };
}
