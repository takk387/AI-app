"use client";

import React from 'react';
import {
  PhaseProgressIndicator,
  PhaseControlPanel,
  ValidationDashboard,
} from '../build';
import type { BuildPhase, BuildProgress, PhaseId } from '@/types/buildPhases';

export interface PhasedBuildPanelProps {
  isOpen: boolean;
  onClose: () => void;
  phases: BuildPhase[];
  progress: BuildProgress;
  currentPhase: BuildPhase | null;
  isBuilding: boolean;
  isPaused: boolean;
  isValidating: boolean;
  onStartBuild: () => void;
  onPauseBuild: () => void;
  onResumeBuild: () => void;
  onSkipPhase: (phaseId: PhaseId) => void;
  onRetryPhase: (phaseId: PhaseId) => void;
  onViewPhaseDetails: (phaseId: PhaseId) => void;
  onRunValidation: () => void;
  onResetBuild: () => void;
  onExecuteCurrentPhase: () => void;
  onProceedToNextPhase: () => void;
}

export function PhasedBuildPanel({
  isOpen,
  onClose,
  phases,
  progress,
  currentPhase,
  isBuilding,
  isPaused,
  isValidating,
  onStartBuild,
  onPauseBuild,
  onResumeBuild,
  onSkipPhase,
  onRetryPhase,
  onViewPhaseDetails,
  onRunValidation,
  onResetBuild,
  onExecuteCurrentPhase,
  onProceedToNextPhase,
}: PhasedBuildPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <span className="text-2xl">🏗️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Phase-Driven Build</h2>
                <p className="text-sm text-slate-400">
                  {progress.percentComplete}% complete • {progress.estimatedTimeRemaining} remaining
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Phase Progress Indicator */}
          <PhaseProgressIndicator
            phases={phases}
            progress={progress}
            onPhaseClick={onViewPhaseDetails}
          />

          {/* Control Panel and Validation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phase Control Panel */}
            <PhaseControlPanel
              phases={phases}
              progress={progress}
              isBuilding={isBuilding}
              isPaused={isPaused}
              onStartBuild={onStartBuild}
              onPauseBuild={onPauseBuild}
              onResumeBuild={onResumeBuild}
              onSkipPhase={onSkipPhase}
              onRetryPhase={onRetryPhase}
              onViewPhaseDetails={onViewPhaseDetails}
            />

            {/* Validation Dashboard */}
            {currentPhase && (
              <ValidationDashboard
                phase={currentPhase}
                onRunValidation={onRunValidation}
                onProceedAnyway={onProceedToNextPhase}
                onRetryPhase={onRetryPhase.bind(null, currentPhase.id)}
                isValidating={isValidating}
              />
            )}
          </div>
        </div>

        {/* Panel Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>💡</span>
            <span>Each phase focuses on specific aspects of your app for better quality.</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onResetBuild();
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
            >
              Reset Build
            </button>
            {currentPhase && currentPhase.status === 'pending' && (
              <button
                onClick={onExecuteCurrentPhase}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium transition-all"
              >
                Build Current Phase
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhasedBuildPanel;
