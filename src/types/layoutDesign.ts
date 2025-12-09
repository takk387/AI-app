/**
 * Layout Design Types
 * Complete design specification for the Layout Builder feature
 */

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
  selectedElement?: string; // Element that was selected when message was sent
  previewSnapshot?: string; // Screenshot of preview when message was sent
  error?: MessageError; // Error information for retry functionality
  isRetrying?: boolean; // Indicates message is being retried
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
  header?: HeaderDesign;
  sidebar?: SidebarDesign;
  hero?: HeroDesign;
  navigation?: NavigationDesign;
  cards?: CardDesign & { gridConfig?: GridConfig };
  lists?: ListDesign;
  stats?: StatsDesign;
  footer?: FooterDesign;
  forms?: FormDesign;
  tables?: TableDesign;
  tabs?: TabsDesign;
  modals?: ModalDesign;
  alerts?: AlertDesign;
  accordions?: AccordionDesign;
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

export interface LayoutChatRequest {
  message: string;
  conversationHistory: LayoutMessage[];
  currentDesign: Partial<LayoutDesign>;
  selectedElement?: string;
  previewScreenshot?: string;
  referenceImages?: string[];
  /** Analysis mode: standard, pixel-perfect replication, or video-replication */
  analysisMode?: 'standard' | 'pixel-perfect' | 'video-replication';
  /** Type of analysis to perform */
  requestedAnalysis?: 'quick' | 'deep' | 'full';
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
}

// ============================================================================
// Default Values
// ============================================================================

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
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#F59E0B',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#334155',
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
    colorScheme: 'dark',
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
    | 'custom';
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
