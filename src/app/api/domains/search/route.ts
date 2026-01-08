/**
 * GET /api/domains/search
 *
 * Search for available domains based on a query.
 * Returns available domain names with pricing information.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface DomainSearchResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price: {
    registrationCents: number;
    renewalCents: number;
    currency: string;
  } | null;
  tld: string;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DomainSearchQuerySchema = z.object({
  query: z.string().min(1).max(63),
  tlds: z.string().optional(), // comma-separated list of TLDs
});

// ============================================================================
// CONSTANTS
// ============================================================================

// Common TLDs to search if none specified
const DEFAULT_TLDS = ['com', 'io', 'app', 'dev', 'co', 'net', 'org'];

// At-cost pricing from Cloudflare Registrar (cents)
const TLD_PRICING: Record<string, { registration: number; renewal: number }> = {
  com: { registration: 977, renewal: 977 },
  io: { registration: 3200, renewal: 3200 },
  app: { registration: 1400, renewal: 1400 },
  dev: { registration: 1200, renewal: 1200 },
  co: { registration: 1150, renewal: 1150 },
  net: { registration: 1077, renewal: 1077 },
  org: { registration: 977, renewal: 977 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a domain name is valid
 */
function isValidDomainName(name: string): boolean {
  // Domain name rules: 1-63 chars, alphanumeric and hyphens, can't start/end with hyphen
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  return domainRegex.test(name);
}

/**
 * Simulate domain availability check
 * In production, this would call Cloudflare Registrar API
 */
async function checkDomainAvailability(domain: string): Promise<{
  available: boolean;
  premium: boolean;
}> {
  // In production, call Cloudflare Registrar API:
  // const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/domains/check`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ names: [domain] })
  // });

  // Simulate availability check with some randomness
  // In production, remove this and use real API
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const isAvailable = hash % 3 !== 0; // ~66% availability for demo

  console.log(`[Domain Search] Checking availability for ${domain}: ${isAvailable}`);

  return {
    available: isAvailable,
    premium: domain.length <= 4, // Short domains are premium
  };
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

/**
 * GET - Search for available domains
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const tldsParam = url.searchParams.get('tlds');

    // Validate request
    const parseResult = DomainSearchQuerySchema.safeParse({ query, tlds: tldsParam });
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse TLDs
    const tlds = tldsParam ? tldsParam.split(',').map((t) => t.trim().toLowerCase()) : DEFAULT_TLDS;

    // Clean the query (remove spaces, special chars)
    const cleanQuery = parseResult.data.query
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');

    if (!isValidDomainName(cleanQuery)) {
      return NextResponse.json(
        { success: false, error: 'Invalid domain name format' },
        { status: 400 }
      );
    }

    // Search for available domains
    const results: DomainSearchResult[] = [];

    for (const tld of tlds) {
      const domain = `${cleanQuery}.${tld}`;
      const { available, premium } = await checkDomainAvailability(domain);
      const pricing = TLD_PRICING[tld];

      results.push({
        domain,
        available,
        premium,
        price: pricing
          ? {
              registrationCents: premium ? pricing.registration * 5 : pricing.registration,
              renewalCents: premium ? pricing.renewal * 5 : pricing.renewal,
              currency: 'USD',
            }
          : null,
        tld,
      });
    }

    // Sort: available first, then by price
    results.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      const priceA = a.price?.registrationCents ?? Infinity;
      const priceB = b.price?.registrationCents ?? Infinity;
      return priceA - priceB;
    });

    return NextResponse.json({
      success: true,
      query: cleanQuery,
      results,
      availableCount: results.filter((r) => r.available).length,
    });
  } catch (error) {
    console.error('Domain search error:', error);
    return NextResponse.json({ success: false, error: 'Domain search failed' }, { status: 500 });
  }
}
