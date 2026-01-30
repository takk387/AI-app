/**
 * Motion Mapper
 *
 * Maps VideoMotionAnalysis output to component-level CSS animations and effects.
 * Bridges the gap between Gemini's video analysis and the renderer pipeline.
 *
 * Pure functions — no side effects, no state.
 *
 * Flow:
 *   EnhancedVideoMotionAnalysis → mapMotionToComponents() → components with motionConfig
 *   motionConfig.entrance → entranceToCSSAnimation() → CSS animation string + @keyframes
 *   VideoMotionAnalysis → motionToVisualEffects() → VisualEffect[]
 */

import type { DetectedComponentEnhanced, VisualEffect } from '@/types/layoutDesign';
import type {
  VideoMotionAnalysis,
  EnhancedVideoMotionAnalysis,
  ComponentMotionConfig,
} from '@/types/motionConfig';

// ============================================================================
// MAIN MAPPING
// ============================================================================

/**
 * Apply motion assignments from video analysis to existing components.
 * Matches by component type (e.g., 'header', 'hero', 'cards').
 */
export function mapMotionToComponents(
  analysis: EnhancedVideoMotionAnalysis,
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  if (!analysis.componentMotions || analysis.componentMotions.length === 0) {
    return components;
  }

  // Build a lookup: componentType → motion config
  const motionByType = new Map<string, ComponentMotionConfig>();
  for (const assignment of analysis.componentMotions) {
    motionByType.set(assignment.componentType.toLowerCase(), assignment.motion);
  }

  return components.map((comp) => {
    const motion = motionByType.get(comp.type.toLowerCase());
    if (!motion) return comp;

    // Merge motion config into component
    const updatedComp = { ...comp, motionConfig: motion };

    // Also generate CSS animation properties from entrance config
    if (motion.entrance && motion.entrance.type !== 'none') {
      const cssAnim = entranceToCSSAnimation(motion.entrance);
      updatedComp.style = {
        ...updatedComp.style,
        animation: cssAnim.animation,
        animationKeyframes: cssAnim.animationKeyframes,
      };
    }

    // Generate continuous animation from loop config
    // Loop keyframes are injected by KeyframeInjector via motionConfig (Source 2),
    // so we only need to add the animation string here, not the keyframes.
    if (motion.loop) {
      const loopAnim = loopToCSSAnimation(motion.loop, comp.id);
      updatedComp.style = {
        ...updatedComp.style,
        animation: updatedComp.style.animation
          ? `${updatedComp.style.animation}, ${loopAnim.animation}`
          : loopAnim.animation,
      };
    }

    return updatedComp;
  });
}

/**
 * Apply basic motion from non-enhanced VideoMotionAnalysis.
 * Uses global transitions to apply entrance animations to all components.
 */
export function applyBasicMotion(
  analysis: VideoMotionAnalysis,
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  if (!analysis.transitions || analysis.transitions.length === 0) {
    return components;
  }

  // Use the first/primary transition as the entrance animation for all components
  const primaryTransition = analysis.transitions[0];

  return components.map((comp, index) => {
    const entrance: ComponentMotionConfig['entrance'] = {
      type: primaryTransition.type === 'none' ? 'fade' : primaryTransition.type,
      duration: primaryTransition.duration || 500,
      delay: index * 100, // Stagger by 100ms per component
      easing: primaryTransition.ease || 'ease-out',
    };

    if (primaryTransition.type === 'slide') {
      entrance.direction = 'up';
    }

    const motionConfig: ComponentMotionConfig = { entrance };

    // Add hover motion if detected
    if (analysis.hoverEffects) {
      motionConfig.hoverMotion = {
        scale: 1.02,
        translateY: -2,
        duration: 200,
      };
    }

    const cssAnim = entranceToCSSAnimation(entrance);

    return {
      ...comp,
      motionConfig,
      style: {
        ...comp.style,
        animation: cssAnim.animation,
        animationKeyframes: cssAnim.animationKeyframes,
      },
    };
  });
}

// ============================================================================
// CSS ANIMATION GENERATORS
// ============================================================================

/**
 * Convert an entrance animation config to CSS animation string + @keyframes.
 */
export function entranceToCSSAnimation(entrance: NonNullable<ComponentMotionConfig['entrance']>): {
  animation: string;
  animationKeyframes: Record<string, Record<string, string>>;
} {
  const name = `entrance-${entrance.type}-${entrance.direction || 'default'}`;
  const duration = entrance.duration || 500;
  const delay = entrance.delay || 0;
  const easing = entrance.easing || 'ease-out';

  let keyframes: Record<string, Record<string, string>>;

  switch (entrance.type) {
    case 'fade':
      keyframes = {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      };
      break;

    case 'slide': {
      const translateMap: Record<string, string> = {
        up: 'translateY(30px)',
        down: 'translateY(-30px)',
        left: 'translateX(30px)',
        right: 'translateX(-30px)',
      };
      const startTransform = translateMap[entrance.direction || 'up'];
      keyframes = {
        '0%': { opacity: '0', transform: startTransform },
        '100%': { opacity: '1', transform: 'translate(0)' },
      };
      break;
    }

    case 'scale':
      keyframes = {
        '0%': { opacity: '0', transform: 'scale(0.8)' },
        '100%': { opacity: '1', transform: 'scale(1)' },
      };
      break;

    case 'rotate':
      keyframes = {
        '0%': { opacity: '0', transform: 'rotate(-10deg) scale(0.9)' },
        '100%': { opacity: '1', transform: 'rotate(0deg) scale(1)' },
      };
      break;

    default:
      keyframes = {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      };
  }

  return {
    animation: `${name} ${duration}ms ${easing} ${delay}ms both`,
    animationKeyframes: keyframes,
  };
}

/**
 * Convert a loop animation config to CSS animation string + @keyframes.
 */
export function loopToCSSAnimation(
  loop: NonNullable<ComponentMotionConfig['loop']>,
  componentId: string
): { animation: string; animationKeyframes: Record<string, Record<string, string>> } {
  const name = `loop-${loop.type}-${componentId}`;
  const duration = loop.duration || 3000;

  let keyframes: Record<string, Record<string, string>>;

  switch (loop.type) {
    case 'float':
      keyframes = {
        '0%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-8px)' },
        '100%': { transform: 'translateY(0px)' },
      };
      break;

    case 'pulse':
      keyframes = {
        '0%': { opacity: '1' },
        '50%': { opacity: '0.7' },
        '100%': { opacity: '1' },
      };
      break;

    case 'rotate':
      keyframes = {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
      };
      break;

    case 'bounce':
      keyframes = {
        '0%': { transform: 'translateY(0)' },
        '25%': { transform: 'translateY(-6px)' },
        '50%': { transform: 'translateY(0)' },
        '75%': { transform: 'translateY(-3px)' },
        '100%': { transform: 'translateY(0)' },
      };
      break;

    case 'custom':
      keyframes = loop.keyframes ?? {
        '0%': { opacity: '1' },
        '100%': { opacity: '1' },
      };
      break;

    default:
      keyframes = {
        '0%': { opacity: '1' },
        '100%': { opacity: '1' },
      };
  }

  return {
    animation: `${name} ${duration}ms ease-in-out infinite`,
    animationKeyframes: keyframes,
  };
}

// ============================================================================
// VISUAL EFFECTS EXTRACTION
// ============================================================================

/**
 * Extract VisualEffect[] from video motion analysis for background effects.
 * Maps video-detected background effects to the VisualEffect interface shape.
 */
export function motionToVisualEffects(analysis: EnhancedVideoMotionAnalysis): VisualEffect[] {
  const effects: VisualEffect[] = [];

  if (analysis.backgroundEffects) {
    for (const bg of analysis.backgroundEffects) {
      switch (bg.type) {
        case 'particles':
          effects.push({
            description: bg.description || 'Particle effect from video',
            type: 'particle-system',
            trigger: 'always',
            particleConfig: {
              count: 50,
              shape: 'circle',
              colors: ['#ffffff', '#e0e0e0'],
              direction: 'up',
              speed: 'medium',
              size: { min: 1, max: 4 },
              opacity: { start: 0.8, end: 0 },
            },
          });
          break;

        case 'gradient-shift':
          effects.push({
            description: bg.description || 'Animated gradient shift from video',
            type: 'css-animation',
            trigger: 'always',
            cssKeyframes: {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' },
            },
          });
          break;

        case 'aurora':
          effects.push({
            description: bg.description || 'Aurora background effect from video',
            type: 'css-animation',
            trigger: 'always',
            cssKeyframes: {
              '0%': { filter: 'hue-rotate(0deg)', opacity: '0.7' },
              '50%': { filter: 'hue-rotate(60deg)', opacity: '1' },
              '100%': { filter: 'hue-rotate(0deg)', opacity: '0.7' },
            },
          });
          break;

        case 'waves':
          effects.push({
            description: bg.description || 'Wave animation from video',
            type: 'css-animation',
            trigger: 'always',
            cssKeyframes: {
              '0%': { transform: 'translateX(0) scaleY(1)' },
              '50%': { transform: 'translateX(-25%) scaleY(0.9)' },
              '100%': { transform: 'translateX(0) scaleY(1)' },
            },
          });
          break;

        default:
          effects.push({
            description: bg.description || 'Background effect from video',
            type: 'css-animation',
            trigger: 'always',
            cssKeyframes: {
              '0%': { opacity: '0.8' },
              '50%': { opacity: '1' },
              '100%': { opacity: '0.8' },
            },
          });
      }
    }
  }

  return effects;
}
