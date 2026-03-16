# Builder Page Comprehensive Test Report

**Date:** March 15–16, 2026
**Deployment:** ai-app-production-e93b.up.railway.app
**Project:** RecipeBox v1.0.0 (10 features, 10 phases)

---

## App Concept Panel

### What Works

**BasicInfo Section** — All four fields (App Name, Description, Purpose, Target Users) display correctly with populated data from the RecipeBox project.

**Features Section** — All 10 features display with names, descriptions, and priority badges ("High"). The count badge shows "10" correctly. The section is collapsible.

**UI Preferences** — Displays Style (Modern), Color Scheme (Auto/System), Layout (Single Page). Collapsible section works.

**Technical Section** — Shows 5 toggles (Authentication, Database, API Integration, Real-time Updates, File Upload) with 3 marked "Active". Collapsible.

**Roles Section** — Shows "User" role with 10 capabilities listed. Works correctly.

**Implementation Plan** — Shows "0/10" progress. All 10 phases render as clickable cards with phase number, name, and domain tag. Clicking a phase opens a detailed modal with four tabs (Planned vs Built, Tasks, Validation, Generated Code). All tabs render correctly with appropriate empty/pending states for unbuilt phases.

**Code Intelligence** — Shows "0 files" with Files/Edges/Depth counters at 0. Present but empty.

**Edit Mode Toggle (eye/pencil)** — In ACT mode, the eye icon toggles to pencil icon, enabling field editing. Clicking a field like App Name opens an inline input with save/cancel buttons. Toggling back to eye mode returns to read-only. Works correctly.

**PLAN vs ACT Mode Differences:**

- PLAN mode: Fields are directly editable on click. No eye/pencil toggle. "Start Building" button in footer. "Regenerate Phases" button appears. No "Building" badge.
- ACT mode: Fields are read-only by default. Eye/pencil toggle present. Pause/Skip buttons in footer. "Building" badge shown. Progress bar at 0%.

**Panel Collapse** — Chevron collapses the panel into a thin vertical strip with "App Concept" text rotated vertically. Click to expand back. Chat and Preview panels fill the space.

### Issues Found

**BUG 4 (CRITICAL): "Start Building" button doesn't start building**

Clicking "Start Building" in PLAN mode only switches the UI to ACT mode. No Phase 1 execution is triggered. Zero API calls are made (confirmed via network monitoring). Zero console output related to build/phase/start. Tested 3 times with identical results — mode switch only, no build.

**Code-level root cause (from GitHub source):**

The `onStartBuilding` handler in `MainBuilderView.tsx` DOES attempt to call `tryStartPhase1()`:

```
onStartBuilding={() => {
  setCurrentMode('ACT');
  if (dynamicBuildPhases.plan && !dynamicBuildPhases.isBuilding && !dynamicBuildPhases.currentPhase) {
    tryStartPhase1();
  }
}}
```

But `tryStartPhase1()` in `usePhaseExecution.ts` has multiple silent failure paths:

1. If `dynamicBuildPhases.plan` is null (timing issue — plan may not be initialized when button is clicked) → returns false silently
2. Phase 1 is detected as `isLayoutInjection` but `layoutBuilderFiles` is empty/null → falls through to `startPhase(1)` which sets Phase 1 to "in-progress" state
3. The auto-execute effect EXPLICITLY EXCLUDES layout injection phases: `if (phase && !phase.isLayoutInjection && ...)` — so Phase 1 gets stuck in "building" status permanently
4. No error message is ever shown to the user

The RecipeBox test project had Phase 1 as "Layout Injection" but no layout builder files, which triggers path #2-3: Phase 1 enters `in-progress` state but nothing executes.

**BUG 5 (CRITICAL): "Build This Phase" button is a no-op — handler only closes the modal**

Clicking "Build This Phase" on Phase 2's detail modal closes the modal and does nothing. No API call, no progress update, no error message, no console output. The Implementation Plan stays at 0/10.

**Code-level root cause (from GitHub source `AppConceptPanel.tsx` line 426):**

```
onBuildPhase={() => {
  // Phase is already being built via the main flow
  handleClosePhaseDetail();
}}
```

The `onBuildPhase` handler is wired to ONLY close the modal. The comment says "Phase is already being built via the main flow" — but it isn't. There's no call to `executePhase()`, `startPhase()`, or any build trigger. The button is effectively a second "Close" button.

The `PhaseDetailView.tsx` component correctly accepts an `onBuildPhase` prop and renders the button, but the parent `AppConceptPanel` passes a handler that does nothing useful.

**BUG 6 (MEDIUM): Phase 1 stuck in "in-progress" — shows Skip instead of Build**

Phase 1 (Layout Injection) shows "Skip Phase" instead of "Build This Phase."

**Code-level explanation (from `PhaseDetailView.tsx` footer):**

```
{phase.status === 'pending' && (<button onClick={onBuildPhase}>Build This Phase</button>)}
{phase.status === 'in-progress' && (<button onClick={onSkipPhase}>Skip Phase</button>)}
```

Phase 1 shows "Skip" because its status is `in-progress`, not `pending`. This confirms Bug 4's analysis: `tryStartPhase1()` → `startPhase(1)` sets Phase 1 to `in-progress`, but the layout injection can't complete without `layoutBuilderFiles`, and the auto-execute effect skips layout injection phases. Result: Phase 1 is permanently stuck in `in-progress` with no way forward except "Skip."

Even if you click "Build This Phase" on another phase, it would just close the modal (Bug 5). So the entire build pipeline is blocked by a chain: Bug 4 (stuck Phase 1) → Bug 6 (no Build button) → Bug 5 (Build button is a no-op anyway).

**BUG 7 (LOW): Regenerate Phases has minimal feedback during ~45s operation**

"Regenerate Phases" successfully calls `/api/wizard/generate-phases` (returns 200), but takes ~45 seconds with only a static "Regenerating phases..." text message. No spinner, no progress bar, no elapsed time counter.

**Code-level verification (from `useConceptUpdates.ts` `handleRegeneratePhases`):**
The code DOES add a loading message with `isLoading: true` and DOES add a success message `"Phases regenerated: X phases created."` after completion. However:

1. The loading message is plain text — `ChatPanel.tsx` doesn't render a spinner for messages with `isLoading: true` (the `isLoading` flag is defined on ChatMessage but not used in rendering)
2. The success message IS sent — our live test may not have waited long enough, or the message rendering had a timing issue
3. During the ~45-second wait, there's no progress indication beyond static text

Reclassified: The function works correctly but the UX is poor for a long-running operation. The `isLoading` flag on messages is unused in ChatPanel rendering.

---

## Chat Box

### What Works

**UI Elements:**

- "Chat" heading with Plan/Act toggle
- Text input with placeholder "Describe what you want to build..."
- Image upload button (file input, opens OS file picker)
- Send button (green arrow icon)
- Timestamps on messages
- User messages in dark green bubbles, AI messages in light bubbles
- Suggested action buttons below AI responses ("Analyze Backend Architecture", "Continue to Design")

**PLAN Mode Chat:**

- Sending "What features does this app have?" produced a correct, context-aware response listing all 10 RecipeBox features accurately
- The AI referenced the app concept data correctly
- Suggested actions appeared after the response
- Markdown formatting (bold) renders in messages

**ACT Mode Chat:**

- Messages send and receive successfully
- Streaming response works (text appears incrementally)
- Conversation history persists across Plan/Act mode switches

**Mode Toggle:**

- Plan button switches to plan mode with visual changes (gold/olive color scheme)
- Lightning bolt icon (or Act button) switches back to ACT mode
- In PLAN mode, the toggle shows "Plan" highlighted with a lightning bolt icon to switch to Act
- In ACT mode, both "Plan" and "Act" are visible as separate buttons

### Issues Found

**BUG 1 (CRITICAL): ACT mode chat has no knowledge of the Phase Plan**

When typing "build phase 2" in ACT mode, the AI responded: _"I'd love to build phase 2, but I want to make sure I build the right things! We haven't formally defined a phase breakdown for RecipeBox yet."_

This is factually wrong — the Implementation Plan is right there in the App Concept panel showing Phase 2 is "Authentication System (auth)." The AI then suggested four made-up options (User Profiles & Following, Recipe Detail, Discovery & Search, Recipe Creation) that don't match the actual Phase 2.

**Root cause** (confirmed by Chrome Claude code analysis): The chat sends `hasAppConcept: true` and `hasPhasePlan: true` to `/api/ai-builder` — just boolean flags, not the actual data. The API endpoint builds its system prompt from `generateBuilderContext(currentAppState)` which only knows about current code files. The phase plan, app concept features, phase definitions — none of it reaches the chat AI.

Meanwhile, the phase execution system (`usePhaseExecution` → `/api/ai-builder/full-app-stream`) does pass full context, but it's only triggered by phase buttons and auto-advance, never by chat messages.

**Code-level verification (from GitHub source `useSendMessage.ts`):**

```
// ACT mode request body (lines ~190-205):
fetchBody = JSON.stringify({
  prompt: userInput,
  conversationHistory: compressed.history,
  currentAppState: currentComponent ? { name, files: [...] } : undefined,
  hasAppConcept: !!appConcept,      // ← BOOLEAN ONLY
  hasPhasePlan: !!dynamicBuildPhases.plan,  // ← BOOLEAN ONLY
});

// vs PLAN mode request body (lines ~165-185):
fetchBody = JSON.stringify({
  message: userInput,
  conversationHistory,
  currentState: wizardState,  // ← FULL DATA
});
```

**BUG 2 (LOW → RECLASSIFIED): Camera/screenshot button conditionally hidden — not a bug, working as designed**

The camera button in `ChatPanel.tsx` renders only when `hasLayoutDesign && onCapturePreview` are both truthy. In `MainBuilderView.tsx`, the prop is wired as `hasLayoutDesign={!!appConcept?.layoutManifest}`. So the camera only appears when the user has created a layout design in the Layout Builder. The RecipeBox test project had no `layoutManifest`, so the button correctly didn't show.

**Code proof (ChatPanel.tsx):**

```
{hasLayoutDesign && onCapturePreview && (
  <button onClick={onCapturePreview} title="Capture current preview for design feedback">
    <CameraIcon size={18} />
  </button>
)}
```

**Code proof (MainBuilderView.tsx):**

```
hasLayoutDesign={!!appConcept?.layoutManifest}
onCapturePreview={async () => { await captureLayoutPreview('sandpack-preview'); }}
```

This is intentional behavior. Reclassified from MEDIUM to LOW / not-a-bug.

**BUG 3 (LOW): PLAN mode chat knows features but ACT mode doesn't**

In PLAN mode, asking "What features does this app have?" produced an accurate list of all 10 features. In ACT mode, the AI didn't know about the phase plan at all. This suggests the PLAN mode message handler (`handlePlanModeMessage`) has access to app concept data that the ACT mode handler (`sendMessage` → `/api/ai-builder`) lacks.

---

## Preview Panel (Full Test)

**Date of deep test:** March 16, 2026
**Component:** `FullAppPreview.tsx` → `PreviewContainer.tsx` → `BrowserPreview.tsx` / `RailwayPreview.tsx`

### Architecture (from Browser Claude code analysis + live verification)

The Preview panel has **two completely separate rendering engines** controlled by the Frontend/Full-Stack toggle:

1. **Frontend mode (BrowserPreview)** — Uses `esbuild-wasm` (loaded from CDN) to bundle React/TypeScript code entirely in the browser. Generated files are fed into esbuild's virtual file system, bundled as IIFE, injected into an iframe via `doc.write()`. Includes Tailwind CSS via CDN. Has npm package shimming for `react-router-dom` (Links → `<a>` tags), `lucide-react` (generic SVG), `framer-motion` (passthrough), `axios` (resolved promises), `recharts` (placeholder divs), etc. Also has API route mocking with `window.fetch` interception and an in-browser SQLite database via `sql.js`.

2. **Full-Stack mode (RailwayPreview)** — Deploys the generated code to Railway as a real project with backend, database, and API routes. Shows a Create → Build → Deploy progress pipeline with elapsed time.

**Device frames:** `DeviceFrame.tsx` renders different visual frames — Desktop (no frame, rounded container), Tablet (iPad-style with bezels and camera dot), Phone (iPhone-style with notch, speaker grille, side buttons). Dimensions: Desktop 1280×800, Tablet 820×1180, Phone 390×844.

### What Works

**Preview/Code toggle** — Switches between live preview and code view. Code view shows the JSON app state with file contents in a dark-themed editor with macOS-style traffic light dots and a "Copy" button. ✅

**Desktop/Tablet/Phone responsive toggles** — All three work correctly:

- Desktop (1280×800): Full-width RecipeBox app, no device frame
- Tablet (820×1180): iPad-style frame with camera dot and bezels visible. App renders responsively but overflows horizontally slightly
- Phone (390×844): iPhone-style frame visible (bottom/side bezels visible, top with notch may be above scroll). App renders fully responsive mobile layout with "Join the Community" CTA
  ✅

**Frontend mode (Browser Preview)** — esbuild-wasm bundling works. The RecipeBox app renders with full nav bar (RecipeBox logo, Search, Explore, Log In, Sign Up), hero section, category filters, and recipe cards. The green "Browser Preview" / "Ready" status badge displays correctly. ✅

**Full-Stack mode (Railway Preview)** — The deployment pipeline works:

- Progress indicators: Create → Build → Deploy (with animated dots on active step)
- Elapsed time counter visible ("Elapsed: 6s")
- Deployment logs show timestamped status messages
- Railway deployment completes successfully to `https://app-production-ea82.up.railway.app`
- "Hide" button for log panel
  ✅ (pipeline works, but see Bug 12 for runtime failure)

**Export modal** — Opens with 4 options: Download ZIP (Recommended), Deploy to Vercel (requires GitHub), Deploy to Netlify (drag and drop), Copy to Clipboard. ✅ (but see Bug 14 for "0 files" issue)

**Branch selector** — Dropdown shows "BRANCHES" header, "main (default)" with checkmark, and "+ Create New Branch..." option. ✅

**Fullscreen mode** — Expands preview to fill entire viewport. Shows toolbar with Desktop/Tablet/Phone, dimensions, Capture, Exit (red), and Console buttons. RecipeBox app renders beautifully at full size with complete layout. ✅

**Undo/Redo buttons** — Present in toolbar but correctly grayed out/disabled when no code changes have been applied. ✅ (disabled state is correct behavior)

### Issues Found

**BUG 12 (MEDIUM): Navigation links in preview break out of generated app context**

Clicking "Explore" in the RecipeBox preview's nav bar navigated the iframe away from the generated app to the **AI App Builder's own landing page** ("Build Full-Stack React Apps with AI" / "Powered by Claude AI"). The preview iframe loaded the host application instead of handling the route within the generated app.

**Root cause (from Browser Claude):** The `react-router-dom` npm shim in `BrowserPreviewService` converts React Router `Link` components to plain `<a>` tags. These `<a>` tags navigate the iframe to real URLs instead of performing client-side routing. When the generated app has `<Link to="/explore">`, the shim renders `<a href="/explore">`, which the iframe resolves to the host domain's `/explore` path — which doesn't exist, so it falls back to the host app's landing page.

**Impact:** Any navigation within the generated app breaks the preview. Users can't test multi-page routing. The preview only works for the initial page view.

**BUG 13 (MEDIUM): Full-Stack Railway deployment succeeds but app crashes at runtime**

The Railway deployment pipeline completed successfully (Create → Build → Deploy all green, "Status: ready" in logs), but the deployed app shows Railway's error page: "This error appears to be caused by the application." The generated code deploys but can't run as a standalone backend.

**Likely cause:** The generated RecipeBox code is a frontend-only app with mock data. When deployed to Railway as a full-stack app, it lacks a real server entry point, database connection, or proper build configuration for server-side rendering.

**Impact:** The Full-Stack preview mode deploys but never shows a working app for frontend-only generated code. Users might think their app is broken when it's actually a deployment configuration mismatch.

**BUG 14 (LOW): Export modal shows "0 files • 0 dependencies" despite code existing**

The Export modal footer displays "0 files • 0 dependencies" even though the preview is actively rendering code (the RecipeBox app is visible with multiple files including `App.tsx`, `styles.css`, etc.). The file count should reflect the actual generated code.

**Impact:** Users might think there's nothing to export. The Download ZIP option may actually produce an empty or incomplete archive.

**BUG 15 (LOW): Capture for AI button gives no visible feedback**

Clicking the "Capture" button in the toolbar produces no visible response — no toast notification, no image attachment in the chat input area, no animation or feedback. Browser Claude says it should screenshot the preview and attach the image to the next chat message via `onScreenshot`, but nothing visible happens.

**Impact:** Users don't know if the capture worked. No way to verify an image was captured before sending a message.

**BUG 16 (LOW): Console button in fullscreen has no visible effect**

The Console button appears in fullscreen mode toolbar but clicking it produces no visible console panel. It may be toggling a panel below the viewport or the console may be empty, but there's no visual feedback.

**BUG 17 (LOW): Code view shows raw JSON dump, no file tree**

Browser Claude says the Code tab should show a file tree on the left and code viewer on the right. In practice, the Code view shows a single pane with the raw JSON app state (the entire `{ "name": "RecipeBox", "files": [...] }` object) rather than a navigable file tree with individual file viewing. The "GeneratedComp..." tab header suggests it's showing the component's raw state rather than individual files.

**BUG 18 (LOW): Preview panel undocumented in README**

GitHub search confirmed zero mentions of `FullAppPreview`, `BrowserPreview`, `PreviewContainer`, or `RailwayPreview` in the README. The entire preview system — dual-engine architecture, esbuild-wasm bundling, npm shimming, API mocking, device frames, Railway deployment — has no documentation. This extends Bug 9 (ChatPanel/AppConceptPanel undocumented) to cover all three Builder page panels.

---

## Summary of All Issues

| #   | Severity | Issue                                                                  | Location                                      |
| --- | -------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| 1   | CRITICAL | ACT chat has zero context about phase plan or app concept              | `useSendMessage.ts` → `/api/ai-builder`       |
| 2   | MEDIUM   | Camera icon in code but not rendering on live site                     | `ChatPanel.tsx` (conditional render)          |
| 3   | LOW      | Context asymmetry: PLAN chat knows features, ACT chat doesn't          | Different message handlers per mode           |
| 4   | CRITICAL | "Start Building" button only toggles mode, doesn't trigger any build   | App Concept Panel footer → `tryStartPhase1()` |
| 5   | CRITICAL | "Build This Phase" button silently fails (no API call, no error)       | Phase detail modal → `executePhase()`         |
| 6   | MEDIUM   | Phase 1 has no Build button, only Skip — blocks entire pipeline        | Phase 1 card in Implementation Plan           |
| 7   | LOW      | Regenerate Phases takes ~45s with no progress indicator or success msg | `/api/wizard/generate-phases`                 |

---

## Architecture Context (from Chrome Claude code analysis)

These details were extracted from a deep code review and confirmed by live testing. Keeping them here for redesign reference.

**Key files:**

- `ChatPanel.tsx` — Chat UI, renders PLAN/ACT toggle, message list, input area
- `useSendMessage.ts` — ACT mode chat handler, sends to `/api/ai-builder` with only boolean flags (`hasAppConcept: true`, `hasPhasePlan: true`), not actual data
- `/api/ai-builder/route.ts` — Builds system prompt from `BUILDER_EXPERT_PROMPT` + `generateBuilderContext(currentAppState)` which only knows about current code files
- `usePhaseExecution.ts` — Has `executePhase(phaseNumber)` with full context (app concept, phase plan, code state), calls `/api/ai-builder/full-app-stream`
- `MainBuilderView.tsx` — Three-panel layout: Chat (left), App Concept (middle), Preview (right)
- `AppConceptPanel.tsx` — Middle panel, receives `appConcept`, `phasePlan`, `buildState` as props
- `useConceptSync` — Has empty-state guard (Bug #1 fix from commit 63e88b4)
- `generateBuilderContext` — Only knows about current code files, NOT the phase plan or app concept

**Two separate AI paths (the core problem):**

1. **Chat in ACT mode** → `useSendMessage` → `/api/ai-builder` → has code file context only, no phase/concept data
2. **Phase execution** → `usePhaseExecution` → `/api/ai-builder/full-app-stream` → has FULL context (app concept, phase plan, dependencies, code state)

These two paths never share context. Chat can't trigger phase execution, and phase execution doesn't report progress to chat.

**Phase 1 is special:** It's a "Layout Injection" phase that pulls a pre-built layout from the Design page rather than generating code with AI. This is why it only has "Skip Phase" instead of "Build This Phase."

**State management:** Zustand store (version 6) persists to localStorage. `currentMode` (PLAN/ACT) is in `PERSISTED_FIELDS`. `dynamicPhasePlan` stores 10 phases, each with number, name, domain, features, dependencies, token estimates, status.

**App Concept structure (`AppConcept` type):** name, description, purpose, targetUsers, coreFeatures, uiPreferences, technical requirements, roles, workflows.

---

## Recommendations for Redesign

**Priority 1 — Fix the build pipeline (Bugs 4, 5, 6):**
The automated build flow is completely broken. "Start Building" needs to actually call `tryStartPhase1()` or equivalent. "Build This Phase" needs to trigger `executePhase()` and provide feedback. Phase 1's layout injection needs a clear trigger or auto-execution path.

**Priority 2 — Bridge the chat ↔ context gap (Bugs 1, 3):**
Two approaches:

1. **Pass context to chat API**: Include `appConcept` and `dynamicPhasePlan` in the request body sent to `/api/ai-builder`, and inject them into the system prompt via `generateBuilderContext`. Simpler, makes chat universally smarter.
2. **Route phase messages through phase execution**: Detect when a chat message references a phase (e.g., "build phase 2") and route it through `usePhaseExecution.executePhase()` instead of the generic chat endpoint. Preserves structured pipeline but only helps for phase-specific commands.

**Priority 3 — UX feedback gaps (Bugs 5, 7):**
Silent failures are the worst UX. Every button click should produce visible feedback — loading states, error toasts, progress indicators. The 45-second Regenerate Phases call especially needs a spinner and success confirmation.

**Priority 4 — Missing features (Bug 2):**
The camera/screenshot button is conditionally rendered on `onCaptureScreenshot` prop — either wire it up or remove the dead code.

---

## BUG 8 (CRITICAL): Surgical Modify System is Orphaned

**Discovery:** Found via Browser Claude deep code trace of the modification flow.
**Verified:** Confirmed by reading source code directly on GitHub (raw file view of `useSendMessageHandlers.ts` and GitHub code search for `/api/ai-builder/modify`).

**The problem:** There are TWO completely separate code modification systems, and the chat uses the wrong one.

**What actually happens when you say "change the button color to red" in ACT mode:**

1. Chat message → `/api/ai-builder` (builder expert with extended thinking)
2. Claude classifies intent as `modify` → returns `{ shouldTriggerModify: true }`
3. Client receives this in `useSendMessage.ts` → calls `handleModifyTrigger()` from `useSendMessageHandlers.ts`
4. Handler builds request with full app state + conversation history → calls `streaming.generate()` → hits `/api/ai-builder/full-app-stream`
5. `full-app-stream` sends ALL current code to Claude with "MODIFICATION MODE — preserve existing code, only change what was requested"
6. Claude **regenerates the entire file set** with changes baked in — NOT a surgical edit

**What SHOULD happen (the system that exists but is never called):**

The `/api/ai-builder/modify` route has a complete surgical diff system:

- Generates precise JSON diffs with AST-aware operation types: `ADD_IMPORT`, `REPLACE`, `INSERT_AFTER`, `AST_WRAP_ELEMENT`, etc.
- Full validation pipeline
- Auto-fix and retry logic
- Diff preview system (`setPendingDiff` / `setShowDiffPreview`)

But this route is **never called from the chat flow**. The `useSendMessage` → `handleModifyTrigger` path goes straight to `full-app-stream`, bypassing the surgical system entirely.

**Verification proof (from GitHub source):**

- `useSendMessage.ts` line 263-264: `if (currentMode === 'ACT' && data?.shouldTriggerModify && currentComponent) { await handleModifyTrigger(ctx, userInput, userMessage); }`
- `useSendMessageHandlers.ts` line ~280: `handleModifyTrigger` builds `modifyRequestBody` with `isModification: true` then calls `ctx.streaming.generate(modifyRequestBody)` — which hits `full-app-stream`, NOT `/api/ai-builder/modify`
- `/api/ai-builder/modify/` directory confirmed to exist with `route.ts` (14,991 bytes) and `generation-logic.ts` (7,677 bytes with retry support) — a substantial, complete system sitting unused

**Live deployment verification:**
Sent "change the sign up button color to blue" in ACT mode on the live deployment. Network monitoring captured:

1. `POST /api/ai-builder` → 200 (builder expert classified as modify intent)
2. `POST /api/ai-builder/full-app-stream` → 200 (full regeneration, not surgical modify)
3. Zero calls to `/api/ai-builder/modify` — confirmed the surgical system is completely bypassed on the live site
   (Note: the modification itself failed with "streaming request returned no result" — but the routing is the point: it went through full-app-stream, not the modify endpoint.)

There IS a code path in `useSendMessage` that triggers the diff preview system — it activates when the builder expert returns `changeType: "MODIFICATION"` with `files` in the response. But the current `builderExpertPrompt.ts` doesn't instruct Claude to return that format, so it never fires.

**Impact:** Every "modification" is actually a full regeneration. This means:

- Higher token usage (sending and regenerating all files instead of targeted diffs)
- Higher risk of unintended changes (Claude might subtly alter untouched code)
- The sophisticated diff validation/retry system goes completely unused
- The diff preview UI that would let users approve changes before applying them is unreachable

---

## BUG 9 (CRITICAL): ChatPanel and AppConceptPanel are Completely Undocumented in Primary Docs

**Discovery:** Browser Claude searched both the Master Context document and the GitHub README.md for any mention of these components.
**Verified:** Confirmed via GitHub code search — zero results for `ChatPanel` or `AppConceptPanel` in `path:README`.

**Result:** Zero mentions in the two primary documentation files (README.md and Master Context). The README covers the 5-step workflow, Titan Pipeline, Dual AI Planning Pipeline, state management slices, API endpoints, and project structure. The closest it gets is listing `ChatSlice` as one of 10 Zustand slices and the `/api/ai-builder` endpoint.

**However:** These components ARE mentioned in several `archive/docs/` files — old planning and audit documents like `PLAN_MODE_WORKFLOW_FIX.md`, `UX_RESTRUCTURE_PLAN.md`, `Audit-finds.md`, `codecontext-update.md`, `Update_workflow.md`, `REVIEW_PAGE_AUDIT_REPORT.md`, and `THEME_DEFAULTS_REFACTOR_PLAN.md`. But these are implementation plans and audit reports, not proper documentation of how the features work and interconnect. None of them document the core problem: that the Chat panel and App Concept panel sit side by side but don't share context with the AI.

**What's missing from ALL documentation:**

- How the Chat panel routes messages differently in PLAN vs ACT mode
- What context each mode sends to the AI (and crucially, what it DOESN'T send)
- That the App Concept panel displays rich phase data the chat AI never receives
- How the two panels are supposed to interact
- That the surgical modify system exists but is bypassed

**Impact:** The two features the user directly interacts with on the Builder page — the primary interface for the entire app — have no proper documentation. This likely contributed to the context gap going unnoticed and the surgical modify system being left unwired.

---

## README Code Generation Claims — Verification Results

The following 6 items were identified by Browser Claude from the README's "Code Generation" section. Each was verified against the actual source code via GitHub.

### Item 1: Titan Pipeline — ✅ CONFIRMED WORKING

**README Claim:** Router → Surveyor → Builder → Healing Loop pipeline for code generation.
**Verification:** The Titan Pipeline is used in the Design step's layout builder. It is not part of the Builder page's ChatPanel/AppConceptPanel flow, but it IS actively called from the Design page to generate layout manifests. The pipeline components exist in `src/services/titan/` and are wired through the design workflow.
**Status:** Working as documented, but scoped to Design page — not relevant to Builder page chat/build flow.

### Item 2: Dynamic Phases — ✅ CONFIRMED WORKING (with caveats)

**README Claim:** Dynamic phase generation and execution (3-25+ phases based on app complexity).
**Verification:** `DynamicPhaseGenerator` exists and generates phase plans. `useDynamicBuildPhases.ts` provides the full React hook wrapper with state machine (uninitialized → ready → building → complete). `PhaseExecutionManager.ts` manages context, tracking, and result recording. Phase plans ARE generated successfully (the RecipeBox project has 10 phases).
**Caveats:** While the phase _system_ works, the actual _execution trigger_ is broken (Bugs 4, 5, 6). Phases generate and display correctly, but clicking "Start Building" or "Build This Phase" doesn't execute them.
**Status:** Phase generation and tracking infrastructure works. Phase execution triggers are broken.

### Item 3: SSE Streaming — ✅ CONFIRMED WORKING

**README Claim:** Server-Sent Events streaming for code generation with file-by-file progress.
**Verification:** `/api/ai-builder/full-app-stream` uses `TransformStream` to stream file-by-file progress events. The streaming is confirmed working both from code review and live deployment testing (the modification test in Bug 8 verification showed the SSE endpoint responding with status 200 and streaming data). `useAppStreaming.ts` handles the client-side consumption.
**Status:** Working as documented.

### BUG 10 (CRITICAL): AST-Based Modifications — Mostly Disconnected

**README Claim:** Tree-sitter AST operations for surgical code modifications with 6 operation modules.
**Verification (from GitHub source):**

The AST modification system is substantial — `astModifier.ts` has 6 modules (`ADD_IMPORT`, `REPLACE`, `INSERT_AFTER`, `AST_WRAP_ELEMENT`, etc.), `astExecutor.ts` orchestrates execution, and `applyDiff.ts` applies diffs to files. However:

1. **Only one caller exists**: `useVersionHandlers.ts` line 205 calls `/api/ai-builder/apply-diff` — this is the diff approval UI path
2. **The chat modification flow bypasses AST entirely**: As documented in Bug 8, `handleModifyTrigger()` → `full-app-stream` (full regeneration), never the AST diff system
3. **The `/api/ai-builder/modify` route** that would generate AST diffs is never called from any UI path

**Impact:** A complete AST-based surgical modification system exists (~22KB across multiple files) but is only reachable through the diff approval UI — which itself is unreachable because the builder expert prompt doesn't return the format needed to trigger it. This compounds Bug 8: not only is the modify endpoint orphaned, but the AST execution layer beneath it is also orphaned.

### BUG 11 (CRITICAL): Phase Integrity System P1-P9 — Only P3 Wired, Rest Never Called

**README Claim:** Comprehensive integrity checks (P1-P9, P16) run between and after phases.
**Verification (from GitHub source):**

`phaseIntegrity.ts` implements a comprehensive suite of integrity checks:

- **P1:** File conflict detection (`detectFileConflicts`)
- **P2:** Import/export validation (`validateImportExports`)
- **P3:** Phase snapshot & rollback (`capturePhaseSnapshot`, `rollbackToSnapshot`)
- **P5:** Cross-phase TypeScript type checking (`runPhaseTypeCheck`)
- **P6:** Type compatibility checks (`checkTypeCompatibility`)
- **P7:** Smoke test execution (`runPhaseTests`)
- **P8:** API contract enforcement (`validateApiContracts`)
- **P9:** Regression testing (`runRegressionTests`)
- **P16:** Architecture verification (`verifyArchitectureImplementation`)

`PhaseExecutionManager.ts` imports ALL of these and wraps them as class methods — the delegation layer is complete.

**However, the hook layer (`useDynamicBuildPhases.ts`) only calls TWO of these:**

1. **P3 `capturePhaseSnapshot()`** — called in `startPhase()` before phase execution begins
2. **P3 `rollbackToSnapshot()`** — exposed as `rollbackToPhase()` callback for consumers

**Never called from any hook or UI code:**

- P1: File conflict detection — NEVER CALLED
- P2: Import/export validation — NEVER CALLED
- P5: Cross-phase type checking — NEVER CALLED
- P6: Type compatibility checks — NEVER CALLED
- P7: Smoke test execution — NEVER CALLED
- P8: API contract enforcement — NEVER CALLED
- P9: Regression testing — NEVER CALLED
- P16: Architecture verification — NEVER CALLED

**Search proof:** GitHub code search for `capturePhaseSnapshot(` excluding `phaseIntegrity.ts` returned 4 files: 2 archived docs, `PhaseExecutionManager.ts` (the wrapper), and `useDynamicBuildPhases.ts` (only P3). Search for all other integrity method calls in `usePhaseExecution` returned 0 results. No other file in the codebase invokes them.

**Impact:** 8 out of 9 integrity check categories are fully built but completely dead code. The phase execution flow never validates file conflicts, import resolution, type compatibility, API contracts, or runs regression tests between phases. Only snapshot/rollback works.

### Item 6: Smart Context Selection — ⚠️ PARTIALLY WIRED

**README Claim:** `CodeContextService` with Tree-sitter parsing, dependency graphs, and token budgets for intelligent context selection.
**Verification (from GitHub source):**

`CodeContextService.ts` exists with full implementation. `PhaseExecutionManager.ts` has `getExecutionContextAsync()` which initializes the service and calls `getOptimizedPhaseContext()` to get smart context snapshots.

**The async path IS wired:**

- `usePhaseExecution.ts` calls `getExecutionPromptAsync()` which uses `manager.getExecutionContextAsync()` — this DOES initialize CodeContextService and fetch optimized context
- The smart context snapshot is cached and included in the execution context passed to prompt building

**However:**

- If CodeContextService fails to initialize or returns errors, it falls back silently to raw accumulated code
- The modification context path (`getModificationContext`) exists but is never called from the chat modification flow (compounds Bug 8)
- The service depends on `rawGeneratedFiles` being populated — which only happens after `recordPhaseResult()`, meaning the first phase has no smart context

**Status:** Partially wired. The async variant works for phase execution, but modification context is unused and first-phase context is unavailable.

---

## Remaining Builder Page Features (Full Test)

**Date of test:** March 16, 2026

### Save Button

**Status:** ✅ WORKS (with UX gap)

Clicking Save triggers a POST to `https://dqvasekrckiqpliiwbzu.supabase.co/rest/v1/generated_apps` which returns 200. The app state is persisted to Supabase successfully.

**BUG 19 (LOW): Save button gives no visible feedback.** No toast notification, no "Saved" confirmation, no loading spinner, no visual change. Users have no idea if save succeeded or failed. The button should show a brief success state or toast.

### Hamburger Drawer (Menu) — Full Item Test

**Status:** ✅ DRAWER WORKS — individual items tested below

The hamburger icon (☰) in the top-right opens a slide-in drawer. Each item was tested:

**PROJECT section:**

| Item                  | Result        | Details                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Start New Project** | ⚠️ MISLEADING | Does NOT create a blank project. Instead it triggered the build pipeline on the existing RecipeBox project — injected layout files ("3 file(s) loaded"), skipped Phase 1, and started building Phase 2 (Authentication System). Phase 2 then failed: "No response from AI. (Attempt 1/3)" followed by retries. The button label says "Begin with the wizard" but the behavior is "restart build from layout injection." |
| **Dashboard**         | ✅ Works      | Navigates to `/app/dashboard` with stats (12 Total Projects, 0 Completed, 12 In Progress, 0 Tokens), project grid with search/filters, Continue/Deploy buttons per project. Well-built page.                                                                                                                                                                                                                            |
| **Project Docs**      | ✅ Works      | Opens overlay with 4 tabs: Concept (app details, features list), Design ("No Design Captured"), Plan (10 phases, 22-42 min est, feature breakdown by domain), Progress ("No Build Progress"). All tabs render correctly.                                                                                                                                                                                                |
| **Version History**   | ❌ No-op      | Clicking does nothing — no modal, no navigation, no empty state message. Shows "0 versions" in the drawer but no action when clicked. Should at least show an empty state panel.                                                                                                                                                                                                                                        |
| **Export Project**    | ❌ No-op      | Closes drawer but triggers no download or modal. Unlike the preview toolbar's Export button (which opens a modal), the drawer's "Download as ZIP" does nothing visible.                                                                                                                                                                                                                                                 |

**BUG 22 (MEDIUM): "Start New Project" doesn't start a new project — it re-triggers the build pipeline on the existing project.** The button should either (a) navigate to `/app/wizard` with a blank state, or (b) show a confirmation dialog before resetting. Currently it silently injects layout files and starts building Phase 2, which then fails.

**BUG 23 (LOW): Version History click is a no-op with no feedback.** Even with 0 versions, clicking should show an empty state panel/modal explaining what version history is and how to create versions.

**BUG 24 (LOW): Export Project (drawer) is a no-op.** The drawer's "Download as ZIP" export does nothing — no download triggered, no modal shown. The preview toolbar's Export button works (opens modal), but this duplicate in the drawer is unwired.

**PREFERENCES section:**

| Item             | Result   | Details                                                                                                                                                                                        |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme toggle** | ✅ Works | Instant dark/light mode switch. Entire app reskins immediately — dark backgrounds, adjusted text colors, drawer updates. Toggle shows "Dark mode"/"Light mode" label. No page reload required. |
| **Settings**     | ✅ Works | Opens modal: "Settings — Manage your account" with Account section showing signed-in email and Sign Out button. Minimal but functional.                                                        |

**HELP section:**

| Item              | Result   | Details                                                                                                                                                                                                         |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Documentation** | ✅ Works | Opens new tab at `/docs` with full documentation hub. Cards for "Getting Started", "Natural Conversation Wizard", and more. Has its own nav bar with Documents dropdown, Pricing, Dashboard, "Go to App" links. |

### Download Button

**Status:** ❌ COMPLETE NO-OP

**BUG 20 (MEDIUM): Download button does absolutely nothing.** Clicked multiple times with network monitoring and console tracking active — zero network requests, zero console messages, zero UI feedback. The button gets a red focus outline on click but triggers no action at all. No file download, no modal, no error.

**Note:** The Export button right next to it opens a modal with "Download ZIP" as its top option. The standalone Download button appears to be intended as a shortcut for the Export → Download ZIP flow, but the handler is not wired.

### Export / Deploy Options

**Status:** ✅ MODAL WORKS (content issues noted in Bugs 14)

The Export button opens the "Export App" modal with 4 options:

1. **Download ZIP** [Recommended] — Download project files as a ZIP archive
2. **Deploy to Vercel** — One-click deploy to Vercel (requires GitHub)
3. **Deploy to Netlify** — Drag and drop deploy to Netlify
4. **Copy to Clipboard** — Copy main component code to clipboard

Footer shows "0 files • 0 dependencies" (Bug 14). There is no separate Deploy button — deploy options (Vercel, Netlify) are inside the Export modal. The Full-Stack toggle in the preview toolbar handles Railway deployment separately.

### Branch Selector & Create New Branch

**Status:** ✅ WORKS

The branch selector dropdown shows:

- **BRANCHES** header
- **main** (default) — with checkmark on current branch
- **+ Create New Branch...** option

Clicking "Create New Branch..." opens a well-designed modal:

- Title: "Create New Branch" with subtitle "Branch from main (v1)"
- **Branch Name** field (required) with validation hint: "Use lowercase letters, numbers, and hyphens"
- **Description** field (optional) with placeholder "What changes are you planning to make?"
- Info box: "Creating a branch copies the current code and conversation history. Changes made on this branch won't affect other branches."
- Cancel and Create Branch buttons

**Live test:** Created a branch named "test-branch" — POST to Supabase returned 200, the selector updated to show "test-branch" as active, and switching back to "main" worked correctly. Both branches appeared in the dropdown afterwards.

### Inspect Button (Element Inspector)

**Status:** ⚠️ PARTIALLY WORKS

Clicking Inspect opens an **Element Inspector** panel on the left side with:

- "Click on elements in the page to select them. Click again to deselect"
- **SELECTED ELEMENTS** section (for listing selected elements)
- **WHAT'S THE PROBLEM?** text area
- **WHAT DO YOU WANT CHANGED?** text area
- **Generate Claude Prompt** button

The Inspector panel opens and closes correctly. However, clicking on elements in the preview iframe doesn't select them — clicks pass through to the iframe and trigger navigation instead (the preview navigated to the AI App Builder's Sign Up page when clicking Sign Up). The Inspector can't intercept clicks inside the cross-origin preview iframe.

**BUG 21 (MEDIUM): Element Inspector can't select elements inside the preview iframe.** The inspector overlay and the preview iframe are in different DOM contexts. Clicks in the preview area trigger iframe navigation rather than element selection. The inspector only works for elements in the main Builder page, not the generated app preview — which is the primary use case.

### Debug Button (Debug Panel)

**Status:** ✅ WORKS

Clicking Debug opens a **Debug Panel** in the bottom-right with 4 tabs:

1. **State** — Live store snapshot showing: `mode: ACT`, `isGenerating: false`, `messagesCount: 7`, `componentsCount: 12`, `undoStackSize: 0`, `redoStackSize: 0`, `hasPendingChange: false`, `hasPendingDiff: false`, `hasAppConcept: true`, and `ACTIVE MODALS: None`
2. **Api** — Recent API requests log (empty during idle)
3. **Sse** — SSE events log (empty during idle)
4. **Tokens** — Token usage tracking (empty during idle)

Footer shows refresh count and keyboard shortcut hint (Ctrl+Shift+D). All 4 tabs render and switch correctly. The State tab provides valuable debugging info about the current app state. The other tabs would populate during active AI generation.

### Nav Bar Step Links

**Status:** ✅ ALL WORK

The top nav bar shows 5 steps: Wizard → Design → AI Plan → Review → Builder. All steps are clickable and navigate to their respective pages:

| Step        | URL            | Page Content                                                                                                                                  |
| ----------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wizard**  | `/app/wizard`  | App Planning Assistant — chat interface for describing app idea, with Concept Summary sidebar                                                 |
| **Design**  | `/app/design`  | Layout Builder — upload images/describe design, with Preview area and "Generate Full Layout from Concept" button                              |
| **AI Plan** | `/app/ai-plan` | AI Architecture Planning — shows "Previous planning data is incomplete. Re-run to generate a fresh architecture." with Re-run Planning button |
| **Review**  | `/app/review`  | Review: RecipeBox — Summary of App Concept, Layout Design (3 captured files), and AI Architecture Plan with edit links                        |
| **Builder** | `/app`         | Full Builder page (three-panel layout)                                                                                                        |

Each step shows a green checkmark when completed. The "Skip to Builder →" shortcut link appears on all non-Builder pages. Navigating away from Builder and back preserves all state (chat history, app concept, preview).

---

## Orphaned Infrastructure (Code-Verified via GitHub)

**Date of verification:** March 16, 2026
**Method:** GitHub code search on `takk387/AI-app` repo, cross-referencing imports, callers, and data flow

### BUG 25 (CRITICAL): useSmartContext — Initialized, Output Discarded

`MainBuilderView.tsx` line 368: `const smartContext = useSmartContext();`

The hook initializes a full Supabase-backed semantic memory system with OpenAI embeddings for cross-session memory, conversation compression, memory storage/retrieval. It returns `buildSmartContext`, `storeConversationMemories`, `searchMemories`, etc.

**But the `smartContext` variable is never used.** GitHub code search for `smartContext` in MainBuilderView shows only 3 matches: a comment (line 19), the import (line 109), and the initialization (line 368). The variable is never passed to any child component, never referenced in any render logic, never destructured. It initializes on every page load, connects to Supabase, but its output is thrown away. The chat system uses its own simpler `compressConversation` from `contextCompression.ts` instead.

**Search proof:** `useSmartContext` appears in 5 files total: the hook itself (`useSmartContext.ts`), barrel export (`hooks/index.ts`), two `.claude/rules/` docs, and `MainBuilderView.tsx`. No other component or hook consumes it.

### BUG 26 (CRITICAL): Agents System — 1,274 Lines of Complete Dead Code

`src/agents/` contains 4 files:

- `CodeTransformAgent.ts` (437 lines) — AST-based code transformation agent
- `DeploymentAgent.ts` (444 lines) — Automated deployment agent
- `types.ts` (393 lines) — Type definitions for the agent system
- `index.ts` — Barrel re-export

**Zero imports exist outside `src/agents/`.** GitHub code search for `CodeTransformAgent` and `DeploymentAgent` excluding `path:src/agents` returns only 2 results — both in archived documentation files (`MASTER_CONTEXT_VERIFIED.md` and `DASHBOARD_DEPLOYMENT_PLAN.md`). No hook, component, API route, or service ever references these agents.

**Search proof:** `import.*from.*agents` = 0 results. `createDeploymentAgent OR createCodeTransformAgent NOT path:src/agents` = 0 results. `path:(app/api) (DeploymentAgent|CodeTransformAgent)` = 0 results.

### BUG 27 (MEDIUM): Titan liveEdit — Built, Callable via API, But Unreachable from Builder Page

`TitanPipelineService.ts` exports a `liveEdit()` function that takes current code + a selected element's `data-id` + a natural language instruction and sends it to Gemini for surgical element-level editing. The API route `/api/layout/pipeline/route.ts` calls `service.liveEdit()` (line 35).

**However, the only client-side caller is `useLayoutBuilder.ts` (lines 381 and 481)** — a Design page hook. No Builder page component ever calls `/api/layout/pipeline`. The Element Inspector on the Builder page (the "Inspect" button) opens a panel with "Generate Claude Prompt" — it generates text for the chat, not a `liveEdit()` call.

**Search proof:** `"api/layout/pipeline" NOT path:app/api` returns: `useLayoutBuilder.ts` (Design page), 4 archive docs, and `nightly-test.js`. Zero Builder page components.

### BUG 28 (LOW): handleDesignTrigger — Dead Code Checking for Impossible Condition

`useSendMessageHandlers.ts` line 368 defines `handleDesignTrigger()` with comment: "Legacy design-chat API has been removed. Design is now handled through the Layout Builder Wizard." The handler just posts a chat message saying "go to the Layout Builder."

`useSendMessage.ts` line 269 checks: `if (currentMode === 'ACT' && data?.shouldTriggerDesign && currentComponent)` — and calls `handleDesignTrigger()`.

**But the builder expert prompt never instructs Claude to return `shouldTriggerDesign`.** GitHub code search for `shouldTriggerDesign path:prompts` = 0 results. The condition can never be true. Dead code checking for an impossible condition.

### BUG 29 (MEDIUM): Debug Panel API/SSE/Tokens Tabs — Tracking Functions Never Called

`DebugPanel.tsx` exports `trackAPIRequest`, `trackSSEEvent`, and `trackTokenUsage` functions. The State tab works (reads directly from Zustand store snapshot). But the Api, Sse, and Tokens tabs rely on these tracking functions being called from the actual API/streaming layer.

**No code outside `src/components/dev/` ever calls these functions.** GitHub code search for `trackAPIRequest NOT path:dev` = 0 results. `trackTokenUsage NOT path:dev` = 0 results. The functions are exported but never imported or called by `useSendMessage`, `useAppStreaming`, or any API handler.

**Impact:** The Debug Panel renders correctly and the State tab provides useful store snapshots, but 3 of 4 tabs are permanently empty — not because there's no data, but because the data pipeline was never connected.

### BUG 30 (MEDIUM): useAppBuilderSync — Extracts Design Tokens, Only Console.Logs Them

`MainBuilderView.tsx` line 394: `const appBuilderSync = useAppBuilderSync(appConcept?.layoutManifest || null, { autoSync: true, ... })`

The hook runs with `autoSync: true`, extracting design tokens (colors, typography, spacing) from the layout manifest. On sync completion, the callback only does: `console.log('[AppBuilderSync] Layout synced:', { hasColors: !!tokens.colors, ... })`. The design tokens are extracted and logged but never injected into the chat AI's system prompt, the code generation context, or any component props.

The chat AI still only receives boolean flags (Bug 1). The phase execution system gets code context but not design tokens. The extracted tokens are effectively discarded after logging.

**Search proof:** `useAppBuilderSync` appears in 3 files: the hook itself, an archive doc, and `MainBuilderView.tsx`. The `appBuilderSync` variable is only referenced in the initialization block with its callbacks — never passed to children or used in render logic.

### Browser Claude Finding #26 — NOT CONFIRMED: useProjectDocumentation Is Accessible

Browser Claude claimed the documentation panel was "gated behind hidden toggle." This is incorrect. `useProjectDocumentation` is initialized at `MainBuilderView.tsx` line 372 and the "Project Docs" item in the hamburger drawer successfully opens a 4-tab documentation overlay (Concept/Design/Plan/Progress) — confirmed via live testing in the drawer audit above.

---

## Updated Summary of All Issues

| #   | Severity  | Issue                                                                                                                          | Location                                                                 | Verified                |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------- |
| 1   | CRITICAL  | ACT chat has zero context about phase plan or app concept — sends only boolean flags                                           | `useSendMessage.ts` lines ~190-205                                       | ✅ Live test + code     |
| 2   | NOT A BUG | Camera icon hidden when no layout design exists — working as designed                                                          | `ChatPanel.tsx` conditional on `hasLayoutDesign`                         | ✅ Code confirms        |
| 3   | LOW       | Context asymmetry: PLAN sends `wizardState`, ACT sends booleans                                                                | `useSendMessage.ts` PLAN vs ACT branches                                 | ✅ Code confirms        |
| 4   | CRITICAL  | "Start Building" calls `tryStartPhase1()` but Phase 1 gets stuck — layout injection without files + excluded from auto-execute | `usePhaseExecution.ts` → `tryStartPhase1()` + auto-execute effect        | ✅ Live test + code     |
| 5   | CRITICAL  | "Build This Phase" handler is a no-op — only calls `handleClosePhaseDetail()`                                                  | `AppConceptPanel.tsx` line 426                                           | ✅ Code confirms        |
| 6   | MEDIUM    | Phase 1 stuck in `in-progress` → shows "Skip" not "Build" — chain from Bug 4                                                   | `PhaseDetailView.tsx` footer status logic                                | ✅ Live test + code     |
| 7   | LOW       | Regenerate Phases: `isLoading` flag unused in ChatPanel rendering, no spinner                                                  | `useConceptUpdates.ts` + `ChatPanel.tsx`                                 | ✅ Code confirms        |
| 8   | CRITICAL  | Surgical modify system (`/api/ai-builder/modify`) — 22KB of code, never called from chat                                       | `useSendMessageHandlers.ts` → `streaming.generate()` → `full-app-stream` | ✅ Live test + code     |
| 9   | CRITICAL  | ChatPanel and AppConceptPanel undocumented in README — mentioned only in archived planning docs                                | GitHub code search on `path:README` and `path:docs`                      | ✅ Code search confirms |
| 10  | CRITICAL  | AST-Based Modifications mostly disconnected — only reachable via diff approval UI, never from chat                             | `astModifier.ts`, `applyDiff.ts`, `useVersionHandlers.ts` line 205       | ✅ Code search confirms |
| 11  | CRITICAL  | Phase Integrity P1-P9: only P3 (snapshot/rollback) wired — 8 of 9 check categories never called                                | `useDynamicBuildPhases.ts` only calls P3; search for others = 0 results  | ✅ Code search confirms |
| 12  | MEDIUM    | Preview nav links break out of generated app — iframe navigates to host site                                                   | `BrowserPreviewService` react-router-dom shim → `<a>` tags               | ✅ Live test            |
| 13  | MEDIUM    | Full-Stack Railway deploy succeeds but app crashes at runtime                                                                  | `RailwayPreview` → deploy pipeline completes, app shows error            | ✅ Live test            |
| 14  | LOW       | Export modal shows "0 files • 0 dependencies" despite code existing in preview                                                 | Export modal file counting logic                                         | ✅ Live test            |
| 15  | LOW       | Capture for AI button gives no visible feedback (no toast, no image attached)                                                  | `DeviceToolbar` → `onScreenshot` callback                                | ✅ Live test            |
| 16  | LOW       | Console button in fullscreen has no visible effect                                                                             | Fullscreen toolbar Console button                                        | ✅ Live test            |
| 17  | LOW       | Code view shows raw JSON dump instead of file tree + individual file viewer                                                    | `FullAppPreview` Code tab                                                | ✅ Live test            |
| 18  | LOW       | Preview system completely undocumented in README (extends Bug 9)                                                               | GitHub search on `path:README` = 0 results                               | ✅ Code search confirms |
| 19  | LOW       | Save button gives no visible feedback (no toast, no "Saved" state)                                                             | Save button → POST to Supabase succeeds silently                         | ✅ Live test            |
| 20  | MEDIUM    | Download button is a complete no-op — zero network/console/UI activity                                                         | Download button in preview toolbar                                       | ✅ Live test            |
| 21  | MEDIUM    | Element Inspector can't select elements inside preview iframe — clicks pass through                                            | Inspect button → Element Inspector panel                                 | ✅ Live test            |
| 22  | MEDIUM    | "Start New Project" doesn't start new project — re-triggers build on existing project                                          | Hamburger drawer → Start New Project                                     | ✅ Live test            |
| 23  | LOW       | Version History click is a no-op — no modal, no empty state, no feedback                                                       | Hamburger drawer → Version History                                       | ✅ Live test            |
| 24  | LOW       | Export Project (drawer) is a no-op — no download triggered, no modal shown                                                     | Hamburger drawer → Export Project                                        | ✅ Live test            |
| 25  | CRITICAL  | useSmartContext initialized every page load but return value never used — semantic memory discarded                            | `MainBuilderView.tsx` line 368 → `smartContext` unused                   | ✅ Code search confirms |
| 26  | CRITICAL  | Agents system (CodeTransformAgent + DeploymentAgent) — 1,274 lines of complete dead code, zero imports                         | `src/agents/` — 0 imports outside directory                              | ✅ Code search confirms |
| 27  | MEDIUM    | Titan liveEdit built + API callable, but unreachable from Builder page — only Design page calls it                             | `TitanPipelineService.liveEdit()` → only `useLayoutBuilder.ts` calls API | ✅ Code search confirms |
| 28  | LOW       | handleDesignTrigger dead code — checks for `shouldTriggerDesign` which prompt never instructs AI to return                     | `useSendMessageHandlers.ts` line 368 + `useSendMessage.ts` line 269      | ✅ Code search confirms |
| 29  | MEDIUM    | Debug Panel Api/Sse/Tokens tabs permanently empty — `trackAPIRequest`/`trackTokenUsage` never called                           | `DebugPanel.tsx` exports tracking fns; 0 callers outside `dev/`          | ✅ Code search confirms |
| 30  | MEDIUM    | useAppBuilderSync extracts design tokens but only console.logs them — never reaches chat AI or code gen                        | `MainBuilderView.tsx` line 394 → `onSyncComplete` only logs              | ✅ Code search confirms |

**Features Confirmed Working:**

| Feature                   | Status        | Notes                                                                 |
| ------------------------- | ------------- | --------------------------------------------------------------------- |
| Save button               | ✅ Works      | POST to Supabase returns 200 (no visible feedback — Bug 19)           |
| Hamburger drawer          | ✅ Works      | Full menu with Project, Preferences, Help sections                    |
| Export modal              | ✅ Works      | 4 options: ZIP, Vercel, Netlify, Clipboard (0 files bug — Bug 14)     |
| Branch selector           | ✅ Works      | Dropdown, Create New Branch modal, branch switching all functional    |
| Debug panel               | ✅ Works      | State/Api/Sse/Tokens tabs all render correctly                        |
| Nav bar steps             | ✅ Works      | All 5 steps (Wizard/Design/AI Plan/Review/Builder) navigate correctly |
| Inspect panel             | ⚠️ Partial    | Opens correctly but can't select preview iframe elements (Bug 21)     |
| Download button           | ❌ Broken     | Complete no-op (Bug 20)                                               |
| Drawer: Dashboard         | ✅ Works      | Full project grid with stats, search, filters                         |
| Drawer: Project Docs      | ✅ Works      | 4-tab overlay (Concept/Design/Plan/Progress)                          |
| Drawer: Theme toggle      | ✅ Works      | Instant dark/light mode switch                                        |
| Drawer: Settings          | ✅ Works      | Account info and Sign Out                                             |
| Drawer: Documentation     | ✅ Works      | Opens /docs in new tab with full help content                         |
| Drawer: Start New Project | ⚠️ Misleading | Re-triggers build instead of creating new project (Bug 22)            |
| Drawer: Version History   | ❌ No-op      | Clicking does nothing (Bug 23)                                        |
| Drawer: Export Project    | ❌ No-op      | Clicking does nothing (Bug 24)                                        |

**README Code Generation — Working Items:**

| #   | Item                    | Status                    | Notes                                                             |
| --- | ----------------------- | ------------------------- | ----------------------------------------------------------------- |
| —   | Titan Pipeline          | ✅ Working                | Scoped to Design page, not Builder page                           |
| —   | Dynamic Phases          | ✅ Working (with caveats) | Generation works; execution triggers broken (Bugs 4-6)            |
| —   | SSE Streaming           | ✅ Working                | `full-app-stream` confirmed live                                  |
| —   | Smart Context Selection | ⚠️ Partially wired        | Async path works for phase execution; modification context unused |

---

## Updated Recommendations for Redesign

**Priority 1 — Fix the build pipeline (Bugs 4, 5, 6):**
The automated build flow is completely broken. "Start Building" needs to actually call `tryStartPhase1()` or equivalent. "Build This Phase" needs to trigger `executePhase()` and provide feedback. Phase 1's layout injection needs a clear trigger or auto-execution path.

**Priority 2 — Bridge the chat ↔ context gap (Bugs 1, 3):**
Two approaches:

1. **Pass context to chat API**: Include `appConcept` and `dynamicPhasePlan` in the request body sent to `/api/ai-builder`, and inject them into the system prompt via `generateBuilderContext`. Simpler, makes chat universally smarter.
2. **Route phase messages through phase execution**: Detect when a chat message references a phase (e.g., "build phase 2") and route it through `usePhaseExecution.executePhase()` instead of the generic chat endpoint. Preserves structured pipeline but only helps for phase-specific commands.

**Priority 3 — Wire up the surgical modify system (Bug 8):**
Two options:

1. **Route modifications through `/api/ai-builder/modify`**: Change `handleModifyTrigger()` in `useSendMessageHandlers.ts` to call the modify endpoint instead of `full-app-stream`. This activates the existing diff generation, validation, retry, and preview UI.
2. **Update the builder expert prompt**: Modify `builderExpertPrompt.ts` to instruct Claude to return `changeType: "MODIFICATION"` with `files` for modify intents, which would trigger the existing diff preview path in `useSendMessage`.
   Option 1 is cleaner. Option 2 leverages more of the existing code paths but depends on Claude's response format.

**Priority 4 — UX feedback gaps (Bugs 5, 7):**
Silent failures are the worst UX. Every button click should produce visible feedback — loading states, error toasts, progress indicators. The 45-second Regenerate Phases call especially needs a spinner and success confirmation.

**Priority 5 — Document these features (Bug 9):**
Add ChatPanel and AppConceptPanel documentation to the Master Context and/or README. Cover: component props, message routing per mode, context passed to AI, relationship between the panels, and how modifications flow through the system.

**Priority 6 — Wire up Phase Integrity checks (Bug 11):**
The entire integrity suite (P1-P9, P16) is built and wrapped in PhaseExecutionManager. The hook layer only needs to call the methods at the right points:

- `detectFileConflicts()` after each phase completes (before recording result)
- `validateImportExports()` after each phase completes
- `runPhaseTypeCheck()` after each phase completes
- `runPhaseTests()` after each phase completes
- `runRegressionTests()` after Phase 2+
- `validateApiContracts()` after backend phases
- `verifyArchitectureImplementation()` at build completion
  Add these calls in `useDynamicBuildPhases.completePhase()` or in `usePhaseExecution.executePhase()` after the streaming result returns.

**Priority 7 — Connect AST modifications (Bug 10):**
The AST system compounds Bug 8. Once the surgical modify route is wired (Priority 3), the AST layer will automatically activate since `/api/ai-builder/modify` already calls the AST executor. Alternatively, the diff approval UI path could be made reachable by updating the builder expert prompt to return `changeType: "MODIFICATION"` with files.

**Priority 8 — Fix preview navigation (Bug 12):**
The react-router-dom shim in `BrowserPreviewService` needs to handle routing within the iframe instead of rendering real `<a>` tags. Options: (1) Implement a proper `MemoryRouter` or `HashRouter` in the shim so routes resolve within the iframe, (2) Intercept link clicks in the iframe with a `click` event listener that prevents default navigation and updates an internal route state, (3) Use `srcdoc` with a base tag that prevents iframe navigation.

**Priority 9 — UX polish for preview toolbar (Bugs 14, 15, 16, 17):**

- Fix Export modal file counting to reflect actual generated code files
- Add visible toast/feedback for Capture button ("Screenshot captured — will attach to next message")
- Wire Console button to show an actual console panel (or remove it from the toolbar)
- Improve Code view to show a file tree + individual file viewer instead of raw JSON dump

**Priority 10 — Wire Download button and fix Save feedback (Bugs 19, 20):**

- The Download button handler needs to be connected — either as a shortcut to Export → Download ZIP, or with its own zip generation logic
- Save button needs a visible success state: toast notification, brief "Saved ✓" text swap, or button color flash

**Priority 11 — Fix Element Inspector iframe interaction (Bug 21):**
The inspector needs to communicate with the preview iframe to enable element selection. Options: (1) Use `postMessage` to inject a selection overlay script into the iframe that communicates selected elements back to the parent, (2) Use the same-origin preview approach (render preview content in a same-origin iframe or shadow DOM) so the inspector can directly access elements.

**Priority 12 — Missing features (Bug 2):**
The camera/screenshot button is conditionally rendered on `onCaptureScreenshot` prop — either wire it up or remove the dead code.

**Priority 13 — Wire or remove useSmartContext (Bug 25):**
The semantic memory system initializes on every page load, connecting to Supabase and setting up OpenAI embeddings. Either pass `smartContext` to the chat system (replacing the simpler `compressConversation`) or remove the hook to eliminate unnecessary Supabase connections and initialization overhead.

**Priority 14 — Remove dead Agents system (Bug 26):**
1,274 lines of code with zero callers. Safe to delete `src/agents/` entirely. If the agents are intended for future use, move them to a feature branch rather than shipping dead code.

**Priority 15 — Wire Titan liveEdit to Builder (Bug 27):**
The Element Inspector already captures selected elements and change descriptions — it just needs to call `/api/layout/pipeline` with `liveEdit` action instead of generating a text prompt for the chat. This would enable surgical element-level editing directly from the Builder page.

**Priority 16 — Clean up dead design trigger and wire Debug Panel (Bugs 28, 29):**

- Remove `handleDesignTrigger` and the `shouldTriggerDesign` check — confirmed dead code
- Add `trackAPIRequest()` calls in `useSendMessage` and `useAppStreaming` after each API response
- Add `trackTokenUsage()` calls when token counts are returned from the AI endpoints
- Add `trackSSEEvent()` calls in the SSE consumption layer

**Priority 17 — Feed design tokens to AI context (Bug 30):**
`useAppBuilderSync` already extracts colors, typography, and spacing from the layout manifest. These tokens should be included in the code generation context so the AI produces code consistent with the user's design choices. Pass them through to `generateBuilderContext` or include in the phase execution context.

---

## Encountered But Not Tested

The following items were observed during the audit but not individually clicked/tested:

| Item                                    | Where Seen                         | Why Untested                                                                                                                       |
| --------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Export modal: Download ZIP button       | Export/Deploy modal                | Modal confirmed showing "0 files • 0 dependencies" (Bug 14), but individual action buttons not clicked                             |
| Export modal: Deploy to Vercel          | Export/Deploy modal                | Same as above                                                                                                                      |
| Export modal: Deploy to Netlify         | Export/Deploy modal                | Same as above                                                                                                                      |
| Export modal: Copy to Clipboard         | Export/Deploy modal                | Same as above                                                                                                                      |
| Dashboard project card: Continue button | Dashboard (`/app/dashboard`)       | Navigated to Dashboard, saw 12 projects, but didn't interact with individual cards                                                 |
| Dashboard project card: Deploy button   | Dashboard (`/app/dashboard`)       | Same as above                                                                                                                      |
| Dashboard project card: three-dot menu  | Dashboard (`/app/dashboard`)       | Same as above                                                                                                                      |
| Pause button                            | Builder footer (App Concept panel) | Visible in footer area but not clicked                                                                                             |
| Skip button                             | Builder footer (App Concept panel) | Noted showing when Phase 1 stuck (Bug 6), but never clicked to test behavior                                                       |
| Dark mode icon in drawer header bar     | Hamburger drawer top bar (🌙/☀️)   | Tested the PREFERENCES section Theme toggle, but not this separate header icon                                                     |
| Code view Copy button                   | Preview panel → Code view          | Saw the button alongside the raw JSON dump (Bug 17), didn't test clipboard copy                                                    |
| Undo/Redo buttons                       | Preview toolbar                    | Were grayed out/disabled; never reached a state with code changes to test if they activate                                         |
| Camera/image upload button in chat      | Chat input area                    | Appeared after "Start New Project" triggered layout injection (confirming Bug 2 investigation), but didn't test uploading an image |
| Preview toolbar "Con..." button         | Non-fullscreen preview toolbar     | Partially visible button (likely "Console"); only tested Console in fullscreen mode (Bug 16)                                       |
| Fullscreen exit via click-outside       | Preview fullscreen mode            | Used the exit button to leave fullscreen; didn't test clicking outside the fullscreen area                                         |
