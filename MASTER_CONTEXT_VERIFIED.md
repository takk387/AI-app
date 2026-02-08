# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: This file provides full project context for Antigravity, Claude Code, and other AI tools.
> **Status**: VERIFIED (Feb 8, 2026 — post wizard cleanup + CREATE mode streamlining)

---

## Quick Stats

| Metric               | Previous | Verified (Actual) |
| -------------------- | -------- | ----------------- |
| TypeScript/TSX Files | 547      | **582**           |
| API Route Handlers   | 60       | **65**            |
| Custom Hooks         | 35       | **38**            |
| Service Classes      | 73       | **82**            |
| Type Definitions     | ~12,987  | **~13,940 lines** |
| Utilities            | ~24,728  | **~24,728 lines** |

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
Step 5: /app (MainBuilderView)
    → Titan Pipeline: Router → Surveyor → [Photographer] → Builder
      (CREATE mode skips Photographer — goes Router → Surveyor → Builder directly)
    → Phase 1 auto-completes by injecting layout code (tryStartPhase1)
    → Subsequent phases use Claude AI via PhaseExecutionManager
    → Sandpack preview + self-healing vision loop
    → Version history and rollback
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

- `src/services/TitanPipelineService.ts` (~578 lines) - Main pipeline orchestrator
- `src/services/GeminiLayoutCritique.ts` (~286 lines) - Vision critique for healing loop (new SDK + code execution)
- `src/services/GeminiImageService.ts` (~122 lines) - Multimodal image generation (new SDK)
- `src/services/AppImageGenerator.ts` (~277 lines) - Image generation + Supabase upload
- `src/services/AssetExtractionService.ts` (~276 lines) - Sharp-based image cropping
- `src/services/VisionLoopEngine.ts` (~504 lines) - Self-healing vision loop
- `src/services/LayoutAutoFixEngine.ts` (~465 lines) - Auto-fix from AI critique
- `src/types/titanPipeline.ts` (~219 lines) - Pipeline types
- `src/types/layoutAnalysis.ts` (~192 lines) - Critique/healing types
- `src/utils/layoutValidation.ts` (~1,111 lines) - Zod schema validation

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
| `types/codeReview.ts`       | **15 files** | Validation layer types              |
| `DynamicPhaseGenerator.ts`  | ~8 files     | Core planning engine (2,646 lines)  |
| `PhaseExecutionManager.ts`  | ~4 files     | Core execution engine (2,095 lines) |
| `GeminiLayoutCritique.ts`   | ~2 files     | Vision critique service (286 lines) |
| Deployment services cluster | 10+ files    |                                     |

### TIER 3: PIPELINE & PLANNING SERVICES (1-3 dependents each)

| File                                | Lines | Notes                             |
| ----------------------------------- | ----- | --------------------------------- |
| `TitanPipelineService.ts`           | 578   | Titan Pipeline orchestrator       |
| `BackgroundPlanningOrchestrator.ts` | ~500  | Dual AI 5-stage pipeline          |
| `ConsensusNegotiator.ts`            | ~300  | Claude-Gemini consensus           |
| `DualValidationOrchestrator.ts`     | ~250  | Cross-validation of architectures |
| `LiveIntelligenceGatherer.ts`       | ~400  | Web search + AI intelligence      |
| `LayoutBackendAnalyzer.ts`          | ~200  | Layout-to-backend analysis        |
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

| File                            | Lines     | Purpose                                   | Risk                                          |
| ------------------------------- | --------- | ----------------------------------------- | --------------------------------------------- |
| `useAppStore.ts`                | **804**   | Centralized Zustand state (10 slices, v5) | 24+ files break                               |
| `types/layoutDesign.ts`         | **2,999** | Comprehensive design type system          | 14 files — **RECOMMEND SPLITTING**            |
| `middleware.ts`                 | **87**    | Auth flow for all routes                  | Auth breaks                                   |
| `DynamicPhaseGenerator.ts`      | **2,718** | Phase planning engine                     | Build system breaks — **RECOMMEND SPLITTING** |
| `PhaseExecutionManager.ts`      | **2,095** | Phase execution orchestrator              | Build system breaks                           |
| `MainBuilderView.tsx`           | **1,622** | Main orchestrator + Titan Pipeline        | UI breaks                                     |
| `NaturalConversationWizard.tsx` | **657**   | Conversation wizard UI                    | Planning breaks                               |
| `TitanPipelineService.ts`       | **578**   | Titan Pipeline orchestrator               | Pipeline breaks                               |

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

---

## Key Patterns

| Pattern           | Implementation                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| State Management  | Zustand + Immer middleware, 10 slices, v5 migrations                                                         |
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

---

## Directory Structure

```
src/
├── agents/           # Agentic architecture (1,320 lines)
│   ├── CodeTransformAgent.ts   # Code transformations
│   ├── DeploymentAgent.ts      # Deployment workflows
│   └── types.ts                # Agent types
├── app/              # Next.js App Router + API routes (60+ handlers)
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
├── components/       # 29 top-level + modals + sub-components
│   ├── ai-plan/      # AI Plan step (PipelineStagesView, ConsensusResultView, AISelectionPanel)
│   ├── effects/      # Visual effects (CSS particles, renderers)
│   ├── layout-builder/  # Layout builder components
│   ├── review/       # Review step (14 files, includes AIPlanCard)
│   ├── ConsensusEscalationDialog.tsx  # Dual AI escalation modal
│   └── ...
├── hooks/            # 35+ custom hooks
│   ├── useDualAIPlan.ts           # Dual AI planning pipeline
│   ├── useBackgroundIntelligence.ts # Background intelligence pre-caching
│   └── ...
├── services/         # 73+ business logic services
│   ├── TitanPipelineService.ts           # Agentic pipeline
│   ├── BackgroundPlanningOrchestrator.ts # Dual AI 5-stage pipeline
│   ├── ConsensusNegotiator.ts            # Claude-Gemini consensus
│   ├── DualValidationOrchestrator.ts     # Cross-validation
│   ├── LiveIntelligenceGatherer.ts       # Web search + AI intelligence
│   ├── LayoutBackendAnalyzer.ts          # Layout-to-backend analysis
│   └── ...
├── store/            # Zustand centralized state (10 slices, v5 migrations)
├── types/            # ~13,200 lines of TypeScript types
│   ├── titanPipeline.ts   # Pipeline types (incl. expanded AppContext)
│   ├── dualPlanning.ts    # Dual AI planning types (stages, SSE, escalation)
│   ├── motionConfig.ts    # Motion types
│   └── ...
├── lib/              # Server-side utilities
│   └── planningSessionStore.ts  # In-memory planning session store (TTL)
├── utils/            # ~24,800 lines of utilities
│   ├── architectureToPhaseContext.ts # Architecture → phase context converter
│   ├── snapEngine.ts           # Alignment engine
│   ├── inspectorBridge.ts      # Inspector bridge
│   ├── responsiveTypography.ts # Typography utils
│   └── ...
└── prompts/          # AI system prompts
```

---

## Known Risks & Tech Debt

| Risk                                     | Severity     | Mitigation                                                                          |
| ---------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `DynamicPhaseGenerator.ts` is 2.6k lines | **CRITICAL** | ✅ Service-to-Service rule relaxed (Jan 29, 2026) — NOW: Split into Domain Services |
| `layoutDesign.ts` is 3k lines            | HIGH         | Split into `layout/typography`, `layout/grids`, etc.                                |
| `PhaseExecutionManager.ts` is 2.1k lines | HIGH         | Consider splitting by phase type                                                    |
| `appConcept` dependency explosion        | HIGH         | 51 dependencies; any change is expensive. Freeze this interface.                    |
| Browser memory with large file histories | MEDIUM       | Move historical versions to IndexedDB                                               |
| AI rate limits at scale                  | HIGH         | Enterprise quotas, multiple keys, Inngest queueing                                  |
| Titan Pipeline complexity                | MEDIUM       | New system; ensure proper error handling across agents                              |

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
| `MainBuilderView.tsx`               | 1,622 | Main orchestrator — Titan Pipeline integration, phase control |
| `NaturalConversationWizard.tsx`     | 657   | Conversation wizard UI (AppConcept building)                  |
| `useAppStore.ts`                    | 804   | Centralized state (10 slices, v5 migrations)                  |
| `DynamicPhaseGenerator.ts`          | 2,718 | Phase planning                                                |
| `PhaseExecutionManager.ts`          | 2,095 | Phase execution                                               |
| `GeminiLayoutCritique.ts`           | 286   | Vision critique for healing loop (new SDK + code execution)   |
| `TitanPipelineService.ts`           | 578   | Titan Pipeline orchestrator                                   |
| `BackgroundPlanningOrchestrator.ts` | ~500  | Dual AI 5-stage pipeline orchestrator                         |
| `useDualAIPlan.ts`                  | ~300  | Dual AI planning hook (SSE, escalation)                       |
| `useBackgroundIntelligence.ts`      | ~150  | Background intelligence pre-caching                           |
| `ai-plan/page.tsx`                  | ~200  | Step 3 - Dual AI architecture planning page                   |

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
| `BackgroundPlanningOrchestrator.ts` | ~500  | 5-stage pipeline orchestrator                   |
| `ConsensusNegotiator.ts`            | ~300  | Claude-Gemini consensus engine                  |
| `DualValidationOrchestrator.ts`     | ~250  | Cross-validation of architectures               |
| `LiveIntelligenceGatherer.ts`       | ~400  | Web search + AI intelligence                    |
| `LayoutBackendAnalyzer.ts`          | ~200  | Layout-to-backend requirements analysis         |
| `useDualAIPlan.ts`                  | ~300  | SSE streaming hook for planning pipeline        |
| `useBackgroundIntelligence.ts`      | ~150  | Background pre-caching during Design step       |
| `ConsensusEscalationDialog.tsx`     | ~200  | User escalation modal for disagreements         |
| `types/dualPlanning.ts`             | ~200  | Planning types (stages, SSE events, escalation) |
| `lib/planningSessionStore.ts`       | ~100  | In-memory session store with TTL                |
| `architectureToPhaseContext.ts`     | ~100  | Architecture → phase context converter          |

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

### Core Files (Updated Feb 1, 2026)

| File                    | Lines | Purpose                                            |
| ----------------------- | ----- | -------------------------------------------------- |
| `LayoutBuilderView.tsx` | 286   | Main layout builder view                           |
| `LayoutCanvas.tsx`      | 512   | Canvas rendering/interaction (+preflight fix)      |
| `useLayoutBuilder.ts`   | 496   | Layout builder hook (expanded for data flow fixes) |

### Supporting Components

| File                           | Lines | Purpose                     |
| ------------------------------ | ----- | --------------------------- |
| `DynamicLayoutRenderer.tsx`    | ~200  | Dynamic component rendering |
| `GenericComponentRenderer.tsx` | ~300  | Generic component rendering |
| `FloatingEditBubble.tsx`       | ~150  | Inline editing UI           |
| `KeyframeInjector.tsx`         | 185   | CSS animation injection     |

---

## Recent Changes Log

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
- **Updated**: `useAppStore.ts` - 10 slices (added planning slices), v5 migration chain
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
