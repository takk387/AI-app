# Dynamic Phase System — Production Readiness Audit

**Date:** 2026-02-17
**Scope:** Complete line-by-line audit of the Dynamic Phase system (~6,000+ lines across 20+ files)
**Result:** 17 verified bugs — 5 critical, 8 high-impact, 4 low-impact

---

## System Overview

The Dynamic Phase system generates and executes build phases to produce full applications. The pipeline:

```
AppConcept → DynamicPhaseGenerator → DynamicPhasePlan → PhaseExecutionManager
  → buildPhaseExecutionPrompt() → /api/ai-builder/full-app-stream → Claude AI
  → Generated code → completePhase() → auto-advance → next phase
```

### Files Audited

| File | Lines | Role |
|------|-------|------|
| `src/types/dynamicPhases.ts` | 915 | All types, interfaces, enums, constants |
| `src/services/DynamicPhaseGenerator.ts` | 682 | Phase plan generation from AppConcept |
| `src/services/phaseGeneration/featureClassifier.ts` | 610 | Feature classification + implicit features |
| `src/services/phaseGeneration/phaseFactory.ts` | 603 | Phase creation factories |
| `src/services/phaseGeneration/contextExtractor.ts` | 252 | Context extraction from conversation |
| `src/services/phaseGeneration/phaseKeywords.ts` | 282 | Keyword dictionaries |
| `src/services/phaseGeneration/fileAnalyzer.ts` | 396 | File metadata extraction |
| `src/services/PhaseExecutionManager.ts` | 758 | Phase execution orchestrator |
| `src/services/phaseExecution/promptBuilder.ts` | 660 | AI prompt assembly |
| `src/services/phaseExecution/executionUtils.ts` | 111 | OperationResult type + helpers |
| `src/hooks/useDynamicBuildPhases.ts` | 660 | React hook — phase state machine |
| `src/hooks/usePhaseExecution.ts` | 406 | Phase lifecycle — tryStartPhase1, executePhase |
| `src/hooks/useSendMessage.ts` | 355 | User-driven message flow |
| `src/hooks/useSendMessageHandlers.ts` | 471 | handleBuildTrigger, handleModifyTrigger |
| `src/hooks/useStreamingGeneration.ts` | 247 | SSE client for full-app-stream |
| `src/app/api/ai-builder/full-app-stream/route.ts` | 1,220 | Claude API call, SSE output, validation |
| `src/services/CodeContextService.ts` | 570 | Dependency graph, smart context |
| `src/services/CodeParser.ts` | 1,070 | AST parsing (TypeScript Compiler API) |
| `src/services/ContextSelector.ts` | 692 | Context selection + token budgeting |
| `src/services/DependencyGraphBuilder.ts` | 561 | Dependency graph (DAG) |
| `src/prompts/builder.ts` | 250 | System prompt assembly |
| `src/prompts/production-standards.ts` | 314 | Production standards + ErrorBoundary |
| `src/prompts/quality-standards.ts` | 303 | Quality standards + domain rules |
| `src/prompts/full-app/backend-templates.ts` | 962 | Backend feature templates |
| `src/prompts/full-app/examples-compressed.ts` | 277 | Example app templates |
| `src/prompts/designTokenPrompt.ts` | 456 | Design token prompt (currently dead) |
| `src/utils/architectureToPhaseContext.ts` | 321 | Architecture → phase context converter |

---

## Tier 1: Critical Bugs (System-Breaking)

### C1. `extractRawFiles` regex never matches — CodeContextService permanently dead

**Files:** `PhaseExecutionManager.ts:357-370`, `usePhaseExecution.ts:302`

**Problem:** When a phase completes, `completePhase()` calls `manager.recordPhaseResult(result)`. The `result.generatedCode` is set to `JSON.stringify(streamResult, null, 2)` — a JSON object like:
```json
{
  "name": "MyApp",
  "description": "...",
  "files": [
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/index.css", "content": "..." }
  ]
}
```

But `extractRawFiles()` uses this regex:
```
/===FILE:([^=]+)===\n([\s\S]*?)(?=\n===(?:FILE|DEPENDENCIES|END)===|$)/g
```

This regex looks for `===FILE:path===\n...` delimiters that exist in the raw SSE stream output but **not** in the JSON-stringified `streamResult`. The regex matches nothing. `this.rawGeneratedFiles` stays empty permanently. `CodeContextService` is never initialized (`rawGeneratedFiles.length > 0` check fails). Smart context — dependency-aware file selection with token budgeting — is never provided to any phase.

**Evidence:**
- `usePhaseExecution.ts:302`: `generatedCode: JSON.stringify(streamResult, null, 2)`
- `useSendMessageHandlers.ts:207,331`: Same pattern in both handlers
- `PhaseExecutionManager.ts:277`: `this.rawGeneratedFiles = this.extractRawFiles(result.generatedCode)`
- `PhaseExecutionManager.ts:236`: `if (this.rawGeneratedFiles.length > 0)` — always false

**Impact:** Every phase after Phase 1 gets `previousPhaseCode` (raw string concatenation with no intelligence) instead of smart context (dependency graph, token budget, representation levels). The AI:
- Doesn't understand project structure or file dependencies
- May regenerate code it shouldn't touch
- Gets no guidance on what files are most relevant to the current phase
- May exceed context limits on large apps

**Fix:** In `recordPhaseResult`, parse `generatedCode` as JSON first, extract `files` array directly:
```typescript
private extractRawFiles(generatedCode: string): Array<{ path: string; content: string }> {
  // Try JSON parse first (from streamResult)
  try {
    const parsed = JSON.parse(generatedCode);
    if (parsed?.files && Array.isArray(parsed.files)) {
      return parsed.files.filter((f: any) => f.path && f.content);
    }
  } catch { /* not JSON, fall through */ }

  // Fallback: legacy delimiter format
  const files: Array<{ path: string; content: string }> = [];
  const filePattern = /===FILE:([^=]+)===\n([\s\S]*?)(?=\n===(?:FILE|DEPENDENCIES|END)===|$)/g;
  let match;
  while ((match = filePattern.exec(generatedCode)) !== null) {
    files.push({ path: match[1].trim(), content: match[2].trim() });
  }
  return files;
}
```

---

### C2. Phase 1 (non-layout) stalls indefinitely

**Files:** `usePhaseExecution.ts:162-165`, `usePhaseExecution.ts:384-396`

**Problem:** `tryStartPhase1()` has two branches:
- **Branch A (layout injection):** Calls `startPhase(1)`, injects layout files, calls `completePhase()`. Works correctly.
- **Branch B (no layout):** Calls `startPhase(1)` only. Does NOT call `executePhase(1)`.

The auto-execute effect at line 384-396 has a guard:
```typescript
if (phase && phase.number > 1 && ...)
```

Phase 1 is excluded by `phase.number > 1`. Phase 1 is now stuck in `in-progress` status forever. No AI generation occurs.

**Evidence:**
- `usePhaseExecution.ts:162-164`: `startPhase(1); return true;` — no `executePhase` call
- `usePhaseExecution.ts:388`: `phase.number > 1` guard excludes Phase 1

**Impact:** Any app built without using the Layout Builder (skipping Step 2) will never start building. The UI shows Phase 1 as "in progress" but nothing happens.

**Fix:** Either:
1. Remove the `> 1` guard: `phase && !streaming.isStreaming && ...`
2. Or call `executePhase(1)` directly in the non-layout branch of `tryStartPhase1`

Option 1 is cleaner — it unifies the execution path for all phases.

---

### C3. `i18n` and `testing` domains silently dropped from phase generation

**Files:** `DynamicPhaseGenerator.ts:387-403`

**Problem:** The `domainPriority` array controls which domains get processed into phases:
```typescript
const domainPriority: FeatureDomain[] = [
  'core-entity', 'feature', 'ui-component', 'integration', 'storage',
  'real-time', 'notification', 'search', 'analytics', 'admin',
  'ui-role', 'backend-validator', 'devops', 'monitoring', 'offline',
];
```

Missing: `'i18n'` and `'testing'`. Both are valid `FeatureDomain` values (defined in `dynamicPhases.ts:28-49`). Both can be assigned by `getImplicitFeatures()`:
- `featureClassifier.ts:299-316`: `tech.needsI18n` creates features with `domain: 'i18n'`
- `COMPLEX_FEATURE_PATTERNS` includes an i18n pattern

These features are classified and grouped correctly into `featuresByDomain`, but the loop at line 405 (`for (const domain of domainPriority)`) never iterates over `'i18n'` or `'testing'`. The phases are silently never created.

**Evidence:**
- `dynamicPhases.ts:28-49`: Both `'i18n'` and `'testing'` are in the `FeatureDomain` union type
- `featureClassifier.ts:299`: `domain: 'i18n'` is assigned
- `DynamicPhaseGenerator.ts:387-403`: Neither appears in `domainPriority`

**Impact:** Apps requesting internationalization will have no i18n phase. The plan reports success with no indication that i18n was dropped.

**Fix:** Add both domains to `domainPriority`:
```typescript
const domainPriority: FeatureDomain[] = [
  'core-entity', 'feature', 'ui-component', 'integration', 'storage',
  'real-time', 'notification', 'search', 'analytics', 'admin',
  'ui-role', 'i18n', 'testing', 'backend-validator', 'devops',
  'monitoring', 'offline',
];
```

---

### ~~C4. Phase 1 prompt generates React SPA structure, not Next.js App Router~~ — NOT A BUG

**Status:** Verified as correct behavior. Generated apps are React SPAs (not Next.js). The preview uses a custom esbuild-wasm bundler (`BrowserPreviewService`) with `src/App.tsx` as the default entry point. `TitanBuilder.ts` explicitly creates `/src/App.tsx`, `/src/styles.css`, `/src/index.tsx`. The Phase 1 prompt instructions match this architecture correctly.

---

### C5. `uiPreferences` not null-guarded — TypeError crashes phase generation

**Files:** `phaseFactory.ts:74,77,93-94,271,285`

**Problem:** Multiple locations access `concept.uiPreferences.style`, `concept.uiPreferences.colorScheme`, and `concept.uiPreferences.layout` without null checks. The `AppConcept` type has `uiPreferences?: UIPreferences` (optional field).

```typescript
// phaseFactory.ts line 74
`- Color scheme: ${concept.uiPreferences.colorScheme}`
// phaseFactory.ts line 77
`- UI style: ${concept.uiPreferences.style}`
// phaseFactory.ts line 93
`- Uses ${concept.uiPreferences.style} design style`
```

If `concept.uiPreferences` is undefined (possible when: user skips style selection, data migration from older version, API creates concept without UI preferences), these lines throw `TypeError: Cannot read properties of undefined (reading 'style')`.

**Evidence:**
- `phaseFactory.ts:74,77,93-94`: Direct property access without optional chaining
- `phaseFactory.ts:271,285`: Same pattern in `createPolishPhase`

**Impact:** Phase generation crashes. No phases created. Build cannot start.

**Fix:** Add optional chaining with defaults:
```typescript
concept.uiPreferences?.colorScheme ?? 'neutral'
concept.uiPreferences?.style ?? 'modern'
concept.uiPreferences?.layout ?? 'standard'
```

---

## Tier 2: High-Impact Bugs (Degrade Quality) — ALL FIXED

### H1. `isPaused` race condition in auto-advance

**Files:** `useDynamicBuildPhases.ts:293-309`

**Problem:** After a phase completes, auto-advance fires after 1500ms:
```typescript
setTimeout(() => {
  if (mountedRef.current && !isPaused) {
    startPhase(nextPhaseNumber);
  }
}, 1500);
```

`isPaused` is a React state value captured in the `completePhase` callback's closure. If the user clicks "Pause" between phase completion and the 1500ms timeout, the closure still holds the old `isPaused = false` value. Auto-advance fires despite the user having paused.

**Fix:** Use a ref that stays in sync:
```typescript
const isPausedRef = useRef(isPaused);
useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

// In setTimeout:
if (mountedRef.current && !isPausedRef.current) { ... }
```

---

### H2. `COMPONENT_SYNTAX_RULES` duplicated in system prompt

**Files:** `builder.ts:188,190`

**Problem:** Lines 188 and 190 both include `${COMPONENT_SYNTAX_RULES}`. Copy-paste bug. Wastes tokens on every full-app generation call.

**Fix:** Remove line 190.

---

### H3. Design token data loss in `formatLayoutManifestForPrompt`

**Files:** `promptBuilder.ts:66-124`, `designTokenPrompt.ts` (dead code)

**Problem:** `formatLayoutManifestForPrompt()` only extracts:
- Colors (primary, secondary, accent, background, surface, text, textMuted, border, success, warning, error)
- Font families (heading, body)

Not extracted:
- Spacing/density settings
- Border radius values
- Shadow definitions
- Typography weights and sizes
- Component-specific specs (header, card, sidebar, footer styles)
- Animation settings

The full `buildDesignTokenPrompt()` in `designTokenPrompt.ts` covers all of these but is commented out in `builder.ts` with a TODO.

**Impact:** Generated apps have correct colors and fonts but generic spacing, borders, and component styles. Design fidelity is reduced.

**Fix:** Expand `formatLayoutManifestForPrompt` to include the missing tokens, or reconnect `buildDesignTokenPrompt` adapted for `LayoutManifest`.

---

### H4. `getPhaseQualityRules(domain)` never called from phase execution

**Files:** `quality-standards.ts` (line ~270), `promptBuilder.ts`

**Problem:** `getPhaseQualityRules(domain)` returns domain-specific quality rules:
- `'auth'` → authentication security patterns
- `'form'` → form validation and UX rules
- `'data'` → data handling best practices
- `'ui'` → accessibility and responsive design rules

This function exists and is exported but is never imported or called in `promptBuilder.ts`. Auth phases don't get auth-specific security guidance. Form phases don't get validation rules.

**Impact:** The AI generates code without domain-specific quality guidance. Auth phases may have security gaps. Form phases may have poor UX.

**Fix:** Import and call `getPhaseQualityRules(context.domain)` in `buildPhaseExecutionPrompt` and inject the result into the prompt.

---

### H5. Architecture conversion collapses all DB relation types to `one-to-many`

**Files:** `architectureToPhaseContext.ts:118`

**Problem:**
```typescript
relations: model.relations?.map((r: any) => ({
  field: r.field || r.name || 'unknown',
  relatedModel: r.relatedModel || r.target || 'unknown',
  type: 'one-to-many' as const,  // Always one-to-many
}))
```

Every relation — `one-to-one`, `many-to-many`, `one-to-many` — becomes `one-to-many`. This flows into the phase context and affects Prisma schema generation.

**Impact:** Generated database schemas have incorrect relation types. A `User ↔ Profile` one-to-one relation would be generated as one-to-many, producing wrong foreign key structure.

**Fix:** Map the actual relation type from the source:
```typescript
type: r.type || r.relationType || 'one-to-many',
```

---

### H6. `formatArchitectureSpec` hardcodes SQLite for development

**Files:** `backend-templates.ts:957`

**Problem:** The function ends with:
```
"SQLite is used for development - schema is PostgreSQL-compatible for production migration."
```

This appears even when the architecture specifies PostgreSQL or Supabase as the database. The AI receives contradictory instructions: the architecture spec says PostgreSQL, but the closing note says use SQLite.

**Fix:** Remove the hardcoded line, or make it conditional on the architecture's database choice.

---

### H7. ErrorBoundary template uses hardcoded blue Tailwind colors

**Files:** `production-standards.ts`

**Problem:** The `ERROR_BOUNDARY_TEMPLATE` includes:
```
bg-blue-600 hover:bg-blue-700 focus:ring-blue-500
```

These hardcoded colors override whatever design system CSS variables are set. Apps with a red, green, or custom color scheme will still have blue retry buttons in their error boundary.

**Fix:** Replace with CSS variable references: `bg-[var(--color-primary)]` or remove color classes entirely so the design system applies.

---

### H8. Example apps use hardcoded slate colors contradicting CSS variable instructions

**Files:** `examples-compressed.ts`

**Problem:** Todo and Blog example apps use `bg-slate-900`, `bg-slate-800`, `text-white` throughout. These examples are injected into the same prompt that instructs the AI to use CSS variables for all colors. The AI receives contradictory guidance: standards say "use CSS variables," examples show hardcoded Tailwind colors.

**Fix:** Update examples to use CSS variables or remove color classes, aligning with the design system instructions.

---

## Tier 3: Low-Impact Bugs (Edge Cases, Cleanup) — ALL FIXED

### L1. Auth dependency string mismatch

**Files:** `featureClassifier.ts:109`, `DynamicPhaseGenerator.ts:347`

**Problem:** Implicit auth feature has `dependencies: ['Database Setup']`, but the database phase is named `'Database Schema'`. The explicit dependency never resolves. Auth still depends on database via the domain-level rule, so it's functionally correct but the explicit dependency record is broken.

**Fix:** Change to `dependencies: ['Database Schema']`.

---

### L2. Polish phase depends only on immediate predecessor

**Files:** `phaseFactory.ts:281`

**Problem:** `dependencies: [phaseNumber - 1]` gives polish only one dependency. Comment says "Depends on all previous." If a middle phase fails and is skipped, polish may still run because its only formal dependency (the previous phase) completed.

**Fix:** `dependencies: Array.from({length: phaseNumber - 1}, (_, i) => i + 1)`.

---

### L3. `createDesignSystemPhase` is dead code

**Files:** `phaseFactory.ts:172-249`

**Problem:** Function defined but never called anywhere. `generatePhasesFromGroups` uses `createLayoutInjectionPhase` when a layout manifest exists.

**Fix:** Remove the function and its imports (e.g., `DEFAULT_COLORS` from `@/constants/themeDefaults`).

---

### L4. `addGeneratedFiles` in hook bypasses manager

**Files:** `useDynamicBuildPhases.ts:500-527`

**Problem:** `addGeneratedFiles` and `addImplementedFeatures` update React plan state directly without going through the manager. If `recordPhaseResult` also updates files, the manager and hook state diverge.

**Fix:** Route updates through `manager.addFiles()` / `manager.addFeatures()` methods, then sync plan state.

---

### L5. `codeContextAppId` uses app name as ID — singleton collision

**Files:** `PhaseExecutionManager.ts:496`, `useDynamicBuildPhases.ts:656`

**Problem:** `getCodeContextService(appName, appName, appType)` uses app name for both `appId` and `appName`. Two plans named "Todo App" would share the same CodeContextService singleton, potentially contaminating each other's context.

**Fix:** Use `plan.id` (which is unique: `plan-${Date.now()}-${random}`) instead of `plan.appName`.

---

### L6. `estimatedTotalTime` stale after backend phase injection

**Files:** `DynamicPhaseGenerator.ts:227-234`

**Problem:** `injectBackendPhases` recalculates `estimatedTotalTokens` but not `estimatedTotalTime`. Time estimate becomes stale.

**Fix:** Recalculate total time from all phases after injection.

---

### L7. `maxTokensPerPhase` JSDoc/value mismatch

**Files:** `dynamicPhases.ts:330,365`

**Problem:** JSDoc says "Default: 8000" but actual default is `16000`.

**Fix:** Update JSDoc comment to say "Default: 16000".

---

### L8. `analyzeLayoutComplexity` has no recursion depth limit

**Files:** `featureClassifier.ts:457-499`

**Problem:** Recursive DFS on layout tree with no depth limit. Malformed or extremely deep layout trees could cause stack overflow.

**Fix:** Add max depth parameter (e.g., 50), bail out with a safe default when exceeded.

---

### L9. Infinite retry loop on `executePhase` error

**Files:** `usePhaseExecution.ts:199,318,329,340`

**Problem:** Error paths reset `executingPhaseRef.current = null` but don't update the phase status (it remains `in-progress`). The auto-execute effect sees the phase still in-progress, `executingPhaseRef.current === null`, and re-fires `executePhase` immediately. This creates an infinite retry loop.

**Fix:** Add a retry counter ref. After 2-3 retries, mark the phase as `failed` and stop retrying.

---

## Additional Findings (Not Bugs — Architecture Notes)

### A1. Two distinct execution paths exist

- **Path A (Automatic):** `usePhaseExecution` → `startPhase` → `executePhase` → auto-advance
- **Path B (User-driven):** `useSendMessage` → `handleBuildTrigger`/`handleModifyTrigger` → streaming

Both paths call `completePhase()` if a phase is active, but Path B does NOT set `isPhaseBuilding` in the request body. The API route receives no phase context from Path B.

### A2. Manager state vs hook state divergence

`PhaseExecutionManager` mutates its internal plan state. `useDynamicBuildPhases` maintains separate React state via `setPlan`. After each operation, the hook reads `manager.getPlan()` and spreads it into a new plan object. The spread creates a new top-level reference but the `phases` array and phase objects inside are the same references. This works due to mutation but is fragile — any code that memoizes phase objects by reference may miss updates.

### A3. Quality review overlaps with next phase

The fire-and-forget quality review IIFE in `completePhase` runs concurrently with the 1500ms auto-advance timer. If quality review modifies accumulated code (via `syncFromQualityReview`), the modifications could affect the next phase's context. The timing is not guaranteed.

### A4. Token estimates are all hardcoded

Every `estimatedTokens` value across `featureClassifier.ts`, `phaseFactory.ts`, and `architectureToPhaseContext.ts` is a hardcoded integer. None use `PhaseGeneratorConfig.baseTokenEstimates` or `complexityMultipliers`. The config fields exist but are never applied.

### A5. `designTokenPrompt.ts` is entirely dead code in the phase pipeline

456 lines of design token prompt generation that covers spacing, effects, typography, animations. Currently commented out with a TODO in `builder.ts`. The replacement (`formatLayoutManifestForPrompt`) provides only ~30% of the design data.

### A6. Backend templates are phase-blind

All backend templates (`AUTH_TEMPLATE`, `FILE_UPLOAD_TEMPLATE`, etc.) are included in every generation call regardless of which phase is executing. A Phase 1 "project setup" gets auth templates even though auth is Phase 4. This wastes tokens and may confuse the AI.

---

## Hardcoded Magic Numbers Inventory

| Location | Value | Purpose |
|----------|-------|---------|
| `featureClassifier.ts:119` | `4000` | Auth implicit feature token estimate |
| `featureClassifier.ts:136` | `3500` | Database implicit feature token estimate |
| `featureClassifier.ts:155` | `4000` | Realtime implicit feature token estimate |
| `featureClassifier.ts:171` | `3500` | File upload implicit feature token estimate |
| `featureClassifier.ts:193` | `2500` | API implicit feature token estimate |
| `featureClassifier.ts:209` | `4000` | State management token estimate |
| `featureClassifier.ts:229` | `4500` | Context memory token estimate |
| `featureClassifier.ts:249` | `2000` | Backend validator token estimate |
| `featureClassifier.ts:271` | `2500` | Caching token estimate |
| `featureClassifier.ts:289` | `4000` | Offline support token estimate |
| `featureClassifier.ts:309` | `4000` | i18n token estimate |
| `featureClassifier.ts:330` | `4000` | DevOps token estimate |
| `featureClassifier.ts:348` | `3000` | Monitoring token estimate |
| `featureClassifier.ts:411` | `15, 4` | Layout complexity thresholds (nodes, depth) |
| `phaseFactory.ts:86` | `800` | Extra tokens for production features in setup |
| `phaseFactory.ts:152` | `500` | Token estimate for layout injection phase |
| `phaseFactory.ts:226` | `4500` | Design system phase token estimate |
| `phaseFactory.ts:319` | `1500` | Tokens-per-minute for time estimate |
| `contextExtractor.ts:43` | `12000` | Max context extraction chars |
| `contextExtractor.ts:47` | `8` | Max paragraphs extracted |
| `contextExtractor.ts:244` | `500` | Max context appended to description |
| `DynamicPhaseGenerator.ts:199` | `1500` | Tokens-per-minute for backend phase time |
| `PhaseExecutionManager.ts:233` | `16000` | Default max tokens for async context |
| `useDynamicBuildPhases.ts:298` | `1500` | Auto-advance delay (ms) |
| `builderExpertPrompt.ts` | `2000` | File content truncation (chars) |

---

## Recommended Implementation Order

### Phase 1 — Critical Fixes (C1-C5)
These block production quality. Fix in order:
1. **C1** (`extractRawFiles`) — Unblocks CodeContextService for all phases
2. **C2** (Phase 1 stall) — Unblocks non-layout builds
3. **C3** (missing domains) — Fixes silent feature dropping
4. **C4** (wrong file paths) — Verify Sandpack config, then fix or document
5. **C5** (null crash) — Prevents generation crashes

### Phase 2 — High-Impact Fixes (H1-H8)
Quality improvements:
1. **H1** (isPaused race) — Prevents unwanted auto-advance
2. **H2** (duplicate rules) — Token savings
3. **H3** (design tokens) — Design fidelity
4. **H4** (quality rules) — Domain-specific AI guidance
5. **H5** (relations) — Database schema accuracy
6. **H6** (SQLite hardcode) — Database config accuracy
7. **H7 + H8** (hardcoded colors) — Design system consistency

### Phase 3 — Low-Impact Fixes (L1-L9)
Cleanup and edge cases.

---

## Files to Modify

| File | Fixes |
|------|-------|
| `src/services/PhaseExecutionManager.ts` | C1, L5 |
| `src/hooks/usePhaseExecution.ts` | C2, L9 |
| `src/services/DynamicPhaseGenerator.ts` | C3, L6 |
| `src/services/phaseExecution/promptBuilder.ts` | C4, H3, H4 |
| `src/services/phaseGeneration/phaseFactory.ts` | C5, L2, L3 |
| `src/hooks/useDynamicBuildPhases.ts` | H1, L4 |
| `src/prompts/builder.ts` | H2 |
| `src/prompts/production-standards.ts` | H7 |
| `src/prompts/full-app/examples-compressed.ts` | H8 |
| `src/utils/architectureToPhaseContext.ts` | H5 |
| `src/prompts/full-app/backend-templates.ts` | H6 |
| `src/types/dynamicPhases.ts` | L7 |
| `src/services/phaseGeneration/featureClassifier.ts` | L1, L8 |
