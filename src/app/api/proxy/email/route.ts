/**
 * Email Proxy API Route
 *
 * Proxies email sending via SendGrid with usage tracking and billing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIGatewayService } from '@/services/api-gateway';
import type { EmailSendRequest } from '@/types/api-gateway';

/**
 * POST /api/proxy/email
 *
 * Send an email via the platform's email service
 */
export async function POST(request: NextRequest) {
  try {
    // Get user and app IDs from headers (set by deployed app)
    const userId = request.headers.get('x-user-id');
    const appId = request.headers.get('x-app-id');

    if (!userId || !appId) {
      return NextResponse.json(
        { error: 'Missing required headers: x-user-id, x-app-id' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = (await request.json()) as EmailSendRequest;

    if (!body.to || !body.subject) {
      return NextResponse.json({ error: 'Missing required fields: to, subject' }, { status: 400 });
    }

    if (!body.text && !body.html) {
      return NextResponse.json(
        { error: 'Email body required: provide text or html' },
        { status: 400 }
      );
    }

    const apiGateway = getAPIGatewayService();
    const result = await apiGateway.proxyEmail(body, userId, appId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return response with usage info
    return NextResponse.json({
      success: true,
      messageId: result.data?.messageId,
      _usage: result.usage,
    });
  } catch (error) {
    console.error('[Email Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
