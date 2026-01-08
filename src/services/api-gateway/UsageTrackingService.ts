/**
 * UsageTrackingService
 *
 * Tracks API usage for all proxied services.
 * Records individual requests and aggregates usage for billing.
 */

import { createClient } from '@/utils/supabase/server';
import type {
  UsageRecord,
  CurrentUsage,
  MonthlyUsageSummary,
  UsageAggregation,
  IUsageTrackingService,
  APIService,
  UsageUnitType,
} from '@/types/api-gateway';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default spend limit in cents ($100)
 */
const DEFAULT_SPEND_LIMIT_CENTS = 10000;

// ============================================================================
// USAGE TRACKING SERVICE
// ============================================================================

export class UsageTrackingService implements IUsageTrackingService {
  /**
   * Record a usage event
   */
  async recordUsage(record: Omit<UsageRecord, 'id' | 'createdAt'>): Promise<UsageRecord> {
    const usageRecord: UsageRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    // In production, this would insert into the api_usage table
    // For now, log the usage
    console.log('[UsageTrackingService] Recording usage:', {
      userId: usageRecord.userId,
      appId: usageRecord.appId,
      service: usageRecord.service,
      units: usageRecord.units,
      costCents: usageRecord.costCents,
    });

    // Store in database (placeholder)
    await this.storeUsageRecord(usageRecord);

    // Update monthly aggregation
    await this.updateMonthlyAggregation(usageRecord);

    return usageRecord;
  }

  /**
   * Get current period usage with limits
   */
  async getCurrentUsage(userId: string): Promise<CurrentUsage> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get current month's usage (placeholder)
    const usage = await this.getMonthlyUsage(userId, now.getFullYear(), now.getMonth() + 1);

    // Get user's spend limit (placeholder)
    const spendLimitCents = await this.getUserSpendLimit(userId);

    const currentSpendCents = usage.totalCostCents;
    const percentUsed =
      spendLimitCents > 0 ? Math.round((currentSpendCents / spendLimitCents) * 100) : 0;

    return {
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      usage,
      limits: {
        spendLimitCents,
        currentSpendCents,
        percentUsed,
        isAtLimit: currentSpendCents >= spendLimitCents,
      },
    };
  }

  /**
   * Get usage history for past months
   */
  async getUsageHistory(userId: string, months: number = 6): Promise<MonthlyUsageSummary[]> {
    const history: MonthlyUsageSummary[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const usage = await this.getMonthlyUsage(userId, date.getFullYear(), date.getMonth() + 1);
      history.push(usage);
    }

    return history;
  }

  /**
   * Get usage breakdown by app
   */
  async getUsageByApp(userId: string, appId: string): Promise<UsageAggregation[]> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      const supabase = await createClient();

      // Query api_usage table grouped by service for this app
      const { data, error } = await supabase
        .from('api_usage')
        .select('service, units, cost_cents, unit_type')
        .eq('user_id', userId)
        .eq('app_id', appId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (error) {
        console.error('[UsageTrackingService] Error fetching app usage:', error);
        throw error;
      }

      // Group by service and aggregate
      const serviceMap = new Map<APIService, UsageAggregation>();
      const services: APIService[] = [
        'openai',
        'anthropic',
        'sendgrid',
        'resend',
        'twilio',
        'storage',
      ];

      // Initialize all services
      for (const service of services) {
        serviceMap.set(service, {
          userId,
          appId,
          service,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          totalUnits: 0,
          unitType: getServiceUnitType(service),
          totalCostCents: 0,
          requestCount: 0,
        });
      }

      // Aggregate from query results
      if (data) {
        for (const row of data) {
          const existing = serviceMap.get(row.service as APIService);
          if (existing) {
            existing.totalUnits += row.units || 0;
            existing.totalCostCents += row.cost_cents || 0;
            existing.requestCount += 1;
          }
        }
      }

      return Array.from(serviceMap.values());
    } catch (error) {
      console.error('[UsageTrackingService] Error in getUsageByApp:', error);

      // Return empty aggregations on error
      const services: APIService[] = [
        'openai',
        'anthropic',
        'sendgrid',
        'resend',
        'twilio',
        'storage',
      ];
      return services.map((service) => ({
        userId,
        appId,
        service,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        totalUnits: 0,
        unitType: getServiceUnitType(service),
        totalCostCents: 0,
        requestCount: 0,
      }));
    }
  }

  /**
   * Check if user is within spend limit
   */
  async checkSpendLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const currentUsage = await this.getCurrentUsage(userId);
    const remaining = currentUsage.limits.spendLimitCents - currentUsage.limits.currentSpendCents;

    return {
      allowed: !currentUsage.limits.isAtLimit,
      remaining: Math.max(0, remaining),
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Store usage record in database
   */
  private async storeUsageRecord(record: UsageRecord): Promise<void> {
    try {
      const supabase = await createClient();

      const { error } = await supabase.from('api_usage').insert({
        user_id: record.userId,
        app_id: record.appId || null,
        service: record.service,
        endpoint: record.endpoint,
        units: record.units,
        unit_type: record.unitType,
        cost_cents: record.costCents,
        request_metadata: record.metadata || {},
        created_at: record.createdAt,
      });

      if (error) {
        console.error('[UsageTrackingService] Failed to store usage record:', error);
        throw error;
      }

      console.log(`[UsageTrackingService] Stored usage record for ${record.service}`);
    } catch (error) {
      console.error('[UsageTrackingService] Error storing usage record:', error);
      // Don't throw - usage tracking failures shouldn't break API calls
    }
  }

  /**
   * Update monthly aggregation
   * Note: The database has a trigger (aggregate_api_usage) that automatically
   * updates api_usage_monthly when records are inserted into api_usage.
   * This method is kept for logging/verification purposes only.
   */
  private async updateMonthlyAggregation(record: UsageRecord): Promise<void> {
    const date = new Date(record.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Aggregation is handled by database trigger on api_usage insert
    console.log(
      `[UsageTrackingService] Monthly aggregation updated via trigger for ${year}-${String(month).padStart(2, '0')}`
    );
  }

  /**
   * Get monthly usage summary
   */
  private async getMonthlyUsage(
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlyUsageSummary> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('api_usage_monthly')
        .select('*')
        .eq('user_id', userId)
        .eq('period_year', year)
        .eq('period_month', month)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for a new user/month
        console.error('[UsageTrackingService] Error fetching monthly usage:', error);
      }

      if (data) {
        return {
          userId,
          periodYear: year,
          periodMonth: month,
          openaiTokens: data.openai_tokens || 0,
          openaiCostCents: data.openai_cost_cents || 0,
          anthropicTokens: data.anthropic_tokens || 0,
          anthropicCostCents: data.anthropic_cost_cents || 0,
          emailsSent: (data.sendgrid_emails || 0) + (data.resend_emails || 0),
          emailCostCents: (data.sendgrid_cost_cents || 0) + (data.resend_cost_cents || 0),
          smsSent: data.twilio_sms || 0,
          smsCostCents: data.twilio_cost_cents || 0,
          storageBytes: data.storage_bytes || 0,
          storageCostCents: data.storage_cost_cents || 0,
          totalCostCents: data.total_cost_cents || 0,
        };
      }

      // No data found - return empty summary
      return {
        userId,
        periodYear: year,
        periodMonth: month,
        openaiTokens: 0,
        openaiCostCents: 0,
        anthropicTokens: 0,
        anthropicCostCents: 0,
        emailsSent: 0,
        emailCostCents: 0,
        smsSent: 0,
        smsCostCents: 0,
        storageBytes: 0,
        storageCostCents: 0,
        totalCostCents: 0,
      };
    } catch (error) {
      console.error('[UsageTrackingService] Error in getMonthlyUsage:', error);
      // Return empty summary on error
      return {
        userId,
        periodYear: year,
        periodMonth: month,
        openaiTokens: 0,
        openaiCostCents: 0,
        anthropicTokens: 0,
        anthropicCostCents: 0,
        emailsSent: 0,
        emailCostCents: 0,
        smsSent: 0,
        smsCostCents: 0,
        storageBytes: 0,
        storageCostCents: 0,
        totalCostCents: 0,
      };
    }
  }

  /**
   * Get user's spend limit
   */
  private async getUserSpendLimit(userId: string): Promise<number> {
    try {
      const supabase = await createClient();

      // Query user subscription for spend limit
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('api_spend_limit_cents')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[UsageTrackingService] Error fetching spend limit:', error);
      }

      if (data?.api_spend_limit_cents) {
        return data.api_spend_limit_cents;
      }

      // Fall back to default limit
      return DEFAULT_SPEND_LIMIT_CENTS;
    } catch (error) {
      console.error('[UsageTrackingService] Error in getUserSpendLimit:', error);
      return DEFAULT_SPEND_LIMIT_CENTS;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `usage-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the primary unit type for a service
 */
function getServiceUnitType(service: APIService): UsageUnitType {
  switch (service) {
    case 'openai':
    case 'anthropic':
      return 'tokens';
    case 'sendgrid':
    case 'resend':
      return 'emails';
    case 'twilio':
      return 'sms';
    case 'storage':
      return 'bytes';
    default:
      return 'requests';
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let usageTrackingServiceInstance: UsageTrackingService | null = null;

/**
 * Get the UsageTrackingService singleton
 */
export function getUsageTrackingService(): UsageTrackingService {
  if (!usageTrackingServiceInstance) {
    usageTrackingServiceInstance = new UsageTrackingService();
  }
  return usageTrackingServiceInstance;
}
