"use client";

import React, { useState } from 'react';
import type { RollbackHistoryProps } from '@/types/review';

/**
 * RollbackHistory - Restore points UI
 * 
 * Features:
 * - List of restore points with timestamps
 * - One-click rollback to any point
 * - Rollback individual files
 * - Delete restore points
 * - Storage management info
 */
export default function RollbackHistory({
  restorePoints,
  onRollbackTo,
  onRollbackFile,
  onDeletePoint,
  maxRestorePoints = 10,
}: RollbackHistoryProps) {
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);
  const [confirmingRollback, setConfirmingRollback] = useState<string | null>(null);

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleRollback = (pointId: string) => {
    if (confirmingRollback === pointId) {
      onRollbackTo(pointId);
      setConfirmingRollback(null);
    } else {
      setConfirmingRollback(pointId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setConfirmingRollback(null), 3000);
    }
  };

  const toggleExpand = (pointId: string) => {
    setExpandedPoint(expandedPoint === pointId ? null : pointId);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕒</span>
            <h3 className="text-white font-semibold">Rollback History</h3>
            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
              {restorePoints.length} / {maxRestorePoints}
            </span>
          </div>
          {restorePoints.length > 0 && (
            <span className="text-xs text-slate-500">
              Oldest points auto-removed when limit reached
            </span>
          )}
        </div>
      </div>

      {/* Restore Points List */}
      <div className="max-h-96 overflow-y-auto">
        {restorePoints.length === 0 ? (
          <div className="p-6 text-center">
            <span className="text-4xl block mb-2">📭</span>
            <p className="text-sm text-slate-400">No restore points yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Restore points are created automatically before applying changes
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {restorePoints.map((point, idx) => (
              <div key={point.id} className="p-3 hover:bg-white/5 transition-all">
                {/* Point Header */}
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => toggleExpand(point.id)}
                    className="flex items-start gap-3 text-left flex-1"
                  >
                    {/* Index Badge */}
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        idx === 0
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {idx === 0 ? '✓' : idx + 1}
                    </span>

                    {/* Point Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm truncate">
                          {point.label}
                        </span>
                        {idx === 0 && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>{formatTimestamp(point.timestamp)}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(point.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>📁 {point.metadata.filesChanged} files</span>
                        {point.metadata.approvedHunks !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-green-400">
                              ✓ {point.metadata.approvedHunks}
                            </span>
                          </>
                        )}
                        {point.metadata.rejectedHunks !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-red-400">
                              ✗ {point.metadata.rejectedHunks}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        expandedPoint === point.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => handleRollback(point.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        confirmingRollback === point.id
                          ? 'bg-yellow-500 text-black animate-pulse'
                          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                      }`}
                    >
                      {confirmingRollback === point.id ? 'Confirm?' : '🔄 Rollback'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete restore point "${point.label}"?`)) {
                          onDeletePoint(point.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete restore point"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Expanded Files List */}
                {expandedPoint === point.id && (
                  <div className="mt-3 ml-9 space-y-1">
                    <p className="text-xs text-slate-400 mb-2">
                      Files in this restore point:
                    </p>
                    {point.files.slice(0, 10).map((file, fileIdx) => (
                      <div
                        key={fileIdx}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-400">📄</span>
                          <span className="text-sm text-slate-300 truncate">
                            {file.path}
                          </span>
                        </div>
                        <button
                          onClick={() => onRollbackFile(point.id, file.path)}
                          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 transition-all flex-shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                    {point.files.length > 10 && (
                      <p className="text-xs text-slate-500 px-3 py-1">
                        +{point.files.length - 10} more files
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {restorePoints.length > 0 && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span>💡</span>
              Click a restore point to see files, then rollback all or individual files
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
