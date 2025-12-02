/**
 * Dynamic Phase Generation System - Type Definitions
 *
 * Generates variable number of phases (3-25+) based on app complexity,
 * feature count, and domain grouping. Replaces the fixed 5-phase system.
 */

import type { AppConcept, Feature, TechnicalRequirements } from '@/types/appConcept';

// ============================================================================
// FEATURE CLASSIFICATION
// ============================================================================

/**
 * Feature domains for intelligent grouping
 * Each domain may become its own phase or be grouped with related domains
 */
export type FeatureDomain =
  | 'setup'           // Project structure, config, dependencies
  | 'database'        // Schema, ORM, migrations, seed data
  | 'auth'            // Authentication, authorization, sessions
  | 'core-entity'     // Main business objects (products, orders, users)
  | 'feature'         // Standard app features
  | 'ui-component'    // Reusable UI components
  | 'integration'     // External services (Stripe, Firebase, APIs)
  | 'real-time'       // WebSocket, live updates, subscriptions
  | 'storage'         // File upload, media handling, CDN
  | 'notification'    // Push, email, in-app notifications
  | 'offline'         // Offline support, sync, local storage
  | 'search'          // Search, filtering, indexing
  | 'analytics'       // Tracking, dashboards, reporting
  | 'admin'           // Admin panels, moderation tools
  | 'ui-role'         // Role-specific dashboards/views
  | 'testing'         // Test setup, fixtures, mocks
  | 'polish';         // Animations, UX refinements, documentation

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
  dependencies: string[];  // Names of features this depends on
  keywords: string[];      // Keywords that triggered this classification
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

// ============================================================================
// DYNAMIC PHASE STRUCTURE
// ============================================================================

/**
 * A dynamically generated phase
 */
export interface DynamicPhase {
  number: number;
  name: string;
  description: string;
  domain: FeatureDomain;
  features: string[];
  featureDetails: FeatureClassification[];
  estimatedTokens: number;
  estimatedTime: string;
  dependencies: number[];     // Phase numbers this depends on
  dependencyNames: string[];  // Human-readable dependency names
  testCriteria: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  generatedCode?: string;
  completedAt?: string;
  errors?: string[];
}

/**
 * Complete phase plan for an application
 */
export interface DynamicPhasePlan {
  id: string;
  appName: string;
  appDescription: string;
  totalPhases: number;
  phases: DynamicPhase[];
  estimatedTotalTime: string;
  estimatedTotalTokens: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  concept: AppConcept;

  // Execution tracking
  currentPhaseNumber: number;
  completedPhaseNumbers: number[];
  failedPhaseNumbers: number[];

  // Context chain for phase execution
  accumulatedFiles: string[];
  accumulatedFeatures: string[];
}

/**
 * Result of phase plan generation
 */
export interface PhasePlanGenerationResult {
  success: boolean;
  plan?: DynamicPhasePlan;
  error?: string;
  warnings: string[];
  analysisDetails: {
    totalFeatures: number;
    complexFeatures: number;
    domainBreakdown: Record<FeatureDomain, number>;
    estimatedContextPerPhase: number;
  };
}

// ============================================================================
// PHASE GENERATOR CONFIGURATION
// ============================================================================

/**
 * Configuration for the phase generator
 */
export interface PhaseGeneratorConfig {
  // Token limits
  maxTokensPerPhase: number;        // Default: 8000
  targetTokensPerPhase: number;     // Default: 5000 (aim for this, allow up to max)

  // Feature limits
  maxFeaturesPerPhase: number;      // Default: 4
  minFeaturesPerPhase: number;      // Default: 1

  // Phase limits
  minPhases: number;                // Default: 2
  maxPhases: number;                // Default: 30

  // Domains that always get their own phase
  alwaysSeparateDomains: FeatureDomain[];

  // Token estimation multipliers
  complexityMultipliers: {
    simple: number;     // Default: 1.0
    moderate: number;   // Default: 1.5
    complex: number;    // Default: 2.5
  };

  // Base token estimates per feature type
  baseTokenEstimates: {
    simpleFeature: number;      // Default: 1200
    moderateFeature: number;    // Default: 2000
    complexFeature: number;     // Default: 3500
    setupPhase: number;         // Default: 2000
    polishPhase: number;        // Default: 2500
  };
}

/**
 * Default configuration
 */
export const DEFAULT_PHASE_GENERATOR_CONFIG: PhaseGeneratorConfig = {
  maxTokensPerPhase: 8000,
  targetTokensPerPhase: 5000,
  maxFeaturesPerPhase: 4,
  minFeaturesPerPhase: 1,
  minPhases: 2,
  maxPhases: 30,
  alwaysSeparateDomains: ['auth', 'database', 'real-time', 'offline', 'integration'],
  complexityMultipliers: {
    simple: 1.0,
    moderate: 1.5,
    complex: 2.5,
  },
  baseTokenEstimates: {
    simpleFeature: 1200,
    moderateFeature: 2000,
    complexFeature: 3500,
    setupPhase: 2000,
    polishPhase: 2500,
  },
};

// ============================================================================
// PHASE EXECUTION CONTEXT
// ============================================================================

/**
 * Context passed to each phase during execution
 */
export interface PhaseExecutionContext {
  phaseNumber: number;
  totalPhases: number;
  phaseName: string;
  phaseDescription: string;

  // What this phase should build
  features: string[];
  testCriteria: string[];

  // Context from previous phases
  previousPhaseCode: string | null;
  allPhases: DynamicPhase[];
  completedPhases: number[];

  // Accumulated state
  cumulativeFeatures: string[];
  cumulativeFiles: string[];

  // App context
  appName: string;
  appDescription: string;
  appType: string;
  techStack: TechnicalRequirements;
}

/**
 * Result of executing a single phase
 */
export interface PhaseExecutionResult {
  phaseNumber: number;
  phaseName: string;
  success: boolean;
  generatedCode: string;
  generatedFiles: string[];
  implementedFeatures: string[];
  duration: number;
  tokensUsed: {
    input: number;
    output: number;
    thinking?: number;
  };
  errors?: string[];
  warnings?: string[];
  testResults?: {
    passed: boolean;
    details: string[];
  };
}

// ============================================================================
// COMPLEX FEATURE PATTERNS
// ============================================================================

/**
 * Patterns for detecting features that require special handling
 */
export const COMPLEX_FEATURE_PATTERNS: ComplexFeaturePattern[] = [
  // Authentication
  {
    patterns: ['auth', 'authentication', 'login', 'signup', 'sign up', 'sign-up', 'register', 'oauth', 'sso', 'jwt', 'session'],
    domain: 'auth',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 4000,
    suggestedName: 'Authentication System',
  },
  // Database
  {
    patterns: ['database', 'schema', 'migration', 'orm', 'prisma', 'supabase', 'postgres', 'mysql', 'mongodb'],
    domain: 'database',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 3500,
    suggestedName: 'Database Setup',
  },
  // Payments
  {
    patterns: ['payment', 'stripe', 'paypal', 'checkout', 'billing', 'subscription', 'invoice'],
    domain: 'integration',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 4500,
    suggestedName: 'Payment Integration',
  },
  // Real-time
  {
    patterns: ['real-time', 'realtime', 'websocket', 'socket', 'live', 'sync', 'presence', 'collaborative'],
    domain: 'real-time',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 4000,
    suggestedName: 'Real-time Features',
  },
  // File Storage
  {
    patterns: ['file upload', 'image upload', 'storage', 'media', 's3', 'cloudinary', 'upload'],
    domain: 'storage',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 3500,
    suggestedName: 'File Storage',
  },
  // Notifications
  {
    patterns: ['push notification', 'fcm', 'firebase notification', 'email notification', 'sms'],
    domain: 'notification',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 3000,
    suggestedName: 'Notification System',
  },
  // Offline
  {
    patterns: ['offline', 'service worker', 'pwa', 'local storage', 'indexeddb', 'sync queue'],
    domain: 'offline',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 3500,
    suggestedName: 'Offline Support',
  },
  // Search
  {
    patterns: ['search', 'elasticsearch', 'algolia', 'full-text', 'autocomplete'],
    domain: 'search',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 3000,
    suggestedName: 'Search System',
  },
  // Analytics
  {
    patterns: ['analytics', 'dashboard', 'charts', 'graphs', 'reporting', 'metrics'],
    domain: 'analytics',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 3500,
    suggestedName: 'Analytics Dashboard',
  },
  // Admin
  {
    patterns: ['admin panel', 'admin dashboard', 'moderation', 'user management', 'cms'],
    domain: 'admin',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 4000,
    suggestedName: 'Admin Panel',
  },
];

/**
 * Moderate complexity patterns
 */
export const MODERATE_FEATURE_PATTERNS: Array<{
  patterns: string[];
  domain: FeatureDomain;
  baseTokenEstimate: number;
}> = [
  { patterns: ['form', 'multi-step', 'wizard', 'validation'], domain: 'ui-component', baseTokenEstimate: 2000 },
  { patterns: ['table', 'data grid', 'pagination', 'sorting'], domain: 'ui-component', baseTokenEstimate: 2200 },
  { patterns: ['drag', 'drop', 'sortable', 'reorder'], domain: 'ui-component', baseTokenEstimate: 2500 },
  { patterns: ['calendar', 'date picker', 'scheduling'], domain: 'feature', baseTokenEstimate: 2000 },
  { patterns: ['map', 'location', 'geolocation'], domain: 'integration', baseTokenEstimate: 2500 },
  { patterns: ['export', 'pdf', 'csv', 'download'], domain: 'feature', baseTokenEstimate: 1800 },
  { patterns: ['import', 'bulk', 'batch'], domain: 'feature', baseTokenEstimate: 2000 },
  { patterns: ['filter', 'advanced filter', 'faceted'], domain: 'feature', baseTokenEstimate: 1800 },
  { patterns: ['comment', 'reply', 'thread'], domain: 'feature', baseTokenEstimate: 2200 },
  { patterns: ['rating', 'review', 'feedback'], domain: 'feature', baseTokenEstimate: 1500 },
];

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Grouped features by domain
 */
export type FeaturesByDomain = Map<FeatureDomain, FeatureClassification[]>;

/**
 * Phase dependency graph
 */
export interface PhaseDependencyGraph {
  nodes: number[];  // Phase numbers
  edges: Array<{ from: number; to: number }>;  // Dependencies
}

/**
 * Validation result for a phase plan
 */
export interface PhasePlanValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
