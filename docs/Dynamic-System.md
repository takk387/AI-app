# Dynamic Phase System - Complete Technical Documentation

> **Last verified**: 2026-02-14
> **Total system size**: ~11,500+ lines across 18+ files
> **Supersedes**: `docs/DYNAMIC_PHASE_SYSTEM_ANALYSIS.md` (outdated line counts and missing subsystems)

---

## 1. Executive Summary

The Dynamic Phase System is an **AI-driven, adaptive build orchestration engine** that generates variable-length phase plans (2-30 phases) based on app complexity. It replaces a fixed 5-phase approach with intelligent feature classification, domain-based grouping, dependency calculation, and incremental code generation.

**Key capabilities:**
- Classifies features across 20 domains with complexity scoring
- Auto-detects up to 13 implicit infrastructure features (auth, DB, i18n, state management, etc.)
- Mines conversation history for per-phase context (user stories, workflows, validation rules)
- Integrates dual AI architecture planning (Claude + Gemini consensus)
- Builds 16-section AI prompts with design fidelity enforcement (40+ CSS token mappings)
- Tracks file integrity across phases (P1-P9 checks: conflicts, imports, types, contracts, regression)
- Supports rollback to any previous phase via deep-cloned snapshots
- Runs AST-based quality reviews per phase and AI-powered comprehensive reviews at build end

---

## 2. File Inventory

### Core Services

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/DynamicPhaseGenerator.ts` | 2,718 | Phase planning engine: classifies features, groups by domain, generates phases, calculates dependencies, extracts context, analyzes files |
| `src/services/PhaseExecutionManager.ts` | 2,095 | Execution orchestrator: builds AI prompts, tracks state, P1-P9 integrity, quality reviews, snapshots/rollback |
| `src/services/BackendArchitectureAgent.ts` | 583 | Claude Opus 4.6 with extended thinking - generates Prisma schema, API routes, auth config, realtime config. 3-strategy JSON extraction, singleton factory |
| `src/services/CodeContextService.ts` | 570 | Smart code context management with file importance scoring, dependency tracking, intent-based selection, context pinning (pin/unpin files) |
| `src/services/ContextCache.ts` | 320 | Cache management for CodeContextService (15-min TTL, smart invalidation, LRU eviction with scoring) |

### Types

| File | Lines | Purpose |
|------|-------|---------|
| `src/types/dynamicPhases.ts` | 915 | All type definitions: DynamicPhase, DynamicPhasePlan, PhaseExecutionContext, P1-P9 types, config constants |
| `src/types/phaseAdapters.ts` | 359 | DynamicPhase ↔ BuildPhase conversion, ExtendedPhaseInfo, PlanSummary, progress/time adapters |

### Hooks

| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useDynamicBuildPhases.ts` | 620 | React hook: state management, phase lifecycle, quality integration, auto-advance |

### API Routes

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/api/wizard/generate-phases/route.ts` | 385 | POST/GET endpoints for phase plan generation with architecture integration, auto memory/state detection |
| `src/app/api/wizard/generate-architecture/route.ts` | 113 | POST endpoint for backend architecture generation (pre-phase step) |

### Utilities

| File | Lines | Purpose |
|------|-------|---------|
| `src/utils/architectureToPhaseContext.ts` | 320 | Converts FinalValidatedArchitecture → ArchitectureSpec for phase injection |
| `src/utils/phaseContextExtractor.ts` | 602 | Conversation topic segmentation, semantic similarity search, structured extraction (requirements, decisions, technical notes, validation rules, UI patterns) |
| `src/utils/contextCompression.ts` | 601 | Tiktoken-based conversation compression, truncation awareness system, summary extraction (project description, features, preferences, decisions) |
| `src/utils/designTokenMappings.ts` | 454 | 53+ CSS design token mapping functions and CSS variable generators for prompt building |

### UI Components

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/build/PhaseControlPanel.tsx` | 227 | Build controls: start/pause/resume/skip/retry, current phase info, built summary display |
| `src/components/build/PhaseDetailView.tsx` | 514 | Modal: 4 tabs - Planned vs Built comparison, tasks, validation, generated code |
| `src/components/build/PhaseProgressIndicator.tsx` | 225 | Visual timeline: horizontal (≤7 phases) or compact (>7 phases) layout |
| `src/components/build/QualityPanel.tsx` | 544 | Quality pipeline: validation + review, score ring, auto-fixes, strictness |
| `src/components/review/PhasesCard.tsx` | 117 | Review step: read-only phase list before building |
| `src/components/concept-panel/sections/PhasePlanSection.tsx` | 219 | Phase list in concept panel: PLAN mode (simple) vs ACT mode (interactive) |

---

## 3. Type System (`src/types/dynamicPhases.ts`)

### FeatureDomain (20 values)

```typescript
type FeatureDomain =
  | 'setup' | 'database' | 'auth' | 'i18n'
  | 'core-entity' | 'feature' | 'ui-component' | 'integration'
  | 'real-time' | 'storage' | 'notification' | 'offline'
  | 'search' | 'analytics' | 'admin' | 'ui-role'
  | 'testing' | 'backend-validator' | 'devops' | 'monitoring'
  | 'polish';
```

### FeatureClassification

```typescript
interface FeatureClassification {
  originalFeature: Feature;
  domain: FeatureDomain;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
  requiresOwnPhase: boolean;
  suggestedPhaseName: string;
  dependencies: string[];  // e.g., ['Authentication System', 'Database Setup']
  keywords: string[];      // Matched pattern keywords
}
```

### DynamicPhase

```typescript
interface DynamicPhase {
  number: number;
  name: string;
  description: string;
  domain: FeatureDomain;
  features: string[];
  featureDetails: FeatureClassification[];
  estimatedTokens: number;
  estimatedTime: string;
  dependencies: number[];       // Phase numbers this depends on
  dependencyNames: string[];
  testCriteria: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

  // Execution results (populated after build)
  generatedCode?: string;
  completedAt?: string;
  errors?: string[];
  implementedFeatures?: string[];
  builtSummary?: string;
  builtFiles?: string[];

  // Context
  conceptContext?: PhaseConceptContext;
  isLayoutInjection?: boolean;   // Phase 1 flag for pre-built code injection
  relevantRoles?: string[];

  // Architecture context (from dual AI planning)
  architectureContext?: {
    files: BackendFileSpec[];
    prismaSchema?: string;
    apiRoutes?: APIRouteSpec[];
  };
}
```

### DynamicPhasePlan

```typescript
interface DynamicPhasePlan {
  id: string;
  appName: string;
  appDescription: string;
  totalPhases: number;
  phases: DynamicPhase[];
  estimatedTotalTime: string;
  estimatedTotalTokens: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  concept: AppConcept;

  // Execution tracking
  currentPhaseNumber: number;
  completedPhaseNumbers: number[];
  failedPhaseNumbers: number[];
  accumulatedFiles: string[];
  accumulatedFeatures: string[];

  // Enhanced tracking
  accumulatedFilesRich?: AccumulatedFile[];
  accumulatedFeaturesRich?: AccumulatedFeature[];
  establishedPatterns?: string[];
  sharedState?: string[];
  apiContracts?: APIContract[];

  // Context
  phaseContexts?: Record<FeatureDomain, SerializedPhaseContext>;
  architectureSpec?: ArchitectureSpec;
  layoutBuilderFiles?: AppFile[];
  hasArchitectureContext?: boolean;
}
```

### PhaseConceptContext (per-phase rich context)

```typescript
interface PhaseConceptContext {
  purpose?: string;
  targetUsers?: string;
  uiPreferences?: UIPreferences;
  roles?: UserRole[];
  conversationContext?: string;
  dataModels?: Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean }> }>;
  featureSpecs?: FeatureSpecification[];
  workflowSpecs?: WorkflowSpecification[];
  technicalConstraints?: string[];
  integrationPoints?: IntegrationPoint[];
  validationRules?: ValidationRule[];
  uiPatterns?: UIPattern[];
  layoutManifest?: LayoutManifest;
}
```

### PhaseExecutionContext

```typescript
interface PhaseExecutionContext {
  phaseNumber: number;
  totalPhases: number;
  phaseName: string;
  phaseDescription: string;
  features: string[];
  testCriteria: string[];
  previousPhaseCode: string | null;
  allPhases: DynamicPhase[];
  completedPhases: number[];
  cumulativeFeatures: string[];
  cumulativeFiles: string[];
  appName: string;
  appDescription: string;
  appType: string;
  techStack: TechnicalRequirements;
  fullConcept?: {
    purpose?: string;
    targetUsers?: string;
    uiPreferences?: UIPreferences;
    roles?: UserRole[];
    conversationContext?: string;
    dataModels?: Array<{...}>;
    layoutManifest?: LayoutManifest;
    workflows?: Workflow[];
  };
  phaseConceptContext?: PhaseConceptContext;
  relevantRoles?: string[];
  extractedPhaseContext?: SerializedPhaseContext;
  truncationNotice?: string;
  architectureContext?: {
    files: BackendFileSpec[];
    prismaSchema?: string;
    apiRoutes?: APIRouteSpec[];
  };
  isLayoutInjection?: boolean;
  layoutBuilderFiles?: AppFile[];

  // Enhanced (from PhaseExecutionContextWithEnhancedTracking)
  apiContracts?: APIContract[];
  establishedPatterns?: string[];
  accumulatedFilesRich?: AccumulatedFile[];
  smartContextSnapshot?: CodeContextSnapshot;
}
```

### PhaseExecutionResult

```typescript
interface PhaseExecutionResult {
  phaseNumber: number;
  phaseName: string;
  success: boolean;
  generatedCode: string;
  generatedFiles: string[];
  implementedFeatures: string[];
  duration: number;
  tokensUsed: { input: number; output: number; thinking?: number };
  errors?: string[];
  warnings?: string[];
  testResults?: { passed: boolean; details: string[] };
  builtSummary?: string;
  fileConflicts?: FileConflict[];
}
```

### AccumulatedFile (rich file tracking)

```typescript
interface AccumulatedFile {
  path: string;
  type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
  exports: string[];
  dependencies: string[];
  summary: string;
  contentHash?: string;
  createdInPhase?: number;
  lastModifiedPhase?: number;
  previousVersionHash?: string;
  imports?: ImportInfo[];
}
```

### SerializedPhaseContext (conversation-mined context)

```typescript
interface SerializedPhaseContext {
  phaseType: FeatureDomain;
  extractedRequirements: string[];
  userDecisions: string[];
  technicalNotes: string[];
  validationRules: string[];
  uiPatterns: string[];
  contextSummary: string;
  tokenEstimate: number;
}
```

### Configuration

```typescript
const DEFAULT_PHASE_GENERATOR_CONFIG: PhaseGeneratorConfig = {
  maxTokensPerPhase: 16000,
  targetTokensPerPhase: 5000,
  maxFeaturesPerPhase: 4,
  minFeaturesPerPhase: 1,
  minPhases: 2,
  maxPhases: 30,
  alwaysSeparateDomains: ['auth', 'database', 'real-time', 'offline', 'integration', 'i18n'],
  complexityMultipliers: { simple: 1.0, moderate: 1.5, complex: 2.5 },
  baseTokenEstimates: {
    simpleFeature: 1200,
    moderateFeature: 2000,
    complexFeature: 3500,
    setupPhase: 2000,
    polishPhase: 2500
  }
};
```

### Phase Integrity Types (P1-P9)

```typescript
// P1: File conflicts
interface FileConflict { filePath: string; previousPhase: number; currentPhase: number; severity: 'critical' | 'warning' | 'info' }
interface FileConflictResult { conflicts: FileConflict[]; hasBreakingChanges: boolean }

// P2: Import validation
interface ImportInfo { symbols: string[]; from: string; isRelative: boolean }
interface UnresolvedImport { file: string; importPath: string; symbol?: string; reason: string }
interface ImportValidationResult { valid: boolean; unresolved: UnresolvedImport[] }

// P3: Snapshots
interface PhaseSnapshot { id: string; phaseNumber: number; timestamp: string; accumulatedCode: string; accumulatedFiles: string[]; accumulatedFeatures: string[]; accumulatedFilesRich: AccumulatedFile[]; accumulatedFeaturesRich: AccumulatedFeature[]; establishedPatterns: string[]; apiContracts: APIContract[]; rawGeneratedFiles: Array<{path: string; content: string}>; completedPhases: number[]; phaseStatuses: Array<{number: number; status: string}> }

// P5: Type checking
interface TypeCheckResult { success: boolean; errors: TypeCheckError[]; warnings: TypeCheckError[] }

// P6: Type compatibility
interface TypeCompatibilityResult { compatible: boolean; breakingChanges: BreakingTypeChange[] }

// P7: Smoke tests
interface PhaseTestResults { phaseNumber: number; total: number; passed: number; failed: number; results: SmokeTestResult[]; allPassed: boolean }

// P8: Contract validation
interface ContractValidationResult { valid: boolean; violations: ContractViolation[] }

// P9: Regression tests
interface RegressionTestResult { phaseNumber: number; previousPhasesChecked: number[]; failures: RegressionFailure[]; allPassed: boolean }
```

### COMPLEX_FEATURE_PATTERNS (11 patterns)

Each pattern has: `patterns: string[]`, `domain: FeatureDomain`, `complexity: 'complex'`, `requiresOwnPhase: boolean`, `baseTokenEstimate: number`, `suggestedName: string`

| Pattern | Domain | Tokens | Trigger Keywords |
|---------|--------|--------|------------------|
| Authentication | auth | 4000 | login, signup, register, auth, password, oauth, social login, jwt |
| Database | database | 3500 | database, schema, table, model, CRUD, persistent storage |
| Payments | integration | 4500 | payment, stripe, checkout, subscription, billing, invoice |
| Real-time | real-time | 4000 | real-time, websocket, live, push notification, streaming |
| File Storage | storage | 3500 | file upload, image upload, storage, media, attachment |
| Notifications | notification | 3000 | notification system, email notification, push alert |
| Offline | offline | 4000 | offline, service worker, PWA, local-first, sync |
| Search | search | 3000 | full-text search, search engine, elasticsearch, algolia |
| Analytics | analytics | 3500 | analytics dashboard, reporting, metrics, data visualization |
| Admin | admin | 3500 | admin panel, admin dashboard, content management, CMS |
| i18n | i18n | 4000 | i18n, internationalization, multi-language, translation, locale |

### MODERATE_FEATURE_PATTERNS (10 patterns)

| Pattern | Domain | Tokens | Trigger Keywords |
|---------|--------|--------|------------------|
| Forms | ui-component | 2000 | form builder, multi-step form, wizard form, dynamic form |
| Tables | ui-component | 2000 | data table, sortable table, filterable list, grid view |
| Drag-drop | ui-component | 2500 | drag and drop, sortable, reorderable, kanban |
| Calendar | ui-component | 2500 | calendar, scheduling, booking, date picker, timeline |
| Maps | integration | 2500 | map, geolocation, location, GPS, mapbox, google maps |
| PDF Export | feature | 2000 | PDF, export, report generation, print |
| Filters | feature | 1800 | advanced filter, faceted search, filter panel |
| Comments | feature | 2000 | comments, discussion, forum, thread |
| Ratings | feature | 1500 | rating, review, stars, feedback |
| Dashboard | analytics | 2500 | dashboard, charts, widgets, KPI |

---

## 4. DynamicPhaseGenerator (`src/services/DynamicPhaseGenerator.ts` - 2,718 lines)

### 4.1 Main Pipeline

```
generatePhasePlan(concept: AppConcept): PhasePlanGenerationResult
```

**7-step pipeline:**

1. **Classify features** → `classifyFeatures(concept.coreFeatures)`
2. **Add implicit features** → `getImplicitFeatures(concept.technical)`
3. **Extract layout features** → `extractFeaturesFromLayout(concept.layoutManifest)`
4. **Group by domain** → `groupByDomain(allClassifications)`
5. **Generate phases** → `generatePhasesFromGroups(featuresByDomain, concept)`
6. **Calculate dependencies** → `calculatePhaseDependencies(phases)`
7. **Validate & create plan** → `validatePhasePlan()` → `createPhasePlan()`

### 4.2 Feature Classification

`classifyFeature(feature: Feature): FeatureClassification`

1. Combine feature name + description (lowercased)
2. Check `COMPLEX_FEATURE_PATTERNS` first → if match: complex, `requiresOwnPhase: true`
3. Check `MODERATE_FEATURE_PATTERNS` → if match: moderate, `requiresOwnPhase: false`
4. Default → simple, domain: `'feature'`, tokens: `config.baseTokenEstimates.simpleFeature`
5. Infer dependencies via `inferDependencies()`:
   - Contains "user"/"account"/"profile" → depends on `'Authentication System'`
   - Contains "save"/"store"/"persist"/"history" → depends on `'Database Setup'`
   - Contains "image"/"photo"/"file"/"upload" → depends on `'File Storage'`

### 4.3 Implicit Feature Detection (13 features)

`getImplicitFeatures(tech: TechnicalRequirements): FeatureClassification[]`

| # | Feature | Trigger | Domain | Tokens | Own Phase | Dependencies |
|---|---------|---------|--------|--------|-----------|-------------|
| 1 | Authentication System | `tech.needsAuth` | auth | 4000 | Yes | Database Setup (if needsDatabase) |
| 2 | Database Setup | `tech.needsDatabase` | database | 3500 | Yes | None |
| 3 | Real-time Updates | `tech.needsRealtime` | real-time | 4000 | Yes | Database Setup (if needsDatabase) |
| 4 | File Storage | `tech.needsFileUpload` | storage | 3500 | Yes | None |
| 5 | API Integration | `tech.needsAPI` | integration | 2500 | No | None |
| 6 | State Management Infrastructure | `stateComplexity === 'complex'` OR `needsStateHistory` | setup | 4000 | Yes | None |
| 7 | Context Memory System | `tech.needsContextPersistence` | storage | 4500 | Yes | Database Setup (if needsDatabase) |
| 8 | Backend Validation | `needsDatabase OR needsAPI OR needsAuth` | backend-validator | 2000 | Yes | Database, Auth, API |
| 9 | Caching Infrastructure | `tech.needsCaching` | setup | 2500 | No | None |
| 10 | Offline Support | `tech.needsOfflineSupport` | offline | 4000 | Yes | Database Setup (if needsDatabase) |
| 11 | Internationalization | `tech.needsI18n` | i18n | 4000 | Yes | None |
| 12 | DevOps & Deployment | `scale === 'large' OR 'enterprise'` | devops | 4000 | Yes | Database Setup (if needsDatabase) |
| 13 | Monitoring & Observability | `scale === 'large' OR 'enterprise'` | monitoring | 3000 | Yes | None |

### 4.4 Memory Detection (Weighted Scoring)

`static detectMemoryNeeds(features, description): { needsContextPersistence, needsStateHistory, needsCaching }`

**Context Persistence scoring:**

| Signal Type | Keywords | Points |
|-------------|----------|--------|
| Strong | remember, remembers, memory, memories, recall, forget, learns, adapts, personalize, personalized, conversation history, previous session, cross-session | 2 each |
| Weak | preferences, habits, conversation, context, previous, past, earlier, before, save, persist, store, keep, maintain, retain | 1 each |

**Threshold:** 2+ points required. Prevents false positives like "save time" or "store page" from triggering.

**State History:** Boolean check for: undo, redo, revert, draft, autosave, version, snapshot, history, restore, track, log, record

**Caching:** Requires 2+ matches from: performance, fast, instant, cached, optimize, responsive, large dataset, pagination

### 4.5 State Complexity Inference

`static inferStateComplexity(features): 'simple' | 'moderate' | 'complex'`

- **Complex** (≥2 matches): workflow, multi-step, wizard, cart, checkout, collaboration, real-time, editor, undo, redo, draft, autosave, version control, ai assistant, chatbot, conversation, learns, adapts, personalized
- **Moderate** (≥1 complex OR ≥3 moderate): form, dashboard, settings, preferences, filter, sort, pagination, tabs, modal, sidebar
- **Simple:** Default

### 4.6 Layout Feature Extraction

`extractFeaturesFromLayout(manifest: LayoutManifest): FeatureClassification[]`

Analyzes the LayoutManifest tree via recursive traversal:

| Detection | Condition | Domain | Tokens |
|-----------|-----------|--------|--------|
| Authentication | `detectedFeatures.includes('Authentication')` OR auth semantic tags (login, auth, password) | auth | 4000 |
| File Upload | `detectedFeatures.includes('FileUpload')` | storage | 3500 |
| Complex UI | `totalNodes > 15` OR `maxDepth > 4` OR dashboard detected | ui-component | 5000 |
| Media Player | `hasVideo` in layout tree | ui-component | 2500 |

### 4.7 Domain Grouping

`groupByDomain(classifications): FeaturesByDomain`

1. For each classification:
   - If `requiresOwnPhase === true`: isolated by domain, deduplicated by `suggestedPhaseName`
   - Otherwise: grouped by domain normally
2. Returns `Map<FeatureDomain, FeatureClassification[]>`

### 4.8 Phase Generation Algorithm

`generatePhasesFromGroups(featuresByDomain, concept): DynamicPhase[]`

**Ordering:**

1. **Phase 1:** Layout Injection (if `concept.layoutManifest` exists) OR Setup
2. **Database** (if domain exists) - removed from map after processing
3. **Authentication** (if domain exists) - removed from map after processing
4. **Remaining domains in priority order:**
   ```
   core-entity → feature → ui-component → integration → storage →
   real-time → notification → search → analytics → admin → ui-role →
   backend-validator → devops → monitoring → offline
   ```
5. **Final phase:** Polish & Documentation (always last)

**Phase splitting** (`splitFeaturesIntoPhases`):
- Sort features by priority (high→low), then complexity (simple→complex)
- Split when: `currentTokens + nextFeature > maxTokensPerPhase` OR `currentFeatures >= maxFeaturesPerPhase`
- Multi-part phases named: `"Domain Name (Part N)"`

**Special phase creators:**

- `createSetupPhase()`: Folder structure, package.json, TypeScript config, base styling, routing, ErrorBoundary, semantic HTML, accessibility, SEO meta tags. Tokens: `setupPhase + 800`
- `createLayoutInjectionPhase()`: Pre-built layout code injection. `isLayoutInjection: true`, tokens: 500, time: "Instant"
- `createDesignSystemPhase()`: Generates a design system phase from LayoutManifest's designSystem (colors, fonts, typography settings). Builds detailed design context description. Used when layout provides rich design tokens
- `createPolishPhase()`: Loading states, error handling, empty states, micro-interactions, README, code cleanup. Dependencies: all previous phases

### 4.9 Dependency Calculation

`calculatePhaseDependencies(phases): void` (modifies phases in-place)

1. Build lookup maps by phase name and domain
2. For each phase (except phase 1):
   - Always depends on phase 1 (setup)
   - Resolve feature dependencies by name → phase number (only if `depPhaseNum < phase.number`)
   - **Domain-based implicit dependencies:**
     - Most non-setup/non-database features → depend on database phase (if exists)
     - Auth-dependent domains (`admin`, `ui-role`, `analytics`) → depend on auth phase (if exists)

### 4.10 Context Extraction System

**Conversation Mining Pipeline:**

1. `extractRelevantContext(context, domain)`:
   - Split context into paragraphs
   - Score each by keyword relevance (from `PHASE_KEYWORDS[domain]`)
   - Take top 8 paragraphs, truncate to 12,000 chars
   - Append overflow notice if truncated

2. `extractFeatureSpecs(concept, domain, featureNames)`:
   - Regex patterns for user stories: `/(?:as a|user (?:can|wants to|should))\s+[^.]*${featureName}[^.]*/gi`
   - Regex for acceptance criteria: `/(?:should|must|needs to)\s+[^.]*${featureName}[^.]*/gi`
   - Regex for technical notes: `/(?:api|database|backend|endpoint)[^.]*${featureName}[^.]*/gi`
   - Max 6 items per category

3. `extractWorkflowSpecs(concept, domain)`:
   - Checks workflow relevance via domain keywords
   - Converts to `{ name, trigger, steps: [{action, actor}], errorHandling }`
   - Limit: top 10 workflows

4. `extractValidationRules(context, domain)`:
   - Patterns: "must be", "should be", "validate/validation", "required/mandatory/minimum/maximum", "at least/at most/between"
   - Filter by domain keyword relevance, deduplicate
   - Limit: top 10 rules

5. `enhancePhaseWithContext(phase, concept)`:
   - Assembles all extracted data into `PhaseConceptContext`
   - Appends truncated context (500 chars) to phase description

### PHASE_KEYWORDS (complete mapping)

```
setup:              setup, config, initialize, project, structure, dependencies, folder, state,
                    store, zustand, redux, context, provider, global state, persistence, memory,
                    remember, history, undo, redo, draft, autosave, session, cross-session,
                    preferences, settings store
database:           database, schema, table, field, relationship, model, data, constraint, migration
auth:               login, register, password, role, permission, session, auth, jwt, oauth, user
core-entity:        entity, model, object, core, main, primary, business
feature:            feature, functionality, user story, acceptance, validation, requirement
ui-component:       button, form, modal, component, ui, design, layout, responsive
integration:        api, integration, webhook, external, service, third-party, endpoint
real-time:          real-time, websocket, live, sync, push, instant, notification
storage:            upload, file, image, storage, media, attachment, document, conversation history,
                    chat history, message history, context storage, semantic memory, long-term memory,
                    user context
notification:       notification, alert, email, push, message, notify
offline:            offline, sync, local, cache, service worker, pwa, memoization, cached,
                    local storage, indexed db, persistent cache
search:             search, filter, query, find, autocomplete, index
analytics:          analytics, dashboard, chart, metric, report, visualization
admin:              admin, manage, moderate, settings, configuration, control
ui-role:            dashboard, view, role, access, permission, portal
testing:            test, mock, fixture, assertion, coverage
polish:             animation, transition, loading, error, empty state, ux, feedback
i18n:               i18n, l10n, internationalization, localization, translate, translation,
                    language, multilingual, multi-language, locale, languages
backend-validator:  validation, schema check, api check, integrity, backend verification
devops:             deployment, hosting, infrastructure, ci/cd, pipeline, docker, vercel, aws,
                    cloud, environment variables
monitoring:         monitoring, observability, logging, error tracking, analytics, metrics,
                    performance, sentry
```

### 4.11 Backend Architecture Injection

`generatePhasePlanWithArchitecture(concept, architectureSpec): PhasePlanGenerationResult`

1. Generate base plan via `generatePhasePlan(concept)`
2. Call `injectBackendPhases(plan, architectureSpec)`:
   - Find insertion point: after setup phase
   - Sort backend phases by priority (ascending)
   - Convert `BackendPhaseSpec` → `DynamicPhase` with architecture context (files, Prisma schema, API routes)
   - Insert after setup, renumber all subsequent phases
   - Update dependencies to account for new numbering
   - Update plan totals
3. Attach `architectureSpec` to plan

### 4.12 Smart Code Context

> **REMOVED:** `buildSmartCodeContext()` and `calculateFileImportance()` have been deleted. Code context is now provided exclusively by `CodeContextService` (see section 9, CodeContextService). The async path `PhaseExecutionManager.getExecutionContextAsync()` initializes CodeContextService and populates `cachedSmartContextSnapshot`, which `buildPhaseExecutionPrompt()` uses via `formatCodeContextSnapshot()`.

### 4.13 File Analysis System

`analyzeGeneratedFiles(files): { accumulatedFiles, apiContracts, establishedPatterns }`

**File type classification:**
- `/api/` or `route.ts` → `'api'`
- `/types/` or `.d.ts` → `'type'`
- `/utils/`, `/lib/`, `/helpers/` → `'util'`
- `/components/` OR has React component pattern → `'component'`
- `.css`, `.scss`, `/styles/` → `'style'`
- `.config.` or `/config/` → `'config'`
- Otherwise → `'other'`

**Export extraction (regex):**
- Named: `export (const|let|function|class|interface|type) Name`
- Default: `export default (function|class) Name` → `"default:Name"`
- Braced: `export { Name1, Name2 }` (handles `as` renames)
- Limit: top 20

**Import extraction:**
- Rich format: `{ symbols: string[], from: string, isRelative: boolean }`
- Named: `import { A, B } from 'source'`
- Default: `import Name from 'source'` → `"default:Name"`

**API contract extraction:**
- Endpoint derived from path: `/api/(.+?)(?:/route)?\.ts/`
- HTTP methods checked: GET, POST, PUT, DELETE, PATCH
- Auth detection: `getServerSession`, `auth()`, `requireAuth`, `Authorization`
- Request/response schema extraction via regex

**Pattern detection (20+ patterns):**
react-useState, react-useReducer, react-context, zustand-store, redux, swr, react-query, next-ssr, next-ssg, tailwind-dynamic, styled-components, emotion, react-hook-form, formik, zod-validation, next-auth, supabase-auth, try-catch, error-boundary

### 4.14 Validation System

`validatePhasePlan(phases): { isValid, errors, warnings }`

1. **Phase count:** Error if < `minPhases`, warning if > `maxPhases`
2. **Circular dependency detection:** DFS with recursion stack
3. **Token warnings:** If `phase.estimatedTokens > maxTokensPerPhase * 1.5` (24K)
4. **Orphan feature check:** Warning if no features in plan

### 4.15 Plan Complexity Classification

- ≤3 phases → `'simple'`
- ≤6 phases → `'moderate'`
- ≤12 phases → `'complex'`
- >12 phases → `'enterprise'`

---

## 5. PhaseExecutionManager (`src/services/PhaseExecutionManager.ts` - 2,095 lines)

### 5.1 Execution Context Building

`getExecutionContext(phaseNumber): PhaseExecutionContext`

**Data sources:**

| Data | Source |
|------|--------|
| Phase metadata | `plan.phases[phaseNumber]` |
| App concept | `plan.concept` (purpose, targetUsers, roles, workflows, dataModels) |
| Layout manifest | `plan.concept.layoutManifest` → design tokens |
| Architecture | `phase.architectureContext` (Prisma schema, API routes, files) |
| Previous code | `getSmartCodeContext()` or `cachedSmartContextSnapshot` |
| Accumulated state | `completedPhases`, `accumulatedFiles`, `accumulatedFeatures` |
| Phase context | `plan.phaseContexts[phase.domain]` |
| Enhanced tracking | `apiContracts`, `establishedPatterns`, `accumulatedFilesRich` |

**Async variant:** `getExecutionContextAsync(phaseNumber, maxTokens)` pre-loads smart context via `CodeContextService`.

### 5.2 Prompt Building System (16 sections)

`buildPhaseExecutionPrompt(context: PhaseExecutionContext): string`

| # | Section | Condition |
|---|---------|-----------|
| 0 | Truncation Notice | If context was truncated |
| 1 | Phase Header | Always: `# Phase {N} of {total}: {name}` |
| 2 | App Overview | Always: name, description, type, purpose, target users |
| 3 | User Roles | If roles defined: name, capabilities, permissions |
| 4 | User Workflows | If workflows defined: name, description, steps, involved roles |
| 5 | Phase-Specific Role Context | If relevantRoles: which roles this phase serves |
| 6 | Design Requirements | LayoutManifest → full CSS variables + design tokens; OR UIPreferences fallback |
| 7 | Technical Stack | Auth type, database, real-time, file upload flags |
| 8 | Data Models | If defined: model names with typed fields |
| 9 | Phase Goal | Description + feature list for this phase |
| 10 | Extracted Phase Context | If available: requirements, decisions, technical notes, validation rules, UI patterns, context summary |
| 11 | Existing Project Context | If not phase 1: files created, features implemented, API contracts, established patterns, CRITICAL preservation instructions |
| 12 | Existing Code Reference | CodeContextService snapshot via `formatCodeContextSnapshot()` (preferred) OR raw accumulated code fallback |
| 13 | Backend Architecture | If available: Prisma schema, API routes to implement, backend files to create |
| 14 | Phase Requirements | Phase 1 instructions vs subsequent phase instructions |
| 15 | Test Criteria | After this phase, the following should work: [...] |
| 16 | Output Format | `===FILE:path===` delimiter format specification |

### 5.3 Design Fidelity

`formatLayoutManifestForPrompt(manifest): string`

Generates MANDATORY design rules with exact hex values, CSS variable mapping, and 40+ design token mappings from `src/utils/designTokenMappings.ts`:

- borderRadiusMap, shadowMap, blurMap
- spacingDensityMap, sectionPaddingMap, containerWidthMap, componentGapMap
- fontWeightMap, headingSizeMap, bodySizeMap, lineHeightMap, letterSpacingMap
- animationMap, headerHeightMap, headerStyleMap, heroHeightMap, heroLayoutMap
- cardStyleMap, cardHoverEffectMap, sidebarWidthMap
- listStyleMap, listDensityMap, footerStyleMap, footerColumnsMap

Default fallbacks use `NEUTRAL_PALETTE` (gray scale) and `STATUS_COLORS` (success/warning/error).

### 5.4 Phase Integrity System (P1-P9, P16)

#### P1: File Conflict Detection

`detectFileConflicts(newFiles, phaseNumber): FileConflictResult`

- Computes djb2 hash per file: `hash = (hash << 5) + hash + charCode`
- Compares against `fileVersionMap` (keyed by path)
- **Severity:** Critical (App.tsx, layout.tsx, /types/, /api/), Warning (/components/, /utils/), Info (styles, configs)
- Returns `{ conflicts, hasBreakingChanges }`

#### P2: Import/Export Validation

`validateImportExports(): ImportValidationResult`

- Builds export map from `accumulatedFilesRich`
- For each file's imports (skipping external packages):
  - Resolves relative paths (handles `./`, `../`, extension guessing, index.ts fallback)
  - Checks if target file exists in export map
  - Checks if each imported symbol is exported
- Reasons: `FILE_NOT_FOUND`, `SYMBOL_NOT_EXPORTED`

#### P3: Snapshot & Rollback

`capturePhaseSnapshot(phaseNumber): PhaseSnapshot`

Deep-clones ALL state: accumulatedCode, accumulatedFiles, accumulatedFeatures, accumulatedFilesRich, accumulatedFeaturesRich, establishedPatterns, apiContracts, rawGeneratedFiles, completedPhases, phaseStatuses.

`rollbackToSnapshot(phaseNumber): boolean`

Restores all state from snapshot, clears snapshots after rollback point, syncs plan state.

#### P5: TypeScript Type Checking

`runPhaseTypeCheck(phaseNumber): Promise<TypeCheckResult>`

- Filters to .ts/.tsx files
- Uses `TypeScriptCompilerService.runTypeCheck()`
- **Fail-closed:** Returns `success: false` on exception

#### P6: Type Compatibility

`checkTypeCompatibility(phaseNumber): Promise<TypeCompatibilityResult>`

- Extracts type definitions from new files
- Detects breaking changes: `PROPERTY_REMOVED`, `TYPE_CHANGED`, `REQUIRED_ADDED`, `TYPE_DELETED`
- Severity: Critical (type deleted, required added), Warning (property removed, type changed)
- **Fail-closed:** Returns `compatible: false` on exception

#### P7: Smoke Tests

`runPhaseTests(phaseNumber): Promise<PhaseTestResults>`

- Runs test criteria via `smokeTestRunner.runSmokeTests()`
- Returns pass/fail counts
- **Fail-closed:** Returns `allPassed: false` on exception

#### P8: API Contract Enforcement

`validateApiContracts(): ContractValidationResult`

- Finds API route files in generated code
- Checks for HTTP method handlers per contract
- Validates response schemas
- Violations: `MISSING_ENDPOINT` (error), `WRONG_METHOD` (error), `MISSING_RESPONSE_TYPE` (warning)

#### P16: Architecture Verification

`verifyArchitectureImplementation(): Promise<{ verified, issues }>`

- Checks API routes exist with correct methods
- Checks Prisma schema matches table definitions
- Checks auth applied to protected routes (detects `requireAuth`, `getServerSession`, `auth()`)

#### P9: Regression Testing

`runRegressionTests(currentPhase): Promise<RegressionTestResult>`

- Re-runs smoke tests for ALL completed phases against current accumulated files
- Catches regressions introduced by new phases
- **Fail-closed:** Returns `allPassed: false` on exception

### 5.5 Quality Review System

**Phase Review** (`runPhaseQualityReview`):
- Scope: Files from one phase only
- Analysis: AST-based (syntax, types, security, React rules, performance)
- AI usage: None
- Speed: ~1-5 seconds
- Storage key: phaseNumber

**Final Review** (`runFinalQualityReview`):
- Scope: All generated files
- Analysis: AST + Claude AI semantic analysis
- AI checks: Missing features, logic consistency, requirements compliance, API contract verification
- Context includes: original conversation, expected features, API contracts, technical requirements
- Speed: ~10-30 seconds
- Storage key: -1

Both use `CodeReviewService` via dynamic import (`webpackIgnore: true`) to avoid bundling tree-sitter in client code.

### 5.6 Record Phase Result

`recordPhaseResult(result: PhaseExecutionResult): void`

1. Extract raw files from `result.generatedCode` (delimiter pattern: `===FILE:path===`)
2. Analyze files via `DynamicPhaseGenerator.analyzeGeneratedFiles()`
3. Merge into: `accumulatedFilesRich`, `apiContracts`, `establishedPatterns` (deduplicated)
4. Update `accumulatedFeaturesRich` (mark features as 'complete', track files/endpoints/components)
5. Update phase status in plan (status, completedAt, builtSummary, implementedFeatures, builtFiles)
6. Clear cached smart context for next phase

### 5.7 OperationResult Pattern

Used for explicit error handling throughout:

```typescript
type OperationResult<T> =
  | { status: 'success'; data: T }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; error: string; details?: unknown };
```

### 5.8 Instance State

```typescript
// Core
private plan: DynamicPhasePlan;
private accumulatedCode: string = '';
private accumulatedFiles: string[] = [];
private accumulatedFeatures: string[] = [];
private completedPhases: number[] = [];

// Enhanced tracking
private accumulatedFilesRich: AccumulatedFile[] = [];
private accumulatedFeaturesRich: AccumulatedFeature[] = [];
private establishedPatterns: string[] = [];
private apiContracts: APIContract[] = [];
private rawGeneratedFiles: Array<{path, content}> = [];

// Quality
private qualityReports: Map<number, QualityReport> = new Map();
private reviewStrictness: ReviewStrictness = 'standard';

// Phase Integrity
private fileVersionMap: Map<string, {hash, phase, exports}> = new Map();  // P1
private phaseSnapshots: Map<number, PhaseSnapshot> = new Map();           // P3
private typeCheckResults: Map<number, TypeCheckResult> = new Map();       // P5
private typeDefinitions: TypeDefinition[] = [];                            // P6
private phaseTestResults: Map<number, PhaseTestResults> = new Map();      // P7

// Code Context
private phaseGenerator: DynamicPhaseGenerator;
private codeContextService: CodeContextService | null = null;
private cachedSmartContextSnapshot: CodeContextSnapshot | null = null;
```

### 5.9 Additional Public Methods

**State accessors:**

- `clearCachedSmartContext()`: Clears cached smart context snapshot (called after each phase result)
- `getRawGeneratedFiles()`: Returns copy of raw generated files array `[{path, content}]`
- `getAccumulatedCode()`: Returns accumulated code string
- `getPlanCopy()`: Returns shallow copy of the plan (for P4 fix)
- `getAPIContracts()`: Returns accumulated API contracts
- `getEstablishedPatterns()`: Returns detected patterns
- `getAccumulatedFilesRich()`: Returns rich file metadata
- `getNextPhase()`: Returns next pending phase or undefined
- `isComplete()`: Returns true if all phases completed/skipped
- `getProgress()`: Returns `{ completed, total, percentage }`

**CodeContextService integration:**

- `initializeCodeContext()`: Initializes CodeContextService with accumulated files
- `getOptimizedPhaseContext(phaseNumber, maxTokens)`: Returns `OperationResult<PhaseExecutionContext>` with smart context
- `getModificationContext(targetFile, changeDescription, maxTokens)`: Returns modification-specific context
- `getCodeContextService()`: Returns the CodeContextService instance

**Standalone utility functions (exported at module level):**

- `extractFilePaths(generatedCode)`: Extracts file paths from `===FILE:path===` delimiters
- `extractImplementedFeatures(generatedCode, expectedFeatures)`: Checks which expected features appear in generated code
- `createPhaseResult(phaseNumber, phaseName)`: Creates empty `PhaseExecutionResult` scaffold

---

## 6. React Hook (`src/hooks/useDynamicBuildPhases.ts` - 620 lines)

### Options

```typescript
interface UseDynamicBuildPhasesOptions {
  onPhaseStart?: (phase: DynamicPhase) => void;
  onPhaseComplete?: (phase: DynamicPhase, result: PhaseExecutionResult) => void;
  onBuildComplete?: (plan: DynamicPhasePlan) => void;
  onBuildFailed?: (error: Error, phase?: DynamicPhase) => void;
  onPlanInitialized?: (plan: DynamicPhasePlan) => void;
  onError?: (error: Error, phase?: DynamicPhase) => void;
  autoAdvance?: boolean;  // Default: false
}
```

### State

| State | Type | Default |
|-------|------|---------|
| plan | `DynamicPhasePlan \| null` | null |
| manager | `PhaseExecutionManager \| null` | null |
| isBuilding | boolean | false |
| isPaused | boolean | false |
| accumulatedCode | string | '' |
| qualityReport | `QualityReport \| null` | null |
| pipelineState | QualityPipelineState | idle |
| isReviewing | boolean | false |
| reviewStrictness | ReviewStrictness | 'standard' |

### Derived State (useMemo)

- `phases`: `plan?.phases || []`
- `uiPhases`: via `adaptAllPhasesToUI(plan)` for legacy UI compatibility
- `currentPhase`: first phase with status `'in-progress'`
- `progress`: via `adaptDynamicProgressToUI(plan, manager)` → `BuildProgress`
- `planSummary`: via `getPlanSummary(plan)` → `PlanSummary`

### Key Actions

**initializePlan(plan):** Creates `PhaseExecutionManager`, resets all state, calls `onPlanInitialized`

**startPhase(phaseNumber):** Captures snapshot (P3), updates status to `'in-progress'`, sets `isBuilding = true`, calls `onPhaseStart`

**completePhase(result):**
1. `manager.recordPhaseResult(result)`
2. Update accumulated code if successful
3. Auto-run quality review (fire-and-forget async)
4. Check if build complete → call `onBuildComplete`
5. If `autoAdvance` enabled and not complete: schedule next phase start after 1.5s timeout (respects `isPaused`)

**skipPhase / retryPhase / rollbackToPhase:** Delegate to manager, update plan state

**Quality:** Auto-triggers after every successful phase, non-blocking. Uses dynamic import for CodeReviewService.

### Mount Guard

Uses `mountedRef.current` to prevent state updates after component unmount (common React pattern for async operations).

---

## 7. API Route (`src/app/api/wizard/generate-phases/route.ts` - 385 lines)

### POST /api/wizard/generate-phases

**Request:**
```typescript
{
  concept: AppConcept;                              // Required
  config?: Partial<PhaseGeneratorConfig>;            // Optional custom config
  conversationMessages?: ChatMessage[];              // For phase context extraction
  architectureSpec?: ArchitectureSpec;               // Pre-generated architecture
  dualArchitectureResult?: FinalValidatedArchitecture; // From dual AI pipeline
  layoutBuilderFiles?: AppFile[];                    // Pre-built layout files
}
```

**Logic:**
1. Validate concept (name, features required)
2. Normalize with defaults (description, purpose, targetUsers, technical flags, uiPreferences)
3. Auto-detect memory/state needs if not set
4. Architecture resolution (priority order):
   - Dual AI architecture result → `convertToArchitectureSpec()`
   - Embedded dual architecture in concept → `convertToArchitectureSpec()`
   - Pre-generated architectureSpec
   - Generate new via `BackendArchitectureAgent` if needsBackend
5. Generate phases via `DynamicPhaseGenerator`
6. Extract phase-specific context from conversation messages (if provided)
7. Attach layout builder files (if provided)

**Response:**
```typescript
{
  success: boolean;
  plan?: DynamicPhasePlan;
  architectureSpec?: ArchitectureSpec;
  warnings?: string[];
  analysisDetails?: { totalFeatures, complexFeatures, domainBreakdown, estimatedContextPerPhase };
}
```

### GET /api/wizard/generate-phases

Returns API info, capabilities, complexity levels, and example input/output for the phase generator. Used for documentation/discovery.

---

## 8. Architecture Bridge (`src/utils/architectureToPhaseContext.ts` - 320 lines)

### convertToArchitectureSpec(arch: FinalValidatedArchitecture, appName: string): ArchitectureSpec

**Conversion mappings:**

| Source | Target | Mapping |
|--------|--------|---------|
| `arch.database.models` | `spec.database.tables` | Fields mapped via `mapFieldType()` |
| `arch.api.routes` | `spec.api.routes` | Method uppercased, auth detected from middleware |
| `arch.auth` | `spec.auth` | Provider mapped (NextAuth→'next-auth', Supabase→'supabase', etc.) |
| `arch.realtime.channels` | `spec.realtime.channels` | Technology mapped (SSE/WebSocket) |
| `arch.consensusReport` | `spec.architectureReasoning` | Rounds, coverage %, compromises |

**Field type mapping:**
- int/number → Int
- float/decimal → Float
- bool → Boolean
- date/time → DateTime
- json/object → Json
- default → String

**Generated backend phases (with priorities):**

| Phase | Priority | Trigger | Dependencies | Tokens |
|-------|----------|---------|-------------|--------|
| Database Schema Setup | 10 | Models exist | Project Setup | 3000 |
| Authentication System | 11 | Auth exists | Database Schema Setup | 4000 |
| API Routes | 12 | Routes exist | Database Schema Setup | 5000 |
| Agentic Workflows | 13 | Agentic enabled + workflows | API Routes | 6000 |
| Real-time Features | 14 | Realtime enabled | API Routes | 4000 |

---

## 9. Supporting Utilities

### phaseContextExtractor (`src/utils/phaseContextExtractor.ts` - 602 lines)

Extracts phase-specific context from wizard conversations using segmentation, structured extraction, and optional semantic similarity.

**Types:**

```typescript
interface PhaseContext {
  phaseType: FeatureDomain;
  relevantSegments: ConversationSegment[];
  extractedRequirements: string[];
  userDecisions: string[];
  technicalNotes: string[];
  featureSpecs: ExtractedFeature[];
  workflowSpecs: ExtractedWorkflow[];
  validationRules: string[];
  uiPatterns: string[];
  contextSummary: string;
  tokenEstimate: number;
}
```

**Constants:**

- `PHASE_TOPICS`: Maps each `FeatureDomain` → relevant `SegmentTopic[]` (e.g., `database → ['data_model', 'technical_specs']`)
- `PHASE_QUERIES`: Maps each `FeatureDomain` → semantic search query string for embedding-based similarity

**Main functions:**

- `extractPhaseContext(messages, phaseType)`: Extracts context for a single phase type
- `extractContextForAllPhases(messages, phaseTypes)`: Returns `Map<FeatureDomain, PhaseContext>` for all phase types
- `summarizePhaseContexts(contextMap)`: Produces a text summary of all phase contexts

**Key helpers:**

- `findSemanticallySimilarSegments(segments, query)`: Embedding-based similarity search (if API available)
- `deduplicateSegments(segments)`: Removes duplicate conversation segments
- `extractRequirementsFromSegments(segments)`: Extracts requirement statements
- `extractDecisionsFromSegments(segments)`: Extracts user decisions
- `extractTechnicalNotesFromSegments(segments)`: Extracts technical notes
- `extractValidationRules(segments)`: Extracts validation rules mentioned in conversation
- `extractUIPatterns(segments)`: Extracts UI pattern references
- `buildPhaseContextSummary(context)`: Builds a human-readable summary for a phase context
- `filterFeaturesForPhase(features, phaseType)`: Filters features relevant to a phase
- `filterWorkflowsForPhase(workflows, phaseType)`: Filters workflows relevant to a phase
- `filterTechSpecsForPhase(specs, phaseType)`: Filters technical specs relevant to a phase
- `getPhaseKeywords(phaseType)`: Returns keyword list for a phase type

### contextCompression (`src/utils/contextCompression.ts` - 601 lines)

Token-aware conversation compression using tiktoken (cl100k_base). Preserves recent messages verbatim while summarizing older context.

**Types:**

```typescript
interface ConversationSummary {
  projectDescription: string;
  featuresBuilt: string[];
  userPreferences: string[];
  keyDecisions: string[];
  messageCount: number;
  originalTokens: number;
  summaryTokens: number;
}

interface CompressionOptions {
  maxTokens?: number;           // Default: 6000
  preserveLastN?: number;       // Default: 20
  includeTimestamps?: boolean;  // Default: false
}

interface TruncationInfo {
  originalMessageCount: number;
  preservedMessageCount: number;
  summarizedMessageCount: number;
  summarizedTopics: string[];
  wasTruncated: boolean;
}

interface CompressedContext {
  summary: ConversationSummary;
  recentMessages: ChatMessage[];
  totalTokens: number;
  compressionRatio: number;
}
```

**Main functions:**

- `estimateTokens(text)`: Token count using tiktoken cl100k_base
- `estimateMessagesTokens(messages)`: Token count for message arrays
- `needsCompression(messages, maxTokens)`: Check if compression is needed
- `summarizeConversation(messages)`: Extract structured summary from messages
- `compressConversation(messages, options)`: Full compression pipeline → `CompressedContext`
- `buildCompressedContext(compressed)`: Format compressed context as string for AI prompts
- `getCompressionStats(compressed)`: Get compression metrics

**Extraction helpers:**

- `extractPatterns(messages)`: General pattern extraction
- `extractProjectDescription(messages)`: Extracts project description from conversation
- `extractFeaturesBuilt(messages)`: Extracts list of features discussed
- `extractUserPreferences(messages)`: Extracts user preferences
- `extractKeyDecisions(messages)`: Extracts key decisions made

**Truncation awareness system:**

- `getTruncationInfo(messages, options)`: Analyze what will be truncated
- `buildTruncationNotice(info)`: Generate AI-readable truncation notice
- `buildContextWithTruncationNotice(messages, options)`: Full context with truncation awareness
- `truncateAtWordBoundary(text, maxChars)`: Clean truncation at word boundaries

### phaseAdapters (`src/types/phaseAdapters.ts` - 359 lines)

Converts between `DynamicPhase` (from DynamicPhaseGenerator) and `BuildPhase` (used by UI components) for backwards compatibility.

**Types:**

```typescript
interface ExtendedPhaseInfo {
  phase: DynamicPhase;
  uiPhase: BuildPhase;
  dependencies: DynamicPhase[];
  dependents: DynamicPhase[];
  featureDetails: FeatureClassification[];
  estimatedRemaining: string;
}

interface PlanSummary {
  totalPhases: number;
  completedPhases: number;
  failedPhases: number;
  skippedPhases: number;
  currentPhase: number | null;
  estimatedTokens: number;
  estimatedTime: string;
  complexity: string;
}
```

**Core adapters:**

- `mapDynamicStatusToStatic(status)`: DynamicPhase status → PhaseStatus
- `generatePhaseId(phaseNumber)`: Creates PhaseId-compatible string (maps first 5 to standard IDs)
- `adaptDynamicPhaseToUI(phase)`: DynamicPhase → BuildPhase (full conversion)
- `adaptAllPhasesToUI(plan)`: Converts entire plan for legacy UI components
- `adaptDynamicProgressToUI(plan, manager)`: Calculates BuildProgress from dynamic plan state
- `getProgressFromManager(manager)`: Gets progress directly from PhaseExecutionManager

**Helpers:**

- `getTaskStatus(phaseStatus)`: Maps phase status to task status
- `getFeatureDescription(feature, featureDetails, idx)`: Gets description from classification details
- `inferValidationType(criterion)`: Infers validation type from test criterion text
- `calculateRemainingTime(plan)`: Calculates estimated remaining time from pending phases
- `getExtendedPhaseInfo(phase, plan)`: Gets full phase info with dependencies and dependents
- `getPlanSummary(plan)`: Aggregated stats (total, completed, failed, tokens, time)

### designTokenMappings (`src/utils/designTokenMappings.ts` - 454 lines)

53+ mapping functions and CSS variable generators for design token → CSS/Tailwind conversion.

**Mapping objects (each maps string keys → `{ tailwind, css }` values):**

- `borderRadiusMap`, `shadowMap`, `blurMap`
- `spacingDensityMap`, `sectionPaddingMap`, `containerWidthMap`, `componentGapMap`
- `fontWeightMap`, `headingSizeMap`, `bodySizeMap`, `lineHeightMap`, `letterSpacingMap`
- `animationMap`
- `headerHeightMap`, `headerStyleMap`
- `heroHeightMap`, `heroLayoutMap`
- `cardStyleMap`, `cardHoverEffectMap`
- `sidebarWidthMap`
- `listStyleMap`, `listDensityMap`
- `footerStyleMap`, `footerColumnsMap`

**CSS variable generators:**

- `generateColorCSSVariables(colors)`: Generates CSS variables from color palette (primary, secondary, accent, background, surface, text)
- `generateEffectCSSVariables(effects)`: Generates CSS variables for border radius, shadows, animations
- `generateTypographyCSSVariables(typography)`: Generates CSS variables for font families, weights, sizes
- `generateSpacingCSSVariables(spacing)`: Generates CSS variables for density, container width, padding, gaps
- `generateGlobalsCSSContent(design)`: Master function - generates complete `globals.css` content by orchestrating the 4 generators above plus `:root` wrapper and status colors

### CodeContextService (`src/services/CodeContextService.ts` - 570 lines)

Smart code context management that builds optimal context snapshots for AI phase execution.

**Context Pinning System:**

- `pinFile(path)`: Marks a file as always included in context snapshots (invalidates cache)
- `unpinFile(path)`: Removes pin from a file (invalidates cache)
- `getPinnedFiles()`: Returns list of all pinned file paths

**Context Management:**

- `updateContext(files, options?)`: Adds/updates files in the context graph. Options: `{ incremental?: boolean, phaseNumber?: number }`. Returns `UpdateContextResult` with success status and any failures
- `removeFiles(paths)`: Removes files from context
- `getContextForRequest(request)`: Returns context snapshot for a generic request
- `getPhaseContext(phaseNumber, features, maxTokens)`: Returns optimized context for a specific phase
- `getModificationContext(targetFile, changeDescription, maxTokens)`: Returns context for code modification
- `getMinimalContext(maxTokens)`: Returns minimal context (types + API contracts only)

**Graph Queries:**

- `getDependencies(filePath)`: Direct dependencies of a file
- `getDependents(filePath)`: Files that depend on a given file
- `getTransitiveDependencies(filePath, maxDepth)`: Transitive dependency closure
- `getFileAnalysis(filePath)`: Full analysis for a single file
- `getFilesByType(types)`: Filter files by type (component, api, type, etc.)
- `findFileExporting(symbol)`: Find which file exports a given symbol
- `findRelatedFiles(filePath)`: Find files related to a given file

**State tracking:** `phasesSeen` (phase numbers seen), `filesByPhase` (files added per phase), `pinnedFiles` (always-included files)

**Factory:** `getCodeContextService(appId, appName, appType)` / `clearCodeContextService(appId)` / `clearAllCodeContextServices()`

### ContextCache (`src/services/ContextCache.ts` - 320 lines)

Cache management for CodeContextService with TTL expiration, smart invalidation, and LRU eviction.

**Configuration:**

| Setting | Value |
|---------|-------|
| maxAnalysisCacheSize | 500 |
| maxSnapshotCacheSize | 200 |
| TTL | 15 minutes |

**Analysis cache:**

- `getAnalysis(path, contentHash)`: Get cached file analysis (validates content hash)
- `setAnalysis(path, analysis)`: Store file analysis
- `needsReanalysis(path, contentHash)`: Check if file needs reanalysis
- `invalidateAnalysis(paths)`: Invalidate specific file analyses

**Snapshot cache:**

- `getSnapshotCacheKey(request, version)`: Generate deterministic cache key for context snapshots
- `getSnapshot(cacheKey)`: Get cached context snapshot (validates TTL)
- `setSnapshot(cacheKey, snapshot)`: Store context snapshot
- `invalidateSnapshots()`: Clear all snapshots
- `invalidateSnapshotsForFiles(changedFiles)`: Smart invalidation - only invalidates snapshots containing specific changed files (normalizes paths for cross-platform compatibility)

**Cache management:**

- `clear()`: Clear all caches and reset stats
- `getStats()`: Returns `{ size, hits, misses, evictions, hitRate }`
- `prune()`: Remove expired entries from all caches, returns count pruned

**LRU eviction:** When cache exceeds max size, scores entries by `hits / (ageMs / 1000 + 1)` and evicts lowest-scoring entries.

---

## 10. UI Components

### PhaseControlPanel (227 lines)

**Props:** phases, progress, isBuilding, isPaused, onStartBuild, onPauseBuild, onResumeBuild, onSkipPhase, onRetryPhase, onViewPhaseDetails, dynamicPhases

**Features:**
- Build status badge (Paused/Building)
- Main controls: Start Build / Pause / Resume buttons
- Current phase info with task progress bar
- Built summary display (builtSummary or implementedFeatures)
- Phase actions: Skip (in-progress only) / Retry (failed only)
- Compact scrollable phase list with status icons

### PhaseDetailView (514 lines)

**Props:** phase, isOpen, onClose, onBuildPhase, onSkipPhase, onRetryPhase, generatedCode, dynamicPhase

**4 tabs:**
1. **Comparison** (default when dynamicPhase exists): Side-by-side Planned (blue) vs Built (green/red)
   - Planned: features list, test criteria
   - Built: status-dependent (pending/building/completed/failed), builtSummary, implementedFeatures, builtFiles, errors
2. **Tasks**: Task list with status icons, error messages, code preview
3. **Validation**: Check results with type badges
4. **Generated Code**: Full code with syntax highlighting and copy button

### PhaseProgressIndicator (225 lines)

**Props:** phases, progress, onPhaseClick, maxHorizontalPhases (default: 7)

**Adaptive layouts:**
- **Horizontal** (≤7 phases): Circle nodes with connectors, hover tooltips, pulse animation for current
- **Compact** (>7 phases): Summary row + expandable scrollable list (max 264px)
- Progress bar with garden→gold gradient

### QualityPanel (544 lines)

**Props:** phase, validationResult, qualityReport, pipelineState, onRunValidation, onRunReview, onProceedAnyway, onRetryPhase, onStrictnessChange, isValidating, isReviewing, strictness

**Features:**
- 3-step pipeline indicator: Validating → Reviewing → Complete
- Quality score ring (SVG circular, color-coded: ≥90 green, ≥70 yellow, <70 red)
- Side-by-side validation and review results
- Auto-fixed section with diff viewing
- Remaining issues with AI suggestions
- Strictness selector: Relaxed / Standard / Strict

### PhasesCard (117 lines, Review page)

**Props:** phases, estimatedTotalTime, isLoading

Read-only phase list with loading skeleton, used in Step 4 (Review).

### PhasePlanSection (219 lines, Concept Panel)

**Props:** phasePlan, completedPhases, currentPhase, mode, buildState, onPhaseClick

**Mode-specific:**
- **PLAN mode:** Simple list with estimated tokens
- **ACT mode:** Interactive with build progress, clickable phases, built summary display, status-based styling (failed=red, current=green+pulse, completed=green+checkmark)

---

## 11. Complete Data Flow

```
STEP 1: Wizard (/app/wizard)
├─ User converses with AI → POST /api/wizard/chat
├─ Extracts WizardState → AppConcept
├─ Optional: POST /api/wizard/generate-architecture (if backend detected)
├─ Stores: appConcept, architectureSpec (optional)
└─ Navigate to /app/design

STEP 2: Layout Builder (/app/design)
├─ User uploads images or uses GENERATE mode
├─ Gemini Vision analyzes → LayoutManifest
├─ Self-healing vision loop refines components
├─ Stores: currentLayoutManifest, layoutBuilderFiles
├─ Background intelligence gathering starts (pre-caching)
└─ Navigate to /app/ai-plan

STEP 3: Dual AI Planning (/app/ai-plan)
├─ 5-Stage Pipeline (BackgroundPlanningOrchestrator):
│   1. Layout Analysis (LayoutBackendAnalyzer)
│   2. Intelligence Gathering (uses cached if available)
│   3. Parallel Architecture (Claude + Gemini)
│   4. Consensus Negotiation
│   5. Dual Validation
├─ Stores: dualArchitectureResult, userAISelection
└─ Navigate to /app/review

STEP 4: Review (/app/review)
├─ useEffect: Regenerate phases with architecture context
│   IF dualArchitectureResult exists AND !plan.hasArchitectureContext:
│   ├─ POST /api/wizard/generate-phases
│   │   Body: { concept, dualArchitectureResult, layoutBuilderFiles }
│   ├─ convertToArchitectureSpec() converts dual arch
│   ├─ DynamicPhaseGenerator.generatePhasePlanWithArchitecture()
│   └─ plan.hasArchitectureContext = true
│   ELSE (AI Plan skipped):
│   └─ POST /api/wizard/generate-phases { concept, layoutBuilderFiles }
├─ User reviews all data
├─ Saves GeneratedComponent to Supabase
└─ Navigate to /app

STEP 5: Builder (/app - MainBuilderView)
├─ useEffect: Initialize phase plan
│   if (dynamicPhasePlan && !dynamicBuildPhases.plan)
│   └─ dynamicBuildPhases.initializePlan(dynamicPhasePlan)
│       └─ Creates PhaseExecutionManager instance
│
├─ Phase 1 Auto-Completion (tryStartPhase1):
│   IF layoutBuilderFiles exist:
│   ├─ dynamicBuildPhases.startPhase(1)
│   ├─ Build FullAppData from layout files
│   ├─ dynamicBuildPhases.completePhase({
│   │     phaseNumber: 1, success: true,
│   │     generatedCode: combinedCode,
│   │     implementedFeatures: phase1.features
│   │   })
│   └─ No AI call needed (instant)
│   ELSE: Start Phase 1 normally (AI generation)
│
├─ Subsequent Phases (2-N):
│   ├─ startPhase(N) → captures rollback snapshot (P3)
│   ├─ PhaseExecutionManager.getExecutionContext(N)
│   │   └─ Builds context with all data sources
│   ├─ buildPhaseExecutionPrompt(context)
│   │   └─ 16-section prompt with design fidelity
│   ├─ AI generates code (via chat/streaming hooks → API routes)
│   ├─ completePhase(result)
│   │   ├─ recordPhaseResult (file analysis, tracking)
│   │   ├─ Auto quality review (P1-P9, fire-and-forget)
│   │   └─ Auto-advance after 1.5s (if enabled)
│   └─ Repeat until all phases complete
│
└─ Build Complete:
    ├─ Final quality review (comprehensive, AI-powered)
    ├─ Project documentation saved to Supabase
    └─ Sandpack preview with live editing
```

---

## 12. Configuration & Constants

### Phase Generator Config

| Setting | Value | Purpose |
|---------|-------|---------|
| maxTokensPerPhase | 16,000 | Max tokens per phase before splitting |
| targetTokensPerPhase | 5,000 | Target tokens for balanced phases |
| maxFeaturesPerPhase | 4 | Max features grouped into one phase |
| minFeaturesPerPhase | 1 | Min features per phase |
| minPhases | 2 | Absolute minimum phase count |
| maxPhases | 30 | Absolute maximum phase count |
| alwaysSeparateDomains | auth, database, real-time, offline, integration, i18n | Domains that always get their own phase |
| complexityMultipliers | simple: 1.0, moderate: 1.5, complex: 2.5 | Token estimation multipliers |

### Token Estimates

| Feature Type | Tokens |
|-------------|--------|
| Simple feature | 1,200 |
| Moderate feature | 2,000 |
| Complex feature | 3,500 |
| Setup phase | 2,000 (+800 for production features) |
| Polish phase | 2,500 |
| Layout injection | 500 |

### Smart Context Limits

| Limit | Value |
|-------|-------|
| CodeContextService default budget | 32,000 tokens |
| Conversation context per phase | 12,000 chars max |
| Phase description context | 500 chars appended |
| Feature specs per category | 6 max |
| Workflow specs per phase | 10 max |
| Validation rules per phase | 10 max |
| Exports per file | 20 max |
| Dependencies per file | 15 max |

### File Type Importance Scores (`src/types/codeContext.ts` / `CodeParser.ts`)

| File Type | Importance Score |
|-----------|-----------------|
| type-definition | 0.85 |
| context-provider | 0.80 |
| api-route | 0.75 |
| hook | 0.70 |
| layout | 0.65 |
| page | 0.60 |
| component | 0.55 |
| utility | 0.50 |
| config | 0.45 |
| other | 0.40 |
| style | 0.30 |
| test | 0.20 |

---

## 13. Error Handling

### Generation Errors

- **Concept validation:** Returns 400 with specific message (missing name, no features)
- **Architecture generation failure:** Non-critical - warns and continues without architecture
- **Phase generation failure:** Returns error with warnings and analysis details
- **Circular dependencies:** Detected via DFS, causes validation failure

### Execution Errors

- **OperationResult pattern:** `success | skipped | error` for explicit handling
- **Fail-closed defaults:** P5, P7, P9 return failure on exception (never silently succeed)
- **Mount guard:** `mountedRef.current` prevents state updates after unmount
- **Dynamic import safety:** `webpackIgnore: true` for CodeReviewService (tree-sitter avoidance)
- **Quality review isolation:** Fire-and-forget async, doesn't block phase completion

### Edge Cases

| Scenario | Handling |
|----------|----------|
| No features | Generates setup + polish phases only (minimum 2) |
| Duplicate implicit features | Deduplicated in `groupByDomain()` by `suggestedPhaseName` |
| Missing dependencies | Logged as warnings, not errors |
| Empty conversation context | Returns empty string safely |
| No layout manifest | Falls back to standard setup phase |
| Backend phases with invalid deps | Resolves what it can, warns for missing |
| Token overflow per phase | Auto-splits phases, warns if still over 24K |
| Phase not found | getExecutionContext throws, getOptimizedPhaseContext returns error result |
| No files generated | Quality review returns `skipped` result |
| CodeContextService not initialized | Falls back to legacy smart context |
| Page refresh mid-build | Plan persists (Zustand/localStorage), execution results lost |

---

## 14. Key Design Decisions

1. **Phase 1 is special** - if layout files exist, auto-completed instantly (no AI call, direct code injection via `isLayoutInjection: true`)
2. **Architecture phases come from dual AI planning** - converted via `architectureToPhaseContext.ts`, inserted after setup with priority ordering
3. **Phase execution results don't persist to Supabase** - only the plan persists via Zustand/localStorage. Refreshing mid-build loses executed phase results
4. **Titan Pipeline is NOT used for phase execution** - phases use direct Claude API calls via chat/streaming hooks. Titan is used for modifications/edits after build
5. **Auto-advance has a 1.5s delay** - gives UI time to update between phases, respects isPaused flag
6. **Quality checks are fire-and-forget** - they run async after phase completion but don't block the next phase
7. **Smart context uses CodeContextService** - dependency graph analysis with categorized output (full/signature/types-only/summary), 32K token budget
8. **Memory detection uses weighted scoring** - prevents false positives from common words like "save" or "store"
9. **Phase context extraction mines conversation** - extracts user stories, acceptance criteria, technical notes, validation rules, and workflows per phase domain
10. **All P1-P9 integrity checks are fail-closed** - exceptions result in failure status, never silent success
