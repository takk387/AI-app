# Session 6: ConceptDrawer

## Your Job

Build `src/components/builder/ConceptDrawer.tsx` — a slide-out drawer that shows the app concept, features, tech stack, and phase plan. Triggered by the ☰ button in PanelHeader.

## Read These Files First

1. `src/contexts/BuilderContext.tsx` — `useBuilder()` for data
2. `src/components/AppConceptPanel.tsx` — the OLD concept panel you're replacing. See what fields it displays, but build fresh with better layout.
3. `src/types/appConcept.ts` — understand the AppConcept shape

## ConceptDrawer.tsx (~250 lines)

Slides in from the left as an overlay. Doesn't push the layout — floats on top with a backdrop.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function ConceptDrawer() {
  const {
    isConceptDrawerOpen,
    toggleConceptDrawer,
    appConcept,
    updateConcept,
    phases,
    openModal,
  } = useBuilder();

  if (!isConceptDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={toggleConceptDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '360px',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        zIndex: 41,
        overflowY: 'auto',
        padding: '24px',
        animation: 'slideIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>
            App Concept
          </h2>
          <button onClick={toggleConceptDrawer}>✕</button>
        </div>

        {/* Editable Fields */}
        <Section title="Name">
          <EditableField
            value={appConcept?.name || ''}
            onChange={v => updateConcept('name', v)}
          />
        </Section>

        <Section title="Description">
          <EditableField
            value={appConcept?.description || ''}
            onChange={v => updateConcept('description', v)}
            multiline
          />
        </Section>

        <Section title="Features">
          {appConcept?.features?.map((f, i) => (
            <FeatureItem key={i} feature={f} />
          ))}
        </Section>

        <Section title="Tech Stack">
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {appConcept?.techStack?.join(', ') || 'Not set'}
          </div>
        </Section>

        {/* Phase Plan */}
        <Section title="Phase Plan">
          {phases.map((phase, i) => (
            <PhaseRow
              key={i}
              phase={phase}
              index={i + 1}
              onClick={() => {
                openModal('phaseDetail');
                // Set selected phase in context if needed
              }}
            />
          ))}
        </Section>
      </div>
    </>
  );
}
```

### Sub-components (define in same file)

**EditableField:** Input or textarea that calls `updateConcept` on blur or Enter.

**FeatureItem:** Checkbox + label for each feature.

**PhaseRow:** Shows phase status icon (✅ ○ 🔨), phase name, and is clickable to open PhaseDetailModal.

**Section:** Simple wrapper with a title and children.

### Animation

Add a CSS keyframe for the slide-in. Either inline or add to globals.css:

```css
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}
```

## Verify

1. Clicking ☰ in PanelHeader opens the drawer
2. Clicking backdrop or ✕ closes it
3. Concept fields display correctly
4. Editing a field and blurring updates the store
5. Phase list shows correct status icons
6. Clicking a phase opens PhaseDetailModal (via ModalManager)
7. Drawer doesn't push the main layout — it overlays
8. `npm run typecheck && npm run lint`

## Do NOT

- Modify PanelHeader (it already calls `toggleConceptDrawer`)
- Modify BuilderContext
- Add a mode toggle or read-only logic (the drawer is always editable)
- Use hardcoded Tailwind color classes
