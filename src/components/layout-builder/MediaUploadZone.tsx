/**
 * MediaUploadZone Component
 *
 * Unified media upload zone with auto-detection of file type.
 * - For images: Processes directly
 * - For videos: Shows analysis mode selector before processing
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, ImageIcon, PlayIcon, XIcon } from '../ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

interface MediaUploadZoneProps {
  onImageUpload: (dataUrl: string) => void;
  onVideoUpload: (file: File, mode: 'standard' | 'pixel-perfect') => void;
  analysisMode: 'standard' | 'pixel-perfect';
  onAnalysisModeChange: (mode: 'standard' | 'pixel-perfect') => void;
  className?: string;
  compact?: boolean;
}

interface PendingVideo {
  file: File;
  thumbnail: string | null;
  duration: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;
const MAX_VIDEO_DURATION_SECONDS = 60;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaUploadZone({
  onImageUpload,
  onVideoUpload,
  analysisMode,
  onAnalysisModeChange,
  className = '',
  compact = false,
}: MediaUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

  // Process a single file
  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);

      if (!isImage && !isVideo) {
        setError(`Unsupported file type: ${file.type}`);
        return;
      }

      // Check file size
      const maxSize = isImage ? MAX_IMAGE_SIZE_MB : MAX_VIDEO_SIZE_MB;
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File too large. Max ${maxSize}MB.`);
        return;
      }

      if (isImage) {
        // Process image directly
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          onImageUpload(dataUrl);
          setIsProcessing(false);
        };
        reader.onerror = () => {
          setError('Failed to read image file');
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } else {
        // For video, show mode selector first
        setIsProcessing(true);
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          // Check duration
          if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
            setError(`Video too long. Max ${MAX_VIDEO_DURATION_SECONDS}s.`);
            setIsProcessing(false);
            URL.revokeObjectURL(video.src);
            return;
          }

          // Generate thumbnail
          video.currentTime = 0.5;
        };

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

          setPendingVideo({
            file,
            thumbnail,
            duration: video.duration,
          });
          setIsProcessing(false);
          URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
          setError('Failed to load video');
          setIsProcessing(false);
          URL.revokeObjectURL(video.src);
        };

        video.src = URL.createObjectURL(file);
      }
    },
    [onImageUpload]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      e.target.value = ''; // Reset for re-upload
    },
    [processFile]
  );

  // Confirm video upload with selected mode
  const handleConfirmVideoUpload = useCallback(() => {
    if (pendingVideo) {
      onVideoUpload(pendingVideo.file, analysisMode);
      setPendingVideo(null);
    }
  }, [pendingVideo, analysisMode, onVideoUpload]);

  // Cancel pending video
  const handleCancelVideo = useCallback(() => {
    setPendingVideo(null);
  }, []);

  // Render pending video modal
  if (pendingVideo) {
    return (
      <div className={`${className}`}>
        <div className="bg-slate-800 rounded-lg border border-white/10 overflow-hidden">
          {/* Video Preview */}
          <div className="relative aspect-video bg-slate-900">
            {pendingVideo.thumbnail ? (
              <img
                src={pendingVideo.thumbnail}
                alt="Video preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PlayIcon className="w-12 h-12 text-slate-600" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 bg-black/60 rounded-full flex items-center justify-center">
                <PlayIcon className="w-7 h-7 text-white" />
              </div>
            </div>
            {/* Cancel button */}
            <button
              onClick={handleCancelVideo}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
            >
              <XIcon className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Video Info */}
          <div className="p-3 border-b border-white/10">
            <div className="text-sm text-white font-medium truncate">{pendingVideo.file.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {formatFileSize(pendingVideo.file.size)} &bull; {pendingVideo.duration.toFixed(1)}s
            </div>
          </div>

          {/* Analysis Mode Selector */}
          <div className="p-3">
            <div className="text-xs text-slate-400 mb-2">Analysis Mode</div>
            <div className="flex gap-2">
              <button
                onClick={() => onAnalysisModeChange('standard')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  analysisMode === 'standard'
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => onAnalysisModeChange('pixel-perfect')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  analysisMode === 'pixel-perfect'
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Pixel-Perfect
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              {analysisMode === 'pixel-perfect'
                ? 'Detailed frame-by-frame analysis with precise measurements'
                : 'Quick overview of animations and layout patterns'}
            </p>
          </div>

          {/* Action Button */}
          <div className="p-3 pt-0">
            <button
              onClick={handleConfirmVideoUpload}
              className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Analyze Video
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render dropzone
  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
        } ${compact ? 'p-2' : 'p-4'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Processing...</span>
          </div>
        ) : compact ? (
          <div className="flex items-center gap-2">
            <UploadIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-300">Upload reference</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
              <UploadIcon className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">
                Drop image or video, or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  Images up to {MAX_IMAGE_SIZE_MB}MB
                </span>
                <span className="flex items-center gap-1">
                  <PlayIcon className="w-3 h-3" />
                  Videos up to {MAX_VIDEO_SIZE_MB}MB
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

export default MediaUploadZone;
