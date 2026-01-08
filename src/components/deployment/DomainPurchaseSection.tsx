/**
 * DomainPurchaseSection
 *
 * Section for searching and purchasing domains via Cloudflare Registrar.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  SearchIcon,
  PackageIcon,
  CheckCircleIcon,
  LoaderIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';

// ============================================================================
// TYPES
// ============================================================================

export interface DomainSearchResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: {
    registration: number;
    renewal: number;
    currency: string;
  };
}

export interface DomainPurchaseConfig {
  selectedDomain?: string;
  autoRenew: boolean;
  privacyProtection: boolean;
}

interface DomainPurchaseSectionProps {
  config: DomainPurchaseConfig;
  onChange: (config: DomainPurchaseConfig) => void;
  onSearch?: (query: string) => Promise<DomainSearchResult[]>;
  onPurchase?: (domain: string) => Promise<void>;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DomainPurchaseSection({
  config,
  onChange,
  onSearch,
  onPurchase,
  disabled = false,
}: DomainPurchaseSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DomainSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !onSearch) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const results = await onSearch(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onSearch]);

  const handlePurchase = async (domain: string) => {
    if (!onPurchase) return;

    setIsPurchasing(true);
    setError(null);

    try {
      await onPurchase(domain);
      onChange({ ...config, selectedDomain: domain });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Purchase a Domain</h3>
        <span className="text-xs text-muted-foreground">via Cloudflare Registrar</span>
      </div>

      {/* Selected Domain */}
      {config.selectedDomain && (
        <div
          className="p-3 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={16} style={{ color: 'var(--success)' }} />
            <span className="text-sm font-medium">{config.selectedDomain}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Domain purchased and ready to configure
          </p>
        </div>
      )}

      {/* Search Input */}
      {!config.selectedDomain && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for a domain..."
                disabled={disabled || isSearching}
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <SearchIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={disabled || isSearching || !searchQuery.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md
                hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isSearching ? <LoaderIcon size={16} /> : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.domain}
                  className={`p-3 rounded-lg border flex items-center justify-between
                    ${
                      result.available
                        ? 'border-border hover:border-primary/50'
                        : 'border-border/50 opacity-60'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLinkIcon
                      size={16}
                      className={result.available ? 'text-primary' : 'text-muted-foreground'}
                    />
                    <div>
                      <p className="text-sm font-medium">{result.domain}</p>
                      {result.premium && (
                        <span className="text-xs" style={{ color: 'var(--warning)' }}>
                          Premium domain
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.available && result.price && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatPrice(result.price.registration, result.price.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(result.price.renewal, result.price.currency)}/yr renewal
                        </p>
                      </div>
                    )}
                    {result.available ? (
                      <button
                        type="button"
                        onClick={() => handlePurchase(result.domain)}
                        disabled={disabled || isPurchasing}
                        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md
                          hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center gap-1"
                      >
                        {isPurchasing ? (
                          <LoaderIcon size={12} />
                        ) : (
                          <>
                            <PackageIcon size={12} />
                            Buy
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Taken</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchResults.length === 0 && searchQuery && !isSearching && !error && (
            <p className="text-sm text-center text-muted-foreground py-4">
              No results found. Try a different domain name.
            </p>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircleIcon size={16} className="text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoRenew}
            onChange={(e) => onChange({ ...config, autoRenew: e.target.checked })}
            disabled={disabled}
            className="rounded border-border"
          />
          <div>
            <span className="text-sm">Auto-renew domain</span>
            <p className="text-xs text-muted-foreground">Automatically renew before expiration</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.privacyProtection}
            onChange={(e) => onChange({ ...config, privacyProtection: e.target.checked })}
            disabled={disabled}
            className="rounded border-border"
          />
          <div>
            <span className="text-sm">WHOIS privacy protection</span>
            <p className="text-xs text-muted-foreground">Hide your contact information (free)</p>
          </div>
        </label>
      </div>
    </div>
  );
}

export default DomainPurchaseSection;
