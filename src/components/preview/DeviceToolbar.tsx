'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DevicePreset, ResponsivePreviewState } from '@/hooks/useResponsivePreview';
import type { BreakpointConfig } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceToolbarProps {
  state: ResponsivePreviewState;
  devicePresets: DevicePreset[];
  breakpoints: BreakpointConfig;
  currentBreakpointName: string;
  showConsole: boolean;
  showDeviceFrame: boolean;
  onSelectDevice: (deviceId: string) => void;
  onToggleOrientation: () => void;
  onResetToDefault: () => void;
  onToggleConsole: () => void;
  onToggleDeviceFrame: () => void;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Grouped device dropdown
function DeviceSelector({
  devicePresets,
  currentDeviceId,
  onSelect,
}: {
  devicePresets: DevicePreset[];
  currentDeviceId: string | null;
  onSelect: (deviceId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group presets by category
  const grouped = devicePresets.reduce(
    (acc, preset) => {
      if (!acc[preset.category]) acc[preset.category] = [];
      acc[preset.category].push(preset);
      return acc;
    },
    {} as Record<string, DevicePreset[]>
  );

  const currentDevice = devicePresets.find((d) => d.id === currentDeviceId);
  const categoryLabels: Record<string, string> = {
    mobile: '📱 Mobile',
    tablet: '📲 Tablet',
    laptop: '💻 Laptop',
    desktop: '🖥️ Desktop',
  };
  const categoryOrder = ['mobile', 'tablet', 'laptop', 'desktop'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white transition-colors border border-zinc-700"
      >
        <span>{currentDevice?.icon || '🖥️'}</span>
        <span className="max-w-[120px] truncate">{currentDevice?.name || 'Responsive'}</span>
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
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[200] overflow-hidden">
          {categoryOrder.map((category) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-900/50">
                {categoryLabels[category]}
              </div>
              {grouped[category]?.map((device) => (
                <button
                  key={device.id}
                  onClick={() => {
                    onSelect(device.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 transition-colors flex items-center justify-between ${
                    currentDeviceId === device.id ? 'bg-blue-600/20 text-blue-300' : 'text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{device.icon}</span>
                    <span>{device.name}</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {device.width}×{device.height}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Breakpoint indicator badge
function BreakpointBadge({ breakpoint }: { breakpoint: string }) {
  const colors: Record<string, string> = {
    xs: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    sm: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    md: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    lg: 'bg-green-500/20 text-green-300 border-green-500/30',
    xl: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    '2xl': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${colors[breakpoint] || colors.lg}`}
    >
      {breakpoint}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeviceToolbar({
  state,
  devicePresets,
  currentBreakpointName,
  showConsole,
  showDeviceFrame,
  onSelectDevice,
  onToggleOrientation,
  onResetToDefault,
  onToggleConsole,
  onToggleDeviceFrame,
  className = '',
}: DeviceToolbarProps) {
  const { width, height, orientation, devicePreset } = state;
  const isMobileOrTablet =
    devicePreset && ['iphone-se', 'iphone-14', 'ipad', 'ipad-pro'].includes(devicePreset);

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 ${className}`}
    >
      {/* Left side: Device selector and controls */}
      <div className="flex items-center gap-3">
        {/* Device selector */}
        <DeviceSelector
          devicePresets={devicePresets}
          currentDeviceId={devicePreset}
          onSelect={onSelectDevice}
        />

        {/* Orientation toggle (only for mobile/tablet) */}
        {isMobileOrTablet && (
          <button
            onClick={onToggleOrientation}
            className="flex items-center justify-center w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title={`Rotate to ${orientation === 'portrait' ? 'landscape' : 'portrait'}`}
          >
            <svg
              className={`w-4 h-4 transition-transform ${orientation === 'landscape' ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-700" />

        {/* Dimensions display */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span>{width}</span>
          <span>×</span>
          <span>{height === 'auto' ? 'auto' : height}</span>
          <span className="text-zinc-600">px</span>
        </div>

        {/* Breakpoint badge */}
        <BreakpointBadge breakpoint={currentBreakpointName} />
      </div>

      {/* Right side: Toggle buttons */}
      <div className="flex items-center gap-2">
        {/* Device frame toggle */}
        <button
          onClick={onToggleDeviceFrame}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showDeviceFrame
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
              : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
          }`}
          title={showDeviceFrame ? 'Hide device frame' : 'Show device frame'}
        >
          <span>📱</span>
          <span>Frame</span>
        </button>

        {/* Console toggle */}
        <button
          onClick={onToggleConsole}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showConsole
              ? 'bg-green-600/20 text-green-300 border border-green-500/30'
              : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
          }`}
          title={showConsole ? 'Hide console' : 'Show console'}
        >
          <span>📟</span>
          <span>Console</span>
        </button>

        {/* Reset button */}
        <button
          onClick={onResetToDefault}
          className="flex items-center justify-center w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Reset to defaults"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default DeviceToolbar;
