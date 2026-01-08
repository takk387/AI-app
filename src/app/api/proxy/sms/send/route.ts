/**
 * POST /api/proxy/sms/send
 *
 * Send SMS via Twilio using platform or user API keys.
 * Tracks usage and calculates costs for platform keys.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getSMSProxyService } from '@/services/api-gateway';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const SMSSendRequestSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1).max(1600),
  from: z.string().optional(),
  appId: z.string().uuid(),
  usePlatformKey: z.boolean().default(true),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

/**
 * POST - Send SMS
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = SMSSendRequestSchema.safeParse(body);
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

    const { to, body: smsBody, from, appId, usePlatformKey } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify app belongs to user
    const { data: app, error: appError } = await supabase
      .from('deployed_apps')
      .select('id')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ success: false, error: 'Invalid app ID' }, { status: 400 });
    }

    // Get SMS proxy service
    const smsService = getSMSProxyService();

    // Validate request
    const validation = smsService.validateRequest({ to, body: smsBody, from });
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Send SMS
    const result = await smsService.proxy(
      { to, body: smsBody, from },
      {
        userId: user.id,
        appId,
        service: 'twilio',
        endpoint: '/sms/send',
        isPlatformKey: usePlatformKey,
      }
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
      usage: result.usage,
    });
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send SMS' }, { status: 500 });
  }
}
