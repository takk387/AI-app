'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListChecksIcon,
  CheckIcon,
  ClockIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { BuildState } from '../AppConceptPanel';

interface PhasePlanSectionProps {
  phasePlan: DynamicPhasePlan | null;
  completedPhases?: string[];
  currentPhase?: string;
  /** Panel mode - affects display */
  mode?: 'plan' | 'act';
  /** Build state from useDynamicBuildPhases */
  buildState?: BuildState;
  /** Callback when a phase is clicked */
  onPhaseClick?: (phaseNumber: number) => void;
}

/**
 * Section for phase plan display
 * In PLAN mode: Simple phase list
 * In ACT mode: Enhanced with build progress and clickable phases
 */
export function PhasePlanSection({
  phasePlan,
  completedPhases = [],
  currentPhase,
  mode = 'plan',
  buildState,
  onPhaseClick,
}: PhasePlanSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!phasePlan) {
    return null;
  }

  const phases = phasePlan.phases || [];

  // Use buildState for progress in ACT mode, fallback to props
  const completedCount =
    mode === 'act' && buildState
      ? buildState.dynamicPhases.filter((p) => p.status === 'completed').length
      : completedPhases.length;
  const totalCount = phases.length;
  const progress =
    mode === 'act' && buildState
      ? buildState.progress.percentComplete
      : totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

  // Helper to get phase status in ACT mode
  const getPhaseStatus = (phaseNumber: number) => {
    if (mode === 'act' && buildState) {
      const dynamicPhase = buildState.dynamicPhases.find((p) => p.number === phaseNumber);
      return dynamicPhase?.status || 'pending';
    }
    // Fallback for PLAN mode
    if (completedPhases.includes(String(phaseNumber))) return 'completed';
    if (currentPhase === String(phaseNumber)) return 'in-progress';
    return 'pending';
  };

  return (
    <div>
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isExpanded ? (
          <ChevronDownIcon size={14} className="text-zinc-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-zinc-400" />
        )}
        <ListChecksIcon size={14} className="text-zinc-400" />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">Implementation Plan</span>
        <span className="ml-auto text-xs text-zinc-500">
          {completedCount}/{totalCount}
        </span>
      </button>

      {isExpanded && (
        <div className="pl-5 space-y-2">
          {/* Progress bar */}
          {completedCount > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Phase list */}
          <div className="space-y-1.5">
            {phases.map((phase) => {
              const status = getPhaseStatus(phase.number);
              const isCompleted = status === 'completed';
              const isCurrent = status === 'in-progress';
              const isFailed = status === 'failed';
              const isClickable = !!onPhaseClick;

              // Get built summary from buildState if available
              const dynamicPhase = buildState?.dynamicPhases.find((p) => p.number === phase.number);
              const builtSummary = dynamicPhase?.builtSummary;

              const PhaseWrapper = isClickable ? 'button' : 'div';

              return (
                <PhaseWrapper
                  key={phase.number}
                  type={isClickable ? 'button' : undefined}
                  onClick={isClickable ? () => onPhaseClick(phase.number) : undefined}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors w-full text-left ${
                    isFailed
                      ? 'bg-red-500/10 border border-red-500/30'
                      : isCurrent
                        ? 'bg-blue-500/10 border border-blue-500/30'
                        : isCompleted
                          ? 'bg-green-500/5'
                          : 'bg-zinc-800/30'
                  } ${isClickable ? 'cursor-pointer hover:bg-zinc-700/50' : ''}`}
                >
                  {/* Phase number/status icon */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isFailed
                        ? 'bg-red-500/20 text-red-400'
                        : isCompleted
                          ? 'bg-green-500/20 text-green-400'
                          : isCurrent
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    {isFailed ? (
                      <AlertCircleIcon size={12} />
                    ) : isCompleted ? (
                      <CheckIcon size={12} />
                    ) : isCurrent ? (
                      <ClockIcon size={12} className="animate-pulse" />
                    ) : (
                      <span className="text-[10px]">{phase.number}</span>
                    )}
                  </div>

                  {/* Phase info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        isFailed
                          ? 'text-red-300'
                          : isCompleted
                            ? 'text-zinc-400 line-through'
                            : isCurrent
                              ? 'text-blue-300'
                              : 'text-zinc-300'
                      }`}
                    >
                      {phase.name}
                    </p>
                    {/* Show built summary in ACT mode when available */}
                    {mode === 'act' && builtSummary ? (
                      <span className="text-[10px] text-green-400/70 truncate block">
                        {builtSummary}
                      </span>
                    ) : phase.domain ? (
                      <span className="text-[10px] text-zinc-600">{phase.domain}</span>
                    ) : null}
                  </div>

                  {/* Click indicator in ACT mode */}
                  {isClickable && (
                    <ChevronRightIcon size={12} className="text-zinc-600 flex-shrink-0" />
                  )}

                  {/* Estimated tokens (only in PLAN mode) */}
                  {mode === 'plan' && phase.estimatedTokens && (
                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                      ~{Math.round(phase.estimatedTokens / 1000)}k
                    </span>
                  )}
                </PhaseWrapper>
              );
            })}
          </div>

          {/* Summary stats */}
          <div className="pt-2 border-t border-zinc-800 mt-2 flex items-center gap-4 text-xs text-zinc-500">
            <span>Total: {phasePlan.totalPhases} phases</span>
            {phasePlan.estimatedTotalTokens && (
              <span>~{Math.round(phasePlan.estimatedTotalTokens / 1000)}k tokens</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PhasePlanSection;
