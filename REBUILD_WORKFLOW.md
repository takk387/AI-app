# Builder Page Rebuild — Workflow

---

## The Big Picture

```
  CLEANUP          FOUNDATION         UI COMPONENTS           CONNECT          SHIP
 ─────────        ────────────       ────────────────        ─────────       ────────

 Session 0         Session 1          Sessions 2-6           Session 7       Session 8
 ┌────────┐       ┌────────────┐     ┌──────────────┐      ┌─────────┐     ┌────────┐
 │ Delete  │──────▶│  Builder   │────▶│  Build each  │─────▶│  Wire   │────▶│ Polish │
 │ dead    │       │  Provider  │     │  component   │      │  it all │     │ test   │
 │ code    │       │  (context  │     │  against the │      │ together│     │ verify │
 │         │       │   engine)  │     │  provider    │      │         │     │        │
 └────────┘       └────────────┘     └──────────────┘      └─────────┘     └────────┘
   ~1 hr             ~1 day            ~3-4 days              ~1 day          ~½ day
```

---

## Session-by-Session Flow

### Session 0: Cleanup & Prep

```
WHAT EXISTS:                          AFTER SESSION 0:

src/agents/ (1,320 lines)            ❌ DELETED
useBrowserSupport.ts                 ❌ DELETED
useSmartContext.ts                    ❌ DELETED
BrowserPreview.tsx                   ❌ DELETED
BrowserPreviewService.ts             ❌ DELETED

src/components/builder/              ✅ CREATED (empty files)
  BuilderPage.tsx                       // placeholder
  LeftPanel.tsx                         // placeholder
  PanelHeader.tsx                       // placeholder
  MessageList.tsx                       // placeholder
  InputBar.tsx                          // placeholder
  PhaseStatusBar.tsx                    // placeholder
  PreviewPanel.tsx                      // placeholder
  PreviewToolbar.tsx                    // placeholder
  ConceptDrawer.tsx                     // placeholder
  ModalManager.tsx                      // placeholder
  index.ts                              // placeholder

src/contexts/BuilderContext.tsx       ✅ CREATED (empty file)

globals.css                          ✅ UPDATED (semantic var aliases added)

MainBuilderView.tsx                  ⚠️ UNTOUCHED (app still runs on old code)
```

**Input:** Current codebase
**Output:** Clean slate, empty component files, no dead code
**The app still works** — nothing changes for the user yet.

---

### Session 1: BuilderProvider (Context Engine)

This is the hardest session. No UI — just the brain.

```
┌─────────────────────────────────────────────────────────┐
│                   BuilderContext.tsx                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  HOOKS (called internally, exposed via useBuilder) │   │
│  │                                                    │   │
│  │  useDynamicBuildPhases ──▶ phases, executePhase    │   │
│  │  useVersionControl ──────▶ undo, redo              │   │
│  │  useDatabaseSync ────────▶ save, load              │   │
│  │  useKeyboardShortcuts ───▶ Ctrl+S/Z/Y             │   │
│  │  useFileStorage ─────────▶ file management         │   │
│  │  useMessageSender ───────▶ message routing         │   │
│  │  useBuilderHandlers ─────▶ build/modify triggers   │   │
│  │  usePhaseExecution ──────▶ phase lifecycle          │   │
│  │  useBuilderEffects ──────▶ data loading, autosave  │   │
│  │  useStreamingGeneration ─▶ SSE streaming           │   │
│  │  useProjectDocumentation ▶ auto-capture            │   │
│  │  useAppCrud ─────────────▶ CRUD operations         │   │
│  │  useBranchManagement ────▶ git branches            │   │
│  │  useConceptSync ─────────▶ concept ↔ store         │   │
│  │  useConceptUpdates ──────▶ concept mutations       │   │
│  │  useAppBuilderSync ──────▶ layout sync             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CONTEXT ENGINE (the new part)                     │   │
│  │                                                    │   │
│  │  sendMessage(text)                                 │   │
│  │    │                                               │   │
│  │    ▼                                               │   │
│  │  detectIntent(text, state)                         │   │
│  │    │                                               │   │
│  │    ├── QUESTION ──▶ assembleContext(question)       │   │
│  │    │                 → project summary + relevant   │   │
│  │    │                   files only                   │   │
│  │    │                 → /api/ai-builder              │   │
│  │    │                                               │   │
│  │    ├── BUILD ─────▶ isPhaseReference?              │   │
│  │    │                 YES → executePhase(N)          │   │
│  │    │                 NO  → assembleContext(build)    │   │
│  │    │                       → /api/ai-builder/       │   │
│  │    │                         full-app-stream        │   │
│  │    │                                               │   │
│  │    ├── MODIFY ────▶ assembleContext(modify)         │   │
│  │    │                 → current file code only       │   │
│  │    │                 → /api/ai-builder/modify       │   │
│  │    │                 → DiffPreviewModal             │   │
│  │    │                 → user approves → AST apply    │   │
│  │    │                                               │   │
│  │    ├── DEBUG ─────▶ assembleContext(debug)          │   │
│  │    │                 → error + relevant code        │   │
│  │    │                 → AI diagnoses                 │   │
│  │    │                 → propose fix → MODIFY flow    │   │
│  │    │                                               │   │
│  │    ├── CONCEPT ───▶ parse update from text          │   │
│  │    │                 → update appConcept in store   │   │
│  │    │                                               │   │
│  │    └── CLARIFY ───▶ display question in chat        │   │
│  │                                                    │   │
│  │  After each phase completion:                      │   │
│  │    → runPhaseIntegrityChecks()                     │   │
│  │    → trackAPIRequest() (debug panel)               │   │
│  │    → trackTokenUsage() (debug panel)               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  EXPORTS: useBuilder() hook                              │
│  Returns: BuilderContextValue (all state + actions)      │
└─────────────────────────────────────────────────────────┘
```

**Input:** Empty `BuilderContext.tsx`, existing hooks/services
**Output:** Working provider that any component can consume via `useBuilder()`
**Verify:** Write a test component that renders inside `<BuilderProvider>` and calls `useBuilder()`. All fields resolve. `sendMessage()` routes correctly.

---

### Session 2: BuilderPage Shell + ModalManager

```
┌─────────────────────────────────────────────┐
│ BuilderPage.tsx                              │
│                                              │
│  <BuilderProvider>                           │
│    ┌──────────────┬────────────────────┐    │
│    │              │                    │    │
│    │  LeftPanel   │   RightPanel       │    │
│    │  (40%)       │   (60%)            │    │
│    │              │                    │    │
│    │  [empty -    │   [empty -         │    │
│    │   Session 3] │    Session 5]      │    │
│    │              │                    │    │
│    └──────────────┴────────────────────┘    │
│                                              │
│    <ConceptDrawer />  ← [empty - Session 6] │
│    <ModalManager />   ← built this session  │
│  </BuilderProvider>                          │
└─────────────────────────────────────────────┘

ModalManager.tsx:
┌─────────────────────────┐
│ reads useBuilder()      │
│   .activeModal          │
│   .closeModal()         │
│                         │
│ switch(activeModal):    │
│   'phaseDetail'  → ...  │
│   'export'       → ...  │
│   'versionHistory'→ ... │
│   'diffPreview'  → ...  │
│   'nameApp'      → ...  │
│   'share'        → ...  │
│   'createBranch' → ...  │
│   null           → null │
└─────────────────────────┘
```

**Input:** BuilderProvider from Session 1
**Output:** Page renders with two empty panels + working modal system
**Verify:** Page loads at `/app`. Modals can be triggered programmatically. CSS grid holds 40/60 split.

---

### Sessions 3-6: UI Components (can run in parallel)

These four sessions are independent — they all build against `useBuilder()` and don't depend on each other.

```
Session 3: LeftPanel          Session 4: PhaseStatusBar
┌─────────────────────┐      ┌─────────────────────────────────┐
│ PanelHeader         │      │ ◉ Phase 2 of 5: Auth System     │
│ ┌─────────────────┐ │      │ ████████░░░░░░░░  40%  ⏸ ⏭ ↻   │
│ │ My App   [☰]    │ │      └─────────────────────────────────┘
│ └─────────────────┘ │
│                     │
│ MessageList         │      Session 5: PreviewPanel
│ ┌─────────────────┐ │      ┌─────────────────────────────────┐
│ │ 👤 Build the    │ │      │ [Preview] [Code]  ↩ ↪  ⬇ 🚀    │
│ │    login page   │ │      │ ┌───────────────────────────┐   │
│ │                 │ │      │ │                           │   │
│ │ 🤖 I'll create │ │      │ │   Sandpack + Nodebox      │   │
│ │    a login...   │ │      │ │   Live Preview            │   │
│ │                 │ │      │ │                           │   │
│ │ ✅ Phase 2     │ │      │ │   or                      │   │
│ │    complete     │ │      │ │                           │   │
│ └─────────────────┘ │      │ │   Code Editor             │   │
│                     │      │ │   (file tree + viewer)    │   │
│ InputBar            │      │ └───────────────────────────┘   │
│ ┌─────────────────┐ │      └─────────────────────────────────┘
│ │ [📎] Type... [➤]│ │
│ └─────────────────┘ │
└─────────────────────┘      Session 6: ConceptDrawer
                             ┌──────────────────────┐
                             │ ◀ App Concept         │
                             │                       │
                             │ Name: My App          │
                             │ Desc: A social...     │
                             │                       │
                             │ Features:             │
                             │  ☑ Auth system        │
                             │  ☑ User profiles      │
                             │  ☐ Messaging          │
                             │                       │
                             │ Tech: Next.js, ...    │
                             │                       │
                             │ Phases:               │
                             │  ✅ 1. Layout         │
                             │  🔨 2. Auth    [▶]    │
                             │  ○ 3. Profiles        │
                             │  ○ 4. API             │
                             │  ○ 5. Polish          │
                             └──────────────────────┘
```

**All four use `useBuilder()` for data. Zero prop drilling. Zero direct store access.**

---

### Session 7: Integration + Route Swap

```
BEFORE SESSION 7:                    AFTER SESSION 7:

/app/page.tsx renders:               /app/page.tsx renders:
  MainBuilderView ← old               BuilderPage ← new
  (still working)                      (fully wired)

Integration Tests Run:

  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │  ✅ "What does phase 3 do?"                     │
  │     → AI answers with phase context             │
  │                                                 │
  │  ✅ "Build phase 1"                             │
  │     → Phase execution triggers                  │
  │     → Layout injected                           │
  │     → Preview updates                           │
  │     → PhaseCompletionCard appears               │
  │                                                 │
  │  ✅ "Change the navbar to sticky"               │
  │     → MODIFY detected                           │
  │     → /api/ai-builder/modify called             │
  │     → DiffPreviewModal shows changes            │
  │     → User approves → code updates              │
  │                                                 │
  │  ✅ "Add search to the feature list"            │
  │     → CONCEPT detected                          │
  │     → appConcept updated in store               │
  │     → ConceptDrawer reflects change             │
  │                                                 │
  │  ✅ All toolbar buttons                         │
  │     → Undo/redo: visible count changes          │
  │     → Export: modal opens, files listed          │
  │     → Download: zip generated                    │
  │     → Deploy: deployment triggered               │
  │     → Each button: toast feedback               │
  │                                                 │
  │  ✅ Theme                                        │
  │     → Light mode: all CSS variables correct      │
  │     → Dark mode: all CSS variables correct       │
  │     → No hardcoded Tailwind color classes        │
  │                                                 │
  └─────────────────────────────────────────────────┘

  MainBuilderView.tsx ← can now be archived/deleted
```

---

### Session 8: Polish + Verification

```
  Checks:
  ┌─────────────────────────────┐
  │ npm run typecheck    ✅     │
  │ npm run lint         ✅     │
  │ npm test             ✅     │
  │ Light mode visual    ✅     │
  │ Dark mode visual     ✅     │
  │ All modals           ✅     │
  │ Keyboard shortcuts   ✅     │
  │ Phase execution e2e  ✅     │
  │ No re-render loops   ✅     │
  │ Other pages intact   ✅     │
  │   /app/wizard        ✅     │
  │   /app/design        ✅     │
  │   /app/ai-plan       ✅     │
  │   /app/review        ✅     │
  │   /app/dashboard     ✅     │
  └─────────────────────────────┘

  Update MASTER_CONTEXT_VERIFIED.md:
  - New file counts
  - Updated dependency hierarchy
  - BuilderContext.tsx added to critical files
  - Removed files noted
```

---

## Dependency Chain

Sessions must respect this order for anything they depend on:

```
Session 0 ──▶ Session 1 ──▶ Session 2 ──┬──▶ Session 3 ──┐
                                         ├──▶ Session 4 ──┤
                                         ├──▶ Session 5 ──├──▶ Session 7 ──▶ Session 8
                                         └──▶ Session 6 ──┘

 0 must finish before 1 (clean codebase needed)
 1 must finish before 2 (provider needed for shell)
 2 must finish before 3-6 (shell needed for components)
 3-6 are INDEPENDENT (can run in parallel if using separate branches)
 3-6 must ALL finish before 7 (all components needed for integration)
 7 must finish before 8 (integration needed before polish)
```

---

## Future Sessions (Post-Rebuild)

```
Session 8 ──┬──▶ Session 9: Console Intelligence
(rebuild    ├──▶ Session 10: Code Review Pipeline
 complete)  ├──▶ Session 11: Cascading Concept Updates
            ├──▶ Session 12: Inline Code Actions
            ├──▶ Session 13: Persistent Memory
            ├──▶ Session 14: Proactive AI
            └──▶ Session 15: WebContainers Upgrade

  9-15 are mostly independent of each other
  14 benefits from 9 + 10 being done first
  All require the core rebuild (Sessions 0-8) to be complete
```
