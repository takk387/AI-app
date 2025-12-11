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

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'mobile' | 'tablet' | 'laptop' | 'desktop';
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

const DEVICE_PRESETS: DevicePreset[] = [
  // Mobile devices - simplified to common sizes
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, category: 'mobile', icon: '📱' },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, category: 'mobile', icon: '📱' },

  // Tablets - simplified to common sizes
  { id: 'ipad', name: 'iPad', width: 768, height: 1024, category: 'tablet', icon: '📲' },
  { id: 'ipad-pro', name: 'iPad Pro', width: 1024, height: 1366, category: 'tablet', icon: '📲' },

  // Laptops - one common size
  { id: 'laptop', name: 'Laptop', width: 1280, height: 800, category: 'laptop', icon: '💻' },

  // Desktops - one common size
  {
    id: 'desktop-hd',
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    category: 'desktop',
    icon: '🖥️',
  },
];

const DEFAULT_STATE: ResponsivePreviewState = {
  width: 1280,
  height: 800,
  orientation: 'portrait',
  activeBreakpoint: null,
  devicePreset: 'laptop',
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

  // Toggle orientation
  const toggleOrientation = useCallback(() => {
    setState((prev) => {
      const newOrientation = prev.orientation === 'portrait' ? 'landscape' : 'portrait';
      // Swap width and height if a device preset is selected
      if (prev.devicePreset) {
        return {
          ...prev,
          orientation: newOrientation,
          width: prev.height === 'auto' ? prev.width : (prev.height as number),
          height: prev.height === 'auto' ? 'auto' : prev.width,
        };
      }
      return { ...prev, orientation: newOrientation };
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

  // Select device preset
  const selectDevicePreset = useCallback((deviceId: string) => {
    const device = DEVICE_PRESETS.find((d) => d.id === deviceId);
    if (device) {
      setState((prev) => ({
        ...prev,
        width: prev.orientation === 'landscape' ? device.height : device.width,
        height: prev.orientation === 'landscape' ? device.width : device.height,
        devicePreset: deviceId,
        activeBreakpoint: null,
      }));
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

  // Compute current breakpoint name
  const currentBreakpointName = useMemo(() => {
    const { width } = state;
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    if (width < breakpoints['2xl']) return 'xl';
    return '2xl';
  }, [state.width, breakpoints]);

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
