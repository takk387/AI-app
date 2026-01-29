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
import { getVisibleFallback, type ColorContext } from '@/utils/colorUtils';

interface GenericComponentRendererProps {
  component: DetectedComponentEnhanced;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

// Default bounds for components with missing/invalid bounds data
// Using smaller defaults to prevent full-width stacking
const DEFAULT_BOUNDS = { top: 0, left: 0, width: 20, height: 10 };

export const GenericComponentRenderer: React.FC<GenericComponentRendererProps> = ({
  component,
  onSelect,
  selectedId,
}) => {
  const { id, type, style = {}, content, bounds = DEFAULT_BOUNDS } = component;
  const isSelected = selectedId === id;

  // DEBUG: Log component bounds to diagnose visibility issues (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[GenericComponentRenderer] Rendering:', id, 'type:', type, 'bounds:', bounds);
  }

  // Helper function for smart z-index based on component type
  const getDefaultZIndex = (componentType: DetectedComponentEnhanced['type']): number => {
    const zIndexMap: Record<string, number> = {
      modal: 1000,
      header: 100,
      navigation: 90,
      sidebar: 80,
      footer: 50,
      hero: 20,
      'main-canvas': 1, // Container should be behind everything
      container: 1,
    };
    return zIndexMap[componentType] || 10;
  };

  // Helper to check if component is a full-viewport container
  const isFullViewportContainer = (): boolean => {
    const containerTypes = ['main-canvas', 'container', 'content-section'];
    return (
      containerTypes.includes(type as string) &&
      bounds?.top === 0 &&
      bounds?.left === 0 &&
      bounds?.width >= 99 &&
      bounds?.height >= 99
    );
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

    // Apply background color - only use fallback when truly undefined
    // Context-aware: preserves white-on-dark contrast and transparent overlays
    backgroundColor: (() => {
      const bgColor = (style.customCSS?.backgroundColor as string) || style.backgroundColor;
      // Only apply fallback if backgroundColor is truly undefined
      if (bgColor === undefined || bgColor === null || bgColor === '') {
        return '#f3f4f6'; // Light gray fallback for undefined only
      }
      // Use context-aware fallback for defined colors
      const colorContext: ColorContext = {
        componentType: type as string,
        // Page background could be passed as prop in the future
        pageBackground: undefined,
      };
      return getVisibleFallback(bgColor, colorContext);
    })(),

    // Add visible border for debugging and structure
    border: style.borderWidth
      ? `${style.borderWidth} solid ${style.borderColor || '#d1d5db'}`
      : '1px solid rgba(209, 213, 219, 0.5)',

    // Smart z-index based on component type (don't use index - components are sorted by top, not z-order)
    zIndex: component.zIndex ?? getDefaultZIndex(type),

    // For full-viewport containers, allow clicks to pass through to children
    pointerEvents: isFullViewportContainer() ? 'none' : 'auto',

    // Debug outline in development to see all component positions
    outline: process.env.NODE_ENV === 'development' ? '1px dashed rgba(255, 0, 0, 0.3)' : undefined,
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
    // Make it more prominent for debugging
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded border border-gray-300 select-none">
          {type.replace(/-/g, ' ').toUpperCase()}
        </span>
      </div>
    );
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
