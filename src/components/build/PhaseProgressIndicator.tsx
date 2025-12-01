"use client";

import React from 'react';
import type { BuildPhase, PhaseId, BuildProgress } from '../../types/buildPhases';

interface PhaseProgressIndicatorProps {
  phases: BuildPhase[];
  progress: BuildProgress;
  onPhaseClick?: (phaseId: PhaseId) => void;
  className?: string;
}

/**
 * Visual timeline showing all phases with current phase highlighted
 */
export function PhaseProgressIndicator({
  phases,
  progress,
  onPhaseClick,
  className = '',
}: PhaseProgressIndicatorProps) {
  const getPhaseStatusIcon = (status: BuildPhase['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in-progress':
        return '⏳';
      case 'skipped':
        return '⏭️';
      case 'pending':
      default:
        return '⏸️';
    }
  };

  const getPhaseStatusColor = (status: BuildPhase['status'], isCurrentPhase: boolean) => {
    if (isCurrentPhase && status === 'in-progress') {
      return 'bg-blue-500/30 border-blue-500/60 shadow-blue-500/20';
    }
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 border-green-500/40';
      case 'in-progress':
        return 'bg-blue-500/20 border-blue-500/40 animate-pulse';
      case 'skipped':
        return 'bg-slate-600/20 border-slate-500/40 opacity-50';
      case 'pending':
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  const getConnectorColor = (status: BuildPhase['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <div className={`${className}`}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>🏗️</span>
          <span>Build Progress</span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-400">
            {progress.percentComplete}% Complete
          </div>
          <div className="text-xs text-slate-500">
            ~{progress.estimatedTimeRemaining} remaining
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>

      {/* Phase Timeline */}
      <div className="relative">
        {/* Horizontal connector line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-700 -z-10" />

        {/* Phases */}
        <div className="flex justify-between">
          {phases.map((phase, index) => {
            const isCurrentPhase = phase.id === progress.currentPhaseId;
            const isPast = progress.completedPhases.includes(phase.id);

            return (
              <div
                key={phase.id}
                className="flex flex-col items-center relative group"
                style={{ width: `${100 / phases.length}%` }}
              >
                {/* Phase Circle */}
                <button
                  onClick={() => onPhaseClick?.(phase.id)}
                  disabled={phase.status === 'pending' && !isPast}
                  className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300 hover:scale-110
                    ${getPhaseStatusColor(phase.status, isCurrentPhase)}
                    ${onPhaseClick && (phase.status !== 'pending' || isPast) ? 'cursor-pointer' : 'cursor-default'}
                    ${isCurrentPhase ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}
                  `}
                >
                  <span className="text-lg">{getPhaseStatusIcon(phase.status)}</span>
                </button>

                {/* Phase connector to next */}
                {index < phases.length - 1 && (
                  <div
                    className={`absolute top-6 left-1/2 w-full h-0.5 ${getConnectorColor(phase.status)} transition-all duration-500`}
                    style={{ transform: 'translateY(-50%)' }}
                  />
                )}

                {/* Phase Info */}
                <div className="mt-3 text-center">
                  <div className="text-xs font-medium text-white">
                    Phase {phase.order}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {phase.name}
                  </div>
                </div>

                {/* Hover Tooltip */}
                <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-800 rounded-lg border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="text-sm font-medium text-white mb-1">
                    {phase.name}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {phase.description}
                  </div>
                  <div className="text-xs text-slate-500">
                    Est. time: {phase.estimatedTime}
                  </div>
                  {phase.tasks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-xs text-slate-500">
                        {phase.tasks.filter((t) => t.status === 'completed').length}/{phase.tasks.length} tasks
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PhaseProgressIndicator;
