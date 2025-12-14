'use client';

import React from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type DeviceType =
  | 'iphone-se'
  | 'iphone-14'
  | 'ipad'
  | 'ipad-pro'
  | 'laptop'
  | 'desktop-hd'
  | 'none';

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

const DEVICE_CONFIGS: Record<string, DeviceFrameConfig> = {
  // iPhone SE - Home button style
  'iphone-se': {
    bezelWidth: 16,
    bezelRadius: 40,
    screenRadius: 0,
    hasNotch: false,
    notchWidth: 0,
    notchHeight: 0,
    hasDynamicIsland: false,
    hasHomeButton: true,
    hasPunchHole: false,
    punchHolePosition: 'center',
    frameColor: '#1a1a1a',
    buttonColor: '#2a2a2a',
    hasCamera: true,
    cameraPosition: 'top',
  },
  // iPhone 14 - Notch style
  'iphone-14': {
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
  // iPad (standard)
  ipad: {
    bezelWidth: 20,
    bezelRadius: 36,
    screenRadius: 20,
    hasNotch: false,
    notchWidth: 0,
    notchHeight: 0,
    hasDynamicIsland: false,
    hasHomeButton: false,
    hasPunchHole: false,
    punchHolePosition: 'center',
    frameColor: '#2a2a2a',
    buttonColor: '#3a3a3a',
    hasCamera: true,
    cameraPosition: 'top',
  },
  // iPad Pro
  'ipad-pro': {
    bezelWidth: 18,
    bezelRadius: 40,
    screenRadius: 24,
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

// Dynamic Island SVG
const DynamicIsland = React.memo(function DynamicIsland() {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
      <div
        className="bg-black rounded-full flex items-center justify-center"
        style={{ width: 120, height: 36 }}
      >
        <div className="w-3 h-3 rounded-full bg-zinc-900 mr-8" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
      </div>
    </div>
  );
});

// Punch Hole Camera
const PunchHole = React.memo(function PunchHole({ position }: { position: 'center' | 'left' }) {
  return (
    <div
      className={`absolute top-3 z-10 ${position === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-6'}`}
    >
      <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner" />
    </div>
  );
});

// Home Button (iPhone SE style)
const HomeButton = React.memo(function HomeButton() {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
      <div
        className="rounded-full border-2 border-zinc-600 bg-zinc-800"
        style={{ width: 48, height: 48 }}
      />
    </div>
  );
});

// Front Camera (for tablets)
const FrontCamera = React.memo(function FrontCamera({
  position,
}: {
  position: 'top' | 'top-left';
}) {
  return (
    <div
      className={`absolute top-2 z-10 ${position === 'top' ? 'left-1/2 -translate-x-1/2' : 'left-4'}`}
    >
      <div className="w-2 h-2 rounded-full bg-zinc-700" />
    </div>
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
  orientation,
  width,
  height,
  children,
  className = '',
}: DeviceFrameProps) {
  // Get device configuration
  const config = DEVICE_CONFIGS[device] || DEFAULT_CONFIG;
  const isMobile = ['iphone-se', 'iphone-14'].includes(device);
  const isTablet = ['ipad', 'ipad-pro'].includes(device);
  const showFrame = isMobile || isTablet;
  const isLandscape = orientation === 'landscape';

  // Calculate dimensions - swap width/height for landscape orientation
  const displayWidth = isLandscape && showFrame ? (height === 'auto' ? 600 : height) : width;
  const displayHeight = isLandscape && showFrame ? width : height === 'auto' ? 600 : height;
  const actualHeight = height === 'auto' ? 600 : height;
  const frameWidth = displayWidth + (showFrame ? config.bezelWidth * 2 : 0);
  const frameHeight =
    displayHeight +
    (showFrame ? config.bezelWidth * 2 : 0) +
    (config.hasHomeButton && !isLandscape ? 60 : 0);

  // If no device frame needed (desktop/laptop), just render children with a simple border
  if (!showFrame || device === 'none') {
    return (
      <div
        className={`relative bg-zinc-900 rounded-lg overflow-hidden shadow-2xl ${className}`}
        style={{
          width: width,
          height: height === 'auto' ? 'auto' : actualHeight,
        }}
      >
        {children}
      </div>
    );
  }

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
          paddingBottom: config.hasHomeButton ? config.bezelWidth + 60 : config.bezelWidth,
        }}
      >
        {/* Side buttons for mobile devices */}
        {/* Side buttons - hide in landscape for simplicity */}
        {isMobile && !isLandscape && (
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
          {/* Notch - only show in portrait */}
          {config.hasNotch && !isLandscape && (
            <IPhoneNotch width={config.notchWidth} height={config.notchHeight} />
          )}

          {/* Dynamic Island - only show in portrait */}
          {config.hasDynamicIsland && !isLandscape && <DynamicIsland />}

          {/* Punch Hole Camera - only show in portrait */}
          {config.hasPunchHole && !isLandscape && <PunchHole position={config.punchHolePosition} />}

          {/* Front Camera for tablets - only show in portrait */}
          {config.hasCamera && isTablet && !isLandscape && (
            <FrontCamera position={config.cameraPosition} />
          )}

          {/* Content */}
          <div className="w-full h-full overflow-hidden">{children}</div>
        </div>

        {/* Home Button - only show in portrait */}
        {config.hasHomeButton && !isLandscape && <HomeButton />}
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
