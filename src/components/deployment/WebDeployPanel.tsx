'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type {
  WebDeployConfig,
  DatabaseProvider,
  HostingProvider,
} from '@/types/deployment/unified';

interface WebDeployPanelProps {
  config: WebDeployConfig;
  onConfigChange: (updates: Partial<WebDeployConfig>) => void;
  onDeploy: () => void;
  isValid: boolean;
  error: string | null;
}

interface DatabaseOption {
  id: DatabaseProvider;
  name: string;
  description: string;
  recommended?: boolean;
  icon: React.ReactNode;
}

interface HostingOption {
  id: HostingProvider;
  name: string;
  description: string;
  recommended?: boolean;
  icon: React.ReactNode;
}

const databaseOptions: DatabaseOption[] = [
  {
    id: 'turso',
    name: 'Turso',
    description: 'SQLite at the edge. Fast, globally distributed.',
    recommended: true,
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.08 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z" />
      </svg>
    ),
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Serverless PostgreSQL with branching.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: 'byo',
    name: 'Bring Your Own',
    description: 'Use your existing database connection.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2zM6 17v-2.34c1.37.64 3.16 1.04 6 1.04s4.63-.4 6-1.04V17c0 .5-2.13 2-6 2s-6-1.5-6-2zm0-5v-2.34c1.37.64 3.16 1.04 6 1.04s4.63-.4 6-1.04V12c0 .5-2.13 2-6 2s-6-1.5-6-2z" />
      </svg>
    ),
  },
];

const hostingOptions: HostingOption[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    description: 'Fast, free tier, global CDN included.',
    recommended: true,
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12.5c0-1.58-1.28-2.86-2.86-2.86-.44 0-.85.1-1.22.28l-1.43-1.43c.6-.4 1.28-.64 2.01-.71V6.5c-1.52.09-2.88.76-3.89 1.77L8.5 7.66V6H7v2.34c-.83.63-1.5 1.45-1.93 2.41H3.5v1.5h1.08c-.05.37-.08.74-.08 1.12 0 .39.03.77.08 1.14H3.5v1.5h1.59c.44.95 1.1 1.77 1.91 2.39v2.5h1.5v-1.66l.61-.61c1.01 1.01 2.37 1.68 3.89 1.77v-1.28c-.73-.07-1.41-.31-2.01-.71l1.43-1.43c.37.18.78.28 1.22.28 1.58 0 2.86-1.28 2.86-2.86zM12 15.86c-1.58 0-2.86-1.28-2.86-2.86S10.42 10.14 12 10.14 14.86 11.42 14.86 13 13.58 15.86 12 15.86z" />
      </svg>
    ),
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Optimized for Next.js, great DX.',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 19.5h20L12 2z" />
      </svg>
    ),
  },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  );
}

function OptionCard<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: {
    id: T;
    name: string;
    description: string;
    recommended?: boolean;
    icon: React.ReactNode;
  };
  selected: boolean;
  onSelect: (id: T) => void;
}) {
  return (
    <button
      onClick={() => onSelect(option.id)}
      className="relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left w-full"
      style={{
        background: selected
          ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
          : 'var(--bg-tertiary)',
        borderColor: selected ? 'var(--accent-primary)' : 'var(--border-color)',
      }}
    >
      <div
        className="flex-shrink-0 p-2 rounded-lg"
        style={{
          background: selected
            ? 'color-mix(in srgb, var(--accent-primary) 20%, transparent)'
            : 'var(--bg-secondary)',
          color: selected ? 'var(--accent-primary)' : 'var(--text-muted)',
        }}
      >
        {option.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-sm"
            style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {option.name}
          </span>
          {option.recommended && (
            <span
              className="px-1.5 py-0.5 text-xs font-medium rounded"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              Recommended
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {option.description}
        </p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3" style={{ color: 'var(--accent-primary)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

export function WebDeployPanel({
  config,
  onConfigChange,
  onDeploy,
  isValid,
  error,
}: WebDeployPanelProps) {
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const handleAddEnvVar = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      onConfigChange({
        environmentVars: {
          ...config.environmentVars,
          [newEnvKey.trim()]: newEnvValue.trim(),
        },
      });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnvVar = (key: string) => {
    const updated = { ...config.environmentVars };
    delete updated[key];
    onConfigChange({ environmentVars: updated });
  };

  const envVarCount = Object.keys(config.environmentVars).length;

  return (
    <div className="space-y-8">
      {/* Database Section */}
      <section>
        <SectionHeader title="Database" description="Choose how to store your application data" />
        <div className="grid gap-3">
          {databaseOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={config.database === option.id}
              onSelect={(id) => onConfigChange({ database: id })}
            />
          ))}
        </div>

        {/* BYO Database URL Input */}
        {config.database === 'byo' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Database Connection URL
            </label>
            <input
              type="password"
              value={config.databaseUrl || ''}
              onChange={(e) => onConfigChange({ databaseUrl: e.target.value })}
              placeholder="postgresql://user:pass@host:5432/db"
              className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </motion.div>
        )}
      </section>

      {/* Hosting Section */}
      <section>
        <SectionHeader title="Hosting" description="Select where to deploy your application" />
        <div className="grid gap-3">
          {hostingOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={config.hosting === option.id}
              onSelect={(id) => onConfigChange({ hosting: id })}
            />
          ))}
        </div>
      </section>

      {/* Environment Variables Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            title="Environment Variables"
            description="Configure secrets and configuration values"
          />
          <button
            onClick={() => setShowEnvVars(!showEnvVars)}
            className="text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent-primary)' }}
          >
            {showEnvVars ? 'Hide' : envVarCount > 0 ? `Show (${envVarCount})` : 'Add'}
          </button>
        </div>

        {showEnvVars && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            {/* Existing env vars */}
            {Object.entries(config.environmentVars).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <code
                  className="flex-1 text-sm font-mono"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {key}
                </code>
                <code
                  className="flex-1 text-sm font-mono truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {'•'.repeat(Math.min(value.length, 20))}
                </code>
                <button
                  onClick={() => handleRemoveEnvVar(key)}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add new env var */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) =>
                  setNewEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
                }
                placeholder="KEY_NAME"
                className="flex-1 px-3 py-2 rounded-lg text-sm font-mono transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                type="password"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                placeholder="Value"
                className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleAddEnvVar}
                disabled={!newEnvKey.trim() || !newEnvValue.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent-primary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </section>

      {/* Custom Domain Section */}
      <section>
        <SectionHeader
          title="Custom Domain"
          description="Optionally configure a custom domain for your app"
        />
        <input
          type="text"
          value={config.customDomain || ''}
          onChange={(e) => onConfigChange({ customDomain: e.target.value })}
          placeholder="myapp.com (optional)"
          className="w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          DNS configuration instructions will be provided after deployment.
        </p>
      </section>

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
          onClick={onDeploy}
          disabled={!isValid}
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
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Deploy to Web
        </motion.button>
      </div>
    </div>
  );
}
