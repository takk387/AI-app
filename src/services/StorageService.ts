/**
 * StorageService - Production-grade file management service
 * 
 * Features:
 * - Dependency injection for universal compatibility (browser + server)
 * - Type-safe operations with comprehensive error handling
 * - Automatic retry logic with exponential backoff
 * - File validation (size, type, extension)
 * - User-scoped security (files organized by user ID)
 * - Pagination support for listing files
 * 
 * @example Browser (Client Component)
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const storage = new StorageService(supabase);
 * const result = await storage.upload('user-uploads', file);
 * ```
 * 
 * @example Server (API Route)
 * ```typescript
 * import { createClient } from '@/utils/supabase/server';
 * const supabase = await createClient();
 * const storage = new StorageService(supabase);
 * const result = await storage.upload('user-uploads', file);
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  BucketName,
  FilePath,
  FileId,
  UserId,
  SignedUrl,
  FileMetadata,
  UploadConfig,
  StorageResult,
  StorageError,
  StorageErrorCode,
  PaginationOptions,
  PaginatedResult,
  FileValidationRules,
  FileValidationResult,
  createStorageError,
  getFileExtension,
  isRetryableError as isRetryableErrorUtil,
} from '@/types/storage';

/**
 * Configuration for each storage bucket
 */
const BUCKET_CONFIGS: Record<BucketName, FileValidationRules> = {
  'user-uploads': {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown',
    ],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'md'],
  },
  'generated-apps': {
    maxSize: 50 * 1024 * 1024, // 50 MB
    allowedTypes: ['text/html', 'text/javascript', 'application/json'],
    allowedExtensions: ['html', 'js', 'json'],
  },
  'app-assets': {
    maxSize: 5 * 1024 * 1024, // 5 MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
  },
};

/**
 * Default retry configuration
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * StorageService - Main service class for file management
 * 
 * Uses dependency injection pattern for universal compatibility.
 * The Supabase client must be passed to the constructor.
 */
export class StorageService {
  /**
   * Injected Supabase client
   * Must be provided by the caller (browser or server context)
   */
  private client: SupabaseClient<Database>;

  /**
   * Create a new StorageService instance
   * 
   * @param client - Supabase client (browser or server)
   * 
   * @example Browser context
   * ```typescript
   * import { createClient } from '@/utils/supabase/client';
   * const supabase = createClient();
   * const storage = new StorageService(supabase);
   * ```
   * 
   * @example Server context
   * ```typescript
   * import { createClient } from '@/utils/supabase/server';
   * const supabase = await createClient();
   * const storage = new StorageService(supabase);
   * ```
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // ==========================================================================
  // PUBLIC API METHODS
  // ==========================================================================

  /**
   * Upload a file to storage
   * 
   * Features:
   * - Automatic validation (size, type, extension)
   * - Retry logic with exponential backoff
   * - User-scoped paths
   * - Comprehensive error handling
   * 
   * @param bucket - Target bucket name
   * @param file - File to upload
   * @param config - Optional upload configuration
   * @returns Result with file metadata or error
   */
  async upload(
    bucket: BucketName,
    file: File,
    config?: UploadConfig
  ): Promise<StorageResult<FileMetadata>> {
    try {
      // Get current user ID
      const userId = await this.getUserId();

      // Validate file
      const validation = this.validateFile(file, bucket, config);
      if (!validation.isValid) {
        const firstError = validation.errors[0];
        return {
          success: false,
          error: createStorageError(
            firstError.code,
            firstError.message,
            { validationErrors: validation.errors }
          ),
        };
      }

      // Generate user-scoped path
      const path = this.generatePath(userId, file.name);

      // Upload with retry logic
      const uploadResult = await this.uploadWithRetry(
        bucket,
        path,
        file,
        config
      );

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      // Get metadata for uploaded file
      const metadata = await this.getMetadata(bucket, path, userId);

      return {
        success: true,
        data: metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error, StorageErrorCode.UPLOAD_FAILED),
      };
    }
  }

  /**
   * List files in a bucket
   * 
   * Features:
   * - User-scoped (only shows current user's files)
   * - Pagination support
   * - Sorting options
   * 
   * @param bucket - Bucket to list files from
   * @param options - Pagination and sorting options
   * @returns Paginated result with file metadata
   */
  async list(
    bucket: BucketName,
    options?: PaginationOptions
  ): Promise<StorageResult<PaginatedResult<FileMetadata>>> {
    try {
      // Get current user ID
      const userId = await this.getUserId();

      // Set defaults for pagination
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      const sortBy = options?.sortBy || { column: 'name', order: 'asc' as const };

      // List files in user's directory
      const { data: files, error } = await this.client.storage
        .from(bucket)
        .list(userId, {
          limit,
          offset,
          sortBy,
        });

      if (error) {
        return {
          success: false,
          error: this.handleError(error, StorageErrorCode.UNKNOWN_ERROR),
        };
      }

      // Convert to FileMetadata
      const items: FileMetadata[] = files.map((file) => ({
        id: `${userId}/${file.name}` as FileId,
        name: file.name,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream',
        bucket,
        owner: userId as UserId,
        path: `${userId}/${file.name}` as FilePath,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        lastAccessedAt: file.last_accessed_at,
        metadata: file.metadata as Record<string, string | number | boolean> | undefined,
        cacheControl: file.metadata?.cacheControl,
      }));

      // Calculate pagination metadata
      const total = items.length; // Note: Supabase doesn't provide total count
      const hasMore = items.length === limit;
      const nextOffset = hasMore ? offset + limit : undefined;

      return {
        success: true,
        data: {
          items,
          total,
          hasMore,
          nextOffset,
          pagination: {
            limit,
            offset,
            sortBy,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error, StorageErrorCode.UNKNOWN_ERROR),
      };
    }
  }

  /**
   * Delete a file from storage
   * 
   * Features:
   * - Ownership verification (users can only delete their own files)
   * - Comprehensive error handling
   * 
   * @param bucket - Bucket containing the file
   * @param fileId - File ID (path) to delete
   * @returns Result indicating success or error
   */
  async delete(
    bucket: BucketName,
    fileId: FileId
  ): Promise<StorageResult<void>> {
    try {
      // Get current user ID
      const userId = await this.getUserId();

      // Verify ownership (file path should start with user ID)
      if (!fileId.startsWith(userId)) {
        return {
          success: false,
          error: createStorageError(
            StorageErrorCode.PERMISSION_DENIED,
            'You do not have permission to delete this file',
            { fileId, userId }
          ),
        };
      }

      // Delete the file
      const { error } = await this.client.storage
        .from(bucket)
        .remove([fileId]);

      if (error) {
        return {
          success: false,
          error: this.handleError(error, StorageErrorCode.DELETE_FAILED),
        };
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error, StorageErrorCode.DELETE_FAILED),
      };
    }
  }

  /**
   * Get URL for a file
   * 
   * @param bucket - Bucket containing the file
   * @param path - File path
   * @param options - URL options
   * @returns Result with URL (public or signed)
   */
  async getUrl(
    bucket: BucketName,
    path: FilePath,
    options?: {
      /** Whether to create a signed URL (default: false for public buckets) */
      signed?: boolean;
      /** Expiration time in seconds (for signed URLs, default: 3600 = 1 hour) */
      expiresIn?: number;
    }
  ): Promise<StorageResult<SignedUrl | string>> {
    try {
      // Get current user ID for ownership verification
      const userId = await this.getUserId();

      // Verify ownership
      if (!path.startsWith(userId)) {
        return {
          success: false,
          error: createStorageError(
            StorageErrorCode.PERMISSION_DENIED,
            'You do not have permission to access this file',
            { path, userId }
          ),
        };
      }

      // Generate signed URL if requested
      if (options?.signed) {
        const expiresIn = options.expiresIn || 3600;
        const { data, error } = await this.client.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (error) {
          return {
            success: false,
            error: this.handleError(error, StorageErrorCode.UNKNOWN_ERROR),
          };
        }

        return {
          success: true,
          data: data.signedUrl as SignedUrl,
        };
      }

      // Generate public URL
      const { data } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      return {
        success: true,
        data: data.publicUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error, StorageErrorCode.UNKNOWN_ERROR),
      };
    }
  }

  /**
   * Download a file from storage
   * 
   * @param bucket - Bucket containing the file
   * @param path - File path
   * @returns Result with file blob
   */
  async download(
    bucket: BucketName,
    path: FilePath
  ): Promise<StorageResult<Blob>> {
    try {
      // Get current user ID for ownership verification
      const userId = await this.getUserId();

      // Verify ownership
      if (!path.startsWith(userId)) {
        return {
          success: false,
          error: createStorageError(
            StorageErrorCode.PERMISSION_DENIED,
            'You do not have permission to access this file',
            { path, userId }
          ),
        };
      }

      const { data, error } = await this.client.storage
        .from(bucket)
        .download(path);

      if (error) {
        return {
          success: false,
          error: this.handleError(error, StorageErrorCode.DOWNLOAD_FAILED),
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error, StorageErrorCode.DOWNLOAD_FAILED),
      };
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Get current authenticated user ID from the injected client
   * 
   * @returns User ID
   * @throws Error if user is not authenticated
   */
  private async getUserId(): Promise<UserId> {
    const { data: { user }, error } = await this.client.auth.getUser();

    if (error || !user) {
      throw createStorageError(
        StorageErrorCode.NOT_AUTHENTICATED,
        'User is not authenticated',
        { error }
      );
    }

    return user.id as UserId;
  }

  /**
   * Validate a file against bucket rules and config
   * 
   * @param file - File to validate
   * @param bucket - Target bucket
   * @param config - Optional upload config with overrides
   * @returns Validation result with errors if any
   */
  private validateFile(
    file: File,
    bucket: BucketName,
    config?: UploadConfig
  ): FileValidationResult {
    const errors: Array<{ code: StorageErrorCode; message: string }> = [];
    const rules = BUCKET_CONFIGS[bucket];

    // Check file size
    const maxSize = config?.maxSize || rules.maxSize;
    if (file.size > maxSize) {
      errors.push({
        code: StorageErrorCode.FILE_TOO_LARGE,
        message: `File size (${file.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
      });
    }

    // Check MIME type
    const allowedTypes = config?.allowedTypes || rules.allowedTypes;
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push({
        code: StorageErrorCode.INVALID_FILE_TYPE,
        message: `File type '${file.type}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    // Check file extension
    const extension = getFileExtension(file.name);
    const allowedExtensions = config?.allowedExtensions || rules.allowedExtensions;
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
      errors.push({
        code: StorageErrorCode.INVALID_EXTENSION,
        message: `File extension '.${extension}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate user-scoped file path
   * Format: {userId}/{filename}
   * 
   * @param userId - User ID
   * @param filename - Original filename
   * @returns User-scoped path
   */
  private generatePath(userId: UserId, filename: string): FilePath {
    // Sanitize filename (remove path separators, special chars)
    const sanitized = filename.replace(/[/\\]/g, '_');
    
    // Add timestamp to prevent collisions
    const timestamp = Date.now();
    const extension = getFileExtension(filename);
    
    // Calculate name without extension (only subtract dot if extension exists)
    const nameWithoutExt = extension
      ? sanitized.substring(0, sanitized.length - extension.length - 1)
      : sanitized;
    
    const uniqueFilename = extension
      ? `${nameWithoutExt}_${timestamp}.${extension}`
      : `${sanitized}_${timestamp}`;

    return `${userId}/${uniqueFilename}` as FilePath;
  }

  /**
   * Upload file with retry logic
   * 
   * @param bucket - Target bucket
   * @param path - File path
   * @param file - File to upload
   * @param config - Upload config
   * @returns Result indicating success or error
   */
  private async uploadWithRetry(
    bucket: BucketName,
    path: FilePath,
    file: File,
    config?: UploadConfig
  ): Promise<StorageResult<void>> {
    let lastError: StorageError | null = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        const { error } = await this.client.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: config?.cacheControl || '3600',
            contentType: config?.contentType || file.type,
            upsert: config?.upsert || false,
          });

        if (error) {
          lastError = this.handleError(error, StorageErrorCode.UPLOAD_FAILED);
          
          // Check if error is retryable
          if (!isRetryableErrorUtil(lastError)) {
            return { success: false, error: lastError };
          }

          // Wait before retry (exponential backoff)
          if (attempt < RETRY_CONFIG.maxAttempts) {
            const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
            await this.sleep(delay);
            continue;
          }
        } else {
          // Success
          return { success: true, data: undefined };
        }
      } catch (error) {
        lastError = this.handleError(error, StorageErrorCode.UPLOAD_FAILED);
        
        if (!isRetryableErrorUtil(lastError) || attempt === RETRY_CONFIG.maxAttempts) {
          return { success: false, error: lastError };
        }

        // Wait before retry
        const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError || createStorageError(
        StorageErrorCode.UPLOAD_FAILED,
        'Upload failed after all retry attempts'
      ),
    };
  }

  /**
   * Get metadata for an uploaded file
   * 
   * @param bucket - Bucket name
   * @param path - File path
   * @param userId - User ID (owner)
   * @returns File metadata
   */
  private async getMetadata(
    bucket: BucketName,
    path: FilePath,
    userId: UserId
  ): Promise<FileMetadata> {
    // Get public URL
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);

    // Parse filename from path
    const filename = path.split('/').pop() || '';

    // Return metadata (some fields may not be available immediately after upload)
    return {
      id: path as unknown as FileId,
      name: filename,
      size: 0, // Will be populated on next list operation
      mimeType: 'application/octet-stream', // Will be populated on next list operation
      bucket,
      owner: userId,
      path,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publicUrl: data.publicUrl,
    };
  }

  /**
   * Handle errors and convert to StorageError
   * 
   * @param error - Original error
   * @param defaultCode - Default error code if cannot determine
   * @returns Structured storage error
   */
  private handleError(error: unknown, defaultCode: StorageErrorCode): StorageError {
    // Check if it's already a StorageError
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return error as StorageError;
    }

    // Handle Supabase storage errors
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as { message: string }).message);
      
      // Map common Supabase error messages to codes
      if (message.includes('not found')) {
        return createStorageError(StorageErrorCode.NOT_FOUND, message, undefined, error);
      }
      if (message.includes('permission') || message.includes('denied')) {
        return createStorageError(StorageErrorCode.PERMISSION_DENIED, message, undefined, error);
      }
      if (message.includes('quota') || message.includes('limit')) {
        return createStorageError(StorageErrorCode.QUOTA_EXCEEDED, message, undefined, error);
      }
      if (message.includes('network') || message.includes('timeout')) {
        return createStorageError(StorageErrorCode.NETWORK_ERROR, message, undefined, error);
      }

      return createStorageError(defaultCode, message, undefined, error);
    }

    // Fallback for unknown errors
    return createStorageError(
      defaultCode,
      error instanceof Error ? error.message : 'An unknown error occurred',
      undefined,
      error
    );
  }

  /**
   * Sleep for specified duration
   * 
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
