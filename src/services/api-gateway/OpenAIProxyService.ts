/**
 * OpenAIProxyService
 *
 * Proxies OpenAI API requests, tracks token usage, and calculates costs.
 */

import type {
  ProxyRequestContext,
  ProxyResult,
  OpenAIChatRequest,
  OpenAIUsage,
  IProxyService,
  AIModelPricing,
} from '@/types/api-gateway';
import { getUsageTrackingService } from './UsageTrackingService';

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * Pricing per million tokens (as of 2024)
 * Platform adds markup for managed API keys
 */
const MODEL_PRICING: Record<string, AIModelPricing> = {
  'gpt-4o': {
    service: 'openai',
    model: 'gpt-4o',
    inputPricePerMillionTokens: 250, // $2.50
    outputPricePerMillionTokens: 1000, // $10.00
    markupPercent: 33,
  },
  'gpt-4o-mini': {
    service: 'openai',
    model: 'gpt-4o-mini',
    inputPricePerMillionTokens: 15, // $0.15
    outputPricePerMillionTokens: 60, // $0.60
    markupPercent: 33,
  },
  'gpt-4-turbo': {
    service: 'openai',
    model: 'gpt-4-turbo',
    inputPricePerMillionTokens: 1000, // $10.00
    outputPricePerMillionTokens: 3000, // $30.00
    markupPercent: 33,
  },
  'gpt-3.5-turbo': {
    service: 'openai',
    model: 'gpt-3.5-turbo',
    inputPricePerMillionTokens: 50, // $0.50
    outputPricePerMillionTokens: 150, // $1.50
    markupPercent: 33,
  },
};

// Default pricing for unknown models
const DEFAULT_PRICING: AIModelPricing = {
  service: 'openai',
  model: 'unknown',
  inputPricePerMillionTokens: 1000,
  outputPricePerMillionTokens: 3000,
  markupPercent: 33,
};

// ============================================================================
// OPENAI PROXY SERVICE
// ============================================================================

export class OpenAIProxyService implements IProxyService<OpenAIChatRequest, unknown> {
  private platformApiKey: string;

  constructor() {
    this.platformApiKey = process.env.PLATFORM_OPENAI_KEY || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Proxy an OpenAI chat completion request
   */
  async proxy(
    request: OpenAIChatRequest,
    context: ProxyRequestContext
  ): Promise<ProxyResult<unknown>> {
    const apiKey = context.isPlatformKey
      ? this.platformApiKey
      : await this.getUserApiKey(context.userId);

    if (!apiKey) {
      return {
        success: false,
        error: 'No API key available for OpenAI',
      };
    }

    try {
      // Make the request to OpenAI
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `OpenAI API error: ${response.status}`,
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
        error: `Failed to proxy OpenAI request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Proxy a streaming chat completion request
   */
  async proxyStream(
    request: OpenAIChatRequest,
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
        error: 'No API key available for OpenAI',
      };
    }

    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `OpenAI API error: ${response.status}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No response body for streaming',
        };
      }

      // For streaming, we track estimated usage after the stream completes
      // This would need to be handled by the caller parsing the stream
      return {
        success: true,
        stream: response.body,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to proxy OpenAI stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Track usage for a completed request
   */
  async trackUsage(
    context: ProxyRequestContext,
    model: string,
    usage: OpenAIUsage
  ): Promise<ProxyResult['usage']> {
    const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
    const costCents = this.calculateCost(usage, pricing);

    const usageTrackingService = getUsageTrackingService();
    await usageTrackingService.recordUsage({
      userId: context.userId,
      appId: context.appId,
      service: 'openai',
      endpoint: context.endpoint,
      units: usage.total_tokens,
      unitType: 'tokens',
      costCents,
      metadata: {
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      },
    });

    return {
      units: usage.total_tokens,
      unitType: 'tokens',
      costCents,
    };
  }

  /**
   * Calculate cost in cents for token usage
   */
  calculateCost(usage: OpenAIUsage, pricing: AIModelPricing): number {
    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.inputPricePerMillionTokens;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.outputPricePerMillionTokens;
    const baseCost = inputCost + outputCost;
    const withMarkup = baseCost * (1 + pricing.markupPercent / 100);

    // Round up (pricing is already in cents)
    return Math.ceil(withMarkup);
  }

  /**
   * Estimate tokens from text (rough estimate)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
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
    console.log(`[OpenAIProxyService] Getting user API key for ${userId}`);
    return null;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let openaiProxyServiceInstance: OpenAIProxyService | null = null;

/**
 * Get the OpenAIProxyService singleton
 */
export function getOpenAIProxyService(): OpenAIProxyService {
  if (!openaiProxyServiceInstance) {
    openaiProxyServiceInstance = new OpenAIProxyService();
  }
  return openaiProxyServiceInstance;
}
