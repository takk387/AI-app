'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  A11yCheckResult,
  A11yIssue,
  A11ySeverity,
  A11yCategory,
} from '@/services/AccessibilityChecker';

interface A11yWarningsProps {
  /** Accessibility check result */
  result: A11yCheckResult;
  /** Callback when auto-fix is requested */
  onAutoFix?: (issues: A11yIssue[]) => void;
  /** Callback when single issue is fixed */
  onFixIssue?: (issue: A11yIssue) => void;
  /** Callback when issue is dismissed */
  onDismiss?: (issueId: string) => void;
  /** Optional class name */
  className?: string;
}

const SEVERITY_CONFIG: Record<
  A11ySeverity,
  { icon: string; color: string; bgColor: string; label: string }
> = {
  error: {
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    label: 'Error',
  },
  warning: {
    icon: '⚠️',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    label: 'Warning',
  },
  info: {
    icon: 'ℹ️',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    label: 'Info',
  },
};

const CATEGORY_LABELS: Record<A11yCategory, string> = {
  'color-contrast': 'Color Contrast',
  'touch-target': 'Touch Targets',
  'focus-indicator': 'Focus Indicators',
  'text-size': 'Text Size',
  motion: 'Motion & Animation',
  semantic: 'Semantic HTML',
  'alt-text': 'Alt Text',
  'heading-structure': 'Heading Structure',
  'link-text': 'Link Text',
  'form-labels': 'Form Labels',
};

/**
 * A11yWarnings Component
 *
 * Displays accessibility check results with inline warnings,
 * auto-fix options, and detailed issue descriptions.
 */
export function A11yWarnings({
  result,
  onAutoFix,
  onFixIssue,
  onDismiss,
  className = '',
}: A11yWarningsProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<A11ySeverity | 'all'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter issues
  const filteredIssues = useMemo(() => {
    let issues = result.issues.filter((issue) => !dismissedIds.has(issue.id));

    if (filterSeverity !== 'all') {
      issues = issues.filter((issue) => issue.severity === filterSeverity);
    }

    return issues;
  }, [result.issues, filterSeverity, dismissedIds]);

  // Get auto-fixable issues
  const autoFixableIssues = useMemo(() => {
    return filteredIssues.filter((issue) => issue.canAutoFix);
  }, [filteredIssues]);

  const handleToggleExpand = useCallback((issueId: string) => {
    setExpandedIssue((prev) => (prev === issueId ? null : issueId));
  }, []);

  const handleDismiss = useCallback(
    (issueId: string) => {
      setDismissedIds((prev) => new Set([...prev, issueId]));
      onDismiss?.(issueId);
    },
    [onDismiss]
  );

  const handleFixAll = useCallback(() => {
    if (onAutoFix && autoFixableIssues.length > 0) {
      onAutoFix(autoFixableIssues);
    }
  }, [onAutoFix, autoFixableIssues]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header with score */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Accessibility Check</h3>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
              {result.score}
            </span>
            <span className="text-xs text-slate-400">{getScoreLabel(result.score)}</span>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              result.summary.errors > 0
                ? 'bg-red-500/20 text-red-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {result.summary.errors} errors
          </span>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              result.summary.warnings > 0
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {result.summary.warnings} warnings
          </span>
          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
            {result.summary.info} suggestions
          </span>
        </div>

        {/* WCAG compliance */}
        <div className="flex items-center gap-3 mt-3 text-xs">
          <span className="text-slate-400">WCAG:</span>
          <span
            className={`px-2 py-0.5 rounded ${
              result.wcagCompliance.levelA
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            Level A {result.wcagCompliance.levelA ? '✓' : '✗'}
          </span>
          <span
            className={`px-2 py-0.5 rounded ${
              result.wcagCompliance.levelAA
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            Level AA {result.wcagCompliance.levelAA ? '✓' : '✗'}
          </span>
          <span
            className={`px-2 py-0.5 rounded ${
              result.wcagCompliance.levelAAA
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            Level AAA {result.wcagCompliance.levelAAA ? '✓' : '—'}
          </span>
        </div>
      </div>

      {/* Filter and actions bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
          {(['all', 'error', 'warning', 'info'] as const).map((severity) => (
            <button
              key={severity}
              type="button"
              onClick={() => setFilterSeverity(severity)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filterSeverity === severity
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {severity === 'all' ? 'All' : SEVERITY_CONFIG[severity].label}
            </button>
          ))}
        </div>

        {onAutoFix && autoFixableIssues.length > 0 && (
          <button
            type="button"
            onClick={handleFixAll}
            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Fix {autoFixableIssues.length} Issues
          </button>
        )}
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-sm text-slate-300 font-medium">
              {result.issues.length === 0 ? 'No issues found!' : 'All issues resolved!'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {result.issues.length === 0
                ? 'Your design passes accessibility checks.'
                : 'Great job fixing the accessibility issues.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const severity = SEVERITY_CONFIG[issue.severity];
              const isExpanded = expandedIssue === issue.id;

              return (
                <div
                  key={issue.id}
                  className={`rounded-lg border ${severity.bgColor} overflow-hidden transition-all`}
                >
                  {/* Issue header */}
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(issue.id)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left"
                  >
                    <span className="text-lg flex-shrink-0">{severity.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{issue.title}</span>
                        <span className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                          {CATEGORY_LABELS[issue.category]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {issue.description}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {issue.element && (
                          <div>
                            <span className="text-slate-500">Element:</span>
                            <span className="text-slate-300 ml-2">{issue.element}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">WCAG:</span>
                          <span className="text-slate-300 ml-2">
                            {issue.wcagCriteria} (Level {issue.wcagLevel})
                          </span>
                        </div>
                        {issue.currentValue && (
                          <div>
                            <span className="text-slate-500">Current:</span>
                            <span className="text-red-400 ml-2">{issue.currentValue}</span>
                          </div>
                        )}
                        {issue.requiredValue && (
                          <div>
                            <span className="text-slate-500">Required:</span>
                            <span className="text-green-400 ml-2">{issue.requiredValue}</span>
                          </div>
                        )}
                      </div>

                      {/* Suggestion */}
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-sm">💡</span>
                          <p className="text-xs text-slate-300">{issue.suggestion}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {issue.canAutoFix && onFixIssue && (
                          <button
                            type="button"
                            onClick={() => onFixIssue(issue)}
                            className="flex-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors flex items-center justify-center gap-1.5"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Auto-Fix
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDismiss(issue.id)}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with reset */}
      {dismissedIds.size > 0 && (
        <div className="px-4 py-2 border-t border-slate-700">
          <button
            type="button"
            onClick={() => setDismissedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Show {dismissedIds.size} dismissed issue{dismissedIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export default A11yWarnings;
