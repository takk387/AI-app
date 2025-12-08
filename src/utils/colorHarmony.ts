/**
 * Color Harmony Utilities
 *
 * Provides color manipulation functions for the Layout Builder:
 * - Color conversion (hex, rgb, hsl)
 * - Contrast ratio calculation (WCAG compliance)
 * - Color harmony generators (complementary, analogous, triadic, etc.)
 * - Shade generators (lighten, darken)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorHarmony {
  type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic';
  colors: string[];
  description: string;
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAALarge: boolean;
  passesAAA: boolean;
  passesAAALarge: boolean;
  level: 'AAA' | 'AA' | 'AA-Large' | 'Fail';
}

// ============================================================================
// COLOR CONVERSION
// ============================================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle shorthand hex (e.g., #fff)
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL {
  const { r, g, b } = hexToRgb(hex);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

// ============================================================================
// CONTRAST CALCULATION (WCAG)
// ============================================================================

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const L1 = getRelativeLuminance(color1);
  const L2 = getRelativeLuminance(color2);

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if colors meet WCAG requirements
 */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = getContrastRatio(foreground, background);

  return {
    ratio,
    passesAA: ratio >= 4.5, // Normal text
    passesAALarge: ratio >= 3, // Large text (18pt+ or 14pt+ bold)
    passesAAA: ratio >= 7, // Enhanced contrast
    passesAAALarge: ratio >= 4.5, // Enhanced contrast for large text
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-Large' : 'Fail',
  };
}

/**
 * Check if colors meet WCAG AA or AAA
 */
export function meetsWCAG(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return level === 'AAA' ? ratio >= 7 : ratio >= 4.5;
}

// ============================================================================
// COLOR HARMONY GENERATORS
// ============================================================================

/**
 * Get complementary color (opposite on color wheel)
 */
export function getComplementary(hex: string): string {
  const hsl = hexToHsl(hex);
  const complementaryHue = (hsl.h + 180) % 360;
  return hslToHex(complementaryHue, hsl.s, hsl.l);
}

/**
 * Get analogous colors (adjacent on color wheel)
 */
export function getAnalogous(hex: string): [string, string, string] {
  const hsl = hexToHsl(hex);
  return [
    hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
    hex,
    hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Get triadic colors (120° apart)
 */
export function getTriadic(hex: string): [string, string, string] {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Get split complementary colors
 */
export function getSplitComplementary(hex: string): [string, string, string] {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Get tetradic (square) colors (90° apart)
 */
export function getTetradic(hex: string): [string, string, string, string] {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l),
  ];
}

/**
 * Generate all color harmonies for a base color
 */
export function generateHarmonies(hex: string): ColorHarmony[] {
  return [
    {
      type: 'complementary',
      colors: [hex, getComplementary(hex)],
      description: 'High contrast, opposite colors',
    },
    {
      type: 'analogous',
      colors: getAnalogous(hex),
      description: 'Harmonious, adjacent colors',
    },
    {
      type: 'triadic',
      colors: getTriadic(hex),
      description: 'Balanced, evenly spaced',
    },
    {
      type: 'split-complementary',
      colors: getSplitComplementary(hex),
      description: 'Contrast with less tension',
    },
    {
      type: 'tetradic',
      colors: getTetradic(hex),
      description: 'Rich, four-color scheme',
    },
  ];
}

// ============================================================================
// SHADE GENERATORS
// ============================================================================

/**
 * Lighten a color by a percentage
 */
export function lighten(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  const newLightness = Math.min(100, hsl.l + amount);
  return hslToHex(hsl.h, hsl.s, newLightness);
}

/**
 * Darken a color by a percentage
 */
export function darken(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  const newLightness = Math.max(0, hsl.l - amount);
  return hslToHex(hsl.h, hsl.s, newLightness);
}

/**
 * Generate a scale of shades from a base color
 */
export function generateShades(hex: string, count: number = 9): string[] {
  const hsl = hexToHsl(hex);
  const shades: string[] = [];

  // Generate from lightest to darkest
  for (let i = 0; i < count; i++) {
    // Map i to lightness: 0 -> 95, count-1 -> 10
    const lightness = 95 - (i * 85) / (count - 1);
    shades.push(hslToHex(hsl.h, hsl.s, lightness));
  }

  return shades;
}

/**
 * Generate Tailwind-style color scale (50-950)
 */
export function generateTailwindScale(hex: string): Record<string, string> {
  const hsl = hexToHsl(hex);

  return {
    '50': hslToHex(hsl.h, hsl.s, 97),
    '100': hslToHex(hsl.h, hsl.s, 94),
    '200': hslToHex(hsl.h, hsl.s, 86),
    '300': hslToHex(hsl.h, hsl.s, 74),
    '400': hslToHex(hsl.h, hsl.s, 58),
    '500': hex, // Original color (adjusted to ~50% lightness)
    '600': hslToHex(hsl.h, hsl.s, 42),
    '700': hslToHex(hsl.h, hsl.s, 34),
    '800': hslToHex(hsl.h, hsl.s, 26),
    '900': hslToHex(hsl.h, hsl.s, 18),
    '950': hslToHex(hsl.h, hsl.s, 10),
  };
}

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

/**
 * Suggest an accessible color that meets WCAG AA against a background
 */
export function suggestAccessibleColor(
  originalForeground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): string {
  const targetRatio = level === 'AAA' ? 7 : 4.5;
  const bgLuminance = getRelativeLuminance(background);
  const fgHsl = hexToHsl(originalForeground);

  // Determine if we should go darker or lighter
  const shouldDarken = bgLuminance > 0.5;

  let adjustedColor = originalForeground;
  let currentRatio = getContrastRatio(adjustedColor, background);
  let iterations = 0;
  const maxIterations = 50;

  while (currentRatio < targetRatio && iterations < maxIterations) {
    const hsl = hexToHsl(adjustedColor);
    const newLightness = shouldDarken ? Math.max(0, hsl.l - 5) : Math.min(100, hsl.l + 5);

    adjustedColor = hslToHex(fgHsl.h, fgHsl.s, newLightness);
    currentRatio = getContrastRatio(adjustedColor, background);
    iterations++;

    // If we hit the extremes, break
    if (newLightness === 0 || newLightness === 100) break;
  }

  return adjustedColor;
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.5;
}

/**
 * Get a readable text color (black or white) for a given background
 */
export function getReadableTextColor(background: string): string {
  return isLightColor(background) ? '#000000' : '#FFFFFF';
}

// ============================================================================
// EXPORTS
// ============================================================================

const colorHarmony = {
  // Conversion
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,

  // Contrast
  getRelativeLuminance,
  getContrastRatio,
  checkContrast,
  meetsWCAG,

  // Harmony
  getComplementary,
  getAnalogous,
  getTriadic,
  getSplitComplementary,
  getTetradic,
  generateHarmonies,

  // Shades
  lighten,
  darken,
  generateShades,
  generateTailwindScale,

  // Accessibility
  suggestAccessibleColor,
  isLightColor,
  getReadableTextColor,
};

export default colorHarmony;
