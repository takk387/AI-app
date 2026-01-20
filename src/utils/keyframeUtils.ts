/**
 * Keyframe Utilities
 *
 * Utilities for animation keyframe interpolation, easing functions,
 * and CSS @keyframes generation.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Keyframe {
  id: string;
  time: number; // 0-100 percentage
  properties: KeyframeProperties;
  easing: EasingFunction;
}

export interface KeyframeProperties {
  opacity?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  skewX?: number;
  skewY?: number;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  boxShadow?: string;
  borderRadius?: number;
  width?: number;
  height?: number;
}

export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-quart'
  | 'ease-out-quart'
  | 'ease-in-out-quart'
  | 'ease-in-back'
  | 'ease-out-back'
  | 'ease-in-out-back'
  | 'ease-in-elastic'
  | 'ease-out-elastic'
  | 'ease-in-out-elastic'
  | 'ease-out-bounce'
  | { type: 'cubic-bezier'; values: [number, number, number, number] };

export interface CustomAnimation {
  id: string;
  name: string;
  duration: number; // ms
  delay: number; // ms
  iterationCount: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  keyframes: Keyframe[];
}

export interface PropertyTrack {
  property: keyof KeyframeProperties;
  label: string;
  type: 'number' | 'color' | 'string';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PROPERTY_TRACKS: PropertyTrack[] = [
  { property: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 1, step: 0.01 },
  { property: 'translateX', label: 'Translate X', type: 'number', unit: 'px', min: -500, max: 500 },
  { property: 'translateY', label: 'Translate Y', type: 'number', unit: 'px', min: -500, max: 500 },
  { property: 'scale', label: 'Scale', type: 'number', min: 0, max: 3, step: 0.01 },
  { property: 'scaleX', label: 'Scale X', type: 'number', min: 0, max: 3, step: 0.01 },
  { property: 'scaleY', label: 'Scale Y', type: 'number', min: 0, max: 3, step: 0.01 },
  { property: 'rotate', label: 'Rotate', type: 'number', unit: 'deg', min: -360, max: 360 },
  { property: 'skewX', label: 'Skew X', type: 'number', unit: 'deg', min: -90, max: 90 },
  { property: 'skewY', label: 'Skew Y', type: 'number', unit: 'deg', min: -90, max: 90 },
  { property: 'backgroundColor', label: 'Background', type: 'color' },
  { property: 'borderColor', label: 'Border Color', type: 'color' },
  { property: 'color', label: 'Text Color', type: 'color' },
  { property: 'boxShadow', label: 'Box Shadow', type: 'string' },
  {
    property: 'borderRadius',
    label: 'Border Radius',
    type: 'number',
    unit: 'px',
    min: 0,
    max: 100,
  },
  { property: 'width', label: 'Width', type: 'number', unit: 'px', min: 0, max: 1000 },
  { property: 'height', label: 'Height', type: 'number', unit: 'px', min: 0, max: 1000 },
];

export const EASING_PRESETS: { id: EasingFunction; label: string; cssValue: string }[] = [
  { id: 'linear', label: 'Linear', cssValue: 'linear' },
  { id: 'ease', label: 'Ease', cssValue: 'ease' },
  { id: 'ease-in', label: 'Ease In', cssValue: 'ease-in' },
  { id: 'ease-out', label: 'Ease Out', cssValue: 'ease-out' },
  { id: 'ease-in-out', label: 'Ease In Out', cssValue: 'ease-in-out' },
  { id: 'ease-in-quad', label: 'Ease In Quad', cssValue: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)' },
  { id: 'ease-out-quad', label: 'Ease Out Quad', cssValue: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
  {
    id: 'ease-in-out-quad',
    label: 'Ease In Out Quad',
    cssValue: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  },
  {
    id: 'ease-in-cubic',
    label: 'Ease In Cubic',
    cssValue: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  },
  {
    id: 'ease-out-cubic',
    label: 'Ease Out Cubic',
    cssValue: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  },
  {
    id: 'ease-in-out-cubic',
    label: 'Ease In Out Cubic',
    cssValue: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  },
  {
    id: 'ease-in-quart',
    label: 'Ease In Quart',
    cssValue: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  },
  { id: 'ease-out-quart', label: 'Ease Out Quart', cssValue: 'cubic-bezier(0.165, 0.84, 0.44, 1)' },
  {
    id: 'ease-in-out-quart',
    label: 'Ease In Out Quart',
    cssValue: 'cubic-bezier(0.77, 0, 0.175, 1)',
  },
  { id: 'ease-in-back', label: 'Ease In Back', cssValue: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)' },
  {
    id: 'ease-out-back',
    label: 'Ease Out Back',
    cssValue: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  {
    id: 'ease-in-out-back',
    label: 'Ease In Out Back',
    cssValue: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  {
    id: 'ease-out-bounce',
    label: 'Ease Out Bounce',
    cssValue: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
];

export const DEFAULT_ANIMATION: CustomAnimation = {
  id: 'default',
  name: 'fadeIn',
  duration: 500,
  delay: 0,
  iterationCount: 1,
  direction: 'normal',
  fillMode: 'forwards',
  keyframes: [
    {
      id: 'kf-0',
      time: 0,
      properties: { opacity: 0 },
      easing: 'ease-out',
    },
    {
      id: 'kf-100',
      time: 100,
      properties: { opacity: 1 },
      easing: 'ease-out',
    },
  ],
};

// NOTE: ANIMATION_PRESETS removed - animations are AI-generated based on design description

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

/**
 * Get cubic-bezier values for an easing function
 */
export function getEasingBezier(easing: EasingFunction): [number, number, number, number] {
  if (typeof easing === 'object' && easing.type === 'cubic-bezier') {
    return easing.values;
  }

  const bezierMap: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
    'ease-in-quad': [0.55, 0.085, 0.68, 0.53],
    'ease-out-quad': [0.25, 0.46, 0.45, 0.94],
    'ease-in-out-quad': [0.455, 0.03, 0.515, 0.955],
    'ease-in-cubic': [0.55, 0.055, 0.675, 0.19],
    'ease-out-cubic': [0.215, 0.61, 0.355, 1],
    'ease-in-out-cubic': [0.645, 0.045, 0.355, 1],
    'ease-in-quart': [0.895, 0.03, 0.685, 0.22],
    'ease-out-quart': [0.165, 0.84, 0.44, 1],
    'ease-in-out-quart': [0.77, 0, 0.175, 1],
    'ease-in-back': [0.6, -0.28, 0.735, 0.045],
    'ease-out-back': [0.175, 0.885, 0.32, 1.275],
    'ease-in-out-back': [0.68, -0.55, 0.265, 1.55],
    'ease-in-elastic': [0.5, -0.5, 0.5, 1.5],
    'ease-out-elastic': [0.5, 1.5, 0.5, -0.5],
    'ease-in-out-elastic': [0.5, -0.5, 0.5, 1.5],
    'ease-out-bounce': [0.34, 1.56, 0.64, 1],
  };

  return bezierMap[easing as string] || [0, 0, 1, 1];
}

/**
 * Get CSS timing function string
 */
export function getEasingCSS(easing: EasingFunction): string {
  if (typeof easing === 'object' && easing.type === 'cubic-bezier') {
    return `cubic-bezier(${easing.values.join(', ')})`;
  }

  const preset = EASING_PRESETS.find((p) => p.id === easing);
  return preset?.cssValue || 'ease';
}

/**
 * Calculate bezier curve point at t
 */
export function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/**
 * Get Y value for X on bezier curve (for easing)
 */
export function getEasingValue(progress: number, bezier: [number, number, number, number]): number {
  // Newton-Raphson iteration to find t for given x
  const [x1, y1, x2, y2] = bezier;
  let t = progress;

  for (let i = 0; i < 8; i++) {
    const x = cubicBezier(t, 0, x1, x2, 1) - progress;
    if (Math.abs(x) < 0.001) break;
    const dx = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    t -= x / dx;
  }

  return cubicBezier(t, 0, y1, y2, 1);
}

// ============================================================================
// INTERPOLATION
// ============================================================================

/**
 * Interpolate between two numeric values
 */
export function interpolateNumber(
  from: number,
  to: number,
  progress: number,
  easing: EasingFunction
): number {
  const bezier = getEasingBezier(easing);
  const easedProgress = getEasingValue(progress, bezier);
  return from + (to - from) * easedProgress;
}

/**
 * Interpolate between two colors (hex)
 */
export function interpolateColor(
  from: string,
  to: string,
  progress: number,
  easing: EasingFunction
): string {
  const bezier = getEasingBezier(easing);
  const easedProgress = getEasingValue(progress, bezier);

  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);

  if (!fromRgb || !toRgb) return from;

  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * easedProgress);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * easedProgress);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * easedProgress);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Interpolate keyframe properties at a given time
 */
export function interpolateKeyframes(keyframes: Keyframe[], time: number): KeyframeProperties {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) return keyframes[0].properties;

  // Sort keyframes by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Find surrounding keyframes
  let fromKf = sorted[0];
  let toKf = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      fromKf = sorted[i];
      toKf = sorted[i + 1];
      break;
    }
  }

  // If before first keyframe or after last
  if (time <= fromKf.time) return fromKf.properties;
  if (time >= toKf.time) return toKf.properties;

  // Calculate progress between keyframes
  const progress = (time - fromKf.time) / (toKf.time - fromKf.time);
  const result: KeyframeProperties = {};

  // Get all properties from both keyframes
  const allProperties = new Set([
    ...Object.keys(fromKf.properties),
    ...Object.keys(toKf.properties),
  ]) as Set<keyof KeyframeProperties>;

  for (const prop of allProperties) {
    const fromVal = fromKf.properties[prop];
    const toVal = toKf.properties[prop];

    if (fromVal === undefined && toVal === undefined) continue;

    // Use the value that exists if only one is defined
    if (fromVal === undefined) {
      (result as Record<string, unknown>)[prop] = toVal;
      continue;
    }
    if (toVal === undefined) {
      (result as Record<string, unknown>)[prop] = fromVal;
      continue;
    }

    // Interpolate based on type
    if (typeof fromVal === 'number' && typeof toVal === 'number') {
      (result as Record<string, unknown>)[prop] = interpolateNumber(
        fromVal,
        toVal,
        progress,
        fromKf.easing
      );
    } else if (typeof fromVal === 'string' && typeof toVal === 'string') {
      if (fromVal.startsWith('#') && toVal.startsWith('#')) {
        (result as Record<string, unknown>)[prop] = interpolateColor(
          fromVal,
          toVal,
          progress,
          fromKf.easing
        );
      } else {
        // Can't interpolate strings, use "from" value until 50%
        (result as Record<string, unknown>)[prop] = progress < 0.5 ? fromVal : toVal;
      }
    }
  }

  return result;
}

// ============================================================================
// CSS GENERATION
// ============================================================================

/**
 * Convert keyframe properties to CSS style object
 */
export function propertiesToStyle(properties: KeyframeProperties): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (properties.opacity !== undefined) {
    style.opacity = properties.opacity;
  }

  // Build transform string
  const transforms: string[] = [];
  if (properties.translateX !== undefined)
    transforms.push(`translateX(${properties.translateX}px)`);
  if (properties.translateY !== undefined)
    transforms.push(`translateY(${properties.translateY}px)`);
  if (properties.scale !== undefined) transforms.push(`scale(${properties.scale})`);
  if (properties.scaleX !== undefined) transforms.push(`scaleX(${properties.scaleX})`);
  if (properties.scaleY !== undefined) transforms.push(`scaleY(${properties.scaleY})`);
  if (properties.rotate !== undefined) transforms.push(`rotate(${properties.rotate}deg)`);
  if (properties.skewX !== undefined) transforms.push(`skewX(${properties.skewX}deg)`);
  if (properties.skewY !== undefined) transforms.push(`skewY(${properties.skewY}deg)`);
  if (transforms.length > 0) {
    style.transform = transforms.join(' ');
  }

  if (properties.backgroundColor) style.backgroundColor = properties.backgroundColor;
  if (properties.borderColor) style.borderColor = properties.borderColor;
  if (properties.color) style.color = properties.color;
  if (properties.boxShadow) style.boxShadow = properties.boxShadow;
  if (properties.borderRadius !== undefined) style.borderRadius = `${properties.borderRadius}px`;
  if (properties.width !== undefined) style.width = `${properties.width}px`;
  if (properties.height !== undefined) style.height = `${properties.height}px`;

  return style;
}

/**
 * Generate CSS @keyframes rule
 */
export function generateKeyframesCSS(animation: CustomAnimation): string {
  const { name, keyframes } = animation;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  let css = `@keyframes ${name} {\n`;

  for (const kf of sorted) {
    css += `  ${kf.time}% {\n`;

    const style = propertiesToStyle(kf.properties);
    for (const [prop, value] of Object.entries(style)) {
      const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      css += `    ${cssProperty}: ${value};\n`;
    }

    css += `  }\n`;
  }

  css += `}`;
  return css;
}

/**
 * Generate full CSS animation rule
 */
export function generateAnimationCSS(
  animation: CustomAnimation,
  selector: string = '.animated'
): string {
  const keyframesCSS = generateKeyframesCSS(animation);
  const { name, duration, delay, iterationCount, direction, fillMode } = animation;

  const animationCSS = `${selector} {
  animation-name: ${name};
  animation-duration: ${duration}ms;
  animation-delay: ${delay}ms;
  animation-iteration-count: ${iterationCount === 'infinite' ? 'infinite' : iterationCount};
  animation-direction: ${direction};
  animation-fill-mode: ${fillMode};
}`;

  return `${keyframesCSS}\n\n${animationCSS}`;
}

/**
 * Generate animation shorthand
 */
export function generateAnimationShorthand(animation: CustomAnimation): string {
  const { name, duration, delay, iterationCount, direction, fillMode } = animation;
  return `${name} ${duration}ms ${delay > 0 ? `${delay}ms ` : ''}${iterationCount === 'infinite' ? 'infinite ' : iterationCount > 1 ? `${iterationCount} ` : ''}${direction !== 'normal' ? `${direction} ` : ''}${fillMode !== 'none' ? fillMode : ''}`.trim();
}

// ============================================================================
// KEYFRAME MANIPULATION
// ============================================================================

/**
 * Generate a unique keyframe ID
 */
export function generateKeyframeId(): string {
  return `kf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a keyframe at a specific time
 */
export function addKeyframe(
  keyframes: Keyframe[],
  time: number,
  properties?: KeyframeProperties,
  easing: EasingFunction = 'ease'
): Keyframe[] {
  // Check if keyframe already exists at this time
  const existing = keyframes.find((kf) => Math.abs(kf.time - time) < 0.5);
  if (existing) return keyframes;

  // Interpolate properties if not provided
  const interpolatedProps = properties || interpolateKeyframes(keyframes, time);

  const newKeyframe: Keyframe = {
    id: generateKeyframeId(),
    time,
    properties: interpolatedProps,
    easing,
  };

  return [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
}

/**
 * Remove a keyframe by ID
 */
export function removeKeyframe(keyframes: Keyframe[], id: string): Keyframe[] {
  // Don't remove if only 2 keyframes remain
  if (keyframes.length <= 2) return keyframes;
  return keyframes.filter((kf) => kf.id !== id);
}

/**
 * Update a keyframe
 */
export function updateKeyframe(
  keyframes: Keyframe[],
  id: string,
  updates: Partial<Omit<Keyframe, 'id'>>
): Keyframe[] {
  return keyframes
    .map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
    .sort((a, b) => a.time - b.time);
}

/**
 * Duplicate a keyframe at a new time
 */
export function duplicateKeyframe(keyframes: Keyframe[], id: string, newTime: number): Keyframe[] {
  const source = keyframes.find((kf) => kf.id === id);
  if (!source) return keyframes;

  const newKeyframe: Keyframe = {
    id: generateKeyframeId(),
    time: newTime,
    properties: { ...source.properties },
    easing: source.easing,
  };

  return [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
}

/**
 * Get keyframes that have a specific property
 */
export function getKeyframesWithProperty(
  keyframes: Keyframe[],
  property: keyof KeyframeProperties
): Keyframe[] {
  return keyframes.filter((kf) => kf.properties[property] !== undefined);
}

/**
 * Normalize keyframe times to 0-100 range
 */
export function normalizeKeyframeTimes(keyframes: Keyframe[]): Keyframe[] {
  if (keyframes.length === 0) return keyframes;

  const times = keyframes.map((kf) => kf.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const range = maxTime - minTime;

  if (range === 0) return keyframes;

  return keyframes.map((kf) => ({
    ...kf,
    time: ((kf.time - minTime) / range) * 100,
  }));
}

export default {
  interpolateKeyframes,
  generateKeyframesCSS,
  generateAnimationCSS,
  addKeyframe,
  removeKeyframe,
  updateKeyframe,
  EASING_PRESETS,
  PROPERTY_TRACKS,
};
