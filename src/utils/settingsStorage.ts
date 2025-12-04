// Settings Storage Utilities
// Handles persistence of app settings to localStorage

import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const STORAGE_KEY = 'app-builder-settings';
const SETTINGS_VERSION = 1;

// Debounce timeout for auto-save
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 500;

/**
 * Validates that a settings object has the correct structure
 */
function isValidSettings(settings: unknown): settings is AppSettings {
  if (typeof settings !== 'object' || settings === null) return false;

  const obj = settings as Record<string, unknown>;

  // Check required top-level keys exist
  const requiredKeys = [
    'general',
    'editor',
    'ai',
    'preview',
    'build',
    'appearance',
    'shortcuts',
    'account',
  ];
  for (const key of requiredKeys) {
    if (!(key in obj)) return false;
  }

  return true;
}

/**
 * Migrate settings from older versions if needed
 */
function migrateSettings(settings: Partial<AppSettings>): AppSettings {
  const version = settings.version || 0;

  // Deep merge with defaults to ensure all fields exist
  const migrated: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
    general: { ...DEFAULT_SETTINGS.general, ...settings.general },
    editor: { ...DEFAULT_SETTINGS.editor, ...settings.editor },
    ai: { ...DEFAULT_SETTINGS.ai, ...settings.ai },
    preview: { ...DEFAULT_SETTINGS.preview, ...settings.preview },
    build: { ...DEFAULT_SETTINGS.build, ...settings.build },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...settings.appearance },
    shortcuts: settings.shortcuts || DEFAULT_SETTINGS.shortcuts,
    account: { ...DEFAULT_SETTINGS.account, ...settings.account },
    version: SETTINGS_VERSION,
    lastUpdated: new Date().toISOString(),
  };

  // Future migrations can be added here based on version
  // if (version < 2) { ... }

  return migrated;
}

/**
 * Load settings from localStorage
 */
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored);

    if (!isValidSettings(parsed)) {
      console.warn('Invalid settings format, using defaults');
      return DEFAULT_SETTINGS;
    }

    // Migrate if needed
    if (!parsed.version || parsed.version < SETTINGS_VERSION) {
      const migrated = migrateSettings(parsed);
      saveSettings(migrated); // Save migrated settings
      return migrated;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to localStorage (with debouncing)
 */
export function saveSettings(settings: AppSettings, immediate = false): void {
  if (typeof window === 'undefined') return;

  const updatedSettings: AppSettings = {
    ...settings,
    lastUpdated: new Date().toISOString(),
  };

  if (immediate) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    return;
  }

  // Debounced save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    saveTimeout = null;
  }, DEBOUNCE_DELAY);
}

/**
 * Clear all settings and reset to defaults
 */
export function clearSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear settings:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Export settings as JSON string
 */
export function exportSettings(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON string
 */
export function importSettings(jsonString: string): AppSettings | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (!isValidSettings(parsed)) {
      console.error('Invalid settings format in import');
      return null;
    }

    const migrated = migrateSettings(parsed);
    saveSettings(migrated, true);
    return migrated;
  } catch (error) {
    console.error('Failed to import settings:', error);
    return null;
  }
}

/**
 * Download settings as a JSON file
 */
export function downloadSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;

  const jsonString = exportSettings(settings);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `app-builder-settings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if a property name is safe (not a prototype pollution vector)
 */
function isSafePropertyName(name: string): boolean {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  return !dangerousKeys.includes(name);
}

/**
 * Get a specific setting value using dot notation path
 */
export function getSetting<T>(settings: AppSettings, path: string): T | undefined {
  const parts = path.split('.');

  // Guard against prototype pollution
  if (!parts.every(isSafePropertyName)) {
    console.warn('Attempted to access a potentially dangerous property path:', path);
    return undefined;
  }

  let current: Record<string, unknown> = settings as unknown as Record<string, unknown>;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    const nextValue = current[part];
    if (typeof nextValue === 'object' && nextValue !== null) {
      current = nextValue as Record<string, unknown>;
    } else if (parts.indexOf(part) === parts.length - 1) {
      return nextValue as T;
    } else {
      return undefined;
    }
  }

  return current as T;
}

/**
 * Update a specific setting value using dot notation path
 * This function only allows updates to known setting paths to prevent prototype pollution
 */
export function updateSetting<T>(settings: AppSettings, path: string, value: T): AppSettings {
  const parts = path.split('.');

  // Guard against prototype pollution - check all parts before any operations
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  for (const part of parts) {
    if (dangerousKeys.includes(part)) {
      console.warn('Attempted to set a potentially dangerous property path:', path);
      return settings;
    }
  }

  // Validate path structure (only allow known top-level keys)
  const validTopLevelKeys = [
    'general',
    'editor',
    'ai',
    'preview',
    'build',
    'appearance',
    'shortcuts',
    'account',
    'version',
    'lastUpdated',
  ];
  if (parts.length === 0 || !validTopLevelKeys.includes(parts[0])) {
    console.warn('Invalid setting path:', path);
    return settings;
  }

  // Deep clone settings to avoid mutation
  const newSettings = JSON.parse(JSON.stringify(settings)) as AppSettings;

  // Use type-safe approach based on first key
  const topKey = parts[0] as keyof AppSettings;

  if (parts.length === 1) {
    // Setting top-level value directly
    (newSettings as unknown as Record<string, unknown>)[topKey] = value;
  } else if (parts.length === 2) {
    // Setting nested value one level deep
    const section = newSettings[topKey];
    if (typeof section === 'object' && section !== null && !Array.isArray(section)) {
      (section as unknown as Record<string, unknown>)[parts[1]] = value;
    }
  }
  // For deeper nesting, we would need more specific handling
  // but current settings structure doesn't require more than 2 levels

  return newSettings;
}
