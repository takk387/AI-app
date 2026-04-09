'use client';

import React from 'react';
import type { PreviewMode } from '@/types/railway';

// Re-export for backward compatibility
export type { PreviewMode } from '@/types/railway';

interface PreviewModeSelectorProps {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  disabled?: boolean;
  className?: string;
}

const MODES: Array<{
  key: PreviewMode;
  label: string;
  title: string;
  icon: string;
}> = [
  {
    key: 'browser',
    label: 'Instant',
    title: 'Frontend-only preview (instant, runs in browser via esbuild-wasm)',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    key: 'webcontainer',
    label: 'Full',
    title: 'Full Node.js runtime in browser (real npm install, real dev server)',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2',
  },
  {
    key: 'railway',
    label: 'Deploy',
    title: 'Full-stack deployment preview via Railway (real backend + database)',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  },
];

export function PreviewModeSelector({
  mode,
  onModeChange,
  disabled = false,
  className = '',
}: PreviewModeSelectorProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Preview:</span>

      <div
        className="flex rounded-lg p-0.5"
        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
      >
        {MODES.map(({ key, label, title, icon }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              backgroundColor: mode === key ? 'var(--accent-primary)' : 'transparent',
              color: mode === key ? 'white' : 'var(--text-muted)',
            }}
            title={title}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            {label}
          </button>
        ))}
      </div>

      {mode === 'webcontainer' && (
        <span
          style={{ color: 'var(--accent-primary)', fontSize: '12px' }}
          className="flex items-center gap-1"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          />
          WebContainer
        </span>
      )}
      {mode === 'railway' && (
        <span
          style={{ color: 'var(--gold-primary)', fontSize: '12px' }}
          className="flex items-center gap-1"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--gold-primary)' }}
          />
          Railway
        </span>
      )}
    </div>
  );
}

export default PreviewModeSelector;
