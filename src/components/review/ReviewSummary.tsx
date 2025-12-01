"use client";

import React from 'react';
import type { ReviewSummaryProps } from '@/types/review';
import {
  getCategoryDisplayName,
  getCategoryIcon,
  getRiskLevelColor,
  getRiskLevelBgColor,
} from '@/types/review';

/**
 * ReviewSummary - Overview of approved/rejected changes
 * 
 * Features:
 * - Summary statistics
 * - Progress visualization
 * - Category breakdown
 * - Apply approved changes button
 * - Impact warning for high-risk changes
 */
export default function ReviewSummary({
  changes,
  totalHunks,
  approvedHunks,
  rejectedHunks,
  pendingHunks,
  impactAnalysis,
  onApplyApproved,
}: ReviewSummaryProps) {
  const approvalPercentage = totalHunks > 0 ? Math.round((approvedHunks / totalHunks) * 100) : 0;
  const rejectionPercentage = totalHunks > 0 ? Math.round((rejectedHunks / totalHunks) * 100) : 0;
  const pendingPercentage = totalHunks > 0 ? Math.round((pendingHunks / totalHunks) * 100) : 0;

  // Group changes by category
  const byCategory = changes.reduce((acc, change) => {
    const cat = change.category;
    if (!acc[cat]) acc[cat] = { count: 0, hunks: 0, approved: 0 };
    acc[cat].count++;
    acc[cat].hunks += change.hunks.length;
    acc[cat].approved += change.hunks.filter(h => h.status === 'approved').length;
    return acc;
  }, {} as Record<string, { count: number; hunks: number; approved: number }>);

  const canApply = approvedHunks > 0;
  const hasHighRisk = impactAnalysis.overallRisk === 'high';
  const hasBreakingChanges = impactAnalysis.breakingChanges.length > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-white font-semibold">Review Summary</h3>
          </div>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRiskLevelBgColor(
              impactAnalysis.overallRisk
            )} ${getRiskLevelColor(impactAnalysis.overallRisk)}`}
          >
            {impactAnalysis.overallRisk.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-400">Review Progress</span>
          <span className="text-sm text-white font-medium">
            {approvedHunks + rejectedHunks} / {totalHunks} reviewed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden flex">
          {approvedHunks > 0 && (
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${approvalPercentage}%` }}
            />
          )}
          {rejectedHunks > 0 && (
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${rejectionPercentage}%` }}
            />
          )}
          {pendingHunks > 0 && (
            <div
              className="h-full bg-slate-500 transition-all"
              style={{ width: `${pendingPercentage}%` }}
            />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center gap-1 text-green-400">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{approvedHunks} Approved ({approvalPercentage}%)</span>
          </div>
          <div className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>{rejectedHunks} Rejected ({rejectionPercentage}%)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
            <span>{pendingHunks} Pending ({pendingPercentage}%)</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-4 border-b border-white/10">
        <h4 className="text-sm text-slate-400 mb-3">By Category</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(byCategory).map(([category, data]) => (
            <div
              key={category}
              className="px-3 py-2 rounded-lg bg-black/20 border border-white/5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {getCategoryIcon(category as any)} {getCategoryDisplayName(category as any)}
                </span>
                <span className="text-xs text-slate-500">{data.count} files</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${data.hunks > 0 ? (data.approved / data.hunks) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-green-400">
                  {data.approved}/{data.hunks}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {(hasHighRisk || hasBreakingChanges) && (
        <div className="p-4 border-b border-white/10 bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h4 className="text-yellow-400 font-medium text-sm mb-1">Review Carefully</h4>
              <ul className="text-xs text-yellow-300/80 space-y-1">
                {hasHighRisk && (
                  <li>• This includes high-risk changes that may affect critical functionality</li>
                )}
                {hasBreakingChanges && (
                  <li>
                    • {impactAnalysis.breakingChanges.length} potential breaking change
                    {impactAnalysis.breakingChanges.length > 1 ? 's' : ''} detected
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Files Summary */}
      <div className="p-4 border-b border-white/10">
        <h4 className="text-sm text-slate-400 mb-2">Files</h4>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white">
            📁 {impactAnalysis.filesAffected.length} affected
          </span>
          <span className="text-purple-400">
            ⚛️ {impactAnalysis.componentsAffected.length} components
          </span>
          {impactAnalysis.suggestedTests.length > 0 && (
            <span className="text-green-400">
              🧪 {impactAnalysis.suggestedTests.length} suggested tests
            </span>
          )}
        </div>
      </div>

      {/* Apply Button */}
      <div className="p-4 bg-black/20">
        <button
          onClick={onApplyApproved}
          disabled={!canApply}
          className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            canApply
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>✅</span>
          <span>
            {canApply
              ? `Apply ${approvedHunks} Approved Change${approvedHunks > 1 ? 's' : ''}`
              : 'No Changes to Apply'}
          </span>
        </button>

        {pendingHunks > 0 && (
          <p className="text-xs text-center text-slate-500 mt-2">
            {pendingHunks} hunk{pendingHunks > 1 ? 's' : ''} still pending review
          </p>
        )}
      </div>
    </div>
  );
}
