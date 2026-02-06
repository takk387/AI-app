/**
 * PipelineStagesView
 *
 * Visual pipeline stages (1-5) with progress indicators.
 * Shows on the /app/ai-plan page during planning execution.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { DualPlanProgress, DualPlanStage } from '@/types/dualPlanning';

interface PipelineStagesViewProps {
  progress: DualPlanProgress | null;
}

interface StageConfig {
  key: DualPlanStage;
  label: string;
  description: string;
}

const STAGES: StageConfig[] = [
  {
    key: 'layout-analysis',
    label: 'Layout Analysis',
    description: 'Extracting backend requirements from your design',
  },
  {
    key: 'intelligence',
    label: 'Intelligence Gathering',
    description: 'Searching for latest AI models, frameworks, and best practices',
  },
  {
    key: 'parallel-generation',
    label: 'Architecture Generation',
    description: 'Claude Opus 4.6 + Gemini 3 Pro generating architectures in parallel',
  },
  {
    key: 'consensus',
    label: 'Consensus Negotiation',
    description: 'AIs negotiating until they agree on the best architecture',
  },
  {
    key: 'validation',
    label: 'Dual Validation',
    description: 'Both AIs verifying the architecture covers everything',
  },
];

const STAGE_ORDER: DualPlanStage[] = [
  'layout-analysis',
  'intelligence',
  'parallel-generation',
  'consensus',
  'validation',
];

function getStageStatus(
  stageKey: DualPlanStage,
  currentStage: DualPlanStage | undefined,
  progressPercent?: number
): 'pending' | 'active' | 'complete' {
  if (!currentStage || currentStage === 'idle') return 'pending';
  if (currentStage === 'complete' || currentStage === 'escalated') return 'complete';
  if (currentStage === 'error') {
    // 'error' is not in STAGE_ORDER — determine the failed stage from progress percent
    const failedIdx = estimateStageFromPercent(progressPercent ?? 0);
    const stageIdx = STAGE_ORDER.indexOf(stageKey);
    if (stageIdx < failedIdx) return 'complete';
    if (stageIdx === failedIdx) return 'active'; // shows as the stage that errored
    return 'pending';
  }

  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageIdx = STAGE_ORDER.indexOf(stageKey);

  if (stageIdx < currentIdx) return 'complete';
  if (stageIdx === currentIdx) return 'active';
  return 'pending';
}

/** Map progress percent to approximate pipeline stage index */
function estimateStageFromPercent(percent: number): number {
  if (percent >= 80) return 4; // validation
  if (percent >= 40) return 3; // consensus
  if (percent >= 20) return 2; // parallel-generation
  if (percent >= 5) return 1; // intelligence
  return 0; // layout-analysis
}

export function PipelineStagesView({ progress }: PipelineStagesViewProps) {
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!progress || progress.stage === 'complete' || progress.stage === 'error') return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [progress, startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header with elapsed time */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Architecture Planning Pipeline
        </h3>
        <span className="text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {formatTime(elapsed)} elapsed
        </span>
      </div>

      {/* Overall progress bar */}
      <div
        className="w-full rounded-full h-2 overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress?.percent ?? 0}%`,
            background: 'var(--accent-primary)',
          }}
        />
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const status = getStageStatus(stage.key, progress?.stage, progress?.percent);
          const isNegotiating =
            stage.key === 'consensus' && status === 'active' && progress?.negotiationRound;

          return (
            <div
              key={stage.key}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                status === 'pending' ? 'opacity-50' : ''
              }`}
              style={
                status === 'active'
                  ? {
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }
                  : status === 'complete'
                    ? { background: 'var(--bg-tertiary)', opacity: 0.7 }
                    : undefined
              }
            >
              {/* Stage number / status icon */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  status === 'active' ? 'animate-pulse' : ''
                }`}
                style={
                  status === 'complete'
                    ? {
                        background: 'var(--success-muted, rgba(34, 197, 94, 0.1))',
                        color: 'var(--success-primary, #22c55e)',
                      }
                    : status === 'active'
                      ? {
                          background: 'var(--accent-muted)',
                          color: 'var(--accent-primary)',
                        }
                      : {
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                        }
                }
              >
                {status === 'complete' ? '✓' : idx + 1}
              </div>

              {/* Stage info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-medium"
                    style={{
                      color:
                        status === 'active'
                          ? 'var(--text-primary)'
                          : status === 'complete'
                            ? 'var(--text-secondary)'
                            : 'var(--text-muted)',
                    }}
                  >
                    {stage.label}
                  </span>
                  {status === 'active' && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--accent-muted)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {stage.description}
                </p>

                {/* Negotiation round indicator */}
                {isNegotiating && (
                  <div
                    className="mt-2 text-sm"
                    style={{ color: 'var(--warning-primary, #f59e0b)' }}
                  >
                    Round {progress.negotiationRound}/{progress.maxRounds ?? 5}
                    {progress.details && (
                      <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                        — {progress.details}
                      </span>
                    )}
                  </div>
                )}

                {/* Active stage message */}
                {status === 'active' && progress?.message && !isNegotiating && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {progress.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error display */}
      {progress?.stage === 'error' && (
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'var(--error-muted, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--error-muted, rgba(239, 68, 68, 0.2))',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--error-primary, #ef4444)' }}>
            {progress.message}
          </p>
        </div>
      )}
    </div>
  );
}
