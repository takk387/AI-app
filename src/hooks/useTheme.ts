'use client';

import { useThemeContext, type Theme, type ResolvedTheme } from '@/contexts/ThemeContext';

export interface UseTheme {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Custom hook for accessing and controlling the application theme.
 *
 * @returns {UseTheme} Object containing:
 *   - theme: Current theme setting ('light', 'dark', or 'system')
 *   - resolvedTheme: Actual applied theme ('light' or 'dark')
 *   - setTheme: Function to set the theme
 *   - toggleTheme: Function to toggle between light and dark
 *
 * @example
 * ```tsx
 * const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 *
 * // Toggle between light and dark
 * toggleTheme();
 *
 * // Set specific theme
 * setTheme('dark');
 * setTheme('light');
 * setTheme('system'); // Use system preference
 * ```
 */
export function useTheme(): UseTheme {
  return useThemeContext();
}

export default useTheme;
