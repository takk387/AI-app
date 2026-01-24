# Legacy Layout Builder Removal - Gaps to Investigate

This document lists all files that were **missing from your original plan** but were identified during analysis. Each section explains what the file does and why it needs investigation.

---

## 1. API Routes Missing from Your Purge Script

Your plan deletes 3 routes. These 6 additional routes also exist:

### 1.1 `src/app/api/layout/chat-gemini/route.ts`
**What it does:** Gemini-only chat endpoint for layout builder (vs chat-dual which uses both Claude + Gemini)
**Why investigate:** May be used by LayoutBuilderWizard or other components. Check if the new system uses a different endpoint.

### 1.2 `src/app/api/layout/analyze-pages/route.ts`
**What it does:** Multi-page analysis endpoint - analyzes multiple screenshots/pages at once to detect components and extract design patterns
**Why investigate:** Used for multi-page layout analysis feature. Determine if this feature is being removed or migrated.

### 1.3 `src/app/api/layout/capture-website/route.ts`
**What it does:** Captures screenshots from a live website URL for analysis
**Why investigate:** Website capture feature - is this being kept or removed?

### 1.4 `src/app/api/layout/generate-options/route.ts`
**What it does:** Generates multiple design variant options for user to choose from
**Why investigate:** Design options feature - check if DesignOptionsPanel uses this.

### 1.5 `src/app/api/layout/video-pages/route.ts`
**What it does:** Extracts individual pages/frames from a video upload for analysis
**Why investigate:** Video upload feature - is this being kept?

### 1.6 `src/app/api/layout/video-analyze/route.ts`
**What it does:** Analyzes video content for page transitions and navigation structure
**Why investigate:** Video analysis feature - related to video-pages route.

---

## 2. Hooks Missing from Your Purge Script

Your plan deletes 1 hook (useLayoutBuilder). These 4 additional hooks also exist:

### 2.1 `src/hooks/useDesignOptions.ts`
**What it does:** Manages state for design option variants (multiple design choices)
**Why investigate:** Check what components use this and if it imports from deleted files.

### 2.2 `src/hooks/useDesignReplication.ts`
**What it does:** Handles design token replication across components
**Why investigate:** Determine if this is layout-specific or used elsewhere.

### 2.3 `src/hooks/useDesignAnalysis.ts`
**What it does:** Manages state for design analysis features (accessibility, critique, etc.)
**Why investigate:** May be used by multiple components. Check dependencies.

### 2.4 `src/hooks/useFigmaImport.ts`
**What it does:** Handles Figma file import and conversion to layout format
**Why investigate:** You confirmed Figma routes should be deleted - this hook should go too.

---

## 3. Services Missing from Your Purge Script

Your plan deletes 1 service (GeminiLayoutService). These additional services also exist:

### 3.1 `src/services/LayoutExportService.ts`
**What it does:** Exports layouts to various formats (Figma, code, JSON, etc.)
**Why investigate:** Check what uses this service - may be used by export features.

### 3.2 `src/services/TemplateService.ts`
**What it does:** CRUD operations for design templates stored in Supabase
**Why investigate:** Imports `DesignTemplate` from `TemplateLibrary.tsx` (which is being deleted). Tightly coupled.

### 3.3 `src/services/figmaTransformer.ts`
**What it does:** Converts Figma designs to internal layout format
**Why investigate:** Related to Figma integration - should be deleted with Figma routes.

### 3.4 `src/services/designReplicator.ts`
**What it does:** Replicates design patterns/tokens across components
**Why investigate:** Check if layout-specific or shared functionality.

### 3.5 `src/services/competitorAnalyzer.ts`
**What it does:** Analyzes competitor websites/designs for inspiration
**Why investigate:** Imports from layoutDesign.ts - check dependencies.

---

## 4. Components Missing from Your Purge Script

Your plan deletes 3 components from layout-builder/. There are **36 files** in that directory. Here are the 33 you didn't address:

### 4.1-4.33 Full list of layout-builder/ components not in your plan:

| File | What it does |
|------|--------------|
| `A11yWarnings.tsx` | Displays accessibility violation warnings |
| `AnimationPreviewPlayer.tsx` | Plays animation previews |
| `BackgroundEffects.tsx` | Background visual effects editor |
| `BeforeAfter.tsx` | Before/after design comparison slider |
| `ChatInput.tsx` | Chat message input with file upload |
| `ClickableOverlay.tsx` | Interactive element overlay for selection |
| `ColorPickerMenu.tsx` | Color selection dropdown menu |
| `ConfirmDialog.tsx` | Confirmation dialog component |
| `DesignOptionsPanel.tsx` | Panel showing design variant options |
| `DesignSidePanel.tsx` | Tabbed side panel (Design, Animation, Specs) |
| `DraftRecoveryBanner.tsx` | Banner prompting draft recovery |
| `ErrorRecovery.tsx` | Error recovery UI |
| `ExtractedColorsPanel.tsx` | Shows colors extracted from reference images |
| `GeminiAnalysisPanel.tsx` | Displays Gemini AI analysis results |
| `GestureEditor.tsx` | Gesture event configuration |
| `HistoryTimeline.tsx` | Version history timeline |
| `InteractionEditor.tsx` | Micro-interaction editor |
| `LintPanel.tsx` | Design linting/validation panel |
| `MediaUploadZone.tsx` | Image/video upload handler |
| `MessageBubble.tsx` | Chat message bubble display |
| `MultiPageUploadZone.tsx` | Multi-page upload interface |
| `NavigationStructurePanel.tsx` | Site navigation structure editor |
| `OptionCard.tsx` | Design option card component |
| `PageNavigator.tsx` | Multi-page navigation component |
| `RecentChangesIndicator.tsx` | Shows recent change indicators |
| `SelectionHighlight.tsx` | Element selection visualization |
| `ShadcnPreview.tsx` | Shadcn component preview |
| `StateEditor.tsx` | Component state management editor |
| `SuggestedActionsBar.tsx` | Quick action suggestions bar |
| `TemplateLibrary.tsx` | Design template browser |
| `TemplatesMenu.tsx` | Template selection dropdown |
| `ToolsMenu.tsx` | Export/import/tools dropdown |
| `ViewOptionsMenu.tsx` | Preview options menu |
| `VoiceInput.tsx` | Voice-based design commands |
| `index.ts` | Barrel export file |

**Key question:** Does `LayoutBuilderWizard.tsx` import any of these? My analysis found it only imports `ChatInput`.

---

## 5. Other Components Not in Your Checklist

These components import from layoutDesign.ts but weren't in your checklist:

### 5.1 `src/components/VersionHistoryPanel.tsx`
**What it does:** Displays version history with snapshots
**Why investigate:** Uses `DesignVersion` type from useLayoutBuilder.

### 5.2 `src/components/TypographyPanel.tsx`
**What it does:** Typography settings panel
**Why investigate:** Imports from layoutDesign.ts.

### 5.3 `src/components/SpecSheetPanel.tsx`
**What it does:** Design specification sheet display
**Why investigate:** Imports from layoutDesign.ts.

### 5.4 `src/components/SpacingPanel.tsx`
**What it does:** Spacing settings panel
**Why investigate:** Imports from layoutDesign.ts.

### 5.5 `src/components/ResponsivePropertyEditor.tsx`
**What it does:** Responsive breakpoint property editor
**Why investigate:** Imports from layoutDesign.ts.

### 5.6 `src/components/DesignComparison.tsx`
**What it does:** Side-by-side design comparison
**Why investigate:** Imports from layoutDesign.ts.

### 5.7 `src/components/AccessibilityPanel.tsx`
**What it does:** Accessibility settings panel
**Why investigate:** Imports from layoutDesign.ts.

### 5.8 `src/components/AnimationPanel.tsx`
**What it does:** Animation settings panel
**Why investigate:** Imports from layoutDesign.ts.

### 5.9 `src/components/BreakpointEditor.tsx`
**What it does:** Responsive breakpoint editor
**Why investigate:** Imports from layoutDesign.ts.

### 5.10 `src/components/DarkModeEditor.tsx`
**What it does:** Dark mode settings editor
**Why investigate:** Imports from layoutDesign.ts.

### 5.11 `src/components/DesignControlPanel.tsx`
**What it does:** Design token controls
**Why investigate:** Imports from layoutDesign.ts.

### 5.12 `src/components/StatePreview.tsx`
**What it does:** Component state preview
**Why investigate:** Imports from layoutDesign.ts.

### 5.13 `src/components/CodePreviewPanel.tsx`
**What it does:** Generated code preview
**Why investigate:** Imports from layoutDesign.ts.

### 5.14 `src/components/DocumentationExport.tsx`
**What it does:** Documentation export functionality
**Why investigate:** Imports from layoutDesign.ts.

### 5.15 `src/components/NaturalConversationWizard.tsx`
**What it does:** PLAN mode conversation wizard
**Why investigate:** Imports from layoutDesign.ts - this is a CORE component! Check what it imports.

### 5.16 `src/components/modals/FigmaImportModal.tsx`
**What it does:** Figma import modal dialog
**Why investigate:** Related to Figma integration - should be deleted.

### 5.17 `src/components/conversation-wizard/SuggestedActionsBar.tsx`
**What it does:** Suggested actions in conversation wizard
**Why investigate:** Imports from layoutDesign.ts.

### 5.18 `src/components/conversation-wizard/WizardHeader.tsx`
**What it does:** Header for conversation wizard
**Why investigate:** Imports from layoutDesign.ts.

---

## 6. Utils Missing from Your Purge Script

Your plan deletes 2 utils. These additional utils import from layoutDesign.ts:

### 6.1 `src/utils/layoutValidation.ts`
**What it does:** Validates layout design objects
**Why investigate:** Layout-specific validation.

### 6.2 `src/utils/layoutImport.ts`
**What it does:** Imports layouts from various formats
**Why investigate:** Import functionality for layouts.

### 6.3 `src/utils/layoutExport.ts`
**What it does:** Exports layouts to various formats
**Why investigate:** Export functionality for layouts.

### 6.4 `src/utils/videoProcessor.ts`
**What it does:** Processes video files for frame extraction
**Why investigate:** Related to video analysis feature.

### 6.5 `src/utils/designAnalyzer.ts`
**What it does:** Analyzes design properties and patterns
**Why investigate:** Imports LayoutDesign type.

### 6.6 `src/utils/designCritiqueEngine.ts`
**What it does:** AI design critique functionality
**Why investigate:** Imports LayoutDesign type.

### 6.7 `src/utils/designLanguageInterpreter.ts`
**What it does:** Interprets natural language design commands
**Why investigate:** Imports LayoutDesign type.

### 6.8 `src/utils/designLanguageParser.ts`
**What it does:** Parses design language commands
**Why investigate:** Imports LayoutDesign type.

### 6.9 `src/utils/designSystemGenerator.ts`
**What it does:** Generates design system documentation
**Why investigate:** Imports LayoutDesign type.

### 6.10 `src/utils/designSystemDocs.ts`
**What it does:** Design system documentation utilities
**Why investigate:** Imports from layoutDesign.ts.

### 6.11 `src/utils/designLinter.ts`
**What it does:** Lints designs for issues
**Why investigate:** Imports from layoutDesign.ts.

### 6.12 `src/utils/darkModeGenerator.ts`
**What it does:** Generates dark mode variants
**Why investigate:** Imports from layoutDesign.ts.

### 6.13 `src/utils/accessibilityChecker.ts`
**What it does:** Checks accessibility compliance
**Why investigate:** Imports LayoutDesign type.

### 6.14 `src/utils/variantGenerator.ts`
**What it does:** Generates component variants
**Why investigate:** Imports LayoutDesign type.

### 6.15 `src/utils/imagePromptBuilder.ts`
**What it does:** Builds prompts for image generation
**Why investigate:** Imports LayoutDesign type.

### 6.16 `src/utils/elementSelection.ts`
**What it does:** Element selection utilities for Click+Talk
**Why investigate:** Imports from layoutDesign.ts.

### 6.17 `src/utils/specSheetExport.ts`
**What it does:** Exports design spec sheets
**Why investigate:** Imports from layoutDesign.ts.

---

## 7. Data Files Not in Your Plan

### 7.1 `src/data/architectureTemplateMapping.ts`
**What it does:** Maps architecture templates to design patterns
**Why investigate:** Imports from layoutDesign.ts.

### 7.2 `src/data/designCritiqueRules.ts`
**What it does:** Rules for design critique AI
**Why investigate:** Imports from layoutDesign.ts.

### 7.3 `src/data/elementQuickActions.ts`
**What it does:** Quick action presets for elements
**Why investigate:** Imports from layoutDesign.ts.

---

## 8. Store Not Addressed

### 8.1 `src/stores/useLayoutPanelStore.ts`
**What it does:** Zustand store for layout panel visibility state (19 boolean flags for different panels)
**Why investigate:** This is a SEPARATE store file (note: `src/stores/` plural, not `src/store/`).

**Contains:**
- Panel visibility toggles (closeConfirm, applyConfirm, extractedColors, versionHistory, etc.)
- `isAdvancedMode` flag with localStorage persistence
- 19 different panel state booleans

---

## 9. Store State Not Addressed

### 9.1 `src/store/useAppStore.ts` - Layout State

Your plan doesn't mention removing these from the main Zustand store:

**State fields to investigate:**
```typescript
// Line 132 - UI Slice
showLayoutBuilder: boolean;

// Lines 197-198 - Data Slice
currentLayoutDesign: LayoutDesign | null;
savedLayoutDesigns: LayoutDesign[];
```

**Actions to investigate:**
```typescript
// Line 159
setShowLayoutBuilder: (show: boolean) => void;

// Lines 219-222
setCurrentLayoutDesign: (design: LayoutDesign | null) => void;
setSavedLayoutDesigns: (designs: LayoutDesign[]) => void;
addSavedLayoutDesign: (design: LayoutDesign) => void;
removeSavedLayoutDesign: (id: string) => void;
```

**Selector exports to investigate (lines 648, 664-666):**
```typescript
// These export layout state to components
showLayoutBuilder: state.showLayoutBuilder,
currentLayoutDesign: state.currentLayoutDesign,
savedLayoutDesigns: state.savedLayoutDesigns,
```

---

## 10. Core Services That Need Updates

These are NOT being deleted but WILL break because they import LayoutDesign:

### 10.1 `src/services/DynamicPhaseGenerator.ts`
**What it does:** CORE SERVICE - Generates dynamic build phases from AppConcept
**Why critical:** This is used by the main build flow. It imports LayoutDesign.
**Action needed:** Update to use layoutManifest instead.

### 10.2 `src/services/PhaseExecutionManager.ts`
**What it does:** CORE SERVICE - Executes build phases
**Why critical:** Central to the build process. Imports from layoutDesign.ts.
**Action needed:** Update or remove layout-related imports.

### 10.3 `src/services/ProjectDocumentationService.ts`
**What it does:** Captures and stores project documentation artifacts
**Why critical:** Stores layout snapshots. Imports LayoutDesign AND LayoutManifest.
**Action needed:** Migrate to only use LayoutManifest.

### 10.4 `src/services/AppImageGenerator.ts`
**What it does:** Generates images for the app
**Why investigate:** Imports LayoutDesign type.

### 10.5 `src/services/AccessibilityChecker.ts`
**What it does:** Service for accessibility checking
**Why investigate:** Imports LayoutDesign type.

---

## 11. Type Files That Will Break

### 11.1 `src/types/dynamicPhases.ts`
**What it does:** Types for dynamic phase system
**Why critical:** Imports from layoutDesign.ts.

### 11.2 `src/types/projectDocumentation.ts`
**What it does:** Types for project documentation including LayoutSnapshot
**Why critical:** Has `LayoutSnapshot` interface that references LayoutDesign.

---

## 12. Hooks That Will Break (Not Being Deleted)

These hooks are NOT in your delete list but import from layoutDesign.ts:

### 12.1 `src/hooks/useProjectDocumentation.ts`
**What it does:** Hook for project documentation features
**Why investigate:** Has `captureLayoutSnapshot` function.

### 12.2 `src/hooks/useAppBuilderSync.ts`
**What it does:** Syncs app builder state
**Why investigate:** References LayoutExportService.

### 12.3 `src/hooks/usePhaseGeneration.ts`
**What it does:** Hook for phase generation
**Why investigate:** Imports from layoutDesign.ts.

### 12.4 `src/hooks/useArchitectureGeneration.ts`
**What it does:** Hook for architecture generation
**Why investigate:** Imports from layoutDesign.ts.

### 12.5 `src/hooks/useResponsivePreview.ts`
**What it does:** Hook for responsive preview
**Why investigate:** Imports from layoutDesign.ts.

### 12.6 `src/hooks/useAnalysisProgress.ts`
**What it does:** Hook for analysis progress tracking
**Why investigate:** Imports from layoutDesign.ts.

### 12.7 `src/hooks/useComponentStates.ts`
**What it does:** Hook for component state management
**Why investigate:** Imports from layoutDesign.ts.

### 12.8 `src/hooks/useSendMessage.ts`
**What it does:** Hook for sending messages
**Why investigate:** Imports from layoutDesign.ts.

---

## 13. API Routes That Will Break (Not Layout-Specific)

### 13.1 `src/app/api/ai-builder/full-app-stream/route.ts`
**What it does:** Main streaming endpoint for full app generation
**Why critical:** CORE API - imports layout types.

### 13.2 `src/app/api/ai-builder/full-app/generation-logic.ts`
**What it does:** Generation logic for full app
**Why critical:** CORE LOGIC - imports layout types.

---

## 14. Config/Rules Not Addressed

### 14.1 `claude.json`
**Lines to investigate:**
- Line 66: References `.claude/rules/layout-builder.md`
- Line 116: References `src/components/LayoutBuilderWizard.tsx`
- Line 119: References `src/types/layoutDesign.ts`

### 14.2 `.claude/rules/layout-builder.md`
**What it does:** Documentation for layout builder patterns
**Action:** Should be deleted since it documents the legacy system.

---

## 15. localStorage Keys Not Addressed

Your plan doesn't mention cleaning up these localStorage keys:

### 15.1 `layoutBuilder_draft`
**What it stores:** Draft layout design, messages, reference images
**Location:** Used in useLayoutBuilder.ts line 56

### 15.2 `layoutBuilder_versionHistory`
**What it stores:** Version history data
**Location:** Used in useLayoutBuilder.ts line 57

### 15.3 `layoutBuilder_advancedMode`
**What it stores:** Advanced mode toggle state
**Location:** Used in useLayoutPanelStore.ts lines 104, 151

**Note:** The NEW system uses `gemini3_draft` (different key) - that one should be KEPT.

---

## Summary: Investigation Priority

### HIGH PRIORITY (Core functionality)
1. `DynamicPhaseGenerator.ts` - Core build service
2. `PhaseExecutionManager.ts` - Core build service
3. `useAppStore.ts` - Central state management
4. `NaturalConversationWizard.tsx` - PLAN mode (core feature)
5. API routes in `ai-builder/` - Main generation endpoints

### MEDIUM PRIORITY (Features that may break)
1. `ProjectDocumentationService.ts` - Documentation capture
2. All hooks importing layoutDesign.ts
3. All components importing layoutDesign.ts
4. Type files (dynamicPhases.ts, projectDocumentation.ts)

### LOWER PRIORITY (Can be deleted)
1. All layout-builder/ components (except ChatInput)
2. All layout/ API routes
3. All figma/ API routes
4. Layout-specific utils
5. Layout-specific services
6. useLayoutPanelStore.ts

---

## How to Investigate Each File

For each file listed above, check:

1. **What does it import from layoutDesign.ts?**
   ```bash
   grep -n "from.*layoutDesign" <filepath>
   ```

2. **What other files import THIS file?**
   ```bash
   grep -r "<filename>" src/ --include="*.ts" --include="*.tsx"
   ```

3. **Is it used by the new Gemini 3 system?**
   - Check if LayoutBuilderWizard.tsx, Engine.tsx, or ArchitectService.ts import it

4. **Decision: DELETE, UPDATE, or KEEP?**
   - DELETE if purely legacy
   - UPDATE if needed by new system but imports old types
   - KEEP if no changes needed
