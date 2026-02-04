/**
 * Layout Design - Effects, Interactions & Animation Types
 *
 * Advanced visual effects, background animations, component state interactions,
 * and animation reference types.
 *
 * Depends on: helpers.ts (CustomizableValue)
 */

import type { CustomizableValue } from './helpers';

// ============================================================================
// Advanced Effects Types (AI-Controllable)
// ============================================================================

export interface AdvancedEffectsConfig {
  glassmorphism?: GlassmorphismConfig;
  neumorphism?: NeumorphismConfig;
  gradientBorder?: GradientBorderConfig;
  textEffect?: TextEffectConfig;
  customShadow?: CustomShadowConfig;
  meshGradient?: MeshGradientConfig; // For high-fidelity background detection
}

export interface MeshGradientConfig {
  enabled: boolean;
  colors: string[];
  speed?: number;
  opacity?: number;
  blur?: number; // px
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

// ============================================================================
// Component State Types (AI-Controllable)
// ============================================================================

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

// ============================================================================
// Element Interactions
// ============================================================================

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

// ============================================================================
// Animation References
// ============================================================================

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

// ============================================================================
// Effects Settings (used by GlobalStyles)
// ============================================================================

export interface EffectsSettings {
  borderRadius:
    | CustomizableValue<'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'>
    | 'none'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | 'full';
  shadows:
    | CustomizableValue<'none' | 'subtle' | 'medium' | 'strong'>
    | 'none'
    | 'subtle'
    | 'medium'
    | 'strong';
  animations: 'none' | 'subtle' | 'smooth' | 'playful';
  blur:
    | CustomizableValue<'none' | 'subtle' | 'medium' | 'strong'>
    | 'none'
    | 'subtle'
    | 'medium'
    | 'strong';
  gradients: boolean;
  // Advanced Effects (AI-controllable)
  advancedEffects?: AdvancedEffectsConfig;
  // Background animations (particles, floating shapes, etc.) or custom AI-generated images
  backgroundEffect?: AnyBackgroundEffectConfig;
}
