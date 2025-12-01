"use client";

import React, { useState } from 'react';
import type { ImpactAnalysisPanelProps } from '@/types/review';
import { getRiskLevelColor, getRiskLevelBgColor } from '@/types/review';

/**
 * ImpactAnalysisPanel - Displays change impact assessment
 * 
 * Features:
 * - Files affected overview
 * - Components that may be impacted
 * - Potential breaking changes
 * - Risk level indicator
 * - Suggested testing areas
 */
export default function ImpactAnalysisPanel({
  analysis,
  expanded: initialExpanded = true,
  onToggleExpand,
}: ImpactAnalysisPanelProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [activeTab, setActiveTab] = useState<'files' | 'components' | 'breaking' | 'tests'>('files');

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggleExpand?.();
  };

  const tabs = [
    { id: 'files', label: 'Files', icon: '📁', count: analysis.filesAffected.length },
    { id: 'components', label: 'Components', icon: '⚛️', count: analysis.componentsAffected.length },
    { id: 'breaking', label: 'Breaking', icon: '⚠️', count: analysis.breakingChanges.length },
    { id: 'tests', label: 'Tests', icon: '🧪', count: analysis.suggestedTests.length },
  ] as const;

  return (
    <div className={`rounded-xl border overflow-hidden ${getRiskLevelBgColor(analysis.overallRisk)}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📊</span>
          <div className="text-left">
            <h3 className="text-white font-semibold">Impact Analysis</h3>
            <p className="text-xs text-slate-400">
              {analysis.filesAffected.length} files • {analysis.componentsAffected.length} components
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Risk Badge */}
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRiskLevelBgColor(
              analysis.overallRisk
            )} ${getRiskLevelColor(analysis.overallRisk)}`}
          >
            {analysis.overallRisk.toUpperCase()} RISK
          </span>
          {/* Expand Icon */}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-white/10">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      tab.id === 'breaking' && tab.count > 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {activeTab === 'files' && (
              <div className="space-y-2">
                {analysis.filesAffected.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No files affected</p>
                ) : (
                  analysis.filesAffected.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5"
                    >
                      <span className="text-blue-400">📄</span>
                      <span className="text-sm text-slate-300 truncate">{file}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'components' && (
              <div className="space-y-2">
                {analysis.componentsAffected.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No components affected</p>
                ) : (
                  analysis.componentsAffected.map((component, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5"
                    >
                      <span className="text-purple-400">⚛️</span>
                      <span className="text-sm text-slate-300">{component}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'breaking' && (
              <div className="space-y-2">
                {analysis.breakingChanges.length === 0 ? (
                  <div className="text-center py-4">
                    <span className="text-3xl block mb-2">✅</span>
                    <p className="text-sm text-green-400">No breaking changes detected</p>
                  </div>
                ) : (
                  analysis.breakingChanges.map((change, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <span className="text-red-400 flex-shrink-0">⚠️</span>
                      <span className="text-sm text-red-300">{change}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-2">
                {analysis.suggestedTests.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No test suggestions</p>
                ) : (
                  analysis.suggestedTests.map((test, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5"
                    >
                      <span className="text-green-400 flex-shrink-0">🧪</span>
                      <span className="text-sm text-slate-300">{test}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dependencies Footer */}
          {analysis.dependencies.length > 0 && (
            <div className="px-4 py-3 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>📦</span>
                <span>Dependencies:</span>
                <div className="flex flex-wrap gap-1">
                  {analysis.dependencies.slice(0, 5).map((dep, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
                    >
                      {dep}
                    </span>
                  ))}
                  {analysis.dependencies.length > 5 && (
                    <span className="text-slate-500">
                      +{analysis.dependencies.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
