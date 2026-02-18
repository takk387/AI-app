/**
 * Phase Generation Module — Barrel Export
 *
 * Re-exports all public symbols from the phase generation sub-modules
 * for clean imports.
 */

// Constants & keyword dictionaries
export {
  PHASE_KEYWORDS,
  MEMORY_DETECTION_KEYWORDS,
  STATE_COMPLEXITY_KEYWORDS,
} from './phaseKeywords';

// Feature classification
export {
  classifyFeature,
  classifyFeatures,
  getImplicitFeatures,
  extractFeaturesFromLayout,
  analyzeLayoutComplexity,
  inferStateComplexity,
  detectMemoryNeeds,
  inferDependencies,
} from './featureClassifier';

// Phase creation & naming
export {
  buildDesignContext,
  createSetupPhase,
  createLayoutInjectionPhase,
  createPolishPhase,
  createPhaseFromFeatures,
  generatePhaseName,
  generatePhaseDescription,
  splitFeaturesIntoPhases,
  findRelevantRoles,
  generateTestCriteria,
} from './phaseFactory';

// Context extraction & enrichment
export {
  extractRelevantContext,
  extractFeatureSpecs,
  extractWorkflowSpecs,
  extractValidationRules,
  extractPatternMatches,
  escapeRegex,
  enhancePhaseWithContext,
} from './contextExtractor';

// Generated file analysis
export {
  analyzeGeneratedFiles,
  classifyFileType,
  extractExports,
  extractImports,
  extractImportsRich,
  generateFileSummary,
  extractAPIContracts,
  detectPatterns,
} from './fileAnalyzer';
