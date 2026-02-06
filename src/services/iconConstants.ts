/**
 * Icon Constants — Single source of truth for UI chrome icon whitelist.
 *
 * Only these icons are genuine UI chrome (arrows, close buttons, hamburger menus).
 * Everything else (logos, feature icons, brand icons, social icons) must be
 * extracted from the reference image, NOT substituted with a Lucide icon.
 */

export const UI_CHROME_ICONS = new Set([
  // Navigation arrows
  'ChevronLeft',
  'ChevronRight',
  'ChevronUp',
  'ChevronDown',
  // Close / menu actions
  'X',
  'Menu',
  // Basic actions
  'Check',
  'Plus',
  'Minus',
  // Utility
  'Search',
  'ArrowRight',
  'ArrowLeft',
]);

/**
 * Returns true if the icon name is a standard UI chrome icon that can safely
 * be rendered from Lucide without losing visual fidelity.
 */
export function isUIChromeIcon(name: string): boolean {
  return UI_CHROME_ICONS.has(name);
}
