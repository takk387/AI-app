'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { DesktopDeployConfig, DeploymentPlatform } from '@/types/deployment/unified';

interface DesktopDeployPanelProps {
  config: DesktopDeployConfig;
  onConfigChange: (updates: Partial<DesktopDeployConfig>) => void;
  onDeploy: (platform: DeploymentPlatform) => void;
  isValid: (platform: DeploymentPlatform) => boolean;
  error: string | null;
}

type DesktopPlatform = 'windows' | 'macos' | 'linux';

interface PlatformInfo {
  id: DesktopPlatform;
  name: string;
  icon: React.ReactNode;
  formats: { id: string; name: string; description: string }[];
  features: string[];
}

const platforms: PlatformInfo[] = [
  {
    id: 'windows',
    name: 'Windows',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 12V6.75l6-1.32v6.48L3 12zm6.5.09v6.81l-6-1.12V12.27l6-.18zm.5-6.59l8.5-1.5v7.09l-8.5.09V5.5zM18.5 12.27v7.23l-8.5-1.5V12.36l8.5-.09z" />
      </svg>
    ),
    formats: [
      { id: 'msi', name: 'MSI Installer', description: 'Standard Windows installer' },
      { id: 'exe', name: 'EXE Installer', description: 'NSIS-based installer' },
      { id: 'portable', name: 'Portable', description: 'No installation required' },
    ],
    features: ['Native Windows UI', 'System tray support', 'Auto-updates', 'Code signing'],
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    formats: [
      { id: 'dmg', name: 'DMG Image', description: 'Drag-and-drop installer' },
      { id: 'app', name: 'App Bundle', description: 'Standalone application' },
      { id: 'pkg', name: 'PKG Installer', description: 'macOS installer package' },
    ],
    features: [
      'Native macOS styling',
      'Menu bar support',
      'Notarization ready',
      'Universal binary',
    ],
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.76.176-.67.428-1.348.463-1.922.037-.53.062-1.058.186-1.57z" />
      </svg>
    ),
    formats: [
      { id: 'appimage', name: 'AppImage', description: 'Universal Linux package' },
      { id: 'deb', name: 'DEB Package', description: 'For Debian/Ubuntu' },
      { id: 'rpm', name: 'RPM Package', description: 'For Fedora/RHEL' },
    ],
    features: ['GTK/Qt integration', 'System tray', 'Desktop integration', 'Auto-updates'],
  },
];

export function DesktopDeployPanel({
  config,
  onConfigChange,
  onDeploy,
  isValid,
  error,
}: DesktopDeployPanelProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<DesktopPlatform[]>(
    config.platforms.length > 0 ? (config.platforms as DesktopPlatform[]) : ['windows']
  );

  // Sync local state with config.platforms
  useEffect(() => {
    if (config.platforms.length > 0) {
      setSelectedPlatforms(config.platforms as DesktopPlatform[]);
    }
  }, [config.platforms]);

  const togglePlatform = (platform: DesktopPlatform) => {
    const newPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((p) => p !== platform)
      : [...selectedPlatforms, platform];

    setSelectedPlatforms(newPlatforms);
    onConfigChange({ platforms: newPlatforms });
  };

  const handleFormatChange = (platform: DesktopPlatform, format: string) => {
    if (platform === 'windows') {
      onConfigChange({ windowsFormat: format as DesktopDeployConfig['windowsFormat'] });
    } else if (platform === 'macos') {
      onConfigChange({ macosFormat: format as DesktopDeployConfig['macosFormat'] });
    } else {
      onConfigChange({ linuxFormat: format as DesktopDeployConfig['linuxFormat'] });
    }
  };

  const getSelectedFormat = (platform: DesktopPlatform) => {
    if (platform === 'windows') return config.windowsFormat;
    if (platform === 'macos') return config.macosFormat;
    return config.linuxFormat;
  };

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Target Platforms
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Select one or more platforms to build for
        </p>
        <div className="grid grid-cols-3 gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all"
              style={{
                background: selectedPlatforms.includes(platform.id)
                  ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                  : 'var(--bg-tertiary)',
                borderColor: selectedPlatforms.includes(platform.id)
                  ? 'var(--accent-primary)'
                  : 'var(--border-color)',
              }}
            >
              <div
                style={{
                  color: selectedPlatforms.includes(platform.id)
                    ? 'var(--accent-primary)'
                    : 'var(--text-muted)',
                }}
              >
                {platform.icon}
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color: selectedPlatforms.includes(platform.id)
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                }}
              >
                {platform.name}
              </span>
              {selectedPlatforms.includes(platform.id) && (
                <svg
                  className="w-4 h-4"
                  style={{ color: 'var(--accent-primary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Platform-specific configuration */}
      {selectedPlatforms.length > 0 && (
        <div className="space-y-6">
          {selectedPlatforms.map((platformId) => {
            const platform = platforms.find((p) => p.id === platformId);
            if (!platform) return null;
            const selectedFormat = getSelectedFormat(platformId);

            return (
              <motion.div
                key={platformId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg p-4"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ color: 'var(--accent-primary)' }}>{platform.icon}</div>
                  <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {platform.name} Configuration
                  </h4>
                </div>

                {/* Output Format */}
                <div className="mb-4">
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Output Format
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {platform.formats.map((format) => (
                      <button
                        key={format.id}
                        onClick={() => handleFormatChange(platformId, format.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background:
                            selectedFormat === format.id
                              ? 'var(--accent-primary)'
                              : 'var(--bg-secondary)',
                          color: selectedFormat === format.id ? 'white' : 'var(--text-secondary)',
                        }}
                        title={format.description}
                      >
                        {format.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features List */}
                <div>
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Included Features
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {platform.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-1 rounded text-xs"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* App Configuration */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          App Configuration
        </h3>
        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              App Identifier
            </label>
            <input
              type="text"
              value={config.appId || ''}
              onChange={(e) => onConfigChange({ appId: e.target.value })}
              placeholder="com.yourcompany.appname"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Version
            </label>
            <input
              type="text"
              value={config.version || '1.0.0'}
              onChange={(e) => onConfigChange({ version: e.target.value })}
              placeholder="1.0.0"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sign-app"
              checked={config.signApp}
              onChange={(e) => onConfigChange({ signApp: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ borderColor: 'var(--border-color)', accentColor: 'var(--accent-primary)' }}
            />
            <label
              htmlFor="sign-app"
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign application (requires code signing certificate)
            </label>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div
        className="rounded-lg p-4"
        style={{
          background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
        }}
      >
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: 'var(--warning)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
              Coming Soon
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Desktop deployment via Tauri is currently in development. You&apos;ll be able to build
              native desktop applications for Windows, macOS, and Linux directly from your project.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            background: 'color-mix(in srgb, var(--error) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--error) 30%, transparent)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        </div>
      )}

      {/* Deploy Button */}
      <div className="flex justify-end pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Build for first selected platform
            if (selectedPlatforms.length > 0) {
              onDeploy(selectedPlatforms[0]);
            }
          }}
          disabled={selectedPlatforms.length === 0 || !selectedPlatforms.some((p) => isValid(p))}
          className="px-6 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ background: 'var(--accent-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Build Desktop App{selectedPlatforms.length > 1 ? 's' : ''}
        </motion.button>
      </div>
    </div>
  );
}
