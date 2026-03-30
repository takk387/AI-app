/**
 * Dynamic Phase Generation System - Barrel Re-export
 *
 * All types from the dynamicPhases module are re-exported here for
 * zero-breaking-change compatibility. Consumers continue to import
 * from '@/types/dynamicPhases' as before.
 *
 * Internal structure:
 *   classification.ts - Feature domains, categories, classification
 *   structures.ts     - Phase structures, files, features, plans
 *   config.ts         - Phase generator configuration and defaults
 *   execution.ts      - Phase execution context and results
 *   patterns.ts       - Complex and moderate feature patterns
 *   analysis.ts       - Utility types (dependency graph, validation)
 *   integrity.ts      - Phase integrity system (P1-P9)
 *   manager.ts        - Phase manager state container
 */

export * from './classification';
export * from './structures';
export * from './config';
export * from './execution';
export * from './patterns';
export * from './analysis';
export * from './integrity';
export * from './manager';
