'use client';

import React from 'react';
import { PhaseProgressIndicator, PhaseControlPanel, QualityPanel } from '../build';
import type { BuildPhase, BuildProgress, PhaseId } from '@/types/buildPhases';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { QualityReport, QualityPipelineState, ReviewStrictness } from '@/types/codeReview';
import { LayersIcon, XIcon, InfoIcon, PlayIcon } from '../ui/Icons';

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
  /** Optional: The dynamic phase plan for additional info display */
  dynamicPlan?: DynamicPhasePlan | null;
  /** When true, renders inline without modal overlay */
  isFullPage?: boolean;
  /** Code review state */
  qualityReport?: QualityReport | null;
  pipelineState?: QualityPipelineState;
  isReviewing?: boolean;
  strictness?: ReviewStrictness;
  onRunReview?: () => void;
  onStrictnessChange?: (strictness: ReviewStrictness) => void;
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
  dynamicPlan,
  isFullPage = false,
  qualityReport,
  pipelineState,
  isReviewing = false,
  strictness = 'standard',
  onRunReview,
  onStrictnessChange,
}: PhasedBuildPanelProps) {
  if (!isOpen) return null;

  const content = (
    <div
      className={`bg-zinc-900 rounded-xl border border-zinc-800 ${isFullPage ? 'w-full h-full max-h-full' : 'max-w-4xl w-full max-h-[80vh]'} overflow-hidden flex flex-col shadow-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Panel Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
              <LayersIcon size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {dynamicPlan ? `Building: ${dynamicPlan.appName}` : 'Phase-Driven Build'}
              </h2>
              <p className="text-sm text-zinc-400">
                {dynamicPlan && (
                  <span className="mr-2 px-1.5 py-0.5 rounded bg-zinc-800 text-xs">
                    {dynamicPlan.complexity}
                  </span>
                )}
                {phases.length} phases • {progress.percentComplete}% complete •{' '}
                {progress.estimatedTimeRemaining} remaining
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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
            dynamicPhases={dynamicPlan?.phases}
          />

          {/* Quality Panel (Validation + Code Review) */}
          <QualityPanel
            phase={currentPhase}
            pipelineState={pipelineState}
            qualityReport={qualityReport}
            isValidating={isValidating}
            isReviewing={isReviewing}
            strictness={strictness}
            onRunValidation={onRunValidation}
            onRunReview={onRunReview}
            onStrictnessChange={onStrictnessChange}
            onProceedAnyway={onProceedToNextPhase}
            onRetryPhase={currentPhase ? onRetryPhase.bind(null, currentPhase.id) : undefined}
          />
        </div>
      </div>

      {/* Panel Footer */}
      <div className="px-6 py-4 border-t border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <InfoIcon size={14} />
          <span>Each phase focuses on specific aspects of your app for better quality.</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onResetBuild();
              onClose();
            }}
            className="btn-secondary"
          >
            Reset Build
          </button>
          {currentPhase && currentPhase.status === 'pending' && (
            <button onClick={onExecuteCurrentPhase} className="btn-primary">
              <PlayIcon size={16} />
              Build Current Phase
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20"
      onClick={onClose}
    >
      {content}
    </div>
  );
}

export default PhasedBuildPanel;
