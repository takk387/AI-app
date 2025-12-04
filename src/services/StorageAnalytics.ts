/**
 * Storage Analytics Service
 * Phase 4: Monitoring & Analytics
 *
 * Tracks storage operations (upload, download, delete) and stores metrics
 * in both the database (analytics_events table) and in-memory for real-time monitoring.
 *
 * Architecture:
 * - Dependency injection pattern (SupabaseClient passed via constructor)
 * - Works in both client and server contexts
 * - Integrates with existing analytics_events database table
 * - Provides performance monitoring for storage operations
 * - Structured error tracking with categorization
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { StorageError, StorageErrorCode, BucketName, FileId } from '@/types/storage';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Storage event types for tracking different operations
 */
export type StorageEventType =
  | 'storage_upload_start'
  | 'storage_upload_complete'
  | 'storage_upload_error'
  | 'storage_download_start'
  | 'storage_download_complete'
  | 'storage_download_error'
  | 'storage_delete_start'
  | 'storage_delete_complete'
  | 'storage_delete_error'
  | 'storage_list_start'
  | 'storage_list_complete'
  | 'storage_list_error'
  | 'storage_quota_warning'
  | 'storage_quota_exceeded'
  | 'storage_validation_error';

/**
 * Base event data structure
 */
export interface BaseEventData {
  operationId: string;
  bucket?: BucketName;
  timestamp: number;
  duration?: number; // milliseconds
  success: boolean;
}

/**
 * Upload event data
 */
export interface UploadEventData extends BaseEventData {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileExtension?: string;
  uploadDuration?: number;
  retryCount?: number;
  validationErrors?: string[];
}

/**
 * Download event data
 */
export interface DownloadEventData extends BaseEventData {
  fileId: FileId;
  fileName: string;
  fileSize: number;
  downloadDuration?: number;
}

/**
 * Delete event data
 */
export interface DeleteEventData extends BaseEventData {
  fileId: FileId;
  fileName: string;
  fileSize?: number;
}

/**
 * List operation event data
 */
export interface ListEventData extends BaseEventData {
  filesReturned: number;
  offset?: number;
  limit?: number;
  sortBy?: string;
}

/**
 * Error event data
 */
export interface ErrorEventData extends BaseEventData {
  errorCode: StorageErrorCode;
  errorMessage: string;
  errorStack?: string;
  isRetryable: boolean;
  retryAttempt?: number;
  context?: Record<string, any>;
}

/**
 * Quota warning event data
 */
export interface QuotaEventData extends BaseEventData {
  currentUsage: number;
  quotaLimit: number;
  usagePercentage: number;
  warningLevel: 'medium' | 'high' | 'critical';
}

/**
 * Union type for all event data
 */
export type StorageEventData =
  | UploadEventData
  | DownloadEventData
  | DeleteEventData
  | ListEventData
  | ErrorEventData
  | QuotaEventData;

/**
 * In-memory metrics for real-time monitoring
 */
export interface StorageMetricsSummary {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalDownloads: number;
  totalDeletes: number;
  totalBytesUploaded: number;
  totalBytesDownloaded: number;
  averageUploadDuration: number;
  averageDownloadDuration: number;
  errorsByCode: Record<StorageErrorCode, number>;
  quotaWarnings: number;
  lastUpdated: number;
}

/**
 * Performance metrics for an operation
 */
export interface PerformanceMetrics {
  operationId: string;
  startTime: number;
  checkpoints: Map<string, number>;
}

// ============================================================================
// STORAGE ANALYTICS SERVICE
// ============================================================================

export class StorageAnalyticsService {
  private client: SupabaseClient<Database>;
  private inMemoryMetrics: StorageMetricsSummary;
  private performanceTrackers: Map<string, PerformanceMetrics>;
  private maxTrackers = 100; // Prevent memory leaks

  /**
   * Create a new StorageAnalyticsService
   *
   * @param client - Supabase client (browser or server)
   *
   * @example
   * ```typescript
   * // Client component
   * import { createClient } from '@/utils/supabase/client';
   * const supabase = createClient();
   * const analytics = new StorageAnalyticsService(supabase);
   *
   * // Server component / API route
   * import { createClient } from '@/utils/supabase/server';
   * const supabase = await createClient();
   * const analytics = new StorageAnalyticsService(supabase);
   * ```
   */
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
    this.performanceTrackers = new Map();

    // Initialize in-memory metrics
    this.inMemoryMetrics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalDownloads: 0,
      totalDeletes: 0,
      totalBytesUploaded: 0,
      totalBytesDownloaded: 0,
      averageUploadDuration: 0,
      averageDownloadDuration: 0,
      errorsByCode: {} as Record<StorageErrorCode, number>,
      quotaWarnings: 0,
      lastUpdated: Date.now(),
    };
  }

  // ==========================================================================
  // PUBLIC TRACKING METHODS
  // ==========================================================================

  /**
   * Track a file upload operation
   */
  async trackUpload(data: {
    operationId: string;
    bucket: BucketName;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileExtension?: string;
    success: boolean;
    duration?: number;
    retryCount?: number;
    validationErrors?: string[];
  }): Promise<void> {
    const eventData: UploadEventData = {
      ...data,
      timestamp: Date.now(),
      uploadDuration: data.duration,
    };

    // Update in-memory metrics
    this.inMemoryMetrics.totalUploads++;
    if (data.success) {
      this.inMemoryMetrics.successfulUploads++;
      this.inMemoryMetrics.totalBytesUploaded += data.fileSize;

      if (data.duration) {
        this.updateAverageUploadDuration(data.duration);
      }
    } else {
      this.inMemoryMetrics.failedUploads++;
    }
    this.inMemoryMetrics.lastUpdated = Date.now();

    // Store in database
    const eventType: StorageEventType = data.success
      ? 'storage_upload_complete'
      : 'storage_upload_error';

    await this.storeEvent(eventType, eventData);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const status = data.success ? '✅' : '❌';
      console.log(
        `[Storage Analytics] ${status} Upload: ${data.fileName} (${this.formatBytes(data.fileSize)}) - ${data.duration || 0}ms`
      );
    }
  }

  /**
   * Track a file download operation
   */
  async trackDownload(data: {
    operationId: string;
    bucket: BucketName;
    fileId: FileId;
    fileName: string;
    fileSize: number;
    success: boolean;
    duration?: number;
  }): Promise<void> {
    const eventData: DownloadEventData = {
      ...data,
      timestamp: Date.now(),
      downloadDuration: data.duration,
    };

    // Update in-memory metrics
    if (data.success) {
      this.inMemoryMetrics.totalDownloads++;
      this.inMemoryMetrics.totalBytesDownloaded += data.fileSize;

      if (data.duration) {
        this.updateAverageDownloadDuration(data.duration);
      }
    }
    this.inMemoryMetrics.lastUpdated = Date.now();

    // Store in database
    const eventType: StorageEventType = data.success
      ? 'storage_download_complete'
      : 'storage_download_error';

    await this.storeEvent(eventType, eventData);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const status = data.success ? '✅' : '❌';
      console.log(
        `[Storage Analytics] ${status} Download: ${data.fileName} (${this.formatBytes(data.fileSize)}) - ${data.duration || 0}ms`
      );
    }
  }

  /**
   * Track a file delete operation
   */
  async trackDelete(data: {
    operationId: string;
    bucket: BucketName;
    fileId: FileId;
    fileName: string;
    fileSize?: number;
    success: boolean;
    duration?: number;
  }): Promise<void> {
    const eventData: DeleteEventData = {
      ...data,
      timestamp: Date.now(),
    };

    // Update in-memory metrics
    if (data.success) {
      this.inMemoryMetrics.totalDeletes++;
    }
    this.inMemoryMetrics.lastUpdated = Date.now();

    // Store in database
    const eventType: StorageEventType = data.success
      ? 'storage_delete_complete'
      : 'storage_delete_error';

    await this.storeEvent(eventType, eventData);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      const status = data.success ? '✅' : '❌';
      console.log(`[Storage Analytics] ${status} Delete: ${data.fileName}`);
    }
  }

  /**
   * Track a list operation
   */
  async trackList(data: {
    operationId: string;
    bucket: BucketName;
    filesReturned: number;
    success: boolean;
    duration?: number;
    offset?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<void> {
    const eventData: ListEventData = {
      ...data,
      timestamp: Date.now(),
    };

    // Store in database
    const eventType: StorageEventType = data.success
      ? 'storage_list_complete'
      : 'storage_list_error';

    await this.storeEvent(eventType, eventData);

    // Log in development
    if (process.env.NODE_ENV === 'development' && !data.success) {
      console.log(`[Storage Analytics] ❌ List operation failed - ${data.duration || 0}ms`);
    }
  }

  /**
   * Track a storage error
   */
  async trackError(data: {
    operationId: string;
    bucket?: BucketName;
    error: StorageError;
    isRetryable: boolean;
    retryAttempt?: number;
    context?: Record<string, any>;
  }): Promise<void> {
    const eventData: ErrorEventData = {
      operationId: data.operationId,
      bucket: data.bucket,
      timestamp: Date.now(),
      success: false,
      errorCode: data.error.code,
      errorMessage: data.error.message,
      errorStack: data.error.details ? JSON.stringify(data.error.details) : undefined,
      isRetryable: data.isRetryable,
      retryAttempt: data.retryAttempt,
      context: data.context,
    };

    // Update in-memory error tracking
    if (!this.inMemoryMetrics.errorsByCode[data.error.code]) {
      this.inMemoryMetrics.errorsByCode[data.error.code] = 0;
    }
    this.inMemoryMetrics.errorsByCode[data.error.code]++;
    this.inMemoryMetrics.lastUpdated = Date.now();

    // Store in database
    await this.storeEvent('storage_upload_error', eventData); // Generic error storage

    // Log error
    console.error(`[Storage Analytics] Error: ${data.error.code} - ${data.error.message}`, {
      operationId: data.operationId,
      isRetryable: data.isRetryable,
      retryAttempt: data.retryAttempt,
    });
  }

  /**
   * Track quota warnings
   */
  async trackQuotaWarning(data: {
    operationId: string;
    bucket: BucketName;
    currentUsage: number;
    quotaLimit: number;
    warningLevel: 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const usagePercentage = (data.currentUsage / data.quotaLimit) * 100;

    const eventData: QuotaEventData = {
      operationId: data.operationId,
      bucket: data.bucket,
      timestamp: Date.now(),
      success: true,
      currentUsage: data.currentUsage,
      quotaLimit: data.quotaLimit,
      usagePercentage,
      warningLevel: data.warningLevel,
    };

    // Update in-memory metrics
    this.inMemoryMetrics.quotaWarnings++;
    this.inMemoryMetrics.lastUpdated = Date.now();

    // Store in database
    const eventType: StorageEventType =
      usagePercentage >= 100 ? 'storage_quota_exceeded' : 'storage_quota_warning';

    await this.storeEvent(eventType, eventData);

    // Log warning
    console.warn(
      `[Storage Analytics] ⚠️ Quota ${data.warningLevel}: ${usagePercentage.toFixed(1)}% used (${this.formatBytes(data.currentUsage)} / ${this.formatBytes(data.quotaLimit)})`
    );
  }

  // ==========================================================================
  // PERFORMANCE TRACKING
  // ==========================================================================

  /**
   * Start tracking performance for an operation
   */
  startPerformanceTracking(operationId: string): void {
    this.performanceTrackers.set(operationId, {
      operationId,
      startTime: Date.now(),
      checkpoints: new Map(),
    });

    // Prevent memory leaks by limiting tracker count
    if (this.performanceTrackers.size > this.maxTrackers) {
      const firstKey = this.performanceTrackers.keys().next().value;
      this.performanceTrackers.delete(firstKey);
    }
  }

  /**
   * Add a checkpoint to performance tracking
   */
  addPerformanceCheckpoint(operationId: string, checkpointName: string): void {
    const tracker = this.performanceTrackers.get(operationId);
    if (!tracker) return;

    const elapsed = Date.now() - tracker.startTime;
    tracker.checkpoints.set(checkpointName, elapsed);
  }

  /**
   * Get the total elapsed time for an operation
   */
  getPerformanceElapsed(operationId: string): number {
    const tracker = this.performanceTrackers.get(operationId);
    if (!tracker) return 0;

    return Date.now() - tracker.startTime;
  }

  /**
   * Stop tracking performance and return metrics
   */
  stopPerformanceTracking(operationId: string): {
    totalDuration: number;
    checkpoints: Record<string, number>;
  } | null {
    const tracker = this.performanceTrackers.get(operationId);
    if (!tracker) return null;

    const totalDuration = Date.now() - tracker.startTime;
    const checkpoints: Record<string, number> = Object.fromEntries(tracker.checkpoints);

    // Clean up
    this.performanceTrackers.delete(operationId);

    return { totalDuration, checkpoints };
  }

  // ==========================================================================
  // METRICS & REPORTING
  // ==========================================================================

  /**
   * Get current in-memory metrics summary
   */
  getMetricsSummary(): StorageMetricsSummary {
    return { ...this.inMemoryMetrics };
  }

  /**
   * Get storage events from database
   */
  async getStorageEvents(options?: {
    eventType?: StorageEventType;
    since?: Date;
    limit?: number;
  }): Promise<Database['public']['Tables']['analytics_events']['Row'][]> {
    try {
      let query = this.client
        .from('analytics_events')
        .select('*')
        .like('event_type', 'storage_%')
        .order('created_at', { ascending: false });

      if (options?.eventType) {
        query = query.eq('event_type', options.eventType);
      }

      if (options?.since) {
        query = query.gte('created_at', options.since.toISOString());
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Storage Analytics] Error fetching events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[Storage Analytics] Error in getStorageEvents:', error);
      return [];
    }
  }

  /**
   * Clear in-memory metrics
   */
  clearMetrics(): void {
    this.inMemoryMetrics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalDownloads: 0,
      totalDeletes: 0,
      totalBytesUploaded: 0,
      totalBytesDownloaded: 0,
      averageUploadDuration: 0,
      averageDownloadDuration: 0,
      errorsByCode: {} as Record<StorageErrorCode, number>,
      quotaWarnings: 0,
      lastUpdated: Date.now(),
    };

    console.log('[Storage Analytics] In-memory metrics cleared');
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Store an event in the database
   */
  private async storeEvent(
    eventType: StorageEventType,
    eventData: StorageEventData
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.client.auth.getUser();

      const { error } = await this.client.from('analytics_events').insert({
        user_id: user?.id || null,
        event_type: eventType,
        event_data: eventData as any, // JSONB type
      });

      if (error) {
        console.error('[Storage Analytics] Error storing event:', error);
      }
    } catch (error) {
      console.error('[Storage Analytics] Error in storeEvent:', error);
    }
  }

  /**
   * Update average upload duration
   */
  private updateAverageUploadDuration(newDuration: number): void {
    const currentAvg = this.inMemoryMetrics.averageUploadDuration;
    const count = this.inMemoryMetrics.successfulUploads;

    // Calculate running average
    this.inMemoryMetrics.averageUploadDuration = (currentAvg * (count - 1) + newDuration) / count;
  }

  /**
   * Update average download duration
   */
  private updateAverageDownloadDuration(newDuration: number): void {
    const currentAvg = this.inMemoryMetrics.averageDownloadDuration;
    const count = this.inMemoryMetrics.totalDownloads;

    // Calculate running average
    this.inMemoryMetrics.averageDownloadDuration = (currentAvg * (count - 1) + newDuration) / count;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique operation ID for tracking
 */
export function generateOperationId(prefix: string = 'op'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate storage usage percentage
 */
export function calculateUsagePercentage(currentUsage: number, quotaLimit: number): number {
  if (quotaLimit === 0) return 0;
  return Math.round((currentUsage / quotaLimit) * 100 * 10) / 10; // One decimal place
}

/**
 * Determine quota warning level based on usage percentage
 */
export function getQuotaWarningLevel(
  usagePercentage: number
): 'medium' | 'high' | 'critical' | null {
  if (usagePercentage >= 95) return 'critical';
  if (usagePercentage >= 80) return 'high';
  if (usagePercentage >= 60) return 'medium';
  return null;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}
