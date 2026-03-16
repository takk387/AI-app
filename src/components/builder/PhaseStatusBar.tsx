'use client';

import { useCallback } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { useToast } from '@/components/Toast';
import { PlayIcon, PauseIcon, ZapIcon } from '@/components/ui/Icons';

export function PhaseStatusBar() {
  const {
    phases,
    currentPhase,
    isBuilding,
    isPaused,
    pauseBuild,
    resumeBuild,
    skipPhase,
    startBuilding,
  } = useBuilder();
  const { showToast } = useToast();

  const handleStart = useCallback(() => {
    startBuilding();
    showToast('info', 'Starting build...');
  }, [startBuilding, showToast]);

  const handlePause = useCallback(() => {
    pauseBuild();
    showToast('info', 'Build paused');
  }, [pauseBuild, showToast]);

  const handleResume = useCallback(() => {
    resumeBuild();
    showToast('info', 'Resuming build...');
  }, [resumeBuild, showToast]);

  const handleSkip = useCallback(
    (phaseNumber: number) => {
      skipPhase(phaseNumber);
      showToast('warning', `Skipped Phase ${phaseNumber}`);
    },
    [skipPhase, showToast]
  );

  if (!phases || phases.length === 0) return null;

  const completedCount = phases.filter((p) => p.status === 'completed').length;
  const currentIndex = currentPhase
    ? phases.findIndex((p) => p.number === currentPhase.number) + 1
    : completedCount;
  const progressPercent = (completedCount / phases.length) * 100;
  const allComplete = completedCount === phases.length;

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Phase label + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>
          {currentPhase
            ? `Phase ${currentIndex}: ${currentPhase.name}`
            : allComplete
              ? 'Build Complete'
              : 'Ready to Build'}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          {completedCount} of {phases.length}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          background: 'var(--bg-tertiary)',
          borderRadius: '2px',
          marginTop: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: allComplete ? 'var(--success, #22c55e)' : 'var(--accent-primary, #22c55e)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        {!isBuilding && !allComplete && (
          <PhaseButton onClick={handleStart} icon={<PlayIcon size={12} />} label="Start" />
        )}
        {isBuilding && !isPaused && (
          <PhaseButton onClick={handlePause} icon={<PauseIcon size={12} />} label="Pause" />
        )}
        {isBuilding && isPaused && (
          <PhaseButton onClick={handleResume} icon={<PlayIcon size={12} />} label="Resume" />
        )}
        {isBuilding && currentPhase && (
          <PhaseButton
            onClick={() => handleSkip(currentIndex)}
            icon={<ZapIcon size={12} />}
            label="Skip"
          />
        )}
      </div>
    </div>
  );
}

function PhaseButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
