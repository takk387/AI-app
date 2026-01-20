import type { UISpecNode, LayoutManifest, ComponentType } from '@/types/schema';

/**
 * Component types that map to HTML void elements.
 * In Engine.tsx: 'image' -> 'img', 'input' -> 'input'
 * Void elements cannot have children per HTML spec.
 */
export const VOID_ELEMENT_TYPES: readonly ComponentType[] = ['image', 'input'] as const;

/**
 * Full list of HTML void tags for reference.
 * Used by Engine.tsx for runtime rendering decisions.
 */
export const HTML_VOID_TAGS = [
  'img', 'input', 'br', 'hr', 'meta', 'link',
  'area', 'base', 'col', 'embed', 'source', 'track', 'wbr',
] as const;

export interface SanitizeResult {
  node: UISpecNode;
  removedChildrenCount: number;
}

export interface ManifestSanitizeResult {
  manifest: LayoutManifest;
  totalRemovedChildren: number;
  affectedNodes: string[];
}

/**
 * Check if a node type is a void element type.
 */
function isVoidElementType(type: ComponentType): boolean {
  return VOID_ELEMENT_TYPES.includes(type);
}

/**
 * Count all nodes in a children array recursively.
 */
function countAllChildren(children: UISpecNode[]): number {
  return children.reduce((count, child) => {
    if (!child) return count;
    return count + 1 + (child.children ? countAllChildren(child.children) : 0);
  }, 0);
}

/**
 * Recursively sanitize a UISpecNode tree, removing children from void elements.
 *
 * @param node - The node to sanitize
 * @returns SanitizeResult with the sanitized node and count of removed children
 */
export function sanitizeNode(node: UISpecNode): SanitizeResult {
  let removedChildrenCount = 0;
  const isVoid = isVoidElementType(node.type);

  // Count children being removed from void elements
  if (isVoid && node.children && node.children.length > 0) {
    removedChildrenCount = countAllChildren(node.children);
  }

  // Recursively sanitize children (only for non-void elements)
  let sanitizedChildren: UISpecNode[] | undefined;
  if (!isVoid && node.children && node.children.length > 0) {
    sanitizedChildren = node.children.map((child) => {
      const result = sanitizeNode(child);
      removedChildrenCount += result.removedChildrenCount;
      return result.node;
    });
  }

  return {
    node: {
      ...node,
      children: isVoid ? undefined : sanitizedChildren,
    },
    removedChildrenCount,
  };
}

/**
 * Sanitize an entire LayoutManifest, processing root and all definitions.
 *
 * @param manifest - The manifest to sanitize
 * @returns ManifestSanitizeResult with sanitized manifest and statistics
 */
export function sanitizeManifest(manifest: LayoutManifest): ManifestSanitizeResult {
  const affectedNodes: string[] = [];
  let totalRemovedChildren = 0;

  // Helper to track affected nodes during sanitization
  const trackAndSanitize = (node: UISpecNode | null | undefined): UISpecNode | null => {
    if (!node) return null;
    const isVoid = isVoidElementType(node.type);

    if (isVoid && node.children && node.children.length > 0) {
      affectedNodes.push(node.id);
    }

    const result = sanitizeNode(node);
    totalRemovedChildren += result.removedChildrenCount;
    return result.node;
  };

  // Sanitize root (root should never be null in a valid manifest)
  const sanitizedRoot = trackAndSanitize(manifest.root) ?? manifest.root;

  // Sanitize definitions (handle missing definitions object)
  const sanitizedDefinitions: Record<string, UISpecNode> = {};
  if (manifest.definitions) {
    for (const [key, node] of Object.entries(manifest.definitions)) {
      if (!node) continue;
      const sanitized = trackAndSanitize(node);
      if (sanitized) {
        sanitizedDefinitions[key] = sanitized;
      }
    }
  }

  return {
    manifest: {
      ...manifest,
      root: sanitizedRoot,
      definitions: sanitizedDefinitions,
    },
    totalRemovedChildren,
    affectedNodes,
  };
}

/**
 * Quick check if a manifest has void element violations.
 * Useful for validation without modifying the manifest.
 */
export function hasVoidElementViolations(manifest: LayoutManifest): boolean {
  const checkNode = (node: UISpecNode | null | undefined): boolean => {
    if (!node) return false;
    if (isVoidElementType(node.type) && node.children && node.children.length > 0) {
      return true;
    }
    return node.children?.filter(Boolean).some(checkNode) ?? false;
  };

  if (checkNode(manifest.root)) return true;
  return Object.values(manifest.definitions ?? {}).filter(Boolean).some(checkNode);
}
