'use client';

/**
 * ZIndexEditor Component
 *
 * Visual z-index scale editor with semantic tokens,
 * scale visualization, and CSS/Tailwind export.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  type ZIndexScale,
  DEFAULT_Z_INDEX_SCALE,
  generateZIndexCSS,
  generateTailwindZIndex,
} from '@/utils/layerUtils';

// ============================================================================
// TYPES
// ============================================================================

interface ZIndexEditorProps {
  scale?: Partial<ZIndexScale>;
  onChange?: (scale: ZIndexScale) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOKEN_INFO: Record<keyof ZIndexScale, { label: string; description: string; color: string }> =
  {
    base: { label: 'Base', description: 'Default stacking context', color: '#64748B' },
    content: { label: 'Content', description: 'Regular content elements', color: '#3B82F6' },
    dropdown: { label: 'Dropdown', description: 'Dropdowns & menus', color: '#06B6D4' },
    sticky: { label: 'Sticky', description: 'Sticky headers & elements', color: '#10B981' },
    overlay: { label: 'Overlay', description: 'Background overlays', color: '#8B5CF6' },
    modal: { label: 'Modal', description: 'Modal dialogs', color: '#EC4899' },
    toast: { label: 'Toast', description: 'Toast notifications', color: '#F59E0B' },
    tooltip: { label: 'Tooltip', description: 'Tooltips & popovers', color: '#EF4444' },
    max: { label: 'Max', description: 'Maximum z-index', color: '#1F2937' },
  };

const SCALE_PRESETS: { id: string; name: string; scale: ZIndexScale }[] = [
  {
    id: 'default',
    name: 'Default (10s)',
    scale: DEFAULT_Z_INDEX_SCALE,
  },
  {
    id: 'compact',
    name: 'Compact (1s)',
    scale: {
      base: 0,
      content: 1,
      dropdown: 2,
      sticky: 3,
      overlay: 4,
      modal: 5,
      toast: 6,
      tooltip: 7,
      max: 99,
    },
  },
  {
    id: 'spaced',
    name: 'Spaced (100s)',
    scale: {
      base: 0,
      content: 100,
      dropdown: 200,
      sticky: 300,
      overlay: 400,
      modal: 500,
      toast: 600,
      tooltip: 700,
      max: 9999,
    },
  },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ScaleVisualization({ scale, maxValue = 100 }: { scale: ZIndexScale; maxValue?: number }) {
  const sortedTokens = useMemo(() => {
    return Object.entries(scale)
      .filter(([key]) => key !== 'max')
      .sort(([, a], [, b]) => a - b) as [keyof ZIndexScale, number][];
  }, [scale]);

  return (
    <div className="relative h-8 bg-slate-800 rounded-lg overflow-hidden">
      {/* Scale marks */}
      <div className="absolute inset-0 flex">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="flex-1 border-r border-slate-700 last:border-r-0">
            {i % 2 === 0 && (
              <span
                className="absolute bottom-0 text-[8px] text-slate-600 transform -translate-x-1/2"
                style={{ left: `${i * 10}%` }}
              >
                {Math.round((i / 10) * maxValue)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Token markers */}
      {sortedTokens.map(([token, value]) => {
        const info = TOKEN_INFO[token];
        const position = Math.min((value / maxValue) * 100, 100);

        return (
          <div
            key={token}
            className="absolute top-0 bottom-0 w-1 group"
            style={{
              left: `${position}%`,
              backgroundColor: info.color,
            }}
          >
            <div
              className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
              style={{ backgroundColor: info.color }}
            >
              {info.label}: {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TokenEditor({
  token,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  token: keyof ZIndexScale;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const info = TOKEN_INFO[token];

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
      <div className="w-20 flex-shrink-0">
        <div className="text-xs font-medium text-slate-300">{info.label}</div>
        <div className="text-[10px] text-slate-500">{info.description}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 accent-blue-500"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min={min}
        max={9999}
        className="w-16 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 text-center focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function CodeOutput({ scale, format }: { scale: ZIndexScale; format: 'css' | 'tailwind' }) {
  const code = useMemo(() => {
    if (format === 'css') {
      return `:root {\n${generateZIndexCSS(scale)}\n}`;
    }
    return `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      zIndex: ${JSON.stringify(generateTailwindZIndex(scale), null, 8).replace(/"/g, "'")}
    }
  }
}`;
  }, [scale, format]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="relative">
      <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
      >
        Copy
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ZIndexEditor({ scale: initialScale, onChange, className = '' }: ZIndexEditorProps) {
  const [scale, setScale] = useState<ZIndexScale>({
    ...DEFAULT_Z_INDEX_SCALE,
    ...initialScale,
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  const [codeFormat, setCodeFormat] = useState<'css' | 'tailwind'>('css');
  const [showCode, setShowCode] = useState(false);

  // Calculate max for visualization
  const visualMax = useMemo(() => {
    const values = Object.values(scale).filter((v) => v < 9999);
    return Math.max(...values, 100);
  }, [scale]);

  // Update scale and notify parent
  const updateScale = useCallback(
    (token: keyof ZIndexScale, value: number) => {
      const newScale = { ...scale, [token]: value };
      setScale(newScale);
      setSelectedPreset('custom');
      onChange?.(newScale);
    },
    [scale, onChange]
  );

  // Apply preset
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = SCALE_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setScale(preset.scale);
        setSelectedPreset(presetId);
        onChange?.(preset.scale);
      }
    },
    [onChange]
  );

  // Token order for editing
  const tokenOrder: (keyof ZIndexScale)[] = [
    'base',
    'content',
    'dropdown',
    'sticky',
    'overlay',
    'modal',
    'toast',
    'tooltip',
    'max',
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Scale visualization */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Z-Index Scale</label>
        <ScaleVisualization scale={scale} maxValue={visualMax} />
      </div>

      {/* Presets */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Presets</label>
        <div className="flex gap-2">
          {SCALE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`
                flex-1 px-3 py-2 text-xs rounded-lg border transition-all
                ${
                  selectedPreset === preset.id
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }
              `}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Token editors */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Token Values</label>
        <div className="bg-slate-800/30 rounded-lg p-3 space-y-1">
          {tokenOrder.map((token) => (
            <TokenEditor
              key={token}
              token={token}
              value={scale[token]}
              onChange={(value) => updateScale(token, value)}
              max={token === 'max' ? 9999 : visualMax}
            />
          ))}
        </div>
      </div>

      {/* Code output */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Export Code</label>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setCodeFormat('css');
                setShowCode(true);
              }}
              className={`px-2 py-1 text-xs rounded ${
                showCode && codeFormat === 'css'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              CSS
            </button>
            <button
              onClick={() => {
                setCodeFormat('tailwind');
                setShowCode(true);
              }}
              className={`px-2 py-1 text-xs rounded ${
                showCode && codeFormat === 'tailwind'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              Tailwind
            </button>
            {showCode && (
              <button
                onClick={() => setShowCode(false)}
                className="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded hover:text-white"
              >
                Hide
              </button>
            )}
          </div>
        </div>
        {showCode && <CodeOutput scale={scale} format={codeFormat} />}
      </div>

      {/* Usage tips */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <strong className="text-slate-400">Tips:</strong>
        <ul className="mt-1 space-y-1 list-disc list-inside">
          <li>Use semantic tokens instead of magic numbers</li>
          <li>Keep gaps between levels for flexibility</li>
          <li>Reserve max (9999) for emergency overrides only</li>
        </ul>
      </div>
    </div>
  );
}

export default ZIndexEditor;
