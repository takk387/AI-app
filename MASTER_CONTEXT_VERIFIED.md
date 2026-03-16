# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: This file provides full project context for Antigravity, Claude Code, and other AI tools.
> **Status**: VERIFIED (Mar 15, 2026 — 5 builder state bugs fixed, store v6 migration, mode persistence, streaming timeouts, stale session cleanup)

---

## Quick Stats

| Metric               | Previous | Verified (Actual) |
| -------------------- | -------- | ----------------- |
| TypeScript/TSX Files | 613      | **621**           |
| API Route Handlers   | 66       | **66**            |
| Custom Hooks         | 43       | **42**            |
| Service Classes      | 86       | **86**            |
| Type Definitions     | ~13,930  | **~14,200 lines** |
| Utilities            | ~25,047  | **~25,068 lines** |

**Stack**: Next.js 15.5 / React 19 / TypeScript / Tailwind CSS / Zustand 4.5 / Supabase / Tree-sitter

---

## System Architecture Flow (5-Step Page Navigation)

```
Step 1: /app/wizard (NaturalConversationWizard)
    → User builds AppConcept via natural conversation
    → Architecture generation enriches concept context
    → Navigates to /app/design
    ↓
Step 2: /app/design (LayoutBuilderView)
    → User uploads reference images / sketches
    → Gemini Vision analyzes layout (GeminiLayoutCritique for healing)
    → GENERATE mode: creates full layout from AppConcept alone (no images)
    → Self-healing vision loop refines components
    → Layout saved to Zustand store
    → Background intelligence gathering starts (useBackgroundIntelligence)
    → Navigates to /app/ai-plan
    ↓
Step 3: /app/ai-plan (AIPlanPage)
    → Dual AI Planning Pipeline (BackgroundPlanningOrchestrator)
    → Stage 1: Layout Analysis → Stage 2: Intelligence Gathering
    → Stage 3: Parallel Architecture (Claude + Gemini)
    → Stage 4: Consensus Negotiation → Stage 5: Dual Validation
    → User can escalate disagreements (ConsensusEscalationDialog)
    → Architecture result saved to store (dualArchitectureResult)
    → Navigates to /app/review
    ↓
Step 4: /app/review (ReviewPage - 14 components)
    → User reviews concept, features, phases, layout, AI plan, settings
    → Phase plan regenerated with architecture context if available
    → "Build App" triggers Titan Pipeline
    → Navigates to /app
    ↓
Step 5: /app (BuilderPage + BuilderContext)
    → BuilderContext.tsx: single provider wrapping 16 hooks, intent detection, context assembly
    → BuilderPage.tsx: CSS grid shell (40/60) with LeftPanel + PreviewPanel
    → Intent routing: BUILD → full-app-stream, MODIFY → /api/ai-builder/modify (diff preview)
    → Phase execution via useDynamicBuildPhases + usePhaseExecution
    → Sandpack + Nodebox preview with error boundary
    → Version history, undo/redo, ConceptDrawer, ModalManager
```

**Key Data Persistence Points (Zustand + localStorage):**

- `appConcept` - Created in Wizard (Step 1), used throughout
- `dynamicPhasePlan` - Generated in Review (Step 4) with architecture context (fallback generation if AI Plan skipped)
- `layoutBuilderFiles` - Created in Design (Step 2), injected in Phase 1 (Step 5)
- `currentLayoutManifest` - Created in Design (Step 2), synthetic manifest for GENERATE mode
- `currentDesignSpec` - Extracted from images in Design (Step 2)
- `cachedIntelligence` - Pre-cached in Design (Step 2), consumed by AI Plan (Step 3)
- `dualArchitectureResult` - Created in AI Plan (Step 3), used for phase regeneration (Step 4)
- `components` / `currentComponent` - Generated code, persists across navigation

---

## Titan Pipeline (Updated Feb 8, 2026)

Core agentic pipeline for transforming visual sources (images/sketches) + instructions into generated React/Tailwind code.

```
Input (Images + Instructions) → Router (Intent Analysis + MergeStrategy)
    ↓
Surveyor (Gemini Vision → VisualManifest[])
    ↓
Architect → Currently bypassed (returns null)
    ↓
Physicist → Currently bypassed (returns null)
    ↓
[MERGE/EDIT only] Photographer (Gemini Image Generation → Asset URLs)
    ↓
Builder (Gemini → React/Tailwind Code)
    ↓
Self-Healing Vision Loop (Screenshot → Critique → Fix → Repeat)

CREATE mode shortcut: Router → Surveyor → Builder → Healing Loop
  (Skips Photographer/extraction/merge — Gemini handles pixel-perfect
   replication from manifest + original image directly)
```

**Key Files:**

- `src/services/TitanPipelineService.ts` (~497 lines) - Main pipeline orchestrator
- `src/services/GeminiLayoutCritique.ts` (~286 lines) - Vision critique for healing loop (new SDK + code execution)
- `src/services/GeminiImageService.ts` (~122 lines) - Multimodal image generation (new SDK)
- `src/services/AppImageGenerator.ts` (~277 lines) - Image generation + Supabase upload
- `src/services/AssetExtractionService.ts` (~276 lines) - Sharp-based image cropping
- `src/services/VisionLoopEngine.ts` (~504 lines) - Self-healing vision loop
- `src/services/LayoutAutoFixEngine.ts` (~576 lines) - Auto-fix from AI critique
- `src/types/titanPipeline.ts` (~267 lines) - Pipeline types
- `src/types/layoutAnalysis.ts` (~191 lines) - Critique/healing types
- `src/utils/layoutValidation.ts` (~1,144 lines) - Zod schema validation

**Pipeline Steps:**
| Step | Model | Purpose |
|------|-------|---------|
| Router | Gemini Flash | Intent analysis, MergeStrategy (CREATE/MERGE/EDIT), reference image detection |
| Surveyor | Gemini Flash + Agentic Vision | Vision analysis, UI reverse engineering → VisualManifest[] (uses @google/genai SDK) |
| Architect | Bypassed | (Placeholder for future component structure generation) |
| Physicist | Bypassed | (Placeholder for future motion/animation extraction) |
| Photographer | Gemini Pro | Multimodal asset generation (text-only or reference image) |
| Builder | Gemini Pro | Code synthesis with multimodal input (image + manifest + assets) |

---

## Agents Architecture (Added Feb 1, 2026)

New agentic architecture for code transformation and deployment workflows.

**Key Files:**

| File                    | Lines | Purpose                          |
| ----------------------- | ----- | -------------------------------- |
| `CodeTransformAgent.ts` | 437   | AST-based code transformations   |
| `DeploymentAgent.ts`    | 444   | Deployment workflow orchestrator |
| `types.ts`              | 393   | Agent type definitions           |
| `index.ts`              | 46    | Agent exports                    |

**Location:** `src/agents/`

---

## Motion & Effects System (Added Jan 31, 2026)

New animation and visual effects infrastructure.

**Services:**

- `src/services/MotionMapper.ts` (350 lines) - Maps motion configurations to CSS/animations
- `src/services/SourceMergeEngine.ts` (322 lines) - Merges multiple visual sources

**Components:**

- `src/components/effects/CSSParticleEffect.tsx` (192 lines) - CSS-based particle effects
- `src/components/effects/VisualEffectRenderer.tsx` (95 lines) - Effect rendering
- `src/components/layout-builder/KeyframeInjector.tsx` (185 lines) - CSS keyframe injection

**Types:**

- `src/types/motionConfig.ts` (98 lines) - Motion configuration types
- `src/types/mediaSource.ts` (58 lines) - Media source handling types
- `src/types/manipulation.ts` (55 lines) - DOM/element manipulation types
- `src/types/componentManagement.ts` (28 lines) - Component lifecycle types

**Utilities:**

- `src/utils/snapEngine.ts` (197 lines) - Snap-to-grid alignment engine
- `src/utils/inspectorBridge.ts` (175 lines) - Inspector communication bridge
- `src/utils/responsiveTypography.ts` (119 lines) - Responsive text sizing

---

## Dependency Hierarchy

### TIER 1: UNIVERSAL (20+ dependents) — EXTREME CAUTION

| File                      | Dependents   | Impact                                                          |
| ------------------------- | ------------ | --------------------------------------------------------------- |
| `types/appConcept.ts`     | **51 files** | **CRITICAL** - Foundation of the entire app (38 direct imports) |
| `useAppStore.ts`          | **24 files** | CRITICAL - breaks centralized state                             |
| `types/aiBuilderTypes.ts` | 33 files     | HIGH                                                            |
| `types/dynamicPhases.ts`  | 31 files     | HIGH                                                            |

### TIER 2: MAJOR SERVICES (5-19 dependents)

| File                        | Dependents   | Notes                               |
| --------------------------- | ------------ | ----------------------------------- |
| `BuilderContext.tsx`        | **11 files** | Builder provider (wraps 16 hooks)   |
| `types/codeReview.ts`       | **15 files** | Validation layer types              |
| `DynamicPhaseGenerator.ts`  | ~8 files     | Core planning engine (685 lines)    |
| `PhaseExecutionManager.ts`  | ~4 files     | Core execution engine (779 lines)   |
| `GeminiLayoutCritique.ts`   | ~2 files     | Vision critique service (286 lines) |
| Deployment services cluster | 10+ files    |                                     |

### TIER 3: PIPELINE & PLANNING SERVICES (1-3 dependents each)

| File                                | Lines | Notes                             |
| ----------------------------------- | ----- | --------------------------------- |
| `TitanPipelineService.ts`           | 497   | Titan Pipeline orchestrator       |
| `BackgroundPlanningOrchestrator.ts` | 640   | Dual AI 5-stage pipeline          |
| `LiveIntelligenceGatherer.ts`       | 606   | Web search + AI intelligence      |
| `ConsensusNegotiator.ts`            | 571   | Claude-Gemini consensus           |
| `DualValidationOrchestrator.ts`     | 300   | Cross-validation of architectures |
| `MotionMapper.ts`                   | 350   | Animation mapping                 |
| `SourceMergeEngine.ts`              | 322   | Multi-source merging              |
| `GeminiLayoutCritique.ts`           | 286   | Vision critique (new SDK)         |

### TIER 4: HOOKS & COMPONENTS (1-3 dependents each)

Lower risk, but still follow patterns.

- `types/designSpec.ts` (Design System Specs)
- `types/titanPipeline.ts` (Pipeline Types - NEW)
- `types/motionConfig.ts` (Motion Types - NEW)
- `utils/colorUtils.ts` (Color Utilities)
- `services/GeminiLayoutCritique.ts` (Vision critique - new SDK)

---

## Critical Files — DO NOT BREAK

| File                            | Lines     | Purpose                                      | Risk                 |
| ------------------------------- | --------- | -------------------------------------------- | -------------------- |
| `useAppStore.ts`                | **977**   | Centralized Zustand state (10 slices, v6)    | 24+ files break      |
| `types/layoutDesign/` (dir)     | **3,343** | Design type system (8 files, split from 3k)  | 14+ files break      |
| `middleware.ts`                 | **87**    | Auth flow for all routes                     | Auth breaks          |
| `CodeParser.ts`                 | **1,070** | AST parsing engine                           | Code analysis breaks |
| `BuilderContext.tsx`            | **977**   | Builder provider — 16 hooks, intent routing  | Builder UI breaks    |
| `MainBuilderView.tsx`           | **940**   | Legacy orchestrator (kept as reference)      | Unused               |
| `PhaseExecutionManager.ts`      | **832**   | Phase execution orchestrator (from 2.1k)     | Build system breaks  |
| `NaturalConversationWizard.tsx` | **751**   | Conversation wizard UI                       | Planning breaks      |
| `DynamicPhaseGenerator.ts`      | **685**   | Phase planning engine (refactored from 2.7k) | Build system breaks  |
| `useDynamicBuildPhases.ts`      | **700**   | Phase execution hook                         | Build UI breaks      |
| `TitanPipelineService.ts`       | **497**   | Titan Pipeline orchestrator                  | Pipeline breaks      |

---

## Import Rules — MUST FOLLOW

```
Components  → Hooks, Types, Utils       ✅ ALLOWED
Hooks       → Store, Services, Types    ✅ ALLOWED
Services    → Types, Utils              ✅ ALLOWED
Services    → Other Services            ✅ ALLOWED (via dependency injection or direct import)
Types       → Other Types only          ✅ ALLOWED

CIRCULAR Dependencies                   ❌ FORBIDDEN (A→B→A is never allowed)
Components  → Services directly         ❌ FORBIDDEN (use hooks as intermediary)
Hooks       → Other Hooks               ⚠️ CAUTION (allowed if no circular, prefer composition)
```

**Service Composition Guidelines:**

- ✅ Services CAN import other services for composition
- ✅ Use dependency injection where practical
- ❌ NO circular dependencies (ServiceA → ServiceB → ServiceA)
- ❌ NO deep chains (limit to 2-3 levels of service nesting)

**Current Status**: ✅ Clean architecture, no circular dependencies detected.

---

## Architecture Rules

1. **SSE streaming** for all code generation
2. **Zustand selectors** with `shallow` comparison for performance
3. **AST-based code modifications** via Tree-sitter — NOT string manipulation
4. **Phase integrity checks** (P1-P9) must pass across boundaries
5. **Client-heavy architecture** — most logic runs in browser to reduce server costs
6. **Serverless API routes** — thin proxies to AI providers and Supabase
7. **Lazy loading** for heavy services (CodeReviewService)
8. **Agentic pipelines** — TitanPipeline for multi-step AI orchestration (NEW)
9. **Railway deployment** — app deploys to Railway; use `getBaseUrl()` from `@/lib/getBaseUrl` for internal API URLs, `createSSEResponse()` from `@/lib/createSSEResponse` for all SSE routes. Vercel integration routes (`/api/integrations/vercel/`, `/api/deploy/vercel/`) are a user feature, not hosting infrastructure.

---

## Key Patterns

| Pattern           | Implementation                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| State Management  | Zustand + Immer middleware, 10 slices, v6 migrations                                                         |
| Context Selection | `CodeContextService` — smart file selection to reduce tokens                                                 |
| Live Preview      | Sandpack                                                                                                     |
| Code Parsing      | Tree-sitter for AST analysis                                                                                 |
| Background Jobs   | Inngest                                                                                                      |
| AI Providers      | Claude (logic/code/architecture), Gemini (vision/layout/images/architecture), OpenAI (embeddings/proxy only) |
| Dual AI Planning  | `BackgroundPlanningOrchestrator` — Claude + Gemini consensus pipeline                                        |
| Background Intel  | `useBackgroundIntelligence` — pre-caches intelligence during Design step                                     |
| Motion Mapping    | `MotionMapper` — extracts animations from video/design                                                       |
| Visual Effects    | `effects/` components — CSS particles, keyframe injection                                                    |
| Agentic Pipelines | `TitanPipelineService` — multi-agent orchestration                                                           |
| SSE Responses     | `createSSEResponse()` — centralized headers incl. `X-Accel-Buffering: no` for Railway/Nginx                  |
| Base URL          | `getBaseUrl()` — single source of truth for app URL, no Vercel hosting references                            |

---

## Directory Structure

```
src/
├── agents/           # Agentic architecture (1,320 lines)
│   ├── CodeTransformAgent.ts   # Code transformations
│   ├── DeploymentAgent.ts      # Deployment workflows
│   └── types.ts                # Agent types
├── app/              # Next.js App Router + API routes (66 handlers, 29 API dirs)
│   ├── (protected)/app/
│   │   ├── wizard/             # Step 1: Conversation planning
│   │   ├── design/             # Step 2: Visual layout design
│   │   ├── ai-plan/            # Step 3: Dual AI architecture planning
│   │   ├── review/             # Step 4: Review before building
│   │   └── page.tsx            # Step 5: Main builder view
│   └── api/
│       ├── ai/                 # AI proxy routes (Claude, Gemini)
│       ├── planning/           # Dual AI planning (start, stream, intelligence)
│       ├── web-search/         # Live web search for intelligence
│       └── wizard/             # Wizard phase generation
├── components/       # 176 .tsx files (top-level + sub-components)
│   ├── ai-plan/      # AI Plan step (PipelineStagesView, ConsensusResultView, AISelectionPanel)
│   ├── effects/      # Visual effects (CSS particles, renderers)
│   ├── layout-builder/  # Layout builder components
│   ├── review/       # Review step (14 files, includes AIPlanCard)
│   ├── ConsensusEscalationDialog.tsx  # Dual AI escalation modal
│   └── ...
├── hooks/            # 43 custom hooks
│   ├── useDualAIPlan.ts           # Dual AI planning pipeline
│   ├── useBackgroundIntelligence.ts # Background intelligence pre-caching
│   └── ...
├── services/         # 86 business logic services
│   ├── TitanPipelineService.ts           # Agentic pipeline
│   ├── BackgroundPlanningOrchestrator.ts # Dual AI 5-stage pipeline
│   ├── ConsensusNegotiator.ts            # Claude-Gemini consensus
│   ├── DualValidationOrchestrator.ts     # Cross-validation
│   ├── LiveIntelligenceGatherer.ts       # Web search + AI intelligence
│   ├── LayoutBackendAnalyzer.ts          # Layout-to-backend analysis
│   └── ...
├── store/            # Zustand centralized state (10 slices, v6 migrations)
├── types/            # ~14,200 lines of TypeScript types (48 files)
│   ├── layoutDesign/      # Design type system (8 files, 3,343 lines — split from single file)
│   ├── titanPipeline.ts   # Pipeline types (incl. expanded AppContext)
│   ├── dualPlanning.ts    # Dual AI planning types (stages, SSE, escalation)
│   ├── motionConfig.ts    # Motion types
│   └── ...
├── lib/              # Server-side utilities (4 files)
│   ├── planningSessionStore.ts  # In-memory planning session store (TTL)
│   ├── getBaseUrl.ts            # Centralized app URL resolution (Railway/dev)
│   └── createSSEResponse.ts     # SSE response helper with required proxy headers
├── utils/            # ~25,068 lines of utilities (79 files)
│   ├── astModifier.ts + 5 modules # AST modification (split from single 61KB file)
│   ├── architectureToPhaseContext.ts # Architecture → phase context converter
│   ├── snapEngine.ts           # Alignment engine
│   ├── inspectorBridge.ts      # Inspector bridge
│   └── ...
├── data/             # Presets and templates (14 files)
├── contexts/         # React Context providers (3 files)
└── prompts/          # AI system prompts (8 files)
```

---

## Known Risks & Tech Debt

| Risk                                     | Severity | Mitigation                                                                                      |
| ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `appConcept` dependency explosion        | HIGH     | 51 dependencies; any change is expensive. Freeze this interface.                                |
| `CodeParser.ts` is 1,070 lines           | MEDIUM   | Consider splitting by parser type                                                               |
| Browser memory with large file histories | MEDIUM   | Move historical versions to IndexedDB                                                           |
| AI rate limits at scale                  | HIGH     | Enterprise quotas, multiple keys, Inngest queueing                                              |
| Titan Pipeline complexity                | MEDIUM   | Maturing system; ensure proper error handling across agents                                     |
| In-memory stores (single-instance only)  | MEDIUM   | `planningSessionStore`, Railway deploy Map, CodeContextService — needs Redis for multi-instance |

**Resolved Risks (as of Mar 2026):**

- ~~`DynamicPhaseGenerator.ts` 2.6k lines~~ → **Refactored to 685 lines**
- ~~`layoutDesign.ts` 3k lines~~ → **Split into `types/layoutDesign/` directory (8 files, 3,343 lines)**
- ~~`PhaseExecutionManager.ts` 2.1k lines~~ → **Refactored to 779 lines**
- ~~`MainBuilderView.tsx` 1.6k lines~~ → **Refactored to 872 lines** (now 940 with hydration fix)

---

## System Modes

### Wizard (Step 1)

Natural conversation → builds `AppConcept` with features, tech requirements, UI preferences. Architecture generation enriches concept context. No phase generation at this stage.

### Builder (Step 5)

Phase-by-phase code generation → quality checks → live preview. Phase plan generated in Review (Step 4) with architecture context.

---

## Key Entry Points

| File                                | Lines | Purpose                                                       |
| ----------------------------------- | ----- | ------------------------------------------------------------- |
| `useAppStore.ts`                    | 977   | Centralized state (10 slices, v6 migrations)                  |
| `MainBuilderView.tsx`               | 940   | Main orchestrator — Titan Pipeline integration, phase control |
| `NaturalConversationWizard.tsx`     | 751   | Conversation wizard UI (AppConcept building)                  |
| `DynamicPhaseGenerator.ts`          | 685   | Phase planning                                                |
| `PhaseExecutionManager.ts`          | 832   | Phase execution                                               |
| `useDynamicBuildPhases.ts`          | 700   | Phase execution hook                                          |
| `BackgroundPlanningOrchestrator.ts` | 640   | Dual AI 5-stage pipeline orchestrator                         |
| `useLayoutBuilder.ts`               | 599   | Layout builder state + GENERATE mode                          |
| `TitanPipelineService.ts`           | 497   | Titan Pipeline orchestrator                                   |
| `useDualAIPlan.ts`                  | 489   | Dual AI planning hook (SSE, escalation)                       |
| `GeminiLayoutCritique.ts`           | 286   | Vision critique for healing loop (new SDK + code execution)   |
| `useBackgroundIntelligence.ts`      | 115   | Background intelligence pre-caching                           |

---

## Dual AI Planning Pipeline (Added Feb 2026)

5-stage pipeline where Claude and Gemini independently generate architecture proposals, negotiate consensus, and cross-validate.

```
Stage 1: Layout Analysis (LayoutBackendAnalyzer)
    → Analyzes layout manifest for backend requirements
    ↓
Stage 2: Intelligence Gathering (LiveIntelligenceGatherer)
    → Web search + AI analysis for best practices
    → Pre-cached during Design step (useBackgroundIntelligence)
    ↓
Stage 3: Parallel Architecture Generation
    → Claude generates architecture proposal
    → Gemini generates architecture proposal (concurrent)
    ↓
Stage 4: Consensus Negotiation (ConsensusNegotiator)
    → Compares proposals, finds agreement/disagreements
    → User can escalate via ConsensusEscalationDialog
    ↓
Stage 5: Dual Validation (DualValidationOrchestrator)
    → Cross-validates final architecture
    → Result saved as dualArchitectureResult in Zustand
```

**Key Files:**

| File                                | Lines | Purpose                                         |
| ----------------------------------- | ----- | ----------------------------------------------- |
| `BackgroundPlanningOrchestrator.ts` | 640   | 5-stage pipeline orchestrator                   |
| `LiveIntelligenceGatherer.ts`       | 606   | Web search + AI intelligence                    |
| `ConsensusNegotiator.ts`            | 571   | Claude-Gemini consensus engine                  |
| `useDualAIPlan.ts`                  | 489   | SSE streaming hook for planning pipeline        |
| `types/dualPlanning.ts`             | 642   | Planning types (stages, SSE events, escalation) |
| `architectureToPhaseContext.ts`     | 341   | Architecture → phase context converter          |
| `DualValidationOrchestrator.ts`     | 300   | Cross-validation of architectures               |
| `ConsensusEscalationDialog.tsx`     | ~200  | User escalation modal for disagreements         |
| `useBackgroundIntelligence.ts`      | 115   | Background pre-caching during Design step       |
| `lib/planningSessionStore.ts`       | ~100  | In-memory session store with TTL                |

**API Routes:**

| Route                        | Purpose                                    |
| ---------------------------- | ------------------------------------------ |
| `/api/planning/start`        | Initiates dual AI planning session         |
| `/api/planning/stream`       | SSE stream for pipeline stage updates      |
| `/api/planning/intelligence` | Intelligence gathering endpoint            |
| `/api/ai/claude`             | Claude AI proxy route                      |
| `/api/ai/gemini`             | Gemini AI proxy route                      |
| `/api/web-search`            | Live web search for intelligence gathering |

---

## Layout Builder System

### Core Files (Updated Mar 15, 2026)

| File                    | Lines | Purpose                                            |
| ----------------------- | ----- | -------------------------------------------------- |
| `useLayoutBuilder.ts`   | 599   | Layout builder hook (expanded for data flow fixes) |
| `LayoutBuilderView.tsx` | 374   | Main layout builder view                           |
| `LayoutCanvas.tsx`      | ~512  | Canvas rendering/interaction (+preflight fix)      |

### Supporting Components

| File                           | Lines | Purpose                     |
| ------------------------------ | ----- | --------------------------- |
| `DynamicLayoutRenderer.tsx`    | ~200  | Dynamic component rendering |
| `GenericComponentRenderer.tsx` | ~300  | Generic component rendering |
| `FloatingEditBubble.tsx`       | ~150  | Inline editing UI           |
| `KeyframeInjector.tsx`         | 185   | CSS animation injection     |

---

## Recent Changes Log

### Mar 15, 2026 (PM) - 5 Builder State Management Bug Fixes

- **Fixed**: Mode persistence — `currentMode` (PLAN/ACT) now persisted in Zustand store, store bumped to v6 with migration
- **Fixed**: Data wipe on navigation — `useConceptSync` now guards against overwriting existing `appConcept` with empty `wizardState`
- **Fixed**: `MainBuilderView` `wizardState` hydration — lazy `useState` initializer reads from `useAppStore.getState()` instead of starting empty
- **Fixed**: Streaming timeout — `useStreamingGeneration` now has 45s per-chunk and 5min total timeouts with user-abort vs timeout distinction
- **Fixed**: Stale sessions — `wizard/page.tsx` clears `dynamicPhasePlan`, `dualArchitectureResult`, `cachedIntelligence` on new concept creation
- **Fixed**: Design page feature counter — falls back to `appConcept.coreFeatures` when `detectedFeatures` unavailable
- **Fixed**: Layout builder progress — elapsed-time timer during pipeline API call in `useLayoutBuilder.ts`
- **Updated**: `useAppStore.ts` 898 → 977 lines (v6 migration, `currentMode` persistence)
- **Updated**: `MainBuilderView.tsx` 872 → 940 lines (wizardState hydration from store)
- **Updated**: `useLayoutBuilder.ts` 574 → 599 lines (progress timer)
- **Updated**: `useStreamingGeneration.ts` +80 lines (timeout logic, abort distinction)

### Mar 15, 2026 (AM) - Major Refactors + Master Context Audit

- **Refactored**: `DynamicPhaseGenerator.ts` 2,718 → 685 lines (massive reduction)
- **Refactored**: `PhaseExecutionManager.ts` 2,095 → 779 lines (massive reduction)
- **Refactored**: `MainBuilderView.tsx` 1,622 → 872 lines (massive reduction)
- **Split**: `types/layoutDesign.ts` (2,999 lines) → `types/layoutDesign/` directory (8 files, 3,343 lines)
- **Split**: `utils/astModifier.ts` (61KB) → 6 modules (astModifier + astModifierHooks/Imports/Jsx/Search/Types)
- **Expanded**: `useAppStore.ts` 804 → 898 lines, `NaturalConversationWizard.tsx` 657 → 751 lines
- **Expanded**: `ConsensusNegotiator.ts` ~300 → 530 lines, `LiveIntelligenceGatherer.ts` ~400 → 606 lines
- **Expanded**: `BackgroundPlanningOrchestrator.ts` ~500 → 618 lines, `useLayoutBuilder.ts` 496 → 574 lines
- **Growth**: +32 TypeScript/TSX files, +1 API route, +5 hooks, +9 services since Feb audit (total: 608 files)
- **Resolved**: 3 of 4 CRITICAL/HIGH file-size tech debt items (DynamicPhaseGenerator, PhaseExecutionManager, layoutDesign.ts)

### Feb 8, 2026 - Wizard Cleanup + CREATE Mode Streamlining

- **Simplified**: `NaturalConversationWizard.tsx` 806 → 657 lines — removed phase generation, templates, ACT/PLAN mode references; wizard now focuses solely on building AppConcept through conversation
- **Simplified**: `TitanPipelineService.ts` 1,075 → 578 lines — CREATE mode now goes Router → Surveyor → Builder → Healing Loop directly, skipping Photographer/extraction/merge (redundant for pixel-perfect replication)
- **Fixed**: Review page crash when phase plan missing — disabled Proceed button during generation, added fallback phase generation when AI Plan step skipped
- **Updated**: Architecture generation enriches concept with `conceptReference` fields on decisions
- **Renamed**: "Start Building" → "Continue to Design" throughout wizard and side panel
- **Simplified**: Wizard `onComplete` signature to single `AppConcept` argument
- **Fixed**: Builder prompt gap for `extractedAssetUrl` field in CREATE mode

### Feb 6, 2026 - SDK Migration + Dead Code Removal

- **Migrated**: `GeminiLayoutCritique.ts` from `@google/generative-ai` → `@google/genai` SDK with code execution
- **Migrated**: `GeminiImageService.ts` from `@google/generative-ai` → `@google/genai` SDK
- **Rewired**: `VisionLoopEngine.ts` — calls `critiqueLayoutEnhanced()` directly instead of via GeminiLayoutService
- **Deleted**: `GeminiLayoutService.ts` (~1,364 lines) — old orchestrator, replaced by Titan Pipeline
- **Deleted**: `GeminiDesignSpecExtractor.ts` (~237 lines) — only used by GeminiLayoutService
- **Deleted**: `GeminiComponentBuilder.ts` (~629 lines) — only used by GeminiLayoutService
- **Deleted**: `EnhancedVideoAnalyzer.ts` (~166 lines) — never imported anywhere
- **Deleted**: `src/app/api/layout/analyze/route.ts` (~50 lines) — old API route
- **Deleted**: `src/app/api/layout/screenshot/route.ts` (~192 lines) — dead API route
- **All Gemini services now use `@google/genai` SDK** — old `@google/generative-ai` fully removed
- **Code execution enabled** for vision critique via `tools: [{ codeExecution: {} }]`

### Feb 6, 2026 - Asset Pipeline + Xerox Mode + Surgical Healing (8 fixes)

- **Added**: Xerox Mode prompt in TitanBuilder.ts and GeminiComponentBuilder.ts (now deleted)
- **Fixed**: Healing loop icon whitelist using `UI_CHROME_ICONS` from `iconConstants.ts`
- **Fixed**: Healing loop mode changed from destructive CREATE to surgical EDIT
- **Added**: `backgroundImage` enforcement in TitanPipelineService + TitanSurveyor
- **Added**: `injectAssetsIntoDomTree()` helper in TitanBuilder
- **Added**: Fallback iconName restoration on extraction failure (TitanPipelineService)
- **Fixed**: AssetExtractionService scale threshold 100→200 + clamp instead of throw
- **Added**: `iconConstants.ts` — single source of truth for UI chrome icon whitelist

### Feb 5-6, 2026 - Dual AI Planning Pipeline & GENERATE Mode

- **Added**: 5-step workflow (Wizard → Design → AI Plan → Review → Builder), replacing 4-step
- **Added**: Dual AI Planning Pipeline (Claude + Gemini consensus architecture)
  - `BackgroundPlanningOrchestrator.ts` - 5-stage pipeline orchestrator
  - `ConsensusNegotiator.ts` - Claude-Gemini consensus engine
  - `DualValidationOrchestrator.ts` - Cross-validation of architectures
  - `LiveIntelligenceGatherer.ts` - Web search + AI intelligence
  - `LayoutBackendAnalyzer.ts` - Layout-to-backend analysis
  - `ConsensusEscalationDialog.tsx` - User escalation modal
  - `useDualAIPlan.ts` - SSE streaming hook for pipeline
  - `useBackgroundIntelligence.ts` - Background pre-caching during Design
  - `types/dualPlanning.ts` - Planning types (stages, SSE events, escalation)
  - `lib/planningSessionStore.ts` - In-memory session store with TTL
  - `utils/architectureToPhaseContext.ts` - Architecture → phase context converter
- **Added**: AI Plan page at `src/app/(protected)/app/ai-plan/page.tsx`
- **Added**: AI Plan components (`ai-plan/PipelineStagesView`, `ConsensusResultView`, `AISelectionPanel`)
- **Added**: `AIPlanCard` review component
- **Added**: API routes: `planning/start`, `planning/stream`, `planning/intelligence`, `ai/claude`, `ai/gemini`, `web-search`
- **Added**: GENERATE mode in Titan Pipeline (full layout from AppConcept, no images)
- **Added**: Synthetic LayoutManifest creation for GENERATE mode (`createSyntheticLayoutManifest`)
- **Added**: `constants/aiModels.ts` - AI model configuration constants
- **Fixed**: Layout injection never firing (guard changed from `!currentComponent` to `!hasInjectedCode`)
- **Refactored**: Extracted `tryStartPhase1` useCallback in MainBuilderView (deduplicated ~70 lines)
- **Updated**: `useAppStore.ts` - 10 slices (added planning slices), v5 migration chain (now v6)
- **Updated**: `titanPipeline.ts` - Expanded AppContext with planning fields
- **Updated**: `dynamicPhases.ts` - Added `hasArchitectureContext` flag
- **Updated**: `appConcept.ts` - Added dual planning types
- **Updated**: Review page - Phase regeneration with architecture context

### Feb 1, 2026 (PM) - Visual Fidelity Overhaul

- **Migrated**: `TitanPipelineService.ts` from `@google/generative-ai` → `@google/genai` SDK
- **Enabled**: Agentic Vision in Surveyor (Think→Act→Observe loop for precise CSS extraction)
- **Added**: `maxOutputTokens` to prevent truncation on complex designs
- **Fixed**: Tailwind preflight resets in Sandpack (CSS `revert` injection)
- **Added**: Shaped + textured element support (clip-path, SVG masks, photorealistic textures)
- **Skipped**: Architect step (saves Claude Opus cost + latency, preserves code for future)
- **Updated**: `TitanPipelineService.ts` 511 → 696 lines (+185)
- **Updated**: `MainBuilderView.tsx` 1,494 → 1,622 lines (+128)
- **Updated**: `useLayoutBuilder.ts` 383 → 496 lines (+113)
- **Updated**: `DynamicPhaseGenerator.ts` 2,646 → 2,718 lines (+50)
- **Updated**: `useAppStore.ts` 790 → 804 lines (+14)
- **Added**: `docs/visual-fidelity-fix-plan.md`, `docs/plans/fix-shaped-textured-elements.md`

### Feb 1, 2026 (AM)

- **Added**: `src/agents/` directory with agentic architecture (1,320 lines)
  - `CodeTransformAgent.ts` (437 lines) - AST-based code transformations
  - `DeploymentAgent.ts` (444 lines) - Deployment workflow orchestrator
  - `types.ts` (393 lines) - Agent type definitions
- **Added**: Review page at `src/app/(protected)/app/review/page.tsx` (165 lines)
- **Updated**: `MainBuilderView.tsx` expanded from 1,164 to 1,494 lines (+330)
- **Updated**: `useAppStore.ts` expanded from 761 to 790 lines (+29)
- **Stats**: +9 TypeScript files, +1 API route, +120 lines in types

### Jan 31, 2026

- **Added**: Titan Pipeline system (`TitanPipelineService`, types, API route)
- **Added**: Motion/Effects system (`MotionMapper`, `KeyframeInjector`, `effects/` components)
- **Added**: New utilities (`snapEngine`, `inspectorBridge`, `responsiveTypography`)
- **Added**: New types (`titanPipeline`, `motionConfig`, `mediaSource`, `manipulation`, `componentManagement`)
- **Refactored**: `useLayoutBuilder.ts` reduced from ~970 to 383 lines
- **Refactored**: `LayoutCanvas.tsx` and `LayoutBuilderView.tsx` updated
- **Removed**: `LayoutPreview.tsx` (consolidated elsewhere)
- **Updated**: `GeminiLayoutService.ts` expanded to 1,351 lines

### Jan 30, 2026

- Added step-based navigation flow documentation
- Verified all file counts and line counts
