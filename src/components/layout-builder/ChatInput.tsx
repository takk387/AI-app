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
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [includeCapture, setIncludeCapture] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get model indicator for display
  const modelIndicator = lastModelUsed ? getModelIndicator(lastModelUsed) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || includeCapture) {
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
    <form onSubmit={handleSubmit} className="border-t border-slate-700 p-4">
      {/* Capture preview button */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            if (!isCapturing) {
              onCapture();
              setIncludeCapture(true);
            }
          }}
          disabled={isCapturing}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            includeCapture
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          } ${isCapturing ? 'opacity-75 cursor-not-allowed' : ''}`}
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
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            Remove
          </button>
        )}

        {hasSelection && (
          <span className="text-xs text-blue-400 ml-auto">
            Element selected - AI will see it highlighted
          </span>
        )}

        {/* Model indicator */}
        {modelIndicator && !hasSelection && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-sm" title={`Last response from ${modelIndicator.label}`}>
              {modelIndicator.emoji}
            </span>
            <span className="text-xs text-slate-400">{modelIndicator.label}</span>
          </div>
        )}

        {/* Image routing hint */}
        {(hasImages || includeCapture) && !isLoading && (
          <div className="ml-2 flex items-center gap-1">
            <span className="text-xs text-purple-400">Visual analysis enabled</span>
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
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !includeCapture)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
