# Plan: Make CodeContextService the Single Code Context System

## Discovery: CodeContextService Is Currently Dead Code

Deep trace revealed a **critical finding**: `CodeContextService` is never actually used during phase execution.

**The actual build flow:**
1. **Phase 1 only:** `MainBuilderView.tryStartPhase1()` → injects layout files directly as JSON → calls `completePhase()` → NO API call at all
2. **Phase 2-N:** `startPhase(N)` only updates status to `in-progress` — it does NOT trigger AI generation. There is no automatic execution loop.
3. User must manually send a chat message → `useSendMessage` routes to `handleBuildTrigger()` → `streaming.generate()` → `/api/ai-builder/full-app-stream`
4. The SSE route builds its own prompt via `buildFullAppPrompt()` from `@/prompts/builder` — the structured `buildPhaseExecutionPrompt()` output is never used
5. The request body does NOT include `previousPhaseCode` — only `phaseContexts` (domain context), `architectureSpec`, and the user's natural language prompt

**What's broken:**
- The hook `useDynamicBuildPhases` only exposes sync `getExecutionContext()` (line 393)
- Sync `getExecutionContext()` always calls `getSmartCodeContext()` → `buildSmartCodeContext()` (line 779)
- The async `getExecutionContextAsync()` that initializes CodeContextService has **zero callers** (verified: only exists at PhaseExecutionManager.ts:838)
- `isPhaseBuilding` flag in full-app-stream route is **never sent by any client code** (verified: only in route.ts lines 177, 192, 281, 463)
- `buildPhaseExecutionPrompt()` is only called in the hook's `getExecutionPrompt()`, which itself is **never called outside of tests** (verified: zero component/hook callers)
- `previousPhaseCode` is built inside `getExecutionContext()` but is **never sent** in the request body from `useSendMessage.handleBuildTrigger()` (line 449-459)
- There is **no automatic phase execution loop** — `startPhase()` only updates status, doesn't trigger AI generation. User must manually chat to trigger builds.

**Result:** CodeContextService's entire integration exists but is never reached. The structured phase execution prompt (`buildPhaseExecutionPrompt`) is never used. All phase execution relies on user chat messages routed through `handleBuildTrigger()`, which sends the user's natural language to `/api/ai-builder/full-app-stream` without any code context from previous phases.

## Goal

Make CodeContextService the **sole** code context system, properly wired into the actual build flow. Remove `buildSmartCodeContext()`.

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/hooks/useDynamicBuildPhases.ts` | 620 | Wire async CodeContextService into phase lifecycle |
| `src/services/PhaseExecutionManager.ts` | 2,095 | Remove `getSmartCodeContext()`, export `formatCodeContextSnapshot()` (line 210), ensure async path is primary |
| `src/services/DynamicPhaseGenerator.ts` | 2,718 | Remove `buildSmartCodeContext()` + `calculateFileImportance()` |
| `src/hooks/useSendMessage.ts` | 782 | Send code context snapshot with phase build requests |
| `src/app/api/ai-builder/full-app-stream/route.ts` | ~500 | Consume smart context snapshot from request |
| `docs/Dynamic-Conflict.md` | 246 | Update Issue #1 to reflect resolution |

## Implementation Steps

### Step 1: Make the hook's context retrieval async

**File:** `src/hooks/useDynamicBuildPhases.ts`

Change `getExecutionContext` from sync to async:
- Replace sync `manager.getExecutionContext(phaseNumber)` with `await manager.getExecutionContextAsync(phaseNumber)`
- Update the return type from `PhaseExecutionContext | null` to `Promise<PhaseExecutionContext | null>`
- Update `getExecutionPrompt` to also be async since it depends on `getExecutionContext`
- Update the hook's return type interface (lines 93-94)

### Step 2: Ensure CodeContextService initializes on first phase

**File:** `src/services/PhaseExecutionManager.ts`

The async path at lines 838-859 already initializes CodeContextService. Verify it:
- `getExecutionContextAsync()` calls `initializeCodeContext()` if `!this.codeContextService && rawGeneratedFiles.length > 0`
- `getOptimizedPhaseContext()` updates context and caches snapshot
- `getExecutionContext()` picks up `cachedSmartContextSnapshot` at line 826

Remove the legacy fallback:
- Delete `getSmartCodeContext()` method (lines 1005-1007)
- In `getExecutionContext()` line 779: remove `const smartCodeContext = this.getSmartCodeContext();`
- Line 788: change `previousPhaseCode: smartCodeContext || this.accumulatedCode || null` to just `previousPhaseCode: this.accumulatedCode || null` (this is the last-resort raw fallback - only used if CodeContextService snapshot is present, meaning the prompt builder will use the snapshot not this)
- Keep `accumulatedCode` as absolute last resort in case CodeContextService fails AND snapshot is null

### Step 3: Send smart context to the API

**File:** `src/hooks/useSendMessage.ts`

In `handleBuildTrigger()` (line 446):
- Get the context snapshot from the hook: `dynamicBuildPhases.getSmartContextSnapshot()`
- Add to build request body: `smartContextSnapshot: serializedSnapshot`
- Add `isPhaseBuilding: true` when phase is active

This also requires exposing the snapshot from the hook:
- **File:** `src/hooks/useDynamicBuildPhases.ts` - add `getSmartContextSnapshot()` to return

### Step 4: Consume smart context on the server

**File:** `src/app/api/ai-builder/full-app-stream/route.ts`

The route already has `isPhaseBuilding` and `rawPhaseContext` parsing (lines 177-209). Update it to:
- Accept `smartContextSnapshot` in the request body
- When `isPhaseBuilding && smartContextSnapshot`: format it using the same `formatCodeContextSnapshot()` logic from PhaseExecutionManager
- Inject into the prompt alongside or instead of `previousPhaseCode`

### Step 5: Remove `buildSmartCodeContext()` from DynamicPhaseGenerator

**File:** `src/services/DynamicPhaseGenerator.ts`

Delete lines 2235-2334 (100 lines total):
- Comment header `// SMART CODE CONTEXT METHODS` (lines 2235-2236)
- `MAX_CODE_CONTEXT` constant (line 2241)
- `buildSmartCodeContext()` method (lines 2247-2279)
- `calculateFileImportance()` method (lines 2286-2334)

The file continues at line 2335 with `analyzeGeneratedFiles()` which must be preserved.

Only ONE caller exists: `PhaseExecutionManager.ts:1006` (`this.phaseGenerator.buildSmartCodeContext(this.rawGeneratedFiles)`). No other files reference `buildSmartCodeContext`, `calculateFileImportance`, or `MAX_CODE_CONTEXT`.

### Step 6: Update documentation

**File:** `docs/Dynamic-Conflict.md`
- Update Issue #1 to note it's been resolved
- Update Recommendation #1 to mark as done

**File:** `docs/Dynamic-System.md`
- Remove references to `buildSmartCodeContext()` and `getSmartCodeContext()`
- Update section 5.9 (public methods) to remove `getSmartCodeContext()`

## Key Considerations

### Error Resilience in CodeContextService
The service is already designed to handle failures gracefully:
- `updateContext()` catches per-file parse errors, continues with partial results (line 165-170)
- `getPhaseContext()` returns an empty snapshot (not null/throw) when no files match
- The singleton factory ensures one instance per app
- Cache with 15-min TTL and smart invalidation already in place

### What if CodeContextService.getPhaseContext() returns empty?
- `buildPhaseExecutionPrompt()` checks `enhancedContext.smartContextSnapshot` (line 566)
- If snapshot has zero `context` files, the section will be minimal but present
- `previousPhaseCode` from `accumulatedCode` serves as absolute last resort (line 574-581)

### Serialization for network transport
`CodeContextSnapshot` contains `SelectedFile[]` with string content - fully JSON-serializable. The type is already exported from `src/types/codeContext.ts` (lines 333-346).

`formatCodeContextSnapshot()` exists at PhaseExecutionManager.ts line 210 but is currently **NOT exported** (private module-level function). Must add `export` keyword before the API route can import it.

### No automatic phase execution loop exists (related but out of scope)
The verification revealed that `startPhase(N)` (useDynamicBuildPhases.ts:213-237) only updates status — it does NOT trigger AI generation. The auto-advance logic (lines 288-298) calls `startPhase(nextPhaseNumber)` after a 1.5s delay, but this just sets the next phase to `in-progress` without executing it. The user must manually send a chat message to trigger `handleBuildTrigger()`. This is a separate architectural issue (no automatic phase execution pipeline) and is NOT addressed by this plan. This plan focuses solely on making CodeContextService the single code context system when phases DO execute.

### Budget unification
CodeContextService uses 32K tokens by default (line 262). The hook calls `getOptimizedPhaseContext(phaseNumber, 16000)` (line 848). These should use a shared constant. Consider creating a `CODE_CONTEXT_TOKEN_BUDGET` in the types/config.

## Verification

1. `npm run typecheck` - all removed references compile
2. `npm run lint` - no unused imports
3. `npm test` - existing tests pass (especially `useDynamicBuildPhases.test.ts`)
4. Grep verification:
   - `grep -r "buildSmartCodeContext" src/` → 0 results
   - `grep -r "getSmartCodeContext" src/` → 0 results
   - `grep -r "calculateFileImportance" src/` → 0 results
   - `grep -r "MAX_CODE_CONTEXT" src/` → 0 results
5. Manual test: Start a build, verify Phase 2+ receives smart context snapshot in the request to full-app-stream
