"use client";

import React from 'react';
import type { BuildPhase, PhaseId, BuildProgress } from '../../types/buildPhases';

interface PhaseControlPanelProps {
  phases: BuildPhase[];
  progress: BuildProgress;
  isBuilding: boolean;
  isPaused: boolean;
  onStartBuild: () => void;
  onPauseBuild: () => void;
  onResumeBuild: () => void;
  onSkipPhase: (phaseId: PhaseId) => void;
  onRetryPhase: (phaseId: PhaseId) => void;
  onViewPhaseDetails: (phaseId: PhaseId) => void;
  className?: string;
}

/**
 * Control panel for managing build phases
 */
export function PhaseControlPanel({
  phases,
  progress,
  isBuilding,
  isPaused,
  onStartBuild,
  onPauseBuild,
  onResumeBuild,
  onSkipPhase,
  onRetryPhase,
  onViewPhaseDetails,
  className = '',
}: PhaseControlPanelProps) {
  const currentPhase = phases.find((p) => p.id === progress.currentPhaseId);
  const hasFailedTasks = currentPhase?.tasks.some((t) => t.status === 'failed');
  const canSkip = currentPhase && currentPhase.status === 'in-progress';
  const canRetry = hasFailedTasks;

  return (
    <div className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-white/10 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>🎛️</span>
          <span>Build Controls</span>
        </h3>
        {isBuilding && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {isPaused ? 'Paused' : 'Building...'}
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className="flex gap-2 mb-4">
        {!isBuilding ? (
          <button
            onClick={onStartBuild}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all hover:shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <span>🚀</span>
            <span>Start Build</span>
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={onResumeBuild}
                className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <span>▶️</span>
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={onPauseBuild}
                className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <span>⏸️</span>
                <span>Pause</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Current Phase Info */}
      {currentPhase && (
        <div className="bg-white/5 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-white">
              Current: Phase {currentPhase.order} - {currentPhase.name}
            </div>
            <button
              onClick={() => onViewPhaseDetails(currentPhase.id)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Details →
            </button>
          </div>
          <div className="text-xs text-slate-400 mb-2">
            {currentPhase.description}
          </div>
          
          {/* Task Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: `${(currentPhase.tasks.filter((t) => t.status === 'completed').length / currentPhase.tasks.length) * 100}%`,
                }}
              />
            </div>
            <div className="text-xs text-slate-500">
              {currentPhase.tasks.filter((t) => t.status === 'completed').length}/{currentPhase.tasks.length}
            </div>
          </div>
        </div>
      )}

      {/* Phase Actions */}
      {currentPhase && (
        <div className="flex gap-2">
          <button
            onClick={() => canSkip && onSkipPhase(currentPhase.id)}
            disabled={!canSkip}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1.5"
          >
            <span>⏭️</span>
            <span>Skip Phase</span>
          </button>
          <button
            onClick={() => canRetry && onRetryPhase(currentPhase.id)}
            disabled={!canRetry}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1.5"
          >
            <span>🔄</span>
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Phase List */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs font-medium text-slate-400 mb-2">All Phases</div>
        <div className="space-y-1">
          {phases.map((phase) => {
            const isCurrentPhase = phase.id === progress.currentPhaseId;
            const statusColors = {
              completed: 'text-green-400',
              'in-progress': 'text-blue-400',
              skipped: 'text-slate-500',
              pending: 'text-slate-400',
            };
            const statusIcons = {
              completed: '✅',
              'in-progress': '⏳',
              skipped: '⏭️',
              pending: '○',
            };

            return (
              <button
                key={phase.id}
                onClick={() => onViewPhaseDetails(phase.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-all ${
                  isCurrentPhase
                    ? 'bg-blue-500/20 text-white'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <span className={statusColors[phase.status]}>
                  {statusIcons[phase.status]}
                </span>
                <span className="flex-1 truncate">{phase.name}</span>
                <span className="text-xs text-slate-500">{phase.estimatedTime}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PhaseControlPanel;
