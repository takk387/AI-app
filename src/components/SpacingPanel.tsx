'use client';

/**
 * Spacing Panel Component
 *
 * Provides visual spacing controls for the Layout Builder:
 * - Density selector
 * - Container width
 * - Section padding
 * - Component gap
 * - Visual box model diagram
 * - Grid overlay toggle
 */

import React from 'react';
import type { SpacingSettings } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

interface SpacingPanelProps {
  spacing: Partial<SpacingSettings>;
  onChange: (spacing: Partial<SpacingSettings>) => void;
  showGridOverlay?: boolean;
  onGridOverlayToggle?: (show: boolean) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', description: 'Tight spacing, dense layouts' },
  { value: 'normal', label: 'Normal', description: 'Balanced spacing' },
  { value: 'relaxed', label: 'Relaxed', description: 'Generous whitespace' },
] as const;

const CONTAINER_WIDTH_OPTIONS = [
  { value: 'narrow', label: 'Narrow', pixels: '768px' },
  { value: 'standard', label: 'Standard', pixels: '1024px' },
  { value: 'wide', label: 'Wide', pixels: '1280px' },
  { value: 'full', label: 'Full', pixels: '100%' },
] as const;

const SECTION_PADDING_OPTIONS = [
  { value: 'sm', label: 'S', pixels: '24px' },
  { value: 'md', label: 'M', pixels: '48px' },
  { value: 'lg', label: 'L', pixels: '64px' },
  { value: 'xl', label: 'XL', pixels: '96px' },
] as const;

const COMPONENT_GAP_OPTIONS = [
  { value: 'sm', label: 'Small', pixels: '8px' },
  { value: 'md', label: 'Medium', pixels: '16px' },
  { value: 'lg', label: 'Large', pixels: '24px' },
] as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

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
  options: readonly { value: T; label: string; pixels?: string; description?: string }[];
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
            title={option.description || option.pixels}
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
      {value && (
        <div className="text-xs text-slate-500 mt-1">
          {options.find((o) => o.value === value)?.pixels ||
            options.find((o) => o.value === value)?.description}
        </div>
      )}
    </div>
  );
}

/**
 * Visual Box Model Diagram
 */
function BoxModelDiagram({ spacing }: { spacing: Partial<SpacingSettings> }) {
  // Map values to visual sizes
  const getSectionPaddingSize = (): number => {
    switch (spacing.sectionPadding) {
      case 'sm':
        return 12;
      case 'md':
        return 20;
      case 'lg':
        return 28;
      case 'xl':
        return 36;
      default:
        return 20;
    }
  };

  const getComponentGapSize = (): number => {
    switch (spacing.componentGap) {
      case 'sm':
        return 4;
      case 'md':
        return 8;
      case 'lg':
        return 12;
      default:
        return 8;
    }
  };

  const getContainerScale = (): number => {
    switch (spacing.containerWidth) {
      case 'narrow':
        return 0.6;
      case 'standard':
        return 0.75;
      case 'wide':
        return 0.9;
      case 'full':
        return 1;
      default:
        return 0.75;
    }
  };

  const sectionPadding = getSectionPaddingSize();
  const componentGap = getComponentGapSize();
  const containerScale = getContainerScale();

  return (
    <div className="mt-4">
      <div className="text-xs text-slate-500 mb-2">Visual Preview</div>
      <div className="bg-slate-900 rounded-lg p-4 relative overflow-hidden">
        {/* Page background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />

        {/* Section padding indicator */}
        <div
          className="relative border-2 border-dashed border-purple-500/30 rounded-lg transition-all"
          style={{ padding: `${sectionPadding}px` }}
        >
          {/* Section padding label */}
          <div className="absolute -top-0.5 left-2 px-1 bg-slate-900 text-[10px] text-purple-400">
            section: {spacing.sectionPadding || 'md'}
          </div>

          {/* Container width indicator */}
          <div
            className="mx-auto border-2 border-dashed border-blue-500/30 rounded transition-all"
            style={{
              width: `${containerScale * 100}%`,
              padding: `${componentGap + 8}px`,
            }}
          >
            {/* Container width label */}
            <div className="absolute top-4 right-2 px-1 bg-slate-900 text-[10px] text-blue-400">
              container: {spacing.containerWidth || 'standard'}
            </div>

            {/* Content with component gap */}
            <div className="space-y-1" style={{ gap: `${componentGap}px` }}>
              {/* Mock content blocks */}
              <div className="h-3 bg-slate-700 rounded w-1/3" />
              <div className="h-6 bg-slate-700 rounded w-2/3" />

              {/* Component gap indicator */}
              <div className="relative py-1">
                <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-green-500/50" />
                <div className="absolute left-1/2 -translate-x-1/2 px-1 bg-slate-900 text-[10px] text-green-400">
                  gap: {spacing.componentGap || 'md'}
                </div>
              </div>

              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-4/5" />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-purple-500/50" />
            <span className="text-purple-400">Section</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500/50" />
            <span className="text-blue-400">Container</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500/50" />
            <span className="text-green-400">Gap</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid Overlay Toggle Button
 */
function GridOverlayToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`w-full mt-4 px-3 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${
        enabled ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 9h16M4 15h16M9 4v16M15 4v16"
        />
      </svg>
      <span className="text-xs font-medium">
        {enabled ? 'Hide Grid Overlay' : 'Show Grid Overlay'}
      </span>
      <kbd className="ml-auto px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">G</kbd>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpacingPanel({
  spacing,
  onChange,
  showGridOverlay = false,
  onGridOverlayToggle,
}: SpacingPanelProps) {
  const handleChange = <K extends keyof SpacingSettings>(key: K, value: SpacingSettings[K]) => {
    onChange({ ...spacing, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Density */}
      <SegmentedControl
        label="Density"
        value={spacing.density}
        options={DENSITY_OPTIONS}
        onChange={(v) => handleChange('density', v)}
      />

      {/* Container Width */}
      <SegmentedControl
        label="Container Width"
        value={spacing.containerWidth}
        options={CONTAINER_WIDTH_OPTIONS}
        onChange={(v) => handleChange('containerWidth', v)}
      />

      {/* Section Padding */}
      <SegmentedControl
        label="Section Padding"
        value={spacing.sectionPadding}
        options={SECTION_PADDING_OPTIONS}
        onChange={(v) => handleChange('sectionPadding', v)}
      />

      {/* Component Gap */}
      <SegmentedControl
        label="Component Gap"
        value={spacing.componentGap}
        options={COMPONENT_GAP_OPTIONS}
        onChange={(v) => handleChange('componentGap', v)}
      />

      {/* Box Model Diagram */}
      <BoxModelDiagram spacing={spacing} />

      {/* Grid Overlay Toggle */}
      {onGridOverlayToggle && (
        <GridOverlayToggle enabled={showGridOverlay} onToggle={onGridOverlayToggle} />
      )}
    </div>
  );
}

export default SpacingPanel;
