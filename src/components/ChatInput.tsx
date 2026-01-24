'use client';

import React, { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (text: string, includeCapture: boolean) => void;
  onCapture: () => void;
  isLoading: boolean;
  isCapturing: boolean;
  hasSelection: boolean;
  /** Whether images are currently attached */
  hasImages?: boolean;
  /** Callback when files are selected for upload */
  onFileSelect?: (files: File[]) => void;
  /** Currently selected files for upload */
  selectedFiles?: File[];
}

/**
 * Chat input component for Layout Builder
 * Supports multi-file upload with indexed references (Image 1, Image 2, etc.)
 */
export function ChatInput({
  onSend,
  onCapture,
  isLoading,
  isCapturing,
  hasSelection,
  hasImages,
  onFileSelect,
  selectedFiles = [],
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [includeCapture, setIncludeCapture] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Append new files to existing ones
      const newFiles = Array.from(e.target.files);
      const combined = [...selectedFiles, ...newFiles];
      onFileSelect?.(combined);
    }
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    onFileSelect?.(newFiles);
  };

  // Get the image index for display (videos don't count toward image numbering)
  const getImageIndex = (fileIndex: number): number => {
    let imageCount = 0;
    for (let i = 0; i <= fileIndex; i++) {
      if (selectedFiles[i]?.type.startsWith('image/')) {
        imageCount++;
      }
    }
    return imageCount;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || includeCapture || selectedFiles.length > 0) {
      onSend(input, includeCapture);
      setInput('');
      setIncludeCapture(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t p-4"
      style={{ borderColor: 'var(--border-color)' }}
    >
      {/* Hidden file input with multiple attribute */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* File Chips: Indexed for AI Reference */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedFiles.map((file, index) => {
            const isVideo = file.type.startsWith('video/');
            const label = isVideo ? 'Video' : `Image ${getImageIndex(index)}`;

            return (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                style={{
                  background: isVideo ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                  border: isVideo ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                  color: isVideo ? 'rgb(147, 197, 253)' : 'rgb(253, 224, 71)',
                }}
              >
                <span className="max-w-[150px] truncate">
                  {label}: {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="hover:opacity-70 font-bold"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex items-center gap-2 mb-3">
        {/* Add Reference button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-80'}`}
          style={{
            background: selectedFiles.length > 0 ? 'var(--gold-primary, #eab308)' : 'var(--bg-secondary)',
            color: selectedFiles.length > 0 ? 'white' : 'var(--text-secondary)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {selectedFiles.length > 0 ? `Add More (${selectedFiles.length})` : 'Add Reference'}
        </button>

        {selectedFiles.length > 0 && (
          <button
            type="button"
            onClick={() => onFileSelect?.([])}
            className="text-xs hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear All
          </button>
        )}

        {/* Capture preview button */}
        <button
          type="button"
          onClick={() => {
            if (!isCapturing) {
              onCapture();
              setIncludeCapture(true);
            }
          }}
          disabled={isCapturing}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${isCapturing ? 'opacity-75 cursor-not-allowed' : ''}`}
          style={
            includeCapture
              ? { background: 'var(--garden-600, #059669)', color: 'white' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
          }
        >
          {isCapturing ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Capturing...
            </>
          ) : includeCapture ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Preview Attached
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Capture Preview
            </>
          )}
        </button>

        {includeCapture && (
          <button
            type="button"
            onClick={() => setIncludeCapture(false)}
            className="text-xs hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            Remove
          </button>
        )}

        {hasSelection && (
          <span className="text-xs text-garden-400 ml-auto">
            Element selected - AI will see it highlighted
          </span>
        )}

        {/* Image routing hint */}
        {(hasImages || includeCapture || selectedFiles.length > 0) && !isLoading && !hasSelection && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--gold-primary)' }}>
              {selectedFiles.length > 1
                ? `${selectedFiles.length} references - use "Image 1", "Image 2" in your prompt`
                : 'Visual analysis enabled'}
            </span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedFiles.length > 1
              ? "Example: 'Use layout from Image 1, but colors from Image 2'"
              : "Describe what you'd like to build..."
          }
          className="flex-1 border rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-garden-500 transition-colors"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !includeCapture && selectedFiles.length === 0)}
          className="px-6 py-3 bg-garden-600 hover:bg-garden-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
