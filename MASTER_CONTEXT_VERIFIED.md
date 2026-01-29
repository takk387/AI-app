# AI-APP-BUILDER - Master Context (Verified)

> **Purpose**: This file provides full project context for Antigravity, Claude Code, and other AI tools.
> **Status**: ✅ VERIFIED by Mr. Coder (Jan 27, 2026)

---

## Quick Stats

| Metric               | Claimed    | Verified (Actual) |
| -------------------- | ---------- | ----------------- |
| TypeScript/TSX Files | 514        | **519**           |
| API Route Handlers   | 88         | **57**            |
| Custom Hooks         | 37         | **35**            |
| Service Classes      | 80+        | **67**            |
| Type Definitions     | ~9k lines  | **~11,988 lines** |
| Utilities            | ~22k lines | **~23,437 lines** |

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
| `DynamicPhaseGenerator.ts`  | ~8 files     | Core planning engine (2,642 lines)  |
| `PhaseExecutionManager.ts`  | ~4 files     | Core execution engine (2,095 lines) |
| Deployment services cluster | 10+ files    |                                     |

### TIER 3: HOOKS & COMPONENTS (1-3 dependents each)

Lower risk, but still follow patterns.

- `types/designSpec.ts` (New Design System Specs)
- `utils/colorUtils.ts` (New Color Utilities)
- `services/GeminiLayoutService.ts` (Verified Existence)

---

## Critical Files — DO NOT BREAK

| File                            | Lines     | Purpose                              | Risk                                          |
| ------------------------------- | --------- | ------------------------------------ | --------------------------------------------- |
| `useAppStore.ts`                | **717**   | Centralized Zustand state (8 slices) | 24+ files break                               |
| `types/layoutDesign.ts`         | **2,821** | Comprehensive design type system     | 14 files — **RECOMMEND SPLITTING**            |
| `middleware.ts`                 | **87**    | Auth flow for all routes             | Auth breaks                                   |
| `DynamicPhaseGenerator.ts`      | **2,642** | Phase planning engine                | Build system breaks — **RECOMMEND SPLITTING** |
| `PhaseExecutionManager.ts`      | **2,095** | Phase execution orchestrator         | Build system breaks                           |
| `MainBuilderView.tsx`           | **1,164** | Main orchestrator (PLAN/ACT modes)   | UI breaks                                     |
| `NaturalConversationWizard.tsx` | **807**   | PLAN mode wizard UI                  | Planning breaks                               |

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

---

## Key Patterns

| Pattern           | Implementation                                                 |
| ----------------- | -------------------------------------------------------------- |
| State Management  | Zustand + Immer middleware, 8 slices                           |
| Context Selection | `CodeContextService` — smart file selection to reduce tokens   |
| Live Preview      | Sandpack                                                       |
| Code Parsing      | Tree-sitter for AST analysis                                   |
| Background Jobs   | Inngest                                                        |
| AI Providers      | Claude (logic/code), Gemini (vision/layout), DALL-E 3 (images) |

---

## Directory Structure

```
src/
├── app/           # Next.js App Router + API routes (57 handlers)
├── components/    # 29 top-level + modals + sub-components
├── hooks/         # 35 custom hooks
├── services/      # 67 business logic services
├── store/         # Zustand centralized state
├── types/         # 11,988 lines of TypeScript types
├── utils/         # 23,437 lines of utilities
└── prompts/       # AI system prompts
```

---

## Known Risks & Tech Debt

| Risk                                      | Severity     | Mitigation                                                                          |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `DynamicPhaseGenerator.ts` is 2.6k+ lines | **CRITICAL** | ✅ Service-to-Service rule relaxed (Jan 29, 2026) — NOW: Split into Domain Services |
| `layoutDesign.ts` is 2.8k+ lines          | HIGH         | Split into `layout/typography`, `layout/grids`, etc.                                |
| `appConcept` dependency explosion         | HIGH         | 51 dependencies; any change is expensive. Freeze this interface.                    |
| Browser memory with large file histories  | MEDIUM       | Move historical versions to IndexedDB                                               |
| AI rate limits at scale                   | HIGH         | Enterprise quotas, multiple keys, Inngest queueing                                  |

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
| `NaturalConversationWizard.tsx` | 807   | PLAN mode wizard UI                                      |
| `useAppStore.ts`                | 717   | Centralized state                                        |
| `DynamicPhaseGenerator.ts`      | 2,642 | Phase planning                                           |
| `PhaseExecutionManager.ts`      | 2,095 | Phase execution                                          |
