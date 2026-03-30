/**
 * Dynamic Phase Generation System - Phase Generator Configuration
 *
 * Configuration interfaces and defaults for the phase generator.
 */

import type { FeatureDomain } from './classification';

// ============================================================================
// PHASE GENERATOR CONFIGURATION
// ============================================================================

/**
 * Configuration for the phase generator
 */
export interface PhaseGeneratorConfig {
  // Token limits
  maxTokensPerPhase: number; // Default: 16000
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
