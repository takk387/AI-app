/**
 * Layout Design Types - Barrel Re-export
 *
 * All types from the layoutDesign module are re-exported here for
 * zero-breaking-change compatibility. Consumers continue to import
 * from '@/types/layoutDesign' as before.
 *
 * Internal structure:
 *   helpers.ts   - CustomizableValue, responsive wrappers, breakpoints
 *   effects.ts   - Advanced effects, background animations, interactions
 *   styles.ts    - Typography, color, spacing, GlobalStyles
 *   component.ts - Component design interfaces, grid, extended components
 *   detected.ts  - DetectedComponentEnhanced, VisualEffect, layout nodes
 *   analysis.ts  - CompleteDesignAnalysis, specs, video, progress, AI types
 *   core.ts      - LayoutDesign, pages, multi-page, messages, API, defaults
 */

// helpers.ts
export type {
  CustomizableValue,
  ResponsiveOverrides,
  ResponsiveComponent,
  CustomBreakpoints,
  BreakpointVisibility,
  ResponsiveValue,
} from './helpers';
export { getCustomizableValue, getPresetKey } from './helpers';

// effects.ts
export type {
  AdvancedEffectsConfig,
  MeshGradientConfig,
  GlassmorphismConfig,
  NeumorphismConfig,
  GradientBorderConfig,
  TextEffectConfig,
  CustomShadowConfig,
  BackgroundEffectType,
  BackgroundEffectConfig,
  ParticlesConfig,
  FloatingShapesConfig,
  GradientAnimationConfig,
  AuroraConfig,
  WavesConfig,
  CustomImageConfig,
  AnyBackgroundEffectConfig,
  ComponentStateType,
  AppliedComponentState,
  MicroInteractionTrigger,
  AppliedMicroInteraction,
  ElementInteractions,
  AnimationRef,
  CustomAnimation,
  EffectsSettings,
} from './effects';

// styles.ts
export type { TypographySettings, ColorSettings, SpacingSettings, GlobalStyles } from './styles';

// component.ts
export type {
  HeaderDesign,
  SidebarDesign,
  HeroDesign,
  NavigationDesign,
  CardDesign,
  ListDesign,
  FooterDesign,
  StatsDesign,
  FormDesign,
  TableDesign,
  TabsDesign,
  ModalDesign,
  AlertDesign,
  AccordionDesign,
  CarouselDesign,
  StepperDesign,
  TimelineDesign,
  PaginationDesign,
  BreadcrumbDesign,
  GridConfig,
  ExtendedLayoutComponents,
} from './component';

// detected.ts
export type {
  VisualEffect,
  LayoutStructure,
  ResponsiveSettings,
  DetectedComponentEnhanced,
  LayoutComponentType,
  ElementType,
  ElementBounds,
  SelectedElementInfo,
  LayoutNodeType,
  LayoutAlignment,
  LayoutNode,
} from './detected';

// analysis.ts
export type {
  ColorSwatch,
  GradientDefinition,
  OverlaySpec,
  FontSpec,
  TypeScale,
  ShadowSpec,
  RadiusSpec,
  HoverAnimation,
  ScrollAnimation,
  EntranceAnimation,
  TransitionSpec,
  MicroInteraction,
  PageTransition,
  ButtonSpec,
  InputSpec,
  CardSpec,
  HeaderSpec,
  NavSpec,
  HeroSpec,
  FooterSpec,
  ModalSpec,
  DropdownSpec,
  TableSpec,
  ListSpec,
  LayoutRegion,
  BreakpointConfig,
  CompleteDesignAnalysis,
  AnimationSequence,
  AnimationStep,
  ParallaxConfig,
  ScrollAnimationConfig,
  ExtractedFrame,
  DetectedAnimation,
  DetectedTransition,
  FrameSummary,
  VideoAnalysisResult,
  AnalysisPhaseStatus,
  AnalysisSubPhase,
  AnalysisPhase,
  AnalysisProgress,
  AnalysisMode,
  QuickAnalysis,
  DeepAnalysis,
  SpecSheetExport,
  IssueSeverity,
  DesignIssue,
  ScoreBreakdown,
  ProactiveAnalysis,
  AnalysisDepth,
  DesignAnalysisArea,
  PrincipleScore,
  DesignCritique,
  DesignVariant,
  DesignVariants,
  WorkflowStep,
  WorkflowTemplate,
  WorkflowState,
  TokenDefinition,
  ComponentSpec,
  GeneratedDesignSystem,
  CompetitorAnalysis,
} from './analysis';

// core.ts
export type {
  ReferenceMedia,
  PageRole,
  PageAnalysis,
  NavigationItem,
  DetectedNavigation,
  InferredRoute,
  PageReference,
  VideoPageTransition,
  MultiPageDesign,
  MultiPageAnalysisResult,
  ConversationContext,
  DesignContext,
  MessageErrorType,
  MessageError,
  LayoutMessage,
  DesignVersion,
  LayoutDesign,
  ExtendedResponsiveSettings,
  ExtendedLayoutDesign,
  LayoutWorkflowState,
  DeviceView,
  LayoutChatRequest,
  DesignChange,
  SuggestedAction,
  LayoutChatResponse,
  EnhancedLayoutChatRequest,
} from './core';
export {
  defaultGlobalStyles,
  defaultStructure,
  defaultResponsive,
  defaultLayoutDesign,
  emptyLayoutDesign,
  createLayoutDesign,
  updateLayoutDesign,
  defaultAnalysisPhases,
} from './core';
