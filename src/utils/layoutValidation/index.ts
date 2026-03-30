/**
 * Layout Validation — Barrel Export
 *
 * Re-exports all layout validation utilities so consumers can import
 * from '@/utils/layoutValidation' unchanged.
 */

// Schemas & constants
export {
  DEFAULT_BOUNDS,
  VALID_ROLES,
  DetectedComponentSchema,
  DetectedComponentArraySchema,
  toPercentage,
  toPercentageWithMin,
} from './schemas';

// Sanitization
export { sanitizeComponent, sanitizeComponents } from './sanitization';
export type { SanitizationResult } from './sanitization';

// Hierarchy
export { validateHierarchy, buildComponentTree, repairOrphans } from './hierarchy';
export type { HierarchyValidationResult, ComponentTreeResult } from './hierarchy';

// Inference
export { inferContainerLayouts, migrateToHierarchical, resolveRootOverlaps } from './inference';

// Rendering
export { validateComponentsForRender, safeNumber } from './rendering';
