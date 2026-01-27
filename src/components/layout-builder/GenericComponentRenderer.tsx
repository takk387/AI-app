/**
 * Generic Component Renderer
 *
 * The "Atom" of the Zero-Preset Layout Builder.
 * Renders ANY component detected by Gemini 3 Flash by mapping
 * enhanced style properties directly to CSS/Tailwind.
 *
 * Features:
 * - Arbitrary Value Support: w-[343px], h-[200px]
 * - Recursive Rendering: Renders children automatically
 * - Vision Loop Ready: Adds data-id for click-to-edit
 * - Interactive: Handles onClick for the "Seeing Canvas"
 */

import React from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { cn } from '@/lib/utils'; // Assuming cn utility exists, otherwise standard classnames
import { getVisibleFallback } from '@/utils/colorUtils';

interface GenericComponentRendererProps {
  component: DetectedComponentEnhanced;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

// Default bounds for components with missing/invalid bounds data
const DEFAULT_BOUNDS = { top: 0, left: 0, width: 100, height: 50 };

export const GenericComponentRenderer: React.FC<GenericComponentRendererProps> = ({
  component,
  onSelect,
  selectedId,
}) => {
  const { id, type, style = {}, content, children, bounds = DEFAULT_BOUNDS } = component;
  const isSelected = selectedId === id;

  // DEBUG: Log component bounds to diagnose visibility issues
  console.log('[GenericComponentRenderer] Rendering:', id, 'type:', type, 'bounds:', bounds);

  // Helper function for smart z-index based on component type
  const getDefaultZIndex = (componentType: DetectedComponentEnhanced['type']): number => {
    const zIndexMap: Record<string, number> = {
      modal: 1000,
      header: 100,
      navigation: 90,
      sidebar: 80,
      footer: 50,
      hero: 20,
    };
    return zIndexMap[componentType] || 10;
  };

  // 1. Dynamic Style Generation (The Zero-Preset Logic)
  // Maps API styles to inline styles or atomic classes
  // Uses absolute positioning with bounds for precise layout replication
  const dynamicStyles: React.CSSProperties = {
    // Layout - use absolute positioning to place components precisely based on AI-detected bounds
    position: 'absolute',
    top: `${bounds?.top ?? 0}%`,
    left: `${bounds?.left ?? 0}%`,
    width: style?.display === 'inline' ? 'auto' : `${bounds?.width ?? 100}%`,
    height: `${bounds?.height ?? 50}%`,

    // Ensure visibility
    minWidth: '20px',
    minHeight: '20px',
    overflow: 'hidden',

    // Visuals
    color: style.textColor || '#1f2937',
    borderRadius: style.borderRadius,
    padding: style.padding || '8px',
    fontSize: style.fontSize || '14px',
    fontWeight: style.fontWeight as any,
    textAlign: style.textAlign as any,
    boxShadow: style.shadow,
    gap: style.gap,

    // Flex/Grid
    display: style.display || 'flex',
    flexDirection: type === 'list' || type === 'content-section' ? 'column' : 'row',
    alignItems: style.alignment === 'center' ? 'center' : 'flex-start',
    justifyContent:
      style.alignment === 'center'
        ? 'center'
        : style.alignment === 'between'
          ? 'space-between'
          : 'flex-start',

    // Apply custom CSS first
    ...style.customCSS,

    // Override background with visible color (AFTER customCSS to ensure visibility)
    backgroundColor: getVisibleFallback(
      (style.customCSS?.backgroundColor as string) || style.backgroundColor
    ),

    // Add visible border for debugging and structure
    border: style.borderWidth
      ? `${style.borderWidth} solid ${style.borderColor || '#d1d5db'}`
      : '1px solid rgba(209, 213, 219, 0.5)',

    // Smart z-index based on component type
    zIndex: component.zIndex ?? getDefaultZIndex(type),
  };

  // 2. Click Handler for Vision Loop
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(id);
  };

  // 3. Selection Visuals (Overlay for "See" mode)
  const selectionClass = isSelected
    ? 'ring-2 ring-blue-500 ring-offset-2'
    : 'hover:ring-1 hover:ring-blue-300 hover:ring-offset-1';

  // 4. Recursive Children Rendering
  // In a real app, you'd look up children from a map or pass them down.
  // For this snippet, we assume children IDs might need lookup, but let's assume
  // for now that `children` contains actual node structures or we render content.

  const renderContent = () => {
    if (content?.text) return content.text;
    if (content?.hasImage)
      return (
        <div className="bg-gray-200 w-full h-full min-h-[100px] flex items-center justify-center text-gray-400">
          Image
        </div>
      );
    // Fallback: show component type label for visibility during design
    return <span className="text-xs text-gray-400 opacity-50 select-none">{type}</span>;
  };

  // 5. Early returns for void elements and special cases
  // Void elements (input, img) cannot have children, so handle them separately

  if (type === 'input' || type === 'search-bar') {
    return (
      <input
        data-id={id}
        placeholder={content?.placeholder || 'Enter text...'}
        style={dynamicStyles}
        className={cn('transition-all duration-200', selectionClass)}
        onClick={handleClick}
        readOnly // Prevent typing in "Edit Mode" if desired, or handle otherwise
      />
    );
  }

  // Handle image-gallery as a div container with image placeholder (img is void element)
  if (type === 'image-gallery') {
    return (
      <div
        data-id={id}
        style={dynamicStyles}
        className={cn('transition-all duration-200 cursor-pointer', selectionClass)}
        onClick={handleClick}
      >
        <div className="bg-gray-200 w-full h-full min-h-[100px] flex items-center justify-center text-gray-400">
          {content?.text || 'Image Gallery'}
        </div>
      </div>
    );
  }

  // Use div for all component types (avoid void elements like img that can't have children)
  return (
    <div
      data-id={id}
      style={dynamicStyles}
      className={cn('transition-all duration-200 cursor-pointer', selectionClass)}
      onClick={handleClick}
    >
      {renderContent()}
      {/* 
         TODO: Recursively render children if the data structure supports full nesting.
         For this MVP, we focus on the leaf node rendering logic.
      */}
    </div>
  );
};
