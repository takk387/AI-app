/**
 * Layout Design - Analysis, Spec, Animation, Video & AI Enhancement Types
 *
 * Complete design analysis (pixel-perfect), component specs, animation sequences,
 * video analysis, progress tracking, and AI enhancement types.
 *
 * Depends on: helpers.ts (ResponsiveValue)
 */

import type { ResponsiveValue } from './helpers';

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

// ============================================================================
// Animation Spec Types
// ============================================================================

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

// ============================================================================
// Component Spec Types (for CompleteDesignAnalysis)
// ============================================================================

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

// ============================================================================
// Complete Design Analysis
// ============================================================================

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
  // Element targeting for animation binding
  targetElement?: string; // CSS selector or element ID to apply animation to
  // DALL-E generated background support
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
 * Frame summary (without image data, for API responses)
 */
export interface FrameSummary {
  index: number;
  timestamp: number;
  isKeyFrame?: boolean;
}

/**
 * Video analysis result
 */
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
  changes: Partial<import('./core').LayoutDesign>;
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
  baseDesign: Partial<import('./core').LayoutDesign>;
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
  designSnapshotAtStart: Partial<import('./core').LayoutDesign>;
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
