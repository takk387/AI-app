# Builder Page Redesign Blueprint

> **This is the master plan for rebuilding the Builder page (`/app`).** This document is for the project owner (Jonathan) and development AIs (Claude, Gemini) working on the codebase. Individual build sessions receive focused briefings extracted from this document — they do NOT read this entire file.

---

## Why We're Rebuilding

`MainBuilderView.tsx` is 1,622 lines acting as a god component — 21 hooks, 85+ store fields, 10 modals, three resizable panels, two chat modes. The result: 30 documented bugs (see `BUILDER_PAGE_TEST_REPORT.md`), mostly features that exist but aren't wired up. The build pipeline doesn't trigger. The modify system isn't connected. The validation suite is never called. The chat has no project context.

We're not patching this. We're rebuilding with clean boundaries, a working pipeline, and a simpler layout.

---

## What Changes

### Layout: Three Panels -> Two Panels

**Current (broken):**

```
[Chat 30%] | [App Concept 25%] | [Preview 45%]
   ^              ^                    ^
   resizable      resizable            resizable
```

**New:**

```
[Left Panel 40%]          |  [Right Panel 60%]
                          |
  Phase Status Bar        |    Preview / Code (tabs)
  ─────────────────       |
  Chat Messages           |    [live app preview]
  AI Responses            |
  Phase Progress Cards    |    or
                          |    [code editor]
  ─────────────────       |
  Input Bar               |    ─────────────────
  [image] [text] [send]   |    Toolbar: undo/redo, export,
                          |    download, deploy, branch
```

App Concept becomes a slide-out drawer. No more resizable sliders — fixed 40/60 split.

### Chat: Two Modes -> One Unified AI

**Current:** PLAN mode (planning only, no code) and ACT mode (code generation only) with a toggle switch. Two separate API endpoints, two system prompts, two completely different behaviors.

**New:** One unified chat. No mode toggle. The AI is a senior full-stack expert that understands the entire project — concept, architecture, design, code. It figures out what you need from your message and routes accordingly. Smart intent detection replaces manual mode switching.

---

## The Chat System (Unified)

### Core Design Principle: Context Engine, Not Rule Engine

The in-app AI's effectiveness depends on receiving the RIGHT context for each message — not ALL context, and not a wall of rules. The BuilderProvider acts as a **context engine** that assembles a focused payload per-message.

**What failed before:** Loading the AI with massive rule files and full project context upfront caused hallucinations, ignored questions, and the AI jumping to code generation unprompted. The AI stopped being conversational and became a broken code cannon.

**What works:** Short system prompt (~30 lines defining persona + intent format). Relevant context injected per-message based on what the user is asking about. Total context stays small. AI responds naturally and accurately.

### Intent Detection

Every user message goes through a lightweight first pass (either the AI's own classification or keyword matching) to determine intent:

| Intent       | What Triggers It                                     | What Happens                                                                                        |
| ------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **QUESTION** | "Why is...", "How does...", "What should..."         | Answer using project context. No code generation.                                                   |
| **BUILD**    | "Build the...", "Create a...", "Start phase 3"       | Route through phase execution pipeline if phase-related, or full-app generation if new component.   |
| **MODIFY**   | "Change the...", "Fix the...", "Update the..."       | Route to `/api/ai-builder/modify` → surgical diff → DiffPreviewModal → user approves → AST applies. |
| **DEBUG**    | "Why is X broken", "This error...", console errors   | Analyze relevant code + error, diagnose, propose fix. If user approves, route as MODIFY.            |
| **CONCEPT**  | "Add dark mode to features", "Change the name to..." | Update appConcept in store. ConceptDrawer reflects change. Optionally flag affected phases.         |
| **CLARIFY**  | Ambiguous request                                    | Ask for detail before acting.                                                                       |

### Context Assembly (Per-Message)

The BuilderProvider does NOT dump everything into every API call. It assembles context based on the detected intent:

```
QUESTION about auth:
  → system prompt (30 lines)
  → project summary (name, stack, 5 lines)
  → auth-related phase context
  → auth-related files (LoginPage.tsx, authService.ts)
  → user's message
  Total: small

BUILD phase 3:
  → system prompt (30 lines)
  → phase 3 context (description, dependencies, what phases 1-2 built)
  → design tokens (colors, typography)
  → layout manifest for phase 3 components
  → user's message
  Total: focused

MODIFY navbar:
  → system prompt (30 lines)
  → current navbar component code
  → design tokens
  → user's message
  Total: minimal

DEBUG "TypeError in Profile":
  → system prompt (30 lines)
  → ProfilePage.tsx code
  → related imports/services
  → console error text
  → user's message
  Total: focused on the problem
```

### System Prompt Design

The in-app AI system prompt is SHORT. ~30 lines. It defines:

1. Persona: "You are a senior full-stack developer working on [appName]. You have deep knowledge of the project's concept, architecture, and codebase."
2. Intent response format (the detection markers)
3. Code output format (delimiters for parsing)
4. One rule: "When asked a question, answer it. Don't generate code unless asked to build or modify something."

That's it. No walls of rules. No checklists. No edge case reminders. The AI already knows how to code. The context engine gives it what it needs. Trust it.

### Message Flow

```
User sends message
  → BuilderProvider.sendMessage(text)
  → Lightweight intent detection (first pass)
  → Assemble context relevant to this intent
  → Route to appropriate endpoint:

    QUESTION → /api/ai-builder (with focused context)
              → Display answer in chat

    BUILD → Is this phase-related?
      YES → useDynamicBuildPhases.executePhase(N)
            → Phase pipeline: generation → validation → integrity checks
            → PhaseCompletionCard in MessageList
            → Preview updates
      NO  → /api/ai-builder/full-app-stream
            → Generate code → Preview updates

    MODIFY → /api/ai-builder/modify
            → Get surgical diff
            → DiffPreviewModal
            → User approves → AST modifier applies
            → Preview updates → Version snapshot

    DEBUG → /api/ai-builder (with error context + relevant code)
          → AI diagnoses issue
          → If fix proposed → user approves → route as MODIFY

    CONCEPT → Update appConcept in store
            → ConceptDrawer reflects change
            → Flag affected phases (optional)

    CLARIFY → Display question in chat
```

### What This Fixes (from Bug Report)

| Bug #   | Issue                        | Fix                                                                   |
| ------- | ---------------------------- | --------------------------------------------------------------------- |
| 1, 3    | Chat has no project context  | Context engine injects relevant project data per-message              |
| 4, 5, 6 | Build buttons broken         | "Build phase N" in chat triggers phase execution pipeline directly    |
| 7       | Silent failures              | Toast feedback on every action through BuilderProvider                |
| 8       | Modify disconnected          | MODIFY intent routes to `/api/ai-builder/modify`, not full-app-stream |
| 10      | AST dead                     | Modify route already calls AST executor — fixed by routing correctly  |
| 11      | Phase integrity never called | BuilderProvider runs validation after each phase completion           |
| 30      | Design tokens not fed to AI  | Context engine includes design tokens in BUILD/MODIFY payloads        |

---

## Keep vs Toss vs Rebuild

### KEEP (use as-is or with minor updates)

| What                                              | Why                                                                                         | Lines  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| `useAppStore.ts`                                  | Central state works fine. Don't touch slices.                                               | ~500   |
| `TitanPipelineService.ts`                         | Core pipeline logic is solid                                                                | ~1,074 |
| `PhaseExecutionManager.ts`                        | Phase lifecycle state machine works                                                         | ~832   |
| `useDynamicBuildPhases.ts`                        | Phase execution hook, needs minor wiring                                                    | ~700   |
| `useVersionControl.ts`                            | Undo/redo works                                                                             | ~388   |
| `useDatabaseSync.ts`                              | App persistence works                                                                       | ~318   |
| `useKeyboardShortcuts.ts`                         | Ctrl+S/Z/Y works                                                                            | ~432   |
| `useCodeReview.ts`                                | **Defer wiring.** AI-powered quality gate — wire into phase completion in a future session. | ~340   |
| All services in `src/services/`                   | Business logic layer is fine                                                                | varies |
| All types in `src/types/`                         | Type definitions stay                                                                       | varies |
| All API routes in `src/app/api/`                  | SSE streaming routes work                                                                   | varies |
| `GeminiLayoutCritique.ts`                         | Vision critique works                                                                       | ~286   |
| `VisionLoopEngine.ts`                             | Self-healing loop works                                                                     | varies |
| Review page components (`src/components/review/`) | Separate page, not part of this rebuild                                                     | ~2,419 |

### TOSS (delete)

| What                             | Why                            | Lines Saved |
| -------------------------------- | ------------------------------ | ----------- |
| `src/agents/` (entire directory) | Dead code, zero callers        | ~1,320      |
| `useBrowserSupport.ts`           | Unused hook                    | ~106        |
| `useSmartContext.ts`             | Dead code, never used          | ~399        |
| `BrowserPreviewService.ts`       | Replaced by Sandpack + Nodebox | varies      |
| `BrowserPreview.tsx`             | Replaced by Sandpack + Nodebox | varies      |
| `ResizablePanelGroup.tsx`        | No more resizable panels       | ~337        |
| `ResizablePanel.tsx`             | No more resizable panels       | ~102        |
| `ResizableHandle.tsx`            | No more resizable panels       | ~195        |
| `useResizable.ts` (hook)         | No more resizable panels       | varies      |
| `panelPersistence.ts` (util)     | No more resizable panels       | varies      |

### REBUILD (new components replacing old ones)

| Old                                        | New                               | Why                                       |
| ------------------------------------------ | --------------------------------- | ----------------------------------------- |
| `MainBuilderView.tsx` (1,622 lines)        | `BuilderPage.tsx` (~200 lines)    | Thin shell, delegates everything          |
| `ChatPanel.tsx` (517 lines)                | `ChatPanel.tsx` (~300 lines)      | Simpler, context-aware, no mode toggle    |
| `AppConceptPanel.tsx` (446 lines)          | `ConceptDrawer.tsx` (~250 lines)  | Slide-out drawer instead of panel         |
| `PreviewPanel.tsx` (278 lines)             | `PreviewPanel.tsx` (~200 lines)   | Sandpack + Nodebox, working toolbar       |
| Phase UI scattered across files            | `PhaseStatusBar.tsx` (~150 lines) | Compact top bar                           |
| 10 modal orchestrations in MainBuilderView | `ModalManager.tsx` (~100 lines)   | Centralized modal state                   |
| PLAN/ACT mode toggle                       | (removed)                         | Single unified chat with intent detection |

---

## New Component Architecture

### Component Tree

```
BuilderPage (thin shell ~200 lines)
├── BuilderProvider (context engine + hook orchestration)
│
├── LeftPanel (fixed 40%)
│   ├── PanelHeader
│   │   ├── App Name
│   │   └── Concept Drawer Toggle Button
│   ├── PhaseStatusBar (compact, visible when build active)
│   │   ├── Current phase indicator
│   │   ├── Progress (e.g., "Phase 2 of 5")
│   │   └── Controls: pause / resume / skip
│   ├── MessageList (scrollable)
│   │   ├── UserMessage
│   │   ├── AssistantMessage (with streaming)
│   │   ├── SystemMessage
│   │   └── PhaseCompletionCard
│   └── InputBar
│       ├── Image Upload Button
│       ├── Text Input
│       └── Send Button
│
├── RightPanel (fixed 60%)
│   ├── PreviewToolbar
│   │   ├── Tab: Preview / Code
│   │   ├── Undo / Redo (with counts)
│   │   ├── Branch Selector
│   │   ├── Export Button
│   │   ├── Download Button
│   │   └── Deploy Button
│   └── PreviewContent
│       ├── LivePreview (Sandpack + Nodebox) [when Preview tab]
│       └── CodeEditor [when Code tab]
│
├── ConceptDrawer (slide-out overlay)
│   ├── App concept fields (always editable)
│   ├── Feature list
│   ├── Tech stack
│   └── Phase plan (clickable phases -> PhaseDetailModal)
│
└── ModalManager
    ├── PhaseDetailModal
    ├── ExportModal
    ├── VersionHistoryModal
    ├── DiffPreviewModal
    ├── NameAppModal
    ├── ShareModal
    └── CreateBranchModal
```

### BuilderProvider (Context Engine)

The heart of the rebuild. Replaces MainBuilderView's 21 hook calls and 85+ store destructures. Every child component accesses state via `useBuilder()`.

```typescript
interface BuilderContextValue {
  // Chat (unified — no mode toggle)
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isGenerating: boolean;
  generationProgress: string;
  lastIntent: IntentType | null;

  // Phases
  phases: DynamicPhase[];
  currentPhase: DynamicPhase | null;
  phaseProgress: BuildProgress;
  isBuilding: boolean;
  isPaused: boolean;
  startBuilding: () => void;
  pauseBuild: () => void;
  resumeBuild: () => void;
  skipPhase: (n: number) => void;
  retryPhase: (n: number) => void;

  // Preview
  currentComponent: GeneratedComponent | null;
  activeTab: 'preview' | 'code';
  setActiveTab: (tab: 'preview' | 'code') => void;
  consoleErrors: ConsoleEntry[];

  // Version Control
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Concept
  appConcept: AppConcept | null;
  updateConcept: (path: string, value: unknown) => void;

  // Actions
  exportApp: () => void;
  downloadCode: () => void;
  deployApp: () => void;
  uploadImage: (file: File) => void;
  capturePreview: () => Promise<void>;

  // Modals
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  activeModal: ModalType | null;

  // Concept Drawer
  isConceptDrawerOpen: boolean;
  toggleConceptDrawer: () => void;

  // Debug (developer-only)
  debugLog: DebugEntry[];
}

type IntentType = 'QUESTION' | 'BUILD' | 'MODIFY' | 'DEBUG' | 'CONCEPT' | 'CLARIFY';
```

### Context Engine Internals (Session 1 Implementation Detail)

The BuilderProvider's `sendMessage` function follows this internal flow:

```typescript
async function sendMessage(text: string) {
  // 1. Add user message to chat
  addMessage({ role: 'user', content: text });

  // 2. Lightweight intent detection
  //    - Check for explicit phase references ("build phase 3")
  //    - Check for modify keywords ("change", "fix", "update" + existing component reference)
  //    - Check for debug keywords ("error", "broken", "not working" + error context)
  //    - Check for concept keywords ("add feature", "rename", "change the name")
  //    - Default: let the AI endpoint classify it
  const intent = detectIntent(text, { consoleErrors, currentPhase, appConcept });

  // 3. Assemble context based on intent
  const context = assembleContext(intent, text, {
    appConcept, // always include summary (5 lines)
    phases, // include relevant phase(s) only
    currentFiles, // include files relevant to the intent
    designTokens, // include for BUILD/MODIFY
    consoleErrors, // include for DEBUG
  });

  // 4. Route to appropriate handler
  switch (intent) {
    case 'BUILD':
      if (isPhaseReference(text)) {
        await executePhase(extractPhaseNumber(text));
      } else {
        await streamBuild(context);
      }
      break;
    case 'MODIFY':
      await requestModification(context); // → /api/ai-builder/modify → DiffPreviewModal
      break;
    case 'DEBUG':
      await requestDiagnosis(context); // → AI analyzes, proposes fix
      break;
    case 'CONCEPT':
      await updateConceptFromChat(text); // → parse and update store
      break;
    default:
      await sendToAI(context); // → /api/ai-builder (question/clarify)
  }

  // 5. Track for debug panel
  trackAPIRequest({ intent, tokensUsed, duration });
}
```

---

## Theme System

**Every component in this rebuild uses CSS variables for colors, Tailwind for layout only.**

| Instead of         | Use                                              |
| ------------------ | ------------------------------------------------ |
| `bg-slate-900`     | `style={{ background: 'var(--bg-primary)' }}`    |
| `bg-slate-800`     | `style={{ background: 'var(--bg-secondary)' }}`  |
| `bg-slate-700`     | `style={{ background: 'var(--bg-tertiary)' }}`   |
| `text-white`       | `style={{ color: 'var(--text-primary)' }}`       |
| `text-slate-400`   | `style={{ color: 'var(--text-muted)' }}`         |
| `text-slate-300`   | `style={{ color: 'var(--text-secondary)' }}`     |
| `border-white/10`  | `style={{ borderColor: 'var(--border-color)' }}` |
| `border-slate-700` | `style={{ borderColor: 'var(--border-light)' }}` |

See `BUILDER_PAGE_TEST_REPORT.md` "Redesign Note: Theme System" for full details including semantic variable aliases to add to `globals.css`.

---

## Session Breakdown

### How Sessions Work

Each session gets a **focused briefing document** (1-2 pages) — NOT this blueprint, NOT CLAUDE.md, NOT MASTER_CONTEXT. The briefing contains only:

1. What you're building (component contract, ~20 lines)
2. What files to read (2-3 specific files this component integrates with)
3. Rules that matter for THIS component (~5 bullet points)
4. What NOT to touch (explicit boundaries)
5. How to verify (specific commands)

This prevents the context overload problem where AIs hallucinate from reading too many rules before writing any code. Heavy rules (CLAUDE.md, thorough-coding) are for development AIs doing risky work (store changes, type changes, service modifications). Contained UI sessions get light briefings.

### Session 0: Cleanup & Prep

**Scope:** Delete dead code, create file structure

- Delete `src/agents/` directory
- Delete `useBrowserSupport.ts`, `useSmartContext.ts`
- Delete `BrowserPreview.tsx`, `BrowserPreviewService.ts`
- Create empty files for new components (so imports resolve in later sessions)
- Add semantic CSS variable aliases to `globals.css`
- Estimated effort: Small

### Session 1: BuilderProvider (Context Engine)

**Scope:** The context provider + context engine that replaces MainBuilderView's orchestration

- Create `src/contexts/BuilderContext.tsx`
- Implement `BuilderContextValue` interface
- Implement context engine: `detectIntent()`, `assembleContext()`, message routing
- Call existing hooks internally (phase execution, version control, database sync, etc.)
- Handle phase execution lifecycle
- Handle modify detection and routing to `/api/ai-builder/modify`
- Run phase integrity checks on completion
- Wire Debug Panel tracking: `trackAPIRequest()`, `trackTokenUsage()`, `trackSSEEvent()`
- Wire `useProjectDocumentation` for auto-capture on concept changes
- **No UI in this session.** Provider only.
- **This is the hardest session.** Briefing should include: current `useSendMessage.ts`, `useSendMessageHandlers.ts`, `useDynamicBuildPhases.ts`, `builderExpertPrompt.ts`, and the BuilderContextValue interface from this blueprint.
- Estimated effort: Large

### Session 2: BuilderPage Shell + ModalManager

**Scope:** Thin outer shell and modal coordination

- Create `src/components/builder/BuilderPage.tsx` (~200 lines)
- Wrap in `<BuilderProvider>`
- Two-panel layout (CSS grid, fixed 40/60, no resize library)
- Create `src/components/builder/ModalManager.tsx`
- Centralized modal state, render all modals with CSS variable theming
- Estimated effort: Medium

### Session 3: LeftPanel + InputBar

**Scope:** Chat area, input, image upload

- Create `LeftPanel.tsx`, `PanelHeader.tsx`, `MessageList.tsx`, `InputBar.tsx`
- PanelHeader: app name + concept drawer toggle (no mode toggle)
- MessageList: auto-scroll, renders UserMessage/AssistantMessage/SystemMessage/PhaseCompletionCard
- InputBar: text input, image upload, send button. Enter to send, Shift+Enter for newline.
- All use `useBuilder()` — zero prop drilling
- CSS variable theming
- Estimated effort: Medium

### Session 4: PhaseStatusBar

**Scope:** Compact phase progress and controls

- Create `PhaseStatusBar.tsx`
- Compact single-bar: current phase label, "Phase X of Y", progress, pause/resume/skip
- Only visible when a build is active
- Toast feedback on all actions
- Estimated effort: Small

### Session 5: PreviewPanel + Toolbar

**Scope:** Right panel with preview and code tabs

- Create `PreviewPanel.tsx`, `PreviewToolbar.tsx`
- Configure Sandpack with Nodebox runtime
- Tabs: Preview / Code. Code tab: file tree + viewer (not raw JSON dump)
- Toolbar: undo/redo (with counts), export, download, deploy, branch selector
- Pipe Sandpack console errors to BuilderProvider (`consoleErrors`)
- Toast feedback on all actions
- Delete old `BrowserPreview.tsx` and `BrowserPreviewService.ts` if not done in Session 0
- CSS variable theming
- Estimated effort: Medium

### Session 6: ConceptDrawer

**Scope:** Slide-out drawer replacing the middle panel

- Create `ConceptDrawer.tsx`
- Slides in from left, overlays content (doesn't push layout)
- Always editable (no read-only mode — unified chat means no mode distinction)
- Contains: concept fields, features, tech stack, phase plan
- Clickable phases open PhaseDetailModal via ModalManager
- Toggle from PanelHeader button
- CSS variable theming
- Estimated effort: Medium

### Session 7: Integration + Route Swap

**Scope:** Wire it all together, swap the route

- Update `src/app/(protected)/app/page.tsx` to render `BuilderPage` instead of `MainBuilderView`
- Integration test: send question → get context-aware answer
- Integration test: "build phase 1" → phase execution → preview updates
- Integration test: "change the navbar color" → modify → diff preview → apply
- Integration test: all toolbar buttons produce visible feedback
- Integration test: concept drawer opens, edits persist
- Fix any broken wiring
- Estimated effort: Medium-Large

### Session 8: Polish + Verification

**Scope:** Final pass

- `npm run typecheck`, `npm run lint`, `npm test`
- Visual test light mode and dark mode (CSS variables)
- All modals open/close correctly
- Keyboard shortcuts work
- Phase execution end-to-end
- Performance: no unnecessary re-renders
- Update `MASTER_CONTEXT_VERIFIED.md` with new file counts
- Estimated effort: Medium

---

## Component Contracts

These are the exact interfaces each session must implement.

### BuilderPage

```typescript
// No props. Wraps everything in BuilderProvider.
// Renders: LeftPanel, RightPanel, ConceptDrawer, ModalManager
export default function BuilderPage(): JSX.Element;
```

### LeftPanel

```typescript
// No props. Uses useBuilder().
// Renders: PanelHeader, PhaseStatusBar (conditional), MessageList, InputBar
export function LeftPanel(): JSX.Element;
```

### PanelHeader

```typescript
// No props. Uses useBuilder() for appConcept, toggleConceptDrawer.
// Renders: app name, concept drawer button. NO mode toggle.
export function PanelHeader(): JSX.Element;
```

### PhaseStatusBar

```typescript
// No props. Uses useBuilder() for phase state.
// Only renders when phases.length > 0 && isBuilding
// Shows: current phase label, "Phase X of Y", progress bar, pause/resume/skip
export function PhaseStatusBar(): JSX.Element;
```

### MessageList

```typescript
// No props. Uses useBuilder() for messages, isGenerating, generationProgress.
// Auto-scrolls on new messages.
// Renders: UserMessage, AssistantMessage, SystemMessage, PhaseCompletionCard
export function MessageList(): JSX.Element;
```

### InputBar

```typescript
// No props. Uses useBuilder() for sendMessage, uploadImage, isGenerating.
// Enter to send, Shift+Enter for newline. Send disabled when isGenerating.
export function InputBar(): JSX.Element;
```

### PreviewPanel

```typescript
// No props. Uses useBuilder() for currentComponent, activeTab, consoleErrors.
// Renders: PreviewToolbar, content area (Sandpack+Nodebox or CodeEditor based on tab)
export function PreviewPanel(): JSX.Element;
```

### PreviewToolbar

```typescript
// No props. Uses useBuilder() for all actions and state.
// Renders: tab buttons, undo/redo, branch, export, download, deploy
export function PreviewToolbar(): JSX.Element;
```

### ConceptDrawer

```typescript
// No props. Uses useBuilder() for appConcept, isConceptDrawerOpen, toggleConceptDrawer, phases.
// Renders: slide-out overlay with editable concept fields, features, tech, phases
export function ConceptDrawer(): JSX.Element;
```

### ModalManager

```typescript
// No props. Uses useBuilder() for activeModal, closeModal.
// Conditionally renders the active modal component.
export function ModalManager(): JSX.Element;
```

---

## File Structure (New)

```
src/components/builder/          # NEW directory
├── BuilderPage.tsx              # Thin shell (Session 2)
├── LeftPanel.tsx                # Chat side (Session 3)
├── PanelHeader.tsx              # App name, drawer toggle (Session 3)
├── MessageList.tsx              # Chat messages (Session 3)
├── InputBar.tsx                 # Text + image input (Session 3)
├── PhaseStatusBar.tsx           # Phase progress (Session 4)
├── PreviewPanel.tsx             # Preview + code (Session 5)
├── PreviewToolbar.tsx           # Action buttons (Session 5)
├── ConceptDrawer.tsx            # Slide-out concept view (Session 6)
├── ModalManager.tsx             # Modal orchestration (Session 2)
└── index.ts                     # Re-exports

src/contexts/
├── BuilderContext.tsx            # NEW: context engine (Session 1)
└── ... (existing contexts unchanged)
```

---

## Resolved Decisions

| Decision                    | Resolution                                                        | Reasoning                                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chat modes**              | **Single unified chat.** No PLAN/ACT toggle.                      | Intent detection handles everything. Two modes was artificial — users don't think in modes. Bolt/Lovable/v0 all use single chat.                                    |
| **useSmartContext**         | **Remove entirely.**                                              | Dead code — imported but return value never used. Add semantic memory in a future session.                                                                          |
| **useCodeReview**           | **Keep file, defer wiring.**                                      | Good code, useful feature. Wire into phase completion in a future session after core works.                                                                         |
| **useProjectDocumentation** | **Keep, wire into BuilderProvider.**                              | Works correctly, low complexity.                                                                                                                                    |
| **Element Inspector**       | **Defer to future session.**                                      | Power-user feature. Add after core pipeline works.                                                                                                                  |
| **Preview Engine**          | **Sandpack with Nodebox.** Delete BrowserPreview.                 | Design page already uses Sandpack. Titan pipeline outputs Sandpack-compatible code. Nodebox adds server-side preview. Upgrade to WebContainers in a future session. |
| **Debug Panel**             | **Include.** Wire into BuilderProvider.                           | Tracks API requests, token usage, SSE events. Useful during rebuild.                                                                                                |
| **In-app AI prompt**        | **Short (~30 lines).** Context injected per-message, not upfront. | Prevents hallucination from context overload.                                                                                                                       |
| **Session briefings**       | **Focused 1-2 page docs per session.** NOT the full blueprint.    | Prevents build session AIs from drowning in context.                                                                                                                |

### Preview Engine Upgrade Path

```
Current (this rebuild):  Sandpack + Nodebox
  → Server-side preview (Next.js API routes in browser)
  → All browsers including Safari/iOS
  → No special HTTP headers
  → HMR with 500ms hot start

Future upgrade:          WebContainers (StackBlitz)
  → Full Node.js runtime in browser (what Bolt.new uses)
  → Real npm, real dev server, real terminal
  → Requires COEP/COOP headers (audit external resources first)
  → PreviewPanel API stays the same — only renderer swaps
```

---

## Future Roadmap (Post-Rebuild)

These features are designed to plug into the BuilderProvider architecture without restructuring:

| Session | Feature                   | What It Does                                                                                                                  | Depends On                             |
| ------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 9       | Console Intelligence      | Pipe Sandpack errors into chat. AI analyzes, suggests fixes. Basic proactive: "I see an error, want me to fix it?"            | Core rebuild complete                  |
| 10      | Code Review Pipeline      | Wire `useCodeReview` into phase completion. Quality gates + score display in PhaseCompletionCards.                            | Core rebuild complete                  |
| 11      | Cascading Concept Updates | "Change auth to OAuth" → identify affected phases → re-execute selectively. Needs concept diff engine + phase dependency map. | Core rebuild + concept updates working |
| 12      | Inline Code Actions       | Select code in Code tab → "explain/optimize/fix this." Context-aware of what user is looking at.                              | Code tab built (Session 5)             |
| 13      | Persistent Memory         | Project memory in Supabase. Decisions, preferences, progress stored across sessions. Cross-session context.                   | Core rebuild complete                  |
| 14      | Proactive AI              | Background analysis: architecture drift, accessibility issues, performance problems. Throttled suggestions.                   | Console Intelligence + Code Review     |
| 15      | WebContainers Upgrade     | Swap Sandpack+Nodebox for WebContainers. Full Node.js in browser. Requires COEP/COOP header audit.                            | Core rebuild stable                    |

---

## Rules for Every Session

1. **Read your session briefing only.** Not this blueprint. Not CLAUDE.md. Not MASTER_CONTEXT.
2. **Build only your assigned scope.** Don't touch other components.
3. **Use `useBuilder()` for all data.** No direct store access in components. No prop drilling.
4. **CSS variables for colors.** Tailwind for layout only.
5. **Toast feedback for every user action.** No silent failures.
6. **Run `npm run typecheck` and `npm run lint` before done.**
7. **Don't modify existing services or types.** This rebuild is UI-layer only.
8. **Keep `MainBuilderView.tsx` until Session 7.** Don't delete early.

---

## Success Criteria

When this rebuild is complete:

- [ ] Two-panel layout renders correctly (40/60 split)
- [ ] Unified chat: user can ask questions, get context-aware answers
- [ ] Unified chat: "build phase N" triggers phase execution pipeline
- [ ] Unified chat: modify requests route through `/api/ai-builder/modify` with diff preview
- [ ] Unified chat: debug requests analyze code and propose fixes
- [ ] Unified chat: concept updates via chat reflect in ConceptDrawer and store
- [ ] Phase progress displays in PhaseStatusBar and MessageList
- [ ] Phase integrity checks run after each phase completion
- [ ] All toolbar buttons work: undo, redo, export, download, deploy
- [ ] ConceptDrawer opens/closes without layout shift, edits persist
- [ ] All modals open/close correctly
- [ ] Light mode and dark mode both work (CSS variables)
- [ ] No regressions in other pages (wizard, design, ai-plan, review)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] No hallucination-inducing context bloat in AI system prompt
