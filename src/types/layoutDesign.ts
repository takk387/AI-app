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
  bodyWeight: 'light' | 'normal' | 'medium';
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
