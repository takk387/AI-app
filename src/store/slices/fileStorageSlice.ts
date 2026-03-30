import type { StateCreator } from 'zustand';
import type { ContentTab } from '@/types/aiBuilderTypes';
import type { FileMetadata, StorageStats } from '@/types/storage';
import type { AppState } from '../useAppStore';

/**
 * File storage slice state
 */
export interface FileStorageSlice {
  contentTab: ContentTab;
  storageFiles: FileMetadata[];
  loadingFiles: boolean;
  selectedFiles: Set<string>;
  fileSearchQuery: string;
  fileTypeFilter: string;
  fileSortBy: 'name' | 'size' | 'created_at' | 'updated_at';
  fileSortOrder: 'asc' | 'desc';
  storageStats: StorageStats | null;
  uploadingFiles: Set<string>;
  deletingFiles: Set<string>;
  // Actions
  setContentTab: (tab: ContentTab) => void;
  setStorageFiles: (files: FileMetadata[]) => void;
  setLoadingFiles: (loading: boolean) => void;
  setSelectedFiles: (files: Set<string>) => void;
  setFileSearchQuery: (query: string) => void;
  setFileTypeFilter: (filter: string) => void;
  setFileSortBy: (sortBy: 'name' | 'size' | 'created_at' | 'updated_at') => void;
  setFileSortOrder: (order: 'asc' | 'desc') => void;
  setStorageStats: (stats: StorageStats | null) => void;
  setUploadingFiles: (files: Set<string>) => void;
  setDeletingFiles: (files: Set<string>) => void;
  toggleFileSelection: (fileId: string) => void;
  clearFileSelection: () => void;
}

export const createFileStorageSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  FileStorageSlice
> = (set) => ({
  contentTab: 'apps',
  storageFiles: [] as FileMetadata[],
  loadingFiles: false,
  selectedFiles: new Set<string>(),
  fileSearchQuery: '',
  fileTypeFilter: 'all',
  fileSortBy: 'created_at',
  fileSortOrder: 'desc',
  storageStats: null as StorageStats | null,
  uploadingFiles: new Set<string>(),
  deletingFiles: new Set<string>(),

  setContentTab: (tab) => set({ contentTab: tab }),
  setStorageFiles: (files) => set({ storageFiles: files }),
  setLoadingFiles: (loading) => set({ loadingFiles: loading }),
  setSelectedFiles: (files) => set({ selectedFiles: files }),
  setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
  setFileTypeFilter: (filter) => set({ fileTypeFilter: filter }),
  setFileSortBy: (sortBy) => set({ fileSortBy: sortBy }),
  setFileSortOrder: (order) => set({ fileSortOrder: order }),
  setStorageStats: (stats) => set({ storageStats: stats }),
  setUploadingFiles: (files) => set({ uploadingFiles: files }),
  setDeletingFiles: (files) => set({ deletingFiles: files }),
  toggleFileSelection: (fileId) =>
    set((state) => {
      const newSelection = new Set(state.selectedFiles);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return { selectedFiles: newSelection };
    }),
  clearFileSelection: () => set({ selectedFiles: new Set<string>() }),
});
