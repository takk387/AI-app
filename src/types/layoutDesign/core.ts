/**
 * Layout Design - Core Types, Pages, Messages, API & Defaults
 *
 * The main LayoutDesign interface, page/multi-page types, conversation/message types,
 * API request/response types, and all default value constants.
 *
 * Depends on: helpers.ts, styles.ts, effects.ts, component.ts, detected.ts, analysis.ts
 */

import { NEUTRAL_PALETTE } from '@/constants/themeDefaults';

import type { CustomBreakpoints } from './helpers';
import type { GlobalStyles } from './styles';
import type {
  HeaderDesign,
  SidebarDesign,
  HeroDesign,
  NavigationDesign,
  CardDesign,
  ListDesign,
  StatsDesign,
  FooterDesign,
  ExtendedLayoutComponents,
  GridConfig,
} from './component';
import type {
  DetectedComponentEnhanced,
  LayoutStructure,
  ResponsiveSettings,
  SelectedElementInfo,
  LayoutNode,
} from './detected';
import type {
  CompleteDesignAnalysis,
  QuickAnalysis,
  DetectedAnimation,
  AnalysisPhase,
  VideoAnalysisResult,
} from './analysis';

// VisualAnalysis was from deleted GeminiLayoutService
// Using a generic record type for backward compatibility
type VisualAnalysis = Record<string, unknown>;

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
// Design Version
// ============================================================================

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
// Extended Layout Design
// ============================================================================

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

/**
 * Enhanced layout chat request with analysis modes
 */
export interface EnhancedLayoutChatRequest extends LayoutChatRequest {
  analysisMode?: 'standard' | 'pixel-perfect' | 'video-replication';
  requestedAnalysis?: 'quick' | 'deep' | 'full';
  videoAnalysis?: VideoAnalysisResult;
  extractedSpecs?: CompleteDesignAnalysis;
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
    primary: NEUTRAL_PALETTE.gray500, // Neutral gray - AI will generate actual colors
    secondary: NEUTRAL_PALETTE.gray400,
    accent: NEUTRAL_PALETTE.gray500,
    background: NEUTRAL_PALETTE.gray50, // Light neutral background
    surface: NEUTRAL_PALETTE.white,
    text: NEUTRAL_PALETTE.gray700,
    textMuted: NEUTRAL_PALETTE.gray500,
    border: NEUTRAL_PALETTE.gray200,
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
