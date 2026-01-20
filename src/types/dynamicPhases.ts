/**
 * Dynamic Phase Generation System - Type Definitions
 *
 * Generates variable number of phases (3-25+) based on app complexity,
 * feature count, and domain grouping. Replaces the fixed 5-phase system.
 */

import type {
  AppConcept,
  Feature,
  TechnicalRequirements,
  UIPreferences,
  UserRole,
  Workflow,
} from '@/types/appConcept';
import type { LayoutDesign } from '@/types/layoutDesign';
import type { ArchitectureSpec, APIRouteSpec, BackendFileSpec } from '@/types/architectureSpec';

// ============================================================================
// FEATURE CLASSIFICATION
// ============================================================================

/**
 * Feature domains for intelligent grouping
 * Each domain may become its own phase or be grouped with related domains
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

// ============================================================================
// DYNAMIC PHASE STRUCTURE
// ============================================================================

/**
 * Feature specification with rich details from conversation
 */
export interface FeatureSpecification {
  name: string;
  userStories: string[];
  acceptanceCriteria: string[];
  technicalNotes: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * Workflow specification with steps and actors
 */
export interface WorkflowSpecification {
  name: string;
  trigger: string;
  steps: Array<{ action: string; actor: string }>;
  errorHandling?: string;
}

/**
 * Validation rule for fields/forms
 */
export interface ValidationRule {
  field: string;
  rules: string[];
  errorMessages: string[];
}

/**
 * UI pattern/component specification
 */
export interface UIPattern {
  component: string;
  pattern: string;
  requirements: string[];
}

/**
 * Integration point with external service
 */
export interface IntegrationPoint {
  service: string;
  purpose: string;
  endpoints: string[];
  authRequired: boolean;
}

/**
 * Concept context preserved for each phase
 * Ensures phase execution has access to full app vision
 */
export interface PhaseConceptContext {
  purpose?: string;
  targetUsers?: string;
  uiPreferences?: UIPreferences;
  roles?: UserRole[];
  conversationContext?: string;
  dataModels?: Array<{
    name: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
  }>;

  // NEW: Structured context fields for rich detail preservation
  featureSpecs?: FeatureSpecification[];
  workflowSpecs?: WorkflowSpecification[];
  technicalConstraints?: string[];
  integrationPoints?: IntegrationPoint[];
  validationRules?: ValidationRule[];
  uiPatterns?: UIPattern[];

  // CRITICAL: Full layout design specification for design-aware code generation
  // This preserves ALL design details (typography, colors, spacing, components)
  // that would otherwise be lost in the UIPreferences simplification
  layoutDesign?: LayoutDesign;
}

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
  dependencies: number[]; // Phase numbers this depends on
  dependencyNames: string[]; // Human-readable dependency names
  testCriteria: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  generatedCode?: string;
  completedAt?: string;
  errors?: string[];

  // Phase Comparison: What was actually built (populated after execution)
  implementedFeatures?: string[]; // Features actually implemented
  builtSummary?: string; // Concise summary of what was built
  builtFiles?: string[]; // Files created/modified in this phase

  // Rich concept context for phase execution (preserves detail)
  conceptContext?: PhaseConceptContext;

  // Role context: which user roles interact with this phase's features
  relevantRoles?: string[];

  // Architecture context for backend phases (from BackendArchitectureAgent)
  architectureContext?: {
    files: BackendFileSpec[];
    prismaSchema?: string;
    apiRoutes?: APIRouteSpec[];
  };
}

/**
 * Rich file tracking with metadata
 */
export interface AccumulatedFile {
  path: string;
  type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
  exports: string[];
  dependencies: string[];
  summary: string;
  // Phase integrity tracking (P1)
  contentHash?: string; // Hash for change detection
  createdInPhase?: number; // Phase that first created this file
  lastModifiedPhase?: number; // Phase that last changed it
  previousVersionHash?: string; // Hash before modification (for rollback)
  // Import validation (P2)
  imports?: ImportInfo[]; // Parsed imports for validation
}

/**
 * Rich feature tracking with implementation details
 */
export interface AccumulatedFeature {
  name: string;
  status: 'complete' | 'partial' | 'pending';
  implementedIn: string[];
  apiEndpoints: string[];
  components: string[];
  dataModels: string[];
  testCoverage: boolean;
}

/**
 * API contract for endpoint documentation
 */
export interface APIContract {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestSchema?: string;
  responseSchema?: string;
  authentication: boolean;
}

/**
 * Phase-specific context extracted from conversation
 * Serializable version of PhaseContext for API responses
 */
export interface SerializedPhaseContext {
  phaseType: FeatureDomain;
  extractedRequirements: string[];
  userDecisions: string[];
  technicalNotes: string[];
  validationRules: string[];
  uiPatterns: string[];
  contextSummary: string;
  tokenEstimate: number;
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

  // Context chain for phase execution (legacy - simple arrays)
  accumulatedFiles: string[];
  accumulatedFeatures: string[];

  // Enhanced tracking (new - rich metadata)
  accumulatedFilesRich?: AccumulatedFile[];
  accumulatedFeaturesRich?: AccumulatedFeature[];
  establishedPatterns?: string[];
  sharedState?: string[];
  apiContracts?: APIContract[];

  // Phase-specific context extracted from conversation (domain -> context)
  phaseContexts?: Record<FeatureDomain, SerializedPhaseContext>;

  // Backend architecture specification (from BackendArchitectureAgent)
  architectureSpec?: ArchitectureSpec;
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
  maxTokensPerPhase: number; // Default: 8000
  targetTokensPerPhase: number; // Default: 5000 (aim for this, allow up to max)

  // Feature limits
  maxFeaturesPerPhase: number; // Default: 4
  minFeaturesPerPhase: number; // Default: 1

  // Phase limits
  minPhases: number; // Default: 2
  maxPhases: number; // Default: 30

  // Domains that always get their own phase
  alwaysSeparateDomains: FeatureDomain[];

  // Token estimation multipliers
  complexityMultipliers: {
    simple: number; // Default: 1.0
    moderate: number; // Default: 1.5
    complex: number; // Default: 2.5
  };

  // Base token estimates per feature type
  baseTokenEstimates: {
    simpleFeature: number; // Default: 1200
    moderateFeature: number; // Default: 2000
    complexFeature: number; // Default: 3500
    setupPhase: number; // Default: 2000
    polishPhase: number; // Default: 2500
  };
}

/**
 * Default configuration
 */
export const DEFAULT_PHASE_GENERATOR_CONFIG: PhaseGeneratorConfig = {
  maxTokensPerPhase: 16000,
  targetTokensPerPhase: 5000,
  maxFeaturesPerPhase: 4,
  minFeaturesPerPhase: 1,
  minPhases: 2,
  maxPhases: 30,
  alwaysSeparateDomains: ['auth', 'database', 'real-time', 'offline', 'integration', 'i18n'],
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

  // ENHANCED: Full concept context for rich detail preservation
  fullConcept?: {
    purpose?: string;
    targetUsers?: string;
    uiPreferences?: UIPreferences;
    roles?: UserRole[];
    conversationContext?: string;
    dataModels?: Array<{
      name: string;
      fields: Array<{ name: string; type: string; required: boolean }>;
    }>;
    // Full layout design for design-aware code generation
    layoutDesign?: LayoutDesign;
    // User workflows for multi-step process generation
    workflows?: Workflow[];
  };

  // Phase-specific concept context
  phaseConceptContext?: PhaseConceptContext;

  // Which user roles this phase serves
  relevantRoles?: string[];

  // Extracted context from conversation for this specific phase
  extractedPhaseContext?: SerializedPhaseContext;

  // Context truncation notice (tells AI what conversation context was dropped)
  truncationNotice?: string;

  // Architecture context for backend phases (from BackendArchitectureAgent)
  // This provides phase-specific backend implementation details
  architectureContext?: {
    files: BackendFileSpec[];
    prismaSchema?: string;
    apiRoutes?: APIRouteSpec[];
  };
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
  // Phase Comparison: Summary of what was built
  builtSummary?: string;
  // Phase integrity (P1): File conflicts detected during this phase
  fileConflicts?: FileConflict[];
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
    patterns: [
      'auth',
      'authentication',
      'login',
      'signup',
      'sign up',
      'sign-up',
      'register',
      'oauth',
      'sso',
      'jwt',
      'session',
    ],
    domain: 'auth',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 4000,
    suggestedName: 'Authentication System',
  },
  // Database
  {
    patterns: [
      'database',
      'schema',
      'migration',
      'orm',
      'prisma',
      'supabase',
      'postgres',
      'mysql',
      'mongodb',
    ],
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
    patterns: [
      'real-time',
      'realtime',
      'websocket',
      'socket',
      'live',
      'sync',
      'presence',
      'collaborative',
    ],
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
  // Internationalization
  {
    patterns: [
      'internationali',
      'i18n',
      'l10n',
      'locali',
      'multi-language',
      'multilingual',
      'translate',
      'translation',
      'multiple languages',
      'language support',
    ],
    domain: 'i18n',
    complexity: 'complex',
    requiresOwnPhase: true,
    baseTokenEstimate: 4000,
    suggestedName: 'Internationalization Setup',
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
  {
    patterns: ['form', 'multi-step', 'wizard', 'validation'],
    domain: 'ui-component',
    baseTokenEstimate: 2000,
  },
  {
    patterns: ['table', 'data grid', 'pagination', 'sorting'],
    domain: 'ui-component',
    baseTokenEstimate: 2200,
  },
  {
    patterns: ['drag', 'drop', 'sortable', 'reorder'],
    domain: 'ui-component',
    baseTokenEstimate: 2500,
  },
  {
    patterns: ['calendar', 'date picker', 'scheduling'],
    domain: 'feature',
    baseTokenEstimate: 2000,
  },
  { patterns: ['map', 'location', 'geolocation'], domain: 'integration', baseTokenEstimate: 2500 },
  { patterns: ['export', 'pdf', 'csv', 'download'], domain: 'feature', baseTokenEstimate: 1800 },
  { patterns: ['import', 'bulk', 'batch'], domain: 'feature', baseTokenEstimate: 2000 },
  {
    patterns: ['filter', 'advanced filter', 'faceted'],
    domain: 'feature',
    baseTokenEstimate: 1800,
  },
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
  nodes: number[]; // Phase numbers
  edges: Array<{ from: number; to: number }>; // Dependencies
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

// ============================================================================
// PHASE INTEGRITY SYSTEM (P1-P9)
// ============================================================================

// ============ P1: File Conflict Detection ============

/**
 * Represents a file conflict detected between phases
 */
export interface FileConflict {
  path: string;
  type: 'OVERWRITE' | 'EXPORT_REMOVED' | 'TYPE_CHANGED' | 'API_CHANGED';
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
}

/**
 * Result of file conflict detection
 */
export interface FileConflictResult {
  conflicts: FileConflict[];
  hasBreakingChanges: boolean;
}

// ============ P2: Import Validation ============

/**
 * Parsed import information for validation
 */
export interface ImportInfo {
  symbols: string[];
  from: string;
  isRelative: boolean;
}

/**
 * Unresolved import that couldn't be validated
 */
export interface UnresolvedImport {
  file: string;
  symbol?: string;
  importFrom: string;
  resolvedTo?: string;
  reason: 'FILE_NOT_FOUND' | 'SYMBOL_NOT_EXPORTED';
}

/**
 * Result of import/export validation
 */
export interface ImportValidationResult {
  valid: boolean;
  unresolved: UnresolvedImport[];
}

// ============ P3: Phase Snapshot ============

/**
 * Snapshot of phase state for rollback capability
 */
export interface PhaseSnapshot {
  id: string;
  phaseNumber: number;
  timestamp: string;
  accumulatedCode: string;
  accumulatedFiles: string[];
  accumulatedFeatures: string[];
  accumulatedFilesRich: AccumulatedFile[];
  accumulatedFeaturesRich: AccumulatedFeature[];
  establishedPatterns: string[];
  apiContracts: APIContract[];
  rawGeneratedFiles: Array<{ path: string; content: string }>;
  completedPhases: number[];
  phaseStatuses: Array<{ number: number; status: DynamicPhase['status'] }>;
}

// ============ P5: Type Checking ============

/**
 * Result of TypeScript type checking
 */
export interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckError[];
}

/**
 * Individual type check error/warning
 */
export interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning';
}

// ============ P6: Type Compatibility ============

/**
 * Extracted type definition from code
 */
export interface TypeDefinition {
  name: string;
  file: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  properties: TypeProperty[];
  phase: number;
}

/**
 * Property within a type definition
 */
export interface TypeProperty {
  name: string;
  type: string;
  optional: boolean;
}

/**
 * Breaking change detected in type definitions
 */
export interface BreakingTypeChange {
  typeName: string;
  file: string;
  changeType: 'PROPERTY_REMOVED' | 'TYPE_CHANGED' | 'REQUIRED_ADDED' | 'TYPE_DELETED';
  details: string;
  previousPhase: number;
  currentPhase: number;
  severity: 'critical' | 'warning';
}

/**
 * Result of type compatibility check
 */
export interface TypeCompatibilityResult {
  compatible: boolean;
  breakingChanges: BreakingTypeChange[];
}

// ============ P7: Smoke Tests ============

/**
 * Result of a single smoke test criterion
 */
export interface SmokeTestResult {
  criterion: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * Results of all smoke tests for a phase
 */
export interface PhaseTestResults {
  phaseNumber: number;
  total: number;
  passed: number;
  failed: number;
  results: SmokeTestResult[];
  allPassed: boolean;
}

// ============ P8: Contract Validation ============

/**
 * API contract violation detected
 */
export interface ContractViolation {
  endpoint: string;
  method: string;
  violation: 'MISSING_ENDPOINT' | 'WRONG_METHOD' | 'MISSING_RESPONSE_TYPE' | 'WRONG_PARAMS';
  expected: string;
  actual?: string;
  severity: 'error' | 'warning';
}

/**
 * Result of API contract validation
 */
export interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
}

// ============ P9: Regression Testing ============

/**
 * Result of regression testing across phases
 */
export interface RegressionTestResult {
  phaseNumber: number;
  previousPhasesChecked: number[];
  failures: RegressionFailure[];
  allPassed: boolean;
}

/**
 * Individual regression failure
 */
export interface RegressionFailure {
  originalPhase: number;
  criterion: string;
  error: string;
}
