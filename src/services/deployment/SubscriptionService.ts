/**
 * SubscriptionService
 *
 * Manages user subscriptions, tier changes, and Stripe billing integration.
 */

import type {
  SubscriptionTier,
  UserSubscription,
  SubscriptionWithUsage,
  CreateSubscriptionRequest,
  ChangeSubscriptionRequest,
  SubscriptionChangeResult,
  DeploymentLimitCheck,
  DomainLimitCheck,
  SpendLimitCheck,
} from '@/types/subscription';
import { TIER_CONFIGS } from '@/types/subscription';

// Re-export for convenience
export { TIER_CONFIGS };

// ============================================================================
// SUBSCRIPTION SERVICE
// ============================================================================

export class SubscriptionService {
  private stripeSecretKey: string;

  constructor() {
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Get user's subscription
   */
  async getSubscription(userId: string): Promise<UserSubscription | null> {
    // In production, query from user_subscriptions table:
    // const { data, error } = await supabase
    //   .from('user_subscriptions')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .single();

    console.log(`[SubscriptionService] Getting subscription for user ${userId}`);

    // Return default free tier for now
    return {
      id: `sub-${userId.slice(0, 8) || 'default'}`,
      userId,
      tier: 'free',
      status: 'active',
      maxDeployedApps: 0,
      maxCustomDomains: 0,
      spendLimitCents: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get subscription with current usage stats
   */
  async getSubscriptionWithUsage(userId: string): Promise<SubscriptionWithUsage | null> {
    const subscription = await this.getSubscription(userId);
    if (!subscription) {
      return null;
    }

    // Get current usage counts
    const deployedApps = await this.countDeployedApps(userId);
    const customDomains = await this.countCustomDomains(userId);
    const currentSpendCents = await this.getCurrentMonthSpend(userId);

    // Use -1 for unlimited (Infinity can't be JSON serialized)
    const deployedAppsRemaining =
      subscription.maxDeployedApps < 0
        ? -1
        : Math.max(0, subscription.maxDeployedApps - deployedApps);
    const customDomainsRemaining =
      subscription.maxCustomDomains < 0
        ? -1
        : Math.max(0, subscription.maxCustomDomains - customDomains);
    const spendRemaining =
      subscription.spendLimitCents < 0
        ? -1
        : Math.max(0, subscription.spendLimitCents - currentSpendCents);

    return {
      ...subscription,
      currentUsage: {
        deployedApps,
        customDomains,
        currentSpendCents,
      },
      limits: {
        deployedAppsRemaining,
        customDomainsRemaining,
        spendRemaining,
        isAtDeployLimit:
          subscription.maxDeployedApps >= 0 && deployedApps >= subscription.maxDeployedApps,
        isAtDomainLimit:
          subscription.maxCustomDomains >= 0 && customDomains >= subscription.maxCustomDomains,
        isAtSpendLimit:
          subscription.spendLimitCents >= 0 && currentSpendCents >= subscription.spendLimitCents,
      },
    };
  }

  // ============================================================================
  // LIMIT CHECKING
  // ============================================================================

  /**
   * Check if user can deploy a new app
   */
  async canDeploy(userId: string): Promise<DeploymentLimitCheck> {
    const sub = await this.getSubscriptionWithUsage(userId);
    if (!sub) {
      return {
        type: 'deployment',
        allowed: false,
        reason: 'No subscription found',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }

    if (sub.status !== 'active' && sub.status !== 'trialing') {
      return {
        type: 'deployment',
        allowed: false,
        reason: 'Subscription is not active',
        currentUsage: sub.currentUsage.deployedApps,
        limit: sub.maxDeployedApps,
        remaining: 0,
      };
    }

    if (sub.limits.isAtDeployLimit) {
      return {
        type: 'deployment',
        allowed: false,
        reason: `Deployment limit reached (${sub.maxDeployedApps} apps). Please upgrade your plan.`,
        currentUsage: sub.currentUsage.deployedApps,
        limit: sub.maxDeployedApps,
        remaining: 0,
      };
    }

    return {
      type: 'deployment',
      allowed: true,
      currentUsage: sub.currentUsage.deployedApps,
      limit: sub.maxDeployedApps,
      remaining: sub.limits.deployedAppsRemaining,
    };
  }

  /**
   * Check if user can add a custom domain
   */
  async canAddDomain(userId: string): Promise<DomainLimitCheck> {
    const sub = await this.getSubscriptionWithUsage(userId);
    if (!sub) {
      return {
        type: 'domain',
        allowed: false,
        reason: 'No subscription found',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }

    if (sub.limits.isAtDomainLimit) {
      return {
        type: 'domain',
        allowed: false,
        reason: `Custom domain limit reached (${sub.maxCustomDomains} domains). Please upgrade your plan.`,
        currentUsage: sub.currentUsage.customDomains,
        limit: sub.maxCustomDomains,
        remaining: 0,
      };
    }

    return {
      type: 'domain',
      allowed: true,
      currentUsage: sub.currentUsage.customDomains,
      limit: sub.maxCustomDomains,
      remaining: sub.limits.customDomainsRemaining,
    };
  }

  /**
   * Check if user can make API request (spend limit)
   */
  async canSpend(userId: string, amountCents: number = 0): Promise<SpendLimitCheck> {
    const sub = await this.getSubscriptionWithUsage(userId);
    if (!sub) {
      return {
        type: 'spend',
        allowed: false,
        reason: 'No subscription found',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }

    // Unlimited spending (-1 indicates unlimited)
    if (sub.spendLimitCents < 0) {
      return {
        type: 'spend',
        allowed: true,
        currentUsage: sub.currentUsage.currentSpendCents,
        limit: -1,
        remaining: -1,
      };
    }

    // Check if adding this amount would exceed limit
    const wouldExceed = sub.currentUsage.currentSpendCents + amountCents > sub.spendLimitCents;

    if (sub.limits.isAtSpendLimit || wouldExceed) {
      return {
        type: 'spend',
        allowed: false,
        reason: `Monthly spend limit reached ($${(sub.spendLimitCents / 100).toFixed(2)}). Please upgrade your plan.`,
        currentUsage: sub.currentUsage.currentSpendCents,
        limit: sub.spendLimitCents,
        remaining: 0,
      };
    }

    return {
      type: 'spend',
      allowed: true,
      currentUsage: sub.currentUsage.currentSpendCents,
      limit: sub.spendLimitCents,
      remaining: sub.limits.spendRemaining,
    };
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Create a new subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionChangeResult> {
    const { userId, tier } = request;

    // Get tier config
    const tierConfig = TIER_CONFIGS[tier];
    if (!tierConfig) {
      return { success: false, error: 'Invalid tier' };
    }

    try {
      // In production:
      // 1. Create Stripe customer if not exists
      // 2. Create Stripe subscription with payment method
      // 3. Insert into user_subscriptions table

      console.log(`[SubscriptionService] Creating ${tier} subscription for user ${userId}`);

      const subscription: UserSubscription = {
        id: `sub-${Date.now()}`,
        userId,
        tier,
        status: tier === 'free' ? 'active' : 'trialing',
        maxDeployedApps: tierConfig.maxDeployedApps,
        maxCustomDomains: tierConfig.maxCustomDomains,
        spendLimitCents: tierConfig.spendLimitCents,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { success: true, subscription };
    } catch (error) {
      console.error('[SubscriptionService] Failed to create subscription:', error);
      return {
        success: false,
        error: `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Change subscription tier (upgrade/downgrade)
   */
  async changeSubscription(request: ChangeSubscriptionRequest): Promise<SubscriptionChangeResult> {
    const { userId, newTier, immediate: _immediate = false } = request;
    void _immediate; // Will be used when implementing immediate tier change

    const currentSub = await this.getSubscription(userId);
    if (!currentSub) {
      return { success: false, error: 'No existing subscription found' };
    }

    // Get new tier config
    const newTierConfig = TIER_CONFIGS[newTier];
    if (!newTierConfig) {
      return { success: false, error: 'Invalid tier' };
    }

    try {
      // Calculate proration
      const proratedAmountCents = await this.calculateProration(currentSub, newTier);

      // In production:
      // 1. Update Stripe subscription with new price
      // 2. Handle proration
      // 3. Update user_subscriptions table

      console.log(
        `[SubscriptionService] Changing subscription for user ${userId}: ${currentSub.tier} → ${newTier}`
      );

      const subscription: UserSubscription = {
        ...currentSub,
        tier: newTier,
        maxDeployedApps: newTierConfig.maxDeployedApps,
        maxCustomDomains: newTierConfig.maxCustomDomains,
        spendLimitCents: newTierConfig.spendLimitCents,
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        subscription,
        proratedAmountCents,
      };
    } catch (error) {
      console.error('[SubscriptionService] Failed to change subscription:', error);
      return {
        success: false,
        error: `Failed to change subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    _immediate: boolean = false
  ): Promise<SubscriptionChangeResult> {
    const currentSub = await this.getSubscription(userId);
    if (!currentSub) {
      return { success: false, error: 'No existing subscription found' };
    }

    try {
      // In production:
      // 1. Cancel Stripe subscription (immediately or at period end)
      // 2. Update user_subscriptions table

      console.log(
        `[SubscriptionService] Canceling subscription for user ${userId} (immediate: ${_immediate})`
      );

      const subscription: UserSubscription = {
        ...currentSub,
        status: _immediate ? 'canceled' : 'active', // Will be canceled at period end
        canceledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return { success: true, subscription };
    } catch (error) {
      console.error('[SubscriptionService] Failed to cancel subscription:', error);
      return {
        success: false,
        error: `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<SubscriptionChangeResult> {
    const currentSub = await this.getSubscription(userId);
    if (!currentSub) {
      return { success: false, error: 'No existing subscription found' };
    }

    if (currentSub.status !== 'canceled' && !currentSub.canceledAt) {
      return { success: false, error: 'Subscription is not canceled' };
    }

    try {
      // In production:
      // 1. Reactivate Stripe subscription
      // 2. Update user_subscriptions table

      console.log(`[SubscriptionService] Reactivating subscription for user ${userId}`);

      const subscription: UserSubscription = {
        ...currentSub,
        status: 'active',
        canceledAt: undefined,
        updatedAt: new Date().toISOString(),
      };

      return { success: true, subscription };
    } catch (error) {
      console.error('[SubscriptionService] Failed to reactivate subscription:', error);
      return {
        success: false,
        error: `Failed to reactivate subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Count user's deployed apps
   */
  private async countDeployedApps(userId: string): Promise<number> {
    // In production, query deployed_apps table
    console.log(`[SubscriptionService] Counting deployed apps for user ${userId}`);
    return 0;
  }

  /**
   * Count user's custom domains
   */
  private async countCustomDomains(userId: string): Promise<number> {
    // In production, query deployed_apps where custom_domain is not null
    console.log(`[SubscriptionService] Counting custom domains for user ${userId}`);
    return 0;
  }

  /**
   * Get current month's API spend
   */
  private async getCurrentMonthSpend(userId: string): Promise<number> {
    // In production, query api_usage_monthly for current month
    const now = new Date();
    console.log(
      `[SubscriptionService] Getting spend for user ${userId} for ${now.getFullYear()}-${now.getMonth() + 1}`
    );
    return 0;
  }

  /**
   * Calculate proration amount for tier change
   */
  private async calculateProration(
    currentSub: UserSubscription,
    newTier: SubscriptionTier
  ): Promise<number> {
    // In production, use Stripe's proration calculation
    const tierConfigs = TIER_CONFIGS;
    const currentConfig = tierConfigs[currentSub.tier];
    const newConfig = tierConfigs[newTier];

    if (!currentSub.currentPeriodEnd) {
      return 0;
    }

    // Simple proration: (new price - old price) * days remaining / days in period
    const now = new Date();
    const periodEnd = new Date(currentSub.currentPeriodEnd);
    const daysRemaining = Math.max(
      0,
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysInPeriod = 30; // Simplified

    const priceDiff = newConfig.monthlyPriceCents - currentConfig.monthlyPriceCents;
    return Math.round(priceDiff * (daysRemaining / daysInPeriod));
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let subscriptionServiceInstance: SubscriptionService | null = null;

/**
 * Get the SubscriptionService singleton
 */
export function getSubscriptionService(): SubscriptionService {
  if (!subscriptionServiceInstance) {
    subscriptionServiceInstance = new SubscriptionService();
  }
  return subscriptionServiceInstance;
}
