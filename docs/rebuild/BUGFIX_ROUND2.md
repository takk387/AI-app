# Bugfix Round 2 — Post-Rebuild Issues 5-8

> **Read this ENTIRE file before touching any code.**
> Follow the Masterchain Debugging Workflow from CLAUDE.md: Diagnose → Approve → Fix → Verify.

## Context

The Builder page rebuild (9 sessions) is merged to main and deployed. Round 1 bugfixes (stale data, phase exec, Sandpack crash, scroll overflow) are verified working. This round addresses 3 real bugs found during live testing. Issue 8 (Review page empty data) is expected behavior — NOT a bug.

## Issue 5: App Name Doesn't Propagate After "Skip to Builder"

### Symptom

User creates "StreakUp" in Wizard → clicks "Skip to Builder" → Builder shows "Untitled App" in PanelHeader and "Untitled Project" in AppNavigation.

### Root Cause

`PanelHeader.tsx` reads `appConcept` from `useBuilder()` (line 7), which gets it from the Zustand store (BuilderContext line 281). The Wizard's `handleComplete()` in `wizard/page.tsx` calls `setAppConcept(concept)` which saves to the store. However, "Skip to Builder" in `AppNavigation.tsx` (lines 197-201) does NOT navigate through `handleComplete()` — it just clears builder state and pushes `/app`. So `appConcept` from the Wizard conversation IS in the store, but the Wizard only calls `setAppConcept()` inside `handleComplete()`, which fires when the user clicks "Continue to Design". If the user clicks "Skip to Builder" instead, `handleComplete` never fires, so `appConcept` is never saved to the store from the conversation.

Additionally, `AppNavigation.tsx` does NOT read or forward `appConcept` — it only clears `currentComponent`, `layoutBuilderFiles`, and `components`.

### Files to Modify

**File 1: `src/components/AppNavigation.tsx` (lines 197-201)**

BEFORE:

```tsx
onClick={() => {
  useAppStore.getState().setCurrentComponent(null);
  useAppStore.getState().setLayoutBuilderFiles(null);
  useAppStore.getState().setComponents([]);
  router.push('/app');
}}
```

AFTER:

```tsx
onClick={() => {
  useAppStore.getState().setCurrentComponent(null);
  useAppStore.getState().setLayoutBuilderFiles(null);
  useAppStore.getState().setComponents([]);
  // appConcept is intentionally NOT cleared — it carries the Wizard's concept forward
  router.push('/app');
}}
```

This part is already correct. The real fix is in how the Wizard saves the concept.

**File 2: `src/components/NaturalConversationWizard.tsx`** — The Wizard component that builds the app concept through conversation. It maintains the concept in local state and only pushes it to the Zustand store when `onComplete` is called. The problem is that "Skip to Builder" bypasses `onComplete`.

The fix: The Wizard should sync its current concept to the Zustand store as it builds it, not just on completion. Find where the concept state is updated during conversation (look for where `concept` or `appConcept` local state is set after each AI response) and add a store sync:

```tsx
// After each concept update in the wizard's conversation flow:
useAppStore.getState().setAppConcept(updatedConcept);
```

**OR (simpler alternative):** Use an effect in the Wizard to sync concept to store whenever it changes:

```tsx
useEffect(() => {
  if (concept && concept.name) {
    useAppStore.getState().setAppConcept(concept);
  }
}, [concept]);
```

Search the Wizard component for where the concept is built up during the conversation to find the right variable name. It might be called `conceptState`, `appConcept`, or similar.

### Verification

1. Create an app concept in Wizard (ensure AI returns a name)
2. Click "Skip to Builder" (NOT "Continue to Design")
3. PanelHeader should show the app name, not "Untitled App"
4. AppNavigation should show the app name, not "Untitled Project"

---

## Issue 6: First Build Request Silently Produces No Response

### Symptom

User sends "Build a habit tracker app..." → sees "Generating..." → animation completes → NO assistant message appears in chat, no code generated. Second request works fine.

### Root Cause

In `BuilderContext.tsx` line 605-651, the BUILD intent calls `streaming.generate()`. If this returns `null` (timeout, SSE failure, no `complete` event), the entire `if (result)` block (line 612) is skipped — including the assistant chat message at line 640. The `finally` block clears `isGenerating`, so the UI recovers, but the user gets zero feedback.

This is a **missing null-result handler**. When `streaming.generate()` returns null, no message is added to chat.

### Files to Modify

**File: `src/contexts/BuilderContext.tsx` (around line 651)**

Find this block (the closing of the BUILD intent's non-phase-reference branch):

BEFORE (lines ~640-652):

```tsx
                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content: result.description
                      ? String(result.description)
                      : `App ${comp ? 'updated' : 'created'}.`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }
            break;
```

AFTER — add an `else` branch after the `if (result)` block:

```tsx
                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content: result.description
                      ? String(result.description)
                      : `App ${comp ? 'updated' : 'created'}.`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else {
                // streaming.generate() returned null — timeout, SSE failure, or empty response
                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content: 'Generation failed — the AI didn\'t return a response. Please try again.',
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }
            break;
```

The `else` goes after the closing `}` of `if (result)` (line 651) and before the closing `}` of the outer else block.

### Verification

1. Navigate to Builder with a fresh state (clear localStorage)
2. Send a build request
3. If AI fails/times out, user should see "Generation failed" message instead of silence
4. If AI succeeds, behavior should be unchanged
5. Second message should still work as before

---

## Issue 7: Sandpack Preview Shows "Hello world" Instead of Actual App

### Symptom

After code generates successfully, the Preview tab shows "Hello world" text instead of the actual counter app UI. Code tab shows the correct generated files (ErrorBoundary.tsx, App.tsx).

### Root Cause

The `toSandpackFiles()` function in `PreviewPanel.tsx` (lines 68-108) converts generated files for Sandpack. When it creates the entry file (`/index.tsx`), it uses `DEFAULT_ENTRY_CODE` (lines 26-37) which imports `./App`. However:

1. `DEFAULT_ENTRY_CODE` does `import App from './App'` — it expects `/App.tsx` at the root
2. Generated files come as `/src/components/App.tsx` or `/src/App.tsx`
3. `toSandpackFiles()` strips the `/src/` prefix (line 74-76), so `/src/App.tsx` → `/App.tsx` ✓
4. But `/src/components/App.tsx` → `/components/App.tsx` — the entry code imports `./App` which doesn't resolve to `/components/App.tsx`

Additionally, when using Sandpack's `react-ts` template, Sandpack provides its OWN default `App.tsx` that renders "Hello world". If the generated `/App.tsx` isn't provided (because it's at `/components/App.tsx`), Sandpack's template App takes over.

### Files to Modify

**File: `src/components/builder/PreviewPanel.tsx`**

Fix the `toSandpackFiles()` function to ensure `/App.tsx` exists in the file map. After stripping the `/src/` prefix and building the result map, check if `/App.tsx` is present. If not, look for it at common paths and alias it:

BEFORE (after the for loop, around line 86):

```tsx
if (!hasEntryFile) {
  result['/index.tsx'] = { code: DEFAULT_ENTRY_CODE };
}
```

AFTER:

```tsx
if (!hasEntryFile) {
  result['/index.tsx'] = { code: DEFAULT_ENTRY_CODE };
}

// Ensure /App.tsx exists — Sandpack's react-ts template provides a default "Hello world"
// App if we don't override it. Check common paths where the app component might live.
if (!result['/App.tsx'] && !result['/App.ts'] && !result['/App.jsx']) {
  // Look for App component at common generated paths
  const appPaths = ['/components/App.tsx', '/components/App.jsx', '/components/app.tsx'];
  for (const p of appPaths) {
    if (result[p]) {
      result['/App.tsx'] = result[p];
      break;
    }
  }

  // If still no App.tsx found, check if ANY file exports a default component we can use
  // as the main app. Look for the largest .tsx file that isn't index or ErrorBoundary.
  if (!result['/App.tsx']) {
    const candidates = Object.entries(result)
      .filter(
        ([path]) =>
          path.endsWith('.tsx') &&
          !path.includes('index') &&
          !path.includes('ErrorBoundary') &&
          !path.includes('preflight')
      )
      .sort((a, b) => b[1].code.length - a[1].code.length);

    if (candidates.length > 0) {
      const [bestPath, bestFile] = candidates[0];
      // Create an App.tsx that re-exports the best candidate
      const componentName =
        bestPath
          .split('/')
          .pop()
          ?.replace(/\.(tsx|jsx|ts|js)$/, '') || 'App';
      result['/App.tsx'] = {
        code: `export { default } from '${bestPath.replace(/\.(tsx|jsx|ts|js)$/, '')}';`,
      };
    }
  }
}
```

### Verification

1. In Builder, send "Build a simple counter app with increment and reset buttons"
2. Wait for generation to complete
3. Switch to Preview tab — should render the actual counter app UI, NOT "Hello world"
4. Switch to Code tab — verify files are correct
5. Try another build — verify preview updates correctly

---

## Issue 8: Review Page Shows Empty Concept Data — NOT A BUG

The Review page at `/app/review` reads `appConcept` from `useAppStore`. When the user skips straight from Wizard to Builder without going through Design → AI Plan → Review, the Review page correctly shows empty/default data. This is expected workflow behavior.

Once Issue 5 is fixed (Wizard syncs concept to store during conversation), the Review page will also benefit — it will show the concept data even if the user navigates directly to Review.

**No fix needed for this issue.**

---

## Execution Order

1. **Issue 5 first** — fixes concept propagation, which benefits both Builder and Review
2. **Issue 7 second** — fixes Sandpack preview rendering
3. **Issue 6 third** — adds null-result feedback in chat

## Files Modified (Summary)

| File                                           | Issue | Change                                                          |
| ---------------------------------------------- | ----- | --------------------------------------------------------------- |
| `src/components/NaturalConversationWizard.tsx` | 5     | Sync concept to store during conversation (useEffect or inline) |
| `src/contexts/BuilderContext.tsx`              | 6     | Add else branch for null result in BUILD intent (~line 651)     |
| `src/components/builder/PreviewPanel.tsx`      | 7     | Ensure /App.tsx exists in toSandpackFiles() (~line 86)          |

## Do NOT

- Touch `AppNavigation.tsx` "Skip to Builder" handler — it's correct as-is
- Touch `useAppStore.ts` — no store changes needed
- Touch `PanelHeader.tsx` — it reads from context correctly
- Modify any other files besides the 3 listed above
- Add new dependencies
- Change the Sandpack template from `react-ts`
- Refactor or reorganize existing code

## After Fixing

```bash
npm run typecheck
npm run lint
npm run build
```

All three must pass. Then push to main and verify on the live deployment.
