/**
 * Computed Style Extractor
 * Extracts relevant computed styles from DOM elements.
 */

import type { ExtractedStyles } from '@/types/elementInspector';

/**
 * Extract relevant computed styles from an element
 */
export function extractComputedStyles(element: HTMLElement): ExtractedStyles {
  const computed = window.getComputedStyle(element);

  const styles: ExtractedStyles = {
    // Layout
    display: computed.display,
    position: computed.position,
    width: computed.width,
    height: computed.height,

    // Spacing (combined for readability)
    margin: formatSpacing(
      computed.marginTop,
      computed.marginRight,
      computed.marginBottom,
      computed.marginLeft
    ),
    padding: formatSpacing(
      computed.paddingTop,
      computed.paddingRight,
      computed.paddingBottom,
      computed.paddingLeft
    ),

    // Typography
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontFamily: formatFontFamily(computed.fontFamily),
    lineHeight: computed.lineHeight,
    color: formatColor(computed.color),

    // Background & Borders
    backgroundColor: formatColor(computed.backgroundColor),
    borderRadius: computed.borderRadius,
    border: formatBorder(computed),
  };

  // Add flexbox properties only if display is flex
  if (computed.display === 'flex' || computed.display === 'inline-flex') {
    styles.flexDirection = computed.flexDirection;
    styles.justifyContent = computed.justifyContent;
    styles.alignItems = computed.alignItems;
    styles.gap = computed.gap;
  }

  return styles;
}

/**
 * Format spacing values (margin/padding) into shorthand
 */
function formatSpacing(top: string, right: string, bottom: string, left: string): string {
  if (top === right && right === bottom && bottom === left) {
    return top;
  }
  if (top === bottom && left === right) {
    return `${top} ${right}`;
  }
  return `${top} ${right} ${bottom} ${left}`;
}

/**
 * Format font family to be more readable
 */
function formatFontFamily(fontFamily: string): string {
  const firstFont = fontFamily.split(',')[0].trim();
  return firstFont.replace(/["']/g, '');
}

/**
 * Format RGB color to hex or readable format
 */
function formatColor(color: string): string {
  if (color === 'rgba(0, 0, 0, 0)') {
    return 'transparent';
  }

  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
  }

  return color;
}

/**
 * Format border shorthand
 */
function formatBorder(computed: CSSStyleDeclaration): string {
  const width = computed.borderTopWidth;
  const style = computed.borderTopStyle;
  const color = formatColor(computed.borderTopColor);

  if (style === 'none' || width === '0px') {
    return 'none';
  }

  return `${width} ${style} ${color}`;
}
