/**
 * Phase Execution Barrel File
 *
 * Re-exports all public symbols from the phaseExecution sub-modules.
 */

// Execution utilities & result types
export {
  type OperationResult,
  success,
  skipped,
  error,
  extractFilePaths,
  extractImplementedFeatures,
  createPhaseResult,
  getFileLanguage,
} from './executionUtils';

// Prompt building
export {
  type PhaseExecutionContextWithEnhancedTracking,
  formatLayoutManifestForPrompt,
  formatLayoutDesignForPrompt,
  buildPhaseExecutionPrompt,
  // Design token mapping re-exports
  borderRadiusMap,
  shadowMap,
  blurMap,
  spacingDensityMap,
  sectionPaddingMap,
  containerWidthMap,
  componentGapMap,
  fontWeightMap,
  headingSizeMap,
  bodySizeMap,
  lineHeightMap,
  letterSpacingMap,
  animationMap,
  headerHeightMap,
  headerStyleMap,
  heroHeightMap,
  heroLayoutMap,
  cardStyleMap,
  cardHoverEffectMap,
  sidebarWidthMap,
  listStyleMap,
  listDensityMap,
  footerStyleMap,
  footerColumnsMap,
  generateGlobalsCSSContent,
} from './promptBuilder';

// Quality review
export {
  type QualityReviewState,
  runPhaseQualityReview,
  runFinalQualityReview,
} from './qualityReview';

// Phase integrity (P1-P9)
export {
  type PhaseIntegrityState,
  detectFileConflicts,
  computeHash,
  validateImportExports,
  capturePhaseSnapshot,
  rollbackToSnapshot,
  syncPlanState,
  getPhaseSnapshot,
  runPhaseTypeCheck,
  getTypeCheckResult,
  checkTypeCompatibility,
  runPhaseTests,
  getPhaseTestResults,
  validateApiContracts,
  verifyArchitectureImplementation,
  runRegressionTests,
} from './phaseIntegrity';
