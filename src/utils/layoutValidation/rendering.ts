/**
 * Layout Validation — Rendering Utilities
 *
 * Functions for validating components are safe for rendering
 * and safely converting values to numbers.
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';

/**
 * Validate that components are safe for rendering.
 * Quick check without full sanitization.
 */
export function validateComponentsForRender(components: DetectedComponentEnhanced[]): boolean {
  if (!Array.isArray(components)) return false;

  return components.every(
    (c) =>
      c &&
      typeof c.id === 'string' &&
      c.bounds &&
      typeof c.bounds.top === 'number' &&
      !isNaN(c.bounds.top) &&
      typeof c.bounds.left === 'number' &&
      !isNaN(c.bounds.left) &&
      typeof c.bounds.width === 'number' &&
      !isNaN(c.bounds.width) &&
      typeof c.bounds.height === 'number' &&
      !isNaN(c.bounds.height)
  );
}

/**
 * Safely convert a value to a number with bounds checking.
 * Primary normalization (0-1000 → 0-100) is handled upstream by
 * normalizeCoordinates() in GeminiComponentBuilder.ts.
 *
 * Safety net: values > 100 are divided by 10 as a fallback for code paths
 * that bypass normalizeCoordinates() (e.g., direct Zod parsing without
 * GeminiComponentBuilder). Without this, values like 800 clamp to 100,
 * making components full-width. This does NOT cause double-normalization
 * because already-normalized values (0-100) pass through unchanged.
 */
export function safeNumber(
  value: unknown,
  defaultValue: number,
  minValue: number = 0,
  maxValue: number = 100
): number {
  if (value === null || value === undefined) return defaultValue;

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num)) return defaultValue;

  // Safety net: catch 0-1000 scale values that escaped upstream normalizeCoordinates().
  // Already-normalized values (0-100) pass through unchanged — no double-normalization risk.
  const normalized = num > 100 ? num / 10 : num;
  return Math.max(minValue, Math.min(maxValue, normalized));
}
