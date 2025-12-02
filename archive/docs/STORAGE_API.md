# Storage API Reference

**Version:** 1.0.0  
**Last Updated:** November 23, 2025  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [StorageService API](#storageservice-api)
3. [StorageAnalyticsService API](#storageanalyticsservice-api)
4. [Storage Components](#storage-components)
5. [Type Definitions](#type-definitions)
6. [Error Handling](#error-handling)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Storage API provides a comprehensive, type-safe interface for managing files in Supabase Storage. It includes:

- **StorageService**: Core service for file operations (upload, download, delete, list)
- **StorageAnalyticsService**: Analytics and monitoring for storage operations
- **Storage Components**: React components for file management UI
- **Type System**: Branded types and error handling

### Key Features

- ✅ Type-safe operations with branded types
- ✅ Built-in retry logic with exponential backoff
- ✅ User-scoped security (RLS-compliant)
- ✅ Comprehensive error handling
- ✅ Analytics and monitoring
- ✅ Accessibility-first UI components

---

## StorageService API

### Constructor

```typescript
constructor(
  client: SupabaseClient,
  analytics?: StorageAnalyticsService
)
```

Creates a new StorageService instance.

**Parameters:**
- `client` (SupabaseClient, required): Injected Supabase client (browser or server)
- `analytics` (StorageAnalyticsService, optional): Analytics service for tracking operations

**Example:**
```typescript
import { createClient } from '@/utils/supabase/client';
import { StorageService } from '@/services/StorageService';

const supabase = createClient();
const storageService = new StorageService(supabase);
```

**With Analytics:**
```typescript
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

const supabase = createClient();
const analytics = new StorageAnalyticsService(supabase);
const storageService = new StorageService(supabase, analytics);
```

---

### upload()

Upload a file to a storage bucket.

```typescript
async upload(
  bucket: BucketName,
  file: File,
  config?: UploadConfig
): Promise<StorageResult<FileMetadata>>
```

**Parameters:**
- `bucket` (BucketName): Target bucket ('user-uploads' | 'generated-apps' | 'app-assets')
- `file` (File): File object to upload
- `config` (UploadConfig, optional): Upload configuration

**UploadConfig:**
```typescript
interface UploadConfig {
  makePublic?: boolean;        // Make file publicly accessible (default: false)
  cacheControl?: string;        // Cache-Control header
  contentType?: string;         // Override file MIME type
  upsert?: boolean;             // Replace if exists (default: false)
  metadata?: Record<string, string>;  // Custom metadata
}
```

**Returns:**
- `Promise<StorageResult<FileMetadata>>` - Success with file metadata or error

**Features:**
- Automatic file validation (size, type, extension)
- User-scoped path generation (prevents unauthorized access)
- Retry logic (3 attempts with exponential backoff)
- Analytics tracking (if enabled)

**Example:**
```typescript
const file = document.querySelector('input[type="file"]').files[0];

const result = await storageService.upload('user-uploads', file, {
  makePublic: false,
  cacheControl: '3600'
});

if (result.success) {
  console.log('File uploaded:', result.data);
  console.log('File ID:', result.data.id);
  console.log('File URL:', result.data.url);
} else {
  console.error('Upload failed:', result.error.message);
  
  // Handle specific errors
  if (result.error.code === StorageErrorCode.FILE_TOO_LARGE) {
    alert('File is too large. Maximum size is 10MB.');
  }
}
```

**Validation Rules by Bucket:**

| Bucket | Max Size | Allowed Types |
|--------|----------|---------------|
| user-uploads | 10MB | images, documents, archives |
| generated-apps | 50MB | HTML, CSS, JS, JSON |
| app-assets | 5MB | images, fonts, icons |

---

### list()

List files in a bucket with pagination and sorting.

```typescript
async list(
  bucket: BucketName,
  options?: PaginationOptions
): Promise<StorageResult<PaginatedResult<FileMetadata>>>
```

**Parameters:**
- `bucket` (BucketName): Bucket to list files from
- `options` (PaginationOptions, optional): Pagination and sorting options

**PaginationOptions:**
```typescript
interface PaginationOptions {
  limit?: number;               // Items per page (default: 50)
  offset?: number;              // Skip N items (default: 0)
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'size';  // Sort field
  sortOrder?: 'asc' | 'desc';   // Sort direction (default: 'desc')
}
```

**Returns:**
- `Promise<StorageResult<PaginatedResult<FileMetadata>>>` - Paginated file list or error

**PaginatedResult:**
```typescript
interface PaginatedResult<T> {
  items: T[];        // Files in current page
  total: number;     // Total files
  limit: number;     // Items per page
  offset: number;    // Current offset
  hasMore: boolean;  // More pages available
}
```

**Example:**
```typescript
const result = await storageService.list('user-uploads', {
  limit: 20,
  offset: 0,
  sortBy: 'created_at',
  sortOrder: 'desc'
});

if (result.success) {
  const { items, total, hasMore } = result.data;
  
  console.log(`Showing ${items.length} of ${total} files`);
  
  items.forEach(file => {
    console.log(file.name, formatFileSize(file.size));
  });
  
  if (hasMore) {
    // Load next page
    const nextPage = await storageService.list('user-uploads', {
      limit: 20,
      offset: 20
    });
  }
}
```

**Security:**
- Only lists files owned by current user (user-scoped)
- Respects bucket RLS policies

---

### delete()

Delete a file from a bucket.

```typescript
async delete(
  bucket: BucketName,
  path: FilePath | FileId
): Promise<StorageResult<void>>
```

**Parameters:**
- `bucket` (BucketName): Bucket containing the file
- `path` (FilePath | FileId): File path or ID to delete

**Returns:**
- `Promise<StorageResult<void>>` - Success or error

**Features:**
- Ownership verification (only delete own files)
- Analytics tracking

**Example:**
```typescript
const result = await storageService.delete('user-uploads', fileId);

if (result.success) {
  console.log('File deleted successfully');
} else {
  if (result.error.code === StorageErrorCode.PERMISSION_DENIED) {
    alert('You do not have permission to delete this file');
  } else if (result.error.code === StorageErrorCode.FILE_NOT_FOUND) {
    alert('File not found');
  } else {
    alert('Delete failed: ' + result.error.message);
  }
}
```

---

### download()

Download a file from a bucket.

```typescript
async download(
  bucket: BucketName,
  path: FilePath
): Promise<StorageResult<Blob>>
```

**Parameters:**
- `bucket` (BucketName): Bucket containing the file
- `path` (FilePath): File path

**Returns:**
- `Promise<StorageResult<Blob>>` - File blob or error

**Features:**
- Ownership verification
- Analytics tracking

**Example:**
```typescript
const result = await storageService.download('user-uploads', filePath);

if (result.success) {
  const blob = result.data;
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filename.txt';
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
} else {
  console.error('Download failed:', result.error.message);
}
```

---

### getUrl()

Get a URL for a file (public or signed).

```typescript
async getUrl(
  bucket: BucketName,
  path: FilePath,
  options?: { expiresIn?: number }
): Promise<StorageResult<string | SignedUrl>>
```

**Parameters:**
- `bucket` (BucketName): Bucket containing the file
- `path` (FilePath): File path
- `options` (optional):
  - `expiresIn` (number): Expiration time in seconds (default: 3600)

**Returns:**
- `Promise<StorageResult<string | SignedUrl>>` - URL or error

**Behavior:**
- Public buckets: Returns public URL (no expiration)
- Private buckets: Returns signed URL (with expiration)

**Example:**
```typescript
// Public URL (for public buckets)
const result = await storageService.getUrl('app-assets', filePath);

if (result.success) {
  const url = result.data;
  imageElement.src = url;
}

// Signed URL (for private buckets)
const result = await storageService.getUrl('user-uploads', filePath, {
  expiresIn: 7200  // 2 hours
});

if (result.success) {
  const signedUrl = result.data;
  // Share this URL (valid for 2 hours)
}
```

---

## StorageAnalyticsService API

### Constructor

```typescript
constructor(client: SupabaseClient)
```

Creates a new StorageAnalyticsService instance.

**Example:**
```typescript
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

const supabase = createClient();
const analytics = new StorageAnalyticsService(supabase);
```

---

### trackUpload()

Track a file upload event.

```typescript
async trackUpload(
  fileId: FileId,
  fileName: string,
  fileSize: number,
  fileType: string,
  bucket: BucketName,
  duration: number,
  success: boolean
): Promise<void>
```

**Example:**
```typescript
await analytics.trackUpload(
  fileId,
  'document.pdf',
  1048576,  // 1MB
  'application/pdf',
  'user-uploads',
  1234,  // milliseconds
  true
);
```

---

### trackError()

Track a storage error.

```typescript
async trackError(
  operation: string,
  errorCode: StorageErrorCode,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<void>
```

**Example:**
```typescript
await analytics.trackError(
  'upload',
  StorageErrorCode.FILE_TOO_LARGE,
  'File exceeds maximum size of 10MB',
  { bucket: 'user-uploads', fileSize: 15000000 }
);
```

---

### startPerformanceTracking()

Start tracking performance for an operation.

```typescript
startPerformanceTracking(operationId: string): void
```

**Example:**
```typescript
const operationId = analytics.generateOperationId();
analytics.startPerformanceTracking(operationId);

// ... perform operation ...

analytics.addPerformanceCheckpoint(operationId, 'validation_complete');
// ... continue operation ...

const metrics = analytics.stopPerformanceTracking(operationId);
console.log('Operation took:', metrics.duration, 'ms');
```

---

### getMetricsSummary()

Get current metrics summary.

```typescript
getMetricsSummary(): MetricsSummary
```

**Returns:**
```typescript
interface MetricsSummary {
  uploads: { total: number; successful: number; failed: number };
  downloads: { total: number; successful: number; failed: number };
  deletes: { total: number; successful: number; failed: number };
  lists: { total: number; successful: number; failed: number };
  errors: { total: number; byCode: Map<StorageErrorCode, number> };
  quotaWarnings: number;
}
```

**Example:**
```typescript
const metrics = analytics.getMetricsSummary();

console.log('Total uploads:', metrics.uploads.total);
console.log('Upload success rate:', 
  (metrics.uploads.successful / metrics.uploads.total * 100).toFixed(2) + '%'
);
```

---

## Storage Components

### FileUploader

Drag-and-drop file uploader with validation.

**Props:**
```typescript
interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;           // Accepted file types
  maxSize?: number;          // Max file size in bytes
  maxFiles?: number;         // Max files per upload
  disabled?: boolean;
}
```

**Example:**
```typescript
<FileUploader
  onUpload={handleUpload}
  accept="image/*,.pdf"
  maxSize={10 * 1024 * 1024}  // 10MB
  maxFiles={5}
/>
```

---

### FileGrid

Responsive grid of file cards.

**Props:**
```typescript
interface FileGridProps {
  files: FileMetadata[];
  loading?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (fileId: string) => void;
  onDelete?: (fileId: FileId) => void;
  onDownload?: (file: FileMetadata) => void;
}
```

**Example:**
```typescript
<FileGrid
  files={files}
  loading={loading}
  selectedIds={selectedIds}
  onSelect={handleSelect}
  onDelete={handleDelete}
  onDownload={handleDownload}
/>
```

---

### FileCard

Individual file display card.

**Props:**
```typescript
interface FileCardProps {
  file: FileMetadata;
  selected?: boolean;
  onSelect?: (fileId: string) => void;
  onDelete?: (fileId: FileId) => void;
  onDownload?: (file: FileMetadata) => void;
}
```

---

### StorageStats

Storage usage visualization.

**Props:**
```typescript
interface StorageStatsProps {
  totalSize: number;    // Total bucket size
  usedSize: number;     // Used space
  fileCount: number;    // Number of files
  quota?: number;       // Storage quota (optional)
}
```

**Example:**
```typescript
<StorageStats
  totalSize={1000000000}  // 1GB
  usedSize={750000000}    // 750MB
  fileCount={42}
  quota={1000000000}
/>
```

---

### FileFilters

Search, filter, and sort controls.

**Props:**
```typescript
interface FileFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterChange: (type: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}
```

---

### FileActions

Bulk operations toolbar.

**Props:**
```typescript
interface FileActionsProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onClearSelection: () => void;
}
```

---

## Type Definitions

### Branded Types

```typescript
type FilePath = BrandedString<'FilePath'>;
type FileId = BrandedString<'FileId'>;
type UserId = BrandedString<'UserId'>;
type SignedUrl = BrandedString<'SignedUrl'>;

// Brand a string
const filePath: FilePath = brand<'FilePath'>('user/file.txt');
```

### FileMetadata

```typescript
interface FileMetadata {
  id: FileId;
  name: string;
  bucket: BucketName;
  path: FilePath;
  size: number;
  contentType: string;
  extension: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: UserId;
  isPublic: boolean;
  url: string | SignedUrl | null;
}
```

### StorageResult

```typescript
type StorageResult<T> = 
  | { success: true; data: T }
  | { success: false; error: StorageError };

// Type guards
function isSuccess<T>(result: StorageResult<T>): result is { success: true; data: T };
function isError<T>(result: StorageResult<T>): result is { success: false; error: StorageError };
```

### StorageError

```typescript
interface StorageError {
  code: StorageErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
}

enum StorageErrorCode {
  FILE_TOO_LARGE = 'file_too_large',
  INVALID_FILE_TYPE = 'invalid_file_type',
  INVALID_FILE_EXTENSION = 'invalid_file_extension',
  MISSING_FILE = 'missing_file',
  PERMISSION_DENIED = 'permission_denied',
  UNAUTHORIZED = 'unauthorized',
  FILE_NOT_FOUND = 'file_not_found',
  BUCKET_NOT_FOUND = 'bucket_not_found',
  UPLOAD_FAILED = 'upload_failed',
  DOWNLOAD_FAILED = 'download_failed',
  DELETE_FAILED = 'delete_failed',
  UNKNOWN_ERROR = 'unknown_error'
}
```

---

## Error Handling

### Pattern: Result Type

Use discriminated unions for type-safe error handling:

```typescript
const result = await storageService.upload('user-uploads', file);

if (result.success) {
  // TypeScript knows result.data exists
  const fileMetadata = result.data;
  console.log('Uploaded:', fileMetadata.name);
} else {
  // TypeScript knows result.error exists
  const error = result.error;
  
  switch (error.code) {
    case StorageErrorCode.FILE_TOO_LARGE:
      alert('File is too large');
      break;
    case StorageErrorCode.INVALID_FILE_TYPE:
      alert('Invalid file type');
      break;
    case StorageErrorCode.PERMISSION_DENIED:
      alert('Permission denied');
      break;
    default:
      alert('Upload failed: ' + error.message);
  }
}
```

### Pattern: Type Guards

Use type guards for cleaner code:

```typescript
import { isSuccess, isError } from '@/types/storage';

const result = await storageService.upload('user-uploads', file);

if (isSuccess(result)) {
  handleSuccess(result.data);
} else if (isError(result)) {
  handleError(result.error);
}
```

### Retryable Errors

Some errors are retryable (automatic with StorageService):

```typescript
if (result.error.retryable) {
  console.log('Error is retryable, will attempt again');
}

// Retryable error codes:
// - UPLOAD_FAILED
// - DOWNLOAD_FAILED
// - UNKNOWN_ERROR
```

---

## Usage Examples

### Complete Upload Flow

```typescript
async function uploadFile(file: File) {
  // Validate before upload
  if (file.size > 10 * 1024 * 1024) {
    alert('File too large (max 10MB)');
    return;
  }
  
  // Upload with progress tracking
  setUploading(true);
  
  const result = await storageService.upload('user-uploads', file, {
    makePublic: false
  });
  
  setUploading(false);
  
  if (isSuccess(result)) {
    // Update UI
    setFiles(prev => [...prev, result.data]);
    toast.success('File uploaded successfully');
    
    // Get URL for display
    const urlResult = await storageService.getUrl(
      'user-uploads',
      result.data.path
    );
    
    if (isSuccess(urlResult)) {
      setPreviewUrl(urlResult.data);
    }
  } else {
    // Handle errors
    const errorMessages: Record<StorageErrorCode, string> = {
      [StorageErrorCode.FILE_TOO_LARGE]: 'File is too large (max 10MB)',
      [StorageErrorCode.INVALID_FILE_TYPE]: 'File type not allowed',
      [StorageErrorCode.PERMISSION_DENIED]: 'Permission denied',
    };
    
    const message = errorMessages[result.error.code] || result.error.message;
    toast.error(message);
  }
}
```

### Paginated File List

```typescript
function FileListComponent() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const ITEMS_PER_PAGE = 20;
  
  const loadFiles = async (pageNum: number) => {
    setLoading(true);
    
    const result = await storageService.list('user-uploads', {
      limit: ITEMS_PER_PAGE,
      offset: pageNum * ITEMS_PER_PAGE,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    
    setLoading(false);
    
    if (isSuccess(result)) {
      setFiles(result.data.items);
      setHasMore(result.data.hasMore);
    }
  };
  
  useEffect(() => {
    loadFiles(page);
  }, [page]);
  
  return (
    <div>
      <FileGrid files={files} loading={loading} />
      
      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        
        <span>Page {page + 1}</span>
        
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Bulk Operations

```typescript
async function bulkDelete(fileIds: FileId[]) {
  const confirmed = window.confirm(
    `Delete ${fileIds.length} file${fileIds.length > 1 ? 's' : ''}?`
  );
  
  if (!confirmed) return;
  
  const results = await Promise.all(
    fileIds.map(id => 
      storageService.delete('user-uploads', id)
    )
  );
  
  const successful = results.filter(isSuccess).length;
  const failed = results.filter(isError).length;
  
  if (successful > 0) {
    toast.success(`Deleted ${successful} file${successful > 1 ? 's' : ''}`);
    refreshFiles();
  }
  
  if (failed > 0) {
    toast.error(`Failed to delete ${failed} file${failed > 1 ? 's' : ''}`);
  }
}
```

---

## Best Practices

### 1. Always Handle Both Success and Error

```typescript
// ✅ Good
const result = await storageService.upload('user-uploads', file);
if (result.success) {
  handleSuccess(result.data);
} else {
  handleError(result.error);
}

// ❌ Bad (assumes success)
const result = await storageService.upload('user-uploads', file);
handleSuccess(result.data);  // TypeScript error! data might not exist
```

### 2. Use Type Guards

```typescript
// ✅ Good
if (isSuccess(result)) {
  // result.data available
}

// ❌ Verbose
if (result.success) {
  const data = result.data;  // Requires type assertion
}
```

### 3. Inject Correct Supabase Client

```typescript
// ✅ Client Component
'use client';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
const service = new StorageService(supabase);

// ✅ Server Component / API Route
import { createClient } from '@/utils/supabase/server';
const supabase = await createClient();
const service = new StorageService(supabase);

// ❌ Wrong context
import { createClient } from '@/utils/supabase/client';  // Browser client
// Used in API route - will fail authentication!
```

### 4. Enable Analytics in Production

```typescript
// ✅ Production
const analytics = new StorageAnalyticsService(supabase);
const service = new StorageService(supabase, analytics);

// View metrics
const metrics = analytics.getMetricsSummary();
```

### 5. Validate Before Upload

```typescript
// ✅ Good - validate early
if (file.size > MAX_SIZE) {
  alert('File too large');
  return;
}

const result = await storageService.upload('user-uploads', file);

// ❌ Bad - rely on server validation only
const result = await storageService.upload('user-uploads', file);
// User waits for network round-trip to learn file is too large
```

### 6. Use Branded Types

```typescript
// ✅ Good - type safe
const path: FilePath = brand<'FilePath'>(filePath);
await storageService.delete('user-uploads', path);

// ❌ Risky - could pass wrong string
await storageService.delete('user-uploads', userId);  // Wrong!
```

### 7. Cleanup URLs

```typescript
// ✅ Good - cleanup blob URLs
const result = await storageService.download('user-uploads', path);
if (isSuccess(result)) {
  const url = URL.createObjectURL(result.data);
  // Use URL...
  URL.revokeObjectURL(url);  // Cleanup!
}
```

---

## Troubleshooting

### "Not authenticated" Error

**Problem:** StorageService methods fail with authentication error

**Solution:**
- Ensure user is logged in
- Check Supabase client has valid session
- Verify correct client (server vs browser) for context

```typescript
// Check authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Redirect to login
}
```

### "Permission denied" Error

**Problem:** Cannot access or delete file

**Solution:**
- Verify file belongs to current user
- Check RLS policies in Supabase
- Ensure bucket permissions are correct

### Files Not Showing Up

**Problem:** `list()` returns empty array but files exist

**Solution:**
- Check you're listing correct bucket
- Verify RLS policies allow listing
- Ensure files are scoped to current user

```typescript
// Debug: check user ID
const userId = await service['getUserId']();  // Private method
console.log('Current user:', userId);
```

### Upload Fails Silently

**Problem:** Upload doesn't complete, no error shown

**Solution:**
- Check browser console for errors
- Verify bucket exists in Supabase
- Check file size limits
- Enable analytics to track errors

```typescript
const analytics = new StorageAnalyticsService(supabase);
const service = new StorageService(supabase, analytics);

// Check metrics after failed upload
const metrics = analytics.getMetricsSummary();
console.log('Errors:', metrics.errors);
```

### TypeScript Errors

**Problem:** Type errors when using StorageService

**Solution:**
- Ensure all types are imported from `@/types/storage`
- Use branded types correctly
- Don't bypass type system with `any` or `as`

```typescript
// ✅ Correct
import { FileId, FilePath, brand } from '@/types/storage';
const fileId: FileId = brand<'FileId'>(id);

// ❌ Wrong
const fileId = id as any;  // Defeats type safety
```

---

## Migration Guide

### From Direct Supabase Calls

**Before:**
```typescript
const { data, error } = await supabase.storage
  .from('user-uploads')
  .upload(path, file);
```

**After:**
```typescript
const result = await storageService.upload('user-uploads', file);

if (result.success) {
  const fileMetadata = result.data;
} else {
  const error = result.error;
}
```

**Benefits:**
- Type safety
- Automatic retry
- User-scoped paths
- Analytics tracking
- Validation

---

## Support

For issues or questions:

1. Check this documentation
2. Review ADRs in `docs/adr/`
3. Check troubleshooting section
4. Review test files for examples
5. Open an issue in the repository

---

## Related Documentation

- [Architecture Decision Records](./adr/)
  - [001: Storage Service Layer](./adr/001-storage-service-layer.md)
  - [002: Type System Design](./adr/002-type-system-design.md)
  - [003: Component Architecture](./adr/003-component-architecture.md)
- [Strategic Plan](./SUPABASE_STORAGE_STRATEGIC_PLAN.md)
- [Phase 4 Monitoring Guide](./PHASE4_MONITORING_GUIDE.md)
- [Supabase Quick Start](./SUPABASE_QUICK_START.md)

---

**Version History:**
- 1.0.0 (2025-11-23): Initial API reference documentation
