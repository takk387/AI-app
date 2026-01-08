/**
 * POST /api/domains/check
 *
 * Validate and check domain availability/configuration.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getDomainService } from '@/services/deployment';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DomainCheckRequestSchema = z.object({
  domain: z.string().min(1).max(253),
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Validate a domain name
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DomainCheckRequestSchema.safeParse(body);
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

    const { domain } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Validate domain
    const domainService = getDomainService();
    const validation = domainService.validateDomain(domain);

    return NextResponse.json({
      success: true,
      domain,
      validation,
    });
  } catch (error) {
    console.error('Domain check error:', error);
    return NextResponse.json({ success: false, error: 'Domain check failed' }, { status: 500 });
  }
}

/**
 * GET - Get domain status
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

    // Get domain status
    const domainService = getDomainService();
    const status = await domainService.getDomainStatus(domain);
    const verification = await domainService.verifyDomain(domain);

    return NextResponse.json({
      success: true,
      domain,
      status,
      verification,
    });
  } catch (error) {
    console.error('Domain status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get domain status' },
      { status: 500 }
    );
  }
}
