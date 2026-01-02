'use client';

import { useState, useCallback, useMemo } from 'react';
import type { DesignVersion } from '@/types/layoutDesign';

interface HistoryTimelineProps {
  /** Version history */
  versions: DesignVersion[];
  /** Current version ID */
  currentVersionId?: string;
  /** Callback when version is selected */
  onSelectVersion: (version: DesignVersion) => void;
  /** Callback when version is restored */
  onRestoreVersion: (version: DesignVersion) => void;
  /** Callback when version is named */
  onNameVersion?: (versionId: string, name: string) => void;
  /** Optional class name */
  className?: string;
}

/**
 * HistoryTimeline Component
 *
 * Visual history timeline with thumbnails and version management.
 * Supports naming versions, previewing, and restoring.
 */
export function HistoryTimeline({
  versions,
  currentVersionId,
  onSelectVersion,
  onRestoreVersion,
  onNameVersion,
  className = '',
}: HistoryTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [filter, setFilter] = useState<'all' | 'named'>('all');

  // Filter versions
  const filteredVersions = useMemo(() => {
    if (filter === 'named') {
      return versions.filter((v) => v.name);
    }
    return versions;
  }, [versions, filter]);

  // Group versions by date
  const groupedVersions = useMemo(() => {
    const groups: Record<string, DesignVersion[]> = {};

    filteredVersions.forEach((version) => {
      const date = new Date(version.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(version);
    });

    return groups;
  }, [filteredVersions]);

  const handleSelect = useCallback(
    (version: DesignVersion) => {
      setSelectedId(version.id);
      onSelectVersion(version);
    },
    [onSelectVersion]
  );

  const handleRestore = useCallback(
    (version: DesignVersion) => {
      onRestoreVersion(version);
    },
    [onRestoreVersion]
  );

  const handleStartRename = useCallback((version: DesignVersion) => {
    setEditingNameId(version.id);
    setEditName(version.name || '');
  }, []);

  const handleSaveRename = useCallback(
    (versionId: string) => {
      if (onNameVersion && editName.trim()) {
        onNameVersion(versionId, editName.trim());
      }
      setEditingNameId(null);
      setEditName('');
    },
    [onNameVersion, editName]
  );

  const handleCancelRename = useCallback(() => {
    setEditingNameId(null);
    setEditName('');
  }, []);

  const formatTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (timestamp: Date | string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatTime(timestamp);
  };

  if (versions.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">No version history yet</p>
        <p className="text-slate-500 text-xs mt-1">Changes will appear here as you design</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with filter */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">Version History</h3>
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('named')}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              filter === 'named' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Named
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedVersions).map(([date, dateVersions]) => (
          <div key={date} className="mb-6 last:mb-0">
            {/* Date header */}
            <div className="text-xs text-slate-500 font-medium mb-3">{date}</div>

            {/* Version items */}
            <div className="space-y-2">
              {dateVersions.map((version, index) => {
                const isSelected = selectedId === version.id;
                const isCurrent = currentVersionId === version.id;
                const isEditing = editingNameId === version.id;

                return (
                  <div
                    key={version.id}
                    className={`relative group rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : isCurrent
                          ? 'border-green-500/50 bg-green-500/5'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                    onClick={() => handleSelect(version)}
                  >
                    {/* Timeline connector */}
                    {index < dateVersions.length - 1 && (
                      <div className="absolute left-6 top-full w-0.5 h-2 bg-slate-700" />
                    )}

                    <div className="p-3">
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        {/* Thumbnail or icon */}
                        {version.thumbnail ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-900 flex-shrink-0">
                            <img
                              src={version.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-5 h-5 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Name or description */}
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                                placeholder="Version name..."
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(version.id);
                                  if (e.key === 'Escape') handleCancelRename();
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveRename(version.id);
                                }}
                                className="p-1 text-green-400 hover:text-green-300"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRename();
                                }}
                                className="p-1 text-slate-400 hover:text-slate-300"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {version.name ? (
                                <span className="text-sm font-medium text-white truncate">
                                  {version.name}
                                </span>
                              ) : (
                                <span className="text-sm text-slate-300 truncate">
                                  {version.description}
                                </span>
                              )}
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                                  Current
                                </span>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span>{getRelativeTime(version.timestamp)}</span>
                            {version.changedElements && version.changedElements.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{version.changedElements.length} element(s) changed</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons - shown on hover or when selected */}
                      <div
                        className={`flex items-center gap-2 mt-3 pt-2 border-t border-slate-700 ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        } transition-opacity`}
                      >
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(version);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                          >
                            Restore
                          </button>
                        )}
                        {onNameVersion && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(version);
                            }}
                            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
                          >
                            {version.name ? 'Rename' : 'Name'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
        {versions.length} version{versions.length !== 1 ? 's' : ''} •{' '}
        {versions.filter((v) => v.name).length} named
      </div>
    </div>
  );
}

export default HistoryTimeline;
