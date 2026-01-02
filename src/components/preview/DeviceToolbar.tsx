'use client';

import React from 'react';
import type { ResponsivePreviewState } from '@/hooks/useResponsivePreview';

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceToolbarProps {
  state: ResponsivePreviewState;
  showConsole: boolean;
  onSelectDevice: (deviceId: string) => void;
  onToggleConsole: () => void;
  // Capture and Fullscreen props
  onCapture?: () => void;
  isCapturing?: boolean;
  captureSuccess?: boolean;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Device selector with Desktop/Tablet/Phone options
function DeviceToggle({
  currentDeviceId,
  onSelect,
}: {
  currentDeviceId: string | null;
  onSelect: (deviceId: string) => void;
}) {
  const devices = [
    { id: 'desktop', label: 'Desktop', icon: '🖥️', title: '1280×800' },
    { id: 'tablet', label: 'Tablet', icon: '📱', title: '820×1180' },
    { id: 'phone', label: 'Phone', icon: '📱', title: '390×844' },
  ];

  return (
    <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
      {devices.map((device) => (
        <button
          key={device.id}
          onClick={() => onSelect(device.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentDeviceId === device.id || (!currentDeviceId && device.id === 'desktop')
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
          title={`${device.label} view (${device.title})`}
        >
          <span>{device.icon}</span>
          <span className="hidden sm:inline">{device.label}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeviceToolbar({
  state,
  showConsole,
  onSelectDevice,
  onToggleConsole,
  onCapture,
  isCapturing = false,
  captureSuccess = false,
  onFullscreen,
  isFullscreen = false,
  className = '',
}: DeviceToolbarProps) {
  const { width, height, devicePreset } = state;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 ${className}`}
    >
      {/* Left side: Device toggle and dimensions */}
      <div className="flex items-center gap-3">
        {/* Desktop/Phone toggle */}
        <DeviceToggle currentDeviceId={devicePreset} onSelect={onSelectDevice} />

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-700" />

        {/* Dimensions display */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span>{width}</span>
          <span>×</span>
          <span>{height === 'auto' ? 'auto' : height}</span>
          <span className="text-zinc-600">px</span>
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Capture for AI button */}
        {onCapture && (
          <button
            onClick={onCapture}
            disabled={isCapturing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 disabled:opacity-50"
            title="Capture for AI"
          >
            {isCapturing ? (
              <span className="animate-spin">⟳</span>
            ) : captureSuccess ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span>📷</span>
            )}
            <span>{isCapturing ? 'Capturing...' : captureSuccess ? 'Captured!' : 'Capture'}</span>
          </button>
        )}

        {/* Fullscreen button */}
        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <span>{isFullscreen ? '⤓' : '⤢'}</span>
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        )}

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
      </div>
    </div>
  );
}

export default DeviceToolbar;
