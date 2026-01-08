/**
 * Subscription Types
 *
 * Type definitions for user subscriptions, pricing tiers, and usage limits.
 */

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

/**
 * Available subscription tiers
 */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

/**
 * Tier limits configuration
 */
export interface TierLimits {
  tier: SubscriptionTier;
  maxDeployedApps: number;
  maxCustomDomains: number;
  spendLimitCents: number;
  /** Monthly base price in cents */
  monthlyPriceCents: number;
  /** Features included in this tier */
  features: string[];
}

/**
 * All tier configurations
 */
export const TIER_CONFIGS: Record<SubscriptionTier, TierLimits> = {
  free: {
    tier: 'free',
    maxDeployedApps: 0,
    maxCustomDomains: 0,
    spendLimitCents: 0,
    monthlyPriceCents: 0,
    features: ['AI App Builder', 'Preview deployments', 'Export to ZIP'],
  },
  starter: {
    tier: 'starter',
    maxDeployedApps: 3,
    maxCustomDomains: 1,
    spendLimitCents: 5000, // $50
    monthlyPriceCents: 1900, // $19
    features: [
      'All Free features',
      '3 deployed apps',
      '1 custom domain',
      '$50 API usage included',
      'Email support',
    ],
  },
  pro: {
    tier: 'pro',
    maxDeployedApps: 10,
    maxCustomDomains: 5,
    spendLimitCents: 20000, // $200
    monthlyPriceCents: 4900, // $49
    features: [
      'All Starter features',
      '10 deployed apps',
      '5 custom domains',
      '$200 API usage included',
      'Priority support',
      'Analytics dashboard',
    ],
  },
  business: {
    tier: 'business',
    maxDeployedApps: 25,
    maxCustomDomains: 15,
    spendLimitCents: 50000, // $500
    monthlyPriceCents: 9900, // $99
    features: [
      'All Pro features',
      '25 deployed apps',
      '15 custom domains',
      '$500 API usage included',
      'Team collaboration',
      'White-label options',
    ],
  },
  enterprise: {
    tier: 'enterprise',
    maxDeployedApps: -1, // Unlimited
    maxCustomDomains: -1, // Unlimited
    spendLimitCents: -1, // Unlimited (or custom)
    monthlyPriceCents: 0, // Custom pricing
    features: [
      'All Business features',
      'Unlimited deployed apps',
      'Unlimited custom domains',
      'Custom API limits',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
    ],
  },
};

// ============================================================================
// USER SUBSCRIPTION
// ============================================================================

/**
 * User subscription record
 */
export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Limits
  maxDeployedApps: number;
  maxCustomDomains: number;
  spendLimitCents: number;

  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;

  // Billing period
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEnd?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  canceledAt?: string;
}

/**
 * Subscription with current usage
 */
export interface SubscriptionWithUsage extends UserSubscription {
  currentUsage: {
    deployedApps: number;
    customDomains: number;
    currentSpendCents: number;
  };
  limits: {
    deployedAppsRemaining: number;
    customDomainsRemaining: number;
    spendRemaining: number;
    isAtDeployLimit: boolean;
    isAtDomainLimit: boolean;
    isAtSpendLimit: boolean;
  };
}

// ============================================================================
// SUBSCRIPTION OPERATIONS
// ============================================================================

/**
 * Create subscription request
 */
export interface CreateSubscriptionRequest {
  userId: string;
  tier: SubscriptionTier;
  paymentMethodId?: string;
}

/**
 * Upgrade/downgrade subscription request
 */
export interface ChangeSubscriptionRequest {
  userId: string;
  newTier: SubscriptionTier;
  immediate?: boolean;
}

/**
 * Subscription change result
 */
export interface SubscriptionChangeResult {
  success: boolean;
  subscription?: UserSubscription;
  error?: string;
  /** Amount to prorate in cents (positive = charge, negative = credit) */
  proratedAmountCents?: number;
}

// ============================================================================
// USAGE CHECKING
// ============================================================================

/**
 * Check if user can perform an action
 */
export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  remaining: number;
}

/**
 * Deployment limit check
 */
export interface DeploymentLimitCheck extends UsageCheckResult {
  type: 'deployment';
}

/**
 * Domain limit check
 */
export interface DomainLimitCheck extends UsageCheckResult {
  type: 'domain';
}

/**
 * Spend limit check
 */
export interface SpendLimitCheck extends UsageCheckResult {
  type: 'spend';
}

// ============================================================================
// STRIPE INTEGRATION TYPES
// ============================================================================

/**
 * Stripe checkout session request
 */
export interface CreateCheckoutRequest {
  userId: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe checkout session response
 */
export interface CreateCheckoutResponse {
  sessionId: string;
  url: string;
}

/**
 * Stripe portal session request
 */
export interface CreatePortalRequest {
  userId: string;
  returnUrl: string;
}

/**
 * Stripe portal session response
 */
export interface CreatePortalResponse {
  url: string;
}

/**
 * Update subscription request (granular fields)
 */
export interface UpdateSubscriptionRequest {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  maxDeployedApps?: number;
  maxCustomDomains?: number;
  spendLimitCents?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  canceledAt?: string;
}
