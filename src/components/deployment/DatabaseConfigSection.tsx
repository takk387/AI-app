/**
 * DatabaseConfigSection
 *
 * Configuration section for database provider selection and settings.
 */

'use client';

import { useState } from 'react';
import { LayersIcon, CubeIcon, ExternalLinkIcon } from '@/components/ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

export type DatabaseProvider = 'turso' | 'neon' | 'byo' | 'none';

export interface DatabaseConfig {
  provider: DatabaseProvider;
  databaseUrl?: string;
  authToken?: string;
}

interface DatabaseConfigSectionProps {
  config: DatabaseConfig;
  onChange: (config: DatabaseConfig) => void;
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DATABASE_OPTIONS: {
  id: DatabaseProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}[] = [
  {
    id: 'turso',
    name: 'Turso (SQLite)',
    description: 'Edge-ready SQLite database with global replication',
    icon: <LayersIcon size={20} />,
    features: ['Edge locations', 'SQLite compatible', 'Automatic backups'],
  },
  {
    id: 'neon',
    name: 'Neon (PostgreSQL)',
    description: 'Serverless PostgreSQL with branching support',
    icon: <CubeIcon size={20} />,
    features: ['PostgreSQL', 'Branching', 'Auto-scaling'],
  },
  {
    id: 'byo',
    name: 'Bring Your Own',
    description: 'Connect to your existing database',
    icon: <ExternalLinkIcon size={20} />,
    features: ['Any provider', 'Full control', 'Existing data'],
  },
  {
    id: 'none',
    name: 'No Database',
    description: 'Deploy without a database',
    icon: <LayersIcon size={20} className="opacity-50" />,
    features: ['Static sites', 'Client-only apps'],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function DatabaseConfigSection({
  config,
  onChange,
  disabled = false,
}: DatabaseConfigSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProviderChange = (provider: DatabaseProvider) => {
    onChange({
      ...config,
      provider,
      // Clear BYO fields when switching away from BYO
      databaseUrl: provider === 'byo' ? config.databaseUrl : undefined,
      authToken: provider === 'byo' ? config.authToken : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Database Provider</h3>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced
        </button>
      </div>

      {/* Provider Selection */}
      <div className="grid grid-cols-2 gap-3">
        {DATABASE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleProviderChange(option.id)}
            disabled={disabled}
            className={`
              p-3 rounded-lg border text-left transition-all
              ${
                config.provider === option.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={config.provider === option.id ? 'text-primary' : 'text-muted-foreground'}
              >
                {option.icon}
              </span>
              <span className="font-medium text-sm">{option.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </button>
        ))}
      </div>

      {/* BYO Database URL Input */}
      {config.provider === 'byo' && (
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Database URL</label>
            <input
              type="url"
              value={config.databaseUrl || ''}
              onChange={(e) => onChange({ ...config, databaseUrl: e.target.value })}
              placeholder="postgresql://user:pass@host:5432/db"
              disabled={disabled}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Connection string for your database
            </p>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      {showAdvanced && config.provider !== 'none' && config.provider !== 'byo' && (
        <div className="pt-2 space-y-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Selected: {DATABASE_OPTIONS.find((o) => o.id === config.provider)?.name}</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {DATABASE_OPTIONS.find((o) => o.id === config.provider)?.features.map(
              (feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {feature}
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DatabaseConfigSection;
