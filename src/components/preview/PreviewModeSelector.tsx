'use client';

import React from 'react';
import type { PreviewMode } from '@/types/railway';

// Re-export for backward compatibility
export type { PreviewMode } from '@/types/railway';

// ============================================================================
// TYPES
// ============================================================================

interface PreviewModeSelectorProps {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Toggle between Browser (frontend-only) and Railway (full-stack) preview modes.
 * Browser uses esbuild-wasm for instant in-browser bundling.
 * Railway deploys to real infrastructure for full-stack support.
 */
export function PreviewModeSelector({
  mode,
  onModeChange,
  disabled = false,
  className = '',
}: PreviewModeSelectorProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-zinc-400 text-xs">Preview:</span>

      <div className="flex bg-zinc-800 rounded-lg p-0.5">
        {/* Browser option - Frontend only */}
        <button
          onClick={() => onModeChange('browser')}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            mode === 'browser' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Frontend-only preview (instant, runs in browser via esbuild-wasm)"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Frontend
        </button>

        {/* Railway option - Full-stack */}
        <button
          onClick={() => onModeChange('railway')}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            mode === 'railway'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Full-stack preview via Railway (deploys with real backend)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Full-Stack
        </button>
      </div>

      {/* Mode indicator */}
      {mode === 'railway' && (
        <span className="text-purple-400 text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          Railway
        </span>
      )}
    </div>
  );
}

export default PreviewModeSelector;
