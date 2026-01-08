/**
 * DomainConfigSection
 *
 * Configuration section for custom domain setup.
 */

'use client';

import { useState } from 'react';
import {
  ExternalLinkIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LoaderIcon,
} from '@/components/ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

export interface DomainConfig {
  customDomain?: string;
  useSubdomain: boolean;
  subdomain?: string;
  sslEnabled: boolean;
}

export interface DomainStatus {
  configured: boolean;
  verified: boolean;
  sslActive: boolean;
  dnsRecords?: {
    type: string;
    name: string;
    value: string;
  }[];
}

interface DomainConfigSectionProps {
  config: DomainConfig;
  onChange: (config: DomainConfig) => void;
  status?: DomainStatus;
  projectSubdomain?: string;
  disabled?: boolean;
  onVerify?: () => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DomainConfigSection({
  config,
  onChange,
  status,
  projectSubdomain,
  disabled = false,
  onVerify,
}: DomainConfigSectionProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!onVerify) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      await onVerify();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const isValidDomain = (domain: string): boolean => {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Domain Configuration</h3>

      {/* Default Subdomain */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Default URL</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projectSubdomain
                ? `${projectSubdomain}.pages.dev`
                : 'Will be assigned after deployment'}
            </p>
          </div>
          <CheckCircleIcon size={16} style={{ color: 'var(--success)' }} />
        </div>
      </div>

      {/* Custom Domain Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={!config.useSubdomain}
          onChange={(e) => onChange({ ...config, useSubdomain: !e.target.checked })}
          disabled={disabled}
          className="rounded border-border"
        />
        <span className="text-sm">Use custom domain</span>
      </label>

      {/* Custom Domain Input */}
      {!config.useSubdomain && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Custom Domain</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.customDomain || ''}
                onChange={(e) =>
                  onChange({ ...config, customDomain: e.target.value.toLowerCase() })
                }
                placeholder="app.yourdomain.com"
                disabled={disabled}
                className={`flex-1 px-3 py-2 text-sm bg-background border rounded-md
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    config.customDomain && !isValidDomain(config.customDomain)
                      ? 'border-destructive'
                      : 'border-border'
                  }`}
              />
              {onVerify && config.customDomain && isValidDomain(config.customDomain) && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={disabled || isVerifying}
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md
                    hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center gap-2"
                >
                  {isVerifying ? <LoaderIcon size={16} /> : 'Verify'}
                </button>
              )}
            </div>
            {config.customDomain && !isValidDomain(config.customDomain) && (
              <p className="mt-1 text-xs text-destructive">Please enter a valid domain name</p>
            )}
          </div>

          {/* Domain Status */}
          {status && config.customDomain && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.verified ? (
                  <CheckCircleIcon size={16} style={{ color: 'var(--success)' }} />
                ) : (
                  <AlertCircleIcon size={16} style={{ color: 'var(--warning)' }} />
                )}
                <span className="text-sm">
                  {status.verified ? 'Domain verified' : 'Domain pending verification'}
                </span>
              </div>

              {/* DNS Records */}
              {status.dnsRecords && status.dnsRecords.length > 0 && !status.verified && (
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-xs font-medium">Add these DNS records:</p>
                  {status.dnsRecords.map((record, idx) => (
                    <div key={idx} className="text-xs font-mono bg-background p-2 rounded">
                      <span className="text-muted-foreground">{record.type}</span>{' '}
                      <span>{record.name}</span>{' '}
                      <span className="text-primary">{record.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {verifyError && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircleIcon size={12} />
              {verifyError}
            </div>
          )}

          {/* SSL Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.sslEnabled}
              onChange={(e) => onChange({ ...config, sslEnabled: e.target.checked })}
              disabled={disabled}
              className="rounded border-border"
            />
            <div>
              <span className="text-sm">Enable SSL/HTTPS</span>
              <p className="text-xs text-muted-foreground">
                Automatically provision SSL certificate
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Help Link */}
      <a
        href="https://developers.cloudflare.com/pages/platform/custom-domains/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Learn more about custom domains
        <ExternalLinkIcon size={12} />
      </a>
    </div>
  );
}

export default DomainConfigSection;
