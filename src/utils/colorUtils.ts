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
 * Get a visible fallback color for white/light backgrounds
 */
export function getVisibleFallback(color: string | undefined): string {
  return isWhiteOrLight(color) ? '#e5e7eb' : color || '#f3f4f6';
}
