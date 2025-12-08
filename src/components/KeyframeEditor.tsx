'use client';

/**
 * KeyframeEditor Component
 *
 * Detailed editor for individual keyframe properties with
 * visual controls and live preview.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  type Keyframe,
  type KeyframeProperties,
  type EasingFunction,
  type PropertyTrack,
  PROPERTY_TRACKS,
  EASING_PRESETS,
  propertiesToStyle,
} from '@/utils/keyframeUtils';

// ============================================================================
// TYPES
// ============================================================================

interface KeyframeEditorProps {
  keyframe: Keyframe;
  onChange: (keyframe: Keyframe) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  canDelete?: boolean;
  className?: string;
}

interface PropertyGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function PropertyGroup({ title, children, defaultOpen = true }: PropertyGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <span className="text-xs font-medium text-slate-300">{title}</span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  showSlider = true,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSlider?: boolean;
}) {
  const hasValue = value !== undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">{label}</label>
        <button
          onClick={() => onChange(hasValue ? undefined : (min ?? 0))}
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            hasValue ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}
        >
          {hasValue ? 'On' : 'Off'}
        </button>
      </div>

      {hasValue && (
        <div className="flex items-center gap-2">
          {showSlider && min !== undefined && max !== undefined && (
            <input
              type="range"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              min={min}
              max={max}
              step={step}
              className="flex-1 accent-blue-500"
            />
          )}
          <div className="flex items-center">
            <input
              type="number"
              value={value}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange(isNaN(val) ? undefined : val);
              }}
              min={min}
              max={max}
              step={step}
              className="w-16 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded-l-md text-slate-200 text-center focus:border-blue-500 focus:outline-none"
            />
            {unit && (
              <span className="px-2 py-1 text-xs bg-slate-700 border border-l-0 border-slate-600 rounded-r-md text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const hasValue = value !== undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">{label}</label>
        <button
          onClick={() => onChange(hasValue ? undefined : '#3B82F6')}
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            hasValue ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}
        >
          {hasValue ? 'On' : 'Off'}
        </button>
      </div>

      {hasValue && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border border-slate-600"
          />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function StringInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  const hasValue = value !== undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">{label}</label>
        <button
          onClick={() => onChange(hasValue ? undefined : '')}
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            hasValue ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}
        >
          {hasValue ? 'On' : 'Off'}
        </button>
      </div>

      {hasValue && (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
        />
      )}
    </div>
  );
}

function EasingSelector({
  value,
  onChange,
}: {
  value: EasingFunction;
  onChange: (easing: EasingFunction) => void;
}) {
  const [showCustom, setShowCustom] = useState(
    typeof value === 'object' && value.type === 'cubic-bezier'
  );
  const [customValues, setCustomValues] = useState<[number, number, number, number]>(
    typeof value === 'object' && value.type === 'cubic-bezier' ? value.values : [0.25, 0.1, 0.25, 1]
  );

  const handlePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setShowCustom(true);
      onChange({ type: 'cubic-bezier', values: customValues });
    } else {
      setShowCustom(false);
      onChange(preset as EasingFunction);
    }
  };

  const handleCustomChange = (index: number, val: number) => {
    const newValues: [number, number, number, number] = [...customValues];
    newValues[index] = val;
    setCustomValues(newValues);
    onChange({ type: 'cubic-bezier', values: newValues });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500">Easing to Next Keyframe</label>

      <select
        value={showCustom ? 'custom' : typeof value === 'string' ? value : 'custom'}
        onChange={(e) => handlePresetChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-md text-slate-200 focus:border-blue-500 focus:outline-none"
      >
        {EASING_PRESETS.slice(0, 10).map((preset) => (
          <option key={preset.id as string} value={preset.id as string}>
            {preset.label}
          </option>
        ))}
        <option value="custom">Custom Bezier</option>
      </select>

      {showCustom && (
        <div className="grid grid-cols-4 gap-2">
          {['x1', 'y1', 'x2', 'y2'].map((label, i) => (
            <div key={label}>
              <label className="text-[10px] text-slate-600 block mb-0.5">{label}</label>
              <input
                type="number"
                value={customValues[i]}
                onChange={(e) => handleCustomChange(i, parseFloat(e.target.value) || 0)}
                step={0.05}
                min={i % 2 === 0 ? 0 : -2}
                max={i % 2 === 0 ? 1 : 2}
                className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 text-center focus:border-blue-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Easing preview */}
      <div className="h-12 bg-slate-800 rounded-md overflow-hidden relative">
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <EasingCurve easing={value} />
        </svg>
      </div>
    </div>
  );
}

function EasingCurve({ easing }: { easing: EasingFunction }) {
  const path = useMemo(() => {
    let bezier: [number, number, number, number];

    if (typeof easing === 'object' && easing.type === 'cubic-bezier') {
      bezier = easing.values;
    } else {
      const preset = EASING_PRESETS.find((p) => p.id === easing);
      if (preset) {
        const match = preset.cssValue.match(
          /cubic-bezier\(([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\)/
        );
        if (match) {
          bezier = [
            parseFloat(match[1]),
            parseFloat(match[2]),
            parseFloat(match[3]),
            parseFloat(match[4]),
          ];
        } else if (preset.cssValue === 'linear') {
          bezier = [0, 0, 1, 1];
        } else {
          bezier = [0.25, 0.1, 0.25, 1];
        }
      } else {
        bezier = [0.25, 0.1, 0.25, 1];
      }
    }

    const [x1, y1, x2, y2] = bezier;
    // SVG coordinates: y is inverted
    const startX = 10;
    const startY = 35;
    const endX = 90;
    const endY = 5;

    const cp1x = startX + (endX - startX) * x1;
    const cp1y = startY - (startY - endY) * y1;
    const cp2x = startX + (endX - startX) * x2;
    const cp2y = startY - (startY - endY) * y2;

    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
  }, [easing]);

  return (
    <>
      {/* Grid */}
      <line x1="10" y1="5" x2="10" y2="35" stroke="#334155" strokeWidth="0.5" />
      <line x1="10" y1="35" x2="90" y2="35" stroke="#334155" strokeWidth="0.5" />
      <line x1="90" y1="5" x2="90" y2="35" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
      <line x1="10" y1="5" x2="90" y2="5" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />

      {/* Curve */}
      <path d={path} fill="none" stroke="#3B82F6" strokeWidth="2" />

      {/* Endpoints */}
      <circle cx="10" cy="35" r="2" fill="#3B82F6" />
      <circle cx="90" cy="5" r="2" fill="#3B82F6" />
    </>
  );
}

function KeyframePreview({ properties }: { properties: KeyframeProperties }) {
  const style = propertiesToStyle(properties);

  return (
    <div className="flex items-center justify-center p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div
        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
        style={style}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KeyframeEditor({
  keyframe,
  onChange,
  onDelete,
  onDuplicate,
  canDelete = true,
  className = '',
}: KeyframeEditorProps) {
  // Update a property
  const updateProperty = useCallback(
    <K extends keyof KeyframeProperties>(property: K, value: KeyframeProperties[K] | undefined) => {
      const newProperties = { ...keyframe.properties };
      if (value === undefined) {
        delete newProperties[property];
      } else {
        newProperties[property] = value;
      }
      onChange({ ...keyframe, properties: newProperties });
    },
    [keyframe, onChange]
  );

  // Update time
  const updateTime = useCallback(
    (time: number) => {
      onChange({ ...keyframe, time: Math.max(0, Math.min(100, time)) });
    },
    [keyframe, onChange]
  );

  // Update easing
  const updateEasing = useCallback(
    (easing: EasingFunction) => {
      onChange({ ...keyframe, easing });
    },
    [keyframe, onChange]
  );

  // Group properties by category
  const transformProps = [
    'translateX',
    'translateY',
    'scale',
    'scaleX',
    'scaleY',
    'rotate',
    'skewX',
    'skewY',
  ];
  const appearanceProps = ['opacity', 'backgroundColor', 'borderColor', 'color', 'borderRadius'];
  const sizeProps = ['width', 'height'];
  const effectProps = ['boxShadow'];

  const renderPropertyInput = (track: PropertyTrack) => {
    const value = keyframe.properties[track.property];

    if (track.type === 'color') {
      return (
        <ColorInput
          key={track.property}
          label={track.label}
          value={value as string | undefined}
          onChange={(v) => updateProperty(track.property, v)}
        />
      );
    }

    if (track.type === 'number') {
      return (
        <NumberInput
          key={track.property}
          label={track.label}
          value={value as number | undefined}
          onChange={(v) => updateProperty(track.property, v)}
          min={track.min}
          max={track.max}
          step={track.step}
          unit={track.unit}
        />
      );
    }

    return (
      <StringInput
        key={track.property}
        label={track.label}
        value={value as string | undefined}
        onChange={(v) => updateProperty(track.property, v)}
        placeholder={`e.g., ${track.property === 'boxShadow' ? '0 4px 12px rgba(0,0,0,0.3)' : ''}`}
      />
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-amber-500 rotate-45" />
          <span className="font-medium text-slate-200">Keyframe at {keyframe.time}%</span>
        </div>
        <div className="flex gap-1">
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Duplicate"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
          {onDelete && canDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <KeyframePreview properties={keyframe.properties} />

      {/* Time */}
      <div>
        <label className="text-xs text-slate-500 block mb-1">Time Position</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={keyframe.time}
            onChange={(e) => updateTime(parseInt(e.target.value))}
            min={0}
            max={100}
            className="flex-1 accent-blue-500"
          />
          <div className="flex items-center">
            <input
              type="number"
              value={keyframe.time}
              onChange={(e) => updateTime(parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              className="w-14 px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded-l-md text-slate-200 text-center focus:border-blue-500 focus:outline-none"
            />
            <span className="px-2 py-1 text-xs bg-slate-700 border border-l-0 border-slate-600 rounded-r-md text-slate-400">
              %
            </span>
          </div>
        </div>
      </div>

      {/* Transform Properties */}
      <PropertyGroup title="Transform">
        <div className="grid grid-cols-2 gap-3">
          {PROPERTY_TRACKS.filter((t) => transformProps.includes(t.property)).map(
            renderPropertyInput
          )}
        </div>
      </PropertyGroup>

      {/* Appearance Properties */}
      <PropertyGroup title="Appearance">
        <div className="space-y-3">
          {PROPERTY_TRACKS.filter((t) => appearanceProps.includes(t.property)).map(
            renderPropertyInput
          )}
        </div>
      </PropertyGroup>

      {/* Size Properties */}
      <PropertyGroup title="Size" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          {PROPERTY_TRACKS.filter((t) => sizeProps.includes(t.property)).map(renderPropertyInput)}
        </div>
      </PropertyGroup>

      {/* Effects */}
      <PropertyGroup title="Effects" defaultOpen={false}>
        {PROPERTY_TRACKS.filter((t) => effectProps.includes(t.property)).map(renderPropertyInput)}
      </PropertyGroup>

      {/* Easing */}
      <PropertyGroup title="Easing">
        <EasingSelector value={keyframe.easing} onChange={updateEasing} />
      </PropertyGroup>

      {/* Active properties summary */}
      <div className="text-xs text-slate-500 p-3 bg-slate-800/30 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-slate-400">Active Properties</span>
          <span>{Object.keys(keyframe.properties).length}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {Object.keys(keyframe.properties).map((prop) => (
            <span key={prop} className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
              {prop}
            </span>
          ))}
          {Object.keys(keyframe.properties).length === 0 && (
            <span className="text-slate-600 italic">No properties set</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default KeyframeEditor;
