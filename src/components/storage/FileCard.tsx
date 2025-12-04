'use client';

import React from 'react';
import type { FileMetadata } from '@/types/storage';

interface FileCardProps {
  file: FileMetadata;
  isSelected?: boolean;
  onSelect?: (file: FileMetadata) => void;
  onDownload?: (file: FileMetadata) => void;
  onDelete?: (file: FileMetadata) => void;
  onCopyLink?: (file: FileMetadata) => void;
  isLoading?: boolean;
}

/**
 * FileCard Component
 *
 * Displays individual file information with preview, metadata, and actions.
 * Supports keyboard navigation and accessibility.
 */
export function FileCard({
  file,
  isSelected = false,
  onSelect,
  onDownload,
  onDelete,
  onCopyLink,
  isLoading = false,
}: FileCardProps) {
  // Determine if file is an image based on MIME type
  const isImage = file.mimeType.startsWith('image/');

  // Format file size for display
  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  // Get file icon based on MIME type
  const getFileIcon = (): string => {
    if (file.mimeType.startsWith('image/')) return '🖼️';
    if (file.mimeType.startsWith('video/')) return '🎥';
    if (file.mimeType.startsWith('audio/')) return '🎵';
    if (file.mimeType === 'application/pdf') return '📄';
    if (file.mimeType.includes('text/')) return '📝';
    if (file.mimeType.includes('json')) return '{}';
    if (file.mimeType.includes('html')) return '🌐';
    if (file.mimeType.includes('javascript')) return '⚡';
    return '📎';
  };

  return (
    <div
      className={`
        relative group rounded-xl border transition-all duration-300
        ${
          isSelected
            ? 'bg-blue-500/20 border-blue-500/60 shadow-lg shadow-blue-500/20'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        ${onSelect ? 'cursor-pointer' : ''}
      `}
      onClick={() => onSelect?.(file)}
      role="article"
      aria-label={`File: ${file.name}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(file);
        }
      }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center z-10">
          <div className="flex gap-1">
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      )}

      {/* File Preview */}
      <div className="aspect-square rounded-t-xl bg-slate-800/50 flex items-center justify-center overflow-hidden">
        {isImage && file.publicUrl ? (
          <img
            src={file.publicUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-6xl">{getFileIcon()}</div>
        )}
      </div>

      {/* File Info */}
      <div className="p-4">
        {/* File Name */}
        <h3
          className="text-white font-medium text-sm truncate mb-1 group-hover:text-blue-400 transition-colors"
          title={file.name}
        >
          {file.name}
        </h3>

        {/* File Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <span>{formatSize(file.size)}</span>
          <span>•</span>
          <span>{formatDate(file.createdAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all flex items-center justify-center gap-1"
              title="Download file"
              aria-label={`Download ${file.name}`}
            >
              <span>📥</span>
              <span>Download</span>
            </button>
          )}

          {onCopyLink && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink(file);
              }}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs transition-all"
              title="Copy link"
              aria-label={`Copy link for ${file.name}`}
            >
              <span>🔗</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file);
              }}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-red-400 text-xs transition-all"
              title="Delete file"
              aria-label={`Delete ${file.name}`}
            >
              <span>🗑️</span>
            </button>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
    </div>
  );
}
