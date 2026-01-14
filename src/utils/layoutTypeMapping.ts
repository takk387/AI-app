/**
 * Layout Type Mapping Utilities
 *
 * Centralizes all layout type conversions between:
 * - LayoutStructure.type (6 values: single-page, multi-page, dashboard, landing, wizard, split)
 * - basePreferences.layout (4 values: single-page, multi-page, dashboard, custom)
 * - Gemini's VisualAnalysis.layoutType (7 values: single-page, dashboard, landing, e-commerce, portfolio, blog, saas)
 *
 * The source of truth is structure.type; basePreferences.layout should always be derived from it.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** LayoutStructure.type - architectural specification (6 values) */
export type LayoutStructureType =
  | 'single-page'
  | 'multi-page'
  | 'dashboard'
  | 'landing'
  | 'wizard'
  | 'split';

/** basePreferences.layout - rendering hint (4 values) */
export type UILayoutType = 'single-page' | 'multi-page' | 'dashboard' | 'custom';

/** Gemini's VisualAnalysis.layoutType (7 values) */
export type GeminiLayoutType =
  | 'single-page'
  | 'dashboard'
  | 'landing'
  | 'e-commerce'
  | 'portfolio'
  | 'blog'
  | 'saas';

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Maps LayoutStructure.type to basePreferences.layout
 *
 * This is used to derive the rendering hint from the architectural specification.
 * The LayoutPreview component uses basePreferences.layout to select which
 * React layout component to render (SinglePageLayout, MultiPageLayout, DashboardLayout).
 *
 * @param structureType - The structure.type value (6 possible values)
 * @returns The corresponding basePreferences.layout value (4 possible values)
 */
export function mapStructureTypeToLayout(
  structureType: LayoutStructureType | string | undefined
): UILayoutType {
  switch (structureType) {
    case 'dashboard':
      return 'dashboard';
    case 'multi-page':
      return 'multi-page';
    // landing, wizard, split, and single-page all map to single-page
    case 'landing':
    case 'wizard':
    case 'split':
    case 'single-page':
    default:
      return 'single-page';
  }
}

/**
 * Maps Gemini's VisualAnalysis.layoutType to basePreferences.layout
 *
 * Used when processing Gemini's visual analysis to update the design's layout.
 *
 * @param geminiLayoutType - Gemini's detected layout type (7 possible values)
 * @returns The corresponding basePreferences.layout value (4 possible values)
 */
export function mapGeminiLayoutToUILayout(
  geminiLayoutType: GeminiLayoutType | string | undefined
): UILayoutType {
  if (!geminiLayoutType) return 'single-page';

  switch (geminiLayoutType) {
    case 'dashboard':
      return 'dashboard';
    // e-commerce and blog typically have multiple pages
    case 'e-commerce':
    case 'blog':
      return 'multi-page';
    // landing, portfolio, saas, and single-page are all single-page layouts
    case 'landing':
    case 'portfolio':
    case 'saas':
    case 'single-page':
    default:
      return 'single-page';
  }
}

/**
 * Maps Gemini's VisualAnalysis.layoutType to LayoutStructure.type
 *
 * Used in the API route when converting Gemini analysis to design updates.
 * This preserves more granularity than mapping directly to UILayoutType.
 *
 * @param geminiLayoutType - Gemini's detected layout type (7 possible values)
 * @returns The corresponding structure.type value (6 possible values)
 */
export function mapGeminiLayoutToStructureType(
  geminiLayoutType: GeminiLayoutType | string | undefined
): LayoutStructureType {
  if (!geminiLayoutType) return 'single-page';

  switch (geminiLayoutType) {
    case 'dashboard':
      return 'dashboard';
    case 'landing':
      return 'landing';
    // e-commerce, portfolio, blog, saas all map to single-page structure
    // (the actual multi-page nature is handled by navigation, not structure type)
    case 'e-commerce':
    case 'portfolio':
    case 'blog':
    case 'saas':
    case 'single-page':
    default:
      return 'single-page';
  }
}

/**
 * Helper to sync basePreferences.layout from structure.type
 *
 * Call this after any structure update to ensure basePreferences.layout stays in sync.
 * This is the recommended pattern for maintaining consistency.
 *
 * @param design - The design object to sync
 * @returns The design with synced basePreferences.layout
 */
export function syncLayoutFromStructure<
  T extends {
    structure?: { type?: LayoutStructureType | string };
    basePreferences?: { layout?: UILayoutType };
  },
>(design: T): T {
  if (!design.structure?.type || !design.basePreferences) {
    return design;
  }

  const syncedLayout = mapStructureTypeToLayout(design.structure.type);

  // Only update if different to avoid unnecessary re-renders
  if (design.basePreferences.layout !== syncedLayout) {
    return {
      ...design,
      basePreferences: {
        ...design.basePreferences,
        layout: syncedLayout,
      },
    };
  }

  return design;
}
