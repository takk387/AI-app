'use client';

import React from 'react';
import { FileCard } from './FileCard';
import type { FileMetadata } from '@/types/storage';

interface FileGridProps {
  files: FileMetadata[];
  selectedFiles?: Set<string>;
  onSelectFile?: (file: FileMetadata) => void;
  onDownload?: (file: FileMetadata) => void;
  onDelete?: (file: FileMetadata) => void;
  onCopyLink?: (file: FileMetadata) => void;
  loadingFileIds?: Set<string>;
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * FileGrid Component
 * 
 * Displays files in a responsive grid layout.
 * Supports selection, actions, and loading states.
 */
export function FileGrid({
  files,
  selectedFiles = new Set(),
  onSelectFile,
  onDownload,
  onDelete,
  onCopyLink,
  loadingFileIds = new Set(),
  isLoading = false,
  emptyMessage = 'No files yet. Upload your first file to get started!',
}: FileGridProps) {
  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-slate-800/50" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-700/50 rounded w-3/4" />
              <div className="h-3 bg-slate-700/50 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="flex-1 h-8 bg-slate-700/50 rounded" />
                <div className="w-8 h-8 bg-slate-700/50 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show empty state
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No Files Found
        </h3>
        <p className="text-slate-400 text-center max-w-md">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          isSelected={selectedFiles.has(file.id)}
          onSelect={onSelectFile}
          onDownload={onDownload}
          onDelete={onDelete}
          onCopyLink={onCopyLink}
          isLoading={loadingFileIds.has(file.id)}
        />
      ))}
    </div>
  );
}
