/**
 * Dynamic Phase Generation System - Feature Classification
 *
 * Feature domain categories, domain types, and classification interfaces.
 */

import type { Feature } from '@/types/appConcept';

// ============================================================================
// FEATURE CLASSIFICATION
// ============================================================================

/**
 * Feature domain categories — groups the 21 FeatureDomain values into
 * 5 high-level categories for navigation, display, and phase ordering.
 */
export type FeatureDomainCategory = 'infrastructure' | 'core' | 'ui' | 'integration' | 'quality';

/**
 * Mapping from category → domains. Use this to group phases in UI or
 * to determine execution order (infrastructure first, quality last).
 */
export const FEATURE_DOMAIN_CATEGORIES: Record<FeatureDomainCategory, FeatureDomain[]> = {
  infrastructure: ['setup', 'database', 'auth', 'devops', 'monitoring'],
  core: ['core-entity', 'feature', 'search', 'analytics', 'admin'],
  ui: ['ui-component', 'ui-role', 'i18n', 'polish', 'offline'],
  integration: ['integration', 'real-time', 'storage', 'notification'],
  quality: ['testing', 'backend-validator'],
};

/**
 * Feature domains for intelligent grouping
 * Each domain may become its own phase or be grouped with related domains
 *
 * Grouped by category (see FEATURE_DOMAIN_CATEGORIES):
 *   infrastructure: setup, database, auth, devops, monitoring
 *   core:           core-entity, feature, search, analytics, admin
 *   ui:             ui-component, ui-role, i18n, polish, offline
 *   integration:    integration, real-time, storage, notification
 *   quality:        testing, backend-validator
 */
export type FeatureDomain =
  | 'setup' // Project structure, config, dependencies
  | 'database' // Schema, ORM, migrations, seed data
  | 'auth' // Authentication, authorization, sessions
  | 'i18n' // Internationalization, multi-language support
  | 'core-entity' // Main business objects (products, orders, users)
  | 'feature' // Standard app features
  | 'ui-component' // Reusable UI components
  | 'integration' // External services (Stripe, Firebase, APIs)
  | 'real-time' // WebSocket, live updates, subscriptions
  | 'storage' // File upload, media handling, CDN
  | 'notification' // Push, email, in-app notifications
  | 'offline' // Offline support, sync, local storage
  | 'search' // Search, filtering, indexing
  | 'analytics' // Tracking, dashboards, reporting
  | 'admin' // Admin panels, moderation tools
  | 'ui-role' // Role-specific dashboards/views
  | 'testing' // Test setup, fixtures, mocks
  | 'backend-validator' // Fix 5: Backend validation phases (schema/api check)
  | 'devops' // Infrastructure, deployment, CI/CD
  | 'monitoring' // Observability, logging, error tracking
  | 'polish'; // Animations, UX refinements, documentation

/**
 * Classification result for a single feature
 */
export interface FeatureClassification {
  originalFeature: Feature;
  domain: FeatureDomain;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
  requiresOwnPhase: boolean;
  suggestedPhaseName: string;
  dependencies: string[]; // Names of features this depends on
  keywords: string[]; // Keywords that triggered this classification
}

/**
 * Patterns for detecting complex features that need their own phase
 */
export interface ComplexFeaturePattern {
  patterns: string[];
  domain: FeatureDomain;
  complexity: 'complex';
  requiresOwnPhase: boolean;
  baseTokenEstimate: number;
  suggestedName: string;
}
