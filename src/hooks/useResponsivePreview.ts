'use client';

/**
 * useResponsivePreview Hook
 *
 * Manages responsive preview state including breakpoint selection,
 * custom width control, and device presets.
 */

import { useState, useCallback, useMemo } from 'react';
import type { BreakpointConfig } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type DeviceId = 'desktop' | 'tablet' | 'phone';

export interface DevicePreset {
  id: DeviceId;
  name: string;
  width: number;
  height: number;
  category: 'mobile' | 'tablet' | 'desktop';
  icon: string;
}

export interface ResponsivePreviewState {
  width: number;
  height: number | 'auto';
  orientation: 'portrait' | 'landscape';
  activeBreakpoint: string | null;
  devicePreset: string | null;
}

export interface UseResponsivePreviewReturn {
  // State
  state: ResponsivePreviewState;
  breakpoints: BreakpointConfig;

  // Actions
  setWidth: (width: number) => void;
  setHeight: (height: number | 'auto') => void;
  toggleOrientation: () => void;
  selectBreakpoint: (breakpointId: string) => void;
  selectDevicePreset: (deviceId: string) => void;
  setCustomBreakpoints: (breakpoints: Partial<BreakpointConfig>) => void;
  resetToDefault: () => void;

  // Computed
  currentBreakpointName: string;
  devicePresets: DevicePreset[];
  isAtBreakpoint: (breakpointId: keyof BreakpointConfig) => boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Three device views: Desktop, Tablet, and Phone
// Apps auto-adjust to actual screen sizes when deployed
const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'desktop', name: 'Desktop', width: 1280, height: 800, category: 'desktop', icon: '🖥️' },
  { id: 'tablet', name: 'Tablet', width: 820, height: 1180, category: 'tablet', icon: '📱' },
  { id: 'phone', name: 'Phone', width: 390, height: 844, category: 'mobile', icon: '📱' },
];

const DEFAULT_STATE: ResponsivePreviewState = {
  width: 1280,
  height: 800,
  orientation: 'landscape', // Desktop is always landscape
  activeBreakpoint: null,
  devicePreset: 'desktop',
};

// ============================================================================
// HOOK
// ============================================================================

export function useResponsivePreview(
  initialBreakpoints?: Partial<BreakpointConfig>
): UseResponsivePreviewReturn {
  const [state, setState] = useState<ResponsivePreviewState>(DEFAULT_STATE);
  const [breakpoints, setBreakpoints] = useState<BreakpointConfig>({
    ...DEFAULT_BREAKPOINTS,
    ...initialBreakpoints,
  });

  // Set width
  const setWidth = useCallback((width: number) => {
    setState((prev) => ({
      ...prev,
      width,
      devicePreset: null, // Clear preset when manually setting width
      activeBreakpoint: null,
    }));
  }, []);

  // Set height
  const setHeight = useCallback((height: number | 'auto') => {
    setState((prev) => ({
      ...prev,
      height,
    }));
  }, []);

  // Cycle through Desktop -> Tablet -> Phone views
  const toggleOrientation = useCallback(() => {
    setState((prev) => {
      // Cycle: desktop -> tablet -> phone -> desktop
      let newDevice: DeviceId;
      switch (prev.devicePreset) {
        case 'desktop':
          newDevice = 'tablet';
          break;
        case 'tablet':
          newDevice = 'phone';
          break;
        default:
          newDevice = 'desktop';
      }
      const device = DEVICE_PRESETS.find((d) => d.id === newDevice);
      if (device) {
        return {
          width: device.width,
          height: device.height,
          orientation: device.category === 'desktop' ? 'landscape' : 'portrait',
          devicePreset: newDevice,
          activeBreakpoint: null,
        };
      }
      return prev;
    });
  }, []);

  // Select breakpoint
  const selectBreakpoint = useCallback(
    (breakpointId: string) => {
      const width = breakpoints[breakpointId as keyof BreakpointConfig];
      if (width) {
        setState((prev) => ({
          ...prev,
          width,
          activeBreakpoint: breakpointId,
          devicePreset: null,
        }));
      }
    },
    [breakpoints]
  );

  // Select device preset - Desktop or Phone with fixed dimensions
  const selectDevicePreset = useCallback((deviceId: string) => {
    const device = DEVICE_PRESETS.find((d) => d.id === deviceId);
    if (device) {
      setState({
        width: device.width,
        height: device.height,
        // Desktop is landscape, Phone is portrait
        orientation: device.category === 'desktop' ? 'landscape' : 'portrait',
        devicePreset: deviceId,
        activeBreakpoint: null,
      });
    }
  }, []);

  // Set custom breakpoints
  const setCustomBreakpoints = useCallback((newBreakpoints: Partial<BreakpointConfig>) => {
    setBreakpoints((prev) => ({
      ...prev,
      ...newBreakpoints,
    }));
  }, []);

  // Reset to default
  const resetToDefault = useCallback(() => {
    setState(DEFAULT_STATE);
    setBreakpoints(DEFAULT_BREAKPOINTS);
  }, []);

  // Compute current breakpoint name based on width
  const { width: currentWidth } = state;
  const currentBreakpointName = useMemo(() => {
    if (currentWidth < breakpoints.sm) return 'xs';
    if (currentWidth < breakpoints.md) return 'sm';
    if (currentWidth < breakpoints.lg) return 'md';
    if (currentWidth < breakpoints.xl) return 'lg';
    if (currentWidth < breakpoints['2xl']) return 'xl';
    return '2xl';
  }, [currentWidth, breakpoints]);

  // Check if at a specific breakpoint
  const isAtBreakpoint = useCallback(
    (breakpointId: keyof BreakpointConfig): boolean => {
      const breakpointWidth = breakpoints[breakpointId];
      return state.width >= breakpointWidth;
    },
    [state.width, breakpoints]
  );

  return {
    state,
    breakpoints,
    setWidth,
    setHeight,
    toggleOrientation,
    selectBreakpoint,
    selectDevicePreset,
    setCustomBreakpoints,
    resetToDefault,
    currentBreakpointName,
    devicePresets: DEVICE_PRESETS,
    isAtBreakpoint,
  };
}

export default useResponsivePreview;

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { DEFAULT_BREAKPOINTS, DEVICE_PRESETS };
