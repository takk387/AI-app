/**
 * Layout Validation Utilities
 *
 * Provides Zod schemas and sanitization functions for DetectedComponentEnhanced
 * to ensure AI-generated layout data is valid before rendering.
 *
 * Key guarantees:
 * - Valid AI-generated bounds pass through unchanged
 * - Missing/invalid bounds get safe defaults
 * - Components with partial data are recovered, not rejected
 */

import { z } from 'zod';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default bounds for components missing bounds data.
 * Uses full-width layout at top of viewport.
 */
export const DEFAULT_BOUNDS = {
  top: 0,
  left: 0,
  width: 100,
  height: 50,
} as const;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Schema for bounds validation.
 * - Coerces string numbers to actual numbers
 * - Clamps values to valid 0-100 range
 * - Provides defaults for missing values
 */
const BoundsSchema = z
  .object({
    top: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return DEFAULT_BOUNDS.top;
        return Math.max(0, Math.min(100, num));
      })
      .default(DEFAULT_BOUNDS.top),
    left: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return DEFAULT_BOUNDS.left;
        return Math.max(0, Math.min(100, num));
      })
      .default(DEFAULT_BOUNDS.left),
    width: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num <= 0) return DEFAULT_BOUNDS.width;
        return Math.max(1, Math.min(100, num)); // Min 1 to prevent division by zero
      })
      .default(DEFAULT_BOUNDS.width),
    height: z
      .union([z.number(), z.string()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num <= 0) return DEFAULT_BOUNDS.height;
        return Math.max(1, Math.min(100, num)); // Min 1 for visibility
      })
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
    customCSS: z.record(z.string(), z.unknown()).optional(),
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
    itemCount: z.number().optional(),
    placeholder: z.string().optional(),
  })
  .passthrough()
  .optional();

/**
 * List of valid component types.
 * Falls back to 'unknown' for unrecognized types.
 */
const VALID_COMPONENT_TYPES = [
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
  'unknown',
] as const;

/**
 * Full component schema with all required fields.
 */
export const DetectedComponentSchema = z.object({
  id: z.string().min(1),
  type: z
    .string()
    .transform((val) =>
      VALID_COMPONENT_TYPES.includes(val as (typeof VALID_COMPONENT_TYPES)[number])
        ? val
        : 'unknown'
    ),
  bounds: BoundsSchema,
  style: StyleSchema,
  content: ContentSchema,
  parentId: z.string().optional(),
  children: z.array(z.string()).optional(),
  zIndex: z.number().optional(),
  navigatesTo: z.string().optional(),
  isNavigationItem: z.boolean().optional(),
  isInteractive: z.boolean().optional(),
  confidence: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return 0.5;
      return Math.max(0, Math.min(1, num));
    })
    .default(0.5),
});

/**
 * Schema for array of components.
 */
export const DetectedComponentArraySchema = z.array(DetectedComponentSchema);

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

export interface SanitizationResult {
  components: DetectedComponentEnhanced[];
  sanitized: number;
  errors: string[];
}

/**
 * Sanitize a single component, ensuring valid bounds.
 * Attempts to recover partial data rather than rejecting.
 */
export function sanitizeComponent(
  component: unknown,
  index: number
): { component: DetectedComponentEnhanced | null; error?: string } {
  // Handle null/undefined
  if (component === null || component === undefined) {
    return {
      component: null,
      error: `Component at index ${index} is null/undefined`,
    };
  }

  // Handle non-object types
  if (typeof component !== 'object') {
    return {
      component: null,
      error: `Component at index ${index} is not an object (got ${typeof component})`,
    };
  }

  const obj = component as Record<string, unknown>;

  try {
    // Try strict validation first
    const parsed = DetectedComponentSchema.parse(component);
    return { component: parsed as DetectedComponentEnhanced };
  } catch {
    // Attempt partial recovery
    try {
      // Generate ID if missing
      const id =
        typeof obj.id === 'string' && obj.id.trim() ? obj.id : `component-${index}-${Date.now()}`;

      // Extract type with fallback - cast to valid type
      const rawType = typeof obj.type === 'string' ? obj.type : 'unknown';
      const type = VALID_COMPONENT_TYPES.includes(rawType as (typeof VALID_COMPONENT_TYPES)[number])
        ? (rawType as DetectedComponentEnhanced['type'])
        : 'unknown';

      // Extract bounds with deep fallbacks
      const rawBounds = obj.bounds as Record<string, unknown> | undefined;
      const bounds = {
        top: safeNumber(rawBounds?.top, DEFAULT_BOUNDS.top),
        left: safeNumber(rawBounds?.left, DEFAULT_BOUNDS.left),
        width: safeNumber(rawBounds?.width, DEFAULT_BOUNDS.width, 1),
        height: safeNumber(rawBounds?.height, DEFAULT_BOUNDS.height, 1),
      };

      // Extract style with fallback
      const style = typeof obj.style === 'object' && obj.style !== null ? obj.style : {};

      // Extract content with fallback
      const content =
        typeof obj.content === 'object' && obj.content !== null ? obj.content : undefined;

      // Build recovered component
      const recovered: DetectedComponentEnhanced = {
        id,
        type,
        bounds,
        style: style as DetectedComponentEnhanced['style'],
        content: content as DetectedComponentEnhanced['content'],
        confidence: safeNumber(obj.confidence, 0.3),
        parentId: typeof obj.parentId === 'string' ? obj.parentId : undefined,
        children: Array.isArray(obj.children)
          ? obj.children.filter((c) => typeof c === 'string')
          : undefined,
        zIndex: typeof obj.zIndex === 'number' ? obj.zIndex : undefined,
        navigatesTo: typeof obj.navigatesTo === 'string' ? obj.navigatesTo : undefined,
        isNavigationItem:
          typeof obj.isNavigationItem === 'boolean' ? obj.isNavigationItem : undefined,
        isInteractive: typeof obj.isInteractive === 'boolean' ? obj.isInteractive : undefined,
      };

      return {
        component: recovered,
        error: `Component "${id}" was partially recovered (missing/invalid data)`,
      };
    } catch (recoveryError) {
      return {
        component: null,
        error: `Component at index ${index} could not be recovered: ${recoveryError}`,
      };
    }
  }
}

/**
 * Sanitize an array of components from AI response.
 * Returns validated components and logs any issues.
 */
export function sanitizeComponents(data: unknown): SanitizationResult {
  const errors: string[] = [];
  const components: DetectedComponentEnhanced[] = [];
  let sanitized = 0;

  // Handle non-array input
  if (!Array.isArray(data)) {
    if (data === null || data === undefined) {
      errors.push('AI response was null/undefined');
      return { components: [], sanitized: 0, errors };
    }

    // Try to treat single object as array
    if (typeof data === 'object') {
      errors.push('AI response was single object, wrapping as array');
      data = [data];
    } else {
      errors.push(`AI response was not an array (got ${typeof data})`);
      return { components: [], sanitized: 0, errors };
    }
  }

  // Process each component
  (data as unknown[]).forEach((item, index) => {
    const result = sanitizeComponent(item, index);
    if (result.component) {
      components.push(result.component);
      if (result.error) {
        errors.push(result.error);
        sanitized++;
      }
    } else if (result.error) {
      errors.push(result.error);
    }
  });

  // Log sanitization results in development
  if ((sanitized > 0 || errors.length > 0) && process.env.NODE_ENV !== 'production') {
    console.warn('[layoutValidation] Sanitization results:', {
      total: (data as unknown[]).length,
      valid: components.length,
      sanitized,
      errors,
    });
  }

  return { components, sanitized, errors };
}

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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely convert a value to a number with bounds checking.
 */
function safeNumber(
  value: unknown,
  defaultValue: number,
  minValue: number = 0,
  maxValue: number = 100
): number {
  if (value === null || value === undefined) return defaultValue;

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num)) return defaultValue;

  return Math.max(minValue, Math.min(maxValue, num));
}
