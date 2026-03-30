/**
 * Layout Validation — Hierarchy
 *
 * Parent-child relationship validation, tree building, and orphan repair.
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';

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
