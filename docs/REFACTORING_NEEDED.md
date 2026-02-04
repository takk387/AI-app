# Files Needing Refactoring

> **Status**: ACTIVE  
> **Last Updated**: February 3, 2026  
> **Purpose**: Comprehensive list of files requiring refactoring with priority levels and recommendations

---

## Executive Summary

This document identifies **47+ files** across the AI-App project that need refactoring to improve:
- **Maintainability** - Reduce file sizes and complexity
- **Testability** - Split responsibilities for better unit testing
- **Performance** - Reduce coupling and improve tree-shaking
- **Developer Experience** - Clearer code organization and boundaries

**Key Metrics:**
- 3 files over 1,000 lines (CRITICAL)
- 2 files with 25+ dependencies (HIGH COUPLING)
- 6+ patterns of code duplication
- 73 service classes (consolidation opportunity)

**Estimated Total Effort**: 40-60 hours across all refactoring phases

---

## Priority 1: CRITICAL (Blocking Scale)

### 1.1 Mega Files (Over 1,000 Lines)

These files are too large to maintain and should be split immediately.

#### `src/utils/layoutValidation.ts` (1,111 lines)

**Current Issues:**
- Massive Zod schema definitions mixed with utility functions
- Multiple responsibilities: validation, sanitization, bounds checking
- Hard to test individual schemas
- Performance impact from loading entire file

**Refactoring Plan:**
```
Split into:
├── src/schemas/
│   ├── layoutSchemas.ts         # Core layout validation schemas
│   ├── componentSchemas.ts      # Component-specific schemas
│   ├── designTokenSchemas.ts    # Design system schemas
│   └── index.ts                 # Re-export all schemas
├── src/utils/
│   ├── componentBoundsUtils.ts  # Bounds calculation logic
│   ├── layoutSanitizers.ts      # Layout data sanitization
│   └── schemaValidators.ts      # High-level validation functions
```

**Impact:**
- Reduces single file from 1,111 → ~200 lines each (6 files)
- Enables lazy loading of schemas
- Improves tree-shaking
- Makes testing individual concerns easier

**Estimated Effort:** 8 hours

---

#### `src/services/TitanPipelineService.ts` (1,074 lines)

**Current Issues:**
- God object orchestrating 7 pipeline stages (Router → Surveyor → Architect → Physicist → Photographer → Builder → Vision Loop)
- High coupling to 15+ services and utilities
- Difficult to test individual stages
- Mixed concerns: orchestration + business logic

**Refactoring Plan:**
```
Extract to:
├── src/services/titan-pipeline/
│   ├── TitanPipeline.ts              # Main orchestrator (200 lines)
│   ├── steps/
│   │   ├── RouterStep.ts             # Intent analysis (150 lines)
│   │   ├── SurveyorStep.ts           # Vision analysis (180 lines)
│   │   ├── ArchitectStep.ts          # Component structure (100 lines)
│   │   ├── PhysicistStep.ts          # Animation extraction (100 lines)
│   │   ├── PhotographerStep.ts       # Asset generation (150 lines)
│   │   ├── BuilderStep.ts            # Code generation (180 lines)
│   │   └── VisionLoopStep.ts         # Self-healing (120 lines)
│   ├── types.ts                      # Pipeline-specific types
│   └── index.ts                      # Public exports
```

**Pattern:** Use Strategy Pattern with `PipelineStep` interface:
```typescript
interface PipelineStep<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
  validate?(output: TOutput): boolean;
}
```

**Impact:**
- Each step becomes independently testable
- Easier to add/remove/reorder pipeline stages
- Clear separation of concerns
- Enables parallel execution of independent steps

**Estimated Effort:** 12 hours

---

#### `src/services/GeminiLayoutService.ts` (1,364 lines)

**Current Issues:**
- Three distinct responsibilities in one service:
  1. Vision analysis (Gemini Vision API calls)
  2. Design spec extraction (parsing visual elements)
  3. Layout critique (quality assessment)
- High complexity with nested functions
- Difficult to mock for testing

**Refactoring Plan:**
```
Split into:
├── src/services/layout/
│   ├── LayoutVisionAnalyzer.ts      # Gemini Vision API (400 lines)
│   ├── DesignSpecExtractor.ts       # Parse visual manifest (450 lines)
│   ├── LayoutCritiqueEngine.ts      # Quality assessment (350 lines)
│   ├── LayoutServiceOrchestrator.ts # Coordinate the three (150 lines)
│   └── types.ts                     # Layout-specific types
```

**Impact:**
- Each service has single responsibility
- Can test vision, extraction, critique independently
- Easier to swap Gemini for alternative vision models
- Reduces cognitive load when modifying layout logic

**Estimated Effort:** 10 hours

---

### 1.2 High Coupling Issues

These files are imported by 20+ other files, creating tight coupling.

#### `src/store/useAppStore.ts` (804 lines, imported by 25+ files)

**Current Issues:**
- God store with 8+ slices (concept, build, layout, UI, version, debug, etc.)
- 40+ state fields and 50+ actions
- Every component imports entire store (poor tree-shaking)
- Hard to reason about state flow
- Changes affect 25+ files

**Refactoring Plan:**
```
Split into domain stores:
├── src/store/
│   ├── slices/
│   │   ├── useConceptStore.ts       # AppConcept, features, workflows
│   │   ├── useBuildStore.ts         # Phases, code generation, components
│   │   ├── useLayoutStore.ts        # Layout builder, design spec, manifest
│   │   ├── useUIStore.ts            # Panels, modals, active views
│   │   ├── useVersionStore.ts       # History, rollback, snapshots
│   │   └── useDebugStore.ts         # Debug info, logs
│   ├── useAppStore.ts               # Thin facade (optional - for backward compat)
│   └── types.ts                     # Store types
```

**Migration Strategy:**
```typescript
// Before
const { appConcept, components, isGenerating } = useAppStore();

// After (gradual migration)
const appConcept = useConceptStore(state => state.appConcept);
const components = useBuildStore(state => state.components);
const isGenerating = useBuildStore(state => state.isGenerating);
```

**Impact:**
- Reduces coupling from 25 files to ~5 per store
- Components only import what they need
- Better tree-shaking and bundle size
- Clearer ownership of state domains

**Estimated Effort:** 16 hours (high risk due to 25 dependents)

---

#### `src/services/PhaseExecutionManager.ts` (2,095 lines, imported by 8 files)

**Current Issues:**
- Multiple responsibilities:
  1. Building execution context (files, imports, dependencies)
  2. Running phase execution
  3. Validating generated code
  4. Tracking feature completion
- 2,000+ lines of mixed concerns
- Difficult to test individual responsibilities

**Refactoring Plan:**
```
Extract to:
├── src/services/phase-execution/
│   ├── PhaseContextBuilder.ts       # Context assembly (500 lines)
│   ├── PhaseExecutor.ts             # Actual execution logic (400 lines)
│   ├── PhaseValidationService.ts    # Code validation (300 lines)
│   ├── FeatureTracker.ts            # Feature completion tracking (200 lines)
│   ├── PhaseExecutionManager.ts     # Thin orchestrator (200 lines)
│   └── types.ts                     # Execution types
```

**Impact:**
- Each concern becomes testable in isolation
- Easier to enhance validation or context logic
- Clearer separation of build vs validation
- Reduces cognitive load

**Estimated Effort:** 14 hours

---

## Priority 2: HIGH IMPACT (Developer Experience)

### 2.1 Complex Components (500-1000 Lines)

#### `src/components/NaturalConversationWizard.tsx` (~806 lines)

**Current Issues:**
- Too many concerns: message handling, state, UI rendering, API calls
- 15+ useState hooks in single component
- Complex nested callbacks
- Hard to test business logic

**Refactoring Plan:**
```
Split into:
├── src/hooks/
│   └── useWizardConversation.ts     # All business logic (300 lines)
├── src/components/conversation-wizard/
│   ├── NaturalConversationWizard.tsx # Main (150 lines)
│   ├── WizardMessageThread.tsx       # Message list (200 lines)
│   ├── WizardInputArea.tsx           # Input + actions (150 lines)
│   └── WizardSidebar.tsx             # Settings/info (100 lines)
```

**Impact:**
- Business logic testable without React
- UI components focused on presentation
- Easier to modify conversation flow
- Better component reusability

**Estimated Effort:** 8 hours

---

#### `src/components/MainBuilderView.tsx` (~1,622 lines)

**Current Issues:**
- Kitchen sink component:
  - 12 imported hooks
  - 15+ modal states
  - Chat + Preview + Panels all mixed
- Difficult to understand data flow
- Hard to test individual features

**Refactoring Plan:**
```
Split into:
├── src/hooks/
│   └── useMainBuilderState.ts       # Centralized state logic (200 lines)
├── src/components/builder/
│   ├── MainBuilderView.tsx           # Layout orchestrator (300 lines)
│   ├── BuilderModalsContainer.tsx    # All modals (200 lines)
│   ├── BuilderSidebar.tsx            # Left panel (150 lines)
│   ├── BuilderChatPanel.tsx          # Chat interface (180 lines)
│   ├── BuilderPreviewPanel.tsx       # Sandpack preview (180 lines)
│   └── BuilderToolbar.tsx            # Top actions (120 lines)
```

**Impact:**
- Each panel independently testable
- Clearer component hierarchy
- Easier to add/remove panels
- Better code organization

**Estimated Effort:** 10 hours

---

#### `src/components/LayoutBuilderView.tsx` (~286 lines)

**Current Issues:**
- Layout canvas + chat interface mixed
- Uses massive `useLayoutBuilder` hook (496 lines)
- Hard to test canvas vs chat independently

**Refactoring Plan:**
```
Split into:
├── src/components/layout-builder/
│   ├── LayoutBuilderView.tsx         # Main layout (100 lines)
│   ├── LayoutEditorPanel.tsx         # Canvas rendering (150 lines)
│   ├── LayoutChatPanel.tsx           # AI chat for layout (120 lines)
│   └── LayoutPropertiesPanel.tsx     # Properties editor (100 lines)
├── src/hooks/
│   ├── useLayoutBuilder.ts           # Main hook (150 lines)
│   ├── useLayoutCanvas.ts            # Canvas logic (200 lines)
│   └── useLayoutChat.ts              # Chat logic (150 lines)
```

**Impact:**
- Canvas logic separated from chat
- Hook complexity reduced
- Each concern independently testable

**Estimated Effort:** 6 hours

---

### 2.2 Code Duplication Patterns

#### Pattern 1: API Key Extraction

**Files Affected:**
- `TitanPipelineService.ts`
- `GeminiLayoutService.ts`
- Multiple API proxy routes

**Current Code (repeated 8+ times):**
```typescript
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not found');
}
```

**Solution:**
```typescript
// src/config/APIKeyManager.ts
export class APIKeyManager {
  static getGeminiKey(): string {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
    return key;
  }
  
  static getClaudeKey(): string { /* ... */ }
  static getOpenAIKey(): string { /* ... */ }
}

// Usage
const geminiKey = APIKeyManager.getGeminiKey();
```

**Impact:**
- Removes 30+ lines of duplication
- Single source of truth for key validation
- Easier to add key rotation logic

**Estimated Effort:** 2 hours

---

#### Pattern 2: Prompt Construction

**Files Affected:**
- `PhaseExecutionManager.ts`
- `GeminiLayoutService.ts`
- `TitanPipelineService.ts`

**Current Issue:** Each service builds prompts differently for Gemini vs Claude.

**Solution:**
```typescript
// src/services/PromptBuilder.ts
export class PromptBuilder {
  private parts: string[] = [];
  
  addSystemContext(context: string): this { /* ... */ }
  addUserMessage(msg: string): this { /* ... */ }
  addCodeContext(files: CodeFile[]): this { /* ... */ }
  
  buildForGemini(): GeminiMessage[] { /* ... */ }
  buildForClaude(): ClaudeMessage[] { /* ... */ }
}
```

**Impact:**
- Unified prompt building interface
- Easier to switch between models
- Consistent prompt structure

**Estimated Effort:** 4 hours

---

#### Pattern 3: Result Type Pattern

**Files Affected:**
- `PhaseExecutionManager.ts` (success/skipped/error helpers)
- Multiple services return similar result objects

**Current Issue:** Custom Result type implementation duplicated.

**Solution:**
```typescript
// src/utils/resultTypes.ts
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export const Ok = <T>(value: T): Result<T> => ({ success: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ success: false, error });
```

**Impact:**
- Standard result handling across services
- Type-safe error handling
- Reduces boilerplate

**Estimated Effort:** 2 hours

---

## Priority 3: MEDIUM IMPACT (Service Layer Consolidation)

### 3.1 Service Proliferation

**Problem:** 73 service classes with unclear boundaries.

#### Deployment Services Cluster (14 files)

**Files:**
- `DeploymentOrchestrator.ts`
- 13 provider services (VercelProvider, NetlifyProvider, etc.)

**Issue:** Orchestrator pattern but unclear boundaries between providers.

**Solution:**
```typescript
// Factory pattern with plugin system
interface DeploymentProvider {
  name: string;
  deploy(config: DeployConfig): Promise<DeployResult>;
  validate(config: DeployConfig): boolean;
}

// src/services/deployment/
├── DeploymentStrategyFactory.ts     # Factory
├── providers/
│   ├── BaseProvider.ts              # Base class
│   ├── VercelProvider.ts            # Extends base
│   ├── NetlifyProvider.ts           # Extends base
│   └── ...
└── DeploymentOrchestrator.ts        # Uses factory
```

**Estimated Effort:** 6 hours

---

#### API Gateway Services (9 files)

**Files:**
- OpenAI proxy, Anthropic proxy, Storage proxy, SMS proxy, Email proxy, etc.

**Issue:** Each is thin wrapper with high boilerplate.

**Solution:**
```typescript
// Unified gateway with provider strategy
// src/services/UnifiedAPIGateway.ts
export class UnifiedAPIGateway {
  private providers = new Map<string, APIProvider>();
  
  register(name: string, provider: APIProvider): void { /* ... */ }
  
  async call<T>(
    providerName: string, 
    method: string, 
    params: unknown
  ): Promise<T> { /* ... */ }
}
```

**Estimated Effort:** 5 hours

---

#### Code Analyzers (6 files)

**Files:**
- `SemanticAnalyzer.ts`
- `ReactAnalyzer.ts`
- `TypeScriptAnalyzer.ts`
- etc.

**Issue:** Standalone analyzers with no unified interface.

**Solution:**
```typescript
// Pipeline pattern
interface CodeAnalyzer {
  name: string;
  analyze(code: string): Promise<AnalysisResult>;
}

// src/services/CodeAnalyzerPipeline.ts
export class CodeAnalyzerPipeline {
  private analyzers: CodeAnalyzer[] = [];
  
  addAnalyzer(analyzer: CodeAnalyzer): this { /* ... */ }
  
  async runAll(code: string): Promise<AnalysisResult[]> { /* ... */ }
}
```

**Estimated Effort:** 4 hours

---

## Priority 4: LOW IMPACT (Nice to Have)

### 4.1 Type Organization

**Issue:** `src/types/layoutDesign.ts` is 2,999 lines.

**Solution:**
```
Split into:
├── src/types/layout/
│   ├── typography.ts       # Font, text styles
│   ├── colors.ts           # Color system
│   ├── spacing.ts          # Margins, padding, grid
│   ├── components.ts       # Component definitions
│   ├── effects.ts          # Animations, transitions
│   └── index.ts            # Re-export all
```

**Estimated Effort:** 4 hours

---

### 4.2 Hook Complexity

**Issue:** 35 hooks, many with hidden store dependencies.

**Solution:**
- Document hook dependencies clearly
- Extract reusable hook logic to utilities
- Create hook composition patterns

**Estimated Effort:** 6 hours

---

## Refactoring Execution Plan

### Phase 1: Critical Blockers (Week 1-2)
**Estimated: 50 hours**

1. ✅ Split `layoutValidation.ts` → 6 files (8 hours)
2. ✅ Refactor `useAppStore` → 6 domain stores (16 hours)
3. ✅ Extract `TitanPipelineService` → Strategy pattern (12 hours)
4. ✅ Split `GeminiLayoutService` → 3 services (10 hours)
5. ✅ Create `APIKeyManager` utility (2 hours)
6. ✅ Extract `PhaseExecutionManager` concerns (14 hours)

**Outcome:** Removes 3 mega-files, reduces coupling significantly.

---

### Phase 2: Developer Experience (Week 3)
**Estimated: 24 hours**

7. ✅ Split `NaturalConversationWizard` → hook + components (8 hours)
8. ✅ Split `MainBuilderView` → panels (10 hours)
9. ✅ Split `LayoutBuilderView` → editor + chat (6 hours)

**Outcome:** Cleaner components, better testability.

---

### Phase 3: Code Quality (Week 4)
**Estimated: 17 hours**

10. ✅ Create `PromptBuilder` utility (4 hours)
11. ✅ Create `resultTypes` utility (2 hours)
12. ✅ Consolidate deployment services (6 hours)
13. ✅ Create `CodeAnalyzerPipeline` (4 hours)

**Outcome:** Less duplication, cleaner patterns.

---

### Phase 4: Polish (Week 5)
**Estimated: 15 hours**

14. ✅ Split `layoutDesign.ts` types (4 hours)
15. ✅ Consolidate API gateway services (5 hours)
16. ✅ Document hook dependencies (6 hours)

**Outcome:** Better organization, easier onboarding.

---

## Testing Strategy

For each refactoring:

1. **Before:** Write characterization tests for existing behavior
2. **During:** Ensure tests still pass after each step
3. **After:** Add unit tests for newly extracted modules

**Test Coverage Goals:**
- Critical services: 80%+ coverage
- Components: 60%+ coverage
- Utilities: 90%+ coverage

---

## Rollout Strategy

### Gradual Migration

1. Create new refactored modules alongside old ones
2. Deprecate old imports with warnings
3. Migrate consumers one at a time
4. Remove deprecated modules after 2 weeks

### Breaking Change Management

For high-impact refactorings (like `useAppStore`):
- Keep facade for backward compatibility initially
- Use TypeScript deprecation warnings
- Provide codemod scripts for migration
- Document migration guide in PR

---

## Success Metrics

**Before Refactoring:**
- Largest file: 2,999 lines (`layoutDesign.ts`)
- Files over 1000 lines: 5
- Files over 500 lines: 12
- Average imports per component: 8.5
- Time to onboard new dev: ~2 weeks

**After Refactoring (Target):**
- Largest file: <500 lines
- Files over 1000 lines: 0
- Files over 500 lines: 3
- Average imports per component: 4.5
- Time to onboard new dev: ~1 week

---

## Risk Assessment

### High Risk Refactorings

| Refactoring | Risk Level | Dependents | Mitigation |
|-------------|-----------|------------|------------|
| useAppStore split | **CRITICAL** | 25 files | Gradual migration, keep facade, extensive testing |
| PhaseExecutionManager | HIGH | 8 files | Unit tests first, incremental extraction |
| TitanPipelineService | MEDIUM | 5 files | Strategy pattern allows parallel old/new |

### Low Risk Refactorings

- Utility extractions (APIKeyManager, PromptBuilder)
- Component UI splits (no logic changes)
- Type file splits (pure types, no runtime impact)

---

## Maintenance

This document should be updated:
- **After each refactoring** - Mark items as complete
- **Monthly** - Review and add new candidates
- **After major features** - Assess new tech debt

**Document Owner:** Engineering Lead  
**Review Cadence:** Monthly

---

## Appendix: File Size Analysis

### All Files Over 500 Lines

| File | Lines | Priority | Status |
|------|-------|----------|--------|
| `types/layoutDesign.ts` | 2,999 | LOW | ⏳ Pending |
| `services/DynamicPhaseGenerator.ts` | 2,718 | MEDIUM | ⏳ Pending |
| `services/PhaseExecutionManager.ts` | 2,095 | CRITICAL | ⏳ Pending |
| `components/MainBuilderView.tsx` | 1,622 | HIGH | ⏳ Pending |
| `services/GeminiLayoutService.ts` | 1,364 | CRITICAL | ⏳ Pending |
| `utils/layoutValidation.ts` | 1,111 | CRITICAL | ⏳ Pending |
| `services/TitanPipelineService.ts` | 1,074 | CRITICAL | ⏳ Pending |
| `components/NaturalConversationWizard.tsx` | 806 | HIGH | ⏳ Pending |
| `store/useAppStore.ts` | 804 | CRITICAL | ⏳ Pending |
| `components/LayoutCanvas.tsx` | 512 | MEDIUM | ⏳ Pending |
| `hooks/useLayoutBuilder.ts` | 496 | HIGH | ⏳ Pending |

---

## Quick Reference: Commands

```bash
# Find large files
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20

# Count dependencies for a file
grep -r "from.*useAppStore\|import.*useAppStore" src --include="*.ts" --include="*.tsx" -l | wc -l

# Run tests after refactoring
npm run test                  # All tests
npm run test:hooks            # Hook tests
npm run test:services         # Service tests
npm run typecheck             # TypeScript validation
npm run lint                  # ESLint

# Check bundle impact
npm run build
npm run analyze              # Bundle analyzer (if available)
```

---

**End of Document**
