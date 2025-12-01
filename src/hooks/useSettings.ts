"use client";

import { useSettingsContext } from '@/contexts/SettingsContext';
import type { 
  AppSettings, 
  SettingsSection,
  GeneralSettings,
  EditorSettings,
  AISettings,
  PreviewSettings,
  BuildSettings,
  ThemeSettings,
  AccountSettings,
} from '@/types/settings';

export interface UseSettings {
  settings: AppSettings;
  isLoading: boolean;
  
  // Update functions
  updateGeneralSettings: (updates: Partial<GeneralSettings>) => void;
  updateEditorSettings: (updates: Partial<EditorSettings>) => void;
  updateAISettings: (updates: Partial<AISettings>) => void;
  updatePreviewSettings: (updates: Partial<PreviewSettings>) => void;
  updateBuildSettings: (updates: Partial<BuildSettings>) => void;
  updateAppearanceSettings: (updates: Partial<ThemeSettings>) => void;
  updateShortcut: (shortcutId: string, keys: string) => void;
  updateAccountSettings: (updates: Partial<AccountSettings>) => void;
  
  // Bulk operations
  resetSettings: () => void;
  resetSection: (section: SettingsSection) => void;
  exportSettingsToJson: () => string;
  importSettingsFromJson: (json: string) => boolean;
  downloadSettingsFile: () => void;
}

/**
 * Custom hook for accessing and controlling application settings.
 * 
 * @returns {UseSettings} Object containing:
 *   - settings: Current app settings
 *   - isLoading: Whether settings are being loaded
 *   - updateGeneralSettings: Function to update general settings
 *   - updateEditorSettings: Function to update editor settings
 *   - updateAISettings: Function to update AI settings
 *   - updatePreviewSettings: Function to update preview settings
 *   - updateBuildSettings: Function to update build settings
 *   - updateAppearanceSettings: Function to update appearance settings
 *   - updateShortcut: Function to update a keyboard shortcut
 *   - updateAccountSettings: Function to update account settings
 *   - resetSettings: Function to reset all settings to defaults
 *   - resetSection: Function to reset a specific section to defaults
 *   - exportSettingsToJson: Function to export settings as JSON
 *   - importSettingsFromJson: Function to import settings from JSON
 *   - downloadSettingsFile: Function to download settings as a file
 * 
 * @example
 * ```tsx
 * const { settings, updateEditorSettings, resetSettings } = useSettings();
 * 
 * // Update editor font size
 * updateEditorSettings({ fontSize: 16 });
 * 
 * // Reset all settings
 * resetSettings();
 * ```
 */
export function useSettings(): UseSettings {
  return useSettingsContext();
}

export default useSettings;
