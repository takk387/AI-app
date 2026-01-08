/**
 * POST /api/subscriptions/cancel
 *
 * Cancel user subscription.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSubscriptionService } from '@/services/deployment/SubscriptionService';

// ============================================================================
// TYPES
// ============================================================================

interface CancelRequest {
  reason?: string;
  feedback?: string;
  cancelImmediately?: boolean;
}

// ============================================================================
// POST - Cancel subscription
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

    const body: CancelRequest = await request.json();
    const { reason, feedback, cancelImmediately = false } = body;

    const subscriptionService = getSubscriptionService();

    // Get current subscription
    const currentSub = await subscriptionService.getSubscription(user.id);
    if (!currentSub) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Already on free tier
    if (currentSub.tier === 'free') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel free tier subscription' },
        { status: 400 }
      );
    }

    // Log cancellation reason/feedback (in production, store this)
    if (reason || feedback) {
      console.log(
        `[CancelSubscription] User ${user.id} cancellation - Reason: ${reason}, Feedback: ${feedback}`
      );
    }

    // Cancel subscription
    const result = await subscriptionService.cancelSubscription(user.id, cancelImmediately);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: cancelImmediately
        ? 'Subscription cancelled immediately. You have been downgraded to free tier.'
        : 'Subscription will be cancelled at the end of the billing period.',
      subscription: result.subscription,
    });
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
