/**
 * Motion Configuration Types
 *
 * Defines motion/animation data extracted from video analysis (Gap 2).
 * These types bridge the gap between VideoMotionAnalysis (raw AI output)
 * and the component-level animation properties the renderer consumes.
 */

/** Raw video motion analysis output from Gemini */
export interface VideoMotionAnalysis {
  keyframes: {
    start: number; // 0-1 percentage
    end: number;
  };
  transitions: VideoTransition[];
  hoverEffects: boolean;
  scrollEffects: boolean;
}

/** A single transition detected between video keyframes */
export interface VideoTransition {
  type: 'fade' | 'slide' | 'scale' | 'none';
  duration: number; // ms
  ease: string;
}

/**
 * Enhanced video analysis that maps motion to component types.
 * Returned by EnhancedVideoAnalyzer (wraps base VideoMotionAnalysis).
 */
export interface EnhancedVideoMotionAnalysis extends VideoMotionAnalysis {
  /** Per-component-type motion assignments */
  componentMotions: ComponentMotionAssignment[];
  /** Global page transition (if detected) */
  pageTransition?: {
    type: 'fade' | 'slide' | 'scale' | 'flip' | 'morph';
    duration: number;
    easing: string;
  };
  /** Background effects detected in video */
  backgroundEffects?: {
    type: 'particles' | 'gradient-shift' | 'aurora' | 'waves' | 'custom';
    description: string;
  }[];
}

/** Maps a component type to its detected motion behavior */
export interface ComponentMotionAssignment {
  /** Component type this motion applies to (e.g., 'header', 'hero', 'cards') */
  componentType: string;
  /** The motion config to apply */
  motion: ComponentMotionConfig;
}

/** Motion configuration applied to a single component */
export interface ComponentMotionConfig {
  /** Entrance animation when component first appears */
  entrance?: {
    type: 'fade' | 'slide' | 'scale' | 'rotate' | 'none';
    direction?: 'up' | 'down' | 'left' | 'right';
    duration: number; // ms
    delay?: number; // ms
    easing: string;
  };
  /** Exit animation when component leaves */
  exit?: {
    type: 'fade' | 'slide' | 'scale' | 'none';
    direction?: 'up' | 'down' | 'left' | 'right';
    duration: number;
    easing: string;
  };
  /** Scroll-triggered animation */
  scroll?: {
    trigger: 'enter' | 'exit' | 'progress';
    animation: string; // CSS animation name
    threshold?: number; // 0-1, viewport intersection ratio
    offset?: number; // px offset from trigger point
  };
  /** Hover-triggered motion (beyond simple CSS hover states) */
  hoverMotion?: {
    scale?: number;
    rotate?: number;
    translateY?: number;
    duration?: number;
  };
  /** Continuous/looping animation */
  loop?: {
    type: 'float' | 'pulse' | 'rotate' | 'bounce' | 'custom';
    duration: number; // ms
    keyframes?: Record<string, Record<string, string>>;
  };
  /** Transition configuration between states */
  transition?: {
    type: 'fade' | 'slide' | 'scale' | 'flip' | 'morph';
    duration: number;
    easing: string;
  };
}
