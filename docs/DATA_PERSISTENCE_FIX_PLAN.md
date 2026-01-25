# Fix Data Persistence on Refresh

**Status:** ✅ Implemented
**Created:** 2026-01-25
**Completed:** 2026-01-25

## Problem

Users lose work when refreshing the page during development. The app saves work to the database but forgets which app was active and doesn't persist critical working state.

## Root Cause

1. `current_app_id` is saved to localStorage but never read back on page load
2. Loading an app from library doesn't persist the ID (only creating does)
3. Phase execution state and implementation plans aren't persisted
4. Chat/code changes aren't auto-saved during development
5. Dashboard navigation uses wrong URL (`/app/builder` instead of `/app`)

---

## Implementation Summary

| #   | Feature                                      | Status      |
| --- | -------------------------------------------- | ----------- |
| 0   | Dashboard → Builder navigation               | ✅ Done     |
| 1   | Active app restoration (URL + localStorage)  | ✅ Done     |
| 2   | Auto-save chat & code (2000ms debounce)      | ✅ Done     |
| 3   | UI state persistence (tab, input, image)     | ✅ Done     |
| 4   | Schema: dynamicPhasePlan, implementationPlan | ✅ Done     |
| 5   | Wizard state persistence (PLAN mode)         | ✅ Done     |
| 4b  | Dynamic phase plan rehydration to store      | ⏸️ Deferred |

**Note:** Item 4b (automatic build resumption after refresh) was deferred as non-critical. The component data including phase plans is restored, but `useDynamicBuildPhases` hook would need explicit rehydration to auto-resume builds.

---

## Implementation Plan (Reference)

### 0. Fix Dashboard → Builder Navigation ✅

**Issue Discovered:** Dashboard uses `/app/builder?appId=xxx` but:

- No `/app/builder` route exists (builder is at `/app`)
- MainBuilderView doesn't read `appId` from URL params

**[MODIFY] src/components/dashboard/ProjectCard.tsx**

- Change navigation from `/app/builder?appId=xxx` to `/app?appId=xxx`

**[MODIFY] src/components/MainBuilderView.tsx**

- Add `useSearchParams` to read `appId` from URL on mount
- If `appId` param exists, load that component and set as `currentComponent`
- Also save to `localStorage` so refresh works

### 1. Fix Active App Restoration ✅

**[MODIFY] src/hooks/useAppCrud.ts**

- Update `loadComponent` to save `current_app_id` to localStorage when loading from library

**[MODIFY] src/components/MainBuilderView.tsx**

- Add useEffect that runs after apps load from DB
- Read `current_app_id` from localStorage
- Find matching component in loaded list
- **Handle stale data**: If no match found, `localStorage.removeItem('current_app_id')` and stay in "New App" view
- If found, set as `currentComponent`

### 2. Auto-Save Code & Chat (ACT Mode) ✅

**[MODIFY] src/components/MainBuilderView.tsx**

- Add debounced useEffect (2000ms) that triggers `saveComponentToDb` when:
  - `chatMessages` changes, OR
  - `currentComponent.code` changes
- This ensures both chat history and code edits are auto-saved

### 3. Persist UI State & Draft Input ✅

**[MODIFY] src/components/MainBuilderView.tsx**

- Add localStorage persistence for:
  - `userInput` (mid-draft text)
  - `activeTab` (current view tab)
  - `uploadedImage` (pending image)
- Restore these values on mount

### 4. Persist Phase Execution State ✅ (Schema only, rehydration deferred)

**[MODIFY] Database save logic (in useAppCrud or MainBuilderView)**

- When saving component to DB, include in metadata:
  - `stagePlan`
  - `dynamicPhasePlan`
  - `implementationPlan`

**[MODIFY] src/components/MainBuilderView.tsx**

- When loading active app, check for stored plans in DB metadata
- If found, restore to Zustand store
- Re-initialize `useDynamicBuildPhases` hook to resume build

### 5. Wizard Persistence (PLAN Mode) ✅

**[MODIFY] src/components/MainBuilderView.tsx**

- On mount: Load `wizard_draft_*` keys from localStorage
- If drafts exist and in PLAN mode, restore `wizardState` and `chatMessages`
- Add useEffect to auto-save wizard state when it changes

### 6. Undo/Redo Strategy ✅ (No changes needed)

**Approach**: Use DB `versions` array as undo history (already persisted)

- In-memory redo stack is lost on refresh (acceptable - standard behavior)
- Users can still undo via version history loaded from DB
- No additional persistence needed

---

## Files Modified

| File                                                           | Changes                                                                                                                         | Status |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ProjectCard.tsx](../src/components/dashboard/ProjectCard.tsx) | Fixed navigation URL `/app/builder` → `/app`                                                                                    | ✅     |
| [aiBuilderTypes.ts](../src/types/aiBuilderTypes.ts)            | Added `dynamicPhasePlan` and `implementationPlanSnapshot` fields                                                                | ✅     |
| [useAppCrud.ts](../src/hooks/useAppCrud.ts)                    | Added localStorage persistence + `setDynamicPhasePlan` restoration                                                              | ✅     |
| [useDatabaseSync.ts](../src/hooks/useDatabaseSync.ts)          | Added DB serialization for `dynamicPhasePlan` and `implementationPlan`                                                          | ✅     |
| [MainBuilderView.tsx](../src/components/MainBuilderView.tsx)   | URL param reading, app restoration, auto-save (incl. dynamicPhasePlan + implementationPlan), UI persistence, wizard persistence | ✅     |

### Schema Change ✅

Added to `GeneratedComponent`:

- `dynamicPhasePlan?: DynamicPhasePlan | null` - AI-generated phase structure
- `implementationPlan?: ImplementationPlanSnapshot | null` - Build strategy metadata for DB persistence

**Type Clarification**: `ImplementationPlanSnapshot` (in `aiBuilderTypes.ts`) is distinct from the runtime `ImplementationPlan` (in `appConcept.ts`). The snapshot is a lightweight metadata version for DB persistence, while the runtime version contains the full `AppConcept` and `BuildPhase` objects used during active builds.

**Mapper Function**: `toImplementationPlanSnapshot()` in `aiBuilderTypes.ts` converts the runtime plan to the snapshot format, extracting only `{ id, appName, approach, phases[name, description, complexity], technicalDecisions }`.

---

## Verification Checklist

### Dashboard Integration

- [ ] Click "Continue" on project from dashboard → builder loads correct project
- [ ] Refresh after navigating from dashboard → project still loaded
- [ ] Navigate to `/app?appId=xxx` directly → correct project loads

### ACT Mode

- [ ] Create new app, add chat messages, refresh → app still loaded, chat exists
- [ ] Load app from library, refresh → app still loaded
- [ ] Send message, wait 3s, refresh → message persisted
- [ ] Edit code, wait 3s, refresh → code changes saved
- [ ] Delete app in another tab, refresh → gracefully shows "New App" view

### PLAN Mode

- [ ] Type requirements in wizard, refresh → wizard state restored
- [ ] ~~Start multi-phase build, refresh mid-build → auto-resume~~ (Deferred - item 4b)

### UI State

- [ ] Switch to Code tab, refresh → still on Code tab
- [ ] Type partial message, refresh → text still in input field
- [ ] Upload image, refresh → image still attached

---

## Technical Notes

- **Debounce timing**: 2000ms balances save frequency vs. DB load
- **localStorage for UI state**: Simple, fast, appropriate for small data
- **Change detection**: Auto-save tracks `{chatLength, code}` to skip redundant saves
- **Stale ID cleanup**: If stored app ID doesn't exist, it's removed from localStorage
- **Version-based undo**: Pragmatic - avoids complex stack serialization

### Race Condition Prevention

The restoration effect in MainBuilderView uses strict guards:

```typescript
// Only restore when:
// 1. Components have finished loading (!loadingApps)
// 2. Components array is populated (components.length > 0)
// 3. No component is currently loaded (!currentComponent)
if (loadingApps || components.length === 0) return;
if (currentComponent) return;
```

This prevents:

- Restoring before the list is ready
- Overwriting a newly created app
- Double-loading from URL + localStorage

---

## Contributors

- **Claude (Opus 4.5)**: Root cause analysis, implementation, code audit
- **Gemini**: Persistence scope extension, race condition review, verification plan
