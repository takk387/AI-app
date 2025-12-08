/**
 * Video Processor Utility
 *
 * Handles video upload, frame extraction, and animation detection
 * for design replication from video references.
 */

import type {
  ExtractedFrame,
  DetectedAnimation,
  DetectedTransition,
  VideoAnalysisResult,
} from '@/types/layoutDesign';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const VIDEO_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  maxDuration: 60, // 60 seconds
  frameExtractionRate: 1, // 1 frame per second
  keyFrameInterval: 5, // Every 5 seconds for major analysis
  thumbnailWidth: 800,
  thumbnailHeight: 600,
  compressionQuality: 0.8,
};

// ============================================================================
// TYPES
// ============================================================================

export interface VideoProcessingCallbacks {
  onProgress?: (progress: number, stage: string) => void;
  onFrameExtracted?: (frame: ExtractedFrame) => void;
  onError?: (error: string) => void;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

// ============================================================================
// VIDEO VALIDATION
// ============================================================================

/**
 * Validate video file before processing
 */
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!VIDEO_CONFIG.supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported video format: ${file.type}. Supported: MP4, WebM, QuickTime`,
    };
  }

  // Check file size
  if (file.size > VIDEO_CONFIG.maxFileSize) {
    const maxMB = VIDEO_CONFIG.maxFileSize / (1024 * 1024);
    return {
      valid: false,
      error: `Video too large. Maximum size: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

// ============================================================================
// VIDEO METADATA EXTRACTION
// ============================================================================

/**
 * Get video metadata (duration, dimensions, etc.)
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Estimate FPS (most videos are 24, 30, or 60)
      const estimatedFps = 30;

      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: estimatedFps,
      });

      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// FRAME EXTRACTION
// ============================================================================

/**
 * Extract frames from video at specified intervals
 */
export async function extractFrames(
  file: File,
  options: {
    frameRate?: number;
    maxFrames?: number;
    width?: number;
    height?: number;
  } = {},
  callbacks?: VideoProcessingCallbacks
): Promise<ExtractedFrame[]> {
  const {
    frameRate = VIDEO_CONFIG.frameExtractionRate,
    maxFrames = 60,
    width = VIDEO_CONFIG.thumbnailWidth,
    height = VIDEO_CONFIG.thumbnailHeight,
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let currentTime = 0;
    let frameIndex = 0;

    video.onloadedmetadata = () => {
      // Check duration limit
      if (video.duration > VIDEO_CONFIG.maxDuration) {
        callbacks?.onError?.(`Video too long. Maximum duration: ${VIDEO_CONFIG.maxDuration}s`);
        URL.revokeObjectURL(video.src);
        reject(new Error(`Video exceeds ${VIDEO_CONFIG.maxDuration}s limit`));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      let canvasWidth = width;
      let canvasHeight = height;

      if (aspectRatio > width / height) {
        canvasHeight = width / aspectRatio;
      } else {
        canvasWidth = height * aspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Calculate frame interval
      const frameInterval = 1 / frameRate;
      const totalFrames = Math.min(Math.floor(video.duration / frameInterval), maxFrames);

      callbacks?.onProgress?.(0, 'Starting frame extraction');

      const extractNextFrame = () => {
        if (currentTime > video.duration || frameIndex >= totalFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

        // Convert to base64
        const imageDataUrl = canvas.toDataURL('image/jpeg', VIDEO_CONFIG.compressionQuality);

        // Determine if this is a key frame
        const isKeyFrame =
          frameIndex === 0 || currentTime % VIDEO_CONFIG.keyFrameInterval < frameInterval;

        const frame: ExtractedFrame = {
          index: frameIndex,
          timestamp: currentTime,
          imageDataUrl,
          isKeyFrame,
        };

        frames.push(frame);
        callbacks?.onFrameExtracted?.(frame);

        // Update progress
        const progress = ((frameIndex + 1) / totalFrames) * 100;
        callbacks?.onProgress?.(progress, `Extracting frame ${frameIndex + 1}/${totalFrames}`);

        // Move to next frame
        currentTime += frameInterval;
        frameIndex++;
        extractNextFrame();
      };

      // Start extraction
      extractNextFrame();
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Extract only key frames (first frame + every N seconds)
 */
export async function extractKeyFrames(
  file: File,
  intervalSeconds: number = VIDEO_CONFIG.keyFrameInterval,
  callbacks?: VideoProcessingCallbacks
): Promise<ExtractedFrame[]> {
  const metadata = await getVideoMetadata(file);
  const totalKeyFrames = Math.ceil(metadata.duration / intervalSeconds) + 1;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    const frames: ExtractedFrame[] = [];
    let frameIndex = 0;
    const timestamps = [0]; // Always include first frame

    // Add timestamps at intervals
    for (let t = intervalSeconds; t < metadata.duration; t += intervalSeconds) {
      timestamps.push(t);
    }

    // Always include last frame if not already
    if (timestamps[timestamps.length - 1] < metadata.duration - 0.5) {
      timestamps.push(metadata.duration - 0.1);
    }

    video.onloadedmetadata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = VIDEO_CONFIG.thumbnailWidth;
      canvas.height = VIDEO_CONFIG.thumbnailWidth / aspectRatio;

      const extractFrame = (index: number) => {
        if (index >= timestamps.length) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }

        video.currentTime = timestamps[index];
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frame: ExtractedFrame = {
          index: frameIndex,
          timestamp: timestamps[frameIndex],
          imageDataUrl: canvas.toDataURL('image/jpeg', VIDEO_CONFIG.compressionQuality),
          isKeyFrame: true,
        };

        frames.push(frame);
        callbacks?.onFrameExtracted?.(frame);

        const progress = ((frameIndex + 1) / timestamps.length) * 100;
        callbacks?.onProgress?.(
          progress,
          `Extracting key frame ${frameIndex + 1}/${timestamps.length}`
        );

        frameIndex++;
        extractFrame(frameIndex);
      };

      extractFrame(0);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// ANIMATION DETECTION (Client-side heuristics)
// ============================================================================

/**
 * Basic client-side animation detection by comparing frames
 * Note: Full analysis is done server-side with Claude Vision
 */
export function detectBasicAnimations(frames: ExtractedFrame[]): {
  hasMotion: boolean;
  estimatedAnimations: number;
  frameChanges: Array<{
    fromIndex: number;
    toIndex: number;
    changeLevel: 'none' | 'low' | 'medium' | 'high';
  }>;
} {
  const frameChanges: Array<{
    fromIndex: number;
    toIndex: number;
    changeLevel: 'none' | 'low' | 'medium' | 'high';
  }> = [];

  // Compare consecutive frames (simplified - actual comparison done server-side)
  for (let i = 0; i < frames.length - 1; i++) {
    // For now, we'll estimate based on timestamp gaps
    // Real comparison would require image diff algorithms
    const timeDiff = frames[i + 1].timestamp - frames[i].timestamp;

    // Heuristic: shorter intervals usually mean more animation
    let changeLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (timeDiff < 0.5) {
      changeLevel = 'high';
    } else if (timeDiff < 1) {
      changeLevel = 'medium';
    } else if (timeDiff < 2) {
      changeLevel = 'low';
    }

    frameChanges.push({
      fromIndex: i,
      toIndex: i + 1,
      changeLevel,
    });
  }

  const hasMotion = frameChanges.some((c) => c.changeLevel !== 'none');
  const estimatedAnimations = frameChanges.filter(
    (c) => c.changeLevel === 'medium' || c.changeLevel === 'high'
  ).length;

  return {
    hasMotion,
    estimatedAnimations,
    frameChanges,
  };
}

// ============================================================================
// VIDEO PROCESSING PIPELINE
// ============================================================================

/**
 * Complete video processing pipeline
 */
export async function processVideo(
  file: File,
  callbacks?: VideoProcessingCallbacks
): Promise<{
  metadata: VideoMetadata;
  frames: ExtractedFrame[];
  keyFrames: ExtractedFrame[];
  basicAnalysis: ReturnType<typeof detectBasicAnimations>;
}> {
  // Validate
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  callbacks?.onProgress?.(5, 'Getting video metadata');

  // Get metadata
  const metadata = await getVideoMetadata(file);

  // Check duration
  if (metadata.duration > VIDEO_CONFIG.maxDuration) {
    throw new Error(
      `Video too long (${Math.round(metadata.duration)}s). Maximum: ${VIDEO_CONFIG.maxDuration}s`
    );
  }

  callbacks?.onProgress?.(10, 'Extracting key frames');

  // Extract key frames for major analysis
  const keyFrames = await extractKeyFrames(file, VIDEO_CONFIG.keyFrameInterval, {
    onProgress: (p, s) => callbacks?.onProgress?.(10 + p * 0.3, s),
    onFrameExtracted: callbacks?.onFrameExtracted,
    onError: callbacks?.onError,
  });

  callbacks?.onProgress?.(40, 'Extracting animation frames');

  // Extract more frames for animation detection (if video is short enough)
  let frames = keyFrames;
  if (metadata.duration <= 10) {
    // For short videos, extract at higher rate
    frames = await extractFrames(
      file,
      { frameRate: 2, maxFrames: 30 },
      {
        onProgress: (p, s) => callbacks?.onProgress?.(40 + p * 0.4, s),
        onFrameExtracted: callbacks?.onFrameExtracted,
        onError: callbacks?.onError,
      }
    );
  }

  callbacks?.onProgress?.(80, 'Analyzing motion');

  // Basic client-side analysis
  const basicAnalysis = detectBasicAnimations(frames);

  callbacks?.onProgress?.(100, 'Complete');

  return {
    metadata,
    frames,
    keyFrames,
    basicAnalysis,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert file to base64 data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create video thumbnail from first frame
 */
export async function createVideoThumbnail(
  file: File,
  width: number = 320,
  height: number = 180
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    video.onloadeddata = () => {
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = width;
      canvas.height = width / aspectRatio;

      // Seek to 1 second or 10% of video, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(video.src);
      resolve(thumbnail);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Format video duration as MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size as human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
