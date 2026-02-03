# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: This file provides full project context for Antigravity, Claude Code, and other AI tools.
> **Status**: VERIFIED (Feb 3, 2026)

---

## Quick Stats

| Metric               | Previous | Verified (Actual) |
| -------------------- | -------- | ----------------- |
| TypeScript/TSX Files | 547      | **547**           |
| API Route Handlers   | 60       | **60**            |
| Custom Hooks         | 35       | **35**            |
| Service Classes      | 73       | **73**            |
| Type Definitions     | ~12,953  | **~12,987 lines** |
| Utilities            | ~24,728  | **~24,728 lines** |

**Stack**: Next.js 15.5 / React 19 / TypeScript / Tailwind CSS / Zustand 4.5 / Supabase / Tree-sitter

---

## System Architecture Flow (4-Step Page Navigation)

```
Step 1: /app/wizard (NaturalConversationWizard)
    → User builds AppConcept via natural conversation
    → Architecture + Phase Plan generated
    → Navigates to /app/design
    ↓
Step 2: /app/design (LayoutBuilderView)
    → User uploads reference images / sketches
    → Gemini Vision analyzes layout (GeminiLayoutService)
    → Self-healing vision loop refines components
    → Layout saved to Zustand store
    → Navigates to /app/review
    ↓
Step 3: /app/review (ReviewPage - 13 components)
    → User reviews concept, features, phases, layout, settings
    → "Build App" triggers Titan Pipeline
    → Navigates to /app
    ↓
Step 4: /app (MainBuilderView)
    → Titan Pipeline: Router → Surveyor → Photographer → Builder
    → Phase 1 auto-completes by injecting layout code
    → Subsequent phases use Claude AI via PhaseExecutionManager
    → Sandpack preview + self-healing vision loop
    → Version history and rollback
```

**Key Data Persistence Points (Zustand + localStorage):**

- `appConcept` - Created in Wizard (Step 1), used throughout
- `dynamicPhasePlan` - Created in Wizard (Step 1), used in Builder (Step 4)
- `layoutBuilderFiles` - Created in Design (Step 2), injected in Phase 1 (Step 4)
- `currentLayoutManifest` - Created in Design (Step 2), used in Builder (Step 4)
- `currentDesignSpec` - Extracted from images in Design (Step 2)
- `components` / `currentComponent` - Generated code, persists across navigation

---

## Titan Pipeline (Updated Feb 3, 2026)

Core agentic pipeline for transforming visual sources (images/sketches) + instructions into generated React/Tailwind code.

```
Input (Images + Instructions) → Router (Intent Analysis)
    ↓
Surveyor (Gemini Vision → VisualManifest[])
    ↓
Architect → Currently bypassed (returns null)
    ↓
Physicist → Currently bypassed (returns null)
    ↓
Photographer (Gemini Image Generation → Asset URLs)
    ↓
Builder (Gemini → React/Tailwind Code)
    ↓
Self-Healing Vision Loop (Screenshot → Critique → Fix → Repeat)
```

**Key Files:**

- `src/services/TitanPipelineService.ts` (~1,074 lines) - Main pipeline orchestrator
- `src/services/GeminiLayoutService.ts` (~1,364 lines) - Vision analysis + critique
- `src/services/GeminiImageService.ts` (~116 lines) - Multimodal image generation
- `src/services/AppImageGenerator.ts` (~277 lines) - Image generation + Supabase upload
- `src/services/AssetExtractionService.ts` (~251 lines) - Sharp-based image cropping
- `src/services/VisionLoopEngine.ts` (~499 lines) - Self-healing vision loop
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
- `src/services/EnhancedVideoAnalyzer.ts` (166 lines) - Video analysis for motion extraction
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
| `GeminiLayoutService.ts`    | ~5 files     | Layout AI service (1,364 lines)     |
| Deployment services cluster | 10+ files    |                                     |

### TIER 3: NEW PIPELINE SERVICES (1-3 dependents each)

| File                       | Lines | Notes                       |
| -------------------------- | ----- | --------------------------- |
| `TitanPipelineService.ts`  | 1,074 | Titan Pipeline orchestrator |
| `MotionMapper.ts`          | 350   | Animation mapping           |
| `SourceMergeEngine.ts`     | 322   | Multi-source merging        |
| `EnhancedVideoAnalyzer.ts` | 166   | Video motion extraction     |

### TIER 4: HOOKS & COMPONENTS (1-3 dependents each)

Lower risk, but still follow patterns.

- `types/designSpec.ts` (Design System Specs)
- `types/titanPipeline.ts` (Pipeline Types - NEW)
- `types/motionConfig.ts` (Motion Types - NEW)
- `utils/colorUtils.ts` (Color Utilities)
- `services/GeminiLayoutService.ts` (Verified)

---

## Critical Files — DO NOT BREAK

| File                            | Lines     | Purpose                              | Risk                                          |
| ------------------------------- | --------- | ------------------------------------ | --------------------------------------------- |
| `useAppStore.ts`                | **804**   | Centralized Zustand state (8 slices) | 24+ files break                               |
| `types/layoutDesign.ts`         | **2,999** | Comprehensive design type system     | 14 files — **RECOMMEND SPLITTING**            |
| `middleware.ts`                 | **87**    | Auth flow for all routes             | Auth breaks                                   |
| `DynamicPhaseGenerator.ts`      | **2,718** | Phase planning engine                | Build system breaks — **RECOMMEND SPLITTING** |
| `PhaseExecutionManager.ts`      | **2,095** | Phase execution orchestrator         | Build system breaks                           |
| `GeminiLayoutService.ts`        | **1,364** | Layout AI with Gemini Vision         | Layout builder breaks                         |
| `MainBuilderView.tsx`           | **1,622** | Main orchestrator + Titan Pipeline   | UI breaks                                     |
| `NaturalConversationWizard.tsx` | **806**   | PLAN mode wizard UI                  | Planning breaks                               |
| `TitanPipelineService.ts`       | **1,075** | Titan Pipeline orchestrator          | Pipeline breaks                               |

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

| Pattern           | Implementation                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| State Management  | Zustand + Immer middleware, 8 slices                                               |
| Context Selection | `CodeContextService` — smart file selection to reduce tokens                       |
| Live Preview      | Sandpack                                                                           |
| Code Parsing      | Tree-sitter for AST analysis                                                       |
| Background Jobs   | Inngest                                                                            |
| AI Providers      | Claude (logic/code), Gemini (vision/layout/images), OpenAI (embeddings/proxy only) |
| Motion Mapping    | `MotionMapper` — extracts animations from video/design (NEW)                       |
| Visual Effects    | `effects/` components — CSS particles, keyframe injection (NEW)                    |
| Agentic Pipelines | `TitanPipelineService` — multi-agent orchestration (NEW)                           |

---

## Directory Structure

```
src/
├── agents/           # Agentic architecture (1,320 lines) [NEW]
│   ├── CodeTransformAgent.ts   # Code transformations
│   ├── DeploymentAgent.ts      # Deployment workflows
│   └── types.ts                # Agent types
├── app/              # Next.js App Router + API routes (60 handlers)
│   └── (protected)/app/review/ # Review page [NEW]
├── components/       # 29 top-level + modals + sub-components
│   ├── effects/      # Visual effects (CSS particles, renderers)
│   ├── layout-builder/  # Layout builder components
│   └── ...
├── hooks/            # 35 custom hooks
├── services/         # 73 business logic services
│   ├── TitanPipelineService.ts  # Agentic pipeline
│   ├── MotionMapper.ts          # Animation mapping
│   ├── SourceMergeEngine.ts     # Source merging
│   └── ...
├── store/            # Zustand centralized state
├── types/            # 12,987 lines of TypeScript types
│   ├── titanPipeline.ts   # Pipeline types
│   ├── motionConfig.ts    # Motion types
│   └── ...
├── utils/            # 24,728 lines of utilities
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
| `GeminiLayoutService.ts` is 1.4k lines   | MEDIUM       | Growing; monitor for split opportunities                                            |
| `appConcept` dependency explosion        | HIGH         | 51 dependencies; any change is expensive. Freeze this interface.                    |
| Browser memory with large file histories | MEDIUM       | Move historical versions to IndexedDB                                               |
| AI rate limits at scale                  | HIGH         | Enterprise quotas, multiple keys, Inngest queueing                                  |
| Titan Pipeline complexity                | MEDIUM       | New system; ensure proper error handling across agents                              |

---

## Dual-Mode System

### PLAN Mode

Natural conversation → builds `AppConcept` with features, tech requirements, UI preferences

### ACT Mode

Phase-by-phase code generation → quality checks → live preview

---

## Key Entry Points

| File                            | Lines | Purpose                                                       |
| ------------------------------- | ----- | ------------------------------------------------------------- |
| `MainBuilderView.tsx`           | 1,622 | Main orchestrator — Titan Pipeline integration, phase control |
| `NaturalConversationWizard.tsx` | 806   | PLAN mode wizard UI                                           |
| `useAppStore.ts`                | 804   | Centralized state                                             |
| `DynamicPhaseGenerator.ts`      | 2,718 | Phase planning                                                |
| `PhaseExecutionManager.ts`      | 2,095 | Phase execution                                               |
| `GeminiLayoutService.ts`        | 1,364 | Layout AI + Vision critique                                   |
| `TitanPipelineService.ts`       | 1,075 | Titan Pipeline orchestrator                                   |

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
