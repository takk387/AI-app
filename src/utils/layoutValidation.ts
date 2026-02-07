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
 * Uses smaller defaults to prevent full-width stacking.
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
function toPercentage(val: number | string, defaultVal: number): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return defaultVal;
  return Math.max(0, Math.min(100, num));
}

/**
 * Helper for width/height - ensures minimum value for visibility.
 * Clamps to min-100 range. Scale normalization handled upstream.
 */
function toPercentageWithMin(val: number | string, defaultVal: number, min: number = 1): number {
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
const VALID_ROLES = [
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
 * Handles both 0-100 (percentage) and 0-1000 (normalized) scales.
 * Values > 100 are assumed to be 0-1000 scale and converted to percentage.
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

  // Convert 0-1000 scale to percentage if value > 100
  const converted = num > 100 ? num / 10 : num;

  return Math.max(minValue, Math.min(maxValue, converted));
}

// ============================================================================
// HIERARCHY VALIDATION FUNCTIONS
// ============================================================================

/**
 * Result of hierarchy validation
 */
export interface HierarchyValidationResult {
  /** Whether the hierarchy is valid */
  valid: boolean;
  /** Components with no parent that should have one */
  orphans: string[];
  /** Components referencing non-existent parents */
  missingParents: string[];
  /** Components involved in circular references */
  circularRefs: string[];
}

/**
 * Result of building a component tree
 */
export interface ComponentTreeResult {
  /** Root components (no parentId) */
  roots: DetectedComponentEnhanced[];
  /** Map of all components by ID for quick lookup */
  componentMap: Map<string, DetectedComponentEnhanced>;
}

/**
 * Validate parent-child relationships in component hierarchy.
 * Checks for orphans, missing parents, and circular references.
 */
export function validateHierarchy(
  components: DetectedComponentEnhanced[]
): HierarchyValidationResult {
  const result: HierarchyValidationResult = {
    valid: true,
    orphans: [],
    missingParents: [],
    circularRefs: [],
  };

  // Build ID set for quick lookup
  const componentIds = new Set(components.map((c) => c.id));

  // Container types that should have children
  const containerTypes = new Set([
    'header',
    'sidebar',
    'hero',
    'section',
    'container',
    'cards',
    'navigation',
    'footer',
    'form',
  ]);

  for (const component of components) {
    // Check for missing parent references
    if (component.parentId && !componentIds.has(component.parentId)) {
      result.missingParents.push(component.id);
      result.valid = false;
    }

    // Check for potential orphans (leaf-like components without parents)
    // Skip root section types which are expected to have no parent
    const isRootType = containerTypes.has(component.type);
    if (!component.parentId && !isRootType && component.role !== 'overlay') {
      // This might be an orphan - a leaf without a parent
      result.orphans.push(component.id);
    }
  }

  // Check for circular references
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectCycle(id: string): boolean {
    if (inStack.has(id)) return true;
    if (visited.has(id)) return false;

    visited.add(id);
    inStack.add(id);

    const component = components.find((c) => c.id === id);
    if (component?.parentId) {
      if (detectCycle(component.parentId)) {
        result.circularRefs.push(id);
        result.valid = false;
        return true;
      }
    }

    inStack.delete(id);
    return false;
  }

  for (const component of components) {
    detectCycle(component.id);
  }

  return result;
}

/**
 * Build a component tree from a flat array of components.
 * Returns root components and a map for quick lookup.
 * Works with both hierarchical and flat (legacy) layouts.
 */
export function buildComponentTree(components: DetectedComponentEnhanced[]): ComponentTreeResult {
  const componentMap = new Map<string, DetectedComponentEnhanced>();
  const roots: DetectedComponentEnhanced[] = [];

  // First pass: build the map
  for (const component of components) {
    componentMap.set(component.id, component);
  }

  // Second pass: identify roots (components without parentId)
  for (const component of components) {
    if (!component.parentId) {
      roots.push(component);
    }
  }

  // If no hierarchy exists (legacy flat layout), treat all as roots
  if (roots.length === 0 && components.length > 0) {
    // All components are roots in flat layouts
    return { roots: [...components], componentMap };
  }

  return { roots, componentMap };
}

/**
 * Repair orphan components by attaching them to the nearest container.
 * Uses bounds containment to determine parent relationships.
 */
export function repairOrphans(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  const validation = validateHierarchy(components);

  // If no orphans, return as-is
  if (validation.orphans.length === 0) {
    return components;
  }

  // Find all container components
  const containerTypes = new Set([
    'header',
    'sidebar',
    'hero',
    'section',
    'container',
    'cards',
    'navigation',
    'footer',
    'form',
  ]);

  const containers = components.filter((c) => containerTypes.has(c.type) || c.role === 'container');

  // Create a mutable copy
  const repairedComponents = components.map((c) => ({ ...c }));
  const componentMap = new Map(repairedComponents.map((c) => [c.id, c]));

  // For each orphan, find the best container
  for (const orphanId of validation.orphans) {
    const orphan = componentMap.get(orphanId);
    if (!orphan) continue;

    // Find container that best contains this orphan
    let bestContainer: DetectedComponentEnhanced | null = null;
    let bestScore = -1;

    for (const container of containers) {
      // Skip self
      if (container.id === orphanId) continue;

      // Check if orphan bounds are within container bounds
      const ob = orphan.bounds;
      const cb = container.bounds;

      // Calculate containment score
      const horizontalOverlap = Math.max(
        0,
        Math.min(ob.left + ob.width, cb.left + cb.width) - Math.max(ob.left, cb.left)
      );
      const verticalOverlap = Math.max(
        0,
        Math.min(ob.top + ob.height, cb.top + cb.height) - Math.max(ob.top, cb.top)
      );

      const overlapArea = horizontalOverlap * verticalOverlap;
      const orphanArea = ob.width * ob.height || 1;
      const containmentScore = overlapArea / orphanArea;

      // Prefer containers that fully contain the orphan
      if (containmentScore > bestScore && containmentScore > 0.5) {
        bestScore = containmentScore;
        bestContainer = container;
      }
    }

    // Attach orphan to best container
    if (bestContainer) {
      orphan.parentId = bestContainer.id;

      // Update container's children array
      const containerInMap = componentMap.get(bestContainer.id);
      if (containerInMap) {
        if (!containerInMap.children) {
          containerInMap.children = [];
        }
        if (!containerInMap.children.includes(orphanId)) {
          containerInMap.children.push(orphanId);
        }
      }
    }
  }

  return repairedComponents;
}

/**
 * Migrate a flat layout to hierarchical structure.
 * Infers parent-child relationships from bounds containment.
 */
/**
 * Infer layout configuration for containers that are missing it.
 * Analyzes child positions to determine if they look like a Row (flex-row), Column (flex-col), or Grid.
 */
export function inferContainerLayouts(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  // Create mutable copy
  const updatedComponents = components.map((c) => ({ ...c }));
  const componentMap = new Map(updatedComponents.map((c) => [c.id, c]));

  // Process all containers
  for (const component of updatedComponents) {
    if (
      (component.role === 'container' || (component.children && component.children.length > 0)) &&
      (!component.layout || component.layout.type === 'none')
    ) {
      const children = (component.children || [])
        .map((id) => componentMap.get(id))
        .filter((c): c is DetectedComponentEnhanced => !!c);

      if (children.length === 0) continue;

      // Analyze children bounds to guess layout
      // Sort children by top/left
      const byTop = [...children].sort((a, b) => a.bounds.top - b.bounds.top);
      const byLeft = [...children].sort((a, b) => a.bounds.left - b.bounds.left);

      // Check vertical stacking (Column)
      // Check if items essentially stack on top of each other
      let isVertical = true;
      for (let i = 0; i < byTop.length - 1; i++) {
        const current = byTop[i];
        const next = byTop[i + 1];
        // If there's significant horizontal overlap, they might be stacked vertically
        // But if they are side-by-side (no vertical overlap), it's not a purely vertical stack
        if (current.bounds.top + current.bounds.height <= next.bounds.top + 5) {
          // Clean vertical gap
        } else {
          // Check horizontal alignment
          const horizontalOverlap = Math.max(
            0,
            Math.min(
              current.bounds.left + current.bounds.width,
              next.bounds.left + next.bounds.width
            ) - Math.max(current.bounds.left, next.bounds.left)
          );
          if (horizontalOverlap < Math.min(current.bounds.width, next.bounds.width) * 0.5) {
            // Not enough horizontal overlap to be considered a column
            isVertical = false;
            break;
          }
        }
      }

      // Check horizontal arrangement (Row)
      // Similar logic for row
      let isHorizontal = true;
      for (let i = 0; i < byLeft.length - 1; i++) {
        const current = byLeft[i];
        const next = byLeft[i + 1];

        if (current.bounds.left + current.bounds.width <= next.bounds.left + 5) {
          // Clean horizontal gap
        } else {
          const verticalOverlap = Math.max(
            0,
            Math.min(
              current.bounds.top + current.bounds.height,
              next.bounds.top + next.bounds.height
            ) - Math.max(current.bounds.top, next.bounds.top)
          );
          if (verticalOverlap < Math.min(current.bounds.height, next.bounds.height) * 0.5) {
            isHorizontal = false;
            break;
          }
        }
      }

      // Calculate actual gap from child positions instead of hardcoding
      const calculateGap = (
        sortedChildren: DetectedComponentEnhanced[],
        direction: 'row' | 'column'
      ): string => {
        if (sortedChildren.length < 2) return '0';
        const gaps: number[] = [];
        for (let i = 0; i < sortedChildren.length - 1; i++) {
          const current = sortedChildren[i];
          const next = sortedChildren[i + 1];
          if (direction === 'column') {
            // Vertical gap = next.top - (current.top + current.height)
            const gap = next.bounds.top - (current.bounds.top + current.bounds.height);
            if (gap > 0) gaps.push(gap);
          } else {
            // Horizontal gap = next.left - (current.left + current.width)
            const gap = next.bounds.left - (current.bounds.left + current.bounds.width);
            if (gap > 0) gaps.push(gap);
          }
        }
        if (gaps.length === 0) return '0';
        // Use the average gap, rounded to nearest pixel
        const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
        return `${avgGap}px`;
      };

      // Assign layout
      if (isVertical) {
        const calculatedGap = calculateGap(byTop, 'column');
        component.layout = {
          type: 'flex',
          direction: 'column',
          gap: calculatedGap, // Calculated from actual child positions
          align: 'stretch',
          justify: 'start',
        };
        console.log(
          `[inferContainerLayouts] ${component.id}: column layout with gap ${calculatedGap}`
        );
      } else if (isHorizontal) {
        const calculatedGap = calculateGap(byLeft, 'row');
        component.layout = {
          type: 'flex',
          direction: 'row',
          gap: calculatedGap, // Calculated from actual child positions
          align: 'center',
          justify: 'start',
          wrap: true,
        };
        console.log(
          `[inferContainerLayouts] ${component.id}: row layout with gap ${calculatedGap}`
        );
      } else {
        // Grid or unknown - default to vertical flow to prevent collapse, but grid is safer for mixed
        // For now, let's fallback to relative flow (defaults to block/vertical in CSS)
        // by setting a generic column layout unless explicitly grid
        component.layout = {
          type: 'flex',
          direction: 'column',
          gap: '16px',
        };
      }
    }
  }

  return updatedComponents;
}

/**
 * Migrate a flat layout to hierarchical structure.
 * Infers parent-child relationships from bounds containment AND infers layout types.
 */
export function migrateToHierarchical(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  // If already hierarchical, return as-is
  const hasHierarchy = components.some((c) => c.parentId || (c.children && c.children.length > 0));
  if (hasHierarchy) {
    // Even if hierarchy exists, we might need to infer layout if missing
    return inferContainerLayouts(components);
  }

  // Container types that can have children
  const containerTypes = new Set([
    'header',
    'sidebar',
    'hero',
    'section',
    'container',
    'cards',
    'navigation',
    'footer',
    'form',
  ]);

  // Create mutable copies with role assignment
  const migratedComponents = components.map((c) => ({
    ...c,
    role: containerTypes.has(c.type) ? ('container' as const) : ('leaf' as const),
    children: containerTypes.has(c.type) ? ([] as string[]) : undefined,
  }));

  // Sort by area (largest first) to process containers before leaves
  const sortedByArea = [...migratedComponents].sort((a, b) => {
    const areaA = a.bounds.width * a.bounds.height;
    const areaB = b.bounds.width * b.bounds.height;
    return areaB - areaA;
  });

  // For each leaf, find containing parent
  for (const component of migratedComponents) {
    if (component.role === 'container') continue;

    // Find smallest container that fully contains this component
    let bestParent: (typeof migratedComponents)[0] | null = null;
    let bestArea = Infinity;

    for (const potential of sortedByArea) {
      if (potential.id === component.id) continue;
      if (potential.role !== 'container') continue;

      const pb = potential.bounds;
      const cb = component.bounds;

      // Check containment
      const isContained =
        cb.left >= pb.left - 1 &&
        cb.top >= pb.top - 1 &&
        cb.left + cb.width <= pb.left + pb.width + 1 &&
        cb.top + cb.height <= pb.top + pb.height + 1;

      if (isContained) {
        const area = pb.width * pb.height;
        if (area < bestArea) {
          bestArea = area;
          bestParent = potential;
        }
      }
    }

    if (bestParent) {
      component.parentId = bestParent.id;
      if (!bestParent.children) bestParent.children = [];
      bestParent.children.push(component.id);
    }
  }

  // Final Pass: Infer layout strategies for all containers
  return inferContainerLayouts(migratedComponents);
}

/**
 * Resolve overlaps between root components by stacking them vertically.
 * This ensures that sections like Header, Hero, Features, and Footer don't pile on top of each other.
 */
export function resolveRootOverlaps(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  // Create mutable copy
  const updatedComponents = components.map((c) => ({ ...c }));

  // 1. Identify root components (parentId == null/undefined)
  const roots = updatedComponents.filter((c) => !c.parentId);

  if (roots.length < 2) return updatedComponents;

  // 2. Sort by bounds.top to process in visual order
  roots.sort((a, b) => a.bounds.top - b.bounds.top);

  // 3. Walk sorted list and resolve overlaps
  // We skip the first one (anchored at top) and adjust subsequent ones
  for (let i = 0; i < roots.length - 1; i++) {
    const current = roots[i];
    const next = roots[i + 1];

    // Skip sidebar detection: if any root has left > 5 or width < 90,
    // it may be a sidebar or overlay — skip pushing those down
    // (Assuming 0-100 percentage scale)
    if (next.bounds.left > 5 || next.bounds.width < 90) {
      continue;
    }

    // Calculate where the current component ends
    const currentBottom = current.bounds.top + current.bounds.height;

    // Only fix actual overlaps — don't inject artificial gaps that distort measured positions
    if (next.bounds.top < currentBottom) {
      // Push next component down to just below the current one
      const newTop = currentBottom;

      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[resolveRootOverlaps] Pushing ${next.id} down from ${next.bounds.top} to ${newTop} (overlaps ${current.id})`
        );
      }

      next.bounds.top = newTop;

      // Important: Since we modified 'next', subsequent iterations will use its NEW top
      // to calculate the position of the one after it.
    }
  }

  // Reflect changes back into the main array (already done via reference, but good for clarity)
  return updatedComponents;
}
