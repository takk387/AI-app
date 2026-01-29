/**
 * Layout Auto Fix Engine
 *
 * Applies corrections from the AI critique to layout components automatically.
 * Part of the self-healing vision loop architecture.
 *
 * Features:
 * - Applies style corrections from critique discrepancies
 * - Validates fixes don't break component bounds
 * - Maintains audit trail of all changes
 * - Supports rollback via version control integration
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { LayoutCritiqueEnhanced, LayoutDiscrepancy } from '@/types/layoutAnalysis';

/**
 * Result of applying a single fix
 */
export interface LayoutFixResult {
  componentId: string;
  success: boolean;
  property: string;
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
  error?: string;
}

/**
 * Result of applying all fixes from a critique
 */
export interface LayoutAutoFixResult {
  /** Updated components array */
  components: DetectedComponentEnhanced[];
  /** Number of fixes successfully applied */
  appliedCount: number;
  /** Number of fixes that failed */
  failedCount: number;
  /** Number of fixes skipped (e.g., component not found) */
  skippedCount: number;
  /** Detailed results for each fix attempt */
  results: LayoutFixResult[];
  /** IDs of components that were modified */
  modifiedComponentIds: string[];
}

/**
 * Configuration for the layout auto-fix engine
 */
export interface LayoutAutoFixConfig {
  /** Skip fixes for critical severity issues (may need manual review) */
  skipCritical?: boolean;
  /** Only apply fixes for specific issue types */
  allowedIssueTypes?: LayoutDiscrepancy['issue'][];
  /** Maximum number of fixes to apply in one pass */
  maxFixes?: number;
  /** Validate bounds after applying fixes */
  validateBounds?: boolean;
}

/**
 * Properties that are safe to auto-fix
 */
const SAFE_STYLE_PROPERTIES = [
  'backgroundColor',
  'textColor',
  'color',
  'fontSize',
  'fontWeight',
  'padding',
  'margin',
  'borderRadius',
  'borderColor',
  'borderWidth',
  'gap',
  'opacity',
];

/**
 * Properties that affect layout and need validation
 */
const LAYOUT_PROPERTIES = ['width', 'height', 'top', 'left', 'position'];

/**
 * Layout Auto Fix Engine Class
 */
export class LayoutAutoFixEngine {
  private config: LayoutAutoFixConfig;

  constructor(config: LayoutAutoFixConfig = {}) {
    this.config = {
      skipCritical: false,
      validateBounds: true,
      maxFixes: 50,
      ...config,
    };
  }

  /**
   * Apply corrections from a critique to the component array
   */
  applyCritique(
    components: DetectedComponentEnhanced[],
    critique: LayoutCritiqueEnhanced
  ): LayoutAutoFixResult {
    const result: LayoutAutoFixResult = {
      components: components.map((c) => ({ ...c, style: { ...c.style } })), // Deep copy
      appliedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
      modifiedComponentIds: [],
    };

    // Filter discrepancies based on config
    let discrepancies = critique.discrepancies;

    if (this.config.skipCritical) {
      discrepancies = discrepancies.filter((d) => d.severity !== 'critical');
    }

    if (this.config.allowedIssueTypes && this.config.allowedIssueTypes.length > 0) {
      discrepancies = discrepancies.filter((d) => this.config.allowedIssueTypes!.includes(d.issue));
    }

    if (this.config.maxFixes && discrepancies.length > this.config.maxFixes) {
      discrepancies = discrepancies.slice(0, this.config.maxFixes);
    }

    // Apply each fix
    for (const discrepancy of discrepancies) {
      const fixResult = this.applyDiscrepancyFix(result.components, discrepancy);
      result.results.push(...fixResult.results);

      if (fixResult.applied) {
        result.appliedCount++;
        if (!result.modifiedComponentIds.includes(discrepancy.componentId)) {
          result.modifiedComponentIds.push(discrepancy.componentId);
        }
      } else if (fixResult.skipped) {
        result.skippedCount++;
      } else {
        result.failedCount++;
      }
    }

    return result;
  }

  /**
   * Apply a single discrepancy fix
   */
  private applyDiscrepancyFix(
    components: DetectedComponentEnhanced[],
    discrepancy: LayoutDiscrepancy
  ): { applied: boolean; skipped: boolean; results: LayoutFixResult[] } {
    const results: LayoutFixResult[] = [];

    // Find the component
    const componentIndex = components.findIndex((c) => c.id === discrepancy.componentId);

    if (componentIndex === -1) {
      // Component not found - skip
      results.push({
        componentId: discrepancy.componentId,
        success: false,
        property: 'unknown',
        oldValue: undefined,
        newValue: undefined,
        error: `Component ${discrepancy.componentId} not found`,
      });
      return { applied: false, skipped: true, results };
    }

    const component = components[componentIndex];

    // Check if we have correction JSON
    if (!discrepancy.correctionJSON) {
      results.push({
        componentId: discrepancy.componentId,
        success: false,
        property: 'unknown',
        oldValue: undefined,
        newValue: undefined,
        error: 'No correction JSON provided',
      });
      return { applied: false, skipped: true, results };
    }

    // Apply style corrections
    if (discrepancy.correctionJSON.style) {
      const styleUpdates = discrepancy.correctionJSON.style;

      for (const [property, value] of Object.entries(styleUpdates)) {
        const fixResult = this.applyStyleFix(component, property, value);
        results.push(fixResult);
      }
    }

    // Apply bounds corrections if present and validation passes
    if (discrepancy.correctionJSON.bounds && this.config.validateBounds) {
      const boundsValid = this.validateBoundsChange(component, discrepancy.correctionJSON.bounds);

      if (boundsValid) {
        const oldBounds = { ...component.bounds };
        component.bounds = {
          ...component.bounds,
          ...discrepancy.correctionJSON.bounds,
        };
        results.push({
          componentId: component.id,
          success: true,
          property: 'bounds',
          oldValue: JSON.stringify(oldBounds),
          newValue: JSON.stringify(component.bounds),
        });
      } else {
        results.push({
          componentId: component.id,
          success: false,
          property: 'bounds',
          oldValue: JSON.stringify(component.bounds),
          newValue: JSON.stringify(discrepancy.correctionJSON.bounds),
          error: 'Bounds change failed validation',
        });
      }
    }

    // Update the component in the array
    components[componentIndex] = component;

    const anySuccess = results.some((r) => r.success);
    return { applied: anySuccess, skipped: false, results };
  }

  /**
   * Apply a single style property fix
   */
  private applyStyleFix(
    component: DetectedComponentEnhanced,
    property: string,
    value: unknown
  ): LayoutFixResult {
    // Ensure style object exists
    if (!component.style) {
      component.style = {};
    }

    const oldValue = (component.style as Record<string, unknown>)[property];

    // Check if property is safe to modify
    if (!SAFE_STYLE_PROPERTIES.includes(property) && !LAYOUT_PROPERTIES.includes(property)) {
      return {
        componentId: component.id,
        success: false,
        property,
        oldValue: oldValue as string | number | undefined,
        newValue: value as string | number | undefined,
        error: `Property ${property} is not in the safe-to-modify list`,
      };
    }

    // Apply the fix
    (component.style as Record<string, unknown>)[property] = value;

    return {
      componentId: component.id,
      success: true,
      property,
      oldValue: oldValue as string | number | undefined,
      newValue: value as string | number | undefined,
    };
  }

  /**
   * Validate that bounds changes won't break the layout
   */
  private validateBoundsChange(
    component: DetectedComponentEnhanced,
    newBounds: Partial<DetectedComponentEnhanced['bounds']>
  ): boolean {
    if (!newBounds) return true;

    const currentBounds = component.bounds || { top: 0, left: 0, width: 100, height: 100 };

    // Merge with current bounds
    const mergedBounds = { ...currentBounds, ...newBounds };

    // Validate bounds are within reasonable ranges (0-1000 scale or 0-100%)
    const isValidRange = (value: number | undefined, max: number): boolean => {
      if (value === undefined) return true;
      return value >= 0 && value <= max;
    };

    // Check position values (0-1000 or 0-100%)
    if (!isValidRange(mergedBounds.top, 1000)) return false;
    if (!isValidRange(mergedBounds.left, 1000)) return false;

    // Check size values
    if (!isValidRange(mergedBounds.width, 1000)) return false;
    if (!isValidRange(mergedBounds.height, 1000)) return false;

    // Check that component doesn't extend beyond viewport (assuming 1000 = 100%)
    if (mergedBounds.left + mergedBounds.width > 1000) return false;
    if (mergedBounds.top + mergedBounds.height > 1000) return false;

    return true;
  }

  /**
   * Validate a single fix before applying
   */
  validateFix(original: DetectedComponentEnhanced, fixed: DetectedComponentEnhanced): boolean {
    // Check that ID hasn't changed
    if (original.id !== fixed.id) return false;

    // Check that type hasn't changed
    if (original.type !== fixed.type) return false;

    // Validate bounds if they changed
    if (fixed.bounds && original.bounds) {
      const boundsChanged =
        fixed.bounds.top !== original.bounds.top ||
        fixed.bounds.left !== original.bounds.left ||
        fixed.bounds.width !== original.bounds.width ||
        fixed.bounds.height !== original.bounds.height;

      if (boundsChanged) {
        return this.validateBoundsChange(original, fixed.bounds);
      }
    }

    return true;
  }

  /**
   * Get a summary of what fixes would be applied (dry run)
   */
  previewFixes(
    components: DetectedComponentEnhanced[],
    critique: LayoutCritiqueEnhanced
  ): { wouldApply: number; wouldSkip: number; details: string[] } {
    const details: string[] = [];
    let wouldApply = 0;
    let wouldSkip = 0;

    for (const discrepancy of critique.discrepancies) {
      const component = components.find((c) => c.id === discrepancy.componentId);

      if (!component) {
        details.push(`SKIP: Component ${discrepancy.componentId} not found`);
        wouldSkip++;
        continue;
      }

      if (!discrepancy.correctionJSON) {
        details.push(`SKIP: No correction for ${discrepancy.componentId}`);
        wouldSkip++;
        continue;
      }

      if (this.config.skipCritical && discrepancy.severity === 'critical') {
        details.push(`SKIP: Critical severity fix for ${discrepancy.componentId}`);
        wouldSkip++;
        continue;
      }

      const props = Object.keys(discrepancy.correctionJSON.style || {});
      details.push(
        `APPLY: ${discrepancy.componentId} - ${discrepancy.issue} (${props.join(', ')})`
      );
      wouldApply++;
    }

    return { wouldApply, wouldSkip, details };
  }
}

/**
 * Create a new LayoutAutoFixEngine instance
 */
export function createLayoutAutoFixEngine(config?: LayoutAutoFixConfig): LayoutAutoFixEngine {
  return new LayoutAutoFixEngine(config);
}
