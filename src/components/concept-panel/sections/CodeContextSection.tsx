'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GitBranchIcon,
  AlertCircleIcon,
  LoaderIcon,
} from '@/components/ui/Icons';
import { useCodeContext } from '@/hooks/useCodeContext';

interface CodeContextSectionProps {
  appId: string;
}

/**
 * Section showing code intelligence from CodeContextService
 * Displays dependency graph stats, key files, and per-phase file tracking
 * Only rendered in ACT mode when CodeContextService has been initialized
 */
export function CodeContextSection({ appId }: CodeContextSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { contextState, isAnalyzing, error, isInitialized, getCacheStats } = useCodeContext(appId);

  // Derive key files sorted by inDegree (most depended-on first)
  const keyFiles = useMemo(() => {
    if (!contextState?.dependencyGraph?.files) return [];
    const entries: Array<{ path: string; inDegree: number; outDegree: number }> = [];
    contextState.dependencyGraph.files.forEach((node, path) => {
      entries.push({ path, inDegree: node.inDegree, outDegree: node.outDegree });
    });
    return entries
      .filter((e) => e.inDegree > 0)
      .sort((a, b) => b.inDegree - a.inDegree)
      .slice(0, 5);
  }, [contextState?.dependencyGraph?.files]);

  // Derive phase file counts
  const phaseFiles = useMemo(() => {
    if (!contextState?.filesByPhase) return [];
    const result: Array<{ phase: number; count: number; files: string[] }> = [];
    contextState.filesByPhase.forEach((files, phase) => {
      result.push({ phase, count: files.length, files });
    });
    return result.sort((a, b) => a.phase - b.phase);
  }, [contextState?.filesByPhase]);

  const stats = contextState?.dependencyGraph?.stats;
  const cacheStats = isInitialized ? getCacheStats() : null;

  // Not initialized state
  if (!isInitialized && !isAnalyzing) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full text-left mb-2"
        >
          {isExpanded ? (
            <ChevronDownIcon size={14} className="text-slate-400" />
          ) : (
            <ChevronRightIcon size={14} className="text-slate-400" />
          )}
          <GitBranchIcon size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wide">Code Intelligence</span>
        </button>
        {isExpanded && (
          <div className="pl-5">
            <p className="text-xs text-slate-500">Activates after Phase 1 completes</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isExpanded ? (
          <ChevronDownIcon size={14} className="text-slate-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-slate-400" />
        )}
        <GitBranchIcon size={14} className="text-garden-400" />
        <span className="text-xs text-slate-500 uppercase tracking-wide">Code Intelligence</span>
        {isAnalyzing && <LoaderIcon size={12} className="text-garden-400 animate-spin ml-1" />}
        {stats && <span className="ml-auto text-xs text-slate-500">{stats.totalFiles} files</span>}
      </button>

      {isExpanded && (
        <div className="pl-5 space-y-3">
          {/* Error state */}
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-error-400">
              <AlertCircleIcon size={12} />
              <span>{error}</span>
            </div>
          )}

          {/* Graph stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-1.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="text-[10px] text-slate-500">Files</div>
                <div className="text-sm text-slate-300">{stats.totalFiles}</div>
              </div>
              <div className="p-1.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="text-[10px] text-slate-500">Edges</div>
                <div className="text-sm text-slate-300">{stats.totalEdges}</div>
              </div>
              <div className="p-1.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="text-[10px] text-slate-500">Depth</div>
                <div className="text-sm text-slate-300">{stats.maxDepth}</div>
              </div>
            </div>
          )}

          {/* Circular dependency warning */}
          {stats && stats.circularDependencies > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-warning-400 p-1.5 rounded bg-warning-500/10">
              <AlertCircleIcon size={12} />
              <span>
                {stats.circularDependencies} circular{' '}
                {stats.circularDependencies === 1 ? 'dependency' : 'dependencies'}
              </span>
            </div>
          )}

          {/* Key files (most depended-on) */}
          {keyFiles.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                Key Files
              </div>
              <div className="space-y-0.5">
                {keyFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <span className="text-slate-400 truncate mr-2">{file.path}</span>
                    <span className="text-slate-500 flex-shrink-0">
                      {file.inDegree} dep{file.inDegree !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files by phase */}
          {phaseFiles.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                Files by Phase
              </div>
              <div className="space-y-0.5">
                {phaseFiles.map(({ phase, count, files }) => (
                  <div
                    key={phase}
                    className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <span className="text-slate-400">Phase {phase}</span>
                    <span className="text-slate-500" title={files.join(', ')}>
                      {count} file{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cache stats (compact) */}
          {cacheStats && cacheStats.hits + cacheStats.misses > 0 && (
            <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-800">
              Cache: {cacheStats.hits}h / {cacheStats.misses}m (
              {Math.round(cacheStats.hitRate * 100)}%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CodeContextSection;
