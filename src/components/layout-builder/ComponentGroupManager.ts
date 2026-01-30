/**
 * Component Group Manager
 *
 * Pure utility functions for grouping, ungrouping, and reparenting components.
 * No side effects — takes components in, returns transformed components out.
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';

/**
 * Group selected components under a new container.
 * Creates a new parent container whose bounds encompass all selected components,
 * then re-parents the selected components as its children.
 */
export function groupComponents(
  ids: string[],
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  if (ids.length < 2) return components;

  const selected = components.filter((c) => ids.includes(c.id));
  if (selected.length < 2) return components;

  // Calculate bounding box that encompasses all selected components
  const groupBounds = calculateEncompassingBounds(selected);

  // Generate unique group ID
  const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Determine common parent (if all share one) or use null (root)
  const parentIds = [...new Set(selected.map((c) => c.parentId).filter(Boolean))];
  const commonParentId = parentIds.length === 1 ? parentIds[0] : undefined;

  // Create the group container
  const groupContainer: DetectedComponentEnhanced = {
    id: groupId,
    type: 'content-section',
    bounds: groupBounds,
    style: {},
    role: 'container',
    parentId: commonParentId,
    children: ids,
    layout: {
      type: 'flex',
      direction: 'column',
      gap: '0px',
    },
    displayName: 'Group',
    confidence: 1,
  };

  // Collect all old parent IDs that need their children arrays cleaned up
  const selectedParentIds = new Set(
    selected.map((c) => c.parentId).filter((pid): pid is string => pid != null)
  );

  // Update the selected components: set their parentId to the new group
  const updated = components.map((c) => {
    if (ids.includes(c.id)) {
      return { ...c, parentId: groupId, groupId };
    }
    // Clean up old parents' children arrays
    if (c.children && selectedParentIds.has(c.id)) {
      const cleanedChildren = c.children.filter((childId) => !ids.includes(childId));
      // If this is the common parent, also add the new group as its child
      if (c.id === commonParentId) {
        return { ...c, children: [...cleanedChildren, groupId] };
      }
      return { ...c, children: cleanedChildren };
    }
    return c;
  });

  return [groupContainer, ...updated];
}

/**
 * Dissolve a group container, re-parenting its children to the group's parent.
 */
export function ungroupComponent(
  groupId: string,
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  const group = components.find((c) => c.id === groupId);
  if (!group || !group.children?.length) return components;

  const childIds = group.children;
  const grandParentId = group.parentId;

  return components
    .filter((c) => c.id !== groupId) // Remove the group container
    .map((c) => {
      // Re-parent children to grandparent
      if (childIds.includes(c.id)) {
        return { ...c, parentId: grandParentId, groupId: undefined };
      }
      // Update grandparent's children list
      if (c.id === grandParentId && c.children) {
        return {
          ...c,
          children: [...c.children.filter((id) => id !== groupId), ...childIds],
        };
      }
      return c;
    });
}

/**
 * Move a component to a new parent (or root if newParentId is null).
 */
export function reparentComponent(
  componentId: string,
  newParentId: string | null,
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  const component = components.find((c) => c.id === componentId);
  if (!component) return components;

  const oldParentId = component.parentId;

  return components.map((c) => {
    // Update the component's parentId
    if (c.id === componentId) {
      return { ...c, parentId: newParentId ?? undefined };
    }
    // Remove from old parent's children
    if (c.id === oldParentId && c.children) {
      return {
        ...c,
        children: c.children.filter((id) => id !== componentId),
      };
    }
    // Add to new parent's children
    if (c.id === newParentId && c.children) {
      return {
        ...c,
        children: [...c.children, componentId],
      };
    }
    if (c.id === newParentId && !c.children) {
      return {
        ...c,
        children: [componentId],
        role: 'container' as const,
      };
    }
    return c;
  });
}

/**
 * Calculate bounds that encompass all given components.
 */
function calculateEncompassingBounds(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced['bounds'] {
  let minTop = Infinity;
  let minLeft = Infinity;
  let maxBottom = -Infinity;
  let maxRight = -Infinity;

  for (const c of components) {
    const { top, left, width, height } = c.bounds;
    minTop = Math.min(minTop, top);
    minLeft = Math.min(minLeft, left);
    maxBottom = Math.max(maxBottom, top + height);
    maxRight = Math.max(maxRight, left + width);
  }

  return {
    top: minTop,
    left: minLeft,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  };
}
