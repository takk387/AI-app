# Session 8: Polish + Verification

## Your Job

Final pass. Run all checks, visual test both themes, verify no regressions, update documentation.

## Checklist

### 1. Type Check

```bash
npm run typecheck
```

Fix any TypeScript errors. Focus on:

- Missing types in BuilderContext
- Incorrect prop types in components
- Unused imports

### 2. Lint

```bash
npm run lint
npm run lint:fix  # auto-fix what's possible
```

### 3. Tests

```bash
npm test
```

If tests fail, check if they reference old components (MainBuilderView, ChatPanel, AppConceptPanel). Update test imports to new components, or skip tests that test deleted components.

### 4. Visual Test: Dark Mode

Navigate to `/app`. Verify every component:

- [ ] PanelHeader: background and text use CSS variables
- [ ] PhaseStatusBar: progress bar, text, buttons all themed
- [ ] MessageList: message bubbles, text, background themed
- [ ] InputBar: input field, buttons, border themed
- [ ] PreviewToolbar: tabs, buttons themed
- [ ] PreviewPanel: background themed
- [ ] ConceptDrawer: all fields, sections, phase list themed
- [ ] All modals: container background, text, borders themed
- [ ] No hardcoded `bg-slate-*`, `text-white`, `border-white/*` anywhere

### 5. Visual Test: Light Mode

Toggle to light mode. Same checks as above. Look for:

- [ ] Components that stay dark (hardcoded dark classes)
- [ ] Text that becomes invisible (dark text on dark bg or light on light)
- [ ] Borders that disappear

### 6. Functional Test

- [ ] Send a question → get context-aware answer
- [ ] Type "build phase 1" → phase executes → preview updates
- [ ] Type a modification → diff preview appears → approve → code updates
- [ ] Open ConceptDrawer → edit name → close → name persists
- [ ] Undo → change reverts
- [ ] Redo → change reapplies
- [ ] Download → zip downloads
- [ ] Export modal → opens with file count
- [ ] Keyboard shortcuts: Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y (redo)

### 7. Regression Test

Navigate to each other page and verify it still works:

- [ ] `/app/wizard` — conversation works, concept builds
- [ ] `/app/design` — layout builder loads, Sandpack preview works
- [ ] `/app/ai-plan` — dual AI pipeline runs
- [ ] `/app/review` — all review cards display
- [ ] `/app/dashboard` — projects list loads

### 8. Performance

Open React DevTools Profiler. Navigate the Builder page:

- [ ] No infinite re-render loops
- [ ] MessageList doesn't re-render all messages on every keystroke
- [ ] PreviewPanel doesn't re-render when chat messages update
- [ ] ConceptDrawer doesn't cause layout shifts when opening

If re-render issues found: check that `useBuilder()` consumers are only destructuring the fields they need, and that BuilderContext memoizes values appropriately.

### 9. Update MASTER_CONTEXT_VERIFIED.md

Update these sections:

- **File counts:** New TypeScript files added, old files deleted
- **Critical Files:** Add `src/contexts/BuilderContext.tsx` (high dependency count)
- **Dependency Hierarchy:** Update to reflect BuilderContext as a new high-dependency file
- **Remove:** References to `MainBuilderView` as the primary orchestrator (it's now `BuilderContext` + `BuilderPage`)

Run verification commands:

```bash
find src -name "*.ts" -o -name "*.tsx" | wc -l
find src/app/api -name "route.ts" | wc -l
find src/hooks -name "*.ts" ! -name "*.test.ts" ! -name "index.ts" | wc -l
```

### 10. Final Commit

Stage all changes and commit with a descriptive message covering the full rebuild.

## Do NOT

- Add new features (that's future sessions 9-15)
- Refactor services or hooks (UI rebuild only)
- Delete `MainBuilderView.tsx` yet (keep as reference for one more sprint)
