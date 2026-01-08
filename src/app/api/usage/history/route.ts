/**
 * Usage History API Route
 *
 * Returns historical API usage data for past billing periods.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUsageTrackingService } from '@/services/api-gateway';

/**
 * GET /api/usage/history
 *
 * Get usage history for the authenticated user
 *
 * Query params:
 * - months: Number of months of history (default: 6, max: 24)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header or auth
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing required header: x-user-id' }, { status: 400 });
    }

    // Get months param
    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');
    const months = Math.min(24, Math.max(1, parseInt(monthsParam || '6', 10)));

    const usageTrackingService = getUsageTrackingService();
    const history = await usageTrackingService.getUsageHistory(userId, months);

    return NextResponse.json({
      success: true,
      data: {
        months,
        history,
      },
    });
  } catch (error) {
    console.error('[Usage History] Error:', error);
    return NextResponse.json({ error: 'Failed to get usage history' }, { status: 500 });
  }
}
