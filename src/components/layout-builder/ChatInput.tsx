'use client';

import React, { useState, useRef } from 'react';
import { getModelIndicator, type ModelRouting } from '@/utils/modelRouter';

interface ChatInputProps {
  onSend: (text: string, includeCapture: boolean) => void;
  onCapture: () => void;
  isLoading: boolean;
  isCapturing: boolean;
  hasSelection: boolean;
  /** The last model that was used for a response */
  lastModelUsed?: ModelRouting | null;
  /** Whether images are currently attached (affects routing preview) */
  hasImages?: boolean;
  /** Callback when a file is selected for upload */
  onFileSelect?: (file: File | null) => void;
  /** Currently selected file for upload */
  selectedFile?: File | null;
}

/**
 * Chat input component
 */
export function ChatInput({
  onSend,
  onCapture,
  isLoading,
  isCapturing,
  hasSelection,
  lastModelUsed,
  hasImages,
  onFileSelect,
  selectedFile,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [includeCapture, setIncludeCapture] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect?.(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Get model indicator for display
  const modelIndicator = lastModelUsed ? getModelIndicator(lastModelUsed) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || includeCapture || selectedFile) {
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Action buttons row */}
      <div className="flex items-center gap-2 mb-3">
        {/* Upload Reference button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          style={
            selectedFile
              ? { background: 'var(--gold-primary)', color: 'white' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
          }
        >
          {selectedFile ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="max-w-[120px] truncate">{selectedFile.name}</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Upload Reference
            </>
          )}
        </button>

        {selectedFile && (
          <button
            type="button"
            onClick={() => onFileSelect?.(null)}
            className="text-xs hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            Remove
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

        {/* Model indicator */}
        {modelIndicator && !hasSelection && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-sm" title={`Last response from ${modelIndicator.label}`}>
              {modelIndicator.emoji}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {modelIndicator.label}
            </span>
          </div>
        )}

        {/* Image routing hint */}
        {(hasImages || includeCapture || selectedFile) && !isLoading && (
          <div className="ml-2 flex items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--gold-primary)' }}>Visual analysis enabled</span>
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
          placeholder="Describe what you'd like to change..."
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
          disabled={isLoading || (!input.trim() && !includeCapture && !selectedFile)}
          className="px-6 py-3 bg-garden-600 hover:bg-garden-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
