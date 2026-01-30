/**
 * Source Merge Engine
 *
 * Pure service for merging component sets from multiple media sources.
 * Handles:
 * - Combining component arrays from N sources
 * - Blending design specs (colors, typography, spacing)
 * - Resolving spatial overlaps between source components
 *
 * Stateless — all state lives in useSourceRegistry.
 * Operates ONLY on sourceId-tagged data (replication pipeline).
 * The future preset library will have its own merge logic.
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { DesignSpec } from '@/types/designSpec';
import type { MediaSource, MergeStrategy, MergedResult } from '@/types/mediaSource';

// ============================================================================
// MAIN MERGE
// ============================================================================

/**
 * Merge component sets from multiple sources into a unified layout.
 */
export function mergeComponentSets(
  sources: MediaSource[],
  allComponents: DetectedComponentEnhanced[],
  strategy: MergeStrategy
): MergedResult {
  const warnings: string[] = [];

  // Filter to only requested sources
  const activeSources = sources.filter((s) => strategy.sourceIds.includes(s.id));
  if (activeSources.length === 0) {
    return {
      components: [],
      designSpec: createEmptyDesignSpec(),
      warnings: ['No sources selected'],
    };
  }

  // Collect components from active sources
  const sourceComponents = allComponents.filter(
    (c) => c.sourceId && strategy.sourceIds.includes(c.sourceId)
  );

  let mergedComponents: DetectedComponentEnhanced[];

  switch (strategy.type) {
    case 'replace':
      // Last source wins — only keep components from the last source
      mergedComponents = replaceStrategy(sourceComponents, activeSources);
      break;

    case 'additive':
      // All components from all sources, with overlap resolution
      mergedComponents = additiveStrategy(sourceComponents, strategy.overlapStrategy);
      if (mergedComponents.length > sourceComponents.length) {
        warnings.push('Some components were repositioned to avoid overlaps');
      }
      break;

    case 'selective':
      // All components included but AI-guided selection happens upstream
      mergedComponents = sourceComponents;
      break;

    default:
      mergedComponents = sourceComponents;
  }

  // Blend design specs
  const specs = activeSources
    .map((s) => s.designSpec)
    .filter((spec): spec is DesignSpec => spec != null);

  const mergedSpec =
    specs.length > 0
      ? blendDesignSpecs(specs, strategy.designSpecStrategy)
      : createEmptyDesignSpec();

  return { components: mergedComponents, designSpec: mergedSpec, warnings };
}

// ============================================================================
// MERGE STRATEGIES
// ============================================================================

/**
 * Replace strategy: only keep components from the last source.
 */
function replaceStrategy(
  components: DetectedComponentEnhanced[],
  sources: MediaSource[]
): DetectedComponentEnhanced[] {
  if (sources.length === 0) return [];
  const lastSourceId = sources[sources.length - 1].id;
  return components.filter((c) => c.sourceId === lastSourceId);
}

/**
 * Additive strategy: keep all components, resolve overlaps.
 */
function additiveStrategy(
  components: DetectedComponentEnhanced[],
  overlapStrategy: MergeStrategy['overlapStrategy']
): DetectedComponentEnhanced[] {
  return resolveOverlaps(components, overlapStrategy);
}

// ============================================================================
// OVERLAP RESOLUTION
// ============================================================================

/**
 * Resolve spatial overlaps between components from different sources.
 */
export function resolveOverlaps(
  components: DetectedComponentEnhanced[],
  strategy: 'stack' | 'offset' | 'layer'
): DetectedComponentEnhanced[] {
  if (components.length <= 1) return components;

  switch (strategy) {
    case 'stack': {
      // Stack sources vertically — each source's components are placed below the previous source's
      const sourceGroups = groupBySource(components);
      const sourceIds = [...sourceGroups.keys()];
      let currentTopOffset = 0;

      const result: DetectedComponentEnhanced[] = [];
      for (const sourceId of sourceIds) {
        const group = sourceGroups.get(sourceId) ?? [];
        if (group.length === 0) continue;

        // Find the bounding box of this source's components
        const maxBottom = Math.max(...group.map((c) => c.bounds.top + c.bounds.height));
        const minTop = Math.min(...group.map((c) => c.bounds.top));

        // Offset all components so they start after the previous source
        const offset = currentTopOffset - minTop;
        for (const comp of group) {
          result.push({
            ...comp,
            bounds: { ...comp.bounds, top: comp.bounds.top + offset },
          });
        }

        currentTopOffset = currentTopOffset + (maxBottom - minTop) + 2; // 2% gap between sources
      }
      return result;
    }

    case 'offset': {
      // Offset overlapping components by a small amount
      const seen: Array<{ top: number; left: number; width: number; height: number }> = [];
      return components.map((comp) => {
        let { top } = comp.bounds;
        const { left, width, height } = comp.bounds;
        let shifted = false;

        for (const prev of seen) {
          if (boundsOverlap({ top, left, width, height }, prev)) {
            top = prev.top + prev.height + 1;
            shifted = true;
          }
        }

        seen.push({ top, left, width, height });
        return shifted ? { ...comp, bounds: { ...comp.bounds, top } } : comp;
      });
    }

    case 'layer':
      // Layer: no spatial adjustment, just stack via z-index
      // zIndex is a component-level number property (not style), used by GenericComponentRenderer
      return components.map((comp, i) => ({
        ...comp,
        zIndex: (i + 1) * 10,
      }));

    default:
      return components;
  }
}

// ============================================================================
// DESIGN SPEC BLENDING
// ============================================================================

/**
 * Blend multiple design specs into one.
 */
export function blendDesignSpecs(
  specs: DesignSpec[],
  strategy: 'first' | 'last' | 'blend'
): DesignSpec {
  if (specs.length === 0) return createEmptyDesignSpec();
  if (specs.length === 1 || strategy === 'first') return specs[0];
  if (strategy === 'last') return specs[specs.length - 1];

  // Blend: use first spec as base, merge additional colors and component types
  const base = { ...specs[0] };

  // Merge additional colors from all specs
  const allAdditionalColors = specs.flatMap((s) => s.colorPalette.additional);
  const uniqueColors = deduplicateByKey(allAdditionalColors, 'hex');
  base.colorPalette = {
    ...base.colorPalette,
    additional: uniqueColors,
  };

  // Merge component types from all specs
  const allComponentTypes = specs.flatMap((s) => s.componentTypes);
  const uniqueComponentTypes = deduplicateByKey(allComponentTypes, 'type');
  base.componentTypes = uniqueComponentTypes;

  // Use highest confidence
  base.confidence = Math.max(...specs.map((s) => s.confidence));

  // Merge effects: combine gradients, animations, background effects
  if (base.effects) {
    const allGradients = specs.flatMap((s) => s.effects.gradients ?? []);
    const allAnimations = specs.flatMap((s) => s.effects.animations ?? []);
    const allBgEffects = specs.flatMap((s) => s.effects.backgroundEffects ?? []);

    base.effects = {
      ...base.effects,
      hasGradients: base.effects.hasGradients || specs.some((s) => s.effects.hasGradients),
      hasBlur: base.effects.hasBlur || specs.some((s) => s.effects.hasBlur),
      gradients: allGradients.length > 0 ? allGradients : undefined,
      animations: allAnimations.length > 0 ? allAnimations : undefined,
      backgroundEffects: allBgEffects.length > 0 ? allBgEffects : undefined,
    };
  }

  return base;
}

// ============================================================================
// HELPERS
// ============================================================================

function groupBySource(
  components: DetectedComponentEnhanced[]
): Map<string, DetectedComponentEnhanced[]> {
  const map = new Map<string, DetectedComponentEnhanced[]>();
  for (const c of components) {
    const key = c.sourceId ?? '__no_source__';
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return map;
}

function boundsOverlap(
  a: { top: number; left: number; width: number; height: number },
  b: { top: number; left: number; width: number; height: number }
): boolean {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

function deduplicateByKey<T>(items: T[], key: keyof T): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

function createEmptyDesignSpec(): DesignSpec {
  return {
    colorPalette: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#F59E0B',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      additional: [],
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      fontSizes: { h1: '2.5rem', h2: '2rem', h3: '1.5rem', body: '1rem', small: '0.875rem' },
      fontWeights: { heading: 700, body: 400, bold: 600 },
    },
    spacing: {
      unit: 8,
      scale: [4, 8, 12, 16, 24, 32, 48, 64],
      containerPadding: '24px',
      sectionGap: '32px',
    },
    structure: {
      type: 'header-top',
      hasHeader: true,
      hasSidebar: false,
      hasFooter: true,
      mainContentWidth: 'standard',
    },
    componentTypes: [],
    effects: {
      borderRadius: '8px',
      shadows: 'none',
      hasGradients: false,
      hasBlur: false,
    },
    vibe: 'Modern and clean',
    confidence: 0.5,
  };
}
