"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  AppSettings, 
  SettingsSection,
  GeneralSettings,
  EditorSettings,
  AISettings,
  PreviewSettings,
  BuildSettings,
  ThemeSettings,
  KeyboardShortcut,
  AccountSettings,
} from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import { 
  loadSettings, 
  saveSettings, 
  clearSettings, 
  exportSettings, 
  importSettings,
  downloadSettings,
} from '../utils/settingsStorage';

interface SettingsContextType {
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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load settings on mount
  useEffect(() => {
    setMounted(true);
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoading(false);
  }, []);

  // Save settings whenever they change (after initial load)
  useEffect(() => {
    if (!mounted || isLoading) return;
    saveSettings(settings);
  }, [settings, mounted, isLoading]);

  // Update general settings
  const updateGeneralSettings = useCallback((updates: Partial<GeneralSettings>) => {
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, ...updates },
    }));
  }, []);

  // Update editor settings
  const updateEditorSettings = useCallback((updates: Partial<EditorSettings>) => {
    setSettings(prev => ({
      ...prev,
      editor: { ...prev.editor, ...updates },
    }));
  }, []);

  // Update AI settings
  const updateAISettings = useCallback((updates: Partial<AISettings>) => {
    setSettings(prev => ({
      ...prev,
      ai: { ...prev.ai, ...updates },
    }));
  }, []);

  // Update preview settings
  const updatePreviewSettings = useCallback((updates: Partial<PreviewSettings>) => {
    setSettings(prev => ({
      ...prev,
      preview: { ...prev.preview, ...updates },
    }));
  }, []);

  // Update build settings
  const updateBuildSettings = useCallback((updates: Partial<BuildSettings>) => {
    setSettings(prev => ({
      ...prev,
      build: { ...prev.build, ...updates },
    }));
  }, []);

  // Update appearance settings
  const updateAppearanceSettings = useCallback((updates: Partial<ThemeSettings>) => {
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, ...updates },
    }));
  }, []);

  // Update a specific keyboard shortcut
  const updateShortcut = useCallback((shortcutId: string, keys: string) => {
    setSettings(prev => ({
      ...prev,
      shortcuts: prev.shortcuts.map(s => 
        s.id === shortcutId ? { ...s, keys } : s
      ),
    }));
  }, []);

  // Update account settings
  const updateAccountSettings = useCallback((updates: Partial<AccountSettings>) => {
    setSettings(prev => ({
      ...prev,
      account: { ...prev.account, ...updates },
    }));
  }, []);

  // Reset all settings to defaults
  const resetSettings = useCallback(() => {
    const defaults = clearSettings();
    setSettings(defaults);
  }, []);

  // Reset a specific section to defaults
  const resetSection = useCallback((section: SettingsSection) => {
    setSettings(prev => {
      switch (section) {
        case 'general':
          return { ...prev, general: DEFAULT_SETTINGS.general };
        case 'editor':
          return { ...prev, editor: DEFAULT_SETTINGS.editor };
        case 'ai':
          return { ...prev, ai: DEFAULT_SETTINGS.ai };
        case 'preview':
          return { ...prev, preview: DEFAULT_SETTINGS.preview };
        case 'build':
          return { ...prev, build: DEFAULT_SETTINGS.build };
        case 'appearance':
          return { ...prev, appearance: DEFAULT_SETTINGS.appearance };
        case 'shortcuts':
          return { ...prev, shortcuts: DEFAULT_SETTINGS.shortcuts };
        case 'account':
          return { ...prev, account: DEFAULT_SETTINGS.account };
        default:
          return prev;
      }
    });
  }, []);

  // Export settings to JSON string
  const exportSettingsToJson = useCallback(() => {
    return exportSettings(settings);
  }, [settings]);

  // Import settings from JSON string
  const importSettingsFromJson = useCallback((json: string): boolean => {
    const imported = importSettings(json);
    if (imported) {
      setSettings(imported);
      return true;
    }
    return false;
  }, []);

  // Download settings as file
  const downloadSettingsFile = useCallback(() => {
    downloadSettings(settings);
  }, [settings]);

  const value = useMemo(() => ({
    settings,
    isLoading,
    updateGeneralSettings,
    updateEditorSettings,
    updateAISettings,
    updatePreviewSettings,
    updateBuildSettings,
    updateAppearanceSettings,
    updateShortcut,
    updateAccountSettings,
    resetSettings,
    resetSection,
    exportSettingsToJson,
    importSettingsFromJson,
    downloadSettingsFile,
  }), [
    settings,
    isLoading,
    updateGeneralSettings,
    updateEditorSettings,
    updateAISettings,
    updatePreviewSettings,
    updateBuildSettings,
    updateAppearanceSettings,
    updateShortcut,
    updateAccountSettings,
    resetSettings,
    resetSection,
    exportSettingsToJson,
    importSettingsFromJson,
    downloadSettingsFile,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
