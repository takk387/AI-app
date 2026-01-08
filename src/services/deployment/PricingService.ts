/**
 * PricingService
 *
 * Manages pricing calculations, usage costs, and billing estimates.
 * Works with the API Gateway pricing to provide consistent cost calculations.
 */

import type { APIService } from '@/types/api-gateway';
import type { SubscriptionTier, TierLimits } from '@/types/subscription';
import { TIER_CONFIGS } from '@/types/subscription';

// ============================================================================
// PRICING TYPES
// ============================================================================

/**
 * Service pricing information
 */
export interface ServicePricingInfo {
  service: APIService;
  name: string;
  unit: string;
  basePricePerUnit: number; // In cents
  platformMarkupPercent: number;
  finalPricePerUnit: number; // In cents
  /** For display (e.g., "per 1K tokens") */
  unitDescription: string;
}

/**
 * Usage cost breakdown
 */
export interface UsageCostBreakdown {
  service: APIService;
  units: number;
  unitType: string;
  baseCostCents: number;
  markupCents: number;
  totalCostCents: number;
}

/**
 * Monthly cost estimate
 */
export interface MonthlyCostEstimate {
  tier: SubscriptionTier;
  basePriceCents: number;
  estimatedUsageCents: number;
  totalEstimateCents: number;
  breakdown: UsageCostBreakdown[];
}

/**
 * Deployment cost estimate
 */
export interface DeploymentCostEstimate {
  platform: 'web' | 'mobile' | 'desktop';
  databaseCostCents: number;
  hostingCostCents: number;
  estimatedMonthlyCents: number;
  breakdown: {
    item: string;
    costCents: number;
    unit: string;
  }[];
}

// ============================================================================
// SERVICE PRICING DATA
// ============================================================================

/**
 * AI model pricing (in cents per million tokens)
 * Matches the values in OpenAI/Anthropic proxy services
 */
const AI_MODEL_PRICING = {
  openai: {
    'gpt-4o': { input: 250, output: 1000 },
    'gpt-4o-mini': { input: 15, output: 60 },
    'gpt-4-turbo': { input: 1000, output: 3000 },
    'gpt-3.5-turbo': { input: 50, output: 150 },
  },
  anthropic: {
    'claude-opus-4-20250514': { input: 1500, output: 7500 },
    'claude-sonnet-4-20250514': { input: 300, output: 1500 },
    'claude-3-5-sonnet-20241022': { input: 300, output: 1500 },
    'claude-3-5-haiku-20241022': { input: 100, output: 500 },
    'claude-3-opus-20240229': { input: 1500, output: 7500 },
    'claude-3-sonnet-20240229': { input: 300, output: 1500 },
    'claude-3-haiku-20240307': { input: 25, output: 125 },
  },
} as const;

/**
 * Service pricing constants
 */
const SERVICE_PRICING: Record<
  APIService,
  { pricePerUnit: number; unit: string; markupPercent: number }
> = {
  openai: { pricePerUnit: 250, unit: '1M tokens', markupPercent: 33 }, // Average GPT-4o input
  anthropic: { pricePerUnit: 300, unit: '1M tokens', markupPercent: 33 }, // Average Claude Sonnet
  sendgrid: { pricePerUnit: 0.01, unit: 'email', markupPercent: 25 }, // $0.0001/email in cents
  resend: { pricePerUnit: 0.01, unit: 'email', markupPercent: 25 },
  twilio: { pricePerUnit: 0.8, unit: 'SMS', markupPercent: 27 }, // ~$0.008/SMS
  storage: { pricePerUnit: 2, unit: 'GB', markupPercent: 33 }, // ~$0.02/GB
};

/**
 * Database provider pricing (per month)
 */
const DATABASE_PRICING = {
  turso: {
    free: { rowsRead: 9_000_000_000, rowsWritten: 25_000_000, storage: 9 * 1024 * 1024 * 1024 },
    starter: {
      costCents: 2900,
      rowsRead: Infinity,
      rowsWritten: Infinity,
      storage: 24 * 1024 * 1024 * 1024,
    },
    scaler: { costCents: 7900, rowsRead: Infinity, rowsWritten: Infinity, storage: Infinity },
  },
  neon: {
    free: { computeHours: 191.9, storage: 512 * 1024 * 1024 },
    launch: { costCents: 1900, computeHours: 300, storage: 10 * 1024 * 1024 * 1024 },
    scale: { costCents: 6900, computeHours: 750, storage: 50 * 1024 * 1024 * 1024 },
  },
};

/**
 * Hosting provider pricing (per month estimates)
 */
const HOSTING_PRICING = {
  cloudflare: {
    free: { requests: 100_000, bandwidth: 10 * 1024 * 1024 * 1024 },
    pro: { costCents: 2000, requests: 1_000_000, bandwidth: 100 * 1024 * 1024 * 1024 },
  },
  vercel: {
    hobby: { costCents: 0, bandwidth: 100 * 1024 * 1024 * 1024 },
    pro: { costCents: 2000, bandwidth: 1000 * 1024 * 1024 * 1024 },
  },
};

// ============================================================================
// PRICING SERVICE
// ============================================================================

export class PricingService {
  /**
   * Get pricing information for a service
   */
  getServicePricing(service: APIService): ServicePricingInfo {
    const pricing = SERVICE_PRICING[service];
    const finalPrice = pricing.pricePerUnit * (1 + pricing.markupPercent / 100);

    const serviceNames: Record<APIService, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      sendgrid: 'SendGrid Email',
      resend: 'Resend Email',
      twilio: 'Twilio SMS',
      storage: 'Cloud Storage',
    };

    return {
      service,
      name: serviceNames[service],
      unit: pricing.unit,
      basePricePerUnit: pricing.pricePerUnit,
      platformMarkupPercent: pricing.markupPercent,
      finalPricePerUnit: Math.ceil(finalPrice * 100) / 100, // Round to 2 decimals
      unitDescription: `per ${pricing.unit}`,
    };
  }

  /**
   * Get all service pricing
   */
  getAllServicePricing(): ServicePricingInfo[] {
    const services: APIService[] = [
      'openai',
      'anthropic',
      'sendgrid',
      'resend',
      'twilio',
      'storage',
    ];
    return services.map((service) => this.getServicePricing(service));
  }

  /**
   * Calculate cost for usage
   */
  calculateUsageCost(service: APIService, units: number, model?: string): UsageCostBreakdown {
    let baseCostCents: number;
    let unitType: string;

    if (service === 'openai' || service === 'anthropic') {
      // AI services: pricing is per million tokens
      if (model) {
        // Use model-specific pricing
        let modelPricing: { input: number; output: number } | undefined;

        if (service === 'openai') {
          modelPricing = AI_MODEL_PRICING.openai[model as keyof typeof AI_MODEL_PRICING.openai];
        } else {
          modelPricing =
            AI_MODEL_PRICING.anthropic[model as keyof typeof AI_MODEL_PRICING.anthropic];
        }

        if (modelPricing) {
          // Assume 50/50 split between input and output for estimation
          const avgPrice = (modelPricing.input + modelPricing.output) / 2;
          baseCostCents = (units / 1_000_000) * avgPrice;
        } else {
          // Unknown model, fall back to default pricing
          baseCostCents = (units / 1_000_000) * SERVICE_PRICING[service].pricePerUnit;
        }
      } else {
        // No model specified, use default pricing
        baseCostCents = (units / 1_000_000) * SERVICE_PRICING[service].pricePerUnit;
      }
      unitType = 'tokens';
    } else {
      // Non-AI services: pricing is per unit
      const pricing = SERVICE_PRICING[service];
      baseCostCents = units * pricing.pricePerUnit;
      unitType = pricing.unit;
    }

    const markupPercent = SERVICE_PRICING[service].markupPercent;
    const markupCents = baseCostCents * (markupPercent / 100);
    const totalCostCents = Math.ceil(baseCostCents + markupCents);

    return {
      service,
      units,
      unitType,
      baseCostCents: Math.ceil(baseCostCents),
      markupCents: Math.ceil(markupCents),
      totalCostCents,
    };
  }

  /**
   * Estimate monthly cost for a tier with usage projections
   */
  estimateMonthlyCost(
    tier: SubscriptionTier,
    projectedUsage: Partial<Record<APIService, number>>
  ): MonthlyCostEstimate {
    // Get tier config
    const tierConfig = TIER_CONFIGS[tier];

    const breakdown: UsageCostBreakdown[] = [];
    let estimatedUsageCents = 0;

    for (const [service, units] of Object.entries(projectedUsage)) {
      if (units && units > 0) {
        const cost = this.calculateUsageCost(service as APIService, units);
        breakdown.push(cost);
        estimatedUsageCents += cost.totalCostCents;
      }
    }

    return {
      tier,
      basePriceCents: tierConfig.monthlyPriceCents,
      estimatedUsageCents,
      totalEstimateCents: tierConfig.monthlyPriceCents + estimatedUsageCents,
      breakdown,
    };
  }

  /**
   * Estimate deployment cost
   */
  estimateDeploymentCost(
    platform: 'web' | 'mobile' | 'desktop',
    options: {
      databaseProvider?: 'turso' | 'neon' | 'byo';
      hostingProvider?: 'cloudflare' | 'vercel';
      expectedMonthlyRequests?: number;
      expectedStorageBytes?: number;
    }
  ): DeploymentCostEstimate {
    const breakdown: { item: string; costCents: number; unit: string }[] = [];
    let databaseCostCents = 0;
    let hostingCostCents = 0;

    if (platform === 'web') {
      // Database cost
      if (options.databaseProvider === 'turso') {
        // Turso has a generous free tier
        const expectedStorage = options.expectedStorageBytes || 0;
        if (expectedStorage > DATABASE_PRICING.turso.free.storage) {
          databaseCostCents = DATABASE_PRICING.turso.starter.costCents;
          breakdown.push({ item: 'Turso Starter', costCents: databaseCostCents, unit: 'month' });
        } else {
          breakdown.push({ item: 'Turso Free', costCents: 0, unit: 'month' });
        }
      } else if (options.databaseProvider === 'neon') {
        // Neon free tier
        const expectedStorage = options.expectedStorageBytes || 0;
        if (expectedStorage > DATABASE_PRICING.neon.free.storage) {
          databaseCostCents = DATABASE_PRICING.neon.launch.costCents;
          breakdown.push({ item: 'Neon Launch', costCents: databaseCostCents, unit: 'month' });
        } else {
          breakdown.push({ item: 'Neon Free', costCents: 0, unit: 'month' });
        }
      }

      // Hosting cost
      if (options.hostingProvider === 'cloudflare') {
        const expectedRequests = options.expectedMonthlyRequests || 0;
        if (expectedRequests > HOSTING_PRICING.cloudflare.free.requests) {
          hostingCostCents = HOSTING_PRICING.cloudflare.pro.costCents;
          breakdown.push({ item: 'Cloudflare Pro', costCents: hostingCostCents, unit: 'month' });
        } else {
          breakdown.push({ item: 'Cloudflare Free', costCents: 0, unit: 'month' });
        }
      } else if (options.hostingProvider === 'vercel') {
        breakdown.push({ item: 'Vercel Hobby', costCents: 0, unit: 'month' });
      }
    } else if (platform === 'mobile') {
      // EAS Build costs (Expo Application Services)
      breakdown.push({ item: 'EAS Build (per build)', costCents: 100, unit: 'build' });
      breakdown.push({ item: 'App Store ($99/year)', costCents: 825, unit: 'month' });
      breakdown.push({ item: 'Play Store ($25 one-time)', costCents: 0, unit: 'month' });
      hostingCostCents = 925; // Average monthly for stores
    } else if (platform === 'desktop') {
      // Tauri builds are free, just hosting for updates
      breakdown.push({ item: 'Update hosting', costCents: 0, unit: 'month' });
    }

    return {
      platform,
      databaseCostCents,
      hostingCostCents,
      estimatedMonthlyCents: databaseCostCents + hostingCostCents,
      breakdown,
    };
  }

  /**
   * Get tier comparison for upgrade prompts
   */
  getTierComparison(
    currentTier: SubscriptionTier,
    targetTier: SubscriptionTier
  ): {
    current: TierLimits;
    target: TierLimits;
    priceDifferenceCents: number;
    additionalFeatures: string[];
  } {
    const current = TIER_CONFIGS[currentTier];
    const target = TIER_CONFIGS[targetTier];

    // Find features in target that aren't in current
    const additionalFeatures = target.features.filter((f) => !current.features.includes(f));

    return {
      current,
      target,
      priceDifferenceCents: target.monthlyPriceCents - current.monthlyPriceCents,
      additionalFeatures,
    };
  }

  /**
   * Format price for display
   */
  formatPrice(cents: number): string {
    if (cents === 0) return 'Free';
    if (cents < 100) return `$0.${cents.toString().padStart(2, '0')}`;
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Format large numbers with units
   */
  formatUnits(value: number, unit: string): string {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B ${unit}`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M ${unit}`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K ${unit}`;
    }
    return `${value} ${unit}`;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let pricingServiceInstance: PricingService | null = null;

/**
 * Get the PricingService singleton
 */
export function getPricingService(): PricingService {
  if (!pricingServiceInstance) {
    pricingServiceInstance = new PricingService();
  }
  return pricingServiceInstance;
}
