# Layout Builder Refactoring Plan

## Goal

Decompose the two monolithic layout services (`TitanPipelineService.ts` at 1,208 lines and `GeminiLayoutService.ts` at 1,369 lines) into smaller, focused modules, and split the 2,999-line `layoutDesign.ts` type file -- all without breaking any existing functionality.

## Key Constraints

- Two different Google AI SDKs in use: `@google/genai` (new, in Titan) vs `@google/generative-ai` (old, in GeminiLayout). Must not mix them.
- 51+ files reference layout state/types. Barrel re-exports are mandatory to avoid mass import updates.
- Zustand store has 15+ layout state properties consumed by 12+ files across the 4-step flow.
- localStorage hydration (version 3 storage) must not break for returning users.

---

## Affected Files Inventory (~13,000+ lines across 51+ files)

### Core Services (12 files, ~3,600 lines)

- `src/services/TitanPipelineService.ts` (1,208) -- PRIMARY decomposition target
- `src/services/GeminiLayoutService.ts` (1,369) -- SECONDARY decomposition target
- `src/services/VisionLoopEngine.ts` (499)
- `src/services/LayoutAutoFixEngine.ts` (472)
- `src/services/MotionMapper.ts` (350)
- `src/services/SourceMergeEngine.ts` (~322)
- `src/services/AppImageGenerator.ts` (277)
- `src/services/LayoutExportService.ts` (276)
- `src/services/AssetExtractionService.ts` (251)
- `src/services/EnhancedVideoAnalyzer.ts` (~166)
- `src/services/GeminiImageService.ts` (116)
- `src/services/designSystemGenerator.ts`

### Components (9 files, ~2,800 lines)

- `src/components/layout-builder/GenericComponentRenderer.tsx` (943)
- `src/components/LayerPanel.tsx` (532)
- `src/components/layout-builder/LayoutCanvas.tsx` (512)
- `src/components/layout-builder/LayoutBuilderChatPanel.tsx` (438)
- `src/components/ZIndexEditor.tsx` (384)
- `src/components/LayoutBuilderView.tsx` (286)
- `src/components/effects/CSSParticleEffect.tsx` (~192)
- `src/components/layout-builder/KeyframeInjector.tsx` (186)
- `src/components/layout-builder/FloatingEditBubble.tsx` (134)
- `src/components/effects/VisualEffectRenderer.tsx` (~95)
- `src/components/layout-builder/DynamicLayoutRenderer.tsx` (92)

### Types (6 files, ~4,500 lines)

- `src/types/layoutDesign.ts` (2,999) -- HIGHEST IMPACT decomposition target
- `src/types/titanPipeline.ts` (218)
- `src/types/layoutAnalysis.ts` (191)
- `src/types/designSpec.ts` (109)
- `src/types/motionConfig.ts` (98)
- `src/types/mediaSource.ts` (58)

### Utilities (10 files, ~2,200 lines)

- `src/utils/layoutValidation.ts` (1,122)
- `src/utils/layerUtils.ts` (436)
- `src/utils/layoutConverter.ts` (200)
- `src/utils/inspectorBridge.ts` (175)
- `src/utils/responsiveTypography.ts` (119)
- `src/utils/codeExporter.ts` (97)
- `src/utils/elementSelection.ts` (63)
- `src/utils/designCritiqueEngine.ts`
- `src/utils/designTokenMappings.ts`
- `src/utils/screenshotCapture.ts`

### Hooks

- `src/hooks/useLayoutBuilder.ts` (496) -- Critical bridge between UI and pipeline

### API Routes (3 files, ~323 lines)

- `src/app/api/layout/analyze/route.ts` (50) -- imports `getGeminiLayoutService`
- `src/app/api/layout/screenshot/route.ts` (192)
- `src/app/api/layout/pipeline/route.ts` (81) -- imports `getTitanPipelineService`

### Pages

- `src/app/(protected)/app/design/page.tsx` (144)
- `src/components/review/LayoutCard.tsx` (124)

### Prompts

- `src/prompts/geminiLayoutBuilderPrompt.ts` (509)
- `src/prompts/designTokenPrompt.ts`

### Data/Templates (11 files with layout type references)

- `src/data/templates/` (6 template files)
- `src/data/architectureTemplateMapping.ts`
- `src/data/componentPatterns.ts`
- `src/data/designCritiqueRules.ts`
- `src/data/designWorkflows.ts`
- `src/data/elementQuickActions.ts`

### Downstream Consumers (DO NOT modify, but verify they still work)

- `MainBuilderView.tsx` -- reads `layoutBuilderFiles` for Phase 1 injection
- `NaturalConversationWizard.tsx` -- references `currentLayoutManifest`
- `AppNavigation.tsx` -- layout state for nav highlighting
- `useAutoSaveOnNavigation.ts` -- saves layout state on navigation
- `useAppCrud.ts` -- persists layout data to Supabase
- `PhaseExecutionManager.ts` -- layout-to-code phase execution
- `api/wizard/generate-phases/route.ts` -- reads layout context
- `api/ai-builder/full-app/route.ts` -- full app generation
- `(protected)/app/layout.tsx` -- protected route group
- `(protected)/app/review/page.tsx` -- review display
- `conversation-wizard/WizardHeader.tsx` -- layout state reference

---

## Phase 1: Split TitanPipelineService In-Place

Stay within `src/services/`. No directory moves.

**Create these new files by extracting from TitanPipelineService.ts:**

| New File              | Extract From             | Lines | Contents                                                  |
| --------------------- | ------------------------ | ----- | --------------------------------------------------------- |
| `TitanRouter.ts`      | Lines 78-164             | ~90   | `routeIntent()`, ROUTER_PROMPT                            |
| `TitanSurveyor.ts`    | Lines 57-75, 167-314     | ~150  | `surveyLayout()`, `uploadFileToGemini()`, SURVEYOR_PROMPT |
| `TitanBuilder.ts`     | Lines 400-709            | ~250  | `assembleCode()`, `extractJSXMarkup()`, BUILDER_PROMPT    |
| `TitanHealingLoop.ts` | Lines 715-797, 1072-1178 | ~120  | `captureRenderedScreenshot()`, healing loop logic         |

**Keep in TitanPipelineService.ts (~400 lines):**

- `runPipeline()` orchestrator (imports from split files)
- `liveEdit()` (lines 800-864)
- `extractCustomVisualAssets()` (lines 866-939)
- `buildStructure()` and `extractPhysics()` (currently bypassed)
- `getTitanPipelineService()` singleton
- All Photographer logic (inline in runPipeline, ~35 lines)

**SDK note:** All split files use `@google/genai` (new SDK).

**Barrel re-export:** `TitanPipelineService.ts` re-exports `routeIntent`, `surveyLayout`, `assembleCode` from the split files so external consumers (API route) see no change.

---

## Phase 2: Split GeminiLayoutService In-Place

**Create these new files by extracting from GeminiLayoutService.ts:**

| New File                       | Extract From    | Lines | Contents                                                                       |
| ------------------------------ | --------------- | ----- | ------------------------------------------------------------------------------ |
| `GeminiDesignSpecExtractor.ts` | Lines 99-299    | ~200  | `extractDesignSpec()` (Stage 1 "The Architect")                                |
| `GeminiComponentBuilder.ts`    | Lines 301-756   | ~450  | `buildComponentsFromSpec()` (Stage 2 "The Engineer"), post-processing pipeline |
| `GeminiLayoutCritique.ts`      | Lines 1121-1298 | ~180  | `critiqueLayout()`, `critiqueLayoutEnhanced()`                                 |

**Keep in GeminiLayoutService.ts (~400 lines):**

- Class definition + singleton (`getGeminiLayoutService()`)
- `analyzeImageTwoStage()` orchestrator (calls extractors)
- `analyzeImage()` legacy method
- `analyzeVideoFlow()` (lines 1077-1115)
- `editComponent()` (lines 1303-1343)
- `normalizeCoordinates()` helper
- `getDefaultDesignSpec()` fallback
- `fileToPart()` helper
- `validateTypographyScaling()` utility

**SDK note:** All split files use `@google/generative-ai` (old SDK).

**Barrel re-export:** `GeminiLayoutService.ts` class methods delegate to split files internally. The singleton accessor stays in place. No external import changes needed.

---

## Phase 3: Split layoutDesign.ts Types

`src/types/layoutDesign.ts` at 2,999 lines with 18-21 importers is the highest-impact tech debt.

**Create directory `src/types/layoutDesign/` with:**

| New File       | Contents                                                                             |
| -------------- | ------------------------------------------------------------------------------------ |
| `component.ts` | `DetectedComponentEnhanced`, `DetectedComponent`, component tree types, bounds types |
| `style.ts`     | Style interfaces, interaction states, hover/active/focus types                       |
| `content.ts`   | `ComponentContent`, media types, icon types                                          |
| `effects.ts`   | `VisualEffect`, `MotionKeyframe`, animation types, particle configs                  |
| `structure.ts` | `PageAnalysis`, `LayoutStructure`, layout metadata types                             |
| `index.ts`     | Barrel re-export of ALL types from all sub-files                                     |

**Migration strategy:**

1. Create the new files
2. Move types into them
3. `index.ts` re-exports everything
4. All 18-21 existing importers continue to import from `@/types/layoutDesign` (resolves to `index.ts`)
5. **Zero breaking changes**

---

## Phase 4: (Optional) Directory Reorganization

Only after Phases 1-3 are stable and tested. Use flat structure preserving existing conventions:

```
src/layout/
  services/      (split services from Phases 1-2)
  components/    (from src/components/layout-builder/)
  types/         (from Phase 3)
  hooks/         (useLayoutBuilder.ts)
  utils/         (layout-specific utils)
  index.ts       (barrel export)
```

This maintains the `services/components/hooks/types` convention the codebase already uses, just scoped under a `layout/` domain.

---

## Migration Risks & Mitigations

| Risk                                            | Mitigation                                                |
| ----------------------------------------------- | --------------------------------------------------------- |
| API routes break when singletons move           | Barrel re-exports preserve import paths                   |
| Store hydration fails for returning users       | Do NOT change type shapes or store property names         |
| Circular dependencies (healing loop -> builder) | Keep healing loop in orchestrator file that imports both  |
| SDK mixing silently breaks features             | Document which SDK each file uses; lint rule if possible  |
| 4-step navigation flow breaks                   | Zustand store interface stays identical; verify each step |
| MainBuilderView Phase 1 injection breaks        | `layoutBuilderFiles` store shape unchanged                |

---

## Verification Plan

After each phase:

1. `npm run typecheck` -- must pass with zero errors
2. `npm run lint` -- must pass
3. `npm test` -- all existing tests pass
4. Manual test: Upload image in layout builder -> analyze -> edit -> save -> review -> build
5. Verify localStorage hydration works for returning users
6. Verify all 3 API routes respond correctly (`/api/layout/analyze`, `/api/layout/pipeline`, `/api/layout/screenshot`)
7. Verify self-healing vision loop still executes (requires image upload + build)
8. Verify downstream consumers: MainBuilderView Phase 1 injection, review page layout card, wizard phase generation
