# Theme Defaults Refactor Plan

## Current Status

| Phase   | Description                                      | Status      |
| ------- | ------------------------------------------------ | ----------- |
| Phase 1 | Foundation - Create `themeDefaults.ts`           | ✅ COMPLETE |
| Phase 2 | Logic Alignment - Update 8 service/utility files | ✅ COMPLETE |
| Phase 3 | UI Alignment - Replace raw Tailwind colors       | ✅ COMPLETE |
| Phase 4 | Service Layer - Replace hardcoded hex fallbacks  | ✅ COMPLETE |

**All phases complete.** The Garden theme is now consistently applied across the codebase, and generator fallbacks now use `themeDefaults.ts` constants.

---

## Important Context

**Two separate color systems exist:**

1. **Garden Theme** (`globals.css` + `tailwind.config.js`) - The AI App Builder's own UI
   - Nature-inspired greens, golds, blossom pinks
   - Already centralized in CSS variables and Tailwind semantic colors
   - `success` = Garden green (#2ECC71)
   - `warning` = Gold (#C9A227)
   - `error` = Blossom pink (#C06C84)

2. **Generator Fallbacks** (`themeDefaults.ts`) - Default colors for user-generated apps
   - Generic neutral grays when users don't provide colors
   - NOW centralized in `src/constants/themeDefaults.ts`

---

## Completed Work

### Phase 1: Foundation ✅

Created `src/constants/themeDefaults.ts` with:

```typescript
export const NEUTRAL_PALETTE = {
  gray50: '#F9FAFB',
  gray100: '#F8FAFC',
  gray200: '#E5E7EB',
  gray300: '#E2E8F0',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  white: '#FFFFFF',
} as const;

export const STATUS_COLORS = {
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#6B7280',
} as const;

export const DARK_PALETTE = {
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
} as const;

export const LAYER_COLORS = {
  base: '#64748B',
  content: '#3B82F6',
  dropdown: '#06B6D4',
  sticky: '#10B981',
  overlay: '#8B5CF6',
  modal: '#EC4899',
  toast: '#F59E0B',
  tooltip: '#EF4444',
  max: '#1F2937',
} as const;

export const DEFAULT_COLORS = {
  primary: NEUTRAL_PALETTE.gray500,
  secondary: NEUTRAL_PALETTE.gray400,
  accent: NEUTRAL_PALETTE.gray500,
  background: NEUTRAL_PALETTE.gray50,
  surface: NEUTRAL_PALETTE.white,
  text: NEUTRAL_PALETTE.gray700,
  textMuted: NEUTRAL_PALETTE.gray500,
  border: NEUTRAL_PALETTE.gray200,
  ...STATUS_COLORS,
} as const;
```

### Phase 2: Logic Alignment ✅

Updated 8 service/utility files to use constants:

| File                             | Constants Used                                       |
| -------------------------------- | ---------------------------------------------------- |
| `ZIndexEditor.tsx`               | `LAYER_COLORS`                                       |
| `layerUtils.ts`                  | `LAYER_COLORS`                                       |
| `DynamicPhaseGenerator.ts`       | `DEFAULT_COLORS`                                     |
| `LayoutExportService.ts`         | `DEFAULT_COLORS`, `NEUTRAL_PALETTE`, `STATUS_COLORS` |
| `colorExtraction.ts`             | `DEFAULT_COLORS`, `NEUTRAL_PALETTE`, `DARK_PALETTE`  |
| `darkModeGenerator.ts`           | `DARK_PALETTE`                                       |
| `designTokenMappings.ts`         | `STATUS_COLORS`                                      |
| `architectureTemplateMapping.ts` | `DEFAULT_COLORS`, `DARK_PALETTE`, `STATUS_COLORS`    |

Also updated 2 key UI components:

- `AnalysisProgressIndicator.tsx` → semantic Tailwind colors
- `QualityPanel.tsx` → semantic Tailwind colors

### Phase 3: UI Alignment ✅

**Replaced 360+ occurrences of raw Tailwind colors across 72 component files.**

#### Replacement Rules Applied

| Raw Color  | Semantic Replacement | Garden Theme Color     |
| ---------- | -------------------- | ---------------------- |
| `red-*`    | `error-*`            | Blossom pink (#C06C84) |
| `green-*`  | `success-*`          | Garden green (#2ECC71) |
| `yellow-*` | `warning-*`          | Gold (#C9A227)         |

#### Files Updated (72 total)

**Build & Validation:**

- `build/PhaseControlPanel.tsx`
- `build/PhaseDetailView.tsx`
- `build/PhaseProgressIndicator.tsx`
- `build/ReviewStatusIndicator.tsx`
- `build/ValidationDashboard.tsx`

**Review System:**

- `review/EnhancedDiffViewer.tsx`
- `review/ReviewSummary.tsx`
- `review/CommentThread.tsx`
- `review/HunkApprovalCard.tsx`
- `review/ImpactAnalysisPanel.tsx`
- `review/ReviewSidebar.tsx`
- `review/RollbackHistory.tsx`

**Modals:**

- `modals/DeploymentModal.tsx`
- `modals/ApprovalModal.tsx`
- `modals/CreateBranchModal.tsx`
- `modals/ExportModal.tsx`
- `modals/LibraryModal.tsx`
- `modals/ShareModal.tsx`
- `modals/VersionHistoryModal.tsx`

**Concept Panel:**

- `concept-panel/AppConceptPanel.tsx`
- `concept-panel/EditableField.tsx`
- `concept-panel/FeatureCard.tsx`
- `concept-panel/sections/FeaturesSection.tsx`
- `concept-panel/sections/PhasePlanSection.tsx`
- `concept-panel/sections/RolesSection.tsx`
- `concept-panel/sections/TechnicalSection.tsx`
- `concept-panel/sections/WorkflowsSection.tsx`

**Conversation Wizard:**

- `conversation-wizard/ArchitectureReviewPanel.tsx`
- `conversation-wizard/ConceptSummaryPanel.tsx`
- `conversation-wizard/WizardHeader.tsx`

**Preview:**

- `preview/BrowserPreview.tsx`
- `preview/ConsolePanel.tsx`
- `preview/DeviceToolbar.tsx`
- `preview/RailwayPreview.tsx`

**Storage:**

- `storage/FileActions.tsx`
- `storage/FileCard.tsx`
- `storage/FileFilters.tsx`
- `storage/FileUploader.tsx`
- `storage/StorageStats.tsx`

**Dev Tools:**

- `dev/DebugPanel.tsx`
- `dev/ElementInspector/InspectorPanel.tsx`
- `dev/ElementInspector/PromptGeneratorModal.tsx`
- `dev/ElementInspector/SelectedElementCard.tsx`
- `dev/MockAIBanner.tsx`

**Documentation:**

- `documentation/ProjectDocumentationPanel.tsx`
- `documentation/tabs/ConceptTab.tsx`
- `documentation/tabs/PlanTab.tsx`
- `documentation/tabs/ProgressTab.tsx`

**Core Components:**

- `CodeQualityReport.tsx`
- `DiffPreview.tsx`
- `Engine.tsx`
- `ErrorBoundary.tsx`
- `FullAppPreview.tsx`
- `KeyframeEditor.tsx`
- `LayerPanel.tsx`
- `NaturalConversationWizard.tsx`
- `PerformanceReport.tsx`
- `PreviewContainer.tsx`
- `ReferenceMediaPanel.tsx`
- `SettingsPage.tsx`
- `SideDrawer.tsx`
- `StreamingProgress.tsx`
- `TemplatePreview.tsx`
- `TemplateSelector.tsx`
- `Toast.tsx`
- `ValidationMessage.tsx`
- `ArchitectureTemplatePicker.tsx`
- `BranchSelector.tsx`
- `marketing/ComparisonTable.tsx`
- `ui/HeaderDropdown.tsx`
- `ui/Toast.tsx`

#### Intentionally Preserved (Decorative Colors)

The following files retain raw Tailwind colors for decorative (non-status) purposes:

| File                      | Color Usage                                   | Reason                     |
| ------------------------- | --------------------------------------------- | -------------------------- |
| `AnimationTimeline.tsx`   | `bg-red-500`, `bg-red-600`                    | Playhead visibility        |
| `CodePreview.tsx`         | `bg-red-500`, `bg-yellow-500`, `bg-green-500` | macOS window dots          |
| `EasingCurveEditor.tsx`   | `bg-red-600`                                  | Playing state indicator    |
| `PlanTab.tsx`             | `bg-green-500/20`, `bg-yellow-500/20`         | Domain badges (not status) |
| `DeploymentModal.tsx`     | `text-green-400`                              | Terminal syntax            |
| `LibraryModal.tsx`        | `text-yellow-400`                             | Favorites star             |
| `SelectedElementCard.tsx` | `text-yellow-400`                             | Code syntax highlighting   |

### Phase 4: Service Layer Alignment ✅

**Replaced hardcoded hex fallbacks with `themeDefaults.ts` imports in 4 files.**

This phase addressed Gemini's finding that generator fallbacks still used hardcoded hex values instead of the centralized constants.

#### Files Updated

| File                       | Changes                                           |
| -------------------------- | ------------------------------------------------- |
| `PhaseExecutionManager.ts` | 13 fallbacks → `NEUTRAL_PALETTE`, `STATUS_COLORS` |
| `layoutDesign.ts`          | 7 fallbacks in `defaultGlobalStyles`              |
| `designTokenPrompt.ts`     | 6 fallbacks → `NEUTRAL_PALETTE`                   |
| `builder.ts`               | 3 fallbacks → `NEUTRAL_PALETTE`                   |

#### Example Change

```typescript
// BEFORE - hardcoded hex
colors.primary || '#6B7280';

// AFTER - using constants
colors.primary || NEUTRAL_PALETTE.gray500;
```

#### Intentionally Preserved

| File                           | Color Usage                | Reason                        |
| ------------------------------ | -------------------------- | ----------------------------- |
| `settings.ts`                  | `#1a1a2e`, `#2ECC71`       | AI App Builder UI settings    |
| `geminiLayoutBuilderPrompt.ts` | Example JSON in prompt     | Instructional examples for AI |
| `dalleService.ts`              | Descriptive text in prompt | AI prompt instructions        |
| Test files                     | Various                    | Test fixtures (isolated)      |

---

## Verification

### Automated Checks ✅

- [x] `npm run build` - passes
- [x] `npm run typecheck` - passes
- [x] `npm run lint` - passes (warnings only, no errors)

### Search Verification

Generator fallbacks now use constants (Phase 4):

```bash
grep -rE "#[0-9A-Fa-f]{6}" src/services/ src/types/ src/prompts/ --include="*.ts"
# Returns:
# - themeDefaults.ts (constants file) ✅
# - settings.ts (UI settings, intentional)
# - layoutDesign.ts (comment only)
# - geminiLayoutBuilderPrompt.ts (AI prompt examples)
# - dalleService.ts (AI prompt descriptions)
# - Test files (fixtures)
```

Status colors now use semantic classes (remaining are decorative):

```bash
grep -r "text-red-\|bg-red-\|text-green-\|bg-green-\|text-yellow-\|bg-yellow-" src/components/
# Returns ~13 decorative occurrences (playheads, window dots, terminal syntax) ✅
```

---

## Benefits Achieved

1. **Single source of truth** - All color constants in one file
2. **Type safety** - TypeScript catches invalid color references
3. **No duplicates** - ZIndexEditor and layerUtils share same constants
4. **Theme consistency** - UI uses Garden theme semantic colors throughout
5. **Easy updates** - Change once, applies everywhere
6. **Accessibility** - Consistent semantic meaning for status colors

---

## Commits

- `9700459` - refactor(theme): centralize hardcoded colors into themeDefaults.ts (Phase 1 & 2)
- `64c0c86` - refactor(theme): replace raw Tailwind colors with Garden semantic colors (Phase 3)
