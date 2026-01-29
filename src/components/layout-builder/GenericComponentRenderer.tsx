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
  const {
    id,
    type,
    style = {},
    content,
    bounds = DEFAULT_BOUNDS,
    role,
    layout,
    parentId,
    children,
  } = component;
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
    // If no layout is specified but it's a container, use valid defaults
    // This prevents "layout: undefined" components from collapsing their children
    const layoutType = layout?.type || 'flex';

    if (layoutType === 'none') return {};

    if (layoutType === 'flex') {
      return {
        display: 'flex',
        flexDirection: (layout?.direction || 'column') as React.CSSProperties['flexDirection'],
        gap: layout?.gap || '1rem',
        justifyContent: mapJustify(layout?.justify),
        alignItems: mapAlign(layout?.align),
        flexWrap: layout?.wrap ? 'wrap' : 'nowrap',
      };
    }

    if (layoutType === 'grid') {
      return {
        display: 'grid',
        gridTemplateColumns: layout?.columns || 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: layout?.gap,
        justifyItems: mapAlign(layout?.justify),
        alignItems: mapAlign(layout?.align),
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
    minHeight: style.minHeight || '20px',

    // Visuals - trust AI-provided colors, no hardcoded fallbacks
    color: style.textColor,
    borderRadius: style.borderRadius,
    padding: style.padding,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight as React.CSSProperties['fontWeight'],
    textAlign: style.textAlign as React.CSSProperties['textAlign'],
    textTransform: style.textTransform as React.CSSProperties['textTransform'],
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    boxShadow: style.shadow,

    // Typography extensions
    fontFamily: style.fontFamily,
    fontStyle: style.fontStyle as React.CSSProperties['fontStyle'],
    textDecoration: style.textDecoration,
    textShadow: style.textShadow,

    // Background properties (for gradients, images)
    backgroundImage: style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundPosition: style.backgroundPosition,
    backgroundRepeat: style.backgroundRepeat,

    // Visual effects
    opacity: style.opacity,
    backdropFilter: style.backdropFilter,
    transform: style.transform,
    filter: style.filter,
    mixBlendMode: style.mixBlendMode as React.CSSProperties['mixBlendMode'],

    // Cursor
    cursor: style.cursor,

    // Border style (dashed, dotted, etc.)
    borderStyle: style.borderStyle as React.CSSProperties['borderStyle'],

    // Overflow control - use style.overflow if provided, else default based on container type
    overflow:
      (style.overflow as React.CSSProperties['overflow']) || (isContainer ? 'visible' : 'hidden'),

    // Spacing and sizing
    margin: style.margin,
    maxWidth: style.maxWidth,
    maxHeight: style.maxHeight,
    aspectRatio: style.aspectRatio,
    // Note: minHeight is set above in "Ensure visibility" section

    // Image handling
    objectFit: style.objectFit as React.CSSProperties['objectFit'],
    objectPosition: style.objectPosition,

    // Text handling
    whiteSpace: style.whiteSpace as React.CSSProperties['whiteSpace'],
    textOverflow: style.textOverflow as React.CSSProperties['textOverflow'],
    wordBreak: style.wordBreak as React.CSSProperties['wordBreak'],

    // Flex control
    flexGrow: style.flexGrow,
    flexShrink: style.flexShrink,
    order: style.order,

    // Container layout (flex/grid) - applies to containers with children
    ...(isContainer
      ? getContainerLayoutStyles()
      : {
          // Leaf node layout
          display: style.display || 'flex',
          flexDirection: (type === 'list' || type === 'content-section'
            ? 'column'
            : 'row') as React.CSSProperties['flexDirection'],
          alignItems: style.alignment === 'center' ? 'center' : 'flex-start',
          justifyContent:
            style.alignment === 'center'
              ? 'center'
              : style.alignment === 'between'
                ? 'space-between'
                : 'flex-start',
          gap: style.gap,
        }),

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
      ? `${style.borderWidth} ${style.borderStyle || 'solid'} ${style.borderColor || 'transparent'}`
      : undefined,

    // Smart z-index based on component type (don't use index - components are sorted by top, not z-order)
    zIndex: component.zIndex ?? getDefaultZIndex(type),

    // For full-viewport containers, allow clicks to pass through to children
    pointerEvents: isFullViewportContainer() ? 'none' : 'auto',

    // Debug outline in development to see all component positions
    outline: process.env.NODE_ENV === 'development' ? '1px dashed rgba(255, 0, 0, 0.3)' : undefined,

    // customCSS LAST - overrides everything for ANY CSS property not explicitly defined
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
  // Looks up children from componentMap and renders them recursively
  const renderChildren = () => {
    // Check depth limit to prevent infinite recursion
    if (depth >= MAX_DEPTH) {
      console.warn(
        `[GenericComponentRenderer] Max depth (${MAX_DEPTH}) reached for component ${id}`
      );
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

  // Helper function for common icon SVG paths (Heroicons/Lucide style)
  const getIconPath = (iconName: string): string => {
    const paths: Record<string, string> = {
      // Navigation
      Home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      Menu: 'M4 6h16M4 12h16M4 18h16',
      Close: 'M6 18L18 6M6 6l12 12',
      Search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      // Arrows
      ArrowRight: 'M14 5l7 7m0 0l-7 7m7-7H3',
      ArrowLeft: 'M10 19l-7-7m0 0l7-7m-7 7h18',
      ChevronDown: 'M19 9l-7 7-7-7',
      ChevronRight: 'M9 5l7 7-7 7',
      ChevronUp: 'M5 15l7-7 7 7',
      ChevronLeft: 'M15 19l-7-7 7-7',
      // Actions
      Plus: 'M12 4v16m8-8H4',
      Minus: 'M20 12H4',
      Check: 'M5 13l4 4L19 7',
      X: 'M6 18L18 6M6 6l12 12',
      // User
      User: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      Users:
        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      // Settings
      Settings:
        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      // Social
      Heart:
        'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      Star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      Share:
        'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
      // Communication
      Mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      Phone:
        'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
      Bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      // Location & Time
      MapPin:
        'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      Calendar:
        'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      Clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      // Shopping
      ShoppingCart:
        'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      CreditCard:
        'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      // Media
      Play: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      Pause: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z',
      // Files
      Document:
        'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      Download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      Upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      // Misc
      Eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      EyeOff:
        'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
      Info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      AlertCircle: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };

    // Handle case-insensitive lookup and common aliases
    const normalizedName = iconName.charAt(0).toUpperCase() + iconName.slice(1).toLowerCase();
    const aliases: Record<string, string> = {
      'arrow-right': 'ArrowRight',
      'arrow-left': 'ArrowLeft',
      'chevron-down': 'ChevronDown',
      'chevron-right': 'ChevronRight',
      'chevron-up': 'ChevronUp',
      'chevron-left': 'ChevronLeft',
      'shopping-cart': 'ShoppingCart',
      'credit-card': 'CreditCard',
      'map-pin': 'MapPin',
      'eye-off': 'EyeOff',
      'alert-circle': 'AlertCircle',
      search: 'Search',
      menu: 'Menu',
      close: 'Close',
      home: 'Home',
      user: 'User',
      settings: 'Settings',
      heart: 'Heart',
      star: 'Star',
      check: 'Check',
      plus: 'Plus',
      minus: 'Minus',
      mail: 'Mail',
      phone: 'Phone',
      bell: 'Bell',
      calendar: 'Calendar',
      clock: 'Clock',
      x: 'X',
    };

    const lookupName = aliases[iconName.toLowerCase()] || normalizedName;
    return paths[lookupName] || paths.Info; // Default to Info icon
  };

  // Render icon component
  const renderIcon = () => {
    if (!content?.hasIcon || !content?.iconName) return null;

    const iconSizeClasses: Record<string, string> = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-7 h-7',
    };

    const sizeClass = iconSizeClasses[content.iconSize || 'md'] || iconSizeClasses.md;
    const iconColor = content.iconColor || style.textColor || 'currentColor';
    const pathData = getIconPath(content.iconName);

    const iconElement = (
      <span
        className={`inline-flex items-center justify-center flex-shrink-0 ${sizeClass}`}
        style={{ color: iconColor }}
        title={content.iconName}
      >
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d={pathData} />
        </svg>
      </span>
    );

    // Wrap in container if iconContainerStyle is specified
    if (content.iconContainerStyle) {
      const containerSizes: Record<string, string> = {
        sm: '32px',
        md: '48px',
        lg: '64px',
      };
      const containerSize = containerSizes[content.iconContainerStyle.size || 'md'];

      const borderRadiusMap: Record<string, string> = {
        circle: '50%',
        square: '0',
        rounded: '8px',
      };

      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: containerSize,
            height: containerSize,
            borderRadius: borderRadiusMap[content.iconContainerStyle.shape],
            backgroundColor: content.iconContainerStyle.backgroundColor || 'transparent',
            border: content.iconContainerStyle.borderWidth
              ? `${content.iconContainerStyle.borderWidth} solid ${content.iconContainerStyle.borderColor || 'currentColor'}`
              : undefined,
            padding: content.iconContainerStyle.padding,
            flexShrink: 0,
          }}
        >
          {iconElement}
        </div>
      );
    }

    return iconElement;
  };

  const renderContent = () => {
    // If this is a container with children, don't show placeholder content
    if (isContainer && children && children.length > 0) {
      return null;
    }

    const hasIconContent = content?.hasIcon && content?.iconName;
    const hasTextContent = content?.text;
    const hasImageContent = content?.hasImage;

    // Render icon + text combination
    if (hasIconContent && hasTextContent) {
      const iconPosition = content?.iconPosition || 'left';

      // Determine flex direction based on icon position
      const getFlexClass = () => {
        switch (iconPosition) {
          case 'top':
            return 'flex-col';
          case 'bottom':
            return 'flex-col-reverse';
          case 'right':
            return 'flex-row-reverse';
          case 'left':
          default:
            return 'flex-row';
        }
      };

      // Center items for vertical layouts, align center for horizontal
      const isVertical = iconPosition === 'top' || iconPosition === 'bottom';
      const alignClass = isVertical ? 'items-center justify-center text-center' : 'items-center';

      return (
        <div className={`flex ${getFlexClass()} ${alignClass} gap-2`}>
          {renderIcon()}
          <span>{content.text}</span>
        </div>
      );
    }

    // Render standalone icon
    if (hasIconContent) {
      return <div className="flex items-center justify-center w-full h-full">{renderIcon()}</div>;
    }

    // Render text only
    if (hasTextContent) {
      return content.text;
    }

    // Render image placeholder
    if (hasImageContent) {
      return (
        <div className="bg-gray-200 w-full h-full min-h-[100px] flex items-center justify-center text-gray-400">
          Image
        </div>
      );
    }

    // Fallback: show component type label for visibility during design
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

  // Build interaction styles (CSS custom properties for hover/active states)
  const interactionStyles: React.CSSProperties = {};
  const hasInteractions = component.interactions?.hover || component.interactions?.active;

  if (component.interactions?.hover) {
    const hover = component.interactions.hover;
    Object.assign(interactionStyles, {
      '--hover-bg': hover.backgroundColor,
      '--hover-color': hover.textColor,
      '--hover-transform': hover.transform,
      '--hover-shadow': hover.boxShadow,
      '--hover-opacity': hover.opacity,
      '--hover-border': hover.borderColor,
    } as React.CSSProperties);
  }

  // Combine base styles with interaction CSS variables
  const combinedStyles: React.CSSProperties = {
    ...dynamicStyles,
    ...interactionStyles,
  };

  // Generate hover class based on which interaction properties are set
  const getInteractionClass = () => {
    if (!hasInteractions) return '';
    const classes: string[] = [];
    const hover = component.interactions?.hover;
    if (hover?.backgroundColor) classes.push('hover:bg-[var(--hover-bg)]');
    if (hover?.textColor) classes.push('hover:text-[var(--hover-color)]');
    if (hover?.transform) classes.push('hover:[transform:var(--hover-transform)]');
    if (hover?.boxShadow) classes.push('hover:[box-shadow:var(--hover-shadow)]');
    if (hover?.opacity !== undefined) classes.push('hover:opacity-[var(--hover-opacity)]');
    return classes.join(' ');
  };

  // Use div for all component types (avoid void elements like img that can't have children)
  return (
    <div
      data-id={id}
      data-role={role || (isContainer ? 'container' : 'leaf')}
      data-depth={depth}
      style={combinedStyles}
      className={cn(
        'transition-all duration-200 cursor-pointer',
        selectionClass,
        getInteractionClass()
      )}
      onClick={handleClick}
    >
      {renderContent()}
      {renderChildren()}
    </div>
  );
};
