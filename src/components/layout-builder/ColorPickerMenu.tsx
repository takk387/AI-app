'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// NOTE: Preset colors removed - colors are AI-generated based on design description

// localStorage key for recent colors
const STORAGE_KEY = 'layoutPreview_recentColors';
const MAX_RECENT = 6;

function getRecentColors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentColor(color: string): void {
  const recent = getRecentColors();
  // Normalize to uppercase for comparison
  const normalizedColor = color.toUpperCase();
  const updated = [
    normalizedColor,
    ...recent.filter((c) => c.toUpperCase() !== normalizedColor),
  ].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

interface ColorPickerMenuProps {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  onColorChange: (colors: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  }) => void;
}

/**
 * Dropdown menu for color selection with presets and recent colors
 */
export function ColorPickerMenu({
  primaryColor,
  secondaryColor = '#9CA3AF',
  accentColor = '#6B7280',
  onColorChange,
}: ColorPickerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load recent colors on mount
  useEffect(() => {
    setRecentColors(getRecentColors());
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Handle color change and update recent colors
  const handleColorChange = useCallback(
    (type: 'primary' | 'secondary' | 'accent', color: string) => {
      addRecentColor(color);
      setRecentColors(getRecentColors());

      switch (type) {
        case 'primary':
          onColorChange({ primaryColor: color });
          break;
        case 'secondary':
          onColorChange({ secondaryColor: color });
          break;
        case 'accent':
          onColorChange({ accentColor: color });
          break;
      }
    },
    [onColorChange]
  );

  // Handle preset/recent color click (sets primary by default)
  const handleSwatchClick = useCallback(
    (color: string) => {
      handleColorChange('primary', color);
    },
    [handleColorChange]
  );

  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2"
        style={{
          backgroundColor: isOpen || hovered ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
          color: isOpen
            ? 'var(--text-primary)'
            : hovered
              ? 'var(--text-primary)'
              : 'var(--text-muted)',
        }}
        title="Color Options"
      >
        <div
          className="w-4 h-4 rounded border border-white/30"
          style={{ backgroundColor: primaryColor }}
        />
        Colors
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-72 rounded-lg shadow-xl z-50 py-2 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Primary Color */}
          <div className="px-3 py-2">
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: primaryColor }}
                />
              </label>
              <input
                type="text"
                value={primaryColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    handleColorChange('primary', val);
                  }
                }}
                className="flex-1 text-xs px-2 py-1.5 rounded focus:border-garden-500 focus:outline-none font-mono"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div className="px-3 py-2">
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: secondaryColor }}
                />
              </label>
              <input
                type="text"
                value={secondaryColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    handleColorChange('secondary', val);
                  }
                }}
                className="flex-1 text-xs px-2 py-1.5 rounded focus:border-garden-500 focus:outline-none font-mono"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                placeholder="#6366F1"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="px-3 py-2">
            <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: accentColor }}
                />
              </label>
              <input
                type="text"
                value={accentColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    handleColorChange('accent', val);
                  }
                }}
                className="flex-1 text-xs px-2 py-1.5 rounded focus:border-garden-500 focus:outline-none font-mono"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                placeholder="#F59E0B"
              />
            </div>
          </div>

          <div className="my-2" style={{ borderTop: '1px solid var(--border-color)' }} />

          {/* AI-Generated Colors Note */}
          <div className="px-3 py-2">
            <div
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Colors are generated by AI based on your design description.
              </p>
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <>
              <div className="my-2" style={{ borderTop: '1px solid var(--border-color)' }} />
              <div className="px-3 py-2">
                <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Recent
                </label>
                <div className="flex gap-1.5">
                  {recentColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      onClick={() => handleSwatchClick(color)}
                      className={`w-6 h-6 rounded border transition-all hover:scale-110 ${
                        primaryColor.toUpperCase() === color.toUpperCase()
                          ? 'border-white scale-110'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ColorPickerMenu;
