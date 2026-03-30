/**
 * Layout Validation Schemas
 *
 * Zod schemas and helper functions for DetectedComponentEnhanced validation.
 * Ensures AI-generated layout data is valid before rendering.
 *
 * Key guarantees:
 * - Valid AI-generated bounds pass through unchanged
 * - Missing/invalid bounds get safe defaults
 * - Components with partial data are recovered, not rejected
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default bounds for components missing bounds data.
 * Components with missing bounds render as 20% width "chips" rather than
 * full-width blocks. Most missing-bounds components are small elements
 * (buttons, icons, labels), not full-width sections. The GenericComponentRenderer
 * also uses {width: 20, height: 10} — both must stay in sync.
 */
export const DEFAULT_BOUNDS = {
  top: 0,
  left: 0,
  width: 20,
  height: 10,
} as const;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Helper to convert bounds value to percentage.
 * Clamps to 0-100 range. Normalization from 0-1000 scale is handled
 * upstream by normalizeCoordinates() in GeminiComponentBuilder.ts —
 * this function should NOT duplicate that logic per-value.
 */
export function toPercentage(val: number | string, defaultVal: number): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return defaultVal;
  return Math.max(0, Math.min(100, num));
}

/**
 * Helper for width/height - ensures minimum value for visibility.
 * Clamps to min-100 range. Scale normalization handled upstream.
 * 1% minimum ensures elements remain visible even on small viewports
 * (0.1% = 0.375px on a 375px phone — effectively invisible).
 */
export function toPercentageWithMin(
  val: number | string,
  defaultVal: number,
  min: number = 1
): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num <= 0) return defaultVal;
  return Math.max(min, Math.min(100, num));
}

/**
 * Schema for bounds validation.
 * - Coerces string numbers to actual numbers
 * - Handles both 0-100 (percentage) and 0-1000 (normalized) scales
 * - Values > 100 are assumed to be 0-1000 and converted to percentage
 * - Provides defaults for missing values
 */
const BoundsSchema = z
  .object({
    top: z
      .union([z.number(), z.string()])
      .transform((val) => toPercentage(val, DEFAULT_BOUNDS.top))
      .default(DEFAULT_BOUNDS.top),
    left: z
      .union([z.number(), z.string()])
      .transform((val) => toPercentage(val, DEFAULT_BOUNDS.left))
      .default(DEFAULT_BOUNDS.left),
    width: z
      .union([z.number(), z.string()])
      .transform((val) => toPercentageWithMin(val, DEFAULT_BOUNDS.width, 1))
      .default(DEFAULT_BOUNDS.width),
    height: z
      .union([z.number(), z.string()])
      .transform((val) => toPercentageWithMin(val, DEFAULT_BOUNDS.height, 1))
      .default(DEFAULT_BOUNDS.height),
  })
  .default(DEFAULT_BOUNDS);

/**
 * Schema for component style validation.
 * Allows any properties (passthrough) since AI can generate arbitrary CSS.
 */
const StyleSchema = z
  .object({
    variant: z.string().optional(),
    hasBackground: z.boolean().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.string().optional(),
    isFloating: z.boolean().optional(),
    isSticky: z.boolean().optional(),
    borderRadius: z.string().optional(),
    shadow: z.string().optional(),
    padding: z.string().optional(),
    fontSize: z.string().optional(),
    fontWeight: z.string().optional(),
    textAlign: z.string().optional(),
    display: z.string().optional(),
    alignment: z.string().optional(),
    gap: z.string().optional(),
    // New fields for Zero-Preset Architecture
    textTransform: z.string().optional(),
    cursor: z.string().optional(),
    backgroundImage: z.string().optional(),
    backgroundSize: z.string().optional(),
    backgroundPosition: z.string().optional(),
    backgroundRepeat: z.string().optional(),
    lineHeight: z.string().optional(),
    letterSpacing: z.string().optional(),
    borderStyle: z.string().optional(),
    opacity: z.string().optional(),
    backdropFilter: z.string().optional(),
    transform: z.string().optional(),
    overflow: z.string().optional(),
    customCSS: z.record(z.string(), z.unknown()).optional(),
    // Animation & transition properties
    animation: z.string().optional(),
    animationKeyframes: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    transition: z.string().optional(),
  })
  .passthrough()
  .default({});

/**
 * Schema for component content validation.
 */
const ContentSchema = z
  .object({
    text: z.string().optional(),
    hasIcon: z.boolean().optional(),
    hasImage: z.boolean().optional(),
    imageDescription: z.string().optional(),
    imageAlt: z.string().optional(),
    itemCount: z.number().optional(),
    placeholder: z.string().optional(),
    // Icon properties for exact SVG replication
    iconName: z.string().optional(),
    iconSvgPath: z.string().optional(), // Raw SVG path for exact replication
    iconViewBox: z.string().optional(), // SVG viewBox if different from default
    iconColor: z.string().optional(),
    iconPosition: z.string().optional(),
    iconSize: z.string().optional(),
    // Custom visual extraction (logos, brand icons, illustrations)
    hasCustomVisual: z.boolean().optional(),
    extractionAction: z.enum(['crop', 'none']).optional(),
    extractionBounds: z
      .object({
        top: z.number(),
        left: z.number(),
        width: z.number(),
        height: z.number(),
      })
      .optional(),
  })
  .passthrough()
  .optional();

/**
 * Reference list of known component types.
 * Not used for validation (types are open-ended), but serves as documentation.
 */
const _VALID_COMPONENT_TYPES = [
  // Layout sections
  'header',
  'sidebar',
  'hero',
  'cards',
  'navigation',
  'footer',
  'form',
  'table',
  'carousel',
  'timeline',
  'stepper',
  'stats',
  'testimonials',
  'pricing',
  'features',
  'cta',
  'breadcrumb',
  'pagination',
  'tabs',
  'modal-trigger',
  'search-bar',
  'user-menu',
  'logo',
  'content-section',
  'image-gallery',
  'video-player',
  'map',
  'chart',
  'button',
  'input',
  'list',
  'menu',
  'modal',
  'dropdown',
  'badge',
  'avatar',
  'divider',
  'progress',
  // Expanded: commonly missing abstract UI types
  'notification',
  'drawer',
  'toast',
  'popover',
  'tooltip',
  'spinner',
  'skeleton',
  'slider',
  'toggle',
  'checkbox',
  'radio',
  'select',
  'accordion',
  'alert',
  'banner',
  'chip',
  'tag',
  'rating',
  'calendar',
  'datepicker',
  'dialog',
  'switch',
  'upload',
  'tree',
  'unknown',
] as const;

/**
 * Valid component roles for positioning strategy
 */
export const VALID_ROLES = [
  'container',
  'leaf',
  'overlay',
  'fixed',
  'sticky',
  'modal',
  'background',
  'wrapper',
] as const;

/**
 * Schema for container layout configuration
 */
const LayoutConfigSchema = z
  .object({
    type: z.enum(['flex', 'grid', 'none', 'absolute', 'block']),
    direction: z.enum(['row', 'column']).optional(),
    gap: z.string().optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
    align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    wrap: z.boolean().optional(),
    columns: z.string().optional(),
  })
  .optional();

/**
 * Full component schema with all required fields.
 */
export const DetectedComponentSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().transform(
      (val) =>
        // Keep unrecognized types as-is instead of forcing to 'unknown'
        // The AI may generate valid component types not in our list
        val || 'unknown'
    ),
    bounds: BoundsSchema,
    style: StyleSchema,
    content: ContentSchema,
    parentId: z.string().optional(),
    children: z.array(z.string()).optional(),
    role: z
      .string()
      .transform(
        (val) =>
          // Keep unrecognized roles as-is instead of dropping them
          // The AI may generate valid roles not in our known list
          val || undefined
      )
      .optional(),
    layout: LayoutConfigSchema,
    zIndex: z.number().optional(),
    navigatesTo: z.string().optional(),
    isNavigationItem: z.boolean().optional(),
    isInteractive: z.boolean().optional(),
    interactions: z
      .object({
        hover: z
          .object({
            backgroundColor: z.string().optional(),
            textColor: z.string().optional(),
            transform: z.string().optional(),
            boxShadow: z.string().optional(),
            opacity: z.number().optional(),
            borderColor: z.string().optional(),
          })
          .passthrough()
          .optional(),
        active: z
          .object({
            backgroundColor: z.string().optional(),
            textColor: z.string().optional(),
            transform: z.string().optional(),
            scale: z.number().optional(),
          })
          .passthrough()
          .optional(),
        focus: z
          .object({
            outline: z.string().optional(),
            boxShadow: z.string().optional(),
            borderColor: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    visualEffects: z
      .array(
        z
          .object({
            description: z.string().default(''),
            type: z.string().default('css-animation'),
            trigger: z.string().default('always'),
            cssKeyframes: z.record(z.string(), z.record(z.string(), z.string())).optional(),
            particleConfig: z
              .object({
                count: z.number().optional(),
                shape: z.string().optional(),
                colors: z.array(z.string()).optional(),
                direction: z.string().optional(),
                speed: z.string().optional(),
                size: z
                  .object({ min: z.number().optional(), max: z.number().optional() })
                  .optional(),
                opacity: z
                  .object({ start: z.number().optional(), end: z.number().optional() })
                  .optional(),
                lifetime: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough()
      )
      .optional(),
    confidence: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return 0.5;
        return Math.max(0, Math.min(1, num));
      })
      .default(0.5),
  })
  .passthrough();

/**
 * Schema for array of components.
 */
export const DetectedComponentArraySchema = z.array(DetectedComponentSchema);
