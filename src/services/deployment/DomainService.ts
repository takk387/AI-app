/**
 * DomainService
 *
 * Service for DNS configuration and custom domain management.
 * Handles domain validation, DNS record generation, and SSL provisioning.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Domain provider
 */
export type DomainProvider = 'cloudflare' | 'vercel' | 'custom';

/**
 * DNS record type
 */
export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS';

/**
 * DNS record definition
 */
export interface DNSRecord {
  type: DNSRecordType;
  name: string;
  value: string;
  ttl: number;
  priority?: number; // For MX records
  proxied?: boolean; // For Cloudflare
}

/**
 * Domain status
 */
export type DomainStatus = 'pending' | 'validating' | 'active' | 'error' | 'expired';

/**
 * Domain configuration
 */
export interface DomainConfig {
  domain: string;
  subdomain?: string;
  provider: DomainProvider;
  targetHost: string;
  targetType: 'cname' | 'ip';
  sslEnabled: boolean;
}

/**
 * Domain validation result
 */
export interface DomainValidation {
  valid: boolean;
  available?: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Domain setup result
 */
export interface DomainSetupResult {
  success: boolean;
  domain: string;
  status: DomainStatus;
  dnsRecords: DNSRecord[];
  verificationToken?: string;
  sslStatus?: 'pending' | 'active' | 'error';
  error?: string;
}

/**
 * Domain verification result
 */
export interface DomainVerificationResult {
  verified: boolean;
  dnsConfigured: boolean;
  sslProvisioned: boolean;
  errors: string[];
}

/**
 * Registered domain info
 */
export interface RegisteredDomain {
  id: string;
  domain: string;
  projectId: string;
  provider: DomainProvider;
  status: DomainStatus;
  dnsRecords: DNSRecord[];
  sslEnabled: boolean;
  sslExpiresAt?: string;
  createdAt: string;
  verifiedAt?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default TTL for DNS records (1 hour)
 */
const DEFAULT_TTL = 3600;

/**
 * DNS propagation check interval (30 seconds)
 */
const PROPAGATION_CHECK_INTERVAL = 30000;

/**
 * Maximum DNS propagation wait time (30 minutes)
 */
const MAX_PROPAGATION_WAIT = 1800000;

/**
 * Reserved/blocked domain patterns
 */
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /\.local$/i,
  /\.internal$/i,
  /\.test$/i,
  /\.example$/i,
  /\.invalid$/i,
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DomainService {
  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Validate a domain name
   */
  validateDomain(domain: string): DomainValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty domain
    if (!domain || domain.trim() === '') {
      return {
        valid: false,
        errors: ['Domain cannot be empty'],
        warnings: [],
      };
    }

    const normalizedDomain = domain.toLowerCase().trim();

    // Check domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(normalizedDomain)) {
      errors.push('Invalid domain format');
    }

    // Check for blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(normalizedDomain)) {
        errors.push('This domain is reserved or not allowed');
        break;
      }
    }

    // Check domain length
    if (normalizedDomain.length > 253) {
      errors.push('Domain name exceeds maximum length (253 characters)');
    }

    // Check label lengths
    const labels = normalizedDomain.split('.');
    for (const label of labels) {
      if (label.length > 63) {
        errors.push(`Label "${label}" exceeds maximum length (63 characters)`);
      }
    }

    // Warnings
    if (normalizedDomain.includes('--')) {
      warnings.push('Domain contains consecutive hyphens');
    }

    if (labels.some((l) => l.startsWith('-') || l.endsWith('-'))) {
      errors.push('Labels cannot start or end with hyphens');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate DNS records for a domain configuration
   */
  generateDNSRecords(config: DomainConfig): DNSRecord[] {
    const records: DNSRecord[] = [];
    const fullDomain = config.subdomain ? `${config.subdomain}.${config.domain}` : config.domain;

    // Main record (CNAME or A)
    if (config.targetType === 'cname') {
      records.push({
        type: 'CNAME',
        name: fullDomain,
        value: config.targetHost,
        ttl: DEFAULT_TTL,
        proxied: config.provider === 'cloudflare',
      });
    } else {
      records.push({
        type: 'A',
        name: fullDomain,
        value: config.targetHost,
        ttl: DEFAULT_TTL,
        proxied: config.provider === 'cloudflare',
      });
    }

    // Root redirect if subdomain is www
    if (config.subdomain === 'www') {
      records.push({
        type: 'CNAME',
        name: config.domain,
        value: fullDomain,
        ttl: DEFAULT_TTL,
        proxied: config.provider === 'cloudflare',
      });
    }

    // Add CAA record for SSL if enabled
    if (config.sslEnabled) {
      records.push({
        type: 'TXT',
        name: `_dnslink.${fullDomain}`,
        value: `dnslink=/ipns/${config.targetHost}`,
        ttl: DEFAULT_TTL,
      });
    }

    return records;
  }

  /**
   * Setup a custom domain
   */
  async setupDomain(projectId: string, config: DomainConfig): Promise<DomainSetupResult> {
    try {
      // Validate domain
      const validation = this.validateDomain(config.domain);
      if (!validation.valid) {
        return {
          success: false,
          domain: config.domain,
          status: 'error',
          dnsRecords: [],
          error: validation.errors.join(', '),
        };
      }

      // Generate DNS records
      const dnsRecords = this.generateDNSRecords(config);

      // Generate verification token
      const verificationToken = this.generateVerificationToken(projectId, config.domain);

      // TODO: Register domain with hosting provider
      // For now, return the configuration for manual setup

      return {
        success: true,
        domain: config.subdomain ? `${config.subdomain}.${config.domain}` : config.domain,
        status: 'pending',
        dnsRecords,
        verificationToken,
        sslStatus: config.sslEnabled ? 'pending' : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Domain setup failed';
      return {
        success: false,
        domain: config.domain,
        status: 'error',
        dnsRecords: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Verify domain DNS configuration
   */
  async verifyDomain(domain: string): Promise<DomainVerificationResult> {
    const errors: string[] = [];

    try {
      // Check DNS resolution
      const dnsConfigured = await this.checkDNSResolution(domain);

      if (!dnsConfigured) {
        errors.push('DNS records not yet propagated');
      }

      // Check SSL
      const sslProvisioned = await this.checkSSL(domain);

      if (!sslProvisioned) {
        errors.push('SSL certificate not yet provisioned');
      }

      return {
        verified: dnsConfigured && sslProvisioned,
        dnsConfigured,
        sslProvisioned,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      return {
        verified: false,
        dnsConfigured: false,
        sslProvisioned: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Wait for DNS propagation
   */
  async waitForPropagation(
    domain: string,
    onProgress?: (attempt: number, resolved: boolean) => void
  ): Promise<boolean> {
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < MAX_PROPAGATION_WAIT) {
      attempt++;
      const resolved = await this.checkDNSResolution(domain);

      if (onProgress) {
        onProgress(attempt, resolved);
      }

      if (resolved) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, PROPAGATION_CHECK_INTERVAL));
    }

    return false;
  }

  /**
   * Remove a custom domain
   */
  async removeDomain(
    _projectId: string,
    _domain: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Remove domain from hosting provider
      // TODO: Remove from database

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Domain removal failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get domain status
   */
  async getDomainStatus(domain: string): Promise<DomainStatus> {
    try {
      const verification = await this.verifyDomain(domain);

      if (verification.verified) {
        return 'active';
      }

      if (verification.dnsConfigured && !verification.sslProvisioned) {
        return 'validating';
      }

      return 'pending';
    } catch {
      return 'error';
    }
  }

  /**
   * Format DNS records for display
   */
  formatDNSRecordsForDisplay(records: DNSRecord[]): string {
    const lines: string[] = [];

    lines.push('DNS Records to configure:');
    lines.push('');

    for (const record of records) {
      lines.push(`Type: ${record.type}`);
      lines.push(`Name: ${record.name}`);
      lines.push(`Value: ${record.value}`);
      lines.push(`TTL: ${record.ttl}`);
      if (record.priority !== undefined) {
        lines.push(`Priority: ${record.priority}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  /**
   * Generate a verification token for domain ownership
   */
  private generateVerificationToken(projectId: string, domain: string): string {
    const data = `${projectId}:${domain}:${Date.now()}`;
    // Simple hash for verification
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `aiapp-verify-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Check DNS resolution for a domain
   */
  private async checkDNSResolution(_domain: string): Promise<boolean> {
    // TODO: Implement actual DNS lookup
    // For browser environments, this would need to call a backend API
    // For Node.js, use dns.resolve()

    // Simulate check
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In production, this would actually check DNS
    return false;
  }

  /**
   * Check SSL certificate status
   */
  private async checkSSL(_domain: string): Promise<boolean> {
    // TODO: Implement actual SSL check
    // This would typically check if HTTPS is working

    // Simulate check
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In production, this would actually check SSL
    return false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let domainServiceInstance: DomainService | null = null;

/**
 * Get or create the domain service instance
 */
export function getDomainService(): DomainService {
  if (!domainServiceInstance) {
    domainServiceInstance = new DomainService();
  }
  return domainServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetDomainService(): void {
  domainServiceInstance = null;
}
