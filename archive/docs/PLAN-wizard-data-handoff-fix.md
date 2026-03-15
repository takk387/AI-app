# Plan: Fix Wizard-to-Builder Data Handoff

## Problem Statement

The user journey (Wizard → Layout → Build → Builder) has critical data handoff failures where information collected in earlier steps doesn't persist to later steps.

**User Report:** "Wizard information isn't even making it to build or builder"

---

## Root Cause Analysis

### Verified by Three Independent AI Analyses (Claude, Gemini, Cline)

| Finding                                     | Status       | Evidence                                        |
| ------------------------------------------- | ------------ | ----------------------------------------------- |
| Zustand store has NO persistence middleware | ✅ Confirmed | `useAppStore.ts` only uses `devtools` + `immer` |
| LayoutBuilderView doesn't READ appConcept   | ✅ Confirmed | No `useAppStore` import, no `appConcept` usage  |
| Design page lacks navigation to Build       | ✅ Confirmed | `design/page.tsx` is minimal wrapper            |
| Wizard correctly saves to store             | ✅ Confirmed | `wizard/page.tsx` calls `setAppConcept()`       |
| `saveToWizard()` exists in useLayoutBuilder | ✅ Confirmed | Line ~693 calls `setCurrentLayoutManifest()`    |

### The Core Issue

```
Wizard saves to store → Navigation → [PAGE REFRESH/RELOAD] → STORE RESETS TO EMPTY
                                              ↑
                                       NO PERSISTENCE!
```

The store is **purely in-memory**. Any page refresh, new tab, or browser navigation that triggers a reload causes complete data loss.

---

## Impact Matrix

| Scenario                              | Current Behavior |
| ------------------------------------- | ---------------- |
| Wizard → Design → Build (no refresh)  | ✅ Works         |
| User refreshes page at any step       | ❌ All data lost |
| User opens Build in new tab           | ❌ Empty state   |
| Browser back button (may reload)      | ❌ Data lost     |
| Any navigation triggering full reload | ❌ Data lost     |

---

## Implementation Plan

### Phase 1: Add Zustand Persist Middleware (FOUNDATIONAL)

**File:** `src/store/useAppStore.ts`

**Priority:** CRITICAL - Must be done first

**Change:**

```typescript
import { persist } from 'zustand/middleware';

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, _get) => ({
        // ... existing state and actions
      })),
      {
        name: 'ai-app-builder-storage',
        partialize: (state) => ({
          // Only persist workflow-critical data
          appConcept: state.appConcept,
          dynamicPhasePlan: state.dynamicPhasePlan,
          currentLayoutManifest: state.currentLayoutManifest,
          currentAppId: state.currentAppId,
        }),
      }
    ),
    {
      name: 'app-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
```

**Why partialize?**

- Only persist workflow-critical data, not UI state
- Prevents localStorage bloat
- Chat messages, generation state, etc. don't need persistence

**Verification:**

1. Complete wizard with test app
2. Refresh page on Design step
3. Navigate to Build - should have appConcept data
4. Open DevTools → Application → Local Storage → verify data exists

---

### Phase 2: Wire LayoutBuilderView to Read Store Context

**Files:**

- `src/components/LayoutBuilderView.tsx`
- `src/hooks/useLayoutBuilder.ts`

**Priority:** HIGH - UX continuity

**Changes:**

1. **LayoutBuilderView.tsx** - Import and read appConcept:

```typescript
import { useAppStore } from '@/store/useAppStore';

export default function LayoutBuilderView() {
  const appConcept = useAppStore((state) => state.appConcept);

  // Display app context in header
  // Pass uiPreferences to layout analysis
}
```

2. **useLayoutBuilder.ts** - Accept appConcept for AI context:

```typescript
interface UseLayoutBuilderOptions {
  appConcept?: AppConcept;
}

export function useLayoutBuilder(options?: UseLayoutBuilderOptions) {
  // Use appConcept.name in welcome message
  // Use appConcept.uiPreferences in AI analysis prompts
}
```

**Verification:**

1. Complete wizard with "Recipe App" and "dark theme"
2. Navigate to Design step
3. Should see "Design your Recipe App" (not generic welcome)
4. AI analysis should consider dark theme preference

---

### Phase 3: Add Navigation to Design Page

**File:** `src/app/(protected)/app/design/page.tsx`

**Priority:** MEDIUM - UX flow

**Changes:**

```typescript
export default function DesignPage() {
  const appConcept = useAppStore((state) => state.appConcept);
  const router = useRouter();

  const handleContinueToBuild = () => {
    // Layout is auto-saved via useLayoutBuilder
    router.push('/app/build');
  };

  return (
    <div>
      {appConcept && (
        <header>
          <h1>Design: {appConcept.name}</h1>
        </header>
      )}
      <LayoutBuilderView />
      <button onClick={handleContinueToBuild}>
        Continue to Build →
      </button>
    </div>
  );
}
```

**Verification:**

1. Complete wizard and design steps
2. Click "Continue to Build"
3. Build page should have both appConcept and layoutManifest

---

### Phase 4: Skip (Already Implemented)

**Gemini's Gap 3** suggested LayoutBuilderView "never saves to store" - this was **incorrect**.

**Evidence:** `useLayoutBuilder.ts` line ~693:

```typescript
const saveToWizard = useCallback(() => {
  // ...
  useAppStore.getState().setCurrentLayoutManifest(manifest);
}, [components, designSpec]);
```

The `saveToWizard()` function exists and is used by `LayoutPreview.tsx`. No changes needed.

---

## Files to Modify

| File                                      | Change Type                   | Phase |
| ----------------------------------------- | ----------------------------- | ----- |
| `src/store/useAppStore.ts`                | Add persist middleware        | 1     |
| `src/components/LayoutBuilderView.tsx`    | Read appConcept from store    | 2     |
| `src/hooks/useLayoutBuilder.ts`           | Accept appConcept for context | 2     |
| `src/app/(protected)/app/design/page.tsx` | Add header + navigation       | 3     |

---

## Testing Plan

### Automated Tests

```bash
# Run existing tests to ensure no regressions
npm run typecheck
npm run lint
npm test
```

### Manual Test Flow

1. **Start fresh:** Clear localStorage, refresh app
2. **Wizard step:** Create "Recipe App" with dark theme, social features
3. **Verify storage:** Check DevTools → Local Storage for persisted data
4. **Refresh test:** Refresh page, verify data persists
5. **Design step:** Verify app name shown, upload design
6. **Navigation:** Click "Continue to Build"
7. **Build step:** Verify appConcept and layoutManifest present
8. **Builder step:** Start building, verify code uses layout/preferences
9. **New tab test:** Open /app/build in new tab, verify data exists

---

## Risk Assessment

| Risk                          | Likelihood | Mitigation                                      |
| ----------------------------- | ---------- | ----------------------------------------------- |
| localStorage quota exceeded   | Low        | Use `partialize` to limit persisted data        |
| Stale data after code changes | Medium     | Add version to persist config for migration     |
| Hydration mismatch (SSR)      | Medium     | Use `skipHydration` or client-only wrapper      |
| Breaking existing flows       | Low        | Persist only adds data, doesn't change behavior |

---

## Rollback Plan

If issues arise:

1. Remove `persist` middleware wrapper from `useAppStore.ts`
2. Clear user's localStorage: `localStorage.removeItem('ai-app-builder-storage')`
3. Revert to in-memory only behavior

---

## Success Criteria

- [ ] User completes wizard, refreshes page, data persists
- [ ] Design step shows app name from wizard
- [ ] Design step AI uses uiPreferences from wizard
- [ ] Build step receives both appConcept and layoutManifest
- [ ] Builder generates code reflecting user's design choices
- [ ] All existing tests pass
- [ ] No TypeScript errors
- [ ] No hydration warnings in console

---

## Consensus

This plan was verified by three independent AI analyses:

- **Claude:** Found persistence as root cause
- **Gemini:** Found component wiring gaps (partially correct)
- **Cline:** Independently verified all findings against source code

All three agree: **Persistence first, then wiring, skip Gap 3.**
