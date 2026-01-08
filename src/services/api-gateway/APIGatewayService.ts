/**
 * APIGatewayService
 *
 * Main orchestrator for all API proxy services.
 * Handles authentication, rate limiting, and routing to appropriate proxy services.
 */

import type {
  APIService,
  APIKeyMode,
  AppAPIConfig,
  ProxyRequestContext,
  ProxyResult,
  OpenAIChatRequest,
  AnthropicMessageRequest,
  EmailSendRequest,
  EmailSendResult,
} from '@/types/api-gateway';
import { getUsageTrackingService } from './UsageTrackingService';
import { getOpenAIProxyService } from './OpenAIProxyService';
import { getAnthropicProxyService } from './AnthropicProxyService';
import { getEmailProxyService } from './EmailProxyService';

// ============================================================================
// API GATEWAY SERVICE
// ============================================================================

export class APIGatewayService {
  /**
   * Get API configuration for an app
   */
  async getAppConfig(appId: string, userId: string): Promise<AppAPIConfig | null> {
    // In production, query from deployed_apps table
    console.log(`[APIGatewayService] Getting config for app ${appId}`);

    // Return default config
    return {
      appId,
      userId,
      services: [
        { service: 'openai', mode: 'platform', enabled: true },
        { service: 'anthropic', mode: 'platform', enabled: true },
        { service: 'sendgrid', mode: 'platform', enabled: true },
        { service: 'twilio', mode: 'platform', enabled: false },
        { service: 'storage', mode: 'platform', enabled: false },
      ],
      spendLimitCents: 10000, // $100
      pauseOnLimit: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if a service is enabled for an app
   */
  async isServiceEnabled(
    appId: string,
    userId: string,
    service: APIService
  ): Promise<{ enabled: boolean; mode: APIKeyMode }> {
    const config = await this.getAppConfig(appId, userId);
    if (!config) {
      return { enabled: false, mode: 'platform' };
    }

    const serviceConfig = config.services.find((s) => s.service === service);
    if (!serviceConfig) {
      return { enabled: false, mode: 'platform' };
    }

    return { enabled: serviceConfig.enabled, mode: serviceConfig.mode };
  }

  /**
   * Check if user can make a request (within spend limits)
   */
  async canMakeRequest(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const usageTrackingService = getUsageTrackingService();
    const limitCheck = await usageTrackingService.checkSpendLimit(userId);

    if (!limitCheck.allowed) {
      return {
        allowed: false,
        reason:
          'Monthly spend limit reached. Please upgrade your plan or wait until next billing cycle.',
      };
    }

    return { allowed: true };
  }

  /**
   * Create proxy request context
   */
  createContext(
    userId: string,
    appId: string,
    service: APIService,
    endpoint: string,
    isPlatformKey: boolean
  ): ProxyRequestContext {
    return {
      userId,
      appId,
      service,
      endpoint,
      isPlatformKey,
    };
  }

  // ============================================================================
  // OPENAI PROXY
  // ============================================================================

  /**
   * Proxy OpenAI chat completion request
   */
  async proxyOpenAI(
    request: OpenAIChatRequest,
    userId: string,
    appId: string
  ): Promise<ProxyResult<unknown>> {
    // Check if service is enabled
    const { enabled, mode } = await this.isServiceEnabled(appId, userId, 'openai');
    if (!enabled) {
      return { success: false, error: 'OpenAI is not enabled for this app' };
    }

    // Check spend limits
    const canRequest = await this.canMakeRequest(userId);
    if (!canRequest.allowed) {
      return { success: false, error: canRequest.reason };
    }

    // Create context and proxy
    const context = this.createContext(
      userId,
      appId,
      'openai',
      '/chat/completions',
      mode === 'platform'
    );

    const openaiProxy = getOpenAIProxyService();
    return openaiProxy.proxy(request, context);
  }

  /**
   * Proxy OpenAI streaming request
   */
  async proxyOpenAIStream(
    request: OpenAIChatRequest,
    userId: string,
    appId: string
  ): Promise<{ success: boolean; stream?: ReadableStream; error?: string }> {
    const { enabled, mode } = await this.isServiceEnabled(appId, userId, 'openai');
    if (!enabled) {
      return { success: false, error: 'OpenAI is not enabled for this app' };
    }

    const canRequest = await this.canMakeRequest(userId);
    if (!canRequest.allowed) {
      return { success: false, error: canRequest.reason };
    }

    const context = this.createContext(
      userId,
      appId,
      'openai',
      '/chat/completions',
      mode === 'platform'
    );

    const openaiProxy = getOpenAIProxyService();
    return openaiProxy.proxyStream(request, context);
  }

  // ============================================================================
  // ANTHROPIC PROXY
  // ============================================================================

  /**
   * Proxy Anthropic messages request
   */
  async proxyAnthropic(
    request: AnthropicMessageRequest,
    userId: string,
    appId: string
  ): Promise<ProxyResult<unknown>> {
    const { enabled, mode } = await this.isServiceEnabled(appId, userId, 'anthropic');
    if (!enabled) {
      return { success: false, error: 'Anthropic is not enabled for this app' };
    }

    const canRequest = await this.canMakeRequest(userId);
    if (!canRequest.allowed) {
      return { success: false, error: canRequest.reason };
    }

    const context = this.createContext(
      userId,
      appId,
      'anthropic',
      '/messages',
      mode === 'platform'
    );

    const anthropicProxy = getAnthropicProxyService();
    return anthropicProxy.proxy(request, context);
  }

  /**
   * Proxy Anthropic streaming request
   */
  async proxyAnthropicStream(
    request: AnthropicMessageRequest,
    userId: string,
    appId: string
  ): Promise<{ success: boolean; stream?: ReadableStream; error?: string }> {
    const { enabled, mode } = await this.isServiceEnabled(appId, userId, 'anthropic');
    if (!enabled) {
      return { success: false, error: 'Anthropic is not enabled for this app' };
    }

    const canRequest = await this.canMakeRequest(userId);
    if (!canRequest.allowed) {
      return { success: false, error: canRequest.reason };
    }

    const context = this.createContext(
      userId,
      appId,
      'anthropic',
      '/messages',
      mode === 'platform'
    );

    const anthropicProxy = getAnthropicProxyService();
    return anthropicProxy.proxyStream(request, context);
  }

  // ============================================================================
  // EMAIL PROXY
  // ============================================================================

  /**
   * Proxy email send request
   */
  async proxyEmail(
    request: EmailSendRequest,
    userId: string,
    appId: string
  ): Promise<ProxyResult<EmailSendResult>> {
    const { enabled, mode } = await this.isServiceEnabled(appId, userId, 'sendgrid');
    if (!enabled) {
      return { success: false, error: 'Email service is not enabled for this app' };
    }

    const canRequest = await this.canMakeRequest(userId);
    if (!canRequest.allowed) {
      return { success: false, error: canRequest.reason };
    }

    // Validate request
    const emailProxy = getEmailProxyService();
    const validation = emailProxy.validateRequest(request);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const context = this.createContext(
      userId,
      appId,
      'sendgrid',
      '/mail/send',
      mode === 'platform'
    );

    return emailProxy.proxy(request, context);
  }

  // ============================================================================
  // CONFIG MANAGEMENT
  // ============================================================================

  /**
   * Update API configuration for an app
   */
  async updateAppConfig(
    appId: string,
    userId: string,
    updates: Partial<AppAPIConfig>
  ): Promise<AppAPIConfig | null> {
    // In production, update deployed_apps table
    console.log(`[APIGatewayService] Updating config for app ${appId}:`, updates);

    const currentConfig = await this.getAppConfig(appId, userId);
    if (!currentConfig) {
      return null;
    }

    return {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Enable/disable a service for an app
   */
  async toggleService(
    appId: string,
    userId: string,
    service: APIService,
    enabled: boolean
  ): Promise<boolean> {
    const config = await this.getAppConfig(appId, userId);
    if (!config) {
      return false;
    }

    const serviceConfig = config.services.find((s) => s.service === service);
    if (serviceConfig) {
      serviceConfig.enabled = enabled;
    }

    await this.updateAppConfig(appId, userId, { services: config.services });
    return true;
  }

  /**
   * Set API key mode for a service
   */
  async setServiceMode(
    appId: string,
    userId: string,
    service: APIService,
    mode: APIKeyMode,
    userApiKey?: string
  ): Promise<boolean> {
    const config = await this.getAppConfig(appId, userId);
    if (!config) {
      return false;
    }

    const serviceConfig = config.services.find((s) => s.service === service);
    if (serviceConfig) {
      serviceConfig.mode = mode;
      serviceConfig.userApiKey = userApiKey;
    }

    await this.updateAppConfig(appId, userId, { services: config.services });
    return true;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let apiGatewayServiceInstance: APIGatewayService | null = null;

/**
 * Get the APIGatewayService singleton
 */
export function getAPIGatewayService(): APIGatewayService {
  if (!apiGatewayServiceInstance) {
    apiGatewayServiceInstance = new APIGatewayService();
  }
  return apiGatewayServiceInstance;
}
