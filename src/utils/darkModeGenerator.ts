/**
 * Dark Mode Generator Utilities
 *
 * Auto-generate dark mode color variants from light mode colors.
 * Maintains brand colors while ensuring WCAG contrast ratios.
 */

import type { ColorSettings } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface DarkModeConfig {
  backgroundLightness: number; // Target lightness for background (default: 10)
  surfaceLightness: number; // Target lightness for surface (default: 15)
  textLightness: number; // Target lightness for text (default: 95)
  preserveHue: boolean; // Keep original hues for brand colors
  preserveSaturation: boolean; // Keep original saturation
  contrastMinimum: number; // Minimum contrast ratio (default: 4.5)
}

// ============================================================================
// COLOR CONVERSION
// ============================================================================

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (c: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
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
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert hex to HSL
 */
export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convert HSL to hex
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

// ============================================================================
// LUMINANCE & CONTRAST
// ============================================================================

/**
 * Calculate relative luminance (WCAG formula)
 */
export function getRelativeLuminance(rgb: RGB): number {
  const sRGB = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(hexToRgb(color1));
  const l2 = getRelativeLuminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA (4.5:1 for normal text)
 */
export function meetsContrastAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA (7:1 for normal text)
 */
export function meetsContrastAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

// ============================================================================
// DARK MODE GENERATION
// ============================================================================

const DEFAULT_CONFIG: DarkModeConfig = {
  backgroundLightness: 8,
  surfaceLightness: 12,
  textLightness: 95,
  preserveHue: true,
  preserveSaturation: true,
  contrastMinimum: 4.5,
};

/**
 * Invert lightness for dark mode
 */
export function invertLightness(hex: string, config: Partial<DarkModeConfig> = {}): string {
  const hsl = hexToHsl(hex);
  const { preserveHue, preserveSaturation } = { ...DEFAULT_CONFIG, ...config };

  // Invert lightness: 100 - original
  // Adjust to avoid pure black/white
  let newL = 100 - hsl.l;
  newL = Math.max(5, Math.min(95, newL));

  return hslToHex({
    h: preserveHue ? hsl.h : hsl.h,
    s: preserveSaturation ? hsl.s : Math.min(hsl.s, 80), // Cap saturation in dark mode
    l: newL,
  });
}

/**
 * Adjust color for dark background while maintaining brand identity
 */
export function adjustForDarkMode(
  hex: string,
  backgroundHex: string,
  config: Partial<DarkModeConfig> = {}
): string {
  const { contrastMinimum } = { ...DEFAULT_CONFIG, ...config };
  const hsl = hexToHsl(hex);

  // Start with the original color
  let adjusted = { ...hsl };

  // If the color is too dark for dark backgrounds, lighten it
  if (hsl.l < 40) {
    adjusted.l = 100 - hsl.l;
  }

  // Increase saturation slightly for dark mode visibility
  adjusted.s = Math.min(adjusted.s + 10, 100);

  // Ensure contrast
  let result = hslToHex(adjusted);
  let iterations = 0;

  while (!meetsContrastAA(result, backgroundHex) && iterations < 20) {
    adjusted.l = Math.min(adjusted.l + 5, 95);
    result = hslToHex(adjusted);
    iterations++;
  }

  return result;
}

/**
 * Generate a complete dark mode color palette from light mode colors
 */
export function generateDarkPalette(
  lightColors: Partial<ColorSettings>,
  config: Partial<DarkModeConfig> = {}
): Partial<ColorSettings> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { backgroundLightness, surfaceLightness, textLightness } = mergedConfig;

  // Generate dark background colors
  const background = hslToHex({ h: 220, s: 20, l: backgroundLightness });
  const surface = hslToHex({ h: 220, s: 15, l: surfaceLightness });

  // Generate text colors
  const text = hslToHex({ h: 220, s: 5, l: textLightness });
  const textMuted = hslToHex({ h: 220, s: 10, l: 60 });

  // Generate border color
  const border = hslToHex({ h: 220, s: 15, l: 25 });

  // Adjust brand colors for dark mode
  const darkColors: Partial<ColorSettings> = {
    background,
    surface,
    text,
    textMuted,
    border,
  };

  // Adjust primary, secondary, accent
  if (lightColors.primary) {
    darkColors.primary = adjustForDarkMode(lightColors.primary, background, mergedConfig);
  }
  if (lightColors.secondary) {
    darkColors.secondary = adjustForDarkMode(lightColors.secondary, background, mergedConfig);
  }
  if (lightColors.accent) {
    darkColors.accent = adjustForDarkMode(lightColors.accent, background, mergedConfig);
  }

  // Status colors (usually already vibrant, just ensure contrast)
  if (lightColors.success) {
    darkColors.success = adjustForDarkMode(lightColors.success, background, mergedConfig);
  }
  if (lightColors.warning) {
    darkColors.warning = adjustForDarkMode(lightColors.warning, background, mergedConfig);
  }
  if (lightColors.error) {
    darkColors.error = adjustForDarkMode(lightColors.error, background, mergedConfig);
  }
  if (lightColors.info) {
    darkColors.info = adjustForDarkMode(lightColors.info, background, mergedConfig);
  }

  return darkColors;
}

/**
 * Generate CSS variables for both light and dark themes
 */
export function generateThemeCSS(
  lightColors: Partial<ColorSettings>,
  darkColors: Partial<ColorSettings>
): string {
  const generateVars = (colors: Partial<ColorSettings>, prefix = '') => {
    return Object.entries(colors)
      .filter(([, value]) => value)
      .map(
        ([key, value]) =>
          `  --color-${prefix}${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`
      )
      .join('\n');
  };

  return `:root {
  /* Light Theme */
${generateVars(lightColors)}
}

[data-theme="dark"],
.dark {
  /* Dark Theme */
${generateVars(darkColors)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${generateVars(darkColors)}
  }
}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  getRelativeLuminance,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  invertLightness,
  adjustForDarkMode,
  generateDarkPalette,
  generateThemeCSS,
};
