'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MobileDeployConfig, DeploymentPlatform } from '@/types/deployment/unified';

interface MobileDeployPanelProps {
  config: MobileDeployConfig;
  onConfigChange: (updates: Partial<MobileDeployConfig>) => void;
  onDeploy: (platform: DeploymentPlatform) => void;
  isValid: (platform: DeploymentPlatform) => boolean;
  error: string | null;
}

type MobilePlatform = 'ios' | 'android';

interface PlatformInfo {
  id: MobilePlatform;
  name: string;
  icon: React.ReactNode;
  requirements: string[];
  buildTypes: { id: string; name: string; description: string }[];
}

const platforms: PlatformInfo[] = [
  {
    id: 'ios',
    name: 'iOS',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    requirements: [
      'Apple Developer Account ($99/year)',
      'EAS Build configured',
      'App Store Connect access',
    ],
    buildTypes: [
      { id: 'development', name: 'Development', description: 'For testing on devices' },
      { id: 'preview', name: 'Ad Hoc', description: 'For beta testers via TestFlight' },
      { id: 'production', name: 'App Store', description: 'Ready for App Store submission' },
    ],
  },
  {
    id: 'android',
    name: 'Android',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.47-.59-3.12-.93-4.97-.93s-3.5.34-4.97.93L4.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L5.4 9.48C2.84 10.93 1 13.32 1 16.26h22c0-2.94-1.84-5.33-4.4-6.78zM7 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    ),
    requirements: [
      'Google Play Developer Account ($25 one-time)',
      'EAS Build configured',
      'Signing keystore generated',
    ],
    buildTypes: [
      { id: 'development', name: 'Debug APK', description: 'For testing on devices' },
      { id: 'preview', name: 'Internal Testing', description: 'For internal testers' },
      { id: 'production', name: 'Play Store', description: 'Ready for Play Store submission' },
    ],
  },
];

function RequirementsList({ requirements }: { requirements: string[] }) {
  return (
    <ul className="space-y-2 mt-3">
      {requirements.map((req, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
          <span style={{ color: 'var(--text-muted)' }}>{req}</span>
        </li>
      ))}
    </ul>
  );
}

export function MobileDeployPanel({
  config,
  onConfigChange,
  onDeploy,
  isValid,
  error,
}: MobileDeployPanelProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<MobilePlatform>('ios');

  const currentPlatform = platforms.find((p) => p.id === selectedPlatform) ?? platforms[0];
  const currentBuildType =
    selectedPlatform === 'ios' ? config.iosBuildType : config.androidBuildType;

  const handleBuildTypeChange = (buildType: string) => {
    if (selectedPlatform === 'ios') {
      onConfigChange({ iosBuildType: buildType as MobileDeployConfig['iosBuildType'] });
    } else {
      onConfigChange({ androidBuildType: buildType as MobileDeployConfig['androidBuildType'] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Toggle */}
      <div className="flex rounded-lg p-1" style={{ background: 'var(--bg-tertiary)' }}>
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => setSelectedPlatform(platform.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              selectedPlatform === platform.id ? 'shadow-sm' : ''
            }`}
            style={{
              background: selectedPlatform === platform.id ? 'var(--bg-secondary)' : 'transparent',
              color: selectedPlatform === platform.id ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <span
              style={{
                color: selectedPlatform === platform.id ? 'var(--accent-primary)' : undefined,
              }}
            >
              {platform.icon}
            </span>
            {platform.name}
          </button>
        ))}
      </div>

      {/* Platform Details */}
      <motion.div
        key={selectedPlatform}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Requirements */}
        <div
          className="rounded-lg p-4"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div style={{ color: 'var(--accent-primary)' }}>{currentPlatform.icon}</div>
            <div>
              <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {currentPlatform.name} Requirements
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Make sure you have the following set up
              </p>
            </div>
          </div>
          <RequirementsList requirements={currentPlatform.requirements} />
        </div>

        {/* Build Type Selection */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Build Type
          </h3>
          <div className="grid gap-3">
            {currentPlatform.buildTypes.map((buildType) => (
              <button
                key={buildType.id}
                onClick={() => handleBuildTypeChange(buildType.id)}
                className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left"
                style={{
                  background:
                    currentBuildType === buildType.id
                      ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                      : 'var(--bg-tertiary)',
                  borderColor:
                    currentBuildType === buildType.id
                      ? 'var(--accent-primary)'
                      : 'var(--border-color)',
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor:
                      currentBuildType === buildType.id
                        ? 'var(--accent-primary)'
                        : 'var(--border-color)',
                  }}
                >
                  {currentBuildType === buildType.id && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: 'var(--accent-primary)' }}
                    />
                  )}
                </div>
                <div>
                  <p
                    className="font-medium text-sm"
                    style={{
                      color:
                        currentBuildType === buildType.id
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {buildType.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {buildType.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

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
                Bundle Identifier
              </label>
              <input
                type="text"
                value={config.bundleId || ''}
                onChange={(e) => onConfigChange({ bundleId: e.target.value })}
                placeholder="com.yourcompany.appname"
                className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Unique identifier for your app (e.g., com.company.appname)
              </p>
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
                Mobile deployment via Capacitor and EAS Build is currently in development.
                You&apos;ll be able to build and deploy native iOS and Android apps directly from
                your project.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

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
          onClick={() => onDeploy(selectedPlatform)}
          disabled={!isValid(selectedPlatform)}
          className="px-6 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ background: 'var(--accent-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {currentPlatform.icon}
          Build for {currentPlatform.name}
        </motion.button>
      </div>
    </div>
  );
}
