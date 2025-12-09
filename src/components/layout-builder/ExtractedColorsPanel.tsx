'use client';

import type { ExtractionResult } from '@/utils/colorExtraction';

interface ExtractedColorsPanelProps {
  isOpen: boolean;
  colors: ExtractionResult | null;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Extracted Colors Panel - shows colors extracted from reference image
 */
export function ExtractedColorsPanel({
  isOpen,
  colors,
  onApply,
  onDismiss,
}: ExtractedColorsPanelProps) {
  if (!isOpen || !colors) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">Extracted Colors</h4>
        <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-2">
          {colors.isDarkImage ? 'Dark theme detected' : 'Light theme detected'}
        </p>
        <div className="flex gap-1 flex-wrap">
          {colors.colors.slice(0, 8).map((color, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded border border-slate-600"
              style={{ backgroundColor: color.hex }}
              title={`${color.hex} (${Math.round(color.percentage)}%)`}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-1">Suggested Palette</p>
        <div className="grid grid-cols-4 gap-1 text-[10px]">
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded border border-slate-600"
              style={{ backgroundColor: colors.palette.primary }}
            />
            <span className="text-slate-500">Primary</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded border border-slate-600"
              style={{ backgroundColor: colors.palette.secondary }}
            />
            <span className="text-slate-500">Second</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded border border-slate-600"
              style={{ backgroundColor: colors.palette.accent }}
            />
            <span className="text-slate-500">Accent</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-6 h-6 rounded border border-slate-600"
              style={{ backgroundColor: colors.palette.background }}
            />
            <span className="text-slate-500">BG</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={onApply}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          Apply Colors
        </button>
      </div>
    </div>
  );
}

export default ExtractedColorsPanel;
