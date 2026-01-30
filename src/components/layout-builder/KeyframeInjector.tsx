/**
 * KeyframeInjector
 *
 * Scans the component array for `style.animationKeyframes` definitions,
 * generates unique CSS @keyframes rules, and injects a single <style> tag.
 *
 * This solves the problem where Gemini outputs `animation: "gradient-shift 3s ease infinite"`
 * but no @keyframes definition exists in the DOM — causing CSS animations to be dead on arrival.
 *
 * Also handles `visualEffects[].cssKeyframes` for visual effect CSS animations.
 */

import React, { useMemo } from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { entranceToCSSAnimation, loopToCSSAnimation } from '@/services/MotionMapper';

interface KeyframeInjectorProps {
  components: DetectedComponentEnhanced[];
}

/**
 * Convert a camelCase CSS property to kebab-case.
 * e.g., "backgroundPosition" → "background-position"
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Extract the animation name from a CSS animation shorthand string.
 * e.g., "gradient-shift 3s ease infinite" → "gradient-shift"
 *
 * The animation name is the first token that is NOT a time value, easing function,
 * iteration count, direction, fill mode, or play state.
 */
function extractAnimationName(animationShorthand: string): string | null {
  if (!animationShorthand) return null;

  const tokens = animationShorthand.trim().split(/\s+/);

  // CSS animation shorthand keywords to skip
  const timePattern = /^[\d.]+m?s$/;
  const easingKeywords = new Set([
    'ease',
    'ease-in',
    'ease-out',
    'ease-in-out',
    'linear',
    'step-start',
    'step-end',
  ]);
  const directionKeywords = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse']);
  const fillKeywords = new Set(['none', 'forwards', 'backwards', 'both']);
  const playStateKeywords = new Set(['running', 'paused']);
  const iterationKeywords = new Set(['infinite']);

  for (const token of tokens) {
    const lower = token.toLowerCase();
    // Skip time values (e.g., "3s", "300ms", "0.5s")
    if (timePattern.test(lower)) continue;
    // Skip known keywords
    if (easingKeywords.has(lower)) continue;
    if (directionKeywords.has(lower)) continue;
    if (fillKeywords.has(lower)) continue;
    if (playStateKeywords.has(lower)) continue;
    if (iterationKeywords.has(lower)) continue;
    // Skip cubic-bezier(...) and steps(...)
    if (lower.startsWith('cubic-bezier') || lower.startsWith('steps')) continue;
    // Skip pure numbers (iteration count like "2" or "3")
    if (/^\d+$/.test(lower)) continue;

    // This token is likely the animation name
    return token;
  }

  return null;
}

/**
 * Build a CSS @keyframes rule string from a keyframes object.
 *
 * @param name - The keyframe animation name
 * @param keyframes - Object mapping percentage stops to CSS property objects
 *                    e.g., { "0%": { "backgroundPosition": "0% 50%" }, "100%": { ... } }
 */
function buildKeyframeRule(
  name: string,
  keyframes: Record<string, Record<string, string>>
): string {
  const stops = Object.entries(keyframes)
    .map(([stop, properties]) => {
      const declarations = Object.entries(properties)
        .map(([prop, value]) => `    ${camelToKebab(prop)}: ${value};`)
        .join('\n');
      return `  ${stop} {\n${declarations}\n  }`;
    })
    .join('\n');

  return `@keyframes ${name} {\n${stops}\n}`;
}

/**
 * KeyframeInjector component.
 * Renders a <style> tag containing all @keyframes definitions extracted from components.
 */
export const KeyframeInjector: React.FC<KeyframeInjectorProps> = ({ components }) => {
  const cssText = useMemo(() => {
    const keyframeRules: string[] = [];
    const seenNames = new Set<string>();

    for (const component of components) {
      // Source 1: style.animationKeyframes (direct component animations)
      // Namespace keyframe names by component ID to prevent collisions when
      // multiple components use the same animation name with different keyframes.
      if (component.style?.animationKeyframes && component.style?.animation) {
        const originalName = extractAnimationName(component.style.animation);
        if (originalName) {
          const namespacedName = `${component.id}--${originalName}`;
          if (!seenNames.has(namespacedName)) {
            seenNames.add(namespacedName);
            keyframeRules.push(
              buildKeyframeRule(namespacedName, component.style.animationKeyframes)
            );
          }
        }
      }

      // Source 2: motionConfig (entrance/loop animations from video analysis)
      // Entrance keyframes: only if style.animationKeyframes is NOT already set (avoids duplicates)
      // Loop keyframes: always generated from motionConfig (independent of entrance)
      if (component.motionConfig) {
        if (
          !component.style?.animationKeyframes &&
          component.motionConfig.entrance &&
          component.motionConfig.entrance.type !== 'none'
        ) {
          const cssAnim = entranceToCSSAnimation(component.motionConfig.entrance);
          const animName = extractAnimationName(cssAnim.animation);
          if (animName) {
            const namespacedName = `${component.id}--${animName}`;
            if (!seenNames.has(namespacedName)) {
              seenNames.add(namespacedName);
              keyframeRules.push(buildKeyframeRule(namespacedName, cssAnim.animationKeyframes));
            }
          }
        }
        // Loop keyframes are always generated independently — they have unique names
        // and must not be blocked by entrance animationKeyframes existing
        if (component.motionConfig.loop) {
          const loopAnim = loopToCSSAnimation(component.motionConfig.loop, component.id);
          const loopName = extractAnimationName(loopAnim.animation);
          if (loopName) {
            const namespacedName = `${component.id}--${loopName}`;
            if (!seenNames.has(namespacedName)) {
              seenNames.add(namespacedName);
              keyframeRules.push(buildKeyframeRule(namespacedName, loopAnim.animationKeyframes));
            }
          }
        }
      }

      // Source 3: visualEffects[].cssKeyframes (visual effect CSS animations)
      if (component.visualEffects) {
        for (const effect of component.visualEffects) {
          if (effect.cssKeyframes && effect.type === 'css-animation') {
            // Generate a deterministic name from the component ID and effect description
            const effectName = `effect-${component.id}-${effect.description?.replace(/\s+/g, '-').toLowerCase().slice(0, 30) || 'anim'}`;
            if (!seenNames.has(effectName)) {
              seenNames.add(effectName);
              keyframeRules.push(buildKeyframeRule(effectName, effect.cssKeyframes));
            }
          }
        }
      }
    }

    if (keyframeRules.length === 0) return '';

    return `/* KeyframeInjector: ${keyframeRules.length} animation(s) */\n${keyframeRules.join('\n\n')}`;
  }, [components]);

  if (!cssText) return null;

  return <style dangerouslySetInnerHTML={{ __html: cssText }} />;
};
