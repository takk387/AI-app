/**
 * Current Usage API Route
 *
 * Returns the current billing period's API usage and limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsageTrackingService } from '@/services/api-gateway';

/**
 * GET /api/usage/current
 *
 * Get current period usage for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header or auth
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing required header: x-user-id' }, { status: 400 });
    }

    const usageTrackingService = getUsageTrackingService();
    const currentUsage = await usageTrackingService.getCurrentUsage(userId);

    return NextResponse.json({
      success: true,
      data: currentUsage,
    });
  } catch (error) {
    console.error('[Usage Current] Error:', error);
    return NextResponse.json({ error: 'Failed to get current usage' }, { status: 500 });
  }
}
