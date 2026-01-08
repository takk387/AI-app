/**
 * POST /api/domains/transfer
 *
 * Initiate transfer of an external domain to Cloudflare Registrar.
 * GET - Get transfer status for a domain.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface DomainTransferResult {
  success: boolean;
  domainId?: string;
  domain: string;
  transferStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DomainTransferRequestSchema = z.object({
  domain: z.string().min(1).max(253),
  authCode: z.string().min(1).max(255), // EPP/Auth code from current registrar
  autoRenew: z.boolean().default(true),
  deployedAppId: z.string().uuid().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initiate domain transfer through Cloudflare
 * In production, this calls the Cloudflare API
 */
async function initiateTransferToCloudflare(
  domain: string,
  _authCode: string
): Promise<{
  success: boolean;
  transferId?: string;
  error?: string;
}> {
  // In production, call Cloudflare Registrar API:
  // const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/domains/${domain}/transfer`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ auth_code: authCode })
  // });

  console.log(`[Domain Transfer] Initiating transfer for ${domain} to Cloudflare`);

  // Simulate transfer initiation - in production, this would be a real API call
  const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    success: true,
    transferId,
  };
}

/**
 * Get transfer status from Cloudflare
 * In production, this calls the Cloudflare API
 */
async function getTransferStatusFromCloudflare(domain: string): Promise<{
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
}> {
  // In production, call Cloudflare Registrar API:
  // const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/domains/${domain}`, {
  //   headers: { 'Authorization': `Bearer ${apiToken}` }
  // });

  console.log(`[Domain Transfer] Getting transfer status for ${domain}`);

  // Simulate status check - in production, this would be a real API call
  return {
    status: 'in_progress',
    message: 'Transfer in progress. This may take up to 5-7 days.',
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Initiate domain transfer
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DomainTransferRequestSchema.safeParse(body);
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

    const { domain, authCode, autoRenew, deployedAppId } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if domain is already in our system
    const { data: existingDomain } = await supabase
      .from('user_domains')
      .select('id, status, transfer_status')
      .eq('domain', domain.toLowerCase())
      .single();

    if (existingDomain) {
      if (existingDomain.transfer_status === 'in_progress') {
        return NextResponse.json(
          { success: false, error: 'Transfer already in progress for this domain' },
          { status: 409 }
        );
      }
      if (existingDomain.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'Domain is already registered in our system' },
          { status: 409 }
        );
      }
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

    // Initiate transfer with Cloudflare
    const transferResult = await initiateTransferToCloudflare(domain, authCode);

    if (!transferResult.success) {
      return NextResponse.json(
        { success: false, error: transferResult.error || 'Transfer initiation failed' },
        { status: 500 }
      );
    }

    // Create or update domain record in database
    const { data: domainRecord, error: upsertError } = await supabase
      .from('user_domains')
      .upsert(
        {
          user_id: user.id,
          deployed_app_id: deployedAppId || null,
          domain: domain.toLowerCase(),
          registrar: 'cloudflare',
          status: 'transferring',
          auto_renew: autoRenew,
          dns_configured: false,
          ssl_status: 'pending',
          transfer_status: 'in_progress',
        },
        {
          onConflict: 'domain',
        }
      )
      .select('id')
      .single();

    if (upsertError) {
      console.error('Failed to create domain transfer record:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Failed to record transfer' },
        { status: 500 }
      );
    }

    const result: DomainTransferResult = {
      success: true,
      domainId: domainRecord.id,
      domain: domain.toLowerCase(),
      transferStatus: 'in_progress',
      message:
        'Transfer initiated. You should receive an email to approve the transfer. This process typically takes 5-7 days.',
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Domain transfer error:', error);
    return NextResponse.json({ success: false, error: 'Domain transfer failed' }, { status: 500 });
  }
}

/**
 * GET - Get transfer status for a domain
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain parameter required' },
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

    // Get domain record
    const { data: domainRecord, error: queryError } = await supabase
      .from('user_domains')
      .select('*')
      .eq('domain', domain.toLowerCase())
      .eq('user_id', user.id)
      .single();

    if (queryError || !domainRecord) {
      return NextResponse.json({ success: false, error: 'Domain not found' }, { status: 404 });
    }

    // If transfer is in progress, check with Cloudflare
    let transferStatus = domainRecord.transfer_status;
    let message: string | undefined;

    if (transferStatus === 'in_progress') {
      const cloudflareStatus = await getTransferStatusFromCloudflare(domain);
      transferStatus = cloudflareStatus.status;
      message = cloudflareStatus.message;

      // Update status if changed
      if (cloudflareStatus.status !== domainRecord.transfer_status) {
        await supabase
          .from('user_domains')
          .update({
            transfer_status: cloudflareStatus.status,
            status: cloudflareStatus.status === 'completed' ? 'active' : domainRecord.status,
          })
          .eq('id', domainRecord.id);
      }
    }

    return NextResponse.json({
      success: true,
      domain: domainRecord.domain,
      domainId: domainRecord.id,
      transferStatus,
      status: domainRecord.status,
      registrar: domainRecord.registrar,
      message,
    });
  } catch (error) {
    console.error('Transfer status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get transfer status' },
      { status: 500 }
    );
  }
}
