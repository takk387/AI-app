# Session 7: Integration + Route Swap

## Your Job

Wire everything together. Swap the route so `/app` renders the new `BuilderPage` instead of the old `MainBuilderView`. Run integration tests and fix what's broken.

## Read These Files First

1. `src/app/(protected)/app/page.tsx` — the current route file. You're changing its import.
2. `src/contexts/BuilderContext.tsx` — verify the provider is working
3. `src/components/builder/BuilderPage.tsx` — the new shell
4. Skim each component in `src/components/builder/` to understand what's built

## Step 1: Swap the Route

In `src/app/(protected)/app/page.tsx`:

```typescript
// OLD:
import MainBuilderView from '@/components/MainBuilderView';

// NEW:
import BuilderPage from '@/components/builder/BuilderPage';
```

Update the render to use `<BuilderPage />` instead of `<MainBuilderView />`.

**Do NOT delete `MainBuilderView.tsx`.** Keep it in the codebase as a reference. It can be deleted in a future cleanup session.

## Step 2: Verify Core Flows

Start the dev server (`npm run dev`) and test each flow manually:

### Chat: Question

1. Type "What tech stack are we using?"
2. Expected: AI answers using project context (names the actual tech stack)
3. If it hallucinates or ignores the question: check `assembleContext` in BuilderContext

### Chat: Build Phase

1. Type "build phase 1" (or click Start in PhaseStatusBar)
2. Expected: Phase execution triggers, layout injected, preview updates, PhaseCompletionCard appears
3. If nothing happens: check `detectIntent` → `isPhaseReference` → `executePhase` chain

### Chat: Modify

1. After a phase builds, type "add a dark mode toggle to the navbar"
2. Expected: DiffPreviewModal opens showing the proposed changes
3. If it generates a full app instead: check that MODIFY intent routes to `/api/ai-builder/modify`, not `full-app-stream`

### Chat: Concept Update

1. Type "add a messaging feature"
2. Expected: appConcept updates in store, ConceptDrawer reflects the new feature
3. If nothing happens: check `detectIntent` catches CONCEPT and `handleConceptUpdate` works

### Toolbar

1. Click each button: undo, redo, download, export, deploy
2. Expected: each produces visible feedback (toast, modal, or action)
3. If silent: check the button's onClick calls the right `useBuilder()` method

### ConceptDrawer

1. Click ☰ → drawer opens
2. Edit the app name → blur → verify store updated
3. Click a phase → PhaseDetailModal opens
4. Click backdrop → drawer closes

### Theme

1. Toggle theme to light mode
2. Expected: all Builder components use light theme colors
3. If any component stays dark: find the hardcoded Tailwind color class and replace with CSS variable

## Step 3: Fix Issues

For each issue found:

1. Identify which component or provider method is broken
2. Fix it in the relevant file
3. Re-test that specific flow
4. Make sure the fix doesn't break other flows

Common issues to expect:

- **Messages not appearing:** Check that `addMessage` in BuilderContext actually updates the store/state
- **Preview not updating:** Check that `currentComponent` updates when code is generated
- **Phases not executing:** Check that `executePhase` calls through to `useDynamicBuildPhases`
- **Modals not opening:** Check that `openModal` sets `activeModal` state and ModalManager reads it
- **Toast not showing:** Make sure a toast library is available (check if `react-hot-toast` or `sonner` is installed)

## Step 4: Delete Resizable Panel Components

Now that `MainBuilderView` is no longer the active route, the resizable panel components are dead:

```
src/components/ResizablePanelGroup.tsx
src/components/ResizablePanel.tsx
src/components/ResizableHandle.tsx
```

Verify nothing else imports them:

```bash
grep -r "ResizablePanel\|ResizableHandle\|ResizablePanelGroup" src --include="*.ts" --include="*.tsx" -l
```

If only `MainBuilderView.tsx` imports them, they're safe to leave (since MainBuilderView is now unused). Or delete them now.

## Verify

```bash
npm run typecheck
npm run lint
npm test
```

Also manually verify other pages are unaffected:

- `/app/wizard` — still works
- `/app/design` — still works
- `/app/ai-plan` — still works
- `/app/review` — still works
- `/app/dashboard` — still works

## Do NOT

- Delete `MainBuilderView.tsx` (keep as reference)
- Modify existing API routes
- Modify existing services
- Change the behavior of any hook — only fix wiring issues between components and the provider
