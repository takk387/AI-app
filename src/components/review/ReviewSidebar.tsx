"use client";

import React from 'react';
import type { ReviewSidebarProps, ChangeCategory, ApprovalStatus } from '@/types/review';
import {
  getCategoryDisplayName,
  getCategoryIcon,
  getRiskLevelColor,
  getRiskLevelBgColor,
  getStatusColor,
} from '@/types/review';

/**
 * ReviewSidebar - Change list sidebar with filters
 * 
 * Features:
 * - List of files with changes
 * - Category and status filters
 * - Visual indicators for risk levels
 * - Approval progress per file
 */
export default function ReviewSidebar({
  changes,
  selectedFilePath,
  onSelectFile,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
}: ReviewSidebarProps) {
  const categories: (ChangeCategory | 'all')[] = [
    'all',
    'structure',
    'styling',
    'logic',
    'content',
    'configuration',
    'dependencies',
  ];

  const statuses: (ApprovalStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected'];

  const getFileIcon = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      ts: '📘',
      tsx: '⚛️',
      js: '📙',
      jsx: '⚛️',
      css: '🎨',
      scss: '🎨',
      json: '📋',
      md: '📝',
      html: '🌐',
    };
    return iconMap[ext] || '📄';
  };

  const getApprovalProgress = (hunks: { status: ApprovalStatus }[]): {
    approved: number;
    rejected: number;
    pending: number;
    total: number;
  } => {
    const approved = hunks.filter(h => h.status === 'approved').length;
    const rejected = hunks.filter(h => h.status === 'rejected').length;
    const pending = hunks.filter(h => h.status === 'pending').length;
    return { approved, rejected, pending, total: hunks.length };
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-white/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-black/20">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <span>📋</span>
          <span>Changes to Review</span>
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
            {changes.length}
          </span>
        </h2>
      </div>

      {/* Filters */}
      <div className="px-3 py-3 border-b border-white/10 space-y-3">
        {/* Category Filter */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value as ChangeCategory | 'all')}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? '📁 All Categories' : `${getCategoryIcon(cat)} ${getCategoryDisplayName(cat)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Status</label>
          <div className="flex gap-1">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => onStatusFilterChange(status)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {changes.length === 0 ? (
          <div className="p-4 text-center">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-sm text-slate-400">No changes to review</p>
          </div>
        ) : (
          <div className="py-2">
            {changes.map((change) => {
              const progress = getApprovalProgress(change.hunks);
              const isSelected = change.path === selectedFilePath;

              return (
                <button
                  key={change.path}
                  onClick={() => onSelectFile(change.path)}
                  className={`w-full px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-l-2 border-blue-500'
                      : 'hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* File Icon */}
                    <span className="text-lg flex-shrink-0">{getFileIcon(change.path)}</span>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium truncate ${
                            isSelected ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {change.path.split('/').pop()}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${getRiskLevelBgColor(
                            change.riskLevel
                          )} ${getRiskLevelColor(change.riskLevel)}`}
                        >
                          {change.riskLevel}
                        </span>
                      </div>

                      {/* Path */}
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {change.path}
                      </p>

                      {/* Category & Action */}
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-slate-400">
                          {getCategoryIcon(change.category)} {getCategoryDisplayName(change.category)}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span
                          className={
                            change.action === 'create'
                              ? 'text-green-400'
                              : change.action === 'delete'
                              ? 'text-red-400'
                              : 'text-yellow-400'
                          }
                        >
                          {change.action}
                        </span>
                      </div>

                      {/* Approval Progress */}
                      <div className="mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-green-400">{progress.approved}✓</span>
                          <span className="text-red-400">{progress.rejected}✗</span>
                          <span className="text-slate-400">{progress.pending}?</span>
                          <span className="text-slate-500">/ {progress.total} hunks</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1 bg-slate-700 rounded-full mt-1 overflow-hidden flex">
                          {progress.approved > 0 && (
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${(progress.approved / progress.total) * 100}%` }}
                            />
                          )}
                          {progress.rejected > 0 && (
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${(progress.rejected / progress.total) * 100}%` }}
                            />
                          )}
                          {progress.pending > 0 && (
                            <div
                              className="h-full bg-slate-500"
                              style={{ width: `${(progress.pending / progress.total) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {changes.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {changes.reduce((sum, c) => sum + c.hunks.length, 0)} total hunks
            </span>
            <span>
              {changes.reduce(
                (sum, c) => sum + c.hunks.filter(h => h.status === 'pending').length,
                0
              )}{' '}
              pending
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
