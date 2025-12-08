'use client';

/**
 * ResponsivePropertyEditor Component
 *
 * Per-breakpoint property editing for container, layout, typography,
 * and spacing overrides.
 */

import React, { useState, useCallback } from 'react';
import type { BreakpointConfig } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export interface ResponsiveProperties {
  containerWidth?: ResponsiveValue<string>;
  sidebarVisible?: ResponsiveValue<boolean>;
  headerLayout?: ResponsiveValue<'stacked' | 'inline'>;
  gridColumns?: ResponsiveValue<number>;
  fontSize?: ResponsiveValue<string>;
  spacing?: ResponsiveValue<number>;
  padding?: ResponsiveValue<string>;
}

interface ResponsivePropertyEditorProps {
  properties: ResponsiveProperties;
  breakpoints: BreakpointConfig;
  currentBreakpoint: string;
  onChange: (properties: ResponsiveProperties) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BREAKPOINT_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;

const CONTAINER_WIDTH_OPTIONS = [
  { value: 'full', label: 'Full Width' },
  { value: 'narrow', label: 'Narrow (640px)' },
  { value: 'standard', label: 'Standard (1024px)' },
  { value: 'wide', label: 'Wide (1280px)' },
  { value: 'max', label: 'Max (1536px)' },
];

const GRID_COLUMN_OPTIONS = [1, 2, 3, 4, 6, 12];

const FONT_SIZE_OPTIONS = [
  { value: '12px', label: 'XS (12px)' },
  { value: '14px', label: 'SM (14px)' },
  { value: '16px', label: 'Base (16px)' },
  { value: '18px', label: 'LG (18px)' },
  { value: '20px', label: 'XL (20px)' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function BreakpointTabs({
  selected,
  onSelect,
  currentBreakpoint,
}: {
  selected: string;
  onSelect: (bp: string) => void;
  currentBreakpoint: string;
}) {
  return (
    <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg">
      {BREAKPOINT_ORDER.map((bp) => (
        <button
          key={bp}
          onClick={() => onSelect(bp)}
          className={`
            flex-1 px-2 py-1.5 text-xs font-medium rounded transition-all relative
            ${
              selected === bp
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }
          `}
        >
          {bp.toUpperCase()}
          {currentBreakpoint === bp && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}

function PropertyRow({
  label,
  children,
  isOverridden,
  onClear,
}: {
  label: string;
  children: React.ReactNode;
  isOverridden: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-b-0">
      <div className="w-32 flex items-center gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        {isOverridden && (
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" title="Has override" />
        )}
      </div>
      <div className="flex-1">{children}</div>
      {isOverridden && onClear && (
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          title="Clear override"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function SelectInput<T extends string>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value?: T;
  options: { value: T; label: string }[];
  onChange: (value: T | undefined) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange((e.target.value as T) || undefined)}
      className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-blue-500 focus:outline-none"
    >
      <option value="">{placeholder || 'Inherit'}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ToggleInput({
  value,
  onChange,
}: {
  value?: boolean;
  onChange: (value: boolean | undefined) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange(undefined)}
        className={`px-3 py-1 text-xs rounded ${
          value === undefined ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        Inherit
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1 text-xs rounded ${
          value === true ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        Show
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1 text-xs rounded ${
          value === false ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        Hide
      </button>
    </div>
  );
}

function NumberInput({
  value,
  options,
  onChange,
}: {
  value?: number;
  options: number[];
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onChange(undefined)}
        className={`px-2 py-1 text-xs rounded ${
          value === undefined ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        Auto
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-2 py-1 text-xs rounded min-w-[32px] ${
            value === opt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SpacingInput({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={2}
        step={0.1}
        value={value ?? 1}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          onChange(val === 1 ? undefined : val);
        }}
        className="flex-1 accent-blue-500"
      />
      <span className="text-xs text-slate-400 w-12 text-right">
        {value !== undefined ? `${value}x` : '1x'}
      </span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResponsivePropertyEditor({
  properties,
  breakpoints,
  currentBreakpoint,
  onChange,
  className = '',
}: ResponsivePropertyEditorProps) {
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<string>(currentBreakpoint);

  // Update a property at a specific breakpoint
  const updateProperty = useCallback(
    <K extends keyof ResponsiveProperties>(
      propertyKey: K,
      value: ResponsiveProperties[K] extends ResponsiveValue<infer T> ? T | undefined : never
    ) => {
      const currentValue = properties[propertyKey] || {};
      const newValue = {
        ...currentValue,
        [selectedBreakpoint]: value,
      };

      // Clean up undefined values
      Object.keys(newValue).forEach((key) => {
        if ((newValue as Record<string, unknown>)[key] === undefined) {
          delete (newValue as Record<string, unknown>)[key];
        }
      });

      onChange({
        ...properties,
        [propertyKey]: Object.keys(newValue).length > 0 ? newValue : undefined,
      });
    },
    [properties, selectedBreakpoint, onChange]
  );

  // Get value at breakpoint with inheritance
  const getValueAtBreakpoint = <T,>(
    responsiveValue: ResponsiveValue<T> | undefined,
    breakpoint: string
  ): T | undefined => {
    if (!responsiveValue) return undefined;

    // Check current breakpoint
    if ((responsiveValue as Record<string, T>)[breakpoint] !== undefined) {
      return (responsiveValue as Record<string, T>)[breakpoint];
    }

    // Check smaller breakpoints (inheritance)
    const bpIndex = BREAKPOINT_ORDER.indexOf(breakpoint as (typeof BREAKPOINT_ORDER)[number]);
    for (let i = bpIndex - 1; i >= 0; i--) {
      const bp = BREAKPOINT_ORDER[i];
      if ((responsiveValue as Record<string, T>)[bp] !== undefined) {
        return (responsiveValue as Record<string, T>)[bp];
      }
    }

    return undefined;
  };

  // Check if a property has an override at current breakpoint
  const hasOverride = <T,>(responsiveValue: ResponsiveValue<T> | undefined): boolean => {
    if (!responsiveValue) return false;
    return (responsiveValue as Record<string, T>)[selectedBreakpoint] !== undefined;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breakpoint selector */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Configure at Breakpoint</label>
        <BreakpointTabs
          selected={selectedBreakpoint}
          onSelect={setSelectedBreakpoint}
          currentBreakpoint={currentBreakpoint}
        />
        <p className="text-xs text-slate-500 mt-1">Values cascade down to smaller breakpoints</p>
      </div>

      {/* Property editors */}
      <div className="space-y-1 bg-slate-800/30 rounded-lg p-3">
        {/* Container Width */}
        <PropertyRow
          label="Container"
          isOverridden={hasOverride(properties.containerWidth)}
          onClear={() => updateProperty('containerWidth', undefined)}
        >
          <SelectInput
            value={getValueAtBreakpoint(properties.containerWidth, selectedBreakpoint)}
            options={CONTAINER_WIDTH_OPTIONS}
            onChange={(value) => updateProperty('containerWidth', value)}
            placeholder="Inherit"
          />
        </PropertyRow>

        {/* Sidebar Visibility */}
        <PropertyRow
          label="Sidebar"
          isOverridden={hasOverride(properties.sidebarVisible)}
          onClear={() => updateProperty('sidebarVisible', undefined)}
        >
          <ToggleInput
            value={getValueAtBreakpoint(properties.sidebarVisible, selectedBreakpoint)}
            onChange={(value) => updateProperty('sidebarVisible', value)}
          />
        </PropertyRow>

        {/* Header Layout */}
        <PropertyRow
          label="Header"
          isOverridden={hasOverride(properties.headerLayout)}
          onClear={() => updateProperty('headerLayout', undefined)}
        >
          <SelectInput
            value={getValueAtBreakpoint(properties.headerLayout, selectedBreakpoint)}
            options={[
              { value: 'inline', label: 'Inline' },
              { value: 'stacked', label: 'Stacked' },
            ]}
            onChange={(value) =>
              updateProperty('headerLayout', value as 'inline' | 'stacked' | undefined)
            }
            placeholder="Inherit"
          />
        </PropertyRow>

        {/* Grid Columns */}
        <PropertyRow
          label="Grid Cols"
          isOverridden={hasOverride(properties.gridColumns)}
          onClear={() => updateProperty('gridColumns', undefined)}
        >
          <NumberInput
            value={getValueAtBreakpoint(properties.gridColumns, selectedBreakpoint)}
            options={GRID_COLUMN_OPTIONS}
            onChange={(value) => updateProperty('gridColumns', value)}
          />
        </PropertyRow>

        {/* Font Size */}
        <PropertyRow
          label="Font Size"
          isOverridden={hasOverride(properties.fontSize)}
          onClear={() => updateProperty('fontSize', undefined)}
        >
          <SelectInput
            value={getValueAtBreakpoint(properties.fontSize, selectedBreakpoint)}
            options={FONT_SIZE_OPTIONS}
            onChange={(value) => updateProperty('fontSize', value)}
            placeholder="Inherit"
          />
        </PropertyRow>

        {/* Spacing Multiplier */}
        <PropertyRow
          label="Spacing"
          isOverridden={hasOverride(properties.spacing)}
          onClear={() => updateProperty('spacing', undefined)}
        >
          <SpacingInput
            value={getValueAtBreakpoint(properties.spacing, selectedBreakpoint)}
            onChange={(value) => updateProperty('spacing', value)}
          />
        </PropertyRow>
      </div>

      {/* Summary of overrides */}
      <div className="text-xs text-slate-500 p-2 bg-slate-800/30 rounded">
        <strong className="text-slate-400">Active overrides:</strong>{' '}
        {Object.entries(properties).filter(([, v]) => v && Object.keys(v).length > 0).length}{' '}
        properties
      </div>
    </div>
  );
}

export default ResponsivePropertyEditor;
