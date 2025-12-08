/**
 * Layer Utilities
 *
 * Utilities for managing z-index layers and layer ordering.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LayerDefinition {
  id: string;
  name: string;
  zIndex: number;
  group: LayerGroup;
  visible: boolean;
  locked: boolean;
  description?: string;
  cssVariable?: string;
}

export type LayerGroup = 'base' | 'content' | 'overlay' | 'modal' | 'toast' | 'tooltip';

export interface ZIndexScale {
  base: number;
  content: number;
  dropdown: number;
  sticky: number;
  overlay: number;
  modal: number;
  toast: number;
  tooltip: number;
  max: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_Z_INDEX_SCALE: ZIndexScale = {
  base: 0,
  content: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
  max: 9999,
};

export const LAYER_GROUP_INFO: Record<
  LayerGroup,
  { name: string; color: string; zRange: [number, number] }
> = {
  base: { name: 'Base', color: '#64748B', zRange: [0, 9] },
  content: { name: 'Content', color: '#3B82F6', zRange: [1, 9] },
  overlay: { name: 'Overlay', color: '#8B5CF6', zRange: [30, 39] },
  modal: { name: 'Modal', color: '#EC4899', zRange: [40, 49] },
  toast: { name: 'Toast', color: '#F59E0B', zRange: [50, 59] },
  tooltip: { name: 'Tooltip', color: '#10B981', zRange: [60, 99] },
};

export const DEFAULT_LAYERS: LayerDefinition[] = [
  // Base layers
  {
    id: 'background',
    name: 'Background',
    zIndex: 0,
    group: 'base',
    visible: true,
    locked: false,
    cssVariable: '--z-background',
  },
  {
    id: 'content',
    name: 'Content',
    zIndex: 1,
    group: 'content',
    visible: true,
    locked: false,
    cssVariable: '--z-content',
  },

  // Interactive overlays
  {
    id: 'dropdown',
    name: 'Dropdowns',
    zIndex: 10,
    group: 'content',
    visible: true,
    locked: false,
    cssVariable: '--z-dropdown',
  },
  {
    id: 'sticky',
    name: 'Sticky Elements',
    zIndex: 20,
    group: 'content',
    visible: true,
    locked: false,
    cssVariable: '--z-sticky',
  },

  // Full overlays
  {
    id: 'overlay',
    name: 'Overlay',
    zIndex: 30,
    group: 'overlay',
    visible: true,
    locked: false,
    cssVariable: '--z-overlay',
  },
  {
    id: 'sidebar-overlay',
    name: 'Sidebar Overlay',
    zIndex: 31,
    group: 'overlay',
    visible: true,
    locked: false,
    cssVariable: '--z-sidebar-overlay',
  },

  // Modals
  {
    id: 'modal',
    name: 'Modal',
    zIndex: 40,
    group: 'modal',
    visible: true,
    locked: false,
    cssVariable: '--z-modal',
  },
  {
    id: 'modal-overlay',
    name: 'Modal Overlay',
    zIndex: 39,
    group: 'modal',
    visible: true,
    locked: false,
    cssVariable: '--z-modal-overlay',
  },

  // Notifications
  {
    id: 'toast',
    name: 'Toast',
    zIndex: 50,
    group: 'toast',
    visible: true,
    locked: false,
    cssVariable: '--z-toast',
  },

  // Tooltips (highest)
  {
    id: 'tooltip',
    name: 'Tooltip',
    zIndex: 60,
    group: 'tooltip',
    visible: true,
    locked: false,
    cssVariable: '--z-tooltip',
  },
  {
    id: 'popover',
    name: 'Popover',
    zIndex: 61,
    group: 'tooltip',
    visible: true,
    locked: false,
    cssVariable: '--z-popover',
  },
];

// ============================================================================
// LAYER OPERATIONS
// ============================================================================

/**
 * Sort layers by z-index (descending - highest first)
 */
export function sortLayersByZIndex(layers: LayerDefinition[]): LayerDefinition[] {
  return [...layers].sort((a, b) => b.zIndex - a.zIndex);
}

/**
 * Sort layers by z-index (ascending - lowest first)
 */
export function sortLayersByZIndexAsc(layers: LayerDefinition[]): LayerDefinition[] {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Group layers by their group type
 */
export function groupLayers(layers: LayerDefinition[]): Map<LayerGroup, LayerDefinition[]> {
  const grouped = new Map<LayerGroup, LayerDefinition[]>();

  for (const layer of layers) {
    const existing = grouped.get(layer.group) || [];
    grouped.set(layer.group, [...existing, layer]);
  }

  // Sort each group by z-index
  for (const [group, groupLayers] of grouped) {
    grouped.set(group, sortLayersByZIndex(groupLayers));
  }

  return grouped;
}

/**
 * Move a layer to a new position (reorder)
 */
export function reorderLayers(
  layers: LayerDefinition[],
  fromIndex: number,
  toIndex: number
): LayerDefinition[] {
  const result = [...layers];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  // Reassign z-indices based on new order
  return result.map((layer, index) => ({
    ...layer,
    zIndex: calculateZIndexForPosition(layer.group, index, result.length),
  }));
}

/**
 * Calculate z-index for a position within a group
 */
function calculateZIndexForPosition(group: LayerGroup, position: number, total: number): number {
  const { zRange } = LAYER_GROUP_INFO[group];
  const [min, max] = zRange;
  const step = Math.floor((max - min) / Math.max(total, 1));
  return min + position * step;
}

/**
 * Add a new layer
 */
export function addLayer(
  layers: LayerDefinition[],
  layer: Omit<LayerDefinition, 'id'>
): LayerDefinition[] {
  const newLayer: LayerDefinition = {
    ...layer,
    id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  return sortLayersByZIndex([...layers, newLayer]);
}

/**
 * Remove a layer
 */
export function removeLayer(layers: LayerDefinition[], layerId: string): LayerDefinition[] {
  return layers.filter((layer) => layer.id !== layerId);
}

/**
 * Update a layer
 */
export function updateLayer(
  layers: LayerDefinition[],
  layerId: string,
  updates: Partial<LayerDefinition>
): LayerDefinition[] {
  return layers.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer));
}

/**
 * Toggle layer visibility
 */
export function toggleLayerVisibility(
  layers: LayerDefinition[],
  layerId: string
): LayerDefinition[] {
  return updateLayer(layers, layerId, {
    visible: !layers.find((l) => l.id === layerId)?.visible,
  });
}

/**
 * Toggle layer lock
 */
export function toggleLayerLock(layers: LayerDefinition[], layerId: string): LayerDefinition[] {
  return updateLayer(layers, layerId, {
    locked: !layers.find((l) => l.id === layerId)?.locked,
  });
}

// ============================================================================
// Z-INDEX SCALE OPERATIONS
// ============================================================================

/**
 * Get the semantic z-index token for a value
 */
export function getZIndexToken(value: number, scale: ZIndexScale = DEFAULT_Z_INDEX_SCALE): string {
  const entries = Object.entries(scale).sort(([, a], [, b]) => b - a);

  for (const [token, tokenValue] of entries) {
    if (value >= tokenValue) {
      return token;
    }
  }

  return 'base';
}

/**
 * Generate CSS variables for z-index scale
 */
export function generateZIndexCSS(scale: ZIndexScale = DEFAULT_Z_INDEX_SCALE): string {
  return Object.entries(scale)
    .map(([token, value]) => `  --z-${token}: ${value};`)
    .join('\n');
}

/**
 * Generate CSS variables for layers
 */
export function generateLayerCSS(layers: LayerDefinition[]): string {
  return layers
    .filter((layer) => layer.cssVariable)
    .map((layer) => `  ${layer.cssVariable}: ${layer.zIndex};`)
    .join('\n');
}

/**
 * Generate Tailwind config for z-index
 */
export function generateTailwindZIndex(
  scale: ZIndexScale = DEFAULT_Z_INDEX_SCALE
): Record<string, string> {
  return Object.fromEntries(Object.entries(scale).map(([token, value]) => [token, String(value)]));
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check for z-index conflicts
 */
export function findZIndexConflicts(
  layers: LayerDefinition[]
): Array<{ layers: LayerDefinition[]; zIndex: number }> {
  const byZIndex = new Map<number, LayerDefinition[]>();

  for (const layer of layers) {
    const existing = byZIndex.get(layer.zIndex) || [];
    byZIndex.set(layer.zIndex, [...existing, layer]);
  }

  return Array.from(byZIndex.entries())
    .filter(([, layerList]) => layerList.length > 1)
    .map(([zIndex, layerList]) => ({ layers: layerList, zIndex }));
}

/**
 * Auto-fix z-index conflicts by spacing out values
 */
export function autoFixZIndexConflicts(layers: LayerDefinition[]): LayerDefinition[] {
  const conflicts = findZIndexConflicts(layers);
  if (conflicts.length === 0) return layers;

  let result = [...layers];

  for (const conflict of conflicts) {
    const conflictingLayers = conflict.layers;
    const baseZ = conflict.zIndex;

    // Space out conflicting layers
    conflictingLayers.forEach((layer, index) => {
      if (index > 0) {
        result = updateLayer(result, layer.id, { zIndex: baseZ + index });
      }
    });
  }

  return sortLayersByZIndex(result);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  sortLayersByZIndex,
  sortLayersByZIndexAsc,
  groupLayers,
  reorderLayers,
  addLayer,
  removeLayer,
  updateLayer,
  toggleLayerVisibility,
  toggleLayerLock,
  getZIndexToken,
  generateZIndexCSS,
  generateLayerCSS,
  generateTailwindZIndex,
  findZIndexConflicts,
  autoFixZIndexConflicts,
};
