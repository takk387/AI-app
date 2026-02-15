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
import { Lock } from 'lucide-react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { cn } from '@/lib/utils';
import { VisualEffectRenderer } from '@/components/effects/VisualEffectRenderer';
import { calculateMinHeightForText } from '@/utils/responsiveTypography';

// Import specialized renderers
import { IconRenderer } from './renderers/IconRenderer';
import { ContentRenderer } from './renderers/ContentRenderer';
import { FormRenderer } from './renderers/FormRenderer';
import { MediaRenderer } from './renderers/MediaRenderer';

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

/**
 * Ensures a value has a CSS unit. If the value is a plain number or numeric string,
 * adds the default unit. Otherwise returns the value as-is.
 * This prevents silent CSS failures when AI returns "16" instead of "16px".
 */
const ensureUnit = (
  value: string | number | undefined,
  defaultUnit: string = 'px'
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const str = String(value);
  // If it's a pure number (no unit), add the default unit
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    return `${str}${defaultUnit}`;
  }
  // Already has a unit or is a special value (like "normal", "inherit")
  return str;
};

export const GenericComponentRenderer: React.FC<GenericComponentRendererProps> = ({
  component,
  componentMap,
  onSelect,
  selectedId,
  depth = 0,
}) => {
  // Prevent infinite recursion with depth limit
  if (depth >= MAX_DEPTH) {
    console.warn(
      `[GenericComponentRenderer] MAX_DEPTH (${MAX_DEPTH}) reached for component "${component.id}". ` +
        `This may indicate a circular reference or excessively nested layout.`
    );
    return null;
  }

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

    if (layoutType === 'none') {
      return {
        display: 'flex',
        flexDirection: 'column' as const, // Fix: Fallback to column layout to prevent collapse
        gap: '0px',
      };
    }

    if (layoutType === 'flex') {
      return {
        display: 'flex',
        flexDirection: (layout?.direction || 'column') as React.CSSProperties['flexDirection'],
        gap: layout?.gap || '0', // No hardcoded gap - use 0 if not specified by AI
        justifyContent: mapJustify(layout?.justify),
        alignItems: mapAlign(layout?.align),
        flexWrap: layout?.wrap ? 'wrap' : 'nowrap',
      };
    }

    if (layoutType === 'grid') {
      return {
        display: 'grid',
        gridTemplateColumns: layout?.columns || 'repeat(auto-fit, minmax(100px, 1fr))', // Smaller minimum
        gap: layout?.gap || '0', // No hardcoded gap
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
          // Use 'auto' for missing bounds instead of aggressive defaults
          width: bounds?.width ? `${bounds.width}%` : 'auto',
          height: bounds?.height ? `${bounds.height}%` : 'auto',
        }
      : {
          // Relative positioning for children - let parent flex/grid handle layout
          // flex-basis = AI-assigned width, flex-shrink = 1 allows fitting within container
          // maxWidth (not minWidth) prevents growing beyond assigned width while
          // allowing shrink when sibling widths sum to > 100%
          flex: bounds?.width ? `0 1 ${bounds.width}%` : '1 1 auto',
          maxWidth: bounds?.width ? `${bounds.width}%` : undefined,
          height: bounds?.height ? `${bounds.height}%` : 'auto',
        }),

    // Content-aware minHeight for text components to prevent overflow
    // Calculates the minimum height needed based on text content, font size, and container width
    minHeight: (() => {
      if (!content?.text || !bounds?.width) return undefined;
      const minHeightPx = calculateMinHeightForText(
        content.text,
        style.fontSize,
        style.lineHeight,
        bounds.width
      );
      // Only apply if text requires more space than the AI-assigned container height
      const currentHeightPx = bounds.height ? (bounds.height / 100) * 800 : 0;
      return minHeightPx > currentHeightPx ? `${minHeightPx}px` : undefined;
    })(),

    // Visuals - trust AI-provided colors, no hardcoded fallbacks
    color: style.textColor,
    borderRadius: style.borderRadius,
    padding: style.padding,
    // Typography with unit normalization - prevents silent failures when AI returns "16" instead of "16px"
    fontSize: ensureUnit(style.fontSize),
    fontWeight: style.fontWeight as React.CSSProperties['fontWeight'],
    textAlign: style.textAlign as React.CSSProperties['textAlign'],
    textTransform: style.textTransform as React.CSSProperties['textTransform'],
    letterSpacing: ensureUnit(style.letterSpacing),
    lineHeight: style.lineHeight, // lineHeight can be unitless (e.g., 1.5)
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

    // Animation & transitions (keyframes injected by KeyframeInjector at layout level)
    // When animationKeyframes exist, KeyframeInjector namespaces the @keyframes rule as
    // `{componentId}--{originalName}` to prevent collisions. Rewrite the shorthand to match.
    animation: (() => {
      // If no style.animation but motionConfig exists, generate from motionConfig
      // This handles components loaded from saved state that weren't processed by MotionMapper
      if (!style.animation && component.motionConfig) {
        const parts: string[] = [];
        if (component.motionConfig.entrance && component.motionConfig.entrance.type !== 'none') {
          const e = component.motionConfig.entrance;
          const name = `${id}--entrance-${e.type}-${e.direction || 'default'}`;
          parts.push(
            `${name} ${e.duration || 500}ms ${e.easing || 'ease-out'} ${e.delay || 0}ms both`
          );
        }
        if (component.motionConfig.loop) {
          const l = component.motionConfig.loop;
          const name = `${id}--loop-${l.type}-${id}`;
          parts.push(`${name} ${l.duration || 3000}ms ease-in-out infinite`);
        }
        return parts.length > 0 ? parts.join(', ') : undefined;
      }
      if (!style.animation) return undefined;
      if (!style.animationKeyframes) return style.animation;
      // Extract and replace original name with namespaced version.
      // Handle comma-separated animations (e.g., entrance + loop) by
      // processing each animation individually to avoid corrupting commas.
      const timePattern = /^[\d.]+m?s$/;
      const keywords = new Set([
        'ease',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'linear',
        'step-start',
        'step-end',
        'normal',
        'reverse',
        'alternate',
        'alternate-reverse',
        'none',
        'forwards',
        'backwards',
        'both',
        'running',
        'paused',
        'infinite',
      ]);
      const namespaceAnimation = (anim: string): string => {
        const tokens = anim.trim().split(/\s+/);
        return tokens
          .map((token) => {
            const lower = token.toLowerCase();
            if (timePattern.test(lower)) return token;
            if (keywords.has(lower)) return token;
            if (lower.startsWith('cubic-bezier') || lower.startsWith('steps')) return token;
            if (/^\d+$/.test(lower)) return token;
            // This token is the animation name — namespace it
            return `${id}--${token}`;
          })
          .join(' ');
      };
      return style.animation.split(',').map(namespaceAnimation).join(',');
    })(),
    transition: style.transition,

    // Cursor
    cursor: style.cursor,

    // Border style (dashed, dotted, etc.)
    borderStyle: style.borderStyle as React.CSSProperties['borderStyle'],

    // Overflow control - prevent text bleed into adjacent sections
    // Combined with content-aware minHeight, containers expand to fit content
    // rather than clipping, while overflow:hidden prevents bleed if text still exceeds bounds
    overflow: (() => {
      // Explicit AI override wins
      if (style.overflow) return style.overflow;

      // Root containers must stay visible for absolute-positioned children
      if (!parentId && isContainer) return 'visible' as const;

      // Text components: hidden to prevent bleed into adjacent sections
      // (minHeight calculation above ensures the container is large enough for content)
      const typeStr = type as string;
      const isTextComponent =
        content?.text ||
        typeStr.includes('text') ||
        typeStr.includes('heading') ||
        typeStr.includes('paragraph') ||
        typeStr.includes('label') ||
        typeStr === 'button' ||
        typeStr === 'link' ||
        typeStr === 'badge';
      if (isTextComponent) return 'hidden' as const;

      // Child containers visible, images/media hidden
      return isContainer ? ('visible' as const) : ('hidden' as const);
    })(),

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

    // Add border if borderWidth OR borderColor is specified
    // Previously only checked borderWidth, causing borders to be missed when only color was provided
    border:
      style.borderWidth || style.borderColor
        ? `${style.borderWidth || '1px'} ${style.borderStyle || 'solid'} ${style.borderColor || 'currentColor'}`
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
    // Only stop propagation if we're not a full viewport container
    // This allows clicks to reach children in full-screen wrappers
    if (!isFullViewportContainer()) {
      e.stopPropagation();
    }
    //e.stopPropagation(); // Revert to strict stopPropagation if needed
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

      // Skip hidden children (visibility toggle from tree panel)
      if (childComponent.visible === false) {
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

  // 5. Build interaction styles (CSS custom properties for hover/active states)
  const interactionStyles: React.CSSProperties = {};
  const hasInteractions =
    component.interactions?.hover ||
    component.interactions?.active ||
    component.interactions?.focus;

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

  // Add active state CSS variables
  if (component.interactions?.active) {
    const active = component.interactions.active;
    Object.assign(interactionStyles, {
      '--active-bg': active.backgroundColor,
      '--active-color': active.textColor,
      '--active-transform': active.transform,
      '--active-scale': active.scale,
    } as React.CSSProperties);
  }

  // Add focus state CSS variables
  if (component.interactions?.focus) {
    const focus = component.interactions.focus;
    Object.assign(interactionStyles, {
      '--focus-outline': focus.outline,
      '--focus-shadow': focus.boxShadow,
      '--focus-border': focus.borderColor,
    } as React.CSSProperties);
  }

  // Combine base styles with interaction CSS variables
  const combinedStyles: React.CSSProperties = {
    ...dynamicStyles,
    ...interactionStyles,
  };

  // Generate hover and active classes based on which interaction properties are set
  const getInteractionClass = () => {
    if (!hasInteractions) return '';
    const classes: string[] = [];

    // Hover state classes
    const hover = component.interactions?.hover;
    if (hover?.backgroundColor) classes.push('hover:bg-[var(--hover-bg)]');
    if (hover?.textColor) classes.push('hover:text-[var(--hover-color)]');
    if (hover?.transform) classes.push('hover:[transform:var(--hover-transform)]');
    if (hover?.boxShadow) classes.push('hover:[box-shadow:var(--hover-shadow)]');
    if (hover?.opacity !== undefined) classes.push('hover:opacity-[var(--hover-opacity)]');

    // Active state classes
    const active = component.interactions?.active;
    if (active?.backgroundColor) classes.push('active:bg-[var(--active-bg)]');
    if (active?.textColor) classes.push('active:text-[var(--active-color)]');
    if (active?.transform) classes.push('active:[transform:var(--active-transform)]');
    if (active?.scale) classes.push(`active:scale-[var(--active-scale)]`);

    // Focus state classes (accessibility)
    const focus = component.interactions?.focus;
    if (focus?.outline) classes.push('focus:[outline:var(--focus-outline)]');
    if (focus?.boxShadow) classes.push('focus:[box-shadow:var(--focus-shadow)]');
    if (focus?.borderColor) classes.push('focus:border-[var(--focus-border)]');

    return classes.join(' ');
  };

  // Use div for all component types (avoid void elements like img that can't have children)
  // VisualEffectRenderer is rendered INSIDE the div as a child overlay,
  // so it positions correctly relative to this positioned element.
  const hasVisualEffects = component.visualEffects && component.visualEffects.length > 0;

  // -- DELEGATED RENDERING --

  // Handle Input/Search via FormRenderer
  if (type === 'input' || type === 'search-bar') {
    return (
      <FormRenderer
        type={type}
        id={id}
        content={content}
        style={dynamicStyles}
        className={cn('transition-all duration-200', selectionClass)}
        onClick={handleClick}
      />
    );
  }

  // Handle Gallery via MediaRenderer
  if (type === 'image-gallery') {
    return (
      <MediaRenderer
        type={type}
        id={id}
        content={content}
        style={dynamicStyles}
        className={cn('transition-all duration-200 cursor-pointer', selectionClass)}
        onClick={handleClick}
      />
    );
  }

  // Main Render (Container or Content)
  return (
    <div
      data-id={id}
      data-role={role || (isContainer ? 'container' : 'leaf')}
      data-depth={depth}
      style={combinedStyles}
      className={cn(
        // Only apply Tailwind transition when no custom transition is set,
        // to prevent overriding AI-specified transitions via inline style
        !style.transition && 'transition-all duration-200',
        'cursor-pointer',
        selectionClass,
        getInteractionClass()
      )}
      onClick={handleClick}
    >
      <ContentRenderer
        component={component}
        iconElement={<IconRenderer content={content!} style={style} />}
      />
      {renderChildren()}
      {hasVisualEffects && (
        <VisualEffectRenderer effects={component.visualEffects!} componentId={id} />
      )}
      {component.locked && (
        <div
          className="absolute top-1 right-1 z-50 p-0.5 rounded bg-gray-800/60 text-white pointer-events-none"
          title="Locked"
        >
          <Lock size={10} />
        </div>
      )}
    </div>
  );
};
