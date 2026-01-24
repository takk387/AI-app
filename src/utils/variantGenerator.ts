import type { UISpecNode } from '@/types/schema';

/**
 * Generate variants of a UI node
 */
export function generateNodeVariants(node: UISpecNode): UISpecNode[] {
  const variants: UISpecNode[] = [];

  // Variant 1: Outline style (for buttons)
  if (node.type === 'button') {
    variants.push({
      ...node,
      id: `${node.id}-variant-outline`,
      styles: {
        ...node.styles,
        tailwindClasses: `${node.styles?.tailwindClasses || ''} border border-current bg-transparent`,
      },
    });
  }

  // Variant 2: Shadow style
  variants.push({
    ...node,
    id: `${node.id}-variant-shadow`,
    styles: {
      ...node.styles,
      tailwindClasses: `${node.styles?.tailwindClasses || ''} shadow-lg`,
    },
  });

  return variants;
}
