'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import type { SelectedElementInfo, ElementType } from '@/types/layoutDesign';
import {
  buildSelectedElementInfo,
  isSelectableElement,
  getElementBoundsRelative,
  inferElementType,
} from '@/utils/elementSelection';

interface HoverPreview {
  bounds: { x: number; y: number; width: number; height: number };
  type: ElementType;
  displayName: string;
}

interface ClickableOverlayProps {
  /** Reference to the container element (preview iframe or div) */
  containerRef: React.RefObject<HTMLElement>;
  /** Callback when an element is selected */
  onElementSelect: (element: SelectedElementInfo) => void;
  /** Whether click-to-select is enabled */
  enabled?: boolean;
  /** Current selected element (to exclude from hover effects) */
  selectedElementId?: string | null;
  /** Custom hover color */
  hoverColor?: string;
}

/**
 * ClickableOverlay Component
 *
 * An invisible overlay that detects hover and click events on preview elements.
 * Shows a hover preview before selection and calls onElementSelect when clicked.
 */
export function ClickableOverlay({
  containerRef,
  onElementSelect,
  enabled = true,
  selectedElementId,
  hoverColor = 'rgb(59, 130, 246)', // blue-500
}: ClickableOverlayProps) {
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * Find the nearest selectable element from a point
   */
  const findElementAtPoint = useCallback(
    (clientX: number, clientY: number): HTMLElement | null => {
      const container = containerRef.current;
      if (!container) return null;

      // Temporarily hide the overlay to get the element underneath
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.pointerEvents = 'none';
      }

      // Get element at point
      let element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

      // Restore pointer events
      if (overlay) {
        overlay.style.pointerEvents = 'auto';
      }

      if (!element) return null;

      // Check if element is within our container
      if (!container.contains(element)) return null;

      // Walk up the tree to find the nearest selectable element
      while (element && element !== container) {
        if (isSelectableElement(element)) {
          return element;
        }
        element = element.parentElement;
      }

      return null;
    },
    [containerRef]
  );

  /**
   * Handle mouse move to show hover preview
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      const element = findElementAtPoint(event.clientX, event.clientY);
      const container = containerRef.current;

      if (element && container) {
        const elementId = element.dataset.elementId || element.id;

        // Don't show hover for already selected element
        if (elementId === selectedElementId) {
          setHoverPreview(null);
          return;
        }

        const bounds = getElementBoundsRelative(element, container);
        const type = inferElementType(element);
        const displayName =
          element.dataset.elementLabel ||
          element.getAttribute('aria-label') ||
          type.charAt(0).toUpperCase() + type.slice(1);

        setHoverPreview({ bounds, type, displayName });
        setIsHovering(true);
      } else {
        setHoverPreview(null);
        setIsHovering(false);
      }
    },
    [enabled, findElementAtPoint, containerRef, selectedElementId]
  );

  /**
   * Handle click to select element
   */
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      event.preventDefault();
      event.stopPropagation();

      const element = findElementAtPoint(event.clientX, event.clientY);
      const container = containerRef.current;

      if (element && container) {
        const selectedInfo = buildSelectedElementInfo(element, container);
        onElementSelect(selectedInfo);
        setHoverPreview(null);
      }
    },
    [enabled, findElementAtPoint, containerRef, onElementSelect]
  );

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setHoverPreview(null);
    setIsHovering(false);
  }, []);

  /**
   * Handle keyboard navigation (Escape to deselect)
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedElementId) {
        // Deselect by selecting null (handled by parent)
        onElementSelect(null as unknown as SelectedElementInfo);
      }
    },
    [selectedElementId, onElementSelect]
  );

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;

    if (!container || !overlay || !enabled) return;

    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('click', handleClick);
    overlay.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('click', handleClick);
      overlay.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, enabled, handleMouseMove, handleClick, handleMouseLeave, handleKeyDown]);

  if (!enabled) return null;

  return (
    <>
      {/* Invisible overlay for event capture */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-40"
        style={{
          cursor: isHovering ? 'pointer' : 'default',
        }}
      />

      {/* Hover preview highlight */}
      {hoverPreview && (
        <div
          className="absolute pointer-events-none z-45 transition-all duration-100 ease-out"
          style={{
            left: hoverPreview.bounds.x,
            top: hoverPreview.bounds.y,
            width: hoverPreview.bounds.width,
            height: hoverPreview.bounds.height,
            border: `2px dashed ${hoverColor}80`,
            borderRadius: '4px',
            backgroundColor: `${hoverColor}10`,
          }}
        >
          {/* Hover label */}
          <div
            className="absolute -top-7 left-0 px-2 py-0.5 rounded text-xs font-medium text-white shadow-md whitespace-nowrap"
            style={{ backgroundColor: `${hoverColor}CC` }}
          >
            Click to edit {hoverPreview.displayName.toLowerCase()}
          </div>
        </div>
      )}

      {/* Instructions tooltip (shown when no element is selected) */}
      {!selectedElementId && !hoverPreview && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-3 py-2 rounded-lg bg-gray-900/90 text-gray-300 text-sm shadow-lg flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            <span>Click any element to edit it</span>
          </div>
        </div>
      )}
    </>
  );
}

export default ClickableOverlay;
