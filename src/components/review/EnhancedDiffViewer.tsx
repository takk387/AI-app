"use client";

import React, { useState, useCallback, useRef } from 'react';
import type {
  EnhancedDiffViewerProps,
  DiffHunk,
  DiffLine,
} from '@/types/review';
import { getStatusBgColor } from '@/types/review';
import HunkApprovalCard from './HunkApprovalCard';
import CommentThread from './CommentThread';

/**
 * EnhancedDiffViewer - Side-by-side diff comparison component
 * 
 * Features:
 * - Side-by-side view of original and modified code
 * - Syntax highlighting indication through line coloring
 * - Line numbers
 * - Change indicators (added, removed, modified)
 * - Expandable context around changes
 * - Hunk-level approval/rejection
 * - Inline commenting
 */
export default function EnhancedDiffViewer({
  original,
  modified,
  fileName,
  language,
  hunks,
  onHunkApprove,
  onHunkReject,
  onAddComment,
  showLineNumbers = true,
  contextLines = 3,
}: EnhancedDiffViewerProps) {
  const [expandedHunks, setExpandedHunks] = useState<Set<string>>(
    new Set(hunks.map(h => h.id))
  );
  const [commentingLine, setCommentingLine] = useState<{
    hunkId: string;
    lineNumber: number;
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const toggleHunk = useCallback((hunkId: string) => {
    setExpandedHunks(prev => {
      const next = new Set(prev);
      if (next.has(hunkId)) {
        next.delete(hunkId);
      } else {
        next.add(hunkId);
      }
      return next;
    });
  }, []);

  const handleLineClick = useCallback((hunkId: string, lineNumber: number) => {
    setCommentingLine({ hunkId, lineNumber });
    setCommentText('');
  }, []);

  const handleAddComment = useCallback(
    (content: string) => {
      if (commentingLine && content.trim()) {
        onAddComment(commentingLine.lineNumber, content.trim());
        setCommentingLine(null);
        setCommentText('');
      }
    },
    [commentingLine, onAddComment]
  );

  const handleSubmitComment = useCallback(() => {
    handleAddComment(commentText);
  }, [handleAddComment, commentText]);

  const getLineTypeClass = (type: DiffLine['type']): string => {
    switch (type) {
      case 'added':
        return 'bg-green-500/20 border-l-2 border-green-500';
      case 'removed':
        return 'bg-red-500/20 border-l-2 border-red-500';
      default:
        return 'bg-transparent';
    }
  };

  const getLineNumberClass = (type: DiffLine['type']): string => {
    switch (type) {
      case 'added':
        return 'text-green-400';
      case 'removed':
        return 'text-red-400';
      default:
        return 'text-slate-500';
    }
  };

  const getLanguageExtension = (): string => {
    const ext = fileName.split('.').pop() || '';
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
      html: 'html',
    };
    return langMap[ext] || language || 'plaintext';
  };

  // If no hunks provided, create a simple diff view
  if (hunks.length === 0) {
    return (
      <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
        <div className="px-4 py-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="text-white font-medium">{fileName}</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {getLanguageExtension()}
            </span>
          </div>
        </div>
        <div className="p-4 text-slate-400 text-sm">
          No changes to display
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
      {/* File Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="text-white font-medium">{fileName}</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {getLanguageExtension()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'added').length, 0)} added
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'removed').length, 0)} removed
            </span>
          </div>
        </div>
      </div>

      {/* Hunks */}
      <div className="divide-y divide-white/5">
        {hunks.map((hunk) => (
          <div key={hunk.id} className={`border-l-4 ${getStatusBgColor(hunk.status)}`}>
            {/* Hunk Header */}
            <HunkApprovalCard
              hunk={hunk}
              onApprove={() => onHunkApprove(hunk.id)}
              onReject={() => onHunkReject(hunk.id)}
              onReset={() => {}}
              expanded={expandedHunks.has(hunk.id)}
              onToggleExpand={() => toggleHunk(hunk.id)}
            />

            {/* Hunk Content */}
            {expandedHunks.has(hunk.id) && (
              <div className="overflow-x-auto">
                {/* Side-by-side view */}
                <div className="grid grid-cols-2 divide-x divide-white/10">
                  {/* Original (Left) */}
                  <div className="min-w-0">
                    <div className="px-3 py-1.5 bg-red-500/10 border-b border-white/5">
                      <span className="text-xs text-red-400 font-medium">Original</span>
                    </div>
                    <div className="font-mono text-xs">
                      {hunk.lines.map((line, idx) => (
                        <div
                          key={`orig-${idx}`}
                          className={`flex ${
                            line.type === 'removed'
                              ? 'bg-red-500/20'
                              : line.type === 'added'
                              ? 'opacity-0 h-0 overflow-hidden'
                              : 'bg-transparent'
                          }`}
                        >
                          {showLineNumbers && line.type !== 'added' && (
                            <span
                              className={`w-12 px-2 py-0.5 text-right select-none border-r border-white/5 ${getLineNumberClass(
                                line.type
                              )}`}
                            >
                              {line.originalNumber || line.number}
                            </span>
                          )}
                          {line.type !== 'added' && (
                            <span
                              className={`flex-1 px-3 py-0.5 whitespace-pre ${
                                line.type === 'removed' ? 'text-red-300' : 'text-slate-300'
                              }`}
                            >
                              {line.type === 'removed' && (
                                <span className="text-red-500 mr-1">-</span>
                              )}
                              {line.content}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modified (Right) */}
                  <div className="min-w-0">
                    <div className="px-3 py-1.5 bg-green-500/10 border-b border-white/5">
                      <span className="text-xs text-green-400 font-medium">Modified</span>
                    </div>
                    <div className="font-mono text-xs">
                      {hunk.lines.map((line, idx) => (
                        <div
                          key={`mod-${idx}`}
                          className={`flex group ${
                            line.type === 'added'
                              ? 'bg-green-500/20'
                              : line.type === 'removed'
                              ? 'opacity-0 h-0 overflow-hidden'
                              : 'bg-transparent'
                          }`}
                        >
                          {showLineNumbers && line.type !== 'removed' && (
                            <span
                              className={`w-12 px-2 py-0.5 text-right select-none border-r border-white/5 ${getLineNumberClass(
                                line.type
                              )}`}
                            >
                              {line.modifiedNumber || line.number}
                            </span>
                          )}
                          {line.type !== 'removed' && (
                            <>
                              <span
                                className={`flex-1 px-3 py-0.5 whitespace-pre cursor-pointer hover:bg-white/5 ${
                                  line.type === 'added' ? 'text-green-300' : 'text-slate-300'
                                }`}
                                onClick={() => handleLineClick(hunk.id, line.number)}
                              >
                                {line.type === 'added' && (
                                  <span className="text-green-500 mr-1">+</span>
                                )}
                                {line.content}
                              </span>
                              <button
                                onClick={() => handleLineClick(hunk.id, line.number)}
                                className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-blue-400 hover:text-blue-300 transition-opacity"
                                title="Add comment"
                              >
                                💬
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment input */}
                {commentingLine?.hunkId === hunk.id && (
                  <div className="p-3 bg-blue-500/10 border-t border-blue-500/30">
                    <div className="flex items-start gap-2">
                      <span className="text-sm">💬</span>
                      <div className="flex-1">
                        <textarea
                          ref={commentInputRef}
                          autoFocus
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleSubmitComment();
                            }
                            if (e.key === 'Escape') {
                              setCommentingLine(null);
                              setCommentText('');
                            }
                          }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">
                            Line {commentingLine.lineNumber}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setCommentingLine(null);
                                setCommentText('');
                              }}
                              className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmitComment}
                              disabled={!commentText.trim()}
                              className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add Comment
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing comments */}
                {hunk.lines.some(l => l.comments.length > 0) && (
                  <div className="p-3 bg-slate-800/50 border-t border-white/5">
                    {hunk.lines
                      .filter(l => l.comments.length > 0)
                      .map(line => (
                        <div key={line.number} className="mb-2 last:mb-0">
                          <CommentThread
                            comments={line.comments}
                            lineNumber={line.number}
                            onAddComment={(content) => onAddComment(line.number, content)}
                            onResolveComment={() => {}}
                            onDeleteComment={() => {}}
                            onMarkNeedsAttention={() => {}}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
