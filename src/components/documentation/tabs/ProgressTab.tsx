'use client';

/**
 * ProgressTab - Displays phase execution progress with expandable cards
 */

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  AlertTriangleIcon,
  XIcon,
} from '@/components/ui/Icons';
import type { PhaseExecutionRecord, BuildStatus } from '@/types/projectDocumentation';

interface ProgressTabProps {
  executions: PhaseExecutionRecord[];
  buildStatus: BuildStatus;
}

interface PhaseCardProps {
  execution: PhaseExecutionRecord;
}

function StatusIcon({ status }: { status: PhaseExecutionRecord['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon size={20} className="text-success-400" />;
    case 'failed':
      return <XIcon size={20} className="text-error-400" />;
    case 'in-progress':
      return <LoaderIcon size={20} className="text-garden-400" />;
    case 'skipped':
      return <AlertTriangleIcon size={20} className="text-warning-400" />;
    default:
      return <ClockIcon size={20} className="text-slate-500" />;
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function PhaseCard({ execution }: PhaseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    execution.generatedFiles?.length ||
    execution.implementedFeatures?.length ||
    execution.errors?.length ||
    execution.generatedCode;

  return (
    <div
      className={`bg-slate-800/30 rounded-lg border ${
        execution.status === 'failed'
          ? 'border-error-500/30'
          : execution.status === 'completed'
            ? 'border-success-500/20'
            : 'border-slate-800'
      }`}
    >
      {/* Summary Row */}
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
        className={`w-full flex items-center gap-3 p-3 text-left ${
          hasDetails ? 'cursor-pointer hover:bg-slate-700/50' : 'cursor-default'
        } transition-colors rounded-lg`}
      >
        <StatusIcon status={execution.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Phase {execution.phaseNumber}
            </span>
            <span className="text-sm font-medium text-slate-200 truncate">
              {execution.phaseName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span>{execution.domain}</span>
            <span>{formatDuration(execution.duration)}</span>
            {execution.tokensUsed && (
              <span>
                {((execution.tokensUsed.input + execution.tokensUsed.output) / 1000).toFixed(1)}k
                tokens
              </span>
            )}
          </div>
        </div>

        {hasDetails && (
          <span className="text-slate-500">
            {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </span>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800 mt-1 pt-3">
          {/* Planned vs Implemented */}
          <div className="mb-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Planned Features</div>
            <div className="flex flex-wrap gap-1">
              {execution.plannedFeatures.map((feature, i) => {
                const implemented = execution.implementedFeatures?.includes(feature);
                return (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      implemented
                        ? 'bg-success-500/20 text-success-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {implemented && '✓ '}
                    {feature}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Generated Files */}
          {execution.generatedFiles && execution.generatedFiles.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <FileIcon size={12} />
                Generated Files
              </div>
              <div className="bg-slate-900/50 rounded p-2 max-h-24 overflow-y-auto">
                {execution.generatedFiles.map((file, i) => (
                  <div key={i} className="text-xs text-slate-500 font-mono">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {execution.errors && execution.errors.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-error-400 mb-1 flex items-center gap-1">
                <XIcon size={12} />
                Errors
              </div>
              <div className="bg-error-500/10 rounded p-2 max-h-24 overflow-y-auto">
                {execution.errors.map((error, i) => (
                  <div key={i} className="text-xs text-error-400">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-slate-600 flex gap-4">
            {execution.startedAt && (
              <span>Started: {new Date(execution.startedAt).toLocaleTimeString()}</span>
            )}
            {execution.completedAt && (
              <span>Completed: {new Date(execution.completedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BuildStatusBanner({ status }: { status: BuildStatus }) {
  const config: Record<BuildStatus, { icon: React.ReactNode; text: string; className: string }> = {
    planning: {
      icon: <ClockIcon size={16} />,
      text: 'Planning in progress...',
      className: 'bg-garden-500/10 text-garden-400 border-garden-500/20',
    },
    ready: {
      icon: <CheckCircleIcon size={16} />,
      text: 'Ready to build',
      className: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
    },
    building: {
      icon: <LoaderIcon size={16} />,
      text: 'Building...',
      className: 'bg-gold-500/10 text-gold-400 border-gold-500/20',
    },
    completed: {
      icon: <CheckCircleIcon size={16} />,
      text: 'Build completed successfully',
      className: 'bg-success-500/10 text-success-400 border-success-500/20',
    },
    failed: {
      icon: <XIcon size={16} />,
      text: 'Build failed',
      className: 'bg-error-500/10 text-error-400 border-error-500/20',
    },
    paused: {
      icon: <ClockIcon size={16} />,
      text: 'Build paused',
      className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    },
  };

  const conf = config[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${conf.className}`}>
      {conf.icon}
      <span className="text-sm font-medium">{conf.text}</span>
    </div>
  );
}

export function ProgressTab({ executions, buildStatus }: ProgressTabProps) {
  // Sort by phase number
  const sortedExecutions = [...executions].sort((a, b) => a.phaseNumber - b.phaseNumber);

  // Calculate progress
  const completed = executions.filter((e) => e.status === 'completed').length;
  const failed = executions.filter((e) => e.status === 'failed').length;
  const total = executions.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-4">
      {/* Build Status */}
      <div className="mb-4">
        <BuildStatusBanner status={buildStatus} />
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span>
          <span>
            {completed}/{total} phases ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              failed > 0 ? 'bg-gradient-to-r from-success-500 to-error-500' : 'bg-success-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {failed > 0 && <div className="text-xs text-error-400 mt-1">{failed} phase(s) failed</div>}
      </div>

      {/* Phase Cards */}
      <div className="space-y-2">
        {sortedExecutions.map((execution) => (
          <PhaseCard key={execution.phaseNumber} execution={execution} />
        ))}
      </div>

      {executions.length === 0 && (
        <div className="text-center py-8">
          <ClockIcon size={32} className="text-slate-600 mx-auto mb-2" />
          <div className="text-sm text-slate-500">No phases executed yet</div>
          <div className="text-xs text-slate-600">Start the build to see progress here</div>
        </div>
      )}
    </div>
  );
}

export default ProgressTab;
