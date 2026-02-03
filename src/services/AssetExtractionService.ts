/**
 * Asset Extraction Service
 *
 * Crops custom visuals from reference images instead of generating approximations.
 * Uses Sharp for server-side image processing.
 *
 * Features:
 * - Extract (crop) regions from original images
 * - Convert to optimized WebP format
 * - Upload to Supabase Storage
 * - Batch processing support
 */

import sharp from 'sharp';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Request to extract an asset from an image
 */
export interface ExtractionRequest {
  /** Base64 original image */
  originalImage: string;
  /** Normalized bounds (0-100 scale) */
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** What this asset is for (used in filename) */
  targetElement: string;
}

/**
 * Result of an extraction operation
 */
export interface ExtractionResult {
  /** Public URL of uploaded asset */
  url: string;
  /** Whether extraction succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Metadata about the extracted asset */
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Asset Extraction Service Class
 */
class AssetExtractionService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (sbUrl && sbKey) {
      this.supabase = createClient(sbUrl, sbKey);
      console.log('[AssetExtractionService] Initialized with Supabase');
    } else {
      console.warn('[AssetExtractionService] Supabase not configured - extraction will fail');
    }
  }

  /**
   * Extract (crop) a region from the original image
   */
  async extractAsset(request: ExtractionRequest): Promise<ExtractionResult> {
    if (!this.supabase) {
      return {
        success: false,
        url: '',
        error:
          'Supabase not configured - check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      };
    }

    try {
      console.log('[AssetExtractionService] Starting extraction:', {
        targetElement: request.targetElement,
        bounds: request.bounds,
      });

      // 1. Convert base64 to buffer
      const base64Data = request.originalImage.includes(',')
        ? request.originalImage.split(',')[1]
        : request.originalImage;
      const buffer = Buffer.from(base64Data, 'base64');

      // 2. Get original image metadata
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      console.log('[AssetExtractionService] Original image:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      });

      // 3. Convert normalized bounds (0-100) to pixel coordinates
      const cropX = Math.round((request.bounds.left / 100) * metadata.width);
      const cropY = Math.round((request.bounds.top / 100) * metadata.height);
      const cropWidth = Math.round((request.bounds.width / 100) * metadata.width);
      const cropHeight = Math.round((request.bounds.height / 100) * metadata.height);

      // 4. Validate crop bounds
      if (cropX < 0 || cropY < 0 || cropWidth <= 0 || cropHeight <= 0) {
        throw new Error('Invalid crop bounds - coordinates must be positive');
      }

      if (cropX + cropWidth > metadata.width || cropY + cropHeight > metadata.height) {
        throw new Error('Crop bounds exceed image dimensions');
      }

      console.log('[AssetExtractionService] Crop region (pixels):', {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });

      // 5. Crop and optimize
      const croppedBuffer = await sharp(buffer)
        .extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight,
        })
        .webp({ quality: 90 }) // Convert to WebP for smaller size
        .toBuffer();

      const croppedMetadata = await sharp(croppedBuffer).metadata();

      console.log('[AssetExtractionService] Cropped image:', {
        width: croppedMetadata.width,
        height: croppedMetadata.height,
        size: `${Math.round(croppedBuffer.length / 1024)}KB`,
      });

      // 6. Upload to Supabase Storage
      const filename = `extracted-${this.sanitizeFilename(request.targetElement)}-${Date.now()}.webp`;
      const { data, error } = await this.supabase.storage
        .from('ai-images')
        .upload(filename, croppedBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      // 7. Get public URL
      const { data: urlData } = this.supabase.storage.from('ai-images').getPublicUrl(data.path);

      console.log('[AssetExtractionService] Upload successful:', urlData.publicUrl);

      return {
        success: true,
        url: urlData.publicUrl,
        metadata: {
          width: croppedMetadata.width || 0,
          height: croppedMetadata.height || 0,
          format: 'webp',
          size: croppedBuffer.length,
        },
      };
    } catch (error) {
      console.error('[AssetExtractionService] Extraction failed:', error);
      return {
        success: false,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract multiple assets in parallel
   */
  async extractBatch(requests: ExtractionRequest[]): Promise<ExtractionResult[]> {
    console.log('[AssetExtractionService] Starting batch extraction:', {
      count: requests.length,
    });

    const results = await Promise.allSettled(requests.map((req) => this.extractAsset(req)));

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('[AssetExtractionService] Batch item failed:', {
          index,
          error: result.reason,
        });
        return {
          success: false,
          url: '',
          error: `Batch extraction failed: ${result.reason}`,
        };
      }
    });
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return this.supabase !== null;
  }
}

// Singleton instance
let instance: AssetExtractionService | null = null;

/**
 * Get the singleton AssetExtractionService instance
 */
export function getAssetExtractionService(): AssetExtractionService {
  if (!instance) {
    instance = new AssetExtractionService();
  }
  return instance;
}

/**
 * Create a new AssetExtractionService instance (for testing)
 */
export function createAssetExtractionService(): AssetExtractionService {
  return new AssetExtractionService();
}
