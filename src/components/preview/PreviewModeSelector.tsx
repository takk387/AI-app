'use client';

import React from 'react';
import { useBrowserSupport } from '@/hooks/useBrowserSupport';

// ============================================================================
// TYPES
// ============================================================================

export type PreviewMode = 'sandpack' | 'webcontainer';

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
 * Toggle between Sandpack (frontend-only) and WebContainer (full-stack) preview modes.
 * Shows browser support status and disables WebContainer option if not supported.
 */
export function PreviewModeSelector({
  mode,
  onModeChange,
  disabled = false,
  className = '',
}: PreviewModeSelectorProps) {
  const { supportsWebContainers, browserName, reason } = useBrowserSupport();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-zinc-400 text-xs">Preview:</span>

      <div className="flex bg-zinc-800 rounded-lg p-0.5">
        {/* Sandpack option */}
        <button
          onClick={() => onModeChange('sandpack')}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'sandpack' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Frontend-only preview (faster, wider browser support)"
        >
          Sandpack
        </button>

        {/* WebContainer option */}
        <button
          onClick={() => supportsWebContainers && onModeChange('webcontainer')}
          disabled={disabled || !supportsWebContainers}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === 'webcontainer'
              ? 'bg-blue-600 text-white'
              : supportsWebContainers
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 cursor-not-allowed'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={
            supportsWebContainers
              ? 'Full-stack preview with Node.js runtime'
              : `Not supported: ${reason}`
          }
        >
          WebContainer
          {!supportsWebContainers && <span className="ml-1 text-yellow-500">⚠</span>}
        </button>
      </div>

      {/* Browser support indicator */}
      {!supportsWebContainers && (
        <div className="text-yellow-500 text-xs" title={reason}>
          {browserName} not supported
        </div>
      )}
    </div>
  );
}

export default PreviewModeSelector;
