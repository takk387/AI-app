'use client';

/**
 * StreamingProgress Component
 *
 * Displays real-time progress during app generation with:
 * - Current phase indicator
 * - File-by-file progress
 * - Elapsed time
 * - Token usage stats
 */

import React, { useEffect, useState } from 'react';
import { type StreamingProgress as ProgressType } from '@/types/streaming';

interface StreamingProgressProps {
  progress: ProgressType;
  onCancel?: () => void;
}

/**
 * Format elapsed time as mm:ss
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get phase icon
 */
function getPhaseIcon(phase: ProgressType['phase']): string {
  switch (phase) {
    case 'starting': return '🚀';
    case 'thinking': return '🧠';
    case 'generating': return '⚡';
    case 'validating': return '🔍';
    case 'complete': return '✅';
    case 'error': return '❌';
    default: return '⏳';
  }
}

/**
 * Get phase color classes
 */
function getPhaseColor(phase: ProgressType['phase']): string {
  switch (phase) {
    case 'starting': return 'text-blue-400';
    case 'thinking': return 'text-purple-400';
    case 'generating': return 'text-yellow-400';
    case 'validating': return 'text-cyan-400';
    case 'complete': return 'text-green-400';
    case 'error': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

export function StreamingProgress({ progress, onCancel }: StreamingProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every 100ms when streaming
  useEffect(() => {
    if (!progress.isStreaming || !progress.startTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - progress.startTime!);
    }, 100);

    return () => clearInterval(interval);
  }, [progress.isStreaming, progress.startTime]);

  if (!progress.isStreaming && progress.phase === 'idle') {
    return null;
  }

  const completedCount = progress.filesCompleted.length;
  const totalCount = progress.totalFiles || completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-xl">
      {/* Header with phase and time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-pulse">{getPhaseIcon(progress.phase)}</span>
          <span className={`font-medium ${getPhaseColor(progress.phase)}`}>
            {progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm font-mono">
            {formatTime(elapsedTime)}
          </span>
          {progress.isStreaming && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Current message */}
      <p className="text-slate-300 text-sm mb-3 truncate">
        {progress.message}
      </p>

      {/* Progress bar */}
      {progress.totalFiles > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Files: {completedCount} / {totalCount}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* File list (compact) */}
      {progress.filesCompleted.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-xs text-slate-500 mb-2">Generated files:</div>
          <div className="flex flex-wrap gap-1">
            {progress.filesCompleted.slice(-6).map((file, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20"
              >
                {file.split('/').pop()}
              </span>
            ))}
            {progress.filesCompleted.length > 6 && (
              <span className="text-xs px-2 py-0.5 text-slate-500">
                +{progress.filesCompleted.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Current file being generated */}
      {progress.currentFile && progress.phase === 'generating' && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-xs text-yellow-400/80 truncate">
            {progress.currentFile}
          </span>
        </div>
      )}

      {/* Stats on completion */}
      {progress.phase === 'complete' && progress.stats.outputTokens > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex gap-4 text-xs text-slate-500">
          <span>Input: {progress.stats.inputTokens.toLocaleString()} tokens</span>
          <span>Output: {progress.stats.outputTokens.toLocaleString()} tokens</span>
          {progress.stats.cachedTokens > 0 && (
            <span className="text-green-400/60">
              Cached: {progress.stats.cachedTokens.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline progress indicator for use in chat
 */
export function InlineStreamingProgress({ progress }: { progress: ProgressType }) {
  if (!progress.isStreaming && progress.phase === 'idle') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="animate-pulse">{getPhaseIcon(progress.phase)}</span>
      <span className={getPhaseColor(progress.phase)}>
        {progress.message || 'Processing...'}
      </span>
      {progress.totalFiles > 0 && (
        <span className="text-slate-500">
          ({progress.filesCompleted.length}/{progress.totalFiles} files)
        </span>
      )}
    </div>
  );
}

export default StreamingProgress;
