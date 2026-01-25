'use client';

import React, { useState } from 'react';

interface DiffChange {
  type: 'ADD_IMPORT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'REPLACE' | 'DELETE' | 'APPEND';
  searchFor?: string;
  content?: string;
  replaceWith?: string;
}

interface FileDiff {
  path: string;
  action: 'MODIFY' | 'CREATE' | 'DELETE';
  changes: DiffChange[];
}

interface DiffPreviewProps {
  summary: string;
  files: FileDiff[];
  onApprove: () => void;
  onReject: () => void;
}

export default function DiffPreview({ summary, files, onApprove, onReject }: DiffPreviewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(files.map((f) => f.path))
  );

  const toggleFile = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  const getChangeTypeIcon = (type: DiffChange['type']) => {
    const icons = {
      ADD_IMPORT: '➕',
      INSERT_AFTER: '📝',
      INSERT_BEFORE: '📝',
      REPLACE: '🔄',
      DELETE: '❌',
      APPEND: '➕',
    };
    return icons[type];
  };

  const getChangeTypeColor = (type: DiffChange['type']) => {
    const colors = {
      ADD_IMPORT: 'text-success-400',
      INSERT_AFTER: 'text-garden-400',
      INSERT_BEFORE: 'text-garden-400',
      REPLACE: 'text-warning-400',
      DELETE: 'text-error-400',
      APPEND: 'text-success-400',
    };
    return colors[type];
  };

  const getActionIcon = (action: FileDiff['action']) => {
    const icons = {
      MODIFY: '📝',
      CREATE: '➕',
      DELETE: '🗑️',
    };
    return icons[action];
  };

  const getActionColor = (action: FileDiff['action']) => {
    const colors = {
      MODIFY: 'border-garden-500/30 bg-garden-500/10',
      CREATE: 'border-success-500/30 bg-success-500/10',
      DELETE: 'border-error-500/30 bg-error-500/10',
    };
    return colors[action];
  };

  const formatChangeDescription = (change: DiffChange): string => {
    switch (change.type) {
      case 'ADD_IMPORT':
        return `Add import statement`;
      case 'INSERT_AFTER':
        return `Insert code after: "${change.searchFor?.substring(0, 40)}..."`;
      case 'INSERT_BEFORE':
        return `Insert code before: "${change.searchFor?.substring(0, 40)}..."`;
      case 'REPLACE':
        return `Replace: "${change.searchFor?.substring(0, 30)}..." → "${change.replaceWith?.substring(0, 30)}..."`;
      case 'DELETE':
        return `Delete: "${change.searchFor?.substring(0, 40)}..."`;
      case 'APPEND':
        return `Append code to end of file`;
      default:
        return 'Unknown change';
    }
  };

  // Calculate total changes
  const totalChanges = files.reduce((sum, file) => sum + file.changes.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-garden-500/20 to-gold-500/20 border border-garden-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-garden-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">✨</span>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Proposed Changes</h3>
            <p className="text-sm text-garden-200 leading-relaxed">{summary}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-garden-200/80">
              <span>
                📁 {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
              <span>
                🔧 {totalChanges} {totalChanges === 1 ? 'change' : 'changes'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-warning-500/10 border border-warning-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div className="text-sm text-warning-200/90">
            <span className="font-medium">Smart modifications:</span> Only the specific code you
            requested will be changed. Everything else stays exactly the same.
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {files.map((file, fileIdx) => (
          <div
            key={fileIdx}
            className={`border rounded-xl overflow-hidden ${getActionColor(file.action)}`}
          >
            {/* File Header */}
            <button
              onClick={() => toggleFile(file.path)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getActionIcon(file.action)}</span>
                <div className="text-left">
                  <div className="text-white font-medium text-sm">{file.path}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {file.action} • {file.changes.length}{' '}
                    {file.changes.length === 1 ? 'change' : 'changes'}
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  expandedFiles.has(file.path) ? 'rotate-180' : ''
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

            {/* File Changes */}
            {expandedFiles.has(file.path) && (
              <div className="px-4 pb-4 space-y-2">
                {file.changes.map((change, changeIdx) => (
                  <div
                    key={changeIdx}
                    className="bg-black/20 rounded-lg p-3 border border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-lg ${getChangeTypeColor(change.type)}`}>
                        {getChangeTypeIcon(change.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-300 mb-2">
                          {change.type.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-400 mb-2">
                          {formatChangeDescription(change)}
                        </div>

                        {/* Show code preview for certain change types */}
                        {(change.type === 'ADD_IMPORT' || change.type === 'APPEND') &&
                          change.content && (
                            <div className="mt-2">
                              <div className="text-xs text-success-400 mb-1">+ Adding:</div>
                              <pre className="text-xs bg-black/40 rounded p-2 overflow-x-auto text-success-300">
                                <code>
                                  {change.content.substring(0, 200)}
                                  {change.content.length > 200 ? '...' : ''}
                                </code>
                              </pre>
                            </div>
                          )}

                        {change.type === 'REPLACE' && (
                          <div className="mt-2 space-y-2">
                            {change.searchFor && (
                              <div>
                                <div className="text-xs text-error-400 mb-1">- Removing:</div>
                                <pre className="text-xs bg-black/40 rounded p-2 overflow-x-auto text-error-300 line-through">
                                  <code>
                                    {change.searchFor.substring(0, 100)}
                                    {change.searchFor.length > 100 ? '...' : ''}
                                  </code>
                                </pre>
                              </div>
                            )}
                            {change.replaceWith && (
                              <div>
                                <div className="text-xs text-success-400 mb-1">+ Adding:</div>
                                <pre className="text-xs bg-black/40 rounded p-2 overflow-x-auto text-success-300">
                                  <code>
                                    {change.replaceWith.substring(0, 100)}
                                    {change.replaceWith.length > 100 ? '...' : ''}
                                  </code>
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onReject}
          className="flex-1 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all flex items-center justify-center gap-2"
        >
          <span>❌</span>
          <span>Reject Changes</span>
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all shadow-lg hover:shadow-green-500/20 flex items-center justify-center gap-2"
        >
          <span>✅</span>
          <span>Apply Changes</span>
        </button>
      </div>

      {/* Safety Info */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
        <div className="flex items-start gap-2 text-xs text-slate-400">
          <span>🛡️</span>
          <p>
            Your current version will be saved in history before applying these changes. You can
            always undo or revert if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
