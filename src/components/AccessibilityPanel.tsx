'use client';

/**
 * Accessibility Panel Component
 *
 * Displays WCAG accessibility analysis for the current design:
 * - Overall accessibility score and grade
 * - List of issues with severity levels
 * - Passed checks summary
 * - Auto-fix suggestions for common issues
 */

import React, { useMemo, useState } from 'react';
import type { LayoutDesign, ColorSettings } from '@/types/layoutDesign';
import {
  checkDesignAccessibility,
  getAutoFixSuggestions,
  type AccessibilityReport,
  type AccessibilityIssue,
} from '@/utils/accessibilityChecker';

// ============================================================================
// TYPES
// ============================================================================

interface AccessibilityPanelProps {
  design: LayoutDesign;
  onAutoFix?: (fixes: Partial<ColorSettings>) => void;
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Circular score indicator
 */
function ScoreCircle({ score, grade }: { score: number; grade: string }) {
  // Calculate circle properties
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  // Determine color based on score
  const getScoreColor = () => {
    if (score >= 90) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10' };
    if (score >= 80) return { stroke: '#84cc16', text: 'text-lime-400', bg: 'bg-lime-500/10' };
    if (score >= 70) return { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    if (score >= 60) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const colors = getScoreColor();

  return (
    <div
      className={`relative inline-flex items-center justify-center ${colors.bg} rounded-full p-2`}
    >
      <svg width="88" height="88" className="-rotate-90">
        {/* Background circle */}
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-700"
        />
        {/* Progress circle */}
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-xs text-slate-400">{grade}</span>
      </div>
    </div>
  );
}

/**
 * Issue card component
 */
function IssueCard({
  issue,
  onFix,
  expanded,
  onToggle,
}: {
  issue: AccessibilityIssue;
  onFix?: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isError = issue.type === 'error';

  return (
    <div
      className={`rounded-lg border ${
        isError ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-start gap-2 text-left"
      >
        {/* Icon */}
        <span className={`mt-0.5 ${isError ? 'text-red-400' : 'text-yellow-400'}`}>
          {isError ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-medium ${isError ? 'text-red-300' : 'text-yellow-300'}`}>
              {issue.element}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
              WCAG {issue.wcagCriterion} ({issue.wcagLevel})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{issue.message}</p>
        </div>

        {/* Expand icon */}
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
          {issue.currentValue && (
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="text-slate-500">Current:</span>
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {issue.currentValue}
              </code>
            </div>
          )}

          {issue.suggestedValue && (
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="text-slate-500">Suggested:</span>
              <code className="px-1.5 py-0.5 rounded bg-green-900/30 text-green-300 font-mono">
                {issue.suggestedValue}
              </code>
            </div>
          )}

          {issue.details && <p className="text-xs text-slate-500 mb-2">{issue.details}</p>}

          {issue.suggestedValue && onFix && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFix();
              }}
              className="mt-1 px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
            >
              Apply Fix
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Passed checks section
 */
function PassedChecks({ checks }: { checks: AccessibilityReport['passedChecks'] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm">{checks.length} checks passed</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul className="mt-2 space-y-1.5 pl-6">
          {checks.map((check) => (
            <li key={check.id} className="text-xs text-slate-400 flex items-start gap-2">
              <span className="text-green-500 mt-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span>
                <strong className="text-slate-300">{check.element}:</strong> {check.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Summary bar
 */
function SummaryBar({ summary }: { summary: AccessibilityReport['summary'] }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {summary.errors > 0 && (
        <span className="flex items-center gap-1 text-red-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" />
          </svg>
          {summary.errors} errors
        </span>
      )}
      {summary.warnings > 0 && (
        <span className="flex items-center gap-1 text-yellow-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" />
          </svg>
          {summary.warnings} warnings
        </span>
      )}
      <span className="flex items-center gap-1 text-green-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="4" />
        </svg>
        {summary.passed} passed
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AccessibilityPanel({ design, onAutoFix, className = '' }: AccessibilityPanelProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  // Run accessibility check
  const report = useMemo(() => checkDesignAccessibility(design), [design]);

  // Get auto-fix suggestions
  const fixes = useMemo(() => {
    const colors = design.globalStyles?.colors || {};
    return getAutoFixSuggestions(report, colors);
  }, [report, design.globalStyles?.colors]);

  // Handle applying a single fix
  const handleApplyFix = (issueId: string) => {
    if (!onAutoFix) return;

    const issue = report.issues.find((i) => i.id === issueId);
    if (!issue?.suggestedValue) return;

    // Map issue ID to fix
    const fixMap: Record<string, Partial<ColorSettings>> = {
      'text-contrast': { text: issue.suggestedValue },
      'muted-text-contrast': { textMuted: issue.suggestedValue },
      'link-contrast': { primary: issue.suggestedValue },
      'text-on-surface-contrast': { text: issue.suggestedValue },
    };

    const fix = fixMap[issueId];
    if (fix) {
      onAutoFix(fix);
    }
  };

  // Handle applying all fixes
  const handleApplyAllFixes = () => {
    if (!onAutoFix || Object.keys(fixes).length === 0) return;
    onAutoFix(fixes);
  };

  // Get label based on score
  const getScoreLabel = () => {
    if (report.score >= 90) return 'Excellent';
    if (report.score >= 80) return 'Good';
    if (report.score >= 70) return 'Fair';
    if (report.score >= 60) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with score */}
      <div className="flex items-center gap-4">
        <ScoreCircle score={report.score} grade={report.grade} />
        <div className="flex-1">
          <div className="text-lg font-medium text-white">{getScoreLabel()}</div>
          <SummaryBar summary={report.summary} />
        </div>
      </div>

      {/* Auto-fix all button */}
      {Object.keys(fixes).length > 0 && onAutoFix && (
        <button
          type="button"
          onClick={handleApplyAllFixes}
          className="w-full px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Fix All Issues ({Object.keys(fixes).length})
        </button>
      )}

      {/* Issues list */}
      {report.issues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Issues Found</div>
          {report.issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              expanded={expandedIssue === issue.id}
              onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
              onFix={issue.suggestedValue ? () => handleApplyFix(issue.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* No issues state */}
      {report.issues.length === 0 && (
        <div className="text-center py-6 bg-green-500/10 rounded-lg border border-green-500/20">
          <svg
            className="w-12 h-12 mx-auto text-green-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <div className="text-green-400 font-medium">All checks passed!</div>
          <div className="text-xs text-slate-500 mt-1">
            Your design meets WCAG accessibility standards
          </div>
        </div>
      )}

      {/* Passed checks */}
      {report.passedChecks.length > 0 && <PassedChecks checks={report.passedChecks} />}

      {/* WCAG reference link */}
      <div className="pt-2 border-t border-slate-700">
        <a
          href="https://www.w3.org/WAI/WCAG21/quickref/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          WCAG 2.1 Quick Reference
        </a>
      </div>
    </div>
  );
}

export default AccessibilityPanel;
