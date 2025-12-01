/**
 * User Settings Type Definitions
 * Settings for the AI Builder user preferences
 */

// ============================================================================
// REVIEW SETTINGS
// ============================================================================

/**
 * Settings for code review behavior
 */
export interface ReviewSettings {
  /** Auto-approve minor changes without modal */
  autoApproveMinor: boolean;
  /** Show diff preview for all changes */
  showDiffPreview: boolean;
  /** Require explicit approval for major changes */
  requireApprovalForMajor: boolean;
}

// ============================================================================
// GENERATION SETTINGS
// ============================================================================

/**
 * Settings for AI generation behavior
 */
export interface GenerationSettings {
  /** Prefer phased builds for complex apps */
  preferPhasedBuild: boolean;
  /** Maximum phases for a phased build */
  maxPhases: number;
  /** Include comments in generated code */
  includeComments: boolean;
  /** Preferred code style */
  codeStyle: 'modern' | 'classic' | 'minimal';
  /** Include TypeScript types */
  includeTypes: boolean;
}

// ============================================================================
// UI SETTINGS
// ============================================================================

/**
 * Settings for UI preferences
 */
export interface UISettings {
  /** Default active tab */
  defaultTab: 'chat' | 'preview' | 'code';
  /** Show welcome message on load */
  showWelcomeMessage: boolean;
  /** Auto-switch to preview after generation */
  autoSwitchToPreview: boolean;
  /** Panel size preferences (percentage) */
  chatPanelSize: number;
  previewPanelSize: number;
}

// ============================================================================
// QUALITY SETTINGS
// ============================================================================

/**
 * Settings for quality and validation
 */
export interface QualitySettings {
  /** Run quality checks after generation */
  autoQualityCheck: boolean;
  /** Run performance checks after generation */
  autoPerformanceCheck: boolean;
  /** Minimum quality score required */
  minQualityScore: number;
  /** Show quality report automatically */
  showQualityReport: boolean;
}

// ============================================================================
// COMBINED BUILDER SETTINGS
// ============================================================================

/**
 * Complete builder settings combining all categories
 */
export interface BuilderSettings {
  review: ReviewSettings;
  generation: GenerationSettings;
  ui: UISettings;
  quality: QualitySettings;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Settings version for migrations */
  version: number;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

/**
 * Default settings for the builder
 */
export const DEFAULT_BUILDER_SETTINGS: BuilderSettings = {
  review: {
    autoApproveMinor: false,
    showDiffPreview: true,
    requireApprovalForMajor: true,
  },
  generation: {
    preferPhasedBuild: true,
    maxPhases: 5,
    includeComments: true,
    codeStyle: 'modern',
    includeTypes: true,
  },
  ui: {
    defaultTab: 'chat',
    showWelcomeMessage: true,
    autoSwitchToPreview: true,
    chatPanelSize: 35,
    previewPanelSize: 65,
  },
  quality: {
    autoQualityCheck: false,
    autoPerformanceCheck: false,
    minQualityScore: 70,
    showQualityReport: false,
  },
  lastUpdated: new Date().toISOString(),
  version: 1,
};
