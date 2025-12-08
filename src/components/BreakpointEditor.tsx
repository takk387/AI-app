'use client';

/**
 * BreakpointEditor Component
 *
 * Visual breakpoint management with draggable markers, device presets,
 * and custom breakpoint configuration.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { BreakpointConfig } from '@/types/layoutDesign';
import { DEFAULT_BREAKPOINTS, DEVICE_PRESETS } from '@/hooks/useResponsivePreview';

// ============================================================================
// TYPES
// ============================================================================

interface BreakpointEditorProps {
  breakpoints?: Partial<BreakpointConfig>;
  currentWidth?: number;
  onChange?: (breakpoints: BreakpointConfig) => void;
  onWidthChange?: (width: number) => void;
  className?: string;
}

interface BreakpointPreset {
  id: string;
  name: string;
  breakpoints: BreakpointConfig;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BREAKPOINT_PRESETS: BreakpointPreset[] = [
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
  },
  {
    id: 'bootstrap',
    name: 'Bootstrap',
    breakpoints: { sm: 576, md: 768, lg: 992, xl: 1200, '2xl': 1400 },
  },
  {
    id: 'material',
    name: 'Material UI',
    breakpoints: { sm: 600, md: 900, lg: 1200, xl: 1536, '2xl': 1920 },
  },
  {
    id: 'custom',
    name: 'Custom',
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
  },
];

const BREAKPOINT_COLORS: Record<string, string> = {
  sm: '#F59E0B',
  md: '#10B981',
  lg: '#3B82F6',
  xl: '#8B5CF6',
  '2xl': '#EC4899',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function BreakpointRuler({
  breakpoints,
  currentWidth,
  maxWidth = 1920,
  onWidthChange,
  onBreakpointChange,
}: {
  breakpoints: BreakpointConfig;
  currentWidth: number;
  maxWidth?: number;
  onWidthChange: (width: number) => void;
  onBreakpointChange: (key: keyof BreakpointConfig, value: number) => void;
}) {
  const [draggingKey, setDraggingKey] = useState<keyof BreakpointConfig | null>(null);

  const handleMouseDown = (key: keyof BreakpointConfig) => {
    setDraggingKey(key);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!draggingKey) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newValue = Math.round((x / rect.width) * maxWidth);
      const clampedValue = Math.max(320, Math.min(maxWidth, newValue));
      onBreakpointChange(draggingKey, clampedValue);
    },
    [draggingKey, maxWidth, onBreakpointChange]
  );

  const handleMouseUp = () => {
    setDraggingKey(null);
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newWidth = Math.round((x / rect.width) * maxWidth);
    onWidthChange(Math.max(320, Math.min(maxWidth, newWidth)));
  };

  return (
    <div
      className="relative h-12 bg-slate-800 rounded-lg cursor-pointer overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleRulerClick}
    >
      {/* Ruler marks */}
      <div className="absolute inset-0 flex">
        {[...Array(Math.ceil(maxWidth / 200))].map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 border-l border-slate-700"
            style={{ width: `${(200 / maxWidth) * 100}%` }}
          >
            <span className="text-[10px] text-slate-600 ml-1">{i * 200}</span>
          </div>
        ))}
      </div>

      {/* Breakpoint markers */}
      {Object.entries(breakpoints).map(([key, value]) => (
        <div
          key={key}
          className="absolute top-0 bottom-0 w-1 cursor-ew-resize group"
          style={{
            left: `${(value / maxWidth) * 100}%`,
            backgroundColor: BREAKPOINT_COLORS[key] || '#64748B',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(key as keyof BreakpointConfig);
          }}
        >
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            style={{ backgroundColor: BREAKPOINT_COLORS[key] || '#64748B' }}
          >
            {key}: {value}px
          </div>
        </div>
      ))}

      {/* Current width indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
        style={{ left: `${(currentWidth / maxWidth) * 100}%` }}
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-slate-900 text-xs font-medium rounded shadow-lg">
          {currentWidth}px
        </div>
      </div>
    </div>
  );
}

function BreakpointInputs({
  breakpoints,
  onChange,
}: {
  breakpoints: BreakpointConfig;
  onChange: (key: keyof BreakpointConfig, value: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Object.entries(breakpoints).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: BREAKPOINT_COLORS[key] }}>
            {key}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(key as keyof BreakpointConfig, parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      ))}
    </div>
  );
}

function DevicePresetSelector({
  currentWidth,
  onSelect,
}: {
  currentWidth: number;
  onSelect: (width: number, height: number) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All', icon: '📱' },
    { id: 'mobile', name: 'Mobile', icon: '📱' },
    { id: 'tablet', name: 'Tablet', icon: '📲' },
    { id: 'laptop', name: 'Laptop', icon: '💻' },
    { id: 'desktop', name: 'Desktop', icon: '🖥️' },
  ];

  const filteredDevices = useMemo(() => {
    if (selectedCategory === 'all') return DEVICE_PRESETS;
    return DEVICE_PRESETS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              px-2 py-1 text-xs rounded transition-all
              ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }
            `}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
        {filteredDevices.map((device) => (
          <button
            key={device.id}
            onClick={() => onSelect(device.width, device.height)}
            className={`
              p-2 rounded-lg border text-left transition-all
              ${
                currentWidth === device.width
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-center gap-1.5">
              <span>{device.icon}</span>
              <span className="text-xs text-slate-300 truncate">{device.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {device.width} x {device.height}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickWidthButtons({
  breakpoints,
  currentWidth,
  onSelect,
}: {
  breakpoints: BreakpointConfig;
  currentWidth: number;
  onSelect: (width: number) => void;
}) {
  const quickWidths = [
    { label: 'Mobile', width: 375 },
    ...Object.entries(breakpoints).map(([key, value]) => ({
      label: key.toUpperCase(),
      width: value,
    })),
    { label: 'Full', width: 1920 },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {quickWidths.map(({ label, width }) => (
        <button
          key={label}
          onClick={() => onSelect(width)}
          className={`
            px-2 py-1 text-xs rounded transition-all
            ${
              currentWidth === width
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BreakpointEditor({
  breakpoints: initialBreakpoints,
  currentWidth: initialWidth,
  onChange,
  onWidthChange,
  className = '',
}: BreakpointEditorProps) {
  const [breakpoints, setBreakpoints] = useState<BreakpointConfig>({
    ...DEFAULT_BREAKPOINTS,
    ...initialBreakpoints,
  });
  const [currentWidth, setCurrentWidth] = useState(initialWidth || 1280);
  const [selectedPreset, setSelectedPreset] = useState<string>('tailwind');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle breakpoint change
  const handleBreakpointChange = useCallback(
    (key: keyof BreakpointConfig, value: number) => {
      const newBreakpoints = { ...breakpoints, [key]: value };
      setBreakpoints(newBreakpoints);
      setSelectedPreset('custom');
      onChange?.(newBreakpoints);
    },
    [breakpoints, onChange]
  );

  // Handle width change
  const handleWidthChange = useCallback(
    (width: number) => {
      setCurrentWidth(width);
      onWidthChange?.(width);
    },
    [onWidthChange]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = BREAKPOINT_PRESETS.find((p) => p.id === presetId);
      if (preset && preset.id !== 'custom') {
        setBreakpoints(preset.breakpoints);
        setSelectedPreset(presetId);
        onChange?.(preset.breakpoints);
      }
    },
    [onChange]
  );

  // Handle device selection
  const handleDeviceSelect = useCallback(
    (width: number) => {
      handleWidthChange(width);
    },
    [handleWidthChange]
  );

  // Get current breakpoint name
  const currentBreakpointName = useMemo(() => {
    if (currentWidth < breakpoints.sm) return 'XS';
    if (currentWidth < breakpoints.md) return 'SM';
    if (currentWidth < breakpoints.lg) return 'MD';
    if (currentWidth < breakpoints.xl) return 'LG';
    if (currentWidth < breakpoints['2xl']) return 'XL';
    return '2XL';
  }, [currentWidth, breakpoints]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with current info */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">{currentWidth}px</span>
            <span
              className="px-2 py-0.5 text-xs font-medium rounded"
              style={{
                backgroundColor:
                  BREAKPOINT_COLORS[currentBreakpointName.toLowerCase()] || '#64748B',
                color: 'white',
              }}
            >
              {currentBreakpointName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Current preview width</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentWidth}
            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 320)}
            min={320}
            max={2560}
            className="w-24 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-slate-500">px</span>
        </div>
      </div>

      {/* Visual ruler */}
      <BreakpointRuler
        breakpoints={breakpoints}
        currentWidth={currentWidth}
        onWidthChange={handleWidthChange}
        onBreakpointChange={handleBreakpointChange}
      />

      {/* Quick width buttons */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Quick Select</label>
        <QuickWidthButtons
          breakpoints={breakpoints}
          currentWidth={currentWidth}
          onSelect={handleWidthChange}
        />
      </div>

      {/* Framework presets */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Framework Presets</label>
        <div className="flex gap-2">
          {BREAKPOINT_PRESETS.filter((p) => p.id !== 'custom').map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={`
                flex-1 px-3 py-2 text-sm rounded-lg border transition-all
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

      {/* Device presets */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Device Presets</label>
        <DevicePresetSelector currentWidth={currentWidth} onSelect={handleDeviceSelect} />
      </div>

      {/* Advanced: Custom breakpoints */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Custom Breakpoints
        </button>

        {showAdvanced && (
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <BreakpointInputs breakpoints={breakpoints} onChange={handleBreakpointChange} />
            <p className="text-xs text-slate-500 mt-2">
              Drag markers on the ruler or edit values directly
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BreakpointEditor;
