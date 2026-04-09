# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: Full project context for AI tools (Claude Code, Antigravity, etc.).
> **Status**: VERIFIED — Apr 9, 2026

---

## Quick Stats

| Metric               | Count                                  |
| -------------------- | -------------------------------------- |
| TypeScript/TSX Files | 638                                    |
| API Route Handlers   | 66                                     |
| Custom Hooks         | 45                                     |
| Service Classes      | ~94                                    |
| Lint Warnings        | 11 (all intentional `exhaustive-deps`) |

**Stack**: Next.js 16.2 / React 19 / TypeScript 6 / Tailwind CSS 4 / Zustand 5 / Supabase / Tree-sitter

**Observability**: Langfuse (LLM tracing) + Sentry (error tracking) — 10 AI routes instrumented

**Preview Runtime**: WebContainers (`@webcontainer/api`) — real Node.js in browser, 3 tiers: Instant (esbuild) / Full (WebContainer) / Deploy (Railway)

---

## System Architecture Flow (5-Step Pipeline)

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
    → WebContainers preview (real Node.js in browser) with Safari esbuild fallback
    → 3 preview modes: Instant (esbuild) / Full (WebContainer) / Deploy (Railway)
    → Version history, undo/redo, ConceptDrawer, ModalManager
```

**Key Data Persistence (Zustand + localStorage):**

- `appConcept` — Created in Wizard (Step 1), used throughout
- `dynamicPhasePlan` — Generated in Review (Step 4) with architecture context
- `layoutBuilderFiles` — Created in Design (Step 2), injected in Phase 1 (Step 5)
- `currentLayoutManifest` — Created in Design (Step 2), synthetic manifest for GENERATE mode
- `currentDesignSpec` — Extracted from images in Design (Step 2)
- `cachedIntelligence` — Pre-cached in Design (Step 2), consumed by AI Plan (Step 3)
- `dualArchitectureResult` — Created in AI Plan (Step 3), used for phase regeneration (Step 4)
- `components` / `currentComponent` — Generated code, persists across navigation

---

## Titan Pipeline

Core agentic pipeline for transforming visual sources (images/sketches) + instructions into React/Tailwind code.

```
Input (Images + Instructions) → Router (Intent Analysis + MergeStrategy)
    ↓
Surveyor (Gemini Vision → VisualManifest[])
    ↓
[MERGE/EDIT only] Photographer (Gemini Image Generation → Asset URLs)
    ↓
Builder (Gemini → React/Tailwind Code)
    ↓
Self-Healing Vision Loop (Screenshot → Critique → Fix → Repeat)

CREATE mode shortcut: Router → Surveyor → Builder → Healing Loop
```

**Key Files:**

| File                        | Lines           | Purpose                                    |
| --------------------------- | --------------- | ------------------------------------------ |
| `TitanPipelineService.ts`   | 497             | Pipeline orchestrator                      |
| `VisionLoopEngine.ts`       | 504             | Self-healing vision loop                   |
| `LayoutAutoFixEngine.ts`    | 576             | Auto-fix from AI critique                  |
| `GeminiLayoutCritique.ts`   | 286             | Vision critique (new SDK + code execution) |
| `GeminiImageService.ts`     | 122             | Multimodal image generation                |
| `AppImageGenerator.ts`      | 277             | Image generation + Supabase upload         |
| `AssetExtractionService.ts` | 276             | Sharp-based image cropping                 |
| `layoutValidation/`         | 6 files, ~1,214 | Zod schema validation                      |

**Pipeline Steps:**

| Step         | Model                         | Purpose                                            |
| ------------ | ----------------------------- | -------------------------------------------------- |
| Router       | Gemini Flash                  | Intent analysis, MergeStrategy (CREATE/MERGE/EDIT) |
| Surveyor     | Gemini Flash + Agentic Vision | Vision analysis → VisualManifest[]                 |
| Photographer | Gemini Pro                    | Multimodal asset generation (MERGE/EDIT only)      |
| Builder      | Gemini Pro                    | Code synthesis with multimodal input               |

---

## Motion & Effects System

| File                       | Lines | Purpose                               |
| -------------------------- | ----- | ------------------------------------- |
| `MotionMapper.ts`          | 350   | Maps motion configs to CSS/animations |
| `CSSParticleEffect.tsx`    | 192   | CSS-based particle effects            |
| `VisualEffectRenderer.tsx` | 95    | Effect rendering                      |
| `KeyframeInjector.tsx`     | 185   | CSS keyframe injection                |
| `snapEngine.ts`            | 197   | Snap-to-grid alignment                |
| `inspectorBridge.ts`       | 175   | Inspector communication bridge        |
| `responsiveTypography.ts`  | 119   | Responsive text sizing                |

---

## Dependency Hierarchy

### TIER 1: UNIVERSAL (20+ dependents) — EXTREME CAUTION

| File                      | Dependents   | Impact                                      |
| ------------------------- | ------------ | ------------------------------------------- |
| `types/appConcept.ts`     | **51 files** | **CRITICAL** — Foundation of the entire app |
| `types/aiBuilderTypes.ts` | 33 files     | HIGH                                        |
| `types/dynamicPhases/`    | 31 files     | HIGH (9-file module directory)              |
| `useAppStore.ts`          | **24 files** | CRITICAL — centralized state                |

### TIER 2: MAJOR SERVICES (5-19 dependents)

| File                       | Dependents | Notes                             |
| -------------------------- | ---------- | --------------------------------- |
| `types/codeReview.ts`      | 15 files   | Validation layer types            |
| `BuilderContext.tsx`       | 11 files   | Builder provider (wraps 16 hooks) |
| Deployment services        | 10+ files  | Cluster                           |
| `DynamicPhaseGenerator.ts` | ~8 files   | Core planning engine (685 lines)  |
| `PhaseExecutionManager.ts` | ~4 files   | Core execution engine (832 lines) |

### TIER 3: PIPELINE & PLANNING (1-3 dependents each)

| File                                | Lines | Notes                        |
| ----------------------------------- | ----- | ---------------------------- |
| `BackgroundPlanningOrchestrator.ts` | 640   | Dual AI 5-stage pipeline     |
| `LiveIntelligenceGatherer.ts`       | 606   | Web search + AI intelligence |
| `ConsensusNegotiator.ts`            | 571   | Claude-Gemini consensus      |
| `TitanPipelineService.ts`           | 497   | Titan Pipeline orchestrator  |
| `MotionMapper.ts`                   | 350   | Animation mapping            |
| `DualValidationOrchestrator.ts`     | 300   | Cross-validation             |
| `GeminiLayoutCritique.ts`           | 286   | Vision critique              |

---

## Critical Files — DO NOT BREAK

| File                            | Lines      | Purpose                                     | Risk                   |
| ------------------------------- | ---------- | ------------------------------------------- | ---------------------- |
| `BuilderContext.tsx`            | **960**    | Builder provider — 16 hooks, intent routing | Builder UI breaks      |
| `types/layoutDesign/` (dir)     | **3,343**  | Design type system (8 files)                | 14+ files break        |
| `full-app-stream/` (dir)        | **~1,339** | AI streaming route (7 modules)              | Build streaming breaks |
| `deployment/` (dir)             | **~1,397** | Deployment orchestrator (5 modules)         | Deploy system breaks   |
| `codeParser/` (dir)             | **~1,115** | AST parsing engine (8 files)                | Code analysis breaks   |
| `useAppStore.ts` + `slices/`    | **~1,070** | Zustand state (385 + 9 slices)              | 24+ files break        |
| `PhaseExecutionManager.ts`      | **832**    | Phase execution orchestrator                | Build system breaks    |
| `useDynamicBuildPhases/` (dir)  | **~810**   | Phase execution hook (5 files)              | Build UI breaks        |
| `NaturalConversationWizard.tsx` | **751**    | Conversation wizard UI                      | Planning breaks        |
| `DynamicPhaseGenerator.ts`      | **685**    | Phase planning engine                       | Build system breaks    |
| `TitanPipelineService.ts`       | **497**    | Titan Pipeline orchestrator                 | Pipeline breaks        |
| `proxy.ts`                      | **87**     | Auth flow for all routes                    | Auth breaks            |

---

## Import Rules — MUST FOLLOW

```
Components  → Hooks, Types, Utils       ✅ ALLOWED
Hooks       → Store, Services, Types    ✅ ALLOWED
Services    → Types, Utils              ✅ ALLOWED
Services    → Other Services            ✅ ALLOWED (via DI or direct import)
Types       → Other Types only          ✅ ALLOWED

CIRCULAR Dependencies                   ❌ FORBIDDEN
Components  → Services directly         ❌ FORBIDDEN (use hooks as intermediary)
Hooks       → Other Hooks               ⚠️ CAUTION (no circular, prefer composition)
```

---

## Architecture Rules

1. **SSE streaming** for all code generation
2. **Zustand selectors** with `shallow` comparison for performance
3. **AST-based code modifications** via Tree-sitter — NOT string manipulation
4. **Phase integrity checks** (P1-P9) must pass across boundaries
5. **Client-heavy architecture** — most logic runs in browser
6. **Serverless API routes** — thin proxies to AI providers and Supabase
7. **Lazy loading** for heavy services (CodeReviewService)
8. **Agentic pipelines** — TitanPipeline for multi-step AI orchestration
9. **Railway deployment** — use `getBaseUrl()` for internal URLs, `createSSEResponse()` for all SSE routes. Vercel routes are a user feature, not infrastructure.
10. **Structured logging** — all logs use `@/utils/logger`, no raw `console.*`
11. **Observability** — Langfuse for LLM tracing, Sentry for error tracking, unified via `@/lib/observability`
12. **WebContainers preview** — real Node.js in browser via `@webcontainer/api`, COOP/COEP headers on all routes
13. **User-friendly errors** — all AI generation errors pass through `@/utils/errorMessages` for actionable messages

---

## Key Patterns

| Pattern           | Implementation                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| State Management  | Zustand + Immer middleware, 10 slices, v6 migrations                                                         |
| Context Selection | `CodeContextService` — smart file selection to reduce tokens                                                 |
| Live Preview      | WebContainers (real Node.js) + esbuild-wasm fallback (Safari)                                                |
| Observability     | Langfuse (LLM tracing) + Sentry (error tracking) — all behind env var feature flags                          |
| Code Parsing      | Tree-sitter for AST analysis                                                                                 |
| Background Jobs   | Inngest                                                                                                      |
| AI Providers      | Claude (logic/code/architecture), Gemini (vision/layout/images/architecture), OpenAI (embeddings/proxy only) |
| Dual AI Planning  | `BackgroundPlanningOrchestrator` — Claude + Gemini consensus pipeline                                        |
| Agentic Pipelines | `TitanPipelineService` — multi-agent orchestration                                                           |
| SSE Responses     | `createSSEResponse()` — centralized headers incl. `X-Accel-Buffering: no` for Railway                        |
| Base URL          | `getBaseUrl()` — single source of truth for app URL                                                          |

---

## Directory Structure

```
src/
├── app/              # Next.js App Router + API routes (66 handlers)
│   ├── (protected)/app/
│   │   ├── wizard/             # Step 1: Conversation planning
│   │   ├── design/             # Step 2: Visual layout design
│   │   ├── ai-plan/            # Step 3: Dual AI architecture planning
│   │   ├── review/             # Step 4: Review before building
│   │   └── page.tsx            # Step 5: Main builder view
│   └── api/
│       ├── ai/                 # AI proxy routes (Claude, Gemini)
│       ├── ai-builder/
│       │   └── full-app-stream/ # Modular SSE route (7 files, ~1,339 lines)
│       ├── planning/           # Dual AI planning (start, stream, intelligence)
│       ├── web-search/         # Live web search for intelligence
│       └── wizard/             # Wizard phase generation
├── components/       # React components
│   ├── ai-plan/      # AI Plan step (PipelineStagesView, ConsensusResultView)
│   ├── builder/      # Builder UI (10 files — BuilderPage, LeftPanel, PreviewPanel, etc.)
│   ├── effects/      # Visual effects (CSS particles, renderers)
│   ├── layout-builder/  # Layout builder components
│   ├── review/       # Review step (14 files)
│   └── ...
├── contexts/         # React Context providers
│   └── BuilderContext.tsx      # Builder provider (960 lines — wraps 16 hooks)
├── hooks/            # 45 custom hooks
│   ├── useDynamicBuildPhases/  # Phase execution (5 files, ~810 lines)
│   ├── useDualAIPlan.ts        # Dual AI planning pipeline
│   └── ...
├── services/         # ~94 business logic services
│   ├── codeParser/             # AST parsing (8 files, ~1,115 lines)
│   ├── deployment/             # Deployment (5 files, ~1,397 lines)
│   ├── phaseGeneration/        # Phase planning sub-services
│   ├── TitanPipelineService.ts # Agentic pipeline
│   └── ...
├── store/            # Zustand centralized state
│   ├── useAppStore.ts          # Main store (384 lines)
│   └── slices/                 # 9 slice files (~685 lines total)
├── types/            # TypeScript types
│   ├── layoutDesign/           # Design type system (8 files, 3,343 lines)
│   ├── dynamicPhases/          # Phase types (9 files, ~1,105 lines)
│   └── ...
├── utils/            # Utilities
│   ├── layoutValidation/       # Zod validation (6 files, ~1,214 lines)
│   ├── astModifier.ts + 5 modules # AST modification
│   └── ...
├── lib/              # Server-side utilities (7 files — incl. WebContainerService, langfuse, observability)
├── data/             # Presets and templates (14 files)
└── prompts/          # AI system prompts (8 files)
```

---

## Key Entry Points

| File                                | Lines   | Purpose                                     |
| ----------------------------------- | ------- | ------------------------------------------- |
| `BuilderContext.tsx`                | 960     | Builder provider — 16 hooks, intent routing |
| `PhaseExecutionManager.ts`          | 832     | Phase execution orchestrator                |
| `NaturalConversationWizard.tsx`     | 751     | Conversation wizard UI                      |
| `DynamicPhaseGenerator.ts`          | 685     | Phase planning engine                       |
| `BackgroundPlanningOrchestrator.ts` | 640     | Dual AI 5-stage pipeline                    |
| `useLayoutBuilder.ts`               | 599     | Layout builder state + GENERATE mode        |
| `TitanPipelineService.ts`           | 497     | Titan Pipeline orchestrator                 |
| `useDualAIPlan.ts`                  | 489     | Dual AI planning hook (SSE, escalation)     |
| `useAppStore.ts` + `slices/`        | 384+685 | Zustand state (10 files)                    |
| `useDynamicBuildPhases/`            | 262+550 | Phase execution hook (5 files)              |
| `GeminiLayoutCritique.ts`           | 286     | Vision critique for healing loop            |

---

## Dual AI Planning Pipeline

```
Stage 1: Layout Analysis (LayoutBackendAnalyzer)
    → Analyzes layout manifest for backend requirements
    ↓
Stage 2: Intelligence Gathering (LiveIntelligenceGatherer)
    → Web search + AI analysis for best practices
    → Pre-cached during Design step (useBackgroundIntelligence)
    ↓
Stage 3: Parallel Architecture Generation
    → Claude + Gemini generate architecture proposals concurrently
    ↓
Stage 4: Consensus Negotiation (ConsensusNegotiator)
    → Compares proposals, user can escalate via ConsensusEscalationDialog
    ↓
Stage 5: Dual Validation (DualValidationOrchestrator)
    → Cross-validates final architecture → saved as dualArchitectureResult
```

**Key Files:**

| File                                | Lines | Purpose                                |
| ----------------------------------- | ----- | -------------------------------------- |
| `BackgroundPlanningOrchestrator.ts` | 640   | 5-stage pipeline orchestrator          |
| `LiveIntelligenceGatherer.ts`       | 606   | Web search + AI intelligence           |
| `ConsensusNegotiator.ts`            | 571   | Claude-Gemini consensus engine         |
| `useDualAIPlan.ts`                  | 489   | SSE streaming hook                     |
| `types/dualPlanning.ts`             | 642   | Planning types                         |
| `architectureToPhaseContext.ts`     | 341   | Architecture → phase context converter |
| `DualValidationOrchestrator.ts`     | 300   | Cross-validation                       |
| `lib/planningSessionStore.ts`       | ~100  | In-memory session store with TTL       |

**API Routes:**

| Route                        | Purpose                               |
| ---------------------------- | ------------------------------------- |
| `/api/planning/start`        | Initiates dual AI planning session    |
| `/api/planning/stream`       | SSE stream for pipeline stage updates |
| `/api/planning/intelligence` | Intelligence gathering endpoint       |
| `/api/ai/claude`             | Claude AI proxy                       |
| `/api/ai/gemini`             | Gemini AI proxy                       |
| `/api/web-search`            | Live web search                       |

---

## Layout Builder System

| File                           | Lines | Purpose                                      |
| ------------------------------ | ----- | -------------------------------------------- |
| `useLayoutBuilder.ts`          | 599   | Layout builder hook                          |
| `LayoutCanvas.tsx`             | ~450  | Canvas rendering/interaction (WebContainers) |
| `LayoutBuilderView.tsx`        | 374   | Main layout builder view                     |
| `DynamicLayoutRenderer.tsx`    | ~200  | Dynamic component rendering                  |
| `GenericComponentRenderer.tsx` | ~300  | Generic component rendering                  |
| `FloatingEditBubble.tsx`       | ~150  | Inline editing UI                            |

---

## Observability Stack (Apr 9, 2026)

| Tool           | Purpose                                         | Key Files                                         |
| -------------- | ----------------------------------------------- | ------------------------------------------------- |
| Langfuse       | LLM tracing (tokens, cost, latency per AI call) | `src/lib/langfuse.ts`, `src/lib/observability.ts` |
| Sentry         | Error tracking (client + server + edge)         | `sentry.*.config.ts`, `src/instrumentation.ts`    |
| Logger hooks   | All `logger.error()` auto-forwards to Sentry    | `src/utils/logger.ts` (registerErrorHook)         |
| Error messages | User-friendly error text for AI failures        | `src/utils/errorMessages.ts`                      |

**All behind env var feature flags** — no keys = no-op stubs, zero overhead.

## Preview System (Apr 9, 2026)

| Mode    | Runtime                               | Use Case                                        |
| ------- | ------------------------------------- | ----------------------------------------------- |
| Instant | esbuild-wasm (`BrowserPreview`)       | Simple frontend apps, Safari fallback           |
| Full    | WebContainers (`WebContainerPreview`) | Real npm, real Node.js, real Next.js dev server |
| Deploy  | Railway (`RailwayPreview`)            | Full deployment with real database              |

**Key Files**: `src/lib/WebContainerService.ts`, `src/utils/webContainerFS.ts`, `src/components/preview/WebContainerPreview.tsx`

**Headers**: COOP/COEP (`credentialless`) on all routes for SharedArrayBuffer support.

---

## Known Risks & Tech Debt

| Risk                                     | Severity | Mitigation                                                                  |
| ---------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `appConcept` dependency explosion        | HIGH     | 51 dependencies; freeze this interface                                      |
| Browser memory with large file histories | MEDIUM   | Move historical versions to IndexedDB                                       |
| AI rate limits at scale                  | HIGH     | Enterprise quotas, multiple keys, Inngest queueing                          |
| Titan Pipeline complexity                | MEDIUM   | Maturing system; ensure proper error handling                               |
| In-memory stores (single-instance only)  | MEDIUM   | `planningSessionStore`, CodeContextService — needs Redis for multi-instance |
