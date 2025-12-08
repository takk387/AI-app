'use client';

/**
 * Typography Panel Component
 *
 * Provides detailed typography controls for the Layout Builder:
 * - Font family picker with Google Fonts
 * - Heading font selector
 * - Weight controls
 * - Size presets
 * - Line height and letter spacing
 * - Live text preview
 */

import React, { useState, useMemo, useEffect } from 'react';
import type { TypographySettings } from '@/types/layoutDesign';
import {
  GOOGLE_FONTS,
  FONT_CATEGORIES,
  getFontUrl,
  getFontsByCategory,
  getPopularFonts,
  searchFonts,
  type GoogleFont,
} from '@/data/googleFonts';

// ============================================================================
// TYPES
// ============================================================================

interface TypographyPanelProps {
  typography: Partial<TypographySettings>;
  onChange: (typography: Partial<TypographySettings>) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEIGHT_OPTIONS = [
  { value: 'light', label: 'Light', numericWeight: 300 },
  { value: 'normal', label: 'Normal', numericWeight: 400 },
  { value: 'medium', label: 'Medium', numericWeight: 500 },
  { value: 'semibold', label: 'Semibold', numericWeight: 600 },
  { value: 'bold', label: 'Bold', numericWeight: 700 },
] as const;

const HEADING_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small', example: '24px' },
  { value: 'base', label: 'Base', example: '30px' },
  { value: 'lg', label: 'Large', example: '36px' },
  { value: 'xl', label: 'XL', example: '48px' },
] as const;

const BODY_SIZE_OPTIONS = [
  { value: 'xs', label: 'Extra Small', example: '12px' },
  { value: 'sm', label: 'Small', example: '14px' },
  { value: 'base', label: 'Base', example: '16px' },
] as const;

const LINE_HEIGHT_OPTIONS = [
  { value: 'tight', label: 'Tight', example: '1.25' },
  { value: 'normal', label: 'Normal', example: '1.5' },
  { value: 'relaxed', label: 'Relaxed', example: '1.75' },
] as const;

const LETTER_SPACING_OPTIONS = [
  { value: 'tight', label: 'Tight', example: '-0.025em' },
  { value: 'normal', label: 'Normal', example: '0' },
  { value: 'wide', label: 'Wide', example: '0.05em' },
] as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Font Picker Dropdown
 */
function FontPicker({
  label,
  value,
  onChange,
  loadedFonts,
  onFontLoad,
}: {
  label: string;
  value: string;
  onChange: (family: string) => void;
  loadedFonts: Set<string>;
  onFontLoad: (family: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('popular');

  const filteredFonts = useMemo(() => {
    if (search) {
      return searchFonts(search);
    }
    if (activeCategory === 'popular') {
      return getPopularFonts();
    }
    return getFontsByCategory(activeCategory as GoogleFont['category']);
  }, [search, activeCategory]);

  const handleSelect = (font: GoogleFont) => {
    if (!loadedFonts.has(font.family)) {
      onFontLoad(font.family);
    }
    onChange(font.family);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-700 rounded-md text-left text-sm text-white flex items-center justify-between hover:bg-slate-600 transition-colors"
        style={{ fontFamily: value || 'Inter' }}
      >
        <span>{value || 'Select font...'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="w-full px-2 py-1.5 bg-slate-700 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex gap-1 p-2 border-b border-slate-700 overflow-x-auto">
              {FONT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Font List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredFonts.map((font) => (
              <button
                key={font.family}
                type="button"
                onClick={() => handleSelect(font)}
                className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-center justify-between ${
                  value === font.family ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'
                }`}
                style={{
                  fontFamily: loadedFonts.has(font.family) ? font.family : 'inherit',
                }}
                onMouseEnter={() => {
                  if (!loadedFonts.has(font.family)) {
                    onFontLoad(font.family);
                  }
                }}
              >
                <span className="text-sm">{font.family}</span>
                <span className="text-xs text-slate-500">{font.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Segmented Control
 */
function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: T;
  options: readonly { value: T; label: string; example?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <div className="flex gap-0.5 bg-slate-800 p-0.5 rounded-md">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.example}
            className={`flex-1 px-2 py-1.5 text-xs rounded transition-all ${
              value === option.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Text Preview
 */
function TextPreview({
  typography,
  fontFamily,
  headingFont,
}: {
  typography: Partial<TypographySettings>;
  fontFamily: string;
  headingFont?: string;
}) {
  const getWeightNumber = (weight?: string): number => {
    const option = WEIGHT_OPTIONS.find((w) => w.value === weight);
    return option?.numericWeight || 400;
  };

  const getLineHeight = (lh?: string): number => {
    switch (lh) {
      case 'tight':
        return 1.25;
      case 'relaxed':
        return 1.75;
      default:
        return 1.5;
    }
  };

  const getLetterSpacing = (ls?: string): string => {
    switch (ls) {
      case 'tight':
        return '-0.025em';
      case 'wide':
        return '0.05em';
      default:
        return '0';
    }
  };

  const headingSizeMap: Record<string, string> = {
    sm: '20px',
    base: '24px',
    lg: '30px',
    xl: '36px',
  };

  const bodySizeMap: Record<string, string> = {
    xs: '12px',
    sm: '14px',
    base: '16px',
  };

  return (
    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="text-xs text-slate-500 mb-2">Preview</div>
      <div
        className="text-white mb-2"
        style={{
          fontFamily: headingFont || fontFamily,
          fontWeight: getWeightNumber(typography.headingWeight),
          fontSize: headingSizeMap[typography.headingSize || 'lg'],
          lineHeight: getLineHeight(typography.lineHeight),
          letterSpacing: getLetterSpacing(typography.letterSpacing),
        }}
      >
        Heading Text
      </div>
      <div
        className="text-slate-300"
        style={{
          fontFamily: fontFamily,
          fontWeight: getWeightNumber(typography.bodyWeight),
          fontSize: bodySizeMap[typography.bodySize || 'base'],
          lineHeight: getLineHeight(typography.lineHeight),
          letterSpacing: getLetterSpacing(typography.letterSpacing),
        }}
      >
        Body text example showing the selected typography settings. This is how your content will
        appear.
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TypographyPanel({ typography, onChange }: TypographyPanelProps) {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set(['Inter']));

  // Load font from Google Fonts
  const loadFont = (family: string) => {
    if (loadedFonts.has(family)) return;

    const font = GOOGLE_FONTS.find((f) => f.family === family);
    if (!font) return;

    const link = document.createElement('link');
    link.href = getFontUrl(family, font.weights);
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    setLoadedFonts((prev) => new Set([...prev, family]));
  };

  // Load current fonts on mount
  useEffect(() => {
    if (typography.fontFamily) {
      loadFont(typography.fontFamily);
    }
    if (typography.headingFont) {
      loadFont(typography.headingFont);
    }
  }, [typography.fontFamily, typography.headingFont]);

  const handleChange = <K extends keyof TypographySettings>(
    key: K,
    value: TypographySettings[K]
  ) => {
    onChange({ ...typography, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Font Family */}
      <FontPicker
        label="Body Font"
        value={typography.fontFamily || 'Inter'}
        onChange={(family) => handleChange('fontFamily', family)}
        loadedFonts={loadedFonts}
        onFontLoad={loadFont}
      />

      {/* Heading Font */}
      <FontPicker
        label="Heading Font (optional)"
        value={typography.headingFont || ''}
        onChange={(family) => handleChange('headingFont', family)}
        loadedFonts={loadedFonts}
        onFontLoad={loadFont}
      />

      {/* Font Weights */}
      <div className="grid grid-cols-2 gap-3">
        <SegmentedControl
          label="Heading Weight"
          value={typography.headingWeight}
          options={WEIGHT_OPTIONS}
          onChange={(v) => handleChange('headingWeight', v)}
        />
        <SegmentedControl
          label="Body Weight"
          value={typography.bodyWeight}
          options={WEIGHT_OPTIONS}
          onChange={(v) => handleChange('bodyWeight', v)}
        />
      </div>

      {/* Font Sizes */}
      <div className="grid grid-cols-2 gap-3">
        <SegmentedControl
          label="Heading Size"
          value={typography.headingSize}
          options={HEADING_SIZE_OPTIONS}
          onChange={(v) => handleChange('headingSize', v)}
        />
        <SegmentedControl
          label="Body Size"
          value={typography.bodySize}
          options={BODY_SIZE_OPTIONS}
          onChange={(v) => handleChange('bodySize', v)}
        />
      </div>

      {/* Line Height & Letter Spacing */}
      <div className="grid grid-cols-2 gap-3">
        <SegmentedControl
          label="Line Height"
          value={typography.lineHeight}
          options={LINE_HEIGHT_OPTIONS}
          onChange={(v) => handleChange('lineHeight', v)}
        />
        <SegmentedControl
          label="Letter Spacing"
          value={typography.letterSpacing}
          options={LETTER_SPACING_OPTIONS}
          onChange={(v) => handleChange('letterSpacing', v)}
        />
      </div>

      {/* Preview */}
      <TextPreview
        typography={typography}
        fontFamily={typography.fontFamily || 'Inter'}
        headingFont={typography.headingFont}
      />
    </div>
  );
}

export default TypographyPanel;
