'use client';

/**
 * AnalysisProgressIndicator Component
 *
 * Multi-phase progress indicator for design analysis workflow.
 * Shows upload → quick analysis → deep analysis → generate → render phases.
 */

import React, { useMemo } from 'react';

// ============================================================================
// TYPES (defined locally after useAnalysisProgress hook removal)
// ============================================================================

type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';

interface SubPhaseState {
  id: string;
  label: string;
  status: PhaseStatus;
  progress: number;
}

export interface AnalysisPhaseState {
  id: string;
  label: string;
  status: PhaseStatus;
  progress: number;
  message?: string;
  subPhases: SubPhaseState[];
  elapsedTime?: number;
  duration?: string;
  error?: string;
}

interface QuickAnalysisResult {
  dominantColors?: Array<{ hex: string; usage?: string }>;
  primaryFont?: string;
  layoutType?: string;
}

export interface AnalysisProgressState {
  currentPhase: string;
  phases: AnalysisPhaseState[];
  overallProgress: number;
  isAnalyzing: boolean;
  hasError: boolean;
  errorMessage?: string;
  elapsedTime: number;
  estimatedTimeRemaining?: string;
  canCancel?: boolean;
  quickAnalysis?: QuickAnalysisResult;
  error?: string;
}

interface AnalysisProgressIndicatorProps {
  state: AnalysisProgressState;
  onCancel?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// PHASE ICONS & COLORS
// ============================================================================

const PHASE_ICONS: Record<string, string> = {
  upload: '📤',
  quick: '⚡',
  deep: '🔍',
  generate: '🛠️',
  render: '🎨',
  complete: '✅',
};

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending: {
    bg: 'bg-slate-700/50',
    border: 'border-slate-600',
    text: 'text-slate-400',
  },
  in_progress: {
    bg: 'bg-garden-500/20',
    border: 'border-garden-500',
    text: 'text-garden-400',
  },
  completed: {
    bg: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-400',
  },
  error: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-400',
  },
  skipped: {
    bg: 'bg-slate-600/30',
    border: 'border-slate-500',
    text: 'text-slate-500',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function PhaseIcon({ phaseId, status }: { phaseId: string; status: string }) {
  const icon = status === 'completed' ? '✓' : PHASE_ICONS[phaseId] || '○';
  const isAnimated = status === 'in_progress';

  return <span className={`text-lg ${isAnimated ? 'animate-pulse' : ''}`}>{icon}</span>;
}

function SubPhaseList({ subPhases }: { subPhases: AnalysisPhaseState['subPhases'] }) {
  if (subPhases.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {subPhases.map((sub) => {
        const colors = PHASE_COLORS[sub.status];
        return (
          <div key={sub.id} className={`flex items-center gap-2 text-xs ${colors.text}`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sub.status === 'completed'
                  ? 'bg-garden-400'
                  : sub.status === 'in_progress'
                    ? 'bg-garden-400 animate-pulse'
                    : sub.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-slate-500'
              }`}
            />
            <span className="flex-1">{sub.label}</span>
            {sub.status === 'in_progress' && sub.progress > 0 && (
              <span className="text-slate-500">{sub.progress}%</span>
            )}
            {sub.status === 'completed' && <span className="text-garden-400">✓</span>}
          </div>
        );
      })}
    </div>
  );
}

function PhaseCard({
  phase,
  isActive,
  showSubPhases,
}: {
  phase: AnalysisPhaseState;
  isActive: boolean;
  showSubPhases: boolean;
}) {
  const colors = PHASE_COLORS[phase.status];

  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all duration-300
        ${colors.bg} ${colors.border}
        ${isActive ? 'ring-2 ring-garden-400/50 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      {/* Phase Header */}
      <div className="flex items-center gap-2">
        <PhaseIcon phaseId={phase.id} status={phase.status} />
        <div className="flex-1">
          <div className={`font-medium ${colors.text}`}>{phase.label}</div>
          {phase.duration && phase.status === 'pending' && (
            <div className="text-xs text-slate-500">~{phase.duration}</div>
          )}
        </div>
        {phase.status === 'in_progress' && (
          <div className="text-sm font-mono text-garden-400">{phase.progress}%</div>
        )}
      </div>

      {/* Progress Bar */}
      {phase.status === 'in_progress' && (
        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-garden-500 to-gold-400 transition-all duration-300"
            style={{ width: `${phase.progress}%` }}
          />
        </div>
      )}

      {/* Sub-phases */}
      {showSubPhases && phase.status === 'in_progress' && (
        <SubPhaseList subPhases={phase.subPhases} />
      )}

      {/* Error message */}
      {phase.error && <div className="mt-2 text-xs text-red-400">{phase.error}</div>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnalysisProgressIndicator({
  state,
  onCancel,
  showDetails = true,
  compact = false,
  className = '',
}: AnalysisProgressIndicatorProps) {
  // Filter out the 'complete' phase for display
  const displayPhases = useMemo(
    () => state.phases.filter((p) => p.id !== 'complete'),
    [state.phases]
  );

  // Get current active phase
  const activePhase = useMemo(
    () => displayPhases.find((p) => p.status === 'in_progress'),
    [displayPhases]
  );

  if (!state.isAnalyzing && state.overallProgress === 0) {
    return null;
  }

  // Compact inline view
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          {activePhase && (
            <>
              <PhaseIcon phaseId={activePhase.id} status="in_progress" />
              <span className="text-garden-400 text-sm">{activePhase.label}</span>
            </>
          )}
          {!activePhase && state.overallProgress === 100 && (
            <>
              <span className="text-garden-400">✅</span>
              <span className="text-garden-400 text-sm">Complete</span>
            </>
          )}
        </div>
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-garden-500 via-gold-400 to-blossom-400 transition-all duration-300"
            style={{ width: `${state.overallProgress}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">{state.overallProgress}%</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-slate-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl animate-pulse">
            {activePhase ? PHASE_ICONS[activePhase.id] : '✅'}
          </span>
          <div>
            <h3 className="font-medium text-white">
              {state.isAnalyzing ? 'Analyzing Design' : 'Analysis Complete'}
            </h3>
            {activePhase && (
              <p className="text-sm text-slate-400">
                {activePhase.label}
                {activePhase.subPhases.find((s) => s.status === 'in_progress')?.label &&
                  ` - ${activePhase.subPhases.find((s) => s.status === 'in_progress')?.label}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-mono text-slate-300">
              {formatElapsedTime(state.elapsedTime)}
            </div>
            <div className="text-xs text-slate-500">{state.estimatedTimeRemaining}</div>
          </div>
          {state.isAnalyzing && onCancel && state.canCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Overall Progress</span>
          <span>{state.overallProgress}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-garden-500 via-gold-400 to-blossom-400 transition-all duration-500"
            style={{ width: `${state.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-slate-700" />

        <div className="space-y-3">
          {displayPhases.map((phase, index) => (
            <div key={phase.id} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className={`
                  absolute left-2 top-3 w-4 h-4 rounded-full border-2
                  transition-all duration-300
                  ${
                    phase.status === 'completed'
                      ? 'bg-garden-500 border-garden-500'
                      : phase.status === 'in_progress'
                        ? 'bg-garden-500 border-garden-500 animate-pulse'
                        : phase.status === 'error'
                          ? 'bg-red-500 border-red-500'
                          : 'bg-slate-800 border-slate-600'
                  }
                `}
              >
                {phase.status === 'completed' && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">
                    ✓
                  </span>
                )}
              </div>

              <PhaseCard
                phase={phase}
                isActive={phase.status === 'in_progress'}
                showSubPhases={showDetails}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Analysis Results Preview */}
      {state.quickAnalysis && state.currentPhase !== 'quick' && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-slate-500 mb-2">Quick Analysis Results</div>
          <div className="flex flex-wrap gap-2">
            {state.quickAnalysis.dominantColors?.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded border border-white/20"
                style={{ backgroundColor: color.hex }}
                title={`${color.hex} - ${color.usage || ''}`}
              />
            ))}
            {state.quickAnalysis.primaryFont && (
              <span className="px-2 py-1 text-xs bg-slate-700 rounded text-slate-300">
                {state.quickAnalysis.primaryFont}
              </span>
            )}
            {state.quickAnalysis.layoutType && (
              <span className="px-2 py-1 text-xs bg-gold-500/20 rounded text-gold-300">
                {state.quickAnalysis.layoutType}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <span>❌</span>
            <span className="font-medium">Analysis Failed</span>
          </div>
          <p className="mt-1 text-sm text-red-300/80">{state.error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Minimal inline progress for use in headers or compact spaces
 */
export function InlineAnalysisProgress({
  state,
  className = '',
}: {
  state: AnalysisProgressState;
  className?: string;
}) {
  if (!state.isAnalyzing) return null;

  const activePhase = state.phases.find((p) => p.status === 'in_progress');

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="animate-pulse">{activePhase ? PHASE_ICONS[activePhase.id] : '⏳'}</span>
      <span className="text-garden-400">{activePhase?.label || 'Processing...'}</span>
      <div className="w-20 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-garden-500 transition-all duration-300"
          style={{ width: `${state.overallProgress}%` }}
        />
      </div>
      <span className="text-slate-500 font-mono text-xs">{state.overallProgress}%</span>
    </div>
  );
}

export default AnalysisProgressIndicator;
