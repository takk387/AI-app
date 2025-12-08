/**
 * ReferenceMediaPanel Component
 *
 * Provides drag-and-drop upload for reference images and videos.
 * Handles file validation, preview, and triggers analysis workflows.
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  UploadIcon,
  ImageIcon,
  XIcon,
  SearchIcon,
  TrashIcon,
  PlusIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  LoaderIcon,
  PlayIcon,
} from './ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

interface ReferenceMediaPanelProps {
  onImageUpload?: (imageDataUrl: string) => void;
  onVideoUpload?: (file: File) => void;
  onRemoveMedia?: (index: number) => void;
  maxImages?: number;
  maxVideoSize?: number; // in MB
  maxVideoDuration?: number; // in seconds
  acceptedImageTypes?: string[];
  acceptedVideoTypes?: string[];
  className?: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  dataUrl?: string;
  file?: File;
  name: string;
  size: number;
  status: 'uploading' | 'ready' | 'error' | 'analyzing';
  error?: string;
  thumbnail?: string;
  duration?: number; // for videos
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const DEFAULT_ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

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

function generateId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// MEDIA PREVIEW COMPONENT
// ============================================================================

function MediaPreview({
  item,
  onRemove,
  onZoom,
  isSelected,
  onSelect,
}: {
  item: MediaItem;
  onRemove: () => void;
  onZoom?: () => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'uploading':
        return <LoaderIcon className="w-4 h-4 animate-spin text-blue-400" />;
      case 'analyzing':
        return <LoaderIcon className="w-4 h-4 animate-spin text-purple-400" />;
      case 'error':
        return <AlertCircleIcon className="w-4 h-4 text-red-400" />;
      case 'ready':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-purple-500 ring-2 ring-purple-500/30'
          : 'border-white/10 hover:border-white/30'
      }`}
      onClick={onSelect}
    >
      {/* Preview Image/Thumbnail */}
      <div className="aspect-video bg-slate-800">
        {item.type === 'image' && item.dataUrl && (
          <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
        )}
        {item.type === 'video' && (
          <div className="w-full h-full flex items-center justify-center">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <PlayIcon className="w-8 h-8 text-slate-500" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                <PlayIcon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="absolute top-2 left-2">{getStatusIcon()}</div>

      {/* Type Badge */}
      <div className="absolute top-2 right-2">
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            item.type === 'image' ? 'bg-blue-500/80 text-white' : 'bg-purple-500/80 text-white'
          }`}
        >
          {item.type === 'image' ? 'IMG' : 'VID'}
        </span>
      </div>

      {/* Hover Actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {onZoom && item.type === 'image' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoom();
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Zoom"
          >
            <SearchIcon className="w-4 h-4 text-white" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors"
          title="Remove"
        >
          <TrashIcon className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="text-xs text-white truncate">{item.name}</div>
        <div className="text-xs text-slate-400">
          {formatFileSize(item.size)}
          {item.duration && ` • ${item.duration.toFixed(1)}s`}
        </div>
      </div>

      {/* Error Overlay */}
      {item.status === 'error' && item.error && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-2">
          <div className="text-xs text-red-300 text-center">{item.error}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DROPZONE COMPONENT
// ============================================================================

function Dropzone({
  onDrop,
  acceptedTypes,
  isDragging,
  setIsDragging,
}: {
  onDrop: (files: FileList) => void;
  acceptedTypes: string[];
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onDrop(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDrop(e.target.files);
      e.target.value = ''; // Reset for re-upload of same file
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-white/20 hover:border-white/40 hover:bg-white/5'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
          <UploadIcon className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-left">
          <p className="text-xs font-medium text-white">Drop images/videos or click to browse</p>
          <p className="text-[10px] text-slate-500">
            Images up to {MAX_IMAGE_SIZE_MB}MB • Videos up to {MAX_VIDEO_SIZE_MB}MB
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReferenceMediaPanel({
  onImageUpload,
  onVideoUpload,
  onRemoveMedia,
  maxImages = 5,
  maxVideoSize = MAX_VIDEO_SIZE_MB,
  maxVideoDuration = MAX_VIDEO_DURATION_SECONDS,
  acceptedImageTypes = DEFAULT_ACCEPTED_IMAGE_TYPES,
  acceptedVideoTypes = DEFAULT_ACCEPTED_VIDEO_TYPES,
  className = '',
}: ReferenceMediaPanelProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const acceptedTypes = [...acceptedImageTypes, ...acceptedVideoTypes];

  // Process uploaded files
  const processFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);

      // Track images added in this batch to avoid stale closure issues
      let imagesAddedInBatch = 0;

      for (const file of fileArray) {
        const isImage = acceptedImageTypes.includes(file.type);
        const isVideo = acceptedVideoTypes.includes(file.type);

        if (!isImage && !isVideo) {
          console.warn(`Unsupported file type: ${file.type}`);
          continue;
        }

        // Check limits using functional update to get current count
        if (isImage) {
          let shouldSkip = false;
          setMediaItems((prev) => {
            const currentImageCount = prev.filter((m) => m.type === 'image').length;
            if (currentImageCount + imagesAddedInBatch >= maxImages) {
              shouldSkip = true;
              return prev; // Don't modify state
            }
            return prev;
          });
          if (shouldSkip) {
            console.warn(`Maximum ${maxImages} images allowed`);
            continue;
          }
          imagesAddedInBatch++;
        }

        // Check file size
        const maxSize = isImage ? MAX_IMAGE_SIZE_MB : maxVideoSize;
        if (file.size > maxSize * 1024 * 1024) {
          const newItem: MediaItem = {
            id: generateId(),
            type: isImage ? 'image' : 'video',
            name: file.name,
            size: file.size,
            status: 'error',
            error: `File too large. Max ${maxSize}MB.`,
          };
          setMediaItems((prev) => [...prev, newItem]);
          continue;
        }

        // Create item with uploading status
        const itemId = generateId();
        const newItem: MediaItem = {
          id: itemId,
          type: isImage ? 'image' : 'video',
          file,
          name: file.name,
          size: file.size,
          status: 'uploading',
        };

        setMediaItems((prev) => [...prev, newItem]);

        // Process the file
        if (isImage) {
          // Convert to data URL
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setMediaItems((prev) =>
              prev.map((item) =>
                item.id === itemId ? { ...item, dataUrl, status: 'ready' } : item
              )
            );
            onImageUpload?.(dataUrl);
          };
          reader.onerror = () => {
            setMediaItems((prev) =>
              prev.map((item) =>
                item.id === itemId
                  ? { ...item, status: 'error', error: 'Failed to read file' }
                  : item
              )
            );
          };
          reader.readAsDataURL(file);
        } else {
          // Video processing
          const video = document.createElement('video');
          video.preload = 'metadata';

          video.onloadedmetadata = () => {
            // Check duration
            if (video.duration > maxVideoDuration) {
              setMediaItems((prev) =>
                prev.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        status: 'error',
                        error: `Video too long. Max ${maxVideoDuration}s.`,
                      }
                    : item
                )
              );
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

            setMediaItems((prev) =>
              prev.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      thumbnail,
                      duration: video.duration,
                      status: 'ready',
                    }
                  : item
              )
            );

            URL.revokeObjectURL(video.src);
            onVideoUpload?.(file);
          };

          video.onerror = () => {
            setMediaItems((prev) =>
              prev.map((item) =>
                item.id === itemId
                  ? { ...item, status: 'error', error: 'Failed to load video' }
                  : item
              )
            );
            URL.revokeObjectURL(video.src);
          };

          video.src = URL.createObjectURL(file);
        }
      }
    },
    [
      acceptedImageTypes,
      acceptedVideoTypes,
      maxImages,
      maxVideoSize,
      maxVideoDuration,
      onImageUpload,
      onVideoUpload,
    ]
  );

  // Remove media item
  const handleRemove = useCallback(
    (index: number) => {
      setMediaItems((prev) => prev.filter((_, i) => i !== index));
      onRemoveMedia?.(index);
      if (selectedIndex === index) {
        setSelectedIndex(null);
      }
    },
    [onRemoveMedia, selectedIndex]
  );

  // Clear all
  const handleClearAll = useCallback(() => {
    setMediaItems([]);
    setSelectedIndex(null);
  }, []);

  const imageCount = mediaItems.filter((m) => m.type === 'image').length;
  const videoCount = mediaItems.filter((m) => m.type === 'video').length;

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Reference Media</h3>
          {mediaItems.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {imageCount}/{maxImages} images
          </span>
          <span className="flex items-center gap-1">
            <PlayIcon className="w-3 h-3" />
            {videoCount} video{videoCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Dropzone */}
        <Dropzone
          onDrop={processFiles}
          acceptedTypes={acceptedTypes}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />

        {/* Media Grid */}
        {mediaItems.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {mediaItems.map((item, index) => (
              <MediaPreview
                key={item.id}
                item={item}
                isSelected={selectedIndex === index}
                onSelect={() => setSelectedIndex(index)}
                onRemove={() => handleRemove(index)}
                onZoom={
                  item.type === 'image' && item.dataUrl
                    ? () => setZoomImage(item.dataUrl!)
                    : undefined
                }
              />
            ))}

            {/* Add More Button */}
            {imageCount < maxImages && (
              <button
                onClick={() =>
                  document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
                }
                className="aspect-video border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-white/40 hover:bg-white/5 transition-colors"
              >
                <PlusIcon className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-500">Add More</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Item Info */}
      {selectedIndex !== null && mediaItems[selectedIndex] && (
        <div className="px-4 py-3 border-t border-white/10 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white">{mediaItems[selectedIndex].name}</div>
              <div className="text-xs text-slate-400">
                {formatFileSize(mediaItems[selectedIndex].size)}
                {mediaItems[selectedIndex].duration &&
                  ` • ${mediaItems[selectedIndex].duration?.toFixed(1)}s`}
              </div>
            </div>
            <button
              onClick={() => handleRemove(selectedIndex)}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-slate-400 hover:text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
            onClick={() => setZoomImage(null)}
          >
            <XIcon className="w-6 h-6 text-white" />
          </button>
          <img
            src={zoomImage}
            alt="Zoomed preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default ReferenceMediaPanel;
