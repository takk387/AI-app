/**
 * StripeConnectService
 *
 * Handles Stripe Connect for deployed apps that accept payments.
 * Allows apps to process payments with automatic platform fee collection.
 */

import Stripe from 'stripe';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Stripe Connect account status
 */
export type ConnectAccountStatus =
  | 'pending' // Account created but not onboarded
  | 'onboarding' // Onboarding in progress
  | 'active' // Account fully active
  | 'restricted' // Account has restrictions
  | 'disabled'; // Account disabled

/**
 * Stripe Connect account info
 */
export interface ConnectAccount {
  stripeAccountId: string;
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  country: string;
  businessType?: string;
  email?: string;
  createdAt: string;
}

/**
 * Payment intent creation request
 */
export interface CreatePaymentRequest {
  amount: number; // Amount in cents
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  applicationFeePercent?: number; // Platform fee percentage (default 5%)
}

/**
 * Payment intent result
 */
export interface CreatePaymentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Payout request
 */
export interface PayoutRequest {
  amount: number; // Amount in cents
  currency: string;
  description?: string;
}

/**
 * Payout result
 */
export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  status?: string;
  arrivalDate?: string;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PLATFORM_FEE_PERCENT = 5; // 5% platform fee

// ============================================================================
// STRIPE CONNECT SERVICE
// ============================================================================

export class StripeConnectService {
  private stripe: Stripe | null = null;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  /**
   * Create a new Stripe Connect account for a deployed app
   */
  async createConnectAccount(
    userId: string,
    appId: string,
    email: string,
    country: string = 'US'
  ): Promise<{ success: boolean; account?: ConnectAccount; error?: string }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const stripeAccount = await this.stripe.accounts.create({
        type: 'express',
        country,
        email,
        metadata: {
          user_id: userId,
          app_id: appId,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      console.log(
        `[StripeConnectService] Created Connect account ${stripeAccount.id} for app ${appId}`
      );

      const account: ConnectAccount = {
        stripeAccountId: stripeAccount.id,
        status: this.mapAccountStatus(stripeAccount),
        chargesEnabled: stripeAccount.charges_enabled || false,
        payoutsEnabled: stripeAccount.payouts_enabled || false,
        country: stripeAccount.country || country,
        email: stripeAccount.email || email,
        businessType: stripeAccount.business_type || undefined,
        createdAt: stripeAccount.created
          ? new Date(stripeAccount.created * 1000).toISOString()
          : new Date().toISOString(),
      };

      return { success: true, account };
    } catch (error) {
      console.error('[StripeConnectService] Failed to create Connect account:', error);
      return {
        success: false,
        error: `Failed to create Connect account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Map Stripe account to our status type
   */
  private mapAccountStatus(account: Stripe.Account): ConnectAccountStatus {
    if (account.charges_enabled && account.payouts_enabled) {
      return 'active';
    }
    if (account.requirements?.disabled_reason) {
      return 'disabled';
    }
    if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
      return 'onboarding';
    }
    if (account.requirements?.eventually_due && account.requirements.eventually_due.length > 0) {
      return 'restricted';
    }
    return 'pending';
  }

  /**
   * Generate onboarding link for a Connect account
   */
  async createOnboardingLink(
    stripeAccountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      console.log(`[StripeConnectService] Created onboarding link for ${stripeAccountId}`);
      return { success: true, url: accountLink.url };
    } catch (error) {
      console.error('[StripeConnectService] Failed to create onboarding link:', error);
      return {
        success: false,
        error: `Failed to create onboarding link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get Connect account status
   */
  async getAccountStatus(stripeAccountId: string): Promise<{
    success: boolean;
    account?: ConnectAccount;
    error?: string;
  }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const stripeAccount = await this.stripe.accounts.retrieve(stripeAccountId);

      const account: ConnectAccount = {
        stripeAccountId: stripeAccount.id,
        status: this.mapAccountStatus(stripeAccount),
        chargesEnabled: stripeAccount.charges_enabled || false,
        payoutsEnabled: stripeAccount.payouts_enabled || false,
        country: stripeAccount.country || 'US',
        email: stripeAccount.email || undefined,
        businessType: stripeAccount.business_type || undefined,
        createdAt: stripeAccount.created
          ? new Date(stripeAccount.created * 1000).toISOString()
          : new Date().toISOString(),
      };

      return { success: true, account };
    } catch (error) {
      console.error('[StripeConnectService] Failed to get account status:', error);
      return {
        success: false,
        error: `Failed to get account status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================================
  // PAYMENT PROCESSING
  // ============================================================================

  /**
   * Create a payment intent for the connected account
   */
  async createPaymentIntent(
    stripeAccountId: string,
    request: CreatePaymentRequest
  ): Promise<CreatePaymentResult> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    const feePercent = request.applicationFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
    const applicationFeeAmount = Math.round(request.amount * (feePercent / 100));

    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          application_fee_amount: applicationFeeAmount,
          metadata: request.metadata,
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      console.log(
        `[StripeConnectService] Created payment intent ${paymentIntent.id} for ${stripeAccountId}`
      );

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error) {
      console.error('[StripeConnectService] Failed to create payment intent:', error);
      return {
        success: false,
        error: `Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create a payout to the connected account's bank
   */
  async createPayout(stripeAccountId: string, request: PayoutRequest): Promise<PayoutResult> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const payout = await this.stripe.payouts.create(
        {
          amount: request.amount,
          currency: request.currency,
          description: request.description,
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      console.log(`[StripeConnectService] Created payout ${payout.id} for ${stripeAccountId}`);

      return {
        success: true,
        payoutId: payout.id,
        status: payout.status,
        arrivalDate: payout.arrival_date
          ? new Date(payout.arrival_date * 1000).toISOString()
          : undefined,
      };
    } catch (error) {
      console.error('[StripeConnectService] Failed to create payout:', error);
      return {
        success: false,
        error: `Failed to create payout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================================================
  // BALANCE & TRANSACTIONS
  // ============================================================================

  /**
   * Get connected account balance
   */
  async getAccountBalance(stripeAccountId: string): Promise<{
    success: boolean;
    balance?: { available: number; pending: number; currency: string }[];
    error?: string;
  }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      const balance = await this.stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });

      const formattedBalance = balance.available.map((b, idx) => ({
        available: b.amount,
        pending: balance.pending[idx]?.amount || 0,
        currency: b.currency,
      }));

      return { success: true, balance: formattedBalance };
    } catch (error) {
      console.error('[StripeConnectService] Failed to get balance:', error);
      return {
        success: false,
        error: `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Delete/Disconnect a Connect account
   */
  async deleteConnectAccount(stripeAccountId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.stripe) {
      return { success: false, error: 'Stripe is not configured' };
    }

    try {
      await this.stripe.accounts.del(stripeAccountId);
      console.log(`[StripeConnectService] Deleted Connect account ${stripeAccountId}`);
      return { success: true };
    } catch (error) {
      console.error('[StripeConnectService] Failed to delete account:', error);
      return {
        success: false,
        error: `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let stripeConnectServiceInstance: StripeConnectService | null = null;

/**
 * Get the StripeConnectService singleton
 */
export function getStripeConnectService(): StripeConnectService {
  if (!stripeConnectServiceInstance) {
    stripeConnectServiceInstance = new StripeConnectService();
  }
  return stripeConnectServiceInstance;
}
