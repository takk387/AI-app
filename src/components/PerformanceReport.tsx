'use client';

import React, { useState } from 'react';
import type { PerformanceReport as PerformanceReportType, PerformanceMetrics, PerformanceIssue } from '@/types/aiBuilderTypes';

export interface PerformanceReportProps {
  isOpen: boolean;
  onClose: () => void;
  report: PerformanceReportType | null;
  onRunBenchmark?: () => void;
  isBenchmarking?: boolean;
}

// Helper function to get impact badge class name
const getImpactBadgeClassName = (impact: string): string => {
  const baseClasses = 'px-2 py-1 rounded-full border text-xs font-medium capitalize';
  const colorClasses = getImpactColor(impact);
  const animationClass = impact === 'critical' ? 'animate-pulse' : '';
  return `${baseClasses} ${colorClasses} ${animationClass}`.trim();
};

// Performance thresholds for metrics
const thresholds = {
  loadTime: { good: 1000, ok: 3000 },
  firstContentfulPaint: { good: 1800, ok: 3000 },
  timeToInteractive: { good: 3800, ok: 7300 },
  bundleSize: { good: 200, ok: 500 },
  renderTime: { good: 100, ok: 300 },
};

// Get status based on thresholds
const getMetricStatus = (metric: keyof typeof thresholds, value: number): 'good' | 'ok' | 'poor' => {
  const threshold = thresholds[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.ok) return 'ok';
  return 'poor';
};

const getStatusColor = (status: 'good' | 'ok' | 'poor'): string => {
  switch (status) {
    case 'good': return 'text-green-400';
    case 'ok': return 'text-yellow-400';
    case 'poor': return 'text-red-400';
  }
};

const getStatusBgColor = (status: 'good' | 'ok' | 'poor'): string => {
  switch (status) {
    case 'good': return 'bg-green-500/20 border-green-500/30';
    case 'ok': return 'bg-yellow-500/20 border-yellow-500/30';
    case 'poor': return 'bg-red-500/20 border-red-500/30';
  }
};

const getImpactColor = (impact: string): string => {
  switch (impact) {
    case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'low': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
};

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  metricKey: keyof typeof thresholds;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, metricKey, icon }) => {
  const status = getMetricStatus(metricKey, value);
  const threshold = thresholds[metricKey];
  const progressMax = threshold.ok * 1.5;
  const progressValue = Math.min((value / progressMax) * 100, 100);
  
  return (
    <div className={`p-4 rounded-xl border transition-all hover:scale-105 ${getStatusBgColor(status)}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-slate-300 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
        {value.toLocaleString()}
        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </div>
      <div className="mt-2 w-full bg-slate-700/50 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            status === 'good' ? 'bg-green-500' :
            status === 'ok' ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Good: &lt;{threshold.good}{unit === 'KB' ? 'KB' : 'ms'} | OK: &lt;{threshold.ok}{unit === 'KB' ? 'KB' : 'ms'}
      </div>
    </div>
  );
};

const getOverallStatus = (metrics: PerformanceMetrics): 'good' | 'ok' | 'poor' => {
  const statuses = [
    getMetricStatus('loadTime', metrics.loadTime),
    getMetricStatus('firstContentfulPaint', metrics.firstContentfulPaint),
    getMetricStatus('timeToInteractive', metrics.timeToInteractive),
    getMetricStatus('bundleSize', metrics.bundleSize),
    getMetricStatus('renderTime', metrics.renderTime),
  ];
  
  if (statuses.some(s => s === 'poor')) return 'poor';
  if (statuses.some(s => s === 'ok')) return 'ok';
  return 'good';
};

export function PerformanceReport({
  isOpen,
  onClose,
  report,
  onRunBenchmark,
  isBenchmarking = false,
}: PerformanceReportProps) {
  const [expandedImpact, setExpandedImpact] = useState<string | null>(null);

  if (!isOpen) return null;

  const groupedIssues = report?.issues.reduce((acc, issue) => {
    if (!acc[issue.impact]) acc[issue.impact] = [];
    acc[issue.impact].push(issue);
    return acc;
  }, {} as Record<string, PerformanceIssue[]>) || {};

  const impactOrder = ['critical', 'high', 'medium', 'low'];

  // Compute status labels
  const statusLabels: Record<'good' | 'ok' | 'poor', string> = {
    good: 'Good Performance',
    ok: 'Needs Improvement',
    poor: 'Poor Performance',
  };

  // Helper function to render status content safely
  const renderStatusContent = () => {
    if (!report) return null;
    const status = getOverallStatus(report.metrics);
    return (
      <>
        {/* Overall Status Banner */}
        <div className={`p-4 rounded-xl border text-center ${getStatusBgColor(status)}`}>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">
              {status === 'good' ? '🚀' : status === 'ok' ? '⚠️' : '🐌'}
            </span>
            <div>
              <div className={`text-xl font-bold ${getStatusColor(status)}`}>
                {statusLabels[status]}
              </div>
              <div className="text-sm text-slate-400">
                {report.passed ? 'Performance within acceptable range' : 'Performance needs optimization'}
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Load Time"
            value={report.metrics.loadTime}
            unit="ms"
            metricKey="loadTime"
            icon="⏱️"
          />
          <MetricCard
            label="First Contentful Paint"
            value={report.metrics.firstContentfulPaint}
            unit="ms"
            metricKey="firstContentfulPaint"
            icon="🎨"
          />
          <MetricCard
            label="Time to Interactive"
            value={report.metrics.timeToInteractive}
            unit="ms"
            metricKey="timeToInteractive"
            icon="👆"
          />
          <MetricCard
            label="Bundle Size"
            value={report.metrics.bundleSize}
            unit="KB"
            metricKey="bundleSize"
            icon="📦"
          />
          <MetricCard
            label="Render Time"
            value={report.metrics.renderTime}
            unit="ms"
            metricKey="renderTime"
            icon="🔄"
          />
        </div>
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="performance-report-title"
    >
      <div
        className="bg-slate-900 rounded-2xl border border-purple-500/30 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-purple-500/30 bg-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <div>
                <h3 id="performance-report-title" className="text-xl font-bold text-white">Performance Report</h3>
                {report && (
                  <p className="text-sm text-purple-200/80">
                    Benchmarked {new Date(report.timestamp).toLocaleString()}
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
          {isBenchmarking ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 text-lg">Running performance benchmark...</p>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-slate-400 text-lg mb-4">No performance report available</p>
              {onRunBenchmark && (
                <button
                  onClick={onRunBenchmark}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all"
                >
                  Run Benchmark
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {renderStatusContent()}

              {/* Performance Issues */}
              {report.issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>🔧</span>
                    Performance Issues ({report.issues.length})
                  </h4>
                  <div className="space-y-3">
                    {impactOrder.map((impact) => {
                      const issues = groupedIssues[impact];
                      if (!issues || issues.length === 0) return null;
                      
                      const isExpanded = expandedImpact === impact;
                      
                      return (
                        <div key={impact} className="rounded-xl border border-white/10 overflow-hidden">
                          <button
                            onClick={() => setExpandedImpact(isExpanded ? null : impact)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 transition-all"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-center gap-3">
                              <span className={getImpactBadgeClassName(impact)}>
                                {impact}
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
                                      {issue.recommendation && (
                                        <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                          <p className="text-xs text-blue-300 flex items-start gap-2">
                                            <span>💡</span>
                                            <span>{issue.recommendation}</span>
                                          </p>
                                        </div>
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
            <p>Focus on critical and high impact issues for best performance gains.</p>
          </div>
          {onRunBenchmark && !isBenchmarking && (
            <button
              onClick={onRunBenchmark}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all"
            >
              🔄 Run Benchmark
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PerformanceReport;
