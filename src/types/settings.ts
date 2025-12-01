// Settings Type Definitions
// Comprehensive types for app builder settings

export type Theme = 'light' | 'dark' | 'system';
export type UITheme = 'light' | 'dark' | 'system';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';
export type PreviewSize = 'mobile' | 'tablet' | 'desktop';
export type EditorTheme = 'vs-dark' | 'vs-light' | 'monokai' | 'github-dark' | 'github-light';
export type TabSize = 2 | 4;

// General Settings
export interface GeneralSettings {
  appName: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

// Editor Settings
export interface EditorSettings {
  theme: EditorTheme;
  fontSize: number;
  fontFamily: string;
  tabSize: TabSize;
  lineWrapping: boolean;
  minimap: boolean;
  autoSaveInterval: number; // in seconds, 0 = disabled
}

// AI Settings
export interface AISettings {
  defaultModel: string;
  temperature: number; // 0.0 - 2.0
  maxTokens: number;
  systemPrompt: string;
  responseFormat: 'markdown' | 'plain' | 'code';
}

// Preview Settings
export interface PreviewSettings {
  defaultSize: PreviewSize;
  autoRefresh: boolean;
  backgroundColor: string;
  showGrid: boolean;
  showConsole: boolean;
}

// Build Settings
export interface BuildSettings {
  autoValidation: boolean;
  optimizationLevel: 'none' | 'basic' | 'advanced';
  generateSourceMaps: boolean;
  minify: boolean;
}

// Theme/Appearance Settings
export interface ThemeSettings {
  theme: UITheme;
  accentColor: string;
  uiDensity: UIDensity;
}

// Keyboard Shortcut
export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string;
  category: 'general' | 'editor' | 'preview' | 'navigation';
}

// Account Settings
export interface AccountSettings {
  apiKeyConfigured: boolean;
  showUsageStats: boolean;
}

// Complete Settings object
export interface AppSettings {
  general: GeneralSettings;
  editor: EditorSettings;
  ai: AISettings;
  preview: PreviewSettings;
  build: BuildSettings;
  appearance: ThemeSettings;
  shortcuts: KeyboardShortcut[];
  account: AccountSettings;
  version: number;
  lastUpdated: string;
}

// Settings section IDs
export type SettingsSection = 
  | 'general'
  | 'editor'
  | 'ai'
  | 'preview'
  | 'build'
  | 'appearance'
  | 'shortcuts'
  | 'storage'
  | 'account';

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    appName: 'AI App Builder',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  editor: {
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'Fira Code, monospace',
    tabSize: 2,
    lineWrapping: true,
    minimap: true,
    autoSaveInterval: 30,
  },
  ai: {
    defaultModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
    responseFormat: 'markdown',
  },
  preview: {
    defaultSize: 'desktop',
    autoRefresh: true,
    backgroundColor: '#1a1a2e',
    showGrid: false,
    showConsole: true,
  },
  build: {
    autoValidation: true,
    optimizationLevel: 'basic',
    generateSourceMaps: true,
    minify: true,
  },
  appearance: {
    theme: 'system',
    accentColor: '#3B82F6',
    uiDensity: 'comfortable',
  },
  shortcuts: [
    { id: 'save', name: 'Save', description: 'Save current changes', keys: 'Ctrl+S', category: 'general' },
    { id: 'undo', name: 'Undo', description: 'Undo last action', keys: 'Ctrl+Z', category: 'general' },
    { id: 'redo', name: 'Redo', description: 'Redo last undone action', keys: 'Ctrl+Shift+Z', category: 'general' },
    { id: 'preview', name: 'Toggle Preview', description: 'Show/hide preview panel', keys: 'Ctrl+P', category: 'preview' },
    { id: 'code', name: 'Toggle Code', description: 'Show/hide code panel', keys: 'Ctrl+E', category: 'editor' },
    { id: 'search', name: 'Search', description: 'Open search dialog', keys: 'Ctrl+K', category: 'navigation' },
    { id: 'settings', name: 'Settings', description: 'Open settings', keys: 'Ctrl+,', category: 'navigation' },
  ],
  account: {
    apiKeyConfigured: false,
    showUsageStats: true,
  },
  version: 1,
  lastUpdated: new Date().toISOString(),
};

// Settings page props
export interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
}
