/**
 * Feature Classifier
 *
 * Classifies features by domain, complexity, and token cost.
 * Also detects implicit features from technical requirements
 * and layout manifests.
 */

import type { Feature, TechnicalRequirements } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type {
  FeatureDomain,
  FeatureClassification,
  PhaseGeneratorConfig,
} from '@/types/dynamicPhases';

import {
  COMPLEX_FEATURE_PATTERNS as complexPatterns,
  MODERATE_FEATURE_PATTERNS as moderatePatterns,
} from '@/types/dynamicPhases';

import {
  MEMORY_DETECTION_KEYWORDS,
  STATE_COMPLEXITY_KEYWORDS,
} from './phaseKeywords';

// ============================================================================
// SINGLE FEATURE CLASSIFICATION
// ============================================================================

/**
 * Classify a single feature into domain, complexity, and token estimate
 */
export function classifyFeature(
  feature: Feature,
  config: PhaseGeneratorConfig
): FeatureClassification {
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
        dependencies: inferDependencies(feature, pattern.domain),
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
        dependencies: inferDependencies(feature, pattern.domain),
        keywords: pattern.patterns.filter((p) => combined.includes(p)),
      };
    }
  }

  // Default: simple feature
  return {
    originalFeature: feature,
    domain: 'feature',
    complexity: 'simple',
    estimatedTokens: config.baseTokenEstimates.simpleFeature,
    requiresOwnPhase: false,
    suggestedPhaseName: feature.name,
    dependencies: [],
    keywords: [],
  };
}

/**
 * Classify all features
 */
export function classifyFeatures(
  features: Feature[],
  config: PhaseGeneratorConfig
): FeatureClassification[] {
  return features.map((f) => classifyFeature(f, config));
}

// ============================================================================
// IMPLICIT FEATURE DETECTION
// ============================================================================

/**
 * Get implicit features from technical requirements
 */
export function getImplicitFeatures(tech: TechnicalRequirements): FeatureClassification[] {
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

  // Fix 5: Backend Validation Phase (Coordinated)
  // Always add if there is a backend, to ensure schema/API alignment
  if (tech.needsDatabase || tech.needsAPI || tech.needsAuth) {
    implicit.push({
      originalFeature: {
        id: 'implicit-backend-validation',
        name: 'Backend Validation',
        description: 'Validation of database schema, API routes, and auth integration',
        priority: 'high',
      },
      domain: 'backend-validator',
      complexity: 'moderate',
      estimatedTokens: 2000,
      requiresOwnPhase: true,
      suggestedPhaseName: 'Backend Validation',
      dependencies: ['Database Setup', 'Authentication System', 'API Integration'],
      keywords: ['validation', 'integrity', 'schema check'],
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

  // Fix 1 & 5: Scale-based DevOps and Monitoring phases
  // Add infrastructure phases for large/enterprise scale apps
  if (tech.scale === 'large' || tech.scale === 'enterprise') {
    implicit.push({
      originalFeature: {
        id: 'implicit-devops',
        name: 'DevOps & Deployment',
        description:
          'Docker configuration, CI/CD pipeline, environment setup, and deployment automation',
        priority: 'medium',
      },
      domain: 'devops',
      complexity: 'complex',
      estimatedTokens: 4000,
      requiresOwnPhase: true,
      suggestedPhaseName: 'DevOps & Infrastructure',
      dependencies: tech.needsDatabase ? ['Database Setup'] : [],
      keywords: ['docker', 'ci/cd', 'deployment', 'infrastructure', 'vercel', 'aws'],
    });

    implicit.push({
      originalFeature: {
        id: 'implicit-monitoring',
        name: 'Monitoring & Observability',
        description:
          'Error tracking, logging infrastructure, performance monitoring, and alerting setup',
        priority: 'medium',
      },
      domain: 'monitoring',
      complexity: 'moderate',
      estimatedTokens: 3000,
      requiresOwnPhase: true,
      suggestedPhaseName: 'Monitoring & Observability',
      dependencies: [],
      keywords: ['monitoring', 'logging', 'sentry', 'observability', 'metrics', 'performance'],
    });
  }

  return implicit;
}

// ============================================================================
// LAYOUT FEATURE EXTRACTION
// ============================================================================

/**
 * Extract features from LayoutManifest
 * Analyzes the full component tree to detect features and complexity
 */
export function extractFeaturesFromLayout(manifest: LayoutManifest): FeatureClassification[] {
  const features: FeatureClassification[] = [];
  const analysis = analyzeLayoutComplexity(manifest.root);

  // 1. explicit features from detection tags
  if (manifest.detectedFeatures.includes('Authentication') || analysis.hasAuthComponents) {
    features.push({
      originalFeature: {
        id: 'layout-auth',
        name: 'Authentication System',
        description: 'Detected from Layout Design (Login/Signup forms)',
        priority: 'high',
      },
      domain: 'auth',
      complexity: 'complex',
      estimatedTokens: 4000,
      requiresOwnPhase: true,
      suggestedPhaseName: 'Authentication Setup',
      dependencies: [],
      keywords: ['auth', 'login'],
    });
  }

  // 2. File Upload / Storage
  if (manifest.detectedFeatures.includes('FileUpload')) {
    features.push({
      originalFeature: {
        id: 'layout-file-upload',
        name: 'File Upload System',
        description: 'Detected from Layout Design (Upload zones)',
        priority: 'medium',
      },
      domain: 'storage',
      complexity: 'complex',
      estimatedTokens: 3500,
      requiresOwnPhase: true,
      suggestedPhaseName: 'File Storage',
      dependencies: [],
      keywords: ['upload', 'storage', 'file'],
    });
  }

  // 3. Complex UI / Dashboard Detection
  if (
    analysis.totalNodes > 15 ||
    analysis.maxDepth > 4 ||
    manifest.detectedFeatures.includes('Dashboard')
  ) {
    features.push({
      originalFeature: {
        id: 'layout-complex-ui',
        name: 'Complex UI Implementation',
        description: `Implement complex layout structure (${analysis.totalNodes} nodes, ${analysis.maxDepth} levels deep). Includes: ${analysis.componentTypes.join(', ')}`,
        priority: 'high',
      },
      domain: 'ui-component',
      complexity: 'complex',
      estimatedTokens: 5000,
      requiresOwnPhase: true,
      suggestedPhaseName: 'UI & Layout Implementation',
      dependencies: ['Design System Setup'],
      keywords: ['dashboard', 'layout', 'components', 'ui'],
    });
  }

  // 4. Video/Media Detection
  if (analysis.hasVideo) {
    features.push({
      originalFeature: {
        id: 'layout-media-player',
        name: 'Media Player Integration',
        description: 'Video player components detected in layout',
        priority: 'medium',
      },
      domain: 'ui-component',
      complexity: 'moderate',
      estimatedTokens: 2500,
      requiresOwnPhase: false,
      suggestedPhaseName: 'Media Features',
      dependencies: [],
      keywords: ['video', 'player', 'media'],
    });
  }

  return features;
}

/**
 * Recursive analysis of the visual node tree
 */
export function analyzeLayoutComplexity(root: any): {
  totalNodes: number;
  maxDepth: number;
  hasAuthComponents: boolean;
  hasVideo: boolean;
  componentTypes: string[];
} {
  let count = 0;
  let depth = 0;
  let hasAuth = false;
  let hasVideo = false;
  const types = new Set<string>();

  const traverse = (node: any, currentDepth: number) => {
    count++;
    depth = Math.max(depth, currentDepth);

    if (node.type) types.add(node.type);
    if (node.type === 'video') hasVideo = true;

    // Semantic checks
    if (node.semanticTag) {
      const tag = node.semanticTag.toLowerCase();
      if (tag.includes('login') || tag.includes('auth') || tag.includes('password')) {
        hasAuth = true;
      }
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => traverse(child, currentDepth + 1));
    }
  };

  if (root) traverse(root, 1);

  return {
    totalNodes: count,
    maxDepth: depth,
    hasAuthComponents: hasAuth,
    hasVideo,
    componentTypes: Array.from(types),
  };
}

// ============================================================================
// STATE & MEMORY DETECTION (Static analysis utilities)
// ============================================================================

/**
 * Infer state complexity from features (auto-detection)
 * Called during concept extraction to set stateComplexity automatically
 */
export function inferStateComplexity(features: Feature[]): 'simple' | 'moderate' | 'complex' {
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
export function detectMemoryNeeds(
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

  // Use weighted scoring for context persistence to reduce false positives
  const strongMatches = MEMORY_DETECTION_KEYWORDS.contextPersistence.strong.filter((kw) =>
    allText.includes(kw)
  ).length;
  const weakMatches = MEMORY_DETECTION_KEYWORDS.contextPersistence.weak.filter((kw) =>
    allText.includes(kw)
  ).length;
  const contextScore = strongMatches * 2 + weakMatches;
  const needsContextPersistence = contextScore >= 2;

  const needsStateHistory = MEMORY_DETECTION_KEYWORDS.stateHistory.some((kw) =>
    allText.includes(kw)
  );

  // Caching requires 2+ keyword matches to avoid false positives
  const needsCaching =
    MEMORY_DETECTION_KEYWORDS.caching.filter((kw) => allText.includes(kw)).length >= 2;

  return { needsContextPersistence, needsStateHistory, needsCaching };
}

// ============================================================================
// DEPENDENCY INFERENCE
// ============================================================================

/**
 * Infer dependencies for a feature based on its domain
 */
export function inferDependencies(feature: Feature, _domain: FeatureDomain): string[] {
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
