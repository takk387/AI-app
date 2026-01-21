/**
 * Layout Design Types
 * Complete design specification for the Layout Builder feature
 */

import type { VisualAnalysis } from '@/services/GeminiLayoutService';

// ============================================================================
// Component Design Types
// ============================================================================

export interface HeaderDesign {
  visible: boolean;
  height: 'compact' | 'standard' | 'tall';
  style: 'transparent' | 'solid' | 'gradient' | 'blur';
  logoPosition: 'left' | 'center';
  navPosition: 'center' | 'right';
  hasSearch: boolean;
  hasCTA: boolean;
  ctaText?: string;
  ctaStyle?: 'filled' | 'outline' | 'ghost';
}

export interface SidebarDesign {
  visible: boolean;
  position: 'left' | 'right';
  width: 'narrow' | 'standard' | 'wide';
  collapsible: boolean;
  defaultCollapsed: boolean;
  style: 'minimal' | 'standard' | 'rich';
  iconOnly: boolean;
  hasLogo: boolean;
}

export interface HeroDesign {
  visible: boolean;
  height: 'compact' | 'standard' | 'tall' | 'fullscreen';
  layout: 'centered' | 'left-aligned' | 'split' | 'image-background';
  hasImage: boolean;
  imagePosition?: 'left' | 'right' | 'background';
  hasSubtitle: boolean;
  hasCTA: boolean;
  ctaCount: 1 | 2;
}

export interface NavigationDesign {
  style: 'horizontal' | 'vertical' | 'mega-menu' | 'hamburger';
  position: 'header' | 'sidebar' | 'floating';
  itemStyle: 'text' | 'pills' | 'underline' | 'boxed';
  showIcons: boolean;
  showLabels: boolean;
  maxVisibleItems: number;
}

export interface CardDesign {
  style: 'minimal' | 'bordered' | 'elevated' | 'filled';
  imagePosition: 'top' | 'left' | 'right' | 'background' | 'none';
  showBadge: boolean;
  showFooter: boolean;
  hoverEffect: 'none' | 'lift' | 'glow' | 'scale';
  aspectRatio: 'auto' | 'square' | 'video' | 'portrait';
}

export interface ListDesign {
  style: 'simple' | 'bordered' | 'striped' | 'cards';
  showDividers: boolean;
  showAvatar: boolean;
  showMeta: boolean;
  showActions: boolean;
  density: 'compact' | 'normal' | 'relaxed';
}

export interface FooterDesign {
  visible: boolean;
  style: 'minimal' | 'standard' | 'rich';
  columns: 1 | 2 | 3 | 4;
  showSocial: boolean;
  showNewsletter: boolean;
  showCopyright: boolean;
  position: 'fixed' | 'static';
}

export interface StatsDesign {
  visible: boolean;
  layout: 'row' | 'grid';
  style: 'minimal' | 'cards' | 'bordered';
  showIcons: boolean;
  showTrend: boolean;
  columns: 2 | 3 | 4;
}

// ============================================================================
// Global Style Types
// ============================================================================

export interface TypographySettings {
  fontFamily: string;
  headingFont?: string;
  headingWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  bodyWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  headingSize: 'sm' | 'base' | 'lg' | 'xl';
  bodySize: 'xs' | 'sm' | 'base';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  letterSpacing: 'tight' | 'normal' | 'wide';
}

export interface ColorSettings {
  primary: string;
  secondary?: string;
  accent?: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

export interface SpacingSettings {
  density: 'compact' | 'normal' | 'relaxed';
  containerWidth: 'narrow' | 'standard' | 'wide' | 'full';
  sectionPadding: 'sm' | 'md' | 'lg' | 'xl';
  componentGap: 'sm' | 'md' | 'lg';
}

export interface EffectsSettings {
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadows: 'none' | 'subtle' | 'medium' | 'strong';
  animations: 'none' | 'subtle' | 'smooth' | 'playful';
  blur: 'none' | 'subtle' | 'medium' | 'strong';
  gradients: boolean;
  // Advanced Effects (AI-controllable)
  advancedEffects?: AdvancedEffectsConfig;
  // Background animations (particles, floating shapes, etc.) or custom AI-generated images
  backgroundEffect?: AnyBackgroundEffectConfig;
}

// ============================================================================
// Advanced Effects Types (AI-Controllable)
// ============================================================================

export interface AdvancedEffectsConfig {
  glassmorphism?: GlassmorphismConfig;
  neumorphism?: NeumorphismConfig;
  gradientBorder?: GradientBorderConfig;
  textEffect?: TextEffectConfig;
  customShadow?: CustomShadowConfig;
}

export interface GlassmorphismConfig {
  enabled: boolean;
  blur: number; // px
  opacity: number; // 0-1
  saturation: number; // 0-200%
  borderOpacity: number;
  targetElement?: string;
}

export interface NeumorphismConfig {
  enabled: boolean;
  style: 'flat' | 'pressed' | 'convex' | 'concave';
  intensity: 'subtle' | 'medium' | 'strong';
  lightAngle: number; // degrees
  targetElement?: string;
}

export interface GradientBorderConfig {
  enabled: boolean;
  colors: string[];
  angle: number;
  width: number;
  animated?: boolean;
  targetElement?: string;
}

export interface TextEffectConfig {
  type: 'gradient' | 'glow' | 'outline' | 'shadow' | 'none';
  colors?: string[];
  intensity?: 'subtle' | 'medium' | 'strong';
  targetElement?: string;
}

export interface CustomShadowConfig {
  layers: Array<{
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: string;
    inset?: boolean;
  }>;
  targetElement?: string;
}

// ============================================================================
// Background Animation Types (AI-Controllable)
// ============================================================================

export type BackgroundEffectType =
  | 'particles'
  | 'floating-shapes'
  | 'gradient-animation'
  | 'parallax-dots'
  | 'mesh-gradient'
  | 'aurora'
  | 'waves'
  | 'custom-image'
  | 'none';

export interface BackgroundEffectConfig {
  type: BackgroundEffectType;
  enabled: boolean;
  /** Intensity of the effect (affects particle count, speed, etc.) */
  intensity: 'subtle' | 'medium' | 'strong';
  /** Colors used by the effect */
  colors?: string[];
  /** Animation speed multiplier (1.0 = normal) */
  speed?: number;
  /** Opacity of the effect layer (0-1) */
  opacity?: number;
  /** Whether the effect responds to mouse movement */
  interactive?: boolean;
}

export interface ParticlesConfig extends BackgroundEffectConfig {
  type: 'particles';
  /** Number of particles (auto-calculated from intensity if not set) */
  count?: number;
  /** Particle shape */
  shape: 'circle' | 'square' | 'triangle' | 'star';
  /** Min and max particle size in pixels */
  sizeRange: [number, number];
  /** Whether particles should connect with lines */
  connectLines?: boolean;
  /** Max distance for line connections */
  lineDistance?: number;
}

export interface FloatingShapesConfig extends BackgroundEffectConfig {
  type: 'floating-shapes';
  /** Shapes to float */
  shapes: Array<'circle' | 'square' | 'triangle' | 'blob'>;
  /** Number of shapes */
  count?: number;
  /** Whether shapes should blur */
  blur?: boolean;
}

export interface GradientAnimationConfig extends BackgroundEffectConfig {
  type: 'gradient-animation';
  /** Gradient colors (min 2) */
  colors: string[];
  /** Animation type */
  animationType: 'shift' | 'rotate' | 'pulse' | 'wave';
  /** Gradient angle for shift/rotate */
  angle?: number;
}

export interface AuroraConfig extends BackgroundEffectConfig {
  type: 'aurora';
  /** Aurora wave colors */
  colors: string[];
  /** Number of aurora waves */
  waves?: number;
}

export interface WavesConfig extends BackgroundEffectConfig {
  type: 'waves';
  /** Wave colors */
  colors: string[];
  /** Number of wave layers */
  layers?: number;
  /** Wave amplitude */
  amplitude?: 'small' | 'medium' | 'large';
}

export interface CustomImageConfig extends Omit<BackgroundEffectConfig, 'intensity'> {
  type: 'custom-image';
  /** URL to the generated or uploaded background image */
  imageUrl: string;
  /** Background size CSS property */
  size?: 'cover' | 'contain' | 'auto';
  /** Background position CSS property */
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  /** Whether the background scrolls with content or stays fixed */
  attachment?: 'scroll' | 'fixed';
  /** Blend mode for combining with content */
  blend?: 'normal' | 'overlay' | 'multiply' | 'screen' | 'soft-light';
  /** Optional intensity override (not used for custom images, kept for type compatibility) */
  intensity?: 'subtle' | 'medium' | 'strong';
}

/**
 * Union type for all background effect configurations
 * Used in EffectsSettings to allow any specific background effect type
 */
export type AnyBackgroundEffectConfig =
  | BackgroundEffectConfig
  | ParticlesConfig
  | FloatingShapesConfig
  | GradientAnimationConfig
  | AuroraConfig
  | WavesConfig
  | CustomImageConfig;

// Component State Types (AI-Controllable)
export type ComponentStateType = 'hover' | 'active' | 'focus' | 'disabled' | 'loading';

export interface AppliedComponentState {
  state: ComponentStateType;
  presetId: string;
  targetElement: string;
  css?: string;
  tailwind?: string;
}

// Micro-Interaction Types (AI-Controllable)
export type MicroInteractionTrigger = 'hover' | 'click' | 'focus' | 'scroll';

export interface AppliedMicroInteraction {
  interactionId: string;
  targetElement: string;
  trigger: MicroInteractionTrigger;
  css?: string;
  tailwind?: string;
}

/**
 * Complete element interactions configuration
 * Supports hover, active, focus, disabled, loading states, scroll animations, and gestures
 */
export interface ElementInteractions {
  hover?: {
    transform?: string; // e.g., "scale(1.05)"
    boxShadow?: string;
    backgroundColor?: string;
    borderColor?: string;
    opacity?: number;
    transition?: string; // e.g., "all 0.2s ease"
  };
  active?: {
    transform?: string;
    boxShadow?: string;
    backgroundColor?: string;
    scale?: number;
  };
  focus?: {
    outline?: string;
    boxShadow?: string;
    borderColor?: string;
    ring?: string; // Tailwind ring utilities
  };
  disabled?: {
    opacity?: number;
    cursor?: string;
    filter?: string; // e.g., "grayscale(100%)"
    pointerEvents?: 'none' | 'auto';
  };
  loading?: {
    type: 'spinner' | 'skeleton' | 'progress' | 'pulse';
    placeholder?: string;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
  };
  scroll?: {
    trigger: 'enter' | 'exit' | 'progress';
    animation: string; // e.g., "fadeInUp", "slideInLeft"
    delay?: number; // ms
    duration?: number; // ms
    threshold?: number; // 0-1, when to trigger
  };
  gesture?: {
    type: 'swipe' | 'drag' | 'pinch' | 'long-press';
    direction?: 'left' | 'right' | 'up' | 'down' | 'any';
    action: string; // e.g., "delete", "reorder", "dismiss"
    feedback?: 'visual' | 'haptic' | 'both';
  };
  pageTransition?: {
    type: 'fade' | 'slide' | 'scale' | 'flip';
    duration?: number; // ms
    direction?: 'left' | 'right' | 'up' | 'down';
    easing?: string;
  };
}

/**
 * Animation reference for element
 */
export interface AnimationRef {
  id: string;
  trigger: 'load' | 'scroll' | 'hover' | 'click' | 'focus';
  delay?: number;
  duration?: number;
  iterationCount?: number | 'infinite';
}

/**
 * Custom animation definition
 */
export interface CustomAnimation {
  id: string;
  name: string;
  keyframes: Record<string, Record<string, string>>; // e.g., { "0%": { opacity: "0" }, "100%": { opacity: "1" } }
  timing: string; // e.g., "ease-in-out"
  duration: number; // ms
  iterationCount: number | 'infinite';
}

export interface GlobalStyles {
  typography: TypographySettings;
  colors: ColorSettings;
  spacing: SpacingSettings;
  effects: EffectsSettings;
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
// Reference Media Types
// ============================================================================

export interface ReferenceMedia {
  id: string;
  type: 'image' | 'video' | 'url';
  source: string; // base64 for images, URL for videos/links
  name: string;
  analysis?: string; // AI's interpretation of the reference
  addedAt: string;
}

// ============================================================================
// Multi-Page Reference Types
// ============================================================================

/**
 * Page role detected from visual analysis
 */
export type PageRole =
  | 'landing'
  | 'dashboard'
  | 'list'
  | 'detail'
  | 'form'
  | 'auth'
  | 'settings'
  | 'profile'
  | 'checkout'
  | 'search'
  | 'error'
  | 'custom';

/**
 * Analysis result for a single page
 */
export interface PageAnalysis {
  /** Detected page role/type */
  pageRole: PageRole;
  /** Layout type detected for this page */
  layoutType:
    | 'single-page'
    | 'dashboard'
    | 'landing'
    | 'e-commerce'
    | 'portfolio'
    | 'blog'
    | 'saas';
  /** Color palette extracted from this page */
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  /** Typography settings detected */
  typography: {
    headingStyle: string;
    bodyStyle: string;
    headingWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
    bodyWeight: 'light' | 'normal' | 'medium';
    estimatedHeadingFont?: string;
    estimatedBodyFont?: string;
  };
  /** Spacing settings detected */
  spacing: {
    density: 'compact' | 'normal' | 'relaxed';
    sectionPadding: 'sm' | 'md' | 'lg' | 'xl';
    componentGap: 'sm' | 'md' | 'lg';
  };
  /** Components detected with enhanced positioning */
  components: DetectedComponentEnhanced[];
  /** Visual effects detected */
  effects: {
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    shadows: 'none' | 'subtle' | 'medium' | 'strong';
    hasGradients: boolean;
    hasBlur: boolean;
    hasAnimations: boolean;
  };
  /** Overall design vibe */
  vibe: string;
  /** Keywords describing the aesthetic */
  vibeKeywords: string[];
  /** Confidence score 0-1 */
  confidence: number;
}

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
  };
  /** Content information extracted from the component */
  content?: {
    text?: string;
    hasIcon?: boolean;
    hasImage?: boolean;
    itemCount?: number;
    placeholder?: string;
  };
  /** Parent component ID for hierarchy */
  parentId?: string;
  /** Child component IDs */
  children?: string[];
  /** Z-index layer */
  zIndex?: number;
  /** If this is a navigation item, which page does it link to */
  navigatesTo?: string;
  /** Is this element part of the navigation system */
  isNavigationItem?: boolean;
  /** Is this element interactive (button, link, input) */
  isInteractive?: boolean;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Navigation item extracted from page analysis
 */
export interface NavigationItem {
  /** Display label */
  label: string;
  /** Target page slug if internal navigation */
  targetPageSlug?: string;
  /** Icon identifier if detected */
  icon?: string;
  /** Display order */
  order: number;
  /** Was this item detected as active/current in the reference */
  isActive?: boolean;
  /** Nested navigation items */
  children?: NavigationItem[];
}

/**
 * Navigation structure detected across pages
 */
export interface DetectedNavigation {
  /** Navigation items */
  items: NavigationItem[];
  /** Navigation style */
  style: 'horizontal' | 'vertical' | 'sidebar' | 'hamburger' | 'tabs' | 'mega-menu';
  /** Position in layout */
  position: 'header' | 'sidebar' | 'footer' | 'floating';
  /** Whether navigation is sticky */
  isSticky?: boolean;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Inferred route from page analysis
 */
export interface InferredRoute {
  /** Route path (e.g., "/products", "/products/:id") */
  path: string;
  /** Associated page ID */
  pageId: string;
  /** Is this the index/home route */
  isIndex?: boolean;
  /** Dynamic route parameters */
  params?: string[];
  /** Page name for display */
  pageName: string;
}

/**
 * Reference for a single page in multi-page mode
 */
export interface PageReference {
  /** Unique identifier */
  id: string;
  /** Display name (e.g., "Home", "Dashboard", "Product Detail") */
  name: string;
  /** URL-friendly slug (e.g., "home", "dashboard", "product-detail") */
  slug: string;
  /** Base64 encoded reference image */
  referenceImage: string;
  /** Thumbnail for display (smaller base64) */
  thumbnail?: string;
  /** Analysis result from AI */
  analysis?: PageAnalysis;
  /** Display order in navigation */
  order: number;
  /** Is this the main/index page */
  isMain?: boolean;
  /** Analysis status */
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  /** Error message if status is error */
  errorMessage?: string;
  /** When the page reference was created */
  createdAt: string;
}

/**
 * Page transition detected from video analysis (for multi-page mode)
 */
export interface VideoPageTransition {
  /** Start timestamp in seconds */
  startTime: number;
  /** End timestamp in seconds */
  endTime: number;
  /** Transition type detected */
  transitionType: 'navigation' | 'scroll' | 'modal' | 'drawer' | 'tab-switch' | 'unknown';
  /** Confidence that this is a page transition */
  confidence: number;
  /** Frame index where transition starts */
  startFrameIndex: number;
  /** Frame index where transition ends */
  endFrameIndex: number;
}

/**
 * Multi-page design container
 */
export interface MultiPageDesign {
  /** All page references */
  pages: PageReference[];
  /** Shared design tokens across all pages (colors, typography, effects) */
  sharedDesign: Partial<LayoutDesign>;
  /** Detected navigation structure */
  navigation: DetectedNavigation;
  /** Per-page design overrides */
  pageSpecificOverrides: Record<string, Partial<LayoutDesign>>;
  /** Inferred routes */
  inferredRoutes: InferredRoute[];
  /** When this multi-page design was created */
  createdAt: string;
  /** When this was last updated */
  updatedAt: string;
}

/**
 * Result from multi-page analysis API
 */
export interface MultiPageAnalysisResult {
  /** Analyzed pages with their individual analysis */
  pages: PageReference[];
  /** Shared design detected across pages */
  sharedDesign: Partial<LayoutDesign>;
  /** Navigation structure detected */
  navigation: DetectedNavigation;
  /** Inferred routes */
  inferredRoutes: InferredRoute[];
  /** Overall confidence score */
  confidence: number;
  /** Processing metadata */
  metadata: {
    totalPages: number;
    analyzedPages: number;
    processingTimeMs: number;
    modelUsed: 'gemini' | 'claude' | 'dual';
  };
}

// ============================================================================
// Conversation Context Types
// ============================================================================

export interface ConversationContext {
  messageCount: number;
  keyDecisions: string[];
  userPreferences: string[];
  lastUpdated: string;
}

// ============================================================================
// Design Context Types (Auto-extracted from conversation)
// ============================================================================

/**
 * Context about what the user is building, extracted automatically from chat.
 * Helps the AI provide more relevant design suggestions.
 */
export interface DesignContext {
  /** What the app/site is for (e.g., "E-commerce store for handmade crafts") */
  purpose?: string;
  /** Who will use it (e.g., "Small business owners, crafters") */
  targetUsers?: string;
  /** Any mentioned constraints (e.g., ["Mobile-first", "Fast checkout", "Accessible"]) */
  requirements?: string[];
  /** When this context was last updated */
  lastUpdated?: string;
}

// ============================================================================
// Layout Message Types
// ============================================================================

export type MessageErrorType = 'network' | 'timeout' | 'rate_limit' | 'server' | 'unknown';

export interface MessageError {
  type: MessageErrorType;
  message: string;
  canRetry: boolean;
  retryAfter?: number; // Milliseconds until retry is allowed
  originalMessage?: string; // Original user message for retry
}

export interface LayoutMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[]; // Base64 images
  /** Selected element info when message was sent (Click + Talk mode) */
  selectedElement?: SelectedElementInfo;
  previewSnapshot?: string; // Screenshot of preview when message was sent
  error?: MessageError; // Error information for retry functionality
  isRetrying?: boolean; // Indicates message is being retried
  /** Gemini's visual analysis for embedding Creative Director panel in chat */
  geminiAnalysis?: VisualAnalysis;
}

// ============================================================================
// Main Layout Design Type
// ============================================================================

export interface LayoutDesign {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;

  // Base preferences (maps to UIPreferences for compatibility)
  basePreferences: {
    style: 'modern' | 'minimalist' | 'playful' | 'professional' | 'custom';
    colorScheme: 'light' | 'dark' | 'auto' | 'custom';
    layout: 'single-page' | 'multi-page' | 'dashboard' | 'custom';
  };

  // Global Styling
  globalStyles: GlobalStyles;

  // Component Specifications
  components: {
    header?: HeaderDesign;
    sidebar?: SidebarDesign;
    hero?: HeroDesign;
    navigation?: NavigationDesign;
    cards?: CardDesign;
    lists?: ListDesign;
    stats?: StatsDesign;
    footer?: FooterDesign;
  };

  // Layout Structure
  structure: LayoutStructure;

  // Responsive Settings
  responsive: ResponsiveSettings;

  // Reference Media
  referenceMedia: ReferenceMedia[];

  // Conversation Context
  conversationContext: ConversationContext;

  // Design Context (auto-extracted from conversation)
  designContext?: DesignContext;

  // Multi-Page Design (optional, for multi-page mode)
  multiPage?: MultiPageDesign;

  // Current page being edited (for multi-page mode)
  currentPageId?: string;
}

// ============================================================================
// LAYOUT NODE - Recursive Structure for Component Nesting
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
 * Design version for history tracking
 */
export interface DesignVersion {
  id: string;
  timestamp: Date | string;
  description: string;
  name?: string;
  thumbnail?: string;
  design: Partial<LayoutDesign>;
  changedElements?: string[];
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

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

/**
 * Custom grid configuration for flexible layouts
 */
export interface GridConfig {
  columns: number | 'auto-fit' | 'auto-fill';
  columnWidths?: string[]; // ['1fr', '2fr', '1fr'] for custom column sizes
  gap: string;
  rowGap?: string;
  minColumnWidth?: string; // For auto-fit/fill
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
}

// ============================================================================
// NEW COMPONENT TYPES
// ============================================================================

/**
 * Form component design specification
 */
export interface FormDesign {
  layout: 'vertical' | 'horizontal' | 'inline' | 'grid';
  labelPosition: 'top' | 'left' | 'floating' | 'hidden';
  inputStyle: 'outlined' | 'filled' | 'underlined' | 'minimal';
  inputSize: 'xs' | 'sm' | 'md' | 'lg';
  showLabels: boolean;
  showHelperText: boolean;
  showRequiredIndicator: boolean;
  buttonPosition: 'left' | 'center' | 'right' | 'full' | 'inline';
  spacing: 'compact' | 'normal' | 'relaxed';
  gridColumns?: number;
}

/**
 * Table component design specification
 */
export interface TableDesign {
  style: 'minimal' | 'striped' | 'bordered' | 'elevated' | 'clean';
  headerStyle: 'simple' | 'bold' | 'colored' | 'sticky';
  rowHover: boolean;
  stickyHeader: boolean;
  density: 'compact' | 'normal' | 'relaxed';
  showPagination: boolean;
  showFilters: boolean;
  showSorting: boolean;
  showCheckboxes: boolean;
  zebraStripes: boolean;
  borderStyle: 'none' | 'horizontal' | 'vertical' | 'all';
}

/**
 * Tabs component design specification
 */
export interface TabsDesign {
  variant: 'line' | 'enclosed' | 'pills' | 'underlined' | 'buttons';
  position: 'top' | 'left' | 'bottom' | 'right';
  size: 'sm' | 'md' | 'lg';
  fullWidth: boolean;
  showIcons: boolean;
  iconPosition: 'left' | 'top' | 'right';
  animated: boolean;
}

/**
 * Modal/Dialog component design specification
 */
export interface ModalDesign {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto';
  position: 'center' | 'top' | 'right' | 'bottom' | 'left';
  hasOverlay: boolean;
  overlayBlur: boolean;
  overlayOpacity: number;
  animation: 'fade' | 'slide' | 'scale' | 'none';
  closeOnOverlayClick: boolean;
  closeOnEscape: boolean;
  showCloseButton: boolean;
  scrollBehavior: 'inside' | 'outside';
}

/**
 * Alert/Notification component design specification
 */
export interface AlertDesign {
  variant: 'subtle' | 'solid' | 'outline' | 'left-accent' | 'top-accent';
  showIcon: boolean;
  showCloseButton: boolean;
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
  animation: 'fade' | 'slide' | 'none';
}

/**
 * Accordion component design specification
 */
export interface AccordionDesign {
  variant: 'simple' | 'bordered' | 'separated' | 'enclosed';
  allowMultiple: boolean;
  defaultExpanded: boolean;
  showIcon: boolean;
  iconPosition: 'left' | 'right';
  animation: 'smooth' | 'instant';
}

/**
 * Carousel/Slider component design specification
 */
export interface CarouselDesign {
  variant: 'default' | 'fade' | 'overlap' | 'continuous' | 'coverflow';
  showIndicators: boolean;
  showControls: boolean;
  autoPlay: boolean;
  autoPlayDuration: number; // milliseconds
  pauseOnHover: boolean;
  transitionDuration: 'fast' | 'normal' | 'slow';
  indicatorStyle: 'dots' | 'bars' | 'thumbnails' | 'numbers';
  indicatorPosition: 'bottom' | 'top' | 'left' | 'right';
  controlStyle: 'arrows' | 'chevrons' | 'minimal' | 'circular';
  controlPosition: 'inside' | 'outside' | 'bottom';
  loop: boolean;
  slidesPerView: number;
  spacing: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Stepper/Wizard component design specification
 */
export interface StepperDesign {
  variant: 'horizontal' | 'vertical';
  style: 'numbered' | 'icons' | 'dots' | 'progress-bar' | 'circles';
  connectorStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  completedStyle: 'check' | 'filled' | 'highlight' | 'strikethrough';
  size: 'sm' | 'md' | 'lg';
  labelPosition: 'bottom' | 'right' | 'hidden';
  showDescription: boolean;
  allowClickNavigation: boolean;
  animated: boolean;
  colorScheme: 'primary' | 'success' | 'neutral';
}

/**
 * Timeline component design specification
 */
export interface TimelineDesign {
  variant: 'vertical' | 'horizontal' | 'alternating' | 'compact';
  connectorStyle: 'solid' | 'dashed' | 'dotted' | 'gradient';
  connectorWidth: 'thin' | 'normal' | 'thick';
  markerStyle: 'circle' | 'square' | 'diamond' | 'icon' | 'image';
  markerSize: 'sm' | 'md' | 'lg';
  datePosition: 'inline' | 'opposite' | 'above' | 'hidden';
  contentStyle: 'card' | 'simple' | 'bordered';
  animated: boolean;
  animationStyle: 'fade' | 'slide' | 'scale';
  showConnector: boolean;
}

/**
 * Pagination component design specification
 */
export interface PaginationDesign {
  variant: 'numbered' | 'simple' | 'dots' | 'load-more' | 'infinite-scroll';
  size: 'sm' | 'md' | 'lg';
  showFirstLast: boolean;
  showPrevNext: boolean;
  maxVisiblePages: number;
  shape: 'rounded' | 'square' | 'pill' | 'circle';
  style: 'filled' | 'outlined' | 'ghost' | 'minimal';
  position: 'left' | 'center' | 'right' | 'space-between';
  showPageInfo: boolean;
  showPageSize: boolean;
}

/**
 * Breadcrumb component design specification
 */
export interface BreadcrumbDesign {
  separator: 'slash' | 'chevron' | 'arrow' | 'dot' | 'custom';
  customSeparator?: string;
  showHome: boolean;
  homeIcon: boolean;
  truncate: boolean;
  maxItems: number;
  collapsible: boolean;
  collapseAt: number;
  size: 'sm' | 'md' | 'lg';
  style: 'default' | 'pills' | 'underlined';
}

// ============================================================================
// RESPONSIVE OVERRIDES
// ============================================================================

/**
 * Generic responsive overrides wrapper for any component type
 * Allows per-breakpoint customization of component properties
 */
export interface ResponsiveOverrides<T> {
  mobile?: Partial<T>;
  tablet?: Partial<T>;
  desktop?: Partial<T>;
  wide?: Partial<T>;
  custom?: Record<string, Partial<T>>; // Custom breakpoint names
}

/**
 * Component with responsive support
 */
export type ResponsiveComponent<T> = T & {
  responsive?: ResponsiveOverrides<T>;
};

// ============================================================================
// CUSTOMIZABLE VALUE WRAPPER
// ============================================================================

/**
 * Wrapper type for values that can be preset or custom
 * Allows pixel-level control while maintaining preset options
 */
export interface CustomizableValue<T extends string> {
  preset?: T;
  custom?: string; // Allows '16px', '1rem', '2.5em', etc.
}

/**
 * Helper to get the actual value from a CustomizableValue
 */
export function getCustomizableValue<T extends string>(
  value: CustomizableValue<T> | T | undefined,
  presetMap: Record<T, string>,
  defaultValue: string
): string {
  if (!value) return defaultValue;
  if (typeof value === 'string') return presetMap[value] || defaultValue;
  if (value.custom) return value.custom;
  if (value.preset) return presetMap[value.preset] || defaultValue;
  return defaultValue;
}

// ============================================================================
// EXTENDED RESPONSIVE SETTINGS
// ============================================================================

/**
 * Custom breakpoint configuration
 */
export interface CustomBreakpoints {
  mobile: number; // Default: 375
  mobileLandscape?: number; // Optional: 480
  tablet: number; // Default: 768
  tabletLandscape?: number; // Optional: 1024
  laptop?: number; // Optional: 1024
  desktop: number; // Default: 1200
  wide?: number; // Optional: 1440
  ultrawide?: number; // Optional: 1920
}

/**
 * Per-breakpoint visibility settings
 */
export interface BreakpointVisibility {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
  wide?: boolean;
}

// ============================================================================
// EXTENDED LAYOUT DESIGN
// ============================================================================

/**
 * Extended components interface with new component types
 */
export interface ExtendedLayoutComponents {
  header?: ResponsiveComponent<HeaderDesign>;
  sidebar?: ResponsiveComponent<SidebarDesign>;
  hero?: ResponsiveComponent<HeroDesign>;
  navigation?: ResponsiveComponent<NavigationDesign>;
  cards?: ResponsiveComponent<CardDesign> & { gridConfig?: GridConfig };
  lists?: ResponsiveComponent<ListDesign>;
  stats?: ResponsiveComponent<StatsDesign>;
  footer?: ResponsiveComponent<FooterDesign>;
  forms?: ResponsiveComponent<FormDesign>;
  tables?: ResponsiveComponent<TableDesign>;
  tabs?: ResponsiveComponent<TabsDesign>;
  modals?: ResponsiveComponent<ModalDesign>;
  alerts?: ResponsiveComponent<AlertDesign>;
  accordions?: ResponsiveComponent<AccordionDesign>;
  // New component types
  carousels?: ResponsiveComponent<CarouselDesign>;
  steppers?: ResponsiveComponent<StepperDesign>;
  timelines?: ResponsiveComponent<TimelineDesign>;
  pagination?: ResponsiveComponent<PaginationDesign>;
  breadcrumbs?: ResponsiveComponent<BreadcrumbDesign>;
}

/**
 * Extended responsive settings with custom breakpoints
 */
export interface ExtendedResponsiveSettings extends ResponsiveSettings {
  customBreakpoints?: CustomBreakpoints;
  containerQueries?: boolean;
  fluidTypography?: boolean;
}

/**
 * Extended LayoutDesign with new features
 */
export interface ExtendedLayoutDesign extends Omit<LayoutDesign, 'components' | 'responsive'> {
  components: ExtendedLayoutComponents;
  responsive: ExtendedResponsiveSettings;
  layoutTree?: LayoutNode; // Recursive layout structure
  customGrids?: Record<string, GridConfig>; // Named grid configurations
}

// ============================================================================
// API Types
// ============================================================================

/** Workflow state for multi-step design workflows */
export interface LayoutWorkflowState {
  workflowId: string;
  workflowType: string;
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepNotes: Record<string, string>;
  startedAt: string;
}

/** Device view types for responsive design */
export type DeviceView = 'desktop' | 'tablet' | 'mobile';

export interface LayoutChatRequest {
  message: string;
  conversationHistory: LayoutMessage[];
  /** Current design state - optional if designUnchanged is true (token optimization) */
  currentDesign?: Partial<LayoutDesign>;
  /** Signal that design hasn't changed since last request (token optimization) */
  designUnchanged?: boolean;
  /** Selected element info for scoped AI changes (Click + Talk mode) */
  selectedElement?: SelectedElementInfo;
  previewScreenshot?: string;
  referenceImages?: string[];
  /** Analysis mode: standard, pixel-perfect replication, or video-replication */
  analysisMode?: 'standard' | 'pixel-perfect' | 'video-replication';
  /** Type of analysis to perform */
  requestedAnalysis?: 'quick' | 'deep' | 'full';
  /** Cross-session memories context from semantic memory (P0-P1 Phase 7b) */
  memoriesContext?: string;
  /** Current workflow state for multi-step design workflows */
  workflowState?: LayoutWorkflowState;
  /** Current device view for responsive context */
  currentDevice?: DeviceView;

  // Multi-page mode fields
  /** Page references for multi-page analysis */
  pageReferences?: PageReference[];
  /** Current page ID being edited */
  currentPageId?: string;
  /** Request type for routing */
  requestType?: 'single-page' | 'multi-page-analysis' | 'page-specific' | 'add-pages';
  /** Existing multi-page design for incremental updates */
  existingMultiPageDesign?: MultiPageDesign;
}

export interface DesignChange {
  property: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export interface SuggestedAction {
  label: string;
  action: string;
  icon?: string;
}

export interface LayoutChatResponse {
  message: string;
  updatedDesign: Partial<LayoutDesign>;
  suggestedActions?: SuggestedAction[];
  designChanges?: DesignChange[];
  /** Detected design pattern from user message (e.g., "glassmorphism", "minimal") */
  detectedPattern?: {
    id: string;
    name: string;
    description: string;
  };
  tokensUsed: { input: number; output: number };
  /** Complete pixel-perfect analysis results (if pixel-perfect mode) */
  pixelPerfectAnalysis?: CompleteDesignAnalysis;
  /** Quick analysis results for fast feedback */
  quickAnalysis?: QuickAnalysis;
  /** Extracted context from user message (purpose, target users, requirements) */
  extractedContext?: DesignContext;
  /** Animations created via apply_animation tool */
  animations?: DetectedAnimation[];
  /** Background images generated via generate_background tool (DALL-E) */
  generatedBackgrounds?: Array<{
    url: string;
    targetElement: string;
    prompt: string;
  }>;
  /** List of tools that were used in this response */
  toolsUsed?: string[];
  /** Updated workflow state after processing (for multi-step workflows) */
  workflowState?: LayoutWorkflowState;
}

// ============================================================================
// Default Values
// ============================================================================

// NOTE: These defaults use neutral grays - actual colors are AI-generated based on user input
// Do NOT add hardcoded blue (#3B82F6) or other branded colors here
export const defaultGlobalStyles: GlobalStyles = {
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingWeight: 'semibold',
    bodyWeight: 'normal',
    headingSize: 'lg',
    bodySize: 'base',
    lineHeight: 'normal',
    letterSpacing: 'normal',
  },
  colors: {
    primary: '#6B7280', // Neutral gray - AI will generate actual colors
    secondary: '#9CA3AF',
    accent: '#6B7280',
    background: '#F9FAFB', // Light neutral background
    surface: '#FFFFFF',
    text: '#374151',
    textMuted: '#6B7280',
    border: '#E5E7EB',
  },
  spacing: {
    density: 'normal',
    containerWidth: 'standard',
    sectionPadding: 'lg',
    componentGap: 'md',
  },
  effects: {
    borderRadius: 'lg',
    shadows: 'medium',
    animations: 'smooth',
    blur: 'none',
    gradients: false,
  },
};

export const defaultStructure: LayoutStructure = {
  type: 'single-page',
  hasHeader: true,
  hasSidebar: false,
  hasFooter: true,
  sidebarPosition: 'left',
  headerType: 'sticky',
  contentLayout: 'centered',
  mainContentWidth: 'standard',
};

export const defaultResponsive: ResponsiveSettings = {
  mobileBreakpoint: 640,
  tabletBreakpoint: 1024,
  mobileLayout: 'stack',
  mobileHeader: 'hamburger',
  hideSidebarOnMobile: true,
  stackCardsOnMobile: true,
};

export const defaultLayoutDesign: LayoutDesign = {
  id: '',
  name: 'Untitled Design',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  basePreferences: {
    style: 'modern',
    colorScheme: 'light', // Neutral default - AI will adjust based on user input
    layout: 'single-page',
  },
  globalStyles: defaultGlobalStyles,
  components: {
    header: {
      visible: true,
      height: 'standard',
      style: 'solid',
      logoPosition: 'left',
      navPosition: 'right',
      hasSearch: false,
      hasCTA: true,
      ctaText: 'Get Started',
      ctaStyle: 'filled',
    },
    hero: {
      visible: true,
      height: 'standard',
      layout: 'centered',
      hasImage: false,
      hasSubtitle: true,
      hasCTA: true,
      ctaCount: 1,
    },
    cards: {
      style: 'elevated',
      imagePosition: 'top',
      showBadge: true,
      showFooter: false,
      hoverEffect: 'lift',
      aspectRatio: 'auto',
    },
    lists: {
      style: 'bordered',
      showDividers: true,
      showAvatar: false,
      showMeta: true,
      showActions: true,
      density: 'normal',
    },
    footer: {
      visible: true,
      style: 'minimal',
      columns: 1,
      showSocial: false,
      showNewsletter: false,
      showCopyright: true,
      position: 'static',
    },
  },
  structure: defaultStructure,
  responsive: defaultResponsive,
  referenceMedia: [],
  conversationContext: {
    messageCount: 0,
    keyDecisions: [],
    userPreferences: [],
    lastUpdated: new Date().toISOString(),
  },
};

/**
 * Empty layout design for starting with a blank canvas.
 * No pre-filled styles or components - user must describe or upload reference.
 * Exported as Partial<LayoutDesign> since optional fields are undefined.
 */
export const emptyLayoutDesign: Partial<LayoutDesign> = {
  id: '',
  name: 'New Design',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  referenceMedia: [],
  conversationContext: {
    messageCount: 0,
    keyDecisions: [],
    userPreferences: [],
    lastUpdated: new Date().toISOString(),
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function createLayoutDesign(name: string, overrides?: Partial<LayoutDesign>): LayoutDesign {
  const now = new Date().toISOString();
  return {
    ...defaultLayoutDesign,
    ...overrides,
    id: `ld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateLayoutDesign(
  design: LayoutDesign,
  updates: Partial<LayoutDesign>
): LayoutDesign {
  return {
    ...design,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: design.version + 1,
  };
}

// ============================================================================
// COMPLETE DESIGN ANALYSIS TYPES (Pixel-Perfect Replication)
// ============================================================================

/**
 * Color swatch with usage context
 */
export interface ColorSwatch {
  hex: string;
  rgba?: string;
  usage: string; // e.g., "button-primary", "card-background", "heading-text"
  frequency: number; // How often this color appears (0-100)
}

/**
 * Gradient definition with full CSS output
 */
export interface GradientDefinition {
  id: string;
  type: 'linear' | 'radial' | 'conic';
  direction: string; // e.g., "135deg", "to right", "circle at center"
  stops: Array<{ color: string; position: string }>;
  css: string; // Full CSS value
  usage: string; // Where this gradient is used
}

/**
 * Semi-transparent overlay specification
 */
export interface OverlaySpec {
  color: string; // rgba value
  opacity: number;
  usage: string;
}

/**
 * Font specification with Google Fonts integration
 */
export interface FontSpec {
  family: string;
  googleFontUrl: string;
  fallbacks: string[];
  weights: number[];
  confidence: number; // 0-1 confidence of match
  detected: string; // Description of what was detected
}

/**
 * Typography scale for a specific text level
 */
export interface TypeScale {
  size: string; // e.g., "48px" or "3rem"
  weight: number; // 100-900
  lineHeight: number | string; // e.g., 1.2 or "1.5"
  letterSpacing: string; // e.g., "-0.02em"
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

/**
 * Responsive value that changes per breakpoint
 */
export interface ResponsiveValue<T = string> {
  mobile: T;
  tablet: T;
  desktop: T;
}

/**
 * Shadow specification with full CSS output
 */
export interface ShadowSpec {
  name: string;
  value: string; // Full CSS box-shadow value
  layers: Array<{
    offsetX: string;
    offsetY: string;
    blur: string;
    spread: string;
    color: string;
    inset?: boolean;
  }>;
}

/**
 * Border radius specification (can be per-corner)
 */
export interface RadiusSpec {
  all?: string;
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  css: string;
}

/**
 * Hover animation specification
 */
export interface HoverAnimation {
  element: string; // CSS selector or description
  properties: Record<string, { from: string; to: string }>;
  duration: string; // e.g., "0.2s"
  easing: string; // e.g., "ease-out", "cubic-bezier(0.4, 0, 0.2, 1)"
  delay?: string;
  css: string; // Full CSS output
  tailwind: string; // Tailwind classes
  framerMotion: Record<string, unknown>; // Framer Motion config
}

/**
 * Scroll-triggered animation
 */
export interface ScrollAnimation {
  element: string;
  trigger: 'enter' | 'exit' | 'center';
  animation: string; // Animation name/description
  duration: string;
  easing: string;
  css: string;
  framerMotion: Record<string, unknown>;
}

/**
 * Entrance/page load animation
 */
export interface EntranceAnimation {
  element: string;
  animation:
    | 'fadeIn'
    | 'fadeInUp'
    | 'fadeInDown'
    | 'slideInLeft'
    | 'slideInRight'
    | 'scaleIn'
    | 'custom';
  duration: string;
  delay: string;
  stagger?: string; // For staggered children
  css: string;
  framerMotion: Record<string, unknown>;
}

/**
 * Transition specification
 */
export interface TransitionSpec {
  property: string; // CSS property or "all"
  duration: string;
  easing: string;
  delay?: string;
  css: string;
}

/**
 * Micro-interaction specification
 */
export interface MicroInteraction {
  trigger: 'click' | 'hover' | 'focus' | 'active' | 'drag';
  element: string;
  animation: string;
  feedback: string; // Description of user feedback
  css: string;
  framerMotion: Record<string, unknown>;
}

/**
 * Page transition animation
 */
export interface PageTransition {
  type: 'fade' | 'slide' | 'scale' | 'morph' | 'custom';
  duration: string;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  css: string;
  framerMotion: Record<string, unknown>;
}

/**
 * Button component specification
 */
export interface ButtonSpec {
  variant: string; // e.g., "primary", "secondary", "ghost"
  size: string;
  states: {
    default: Record<string, string>;
    hover: Record<string, string>;
    focus: Record<string, string>;
    active: Record<string, string>;
    disabled: Record<string, string>;
  };
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: number;
  transition: string;
}

/**
 * Input component specification
 */
export interface InputSpec {
  variant: string;
  size: string;
  states: {
    default: Record<string, string>;
    hover: Record<string, string>;
    focus: Record<string, string>;
    error: Record<string, string>;
    disabled: Record<string, string>;
  };
  borderRadius: string;
  padding: string;
  fontSize: string;
  labelStyle: Record<string, string>;
  placeholderStyle: Record<string, string>;
}

/**
 * Card component specification
 */
export interface CardSpec {
  variant: string;
  states: {
    default: Record<string, string>;
    hover: Record<string, string>;
  };
  borderRadius: string;
  padding: string;
  shadow: string;
  border: string;
  background: string;
}

/**
 * Header component specification
 */
export interface HeaderSpec {
  height: string;
  background: string;
  borderBottom?: string;
  shadow?: string;
  blur?: string;
  position: 'fixed' | 'sticky' | 'static';
  padding: string;
  logoSize: string;
  navItemSpacing: string;
  navItemStyle: Record<string, string>;
}

/**
 * Navigation component specification
 */
export interface NavSpec {
  itemStyle: Record<string, string>;
  itemHoverStyle: Record<string, string>;
  itemActiveStyle: Record<string, string>;
  spacing: string;
  fontSize: string;
  fontWeight: number;
}

/**
 * Hero section specification
 */
export interface HeroSpec {
  height: string;
  padding: string;
  background: string;
  headingStyle: TypeScale;
  subtitleStyle: TypeScale;
  ctaStyle: ButtonSpec;
  alignment: 'left' | 'center' | 'right';
  imagePosition?: string;
}

/**
 * Footer component specification
 */
export interface FooterSpec {
  height?: string;
  background: string;
  borderTop?: string;
  padding: string;
  textStyle: Record<string, string>;
  linkStyle: Record<string, string>;
}

/**
 * Modal/Dialog specification
 */
export interface ModalSpec {
  maxWidth: string;
  borderRadius: string;
  padding: string;
  background: string;
  shadow: string;
  overlayColor: string;
  overlayBlur?: string;
  animation: EntranceAnimation;
}

/**
 * Dropdown specification
 */
export interface DropdownSpec {
  borderRadius: string;
  padding: string;
  background: string;
  shadow: string;
  border?: string;
  itemPadding: string;
  itemHoverStyle: Record<string, string>;
  animation: EntranceAnimation;
}

/**
 * Table specification
 */
export interface TableSpec {
  headerStyle: Record<string, string>;
  cellPadding: string;
  rowBorder?: string;
  stripedColor?: string;
  hoverColor?: string;
  fontSize: string;
}

/**
 * List specification
 */
export interface ListSpec {
  itemPadding: string;
  dividerStyle?: string;
  hoverStyle?: Record<string, string>;
  spacing: string;
}

/**
 * Layout region specification
 */
export interface LayoutRegion {
  id: string;
  name: string;
  gridArea?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  padding?: string;
  background?: string;
}

/**
 * Breakpoint configuration
 */
export interface BreakpointConfig {
  sm: number; // 640px
  md: number; // 768px
  lg: number; // 1024px
  xl: number; // 1280px
  '2xl': number; // 1536px
}

/**
 * Complete Design Analysis - Full pixel-perfect extraction
 */
export interface CompleteDesignAnalysis {
  // Meta
  id: string;
  analyzedAt: string;
  sourceType: 'image' | 'video' | 'url';
  sourceUrl?: string;
  confidence: number; // Overall confidence of analysis (0-1)

  // COLORS - Every color in the design
  colors: {
    palette: ColorSwatch[];
    primary: string;
    primaryHover?: string;
    secondary: string;
    secondaryHover?: string;
    accent: string;
    accentHover?: string;
    background: string;
    surface: string;
    surfaceAlt?: string;
    text: string;
    textMuted: string;
    textInverted?: string;
    border: string;
    borderLight?: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    gradients: GradientDefinition[];
    overlays: OverlaySpec[];
  };

  // TYPOGRAPHY - Complete font specifications
  typography: {
    headingFont: FontSpec;
    bodyFont: FontSpec;
    monoFont?: FontSpec;
    displaySizes: {
      h1: TypeScale;
      h2: TypeScale;
      h3: TypeScale;
      h4: TypeScale;
      h5: TypeScale;
      h6: TypeScale;
    };
    bodySizes: {
      xs: TypeScale;
      sm: TypeScale;
      base: TypeScale;
      lg: TypeScale;
      xl: TypeScale;
    };
    lineHeights: Record<string, number>;
    letterSpacing: Record<string, string>;
    fontWeights: number[];
  };

  // SPACING - Complete spacing system
  spacing: {
    baseUnit: number; // 4 or 8
    scale: number[]; // [4, 8, 12, 16, 24, 32, 48, 64, ...]
    containerMaxWidth: string;
    containerPadding: ResponsiveValue;
    sectionPadding: ResponsiveValue;
    componentGap: ResponsiveValue;
    cardPadding: string;
    buttonPadding: string;
    inputPadding: string;
  };

  // EFFECTS - All visual effects
  effects: {
    borderRadius: {
      none: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      full: string;
      button: string;
      card: string;
      input: string;
    };
    shadows: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
      card: string;
      dropdown: string;
      modal: string;
      button: string;
      buttonHover: string;
      inner?: string;
    };
    blur: {
      sm: string;
      md: string;
      lg: string;
      backdrop: string;
    };
    transitions: {
      fast: string;
      normal: string;
      slow: string;
      bounce: string;
      spring: string;
    };
  };

  // COMPONENTS - Detailed component specs
  components: {
    header?: HeaderSpec;
    navigation?: NavSpec;
    hero?: HeroSpec;
    cards: CardSpec[];
    buttons: ButtonSpec[];
    inputs: InputSpec[];
    footer?: FooterSpec;
    modals?: ModalSpec;
    dropdowns?: DropdownSpec;
    tables?: TableSpec;
    lists?: ListSpec;
  };

  // LAYOUT - Grid and structure
  layout: {
    type: 'flex' | 'grid' | 'mixed';
    gridColumns: number;
    gridGutter: string;
    regions: LayoutRegion[];
    breakpoints: BreakpointConfig;
    zIndexScale: number[];
    containerWidth: string;
    contentWidth: string;
  };

  // ANIMATIONS - All motion
  animations: {
    hover: HoverAnimation[];
    scroll: ScrollAnimation[];
    entrance: EntranceAnimation[];
    transitions: TransitionSpec[];
    microInteractions: MicroInteraction[];
    pageTransitions: PageTransition[];
  };

  // RESPONSIVE - Breakpoint-specific overrides
  responsive: {
    mobile: Partial<CompleteDesignAnalysis>;
    tablet: Partial<CompleteDesignAnalysis>;
    desktop: Partial<CompleteDesignAnalysis>;
  };
}

// ============================================================================
// ANIMATION SEQUENCE TYPES
// ============================================================================

/**
 * Animation sequence for chained/sequential animations
 * Allows multiple animations to be played in order
 */
export interface AnimationSequence {
  id: string;
  name: string;
  description?: string;
  steps: AnimationStep[];
  trigger: 'load' | 'scroll' | 'hover' | 'click' | 'inView' | 'focus';
  triggerOffset?: number; // For scroll trigger, pixels from viewport
  loop?: boolean;
  loopDelay?: number; // Delay between loop iterations
  reverseOnComplete?: boolean;
}

/**
 * Single step in an animation sequence
 */
export interface AnimationStep {
  id: string;
  animationType: 'fade' | 'slide' | 'scale' | 'rotate' | 'color' | 'blur' | 'custom';
  element: string; // CSS selector or element description
  property?: string; // CSS property (for custom)
  fromValue?: string;
  toValue?: string;
  duration: number; // milliseconds
  delay: number; // ms after previous step completes
  overlap?: number; // ms to overlap with next (negative = gap)
  easing: string; // CSS easing function
  stagger?: {
    enabled: boolean;
    delay: number; // Delay between each child element
    from: 'start' | 'center' | 'end' | 'random';
  };
}

/**
 * Enhanced parallax configuration
 */
export interface ParallaxConfig {
  enabled: boolean;
  depth: number; // 0-1, how much element moves relative to scroll
  direction: 'vertical' | 'horizontal' | 'both';
  perspective?: number; // For 3D parallax effect (px)
  speed?: number; // Multiplier for scroll speed
  scale?: {
    start: number;
    end: number;
  };
  opacity?: {
    start: number;
    end: number;
  };
  rotation?: {
    axis: 'x' | 'y' | 'z';
    degrees: number;
  };
  offset?: {
    x: number;
    y: number;
  };
  smoothing?: number; // 0-1, how smooth the parallax effect is
  targetElement?: string; // CSS selector
}

/**
 * Scroll-triggered animation configuration
 */
export interface ScrollAnimationConfig {
  trigger: 'enter' | 'leave' | 'center' | 'custom';
  customTrigger?: number; // 0-1, viewport position
  scrub?: boolean | number; // Link animation to scroll position
  pin?: boolean; // Pin element during animation
  pinSpacing?: boolean;
  markers?: boolean; // Debug markers
  start?: string; // e.g., "top center"
  end?: string; // e.g., "bottom top"
}

// ============================================================================
// VIDEO ANALYSIS TYPES
// ============================================================================

/**
 * Extracted video frame
 */
export interface ExtractedFrame {
  index: number;
  timestamp: number; // in seconds
  imageDataUrl: string;
  isKeyFrame: boolean;
}

/**
 * Detected animation from video
 */
export interface DetectedAnimation {
  id: string;
  type:
    | 'fade'
    | 'slide'
    | 'scale'
    | 'rotate'
    | 'color-change'
    | 'blur'
    | 'parallax'
    | 'hover-effect'
    | 'scroll-reveal'
    | 'page-transition'
    | 'loading'
    | 'micro-interaction'
    | 'custom'
    // Background animation types (DALL-E compatible)
    | 'gradient-shift'
    | 'particle-flow'
    | 'wave'
    | 'morph'
    | 'aurora'
    | 'noise-texture';
  element: string; // Description of animated element
  property: string; // CSS property being animated
  fromValue: string;
  toValue: string;
  duration: number | string; // in milliseconds or CSS string (e.g., '0.3s')
  easing: string;
  delay?: number | string;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  cssKeyframes?: string;
  cssAnimation?: string;
  tailwindConfig?: Record<string, unknown>;
  framerMotionVariants?: Record<string, unknown>;
  confidence: number;
  matchedPreset?: string;
  presetConfidence?: number;
  // NEW: Element targeting for animation binding
  targetElement?: string; // CSS selector or element ID to apply animation to
  // NEW: DALL-E generated background support
  generatedImageUrl?: string; // URL of AI-generated background image
  generatedPrompt?: string; // Prompt used to generate the image
  // Animation sequence support (for chained animations)
  sequence?: AnimationSequence;
  // Enhanced parallax configuration
  parallaxConfig?: ParallaxConfig;
  // Scroll-triggered animation settings
  scrollConfig?: ScrollAnimationConfig;
}

/**
 * Detected page/section transition
 */
export interface DetectedTransition {
  id: string;
  type: 'page' | 'section' | 'modal' | 'drawer' | 'dropdown' | 'fade' | 'component' | 'state';
  animation?: string;
  duration: number | string;
  easing: string;
  css?: string;
  framerMotion?: Record<string, unknown>;
  fromState?: string;
  toState?: string;
  affectedElements?: string[];
}

/**
 * Video analysis result
 */
/**
 * Frame summary (without image data, for API responses)
 */
export interface FrameSummary {
  index: number;
  timestamp: number;
  isKeyFrame?: boolean;
}

export interface VideoAnalysisResult {
  id?: string;
  duration?: number; // in seconds
  fps?: number;
  width?: number;
  height?: number;
  frames: FrameSummary[] | ExtractedFrame[];
  keyFrames?: ExtractedFrame[];
  animations: DetectedAnimation[];
  transitions: DetectedTransition[];
  designAnalysis?: CompleteDesignAnalysis; // From first key frame
  designSummary?: {
    dominantColors: string[];
    detectedFonts: string[];
    layoutType: string;
    components: string[];
  };
  metadata?: {
    duration: number;
    frameCount: number;
    keyFrameCount: number;
    analysisMode: string;
  };
}

// ============================================================================
// ANALYSIS PROGRESS TYPES
// ============================================================================

/**
 * Analysis phase status
 */
export type AnalysisPhaseStatus = 'pending' | 'active' | 'complete' | 'error';

/**
 * Sub-phase of analysis
 */
export interface AnalysisSubPhase {
  id: string;
  label: string;
  status: AnalysisPhaseStatus;
  progress: number; // 0-100
}

/**
 * Main analysis phase
 */
export interface AnalysisPhase {
  id: string;
  label: string;
  status: AnalysisPhaseStatus;
  progress: number; // 0-100
  duration?: string; // e.g., "2-3s"
  subPhases?: AnalysisSubPhase[];
  error?: string;
}

/**
 * Overall analysis progress
 */
export interface AnalysisProgress {
  phases: AnalysisPhase[];
  currentPhaseId: string | null;
  overallProgress: number; // 0-100
  startedAt: string;
  estimatedCompletion?: string;
}

// ============================================================================
// ENHANCED API TYPES
// ============================================================================

/**
 * Analysis mode for layout chat
 */
export type AnalysisMode = 'standard' | 'pixel-perfect' | 'video-replication';

/**
 * Enhanced layout chat request with analysis modes
 */
export interface EnhancedLayoutChatRequest extends LayoutChatRequest {
  analysisMode?: AnalysisMode;
  requestedAnalysis?: 'quick' | 'deep' | 'full';
  videoAnalysis?: VideoAnalysisResult;
  extractedSpecs?: CompleteDesignAnalysis;
}

/**
 * Quick analysis result (fast pass)
 */
export interface QuickAnalysis {
  dominantColors: ColorSwatch[];
  layoutType: string;
  primaryFont: string;
  overallStyle: string;
  confidence: number;
}

/**
 * Deep analysis result (full pass)
 */
export interface DeepAnalysis extends CompleteDesignAnalysis {
  quickAnalysis: QuickAnalysis;
}

/**
 * Spec sheet export formats
 */
export interface SpecSheetExport {
  json: string;
  css: string;
  tailwindConfig: string;
  figmaTokens: string;
}

// ============================================================================
// AI ENHANCEMENT TYPES (Proactive Analysis, Critique, Workflows, Variants)
// ============================================================================

/**
 * Severity level for design issues
 */
export type IssueSeverity = 'info' | 'warning' | 'critical';

/**
 * Individual design issue detected by analysis
 */
export interface DesignIssue {
  id: string;
  severity: IssueSeverity;
  area: string;
  message: string;
  suggestedFix?: string;
  affectedProperty?: string;
  suggestedValue?: unknown;
}

/**
 * Score breakdown by design principle
 */
export interface ScoreBreakdown {
  contrast: number;
  spacing: number;
  hierarchy: number;
  consistency: number;
  accessibility: number;
}

/**
 * Proactive design analysis result
 */
export interface ProactiveAnalysis {
  designScore: number;
  grade?: string; // Letter grade (A, B, C, D, F)
  scoreBreakdown: ScoreBreakdown;
  autoDetectedIssues: DesignIssue[];
  opportunities: string[];
}

/**
 * Analysis depth level
 */
export type AnalysisDepth = 'quick' | 'standard' | 'thorough';

/**
 * Areas that can be analyzed
 */
export type DesignAnalysisArea =
  | 'contrast'
  | 'spacing'
  | 'hierarchy'
  | 'consistency'
  | 'accessibility'
  | 'color'
  | 'typography';

/**
 * Design critique principle score
 */
export interface PrincipleScore {
  score: number;
  issues: string[];
  fixes: string[];
}

/**
 * Full design critique result
 */
export interface DesignCritique {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  principleScores: {
    visualHierarchy: PrincipleScore;
    consistency: PrincipleScore;
    contrast: PrincipleScore;
    whitespace: PrincipleScore;
    colorHarmony: PrincipleScore;
    alignment: PrincipleScore;
    typography: PrincipleScore;
    accessibility: PrincipleScore;
  };
  priorityFixes: Array<{
    severity: 'critical' | 'major' | 'minor';
    principle: string;
    issue: string;
    currentValue: string;
    suggestedValue: string;
    propertyPath: string;
    rationale: string;
  }>;
  strengths: string[];
  quickFixActions: Array<{
    label: string;
    fixes: Array<{ property: string; value: unknown }>;
  }>;
}

/**
 * Design variant for A/B comparison
 */
export interface DesignVariant {
  id: string;
  name: string;
  description: string;
  changes: Partial<LayoutDesign>;
  tradeOffs: {
    pros: string[];
    cons: string[];
  };
  bestFor: string[];
  previewDescription: string;
}

/**
 * Design variants comparison result
 */
export interface DesignVariants {
  baseDesign: Partial<LayoutDesign>;
  variants: DesignVariant[];
  comparisonNotes: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  focusElements: string[];
  suggestedActions: string[];
  completionCriteria: string[];
  tips: string[];
}

/**
 * Workflow template definition
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  estimatedTime: string;
  steps: WorkflowStep[];
}

/**
 * Active workflow state
 */
export interface WorkflowState {
  workflowId: string;
  workflowType: string;
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepNotes: Record<string, string>;
  startedAt: string;
  designSnapshotAtStart: Partial<LayoutDesign>;
}

/**
 * Design system token definition
 */
export interface TokenDefinition {
  value: string | number;
  type: string;
  description?: string;
  category?: string;
}

/**
 * Component specification for design system
 */
export interface ComponentSpec {
  name: string;
  variants: string[];
  defaultProps: Record<string, unknown>;
  tokenUsage: string[];
}

/**
 * Generated design system
 */
export interface GeneratedDesignSystem {
  metadata: {
    name: string;
    version: string;
    generatedAt: string;
    sourceDesignId: string;
  };
  tokens: {
    colors: Record<string, TokenDefinition>;
    typography: Record<string, TokenDefinition>;
    spacing: Record<string, TokenDefinition>;
    borderRadius: Record<string, TokenDefinition>;
    shadows: Record<string, TokenDefinition>;
    animations: Record<string, TokenDefinition>;
  };
  components: Record<string, ComponentSpec>;
  exports: {
    styleDictionary?: string;
    figmaTokens?: string;
    tailwindConfig?: string;
    cssVariables?: string;
    scssVariables?: string;
  };
  documentation?: {
    colorUsage: string;
    typographyScale: string;
    spacingSystem: string;
    componentGuidelines: string;
  };
}

/**
 * Competitor website analysis result
 */
export interface CompetitorAnalysis {
  url: string;
  capturedAt: string;
  screenshotBase64?: string;
  extractedDesign: {
    colors: {
      primary: string;
      secondary?: string;
      accent?: string;
      background: string;
      text: string;
      palette: string[];
    };
    typography: {
      headingFont: string;
      bodyFont: string;
      fontScale: string[];
    };
    spacing: {
      density: 'compact' | 'normal' | 'relaxed';
      containerWidth: string;
    };
    effects: {
      borderRadius: string;
      shadows: string;
      animations: string[];
    };
    patterns: string[];
  };
  comparison?: {
    similarities: string[];
    differences: string[];
    theyDoWell: string[];
    youDoWell: string[];
    suggestions: string[];
  };
}

// ============================================================================
// DEFAULT ANALYSIS VALUES
// ============================================================================

export const defaultAnalysisPhases: AnalysisPhase[] = [
  {
    id: 'upload',
    label: 'Uploading',
    status: 'pending',
    progress: 0,
    subPhases: [
      { id: 'validate', label: 'Validating file', status: 'pending', progress: 0 },
      { id: 'compress', label: 'Optimizing', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'quick',
    label: 'Quick Analysis',
    status: 'pending',
    progress: 0,
    duration: '2-3s',
    subPhases: [
      { id: 'colors', label: 'Extracting colors', status: 'pending', progress: 0 },
      { id: 'layout', label: 'Detecting layout', status: 'pending', progress: 0 },
      { id: 'fonts', label: 'Identifying fonts', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'deep',
    label: 'Deep Analysis',
    status: 'pending',
    progress: 0,
    duration: '10-15s',
    subPhases: [
      { id: 'typography', label: 'Measuring typography', status: 'pending', progress: 0 },
      { id: 'spacing', label: 'Calculating spacing', status: 'pending', progress: 0 },
      { id: 'effects', label: 'Analyzing effects', status: 'pending', progress: 0 },
      { id: 'components', label: 'Mapping components', status: 'pending', progress: 0 },
      { id: 'animations', label: 'Detecting animations', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'generate',
    label: 'Generating Layout',
    status: 'pending',
    progress: 0,
  },
  {
    id: 'render',
    label: 'Rendering Preview',
    status: 'pending',
    progress: 0,
  },
];
