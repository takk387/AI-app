# Bugfix: Post-Rebuild Issues

## Context

The Builder page rebuild (Sessions 0-8) is complete. Live testing found 4 bugs — 3 in wiring between existing systems and new components, 1 CSS layout bug.

## Read These Files First

1. `src/store/useAppStore.ts` — lines 402-425 (`PERSISTED_FIELDS` array) and the store slices
2. `src/contexts/BuilderContext.tsx` — lines 154-183 (`detectIntent`, `isPhaseReference`, `extractPhaseNumber`) and lines 555-631 (`sendMessage` switch)
3. `src/components/builder/PreviewPanel.tsx` — lines 26-65 (`DEFAULT_ENTRY_CODE`, `toSandpackFiles`)
4. `src/components/layout-builder/LayoutCanvas.tsx` — search for `preflight-undo` and `DEFAULT_ENTRY_CODE`
5. `src/components/AppNavigation.tsx` — lines 194-201 ("Skip to Builder" button)
6. `src/app/(protected)/app/wizard/page.tsx` — lines 21-39 (`handleComplete`)
7. `src/hooks/usePhaseExecution.ts` — search for `tryStartPhase1` and `hasInjectedCode`
8. `src/components/builder/LeftPanel.tsx` — the flex column container
9. `src/components/builder/MessageList.tsx` — lines 145-152 (the `flex: 1` overflow container)

## Bug 1: Stale Data When Using "Skip to Builder"

**Symptom:** User creates new app "StreakUp" in wizard, clicks "Skip to Builder", but Builder shows old app "TestChef" — old name, old layout files, old concept.

**Root Cause Chain:**

1. Wizard's `handleComplete()` (wizard/page.tsx line 32-34) clears `dynamicPhasePlan`, `dualArchitectureResult`, `cachedIntelligence` — but does NOT clear `currentComponent`, `layoutBuilderFiles`, or `components`
2. "Skip to Builder" button (AppNavigation.tsx line 197) just calls `router.push('/app')` — no state clearing at all
3. Zustand persists `currentComponent` and `layoutBuilderFiles` to localStorage (useAppStore.ts lines 410-420)
4. When Builder mounts, Zustand hydrates stale data from localStorage
5. Phase 1 injection guard in `usePhaseExecution.ts` (`tryStartPhase1`) checks if `currentComponent.code` exists and is non-empty — stale code passes this check, so injection is SKIPPED

**Fix — two changes:**

**Change A:** In `src/app/(protected)/app/wizard/page.tsx`, add clears for builder state inside `handleComplete()` after line 34:

```typescript
// Also clear builder state so stale data doesn't persist
setCurrentComponent(null); // ← add store action import
setLayoutBuilderFiles(null); // ← add store action import
setComponents([]); // ← add store action import
```

You'll need to import these 3 setters from `useAppStore` at the top of the callback, same pattern as the existing ones.

**Change B:** In `src/components/AppNavigation.tsx`, the "Skip to Builder" button (line 197) should clear stale builder state before navigating. Add an onClick handler that clears `currentComponent`, `layoutBuilderFiles`, and `components` before calling `router.push('/app')`.

Import `useAppStore` and pull the setters. The button becomes:

```typescript
onClick={() => {
  useAppStore.getState().setCurrentComponent(null);
  useAppStore.getState().setLayoutBuilderFiles(null);
  useAppStore.getState().setComponents([]);
  router.push('/app');
}}
```

## Bug 2: "build phase 2" Doesn't Execute Phase

**Symptom:** User types "build phase 2" in chat. Intent detects BUILD correctly (regex on line 158 matches). But phase doesn't execute — AI responds with a QUESTION-style answer instead.

**Root Cause:** In BuilderContext.tsx line 579-581:

```typescript
if (isPhaseReference(text)) {
  dynamicPhases.startPhase(extractPhaseNumber(text));
}
```

`dynamicPhases.startPhase()` is called, but then the BUILD case `break`s (line 631) with no chat response added. The user sees no feedback. Meanwhile, `startPhase()` may silently fail if the phase engine isn't in the right state (no `isBuilding` flag set, or the phase plan is incomplete from skipping Review).

But also: when I tested, the AI DID respond with a conversational answer about the code. This means the intent likely fell through to QUESTION (line 173 `return 'QUESTION'`) — meaning the regex on line 158 did NOT match.

**Investigation needed:** Add a `console.log('detectIntent:', intent, text)` temporarily in `sendMessage()` after line 571 to confirm which intent is being returned. Then:

- If intent is BUILD but phase doesn't execute: the issue is in `dynamicPhases.startPhase()` — check that the phase plan exists and the engine is initialized
- If intent is QUESTION: the regex isn't matching — check for whitespace issues, encoding, or the regex itself

**Likely fix:** The regex `/build phase \d/i` only matches a single digit. While "build phase 2" should match, ensure there are no hidden character issues. Also add a chat response in the BUILD+phaseReference case so the user gets feedback:

After line 581, add:

```typescript
setChatMessages((prev) => [
  ...prev,
  {
    id: generateId(),
    role: 'assistant' as const,
    content: `Starting Phase ${extractPhaseNumber(text)}...`,
    timestamp: new Date().toISOString(),
  },
]);
```

Also verify that `dynamicPhases` (from `useDynamicBuildPhases`) is properly initialized. If phases aren't loaded (because Review was skipped), `startPhase()` may no-op silently. Add a guard:

```typescript
if (isPhaseReference(text)) {
  const phaseNum = extractPhaseNumber(text);
  if (dynamicPhases.phases.length === 0) {
    // No phases loaded — tell the user
    setChatMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant' as const,
        content:
          'No build phases available. Go through the Review step first, or click Start in the phase bar.',
        timestamp: new Date().toISOString(),
      },
    ]);
  } else {
    dynamicPhases.startPhase(phaseNum);
    setChatMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant' as const,
        content: `Starting Phase ${phaseNum}...`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }
}
```

## Bug 3: Sandpack Preview Error — "preflight-undo" Not Found

**Symptom:** Preview tab shows "Something went wrong: Could not find module './preflight-undo' relative to '/index.tsx'"

**Root Cause:** Two different entry code generators exist:

- `LayoutCanvas.tsx` creates `index.tsx` that imports `./preflight-undo` and `./inspector` (support files for the Design page's Sandpack)
- `PreviewPanel.tsx` has its own `DEFAULT_ENTRY_CODE` (lines 26-37) that does NOT import those files

When Phase 1 injects layout files from the Design step, the `index.tsx` file was generated by LayoutCanvas and contains `import './preflight-undo'`. But `toSandpackFiles()` in PreviewPanel only processes the files in the array — if `preflight-undo.ts` isn't in the injected files, Sandpack can't resolve it.

**Fix:** In `src/components/builder/PreviewPanel.tsx`, update `toSandpackFiles()` to handle this. After the file conversion loop (after line 58), add:

```typescript
// If the entry file imports preflight-undo but it's not in the files, stub it out
if (result['/index.tsx'] || result['/index.ts']) {
  const entryCode = (result['/index.tsx'] || result['/index.ts'])!.code;
  if (
    entryCode.includes('preflight-undo') &&
    !result['/preflight-undo.ts'] &&
    !result['/preflight-undo.js']
  ) {
    // Replace LayoutCanvas entry with clean entry that doesn't need support files
    const entryPath = result['/index.tsx'] ? '/index.tsx' : '/index.ts';
    result[entryPath] = { code: DEFAULT_ENTRY_CODE };
  }
  // Also handle inspector import
  if (entryCode.includes('./inspector') && !result['/inspector.ts'] && !result['/inspector.js']) {
    const entryPath = result['/index.tsx'] ? '/index.tsx' : '/index.ts';
    result[entryPath] = { code: DEFAULT_ENTRY_CODE };
  }
}
```

This replaces the LayoutCanvas-generated entry file with the clean `DEFAULT_ENTRY_CODE` when the support files aren't available. The actual App component code is in `App.tsx`, not `index.tsx`, so nothing is lost.

## Bug 4: Chat MessageList Overflows — No Scroll

**Symptom:** When chat messages fill the left panel, the content runs off the bottom of the page. No scrollbar appears. The InputBar gets pushed off-screen.

**Root Cause:** Classic flexbox overflow bug. LeftPanel is `display: flex; flex-direction: column; height: 100%`. MessageList is `flex: 1; overflowY: auto`. But `overflowY: auto` only activates when the element has a constrained height. In a flex column, the default `min-height` on flex items is `auto` (content-sized), which means the MessageList grows to fit ALL its content instead of being constrained to the remaining space.

**Fix:** Two changes needed:

**Change A:** In `src/components/builder/LeftPanel.tsx`, add `minHeight: 0` to the LeftPanel container and `overflow: 'hidden'` to force the flex column to constrain its children:

```typescript
<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,              // ← ADD: allows flex children to shrink below content size
    borderRight: '1px solid var(--border-color)',
    background: 'var(--bg-primary)',
  }}
>
```

**Change B:** In `src/components/builder/MessageList.tsx`, add `minHeight: 0` to the MessageList wrapper so it can shrink within the flex container:

```typescript
<div
  style={{
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    minHeight: 0,              // ← ADD: allows this flex child to shrink and show scrollbar
  }}
>
```

Both changes are needed. `minHeight: 0` on the parent allows the column to constrain, and `minHeight: 0` on MessageList allows it to shrink below its content height so `overflowY: auto` activates.

## Verify

After all 4 fixes:

1. `npm run typecheck && npm run lint`
2. Test the SKIP path: Wizard → create concept → Skip to Builder → verify NEW app name shows, no stale data
3. Test the FULL path: Wizard → Design → AI Plan → Review → Builder → verify Phase 1 injects, preview works
4. Test "build phase 2" in chat → verify phase executes (or gives helpful error if no phases)
5. Test Preview tab → verify no preflight-undo error
6. Send 10+ chat messages → verify MessageList scrolls, InputBar stays fixed at bottom
7. Test that other pages still work: /app/wizard, /app/design, /app/review, /app/dashboard

## Do NOT

- Modify LayoutCanvas.tsx (that's the Design page — leave it alone)
- Change the PERSISTED_FIELDS array in useAppStore
- Modify any API routes or services
- Add new dependencies
