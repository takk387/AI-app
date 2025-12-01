'use client';

import React, { useState } from 'react';
import type { QualityReport, QualityMetrics, QualityIssue } from '@/types/aiBuilderTypes';

export interface CodeQualityReportProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityReport | null;
  onReanalyze?: () => void;
  isAnalyzing?: boolean;
}

// Helper functions for determining score-based text and background colors
const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 90) return 'bg-green-500/20 border-green-500/30';
  if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30';
  if (score >= 50) return 'bg-orange-500/20 border-orange-500/30';
  return 'bg-red-500/20 border-red-500/30';
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
};

const MetricCard: React.FC<{ label: string; score: number; icon: string }> = ({ label, score, icon }) => (
  <div className={`p-4 rounded-xl border transition-all hover:scale-105 ${getScoreBgColor(score)}`}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-slate-300 font-medium">{label}</span>
    </div>
    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
      {score}
    </div>
    <div className="mt-1 w-full bg-slate-700/50 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${
          score >= 90 ? 'bg-green-500' :
          score >= 70 ? 'bg-yellow-500' :
          score >= 50 ? 'bg-orange-500' : 'bg-red-500'
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export function CodeQualityReport({
  isOpen,
  onClose,
  report,
  onReanalyze,
  isAnalyzing = false,
}: CodeQualityReportProps) {
  const [expandedSeverity, setExpandedSeverity] = useState<string | null>(null);

  if (!isOpen) return null;

  const groupedIssues = report?.issues.reduce((acc, issue) => {
    if (!acc[issue.severity]) acc[issue.severity] = [];
    acc[issue.severity].push(issue);
    return acc;
  }, {} as Record<string, QualityIssue[]>) || {};

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quality-report-title"
    >
      <div
        className="bg-slate-900 rounded-2xl border border-blue-500/30 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-blue-500/30 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h3 id="quality-report-title" className="text-xl font-bold text-white">Code Quality Report</h3>
                {report && (
                  <p className="text-sm text-blue-200/80">
                    Generated {new Date(report.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Close modal"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 text-lg">Analyzing code quality...</p>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-slate-400 text-lg mb-4">No quality report available</p>
              {onReanalyze && (
                <button
                  onClick={onReanalyze}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                >
                  Run Analysis
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="flex items-center justify-center">
                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center ${getScoreBgColor(report.metrics.overall)} border-4`}>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(report.metrics.overall)}`}>
                      {report.metrics.overall}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Overall Score</div>
                  </div>
                </div>
              </div>

              {/* Pass/Fail Status */}
              <div className="flex justify-center">
                <div className={`px-4 py-2 rounded-full border ${
                  report.passed
                    ? 'bg-green-500/20 border-green-500/30 text-green-300'
                    : 'bg-red-500/20 border-red-500/30 text-red-300'
                }`}>
                  {report.passed ? '✓ Quality Check Passed' : '✗ Quality Check Failed'}
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Accessibility" score={report.metrics.accessibility} icon="♿" />
                <MetricCard label="Best Practices" score={report.metrics.bestPractices} icon="✨" />
                <MetricCard label="SEO" score={report.metrics.seo} icon="🔍" />
                <MetricCard label="Code Quality" score={report.metrics.codeQuality} icon="💻" />
              </div>

              {/* Issues List */}
              {report.issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>⚠️</span>
                    Issues ({report.issues.length})
                  </h4>
                  <div className="space-y-3">
                    {severityOrder.map((severity) => {
                      const issues = groupedIssues[severity];
                      if (!issues || issues.length === 0) return null;
                      
                      const isExpanded = expandedSeverity === severity;
                      
                      return (
                        <div key={severity} className="rounded-xl border border-white/10 overflow-hidden">
                          <button
                            onClick={() => setExpandedSeverity(isExpanded ? null : severity)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-all"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full border text-xs font-medium capitalize ${getSeverityColor(severity)}`}>
                                {severity}
                              </span>
                              <span className="text-white">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
                            </div>
                            <span className="text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                          </button>
                          {isExpanded && (
                            <div className="p-4 space-y-3 bg-black/20">
                              {issues.map((issue) => (
                                <div key={issue.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/10">
                                  <div className="flex items-start gap-2">
                                    <span className={`text-xs ${
                                      issue.type === 'error' ? 'text-red-400' :
                                      issue.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                    }`}>
                                      {issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}
                                    </span>
                                    <div className="flex-1">
                                      <p className="text-sm text-slate-300">{issue.message}</p>
                                      {(issue.file || issue.line) && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          {issue.file && <span>{issue.file}</span>}
                                          {issue.line && <span>:{issue.line}</span>}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>💡</span>
            <p>Address issues from highest to lowest severity for best results.</p>
          </div>
          {onReanalyze && !isAnalyzing && (
            <button
              onClick={onReanalyze}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
            >
              🔄 Re-analyze
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CodeQualityReport;
