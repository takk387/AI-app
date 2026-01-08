/**
 * POST /api/domains/purchase
 *
 * Purchase a domain through Cloudflare Registrar.
 * Creates a domain record and initiates the registration process.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface DomainPurchaseResult {
  success: boolean;
  domainId?: string;
  domain: string;
  status: 'pending' | 'active' | 'failed';
  registrar: 'cloudflare';
  expiresAt?: string;
  error?: string;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DomainPurchaseRequestSchema = z.object({
  domain: z.string().min(1).max(253),
  autoRenew: z.boolean().default(true),
  deployedAppId: z.string().uuid().optional(),
  registrantInfo: z
    .object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
      phone: z.string().optional(),
      address1: z.string().min(1).max(200),
      address2: z.string().max(200).optional(),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      postalCode: z.string().min(1).max(20),
      country: z.string().length(2), // ISO 3166-1 alpha-2
    })
    .optional(),
});

// ============================================================================
// CONSTANTS
// ============================================================================

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
 * Get TLD from domain
 */
function getTLD(domain: string): string {
  const parts = domain.split('.');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Purchase domain through Cloudflare Registrar
 * In production, this calls the Cloudflare API
 */
async function purchaseDomainFromCloudflare(
  domain: string,
  _autoRenew: boolean,
  _registrantInfo?: z.infer<typeof DomainPurchaseRequestSchema>['registrantInfo']
): Promise<{
  success: boolean;
  registrationId?: string;
  expiresAt?: string;
  error?: string;
}> {
  // In production, call Cloudflare Registrar API:
  // const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/domains`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     name: domain,
  //     auto_renew: autoRenew,
  //     registrant: registrantInfo,
  //   })
  // });

  console.log(`[Domain Purchase] Purchasing domain ${domain} from Cloudflare`);

  // Simulate purchase - in production, this would be a real API call
  const registrationId = `cf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  return {
    success: true,
    registrationId,
    expiresAt,
  };
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

/**
 * POST - Purchase a domain
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DomainPurchaseRequestSchema.safeParse(body);
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

    const { domain, autoRenew, deployedAppId, registrantInfo } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if domain is already owned
    const { data: existingDomain } = await supabase
      .from('user_domains')
      .select('id')
      .eq('domain', domain.toLowerCase())
      .single();

    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: 'Domain is already registered' },
        { status: 409 }
      );
    }

    // Get pricing
    const tld = getTLD(domain);
    const pricing = TLD_PRICING[tld];
    if (!pricing) {
      return NextResponse.json(
        { success: false, error: `TLD .${tld} is not supported` },
        { status: 400 }
      );
    }

    // If deployedAppId provided, verify it belongs to user
    if (deployedAppId) {
      const { data: deployedApp, error: appError } = await supabase
        .from('deployed_apps')
        .select('id')
        .eq('id', deployedAppId)
        .eq('user_id', user.id)
        .single();

      if (appError || !deployedApp) {
        return NextResponse.json(
          { success: false, error: 'Invalid deployed app ID' },
          { status: 400 }
        );
      }
    }

    // Purchase domain from Cloudflare
    const purchaseResult = await purchaseDomainFromCloudflare(domain, autoRenew, registrantInfo);

    if (!purchaseResult.success) {
      return NextResponse.json(
        { success: false, error: purchaseResult.error || 'Domain purchase failed' },
        { status: 500 }
      );
    }

    // Create domain record in database
    const { data: domainRecord, error: insertError } = await supabase
      .from('user_domains')
      .insert({
        user_id: user.id,
        deployed_app_id: deployedAppId || null,
        domain: domain.toLowerCase(),
        registrar: 'cloudflare',
        status: 'active',
        registered_at: new Date().toISOString(),
        expires_at: purchaseResult.expiresAt,
        auto_renew: autoRenew,
        dns_configured: false,
        ssl_status: 'pending',
        purchase_price_cents: pricing.registration,
        renewal_price_cents: pricing.renewal,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create domain record:', insertError);
      // Domain was purchased but record failed - log for manual resolution
      return NextResponse.json(
        {
          success: true,
          warning: 'Domain purchased but record creation failed. Please contact support.',
          domain,
        },
        { status: 201 }
      );
    }

    const result: DomainPurchaseResult = {
      success: true,
      domainId: domainRecord.id,
      domain: domain.toLowerCase(),
      status: 'active',
      registrar: 'cloudflare',
      expiresAt: purchaseResult.expiresAt,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Domain purchase error:', error);
    return NextResponse.json({ success: false, error: 'Domain purchase failed' }, { status: 500 });
  }
}
