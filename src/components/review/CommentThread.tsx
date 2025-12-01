"use client";

import React, { useState } from 'react';
import type { CommentThreadProps } from '@/types/review';

/**
 * CommentThread - Inline commenting system for code review
 * 
 * Features:
 * - Display comments on a specific line
 * - Add new comments
 * - Resolve/unresolve comments
 * - Mark as needs attention
 * - Delete comments
 */
export default function CommentThread({
  comments,
  lineNumber,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onMarkNeedsAttention,
}: CommentThreadProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewComment('');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unresolvedCount = comments.filter(c => !c.resolved).length;
  const needsAttentionCount = comments.filter(c => c.needsAttention).length;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-blue-400">💬</span>
          <span className="text-blue-300 font-medium">
            Line {lineNumber}
          </span>
          <span className="text-blue-400/60">
            • {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
          {unresolvedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
              {unresolvedCount} unresolved
            </span>
          )}
          {needsAttentionCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
              {needsAttentionCount} needs attention
            </span>
          )}
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          + Add Comment
        </button>
      </div>

      {/* Comments List */}
      <div className="divide-y divide-blue-500/10">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`px-3 py-2 ${
              comment.resolved
                ? 'opacity-60'
                : comment.needsAttention
                ? 'bg-red-500/10 border-l-2 border-red-500'
                : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Author & Time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-white">
                    {comment.author}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatTimestamp(comment.timestamp)}
                  </span>
                  {comment.resolved && (
                    <span className="text-xs text-green-400">✓ Resolved</span>
                  )}
                  {comment.needsAttention && (
                    <span className="text-xs text-red-400">⚠️ Needs Attention</span>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onResolveComment(comment.id)}
                  className={`p-1 rounded text-xs transition-colors ${
                    comment.resolved
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : 'text-green-400 hover:text-green-300'
                  }`}
                  title={comment.resolved ? 'Unresolve' : 'Resolve'}
                >
                  {comment.resolved ? '↩️' : '✓'}
                </button>
                <button
                  onClick={() => onMarkNeedsAttention(comment.id, !comment.needsAttention)}
                  className={`p-1 rounded text-xs transition-colors ${
                    comment.needsAttention
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                  title={comment.needsAttention ? 'Remove attention flag' : 'Mark needs attention'}
                >
                  ⚠️
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this comment?')) {
                      onDeleteComment(comment.id);
                    }
                  }}
                  className="p-1 rounded text-xs text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete comment"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Comment Form */}
      {isAdding && (
        <div className="px-3 py-3 border-t border-blue-500/20 bg-blue-500/5">
          <textarea
            autoFocus
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (Ctrl+Enter to submit)"
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">
              Press Ctrl+Enter to submit, Escape to cancel
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewComment('');
                }}
                className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim()}
                className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {comments.length === 0 && !isAdding && (
        <div className="px-3 py-4 text-center">
          <p className="text-sm text-slate-400">No comments yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Add the first comment
          </button>
        </div>
      )}
    </div>
  );
}
