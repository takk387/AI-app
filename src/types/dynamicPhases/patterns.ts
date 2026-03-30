/**
 * Dynamic Phase Generation System - Complex Feature Patterns
 *
 * Pattern definitions for detecting features that require special handling.
 */

import type { ComplexFeaturePattern, FeatureDomain } from './classification';

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
    suggestedName: 'Database Schema',
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
