/**
 * AnthropicProxyService
 *
 * Proxies Anthropic API requests, tracks token usage, and calculates costs.
 */

import type {
  ProxyRequestContext,
  ProxyResult,
  AnthropicMessageRequest,
  AnthropicUsage,
  IProxyService,
  AIModelPricing,
} from '@/types/api-gateway';
import { getUsageTrackingService } from './UsageTrackingService';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_API_VERSION = '2023-06-01';

/**
 * Pricing per million tokens (as of 2024)
 * Platform adds markup for managed API keys
 */
const MODEL_PRICING: Record<string, AIModelPricing> = {
  'claude-opus-4-20250514': {
    service: 'anthropic',
    model: 'claude-opus-4-20250514',
    inputPricePerMillionTokens: 1500, // $15.00
    outputPricePerMillionTokens: 7500, // $75.00
    markupPercent: 33,
  },
  'claude-sonnet-4-20250514': {
    service: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    inputPricePerMillionTokens: 300, // $3.00
    outputPricePerMillionTokens: 1500, // $15.00
    markupPercent: 33,
  },
  'claude-3-5-sonnet-20241022': {
    service: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputPricePerMillionTokens: 300, // $3.00
    outputPricePerMillionTokens: 1500, // $15.00
    markupPercent: 33,
  },
  'claude-3-5-haiku-20241022': {
    service: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    inputPricePerMillionTokens: 100, // $1.00
    outputPricePerMillionTokens: 500, // $5.00
    markupPercent: 33,
  },
  'claude-3-opus-20240229': {
    service: 'anthropic',
    model: 'claude-3-opus-20240229',
    inputPricePerMillionTokens: 1500, // $15.00
    outputPricePerMillionTokens: 7500, // $75.00
    markupPercent: 33,
  },
  'claude-3-sonnet-20240229': {
    service: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    inputPricePerMillionTokens: 300, // $3.00
    outputPricePerMillionTokens: 1500, // $15.00
    markupPercent: 33,
  },
  'claude-3-haiku-20240307': {
    service: 'anthropic',
    model: 'claude-3-haiku-20240307',
    inputPricePerMillionTokens: 25, // $0.25
    outputPricePerMillionTokens: 125, // $1.25
    markupPercent: 33,
  },
};

// Default pricing for unknown models
const DEFAULT_PRICING: AIModelPricing = {
  service: 'anthropic',
  model: 'unknown',
  inputPricePerMillionTokens: 300,
  outputPricePerMillionTokens: 1500,
  markupPercent: 33,
};

// ============================================================================
// ANTHROPIC PROXY SERVICE
// ============================================================================

export class AnthropicProxyService implements IProxyService<AnthropicMessageRequest, unknown> {
  private platformApiKey: string;

  constructor() {
    this.platformApiKey = process.env.PLATFORM_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || '';
  }

  /**
   * Proxy an Anthropic messages request
   */
  async proxy(
    request: AnthropicMessageRequest,
    context: ProxyRequestContext
  ): Promise<ProxyResult<unknown>> {
    const apiKey = context.isPlatformKey
      ? this.platformApiKey
      : await this.getUserApiKey(context.userId);

    if (!apiKey) {
      return {
        success: false,
        error: 'No API key available for Anthropic',
      };
    }

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `Anthropic API error: ${response.status}`,
        };
      }

      const data = await response.json();

      // Track usage if using platform key
      let usageInfo: ProxyResult['usage'];
      if (context.isPlatformKey && data.usage) {
        usageInfo = await this.trackUsage(context, request.model, data.usage);
      }

      return {
        success: true,
        data,
        usage: usageInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to proxy Anthropic request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Proxy a streaming messages request
   */
  async proxyStream(
    request: AnthropicMessageRequest,
    context: ProxyRequestContext
  ): Promise<{
    success: boolean;
    stream?: ReadableStream;
    error?: string;
  }> {
    const apiKey = context.isPlatformKey
      ? this.platformApiKey
      : await this.getUserApiKey(context.userId);

    if (!apiKey) {
      return {
        success: false,
        error: 'No API key available for Anthropic',
      };
    }

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `Anthropic API error: ${response.status}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No response body for streaming',
        };
      }

      return {
        success: true,
        stream: response.body,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to proxy Anthropic stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Track usage for a completed request
   */
  async trackUsage(
    context: ProxyRequestContext,
    model: string,
    usage: AnthropicUsage
  ): Promise<ProxyResult['usage']> {
    const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
    const totalTokens = usage.input_tokens + usage.output_tokens;
    const costCents = this.calculateCost(usage, pricing);

    const usageTrackingService = getUsageTrackingService();
    await usageTrackingService.recordUsage({
      userId: context.userId,
      appId: context.appId,
      service: 'anthropic',
      endpoint: context.endpoint,
      units: totalTokens,
      unitType: 'tokens',
      costCents,
      metadata: {
        model,
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
      },
    });

    return {
      units: totalTokens,
      unitType: 'tokens',
      costCents,
    };
  }

  /**
   * Calculate cost in cents for token usage
   */
  calculateCost(usage: AnthropicUsage, pricing: AIModelPricing): number {
    const inputCost = (usage.input_tokens / 1_000_000) * pricing.inputPricePerMillionTokens;
    const outputCost = (usage.output_tokens / 1_000_000) * pricing.outputPricePerMillionTokens;
    const baseCost = inputCost + outputCost;
    const withMarkup = baseCost * (1 + pricing.markupPercent / 100);

    // Round up (pricing is already in cents)
    return Math.ceil(withMarkup);
  }

  /**
   * Estimate tokens from text (rough estimate)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for Claude
    return Math.ceil(text.length / 4);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get user's own API key if they provided one
   */
  private async getUserApiKey(userId: string): Promise<string | null> {
    // In production, query from app_api_config table
    console.log(`[AnthropicProxyService] Getting user API key for ${userId}`);
    return null;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let anthropicProxyServiceInstance: AnthropicProxyService | null = null;

/**
 * Get the AnthropicProxyService singleton
 */
export function getAnthropicProxyService(): AnthropicProxyService {
  if (!anthropicProxyServiceInstance) {
    anthropicProxyServiceInstance = new AnthropicProxyService();
  }
  return anthropicProxyServiceInstance;
}
