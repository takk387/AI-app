/**
 * EnvironmentVarsSection
 *
 * Configuration section for environment variables.
 */

'use client';

import { useState } from 'react';
import { PlusIcon, TrashIcon, EyeIcon, LockIcon, AlertCircleIcon } from '@/components/ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret?: boolean;
}

interface EnvironmentVarsSectionProps {
  variables: EnvironmentVariable[];
  onChange: (variables: EnvironmentVariable[]) => void;
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COMMON_ENV_VARS = [
  { key: 'NODE_ENV', description: 'Node environment' },
  { key: 'DATABASE_URL', description: 'Database connection string' },
  { key: 'API_KEY', description: 'API authentication key' },
  { key: 'NEXT_PUBLIC_APP_URL', description: 'Public app URL' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function EnvironmentVarsSection({
  variables,
  onChange,
  disabled = false,
}: EnvironmentVarsSectionProps) {
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(false);

  const addVariable = () => {
    if (!newKey.trim()) return;

    // Check for duplicate keys
    if (variables.some((v) => v.key === newKey.trim())) {
      return;
    }

    onChange([
      ...variables,
      {
        key: newKey
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, '_'),
        value: newValue,
        isSecret: newIsSecret,
      },
    ]);

    setNewKey('');
    setNewValue('');
    setNewIsSecret(false);
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, updates: Partial<EnvironmentVariable>) => {
    onChange(variables.map((v, i) => (i === index ? { ...v, ...updates } : v)));
  };

  const toggleShowSecret = (index: number) => {
    setShowSecrets((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const hasSecrets = variables.some((v) => v.isSecret);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Environment Variables</h3>
        <span className="text-xs text-muted-foreground">
          {variables.length} variable{variables.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Warning about secrets */}
      {hasSecrets && (
        <div
          className="flex items-start gap-2 p-2 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 20%, transparent)',
          }}
        >
          <AlertCircleIcon size={16} style={{ color: 'var(--warning)' }} className="mt-0.5" />
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            Secret variables are encrypted and will not be visible after saving.
          </p>
        </div>
      )}

      {/* Existing Variables */}
      {variables.length > 0 && (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <input
                type="text"
                value={variable.key}
                onChange={(e) =>
                  updateVariable(index, {
                    key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
                  })
                }
                disabled={disabled}
                className="flex-1 px-2 py-1 text-sm font-mono bg-background border border-border rounded
                  focus:outline-none focus:ring-1 focus:ring-primary/50
                  disabled:opacity-50"
                placeholder="KEY"
              />
              <span className="text-muted-foreground">=</span>
              <div className="flex-1 relative">
                <input
                  type={variable.isSecret && !showSecrets[index] ? 'password' : 'text'}
                  value={variable.value}
                  onChange={(e) => updateVariable(index, { value: e.target.value })}
                  disabled={disabled}
                  className="w-full px-2 py-1 pr-8 text-sm font-mono bg-background border border-border rounded
                    focus:outline-none focus:ring-1 focus:ring-primary/50
                    disabled:opacity-50"
                  placeholder="value"
                />
                {variable.isSecret && (
                  <button
                    type="button"
                    onClick={() => toggleShowSecret(index)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets[index] ? <LockIcon size={12} /> : <EyeIcon size={12} />}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeVariable(index)}
                disabled={disabled}
                className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Variable */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
            disabled={disabled}
            className="flex-1 px-2 py-1.5 text-sm font-mono bg-background border border-border rounded
              focus:outline-none focus:ring-1 focus:ring-primary/50
              disabled:opacity-50"
            placeholder="NEW_KEY"
            onKeyDown={(e) => e.key === 'Enter' && addVariable()}
          />
          <span className="text-muted-foreground">=</span>
          <input
            type={newIsSecret ? 'password' : 'text'}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={disabled}
            className="flex-1 px-2 py-1.5 text-sm font-mono bg-background border border-border rounded
              focus:outline-none focus:ring-1 focus:ring-primary/50
              disabled:opacity-50"
            placeholder="value"
            onKeyDown={(e) => e.key === 'Enter' && addVariable()}
          />
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={newIsSecret}
              onChange={(e) => setNewIsSecret(e.target.checked)}
              disabled={disabled}
              className="rounded border-border"
            />
            Secret
          </label>
          <button
            type="button"
            onClick={addVariable}
            disabled={disabled || !newKey.trim()}
            className="p-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon size={16} />
          </button>
        </div>

        {/* Common Variables Suggestions */}
        <div className="flex flex-wrap gap-1">
          {COMMON_ENV_VARS.filter((cv) => !variables.some((v) => v.key === cv.key)).map((cv) => (
            <button
              key={cv.key}
              type="button"
              onClick={() => setNewKey(cv.key)}
              disabled={disabled}
              className="px-2 py-0.5 text-xs bg-muted hover:bg-muted/80 rounded
                disabled:opacity-50 disabled:cursor-not-allowed"
              title={cv.description}
            >
              {cv.key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EnvironmentVarsSection;
