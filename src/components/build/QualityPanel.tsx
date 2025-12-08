'use client';

/**
 * Quality Panel
 *
 * Combined Validation + Code Review panel with:
 * - Sequential pipeline: Validation → Code Review → Complete
 * - Side-by-side validation and review results
 * - Quality score ring
 * - Auto-fix log with expandable diffs
 * - Strictness selector
 */

import React, { useState, useCallback } from 'react';
import type { BuildPhase, ValidationCheck, ValidationResult } from '@/types/buildPhases';
import type {
  QualityReport,
  QualityPipelineState,
  AppliedFix,
  ReviewStrictness,
  IssueCategory,
} from '@/types/codeReview';

// ============================================================================
// TYPES
// ============================================================================

interface QualityPanelProps {
  phase: BuildPhase | null;
  validationResult?: ValidationResult;
  qualityReport?: QualityReport | null;
  pipelineState?: QualityPipelineState;
  onRunValidation: () => void;
  onRunReview?: () => void;
  onProceedAnyway: () => void;
  onRetryPhase?: () => void;
  onStrictnessChange?: (strictness: ReviewStrictness) => void;
  isValidating?: boolean;
  isReviewing?: boolean;
  strictness?: ReviewStrictness;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Pipeline progress indicator
 */
function PipelineProgress({
  currentStep,
  validationStatus,
  reviewStatus,
}: {
  currentStep: QualityPipelineState['currentStep'];
  validationStatus: QualityPipelineState['validationStatus'];
  reviewStatus: QualityPipelineState['reviewStatus'];
}) {
  const steps = [
    {
      id: 'validating',
      label: 'Validating',
      status: validationStatus,
      active: currentStep === 'validating',
    },
    {
      id: 'reviewing',
      label: 'Reviewing',
      status: reviewStatus,
      active: currentStep === 'reviewing',
    },
    {
      id: 'complete',
      label: 'Complete',
      status: currentStep === 'complete' ? 'passed' : 'pending',
      active: currentStep === 'complete',
    },
  ];

  return (
    <div className="flex items-center justify-between px-2 py-3 bg-white/5 rounded-lg mb-4">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full transition-all ${
                step.status === 'running'
                  ? 'bg-blue-500 animate-pulse'
                  : step.status === 'passed'
                    ? 'bg-green-500'
                    : step.status === 'failed'
                      ? 'bg-red-500'
                      : step.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-slate-600'
              }`}
            />
            <span
              className={`text-xs font-medium ${step.active ? 'text-white' : 'text-slate-400'}`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && <div className="flex-1 h-px bg-slate-600 mx-2" />}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Quality score ring
 */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStrokeColor = () => {
    if (score >= 90) return '#4ade80';
    if (score >= 70) return '#facc15';
    return '#f87171';
  };

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${getScoreColor()}`}>{score}</span>
        <span className="text-xs text-slate-400">/100</span>
      </div>
    </div>
  );
}

/**
 * Category icon mapping
 */
function getCategoryIcon(category: IssueCategory): string {
  switch (category) {
    case 'syntax_error':
    case 'type_error':
      return '📝';
    case 'security_xss':
    case 'security_injection':
    case 'security_eval':
      return '🔒';
    case 'react_hooks_rule':
    case 'react_missing_key':
    case 'react_missing_deps':
    case 'react_invalid_hook':
      return '⚛️';
    case 'performance_rerender':
    case 'performance_memo':
    case 'performance_expensive':
      return '⚡';
    case 'accessibility':
      return '♿';
    case 'import_unused':
    case 'import_missing':
      return '📦';
    case 'missing_feature':
      return '🎯';
    default:
      return '❓';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QualityPanel({
  phase,
  validationResult,
  qualityReport,
  pipelineState,
  onRunValidation,
  onRunReview,
  onProceedAnyway,
  onRetryPhase,
  onStrictnessChange,
  isValidating = false,
  isReviewing = false,
  strictness = 'standard',
  className = '',
}: QualityPanelProps) {
  // Local state
  const [showAutoFixes, setShowAutoFixes] = useState(false);
  const [showRemainingIssues, setShowRemainingIssues] = useState(false);
  const [selectedFix, setSelectedFix] = useState<AppliedFix | null>(null);

  // Computed values
  const validationChecks = validationResult?.checks || phase?.validationChecks || [];
  const validationPassed = validationChecks.length === 0 || validationChecks.every((c) => c.passed);
  const _hasValidationFailures = validationChecks.some((c) => !c.passed);

  const reviewPassed = qualityReport?.passed ?? true;
  const overallScore = qualityReport?.overallScore ?? 100;
  const fixes = qualityReport?.fixes ?? [];
  const issues = qualityReport?.issues ?? [];

  const canProceed = validationResult?.canProceed ?? false;
  const isChecking = isValidating || isReviewing;

  // Default pipeline state
  const currentPipelineState = pipelineState || {
    currentStep: 'idle',
    validationStatus: 'pending',
    reviewStatus: 'pending',
    fixStatus: 'pending',
    progress: 0,
  };

  // Helpers
  const getValidationCheckIcon = (check: ValidationCheck) => {
    if (check.passed) return '✅';
    switch (check.type) {
      case 'render':
      case 'functionality':
        return '❌';
      case 'console':
      case 'performance':
        return '⚠️';
      default:
        return '○';
    }
  };

  const getValidationCheckColor = (check: ValidationCheck) => {
    if (check.passed) return 'text-green-400';
    switch (check.type) {
      case 'render':
      case 'functionality':
        return 'text-red-400';
      case 'console':
      case 'performance':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  const getReviewCategoryStatus = (category: string) => {
    const categoryIssues = issues.filter((i) => i.category.startsWith(category));
    if (categoryIssues.length === 0) return { icon: '✅', color: 'text-green-400', count: 0 };
    const hasCritical = categoryIssues.some((i) => i.severity === 'critical');
    if (hasCritical) return { icon: '❌', color: 'text-red-400', count: categoryIssues.length };
    return { icon: '⚠️', color: 'text-yellow-400', count: categoryIssues.length };
  };

  // Handle run quality check
  const handleRunQualityCheck = useCallback(() => {
    onRunValidation();
    // Review will be triggered after validation in the parent
    if (onRunReview) {
      setTimeout(onRunReview, 500);
    }
  }, [onRunValidation, onRunReview]);

  // Get overall status badge
  const getStatusBadge = () => {
    if (isChecking) {
      return { text: 'Checking...', color: 'bg-blue-500/20 text-blue-400' };
    }
    if (!qualityReport && !validationResult) {
      return { text: 'Not Run', color: 'bg-slate-500/20 text-slate-400' };
    }
    if (overallScore >= 90 && validationPassed) {
      return { text: 'Passed', color: 'bg-green-500/20 text-green-400' };
    }
    if (overallScore >= 70 || canProceed) {
      return { text: 'Warning', color: 'bg-yellow-500/20 text-yellow-400' };
    }
    return { text: 'Failed', color: 'bg-red-500/20 text-red-400' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-white/10 p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>🛡️</span>
          <span>Quality Check</span>
        </h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
          {statusBadge.text}
        </div>
      </div>

      {/* Pipeline Progress */}
      {isChecking && (
        <PipelineProgress
          currentStep={currentPipelineState.currentStep}
          validationStatus={currentPipelineState.validationStatus}
          reviewStatus={currentPipelineState.reviewStatus}
        />
      )}

      {/* Side-by-side Results */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Validation Column */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
            Validation
          </div>
          <div className="space-y-1">
            {validationChecks.slice(0, 4).map((check) => (
              <div key={check.id} className="flex items-center gap-2 text-sm">
                <span>{getValidationCheckIcon(check)}</span>
                <span className={getValidationCheckColor(check)}>{check.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Review Column */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
            Code Review
          </div>
          <div className="space-y-1">
            {['security', 'react', 'performance', 'syntax'].map((category) => {
              const status = getReviewCategoryStatus(category);
              return (
                <div key={category} className="flex items-center gap-2 text-sm">
                  <span>{status.icon}</span>
                  <span className={status.color}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                    {status.count > 0 && ` (${status.count})`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score Display */}
      {qualityReport && (
        <div className="flex items-center justify-center gap-6 py-4 border-y border-white/10 mb-4">
          <ScoreRing score={overallScore} />
          <div className="text-left">
            <div className="text-2xl font-bold text-white">{overallScore}/100</div>
            <div className="text-sm text-slate-400">Quality Score</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-green-400">✅ {fixes.length} fixed</span>
              <span className="text-xs text-yellow-400">⚠️ {issues.length} remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Fixed Section */}
      {fixes.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAutoFixes(!showAutoFixes)}
            className="w-full flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-left"
          >
            <span className="text-sm font-medium text-green-400">
              ✅ Auto-Fixed ({fixes.length})
            </span>
            <span className="text-green-400">{showAutoFixes ? '▲' : '▼'}</span>
          </button>
          {showAutoFixes && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {fixes.map((fix) => (
                <div
                  key={fix.issueId}
                  className="flex items-start gap-2 p-2 bg-white/5 rounded text-sm"
                >
                  <span>{getCategoryIcon(fix.category)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-300 truncate">{fix.description}</div>
                    <div className="text-xs text-slate-500">{fix.file}</div>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedFix(selectedFix?.issueId === fix.issueId ? null : fix)
                    }
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Diff
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remaining Issues Section */}
      {issues.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowRemainingIssues(!showRemainingIssues)}
            className="w-full flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-left"
          >
            <span className="text-sm font-medium text-yellow-400">
              ⚠️ Remaining Issues ({issues.length})
            </span>
            <span className="text-yellow-400">{showRemainingIssues ? '▲' : '▼'}</span>
          </button>
          {showRemainingIssues && (
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start gap-2 p-2 bg-white/5 rounded text-sm"
                >
                  <span>{getCategoryIcon(issue.category)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-300">{issue.message}</div>
                    {issue.file !== 'project' && (
                      <div className="text-xs text-slate-500">
                        {issue.file}
                        {issue.line && `:${issue.line}`}
                      </div>
                    )}
                    {issue.suggestion && (
                      <div className="text-xs text-blue-400 mt-1">{issue.suggestion}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Fix Diff */}
      {selectedFix && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="text-xs font-medium text-slate-400 mb-2">
            Diff: {selectedFix.description}
          </div>
          <div className="text-xs font-mono">
            <div className="text-red-400 line-through opacity-70">{selectedFix.beforeCode}</div>
            <div className="text-green-400">{selectedFix.afterCode}</div>
          </div>
        </div>
      )}

      {/* Strictness Selector */}
      <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg">
        <span className="text-sm text-slate-400">Strictness:</span>
        <select
          value={strictness}
          onChange={(e) => onStrictnessChange?.(e.target.value as ReviewStrictness)}
          className="bg-slate-700 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="relaxed">Relaxed</option>
          <option value="standard">Standard</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleRunQualityCheck}
          disabled={isChecking}
          className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>{isValidating ? 'Validating...' : 'Reviewing...'}</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Run Check</span>
            </>
          )}
        </button>

        {(validationResult || qualityReport) && (
          <>
            {(validationPassed && reviewPassed) || canProceed ? (
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
                <span>Retry</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default QualityPanel;
