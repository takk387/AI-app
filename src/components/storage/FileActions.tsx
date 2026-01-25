'use client';

import React from 'react';

interface FileActionsProps {
  selectedCount: number;
  onBulkDownload?: () => void;
  onBulkDelete?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  disabled?: boolean;
}

/**
 * FileActions Component
 *
 * Provides bulk action controls for selected files.
 * Includes download, delete, and selection management.
 */
export function FileActions({
  selectedCount,
  onBulkDownload,
  onBulkDelete,
  onSelectAll,
  onDeselectAll,
  disabled = false,
}: FileActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 bg-gradient-to-r from-garden-600/20 to-gold-600/20 backdrop-blur-sm border border-garden-500/30 rounded-xl p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <span className="text-garden-200 font-semibold">
            {selectedCount} {selectedCount === 1 ? 'file' : 'files'} selected
          </span>
          {onDeselectAll && (
            <button
              onClick={onDeselectAll}
              className="px-2 py-1 rounded text-xs text-garden-300 hover:text-white hover:bg-white/10 transition-all"
              disabled={disabled}
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2">
          {onSelectAll && (
            <button
              onClick={onSelectAll}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
            >
              <span>☑️</span>
              <span>Select All</span>
            </button>
          )}

          {onBulkDownload && (
            <button
              onClick={onBulkDownload}
              className="px-3 py-1.5 rounded-lg bg-garden-600 hover:bg-garden-700 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
            >
              <span>📥</span>
              <span>Download</span>
            </button>
          )}

          {onBulkDelete && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${selectedCount} ${selectedCount === 1 ? 'file' : 'files'}?`
                  )
                ) {
                  onBulkDelete();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-error-600 hover:bg-error-700 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
