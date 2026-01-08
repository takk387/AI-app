/**
 * EmailProxyService
 *
 * Proxies email sending via SendGrid or Resend.
 * Tracks email usage and calculates costs.
 */

import type {
  ProxyRequestContext,
  ProxyResult,
  EmailSendRequest,
  EmailSendResult,
  IProxyService,
} from '@/types/api-gateway';
import { getUsageTrackingService } from './UsageTrackingService';

// ============================================================================
// CONSTANTS
// ============================================================================

const SENDGRID_API_BASE = 'https://api.sendgrid.com/v3';

/**
 * Pricing per email
 * Platform adds markup for managed API keys
 */
const EMAIL_PRICING = {
  costPerEmail: 0.0001, // $0.0001 per email (SendGrid pricing varies by volume)
  markupPercent: 25,
  get pricePerEmail() {
    return this.costPerEmail * (1 + this.markupPercent / 100);
  },
};

// ============================================================================
// EMAIL PROXY SERVICE
// ============================================================================

export class EmailProxyService implements IProxyService<EmailSendRequest, EmailSendResult> {
  private platformApiKey: string;
  private defaultFromEmail: string;

  constructor() {
    this.platformApiKey = process.env.PLATFORM_SENDGRID_KEY || '';
    this.defaultFromEmail = process.env.PLATFORM_FROM_EMAIL || 'noreply@example.com';
  }

  /**
   * Send an email via SendGrid
   */
  async proxy(
    request: EmailSendRequest,
    context: ProxyRequestContext
  ): Promise<ProxyResult<EmailSendResult>> {
    const apiKey = context.isPlatformKey
      ? this.platformApiKey
      : await this.getUserApiKey(context.userId);

    if (!apiKey) {
      return {
        success: false,
        error: 'No API key available for email service',
      };
    }

    try {
      // Prepare recipients
      const toAddresses = Array.isArray(request.to) ? request.to : [request.to];
      const personalizations = toAddresses.map((email) => ({
        to: [{ email }],
      }));

      // Build SendGrid request
      const sendGridRequest = {
        personalizations,
        from: { email: request.from || this.defaultFromEmail },
        subject: request.subject,
        content: [
          ...(request.text ? [{ type: 'text/plain', value: request.text }] : []),
          ...(request.html ? [{ type: 'text/html', value: request.html }] : []),
        ],
        ...(request.replyTo ? { reply_to: { email: request.replyTo } } : {}),
      };

      const response = await fetch(`${SENDGRID_API_BASE}/mail/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(sendGridRequest),
      });

      // SendGrid returns 202 for accepted
      if (response.status !== 202 && !response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          data: {
            success: false,
            error: errorData.errors?.[0]?.message || `SendGrid error: ${response.status}`,
          },
          error: errorData.errors?.[0]?.message || `SendGrid error: ${response.status}`,
        };
      }

      // Get message ID from headers
      const messageId = response.headers.get('x-message-id') || undefined;

      // Track usage if using platform key
      const emailCount = toAddresses.length;
      let usageInfo: ProxyResult['usage'];
      if (context.isPlatformKey) {
        usageInfo = await this.trackUsage(context, emailCount);
      }

      return {
        success: true,
        data: {
          success: true,
          messageId,
        },
        usage: usageInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Track usage for sent emails
   */
  async trackUsage(
    context: ProxyRequestContext,
    emailCount: number
  ): Promise<ProxyResult['usage']> {
    const costCents = this.calculateCost(emailCount);

    const usageTrackingService = getUsageTrackingService();
    await usageTrackingService.recordUsage({
      userId: context.userId,
      appId: context.appId,
      service: 'sendgrid',
      endpoint: context.endpoint,
      units: emailCount,
      unitType: 'emails',
      costCents,
    });

    return {
      units: emailCount,
      unitType: 'emails',
      costCents,
    };
  }

  /**
   * Calculate cost in cents for email count
   */
  calculateCost(emailCount: number): number {
    const cost = emailCount * EMAIL_PRICING.pricePerEmail;
    // Convert to cents and round up (minimum 1 cent per email)
    return Math.max(1, Math.ceil(cost * 100));
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate email request
   */
  validateRequest(request: EmailSendRequest): { valid: boolean; error?: string } {
    // Check recipients
    const toAddresses = Array.isArray(request.to) ? request.to : [request.to];
    if (toAddresses.length === 0) {
      return { valid: false, error: 'At least one recipient is required' };
    }

    for (const email of toAddresses) {
      if (!this.validateEmail(email)) {
        return { valid: false, error: `Invalid email address: ${email}` };
      }
    }

    // Check subject
    if (!request.subject || request.subject.trim().length === 0) {
      return { valid: false, error: 'Subject is required' };
    }

    // Check content
    if (!request.text && !request.html) {
      return { valid: false, error: 'Email body (text or html) is required' };
    }

    return { valid: true };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get user's own API key if they provided one
   */
  private async getUserApiKey(userId: string): Promise<string | null> {
    // In production, query from app_api_config table
    console.log(`[EmailProxyService] Getting user API key for ${userId}`);
    return null;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let emailProxyServiceInstance: EmailProxyService | null = null;

/**
 * Get the EmailProxyService singleton
 */
export function getEmailProxyService(): EmailProxyService {
  if (!emailProxyServiceInstance) {
    emailProxyServiceInstance = new EmailProxyService();
  }
  return emailProxyServiceInstance;
}
