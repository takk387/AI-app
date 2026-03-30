/**
 * Layout Validation — Inference
 *
 * Functions for inferring container layouts, migrating flat layouts
 * to hierarchical structures, and resolving root overlaps.
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { logger } from '@/utils/logger';

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

      // Preserve existing gap if the AI already measured it
      const existingGap = component.layout?.gap;

      // Assign layout
      if (isVertical) {
        const calculatedGap = existingGap || calculateGap(byTop, 'column');
        component.layout = {
          type: 'flex',
          direction: 'column',
          gap: calculatedGap,
          align: 'stretch',
          justify: 'start',
        };
        logger.info(
          `[inferContainerLayouts] ${component.id}: column layout with gap ${calculatedGap}${existingGap ? ' (preserved)' : ' (calculated)'}`
        );
      } else if (isHorizontal) {
        const calculatedGap = existingGap || calculateGap(byLeft, 'row');
        component.layout = {
          type: 'flex',
          direction: 'row',
          gap: calculatedGap,
          align: 'center',
          justify: 'start',
          wrap: true,
        };
        logger.info(
          `[inferContainerLayouts] ${component.id}: row layout with gap ${calculatedGap}${existingGap ? ' (preserved)' : ' (calculated)'}`
        );
      } else {
        // Grid or unknown - default to vertical flow to prevent collapse
        // Use existing gap if available, otherwise '0' (not hardcoded 16px)
        component.layout = {
          type: 'flex',
          direction: 'column',
          gap: existingGap || '0',
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

    // Only fix overlaps where >50% of the next section is buried (clearly broken AI output).
    // Preserve intentional overlaps like sticky headers, floating CTAs, or hero sections
    // that partially overlap the next section.
    if (next.bounds.top < currentBottom) {
      const overlapAmount = currentBottom - next.bounds.top;
      const overlapPercent = next.bounds.height > 0 ? overlapAmount / next.bounds.height : 1;

      if (overlapPercent > 0.5) {
        // Push next component down to just below the current one
        const newTop = currentBottom;

        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          logger.info(
            `[resolveRootOverlaps] Fixing ${Math.round(overlapPercent * 100)}% overlap: pushing ${next.id} down from ${next.bounds.top} to ${newTop} (overlaps ${current.id})`
          );
        }

        next.bounds.top = newTop;
      } else if (process.env.NODE_ENV === 'development') {
        logger.info(
          `[resolveRootOverlaps] Preserving intentional ${Math.round(overlapPercent * 100)}% overlap between ${current.id} and ${next.id}`
        );
      }
    }
  }

  // Reflect changes back into the main array (already done via reference, but good for clarity)
  return updatedComponents;
}
