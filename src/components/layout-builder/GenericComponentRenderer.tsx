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
  /** Map of all components for recursive child lookup */
  componentMap?: Map<string, DetectedComponentEnhanced>;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  /** Nesting depth for debugging and recursion limits */
  depth?: number;
}

/** Maximum nesting depth to prevent infinite recursion */
const MAX_DEPTH = 10;

// Default bounds for components with missing/invalid bounds data
// Using smaller defaults to prevent full-width stacking
const DEFAULT_BOUNDS = { top: 0, left: 0, width: 20, height: 10 };

export const GenericComponentRenderer: React.FC<GenericComponentRendererProps> = ({
  component,
  componentMap,
  onSelect,
  selectedId,
  depth = 0,
}) => {
  const { id, type, style = {}, content, bounds = DEFAULT_BOUNDS, role, layout, parentId, children } = component;
  const isSelected = selectedId === id;
  const isContainer = role === 'container' || (children && children.length > 0);
  const isOverlay = role === 'overlay' || ['modal', 'dropdown', 'tooltip'].includes(type);

  // Determine positioning strategy
  const getPositionStrategy = (): 'absolute' | 'relative' => {
    // Overlays always use absolute positioning
    if (isOverlay) return 'absolute';
    // Root components (no parent) use absolute positioning
    if (!parentId) return 'absolute';
    // Children use relative positioning (parent handles layout via flex/grid)
    return 'relative';
  };

  const positionStrategy = getPositionStrategy();

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

  // Map justify values to CSS
  const mapJustify = (justify?: string): string => {
    const map: Record<string, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    };
    return map[justify || 'start'] || 'flex-start';
  };

  // Map align values to CSS
  const mapAlign = (align?: string): string => {
    const map: Record<string, string> = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    };
    return map[align || 'stretch'] || 'stretch';
  };

  // Get container layout styles (flex/grid)
  const getContainerLayoutStyles = (): React.CSSProperties => {
    if (!layout || layout.type === 'none') return {};

    if (layout.type === 'flex') {
      return {
        display: 'flex',
        flexDirection: layout.direction || 'row',
        gap: layout.gap,
        justifyContent: mapJustify(layout.justify),
        alignItems: mapAlign(layout.align),
        flexWrap: layout.wrap ? 'wrap' : 'nowrap',
      };
    }

    if (layout.type === 'grid') {
      return {
        display: 'grid',
        gridTemplateColumns: layout.columns || 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: layout.gap,
        justifyItems: mapAlign(layout.justify),
        alignItems: mapAlign(layout.align),
      };
    }

    return {};
  };

  // 1. Dynamic Style Generation (The Zero-Preset Logic)
  // Maps API styles to inline styles or atomic classes
  // Uses hybrid positioning: absolute for roots/overlays, relative for children
  const dynamicStyles: React.CSSProperties = {
    // Layout - position strategy depends on hierarchy
    position: positionStrategy,

    // Absolute positioning for roots and overlays
    ...(positionStrategy === 'absolute'
      ? {
          top: `${bounds?.top ?? 0}%`,
          left: `${bounds?.left ?? 0}%`,
          width: style?.display === 'inline' ? 'auto' : `${bounds?.width ?? 100}%`,
          height: `${bounds?.height ?? 50}%`,
        }
      : {
          // Relative positioning for children - let parent flex/grid handle layout
          // Use flex property for sizing within flex container
          flex: bounds?.width ? `0 0 ${bounds.width}%` : '1',
          minWidth: bounds?.width ? `${bounds.width}%` : undefined,
          height: bounds?.height ? `${bounds.height}%` : 'auto',
        }),

    // Ensure visibility
    minWidth: '20px',
    minHeight: '20px',
    overflow: isContainer ? 'visible' : 'hidden',

    // Visuals - trust AI-provided colors, no hardcoded fallbacks
    color: style.textColor,
    borderRadius: style.borderRadius,
    padding: style.padding,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight as React.CSSProperties['fontWeight'],
    textAlign: style.textAlign as React.CSSProperties['textAlign'],
    boxShadow: style.shadow,

    // Container layout (flex/grid) - applies to containers with children
    ...(isContainer ? getContainerLayoutStyles() : {
      // Leaf node layout
      display: style.display || 'flex',
      flexDirection: type === 'list' || type === 'content-section' ? 'column' : 'row',
      alignItems: style.alignment === 'center' ? 'center' : 'flex-start',
      justifyContent:
        style.alignment === 'center'
          ? 'center'
          : style.alignment === 'between'
            ? 'space-between'
            : 'flex-start',
      gap: style.gap,
    }),

    // Apply custom CSS first
    ...style.customCSS,

    // Apply background color - trust AI-provided colors, use transparent for undefined
    backgroundColor: (() => {
      const bgColor = (style.customCSS?.backgroundColor as string) || style.backgroundColor;
      // For undefined colors, use transparent instead of gray - let content show through
      if (bgColor === undefined || bgColor === null || bgColor === '') {
        return 'transparent';
      }
      // Trust the AI-provided color directly
      return bgColor;
    })(),

    // Only add border if explicitly specified in style
    border: style.borderWidth
      ? `${style.borderWidth} solid ${style.borderColor || 'transparent'}`
      : undefined,

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
  // Looks up children from componentMap and renders them recursively
  const renderChildren = () => {
    // Check depth limit to prevent infinite recursion
    if (depth >= MAX_DEPTH) {
      console.warn(`[GenericComponentRenderer] Max depth (${MAX_DEPTH}) reached for component ${id}`);
      return null;
    }

    // No children to render
    if (!children || children.length === 0 || !componentMap) {
      return null;
    }

    return children.map((childId) => {
      const childComponent = componentMap.get(childId);
      if (!childComponent) {
        console.warn(`[GenericComponentRenderer] Child component "${childId}" not found in map`);
        return null;
      }

      return (
        <GenericComponentRenderer
          key={childId}
          component={childComponent}
          componentMap={componentMap}
          onSelect={onSelect}
          selectedId={selectedId}
          depth={depth + 1}
        />
      );
    });
  };

  const renderContent = () => {
    // If this is a container with children, don't show placeholder content
    if (isContainer && children && children.length > 0) {
      return null;
    }

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
      data-role={role || (isContainer ? 'container' : 'leaf')}
      data-depth={depth}
      style={dynamicStyles}
      className={cn('transition-all duration-200 cursor-pointer', selectionClass)}
      onClick={handleClick}
    >
      {renderContent()}
      {renderChildren()}
    </div>
  );
};
