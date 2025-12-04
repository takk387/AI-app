/**
 * Comprehensive type definitions for Supabase Storage operations
 *
 * This module provides:
 * - Branded types for compile-time safety
 * - Complete error handling types
 * - Metadata and configuration interfaces
 * - Pagination support
 *
 * @module storage
 */

// ============================================================================
// BRANDED TYPES - Prevent mixing incompatible string types
// ============================================================================

/**
 * Helper type for creating branded/nominal types
 * Prevents accidentally mixing strings of different semantic meanings
 *
 * @example
 * type UserId = BrandedString<'UserId'>;
 * type FilePath = BrandedString<'FilePath'>;
 *
 * const userId: UserId = "user-123" as UserId;
 * const filePath: FilePath = "path/to/file" as FilePath;
 *
 * // TypeScript error - cannot assign FilePath to UserId
 * const wrongAssignment: UserId = filePath;
 */
type BrandedString<Brand extends string> = string & { __brand: Brand };

/**
 * File path in storage bucket
 * Format: {userId}/{filename} or {userId}/{folder}/{filename}
 */
export type FilePath = BrandedString<'FilePath'>;

/**
 * Unique identifier for a file in storage
 * Typically the full path within a bucket
 */
export type FileId = BrandedString<'FileId'>;

/**
 * User identifier from Supabase Auth
 */
export type UserId = BrandedString<'UserId'>;

/**
 * Signed URL for temporary file access
 */
export type SignedUrl = BrandedString<'SignedUrl'>;

// ============================================================================
// BUCKET CONFIGURATION
// ============================================================================

/**
 * Valid storage bucket names
 * Derived from STORAGE_BUCKETS constant in storage.ts
 */
export type BucketName = 'user-uploads' | 'generated-apps' | 'app-assets';

/**
 * Type-safe bucket configuration
 */
export interface BucketConfig {
  name: BucketName;
  isPublic: boolean;
  maxFileSize: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

// ============================================================================
// FILE METADATA
// ============================================================================

/**
 * Complete metadata for a stored file
 * Includes all fields returned by Supabase Storage API
 */
export interface FileMetadata {
  /** Unique identifier (typically the file path) */
  id: FileId;

  /** File name without path */
  name: string;

  /** File size in bytes */
  size: number;

  /** MIME type of the file */
  mimeType: string;

  /** Bucket containing this file */
  bucket: BucketName;

  /** User ID of the file owner */
  owner: UserId;

  /** Full path within the bucket */
  path: FilePath;

  /** File creation timestamp */
  createdAt: string; // ISO 8601 format

  /** Last modification timestamp */
  updatedAt: string; // ISO 8601 format

  /** Last access timestamp (if available) */
  lastAccessedAt?: string; // ISO 8601 format

  /** Custom metadata key-value pairs */
  metadata?: Record<string, string | number | boolean>;

  /** Cache control header value */
  cacheControl?: string;

  /** Public URL (for public buckets) */
  publicUrl?: string;
}

// ============================================================================
// UPLOAD CONFIGURATION
// ============================================================================

/**
 * Configuration options for file upload
 */
export interface UploadConfig {
  /** Cache-Control header value (default: '3600' = 1 hour) */
  cacheControl?: string;

  /** Content-Type header value (default: auto-detected from file) */
  contentType?: string;

  /** Whether to overwrite existing file (default: false) */
  upsert?: boolean;

  /** Maximum file size in bytes (default: from bucket config) */
  maxSize?: number;

  /** Allowed MIME types (default: from bucket config) */
  allowedTypes?: string[];

  /** Allowed file extensions (default: from bucket config) */
  allowedExtensions?: string[];

  /** Custom metadata to attach to file */
  metadata?: Record<string, string | number | boolean>;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Standard error codes for storage operations
 */
export enum StorageErrorCode {
  /** File exceeds maximum allowed size */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  /** File type not allowed by bucket configuration */
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',

  /** File extension not allowed by bucket configuration */
  INVALID_EXTENSION = 'INVALID_EXTENSION',

  /** Upload operation failed */
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  /** Download operation failed */
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

  /** Delete operation failed */
  DELETE_FAILED = 'DELETE_FAILED',

  /** User does not have permission for this operation */
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  /** Requested file or bucket not found */
  NOT_FOUND = 'NOT_FOUND',

  /** Network error or timeout */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** User not authenticated */
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',

  /** Storage quota exceeded */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  /** Unknown or unexpected error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error information for storage operations
 */
export interface StorageError {
  /** Error code for programmatic handling */
  code: StorageErrorCode;

  /** Human-readable error message */
  message: string;

  /** Additional error details (e.g., validation errors) */
  details?: Record<string, unknown>;

  /** Original error object (if available) */
  originalError?: unknown;

  /** Timestamp when error occurred */
  timestamp: string; // ISO 8601 format
}

/**
 * Result type for storage operations
 * Follows functional programming pattern for explicit error handling
 *
 * @template T - Type of successful result data
 *
 * @example
 * const result: StorageResult<FileMetadata> = await uploadFile(...);
 *
 * if (result.success) {
 *   console.log('Uploaded:', result.data.name);
 * } else {
 *   console.error('Error:', result.error.message);
 * }
 */
export type StorageResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: StorageError };

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Options for paginating file lists
 */
export interface PaginationOptions {
  /** Maximum number of items to return */
  limit?: number;

  /** Number of items to skip */
  offset?: number;

  /** Sort configuration */
  sortBy?: {
    /** Column to sort by */
    column: 'name' | 'size' | 'created_at' | 'updated_at';
    /** Sort direction */
    order: 'asc' | 'desc';
  };
}

/**
 * Paginated result set
 *
 * @template T - Type of items in the result set
 */
export interface PaginatedResult<T> {
  /** Array of items in this page */
  items: T[];

  /** Total number of items across all pages */
  total: number;

  /** Whether there are more items beyond this page */
  hasMore: boolean;

  /** Offset for the next page (if hasMore is true) */
  nextOffset?: number;

  /** Current pagination options used */
  pagination: Required<PaginationOptions>;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * File validation rules
 */
export interface FileValidationRules {
  /** Maximum file size in bytes */
  maxSize: number;

  /** Allowed MIME types (empty array = all allowed) */
  allowedTypes: string[];

  /** Allowed file extensions (empty array = all allowed) */
  allowedExtensions: string[];
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
  /** Whether file passed all validation rules */
  isValid: boolean;

  /** List of validation errors (if any) */
  errors: Array<{
    code: StorageErrorCode;
    message: string;
  }>;
}

// ============================================================================
// STORAGE STATISTICS
// ============================================================================

/**
 * Storage usage statistics for a user
 */
export interface StorageStats {
  /** User ID */
  userId: UserId;

  /** Total number of files */
  totalFiles: number;

  /** Total storage used in bytes */
  totalSize: number;

  /** Breakdown by bucket */
  byBucket: Record<
    BucketName,
    {
      fileCount: number;
      totalSize: number;
    }
  >;

  /** Breakdown by file type */
  byType: Record<
    string,
    {
      fileCount: number;
      totalSize: number;
    }
  >;

  /** Storage quota in bytes (if applicable) */
  quota?: number;

  /** Percentage of quota used (0-100) */
  quotaUsagePercent?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a result is successful
 *
 * @param result - Storage operation result
 * @returns true if operation succeeded
 */
export function isSuccess<T>(result: StorageResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a result is an error
 *
 * @param result - Storage operation result
 * @returns true if operation failed
 */
export function isError<T>(
  result: StorageResult<T>
): result is { success: false; error: StorageError } {
  return result.success === false;
}

/**
 * Check if an error is retryable
 * Retryable errors: network errors, timeouts, server errors
 * Non-retryable: permission denied, not found, validation errors
 *
 * @param error - Storage error
 * @returns true if operation can be retried
 */
export function isRetryableError(error: StorageError): boolean {
  const retryableCodes: StorageErrorCode[] = [
    StorageErrorCode.NETWORK_ERROR,
    StorageErrorCode.UPLOAD_FAILED,
    StorageErrorCode.DOWNLOAD_FAILED,
    StorageErrorCode.UNKNOWN_ERROR,
  ];

  return retryableCodes.includes(error.code);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a branded type value
 * This is a runtime no-op but provides type safety at compile time
 *
 * @template T - Branded type to create
 * @param value - String value to brand
 * @returns Branded value
 */
export function brand<T extends string>(value: string): BrandedString<T> {
  return value as BrandedString<T>;
}

/**
 * Extract file extension from filename or path
 *
 * @param filename - File name or path
 * @returns File extension (lowercase, without dot) or empty string
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Format file size for human readability
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a StorageError from various error sources
 *
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @param originalError - Original error object
 * @returns Structured storage error
 */
export function createStorageError(
  code: StorageErrorCode,
  message: string,
  details?: Record<string, unknown>,
  originalError?: unknown
): StorageError {
  return {
    code,
    message,
    details,
    originalError,
    timestamp: new Date().toISOString(),
  };
}
