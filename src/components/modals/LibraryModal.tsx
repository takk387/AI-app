'use client';

import React from 'react';
import { FileGrid, FileFilters, FileUploader, StorageStats } from '../storage';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import type { FileMetadata, StorageStats as StorageStatsType, FileId } from '@/types/storage';
import {
  FolderIcon,
  XIcon,
  RocketIcon,
  StarIcon,
  PackageIcon,
  TrashIcon,
  LoaderIcon,
  LockIcon,
} from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';

export interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Apps tab
  components: GeneratedComponent[];
  filteredComponents: GeneratedComponent[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLoadComponent: (component: GeneratedComponent) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onExportComponent: (component: GeneratedComponent) => void;
  exportingAppId?: string | null;

  // Files tab
  contentTab: 'apps' | 'files';
  onContentTabChange: (tab: 'apps' | 'files') => void;
  storageFiles: FileMetadata[];
  filteredFiles: FileMetadata[];
  fileSearchQuery: string;
  onFileSearchChange: (query: string) => void;
  fileTypeFilter: string;
  onFileTypeFilterChange: (filter: string) => void;
  fileSortBy: 'name' | 'size' | 'created_at' | 'updated_at';
  fileSortOrder: 'asc' | 'desc';
  onSortChange: (
    sortBy: 'name' | 'size' | 'created_at' | 'updated_at',
    order: 'asc' | 'desc'
  ) => void;
  selectedFiles: Set<string>;
  onFileSelect: (fileId: string) => void;
  onFileUpload: (files: File[]) => Promise<void>;
  onFileDownload: (file: FileMetadata) => void;
  onFileDelete: (fileId: FileId) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  loadingFiles: boolean;
  deletingFiles: Set<string>;
  storageStats: StorageStatsType | null;
  user: { id: string; email?: string } | null;
}

export function LibraryModal({
  isOpen,
  onClose,
  components,
  filteredComponents,
  searchQuery,
  onSearchChange,
  onLoadComponent,
  onToggleFavorite,
  onDeleteComponent,
  onExportComponent,
  exportingAppId,
  contentTab,
  onContentTabChange,
  storageFiles,
  filteredFiles,
  fileSearchQuery,
  onFileSearchChange,
  fileTypeFilter,
  onFileTypeFilterChange,
  fileSortBy,
  fileSortOrder,
  onSortChange,
  selectedFiles,
  onFileSelect,
  onFileUpload,
  onFileDownload,
  onFileDelete,
  onBulkDelete,
  onClearSelection,
  loadingFiles,
  deletingFiles,
  storageStats,
  user,
}: LibraryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Library Header */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <FolderIcon size={20} className="text-zinc-400" />
                My Content
                <span className="text-sm font-normal text-zinc-500">
                  ({contentTab === 'apps' ? components.length : storageFiles.length})
                </span>
              </h2>
              <button onClick={onClose} className="btn-icon">
                <XIcon size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => onContentTabChange('apps')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentTab === 'apps'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <RocketIcon size={16} />
                Apps ({components.length})
              </button>
              <button
                onClick={() => onContentTabChange('files')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  contentTab === 'files'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <FolderIcon size={16} />
                Files ({storageFiles.length})
              </button>
            </div>

            {/* Search */}
            {contentTab === 'apps' ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search apps..."
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                id="app-search"
                name="app-search"
                autoComplete="off"
              />
            ) : (
              <FileFilters
                searchQuery={fileSearchQuery}
                onSearchChange={onFileSearchChange}
                selectedType={fileTypeFilter}
                onTypeChange={onFileTypeFilterChange}
                sortBy={fileSortBy}
                sortOrder={fileSortOrder}
                onSortChange={onSortChange}
                onClearFilters={() => {
                  onFileSearchChange('');
                  onFileTypeFilterChange('all');
                  onSortChange('created_at', 'desc');
                }}
              />
            )}
          </div>

          {/* Library Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {contentTab === 'apps' ? (
              // Apps Tab Content
              filteredComponents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <FolderIcon size={32} className="text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400">
                    {searchQuery ? 'No apps match your search' : 'No apps yet. Start building!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredComponents.map((comp) => (
                    <div
                      key={comp.id}
                      className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 hover:bg-zinc-800 transition-colors cursor-pointer group"
                      onClick={() => onLoadComponent(comp)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-zinc-100 group-hover:text-blue-400 transition-colors">
                          {comp.name}
                        </h3>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(comp.id);
                            }}
                            className="btn-icon p-1.5"
                          >
                            <StarIcon
                              size={16}
                              filled={comp.isFavorite}
                              className={comp.isFavorite ? 'text-yellow-400' : 'text-zinc-500'}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportComponent(comp);
                            }}
                            className="btn-icon p-1.5 text-green-400 hover:text-green-300"
                            title="Export & Deploy"
                            disabled={exportingAppId === comp.id}
                          >
                            {exportingAppId === comp.id ? (
                              <LoaderIcon size={16} />
                            ) : (
                              <PackageIcon size={16} />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${comp.name}"?`)) {
                                onDeleteComponent(comp.id);
                              }
                            }}
                            className="btn-icon p-1.5 text-red-400 hover:text-red-300"
                            title="Delete app"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{comp.description}</p>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{new Date(comp.timestamp).toLocaleDateString()}</span>
                        <span className="text-blue-400">Load →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Files Tab Content
              <>
                {!user ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                      <LockIcon size={32} className="text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-100 mb-2">Sign In Required</h3>
                    <p className="text-sm text-zinc-400 text-center max-w-md">
                      Please sign in to access file storage
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* File Uploader */}
                    <FileUploader
                      onUpload={onFileUpload}
                      maxFileSize={10 * 1024 * 1024}
                      allowedTypes={[]}
                      allowedExtensions={[]}
                      disabled={!user}
                    />

                    {/* Storage Stats */}
                    {storageStats && <StorageStats stats={storageStats} />}

                    {/* File Grid */}
                    <FileGrid
                      files={filteredFiles}
                      selectedFiles={selectedFiles}
                      onSelectFile={(file) => onFileSelect(file.id)}
                      onDownload={onFileDownload}
                      onDelete={(file) => onFileDelete(file.id as FileId)}
                      loadingFileIds={deletingFiles}
                      isLoading={loadingFiles}
                    />

                    {/* Bulk Actions */}
                    {selectedFiles.size > 0 && (
                      <div className="fixed bottom-6 right-6 bg-zinc-800 rounded-lg border border-zinc-700 shadow-2xl p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-100 text-sm">
                            {selectedFiles.size} selected
                          </span>
                          <button onClick={onBulkDelete} className="btn-danger">
                            <TrashIcon size={16} />
                            Delete Selected
                          </button>
                          <button onClick={onClearSelection} className="btn-secondary">
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default LibraryModal;
