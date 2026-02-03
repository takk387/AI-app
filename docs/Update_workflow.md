# Fix Data Flow: Wizard → Layout Builder → Review → Builder

## Problem Summary

Data is lost between stages because:

1. **Layout Builder never saves to store** — `useLayoutBuilder.ts` stores `generatedFiles: AppFile[]` in local `useState`, never writing to Zustand. The pipeline also returns `manifests: VisualManifest[]` which are completely ignored.
2. **Design page only captures a screenshot** — `design/page.tsx` saves `layoutThumbnail` (image only) but not the actual layout code or manifest.
3. **Phase plan generated before layout exists** — Wizard creates `DynamicPhasePlan` before layout builder runs, so `layoutManifest` is `undefined` in all phases. No regeneration trigger exists after layout is complete.
4. **AppNavigation stuck** — `AppNavigation.tsx:104` checks `!!currentLayoutManifest` for Design step completion. Since it's never set, Design step always shows incomplete.
5. **Downstream code is ready but starved** — `useSendMessage.ts:464` already passes `layoutManifest: appConcept?.layoutManifest || undefined` to AI API calls. `PhaseExecutionManager.ts:379-389` already has a fallback chain for layoutManifest. `DynamicPhaseGenerator.ts:1117` already creates a Design System phase when layoutManifest exists. **All this works — the data just never gets there.**

## What Already Works (DO NOT change)

| Component                           | What it does                                 | File:Line                          |
| ----------------------------------- | -------------------------------------------- | ---------------------------------- |
| `appConcept.layoutManifest` field   | Field exists in type                         | `appConcept.ts:39`                 |
| `currentLayoutManifest` store field | Exists with persistence                      | `useAppStore.ts:204,632`           |
| `setCurrentLayoutManifest` action   | Ready to use                                 | `useAppStore.ts:518`               |
| `updateAppConceptField` action      | Ready to use                                 | `useAppStore.ts:529`               |
| AppNavigation Design step check     | `!!currentLayoutManifest`                    | `AppNavigation.tsx:104`            |
| Design System phase generation      | Auto-creates when layoutManifest exists      | `DynamicPhaseGenerator.ts:1117`    |
| Layout manifest in phase prompts    | Fallback chain in prompt builder             | `PhaseExecutionManager.ts:379-389` |
| `formatLayoutManifestForPrompt`     | Full design spec prompt generation           | `PhaseExecutionManager.ts:119-182` |
| Layout context in execution         | `fullConcept.layoutManifest` passed          | `PhaseExecutionManager.ts:803`     |
| useSendMessage layout passing       | `layoutManifest: appConcept?.layoutManifest` | `useSendMessage.ts:464`            |

## Architectural Decisions

- **Phase 1 = Layout Injection** — Pre-built layout code from Layout Builder injected directly into `currentComponent.code`, Phase 1 auto-completes without AI call
- **Layout NOT spread across phases** — Layout injection is Phase 1, subsequent phases add features on top
- **Direct injection over AI pass-through** — Faster, more reliable, avoids AI modifying the layout

## How Phase Execution Currently Works (Important Context)

The dynamic phase system is **state-tracking only**, not auto-executing:

1. `startPhase(1)` sets phase status to 'in-progress' (`useDynamicBuildPhases.ts:227`)
2. User sends a message via chat
3. `useSendMessage` sends to `/api/ai-builder` → AI decides build/modify/chat
4. If build trigger: `handleBuildTrigger()` streams code from AI, creates `GeneratedComponent`
5. If `dynamicBuildPhases.currentPhase` exists: `completePhase(result)` called (`useSendMessage.ts:627-638`)
6. `getExecutionPrompt()` exists in the hook but is **NOT wired to auto-send** anywhere

For layout injection, we need to bypass this message-based flow and directly inject code.

---

## Implementation Steps (Dependency Order)

### Step 1: Add Types

**File: `src/types/dynamicPhases.ts`**

- Add `isLayoutInjection?: boolean` to `DynamicPhase` interface (~line 184, after `conceptContext`)
- Add `layoutBuilderFiles?: AppFile[]` to `DynamicPhasePlan` interface (~line 290, after `architectureSpec`)
- Import `AppFile` from `@/types/railway`

**File: `src/services/PhaseExecutionManager.ts`** — check where `PhaseExecutionContext` is defined

- Add `isLayoutInjection?: boolean` to `PhaseExecutionContext`
- Add `layoutBuilderFiles?: AppFile[]` to `PhaseExecutionContext`

### Step 2: Add Store Field + Action

**File: `src/store/useAppStore.ts`**

- Add to `DataSlice` interface (~line 186): `layoutBuilderFiles: AppFile[] | null`
- Add to `DataSlice` interface: `setLayoutBuilderFiles: (files: AppFile[] | null) => void`
- Add implementation: `layoutBuilderFiles: null, setLayoutBuilderFiles: (files) => set({ layoutBuilderFiles: files })`
- Add to `partialize` (~line 628): `layoutBuilderFiles: state.layoutBuilderFiles`
- Bump version from `2` to `3` (~line 614)
- Add v2→v3 migration defaulting `layoutBuilderFiles: null` (~line 616-627)
- Import `AppFile` from `@/types/railway`

### Step 3: Save Layout Data from useLayoutBuilder to Store (ROOT CAUSE FIX)

**File: `src/hooks/useLayoutBuilder.ts`**

This hook currently has NO connection to the Zustand store. The fix:

**3a. Import store actions:**

```ts
import { useAppStore } from '@/store/useAppStore';
```

Inside the hook, select store actions:

```ts
const setLayoutBuilderFiles = useAppStore((s) => s.setLayoutBuilderFiles);
const setCurrentLayoutManifest = useAppStore((s) => s.setCurrentLayoutManifest);
const updateAppConceptField = useAppStore((s) => s.updateAppConceptField);
```

**3b. In `runPipeline` after line 235** (`updateFilesWithHistory(result.files)`):

- Call `setLayoutBuilderFiles(result.files)` to persist generated code to store
- If `result.manifests?.length > 0`, convert `VisualManifest[]` → `LayoutManifest`:
  - Call `setCurrentLayoutManifest(manifest)` (fixes AppNavigation step 2 completion)
  - Call `updateAppConceptField('layoutManifest', manifest)` (feeds into phase generation & AI API calls)

**3c. In `refineComponent`** after line ~302 (updating generatedFiles via `setGeneratedFiles(newFiles)`):

- Call `setLayoutBuilderFiles(newFiles)` to sync refinements to store

**3d. In `undo`/`redo`** after local state update:

- Call `setLayoutBuilderFiles(restoredFiles)` to keep store in sync

**3e. Add `convertVisualManifestToLayoutManifest()` helper** (in hook or new utility):

- `VisualManifest` type: `src/types/titanPipeline.ts:115` — has `global_theme.colors[]`, `global_theme.fonts[]`, `global_theme.dom_tree`, `measured_components[]`
- `LayoutManifest` type: `src/types/schema.ts:67` — needs `id`, `version`, `root: UISpecNode`, `definitions`, `detectedFeatures[]`, `designSystem: { colors, fonts }`
- Conversion: extract colors → `Record<string,string>`, fonts → `{heading, body}`, build minimal `root` from `dom_tree` if available, collect detected features from component types

**Note on pipeline response:** The `/api/layout/pipeline/route.ts` returns `result.manifests` (from TitanPipelineService), but `useLayoutBuilder` currently only accesses `result.files` and `result.warnings`. Need to verify the API actually returns manifests by checking the response structure.

### Step 4: Design Page Transition — Trigger Phase Plan Regeneration

**File: `src/app/(protected)/app/design/page.tsx`**

In `handleContinueToReview` (line 17-33), after capturing thumbnail:

- Read `appConcept` and `dynamicPhasePlan` from store
- If `appConcept?.layoutManifest` exists AND `dynamicPhasePlan` exists but doesn't have a phase with `isLayoutInjection: true`:
  - Call `/api/wizard/generate-phases` (POST) with updated concept (which now has `layoutManifest`)
  - Save new plan via `setDynamicPhasePlan(newPlan)`
  - Also save `layoutBuilderFiles` into the new plan: `newPlan.layoutBuilderFiles = layoutBuilderFiles`
  - Update `setPhasePlanGeneratedAt(new Date().toISOString())`
- Navigate to `/app/review`

This ensures the phase plan is regenerated with layout data before reaching Review.

### Step 5: DynamicPhaseGenerator — Create Layout Injection Phase

**File: `src/services/DynamicPhaseGenerator.ts`**

**5a. Modify `generatePhasesFromGroups()` (line 1105-1218):**

Current logic (lines 1112-1119):

```
Phase 1: ALWAYS createSetupPhase
Phase 2: IF concept.layoutManifest → createDesignSystemPhase
```

Change to:

```
IF concept.layoutManifest:
  Phase 1: createLayoutInjectionPhase (replaces BOTH setup + design system)
ELSE:
  Phase 1: createSetupPhase (existing behavior)
```

This means when layout exists, we skip both the standard Setup phase AND the Design System phase, replacing them with a single Layout Injection phase.

**5b. Add `createLayoutInjectionPhase(phaseNumber, concept)` method:**

- Returns `DynamicPhase` with:
  - `domain: 'setup'`, `isLayoutInjection: true`
  - `name: 'Layout Injection'`
  - `description`: Inject pre-built layout code from Layout Builder as foundation
  - `features`: ['Pre-built layout structure', 'Design system (colors, typography, spacing)', 'Navigation framework', 'Responsive layout']
  - `conceptContext`: includes full `layoutManifest`
  - `estimatedTokens: 500` (low — injecting, not generating)
  - `testCriteria`: ['Layout renders correctly', 'Design tokens applied', 'Navigation works', 'Responsive']

### Step 6: Layout Injection in Builder — Direct Code Injection

**File: `src/components/MainBuilderView.tsx`**

This is the key behavioral change. When builder opens and Phase 1 is layout injection, directly inject code without AI.

**6a. Read `layoutBuilderFiles` from store:**

```ts
const layoutBuilderFiles = useAppStore((s) => s.layoutBuilderFiles);
```

**6b. Modify auto-start effect (lines 1097-1114):**

After `dynamicBuildPhases.startPhase(1)`, check if Phase 1 is layout injection:

```ts
const phase1 = dynamicBuildPhases.plan?.phases.find((p) => p.number === 1);
if (phase1?.isLayoutInjection && layoutBuilderFiles?.length) {
  // Direct injection — skip AI, inject layout code directly
  const appData = {
    name: appConcept?.name || 'App',
    description: appConcept?.description || '',
    files: layoutBuilderFiles,
  };

  const newComponent = {
    id: generateId(),
    name: appConcept?.name || 'My App',
    code: JSON.stringify(appData, null, 2),
    description: 'Layout injected from Layout Builder',
    timestamp: new Date().toISOString(),
    isFavorite: false,
    conversationHistory: [],
    versions: [],
  };

  setCurrentComponent(newComponent);

  // Auto-complete Phase 1
  dynamicBuildPhases.completePhase({
    phaseNumber: 1,
    phaseName: 'Layout Injection',
    success: true,
    generatedCode: JSON.stringify(appData),
    generatedFiles: layoutBuilderFiles.map((f) => f.path),
    implementedFeatures: ['Layout structure', 'Design system', 'Navigation'],
    duration: 0,
    tokensUsed: { input: 0, output: 0 },
  });

  // Add chat notification
  setChatMessages((prev) => [
    ...prev,
    {
      id: generateId(),
      role: 'system',
      content:
        '**Phase 1: Layout Injection Complete!**\n\nYour layout from the Layout Builder has been injected as the starting code.',
      timestamp: new Date().toISOString(),
    },
  ]);
} else {
  dynamicBuildPhases.startPhase(1);
}
```

**6c. Also update the `onStartBuilding` handler (line 1272-1281)** with the same layout injection logic.

### Step 7: Review Page — Show Layout Data

**File: `src/app/(protected)/app/review/page.tsx`**

- Read `currentLayoutManifest` and `layoutBuilderFiles` from store
- Pass to `LayoutCard`: add `layoutManifest` and `fileCount` props
- If `dynamicPhasePlan` exists but no `isLayoutInjection` phase AND `appConcept?.layoutManifest` exists → show note that plan will be regenerated

**File: `src/components/review/LayoutCard.tsx`**

- Accept optional `layoutManifest` and `fileCount` props
- Show: file count, detected features, design system colors/fonts summary
- Show indicator: "Layout code ready for injection" or "No layout designed"

### Step 8: Phase Generation API Route — Accept layoutBuilderFiles

**File: `src/app/api/wizard/generate-phases/route.ts`** (verified at this path)

- Accept `layoutBuilderFiles` in request body alongside `concept`
- Include in the resulting `DynamicPhasePlan`: `plan.layoutBuilderFiles = layoutBuilderFiles`
- The route already passes `concept` to `DynamicPhaseGenerator.generatePhasePlan(normalizedConcept)` — since `concept.layoutManifest` will now be populated, the generator will auto-create the Layout Injection phase

---

## Critical Files Modified

| File                                          | Change                                               | Risk                    | Lines ~affected |
| --------------------------------------------- | ---------------------------------------------------- | ----------------------- | --------------- |
| `src/types/dynamicPhases.ts`                  | Add `isLayoutInjection`, `layoutBuilderFiles` fields | Low — optional fields   | ~5              |
| `src/store/useAppStore.ts`                    | Add state + action + persistence + migration         | Medium — TIER 1         | ~20             |
| `src/hooks/useLayoutBuilder.ts`               | Import store, save files+manifest after pipeline     | Medium — root cause fix | ~40             |
| `src/app/(protected)/app/design/page.tsx`     | Phase regeneration trigger on transition             | Low — leaf page         | ~30             |
| `src/services/DynamicPhaseGenerator.ts`       | Layout injection phase, modify phase ordering        | Medium — phase logic    | ~50             |
| `src/services/PhaseExecutionManager.ts`       | Add fields to execution context type                 | Low — additive          | ~5              |
| `src/components/MainBuilderView.tsx`          | Direct layout injection in auto-start                | Medium — orchestrator   | ~40             |
| `src/app/(protected)/app/review/page.tsx`     | Read layout data, pass to LayoutCard                 | Low — leaf page         | ~10             |
| `src/components/review/LayoutCard.tsx`        | Enhanced display with manifest data                  | Low — leaf component    | ~30             |
| `src/app/api/wizard/generate-phases/route.ts` | Accept and include layoutBuilderFiles                | Low — API route         | ~10             |

## Data Flow After Fix

```
Wizard → appConcept (with name, features, uiPreferences) → Store ✓
                                    ↓
Layout Builder → runPipeline → AppFile[] + VisualManifest[]
                                    ↓
useLayoutBuilder saves to store:
  ├── setLayoutBuilderFiles(files)           → Store.layoutBuilderFiles ✓
  ├── setCurrentLayoutManifest(manifest)     → Store.currentLayoutManifest ✓ (fixes AppNavigation)
  └── updateAppConceptField('layoutManifest') → Store.appConcept.layoutManifest ✓
                                    ↓
"Continue to Review" button:
  ├── Captures thumbnail (existing)
  ├── Regenerates phase plan with layout context
  │   └── DynamicPhaseGenerator sees layoutManifest → creates Layout Injection Phase 1
  └── Saves layoutBuilderFiles into plan
                                    ↓
Review Page:
  ├── Shows appConcept ✓
  ├── Shows layout thumbnail + manifest data + file count ✓
  ├── Shows phases (with Layout Injection as Phase 1) ✓
  └── User clicks "Proceed to Builder"
                                    ↓
Builder (MainBuilderView):
  ├── Auto-start fires → detects Phase 1 isLayoutInjection
  ├── Direct injection: layoutBuilderFiles → currentComponent.code
  ├── Phase 1 auto-completes (no AI call)
  ├── Phase 2+ use normal AI flow
  └── useSendMessage passes appConcept.layoutManifest to all AI calls ✓
```

## Verification Plan

1. **TypeScript check**: `npm run typecheck` — all new fields are optional, no breaking changes
2. **Lint**: `npm run lint`
3. **Unit tests**: `npm test` — existing tests should pass, all changes additive
4. **Manual flow test**:
   - Complete wizard → verify appConcept stored (check DevTools → Application → localStorage)
   - Use layout builder, generate a layout → verify:
     - `layoutBuilderFiles` appears in localStorage (array of AppFile)
     - `currentLayoutManifest` appears in localStorage (LayoutManifest object)
     - `appConcept.layoutManifest` is populated
     - AppNavigation shows Design step as complete (checkmark on step 2)
   - Click "Continue to Review" → verify:
     - Phase plan regenerated (check `dynamicPhasePlan.phases[0].name === 'Layout Injection'`)
     - `dynamicPhasePlan.layoutBuilderFiles` populated
   - On Review page → verify:
     - LayoutCard shows file count and design system info (not just thumbnail)
     - PhasesCard shows "Layout Injection" as Phase 1
   - Click "Proceed to Builder" → verify:
     - Phase 1 auto-completes instantly (no AI streaming)
     - Preview shows the layout from the layout builder
     - Chat shows "Phase 1: Layout Injection Complete" notification
     - Phase 2 ready to start (user sends first message)
   - Send a message for Phase 2 → verify:
     - AI receives `layoutManifest` in the request (check Network tab)
     - Generated code builds on top of the injected layout
5. **Edge cases**:
   - Skip layout builder entirely (go from wizard → review directly if allowed) → old flow works, no layout injection phase
   - Page refresh at each stage → all data persists from localStorage
   - Empty layout (no files generated in builder) → should use standard setup phase, not layout injection
   - Undo/redo in layout builder → store stays in sync with local state
   - "Start New Project" → all data including layoutBuilderFiles properly cleared
