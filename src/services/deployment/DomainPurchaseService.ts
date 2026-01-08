/**
 * DomainPurchaseService
 *
 * Handles domain search, purchase, and transfer via Cloudflare Registrar.
 * Integrates with the billing system for payment processing.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported TLDs and their base prices (in cents)
 */
export const TLD_PRICING: Record<
  string,
  { registration: number; renewal: number; transfer: number }
> = {
  '.com': { registration: 999, renewal: 999, transfer: 999 },
  '.net': { registration: 1099, renewal: 1099, transfer: 1099 },
  '.org': { registration: 1099, renewal: 1099, transfer: 1099 },
  '.io': { registration: 3999, renewal: 3999, transfer: 3999 },
  '.dev': { registration: 1399, renewal: 1399, transfer: 1399 },
  '.app': { registration: 1499, renewal: 1499, transfer: 1499 },
  '.co': { registration: 2999, renewal: 2999, transfer: 2999 },
  '.ai': { registration: 8999, renewal: 8999, transfer: 8999 },
  '.xyz': { registration: 999, renewal: 999, transfer: 999 },
  '.tech': { registration: 4999, renewal: 4999, transfer: 4999 },
};

/**
 * Domain availability status
 */
export type DomainAvailability = 'available' | 'taken' | 'premium' | 'reserved' | 'error';

/**
 * Domain search result
 */
export interface DomainSearchResult {
  domain: string;
  tld: string;
  available: boolean;
  status: DomainAvailability;
  priceRegistrationCents?: number;
  priceRenewalCents?: number;
  isPremium?: boolean;
  premiumPriceCents?: number;
}

/**
 * Domain purchase request
 */
export interface DomainPurchaseRequest {
  domain: string;
  years: number;
  autoRenew: boolean;
  privacyProtection: boolean;
  nameservers?: string[];
  registrantContact: RegistrantContact;
}

/**
 * Registrant contact information
 */
export interface RegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2
  organization?: string;
}

/**
 * Domain purchase result
 */
export interface DomainPurchaseResult {
  success: boolean;
  domain?: string;
  registrationId?: string;
  expiresAt?: string;
  totalPaidCents?: number;
  error?: string;
}

/**
 * Domain transfer request
 */
export interface DomainTransferRequest {
  domain: string;
  authCode: string;
  autoRenew: boolean;
  privacyProtection: boolean;
  registrantContact?: RegistrantContact;
}

/**
 * Domain transfer status
 */
export type TransferStatus =
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'cancelled';

/**
 * Domain transfer result
 */
export interface DomainTransferResult {
  success: boolean;
  transferId?: string;
  domain?: string;
  status?: TransferStatus;
  estimatedCompletionDays?: number;
  error?: string;
}

/**
 * Registered domain info
 */
export interface RegisteredDomainInfo {
  domain: string;
  registrar: 'cloudflare' | 'external';
  status: 'active' | 'pending' | 'expired' | 'locked';
  registeredAt: string;
  expiresAt: string;
  autoRenew: boolean;
  privacyProtection: boolean;
  nameservers: string[];
  locked: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DomainPurchaseService {
  private cloudflareAccountId: string | null = null;
  private cloudflareApiToken: string | null = null;

  constructor() {
    this.cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || null;
    this.cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN || null;
  }

  // --------------------------------------------------------------------------
  // DOMAIN SEARCH
  // --------------------------------------------------------------------------

  /**
   * Search for domain availability
   */
  async searchDomain(query: string): Promise<DomainSearchResult[]> {
    const results: DomainSearchResult[] = [];

    // Normalize query
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, '');

    // Check if query already has a TLD
    const parts = normalizedQuery.split('.');
    const hasTld =
      parts.length > 1 && Object.keys(TLD_PRICING).includes(`.${parts[parts.length - 1]}`);

    if (hasTld) {
      // Check single domain
      const result = await this.checkDomainAvailability(normalizedQuery);
      results.push(result);
    } else {
      // Check multiple TLDs
      const tldsToCheck = ['.com', '.net', '.io', '.dev', '.app', '.co'];

      const checks = tldsToCheck.map(async (tld) => {
        const domain = `${normalizedQuery}${tld}`;
        return this.checkDomainAvailability(domain);
      });

      const checkResults = await Promise.all(checks);
      results.push(...checkResults);
    }

    // Sort by availability (available first), then by price
    results.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      return (a.priceRegistrationCents || 0) - (b.priceRegistrationCents || 0);
    });

    return results;
  }

  /**
   * Check availability for a single domain
   */
  async checkDomainAvailability(domain: string): Promise<DomainSearchResult> {
    const tld = this.extractTld(domain);
    const pricing = TLD_PRICING[tld];

    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        // Return mock data for development
        console.log(`[DomainPurchaseService] Cloudflare not configured, returning mock data`);
        return this.getMockAvailability(domain, tld, pricing);
      }

      // Call Cloudflare Registrar API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains/${domain}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // 404 typically means domain is available for registration
        if (response.status === 404) {
          return {
            domain,
            tld,
            available: true,
            status: 'available',
            priceRegistrationCents: pricing?.registration,
            priceRenewalCents: pricing?.renewal,
          };
        }

        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json();

      // Domain exists in account - check its status
      return {
        domain,
        tld,
        available: false,
        status: 'taken',
        priceRegistrationCents: pricing?.registration,
        priceRenewalCents: pricing?.renewal,
      };
    } catch (error) {
      console.error(`[DomainPurchaseService] Error checking domain:`, error);

      return {
        domain,
        tld,
        available: false,
        status: 'error',
      };
    }
  }

  // --------------------------------------------------------------------------
  // DOMAIN PURCHASE
  // --------------------------------------------------------------------------

  /**
   * Purchase a domain via Cloudflare Registrar
   */
  async purchaseDomain(
    userId: string,
    request: DomainPurchaseRequest
  ): Promise<DomainPurchaseResult> {
    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        return {
          success: false,
          error: 'Cloudflare Registrar not configured',
        };
      }

      // Validate domain is available
      const availability = await this.checkDomainAvailability(request.domain);
      if (!availability.available) {
        return {
          success: false,
          error: 'Domain is not available for registration',
        };
      }

      // Calculate total price
      const tld = this.extractTld(request.domain);
      const pricing = TLD_PRICING[tld];
      const totalCents = (pricing?.registration || 0) * request.years;

      // Register domain via Cloudflare API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: request.domain,
            auto_renew: request.autoRenew,
            privacy: request.privacyProtection,
            years: request.years,
            contacts: this.formatRegistrantContact(request.registrantContact),
            nameservers: request.nameservers,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Registration failed');
      }

      const data = await response.json();

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + request.years);

      return {
        success: true,
        domain: request.domain,
        registrationId: data.result?.id,
        expiresAt: expiresAt.toISOString(),
        totalPaidCents: totalCents,
      };
    } catch (error) {
      console.error(`[DomainPurchaseService] Error purchasing domain:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Domain purchase failed',
      };
    }
  }

  // --------------------------------------------------------------------------
  // DOMAIN TRANSFER
  // --------------------------------------------------------------------------

  /**
   * Initiate a domain transfer to Cloudflare
   */
  async initiateTransfer(
    userId: string,
    request: DomainTransferRequest
  ): Promise<DomainTransferResult> {
    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        return {
          success: false,
          error: 'Cloudflare Registrar not configured',
        };
      }

      // Validate auth code format
      if (!request.authCode || request.authCode.length < 4) {
        return {
          success: false,
          error: 'Invalid authorization code',
        };
      }

      // Initiate transfer via Cloudflare API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains/${request.domain}/transfer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auth_code: request.authCode,
            auto_renew: request.autoRenew,
            privacy: request.privacyProtection,
            contacts: request.registrantContact
              ? this.formatRegistrantContact(request.registrantContact)
              : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Transfer initiation failed');
      }

      const data = await response.json();

      return {
        success: true,
        transferId: data.result?.id,
        domain: request.domain,
        status: 'pending',
        estimatedCompletionDays: 5, // Typical transfer time
      };
    } catch (error) {
      console.error(`[DomainPurchaseService] Error initiating transfer:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer initiation failed',
      };
    }
  }

  /**
   * Check transfer status
   */
  async getTransferStatus(domain: string): Promise<{
    status: TransferStatus;
    message?: string;
    completedAt?: string;
  }> {
    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        return {
          status: 'pending',
          message: 'Cloudflare Registrar not configured',
        };
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          status: 'pending',
          message: 'Transfer in progress',
        };
      }

      const data = await response.json();
      const transferStatus = data.result?.transfer_in?.status;

      // Map Cloudflare status to our status
      const statusMap: Record<string, TransferStatus> = {
        pending: 'pending',
        pending_registry: 'processing',
        pending_approval: 'pending_approval',
        approved: 'approved',
        complete: 'completed',
        rejected: 'rejected',
        cancelled: 'cancelled',
      };

      return {
        status: statusMap[transferStatus] || 'pending',
        message: data.result?.transfer_in?.message,
        completedAt: transferStatus === 'complete' ? new Date().toISOString() : undefined,
      };
    } catch (error) {
      console.error(`[DomainPurchaseService] Error checking transfer status:`, error);

      return {
        status: 'pending',
        message: 'Unable to check transfer status',
      };
    }
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(domain: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        return {
          success: false,
          error: 'Cloudflare Registrar not configured',
        };
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains/${domain}/transfer`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Cancel failed');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel transfer',
      };
    }
  }

  // --------------------------------------------------------------------------
  // DOMAIN MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get domain info for a registered domain
   */
  async getDomainInfo(domain: string): Promise<RegisteredDomainInfo | null> {
    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        return null;
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const result = data.result;

      return {
        domain: result.name,
        registrar: 'cloudflare',
        status: result.status || 'active',
        registeredAt: result.created_at,
        expiresAt: result.expires_at,
        autoRenew: result.auto_renew,
        privacyProtection: result.privacy,
        nameservers: result.name_servers || [],
        locked: result.locked || false,
      };
    } catch (error) {
      console.error(`[DomainPurchaseService] Error getting domain info:`, error);
      return null;
    }
  }

  /**
   * Update domain settings
   */
  async updateDomainSettings(
    domain: string,
    settings: {
      autoRenew?: boolean;
      locked?: boolean;
      nameservers?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
        return {
          success: false,
          error: 'Cloudflare Registrar not configured',
        };
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/registrar/domains/${domain}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            auto_renew: settings.autoRenew,
            locked: settings.locked,
            name_servers: settings.nameservers,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || 'Update failed');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update domain',
      };
    }
  }

  // --------------------------------------------------------------------------
  // PRICING
  // --------------------------------------------------------------------------

  /**
   * Get pricing for a TLD
   */
  getPricing(tld: string): { registration: number; renewal: number; transfer: number } | null {
    const normalizedTld = tld.startsWith('.') ? tld : `.${tld}`;
    return TLD_PRICING[normalizedTld] || null;
  }

  /**
   * Calculate total price for domain registration
   */
  calculateRegistrationPrice(domain: string, years: number): number {
    const tld = this.extractTld(domain);
    const pricing = TLD_PRICING[tld];

    if (!pricing) {
      return 0;
    }

    return pricing.registration * years;
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /**
   * Extract TLD from domain name
   */
  private extractTld(domain: string): string {
    const parts = domain.split('.');
    if (parts.length < 2) {
      return '';
    }
    return `.${parts[parts.length - 1]}`;
  }

  /**
   * Format registrant contact for Cloudflare API
   */
  private formatRegistrantContact(contact: RegistrantContact): Record<string, unknown> {
    return {
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      address: contact.address1,
      address2: contact.address2,
      city: contact.city,
      state: contact.state,
      zip: contact.postalCode,
      country: contact.country,
      organization: contact.organization,
    };
  }

  /**
   * Get mock availability data for development
   */
  private getMockAvailability(
    domain: string,
    tld: string,
    pricing?: { registration: number; renewal: number }
  ): DomainSearchResult {
    // Simulate some domains as taken
    const takenDomains = ['google.com', 'facebook.com', 'amazon.com', 'apple.com'];
    const isTaken = takenDomains.includes(domain.toLowerCase());

    return {
      domain,
      tld,
      available: !isTaken,
      status: isTaken ? 'taken' : 'available',
      priceRegistrationCents: pricing?.registration,
      priceRenewalCents: pricing?.renewal,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let domainPurchaseServiceInstance: DomainPurchaseService | null = null;

/**
 * Get the DomainPurchaseService singleton
 */
export function getDomainPurchaseService(): DomainPurchaseService {
  if (!domainPurchaseServiceInstance) {
    domainPurchaseServiceInstance = new DomainPurchaseService();
  }
  return domainPurchaseServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetDomainPurchaseService(): void {
  domainPurchaseServiceInstance = null;
}
