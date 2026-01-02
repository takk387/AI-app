'use client';

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

// Desktop, Tablet, and Phone views
export type DeviceType = 'desktop' | 'tablet' | 'phone' | 'none';

export interface DeviceFrameProps {
  device: DeviceType;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number | 'auto';
  children: React.ReactNode;
  className?: string;
}

// ============================================================================
// DEVICE FRAME CONFIGURATIONS
// ============================================================================

interface DeviceFrameConfig {
  bezelWidth: number;
  bezelRadius: number;
  screenRadius: number;
  hasNotch: boolean;
  notchWidth: number;
  notchHeight: number;
  hasDynamicIsland: boolean;
  hasHomeButton: boolean;
  hasPunchHole: boolean;
  punchHolePosition: 'center' | 'left';
  frameColor: string;
  buttonColor: string;
  hasCamera: boolean;
  cameraPosition: 'top' | 'top-left';
}

// Device configurations: Phone and Tablet have frames, desktop shows raw preview
const DEVICE_CONFIGS: Record<string, DeviceFrameConfig> = {
  // Phone - Modern notch style (like iPhone 14)
  phone: {
    bezelWidth: 12,
    bezelRadius: 48,
    screenRadius: 40,
    hasNotch: true,
    notchWidth: 120,
    notchHeight: 34,
    hasDynamicIsland: false,
    hasHomeButton: false,
    hasPunchHole: false,
    punchHolePosition: 'center',
    frameColor: '#1a1a1a',
    buttonColor: '#2a2a2a',
    hasCamera: false,
    cameraPosition: 'top',
  },
  // Tablet - iPad-style with minimal bezels
  tablet: {
    bezelWidth: 16,
    bezelRadius: 28,
    screenRadius: 20,
    hasNotch: false,
    notchWidth: 0,
    notchHeight: 0,
    hasDynamicIsland: false,
    hasHomeButton: false,
    hasPunchHole: false,
    punchHolePosition: 'center',
    frameColor: '#1a1a1a',
    buttonColor: '#2a2a2a',
    hasCamera: true,
    cameraPosition: 'top',
  },
};

// Default config for laptops/desktops (no frame)
const DEFAULT_CONFIG: DeviceFrameConfig = {
  bezelWidth: 0,
  bezelRadius: 8,
  screenRadius: 8,
  hasNotch: false,
  notchWidth: 0,
  notchHeight: 0,
  hasDynamicIsland: false,
  hasHomeButton: false,
  hasPunchHole: false,
  punchHolePosition: 'center',
  frameColor: 'transparent',
  buttonColor: 'transparent',
  hasCamera: false,
  cameraPosition: 'top',
};

// ============================================================================
// SVG COMPONENTS (Memoized to prevent unnecessary re-renders)
// ============================================================================

// iPhone Notch SVG
const IPhoneNotch = React.memo(function IPhoneNotch({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
    >
      <path
        d={`
          M 0 0
          L ${width * 0.15} 0
          Q ${width * 0.18} 0, ${width * 0.2} ${height * 0.3}
          Q ${width * 0.22} ${height}, ${width * 0.28} ${height}
          L ${width * 0.72} ${height}
          Q ${width * 0.78} ${height}, ${width * 0.8} ${height * 0.3}
          Q ${width * 0.82} 0, ${width * 0.85} 0
          L ${width} 0
          L ${width} ${height}
          L 0 ${height}
          Z
        `}
        fill="#000"
      />
      {/* Speaker grille */}
      <rect
        x={width * 0.38}
        y={height * 0.4}
        width={width * 0.24}
        height={4}
        rx={2}
        fill="#1a1a1a"
      />
      {/* Camera */}
      <circle cx={width * 0.32} cy={height * 0.5} r={4} fill="#0a0a1a" />
    </svg>
  );
});

// Side Buttons (power, volume)
const SideButtons = React.memo(function SideButtons({
  height,
  side,
}: {
  height: number;
  side: 'left' | 'right';
}) {
  return (
    <div
      className={`absolute top-1/4 ${side === 'left' ? '-left-1' : '-right-1'} flex flex-col gap-4`}
    >
      {/* Power button */}
      <div
        className="bg-zinc-600 rounded-sm"
        style={{ width: 3, height: Math.min(height * 0.06, 40) }}
      />
      {side === 'left' && (
        <>
          {/* Volume up */}
          <div
            className="bg-zinc-600 rounded-sm"
            style={{ width: 3, height: Math.min(height * 0.08, 50) }}
          />
          {/* Volume down */}
          <div
            className="bg-zinc-600 rounded-sm"
            style={{ width: 3, height: Math.min(height * 0.08, 50) }}
          />
        </>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeviceFrame({
  device,
  orientation: _orientation, // Orientation is implicit: desktop=landscape, phone/tablet=portrait
  width,
  height,
  children,
  className = '',
}: DeviceFrameProps) {
  // Phone and tablet show a device frame, desktop shows raw preview
  const hasFrame = device === 'phone' || device === 'tablet';
  const config = hasFrame ? DEVICE_CONFIGS[device] || DEFAULT_CONFIG : DEFAULT_CONFIG;

  // Use provided dimensions directly - no swapping needed
  // Desktop: 1280x800 (landscape), Tablet: 820x1180 (portrait), Phone: 390x844 (portrait)
  const displayWidth = width;
  const displayHeight = height === 'auto' ? 800 : height;
  const frameWidth = displayWidth + (hasFrame ? config.bezelWidth * 2 : 0);
  const frameHeight = displayHeight + (hasFrame ? config.bezelWidth * 2 : 0);

  // Desktop/none view - no frame, just render content
  if (!hasFrame) {
    return (
      <div
        className={`relative bg-zinc-900 rounded-lg shadow-2xl ${className}`}
        style={{
          width: displayWidth,
          height: displayHeight,
          maxWidth: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          isolation: 'isolate',
        }}
      >
        <div className="w-full h-full overflow-hidden" style={{ position: 'relative' }}>
          {children}
        </div>
      </div>
    );
  }

  // Phone/Tablet view - show device frame
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: frameWidth,
        height: frameHeight,
      }}
    >
      {/* Device frame */}
      <div
        className="relative shadow-2xl"
        style={{
          width: frameWidth,
          height: frameHeight,
          backgroundColor: config.frameColor,
          borderRadius: config.bezelRadius,
          padding: config.bezelWidth,
        }}
      >
        {/* Side buttons - only for phone */}
        {device === 'phone' && (
          <>
            <SideButtons height={frameHeight} side="left" />
            <SideButtons height={frameHeight} side="right" />
          </>
        )}

        {/* Screen area */}
        <div
          className="relative bg-black overflow-hidden"
          style={{
            width: displayWidth,
            height: displayHeight,
            borderRadius: config.screenRadius,
          }}
        >
          {/* Notch - only for phone */}
          {config.hasNotch && <IPhoneNotch width={config.notchWidth} height={config.notchHeight} />}

          {/* Camera indicator for tablet */}
          {device === 'tablet' && config.hasCamera && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
            </div>
          )}

          {/* Content */}
          <div className="w-full h-full overflow-hidden">{children}</div>
        </div>
      </div>

      {/* Device shadow/reflection */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          borderRadius: config.bezelRadius,
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.1) inset,
            0 25px 50px -12px rgba(0,0,0,0.5),
            0 0 100px rgba(0,0,0,0.3)
          `,
        }}
      />
    </div>
  );
}

export default DeviceFrame;
