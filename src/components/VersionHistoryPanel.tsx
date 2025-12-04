'use client';

/**
 * VersionHistoryPanel Component
 *
 * Displays version history of layout designs with ability to:
 * - View list of saved versions with timestamps
 * - Compare current design with a previous version
 * - Restore a previous version
 * - Delete versions from history
 */

import React, { useState, useMemo } from 'react';
import type { DesignVersion } from '@/hooks/useLayoutBuilder';
import type { LayoutDesign } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

interface VersionHistoryPanelProps {
  versions: DesignVersion[];
  currentVersionId: string | null;
  currentDesign: Partial<LayoutDesign>;
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onClose: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format relative time (e.g., "2 hours ago", "Just now")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Get trigger icon
 */
function getTriggerIcon(trigger: 'save' | 'apply' | 'manual'): string {
  switch (trigger) {
    case 'save':
      return 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4';
    case 'apply':
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    case 'manual':
      return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
    default:
      return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
  }
}

/**
 * Get trigger label
 */
function getTriggerLabel(trigger: 'save' | 'apply' | 'manual'): string {
  switch (trigger) {
    case 'save':
      return 'Saved';
    case 'apply':
      return 'Applied';
    case 'manual':
      return 'Snapshot';
    default:
      return 'Unknown';
  }
}

/**
 * Compare two designs and return list of differences
 */
function compareDesigns(current: Partial<LayoutDesign>, previous: Partial<LayoutDesign>): string[] {
  const differences: string[] = [];

  // Compare base preferences
  if (current.basePreferences?.style !== previous.basePreferences?.style) {
    differences.push(
      `Style: ${previous.basePreferences?.style} → ${current.basePreferences?.style}`
    );
  }
  if (current.basePreferences?.colorScheme !== previous.basePreferences?.colorScheme) {
    differences.push(
      `Color Scheme: ${previous.basePreferences?.colorScheme} → ${current.basePreferences?.colorScheme}`
    );
  }
  if (current.basePreferences?.layout !== previous.basePreferences?.layout) {
    differences.push(
      `Layout: ${previous.basePreferences?.layout} → ${current.basePreferences?.layout}`
    );
  }

  // Compare colors
  if (current.globalStyles?.colors?.primary !== previous.globalStyles?.colors?.primary) {
    differences.push(`Primary Color changed`);
  }
  if (current.globalStyles?.colors?.secondary !== previous.globalStyles?.colors?.secondary) {
    differences.push(`Secondary Color changed`);
  }

  // Compare typography
  if (
    current.globalStyles?.typography?.fontFamily !== previous.globalStyles?.typography?.fontFamily
  ) {
    differences.push(
      `Font: ${previous.globalStyles?.typography?.fontFamily} → ${current.globalStyles?.typography?.fontFamily}`
    );
  }

  // Compare effects
  if (
    current.globalStyles?.effects?.borderRadius !== previous.globalStyles?.effects?.borderRadius
  ) {
    differences.push(
      `Border Radius: ${previous.globalStyles?.effects?.borderRadius} → ${current.globalStyles?.effects?.borderRadius}`
    );
  }
  if (current.globalStyles?.effects?.shadows !== previous.globalStyles?.effects?.shadows) {
    differences.push(
      `Shadows: ${previous.globalStyles?.effects?.shadows} → ${current.globalStyles?.effects?.shadows}`
    );
  }

  // Compare structure
  if (current.structure?.hasHeader !== previous.structure?.hasHeader) {
    differences.push(
      `Header: ${previous.structure?.hasHeader ? 'visible' : 'hidden'} → ${current.structure?.hasHeader ? 'visible' : 'hidden'}`
    );
  }
  if (current.structure?.hasSidebar !== previous.structure?.hasSidebar) {
    differences.push(
      `Sidebar: ${previous.structure?.hasSidebar ? 'visible' : 'hidden'} → ${current.structure?.hasSidebar ? 'visible' : 'hidden'}`
    );
  }
  if (current.structure?.hasFooter !== previous.structure?.hasFooter) {
    differences.push(
      `Footer: ${previous.structure?.hasFooter ? 'visible' : 'hidden'} → ${current.structure?.hasFooter ? 'visible' : 'hidden'}`
    );
  }

  return differences.length > 0 ? differences : ['No significant changes detected'];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Version list item
 */
function VersionItem({
  version,
  isCurrentVersion,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
}: {
  version: DesignVersion;
  isCurrentVersion: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-blue-600/20 border-blue-500'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={getTriggerIcon(version.trigger)}
              />
            </svg>
            <span className="font-medium text-sm text-white truncate">{version.name}</span>
            {isCurrentVersion && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-600/20 text-green-400 rounded">
                CURRENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span>{formatRelativeTime(version.savedAt)}</span>
            <span>•</span>
            <span>{getTriggerLabel(version.trigger)}</span>
          </div>
          {version.description && (
            <p className="mt-1 text-xs text-slate-500 truncate">{version.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isCurrentVersion && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore();
              }}
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
              title="Restore this version"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            title="Delete this version"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </button>
  );
}

/**
 * Comparison view
 */
function ComparisonView({
  currentDesign,
  selectedVersion,
}: {
  currentDesign: Partial<LayoutDesign>;
  selectedVersion: DesignVersion;
}) {
  const differences = useMemo(
    () => compareDesigns(currentDesign, selectedVersion.design),
    [currentDesign, selectedVersion.design]
  );

  return (
    <div className="border-t border-slate-700 pt-4 mt-4">
      <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        Changes from &ldquo;{selectedVersion.name}&rdquo;
      </h4>
      <div className="space-y-1">
        {differences.map((diff, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-2 py-1.5 rounded"
          >
            <svg
              className="w-3 h-3 text-blue-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{diff}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VersionHistoryPanel({
  versions,
  currentVersionId,
  currentDesign,
  onRestore,
  onDelete,
  onClose,
}: VersionHistoryPanelProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  const handleDelete = (versionId: string) => {
    if (confirmDelete === versionId) {
      onDelete(versionId);
      setConfirmDelete(null);
      if (selectedVersionId === versionId) {
        setSelectedVersionId(null);
      }
    } else {
      setConfirmDelete(versionId);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-400"
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
            <h3 className="text-sm font-semibold text-white">Version History</h3>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-300 rounded">
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto text-slate-600 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-slate-400">No versions saved yet</p>
              <p className="text-xs text-slate-500 mt-1">Save your design to create a version</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isCurrentVersion={version.id === currentVersionId}
                  isSelected={version.id === selectedVersionId}
                  onSelect={() =>
                    setSelectedVersionId(selectedVersionId === version.id ? null : version.id)
                  }
                  onRestore={() => onRestore(version.id)}
                  onDelete={() => handleDelete(version.id)}
                />
              ))}
            </div>
          )}

          {/* Comparison View */}
          {selectedVersion && selectedVersion.id !== currentVersionId && (
            <ComparisonView currentDesign={currentDesign} selectedVersion={selectedVersion} />
          )}

          {/* Delete Confirmation */}
          {confirmDelete && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
              Click delete again to confirm
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-500 text-center">
            Versions are saved automatically when you save or apply designs
          </p>
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryPanel;
