import type { UISpecNode } from '@/types/schema';

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectedElementInfo {
  id: string;
  type: string;
  bounds: ElementBounds;
  currentProperties: Record<string, unknown>;
  allowedActions: string[];
}

/**
 * Find a node in the LayoutManifest tree by ID
 */
export function findNodeById(root: UISpecNode, id: string): UISpecNode | null {
  if (root.id === id) return root;

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Create selection info for the UI
 */
export function createSelectionInfo(node: UISpecNode): SelectedElementInfo {
  return {
    id: node.id,
    type: node.type,
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    currentProperties: node.attributes || {},
    allowedActions: ['edit', 'delete', 'duplicate', 'move'],
  };
}

/**
 * Get element bounds relative to container
 */
export function getElementBoundsRelative(
  element: HTMLElement,
  container: HTMLElement
): ElementBounds {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return {
    x: elementRect.left - containerRect.left,
    y: elementRect.top - containerRect.top,
    width: elementRect.width,
    height: elementRect.height,
  };
}
