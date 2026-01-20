/**
 * Dynamic Phase Generator Service
 *
 * Analyzes an AppConcept and generates an optimal number of phases (3-25+)
 * based on feature count, complexity, dependencies, and context limits.
 *
 * Replaces the fixed 5-phase system with intelligent, adaptive phase planning.
 */

import type { AppConcept, Feature, TechnicalRequirements, UserRole } from '@/types/appConcept';
import type { LayoutDesign } from '@/types/layoutDesign';
import type {
  FeatureDomain,
  FeatureClassification,
  DynamicPhase,
  DynamicPhasePlan,
  PhasePlanGenerationResult,
  PhaseGeneratorConfig,
  FeaturesByDomain,
  FeatureSpecification,
  WorkflowSpecification,
  PhaseConceptContext,
  ImportInfo,
} from '@/types/dynamicPhases';
import type { ArchitectureSpec, BackendPhaseSpec } from '@/types/architectureSpec';
import { LayoutManifest } from '@/types/schema';

import {
  COMPLEX_FEATURE_PATTERNS as complexPatterns,
  MODERATE_FEATURE_PATTERNS as moderatePatterns,
  DEFAULT_PHASE_GENERATOR_CONFIG as defaultConfig,
} from '@/types/dynamicPhases';

// ============================================================================
// PHASE CONTEXT KEYWORDS
// ============================================================================

/**
 * Keywords for extracting phase-relevant context
 */
const PHASE_KEYWORDS: Record<FeatureDomain, string[]> = {
  setup: [
    'setup',
    'config',
    'initialize',
    'project',
    'structure',
    'dependencies',
    'folder',
    // State management keywords
    'state',
    'store',
    'zustand',
    'redux',
    'context',
    'provider',
    'global state',
    // Memory/persistence keywords
    'persistence',
    'memory',
    'remember',
    'history',
    'undo',
    'redo',
    'draft',
    'autosave',
    'session',
    'cross-session',
    'preferences',
    'settings store',
  ],
  database: [
    'database',
    'schema',
    'table',
    'field',
    'relationship',
    'model',
    'data',
    'constraint',
    'migration',
  ],
  auth: [
    'login',
    'register',
    'password',
    'role',
    'permission',
    'session',
    'auth',
    'jwt',
    'oauth',
    'user',
  ],
  'core-entity': ['entity', 'model', 'object', 'core', 'main', 'primary', 'business'],
  feature: ['feature', 'functionality', 'user story', 'acceptance', 'validation', 'requirement'],
  'ui-component': ['button', 'form', 'modal', 'component', 'ui', 'design', 'layout', 'responsive'],
  integration: ['api', 'integration', 'webhook', 'external', 'service', 'third-party', 'endpoint'],
  'real-time': ['real-time', 'websocket', 'live', 'sync', 'push', 'instant', 'notification'],
  storage: [
    'upload',
    'file',
    'image',
    'storage',
    'media',
    'attachment',
    'document',
    // Context/memory storage keywords
    'conversation history',
    'chat history',
    'message history',
    'context storage',
    'semantic memory',
    'long-term memory',
    'user context',
  ],
  notification: ['notification', 'alert', 'email', 'push', 'message', 'notify'],
  offline: [
    'offline',
    'sync',
    'local',
    'cache',
    'service worker',
    'pwa',
    // Caching keywords
    'memoization',
    'cached',
    'local storage',
    'indexed db',
    'persistent cache',
  ],
  search: ['search', 'filter', 'query', 'find', 'autocomplete', 'index'],
  analytics: ['analytics', 'dashboard', 'chart', 'metric', 'report', 'visualization'],
  admin: ['admin', 'manage', 'moderate', 'settings', 'configuration', 'control'],
  'ui-role': ['dashboard', 'view', 'role', 'access', 'permission', 'portal'],
  testing: ['test', 'mock', 'fixture', 'assertion', 'coverage'],
  polish: ['animation', 'transition', 'loading', 'error', 'empty state', 'ux', 'feedback'],
  i18n: [
    'i18n',
    'l10n',
    'internationalization',
    'localization',
    'translate',
    'translation',
    'language',
    'multilingual',
    'multi-language',
    'locale',
    'languages',
  ],
};

/**
 * Keywords for detecting memory/persistence infrastructure needs.
 * Used by detectMemoryNeeds() for auto-detection during phase generation.
 * Organized by the type of infrastructure they indicate.
 */
const MEMORY_DETECTION_KEYWORDS = {
  // Context persistence: cross-session memory, user preferences, learning
  contextPersistence: [
    'remember',
    'remembers',
    'memory',
    'memories',
    'recall',
    'forget',
    'learns',
    'adapts',
    'personalize',
    'personalized',
    'preferences',
    'habits',
    'conversation',
    'context',
    'previous',
    'past',
    'earlier',
    'before',
    'save',
    'persist',
    'store',
    'keep',
    'maintain',
    'retain',
    'previous session',
    'conversation history',
  ],
  // State history: undo/redo, drafts, versioning
  stateHistory: [
    'undo',
    'redo',
    'revert',
    'draft',
    'autosave',
    'version',
    'snapshot',
    'history',
    'restore',
    'track',
    'tracks',
    'log',
    'logs',
    'record',
    'records',
  ],
  // Caching: performance optimization, data caching
  caching: [
    'performance',
    'fast',
    'instant',
    'cached',
    'optimize',
    'responsive',
    'large dataset',
    'pagination',
  ],
};

const STATE_COMPLEXITY_KEYWORDS = {
  complex: [
    'workflow',
    'multi-step',
    'wizard',
    'cart',
    'checkout',
    'collaboration',
    'real-time',
    'editor',
    'undo',
    'redo',
    'draft',
    'autosave',
    'version control',
    'ai assistant',
    'chatbot',
    'conversation',
    'learns',
    'adapts',
    'personalized',
  ],
  moderate: [
    'form',
    'dashboard',
    'settings',
    'preferences',
    'filter',
    'sort',
    'pagination',
    'tabs',
    'modal',
    'sidebar',
  ],
};

// ============================================================================
// MAIN GENERATOR CLASS
// ============================================================================

export class DynamicPhaseGenerator {
  private config: PhaseGeneratorConfig;

  constructor(config: Partial<PhaseGeneratorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Generate a complete phase plan from an AppConcept
   */
  generatePhasePlan(concept: AppConcept): PhasePlanGenerationResult {
    const warnings: string[] = [];

    try {
      // Step 1: Classify all features
      const classifications = this.classifyFeatures(concept.coreFeatures);

      // Step 2: Add implicit features from technical requirements
      const implicitFeatures = this.getImplicitFeatures(concept.technical);
      let allClassifications = [...classifications, ...implicitFeatures];

      // Step 2.5: Add features from layoutManifest if present
      if (concept.layoutManifest) {
        allClassifications.push(...this.extractFeaturesFromLayout(concept.layoutManifest));
      }

      // Step 3: Group features by domain
      const featuresByDomain = this.groupByDomain(allClassifications);

      // Step 4: Generate phases from grouped features
      const phases = this.generatePhasesFromGroups(featuresByDomain, concept);

      // Step 5: Calculate dependencies between phases
      this.calculatePhaseDependencies(phases);

      // Step 6: Validate and adjust the plan
      const validation = this.validatePhasePlan(phases);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          warnings: validation.warnings,
          analysisDetails: this.getAnalysisDetails(allClassifications, featuresByDomain),
        };
      }
      warnings.push(...validation.warnings);

      // Step 7: Create the final plan
      const plan = this.createPhasePlan(phases, concept);

      return {
        success: true,
        plan,
        warnings,
        analysisDetails: this.getAnalysisDetails(allClassifications, featuresByDomain),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during phase generation',
        warnings,
        analysisDetails: {
          totalFeatures: concept.coreFeatures.length,
          complexFeatures: 0,
          domainBreakdown: {} as Record<FeatureDomain, number>,
          estimatedContextPerPhase: 0,
        },
      };
    }
  }

  /**
   * Generate a phase plan with backend architecture context
   * Injects backend phases from ArchitectureSpec at appropriate positions
   */
  generatePhasePlanWithArchitecture(
    concept: AppConcept,
    architectureSpec: ArchitectureSpec
  ): PhasePlanGenerationResult {
    // First, generate the base plan
    const result = this.generatePhasePlan(concept);

    if (!result.success || !result.plan) {
      return result;
    }

    // Inject backend phases from architecture spec
    const enhancedPlan = this.injectBackendPhases(result.plan, architectureSpec);

    // Attach the architecture spec to the plan for reference during code generation
    enhancedPlan.architectureSpec = architectureSpec;

    return {
      ...result,
      plan: enhancedPlan,
    };
  }

  /**
   * Inject backend phases from ArchitectureSpec into the plan
   * Backend phases are inserted after setup but before feature phases
   */
  private injectBackendPhases(plan: DynamicPhasePlan, spec: ArchitectureSpec): DynamicPhasePlan {
    const backendPhases = spec.backendPhases;

    if (!backendPhases || backendPhases.length === 0) {
      return plan;
    }

    const existingPhases = [...plan.phases];

    // Sort backend phases by priority (lower = earlier)
    const sortedBackendPhases = [...backendPhases].sort((a, b) => a.priority - b.priority);

    // Find insertion point: after setup phase but before feature phases
    const setupPhaseIndex = existingPhases.findIndex((p) => p.domain === 'setup');
    const insertAfter = setupPhaseIndex >= 0 ? setupPhaseIndex : 0;

    // Convert BackendPhaseSpec to DynamicPhase
    const convertedPhases: DynamicPhase[] = sortedBackendPhases.map((bp, idx) => {
      // Find API routes relevant to this phase's features
      const relevantRoutes = spec.api.routes.filter((r) =>
        bp.features.some((f) => r.feature.toLowerCase().includes(f.toLowerCase()))
      );

      return {
        number: insertAfter + idx + 2, // +2 to account for setup being 1
        name: bp.name,
        description: bp.description,
        domain: bp.domain,
        features: bp.features,
        featureDetails: [],
        estimatedTokens: bp.estimatedTokens,
        estimatedTime: `${Math.ceil(bp.estimatedTokens / 1500)}-${Math.ceil(bp.estimatedTokens / 1500) + 2} min`,
        dependencies: this.resolveBackendDependencies(bp.dependencies, existingPhases, insertAfter),
        dependencyNames: bp.dependencies,
        testCriteria: bp.testCriteria,
        status: 'pending' as const,
        // Attach architecture context for code generation
        architectureContext: {
          files: bp.files,
          prismaSchema: bp.domain === 'database' ? spec.database.prismaSchema : undefined,
          apiRoutes: relevantRoutes,
        },
      };
    });

    // Insert backend phases and renumber all subsequent phases
    const newPhases = [
      ...existingPhases.slice(0, insertAfter + 1),
      ...convertedPhases,
      ...existingPhases.slice(insertAfter + 1).map((p) => ({
        ...p,
        number: p.number + convertedPhases.length,
        // Update dependencies to account for new phase numbers
        dependencies: p.dependencies.map((depNum) =>
          depNum > insertAfter ? depNum + convertedPhases.length : depNum
        ),
      })),
    ];

    return {
      ...plan,
      phases: newPhases,
      totalPhases: newPhases.length,
      estimatedTotalTokens:
        plan.estimatedTotalTokens +
        sortedBackendPhases.reduce((sum, p) => sum + p.estimatedTokens, 0),
    };
  }

  /**
   * Resolve backend phase dependencies to phase numbers
   */
  private resolveBackendDependencies(
    dependencies: string[],
    existingPhases: DynamicPhase[],
    insertAfter: number
  ): number[] {
    return dependencies
      .map((depName) => {
        const found = existingPhases.find((p) => p.name.toLowerCase() === depName.toLowerCase());
        return found ? found.number : 1; // Default to setup phase
      })
      .filter((num) => num <= insertAfter + 1); // Only depend on phases before this one
  }

  // ============================================================================
  // FEATURE CLASSIFICATION
  // ============================================================================

  /**
   * Classify a single feature
   */
  private classifyFeature(feature: Feature): FeatureClassification {
    const lowerName = feature.name.toLowerCase();
    const lowerDesc = feature.description.toLowerCase();
    const combined = `${lowerName} ${lowerDesc}`;

    // Check for complex patterns first
    for (const pattern of complexPatterns) {
      if (pattern.patterns.some((p) => combined.includes(p))) {
        return {
          originalFeature: feature,
          domain: pattern.domain,
          complexity: 'complex',
          estimatedTokens: pattern.baseTokenEstimate,
          requiresOwnPhase: pattern.requiresOwnPhase,
          suggestedPhaseName: pattern.suggestedName,
          dependencies: this.inferDependencies(feature, pattern.domain),
          keywords: pattern.patterns.filter((p) => combined.includes(p)),
        };
      }
    }

    // Check for moderate patterns
    for (const pattern of moderatePatterns) {
      if (pattern.patterns.some((p) => combined.includes(p))) {
        return {
          originalFeature: feature,
          domain: pattern.domain,
          complexity: 'moderate',
          estimatedTokens: pattern.baseTokenEstimate,
          requiresOwnPhase: false,
          suggestedPhaseName: feature.name,
          dependencies: this.inferDependencies(feature, pattern.domain),
          keywords: pattern.patterns.filter((p) => combined.includes(p)),
        };
      }
    }

    // Default: simple feature
    return {
      originalFeature: feature,
      domain: 'feature',
      complexity: 'simple',
      estimatedTokens: this.config.baseTokenEstimates.simpleFeature,
      requiresOwnPhase: false,
      suggestedPhaseName: feature.name,
      dependencies: [],
      keywords: [],
    };
  }

  /**
   * Classify all features
   */
  private classifyFeatures(features: Feature[]): FeatureClassification[] {
    return features.map((f) => this.classifyFeature(f));
  }

  /**
   * Get implicit features from technical requirements
   */
  private getImplicitFeatures(tech: TechnicalRequirements): FeatureClassification[] {
    const implicit: FeatureClassification[] = [];

    if (tech.needsAuth) {
      const authType = tech.authType || 'email';
      implicit.push({
        originalFeature: {
          id: 'implicit-auth',
          name: 'Authentication System',
          description: `${authType} authentication with login, logout, and session management`,
          priority: 'high',
        },
        domain: 'auth',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Authentication System',
        dependencies: tech.needsDatabase ? ['Database Setup'] : [],
        keywords: ['auth', authType],
      });
    }

    if (tech.needsDatabase) {
      implicit.push({
        originalFeature: {
          id: 'implicit-database',
          name: 'Database Setup',
          description: 'Database schema, configuration, and data models',
          priority: 'high',
        },
        domain: 'database',
        complexity: 'complex',
        estimatedTokens: 3500,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Database Schema',
        dependencies: [],
        keywords: ['database', 'schema'],
      });
    }

    if (tech.needsRealtime) {
      implicit.push({
        originalFeature: {
          id: 'implicit-realtime',
          name: 'Real-time Updates',
          description: 'WebSocket connections for live data synchronization',
          priority: 'medium',
        },
        domain: 'real-time',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Real-time Features',
        dependencies: tech.needsDatabase ? ['Database Setup'] : [],
        keywords: ['realtime', 'websocket'],
      });
    }

    if (tech.needsFileUpload) {
      implicit.push({
        originalFeature: {
          id: 'implicit-storage',
          name: 'File Storage',
          description: 'File upload, storage, and media handling',
          priority: 'medium',
        },
        domain: 'storage',
        complexity: 'complex',
        estimatedTokens: 3500,
        requiresOwnPhase: true,
        suggestedPhaseName: 'File Storage',
        dependencies: [],
        keywords: ['upload', 'storage'],
      });
    }

    if (tech.needsAPI) {
      implicit.push({
        originalFeature: {
          id: 'implicit-api',
          name: 'API Integration',
          description: 'External API connections and service integration',
          priority: 'medium',
        },
        domain: 'integration',
        complexity: 'moderate',
        estimatedTokens: 2500,
        requiresOwnPhase: false,
        suggestedPhaseName: 'API Integration',
        dependencies: [],
        keywords: ['api', 'integration'],
      });
    }

    // State Management Infrastructure (for complex state needs)
    if (tech.stateComplexity === 'complex' || tech.needsStateHistory) {
      implicit.push({
        originalFeature: {
          id: 'implicit-state-management',
          name: 'State Management Infrastructure',
          description:
            'Zustand store setup with slices, persistence middleware, history tracking, and undo/redo capabilities',
          priority: 'high',
        },
        domain: 'setup',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'State Management Setup',
        dependencies: [],
        keywords: ['state', 'store', 'zustand', 'persistence', 'history', 'undo', 'redo'],
      });
    }

    // Context Memory System (for apps that need to remember across sessions)
    if (tech.needsContextPersistence) {
      implicit.push({
        originalFeature: {
          id: 'implicit-context-memory',
          name: 'Context Memory System',
          description:
            'Cross-session context persistence, semantic memory storage, conversation/interaction history, and user preference tracking',
          priority: 'high',
        },
        domain: 'storage',
        complexity: 'complex',
        estimatedTokens: 4500,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Memory & Context System',
        dependencies: tech.needsDatabase ? ['Database Setup'] : [],
        keywords: ['memory', 'context', 'persistence', 'history', 'preferences', 'semantic'],
      });
    }

    // Caching Layer (for performance optimization)
    if (tech.needsCaching) {
      implicit.push({
        originalFeature: {
          id: 'implicit-caching',
          name: 'Caching Infrastructure',
          description:
            'Performance caching layer with memoization, request deduplication, and smart cache invalidation',
          priority: 'medium',
        },
        domain: 'setup',
        complexity: 'moderate',
        estimatedTokens: 2500,
        requiresOwnPhase: false,
        suggestedPhaseName: 'Caching Layer',
        dependencies: [],
        keywords: ['cache', 'memoization', 'performance', 'optimization'],
      });
    }

    // Offline Support (service workers, local sync)
    if (tech.needsOfflineSupport) {
      implicit.push({
        originalFeature: {
          id: 'implicit-offline',
          name: 'Offline Support',
          description:
            'Service worker setup, IndexedDB storage, background sync, and offline-first architecture',
          priority: 'medium',
        },
        domain: 'offline',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Offline Support',
        dependencies: tech.needsDatabase ? ['Database Setup'] : [],
        keywords: ['offline', 'service worker', 'sync', 'pwa', 'indexeddb'],
      });
    }

    // Internationalization (multi-language support)
    if (tech.needsI18n) {
      const languages = tech.i18nLanguages?.join(', ') || 'English, Spanish';
      implicit.push({
        originalFeature: {
          id: 'implicit-i18n',
          name: 'Internationalization',
          description: `Multi-language support for: ${languages}`,
          priority: 'high',
        },
        domain: 'i18n',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Internationalization Setup',
        dependencies: [],
        keywords: ['i18n', 'localization', 'translate', 'language'],
      });
    }

    return implicit;
  }

  /**
   * Extract features from LayoutManifest
   * Maps semantic tags from Layout to Backend Features
   */
  private extractFeaturesFromLayout(manifest: LayoutManifest): FeatureClassification[] {
    const features: FeatureClassification[] = [];

    // Maps semantic tags from Layout to Backend Features
    if (manifest.detectedFeatures.includes('Authentication')) {
      features.push({
        originalFeature: {
          id: 'layout-auth',
          name: 'Authentication System',
          description: 'Detected from Layout Design',
          priority: 'high'
        },
        domain: 'auth',
        complexity: 'complex',
        estimatedTokens: 4000,
        requiresOwnPhase: true,
        suggestedPhaseName: 'Authentication Setup',
        dependencies: [],
        keywords: ['auth', 'login']
      });
    }

    // Add logic for 'FileUpload', 'Stripe', etc.
    if (manifest.detectedFeatures.includes('FileUpload')) {
      features.push({
        originalFeature: {
          id: 'layout-file-upload',
          name: 'File Upload System',
          description: 'Detected from Layout Design',
          priority: 'medium'
        },
        domain: 'storage',
        complexity: 'complex',
        estimatedTokens: 3500,
        requiresOwnPhase: true,
        suggestedPhaseName: 'File Storage',
        dependencies: [],
        keywords: ['upload', 'storage', 'file']
      });
    }

    return features;
  }

  /**
   * Infer state complexity from features (auto-detection)
   * Called during concept extraction to set stateComplexity automatically
   */
  static inferStateComplexity(features: Feature[]): 'simple' | 'moderate' | 'complex' {
    const allText = features
      .map((f) => `${f.name.toLowerCase()} ${f.description.toLowerCase()}`)
      .join(' ');

    // Check for complex indicators
    const complexMatches = STATE_COMPLEXITY_KEYWORDS.complex.filter((kw) =>
      allText.includes(kw.toLowerCase())
    ).length;

    if (complexMatches >= 2) return 'complex';

    // Check for moderate indicators
    const moderateMatches = STATE_COMPLEXITY_KEYWORDS.moderate.filter((kw) =>
      allText.includes(kw.toLowerCase())
    ).length;

    if (complexMatches >= 1 || moderateMatches >= 3) return 'moderate';

    return 'simple';
  }

  /**
   * Detect if features indicate need for context persistence (auto-detection)
   * Called during concept extraction to set needsContextPersistence automatically
   */
  static detectMemoryNeeds(
    features: Feature[],
    description: string
  ): {
    needsContextPersistence: boolean;
    needsStateHistory: boolean;
    needsCaching: boolean;
  } {
    const allText = [
      description.toLowerCase(),
      ...features.map((f) => `${f.name.toLowerCase()} ${f.description.toLowerCase()}`),
    ].join(' ');

    // Use centralized MEMORY_DETECTION_KEYWORDS for consistent detection
    const needsContextPersistence = MEMORY_DETECTION_KEYWORDS.contextPersistence.some((kw) =>
      allText.includes(kw)
    );

    const needsStateHistory = MEMORY_DETECTION_KEYWORDS.stateHistory.some((kw) =>
      allText.includes(kw)
    );

    // Caching requires 2+ keyword matches to avoid false positives
    const needsCaching =
      MEMORY_DETECTION_KEYWORDS.caching.filter((kw) => allText.includes(kw)).length >= 2;

    return { needsContextPersistence, needsStateHistory, needsCaching };
  }

  /**
   * Infer dependencies for a feature based on its domain
   */
  private inferDependencies(feature: Feature, _domain: FeatureDomain): string[] {
    const deps: string[] = [];
    const lowerDesc = feature.description.toLowerCase();

    // Features that typically depend on auth
    if (
      lowerDesc.includes('user') ||
      lowerDesc.includes('account') ||
      lowerDesc.includes('profile')
    ) {
      deps.push('Authentication System');
    }

    // Features that typically depend on database
    if (
      lowerDesc.includes('save') ||
      lowerDesc.includes('store') ||
      lowerDesc.includes('persist') ||
      lowerDesc.includes('history')
    ) {
      deps.push('Database Setup');
    }

    // Features that depend on storage
    if (
      lowerDesc.includes('image') ||
      lowerDesc.includes('photo') ||
      lowerDesc.includes('file') ||
      lowerDesc.includes('upload')
    ) {
      deps.push('File Storage');
    }

    return deps;
  }

  // ============================================================================
  // DOMAIN GROUPING
  // ============================================================================

  /**
   * Group features by their domain
   */
  private groupByDomain(classifications: FeatureClassification[]): FeaturesByDomain {
    const groups = new Map<FeatureDomain, FeatureClassification[]>();

    for (const classification of classifications) {
      // Features requiring their own phase get isolated
      if (classification.requiresOwnPhase) {
        // Use a unique key for isolated features
        const isolatedDomain = classification.domain;
        if (!groups.has(isolatedDomain)) {
          groups.set(isolatedDomain, []);
        }

        // Check if this specific feature type already exists
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const existing = groups.get(isolatedDomain)!;
        const alreadyExists = existing.some(
          (c) => c.suggestedPhaseName === classification.suggestedPhaseName
        );

        if (!alreadyExists) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          groups.get(isolatedDomain)!.push(classification);
        }
      } else {
        // Group by domain
        if (!groups.has(classification.domain)) {
          groups.set(classification.domain, []);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        groups.get(classification.domain)!.push(classification);
      }
    }

    return groups;
  }

  // ============================================================================
  // PHASE GENERATION
  // ============================================================================

  /**
   * Generate phases from grouped features
   */
  private generatePhasesFromGroups(
    featuresByDomain: FeaturesByDomain,
    concept: AppConcept
  ): DynamicPhase[] {
    const phases: DynamicPhase[] = [];
    let phaseNumber = 1;

    // Phase 1: ALWAYS start with Setup
    phases.push(this.createSetupPhase(phaseNumber++, concept));

    // Phase 2: Design System (if layoutDesign exists) - creates design tokens and base components
    // This ensures all subsequent phases have access to the complete design specification
    if (concept.layoutDesign) {
      phases.push(this.createDesignSystemPhase(phaseNumber++, concept, concept.layoutDesign));
    }

    // Phase 2/3: Database (if needed) - always comes early
    if (featuresByDomain.has('database')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dbFeatures = featuresByDomain.get('database')!;
      // Include data model details in database phase
      const dataModelContext = concept.technical.dataModels
        ? `. Data models: ${concept.technical.dataModels.map((m) => m.name).join(', ')}`
        : '';
      phases.push(
        this.createPhaseFromFeatures(
          phaseNumber++,
          'Database Schema',
          `Set up database tables, types, and configuration${dataModelContext}`,
          'database',
          dbFeatures,
          concept
        )
      );
      featuresByDomain.delete('database');
    }

    // Phase 3: Authentication (if needed) - comes after database
    if (featuresByDomain.has('auth')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const authFeatures = featuresByDomain.get('auth')!;
      // Include role context in auth phase (with capabilities for RBAC)
      const roleContext =
        concept.roles && concept.roles.length > 0
          ? `. User roles: ${concept.roles
              .map((r) => {
                const caps =
                  r.capabilities && r.capabilities.length > 0
                    ? ` (${r.capabilities.slice(0, 3).join(', ')}${r.capabilities.length > 3 ? '...' : ''})`
                    : '';
                return `${r.name}${caps}`;
              })
              .join(', ')}`
          : '';
      phases.push(
        this.createPhaseFromFeatures(
          phaseNumber++,
          'Authentication System',
          `Implement ${concept.technical.authType || 'email'} authentication${roleContext}`,
          'auth',
          authFeatures,
          concept
        )
      );
      featuresByDomain.delete('auth');
    }

    // Process remaining domains in priority order
    const domainPriority: FeatureDomain[] = [
      'core-entity',
      'feature',
      'ui-component',
      'integration',
      'storage',
      'real-time',
      'notification',
      'search',
      'analytics',
      'admin',
      'ui-role',
      'offline',
    ];

    for (const domain of domainPriority) {
      if (!featuresByDomain.has(domain)) continue;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const features = featuresByDomain.get(domain)!;

      // Split large feature groups into multiple phases
      const subPhases = this.splitFeaturesIntoPhases(features, domain);

      for (const subPhase of subPhases) {
        phases.push(
          this.createPhaseFromFeatures(
            phaseNumber++,
            subPhase.name,
            subPhase.description,
            domain,
            subPhase.features,
            concept // Pass concept for rich context
          )
        );
      }
    }

    // Final Phase: ALWAYS end with Polish
    phases.push(this.createPolishPhase(phaseNumber, concept));

    return phases;
  }

  /**
   * Split features into appropriately sized phases
   */
  private splitFeaturesIntoPhases(
    features: FeatureClassification[],
    domain: FeatureDomain
  ): Array<{ name: string; description: string; features: FeatureClassification[] }> {
    const subPhases: Array<{
      name: string;
      description: string;
      features: FeatureClassification[];
    }> = [];

    let currentFeatures: FeatureClassification[] = [];
    let currentTokens = 0;
    let subPhaseIndex = 1;

    // Sort by priority (high first) and complexity (simple first within priority)
    const sortedFeatures = [...features].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.originalFeature.priority] ?? 1;
      const bPriority = priorityOrder[b.originalFeature.priority] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const complexityOrder = { simple: 0, moderate: 1, complex: 2 };
      return complexityOrder[a.complexity] - complexityOrder[b.complexity];
    });

    for (const feature of sortedFeatures) {
      const wouldExceedTokens =
        currentTokens + feature.estimatedTokens > this.config.maxTokensPerPhase;
      const wouldExceedFeatures = currentFeatures.length >= this.config.maxFeaturesPerPhase;

      if ((wouldExceedTokens || wouldExceedFeatures) && currentFeatures.length > 0) {
        // Save current phase and start new one
        subPhases.push({
          name: this.generatePhaseName(
            domain,
            currentFeatures,
            subPhaseIndex,
            subPhases.length +
              Math.ceil(
                (sortedFeatures.length - currentFeatures.length) / this.config.maxFeaturesPerPhase
              )
          ),
          description: this.generatePhaseDescription(currentFeatures),
          features: currentFeatures,
        });

        currentFeatures = [];
        currentTokens = 0;
        subPhaseIndex++;
      }

      currentFeatures.push(feature);
      currentTokens += feature.estimatedTokens;
    }

    // Don't forget the last batch
    if (currentFeatures.length > 0) {
      subPhases.push({
        name: this.generatePhaseName(domain, currentFeatures, subPhaseIndex, subPhases.length + 1),
        description: this.generatePhaseDescription(currentFeatures),
        features: currentFeatures,
      });
    }

    return subPhases;
  }

  /**
   * Generate a readable phase name
   */
  private generatePhaseName(
    domain: FeatureDomain,
    features: FeatureClassification[],
    partIndex: number,
    totalParts: number
  ): string {
    // If there's only one feature, use its suggested name
    if (features.length === 1) {
      return features[0].suggestedPhaseName;
    }

    // Domain-based naming
    const domainNames: Record<FeatureDomain, string> = {
      setup: 'Project Setup',
      database: 'Database',
      auth: 'Authentication',
      i18n: 'Internationalization',
      'core-entity': 'Core Features',
      feature: 'Features',
      'ui-component': 'UI Components',
      integration: 'Integrations',
      'real-time': 'Real-time',
      storage: 'Storage',
      notification: 'Notifications',
      offline: 'Offline Support',
      search: 'Search',
      analytics: 'Analytics',
      admin: 'Admin',
      'ui-role': 'Role Views',
      testing: 'Testing',
      polish: 'Polish',
    };

    const baseName = domainNames[domain] || 'Features';

    // Add part number if split
    if (totalParts > 1) {
      return `${baseName} (Part ${partIndex})`;
    }

    return baseName;
  }

  /**
   * Generate a phase description from features
   */
  private generatePhaseDescription(features: FeatureClassification[]): string {
    if (features.length === 1) {
      return features[0].originalFeature.description;
    }

    const featureNames = features.map((f) => f.originalFeature.name);
    if (featureNames.length <= 3) {
      return `Implement ${featureNames.join(', ')}`;
    }

    return `Implement ${featureNames.slice(0, 2).join(', ')}, and ${featureNames.length - 2} more features`;
  }

  // ============================================================================
  // SPECIAL PHASES
  // ============================================================================

  /**
   * Create the setup phase (always first)
   * Includes design context from concept for consistent styling
   */
  private createSetupPhase(phaseNumber: number, concept: AppConcept): DynamicPhase {
    // Build design context from uiPreferences
    const designContext = this.buildDesignContext(concept);

    return {
      number: phaseNumber,
      name: 'Project Setup',
      description: `Initialize project structure, dependencies, and base configuration for "${concept.name}". ${designContext}`,
      domain: 'setup',
      features: [
        'Folder structure and organization',
        'Package.json with dependencies',
        'TypeScript configuration',
        `Base styling (Tailwind setup with ${concept.uiPreferences.colorScheme} theme, ${concept.uiPreferences.style} style)`,
        'Core layout components',
        'Routing configuration',
        ...(concept.uiPreferences.layout === 'dashboard' ? ['Dashboard layout skeleton'] : []),
        // Production features - always included
        'ErrorBoundary component wrapping App with fallback UI and retry button',
        'Semantic HTML structure (nav, main, section, footer)',
        'Accessibility foundation (ARIA labels, keyboard navigation, focus indicators)',
        'SEO meta tags (title, description, Open Graph)',
      ],
      featureDetails: [],
      // Add ~800 tokens for production features
      estimatedTokens: this.config.baseTokenEstimates.setupPhase + 800,
      estimatedTime: '3-4 min',
      dependencies: [],
      dependencyNames: [],
      testCriteria: [
        'Project runs without errors',
        'Base layout renders correctly',
        `Theme matches ${concept.uiPreferences.style} style with ${concept.uiPreferences.colorScheme} colors`,
        'Navigation works between routes',
        'No console errors',
        // Production test criteria
        'ErrorBoundary catches errors and displays fallback UI',
        'All interactive elements are keyboard accessible',
        'Semantic HTML elements are used (nav, main, footer, not just divs)',
        'Page has proper title and meta description',
      ],
      status: 'pending',
      // Include concept context for execution (including layoutDesign for design-aware styling)
      conceptContext: {
        purpose: concept.purpose,
        targetUsers: concept.targetUsers,
        uiPreferences: concept.uiPreferences,
        layoutDesign: concept.layoutDesign, // Include layout design for setup phase
        roles: concept.roles,
      },
    };
  }

  /**
   * Create the Design System phase (when layoutDesign exists)
   * This phase creates design tokens, component variants, and layout components
   * ensuring all subsequent phases have access to the complete design specification
   */
  private createDesignSystemPhase(
    phaseNumber: number,
    concept: AppConcept,
    layoutDesign: LayoutDesign
  ): DynamicPhase {
    const { globalStyles, components, responsive } = layoutDesign;

    // Build detailed design context for the phase description
    const designDetails: string[] = [];
    if (globalStyles.typography) {
      designDetails.push(
        `Typography: ${globalStyles.typography.fontFamily}, ${globalStyles.typography.headingSize} headings`
      );
    }
    if (globalStyles.colors) {
      designDetails.push(
        `Colors: primary ${globalStyles.colors.primary}, ${Object.keys(globalStyles.colors).length} color tokens`
      );
    }
    if (globalStyles.spacing) {
      designDetails.push(
        `Spacing: ${globalStyles.spacing.density} density, ${globalStyles.spacing.containerWidth} container`
      );
    }
    if (globalStyles.effects) {
      designDetails.push(
        `Effects: ${globalStyles.effects.borderRadius} radius, ${globalStyles.effects.shadows} shadows`
      );
    }

    // List components to be created
    const componentsList: string[] = [];
    if (components.header?.visible) componentsList.push('Header');
    if (components.sidebar?.visible) componentsList.push('Sidebar');
    if (components.hero?.visible) componentsList.push('Hero');
    if (components.cards) componentsList.push('Cards');
    if (components.lists) componentsList.push('Lists');
    if (components.stats?.visible) componentsList.push('Stats');
    if (components.footer?.visible) componentsList.push('Footer');
    if (components.navigation) componentsList.push('Navigation');

    return {
      number: phaseNumber,
      name: 'Design System Setup',
      description: `Create complete design system based on layout specifications for "${concept.name}". ${designDetails.join('. ')}. Components: ${componentsList.join(', ')}. CRITICAL: Use EXACT colors and values from the design specification - do not substitute.`,
      domain: 'ui-component',
      features: [
        `CRITICAL: Create globals.css with EXACT CSS variables: --color-primary: ${globalStyles.colors.primary}; --color-background: ${globalStyles.colors.background}; --color-surface: ${globalStyles.colors.surface}; --color-text: ${globalStyles.colors.text}; --color-border: ${globalStyles.colors.border};`,
        `Tailwind theme extension in tailwind.config.ts extending colors with primary: "${globalStyles.colors.primary}", background: "${globalStyles.colors.background}", surface: "${globalStyles.colors.surface}"`,
        `Typography: font-family "${globalStyles.typography.fontFamily}", headings ${globalStyles.typography.headingWeight}, body ${globalStyles.typography.bodyWeight}`,
        `Color palette: primary ${globalStyles.colors.primary}, secondary ${globalStyles.colors.secondary || globalStyles.colors.primary}, accent ${globalStyles.colors.accent || globalStyles.colors.primary}`,
        `Spacing: ${globalStyles.spacing.density} density, ${globalStyles.spacing.containerWidth} container (${globalStyles.spacing.containerWidth === 'narrow' ? 'max-w-3xl' : globalStyles.spacing.containerWidth === 'standard' ? 'max-w-5xl' : globalStyles.spacing.containerWidth === 'wide' ? 'max-w-7xl' : 'max-w-full'})`,
        `Effects: ${globalStyles.effects.borderRadius} radius (${globalStyles.effects.borderRadius === 'none' ? 'rounded-none' : globalStyles.effects.borderRadius === 'sm' ? 'rounded-sm' : globalStyles.effects.borderRadius === 'md' ? 'rounded-md' : globalStyles.effects.borderRadius === 'lg' ? 'rounded-lg' : globalStyles.effects.borderRadius === 'xl' ? 'rounded-xl' : 'rounded-full'}), ${globalStyles.effects.shadows} shadows`,
        ...componentsList.map((c) => `${c} component matching exact design specs`),
        `Responsive: mobile ${responsive.mobileBreakpoint}px (sm:), tablet ${responsive.tabletBreakpoint}px (lg:)`,
        'Layout structure with design-specified header, content, and footer arrangement',
      ],
      featureDetails: [],
      estimatedTokens: 4500, // Design system is substantial
      estimatedTime: '4-6 min',
      dependencies: [1], // Depends on Project Setup
      dependencyNames: ['Project Setup'],
      testCriteria: [
        'Design tokens are accessible via CSS variables',
        'Tailwind classes match design specifications',
        `Typography renders with ${globalStyles.typography.fontFamily} font`,
        `Primary color ${globalStyles.colors.primary} is applied correctly`,
        'All layout components render with correct styling',
        `Responsive breakpoints work at ${responsive.mobileBreakpoint}px and ${responsive.tabletBreakpoint}px`,
        'No style conflicts or overrides',
      ],
      status: 'pending',
      // CRITICAL: Include full layoutDesign for code generation
      conceptContext: {
        purpose: concept.purpose,
        targetUsers: concept.targetUsers,
        uiPreferences: concept.uiPreferences,
        roles: concept.roles,
        layoutDesign: layoutDesign, // Full design specification
      },
    };
  }

  /**
   * Build design context string from concept
   */
  private buildDesignContext(concept: AppConcept): string {
    const parts: string[] = [];

    if (concept.uiPreferences) {
      if (concept.uiPreferences.style && concept.uiPreferences.style !== 'custom') {
        parts.push(`${concept.uiPreferences.style} design style`);
      }
      if (concept.uiPreferences.colorScheme && concept.uiPreferences.colorScheme !== 'auto') {
        parts.push(`${concept.uiPreferences.colorScheme} color scheme`);
      }
      if (concept.uiPreferences.primaryColor) {
        parts.push(`primary color: ${concept.uiPreferences.primaryColor}`);
      }
      if (concept.uiPreferences.layout && concept.uiPreferences.layout !== 'custom') {
        parts.push(`${concept.uiPreferences.layout} layout`);
      }
    }

    if (concept.targetUsers) {
      parts.push(`designed for ${concept.targetUsers}`);
    }

    return parts.length > 0 ? `Design: ${parts.join(', ')}.` : '';
  }

  /**
   * Create the polish phase (always last)
   * Includes full concept context for final refinements
   */
  private createPolishPhase(phaseNumber: number, concept: AppConcept): DynamicPhase {
    const designContext = this.buildDesignContext(concept);

    return {
      number: phaseNumber,
      name: 'Polish & Documentation',
      description: `Final touches, animations, error states, and documentation for "${concept.name}". ${designContext}`,
      domain: 'polish',
      features: [
        'Loading states and skeletons',
        'Error handling and error states',
        'Empty states with helpful messages',
        `Micro-interactions and animations (${concept.uiPreferences.style} style)`,
        'README.md with setup instructions',
        'Final code cleanup',
        ...(concept.roles && concept.roles.length > 0
          ? [`Role-specific UX polish for: ${concept.roles.map((r) => r.name).join(', ')}`]
          : []),
      ],
      featureDetails: [],
      estimatedTokens: this.config.baseTokenEstimates.polishPhase,
      estimatedTime: '2-3 min',
      dependencies: [phaseNumber - 1], // Depends on all previous
      dependencyNames: ['All previous phases'],
      testCriteria: [
        'All states have appropriate feedback',
        `Animations match ${concept.uiPreferences.style} style`,
        'Documentation is complete',
        `App serves ${concept.targetUsers} effectively`,
        'No console warnings or errors',
      ],
      status: 'pending',
      // Include full concept context (including layoutDesign for design-aware animations)
      conceptContext: {
        purpose: concept.purpose,
        targetUsers: concept.targetUsers,
        uiPreferences: concept.uiPreferences,
        layoutDesign: concept.layoutDesign, // Include layout design for polish animations
        roles: concept.roles,
        conversationContext: concept.conversationContext,
      },
      relevantRoles: concept.roles?.map((r) => r.name),
    };
  }

  /**
   * Create a phase from classified features
   * Includes concept context for rich detail preservation
   */
  private createPhaseFromFeatures(
    phaseNumber: number,
    name: string,
    description: string,
    domain: FeatureDomain,
    features: FeatureClassification[],
    concept?: AppConcept
  ): DynamicPhase {
    const totalTokens = features.reduce((sum, f) => sum + f.estimatedTokens, 0);
    const estimatedMinutes = Math.ceil(totalTokens / 1500); // Rough estimate

    // Determine which roles are relevant to this phase's features
    const relevantRoles = this.findRelevantRoles(features, concept?.roles);

    // Build enriched description with context
    let enrichedDescription = description;
    if (concept) {
      const designContext = this.buildDesignContext(concept);
      if (designContext) {
        enrichedDescription = `${description}. ${designContext}`;
      }
      if (relevantRoles.length > 0) {
        enrichedDescription += ` For users: ${relevantRoles.join(', ')}.`;
      }
    }

    return {
      number: phaseNumber,
      name,
      description: enrichedDescription,
      domain,
      features: features.map((f) => f.originalFeature.name),
      featureDetails: features,
      estimatedTokens: totalTokens,
      estimatedTime: `${estimatedMinutes}-${estimatedMinutes + 2} min`,
      dependencies: [], // Will be calculated later
      dependencyNames: [],
      testCriteria: this.generateTestCriteria(features, domain),
      status: 'pending',
      // Include concept context if available (including layoutDesign for design-aware styling)
      conceptContext: concept
        ? {
            purpose: concept.purpose,
            targetUsers: concept.targetUsers,
            uiPreferences: concept.uiPreferences,
            layoutDesign: concept.layoutDesign, // CRITICAL: Include layout design for all phases
            roles: concept.roles,
            dataModels: concept.technical.dataModels,
          }
        : undefined,
      relevantRoles: relevantRoles.length > 0 ? relevantRoles : undefined,
    };
  }

  /**
   * Find which user roles are relevant to a set of features
   */
  private findRelevantRoles(features: FeatureClassification[], roles?: UserRole[]): string[] {
    if (!roles || roles.length === 0) return [];

    const relevantRoles: Set<string> = new Set();

    for (const feature of features) {
      const featureText =
        `${feature.originalFeature.name} ${feature.originalFeature.description}`.toLowerCase();

      for (const role of roles) {
        const roleName = role.name.toLowerCase();
        // Check if feature mentions this role
        if (featureText.includes(roleName)) {
          relevantRoles.add(role.name);
        }
        // Check if feature relates to role capabilities
        for (const capability of role.capabilities) {
          if (featureText.includes(capability.toLowerCase())) {
            relevantRoles.add(role.name);
            break;
          }
        }
      }
    }

    return Array.from(relevantRoles);
  }

  /**
   * Generate test criteria for a phase
   */
  private generateTestCriteria(features: FeatureClassification[], domain: FeatureDomain): string[] {
    const criteria: string[] = [];

    // Domain-specific criteria
    switch (domain) {
      case 'auth':
        criteria.push('Login flow works correctly');
        criteria.push('Logout clears session');
        criteria.push('Protected routes redirect unauthenticated users');
        break;
      case 'database':
        criteria.push('Schema is valid');
        criteria.push('Types are generated');
        criteria.push('Queries execute without errors');
        break;
      case 'storage':
        criteria.push('Files can be uploaded');
        criteria.push('Files can be retrieved');
        criteria.push('Invalid files are rejected');
        break;
      case 'real-time':
        criteria.push('WebSocket connection establishes');
        criteria.push('Real-time updates are received');
        criteria.push('Reconnection works on disconnect');
        break;
      default:
        // Feature-based criteria
        for (const feature of features.slice(0, 6)) {
          criteria.push(`${feature.originalFeature.name} works as expected`);
        }
        if (features.length > 6) {
          criteria.push(`All ${features.length} features are functional`);
        }
    }

    // Always include these
    criteria.push('No console errors');

    return criteria;
  }

  // ============================================================================
  // DEPENDENCY CALCULATION
  // ============================================================================

  /**
   * Calculate dependencies between phases
   */
  private calculatePhaseDependencies(phases: DynamicPhase[]): void {
    // Build a map of phase names to numbers
    const phaseByName = new Map<string, number>();
    for (const phase of phases) {
      phaseByName.set(phase.name, phase.number);
      // Also map by domain for implicit dependencies
      phaseByName.set(phase.domain, phase.number);
    }

    for (const phase of phases) {
      const deps = new Set<number>();
      const depNames = new Set<string>();

      // Phase 1 (setup) has no dependencies
      if (phase.number === 1) continue;

      // All phases depend on setup
      deps.add(1);
      depNames.add('Project Setup');

      // Check feature dependencies
      for (const feature of phase.featureDetails) {
        for (const depName of feature.dependencies) {
          const depPhaseNum = phaseByName.get(depName);
          if (depPhaseNum && depPhaseNum < phase.number) {
            deps.add(depPhaseNum);
            depNames.add(depName);
          }
        }
      }

      // Domain-based implicit dependencies
      if (phase.domain !== 'setup' && phase.domain !== 'database') {
        // Most features depend on database if it exists
        const dbPhase = phases.find((p) => p.domain === 'database');
        if (dbPhase && dbPhase.number < phase.number) {
          deps.add(dbPhase.number);
          depNames.add('Database Schema');
        }
      }

      // Auth-dependent domains
      const authDependentDomains: FeatureDomain[] = ['admin', 'ui-role', 'analytics'];
      if (authDependentDomains.includes(phase.domain)) {
        const authPhase = phases.find((p) => p.domain === 'auth');
        if (authPhase && authPhase.number < phase.number) {
          deps.add(authPhase.number);
          depNames.add('Authentication System');
        }
      }

      phase.dependencies = Array.from(deps).sort((a, b) => a - b);
      phase.dependencyNames = Array.from(depNames);
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate the generated phase plan
   */
  private validatePhasePlan(phases: DynamicPhase[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check phase count
    if (phases.length < this.config.minPhases) {
      errors.push(`Too few phases: ${phases.length} (minimum: ${this.config.minPhases})`);
    }
    if (phases.length > this.config.maxPhases) {
      warnings.push(
        `High phase count: ${phases.length} (recommended max: ${this.config.maxPhases})`
      );
    }

    // Check for circular dependencies
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (phaseNum: number): boolean => {
      visited.add(phaseNum);
      recursionStack.add(phaseNum);

      const phase = phases.find((p) => p.number === phaseNum);
      if (phase) {
        for (const dep of phase.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(phaseNum);
      return false;
    };

    for (const phase of phases) {
      if (!visited.has(phase.number) && hasCycle(phase.number)) {
        errors.push(`Circular dependency detected involving phase ${phase.number}`);
      }
    }

    // Check token estimates
    for (const phase of phases) {
      if (phase.estimatedTokens > this.config.maxTokensPerPhase * 1.5) {
        warnings.push(
          `Phase ${phase.number} (${phase.name}) may exceed context limits: ${phase.estimatedTokens} tokens`
        );
      }
    }

    // Check for orphan features
    const allFeatures = phases.flatMap((p) => p.features);
    if (allFeatures.length === 0) {
      warnings.push('No features were included in the phase plan');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // PLAN CREATION
  // ============================================================================

  /**
   * Create the final phase plan object
   */
  private createPhasePlan(phases: DynamicPhase[], concept: AppConcept): DynamicPhasePlan {
    // Enhance all phases with rich context from the concept
    const enhancedPhases = phases.map((phase) => this.enhancePhaseWithContext(phase, concept));

    const totalTokens = enhancedPhases.reduce((sum, p) => sum + p.estimatedTokens, 0);
    const totalMinutes = enhancedPhases.reduce((sum, p) => {
      const match = p.estimatedTime.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 3);
    }, 0);

    // Determine overall complexity
    let complexity: DynamicPhasePlan['complexity'];
    if (enhancedPhases.length <= 3) {
      complexity = 'simple';
    } else if (enhancedPhases.length <= 6) {
      complexity = 'moderate';
    } else if (enhancedPhases.length <= 12) {
      complexity = 'complex';
    } else {
      complexity = 'enterprise';
    }

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      appName: concept.name,
      appDescription: concept.description,
      totalPhases: enhancedPhases.length,
      phases: enhancedPhases,
      estimatedTotalTime: `${totalMinutes}-${totalMinutes + enhancedPhases.length * 2} min`,
      estimatedTotalTokens: totalTokens,
      complexity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      concept,
      currentPhaseNumber: 0,
      completedPhaseNumbers: [],
      failedPhaseNumbers: [],
      accumulatedFiles: [],
      accumulatedFeatures: [],
    };
  }

  /**
   * Get analysis details for debugging/reporting
   */
  private getAnalysisDetails(
    classifications: FeatureClassification[],
    featuresByDomain: FeaturesByDomain
  ) {
    const domainBreakdown: Record<string, number> = {};
    for (const [domain, features] of featuresByDomain) {
      domainBreakdown[domain] = features.length;
    }

    const complexFeatures = classifications.filter((c) => c.complexity === 'complex').length;
    const totalTokens = classifications.reduce((sum, c) => sum + c.estimatedTokens, 0);
    const avgTokensPerPhase = totalTokens / Math.max(1, featuresByDomain.size + 2); // +2 for setup and polish

    return {
      totalFeatures: classifications.length,
      complexFeatures,
      domainBreakdown: domainBreakdown as Record<FeatureDomain, number>,
      estimatedContextPerPhase: Math.round(avgTokensPerPhase),
    };
  }

  // ============================================================================
  // CONTEXT EXTRACTION METHODS
  // ============================================================================

  /**
   * Extract relevant context from conversationContext for a specific phase
   */
  private extractRelevantContext(context: string, domain: FeatureDomain): string {
    if (!context) return '';

    const keywords = PHASE_KEYWORDS[domain] || [];
    if (keywords.length === 0) return '';

    // Split context into paragraphs
    const paragraphs = context.split(/\n\n+/).filter((p) => p.trim().length > 20);

    // Score paragraphs by keyword relevance
    const scored = paragraphs.map((p) => {
      const lowerP = p.toLowerCase();
      const score = keywords.filter((k) => lowerP.includes(k.toLowerCase())).length;
      return { text: p, score };
    });

    // Get top relevant paragraphs (max 12000 chars for large complex apps)
    const relevant = scored
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((p) => p.text);

    const result = relevant.join('\n\n');
    const limit = 12000;

    if (result.length > limit) {
      // Add truncation notice so AI knows context was cut
      return (
        result.slice(0, limit) +
        `\n\n[NOTE: ${result.length - limit} additional characters of conversation context omitted. Focus on requirements above.]`
      );
    }
    return result;
  }

  /**
   * Extract feature specifications from concept for a phase
   */
  private extractFeatureSpecs(
    concept: AppConcept,
    domain: FeatureDomain,
    featureNames: string[]
  ): FeatureSpecification[] {
    const specs: FeatureSpecification[] = [];
    const context = concept.conversationContext || '';

    for (const featureName of featureNames) {
      // Extract user stories related to this feature
      const userStories = this.extractPatternMatches(
        context,
        new RegExp(
          `(?:as a|user (?:can|wants to|should))\\s+[^.]*${this.escapeRegex(featureName)}[^.]*`,
          'gi'
        )
      );

      // Extract acceptance criteria
      const acceptanceCriteria = this.extractPatternMatches(
        context,
        new RegExp(`(?:should|must|needs to)\\s+[^.]*${this.escapeRegex(featureName)}[^.]*`, 'gi')
      );

      // Extract technical notes
      const technicalNotes = this.extractPatternMatches(
        context,
        new RegExp(
          `(?:api|database|backend|endpoint)[^.]*${this.escapeRegex(featureName)}[^.]*`,
          'gi'
        )
      );

      // Determine priority from feature
      const feature = concept.coreFeatures.find((f) => f.name === featureName);
      const priority = feature?.priority || 'medium';

      specs.push({
        name: featureName,
        userStories: userStories.slice(0, 6),
        acceptanceCriteria: acceptanceCriteria.slice(0, 6),
        technicalNotes: technicalNotes.slice(0, 6),
        priority,
      });
    }

    return specs;
  }

  /**
   * Extract workflow specifications from concept for a phase
   */
  private extractWorkflowSpecs(
    concept: AppConcept,
    domain: FeatureDomain
  ): WorkflowSpecification[] {
    const specs: WorkflowSpecification[] = [];
    const keywords = PHASE_KEYWORDS[domain] || [];

    // Use workflows from concept if available
    if (concept.workflows) {
      for (const workflow of concept.workflows) {
        // Check if workflow is relevant to this phase
        const workflowText =
          `${workflow.name} ${workflow.description || ''} ${workflow.steps.join(' ')}`.toLowerCase();
        const isRelevant = keywords.some((k) => workflowText.includes(k.toLowerCase()));

        if (isRelevant) {
          specs.push({
            name: workflow.name,
            trigger: workflow.steps[0] || 'User initiates',
            steps: workflow.steps.map((step) => ({
              action: step,
              actor: workflow.involvedRoles[0] || 'User',
            })),
            errorHandling: undefined,
          });
        }
      }
    }

    return specs.slice(0, 10);
  }

  /**
   * Extract validation rules from conversation context
   */
  private extractValidationRules(context: string, domain: FeatureDomain): string[] {
    if (!context) return [];

    const patterns = [
      /(?:must be|should be|has to be)\s+([^.]{10,80})/gi,
      /(?:validate|validation|valid)\s+([^.]{10,80})/gi,
      /(?:required|mandatory|minimum|maximum)\s+([^.]{10,80})/gi,
      /(?:at least|at most|between)\s+([^.]{10,80})/gi,
    ];

    const rules: string[] = [];
    const keywords = PHASE_KEYWORDS[domain] || [];

    for (const pattern of patterns) {
      const matches = this.extractPatternMatches(context, pattern);
      // Filter by relevance to domain
      for (const match of matches) {
        if (keywords.some((k) => match.toLowerCase().includes(k.toLowerCase()))) {
          rules.push(match);
        }
      }
    }

    return Array.from(new Set(rules)).slice(0, 10);
  }

  /**
   * Helper to extract pattern matches from text
   */
  private extractPatternMatches(text: string, pattern: RegExp): string[] {
    const matches: string[] = [];
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      const value = (match[1] || match[0]).trim();
      if (value.length > 5 && value.length < 150 && !matches.includes(value)) {
        matches.push(value);
      }
    }

    return matches;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Enhance a phase with rich context from the concept
   */
  private enhancePhaseWithContext(phase: DynamicPhase, concept: AppConcept): DynamicPhase {
    const domain = phase.domain;
    const conversationContext = concept.conversationContext || '';

    // Extract relevant context for this phase
    const relevantContext = this.extractRelevantContext(conversationContext, domain);

    // Extract feature specifications
    const featureSpecs = this.extractFeatureSpecs(concept, domain, phase.features);

    // Extract workflow specifications
    const workflowSpecs = this.extractWorkflowSpecs(concept, domain);

    // Extract validation rules
    const validationRules = this.extractValidationRules(conversationContext, domain);

    // Build enhanced concept context
    const enhancedConceptContext: PhaseConceptContext = {
      ...phase.conceptContext,
      conversationContext: relevantContext,
      featureSpecs: featureSpecs.length > 0 ? featureSpecs : undefined,
      workflowSpecs: workflowSpecs.length > 0 ? workflowSpecs : undefined,
      technicalConstraints: validationRules.length > 0 ? validationRules : undefined,
    };

    // Build enhanced description with context
    let enhancedDescription = phase.description;
    if (relevantContext) {
      enhancedDescription += '\n\nContext from requirements:\n' + relevantContext.slice(0, 500);
    }

    return {
      ...phase,
      description: enhancedDescription,
      conceptContext: enhancedConceptContext,
    };
  }

  // ============================================================================
  // SMART CODE CONTEXT METHODS
  // ============================================================================

  /**
   * Maximum code context size (increased to 80KB for complex apps)
   */
  private static readonly MAX_CODE_CONTEXT = 80000;

  /**
   * Build smart code context from previous phases with importance scoring
   * Prioritizes type definitions, API contracts, and reusable utilities
   */
  buildSmartCodeContext(generatedFiles: Array<{ path: string; content: string }>): string {
    if (!generatedFiles || generatedFiles.length === 0) return '';

    // Score and sort files by importance
    const scoredFiles = generatedFiles
      .map((file) => ({
        ...file,
        importance: this.calculateFileImportance(file),
      }))
      .sort((a, b) => b.importance - a.importance);

    const includedBlocks: string[] = [];
    let totalSize = 0;

    for (const file of scoredFiles) {
      const blockText = `// File: ${file.path}\n${file.content}\n\n`;

      if (totalSize + blockText.length <= DynamicPhaseGenerator.MAX_CODE_CONTEXT) {
        includedBlocks.push(blockText);
        totalSize += blockText.length;
      } else if (file.importance >= 0.8) {
        // For high-importance files, truncate instead of skip
        const remaining = DynamicPhaseGenerator.MAX_CODE_CONTEXT - totalSize - 500;
        if (remaining > 1000) {
          includedBlocks.push(
            `// File: ${file.path} (truncated - high importance)\n${file.content.slice(0, remaining)}\n// ...[truncated]\n\n`
          );
          break;
        }
      }
    }

    return includedBlocks.join('');
  }

  /**
   * Calculate importance score for a file (0-1)
   * Higher scores for types, APIs, context providers, utilities
   */
  private calculateFileImportance(file: { path: string; content: string }): number {
    let importance = 0.5;
    const path = file.path.toLowerCase();
    const content = file.content;

    // Type definitions and interfaces are highly important (reused across phases)
    if (path.includes('/types/') || path.includes('.d.ts')) {
      importance += 0.35;
    } else if (content.includes('export interface ') || content.includes('export type ')) {
      importance += 0.25;
    }

    // API routes establish contracts that other phases must follow
    if (path.includes('/api/')) {
      importance += 0.25;
    }

    // Utility functions may be reused across phases
    if (path.includes('/utils/') || path.includes('/lib/') || path.includes('/helpers/')) {
      importance += 0.2;
    }

    // Context providers and state management are critical for consistency
    if (content.includes('createContext') || content.includes('Provider')) {
      importance += 0.25;
    }

    // Hooks are reusable
    if (path.includes('/hooks/') || content.includes('export function use')) {
      importance += 0.15;
    }

    // Database schema/models define data structure
    if (path.includes('/schema') || path.includes('/models/') || content.includes('Prisma')) {
      importance += 0.3;
    }

    // Config files establish patterns
    if (path.includes('/config') || path.includes('.config.')) {
      importance += 0.15;
    }

    // Reduce importance for test files and stories
    if (path.includes('.test.') || path.includes('.spec.') || path.includes('.stories.')) {
      importance -= 0.3;
    }

    return Math.max(0, Math.min(1, importance));
  }

  /**
   * Analyze generated files to extract rich metadata
   * Returns AccumulatedFile and APIContract data for tracking
   */
  analyzeGeneratedFiles(files: Array<{ path: string; content: string }>): {
    accumulatedFiles: Array<{
      path: string;
      type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
      exports: string[];
      dependencies: string[];
      summary: string;
      imports: ImportInfo[];
    }>;
    apiContracts: Array<{
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      requestSchema?: string;
      responseSchema?: string;
      authentication: boolean;
    }>;
    establishedPatterns: string[];
  } {
    const accumulatedFiles: Array<{
      path: string;
      type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
      exports: string[];
      dependencies: string[];
      summary: string;
      imports: ImportInfo[];
    }> = [];
    const apiContracts: Array<{
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      requestSchema?: string;
      responseSchema?: string;
      authentication: boolean;
    }> = [];
    const patterns = new Set<string>();

    for (const file of files) {
      // Classify file type
      const type = this.classifyFileType(file.path, file.content);

      // Extract exports
      const exports = this.extractExports(file.content);

      // Extract imports/dependencies
      const dependencies = this.extractImports(file.content);

      // Extract rich imports for validation (P2)
      const imports = this.extractImportsRich(file.content);

      // Generate summary
      const summary = this.generateFileSummary(file);

      accumulatedFiles.push({
        path: file.path,
        type,
        exports,
        dependencies,
        summary,
        imports,
      });

      // Extract API contracts if it's an API route
      if (type === 'api') {
        const contracts = this.extractAPIContracts(file);
        apiContracts.push(...contracts);
      }

      // Detect patterns used
      const detectedPatterns = this.detectPatterns(file.content);
      detectedPatterns.forEach((p) => patterns.add(p));
    }

    return {
      accumulatedFiles,
      apiContracts,
      establishedPatterns: Array.from(patterns),
    };
  }

  /**
   * Classify file type based on path and content
   */
  private classifyFileType(
    path: string,
    content: string
  ): 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other' {
    const lowerPath = path.toLowerCase();

    if (lowerPath.includes('/api/') || lowerPath.includes('route.ts')) {
      return 'api';
    }
    if (lowerPath.includes('/types/') || lowerPath.endsWith('.d.ts')) {
      return 'type';
    }
    if (
      lowerPath.includes('/utils/') ||
      lowerPath.includes('/lib/') ||
      lowerPath.includes('/helpers/')
    ) {
      return 'util';
    }
    if (
      lowerPath.includes('/components/') ||
      (content.includes('export default function') && content.includes('return ('))
    ) {
      return 'component';
    }
    if (
      lowerPath.endsWith('.css') ||
      lowerPath.endsWith('.scss') ||
      lowerPath.includes('/styles/')
    ) {
      return 'style';
    }
    if (lowerPath.includes('.config.') || lowerPath.includes('/config/')) {
      return 'config';
    }

    return 'other';
  }

  /**
   * Extract exported items from file content
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Named exports: export const/function/class/interface/type
    const namedExportRegex = /export\s+(?:const|let|function|class|interface|type)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Default export with name
    const defaultExportRegex = /export\s+default\s+(?:function|class)\s+(\w+)/;
    const defaultMatch = content.match(defaultExportRegex);
    if (defaultMatch) {
      exports.push(`default:${defaultMatch[1]}`);
    }

    // Export { ... }
    const bracedExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;
    while ((match = bracedExportRegex.exec(content)) !== null) {
      const items = match[1].split(',').map((s) =>
        s
          .trim()
          .split(/\s+as\s+/)[0]
          .trim()
      );
      exports.push(...items.filter(Boolean));
    }

    return [...new Set(exports)].slice(0, 20);
  }

  /**
   * Extract imported dependencies from file content
   */
  private extractImports(content: string): string[] {
    const dependencies: string[] = [];

    // Import from statements
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1];
      // Skip relative imports, focus on packages and aliases
      if (!dep.startsWith('.')) {
        dependencies.push(dep.split('/')[0]); // Get package name
      }
    }

    return [...new Set(dependencies)].slice(0, 15);
  }

  /**
   * Extract rich import information including relative imports
   * Used for import/export validation (P2)
   */
  private extractImportsRich(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // Named imports: import { X, Y } from 'path'
    const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    let namedMatch: RegExpExecArray | null;
    while ((namedMatch = namedImportRegex.exec(content)) !== null) {
      const symbols = namedMatch[1]
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
        .filter((s) => s.length > 0);
      imports.push({
        symbols,
        from: namedMatch[2],
        isRelative: namedMatch[2].startsWith('.'),
      });
    }

    // Default imports: import X from 'path'
    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let defaultMatch: RegExpExecArray | null;
    while ((defaultMatch = defaultImportRegex.exec(content)) !== null) {
      // Skip if already captured by named import regex
      if (!imports.some((i) => i.from === defaultMatch![2])) {
        imports.push({
          symbols: [`default:${defaultMatch[1]}`],
          from: defaultMatch[2],
          isRelative: defaultMatch[2].startsWith('.'),
        });
      }
    }

    return imports;
  }

  /**
   * Generate a brief summary of what a file does
   */
  private generateFileSummary(file: { path: string; content: string }): string {
    const type = this.classifyFileType(file.path, file.content);
    const exports = this.extractExports(file.content);
    const fileName = file.path.split('/').pop() || file.path;

    // Look for JSDoc comment at top
    const jsdocMatch = file.content.match(/^\/\*\*[\s\S]*?\*\//);
    if (jsdocMatch) {
      const description = jsdocMatch[0]
        .replace(/\/\*\*|\*\/|\*/g, '')
        .trim()
        .split('\n')[0]
        .trim();
      if (description.length > 10 && description.length < 150) {
        return description;
      }
    }

    // Generate based on type and exports
    switch (type) {
      case 'api':
        return `API route handling ${exports.filter((e) => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(e)).join(', ') || 'requests'}`;
      case 'component':
        return `React component: ${exports[0] || fileName.replace(/\.(tsx?|jsx?)$/, '')}`;
      case 'type':
        return `Type definitions: ${exports.slice(0, 3).join(', ')}${exports.length > 3 ? '...' : ''}`;
      case 'util':
        return `Utility functions: ${exports.slice(0, 3).join(', ')}${exports.length > 3 ? '...' : ''}`;
      case 'config':
        return `Configuration for ${fileName.replace(/\.(ts|js|json)$/, '')}`;
      default:
        return `${fileName} - ${exports.length} exports`;
    }
  }

  /**
   * Extract API contracts from a route file
   */
  private extractAPIContracts(file: { path: string; content: string }): Array<{
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestSchema?: string;
    responseSchema?: string;
    authentication: boolean;
  }> {
    const contracts: Array<{
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      requestSchema?: string;
      responseSchema?: string;
      authentication: boolean;
    }> = [];

    // Derive endpoint from path
    const pathMatch = file.path.match(/\/api\/(.+?)(?:\/route)?\.ts/);
    const endpoint = pathMatch ? `/api/${pathMatch[1]}` : file.path;

    // Find exported HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
    for (const method of methods) {
      if (
        file.content.includes(`export async function ${method}`) ||
        file.content.includes(`export function ${method}`)
      ) {
        // Check for auth
        const hasAuth =
          file.content.includes('getServerSession') ||
          file.content.includes('auth()') ||
          file.content.includes('requireAuth') ||
          file.content.includes('Authorization');

        // Try to find request/response types
        const requestMatch = file.content.match(
          new RegExp(`${method}[^{]*\\{[^}]*body[^:]*:\\s*(\\w+)`)
        );
        const responseMatch = file.content.match(
          /NextResponse\.json\s*\(\s*\{[^}]*\}\s*(?:as\s+(\w+))?/
        );

        contracts.push({
          endpoint,
          method,
          requestSchema: requestMatch?.[1],
          responseSchema: responseMatch?.[1],
          authentication: hasAuth,
        });
      }
    }

    return contracts;
  }

  /**
   * Detect coding patterns used in file for consistency
   */
  private detectPatterns(content: string): string[] {
    const patterns: string[] = [];

    // State management
    if (content.includes('useState')) patterns.push('react-useState');
    if (content.includes('useReducer')) patterns.push('react-useReducer');
    if (content.includes('createContext')) patterns.push('react-context');
    if (content.includes('zustand')) patterns.push('zustand-store');
    if (content.includes('redux')) patterns.push('redux');

    // Data fetching
    if (content.includes('useSWR')) patterns.push('swr');
    if (content.includes('useQuery')) patterns.push('react-query');
    if (content.includes('getServerSideProps')) patterns.push('next-ssr');
    if (content.includes('getStaticProps')) patterns.push('next-ssg');

    // Styling
    if (content.includes('className=') && content.includes('`')) patterns.push('tailwind-dynamic');
    if (content.includes('styled.')) patterns.push('styled-components');
    if (content.includes('css`')) patterns.push('emotion');

    // Form handling
    if (content.includes('useForm')) patterns.push('react-hook-form');
    if (content.includes('Formik')) patterns.push('formik');
    if (content.includes('zod')) patterns.push('zod-validation');

    // Auth patterns
    if (content.includes('getServerSession')) patterns.push('next-auth');
    if (content.includes('supabase.auth')) patterns.push('supabase-auth');

    // Error handling
    if (content.includes('try {') && content.includes('catch')) patterns.push('try-catch');
    if (content.includes('ErrorBoundary')) patterns.push('error-boundary');

    return patterns;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate a phase plan using default configuration
 */
export function generatePhasePlan(concept: AppConcept): PhasePlanGenerationResult {
  const generator = new DynamicPhaseGenerator();
  return generator.generatePhasePlan(concept);
}

/**
 * Generate a phase plan with custom configuration
 */
export function generatePhasePlanWithConfig(
  concept: AppConcept,
  config: Partial<PhaseGeneratorConfig>
): PhasePlanGenerationResult {
  const generator = new DynamicPhaseGenerator(config);
  return generator.generatePhasePlan(concept);
}

export default DynamicPhaseGenerator;
