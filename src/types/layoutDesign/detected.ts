/**
 * Layout Design - Detected Component & Layout Structure Types
 *
 * Core types for AI-detected components from visual analysis,
 * layout structure, layout nodes, and element selection.
 *
 * Depends on: helpers.ts (CustomizableValue), effects.ts (VisualEffect-related)
 */

// ============================================================================
// Visual Effect (for detected components)
// ============================================================================

/**
 * Visual effect configuration for non-CSS effects (particles, canvas, complex motion)
 * Detected by Stage 2 "The Engineer" and rendered by VisualEffectRenderer
 */
export interface VisualEffect {
  /** Human-readable description of the effect */
  description: string;
  /** Effect implementation type */
  type: 'css-animation' | 'particle-system' | 'canvas-effect';
  /** When the effect activates */
  trigger: 'always' | 'hover' | 'click' | 'scroll';
  /** CSS keyframes definition for CSS-achievable effects */
  cssKeyframes?: Record<string, Record<string, string>>;
  /** Particle system configuration for particle effects */
  particleConfig?: {
    count?: number;
    shape?: 'circle' | 'square' | 'star' | 'custom';
    colors?: string[];
    direction?: 'up' | 'down' | 'left' | 'right' | 'radial' | 'random';
    speed?: 'slow' | 'medium' | 'fast';
    size?: { min: number; max: number };
    opacity?: { start: number; end: number };
    lifetime?: string;
  };
}

// ============================================================================
// Layout Structure Types
// ============================================================================

export interface LayoutStructure {
  type: 'single-page' | 'multi-page' | 'dashboard' | 'landing' | 'wizard' | 'split';
  hasHeader: boolean;
  hasSidebar: boolean;
  hasFooter: boolean;
  sidebarPosition: 'left' | 'right';
  headerType: 'fixed' | 'sticky' | 'static';
  contentLayout: 'centered' | 'full-width' | 'asymmetric';
  mainContentWidth: 'narrow' | 'standard' | 'wide' | 'full';
  /** Full detected components array from Gemini analysis for dynamic layout rendering */
  detectedComponents?: DetectedComponentEnhanced[];
}

export interface ResponsiveSettings {
  mobileBreakpoint: number;
  tabletBreakpoint: number;
  mobileLayout: 'stack' | 'drawer' | 'bottom-nav';
  mobileHeader: 'hamburger' | 'bottom-tabs' | 'minimal';
  hideSidebarOnMobile: boolean;
  stackCardsOnMobile: boolean;
}

// ============================================================================
// Enhanced Component Detection
// ============================================================================

/**
 * Enhanced component detection with precise positioning for exact replication
 */
export interface DetectedComponentEnhanced {
  /** Unique identifier for this component instance */
  id: string;
  /** Component type */
  type:
    | 'header'
    | 'sidebar'
    | 'hero'
    | 'cards'
    | 'navigation'
    | 'footer'
    | 'form'
    | 'table'
    | 'carousel'
    | 'timeline'
    | 'stepper'
    | 'stats'
    | 'testimonials'
    | 'pricing'
    | 'features'
    | 'cta'
    | 'breadcrumb'
    | 'pagination'
    | 'tabs'
    | 'modal-trigger'
    | 'search-bar'
    | 'user-menu'
    | 'logo'
    | 'content-section'
    | 'image-gallery'
    | 'video-player'
    | 'map'
    | 'chart'
    | 'button'
    | 'input'
    | 'list'
    | 'menu'
    | 'modal'
    | 'dropdown'
    | 'badge'
    | 'avatar'
    | 'divider'
    | 'progress'
    | 'unknown';
  /** Precise bounding box as percentage of viewport (0-100) */
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** Style details - enhanced with more properties from AI analysis */
  style: {
    variant?: string;
    hasBackground?: boolean;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderWidth?: string;
    isFloating?: boolean;
    isSticky?: boolean;
    borderRadius?: string;
    shadow?: string;
    padding?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
    display?: string;
    alignment?: string;
    gap?: string;
    /** Text transformation */
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
    /** Cursor style */
    cursor?: string;
    /** Background properties */
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    /** Typography details */
    lineHeight?: string;
    letterSpacing?: string;
    /** Per-component font family override */
    fontFamily?: string;
    /** Font style (italic, normal) */
    fontStyle?: 'normal' | 'italic' | 'oblique';
    /** Text decoration */
    textDecoration?: 'none' | 'underline' | 'line-through' | 'overline' | string;
    /** Text shadow for glow effects */
    textShadow?: string;
    /** Border details */
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none' | string;
    /** Visual effects */
    opacity?: string;
    backdropFilter?: string;
    transform?: string;
    /** Filter effects (blur, grayscale, etc.) */
    filter?: string;
    /** Blend mode */
    mixBlendMode?: string;
    /** Spacing */
    margin?: string;
    /** Max width constraint */
    maxWidth?: string;
    /** Max height constraint */
    maxHeight?: string;
    /** Min height specific value */
    minHeight?: string;
    /** Aspect ratio */
    aspectRatio?: string;
    /** Layout control */
    overflow?: 'visible' | 'hidden' | 'scroll' | 'auto' | string;
    /** Image object fit */
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    /** Image object position */
    objectPosition?: string;
    /** White space handling */
    whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line';
    /** Text overflow */
    textOverflow?: 'clip' | 'ellipsis';
    /** Word break */
    wordBreak?: 'normal' | 'break-all' | 'keep-all' | 'break-word';
    /** Flex properties for advanced layouts */
    flexGrow?: number;
    flexShrink?: number;
    order?: number;
    /** Position for sticky/fixed elements */
    position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    /** CSS animation shorthand (e.g., 'gradient-shift 3s ease infinite') */
    animation?: string;
    /** Inline @keyframes definition — renderer injects as <style> tag */
    animationKeyframes?: Record<string, Record<string, string>>;
    /** CSS transition shorthand (e.g., 'all 0.3s ease') */
    transition?: string;
    /** Arbitrary CSS properties for "Zero-Preset" custom designs (e.g., gradients, filters, complex shadows) */
    customCSS?: Record<string, string | number>;
  };
  /** Content information extracted from the component */
  content?: {
    text?: string;
    hasIcon?: boolean;
    hasImage?: boolean;
    /** Detailed description of the image for AI generation (e.g., 'Company logo: blue shield with white lightning bolt') */
    imageDescription?: string;
    /** Alt text for accessibility */
    imageAlt?: string;
    itemCount?: number;
    placeholder?: string;
    /** Lucide icon name (e.g. "Home", "User", "Menu") - FALLBACK when SVG path not available */
    iconName?: string;
    /** Raw SVG path d attribute for exact icon replication - PREFERRED over iconName */
    iconSvgPath?: string;
    /** SVG viewBox if different from default "0 0 24 24" */
    iconViewBox?: string;
    /** Icon color hex code */
    iconColor?: string;
    /** Icon position relative to text */
    iconPosition?: 'left' | 'right' | 'center' | 'top' | 'bottom';
    /** Icon size */
    iconSize?: 'sm' | 'md' | 'lg';
    /** Container style for icons (circular background, etc.) */
    iconContainerStyle?: {
      shape: 'circle' | 'square' | 'rounded';
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: string;
      size?: 'sm' | 'md' | 'lg';
      padding?: string;
    };
  };
  /** Parent component ID for hierarchy */
  parentId?: string;
  /** Child component IDs */
  children?: string[];
  /** Component role for positioning strategy */
  role?: 'container' | 'leaf' | 'overlay' | 'fixed' | 'sticky' | 'modal' | 'background' | 'wrapper';
  /** Container layout configuration (for role: 'container') */
  layout?: {
    /** Layout type */
    type: 'flex' | 'grid' | 'none' | 'absolute' | 'block';
    /** Flex direction */
    direction?: 'row' | 'column';
    /** Gap between children */
    gap?: string;
    /** Justify content */
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    /** Align items */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Flex wrap */
    wrap?: boolean;
    /** Grid columns (e.g., "repeat(3, 1fr)") */
    columns?: string;
  };
  /** Z-index layer */
  zIndex?: number;
  /** If this is a navigation item, which page does it link to */
  navigatesTo?: string;
  /** Is this element part of the navigation system */
  isNavigationItem?: boolean;
  /** Is this element interactive (button, link, input) */
  isInteractive?: boolean;
  /** Interactive state styles (hover, active, focus) for buttons/links */
  interactions?: {
    hover?: {
      backgroundColor?: string;
      textColor?: string;
      transform?: string;
      boxShadow?: string;
      opacity?: number;
      borderColor?: string;
    };
    active?: {
      backgroundColor?: string;
      textColor?: string;
      transform?: string;
      scale?: number;
    };
    focus?: {
      outline?: string;
      boxShadow?: string;
      borderColor?: string;
    };
  };
  /** Non-CSS visual effects (particles, canvas animations, complex motion) */
  visualEffects?: VisualEffect[];

  // --- Multi-Source & Manipulation Fields ---

  /** Source tracking: which uploaded media file produced this component (Gap 1) */
  sourceId?: string;
  /** Video-derived motion configuration (Gap 2) */
  motionConfig?: import('@/types/motionConfig').ComponentMotionConfig;
  /** Prevent accidental drag/resize in direct manipulation mode (Gap 3) */
  locked?: boolean;
  /** Group membership ID for component grouping (Gap 4) */
  groupId?: string;
  /** Toggle visibility in the component tree panel (Gap 4). Default: true */
  visible?: boolean;
  /** User-editable display name for the component tree (Gap 4) */
  displayName?: string;

  /** Confidence score 0-1 */
  confidence: number;
}

// ============================================================================
// Layout Node & Element Types
// ============================================================================

/**
 * Component types that can be placed in a layout node
 */
export type LayoutComponentType =
  | 'header'
  | 'sidebar'
  | 'hero'
  | 'cards'
  | 'list'
  | 'stats'
  | 'footer'
  | 'navigation'
  | 'form'
  | 'table'
  | 'tabs'
  | 'modal'
  | 'custom';

/**
 * Element types for Click + Talk mode element selection
 * Extends LayoutComponentType with additional UI element types
 */
export type ElementType =
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'hero'
  | 'section'
  | 'card'
  | 'button'
  | 'text'
  | 'heading'
  | 'image'
  | 'nav'
  | 'list'
  | 'form'
  | 'input'
  | 'container'
  | 'link'
  | 'icon'
  | 'video'
  | 'modal'
  | 'tabs'
  | 'menu'
  | 'custom';

/**
 * Bounding rectangle for element position tracking
 */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rich element info for Click + Talk mode
 * Contains everything needed to show contextual actions and scope AI changes
 */
export interface SelectedElementInfo {
  /** Element identifier (e.g., "header", "sidebar", "cards") */
  id: string;
  /** Type of element for context-aware actions */
  type: ElementType;
  /** Visual bounds for highlight positioning */
  bounds: ElementBounds;
  /** Current style properties of the element */
  currentProperties: Record<string, unknown>;
  /** Parent element ID for hierarchy context */
  parentId?: string;
  /** Quick actions available for this element type */
  allowedActions: string[];
  /** User-friendly display name */
  displayName?: string;
}

/**
 * Layout node types for building nested structures
 */
export type LayoutNodeType = 'container' | 'row' | 'column' | 'section' | 'component';

/**
 * Flexbox/grid alignment options
 */
export interface LayoutAlignment {
  direction: 'row' | 'column';
  gap: string;
  align: 'start' | 'center' | 'end' | 'stretch';
  justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}

/**
 * Recursive layout node for building nested component structures
 * Supports up to N levels of nesting (recommended max: 3)
 */
export interface LayoutNode {
  id: string;
  type: LayoutNodeType;
  componentType?: LayoutComponentType;
  label?: string;
  children: LayoutNode[];
  props: Record<string, unknown>;
  layout?: LayoutAlignment;
  style?: {
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    height?: string;
    padding?: string;
    margin?: string;
    background?: string;
    borderRadius?: string;
    border?: string;
    shadow?: string;
  };
  responsive?: {
    hideOnMobile?: boolean;
    hideOnTablet?: boolean;
    mobileOrder?: number;
    mobileSpan?: number;
  };
}
