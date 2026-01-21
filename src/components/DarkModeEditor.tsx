'use client';

/**
 * DarkModeEditor Component
 *
 * Design dark mode color overrides with side-by-side comparison,
 * auto-generation, and contrast checking.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { ColorSettings } from '@/types/layoutDesign';
import {
  generateDarkPalette,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  generateThemeCSS,
} from '@/utils/darkModeGenerator';

// ============================================================================
// TYPES
// ============================================================================

interface DarkModeEditorProps {
  lightColors: Partial<ColorSettings>;
  darkColors?: Partial<ColorSettings>;
  onChange?: (darkColors: Partial<ColorSettings>) => void;
  className?: string;
}

type ColorKey = keyof ColorSettings;

// ============================================================================
// CONSTANTS
// ============================================================================

const COLOR_GROUPS = {
  brand: ['primary', 'secondary', 'accent'] as ColorKey[],
  background: ['background', 'surface', 'border'] as ColorKey[],
  text: ['text', 'textMuted'] as ColorKey[],
  status: ['success', 'warning', 'error', 'info'] as ColorKey[],
};

const COLOR_LABELS: Record<ColorKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  textMuted: 'Muted Text',
  border: 'Border',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
  info: 'Info',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ContrastBadge({ foreground, background }: { foreground: string; background: string }) {
  const ratio = useMemo(() => getContrastRatio(foreground, background), [foreground, background]);
  const passesAA = useMemo(() => meetsContrastAA(foreground, background), [foreground, background]);
  const passesAAA = useMemo(
    () => meetsContrastAAA(foreground, background),
    [foreground, background]
  );

  const getBadgeColor = () => {
    if (passesAAA) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (passesAA) return 'bg-lime-500/20 text-lime-400 border-lime-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getLevel = () => {
    if (passesAAA) return 'AAA';
    if (passesAA) return 'AA';
    return 'Fail';
  };

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getBadgeColor()}`}
      title={`Contrast ratio: ${ratio.toFixed(2)}:1`}
    >
      {ratio.toFixed(1)}:1 {getLevel()}
    </span>
  );
}

function ColorSwatch({
  color,
  label,
  size = 'md',
}: {
  color: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} rounded border border-white/20`}
        style={{ backgroundColor: color }}
        title={color}
      />
      {label && <span className="text-[10px] text-slate-500">{label}</span>}
    </div>
  );
}

function ColorComparisonRow({
  colorKey,
  lightValue,
  darkValue,
  isOverridden,
  onDarkChange,
  onClearOverride,
  backgroundLight,
  backgroundDark,
}: {
  colorKey: ColorKey;
  lightValue?: string;
  darkValue?: string;
  isOverridden: boolean;
  onDarkChange: (value: string) => void;
  onClearOverride: () => void;
  backgroundLight: string;
  backgroundDark: string;
}) {
  const label = COLOR_LABELS[colorKey];
  const isTextColor = colorKey === 'text' || colorKey === 'textMuted';

  return (
    <div className="flex items-center gap-4 py-2 border-b border-slate-700/50 last:border-b-0">
      {/* Label */}
      <div className="w-24 flex items-center gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        {isOverridden && (
          <span className="w-1.5 h-1.5 bg-garden-400 rounded-full" title="Has override" />
        )}
      </div>

      {/* Light preview */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded border border-white/20"
          style={{ backgroundColor: lightValue || '#000' }}
        />
        {isTextColor && lightValue && (
          <ContrastBadge foreground={lightValue} background={backgroundLight} />
        )}
      </div>

      {/* Arrow */}
      <span className="text-slate-600">→</span>

      {/* Dark editor */}
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={darkValue || '#000'}
          onChange={(e) => onDarkChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-slate-600"
        />
        <input
          type="text"
          value={darkValue || ''}
          onChange={(e) => onDarkChange(e.target.value)}
          placeholder="Auto"
          className="w-24 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-garden-500 focus:outline-none"
        />
        {isTextColor && darkValue && (
          <ContrastBadge foreground={darkValue} background={backgroundDark} />
        )}
      </div>

      {/* Clear button */}
      {isOverridden && (
        <button
          onClick={onClearOverride}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          title="Clear override"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ThemePreview({ colors, isDark }: { colors: Partial<ColorSettings>; isDark: boolean }) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: colors.background || (isDark ? '#0F172A' : '#FFFFFF'),
        borderColor: colors.border || (isDark ? '#334155' : '#E2E8F0'),
      }}
    >
      <div className="space-y-3">
        {/* Header simulation */}
        <div className="flex items-center justify-between">
          <span
            className="text-sm font-semibold"
            style={{ color: colors.text || (isDark ? '#F8FAFC' : '#1F2937') }}
          >
            Preview
          </span>
          <div
            className="px-3 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: colors.primary || '#6B7280' }}
          >
            Button
          </div>
        </div>

        {/* Surface card */}
        <div
          className="p-3 rounded"
          style={{
            backgroundColor: colors.surface || (isDark ? '#1E293B' : '#F8FAFC'),
            borderColor: colors.border || (isDark ? '#334155' : '#E2E8F0'),
          }}
        >
          <p className="text-xs" style={{ color: colors.text || (isDark ? '#F8FAFC' : '#1F2937') }}>
            Card content
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: colors.textMuted || (isDark ? '#94A3B8' : '#64748B') }}
          >
            Muted text
          </p>
        </div>

        {/* Status badges */}
        <div className="flex gap-2">
          <span
            className="px-2 py-0.5 text-[10px] rounded"
            style={{
              backgroundColor: `${colors.success || '#6B7280'}20`,
              color: colors.success || '#6B7280',
            }}
          >
            Success
          </span>
          <span
            className="px-2 py-0.5 text-[10px] rounded"
            style={{
              backgroundColor: `${colors.error || '#6B7280'}20`,
              color: colors.error || '#6B7280',
            }}
          >
            Error
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DarkModeEditor({
  lightColors,
  darkColors: initialDarkColors,
  onChange,
  className = '',
}: DarkModeEditorProps) {
  const [darkColors, setDarkColors] = useState<Partial<ColorSettings>>(initialDarkColors || {});
  const [overrides, setOverrides] = useState<Set<ColorKey>>(new Set());
  const [showCode, setShowCode] = useState(false);

  // Generate auto dark colors
  const autoDarkColors = useMemo(() => generateDarkPalette(lightColors), [lightColors]);

  // Merge auto with overrides
  const effectiveDarkColors = useMemo(() => {
    const merged = { ...autoDarkColors };
    for (const key of overrides) {
      if (darkColors[key]) {
        merged[key] = darkColors[key];
      }
    }
    return merged;
  }, [autoDarkColors, darkColors, overrides]);

  // Handle color change
  const handleDarkColorChange = useCallback(
    (key: ColorKey, value: string) => {
      const newDarkColors = { ...darkColors, [key]: value };
      setDarkColors(newDarkColors);
      setOverrides((prev) => new Set([...prev, key]));
      onChange?.(newDarkColors);
    },
    [darkColors, onChange]
  );

  // Clear override
  const handleClearOverride = useCallback(
    (key: ColorKey) => {
      const newDarkColors = { ...darkColors };
      delete newDarkColors[key];
      setDarkColors(newDarkColors);
      setOverrides((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      onChange?.(newDarkColors);
    },
    [darkColors, onChange]
  );

  // Auto-generate all
  const handleAutoGenerate = useCallback(() => {
    setDarkColors({});
    setOverrides(new Set());
    onChange?.({});
  }, [onChange]);

  // Generate CSS
  const cssCode = useMemo(
    () => generateThemeCSS(lightColors, effectiveDarkColors),
    [lightColors, effectiveDarkColors]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-300">Dark Mode Colors</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {overrides.size} manual override{overrides.size !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoGenerate}
            className="px-3 py-1.5 text-xs bg-gold-600 text-white rounded-lg hover:bg-gold-500 transition-colors"
          >
            Auto-Generate All
          </button>
        </div>
      </div>

      {/* Side-by-side preview */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-2">Light Theme</label>
          <ThemePreview colors={lightColors} isDark={false} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">Dark Theme</label>
          <ThemePreview colors={effectiveDarkColors} isDark={true} />
        </div>
      </div>

      {/* Color groups */}
      {Object.entries(COLOR_GROUPS).map(([groupName, keys]) => (
        <div key={groupName}>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
            {groupName} Colors
          </label>
          <div className="bg-slate-800/30 rounded-lg p-3">
            {keys.map((key) => (
              <ColorComparisonRow
                key={key}
                colorKey={key}
                lightValue={lightColors[key]}
                darkValue={effectiveDarkColors[key]}
                isOverridden={overrides.has(key)}
                onDarkChange={(value) => handleDarkColorChange(key, value)}
                onClearOverride={() => handleClearOverride(key)}
                backgroundLight={lightColors.background || '#FFFFFF'}
                backgroundDark={effectiveDarkColors.background || '#0F172A'}
              />
            ))}
          </div>
        </div>
      ))}

      {/* CSS Output */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">CSS Variables</label>
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
        {showCode && (
          <div className="relative">
            <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-64">
              <code>{cssCode}</code>
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(cssCode)}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <strong className="text-slate-400">Tips:</strong>
        <ul className="mt-1 space-y-1 list-disc list-inside">
          <li>Auto-generated colors maintain WCAG AA contrast</li>
          <li>Override specific colors by editing them directly</li>
          <li>Clear overrides to revert to auto-generated values</li>
        </ul>
      </div>
    </div>
  );
}

export default DarkModeEditor;
