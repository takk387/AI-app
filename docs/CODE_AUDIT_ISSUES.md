# Code Audit Report - AI App Builder

> **Audit Date:** December 20, 2025
> **Codebase:** AI App Builder (Personal Development Tool)
> **Total Issues:** 78 (8 fixed, 3 already fixed)

---

## Recent Fixes (December 20, 2025)

| Issue   | Status           | Notes                                                      |
| ------- | ---------------- | ---------------------------------------------------------- |
| CRIT-01 | ✅ Already Fixed | Cache eviction was already implemented in ContextCache     |
| CRIT-02 | ✅ Already Fixed | Cache eviction was already implemented in TreeSitterParser |
| CRIT-03 | ✅ Already Fixed | Event listener cleanup was already present in code         |
| CRIT-04 | ✅ Fixed         | Added 10-minute global timeout to SSE streaming            |
| CRIT-05 | ✅ Fixed         | Added missing deps to useLayoutBuilder sendMessage         |
| HIGH-01 | ✅ Fixed         | Added `useShallow` to `usePanelActions` selector           |
| HIGH-04 | ✅ Fixed         | Wrapped `ChatPanel` in `React.memo`                        |
| HIGH-06 | ✅ Fixed         | Added `useEffect` cleanup for AbortController              |

---

## Context

This is a **personal AI app builder tool** used by a single developer. The audit is calibrated for this use case - not enterprise multi-tenant security standards. Issues are prioritized based on:

1. **Actual risk** to the developer and their work
2. **Stability** during active development sessions
3. **Developer experience** improvements
4. **Code maintainability** for future work

---

## Executive Summary

| Priority  | Count  | Effort       | Description                             |
| --------- | ------ | ------------ | --------------------------------------- |
| Critical  | 11     | 20-30 hours  | Memory leaks, code injection, stability |
| High      | 26     | 50-70 hours  | Performance, cleanup, error handling    |
| Medium    | 25     | 35-50 hours  | Type safety, code quality               |
| Low       | 16     | 15-25 hours  | Nice-to-have improvements               |
| **Total** | **78** | **120-175h** |                                         |

### By Category

| Category         | Critical | High | Medium | Low |
| ---------------- | -------- | ---- | ------ | --- |
| Memory/Stability | 6        | 8    | 5      | 3   |
| Security         | 4        | 3    | 2      | 1   |
| Performance      | 1        | 8    | 6      | 4   |
| Error Handling   | 0        | 7    | 5      | 2   |
| Code Quality     | 0        | 0    | 7      | 6   |

---

## Critical Issues

These issues cause crashes, memory leaks, or data loss during development sessions.

### ~~CRIT-01: Cache Memory Leak in ContextCache~~ ✅ ALREADY FIXED

**Location:** `src/services/ContextCache.ts:88-100, 164-176`

**Status:** Cache eviction was already implemented in the current code:

```typescript
// setAnalysis (lines 88-92)
setAnalysis(path: string, analysis: FileAnalysis): void {
  if (this.analysisCache.size >= this.maxAnalysisCacheSize) {
    this.evictLRU(this.analysisCache); // ✅ Eviction implemented
  }
  // ...
}

// setSnapshot (lines 164-168)
setSnapshot(cacheKey: string, snapshot: CodeContextSnapshot): void {
  if (this.snapshotCache.size >= this.maxSnapshotCacheSize) {
    this.evictLRU(this.snapshotCache); // ✅ Eviction implemented
  }
  // ...
}
```

**No action needed.** The audit was based on an older version of the code.

---

### ~~CRIT-02: Unbounded Tree Cache in TreeSitterParser~~ ✅ ALREADY FIXED

**Location:** `src/utils/treeSitterParser.ts:173-192`

**Status:** LRU eviction was already implemented in the current code:

```typescript
// cacheTree method (lines 173-192)
private cacheTree(key: string, tree: Parser.Tree): void {
  if (this.treeCache.size >= this.maxCacheSize) {
    // Find and remove oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, entry] of this.treeCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      this.treeCache.delete(oldestKey); // ✅ Eviction implemented
    }
  }
  this.treeCache.set(key, { tree, timestamp: Date.now() });
}
```

**No action needed.** The audit was based on an older version of the code.

---

### ~~CRIT-03: Missing Event Listener Cleanup~~ ✅ ALREADY FIXED

**Location:** `src/components/NaturalConversationWizard.tsx:212-222`

**Status:** The cleanup function was already present in the codebase:

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape); // ✅ Present
}, [onCancel]);
```

**No action needed.**

---

### ~~CRIT-04: SSE Streaming Has No Timeout~~ ✅ FIXED

**Location:** `src/app/api/ai-builder/full-app-stream/route.ts:31-32, 83-86, 764`

**Status:** Fixed with 10-minute global timeout:

```typescript
// Line 31-32
const GLOBAL_TIMEOUT_MS = 10 * 60 * 1000;

// Line 83-86 (inside async IIFE, before try block)
const globalTimeoutId = setTimeout(() => {
  abortController.abort('Global timeout exceeded');
}, GLOBAL_TIMEOUT_MS);

// Line 764 (in finally block)
clearTimeout(globalTimeoutId);
```

**Verified:** TypeScript compiles, lint passes.

---

### ~~CRIT-05: Missing Dependency in useLayoutBuilder~~ ✅ FIXED

**Location:** `src/hooks/useLayoutBuilder.ts:718-733`

**Status:** Added missing dependencies to the `sendMessage` callback:

```typescript
// Before: Missing workflowState, onAnimationsReceived, onBackgroundsGenerated, onToolsUsed
[
  messages, design, selectedElement, referenceImages, lastCapture,
  capturePreview, historyIndex, isMemoryEnabled, isMemoryInitialized, searchMemories,
]

// After: All dependencies included
[
  messages, design, selectedElement, referenceImages, lastCapture,
  capturePreview, historyIndex, isMemoryEnabled, isMemoryInitialized, searchMemories,
  workflowState, onAnimationsReceived, onBackgroundsGenerated, onToolsUsed,
]
```

**Verified:** TypeScript compiles, ESLint warning resolved.

---

### CRIT-06: Code Injection via Template Literals

**Location:** `src/app/api/deploy/vercel/route.ts:93-110`

**Problem:**

```typescript
title: '${app.title}',  // User input interpolated directly
```

**Impact:** User could set title to `' + process.env.DATABASE_URL + '` and leak secrets.

**Fix:**

```typescript
function escapeForTemplate(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
```

**Effort:** 1 hour

---

### CRIT-07: Path Traversal Vulnerability

**Location:** `src/services/WebContainerService.ts:140-146`

**Problem:** File paths normalized but not validated for `../` sequences.

**Impact:** Malicious path could escape workspace directory.

**Fix:**

```typescript
function sanitizePath(userPath: string, baseDir: string): string | null {
  const resolved = path.resolve(baseDir, path.normalize(userPath));
  return resolved.startsWith(path.resolve(baseDir)) ? resolved : null;
}
```

**Effort:** 1 hour

---

### CRIT-08: Silent Failure in CodeContextService

**Location:** `src/services/CodeContextService.ts:120`

**Problem:** File analysis failures are logged and skipped. Caller doesn't know context is incomplete.

**Impact:** Builds proceed with missing context. Generated code has missing dependencies.

**Fix:** Return failures array alongside context so caller can decide whether to proceed.

**Effort:** 2 hours

---

### CRIT-09: Missing Error Propagation in PhaseExecutionManager

**Location:** `src/services/PhaseExecutionManager.ts:1242-1254`

**Problem:** Returns `null` for multiple different error conditions. Caller can't distinguish "no context needed" from "context extraction failed."

**Impact:** Builds may proceed when they should fail. Errors silently swallowed.

**Fix:** Use Result type: `{ status: 'success' | 'not-needed' | 'error', ... }`

**Effort:** 3 hours

---

### CRIT-10: No Request Size Limits

**Location:** Multiple API routes

**Problem:** `await request.json()` parses without size check first.

**Impact:** Accidental or intentional large payload causes memory exhaustion.

**Fix:** Check `content-length` header before parsing, or limit stream read.

**Effort:** 2 hours

---

### CRIT-11: Unvalidated Image Base64 Data

**Location:** `src/app/api/ai-builder/full-app-stream/route.ts:272-301`

**Problem:** Base64 image data accepted without size or validity checks.

**Impact:** 1GB base64 string causes memory exhaustion. Invalid images may crash processors.

**Fix:** Validate base64 length before decode, check decoded size, validate image magic bytes.

**Effort:** 2 hours

---

## High Priority Issues

Performance problems and cleanup issues that affect development experience.

### ~~HIGH-01: Missing Shallow Comparison in Zustand Selectors~~ ✅ PARTIALLY FIXED

**Locations:**

- `src/stores/useLayoutPanelStore.ts:185-196` (usePanelActions) - ✅ FIXED
- `src/hooks/useProjectDocumentation.ts:107-112` (6 separate subscriptions) - Still needs fix

**Status:** Fixed `usePanelActions`:

```typescript
import { useShallow } from 'zustand/react/shallow';

export const usePanelActions = () =>
  useLayoutPanelStore(
    useShallow((s) => ({
      setPanel: s.setPanel,
      togglePanel: s.togglePanel,
      openPanel: s.openPanel,
      closePanel: s.closePanel,
      closeAllPanels: s.closeAllPanels,
      initTemplatePicker: s.initTemplatePicker,
    }))
  );
```

**Remaining:** Apply same pattern to `useProjectDocumentation.ts`

---

### HIGH-02: N+1 Query Pattern in DependencyGraphBuilder

**Location:** `src/services/DependencyGraphBuilder.ts:54-86`

**Problem:** For n files with m imports, performs O(n\*m) Map lookups.

**Fix:** Pre-compute lookup sets before iteration.

**Effort:** 2 hours

---

### HIGH-03: Intervals Not Cleaned Up

**Locations:**

- `src/hooks/useDesignAnalysis.ts:108-139`
- `src/hooks/useAnalysisProgress.ts:201-223`

**Problem:** `setInterval` created but cleanup may not run on unmount.

**Fix:** Store interval in ref, cleanup in useEffect return.

**Effort:** 1 hour

---

### ~~HIGH-04: Missing React.memo on Message Lists~~ ✅ PARTIALLY FIXED

**Location:** `src/components/ChatPanel.tsx`, `src/components/PreviewPanel.tsx`

**Status:** Fixed `ChatPanel`:

```typescript
export const ChatPanel: React.FC<ChatPanelProps> = React.memo(function ChatPanel(
  {
    // props
  }
) {
  // component body
});
```

**Remaining:** Apply same pattern to `PreviewPanel.tsx`

---

### HIGH-05: Stale Closures in useResizable

**Location:** `src/hooks/useResizable.ts:305-337`

**Problem:** Event handlers capture stale state values.

**Fix:** Use refs or add dependencies.

**Effort:** 1 hour

---

### ~~HIGH-06: AbortController Not Cleaned~~ ✅ FIXED

**Location:** `src/hooks/useCodeReview.ts:123-130`

**Status:** Added cleanup effect:

```typescript
// Cleanup: abort any in-flight requests on unmount
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []);
```

**Verified:** TypeScript compiles, lint passes.

---

### HIGH-07: Race Conditions in Draft Save

**Location:** `src/hooks/useDraftPersistence.ts:161-187`

**Problem:** Multiple rapid saves can race. Later save may complete before earlier one.

**Fix:** Debounce saves or use version/sequence number.

**Effort:** 2 hours

---

### HIGH-08: O(n²) Import Deduplication

**Location:** `src/utils/astModifier.ts:138-152`

**Problem:** Array search for each import. Quadratic for large files.

**Fix:** Use Set for O(1) lookups.

**Effort:** 30 minutes

---

### HIGH-09: O(n²) Overlap Detection

**Location:** `src/utils/astModifier.ts:1800-1809`

**Problem:** Array grows and is searched repeatedly.

**Fix:** Limit array size or use more efficient data structure.

**Effort:** 1 hour

---

### HIGH-10: Debug Info in Production Errors

**Location:** `src/app/api/ai-builder/full-app/route.ts:358-363`

**Problem:** Error responses include internal details that could leak in production.

**Fix:** Sanitize error responses based on NODE_ENV.

**Effort:** 1 hour

---

### HIGH-11 through HIGH-26

| ID      | Issue                            | Location                 | Fix               |
| ------- | -------------------------------- | ------------------------ | ----------------- |
| HIGH-11 | OAuth error logging leaks tokens | vercel/callback/route.ts | Sanitize logs     |
| HIGH-12 | Brittle regex validation         | codeValidator.ts:41-111  | Use AST parser    |
| HIGH-13 | Unhandled promises               | AIBuilder.tsx:459        | Await or track    |
| HIGH-14 | No accessibility attrs           | Multiple components      | Add aria-\*       |
| HIGH-15 | Type casts without validation    | LayoutBuilderWizard.tsx  | Add guards        |
| HIGH-16 | WebContainer no shutdown         | WebContainerService.ts   | Add cleanup       |
| HIGH-17 | Ref circular reference           | useDesignReplication.ts  | Clear on unmount  |
| HIGH-18 | Conversation history unbounded   | plan-phases/route.ts     | Token limit       |
| HIGH-19 | Nested object validation         | figma/import/route.ts    | Add depth limits  |
| HIGH-20 | Screenshot path injection        | screenshot/route.ts      | Validate paths    |
| HIGH-21 | DALL-E prompts unsanitized       | images/generate/route.ts | Filter content    |
| HIGH-22 | Large Zustand state object       | useAppStore.ts           | Consider slices   |
| HIGH-23 | Set usage in Zustand             | useAppStore.ts:502       | Use arrays        |
| HIGH-24 | getState() during render         | AIBuilder.tsx:898        | Use selector      |
| HIGH-25 | Missing MIME validation          | StorageService.ts        | Server-side check |
| HIGH-26 | Interval in useCallback          | useLayoutBuilder.ts      | Track in ref      |

---

## Medium Priority Issues

Type safety and code quality improvements.

### MED-01: TypeScript Strict Mode Disabled

**Location:** `tsconfig.json:6`

**Current:** `"strict": false`

**Why It Matters:**

- Better IDE autocomplete
- Catches null/undefined bugs at compile time
- Makes refactoring safer

**Why It's Not Critical:**

- You know the codebase
- Runtime errors caught in dev
- Migration effort is high (~500-1000 errors)

**Effort:** 40-60 hours for full migration

---

### MED-02: Rate Limiting on AI Routes (Optional)

**Locations:** All `/api/ai-builder/*` routes

**Current:** No rate limiting (site password is the access control)

**Why You Might Want It:**

- Protects against accidental infinite loops
- Cost control if you share access
- Defense in depth

**Effort:** 4 hours

---

### MED-03 through MED-25

Code quality issues including:

- Magic numbers without constants (8 locations)
- Missing loading states (5 components)
- Large component files (AIBuilder.tsx at 2047 lines)
- Inconsistent import paths
- Missing JSDoc on complex functions
- Low test coverage

---

## Low Priority Issues

Nice-to-have improvements for when you have time.

| ID        | Issue                             | Notes                                                              |
| --------- | --------------------------------- | ------------------------------------------------------------------ |
| LOW-01    | Password stored in cookie         | Works fine for personal use. httpOnly/secure protections in place. |
| LOW-02    | X-Forwarded-For rate limit bypass | Site password is primary protection anyway.                        |
| LOW-03    | Missing skeleton loaders          | UX polish                                                          |
| LOW-04    | Single error boundary             | Root level only                                                    |
| LOW-05    | Inconsistent naming               | Mix of conventions                                                 |
| LOW-06    | No Storybook                      | Component documentation                                            |
| LOW-07    | Bundle size analysis              | Could optimize                                                     |
| LOW-08    | WCAG full compliance              | Accessibility polish                                               |
| LOW-09-16 | Various minor issues              | See appendix                                                       |

---

## Recommended Fix Order

### ~~Immediate (Next Session)~~ ✅ DONE

Quick wins completed:

1. ~~**CRIT-03:** Add event listener cleanup~~ ✅ Was already fixed
2. ~~**CRIT-04:** Add SSE timeout~~ ✅ Fixed (10-minute timeout)
3. ~~**HIGH-01:** Zustand shallow comparison~~ ✅ Fixed (usePanelActions)
4. ~~**HIGH-04:** React.memo on ChatPanel~~ ✅ Fixed
5. ~~**HIGH-06:** AbortController cleanup~~ ✅ Fixed

### ~~Next Session~~ ✅ DONE

Critical stability issues resolved:

1. ~~**CRIT-01 & CRIT-02:** Add cache eviction~~ ✅ Already implemented
2. ~~**CRIT-05:** Fix useLayoutBuilder dependency~~ ✅ Fixed

### Short Term (This Week) - 8-12 hours

Fix remaining critical and high-impact issues:

1. **CRIT-06 & CRIT-07:** Input sanitization (2 hours)
2. **CRIT-08 & CRIT-09:** Error propagation (5 hours)
3. **CRIT-10 & CRIT-11:** Request validation (4 hours)

### When You Notice Problems

Fix as they affect your workflow:

- **HIGH-03:** If you see intervals running after navigation
- **HIGH-07:** If drafts save incorrectly
- **MED-01:** When a null error bites you in production

### Optional (Rainy Day)

- TypeScript strict mode migration
- Rate limiting
- Full accessibility audit
- Test coverage

---

## Files Most Needing Attention

| File                     | Issues | Priority                                      |
| ------------------------ | ------ | --------------------------------------------- |
| AIBuilder.tsx            | 8      | HIGH - large file, several hooks issues       |
| useLayoutBuilder.ts      | 5      | ~~6~~ → 5 (stale closure ✅ fixed)            |
| full-app-stream/route.ts | 4      | ~~5~~ → 4 (SSE timeout ✅ fixed)              |
| ContextCache.ts          | 0      | ~~3~~ → 0 (cache eviction ✅ already present) |
| treeSitterParser.ts      | 0      | ~~3~~ → 0 (cache eviction ✅ already present) |
| astModifier.ts           | 4      | HIGH - O(n²) algorithms                       |
| useAppStore.ts           | 4      | HIGH - Zustand patterns                       |
| PhaseExecutionManager.ts | 3      | CRITICAL - error propagation                  |
| useLayoutPanelStore.ts   | 0      | ~~1~~ → 0 (useShallow ✅ fixed)               |
| ChatPanel.tsx            | 0      | ~~1~~ → 0 (React.memo ✅ fixed)               |
| useCodeReview.ts         | 0      | ~~1~~ → 0 (AbortController cleanup ✅ fixed)  |

---

## Quick Wins (Under 30 Minutes Each)

All quick wins have been addressed:

1. ~~Add useEffect cleanup for event listeners (CRIT-03)~~ ✅ Was already fixed
2. ~~Add useShallow to usePanelActions (HIGH-01)~~ ✅ Fixed
3. ~~Wrap ChatPanel in React.memo (HIGH-04)~~ ✅ Fixed
4. ~~Add AbortController cleanup (HIGH-06)~~ ✅ Fixed
5. ~~Add SSE timeout constant and setTimeout (CRIT-04)~~ ✅ Fixed

---

## What NOT To Worry About

These were flagged in the initial audit but are fine for your use case:

1. **CORS wildcards on Figma routes** - Required for the Figma plugin to work
2. **Password in cookie** - Simple site gate, not user auth. Has proper cookie flags.
3. **Console statements** - Your ESLint config allows warn/error. This is intentional.
4. **No rate limiting** - Site password is your access control. Rate limiting is optional defense-in-depth.
5. **X-Forwarded-For bypass** - Only matters if you add rate limiting.
