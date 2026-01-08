/**
 * BillingService
 *
 * Handles Stripe metered billing for API usage.
 * Reports usage to Stripe and manages invoices.
 */

import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import type {
  MeteredBillingRecord,
  InvoiceSummary,
  IBillingService,
  APIService,
} from '@/types/api-gateway';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Stripe price IDs for each service (configured via environment)
 */
const STRIPE_PRICE_IDS: Record<APIService, string | undefined> = {
  openai: process.env.STRIPE_PRICE_OPENAI,
  anthropic: process.env.STRIPE_PRICE_ANTHROPIC,
  sendgrid: process.env.STRIPE_PRICE_EMAIL,
  resend: process.env.STRIPE_PRICE_EMAIL,
  twilio: process.env.STRIPE_PRICE_SMS,
  storage: process.env.STRIPE_PRICE_STORAGE,
};

// ============================================================================
// BILLING SERVICE
// ============================================================================

export class BillingService implements IBillingService {
  private stripe: Stripe | null = null;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    } else {
      console.warn('[BillingService] STRIPE_SECRET_KEY not configured');
    }
  }

  /**
   * Report usage to Stripe for metered billing using Billing Meter Events
   */
  async reportUsage(record: MeteredBillingRecord): Promise<void> {
    if (!this.stripe) {
      console.log('[BillingService] Stripe not configured, skipping usage report');
      return;
    }

    if (!record.stripeCustomerId) {
      console.log('[BillingService] No customer ID, skipping usage report');
      return;
    }

    try {
      // Use Billing Meter Events API for usage-based billing
      await this.stripe.billing.meterEvents.create({
        event_name: `${record.service}_usage`,
        payload: {
          stripe_customer_id: record.stripeCustomerId,
          value: String(record.quantity),
        },
        timestamp: Math.floor(new Date(record.timestamp).getTime() / 1000),
      });

      console.log('[BillingService] Reported usage to Stripe:', {
        userId: record.userId,
        service: record.service,
        quantity: record.quantity,
        customerId: record.stripeCustomerId,
      });
    } catch (error) {
      console.error('[BillingService] Failed to report usage:', error);
      throw new Error(
        `Failed to report usage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all invoices for a user
   */
  async getInvoices(userId: string): Promise<InvoiceSummary[]> {
    if (!this.stripe) {
      return [];
    }

    try {
      const stripeCustomerId = await this.getStripeCustomerId(userId);
      if (!stripeCustomerId) {
        return [];
      }

      const invoices = await this.stripe.invoices.list({
        customer: stripeCustomerId,
        limit: 24,
      });

      return invoices.data.map((invoice) => this.mapInvoiceToSummary(invoice, userId));
    } catch (error) {
      console.error('[BillingService] Failed to get invoices:', error);
      return [];
    }
  }

  /**
   * Get the current (upcoming) invoice
   */
  async getCurrentInvoice(userId: string): Promise<InvoiceSummary | null> {
    if (!this.stripe) {
      return null;
    }

    try {
      const stripeCustomerId = await this.getStripeCustomerId(userId);
      if (!stripeCustomerId) {
        return null;
      }

      const invoice = await this.stripe.invoices.createPreview({
        customer: stripeCustomerId,
      });

      return this.mapInvoiceToSummary(invoice, userId);
    } catch (error) {
      // Stripe throws an error if there's no upcoming invoice
      if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        return null;
      }
      console.error('[BillingService] Failed to get current invoice:', error);
      return null;
    }
  }

  /**
   * Create a Stripe customer for a new user
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<string | null> {
    if (!this.stripe) {
      return null;
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name: name || undefined,
        metadata: { userId },
      });

      console.log(`[BillingService] Created Stripe customer ${customer.id} for ${email}`);
      return customer.id;
    } catch (error) {
      console.error('[BillingService] Failed to create customer:', error);
      return null;
    }
  }

  /**
   * Create a metered subscription for a user
   */
  async createSubscription(
    stripeCustomerId: string,
    services: APIService[]
  ): Promise<{
    subscriptionId: string;
    itemIds: Record<APIService, string>;
  } | null> {
    if (!this.stripe) {
      return null;
    }

    try {
      // Build subscription items for each service
      const items: Stripe.SubscriptionCreateParams.Item[] = [];
      const serviceToPrice: Map<string, APIService> = new Map();

      for (const service of services) {
        const priceId = STRIPE_PRICE_IDS[service];
        if (priceId) {
          items.push({ price: priceId });
          serviceToPrice.set(priceId, service);
        }
      }

      if (items.length === 0) {
        console.warn('[BillingService] No price IDs configured for services');
        return null;
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        items,
        payment_behavior: 'default_incomplete',
      });

      // Map subscription items to services
      const itemIds: Partial<Record<APIService, string>> = {};
      for (const item of subscription.items.data) {
        const priceId = typeof item.price === 'string' ? item.price : item.price.id;
        const service = serviceToPrice.get(priceId);
        if (service) {
          itemIds[service] = item.id;
        }
      }

      console.log(
        `[BillingService] Created subscription ${subscription.id} for ${stripeCustomerId}`
      );
      return {
        subscriptionId: subscription.id,
        itemIds: itemIds as Record<APIService, string>,
      };
    } catch (error) {
      console.error('[BillingService] Failed to create subscription:', error);
      return null;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.stripe) {
      return false;
    }

    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
      console.log(`[BillingService] Cancelled subscription ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error('[BillingService] Failed to cancel subscription:', error);
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get Stripe customer ID from user ID
   */
  private async getStripeCustomerId(userId: string): Promise<string | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[BillingService] Error fetching Stripe customer ID:', error);
      }

      return data?.stripe_customer_id || null;
    } catch (error) {
      console.error('[BillingService] Error in getStripeCustomerId:', error);
      return null;
    }
  }

  /**
   * Map Stripe invoice to our summary format
   */
  private mapInvoiceToSummary(invoice: Stripe.Invoice, userId: string): InvoiceSummary {
    // Calculate tax as difference between total and subtotal
    const taxCents = (invoice.total || 0) - (invoice.subtotal || 0);

    return {
      userId,
      stripeInvoiceId: invoice.id || 'upcoming',
      periodStart: new Date((invoice.period_start || 0) * 1000).toISOString(),
      periodEnd: new Date((invoice.period_end || 0) * 1000).toISOString(),
      subtotalCents: invoice.subtotal || 0,
      taxCents: Math.max(0, taxCents),
      totalCents: invoice.total || 0,
      status: invoice.status || 'draft',
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : undefined,
      lineItems: (invoice.lines?.data || []).map((item: Stripe.InvoiceLineItem) =>
        this.mapLineItem(item)
      ),
    };
  }

  /**
   * Map Stripe line item to our format
   */
  private mapLineItem(item: Stripe.InvoiceLineItem): InvoiceSummary['lineItems'][0] {
    // Calculate unit amount from total amount divided by quantity
    const unitAmountCents = item.quantity ? Math.round(item.amount / item.quantity) : 0;

    return {
      service: getServiceFromDescription(item.description || '') || 'openai',
      description: item.description || '',
      quantity: item.quantity || 0,
      unitAmountCents,
      amountCents: item.amount || 0,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get service type from line item description
 */
function getServiceFromDescription(description: string): APIService | null {
  const lower = description.toLowerCase();
  if (lower.includes('openai') || lower.includes('gpt')) return 'openai';
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic';
  if (lower.includes('resend')) return 'resend';
  if (lower.includes('email') || lower.includes('sendgrid')) return 'sendgrid';
  if (lower.includes('sms') || lower.includes('twilio')) return 'twilio';
  if (lower.includes('storage')) return 'storage';
  return null;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let billingServiceInstance: BillingService | null = null;

/**
 * Get the BillingService singleton
 */
export function getBillingService(): BillingService {
  if (!billingServiceInstance) {
    billingServiceInstance = new BillingService();
  }
  return billingServiceInstance;
}
