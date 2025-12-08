'use client';

import React, { useState, useRef } from 'react';

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
  disabled?: boolean;
}

/**
 * FileUploader Component
 *
 * Drag & drop file uploader with validation and progress tracking.
 * Supports multiple file upload with preview and cancellation.
 */
export function FileUploader({
  onUpload,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = [],
  allowedExtensions = [],
  maxFiles = 10,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File exceeds ${formatSize(maxFileSize)} limit`,
      };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed',
      };
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: 'File extension not allowed',
        };
      }
    }

    return { valid: true };
  };

  // Handle file selection
  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;

    const filesArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of filesArray) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, maxFiles));
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);

    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-300
          ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">{isDragging ? '📥' : '📤'}</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-slate-400 text-sm mb-4">Drag & drop files here, or click to browse</p>
          <div className="text-xs text-slate-500 space-y-1">
            <p>Maximum file size: {formatSize(maxFileSize)}</p>
            {allowedTypes.length > 0 && <p>Allowed types: {allowedTypes.join(', ')}</p>}
            {allowedExtensions.length > 0 && (
              <p>Allowed extensions: {allowedExtensions.join(', ')}</p>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
          accept={allowedTypes.join(',')}
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold text-sm">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="text-2xl">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{file.name}</p>
                  <p className="text-slate-400 text-xs">{formatSize(file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="px-2 py-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading || disabled}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>
                  Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
