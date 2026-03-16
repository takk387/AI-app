# Session 0: Cleanup & Prep

## Your Job

Delete dead code and create empty placeholder files for the new Builder components.

## Delete These Files

```
src/agents/                      ← entire directory (1,320 lines, zero imports)
src/hooks/useBrowserSupport.ts   ← unused hook (106 lines)
src/hooks/useSmartContext.ts     ← dead code, never used (399 lines)
src/services/BrowserPreviewService.ts  ← replaced by Sandpack + Nodebox
src/components/preview/BrowserPreview.tsx  ← replaced by Sandpack + Nodebox
```

Before deleting each one, verify zero imports:

```bash
grep -r "useBrowserSupport\|useSmartContext\|BrowserPreviewService\|BrowserPreview" src --include="*.ts" --include="*.tsx" -l
```

If anything outside the file itself imports it, do NOT delete — flag it instead.

## Create These Empty Files

```
src/components/builder/BuilderPage.tsx
src/components/builder/LeftPanel.tsx
src/components/builder/PanelHeader.tsx
src/components/builder/MessageList.tsx
src/components/builder/InputBar.tsx
src/components/builder/PhaseStatusBar.tsx
src/components/builder/PreviewPanel.tsx
src/components/builder/PreviewToolbar.tsx
src/components/builder/ConceptDrawer.tsx
src/components/builder/ModalManager.tsx
src/components/builder/index.ts
src/contexts/BuilderContext.tsx
```

Each file should export a placeholder:

```typescript
export function ComponentName() {
  return <div>ComponentName — placeholder</div>;
}
```

## Update globals.css

Add these semantic variable aliases inside the existing `:root` block:

```css
/* Alias semantic vars to theme vars */
--background: var(--bg-primary);
--surface: var(--bg-secondary);
--primary: var(--accent-primary);
--secondary: var(--accent-secondary);
--accent: var(--accent-primary);
--textMuted: var(--text-muted);
--border: var(--border-color);
```

## Verify

```bash
npm run typecheck
npm run lint
```

The app should still work — `MainBuilderView.tsx` is untouched and still renders at `/app`.

## Do NOT

- Modify `MainBuilderView.tsx`
- Modify any existing services or types
- Delete `useCodeReview.ts` (we're keeping that for later)
- Delete any resizable panel components yet (MainBuilderView still imports them)
