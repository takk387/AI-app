# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: This file provides full project context for Antigravity, Claude Code, and other AI tools.
> **Status**: VERIFIED (Mar 30, 2026 — Builder page rebuild, 12+ bug fixes, massive cleanup/refactoring, 28 orphaned files removed, 6 monolithic files split into modules, 229 console→logger migration, agents removed, structured codeParser/layoutValidation/dynamicPhases/deployment/full-app-stream modules)

---

## Quick Stats

| Metric               | Mar 15  | Verified (Mar 30) |
| -------------------- | ------- | ----------------- |
| TypeScript/TSX Files | 621     | **638**           |
| API Route Handlers   | 66      | **66**            |
| Custom Hooks         | 42      | **45**            |
| Service Classes      | 86      | **~100**          |
| Type Definitions     | ~14,200 | **modularized**   |
| Utilities            | ~25,068 | **modularized**   |

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
- `src/utils/layoutValidation/` (6 files, ~1,214 lines) - Zod schema validation (split from single file Mar 30)

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

## Agents Architecture (Added Feb 1, REMOVED Mar 29, 2026)

~~Previously at `src/agents/` with CodeTransformAgent (437 lines), DeploymentAgent (444 lines), types (393 lines).~~

**Status**: DELETED during Mar 29 dead code cleanup. The 1,320 lines were orphaned — never imported by any other file.

---

## Motion & Effects System (Added Jan 31, 2026)

New animation and visual effects infrastructure.

**Services:**

- `src/services/MotionMapper.ts` (350 lines) - Maps motion configurations to CSS/animations
- ~~`src/services/SourceMergeEngine.ts` (322 lines)~~ - DELETED Mar 29 (orphaned)

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
| `types/dynamicPhases/`    | 31 files     | HIGH (now 9-file module directory)                              |

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

| File                                | Lines   | Notes                             |
| ----------------------------------- | ------- | --------------------------------- |
| `TitanPipelineService.ts`           | 497     | Titan Pipeline orchestrator       |
| `BackgroundPlanningOrchestrator.ts` | 640     | Dual AI 5-stage pipeline          |
| `LiveIntelligenceGatherer.ts`       | 606     | Web search + AI intelligence      |
| `ConsensusNegotiator.ts`            | 571     | Claude-Gemini consensus           |
| `DualValidationOrchestrator.ts`     | 300     | Cross-validation of architectures |
| `MotionMapper.ts`                   | 350     | Animation mapping                 |
| ~~`SourceMergeEngine.ts`~~          | ~~322~~ | DELETED Mar 29                    |
| `GeminiLayoutCritique.ts`           | 286     | Vision critique (new SDK)         |

### TIER 4: HOOKS & COMPONENTS (1-3 dependents each)

Lower risk, but still follow patterns.

- `types/designSpec.ts` (Design System Specs)
- `types/titanPipeline.ts` (Pipeline Types - NEW)
- `types/motionConfig.ts` (Motion Types - NEW)
- `utils/colorUtils.ts` (Color Utilities)
- `services/GeminiLayoutCritique.ts` (Vision critique - new SDK)

---

## Critical Files — DO NOT BREAK

| File                            | Lines      | Purpose                                        | Risk                   |
| ------------------------------- | ---------- | ---------------------------------------------- | ---------------------- |
| `BuilderContext.tsx`            | **960**    | Builder provider — 16 hooks, intent routing    | Builder UI breaks      |
| `types/layoutDesign/` (dir)     | **3,343**  | Design type system (8 files, split from 3k)    | 14+ files break        |
| `middleware.ts`                 | **87**     | Auth flow for all routes                       | Auth breaks            |
| `codeParser/` (dir)             | **~1,115** | AST parsing engine (8 files, split from 1,070) | Code analysis breaks   |
| `useAppStore.ts` + `slices/`    | **~1,070** | Zustand state (385 + 9 slices, v6)             | 24+ files break        |
| `PhaseExecutionManager.ts`      | **832**    | Phase execution orchestrator (from 2.1k)       | Build system breaks    |
| `NaturalConversationWizard.tsx` | **751**    | Conversation wizard UI                         | Planning breaks        |
| `DynamicPhaseGenerator.ts`      | **685**    | Phase planning engine (refactored from 2.7k)   | Build system breaks    |
| `useDynamicBuildPhases.ts`      | **700**    | Phase execution hook                           | Build UI breaks        |
| `TitanPipelineService.ts`       | **497**    | Titan Pipeline orchestrator                    | Pipeline breaks        |
| `deployment/` (dir)             | **~1,397** | Deployment orchestrator (260 + 4 pipelines)    | Deploy system breaks   |
| `full-app-stream/` (dir)        | **~1,339** | AI streaming route (285 + 6 modules)           | Build streaming breaks |

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
| Structured Logger | All console.log migrated to structured logger (229 statements across 39 files, Mar 29)                       |

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
│       │   └── full-app-stream/ # Modular SSE route (7 files, ~1,339 lines — split Mar 29)
│       ├── planning/           # Dual AI planning (start, stream, intelligence)
│       ├── web-search/         # Live web search for intelligence
│       └── wizard/             # Wizard phase generation
├── components/       # .tsx files (cleaned up — 28 orphaned components removed Mar 29)
│   ├── ai-plan/      # AI Plan step (PipelineStagesView, ConsensusResultView, AISelectionPanel)
│   ├── builder/      # NEW: Rebuilt builder UI (10 files — BuilderPage, LeftPanel, PreviewPanel, etc.)
│   ├── effects/      # Visual effects (CSS particles, renderers)
│   ├── layout-builder/  # Layout builder components
│   ├── review/       # Review step (14 files, includes AIPlanCard)
│   └── ...
├── contexts/         # React Context providers
│   └── BuilderContext.tsx      # Builder provider (960 lines — wraps 16 hooks, intent detection)
├── hooks/            # 45 custom hooks
│   ├── useDualAIPlan.ts           # Dual AI planning pipeline
│   ├── useBackgroundIntelligence.ts # Background intelligence pre-caching
│   └── ...
├── services/         # ~100 business logic services (modularized Mar 29-30)
│   ├── codeParser/             # AST parsing (8 files, ~1,115 lines — split from CodeParser.ts Mar 30)
│   ├── deployment/             # Deployment (5 files, ~1,397 lines — split from Orchestrator Mar 30)
│   ├── TitanPipelineService.ts # Agentic pipeline
│   ├── BackgroundPlanningOrchestrator.ts # Dual AI 5-stage pipeline
│   ├── ConsensusNegotiator.ts  # Claude-Gemini consensus
│   └── ...
├── store/            # Zustand centralized state (modularized Mar 30)
│   ├── useAppStore.ts          # Main store (385 lines — down from 977)
│   └── slices/                 # 9 slice files (~685 lines total)
├── types/            # TypeScript types (modularized)
│   ├── layoutDesign/           # Design type system (8 files, 3,343 lines)
│   ├── dynamicPhases/          # Phase types (9 files, ~1,105 lines — split Mar 29)
│   ├── titanPipeline.ts        # Pipeline types
│   ├── dualPlanning.ts         # Dual AI planning types
│   └── ...
├── utils/            # Utilities (cleaned — 12 orphaned utils removed Mar 29)
│   ├── layoutValidation/       # Zod validation (6 files, ~1,214 lines — split Mar 30)
│   ├── astModifier.ts + 5 modules # AST modification
│   └── ...
├── lib/              # Server-side utilities (4 files)
├── data/             # Presets and templates (14 files)
└── prompts/          # AI system prompts (8 files)
```

---

## Known Risks & Tech Debt

| Risk                                     | Severity | Mitigation                                                                                      |
| ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `appConcept` dependency explosion        | HIGH     | 51 dependencies; any change is expensive. Freeze this interface.                                |
| ~~`CodeParser.ts` is 1,070 lines~~       | RESOLVED | **Split into `codeParser/` directory (8 files, ~1,115 lines) Mar 30**                           |
| Browser memory with large file histories | MEDIUM   | Move historical versions to IndexedDB                                                           |
| AI rate limits at scale                  | HIGH     | Enterprise quotas, multiple keys, Inngest queueing                                              |
| Titan Pipeline complexity                | MEDIUM   | Maturing system; ensure proper error handling across agents                                     |
| In-memory stores (single-instance only)  | MEDIUM   | `planningSessionStore`, Railway deploy Map, CodeContextService — needs Redis for multi-instance |

**Resolved Risks (as of Mar 30, 2026):**

- ~~`DynamicPhaseGenerator.ts` 2.6k lines~~ → **Refactored to 685 lines**
- ~~`layoutDesign.ts` 3k lines~~ → **Split into `types/layoutDesign/` directory (8 files, 3,343 lines)**
- ~~`PhaseExecutionManager.ts` 2.1k lines~~ → **Refactored to 779 lines**
- ~~`MainBuilderView.tsx` 1.6k lines~~ → **DELETED** — replaced by `components/builder/` + `BuilderContext.tsx`
- ~~`CodeParser.ts` 1,070 lines~~ → **Split into `services/codeParser/` directory (8 files, ~1,115 lines)**
- ~~`useAppStore.ts` 977 lines~~ → **Split into 385-line store + 9 slice files (~685 lines)**
- ~~`DeploymentOrchestrator.ts` 1,212 lines~~ → **Split into 260-line orchestrator + 4 pipeline modules**
- ~~`full-app-stream/route.ts` 1,279 lines~~ → **Split into 285-line route + 6 focused modules**
- ~~`dynamicPhases.ts` 1,015 lines~~ → **Split into `types/dynamicPhases/` directory (9 files, ~1,105 lines)**
- ~~`layoutValidation.ts` 1,146 lines~~ → **Split into `utils/layoutValidation/` directory (6 files, ~1,214 lines)**
- ~~229 console.log statements~~ → **Migrated to structured logger across 39 files**
- ~~28 orphaned files (~10,100 lines dead code)~~ → **DELETED**

---

## System Modes

### Wizard (Step 1)

Natural conversation → builds `AppConcept` with features, tech requirements, UI preferences. Architecture generation enriches concept context. No phase generation at this stage.

### Builder (Step 5)

Phase-by-phase code generation → quality checks → live preview. Phase plan generated in Review (Step 4) with architecture context.

---

## Key Entry Points

| File                                | Lines   | Purpose                                                       |
| ----------------------------------- | ------- | ------------------------------------------------------------- |
| `BuilderContext.tsx`                | 960     | Builder provider — 16 hooks, intent routing, context assembly |
| `NaturalConversationWizard.tsx`     | 751     | Conversation wizard UI (AppConcept building)                  |
| `PhaseExecutionManager.ts`          | 832     | Phase execution                                               |
| `useDynamicBuildPhases.ts`          | 700     | Phase execution hook                                          |
| `DynamicPhaseGenerator.ts`          | 685     | Phase planning                                                |
| `BackgroundPlanningOrchestrator.ts` | 640     | Dual AI 5-stage pipeline orchestrator                         |
| `useLayoutBuilder.ts`               | 599     | Layout builder state + GENERATE mode                          |
| `TitanPipelineService.ts`           | 497     | Titan Pipeline orchestrator                                   |
| `useDualAIPlan.ts`                  | 489     | Dual AI planning hook (SSE, escalation)                       |
| `useAppStore.ts` + `slices/`        | 385+685 | Zustand state (modularized into 10 files)                     |
| `GeminiLayoutCritique.ts`           | 286     | Vision critique for healing loop (new SDK + code execution)   |
| `useBackgroundIntelligence.ts`      | 115     | Background intelligence pre-caching                           |

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

### Mar 30, 2026 - Continued Modularization (3 commits)

- **Split**: `useAppStore.ts` 977 → 385 lines + 9 Zustand slice files in `store/slices/` (~685 lines total)
  - `chatSlice.ts` (43), `componentsSlice.ts` (56), `dataSlice.ts` (195), `documentationSlice.ts` (55), `dualPlanningSlice.ts` (65), `fileStorageSlice.ts` (78), `modeSlice.ts` (25), `uiSlice.ts` (118), `versionControlSlice.ts` (50)
- **Split**: `DeploymentOrchestrator.ts` 1,212 → 260 lines + 4 focused pipeline modules
  - `WebDeploymentPipeline.ts` (458), `DesktopDeploymentPipeline.ts` (279), `MobileDeploymentPipeline.ts` (246), `deploymentTypes.ts` (154)
- **Split**: `layoutValidation.ts` 1,146 → 6 files in `utils/layoutValidation/`
  - `schemas.ts` (382), `inference.ts` (311), `hierarchy.ts` (234), `sanitization.ts` (195), `rendering.ts` (61), `index.ts` (31)
- **Split**: `CodeParser.ts` 1,071 → 8 files in `services/codeParser/`
  - `CodeParser.ts` (202), `fileClassifier.ts` (195), `componentExtractor.ts` (189), `importExportExtractor.ts` (181), `apiExtractor.ts` (143), `hookExtractor.ts` (99), `parserHelpers.ts` (99), `index.ts` (7)

### Mar 29, 2026 - Major Code Cleanup & Refactoring (11 commits)

- **Deleted**: 28 orphaned files (~10,100 lines of dead code) including:
  - Components: `MainBuilderView`, `AnalysisProgressIndicator`, `AnimationTimeline`, `ArchitectureTemplatePicker`, `ComponentLibraryPanel`, `EasingCurveEditor`, `KeyframeEditor`, `LayerPanel`, `ReferenceMediaPanel`, `TemplateSelector`, `ValidationMessage`, `ArchitectureReviewPanel`, `DragDropCanvas`
  - Services: `CodeParser.ts` (monolith), `SourceMergeEngine.ts`, `modelRouter.ts`
  - Hooks: `useBrowserSupport.ts`, `usePlanRegeneration.ts`
  - Utils: `colorExtraction`, `imageCache`, `mockContentGenerator`, `videoProcessor`, `codeExporter`, `darkModeGenerator`, `documentationCapture`, `elementSelection`, `escapeHtml`, `layoutConverter`, `specSheetExport`, `variantGenerator`
  - Agents: entire `src/agents/` directory (1,320 lines — CodeTransformAgent, DeploymentAgent, types)
- **Fixed**: 59 unused-var and prefer-const lint warnings
- **Updated**: 27 safe dependencies to latest minor/patch versions
- **Fixed**: anonymous default exports, replaced `<img>` with `next/image`
- **Migrated**: 229 console.log/warn/error statements → structured logger across 39 files
- **Fixed**: 36 non-null assertion (`!`) warnings across 14 files
- **Fixed**: 10 straggler console and non-null assertion warnings
- **Split**: `full-app-stream/route.ts` 1,279 → 285 lines + 6 focused modules
  - `promptAssembler.ts` (249), `responseParser.ts` (234), `streamProcessor.ts` (224), `requestValidator.ts` (168), `agenticProcessor.ts` (90), `types.ts` (89)
- **Split**: `dynamicPhases.ts` 1,015 → 9 files in `types/dynamicPhases/`
  - `structures.ts` (280), `integrity.ts` (220), `patterns.ts` (199), `execution.ts` (116), `classification.ts` (90), `config.ts` (73), `manager.ts` (65), `analysis.ts` (35), `index.ts` (27)
- **Extracted**: `BuilderContext` helpers + fixed lint warnings
- **Added**: `utils/builderHelpers.ts` (67 lines), `utils/messageUtils.ts` (39 lines)
- **Added**: `prompts/production-standards.ts`, `prompts/quality-standards.ts`, `prompts/full-app/examples-compressed.ts`
- **Stats**: 229 files changed, 17,242 insertions, 19,004 deletions (net -1,762 lines)

### Mar 22, 2026 - Builder Pipeline Bug Fixes (2 commits)

- **Fixed**: 5 builder pipeline bugs — export default, code context, auth override, state reset, conversation leak
- **Fixed**: Wired `autoAdvance` to `BuilderContext` + filtered assistant messages from `conversationContext`

### Mar 16, 2026 - Full Builder Page Rebuild + Bug Fix Rounds (20 commits)

**Builder Page Rebuild (8 sessions):**

- **Session 0**: Cleaned up dead code, created builder placeholders, added CSS aliases in `globals.css`
- **Session 1**: Built `BuilderContext.tsx` (960 lines) — single provider wrapping 16 hooks, intent detection engine
- **Session 2**: Built `BuilderPage.tsx` shell + `ModalManager.tsx` with overlay system
- **Session 3-6**: Built `LeftPanel`, `PhaseStatusBar`, `PreviewPanel` (393 lines), `ConceptDrawer` (362 lines), `InputBar` (121 lines), `MessageList` (171 lines), `PanelHeader`, `PreviewToolbar` (188 lines)
- **Session 7**: Route swap integration, MODIFY fix, Sandpack + Nodebox preview
- **Session 8**: Polish — theme modal interiors, docs update
- **New**: `src/components/builder/` directory (10 files) + `src/contexts/BuilderContext.tsx`
- **Deleted**: `MainBuilderView.tsx` (940 lines) — replaced by new builder system

**Post-Rebuild Bug Fixes (4 rounds, 7 commits):**

- Round 1: Fixed 4 bugs — stale data, phase execution, Sandpack, scroll
- Round 2: Fixed 3 bugs — concept sync, Sandpack App.tsx, null result
- Round 3: Fixed API timeout, preview sizing, phase naming
- Round 4: Auth gating, error messages, prompt optimization, message sanitization
- Round 4 follow-ups: Agentic NO_FILES snippet, PLAN branch removal

**Documentation:**

- Added comprehensive Builder page test report (18 → 30 bugs, orphaned systems, full feature audit)
- Added TODO.md, BUGFIX_ROUND4.md, rebuild workflow docs (8 session docs)
- Added rebuild blueprints and session plans

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
