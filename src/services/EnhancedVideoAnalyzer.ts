/**
 * Enhanced Video Analyzer
 *
 * Wraps the base video analysis flow with a richer prompt that requests
 * per-component-type motion assignments. Returns EnhancedVideoMotionAnalysis
 * which the MotionMapper can then apply to detected components.
 *
 * Flow:
 *   Video frames (base64[]) → enhanced Gemini prompt → EnhancedVideoMotionAnalysis
 *   → MotionMapper.mapMotionToComponents() → components with motionConfig
 */

import type {
  EnhancedVideoMotionAnalysis,
  VideoMotionAnalysis,
  ComponentMotionAssignment,
} from '@/types/motionConfig';

// ============================================================================
// ANALYSIS
// ============================================================================

/**
 * Analyze video frames with an enhanced prompt that extracts per-component
 * motion assignments, page transitions, and background effects.
 *
 * Sends frames to the layout analyze API with the 'analyze-video-enhanced' action.
 * Falls back to wrapping basic VideoMotionAnalysis if the enhanced endpoint
 * isn't available.
 */
export async function analyzeVideoEnhanced(
  frames: string[],
  existingComponentTypes?: string[],
  instructions?: string
): Promise<EnhancedVideoMotionAnalysis> {
  try {
    const response = await fetch('/api/layout/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze-video-enhanced',
        images: frames,
        instructions,
        componentTypes: existingComponentTypes,
      }),
    });

    if (!response.ok) {
      // Fallback: try basic video flow and enhance client-side
      console.warn('[EnhancedVideoAnalyzer] Enhanced endpoint not available, using fallback');
      return await fallbackAnalysis(frames, instructions);
    }

    const result = await response.json();
    return normalizeEnhancedResult(result);
  } catch (error) {
    console.error('[EnhancedVideoAnalyzer] Analysis failed, using fallback:', error);
    return await fallbackAnalysis(frames, instructions);
  }
}

// ============================================================================
// FALLBACK
// ============================================================================

/**
 * Fallback: use basic video flow and infer per-component motion from global data.
 */
async function fallbackAnalysis(
  frames: string[],
  instructions?: string
): Promise<EnhancedVideoMotionAnalysis> {
  try {
    const response = await fetch('/api/layout/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze-video-flow',
        images: frames,
        instructions,
      }),
    });

    if (!response.ok) {
      return createEmptyAnalysis();
    }

    const basicResult: VideoMotionAnalysis = await response.json();
    return enhanceBasicResult(basicResult);
  } catch {
    return createEmptyAnalysis();
  }
}

/**
 * Enhance a basic VideoMotionAnalysis into EnhancedVideoMotionAnalysis
 * by inferring per-component motion from global transitions.
 */
function enhanceBasicResult(basic: VideoMotionAnalysis): EnhancedVideoMotionAnalysis {
  const componentMotions: ComponentMotionAssignment[] = [];

  // Infer entrance animations from global transitions
  if (basic.transitions && basic.transitions.length > 0) {
    const primary = basic.transitions[0];

    // Common component types get staggered entrances
    const componentTypes = ['header', 'hero', 'navigation', 'cards', 'content-section', 'footer'];
    componentTypes.forEach((type, index) => {
      componentMotions.push({
        componentType: type,
        motion: {
          entrance: {
            type: primary.type === 'none' ? 'fade' : primary.type,
            direction: primary.type === 'slide' ? 'up' : undefined,
            duration: primary.duration || 500,
            delay: index * 120,
            easing: primary.ease || 'ease-out',
          },
          hoverMotion: basic.hoverEffects
            ? { scale: 1.02, translateY: -2, duration: 200 }
            : undefined,
        },
      });
    });
  }

  return {
    ...basic,
    componentMotions,
  };
}

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Normalize the API response into a well-typed EnhancedVideoMotionAnalysis.
 */
function normalizeEnhancedResult(raw: Record<string, unknown>): EnhancedVideoMotionAnalysis {
  return {
    keyframes: (raw.keyframes as EnhancedVideoMotionAnalysis['keyframes']) ?? {
      start: 0,
      end: 1,
    },
    transitions: (raw.transitions as EnhancedVideoMotionAnalysis['transitions']) ?? [],
    hoverEffects: Boolean(raw.hoverEffects),
    scrollEffects: Boolean(raw.scrollEffects),
    componentMotions: (raw.componentMotions as ComponentMotionAssignment[]) ?? [],
    pageTransition: raw.pageTransition as EnhancedVideoMotionAnalysis['pageTransition'],
    backgroundEffects: raw.backgroundEffects as EnhancedVideoMotionAnalysis['backgroundEffects'],
  };
}

/**
 * Create an empty analysis result for error cases.
 */
function createEmptyAnalysis(): EnhancedVideoMotionAnalysis {
  return {
    keyframes: { start: 0, end: 1 },
    transitions: [],
    hoverEffects: false,
    scrollEffects: false,
    componentMotions: [],
  };
}
