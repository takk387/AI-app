# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: This file provides full project context for Antigravity, Claude Code, and other AI tools.
> **Status**: VERIFIED (Jan 31, 2026)

---

## Quick Stats

| Metric               | Previous | Verified (Actual) |
| -------------------- | -------- | ----------------- |
| TypeScript/TSX Files | 523      | **538**           |
| API Route Handlers   | 58       | **59**            |
| Custom Hooks         | 39       | **35**            |
| Service Classes      | 76       | **73**            |
| Type Definitions     | ~11,988  | **~12,833 lines** |
| Utilities            | ~23,437  | **~24,728 lines** |

**Stack**: Next.js 15.5 / React 19 / TypeScript / Tailwind CSS / Zustand 4.5 / Supabase / Tree-sitter

---

## System Architecture Flow

```
User Input → NaturalConversationWizard (PLAN mode)
    ↓
AppConcept created (51 files import this type)
    ↓
DynamicPhaseGenerator → 3-25+ adaptive phases
    ↓
useAppStore (central state - 24 files depend on this)
    ↓
PhaseExecutionManager → SSE streaming code generation
    ↓
CodeReviewService → Quality validation (lazy-loaded)
    ↓
Preview (Sandpack) + Version History
```

### Step-Based Navigation Flow

```
/app/wizard  →  /app/design  →  /app/build  →  /app (builder)
     ↓              ↓               ↓              ↓
 AppConcept    LayoutManifest   Build Phases    Code Editor
 PhasePlan     DesignSpec       Quality Check   Preview
     └────────────────────────────────────────────┘
              Data persists via Zustand + localStorage
```

**Key Data Persistence Points:**

- `appConcept` - Created in Wizard, used throughout
- `dynamicPhasePlan` - Created in Wizard, used in Build
- `currentLayoutManifest` - Created in Design, used in Builder
- `currentDesignSpec` - Extracted from images in Design
- `components` / `currentComponent` - Generated code, persists across navigation

---

## Titan Pipeline (Added Jan 31, 2026)

A new agentic pipeline for advanced layout generation from visual sources (images/videos).

```
Input (Image/Video/Text) → Router (Traffic Control)
    ↓
Surveyor (Vision Analysis via Gemini)
    ↓
Architect (Structure via Claude Opus)
    ↓
Physicist (Animation/Motion Math)
    ↓
Photographer (Asset Generation)
    ↓
Builder (Code Synthesis)
    ↓
Live Editor (Refinement)
```

**Key Files:**

- `src/services/TitanPipelineService.ts` (511 lines) - Main orchestrator
- `src/types/titanPipeline.ts` (196 lines) - Pipeline types
- `src/app/api/layout/pipeline/route.ts` - API endpoint

**Pipeline Steps:**
| Step | Model | Purpose |
|------|-------|---------|
| Router | Gemini Flash | Intent analysis, traffic control |
| Surveyor | Gemini Pro | Vision analysis, UI reverse engineering |
| Architect | Claude Opus | Component structure generation |
| Physicist | Gemini | Motion/animation extraction |
| Photographer | DALL-E/Gemini | Asset generation |
| Builder | Claude | Code synthesis |

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
| `GeminiLayoutService.ts`    | ~5 files     | Layout AI service (1,351 lines)     |
| Deployment services cluster | 10+ files    |                                     |

### TIER 3: NEW PIPELINE SERVICES (1-3 dependents each)

| File                       | Lines | Notes                         |
| -------------------------- | ----- | ----------------------------- |
| `TitanPipelineService.ts`  | 511   | Agentic pipeline orchestrator |
| `MotionMapper.ts`          | 350   | Animation mapping             |
| `SourceMergeEngine.ts`     | 322   | Multi-source merging          |
| `EnhancedVideoAnalyzer.ts` | 166   | Video motion extraction       |

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
| `useAppStore.ts`                | **761**   | Centralized Zustand state (8 slices) | 24+ files break                               |
| `types/layoutDesign.ts`         | **2,999** | Comprehensive design type system     | 14 files — **RECOMMEND SPLITTING**            |
| `middleware.ts`                 | **87**    | Auth flow for all routes             | Auth breaks                                   |
| `DynamicPhaseGenerator.ts`      | **2,646** | Phase planning engine                | Build system breaks — **RECOMMEND SPLITTING** |
| `PhaseExecutionManager.ts`      | **2,095** | Phase execution orchestrator         | Build system breaks                           |
| `GeminiLayoutService.ts`        | **1,351** | Layout AI with Gemini                | Layout builder breaks                         |
| `MainBuilderView.tsx`           | **1,164** | Main orchestrator (PLAN/ACT modes)   | UI breaks                                     |
| `NaturalConversationWizard.tsx` | **806**   | PLAN mode wizard UI                  | Planning breaks                               |
| `TitanPipelineService.ts`       | **511**   | Agentic vision pipeline              | Advanced layout breaks                        |

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

| Pattern           | Implementation                                                  |
| ----------------- | --------------------------------------------------------------- |
| State Management  | Zustand + Immer middleware, 8 slices                            |
| Context Selection | `CodeContextService` — smart file selection to reduce tokens    |
| Live Preview      | Sandpack                                                        |
| Code Parsing      | Tree-sitter for AST analysis                                    |
| Background Jobs   | Inngest                                                         |
| AI Providers      | Claude (logic/code), Gemini (vision/layout), DALL-E 3 (images)  |
| Motion Mapping    | `MotionMapper` — extracts animations from video/design (NEW)    |
| Visual Effects    | `effects/` components — CSS particles, keyframe injection (NEW) |
| Agentic Pipelines | `TitanPipelineService` — multi-agent orchestration (NEW)        |

---

## Directory Structure

```
src/
├── app/              # Next.js App Router + API routes (59 handlers)
├── components/       # 29 top-level + modals + sub-components
│   ├── effects/      # Visual effects (CSS particles, renderers) [NEW]
│   ├── layout-builder/  # Layout builder components
│   └── ...
├── hooks/            # 35 custom hooks
├── services/         # 73 business logic services
│   ├── TitanPipelineService.ts  # Agentic pipeline [NEW]
│   ├── MotionMapper.ts          # Animation mapping [NEW]
│   ├── SourceMergeEngine.ts     # Source merging [NEW]
│   └── ...
├── store/            # Zustand centralized state
├── types/            # 12,833 lines of TypeScript types
│   ├── titanPipeline.ts   # Pipeline types [NEW]
│   ├── motionConfig.ts    # Motion types [NEW]
│   └── ...
├── utils/            # 24,728 lines of utilities
│   ├── snapEngine.ts           # Alignment engine [NEW]
│   ├── inspectorBridge.ts      # Inspector bridge [NEW]
│   ├── responsiveTypography.ts # Typography utils [NEW]
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

| File                            | Lines | Purpose                                                  |
| ------------------------------- | ----- | -------------------------------------------------------- |
| `MainBuilderView.tsx`           | 1,164 | Main orchestrator — imports 15+ hooks, coordinates modes |
| `NaturalConversationWizard.tsx` | 806   | PLAN mode wizard UI                                      |
| `useAppStore.ts`                | 761   | Centralized state                                        |
| `DynamicPhaseGenerator.ts`      | 2,646 | Phase planning                                           |
| `PhaseExecutionManager.ts`      | 2,095 | Phase execution                                          |
| `GeminiLayoutService.ts`        | 1,351 | Layout AI service                                        |
| `TitanPipelineService.ts`       | 511   | Agentic vision pipeline [NEW]                            |

---

## Layout Builder System

### Core Files (Refactored Jan 31, 2026)

| File                    | Lines | Purpose                          |
| ----------------------- | ----- | -------------------------------- |
| `LayoutBuilderView.tsx` | 286   | Main layout builder view         |
| `LayoutCanvas.tsx`      | 492   | Canvas rendering/interaction     |
| `useLayoutBuilder.ts`   | 383   | Layout builder hook (refactored) |

### Supporting Components

| File                           | Lines | Purpose                     |
| ------------------------------ | ----- | --------------------------- |
| `DynamicLayoutRenderer.tsx`    | ~200  | Dynamic component rendering |
| `GenericComponentRenderer.tsx` | ~300  | Generic component rendering |
| `FloatingEditBubble.tsx`       | ~150  | Inline editing UI           |
| `KeyframeInjector.tsx`         | 185   | CSS animation injection     |

---

## Recent Changes Log

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
