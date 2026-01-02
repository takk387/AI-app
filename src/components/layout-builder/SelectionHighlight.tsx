'use client';

import { useEffect, useState } from 'react';
import type { ElementBounds, SelectedElementInfo } from '@/types/layoutDesign';

interface SelectionHighlightProps {
  /** The selected element info containing bounds */
  selectedElement: SelectedElementInfo | null;
  /** Container element for relative positioning */
  containerRef?: React.RefObject<HTMLElement>;
  /** Custom border color */
  borderColor?: string;
  /** Whether to show the element label */
  showLabel?: boolean;
  /** Whether to animate the highlight */
  animated?: boolean;
  /** Callback when "Done editing" is clicked */
  onDoneEditing?: () => void;
}

/**
 * SelectionHighlight Component
 *
 * Renders a blue outline around the currently selected element in the preview.
 * Positioned absolutely based on the element's bounds.
 */
export function SelectionHighlight({
  selectedElement,
  containerRef,
  borderColor = 'rgb(59, 130, 246)', // blue-500
  showLabel = true,
  animated = true,
  onDoneEditing,
}: SelectionHighlightProps) {
  const [bounds, setBounds] = useState<ElementBounds | null>(null);

  // Update bounds when selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      setBounds(selectedElement.bounds);
    } else {
      setBounds(null);
    }
  }, [selectedElement]);

  if (!selectedElement || !bounds) {
    return null;
  }

  const { displayName, type } = selectedElement;

  return (
    <>
      {/* Main highlight border */}
      <div
        className={`absolute pointer-events-none z-50 ${animated ? 'transition-all duration-200 ease-out' : ''}`}
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          border: `2px solid ${borderColor}`,
          borderRadius: '4px',
          boxShadow: `0 0 0 4px ${borderColor}20`,
        }}
      >
        {/* Corner handles for visual feedback */}
        <div
          className="absolute -top-1 -left-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
        <div
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
        <div
          className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
        <div
          className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
      </div>

      {/* Element label */}
      {showLabel && (
        <div
          className={`absolute z-50 flex items-center gap-2 ${animated ? 'transition-all duration-200 ease-out' : ''}`}
          style={{
            left: bounds.x,
            top: bounds.y - 32,
          }}
        >
          {/* Label badge */}
          <div
            className="px-2 py-1 rounded text-xs font-medium text-white shadow-lg flex items-center gap-1.5"
            style={{ backgroundColor: borderColor }}
          >
            <ElementTypeIcon type={type} />
            <span>{displayName || type}</span>
          </div>

          {/* Done editing button */}
          {onDoneEditing && (
            <button
              onClick={onDoneEditing}
              className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-1 pointer-events-auto"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Done editing
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Small icon representing the element type
 */
function ElementTypeIcon({ type }: { type: string }) {
  const iconPaths: Record<string, string> = {
    header: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
    footer: 'M4 17a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z',
    sidebar: 'M4 4h4v16H4V4zm6 0h10v16H10V4z',
    button: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
    text: 'M4 6h16M4 12h16M4 18h10',
    heading: 'M4 6h16M4 10h12',
    image:
      'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    card: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    nav: 'M4 6h16M4 12h16M4 18h16',
    list: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    form: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    section: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
  };

  const path = iconPaths[type] || iconPaths.section;

  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

export default SelectionHighlight;
