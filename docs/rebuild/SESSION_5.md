# Session 5: PreviewPanel + Toolbar

## Your Job

Build the right side of the Builder page: `PreviewPanel.tsx` and `PreviewToolbar.tsx`. This shows the live app preview (Sandpack + Nodebox) and a code editor view, with a toolbar for actions.

## Read These Files First

1. `src/contexts/BuilderContext.tsx` — all data from `useBuilder()`
2. `src/components/FullAppPreview.tsx` — the existing Sandpack preview component. You'll reuse or adapt this.
3. `src/components/layout-builder/LayoutCanvas.tsx` — see how the Design page configures Sandpack. Follow similar patterns.
4. Check what Sandpack packages are installed: `grep "sandpack" package.json`

## PreviewToolbar.tsx

Top bar with tabs and action buttons.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function PreviewToolbar() {
  const {
    activeTab, setActiveTab,
    canUndo, canRedo, undo, redo,
    exportApp, downloadCode, deployApp, openModal,
  } = useBuilder();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
          Preview
        </TabButton>
        <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')}>
          Code
        </TabButton>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={undo} disabled={!canUndo} title="Undo">↩</button>
        <button onClick={redo} disabled={!canRedo} title="Redo">↪</button>
        <button onClick={downloadCode} title="Download">⬇</button>
        <button onClick={() => openModal('export')} title="Export">Export</button>
        <button onClick={deployApp} title="Deploy">🚀</button>
      </div>
    </div>
  );
}
```

Every button: toast feedback on click. Disabled state when not applicable.

## PreviewPanel.tsx

Contains the toolbar and the content area (preview or code based on active tab).

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function PreviewPanel() {
  const { activeTab, currentComponent, consoleErrors } = useBuilder();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
    }}>
      <PreviewToolbar />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'preview' ? (
          <LivePreview component={currentComponent} />
        ) : (
          <CodeView component={currentComponent} />
        )}
      </div>
    </div>
  );
}
```

### LivePreview

Wraps Sandpack with Nodebox runtime. Configure SandpackProvider with:

- Template: `"react-ts"` or `"nextjs"` depending on project
- Files from `currentComponent` (map the files array to Sandpack's format)
- Dependencies from the generated code
- Nodebox runtime enabled for server-side preview

Pipe console output to BuilderProvider's `consoleErrors` if possible (Sandpack provides console access via `useSandpackConsole` hook).

### CodeView

Replace the old raw JSON dump with a file tree + code viewer:

- Left: file tree listing all generated files
- Right: syntax-highlighted code for the selected file
- Use a simple `<pre>` with syntax highlighting (or Monaco if already installed, but don't install new deps)

## Verify

1. PreviewPanel renders in the right grid column
2. Preview tab shows Sandpack with the generated app
3. Code tab shows file tree + code viewer
4. Tab switching works
5. Undo/redo buttons reflect `canUndo`/`canRedo` state
6. Download triggers a zip download (or toast if not wired yet)
7. Export opens the export modal
8. `npm run typecheck && npm run lint`

## Do NOT

- Install new dependencies without checking if they're already in package.json
- Modify BuilderContext
- Modify existing Sandpack configuration in other components (Design page, etc.)
- Use hardcoded Tailwind color classes
