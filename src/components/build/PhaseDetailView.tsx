"use client";

import React from 'react';
import type { BuildPhase, PhaseTask, ValidationCheck } from '../../types/buildPhases';

/** Maximum length for code preview in task details */
const MAX_TASK_CODE_PREVIEW_LENGTH = 500;

interface PhaseDetailViewProps {
  phase: BuildPhase;
  isOpen: boolean;
  onClose: () => void;
  onBuildPhase: () => void;
  onSkipPhase: () => void;
  onRetryPhase: () => void;
  generatedCode?: string;
  className?: string;
}

/**
 * Modal showing detailed phase information and generated code
 */
export function PhaseDetailView({
  phase,
  isOpen,
  onClose,
  onBuildPhase,
  onSkipPhase,
  onRetryPhase,
  generatedCode,
  className = '',
}: PhaseDetailViewProps) {
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'validation' | 'code'>('tasks');

  if (!isOpen) return null;

  const completedTasks = phase.tasks.filter((t) => t.status === 'completed').length;
  const failedTasks = phase.tasks.filter((t) => t.status === 'failed').length;
  const passedChecks = phase.validationChecks.filter((c) => c.passed).length;

  const getTaskStatusIcon = (status: PhaseTask['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
      default:
        return '○';
    }
  };

  const getTaskStatusColor = (status: PhaseTask['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/10';
      case 'failed':
        return 'text-red-400 bg-red-500/10';
      case 'pending':
      default:
        return 'text-slate-400 bg-white/5';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-slate-900 rounded-2xl border border-white/10 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                phase.status === 'completed' ? 'bg-green-500/20' :
                phase.status === 'in-progress' ? 'bg-blue-500/20' :
                phase.status === 'skipped' ? 'bg-slate-600/20' : 'bg-white/10'
              }`}>
                <span className="text-2xl">
                  {phase.status === 'completed' ? '✅' :
                   phase.status === 'in-progress' ? '⏳' :
                   phase.status === 'skipped' ? '⏭️' : '📋'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Phase {phase.order}: {phase.name}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {phase.description}
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

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <span className="text-green-400">✅</span>
              <span className="text-sm text-slate-300">{completedTasks}/{phase.tasks.length} Tasks</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <span className="text-blue-400">🔍</span>
              <span className="text-sm text-slate-300">{passedChecks}/{phase.validationChecks.length} Checks</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
              <span className="text-purple-400">⏱️</span>
              <span className="text-sm text-slate-300">{phase.estimatedTime}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'tasks'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            📋 Tasks
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'validation'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            🔍 Validation
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'code'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            💻 Generated Code
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {phase.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${getTaskStatusColor(task.status)}`}
                >
                  <span className="text-lg mt-0.5">{getTaskStatusIcon(task.status)}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{task.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{task.description}</div>
                    {task.errors && task.errors.length > 0 && (
                      <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
                        {task.errors.join(', ')}
                      </div>
                    )}
                    {task.generatedCode && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
                          View generated code
                        </summary>
                        <pre className="mt-2 text-xs text-slate-300 bg-black/30 rounded p-2 overflow-x-auto">
                          {task.generatedCode.substring(0, MAX_TASK_CODE_PREVIEW_LENGTH)}...
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-2">
              {phase.validationChecks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    check.passed
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  <span className="text-lg mt-0.5">{check.passed ? '✅' : '❌'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{check.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10">
                        {check.type}
                      </span>
                    </div>
                    {check.message && (
                      <div className="text-xs mt-1 opacity-80">{check.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'code' && (
            <div>
              {generatedCode ? (
                <div className="relative">
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                    className="absolute top-2 right-2 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-all"
                  >
                    Copy
                  </button>
                  <pre className="bg-black/40 rounded-lg p-4 overflow-x-auto text-sm text-slate-300">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-slate-400">
                    No code generated yet. Build this phase to see the generated code.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex gap-3">
          {phase.status === 'pending' && (
            <button
              onClick={onBuildPhase}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              <span>Build This Phase</span>
            </button>
          )}
          {phase.status === 'in-progress' && (
            <button
              onClick={onSkipPhase}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>⏭️</span>
              <span>Skip Phase</span>
            </button>
          )}
          {(phase.status === 'completed' || failedTasks > 0) && (
            <button
              onClick={onRetryPhase}
              className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              <span>Retry Phase</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhaseDetailView;
