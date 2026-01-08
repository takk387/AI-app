/**
 * POST /api/subscriptions/downgrade
 *
 * Downgrade user subscription to a lower tier.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSubscriptionService } from '@/services/deployment/SubscriptionService';

// ============================================================================
// TYPES
// ============================================================================

interface DowngradeRequest {
  targetTier: string;
  effectiveAt?: 'immediate' | 'end_of_period';
}

// ============================================================================
// POST - Downgrade subscription
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

    const body: DowngradeRequest = await request.json();
    const { targetTier, effectiveAt = 'end_of_period' } = body;

    // Validate target tier
    const validTiers = ['free', 'starter', 'pro', 'business'];
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

    // Check if this is actually a downgrade
    const tierOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentSub.tier);
    const targetIndex = tierOrder.indexOf(targetTier);

    if (targetIndex >= currentIndex) {
      return NextResponse.json(
        {
          success: false,
          error: 'Target tier must be lower than current tier. Use /upgrade for upgrades.',
        },
        { status: 400 }
      );
    }

    // Get usage with limits to check if downgrade is possible
    const subWithUsage = await subscriptionService.getSubscriptionWithUsage(user.id);
    if (!subWithUsage) {
      return NextResponse.json(
        { success: false, error: 'Failed to get usage information' },
        { status: 500 }
      );
    }

    // Get target tier limits from TIER_CONFIGS
    const { TIER_CONFIGS } = await import('@/types/subscription');
    const targetTierConfig = TIER_CONFIGS[targetTier as keyof typeof TIER_CONFIGS];

    // Verify user doesn't exceed target tier limits
    if (subWithUsage.currentUsage.deployedApps > targetTierConfig.maxDeployedApps) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot downgrade: You have ${subWithUsage.currentUsage.deployedApps} deployed apps, but ${targetTier} tier only allows ${targetTierConfig.maxDeployedApps}`,
          currentUsage: {
            deployedApps: subWithUsage.currentUsage.deployedApps,
            customDomains: subWithUsage.currentUsage.customDomains,
          },
          targetLimits: {
            maxDeployedApps: targetTierConfig.maxDeployedApps,
            maxCustomDomains: targetTierConfig.maxCustomDomains,
          },
        },
        { status: 400 }
      );
    }

    // Perform downgrade
    const result = await subscriptionService.changeSubscription({
      userId: user.id,
      newTier: targetTier as 'free' | 'starter' | 'pro' | 'business',
      immediate: effectiveAt === 'immediate',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to downgrade subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      effectiveAt,
      message:
        effectiveAt === 'immediate'
          ? `Successfully downgraded to ${targetTier} tier`
          : `Subscription will be downgraded to ${targetTier} at the end of the billing period`,
    });
  } catch (error) {
    console.error('Failed to downgrade subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to downgrade subscription' },
      { status: 500 }
    );
  }
}
