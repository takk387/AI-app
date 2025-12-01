/**
 * useFileStorage Hook - Handles file storage operations
 * 
 * Extracted from AIBuilder.tsx for reusability and better separation of concerns.
 * Provides functionality for file upload, download, delete, and listing.
 */

import { useState, useCallback, useMemo } from 'react';
import { StorageService } from '@/services/StorageService';
import type { 
  FileMetadata, 
  StorageStats as StorageStatsType, 
  FileId,
  UserId
} from '@/types/storage';

/** Default storage quota in bytes (100MB) */
const DEFAULT_STORAGE_QUOTA = 100 * 1024 * 1024;

/** Default file list limit */
const DEFAULT_FILE_LIMIT = 100;

/**
 * Options for useFileStorage hook
 */
export interface UseFileStorageOptions {
  /** Current authenticated user ID */
  userId: string | null;
  /** Storage service instance */
  storageService: StorageService;
  /** Storage quota in bytes (default: 100MB) */
  storageQuota?: number;
  /** Maximum number of files to list (default: 100) */
  fileListLimit?: number;
}

/**
 * Return type for useFileStorage hook
 */
export interface UseFileStorageReturn {
  // State
  /** List of files in storage */
  files: FileMetadata[];
  /** Whether files are being loaded */
  isLoading: boolean;
  /** Set of selected file IDs */
  selectedFiles: Set<string>;
  /** Storage usage statistics */
  storageStats: StorageStatsType | null;
  /** Set of file names currently being uploaded */
  uploadingFiles: Set<string>;
  /** Set of file IDs currently being deleted */
  deletingFiles: Set<string>;
  
  // Filters
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current type filter */
  typeFilter: string;
  /** Set type filter */
  setTypeFilter: (filter: string) => void;
  /** Current sort field */
  sortBy: 'name' | 'size' | 'created_at' | 'updated_at';
  /** Set sort field */
  setSortBy: (sort: 'name' | 'size' | 'created_at' | 'updated_at') => void;
  /** Current sort order */
  sortOrder: 'asc' | 'desc';
  /** Set sort order */
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Actions
  /** Load files from storage */
  loadFiles: () => Promise<void>;
  /** Upload files to storage */
  uploadFiles: (files: File[]) => Promise<void>;
  /** Delete a file from storage */
  deleteFile: (fileId: FileId) => Promise<void>;
  /** Download a file from storage */
  downloadFile: (file: FileMetadata) => Promise<void>;
  /** Delete all selected files */
  bulkDelete: () => Promise<void>;
  /** Toggle selection of a file */
  selectFile: (fileId: string) => void;
  /** Clear all file selections */
  clearSelection: () => void;
  
  // Computed
  /** Filtered list of files based on current filters */
  filteredFiles: FileMetadata[];
}

/**
 * Hook for managing file storage operations
 * 
 * @param options - Configuration options
 * @returns File storage methods and state
 * 
 * @example
 * ```tsx
 * const {
 *   files,
 *   isLoading,
 *   loadFiles,
 *   uploadFiles,
 *   deleteFile,
 *   filteredFiles,
 * } = useFileStorage({
 *   userId: user?.id || null,
 *   storageService,
 * });
 * ```
 */
export function useFileStorage(options: UseFileStorageOptions): UseFileStorageReturn {
  const { 
    userId, 
    storageService,
    storageQuota = DEFAULT_STORAGE_QUOTA,
    fileListLimit = DEFAULT_FILE_LIMIT,
  } = options;

  // State
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [storageStats, setStorageStats] = useState<StorageStatsType | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'created_at' | 'updated_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  /**
   * Get file extension using robust extraction
   * Handles edge cases like files with multiple dots or no extension
   */
  const getExtension = useCallback((filename: string): string => {
    // Handle files starting with dots (like .gitignore)
    if (filename.startsWith('.') && !filename.slice(1).includes('.')) {
      return '';
    }
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return 'unknown';
    }
    return filename.slice(lastDotIndex + 1).toLowerCase();
  }, []);

  /**
   * Load files from storage
   */
  const loadFiles = useCallback(async () => {
    if (!userId) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await storageService.list('user-uploads', {
        limit: fileListLimit,
        offset: 0,
        sortBy: {
          column: sortBy,
          order: sortOrder
        }
      });

      if (result.success && result.data) {
        setFiles(result.data.items);
        
        // Calculate storage stats
        const totalSize = result.data.items.reduce((sum, file) => sum + file.size, 0);
        const byType: Record<string, { fileCount: number; totalSize: number }> = {};
        
        result.data.items.forEach(file => {
          const ext = getExtension(file.name);
          if (!byType[ext]) {
            byType[ext] = { fileCount: 0, totalSize: 0 };
          }
          byType[ext].fileCount++;
          byType[ext].totalSize += file.size;
        });

        setStorageStats({
          userId: userId as UserId,
          totalFiles: result.data.items.length,
          totalSize,
          byBucket: {
            'user-uploads': {
              fileCount: result.data.items.length,
              totalSize
            },
            'generated-apps': {
              fileCount: 0,
              totalSize: 0
            },
            'app-assets': {
              fileCount: 0,
              totalSize: 0
            }
          },
          byType,
          quota: storageQuota,
          quotaUsagePercent: (totalSize / storageQuota) * 100
        });
      } else {
        console.error('Failed to load files:', result.error);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, storageService, sortBy, sortOrder, fileListLimit, storageQuota, getExtension]);

  /**
   * Upload files to storage
   */
  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    if (!userId || filesToUpload.length === 0) return;

    // Track uploading files
    const newUploadingFiles = new Set(uploadingFiles);
    filesToUpload.forEach(file => newUploadingFiles.add(file.name));
    setUploadingFiles(newUploadingFiles);

    try {
      // Upload files sequentially
      for (const file of filesToUpload) {
        const result = await storageService.upload('user-uploads', file, {
          maxSize: 10 * 1024 * 1024,
          allowedTypes: [],
          allowedExtensions: []
        });

        if (!result.success) {
          console.error(`Failed to upload ${file.name}:`, result.error?.message);
          throw new Error(`Failed to upload ${file.name}: ${result.error?.message || 'Unknown error'}`);
        }
      }

      // Reload files after upload
      await loadFiles();
    } finally {
      // Clear uploading state
      setUploadingFiles(new Set());
    }
  }, [userId, storageService, loadFiles, uploadingFiles]);

  /**
   * Delete a file from storage
   */
  const deleteFile = useCallback(async (fileId: FileId) => {
    if (!userId) return;

    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Track deleting file
    setDeletingFiles(prev => new Set([...prev, fileId]));

    try {
      const result = await storageService.delete(file.bucket, fileId);

      if (result.success) {
        // Remove from local state
        setFiles(prev => prev.filter(f => f.id !== fileId));
        // Update stats
        await loadFiles();
      } else {
        throw new Error(`Failed to delete file: ${result.error?.message || 'Unknown error'}`);
      }
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }, [userId, files, storageService, loadFiles]);

  /**
   * Download a file from storage
   */
  const downloadFile = useCallback(async (file: FileMetadata) => {
    if (!userId) return;

    try {
      const result = await storageService.download(file.bucket, file.path);

      if (result.success && result.data) {
        // Create download link
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error(`Failed to download file: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }, [userId, storageService]);

  /**
   * Delete all selected files
   */
  const bulkDelete = useCallback(async () => {
    if (!userId || selectedFiles.size === 0) return;

    const fileIds = Array.from(selectedFiles);
    setDeletingFiles(new Set(fileIds));

    try {
      let successCount = 0;
      let failCount = 0;

      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (!file) continue;
        
        const result = await storageService.delete(file.bucket, fileId as FileId);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount > 0) {
        console.warn(`Deleted ${successCount} files, ${failCount} failed`);
      }

      // Clear selection and reload
      setSelectedFiles(new Set());
      await loadFiles();
    } finally {
      setDeletingFiles(new Set());
    }
  }, [userId, selectedFiles, files, storageService, loadFiles]);

  /**
   * Toggle selection of a file
   */
  const selectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  /**
   * Clear all file selections
   */
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  /**
   * Filter files based on search and filters
   */
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Search filter
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all') {
        const ext = getExtension(file.name);
        if (typeFilter === 'images' && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          return false;
        }
        if (typeFilter === 'documents' && !['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
          return false;
        }
      }

      return true;
    });
  }, [files, searchQuery, typeFilter, getExtension]);

  return {
    // State
    files,
    isLoading,
    selectedFiles,
    storageStats,
    uploadingFiles,
    deletingFiles,
    
    // Filters
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // Actions
    loadFiles,
    uploadFiles,
    deleteFile,
    downloadFile,
    bulkDelete,
    selectFile,
    clearSelection,
    
    // Computed
    filteredFiles,
  };
}

export default useFileStorage;
