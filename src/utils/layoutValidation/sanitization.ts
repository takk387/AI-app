/**
 * Layout Validation — Sanitization
 *
 * Sanitization functions for DetectedComponentEnhanced components.
 * Attempts to recover partial data rather than rejecting.
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { logger } from '@/utils/logger';
import { DEFAULT_BOUNDS, DetectedComponentSchema, VALID_ROLES } from './schemas';
import { safeNumber } from './rendering';

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

      // Extract type with fallback - keep original type even if not in known list
      const rawType = typeof obj.type === 'string' ? obj.type : 'unknown';
      const type = rawType as DetectedComponentEnhanced['type'];

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

      // Extract role with validation (use VALID_ROLES, not hardcoded subset)
      const rawRole = typeof obj.role === 'string' ? obj.role : undefined;
      const role =
        rawRole && VALID_ROLES.includes(rawRole as (typeof VALID_ROLES)[number])
          ? (rawRole as (typeof VALID_ROLES)[number])
          : undefined;

      // Extract layout configuration
      const rawLayout = obj.layout as Record<string, unknown> | undefined;
      const layout =
        rawLayout && typeof rawLayout === 'object' && rawLayout.type
          ? {
              type: rawLayout.type as 'flex' | 'grid' | 'none' | 'absolute' | 'block',
              direction: rawLayout.direction as 'row' | 'column' | undefined,
              gap: typeof rawLayout.gap === 'string' ? rawLayout.gap : undefined,
              justify: rawLayout.justify as
                | 'start'
                | 'center'
                | 'end'
                | 'between'
                | 'around'
                | 'evenly'
                | undefined,
              align: rawLayout.align as 'start' | 'center' | 'end' | 'stretch' | undefined,
              wrap: typeof rawLayout.wrap === 'boolean' ? rawLayout.wrap : undefined,
              columns: typeof rawLayout.columns === 'string' ? rawLayout.columns : undefined,
            }
          : undefined;

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
        role,
        layout,
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
    logger.warn('[layoutValidation] Sanitization results', {
      total: (data as unknown[]).length,
      valid: components.length,
      sanitized,
      errors,
    });
  }

  return { components, sanitized, errors };
}
