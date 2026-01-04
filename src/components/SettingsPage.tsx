'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import type {
  SettingsSection,
  SettingsPageProps,
  EditorTheme,
  PreviewSize,
  UIDensity,
} from '@/types/settings';

// Form UI Components (extracted)
import {
  ToggleSwitch,
  Slider,
  Select,
  TextInput,
  TextArea,
  ColorPicker,
  SectionHeader,
} from './ui/form';

// Section navigation items
const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'preview', label: 'Preview', icon: '👁️' },
  { id: 'build', label: 'Build', icon: '🔨' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
  { id: 'storage', label: 'Storage & Data', icon: '💾' },
  { id: 'account', label: 'Account', icon: '👤' },
];

// Settings Page Component
export function SettingsPage({ isOpen, onClose, initialSection = 'general' }: SettingsPageProps) {
  const {
    settings,
    updateGeneralSettings,
    updateEditorSettings,
    updateAISettings,
    updatePreviewSettings,
    updateBuildSettings,
    updateAppearanceSettings,
    updateAccountSettings,
    resetSettings,
    resetSection,
    importSettingsFromJson,
    downloadSettingsFile,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { user, signOut } = useAuth();

  // Update active section when initialSection prop changes
  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle import file
  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const success = importSettingsFromJson(content);
        if (!success) {
          setImportError('Failed to import settings. Invalid format.');
          setTimeout(() => setImportError(null), 3000);
        }
      };
      reader.onerror = () => {
        setImportError('Failed to read file.');
        setTimeout(() => setImportError(null), 3000);
      };
      reader.readAsText(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [importSettingsFromJson]
  );

  // Filter sections based on search
  const filteredSections = searchQuery
    ? SECTIONS.filter((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : SECTIONS;

  if (!isOpen) return null;

  // Render section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div>
            <SectionHeader title="General Settings" description="Configure basic app preferences" />
            <TextInput
              value={settings.general.appName}
              onChange={(value) => updateGeneralSettings({ appName: value })}
              label="App Name"
              description="Customize the app branding name"
              placeholder="AI App Builder"
            />
            <Select
              value={settings.general.language}
              onChange={(value) => updateGeneralSettings({ language: value })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
                { value: 'ja', label: 'Japanese' },
                { value: 'zh', label: 'Chinese' },
              ]}
              label="Language"
              description="Select your preferred language"
            />
          </div>
        );

      case 'editor':
        return (
          <div>
            <SectionHeader
              title="Editor Settings"
              description="Customize your code editing experience"
            />
            <Select<EditorTheme>
              value={settings.editor.theme}
              onChange={(value) => updateEditorSettings({ theme: value })}
              options={[
                { value: 'vs-dark', label: 'VS Code Dark' },
                { value: 'vs-light', label: 'VS Code Light' },
                { value: 'monokai', label: 'Monokai' },
                { value: 'github-dark', label: 'GitHub Dark' },
                { value: 'github-light', label: 'GitHub Light' },
              ]}
              label="Editor Theme"
              description="Choose your preferred code theme"
            />
            <Slider
              value={settings.editor.fontSize}
              onChange={(value) => updateEditorSettings({ fontSize: value })}
              min={10}
              max={24}
              step={1}
              label="Font Size"
              formatValue={(v) => `${v}px`}
            />
            <TextInput
              value={settings.editor.fontFamily}
              onChange={(value) => updateEditorSettings({ fontFamily: value })}
              label="Font Family"
              placeholder="Fira Code, monospace"
            />
            <Select<string>
              value={String(settings.editor.tabSize)}
              onChange={(value) => {
                const numValue = Number(value);
                // Validate that the value is a valid TabSize (2 or 4)
                if (numValue === 2 || numValue === 4) {
                  updateEditorSettings({ tabSize: numValue });
                }
              }}
              options={[
                { value: '2', label: '2 spaces' },
                { value: '4', label: '4 spaces' },
              ]}
              label="Tab Size"
            />
            <ToggleSwitch
              enabled={settings.editor.lineWrapping}
              onChange={(value) => updateEditorSettings({ lineWrapping: value })}
              label="Line Wrapping"
              description="Wrap long lines to fit the viewport"
            />
            <ToggleSwitch
              enabled={settings.editor.minimap}
              onChange={(value) => updateEditorSettings({ minimap: value })}
              label="Show Minimap"
              description="Display code overview on the side"
            />
            <Slider
              value={settings.editor.autoSaveInterval}
              onChange={(value) => updateEditorSettings({ autoSaveInterval: value })}
              min={0}
              max={120}
              step={5}
              label="Auto-save Interval"
              description="Set to 0 to disable auto-save"
              formatValue={(v) => (v === 0 ? 'Disabled' : `${v}s`)}
            />
          </div>
        );

      case 'ai':
        return (
          <div>
            <SectionHeader title="AI Settings" description="Configure AI model behavior" />
            <Select
              value={settings.ai.defaultModel}
              onChange={(value) => updateAISettings({ defaultModel: value })}
              options={[
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'claude-3-opus', label: 'Claude 3 Opus' },
                { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
              ]}
              label="Default AI Model"
              description="Select the default model for code generation"
            />
            <Slider
              value={settings.ai.maxTokens}
              onChange={(value) => updateAISettings({ maxTokens: value })}
              min={1024}
              max={16384}
              step={512}
              label="Max Tokens"
              description="Maximum response length"
              formatValue={(v) => v.toLocaleString()}
            />
            <TextArea
              value={settings.ai.systemPrompt}
              onChange={(value) => updateAISettings({ systemPrompt: value })}
              label="Custom System Prompt"
              description="Override the default system instructions (leave empty for default)"
              placeholder="Enter custom instructions for the AI..."
              rows={4}
            />
            <Select
              value={settings.ai.responseFormat}
              onChange={(value) => updateAISettings({ responseFormat: value })}
              options={[
                { value: 'markdown', label: 'Markdown' },
                { value: 'plain', label: 'Plain Text' },
                { value: 'code', label: 'Code Only' },
              ]}
              label="Response Format"
            />
          </div>
        );

      case 'preview':
        return (
          <div>
            <SectionHeader
              title="Preview Settings"
              description="Configure the live preview panel"
            />
            <Select<PreviewSize>
              value={settings.preview.defaultSize}
              onChange={(value) => updatePreviewSettings({ defaultSize: value })}
              options={[
                { value: 'mobile', label: 'Mobile (375px)' },
                { value: 'tablet', label: 'Tablet (768px)' },
                { value: 'desktop', label: 'Desktop (100%)' },
              ]}
              label="Default Preview Size"
              description="Initial viewport size for previews"
            />
            <ToggleSwitch
              enabled={settings.preview.autoRefresh}
              onChange={(value) => updatePreviewSettings({ autoRefresh: value })}
              label="Auto-refresh Preview"
              description="Automatically update preview on code changes"
            />
            <ColorPicker
              value={settings.preview.backgroundColor}
              onChange={(value) => updatePreviewSettings({ backgroundColor: value })}
              label="Background Color"
              description="Preview panel background"
              presets={['#1a1a2e', '#0f0f1a', '#1e293b', '#18181b', '#ffffff']}
            />
            <ToggleSwitch
              enabled={settings.preview.showGrid}
              onChange={(value) => updatePreviewSettings({ showGrid: value })}
              label="Show Grid Overlay"
              description="Display alignment grid on preview"
            />
            <ToggleSwitch
              enabled={settings.preview.showConsole}
              onChange={(value) => updatePreviewSettings({ showConsole: value })}
              label="Show Console"
              description="Display console output below preview"
            />
          </div>
        );

      case 'build':
        return (
          <div>
            <SectionHeader
              title="Build Settings"
              description="Configure build and compilation options"
            />
            <ToggleSwitch
              enabled={settings.build.autoValidation}
              onChange={(value) => updateBuildSettings({ autoValidation: value })}
              label="Auto-validation"
              description="Automatically validate code before building"
            />
            <Select
              value={settings.build.optimizationLevel}
              onChange={(value) => updateBuildSettings({ optimizationLevel: value })}
              options={[
                { value: 'none', label: 'None (fastest builds)' },
                { value: 'basic', label: 'Basic (recommended)' },
                { value: 'advanced', label: 'Advanced (smallest output)' },
              ]}
              label="Optimization Level"
              description="Balance between build speed and output size"
            />
            <ToggleSwitch
              enabled={settings.build.generateSourceMaps}
              onChange={(value) => updateBuildSettings({ generateSourceMaps: value })}
              label="Generate Source Maps"
              description="Include source maps for debugging"
            />
            <ToggleSwitch
              enabled={settings.build.minify}
              onChange={(value) => updateBuildSettings({ minify: value })}
              label="Minify Output"
              description="Compress and minify generated code"
            />
          </div>
        );

      case 'shortcuts':
        return (
          <div>
            <SectionHeader
              title="Keyboard Shortcuts"
              description="View and customize key bindings"
            />
            <div className="space-y-3">
              {settings.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-white/5"
                >
                  <div>
                    <div className="text-white font-medium">{shortcut.name}</div>
                    <div className="text-sm text-slate-400">{shortcut.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-700 text-white font-mono text-sm">
                      {shortcut.keys}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-lg bg-garden-500/10 border border-garden-500/20">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <p className="text-sm text-slate-300">
                  Custom shortcut editing coming soon. For now, these are the default shortcuts.
                </p>
              </div>
            </div>
          </div>
        );

      case 'storage':
        return (
          <div>
            <SectionHeader
              title="Storage & Data"
              description="Manage local storage and settings data"
            />

            {/* Export/Import Section */}
            <div className="py-4">
              <h3 className="text-white font-medium mb-3">Export & Import Settings</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={downloadSettingsFile}
                  className="px-4 py-2 rounded-lg bg-garden-600 hover:bg-garden-700 text-white font-medium transition-all flex items-center gap-2"
                >
                  <span>📥</span> Export Settings
                </button>
                <label className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all cursor-pointer flex items-center gap-2">
                  <span>📤</span> Import Settings
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
              {importError && <p className="mt-2 text-sm text-red-400">{importError}</p>}
            </div>

            {/* Reset Sections */}
            <div className="py-4 border-t border-white/10">
              <h3 className="text-white font-medium mb-3">Reset Individual Sections</h3>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.filter((s) => s.id !== 'storage').map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Reset ${section.label} settings to defaults?`)) {
                        resetSection(section.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-all"
                  >
                    {section.icon} {section.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="py-4 border-t border-white/10">
              <h3 className="text-red-400 font-medium mb-3">Danger Zone</h3>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Are you sure you want to reset ALL settings to defaults? This cannot be undone.'
                    )
                  ) {
                    resetSettings();
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium transition-all flex items-center gap-2"
              >
                <span>⚠️</span> Reset All Settings
              </button>
            </div>

            {/* Storage Info */}
            <div className="py-4 border-t border-white/10">
              <h3 className="text-white font-medium mb-3">Storage Information</h3>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-white">
                    {new Date(settings.lastUpdated).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Settings Version</span>
                  <span className="text-white">{settings.version}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div>
            <SectionHeader
              title="Account Settings"
              description="Manage your account and API configuration"
            />

            {/* User Info & Logout */}
            <div className="py-4">
              <h3 className="text-white font-medium mb-3">User</h3>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-sm">Signed in as</span>
                    <p className="text-white font-medium">{user?.email || 'Unknown'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      onClose();
                      router.push('/login');
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium transition-all flex items-center gap-2"
                  >
                    <span>🚪</span> Log Out
                  </button>
                </div>
              </div>
            </div>

            <div className="py-4 border-t border-white/10">
              <h3 className="text-white font-medium mb-3">API Configuration</h3>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-300">API Key Status</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      settings.account.apiKeyConfigured
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {settings.account.apiKeyConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  API keys are managed through environment variables for security.
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.account.showUsageStats}
              onChange={(value) => updateAccountSettings({ showUsageStats: value })}
              label="Show Usage Statistics"
              description="Display API usage and token counts"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-garden-500/20 flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-sm text-slate-400">Configure your app preferences</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Close settings"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-garden-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <nav className="w-48 border-r border-white/10 bg-black/10 overflow-y-auto">
            <div className="p-2">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-all
                    ${
                      activeSection === section.id
                        ? 'bg-garden-600/20 text-garden-400 border border-garden-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span>{section.icon}</span>
                  <span className="text-sm font-medium">{section.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">{renderSectionContent()}</div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
