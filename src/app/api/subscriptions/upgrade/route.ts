/**
 * POST /api/subscriptions/upgrade
 *
 * Upgrade user subscription to a higher tier.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSubscriptionService } from '@/services/deployment/SubscriptionService';
import { TIER_CONFIGS } from '@/types/subscription';

// ============================================================================
// TYPES
// ============================================================================

interface UpgradeRequest {
  targetTier: string;
  paymentMethodId?: string;
}

// ============================================================================
// POST - Upgrade subscription
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

    const body: UpgradeRequest = await request.json();
    const { targetTier, paymentMethodId } = body;

    // Validate target tier
    const validTiers = ['starter', 'pro', 'business', 'enterprise'];
    if (!validTiers.includes(targetTier)) {
      return NextResponse.json({ success: false, error: 'Invalid target tier' }, { status: 400 });
    }

    const subscriptionService = getSubscriptionService();

    // Get current subscription
    const currentSub = await subscriptionService.getSubscription(user.id);
    if (!currentSub) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Check if this is actually an upgrade
    const tierOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentSub.tier);
    const targetIndex = tierOrder.indexOf(targetTier);

    if (targetIndex <= currentIndex) {
      return NextResponse.json(
        {
          success: false,
          error: 'Target tier must be higher than current tier. Use /downgrade for downgrades.',
        },
        { status: 400 }
      );
    }

    // Get tier config for pricing
    const tierConfig = TIER_CONFIGS[targetTier as keyof typeof TIER_CONFIGS];

    // For paid tiers, require payment method (in production, integrate with Stripe)
    if (tierConfig && tierConfig.monthlyPriceCents > 0 && !paymentMethodId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method required for paid tiers',
          requiresPayment: true,
          pricing: {
            tier: targetTier,
            monthlyPriceCents: tierConfig.monthlyPriceCents,
          },
        },
        { status: 400 }
      );
    }

    // Perform upgrade
    const result = await subscriptionService.changeSubscription({
      userId: user.id,
      newTier: targetTier as 'starter' | 'pro' | 'business' | 'enterprise',
      immediate: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to upgrade subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: `Successfully upgraded to ${targetTier} tier`,
    });
  } catch (error) {
    console.error('Failed to upgrade subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
