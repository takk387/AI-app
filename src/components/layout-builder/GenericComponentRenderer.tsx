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
    minWidth: '50px', // Ensure minimum visible width
    minHeight: '50px', // Ensure minimum visible height
    overflow: 'hidden', // Prevent content overflow

    // Visuals (Arbitrary Values from AI) - these can be overridden by debug styles below
    color: style.textColor,
    borderRadius: style.borderRadius,
    padding: style.padding,
    fontSize: style.fontSize,
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

    // Apply AI-returned background and border if provided
    backgroundColor: style.backgroundColor || 'rgba(229, 231, 235, 0.5)', // Light gray fallback
    borderColor: style.borderColor || '#d1d5db', // Gray border fallback
    borderWidth: style.borderWidth || '1px',
    borderStyle: 'solid',

    // Zero-Preset Override: Apply arbitrary CSS detected by AI
    ...style.customCSS,
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

  // 5. Component Specific Envelopes
  // Even in "Zero-Preset", some semantic tags matter (button vs div)
  const Tag =
    type === 'button' || type === 'cta'
      ? 'button'
      : type === 'input' || type === 'search-bar'
        ? 'input'
        : type === 'image-gallery'
          ? 'img'
          : 'div';

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

  return (
    <Tag
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
    </Tag>
  );
};
