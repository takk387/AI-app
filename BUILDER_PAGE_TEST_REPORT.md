# Builder Page Test Report — Chat Box & App Concept Panel & Preview

**Date:** March 15-16, 2026
**Deployment:** ai-app-production-e93b.up.railway.app
**Project:** RecipeBox v1.0.0 (10 features, 10 phases)

> See [`MASTER_CONTEXT_VERIFIED.md`](MASTER_CONTEXT_VERIFIED.md) for full project context.

---

## Bug Summary

| #   | Severity | Issue                                                                                                                                                     | Root Cause Location                                                      |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | CRITICAL | ACT chat has zero context about phase plan or app concept — sends only boolean flags                                                                      | `useSendMessage.ts` ~L190-205                                            |
| 4   | CRITICAL | "Start Building" only toggles mode — Phase 1 (layout injection) gets stuck without `layoutBuilderFiles` and auto-execute excludes layout injection phases | `usePhaseExecution.ts` → `tryStartPhase1()` + auto-execute effect        |
| 5   | CRITICAL | "Build This Phase" handler is a no-op — only calls `handleClosePhaseDetail()`                                                                             | `AppConceptPanel.tsx` L426                                               |
| 8   | CRITICAL | Surgical modify system (`/api/ai-builder/modify`, 22KB) never called — chat modifications go through `full-app-stream` (full regeneration)                | `useSendMessageHandlers.ts` → `streaming.generate()` → `full-app-stream` |
| 10  | CRITICAL | AST-based modifications mostly disconnected — only reachable via diff approval UI, never from chat                                                        | `astModifier.ts`, `applyDiff.ts`, `useVersionHandlers.ts` L205           |
| 11  | CRITICAL | Phase Integrity P1-P9: only P3 (snapshot/rollback) wired — 8 of 9 check categories never called                                                           | `useDynamicBuildPhases.ts` only calls P3                                 |
| 6   | MEDIUM   | Phase 1 stuck in `in-progress` → shows "Skip" not "Build" — chain from Bug 4                                                                              | `PhaseDetailView.tsx` footer status logic                                |
| 12  | MEDIUM   | Preview nav links break out of generated app — react-router-dom shim renders `<a>` tags                                                                   | `BrowserPreviewService` router shim                                      |
| 13  | MEDIUM   | Full-Stack Railway deploy succeeds but app crashes (no server entry point)                                                                                | `RailwayPreview` deploy pipeline                                         |
| 3   | LOW      | PLAN sends `wizardState` (full data), ACT sends booleans only                                                                                             | `useSendMessage.ts` PLAN vs ACT branches                                 |
| 7   | LOW      | Regenerate Phases: `isLoading` flag unused in ChatPanel rendering, no spinner for ~45s                                                                    | `useConceptUpdates.ts` + `ChatPanel.tsx`                                 |
| 14  | LOW      | Export modal shows "0 files · 0 dependencies" despite code existing                                                                                       | Export modal file counting                                               |
| 15  | LOW      | Capture for AI button gives no visible feedback                                                                                                           | `DeviceToolbar` → `onScreenshot`                                         |
| 16  | LOW      | Console button in fullscreen has no visible effect                                                                                                        | Fullscreen toolbar                                                       |
| 17  | LOW      | Code view shows raw JSON dump instead of file tree                                                                                                        | `FullAppPreview` Code tab                                                |
| 18  | LOW      | Preview system undocumented in README                                                                                                                     | Documentation gap                                                        |

Bug 2 (camera icon hidden) — **NOT A BUG**: conditionally renders on `hasLayoutDesign && onCapturePreview`, working as designed.
Bug 9 (ChatPanel/AppConceptPanel undocumented) — documentation gap, not a code bug.

---

## Root Cause: Two Separate AI Paths (Core Architectural Problem)

The Builder page has **two completely separate AI paths** that never share context:

1. **Chat in ACT mode** → `useSendMessage` → `/api/ai-builder` → has code file context only, phase plan and app concept sent as **boolean flags only** (`hasAppConcept: true`, `hasPhasePlan: true`)
2. **Phase execution** → `usePhaseExecution` → `/api/ai-builder/full-app-stream` → has **FULL context** (app concept, phase plan, dependencies, code state)

Chat can't trigger phase execution. Phase execution doesn't report to chat. Modifications go through full regeneration instead of the built surgical system.

**Code proof (`useSendMessage.ts`):**

```typescript
// ACT mode request body (~L190-205):
fetchBody = JSON.stringify({
  prompt: userInput,
  conversationHistory: compressed.history,
  currentAppState: currentComponent ? { name, files: [...] } : undefined,
  hasAppConcept: !!appConcept,      // BOOLEAN ONLY
  hasPhasePlan: !!dynamicBuildPhases.plan,  // BOOLEAN ONLY
});

// vs PLAN mode request body (~L165-185):
fetchBody = JSON.stringify({
  message: userInput,
  conversationHistory,
  currentState: wizardState,  // FULL DATA
});
```

---

## Root Cause: Orphaned Systems

Three substantial systems are fully built but disconnected:

### 1. Surgical Modify System (`/api/ai-builder/modify`, ~22KB)

Generates precise JSON diffs with AST-aware operations (`ADD_IMPORT`, `REPLACE`, `INSERT_AFTER`, `AST_WRAP_ELEMENT`), full validation pipeline, auto-fix/retry logic, diff preview UI. **Never called from chat flow** — `handleModifyTrigger()` routes to `full-app-stream` instead.

**What actually happens on "change the button color to red":**

1. Chat → `/api/ai-builder` (builder expert with extended thinking)
2. Claude classifies intent as `modify` → returns `{ shouldTriggerModify: true }`
3. Client calls `handleModifyTrigger()` from `useSendMessageHandlers.ts`
4. Handler calls `streaming.generate()` → hits `/api/ai-builder/full-app-stream`
5. Claude **regenerates the entire file set** — NOT a surgical edit

**What SHOULD happen:** Route through `/api/ai-builder/modify` which has the complete surgical diff system with validation, retry, and diff preview.

**Live verification:** Sent "change the sign up button color to blue" on the live deployment. Network captured `POST /api/ai-builder` → `POST /api/ai-builder/full-app-stream`. Zero calls to `/api/ai-builder/modify`.

### 2. AST Modification Layer (`astModifier.ts` + 5 modules)

Complete Tree-sitter AST editing system (`astExecutor.ts`, `applyDiff.ts`). Only reachable via diff approval UI in `useVersionHandlers.ts`, which itself is unreachable because builder expert prompt doesn't return the format to trigger it.

### 3. Phase Integrity Checks (`phaseIntegrity.ts`)

| Check | Method                                            | Status       |
| ----- | ------------------------------------------------- | ------------ |
| P1    | `detectFileConflicts()`                           | NEVER CALLED |
| P2    | `validateImportExports()`                         | NEVER CALLED |
| P3    | `capturePhaseSnapshot()` / `rollbackToSnapshot()` | **WIRED**    |
| P5    | `runPhaseTypeCheck()`                             | NEVER CALLED |
| P6    | `checkTypeCompatibility()`                        | NEVER CALLED |
| P7    | `runPhaseTests()`                                 | NEVER CALLED |
| P8    | `validateApiContracts()`                          | NEVER CALLED |
| P9    | `runRegressionTests()`                            | NEVER CALLED |
| P16   | `verifyArchitectureImplementation()`              | NEVER CALLED |

All implemented in `PhaseExecutionManager.ts` as class methods. Only P3 is called from `useDynamicBuildPhases.ts`.

---

## Build Pipeline Chain Failure (Bugs 4→6→5)

```
"Start Building" clicked
  → setCurrentMode('ACT')                     ✅ mode switches
  → tryStartPhase1()                           ❌ Phase 1 is "Layout Injection"
    → layoutBuilderFiles is empty              ❌ no layout files from Design step
    → falls through to startPhase(1)           → sets Phase 1 to 'in-progress'
    → auto-execute effect EXCLUDES layout      ❌ `if (!phase.isLayoutInjection && ...)`
      injection phases
  → Phase 1 stuck in 'in-progress' forever     → shows "Skip Phase" not "Build"
  → "Build This Phase" on Phase 2              ❌ handler only closes modal
  → Entire build pipeline blocked
```

**Bug 4 code proof (`MainBuilderView.tsx`):**

```typescript
onStartBuilding={() => {
  setCurrentMode('ACT');
  if (dynamicBuildPhases.plan && !dynamicBuildPhases.isBuilding && !dynamicBuildPhases.currentPhase) {
    tryStartPhase1();
  }
}}
```

**Bug 5 code proof (`AppConceptPanel.tsx` L426):**

```typescript
onBuildPhase={() => {
  // Phase is already being built via the main flow
  handleClosePhaseDetail();
}}
```

**Bug 6 code proof (`PhaseDetailView.tsx`):**

```typescript
{phase.status === 'pending' && (<button onClick={onBuildPhase}>Build This Phase</button>)}
{phase.status === 'in-progress' && (<button onClick={onSkipPhase}>Skip Phase</button>)}
```

---

## App Concept Panel

### What Works

- **BasicInfo**: All four fields display correctly with populated data
- **Features**: All 10 features with names, descriptions, priority badges. Count badge correct. Collapsible.
- **UI Preferences**: Style, Color Scheme, Layout display correctly. Collapsible.
- **Technical**: 5 toggles with 3 marked "Active". Collapsible.
- **Roles**: "User" role with 10 capabilities. Works correctly.
- **Implementation Plan**: 0/10 progress. All 10 phases as clickable cards with phase number, name, domain tag. Phase detail modal with four tabs (Planned vs Built, Tasks, Validation, Generated Code).
- **Code Intelligence**: Shows "0 files" with counters at 0.
- **Edit Mode Toggle**: Eye/pencil icon toggles. Inline input with save/cancel. Works correctly.
- **PLAN vs ACT visual differences**: PLAN has direct editing, "Start Building" button, "Regenerate Phases". ACT has eye/pencil toggle, Pause/Skip buttons, "Building" badge, progress bar.
- **Panel Collapse**: Chevron collapses to thin strip with rotated text.

### Issues

- **Bug 4**: "Start Building" only toggles mode (see chain failure above)
- **Bug 5**: "Build This Phase" is a no-op (see chain failure above)
- **Bug 6**: Phase 1 stuck in `in-progress` (see chain failure above)
- **Bug 7**: "Regenerate Phases" takes ~45s with no spinner. `isLoading` flag on ChatMessage type is unused in ChatPanel rendering.

---

## Chat Box

### What Works

- **UI**: Chat heading with Plan/Act toggle, text input, image upload, send button, timestamps, message bubbles (dark green user, light AI), suggested action buttons, markdown rendering
- **PLAN Mode**: Context-aware responses listing all 10 features accurately. Suggested actions. Markdown formatting.
- **ACT Mode**: Messages send/receive. Streaming works. History persists across mode switches.
- **Mode Toggle**: Visual changes between modes. Plan highlighted with lightning bolt icon.

### Issues

- **Bug 1 (CRITICAL)**: ACT mode chat sends only `hasAppConcept: true` and `hasPhasePlan: true` — boolean flags, not data. When asking "build phase 2", AI responded "We haven't formally defined a phase breakdown yet" despite Phase 2 being visible in the App Concept panel.
- **Bug 3 (LOW)**: PLAN sends `wizardState` (full data). ACT sends booleans. Asymmetric context.

---

## Preview Panel

### Architecture

Two completely separate rendering engines controlled by Frontend/Full-Stack toggle:

1. **Frontend mode (BrowserPreview)**: `esbuild-wasm` (CDN) bundles React/TypeScript in-browser. Virtual file system, IIFE bundle, iframe injection via `doc.write()`. Tailwind via CDN. npm shims for `react-router-dom` (Links → `<a>` tags), `lucide-react`, `framer-motion`, `axios`, `recharts`. API route mocking with `window.fetch` interception. In-browser SQLite via `sql.js`.

2. **Full-Stack mode (RailwayPreview)**: Deploys generated code to Railway as real project with backend, database, API routes. Shows Create → Build → Deploy progress pipeline.

**Device frames** (`DeviceFrame.tsx`): Desktop (1280×800, no frame), Tablet (820×1180, iPad-style), Phone (390×844, iPhone-style with notch).

### What Works

- **Preview/Code toggle**: Switches between live preview and code view
- **Desktop/Tablet/Phone**: All three device frames render correctly
- **Frontend mode**: esbuild-wasm bundling works. Full app renders with nav, hero, categories, cards. "Browser Preview" / "Ready" badge.
- **Full-Stack mode**: Pipeline works (Create → Build → Deploy with animated dots, elapsed time, logs). Deployment completes to Railway URL.
- **Export modal**: 4 options (ZIP, Vercel, Netlify, Clipboard)
- **Branch selector**: Shows "main (default)" with "+ Create New Branch..." option
- **Fullscreen mode**: Expands to full viewport with toolbar
- **Undo/Redo**: Correctly disabled when no changes applied

### Issues

- **Bug 12 (MEDIUM)**: Navigation links in preview break out of generated app. Clicking "Explore" navigates iframe to the AI App Builder's own landing page. Root cause: react-router-dom shim converts `<Link to="/explore">` to `<a href="/explore">`, which resolves to host domain.
- **Bug 13 (MEDIUM)**: Full-Stack deploy succeeds (all green, "Status: ready") but app shows Railway error page. Generated frontend-only code lacks server entry point for standalone backend deployment.
- **Bug 14 (LOW)**: Export modal shows "0 files · 0 dependencies" despite preview rendering code.
- **Bug 15 (LOW)**: Capture for AI button — no visible feedback (no toast, no image attachment).
- **Bug 16 (LOW)**: Console button in fullscreen — no visible console panel.
- **Bug 17 (LOW)**: Code view shows raw JSON dump of app state instead of file tree with individual file viewing.
- **Bug 18 (LOW)**: Preview system (`FullAppPreview`, `BrowserPreview`, `RailwayPreview`, device frames, esbuild-wasm, npm shimming) completely undocumented in README.

---

## README Code Generation Claims — Verification

| Item                    | Status                       | Notes                                                             |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------- |
| Titan Pipeline          | Working                      | Scoped to Design page, not Builder page                           |
| Dynamic Phases          | Working (with caveats)       | Generation works; execution triggers broken (Bugs 4-6)            |
| SSE Streaming           | Working                      | `full-app-stream` confirmed live                                  |
| AST-Based Modifications | Mostly disconnected (Bug 10) | Only reachable via diff approval UI                               |
| Phase Integrity P1-P9   | Only P3 wired (Bug 11)       | 8 of 9 categories never called                                    |
| Smart Context Selection | Partially wired              | Async path works for phase execution; modification context unused |

---

## Fix Priorities

| Priority | Bugs    | Action                                                                                                                                  |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | 4, 5, 6 | Fix build pipeline: wire `onBuildPhase` to `executePhase()`, fix Phase 1 layout injection fallback, handle missing `layoutBuilderFiles` |
| P2       | 1, 3    | Bridge chat↔context gap: pass `appConcept` + `dynamicPhasePlan` in ACT mode request body to `/api/ai-builder`                           |
| P3       | 8, 10   | Wire surgical modify: change `handleModifyTrigger()` to call `/api/ai-builder/modify` instead of `full-app-stream`                      |
| P4       | 11      | Wire phase integrity: add P1/P2/P5-P9 calls in `useDynamicBuildPhases.completePhase()`                                                  |
| P5       | 7       | Add spinner/progress for Regenerate Phases                                                                                              |
| P6       | 12      | Fix preview nav: implement MemoryRouter or HashRouter in react-router-dom shim                                                          |
| P7       | 13      | Handle frontend-only code in Full-Stack deploy mode                                                                                     |
| P8       | 14-17   | UX polish: export file count, capture feedback, console panel, code file tree                                                           |
| P9       | 9, 18   | Documentation: add Builder page panel docs to README/Master Context                                                                     |

---

## Key Files for Fixes

| File                        | Bugs | What to Change                                                              |
| --------------------------- | ---- | --------------------------------------------------------------------------- |
| `useSendMessage.ts`         | 1, 3 | Pass full `appConcept` + `dynamicPhasePlan` in ACT mode body                |
| `useSendMessageHandlers.ts` | 8    | Route `handleModifyTrigger()` to `/api/ai-builder/modify`                   |
| `AppConceptPanel.tsx`       | 5    | Wire `onBuildPhase` to call `executePhase(phaseNumber)`                     |
| `usePhaseExecution.ts`      | 4, 6 | Fix `tryStartPhase1()` for missing layout files, fix auto-execute exclusion |
| `useDynamicBuildPhases.ts`  | 11   | Add integrity check calls (P1-P2, P5-P9) in `completePhase()`               |
| `PhaseDetailView.tsx`       | 6    | Handle stuck layout injection phase UI                                      |
| `BrowserPreviewService`     | 12   | Fix react-router-dom shim to use MemoryRouter                               |
| `ChatPanel.tsx`             | 7    | Render spinner when message has `isLoading: true`                           |

---

## Architecture Context (for Redesign Reference)

**Key files:**

- `ChatPanel.tsx` — Chat UI, renders PLAN/ACT toggle, message list, input area
- `useSendMessage.ts` — ACT mode chat handler, sends to `/api/ai-builder` with only boolean flags
- `/api/ai-builder/route.ts` — Builds system prompt from `BUILDER_EXPERT_PROMPT` + `generateBuilderContext(currentAppState)` (only knows about code files)
- `usePhaseExecution.ts` — Has `executePhase(phaseNumber)` with full context, calls `/api/ai-builder/full-app-stream`
- `MainBuilderView.tsx` — Three-panel layout: Chat (left), App Concept (middle), Preview (right)
- `AppConceptPanel.tsx` — Middle panel, receives `appConcept`, `phasePlan`, `buildState` as props
- `FullAppPreview.tsx` → `PreviewContainer.tsx` → `BrowserPreview.tsx` / `RailwayPreview.tsx`
- `DeviceFrame.tsx` — Desktop/Tablet/Phone device frames

**Two separate AI paths (the core problem):**

1. **Chat in ACT mode** → `useSendMessage` → `/api/ai-builder` → code files only
2. **Phase execution** → `usePhaseExecution` → `/api/ai-builder/full-app-stream` → FULL context

**Phase 1 is special:** Layout Injection phase — pulls pre-built layout from Design step rather than generating with AI. Only has "Skip Phase" when stuck in `in-progress`.

**State management:** Zustand store v6 persists to localStorage. `currentMode` (PLAN/ACT) in `PERSISTED_FIELDS`. `dynamicPhasePlan` stores phases with number, name, domain, features, dependencies, token estimates, status.
