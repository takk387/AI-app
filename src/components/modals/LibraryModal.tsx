"use client";

import React from 'react';
import { 
  FileCard, 
  FileGrid, 
  FileFilters, 
  FileUploader, 
  StorageStats 
} from '../storage';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import type { 
  FileMetadata, 
  StorageStats as StorageStatsType,
  FileId
} from '@/types/storage';

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
  onSortChange: (sortBy: 'name' | 'size' | 'created_at' | 'updated_at', order: 'asc' | 'desc') => void;
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
      <div
        className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Library Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📂</span>
              <span>My Content</span>
              <span className="text-sm font-normal text-slate-400">
                ({contentTab === 'apps' ? components.length : storageFiles.length})
              </span>
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => onContentTabChange('apps')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                contentTab === 'apps'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              🚀 Apps ({components.length})
            </button>
            <button
              onClick={() => onContentTabChange('files')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                contentTab === 'files'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              📁 Files ({storageFiles.length})
            </button>
          </div>

          {/* Search */}
          {contentTab === 'apps' ? (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search apps..."
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
        <div className="flex-1 overflow-y-auto p-6">
          {contentTab === 'apps' ? (
            // Apps Tab Content
            filteredComponents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-slate-400">
                {searchQuery ? 'No components found' : 'No components yet. Start building!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComponents.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={() => onLoadComponent(comp)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {comp.name}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(comp.id);
                        }}
                        className="text-xl hover:scale-125 transition-transform"
                      >
                        {comp.isFavorite ? '⭐' : '☆'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportComponent(comp);
                        }}
                        className="text-lg hover:scale-125 transition-transform text-green-400 hover:text-green-300"
                        title="Export & Deploy"
                        disabled={exportingAppId === comp.id}
                      >
                        {exportingAppId === comp.id ? '⏳' : '📦'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${comp.name}"?`)) {
                            onDeleteComponent(comp.id);
                          }
                        }}
                        className="text-lg hover:scale-125 transition-transform text-red-400 hover:text-red-300"
                        title="Delete app"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                    {comp.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(comp.timestamp).toLocaleDateString()}</span>
                    <span className="text-blue-400">→ Load</span>
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
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Sign In Required
                  </h3>
                  <p className="text-slate-400 text-center max-w-md">
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
                  {storageStats && (
                    <StorageStats stats={storageStats} />
                  )}

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
                    <div className="fixed bottom-6 right-6 bg-slate-800 rounded-xl border border-white/20 shadow-2xl p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-white text-sm">
                          {selectedFiles.size} selected
                        </span>
                        <button
                          onClick={onBulkDelete}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all"
                        >
                          🗑️ Delete Selected
                        </button>
                        <button
                          onClick={onClearSelection}
                          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
                        >
                          Clear Selection
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
    </div>
  );
}

export default LibraryModal;
