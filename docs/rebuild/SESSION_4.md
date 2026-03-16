# Session 4: PhaseStatusBar

## Your Job

Build `src/components/builder/PhaseStatusBar.tsx` — a compact progress bar that shows which phase is building, overall progress, and pause/resume/skip controls.

## Read These Files First

1. `src/contexts/BuilderContext.tsx` — all data comes from `useBuilder()`
2. `src/hooks/useDynamicBuildPhases.ts` — just the return type, to understand what phase data looks like

## PhaseStatusBar.tsx (~150 lines)

Only renders when there are phases and a build is active or completed.

```typescript
import { useBuilder } from '@/contexts/BuilderContext';

export function PhaseStatusBar() {
  const {
    phases,
    currentPhase,
    phaseProgress,
    isBuilding,
    isPaused,
    pauseBuild,
    resumeBuild,
    skipPhase,
    startBuilding,
  } = useBuilder();

  // Don't render if no phases exist
  if (!phases || phases.length === 0) return null;

  const completedCount = phases.filter(p => p.status === 'completed').length;
  const currentIndex = currentPhase ? phases.indexOf(currentPhase) + 1 : completedCount;
  const progressPercent = (completedCount / phases.length) * 100;

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-secondary)',
    }}>
      {/* Phase label + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>
          {currentPhase ? `Phase ${currentIndex}: ${currentPhase.name}` : 'Build Complete'}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          {completedCount} of {phases.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: 'var(--bg-tertiary)',
        borderRadius: '2px',
        marginTop: '6px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'var(--accent-primary)',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        {!isBuilding && completedCount < phases.length && (
          <button onClick={startBuilding}>▶ Start</button>
        )}
        {isBuilding && !isPaused && (
          <button onClick={pauseBuild}>⏸ Pause</button>
        )}
        {isBuilding && isPaused && (
          <button onClick={resumeBuild}>▶ Resume</button>
        )}
        {isBuilding && currentPhase && (
          <button onClick={() => skipPhase(currentIndex)}>⏭ Skip</button>
        )}
      </div>
    </div>
  );
}
```

Style the buttons with CSS variables. Toast feedback on each action:

- Pause → "Build paused"
- Resume → "Resuming build..."
- Skip → "Skipped Phase N"
- Start → "Starting build..."

## Verify

1. Bar renders inside LeftPanel (between PanelHeader and MessageList)
2. Shows current phase name and "X of Y" count
3. Progress bar fills proportionally
4. Buttons show/hide based on build state
5. Doesn't render when no phases exist
6. `npm run typecheck && npm run lint`

## Do NOT

- Modify LeftPanel (just import PhaseStatusBar and it should slot in)
- Modify BuilderContext
- Show individual phase details here (that's the ConceptDrawer + PhaseDetailModal)
