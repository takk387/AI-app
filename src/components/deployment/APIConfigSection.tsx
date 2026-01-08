'use client';

/**
 * APIConfigSection
 *
 * Configuration UI for managed API services in deployed apps.
 * Allows users to choose between platform-managed keys or their own (BYO).
 */

import { useState } from 'react';
import type { APIService, APIKeyMode, APIServiceConfig } from '@/types/api-gateway';

// ============================================================================
// TYPES
// ============================================================================

interface APIConfigSectionProps {
  /** Current service configurations */
  services: APIServiceConfig[];
  /** Callback when configuration changes */
  onChange: (services: APIServiceConfig[]) => void;
  /** Whether the section is disabled */
  disabled?: boolean;
}

interface ServiceInfo {
  service: APIService;
  name: string;
  description: string;
  platformPricing: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_INFO: ServiceInfo[] = [
  {
    service: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, GPT-3.5, and other OpenAI models',
    platformPricing: '$0.003-$0.04/1K tokens (varies by model, 33% markup)',
    icon: 'AI',
  },
  {
    service: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 4, Claude 3.5, and Claude 3 models',
    platformPricing: '$0.003-$0.10/1K tokens (varies by model, 33% markup)',
    icon: 'AI',
  },
  {
    service: 'sendgrid',
    name: 'Email (SendGrid)',
    description: 'Transactional and marketing emails',
    platformPricing: '~$0.001/email (25% markup)',
    icon: 'Mail',
  },
  {
    service: 'twilio',
    name: 'SMS (Twilio)',
    description: 'SMS and voice messaging',
    platformPricing: '~$0.01/SMS (27% markup)',
    icon: 'Phone',
  },
  {
    service: 'storage',
    name: 'Storage',
    description: 'File storage and CDN',
    platformPricing: '~$0.02/GB (33% markup)',
    icon: 'Cloud',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function APIConfigSection({ services, onChange, disabled = false }: APIConfigSectionProps) {
  const [expandedService, setExpandedService] = useState<APIService | null>(null);

  const getServiceConfig = (service: APIService): APIServiceConfig => {
    return (
      services.find((s) => s.service === service) || {
        service,
        mode: 'platform',
        enabled: false,
      }
    );
  };

  const updateService = (service: APIService, updates: Partial<APIServiceConfig>) => {
    const newServices = services.map((s) => (s.service === service ? { ...s, ...updates } : s));

    // If service doesn't exist, add it
    if (!services.find((s) => s.service === service)) {
      newServices.push({
        service,
        mode: 'platform',
        enabled: false,
        ...updates,
      });
    }

    onChange(newServices);
  };

  const toggleService = (service: APIService) => {
    const config = getServiceConfig(service);
    updateService(service, { enabled: !config.enabled });
  };

  const setMode = (service: APIService, mode: APIKeyMode) => {
    updateService(service, { mode, userApiKey: mode === 'byo' ? '' : undefined });
  };

  const setApiKey = (service: APIService, key: string) => {
    updateService(service, { userApiKey: key });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">API Services</h3>
        <p className="text-sm text-muted-foreground">
          Configure which API services your app can use. Choose platform-managed keys (usage-based
          billing) or bring your own API keys.
        </p>
      </div>

      <div className="space-y-3">
        {SERVICE_INFO.map((info) => {
          const config = getServiceConfig(info.service);
          const isExpanded = expandedService === info.service;

          return (
            <div
              key={info.service}
              className={`border rounded-lg transition-colors ${
                config.enabled ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              {/* Service Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedService(isExpanded ? null : info.service)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      config.enabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {info.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{info.name}</h4>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Enable toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleService(info.service);
                    }}
                    disabled={disabled}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      config.enabled ? 'bg-primary' : 'bg-muted'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        config.enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>

                  {/* Expand arrow */}
                  <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Expanded Config */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                  {/* Mode selection */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      API Key Source
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMode(info.service, 'platform')}
                        disabled={disabled}
                        className={`flex-1 px-4 py-2 rounded-lg border text-sm transition-colors ${
                          config.mode === 'platform'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Platform Managed
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode(info.service, 'byo')}
                        disabled={disabled}
                        className={`flex-1 px-4 py-2 rounded-lg border text-sm transition-colors ${
                          config.mode === 'byo'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Bring Your Own
                      </button>
                    </div>
                  </div>

                  {/* Platform pricing info */}
                  {config.mode === 'platform' && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Platform pricing:</span>{' '}
                        {info.platformPricing}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usage is tracked and billed monthly. No setup required.
                      </p>
                    </div>
                  )}

                  {/* BYO API key input */}
                  {config.mode === 'byo' && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Your API Key
                      </label>
                      <input
                        type="password"
                        value={config.userApiKey || ''}
                        onChange={(e) => setApiKey(info.service, e.target.value)}
                        disabled={disabled}
                        placeholder={`Enter your ${info.name} API key`}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your API key is encrypted and stored securely.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-2">Configuration Summary</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {services.filter((s) => s.enabled).length === 0 ? (
            <li>No services enabled</li>
          ) : (
            services
              .filter((s) => s.enabled)
              .map((s) => {
                const info = SERVICE_INFO.find((i) => i.service === s.service);
                return (
                  <li key={s.service}>
                    {info?.name || s.service}:{' '}
                    <span className="text-foreground">
                      {s.mode === 'platform' ? 'Platform Managed' : 'Your API Key'}
                    </span>
                  </li>
                );
              })
          )}
        </ul>
      </div>
    </div>
  );
}

export default APIConfigSection;
