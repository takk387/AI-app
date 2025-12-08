'use client';

/**
 * Analysis Mode Selector Component
 *
 * Toggle between standard and pixel-perfect analysis modes:
 * - Standard: Conversational design feedback with vision
 * - Pixel-Perfect: Detailed design replication with quick/deep analysis
 */

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type AnalysisMode = 'standard' | 'pixel-perfect';
export type AnalysisDepth = 'quick' | 'deep' | 'full';

interface AnalysisModeSelectorProps {
  mode: AnalysisMode;
  analysisDepth: AnalysisDepth;
  onChange: (mode: AnalysisMode, depth: AnalysisDepth) => void;
  hasReferenceImage: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODE_INFO = {
  standard: {
    label: 'Standard',
    icon: '💬',
    description: 'Conversational design feedback',
    tip: 'Best for iterating on design ideas',
  },
  'pixel-perfect': {
    label: 'Pixel Perfect',
    icon: '🎯',
    description: 'Exact design replication',
    tip: 'Best for matching a reference design',
  },
};

const DEPTH_INFO = {
  quick: {
    label: 'Quick',
    time: '2-3s',
    description: 'Colors, layout, fonts',
  },
  deep: {
    label: 'Deep',
    time: '10-15s',
    description: 'Full specification extraction',
  },
  full: {
    label: 'Full',
    time: '12-18s',
    description: 'Quick + Deep analysis',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AnalysisModeSelector({
  mode,
  analysisDepth,
  onChange,
  hasReferenceImage,
  disabled = false,
  className = '',
}: AnalysisModeSelectorProps) {
  const isPixelPerfect = mode === 'pixel-perfect';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode Toggle */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Analysis Mode</label>
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
          {(Object.keys(MODE_INFO) as AnalysisMode[]).map((m) => {
            const info = MODE_INFO[m];
            const isActive = mode === m;
            const isDisabled = m === 'pixel-perfect' && !hasReferenceImage;

            return (
              <button
                key={m}
                type="button"
                onClick={() => !isDisabled && !disabled && onChange(m, analysisDepth)}
                disabled={isDisabled || disabled}
                title={isDisabled ? 'Upload a reference image to enable' : info.tip}
                className={`
                  flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : isDisabled
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-1">{MODE_INFO[mode].description}</p>
      </div>

      {/* Depth Selector (only for pixel-perfect mode) */}
      {isPixelPerfect && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Analysis Depth</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(DEPTH_INFO) as AnalysisDepth[]).map((d) => {
              const info = DEPTH_INFO[d];
              const isActive = analysisDepth === d;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => !disabled && onChange(mode, d)}
                  disabled={disabled}
                  className={`
                    px-2 py-2 rounded-lg text-center transition-all border
                    ${
                      isActive
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }
                  `}
                >
                  <div className="text-sm font-medium">{info.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">~{info.time}</div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1">{DEPTH_INFO[analysisDepth].description}</p>
        </div>
      )}

      {/* Reference image warning */}
      {!hasReferenceImage && (
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <svg
            className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs text-amber-300/80">
            <span className="font-medium">Tip:</span> Upload a reference image to enable
            pixel-perfect mode for design replication.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline version for headers
 */
export function AnalysisModeBadge({
  mode,
  analysisDepth,
  className = '',
}: {
  mode: AnalysisMode;
  analysisDepth?: AnalysisDepth;
  className?: string;
}) {
  const info = MODE_INFO[mode];
  const depthInfo = analysisDepth ? DEPTH_INFO[analysisDepth] : null;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`
          px-2 py-0.5 text-xs font-medium rounded-full
          ${
            mode === 'pixel-perfect'
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-slate-700 text-slate-300'
          }
        `}
      >
        {info.icon} {info.label}
      </span>
      {mode === 'pixel-perfect' && depthInfo && (
        <span className="px-1.5 py-0.5 text-xs bg-slate-800 text-slate-400 rounded">
          {depthInfo.label}
        </span>
      )}
    </div>
  );
}

export default AnalysisModeSelector;
