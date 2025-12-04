'use client';

import React from 'react';
import type { StorageStats as StorageStatsType } from '@/types/storage';

interface StorageStatsProps {
  stats: StorageStatsType;
  onUpgrade?: () => void;
}

/**
 * StorageStats Component
 * 
 * Displays storage usage, quota, and breakdown by file type.
 * Shows warnings when approaching quota limits.
 */
export function StorageStats({ stats, onUpgrade }: StorageStatsProps) {
  // Calculate usage percentage (handle undefined quota)
  const usagePercentage = stats.quota && stats.quota > 0 
    ? (stats.totalSize / stats.quota) * 100 
    : 0;
  
  // Determine warning level
  const isWarning = usagePercentage >= 80;
  const isCritical = usagePercentage >= 95;
  
  // Format bytes to human-readable
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Get progress bar color based on usage
  const getProgressColor = (): string => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Get icon based on usage
  const getIcon = (): string => {
    if (isCritical) return '🚨';
    if (isWarning) return '⚠️';
    return '💾';
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getIcon()}</span>
          <h3 className="text-white font-semibold text-sm">Storage Usage</h3>
        </div>
        {onUpgrade && (isWarning || isCritical) && (
          <button
            onClick={onUpgrade}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-all"
            aria-label="Upgrade storage"
          >
            ⬆️ Upgrade
          </button>
        )}
      </div>

      {/* Usage Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-slate-300">
            {formatBytes(stats.totalSize)} used
          </span>
          <span className="text-slate-400">
            {stats.quota ? `of ${formatBytes(stats.quota)}` : '(no quota)'}
          </span>
        </div>
        
        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={usagePercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Storage usage: ${usagePercentage.toFixed(1)}%`}
          />
        </div>
        
        <div className="mt-1 text-xs text-slate-400 text-center">
          {usagePercentage.toFixed(1)}% used
        </div>
      </div>

      {/* Warning Messages */}
      {isCritical && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-start gap-2">
            <span className="text-red-400 text-lg">🚨</span>
            <div>
              <p className="text-red-200 text-xs font-medium mb-1">
                Storage Almost Full!
              </p>
              <p className="text-red-200/70 text-xs">
                You&apos;re using {usagePercentage.toFixed(1)}% of your storage. Delete some files or upgrade to continue uploading.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {isWarning && !isCritical && (
        <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-200 text-xs font-medium mb-1">
                Storage Running Low
              </p>
              <p className="text-yellow-200/70 text-xs">
                You&apos;ve used {usagePercentage.toFixed(1)}% of your storage quota.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Count and Type Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/30 rounded-lg p-2">
          <div className="text-slate-400 text-xs mb-1">Total Files</div>
          <div className="text-white font-semibold text-lg">
            {stats.totalFiles}
          </div>
        </div>
        
        <div className="bg-slate-800/30 rounded-lg p-2">
          <div className="text-slate-400 text-xs mb-1">Available</div>
          <div className="text-white font-semibold text-lg">
            {stats.quota ? formatBytes(stats.quota - stats.totalSize) : 'N/A'}
          </div>
        </div>
      </div>

      {/* File Type Breakdown (if provided) */}
      {stats.byType && Object.keys(stats.byType).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-slate-400 text-xs mb-2">By Type</div>
          <div className="space-y-1">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1].fileCount - a[1].fileCount)
              .slice(0, 5)
              .map(([type, data]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 capitalize">{type}</span>
                  <span className="text-slate-400">{data.fileCount}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
