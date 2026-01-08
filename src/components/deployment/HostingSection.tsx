/**
 * HostingSection
 *
 * Configuration section for hosting provider selection.
 */

'use client';

import { PackageIcon, ZapIcon, ExternalLinkIcon } from '@/components/ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

export type HostingProvider = 'cloudflare' | 'vercel' | 'custom';

export interface HostingConfig {
  provider: HostingProvider;
  customUrl?: string;
}

interface HostingSectionProps {
  config: HostingConfig;
  onChange: (config: HostingConfig) => void;
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOSTING_OPTIONS: {
  id: HostingProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare Pages',
    description: 'Fast, secure, and scalable edge hosting',
    icon: <PackageIcon size={20} />,
    available: true,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Optimized for Next.js applications',
    icon: <ZapIcon size={20} />,
    available: false, // Coming soon
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Deploy to your own infrastructure',
    icon: <ExternalLinkIcon size={20} />,
    available: false, // Coming soon
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function HostingSection({ config, onChange, disabled = false }: HostingSectionProps) {
  const handleProviderChange = (provider: HostingProvider) => {
    if (!HOSTING_OPTIONS.find((o) => o.id === provider)?.available) return;
    onChange({
      ...config,
      provider,
      customUrl: provider === 'custom' ? config.customUrl : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Hosting Provider</h3>

      {/* Provider Selection */}
      <div className="space-y-2">
        {HOSTING_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => handleProviderChange(option.id)}
            disabled={disabled || !option.available}
            className={`
              w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3
              ${
                config.provider === option.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
              ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={config.provider === option.id ? 'text-primary' : 'text-muted-foreground'}
            >
              {option.icon}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{option.name}</span>
                {!option.available && (
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            {config.provider === option.id && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {/* Custom URL Input */}
      {config.provider === 'custom' && (
        <div className="pt-2">
          <label className="block text-sm font-medium text-foreground mb-1">
            Deployment Target URL
          </label>
          <input
            type="url"
            value={config.customUrl || ''}
            onChange={(e) => onChange({ ...config, customUrl: e.target.value })}
            placeholder="https://your-server.com/deploy"
            disabled={disabled}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* Info about selected provider */}
      {config.provider === 'cloudflare' && (
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <p>Your app will be deployed to Cloudflare Pages with:</p>
          <ul className="mt-2 space-y-1">
            <li>- Global CDN with 300+ edge locations</li>
            <li>- Automatic SSL certificates</li>
            <li>- Preview deployments for branches</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default HostingSection;
