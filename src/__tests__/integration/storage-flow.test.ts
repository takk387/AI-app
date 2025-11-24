/**
 * Integration Tests for Storage Workflows
 * 
 * Tests complete end-to-end workflows and interactions between storage operations:
 * - Full file lifecycle (upload → list → download → delete)
 * - Concurrent upload handling
 * - Storage quota enforcement
 * - Permission boundaries
 * - Race conditions
 * 
 * These tests use mocked Supabase client but test realistic multi-step workflows
 * that exercise the complete StorageService functionality.
 */

import { StorageService } from '../../services/StorageService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  BucketName,
  FilePath,
  FileId,
  UserId,
  StorageErrorCode,
} from '@/types/storage';

// ============================================================================
// Mock Setup
// ============================================================================

/**
 * Create a mock File object for testing
 */
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const blob = new Blob(['test content'], { type });
  Object.defineProperty(blob, 'name', { value: name });
  Object.defineProperty(blob, 'size', { value: size });
  return blob as File;
}

/**
 * Create a stateful mock Supabase client that simulates a real storage backend
 * Maintains in-memory state for uploaded files to enable realistic workflow testing
 */
function createStatefulMockSupabaseClient(userId: string = 'test-user-123') {
  // In-memory storage to track uploaded files
  const storage: Record<string, Array<{ name: string; path: string; size: number; type: string }>> = {
    'user-uploads': [],
    'generated-apps': [],
    'app-assets': [],
  };

  const mockClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    storage: {
      from: jest.fn((bucket: string) => {
        return {
          upload: jest.fn().mockImplementation((path: string, file: File) => {
            // Simulate successful upload by adding to in-memory storage
            storage[bucket].push({
              name: path.split('/').pop() || '',
              path,
              size: file.size,
              type: file.type,
            });
            return Promise.resolve({ data: { path }, error: null });
          }),
          
          list: jest.fn().mockImplementation((prefix: string) => {
            // Return files matching the user's prefix
            const userFiles = storage[bucket]
              .filter(f => f.path.startsWith(prefix))
              .map(f => ({
                name: f.name,
                metadata: { size: f.size, mimetype: f.type },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }));
            return Promise.resolve({ data: userFiles, error: null });
          }),
          
          remove: jest.fn().mockImplementation((paths: string[]) => {
            // Remove files from in-memory storage
            paths.forEach(path => {
              const index = storage[bucket].findIndex(f => f.path === path);
              if (index !== -1) {
                storage[bucket].splice(index, 1);
              }
            });
            return Promise.resolve({ data: null, error: null });
          }),
          
          download: jest.fn().mockImplementation((path: string) => {
            const file = storage[bucket].find(f => f.path === path);
            if (!file) {
              return Promise.resolve({ data: null, error: { message: 'File not found' } });
            }
            return Promise.resolve({ data: new Blob(['test content']), error: null });
          }),
          
          getPublicUrl: jest.fn().mockImplementation((path: string) => {
            return { data: { publicUrl: `https://example.com/${path}` } };
          }),
          
          createSignedUrl: jest.fn().mockImplementation((path: string, expiresIn: number) => {
            return Promise.resolve({
              data: { signedUrl: `https://example.com/signed/${path}?expires=${expiresIn}` },
              error: null,
            });
          }),
        };
      }),
    },
  };

  return {
    client: mockClient as unknown as SupabaseClient<Database>,
    getStorage: () => storage,
  };
}

// ============================================================================
// Integration Test Suites
// ============================================================================

describe('Storage Workflows - Integration Tests', () => {
  // ==========================================================================
  // Full File Lifecycle
  // ==========================================================================

  describe('Complete File Lifecycle', () => {
    it('should handle full upload → list → download → delete workflow', async () => {
      const { client, getStorage } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Step 1: Upload a file
      const file = createMockFile('workflow-test.jpg', 2048, 'image/jpeg');
      const uploadResult = await service.upload('user-uploads', file);
      
      expect(uploadResult.success).toBe(true);
      if (!uploadResult.success) return;
      
      const uploadedFile = uploadResult.data;
      const uploadedPath = uploadedFile.path;
      const uploadedId = uploadedFile.id;
      
      // Step 2: Verify file appears in list
      const listResult = await service.list('user-uploads');
      
      expect(listResult.success).toBe(true);
      if (!listResult.success) return;
      
      expect(listResult.data.items.length).toBeGreaterThan(0);
      const listedFile = listResult.data.items.find(f => f.path === uploadedPath);
      expect(listedFile).toBeDefined();
      expect(listedFile?.name).toContain('workflow-test');
      
      // Step 3: Download the file
      const downloadResult = await service.download('user-uploads', uploadedPath);
      
      expect(downloadResult.success).toBe(true);
      if (!downloadResult.success) return;
      
      expect(downloadResult.data).toBeInstanceOf(Blob);
      
      // Step 4: Delete the file
      const deleteResult = await service.delete('user-uploads', uploadedId);
      
      expect(deleteResult.success).toBe(true);
      
      // Step 5: Verify file is removed from list
      const listAfterDelete = await service.list('user-uploads');
      
      expect(listAfterDelete.success).toBe(true);
      if (!listAfterDelete.success) return;
      
      const deletedFile = listAfterDelete.data.items.find(f => f.path === uploadedPath);
      expect(deletedFile).toBeUndefined();
      
      // Verify in-memory storage is empty
      const storage = getStorage();
      expect(storage['user-uploads'].length).toBe(0);
    });

    it('should handle multiple file lifecycle operations', async () => {
      const { client, getStorage } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Upload 3 files
      const files = [
        createMockFile('file1.jpg', 1024, 'image/jpeg'),
        createMockFile('file2.png', 2048, 'image/png'),
        createMockFile('file3.pdf', 4096, 'application/pdf'),
      ];
      
      const uploadPromises = files.map(f => service.upload('user-uploads', f));
      const uploadResults = await Promise.all(uploadPromises);
      
      // All uploads should succeed
      expect(uploadResults.every(r => r.success)).toBe(true);
      
      // List should show 3 files
      const listResult = await service.list('user-uploads');
      expect(listResult.success).toBe(true);
      if (!listResult.success) return;
      
      expect(listResult.data.items.length).toBe(3);
      
      // Delete 2 files
      const idsToDelete = uploadResults
        .slice(0, 2)
        .map(r => r.success ? r.data.id : '')
        .filter(id => id !== '') as FileId[];
      
      for (const fileId of idsToDelete) {
        const deleteResult = await service.delete('user-uploads', fileId);
        expect(deleteResult.success).toBe(true);
      }
      
      // List should show 1 file remaining
      const listAfterDelete = await service.list('user-uploads');
      expect(listAfterDelete.success).toBe(true);
      if (!listAfterDelete.success) return;
      
      expect(listAfterDelete.data.items.length).toBe(1);
      expect(listAfterDelete.data.items[0].name).toContain('file3');
    });
  });

  // ==========================================================================
  // Concurrent Operations
  // ==========================================================================

  describe('Concurrent Upload Handling', () => {
    it('should handle simultaneous uploads correctly', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Create 5 files to upload concurrently
      const files = Array.from({ length: 5 }, (_, i) => 
        createMockFile(`concurrent-${i}.jpg`, 1024 * (i + 1), 'image/jpeg')
      );
      
      // Upload all files simultaneously
      const uploadPromises = files.map(f => service.upload('user-uploads', f));
      const results = await Promise.all(uploadPromises);
      
      // All uploads should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // All files should have unique paths
      const paths = results
        .filter(r => r.success)
        .map(r => r.success ? r.data.path : '');
      
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(5); // All paths should be unique
      
      // Verify all files are in the list
      const listResult = await service.list('user-uploads');
      expect(listResult.success).toBe(true);
      if (!listResult.success) return;
      
      expect(listResult.data.items.length).toBe(5);
    });

    it('should handle concurrent uploads of same filename', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Create 3 files with the same name
      const files = Array.from({ length: 3 }, () => 
        createMockFile('duplicate.jpg', 1024, 'image/jpeg')
      );
      
      // Upload with small delays to ensure unique timestamps
      const results = [];
      for (const file of files) {
        const result = await service.upload('user-uploads', file);
        results.push(result);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      
      // All uploads should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // All should have unique paths (timestamp makes them unique)
      const paths = results
        .filter(r => r.success)
        .map(r => r.success ? r.data.path : '');
      
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(3); // Timestamps ensure uniqueness with delays
      
      // All filenames should contain 'duplicate'
      const filenames = results
        .filter(r => r.success)
        .map(r => r.success ? r.data.name : '');
      
      expect(filenames.every(name => name.includes('duplicate'))).toBe(true);
    });

    it('should handle race conditions in concurrent delete operations', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Upload a file first
      const file = createMockFile('to-delete.jpg', 1024, 'image/jpeg');
      const uploadResult = await service.upload('user-uploads', file);
      
      expect(uploadResult.success).toBe(true);
      if (!uploadResult.success) return;
      
      const fileId = uploadResult.data.id;
      const filePath = uploadResult.data.path;
      
      // Try to delete the same file twice concurrently
      const deletePromises = [
        service.delete('user-uploads', fileId),
        service.delete('user-uploads', fileId),
      ];
      
      const deleteResults = await Promise.all(deletePromises);
      
      // At least one should succeed (both might succeed in this mock)
      const successCount = deleteResults.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
      
      // File should be deleted
      const listResult = await service.list('user-uploads');
      expect(listResult.success).toBe(true);
      if (!listResult.success) return;
      
      const deletedFile = listResult.data.items.find(f => f.path === filePath);
      expect(deletedFile).toBeUndefined();
    });
  });

  // ==========================================================================
  // Storage Quota Enforcement
  // ==========================================================================

  describe('Storage Quota and Limits', () => {
    it('should enforce per-file size limits', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Try to upload files of various sizes to user-uploads (10 MB limit)
      const testCases = [
        { size: 5 * 1024 * 1024, shouldSucceed: true, name: '5MB file' },
        { size: 10 * 1024 * 1024, shouldSucceed: true, name: '10MB file (at limit)' },
        { size: 11 * 1024 * 1024, shouldSucceed: false, name: '11MB file (over limit)' },
        { size: 50 * 1024 * 1024, shouldSucceed: false, name: '50MB file (way over)' },
      ];
      
      for (const testCase of testCases) {
        const file = createMockFile(`test-${testCase.size}.jpg`, testCase.size, 'image/jpeg');
        const result = await service.upload('user-uploads', file);
        
        expect(result.success).toBe(testCase.shouldSucceed);
        
        if (!testCase.shouldSucceed && !result.success) {
          expect(result.error.code).toBe(StorageErrorCode.FILE_TOO_LARGE);
        }
      }
    });

    it('should enforce different limits for different buckets', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // 15 MB file should fail in user-uploads (10 MB limit) but succeed in generated-apps (50 MB limit)
      const largeFile = createMockFile('large.html', 15 * 1024 * 1024, 'text/html');
      
      const userUploadsResult = await service.upload('user-uploads', largeFile);
      expect(userUploadsResult.success).toBe(false);
      if (!userUploadsResult.success) {
        // Size validation happens first, so expect FILE_TOO_LARGE
        expect(userUploadsResult.error.code).toBe(StorageErrorCode.FILE_TOO_LARGE);
      }
      
      const generatedAppsResult = await service.upload('generated-apps', largeFile);
      expect(generatedAppsResult.success).toBe(true); // 15 MB is under 50 MB limit
    });

    it('should handle quota exceeded scenario', async () => {
      // Create a mock client without stateful storage
      let uploadCount = 0;
      
      const mockClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-123' } },
            error: null,
          }),
        },
        storage: {
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockImplementation(() => {
              uploadCount++;
              if (uploadCount >= 3) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Storage quota exceeded for this bucket' }
                });
              }
              return Promise.resolve({ data: { path: `test-user-123/test-${uploadCount}` }, error: null });
            }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
          }),
        },
      };
      
      const service = new StorageService(mockClient as any);
      
      // First 2 uploads should succeed
      const file1 = createMockFile('file1.jpg', 1024, 'image/jpeg');
      const file2 = createMockFile('file2.jpg', 1024, 'image/jpeg');
      
      const result1 = await service.upload('user-uploads', file1);
      const result2 = await service.upload('user-uploads', file2);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // 3rd upload should fail with quota exceeded
      const file3 = createMockFile('file3.jpg', 1024, 'image/jpeg');
      const result3 = await service.upload('user-uploads', file3);
      
      expect(result3.success).toBe(false);
      if (!result3.success) {
        expect(result3.error.code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      }
    });
  });

  // ==========================================================================
  // Permission Boundaries
  // ==========================================================================

  describe('Permission and Security Boundaries', () => {
    it('should isolate files between different users', async () => {
      // Create two separate users
      const user1Mock = createStatefulMockSupabaseClient('user-1');
      const user2Mock = createStatefulMockSupabaseClient('user-2');
      
      const service1 = new StorageService(user1Mock.client);
      const service2 = new StorageService(user2Mock.client);
      
      // User 1 uploads a file
      const file1 = createMockFile('user1-file.jpg', 1024, 'image/jpeg');
      const upload1 = await service1.upload('user-uploads', file1);
      
      expect(upload1.success).toBe(true);
      
      // User 2 uploads a file
      const file2 = createMockFile('user2-file.jpg', 1024, 'image/jpeg');
      const upload2 = await service2.upload('user-uploads', file2);
      
      expect(upload2.success).toBe(true);
      
      // User 1 should only see their own file
      const list1 = await service1.list('user-uploads');
      expect(list1.success).toBe(true);
      if (!list1.success) return;
      
      expect(list1.data.items.length).toBe(1);
      expect(list1.data.items[0].owner).toBe('user-1' as UserId);
      
      // User 2 should only see their own file
      const list2 = await service2.list('user-uploads');
      expect(list2.success).toBe(true);
      if (!list2.success) return;
      
      expect(list2.data.items.length).toBe(1);
      expect(list2.data.items[0].owner).toBe('user-2' as UserId);
    });

    it('should prevent users from deleting other users\' files', async () => {
      const user1Mock = createStatefulMockSupabaseClient('user-1');
      const user2Mock = createStatefulMockSupabaseClient('user-2');
      
      const service1 = new StorageService(user1Mock.client);
      const service2 = new StorageService(user2Mock.client);
      
      // User 1 uploads a file
      const file = createMockFile('protected.jpg', 1024, 'image/jpeg');
      const upload = await service1.upload('user-uploads', file);
      
      expect(upload.success).toBe(true);
      if (!upload.success) return;
      
      const user1FileId = upload.data.id;
      
      // User 2 tries to delete user 1's file
      const deleteResult = await service2.delete('user-uploads', user1FileId);
      
      expect(deleteResult.success).toBe(false);
      if (!deleteResult.success) {
        expect(deleteResult.error.code).toBe(StorageErrorCode.PERMISSION_DENIED);
        expect(deleteResult.error.message).toContain('do not have permission');
      }
    });

    it('should prevent users from downloading other users\' files', async () => {
      const user1Mock = createStatefulMockSupabaseClient('user-1');
      const user2Mock = createStatefulMockSupabaseClient('user-2');
      
      const service1 = new StorageService(user1Mock.client);
      const service2 = new StorageService(user2Mock.client);
      
      // User 1 uploads a file
      const file = createMockFile('private.pdf', 2048, 'application/pdf');
      const upload = await service1.upload('user-uploads', file);
      
      expect(upload.success).toBe(true);
      if (!upload.success) return;
      
      const user1FilePath = upload.data.path;
      
      // User 2 tries to download user 1's file
      const downloadResult = await service2.download('user-uploads', user1FilePath);
      
      expect(downloadResult.success).toBe(false);
      if (!downloadResult.success) {
        expect(downloadResult.error.code).toBe(StorageErrorCode.PERMISSION_DENIED);
      }
    });

    it('should prevent users from accessing other users\' file URLs', async () => {
      const user1Mock = createStatefulMockSupabaseClient('user-1');
      const user2Mock = createStatefulMockSupabaseClient('user-2');
      
      const service1 = new StorageService(user1Mock.client);
      const service2 = new StorageService(user2Mock.client);
      
      // User 1 uploads a file
      const file = createMockFile('confidential.jpg', 1024, 'image/jpeg');
      const upload = await service1.upload('user-uploads', file);
      
      expect(upload.success).toBe(true);
      if (!upload.success) return;
      
      const user1FilePath = upload.data.path;
      
      // User 2 tries to get URL for user 1's file
      const urlResult = await service2.getUrl('user-uploads', user1FilePath);
      
      expect(urlResult.success).toBe(false);
      if (!urlResult.success) {
        expect(urlResult.error.code).toBe(StorageErrorCode.PERMISSION_DENIED);
      }
    });
  });

  // ==========================================================================
  // Complex Workflows
  // ==========================================================================

  describe('Complex Real-World Workflows', () => {
    it('should handle batch upload and selective delete workflow', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Upload 10 files
      const files = Array.from({ length: 10 }, (_, i) => 
        createMockFile(`batch-${i}.jpg`, 1024, 'image/jpeg')
      );
      
      const uploadResults = await Promise.all(
        files.map(f => service.upload('user-uploads', f))
      );
      
      expect(uploadResults.every(r => r.success)).toBe(true);
      
      // List all files
      const listResult = await service.list('user-uploads');
      expect(listResult.success).toBe(true);
      if (!listResult.success) return;
      
      expect(listResult.data.items.length).toBe(10);
      
      // Delete every other file
      const filesToDelete = listResult.data.items
        .filter((_, i) => i % 2 === 0)
        .map(f => f.id);
      
      for (const fileId of filesToDelete) {
        const deleteResult = await service.delete('user-uploads', fileId);
        expect(deleteResult.success).toBe(true);
      }
      
      // List remaining files
      const finalListResult = await service.list('user-uploads');
      expect(finalListResult.success).toBe(true);
      if (!finalListResult.success) return;
      
      expect(finalListResult.data.items.length).toBe(5);
    });

    it('should handle upload with validation failure and retry', async () => {
      const { client } = createStatefulMockSupabaseClient();
      const service = new StorageService(client);
      
      // Try to upload an invalid file (too large)
      const invalidFile = createMockFile('huge.jpg', 20 * 1024 * 1024, 'image/jpeg');
      const invalidResult = await service.upload('user-uploads', invalidFile);
      
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.code).toBe(StorageErrorCode.FILE_TOO_LARGE);
      }
      
      // Retry with a valid file
      const validFile = createMockFile('small.jpg', 1024, 'image/jpeg');
      const validResult = await service.upload('user-uploads', validFile);
      
      expect(validResult.success).toBe(true);
      
      // Verify only valid file was uploaded
      const listResult = await service.list('user-uploads');
      expect(listResult.success).toBe(true);
      if (!listResult.success) return;
      
      expect(listResult.data.items.length).toBe(1);
      expect(listResult.data.items[0].name).toContain('small');
    });
  });
});
