/**
 * StorageProxyService
 *
 * Proxies file storage via Cloudflare R2 or AWS S3.
 * Tracks storage usage and calculates costs.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type {
  ProxyRequestContext,
  ProxyResult,
  StorageUploadRequest,
  StorageUploadResult,
  IProxyService,
} from '@/types/api-gateway';
import { getUsageTrackingService } from './UsageTrackingService';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Pricing per GB
 * Platform adds markup for managed storage
 */
const STORAGE_PRICING = {
  costPerGBMonthly: 0.015, // $0.015 per GB/month (R2 pricing)
  markupPercent: 33,
  get pricePerGBMonthly() {
    return this.costPerGBMonthly * (1 + this.markupPercent / 100);
  },
  // Calculate cost per byte for upload tracking
  get pricePerByte() {
    return this.pricePerGBMonthly / (1024 * 1024 * 1024);
  },
};

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed content types (can be extended)
const ALLOWED_CONTENT_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  // Audio
  'audio/mpeg',
  'audio/wav',
  // Video
  'video/mp4',
  'video/webm',
];

// ============================================================================
// STORAGE PROXY SERVICE
// ============================================================================

export class StorageProxyService implements IProxyService<
  StorageUploadRequest & { file: Blob },
  StorageUploadResult
> {
  private platformR2AccountId: string;
  private platformR2AccessKey: string;
  private platformR2SecretKey: string;
  private platformR2BucketName: string;
  private platformR2PublicUrl: string;

  constructor() {
    this.platformR2AccountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.platformR2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY || '';
    this.platformR2SecretKey = process.env.CLOUDFLARE_R2_SECRET_KEY || '';
    this.platformR2BucketName = process.env.CLOUDFLARE_R2_BUCKET || 'app-uploads';
    this.platformR2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
  }

  /**
   * Upload a file to storage
   */
  async proxy(
    request: StorageUploadRequest & { file: Blob },
    context: ProxyRequestContext
  ): Promise<ProxyResult<StorageUploadResult>> {
    const config = context.isPlatformKey
      ? {
          accountId: this.platformR2AccountId,
          accessKey: this.platformR2AccessKey,
          secretKey: this.platformR2SecretKey,
          bucketName: this.platformR2BucketName,
          publicUrl: this.platformR2PublicUrl,
        }
      : await this.getUserStorageConfig(context.userId);

    if (!config.accessKey || !config.secretKey) {
      return {
        success: false,
        error: 'No storage credentials available',
      };
    }

    try {
      // Generate unique key for the file
      const key = this.generateFileKey(context.appId, request.folder, request.fileName);

      // Upload to R2
      const uploadResult = await this.uploadToR2(
        config,
        key,
        request.file,
        request.contentType,
        request.isPublic ?? false
      );

      if (!uploadResult.success) {
        return {
          success: false,
          data: {
            success: false,
            error: uploadResult.error,
          },
          error: uploadResult.error,
        };
      }

      // Track usage if using platform storage
      let usageInfo: ProxyResult['usage'];
      if (context.isPlatformKey) {
        usageInfo = await this.trackUsage(context, request.size);
      }

      // Construct public URL if file is public
      const url = request.isPublic && config.publicUrl ? `${config.publicUrl}/${key}` : undefined;

      return {
        success: true,
        data: {
          success: true,
          url,
          key,
          size: request.size,
        },
        usage: usageInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Upload file to Cloudflare R2
   */
  private async uploadToR2(
    config: {
      accountId: string;
      accessKey: string;
      secretKey: string;
      bucketName: string;
    },
    key: string,
    file: Blob,
    contentType: string,
    _isPublic: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
      });

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Note: R2 doesn't support ACL in the same way as S3
          // Public access is configured at the bucket level or via custom domains
        })
      );

      console.log(`[StorageProxyService] Uploaded ${key} to R2 bucket ${config.bucketName}`);
      return { success: true };
    } catch (error) {
      console.error('[StorageProxyService] Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete file from Cloudflare R2
   */
  async deleteFromR2(
    key: string,
    config?: {
      accountId: string;
      accessKey: string;
      secretKey: string;
      bucketName: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const storageConfig = config || {
      accountId: this.platformR2AccountId,
      accessKey: this.platformR2AccessKey,
      secretKey: this.platformR2SecretKey,
      bucketName: this.platformR2BucketName,
    };

    if (!storageConfig.accessKey || !storageConfig.secretKey) {
      return { success: false, error: 'Storage credentials not configured' };
    }

    try {
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${storageConfig.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: storageConfig.accessKey,
          secretAccessKey: storageConfig.secretKey,
        },
      });

      await client.send(
        new DeleteObjectCommand({
          Bucket: storageConfig.bucketName,
          Key: key,
        })
      );

      console.log(
        `[StorageProxyService] Deleted ${key} from R2 bucket ${storageConfig.bucketName}`
      );
      return { success: true };
    } catch (error) {
      console.error('[StorageProxyService] Delete failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Generate a unique file key
   */
  private generateFileKey(appId: string, folder: string | undefined, fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const basePath = folder ? `${appId}/${folder}` : appId;
    return `${basePath}/${timestamp}-${random}-${sanitizedFileName}`;
  }

  /**
   * Track usage for uploaded bytes
   */
  async trackUsage(context: ProxyRequestContext, bytes: number): Promise<ProxyResult['usage']> {
    const costCents = this.calculateCost(bytes);

    const usageTrackingService = getUsageTrackingService();
    await usageTrackingService.recordUsage({
      userId: context.userId,
      appId: context.appId,
      service: 'storage',
      endpoint: context.endpoint,
      units: bytes,
      unitType: 'bytes',
      costCents,
      metadata: {
        fileSize: bytes,
      },
    });

    return {
      units: bytes,
      unitType: 'bytes',
      costCents,
    };
  }

  /**
   * Calculate cost in cents for uploaded bytes
   * Note: This is a simplified calculation - actual cost depends on storage duration
   */
  calculateCost(bytes: number): number {
    // Calculate as if file is stored for 1 month
    const cost = bytes * STORAGE_PRICING.pricePerByte;
    return Math.max(1, Math.ceil(cost * 100));
  }

  /**
   * Validate upload request
   */
  validateRequest(request: StorageUploadRequest): { valid: boolean; error?: string } {
    if (!request.fileName || request.fileName.trim().length === 0) {
      return { valid: false, error: 'File name is required' };
    }

    if (request.size <= 0) {
      return { valid: false, error: 'File size must be greater than 0' };
    }

    if (request.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    if (!request.contentType) {
      return { valid: false, error: 'Content type is required' };
    }

    if (!ALLOWED_CONTENT_TYPES.includes(request.contentType)) {
      return {
        valid: false,
        error: `Content type ${request.contentType} is not allowed`,
      };
    }

    return { valid: true };
  }

  /**
   * Get file extension from content type
   */
  getExtensionFromContentType(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'application/pdf': 'pdf',
      'application/json': 'json',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/zip': 'zip',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
    };
    return extensions[contentType] || 'bin';
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get user's own storage config if they provided one
   */
  private async getUserStorageConfig(userId: string): Promise<{
    accountId: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    publicUrl: string;
  }> {
    // In production, query from app_api_config table
    console.log(`[StorageProxyService] Getting user storage config for ${userId}`);
    return {
      accountId: '',
      accessKey: '',
      secretKey: '',
      bucketName: '',
      publicUrl: '',
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let storageProxyServiceInstance: StorageProxyService | null = null;

/**
 * Get the StorageProxyService singleton
 */
export function getStorageProxyService(): StorageProxyService {
  if (!storageProxyServiceInstance) {
    storageProxyServiceInstance = new StorageProxyService();
  }
  return storageProxyServiceInstance;
}
