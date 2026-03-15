# Dual AI Architecture Planning - Implementation Plan

## Summary

Insert a **Dual AI Architecture Planning** system between the Layout Design and Review steps. Two AIs (Claude Opus 4.6 + Gemini 3 Pro) independently analyze the app concept and layout, then negotiate consensus on **architecture decisions** (database, API, auth, agentic workflows, scaling, AI model selections). The existing `DynamicPhaseGenerator` then sequences that architecture into build phases.

**Key Architectural Decision:** Dual AIs decide WHAT to build (architecture). Existing `DynamicPhaseGenerator` decides HOW to sequence it (phases). No duplication.

**Source Documents:**

- Original design: `archive/docs/full-stack.md` (approved design doc)
- Feature details: `docs/Necessary_update.md` (service implementations)

### UX Flow (Hybrid - User Addition)

The original doc has planning triggered by a "Build" button with a floating progress panel. Per user requirements, we adapt:

1. User completes layout design, clicks "Continue to AI Plan"
2. User lands on **new `/app/ai-plan` page** — pipeline starts automatically on page mount
3. Page shows pipeline progress (stages 1-5 with live updates via SSE)
4. On completion: `ConsensusResultView` shows architecture + `AISelectionPanel` appears
5. AI Selection Panel: user picks Cost Effective / High Quality / Hybrid tier - **user addition**
6. Per-feature AI model multi-select if app needs multiple AIs - **user addition**
7. If escalated: `ConsensusEscalationDialog` modal for user to resolve disagreements
8. User proceeds to Review → existing DynamicPhaseGenerator creates phases from architecture
9. Navigation becomes 5 steps: Wizard → Design → AI Plan → Review → Builder

### Model IDs (User Corrections)

- Claude Opus 4.6: `claude-opus-4-6` (original doc said 4.5)
- Claude Sonnet 4.5: `claude-sonnet-4-5-20250929` (original doc said Sonnet 4)
- Gemini 3 Pro: `gemini-3-pro-preview` (keep as-is)

---

## Implementation Phases (Dependency Order)

### Phase 0: Constants & Configuration

**File: `src/constants/aiModels.ts` (NEW, ~80 lines)** — _not in original doc, added for user's AI selection feature_

- Centralized model ID constants (single source of truth for all model references)
- `AIModelOption` interface with id, provider, name, tier, capabilities, costTier, contextWindow, bestFor
- `MODEL_CATALOG` array for the AI Selection Panel UI
- `AI_SETUP_TIERS` config mapping cost-effective/high-quality/hybrid to model presets
- Dependencies: None

---

### Phase 1: Type Definitions

**File: `src/types/dualPlanning.ts` (NEW, ~400 lines)** — _matches original doc file path_

Types organized by pipeline stage, matching original doc's data structures:

**Stage 1 - Layout Analysis:**

- `FrontendBackendNeeds` — exactly as defined in original doc (data models, API endpoints, state management, features, performance)

**Stage 2 - Intelligence:**

- `AIModelInfo`, `AIModelRecommendation`, `FrameworkInfo`, `LibraryInfo`
- `IntelligenceContext` — aiModels, frameworks, categoryPatterns, agenticFrameworks, security, performance

**Stage 3 - Architecture Generation:**

- `ArchitecturePosition` — matches original doc's architecture structure: database, api, auth, agentic, realtime, techStack, scaling, aiSelections

**Stage 4 - Consensus:**

- `Disagreement` — topic, claudeStance, geminiStance, reasoning
- `NegotiationRound` — round, positions, feedback, agreements, disagreements
- `ConsensusResult` — reached, rounds, finalArchitecture?, escalationReason?, divergentIssues?

**Stage 5 - Validation:**

- `ValidationIssue` — severity (critical/warning/suggestion), category, description, affectedFeatures, suggestedFix
- `ValidationReport` — issues, coverage, reasoning
- `DualValidationResult` — claudeValidation, geminiValidation, finalReport

**Output:**

- `UnifiedArchitecture` — exactly as defined in original doc (database, api, auth, agentic, realtime, techStack, scaling, aiSelections, consensusReport)
- `FinalValidatedArchitecture` — extends UnifiedArchitecture with validation metadata

**AI Selection UI (user addition):**

- `AISetupTier` = `'cost-effective' | 'high-quality' | 'hybrid'`
- `AIFeatureSelection` — per-feature model choices
- `UserAISelection` — selectedTier, featureSelections, customOverrides

**Pipeline State:**

- `DualPlanStage` = `'idle' | 'layout-analysis' | 'intelligence' | 'parallel-generation' | 'consensus' | 'validation' | 'complete' | 'error' | 'escalated'`
- `DualPlanProgress` — stage, percent, message, negotiationRound?, maxRounds?, details?

**SSE Events:**

- `DualPlanSSEEvent` — matches original doc's progress update structure (stage, progress, message, details)

Dependencies: Imports `AppConcept` from `@/types/appConcept`, `LayoutManifest` from `@/types/schema`

---

### Phase 2: Services (5 services — matches original doc file list)

All services follow existing singleton class pattern. File paths match original doc.

**2A. `src/services/LayoutBackendAnalyzer.ts` (NEW, ~250 lines)**

- Matches original doc exactly
- Class `LayoutBackendAnalyzer` with singleton export
- Method: `extractBackendNeeds(manifest: LayoutManifest): FrontendBackendNeeds`
- **Implementation note:** Original doc uses `layout.components` array but actual `LayoutManifest` uses `root: UISpecNode` tree. Must adapt to traverse `UISpecNode` tree recursively instead.
- Logic patterns from doc: auth detection (keywords), data display (types), model inference (component IDs), field extraction, complexity assessment
- Pure synchronous — no AI calls
- Dependencies: `@/types/schema`, `@/types/dualPlanning`

**2B. `src/services/LiveIntelligenceGatherer.ts` (NEW, ~400 lines)**

- Matches original doc structure
- Class `LiveIntelligenceGatherer` (server-side only)
- Method: `gather(appConcept: AppConcept): Promise<IntelligenceContext>`
- Parallel web searches via `/api/web-search` route (5 categories from doc + agentic frameworks)
- Agentic detection: analyzes concept for workflow keywords (automation, processing, moderation, routing, orchestration)
- Synthesizes recommendations using Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `/api/ai/claude` proxy route
- Graceful degradation if web search fails
- Dependencies: `@/types/dualPlanning`, `@/constants/aiModels`

**2C. `src/services/ConsensusNegotiator.ts` (NEW, ~550 lines)**

- Matches original doc structure — architecture negotiation, NOT phase negotiation
- Class `ConsensusNegotiator` (server-side only)
- Methods:
  - `negotiate(claudeArch, geminiArch, appConcept, intelligence, onRoundComplete): Promise<ConsensusResult>`
- Max 5 rounds, convergence detection (disagreements must decrease)
- Claude Opus 4.6 with extended thinking reviews Gemini's architecture
- Gemini 3 Pro reviews Claude's architecture
- Claude questions coding approaches; Gemini proposes agentic alternatives (per doc)
- Calls AI via `/api/ai/claude` and `/api/ai/gemini` proxy routes
- Progress callback per round for SSE streaming
- Dependencies: `@/types/dualPlanning`, `@/constants/aiModels`

**2D. `src/services/DualValidationOrchestrator.ts` (NEW, ~300 lines)**

- Matches original doc exactly
- Class `DualValidationOrchestrator` (server-side only)
- Method: `validate(architecture: UnifiedArchitecture, concept: AppConcept): Promise<DualValidationResult>`
- Both AIs validate in parallel: Claude checks implementation feasibility, Gemini checks agentic design quality
- Merges + deduplicates validation issues
- Decision: approve if no critical issues AND coverage >= 95%; replan otherwise
- Max 3 replan attempts (from doc)
- Dependencies: Same as ConsensusNegotiator

**2E. `src/services/BackgroundPlanningOrchestrator.ts` (NEW, ~450 lines)**

- Matches original doc name and responsibility
- Class `BackgroundPlanningOrchestrator` — main pipeline coordinator
- Method: `execute(concept: AppConcept, manifest: LayoutManifest, onProgress): Promise<FinalValidatedArchitecture>`
- Orchestration flow (from doc):
  1. Layout analysis (0-5%)
  2. Intelligence gathering (5-20%)
  3. Parallel architecture generation (20-40%) — Claude Opus 4.6 + Gemini 3 Pro in parallel
  4. Consensus negotiation (40-80%)
  5. Dual validation (80-100%)
  6. Replan if needed (max 3 attempts)
  7. Return final architecture (NOT phases)
- 10-minute global timeout
- Emits progress events matching doc's structure (stage, progress, message, details)
- Dependencies: All 4 services above

---

### Phase 3: API Routes (matches original doc file list)

**3A. `src/app/api/web-search/route.ts` (NEW, ~100 lines)** — _from original doc_

- POST: `{ query: string }` → `{ results: Array<{ title, url, snippet }> }`
- Uses web search provider (Tavily/Serper/SerpAPI)
- Environment variable: `WEB_SEARCH_API_KEY`
- Error handling: returns empty results on failure (non-blocking)
- `maxDuration = 30`

**3B. `src/app/api/ai/claude/route.ts` (NEW, ~60 lines)** — _from original doc_

- Generic Claude API proxy
- POST: `{ prompt, model, extendedThinking? }` → AI response
- Uses Anthropic SDK server-side
- Default model: `claude-opus-4-6`

**3C. `src/app/api/ai/gemini/route.ts` (NEW, ~60 lines)** — _from original doc_

- Generic Gemini API proxy
- POST: `{ prompt, model }` → AI response
- Uses Google GenAI SDK server-side
- Default model: `gemini-3-pro-preview`

**3D. `src/app/api/planning/start/route.ts` (NEW, ~80 lines)** — _from original doc_

- POST: `{ concept: AppConcept, layoutManifest: LayoutManifest }` → `{ sessionId }`
- Creates planning session, stores in server-side Map (dev) / Redis (production)
- Session includes: concept, layoutManifest, timestamp
- Automatic cleanup after 1 hour
- Validates inputs

**3E. `src/app/api/planning/stream/[sessionId]/route.ts` (NEW, ~150 lines)** — _from original doc_

- GET endpoint with SSE streaming (EventSource compatible)
- Retrieves session data by sessionId
- Creates `BackgroundPlanningOrchestrator`, passes progress callback
- SSE event format: `data: ${JSON.stringify(event)}\n\n`
- Final event: complete (with architecture) / escalation / error
- Session deleted after architecture completion
- `maxDuration = 600` (10 minutes)
- `dynamic = 'force-dynamic'`

---

### Phase 4: Store & Hook

**4A. `src/store/useAppStore.ts` (MODIFY — additive only)** — _matches original doc_

Add to store (matching original doc's state storage spec):

```typescript
// From original doc
dualArchitectureResult: FinalValidatedArchitecture | null;
dualArchitectureEscalation: EscalationData | null;
setDualArchitectureResult: (result: FinalValidatedArchitecture | null) => void;
setDualArchitectureEscalation: (escalation: EscalationData | null) => void;

// User additions for AI selection feature
userAISelection: UserAISelection | null;
setUserAISelection: (selection: UserAISelection | null) => void;

// Pipeline progress tracking (for UI)
dualPlanProgress: DualPlanProgress | null;
setDualPlanProgress: (progress: DualPlanProgress | null) => void;
```

- Add to `partialize` for localStorage persistence: `dualArchitectureResult`, `userAISelection`
- Bump persist version with migration (new fields are nullable, old state works fine)
- **Impact: Additive only. No breaking changes to existing 24+ dependents.**

**4B. `src/types/appConcept.ts` (MODIFY)** — _from original doc_

- Add optional field: `dualArchitectureResult?: FinalValidatedArchitecture`
- Non-breaking: optional field with no existing data to migrate

**4C. `src/hooks/useDualAIPlan.ts` (NEW, ~280 lines)** — _not in original doc, needed for hybrid UX_

Custom hook for client-side pipeline management:

- `startPlanning(concept, manifest)` — POSTs to `/api/planning/start`, connects EventSource to `/api/planning/stream/[sessionId]`
- Parses SSE events, updates store (`setDualArchitectureResult`, `setDualPlanProgress`, `setDualArchitectureEscalation`)
- `cancelPlanning()` — closes EventSource, cleans up
- `retryPlanning()` — resets state and restarts
- `resolveEscalation(choice)` — stores user's architecture choice on escalation
- `setUserAISelection(selection)` — saves tier + per-feature choices

Return type:

```typescript
{
  isPlanning: boolean;
  progress: DualPlanProgress | null;
  result: FinalValidatedArchitecture | null;
  error: string | null;
  isEscalated: boolean;
  escalation: EscalationData | null;
  (startPlanning, cancelPlanning, retryPlanning, resolveEscalation, setUserAISelection);
  stageLabel: string;
  isComplete: boolean;
}
```

---

### Phase 5: UI Components

**5A. REMOVED** — Floating progress panel (`DualPlanningProgress.tsx`) is not needed. Users must finish layout before progressing, so the pipeline starts on navigation to `/app/ai-plan` and progress is shown directly on that page via `PipelineStagesView`.

**5B. `src/components/ConsensusEscalationDialog.tsx` (NEW, ~150 lines)** — _from original doc, exact name_

- Full-screen modal
- Divergent issues section (e.g., "Claude: traditional REST API" vs "Gemini: agentic workflow with LangChain")
- Side-by-side architecture comparison
- Action buttons: Choose Claude's / Choose Gemini's / Merge
- Appears on escalation event, user must choose to continue

**5C. `src/components/ai-plan/AISelectionPanel.tsx` (NEW, ~250 lines)** — _user addition_

- Three-tier card selector: Cost Effective / High Quality / Hybrid
- Each card shows recommended AI models per task with estimated cost
- Per-feature AI model grid when app concept requires multiple AIs:
  - Lists each feature needing AI with recommended models
  - Details per model: capabilities, cost, how it works with the specific feature
  - Multi-select checkboxes for features where user wants AI model choice in their app
- Uses `MODEL_CATALOG` from `@/constants/aiModels` + intelligence gathering results

**5D. `src/components/ai-plan/PipelineStagesView.tsx` (NEW, ~150 lines)** — _user addition for dedicated page_

- Visual pipeline stages (1-5) with progress indicators on the ai-plan page
- Current stage highlighted, completed stages checked
- Elapsed time display

**5E. `src/components/ai-plan/ConsensusResultView.tsx` (NEW, ~130 lines)** — _user addition for dedicated page_

- Displays: agreements, compromises, negotiation rounds count
- Architecture summary: database, API style, auth, agentic workflows, tech stack
- Collapsible sections for detail

**5F. `src/components/ai-plan/index.ts` (NEW, ~10 lines)**

- Barrel export for ai-plan sub-components

**5G. `src/app/(protected)/app/ai-plan/page.tsx` (NEW, ~320 lines)** — _user addition_

- The dedicated AI Plan page (new Step 3 in navigation)
- Header: app name + "Continue to Review" button (disabled until AI selection made)
- Content:
  - If planning in progress: `PipelineStagesView` with live SSE progress updates
  - If complete: `ConsensusResultView` + `AISelectionPanel`
  - If escalated: `ConsensusEscalationDialog` modal overlay
- Reads `appConcept`, `currentLayoutManifest`, `dualArchitectureResult`, `dualPlanProgress` from store
- Uses `useDualAIPlan` hook
- On "Continue to Review": saves AI selection → triggers DynamicPhaseGenerator with architecture → navigates to `/app/review`
- If pipeline hasn't started yet (direct navigation), triggers `startPlanning()` on mount

**5H. `src/components/review/AIPlanCard.tsx` (NEW, ~120 lines)** — _user addition for review page_

- Review card showing architecture planning summary
- Displays: consensus reached (yes/no + rounds), key architecture decisions, AI setup tier, agentic workflows
- "Edit" button links to `/app/ai-plan`
- Pattern matches existing `ConceptCard.tsx`

---

### Phase 6: Navigation & Integration Changes

**6A. `src/components/AppNavigation.tsx` (MODIFY)** — _user addition_

- Insert new step between Design and Review:
  - Step 1: Wizard, Step 2: Design, **Step 3: AI Plan (NEW)**, Step 4: Review, Step 5: Builder
- Completion detection for step 3: `!!dualArchitectureResult`
- New icon: Brain icon (lucide-react) for AI Plan step
- Renumber Review → step 4, Builder → step 5

**6B. `src/app/(protected)/app/design/page.tsx` (MODIFY)** — _adapted from original doc's LayoutBuilderWizard integration_

- Original doc says modify `LayoutBuilderWizard.tsx` with "Build" button — but actual codebase uses `design/page.tsx` with "Continue to Review" button. Adapting:
- Rename `handleContinueToReview` → `handleContinueToAIPlan`
- Button text: "Continue to AI Plan"
- After layout thumbnail capture: navigate to `/app/ai-plan` (pipeline starts on that page's mount)
- Navigate to `/app/ai-plan` instead of `/app/review`
- Keep existing phase regeneration as fallback (guarded: skip if dual AI pipeline active)

**6C. `src/app/(protected)/app/review/page.tsx` (MODIFY)**

- Add `AIPlanCard` to review grid
- Read `dualArchitectureResult` and `userAISelection` from store
- "Edit" link navigates to `/app/ai-plan`

**6D. Integration with DynamicPhaseGenerator** — _from original doc Section 6.2-6.3_

The original doc specifies:

- **`src/app/api/wizard/generate-phases/route.ts` (MODIFY):**
  - If `dualArchitectureResult` exists in request → pass to `DynamicPhaseGenerator`
  - `DynamicPhaseGenerator` focuses purely on sequencing (token complexity, dependency ordering, context accumulation)
  - If not provided → fallback to existing single-AI planning (backwards compatible)

- **`src/services/DynamicPhaseGenerator.ts` (MODIFY):**
  - Accept `FinalValidatedArchitecture` as optional input
  - When provided: architecture has all technical decisions made, generator focuses purely on phase sequencing
  - When not provided: existing behavior unchanged

- **`src/utils/architectureToPhaseContext.ts` (NEW, ~120 lines):** — _bridging utility_
  - Converts `FinalValidatedArchitecture` into `ArchitectureSpec` format that `DynamicPhaseGenerator` expects
  - Maps agentic workflows into proper phase domains
  - Ensures architecture decisions are preserved in `PhaseConceptContext`

---

## Complete File Summary

### New Files (21 files)

| File                                               | Est. Lines | Source           |
| -------------------------------------------------- | ---------- | ---------------- |
| `src/constants/aiModels.ts`                        | ~80        | User addition    |
| `src/types/dualPlanning.ts`                        | ~400       | Original doc     |
| `src/services/LayoutBackendAnalyzer.ts`            | ~250       | Original doc     |
| `src/services/LiveIntelligenceGatherer.ts`         | ~400       | Original doc     |
| `src/services/ConsensusNegotiator.ts`              | ~550       | Original doc     |
| `src/services/DualValidationOrchestrator.ts`       | ~300       | Original doc     |
| `src/services/BackgroundPlanningOrchestrator.ts`   | ~450       | Original doc     |
| `src/app/api/web-search/route.ts`                  | ~100       | Original doc     |
| `src/app/api/ai/claude/route.ts`                   | ~60        | Original doc     |
| `src/app/api/ai/gemini/route.ts`                   | ~60        | Original doc     |
| `src/app/api/planning/start/route.ts`              | ~80        | Original doc     |
| `src/app/api/planning/stream/[sessionId]/route.ts` | ~150       | Original doc     |
| `src/hooks/useDualAIPlan.ts`                       | ~280       | User addition    |
| `src/components/ConsensusEscalationDialog.tsx`     | ~150       | Original doc     |
| `src/components/ai-plan/AISelectionPanel.tsx`      | ~250       | User addition    |
| `src/components/ai-plan/PipelineStagesView.tsx`    | ~150       | User addition    |
| `src/components/ai-plan/ConsensusResultView.tsx`   | ~130       | User addition    |
| `src/components/ai-plan/index.ts`                  | ~10        | User addition    |
| `src/app/(protected)/app/ai-plan/page.tsx`         | ~320       | User addition    |
| `src/components/review/AIPlanCard.tsx`             | ~120       | User addition    |
| `src/utils/architectureToPhaseContext.ts`          | ~120       | Bridging utility |

### Modified Files (7 files)

| File                                          | Change                                                                                              | Source                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| `src/store/useAppStore.ts`                    | Add dualArchitectureResult, dualArchitectureEscalation, userAISelection, dualPlanProgress + setters | Original doc + user additions |
| `src/types/appConcept.ts`                     | Add optional `dualArchitectureResult` field                                                         | Original doc                  |
| `src/components/AppNavigation.tsx`            | 4-step → 5-step, add AI Plan step                                                                   | User addition                 |
| `src/app/(protected)/app/design/page.tsx`     | Navigate to `/app/ai-plan`, trigger pipeline on ai-plan page mount                                  | Adapted from original doc     |
| `src/app/(protected)/app/review/page.tsx`     | Add AIPlanCard to review grid                                                                       | User addition                 |
| `src/services/DynamicPhaseGenerator.ts`       | Accept FinalValidatedArchitecture input                                                             | Original doc                  |
| `src/app/api/wizard/generate-phases/route.ts` | Use architecture if available, fallback to existing                                                 | Original doc                  |

---

## Environment Variables

```
WEB_SEARCH_API_KEY=           # Tavily/Serper/SerpAPI key for live intelligence
```

(Existing `ANTHROPIC_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` already configured)

---

## Verification Plan

1. **Types compile:** `npm run typecheck` after Phase 0-1
2. **Services unit testable:** Mock AI responses, test each service after Phase 2
3. **API routes testable:** curl/Postman against each route after Phase 3
4. **Hook integration:** Hook test with mocked fetch after Phase 4
5. **UI renders:** Component render tests + manual browser check after Phase 5
6. **E2E flow:** Full navigation Wizard → Design → AI Plan → Review → Builder after Phase 6
7. **Fallback works:** Disable dual AI planning → existing single-AI flow still works
8. **Run full suite:** `npm run typecheck && npm run lint && npm test`

---

## Success Metrics (from original doc)

- Consensus Rate: >85%
- Validation Pass Rate: >90%
- Feature Coverage: >95%
- Architecture Planning Duration: <5 minutes average
- Negotiation Rounds: <3 average
- Intelligence Gathering: <30 seconds
- API Success Rate: >99%
- SSE Connection Stability: >95%

---

## Risk Mitigation (from original doc + additions)

| Risk                                    | Mitigation                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| AIs never reach consensus               | Max 5 rounds + convergence check + escalation to user                                                   |
| Pipeline takes too long                 | 10-min timeout, background execution, progress updates                                                  |
| Web search fails                        | Retry + cached fallback, pipeline continues without                                                     |
| Over-engineering with agentic workflows | Claude's scrutiny + dual validation + user can reject                                                   |
| Store migration breaks data             | New fields are nullable, old persisted state loads fine                                                 |
| `useAppStore.ts` has 24+ dependents     | Changes are purely additive                                                                             |
| LayoutManifest schema mismatch          | Doc uses `layout.components` but real schema uses `root.children` tree — adapt in LayoutBackendAnalyzer |
| Session storage issues                  | In-memory dev, Redis production, automatic 1hr cleanup                                                  |
| Invalid architectures                   | Dual validation + max 3 replans + fallback to single-AI                                                 |
