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
