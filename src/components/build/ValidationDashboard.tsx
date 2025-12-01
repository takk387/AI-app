"use client";

import React from 'react';
import type { BuildPhase, ValidationCheck, ValidationResult } from '../../types/buildPhases';

interface ValidationDashboardProps {
  phase: BuildPhase;
  validationResult?: ValidationResult;
  onRunValidation: () => void;
  onProceedAnyway: () => void;
  onRetryPhase: () => void;
  isValidating?: boolean;
  className?: string;
}

/**
 * Dashboard showing validation checks for current phase
 */
export function ValidationDashboard({
  phase,
  validationResult,
  onRunValidation,
  onProceedAnyway,
  onRetryPhase,
  isValidating = false,
  className = '',
}: ValidationDashboardProps) {
  const checks = validationResult?.checks || phase.validationChecks;
  const hasFailures = checks.some((c) => !c.passed);
  const allPassed = checks.every((c) => c.passed);
  const canProceed = validationResult?.canProceed ?? false;

  const getCheckIcon = (check: ValidationCheck) => {
    if (check.passed) return '✅';
    switch (check.type) {
      case 'render':
        return '❌';
      case 'console':
        return '⚠️';
      case 'functionality':
        return '❌';
      case 'performance':
        return '⚠️';
      default:
        return '○';
    }
  };

  const getCheckColor = (check: ValidationCheck) => {
    if (check.passed) return 'bg-green-500/10 border-green-500/30 text-green-400';
    switch (check.type) {
      case 'render':
      case 'functionality':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'console':
      case 'performance':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  const getTypeLabel = (type: ValidationCheck['type']) => {
    switch (type) {
      case 'render':
        return '🖼️ Render';
      case 'console':
        return '🖥️ Console';
      case 'functionality':
        return '⚙️ Function';
      case 'performance':
        return '⚡ Perf';
      default:
        return type;
    }
  };

  return (
    <div className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-white/10 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>🔍</span>
          <span>Validation</span>
        </h3>
        {validationResult && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            allPassed 
              ? 'bg-green-500/20 text-green-400'
              : hasFailures
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {allPassed ? 'All Passed' : hasFailures ? 'Issues Found' : 'Warnings'}
          </div>
        )}
      </div>

      {/* Phase Info */}
      <div className="bg-white/5 rounded-lg p-3 mb-4">
        <div className="text-sm font-medium text-white mb-1">
          Phase {phase.order}: {phase.name}
        </div>
        <div className="text-xs text-slate-400">
          {phase.description}
        </div>
      </div>

      {/* Validation Checks */}
      <div className="space-y-2 mb-4">
        {checks.map((check) => (
          <div
            key={check.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getCheckColor(check)}`}
          >
            <span className="text-lg mt-0.5">{getCheckIcon(check)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{check.name}</span>
                <span className="text-xs opacity-70">{getTypeLabel(check.type)}</span>
              </div>
              {check.message && (
                <div className="text-xs opacity-80">{check.message}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {validationResult && hasFailures && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="text-sm text-yellow-200">
              {canProceed ? (
                <>
                  <strong>Warnings detected</strong> - You can proceed, but consider addressing these issues for better quality.
                </>
              ) : (
                <>
                  <strong>Critical issues found</strong> - These must be fixed before proceeding to the next phase.
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRunValidation}
          disabled={isValidating}
          className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isValidating ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Validating...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Run Validation</span>
            </>
          )}
        </button>

        {validationResult && (
          <>
            {allPassed || canProceed ? (
              <button
                onClick={onProceedAnyway}
                className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <span>✅</span>
                <span>Proceed</span>
              </button>
            ) : (
              <button
                onClick={onRetryPhase}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Retry Phase</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Suggestions */}
      {validationResult?.warnings && validationResult.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs font-medium text-slate-400 mb-2">Suggestions</div>
          <ul className="space-y-1">
            {validationResult.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-yellow-400">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ValidationDashboard;
