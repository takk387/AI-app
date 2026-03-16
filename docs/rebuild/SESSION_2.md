# Session 2: BuilderPage Shell + ModalManager

## Your Job

Build the outer shell (`BuilderPage.tsx`) and modal coordination (`ModalManager.tsx`). After this session, the page renders at `/app` with two empty panels and a working modal system.

## Read These Files First

1. `src/contexts/BuilderContext.tsx` — the provider you're wrapping (built in Session 1)
2. `src/components/modals/` — list the existing modal components. You'll reuse them, just update their container styling.

## BuilderPage.tsx (~200 lines)

```typescript
// src/components/builder/BuilderPage.tsx
'use client';

import { BuilderProvider } from '@/contexts/BuilderContext';
import { LeftPanel } from './LeftPanel';
import { PreviewPanel } from './PreviewPanel';
import { ConceptDrawer } from './ConceptDrawer';
import { ModalManager } from './ModalManager';

export default function BuilderPage() {
  return (
    <BuilderProvider>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40% 60%',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <LeftPanel />
        <PreviewPanel />
      </div>
      <ConceptDrawer />
      <ModalManager />
    </BuilderProvider>
  );
}
```

That's the whole shell. CSS grid, fixed 40/60, full viewport height. No resize library.

## ModalManager.tsx (~100 lines)

Reads `activeModal` and `closeModal` from `useBuilder()`. Renders the appropriate modal.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function ModalManager() {
  const { activeModal, closeModal } = useBuilder();

  if (!activeModal) return null;

  // Overlay
  return (
    <div
      onClick={closeModal}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div onClick={e => e.stopPropagation()}>
        {activeModal === 'phaseDetail' && <PhaseDetailModal />}
        {activeModal === 'export' && <ExportModal />}
        {activeModal === 'versionHistory' && <VersionHistoryModal />}
        {activeModal === 'diffPreview' && <DiffPreviewModal />}
        {activeModal === 'nameApp' && <NameAppModal />}
        {activeModal === 'share' && <ShareModal />}
        {activeModal === 'createBranch' && <CreateBranchModal />}
      </div>
    </div>
  );
}
```

For each existing modal component you import:

- Update its outermost container to use CSS variable theming (replace `bg-slate-900` → `var(--bg-primary)`, etc.)
- If the modal has its own close logic, wire it to call `closeModal()` from `useBuilder()`

## Theme Reminder

All colors from CSS variables. Tailwind for layout only.

| Instead of        | Use                                              |
| ----------------- | ------------------------------------------------ |
| `bg-slate-900`    | `style={{ background: 'var(--bg-primary)' }}`    |
| `text-white`      | `style={{ color: 'var(--text-primary)' }}`       |
| `border-white/10` | `style={{ borderColor: 'var(--border-color)' }}` |

## Verify

1. The page renders at `/app` (you may need to temporarily update the route — or just test by importing BuilderPage in a test route)
2. Two panels visible, 40/60 split
3. Programmatically trigger `openModal('export')` → modal appears with overlay
4. Click overlay → modal closes
5. `npm run typecheck && npm run lint`

## Do NOT

- Build the contents of LeftPanel or PreviewPanel (those are Sessions 3 and 5)
- Modify the route at `/app/page.tsx` yet (that's Session 7)
- Modify existing modal component logic — only update their container styling
