'use client';

/**
 * InspectorOverlay - Full-page overlay for element hover/click detection
 * Renders highlight outlines for hovered and selected elements.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { InspectedElement } from '@/types/elementInspector';

interface InspectorOverlayProps {
  hoveredElement: HTMLElement | null;
  selectedElements: InspectedElement[];
  onHover: (element: HTMLElement | null) => void;
  onSelect: (element: HTMLElement) => void;
}

/** Elements to ignore during inspection */
const IGNORED_SELECTORS = [
  '[data-inspector-overlay]',
  '[data-inspector-panel]',
  '[data-inspector-button]',
  '[data-inspector-modal]',
  '.debug-panel',
];

export function InspectorOverlay({
  hoveredElement,
  selectedElements,
  onHover,
  onSelect,
}: InspectorOverlayProps): React.ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);

  /** Check if an element should be ignored */
  const shouldIgnoreElement = useCallback((element: HTMLElement): boolean => {
    return IGNORED_SELECTORS.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
  }, []);

  /** Handle mouse move to track hovered element */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.style.pointerEvents = 'none';
    }

    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;

    if (overlay) {
      overlay.style.pointerEvents = 'auto';
    }

    if (element && !shouldIgnoreElement(element)) {
      onHover(element);
    } else {
      onHover(null);
    }
  }, [onHover, shouldIgnoreElement]);

  /** Handle click to select element */
  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    console.log('[Overlay] Click detected on:', target?.tagName, target?.className?.slice?.(0, 50));
    console.log('[Overlay] shouldIgnore:', target && shouldIgnoreElement(target));

    // Don't intercept clicks on inspector UI elements
    if (target && shouldIgnoreElement(target)) {
      console.log('[Overlay] Letting click through to UI');
      return; // Let the click through to the UI
    }

    console.log('[Overlay] Blocking click for element selection');
    e.preventDefault();
    e.stopPropagation();

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.style.pointerEvents = 'none';
    }

    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;

    if (overlay) {
      overlay.style.pointerEvents = 'auto';
    }

    if (element && !shouldIgnoreElement(element)) {
      onSelect(element);
    }
  }, [onSelect, shouldIgnoreElement]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [handleMouseMove, handleClick]);

  return (
    <div
      ref={overlayRef}
      data-inspector-overlay
      className="fixed inset-0 z-[9998] pointer-events-auto"
      style={{ cursor: 'crosshair' }}
    >
      {/* Hover Highlight */}
      {hoveredElement && (
        <ElementHighlight
          element={hoveredElement}
          color="rgba(59, 130, 246, 0.3)"
          borderColor="rgb(59, 130, 246)"
          label={generateQuickLabel(hoveredElement)}
        />
      )}

      {/* Selected Highlights */}
      {selectedElements.map((el, index) => (
        <ElementHighlight
          key={el.id}
          element={el.element}
          color="rgba(34, 197, 94, 0.2)"
          borderColor="rgb(34, 197, 94)"
          label={`${index + 1}: ${el.displayName}`}
          showIndex={index + 1}
        />
      ))}
    </div>
  );
}

/** Individual element highlight component */
interface ElementHighlightProps {
  element: HTMLElement;
  color: string;
  borderColor: string;
  label: string;
  showIndex?: number;
}

function ElementHighlight({
  element,
  color,
  borderColor,
  label,
  showIndex,
}: ElementHighlightProps): React.ReactElement | null {
  const [rect, setRect] = useState(() => element.getBoundingClientRect());

  // Update rect on scroll/resize
  useEffect(() => {
    const updateRect = () => setRect(element.getBoundingClientRect());
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [element]);

  if (rect.width === 0 || rect.height === 0) {
    return null;
  }

  return (
    <>
      {/* Highlight box */}
      <div
        className="absolute pointer-events-none transition-all duration-75"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          backgroundColor: color,
          border: `2px solid ${borderColor}`,
          boxSizing: 'border-box',
        }}
      />

      {/* Label */}
      <div
        className="absolute pointer-events-none px-2 py-1 rounded text-xs font-mono shadow-lg"
        style={{
          top: Math.max(0, rect.top - 24),
          left: rect.left,
          backgroundColor: borderColor,
          color: 'white',
          maxWidth: '300px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {showIndex && (
          <span className="inline-flex items-center justify-center w-4 h-4 mr-1 bg-white/20 rounded-full text-[10px]">
            {showIndex}
          </span>
        )}
        {label}
      </div>
    </>
  );
}

/** Generate a quick label for hover preview */
function generateQuickLabel(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const cls = element.classList[0] ? `.${element.classList[0]}` : '';
  return `${tag}${id}${cls}`;
}

export default InspectorOverlay;
