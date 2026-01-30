'use client';

/**
 * Manipulation Overlay
 *
 * Transparent overlay rendered on top of the canvas when edit mode is active.
 * Provides:
 * - Drag handles for moving components
 * - Resize handles (8-point: 4 corners + 4 edges)
 * - Snap guide lines during drag/resize
 *
 * This is a separate layer — does NOT modify GenericComponentRenderer internals.
 */

import React, { useCallback, useRef } from 'react';
import type { Bounds, ResizeHandle, DragState, SnapLine } from '@/types/manipulation';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

interface ManipulationOverlayProps {
  /** All components to show handles for */
  components: DetectedComponentEnhanced[];
  /** Currently selected component ID */
  selectedId: string | null;
  /** Current drag state from useDirectManipulation */
  dragState: DragState | null;
  /** Active snap lines */
  snapLines: SnapLine[];
  /** Start move on component */
  onStartMove: (
    componentId: string,
    startBounds: Bounds,
    pointerX: number,
    pointerY: number,
    canvasRect: DOMRect
  ) => void;
  /** Start resize on handle */
  onStartResize: (
    componentId: string,
    handle: ResizeHandle,
    startBounds: Bounds,
    pointerX: number,
    pointerY: number,
    canvasRect: DOMRect
  ) => void;
  /** Update drag position */
  onUpdateDrag: (
    pointerX: number,
    pointerY: number,
    canvasRect: DOMRect,
    otherComponents: Array<{ id: string; bounds: Bounds }>
  ) => Bounds | null;
  /** End drag */
  onEndDrag: () => Bounds | null;
  /** Commit final bounds */
  onCommitBounds: (id: string, bounds: Bounds) => void;
}

// ============================================================================
// RESIZE HANDLE POSITIONS
// ============================================================================

const HANDLE_SIZE = 8; // px
const HANDLE_HALF = HANDLE_SIZE / 2;

const RESIZE_HANDLES: Array<{
  handle: ResizeHandle;
  cursor: string;
  getPos: (b: Bounds) => { top: string; left: string };
}> = [
  {
    handle: 'top-left',
    cursor: 'nwse-resize',
    getPos: (b) => ({ top: `${b.top}%`, left: `${b.left}%` }),
  },
  {
    handle: 'top',
    cursor: 'ns-resize',
    getPos: (b) => ({ top: `${b.top}%`, left: `${b.left + b.width / 2}%` }),
  },
  {
    handle: 'top-right',
    cursor: 'nesw-resize',
    getPos: (b) => ({ top: `${b.top}%`, left: `${b.left + b.width}%` }),
  },
  {
    handle: 'right',
    cursor: 'ew-resize',
    getPos: (b) => ({ top: `${b.top + b.height / 2}%`, left: `${b.left + b.width}%` }),
  },
  {
    handle: 'bottom-right',
    cursor: 'nwse-resize',
    getPos: (b) => ({ top: `${b.top + b.height}%`, left: `${b.left + b.width}%` }),
  },
  {
    handle: 'bottom',
    cursor: 'ns-resize',
    getPos: (b) => ({ top: `${b.top + b.height}%`, left: `${b.left + b.width / 2}%` }),
  },
  {
    handle: 'bottom-left',
    cursor: 'nesw-resize',
    getPos: (b) => ({ top: `${b.top + b.height}%`, left: `${b.left}%` }),
  },
  {
    handle: 'left',
    cursor: 'ew-resize',
    getPos: (b) => ({ top: `${b.top + b.height / 2}%`, left: `${b.left}%` }),
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ManipulationOverlay: React.FC<ManipulationOverlayProps> = ({
  components,
  selectedId,
  dragState,
  snapLines,
  onStartMove,
  onStartResize,
  onUpdateDrag,
  onEndDrag,
  onCommitBounds,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const selectedComponent = selectedId ? components.find((c) => c.id === selectedId) : null;

  // Get bounds — use dragState if actively dragging this component
  const getActiveBounds = useCallback(
    (comp: DetectedComponentEnhanced): Bounds => {
      if (dragState && dragState.componentId === comp.id) {
        return dragState.currentBounds;
      }
      return comp.bounds;
    },
    [dragState]
  );

  const getCanvasRect = useCallback((): DOMRect | null => {
    return overlayRef.current?.getBoundingClientRect() ?? null;
  }, []);

  const getOtherComponents = useCallback(
    (excludeId: string): Array<{ id: string; bounds: Bounds }> => {
      return components
        .filter((c) => c.id !== excludeId && c.visible !== false)
        .map((c) => ({ id: c.id, bounds: c.bounds }));
    },
    [components]
  );

  // Pointer move handler (when dragging)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const rect = getCanvasRect();
      if (!rect) return;
      const others = getOtherComponents(dragState.componentId);
      onUpdateDrag(e.clientX, e.clientY, rect, others);
    },
    [dragState, getCanvasRect, getOtherComponents, onUpdateDrag]
  );

  // Pointer up handler (end drag, commit bounds)
  const handlePointerUp = useCallback(() => {
    if (!dragState) return;
    const finalBounds = onEndDrag();
    if (finalBounds) {
      onCommitBounds(dragState.componentId, finalBounds);
    }
  }, [dragState, onEndDrag, onCommitBounds]);

  // Start move on component body
  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, comp: DetectedComponentEnhanced) => {
      if (comp.locked) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = getCanvasRect();
      if (!rect) return;
      onStartMove(comp.id, comp.bounds, e.clientX, e.clientY, rect);
    },
    [getCanvasRect, onStartMove]
  );

  // Start resize on handle
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, comp: DetectedComponentEnhanced, handle: ResizeHandle) => {
      if (comp.locked) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = getCanvasRect();
      if (!rect) return;
      onStartResize(comp.id, handle, comp.bounds, e.clientX, e.clientY, rect);
    },
    [getCanvasRect, onStartResize]
  );

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-40"
      style={{ pointerEvents: dragState ? 'all' : 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Selection outline + handles for selected component */}
      {selectedComponent && (
        <SelectionBox
          bounds={getActiveBounds(selectedComponent)}
          locked={selectedComponent.locked === true}
          onPointerDown={(e) => handleComponentPointerDown(e, selectedComponent)}
          onResizePointerDown={(e, handle) => handleResizePointerDown(e, selectedComponent, handle)}
        />
      )}

      {/* Snap guide lines */}
      {snapLines.map((line, i) => (
        <SnapGuideLine key={`${line.orientation}-${line.position}-${i}`} line={line} />
      ))}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SelectionBoxProps {
  bounds: Bounds;
  locked: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizePointerDown: (e: React.PointerEvent, handle: ResizeHandle) => void;
}

const SelectionBox: React.FC<SelectionBoxProps> = ({
  bounds,
  locked,
  onPointerDown,
  onResizePointerDown,
}) => {
  return (
    <>
      {/* Selection outline (click to move) */}
      <div
        className="absolute border-2 border-blue-500"
        style={{
          top: `${bounds.top}%`,
          left: `${bounds.left}%`,
          width: `${bounds.width}%`,
          height: `${bounds.height}%`,
          pointerEvents: 'all',
          cursor: locked ? 'not-allowed' : 'move',
        }}
        onPointerDown={onPointerDown}
      />

      {/* Resize handles (hidden when locked) */}
      {!locked &&
        RESIZE_HANDLES.map(({ handle, cursor, getPos }) => {
          const pos = getPos(bounds);
          return (
            <div
              key={handle}
              className="absolute bg-white border-2 border-blue-500 rounded-sm"
              style={{
                top: pos.top,
                left: pos.left,
                width: `${HANDLE_SIZE}px`,
                height: `${HANDLE_SIZE}px`,
                transform: `translate(-${HANDLE_HALF}px, -${HANDLE_HALF}px)`,
                cursor,
                pointerEvents: 'all',
                zIndex: 50,
              }}
              onPointerDown={(e) => onResizePointerDown(e, handle)}
            />
          );
        })}
    </>
  );
};

interface SnapGuideLineProps {
  line: SnapLine;
}

const SnapGuideLine: React.FC<SnapGuideLineProps> = ({ line }) => {
  const isVertical = line.orientation === 'vertical';
  const color = line.type === 'center' ? '#f59e0b' : '#ef4444'; // amber for center, red for edge

  return (
    <div
      className="absolute pointer-events-none"
      style={
        isVertical
          ? {
              left: `${line.position}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: color,
              opacity: 0.7,
            }
          : {
              top: `${line.position}%`,
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: color,
              opacity: 0.7,
            }
      }
    />
  );
};

export default ManipulationOverlay;
