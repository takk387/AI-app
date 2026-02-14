/**
 * Phase Keywords & Detection Constants
 *
 * Pure data dictionaries used by the DynamicPhaseGenerator for:
 * - Phase-relevant context extraction (PHASE_KEYWORDS)
 * - Memory/persistence infrastructure detection (MEMORY_DETECTION_KEYWORDS)
 * - State complexity inference (STATE_COMPLEXITY_KEYWORDS)
 */

import type { FeatureDomain } from '@/types/dynamicPhases';

// ============================================================================
// PHASE CONTEXT KEYWORDS
// ============================================================================

/**
 * Keywords for extracting phase-relevant context
 */
export const PHASE_KEYWORDS: Record<FeatureDomain, string[]> = {
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
  'backend-validator': [
    'validation',
    'schema check',
    'api check',
    'integrity',
    'backend verification',
  ],
  devops: [
    'deployment',
    'hosting',
    'infrastructure',
    'ci/cd',
    'pipeline',
    'docker',
    'vercel',
    'aws',
    'cloud',
    'environment variables',
  ],
  monitoring: [
    'monitoring',
    'observability',
    'logging',
    'error tracking',
    'analytics',
    'metrics',
    'performance',
    'sentry',
  ],
};

// ============================================================================
// MEMORY DETECTION KEYWORDS
// ============================================================================

/**
 * Keywords for detecting memory/persistence infrastructure needs.
 * Used by detectMemoryNeeds() for auto-detection during phase generation.
 * Organized by the type of infrastructure they indicate.
 *
 * Context persistence uses weighted scoring to reduce false positives:
 * - Strong signals (2 points each): explicit memory/learning keywords
 * - Weak signals (1 point each): generic words that could have other meanings
 * - Threshold: 2+ points required to trigger
 */
export const MEMORY_DETECTION_KEYWORDS = {
  // Context persistence: split into strong and weak signals to reduce false positives
  contextPersistence: {
    // Strong signals (2 points each) - explicitly about memory/learning
    strong: [
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
      'conversation history',
      'previous session',
      'cross-session',
    ],
    // Weak signals (1 point each) - generic words that could have other meanings
    // e.g., "save time" doesn't mean persistence, "store page" means e-commerce
    weak: [
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
    ],
  },
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

// ============================================================================
// STATE COMPLEXITY KEYWORDS
// ============================================================================

export const STATE_COMPLEXITY_KEYWORDS = {
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
