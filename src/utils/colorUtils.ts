/**
 * Color Utility Functions
 *
 * Handles color normalization, detection, and fallback generation
 * for the Layout Builder to ensure all components are visible.
 */

/**
 * Normalize color to hex format for comparison
 * Handles: #fff, #ffffff, white, rgb(255,255,255), rgba(255,255,255,1)
 */
export function normalizeColor(color: string | undefined): string {
  if (!color) return '#000000';

  const normalized = color.toLowerCase().trim();

  // Named colors
  const namedColors: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    transparent: '#00000000',
  };

  if (namedColors[normalized]) return namedColors[normalized];

  // Hex shorthand
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  // RGB/RGBA
  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [_, r, g, b] = rgbMatch;
    return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
  }

  return normalized;
}

/**
 * Check if a color is transparent or has low opacity
 */
export function isTransparent(color: string | undefined): boolean {
  if (!color) return false;

  const normalized = color.toLowerCase().trim();

  // Named transparent
  if (normalized === 'transparent') return true;

  // RGBA with alpha < 0.3
  const rgbaMatch = normalized.match(/rgba?\(\d+,\s*\d+,\s*\d+,?\s*([\d.]+)?\)/);
  if (rgbaMatch) {
    const alpha = rgbaMatch[1] ? parseFloat(rgbaMatch[1]) : 1;
    return alpha < 0.3;
  }

  // Hex with alpha channel (#00000000 or #ffffff00)
  if (/^#[0-9a-f]{8}$/i.test(normalized)) {
    const alpha = parseInt(normalized.slice(7, 9), 16);
    return alpha < 77; // 77 is ~30% of 255
  }

  return false;
}

/**
 * Check if a color is effectively white (or very light)
 */
export function isWhiteOrLight(color: string | undefined): boolean {
  const normalized = normalizeColor(color);

  // Pure white
  if (normalized === '#ffffff' || normalized === '#fff') return true;

  // Very light colors (>95% brightness)
  const hex = normalized.replace('#', '');
  if (hex.length !== 6) return false;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const brightness = (r + g + b) / 3;
  return brightness > 242; // 95% of 255
}

/**
 * Context for intelligent color fallback decisions
 */
export interface ColorContext {
  /** Page/parent background color - helps determine if white is intentional contrast */
  pageBackground?: string;
  /** Component type - some types (overlays, modals) should stay transparent */
  componentType?: string;
  /** Whether to force fallback even for valid colors (debug mode) */
  forceDebugFallback?: boolean;
}

/**
 * Component types that should preserve transparency
 */
const TRANSPARENT_COMPONENT_TYPES = [
  'overlay',
  'modal-backdrop',
  'glassmorphism',
  'blur-overlay',
  'backdrop',
];

/**
 * Check if a color is dark (for contrast detection)
 */
export function isDark(color: string | undefined): boolean {
  const normalized = normalizeColor(color);
  const hex = normalized.replace('#', '');
  if (hex.length !== 6) return false;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Use relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Get a visible fallback color - TRUST AI COLORS
 *
 * Philosophy: Trust the AI-provided colors. Only provide fallback when truly undefined.
 * Use transparent for undefined instead of gray to avoid "gray box" artifacts.
 *
 * @param color - The color to check
 * @param context - Optional context (mostly unused now, kept for API compatibility)
 */
export function getVisibleFallback(color: string | undefined, context?: ColorContext): string {
  // If color is defined, return it directly - trust the source
  if (color !== undefined && color !== null && color !== '') {
    return color;
  }

  // For undefined colors, return transparent instead of gray
  // This lets content show through and avoids "gray box" artifacts
  return 'transparent';
}

/**
 * LEGACY: Get visible fallback without context (backward compatibility)
 * @deprecated Use getVisibleFallback with context for better results
 */
export function getVisibleFallbackLegacy(color: string | undefined): string {
  // Handle transparent colors first
  if (isTransparent(color)) return '#f3f4f6';
  // Handle white/light colors
  return isWhiteOrLight(color) ? '#e5e7eb' : color || '#f3f4f6';
}
