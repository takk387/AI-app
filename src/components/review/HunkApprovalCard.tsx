"use client";

import React from 'react';
import type { HunkApprovalCardProps } from '@/types/review';
import {
  getCategoryDisplayName,
  getCategoryIcon,
  getStatusColor,
  getStatusBgColor,
} from '@/types/review';

/**
 * HunkApprovalCard - Individual hunk approval/rejection UI
 * 
 * Features:
 * - Shows hunk summary and category
 * - Approve/Reject/Reset buttons
 * - Visual status indicators
 * - Expandable details
 */
export default function HunkApprovalCard({
  hunk,
  onApprove,
  onReject,
  onReset,
  expanded = true,
  onToggleExpand,
}: HunkApprovalCardProps) {
  const addedLines = hunk.lines.filter(l => l.type === 'added').length;
  const removedLines = hunk.lines.filter(l => l.type === 'removed').length;
  const unchangedLines = hunk.lines.filter(l => l.type === 'unchanged').length;

  const getStatusIcon = () => {
    switch (hunk.status) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusLabel = () => {
    switch (hunk.status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const getTypeLabel = () => {
    switch (hunk.type) {
      case 'addition':
        return '➕ Addition';
      case 'deletion':
        return '➖ Deletion';
      default:
        return '🔄 Modification';
    }
  };

  const getTypeColor = () => {
    switch (hunk.type) {
      case 'addition':
        return 'text-green-400';
      case 'deletion':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <div className={`border ${getStatusBgColor(hunk.status)}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 rounded hover:bg-white/10 transition-all"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Status Icon */}
          <span className="text-xl">{getStatusIcon()}</span>

          {/* Hunk Info */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm">
                {hunk.summary || `Lines ${hunk.startLine}-${hunk.endLine}`}
              </span>
              <span className={`text-xs ${getStatusColor(hunk.status)}`}>
                {getStatusLabel()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={getTypeColor()}>{getTypeLabel()}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {getCategoryIcon(hunk.category)}
                {getCategoryDisplayName(hunk.category)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-4">
          {/* Line Stats */}
          <div className="flex items-center gap-3 text-xs">
            {addedLines > 0 && (
              <span className="text-green-400">+{addedLines}</span>
            )}
            {removedLines > 0 && (
              <span className="text-red-400">-{removedLines}</span>
            )}
            {unchangedLines > 0 && (
              <span className="text-slate-500">{unchangedLines} unchanged</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hunk.status === 'pending' ? (
              <>
                <button
                  onClick={onReject}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-medium transition-all hover:scale-105"
                  title="Reject this change"
                >
                  ❌ Reject
                </button>
                <button
                  onClick={onApprove}
                  className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-xs font-medium transition-all hover:scale-105"
                  title="Approve this change"
                >
                  ✅ Approve
                </button>
              </>
            ) : (
              <button
                onClick={onReset}
                className="px-3 py-1.5 rounded-lg bg-slate-500/20 hover:bg-slate-500/30 border border-slate-500/30 text-slate-400 text-xs font-medium transition-all hover:scale-105"
                title="Reset to pending"
              >
                🔄 Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Optional Detailed Stats */}
      {expanded && (
        <div className="px-4 py-2 border-t border-white/5 bg-black/20 flex items-center gap-4 text-xs text-slate-500">
          <span>
            📍 Lines {hunk.startLine}–{hunk.endLine}
          </span>
          {hunk.lines.some(l => l.comments.length > 0) && (
            <span className="flex items-center gap-1 text-blue-400">
              💬 {hunk.lines.reduce((sum, l) => sum + l.comments.length, 0)} comments
            </span>
          )}
        </div>
      )}
    </div>
  );
}
