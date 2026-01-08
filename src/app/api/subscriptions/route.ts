/**
 * GET/POST /api/subscriptions
 *
 * Get current subscription or create a new one.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSubscriptionService } from '@/services/deployment/SubscriptionService';

// ============================================================================
// GET - Get current subscription
// ============================================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionService = getSubscriptionService();
    const subscription = await subscriptionService.getSubscription(user.id);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscription: null,
        message: 'No active subscription',
      });
    }

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create subscription (for new users)
// ============================================================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier = 'free' } = body;

    // Validate tier
    const validTiers = ['free', 'starter', 'pro', 'business', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const subscriptionService = getSubscriptionService();

    // Check if user already has a subscription
    const existing = await subscriptionService.getSubscription(user.id);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User already has a subscription. Use PUT to upgrade.' },
        { status: 400 }
      );
    }

    // Create subscription
    const result = await subscriptionService.createSubscription({ userId: user.id, tier });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
    });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
