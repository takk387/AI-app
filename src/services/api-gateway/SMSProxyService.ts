/**
 * SMSProxyService
 *
 * Proxies SMS sending via Twilio.
 * Tracks SMS usage and calculates costs.
 */

import type {
  ProxyRequestContext,
  ProxyResult,
  SMSSendRequest,
  SMSSendResult,
  IProxyService,
} from '@/types/api-gateway';
import { getUsageTrackingService } from './UsageTrackingService';

// ============================================================================
// CONSTANTS
// ============================================================================

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

/**
 * Pricing per SMS
 * Platform adds markup for managed API keys
 */
const SMS_PRICING = {
  costPerSMS: 0.0079, // $0.0079 per SMS (Twilio US pricing)
  markupPercent: 27,
  get pricePerSMS() {
    return this.costPerSMS * (1 + this.markupPercent / 100);
  },
};

// ============================================================================
// SMS PROXY SERVICE
// ============================================================================

export class SMSProxyService implements IProxyService<SMSSendRequest, SMSSendResult> {
  private platformAccountSid: string;
  private platformAuthToken: string;
  private platformPhoneNumber: string;

  constructor() {
    this.platformAccountSid = process.env.PLATFORM_TWILIO_SID || '';
    this.platformAuthToken = process.env.PLATFORM_TWILIO_TOKEN || '';
    this.platformPhoneNumber = process.env.PLATFORM_TWILIO_NUMBER || '';
  }

  /**
   * Send an SMS via Twilio
   */
  async proxy(
    request: SMSSendRequest,
    context: ProxyRequestContext
  ): Promise<ProxyResult<SMSSendResult>> {
    const credentials = context.isPlatformKey
      ? {
          accountSid: this.platformAccountSid,
          authToken: this.platformAuthToken,
          fromNumber: this.platformPhoneNumber,
        }
      : await this.getUserCredentials(context.userId);

    if (!credentials.accountSid || !credentials.authToken) {
      return {
        success: false,
        error: 'No API credentials available for SMS service',
      };
    }

    const fromNumber = request.from || credentials.fromNumber;
    if (!fromNumber) {
      return {
        success: false,
        error: 'From phone number is required',
      };
    }

    try {
      // Build Twilio request body
      const formData = new URLSearchParams({
        To: request.to,
        From: fromNumber,
        Body: request.body,
      });

      const response = await fetch(
        `${TWILIO_API_BASE}/Accounts/${credentials.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')}`,
          },
          body: formData.toString(),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: {
            success: false,
            error: responseData.message || `Twilio error: ${response.status}`,
          },
          error: responseData.message || `Twilio error: ${response.status}`,
        };
      }

      // Track usage if using platform key
      let usageInfo: ProxyResult['usage'];
      if (context.isPlatformKey) {
        usageInfo = await this.trackUsage(context, 1);
      }

      return {
        success: true,
        data: {
          success: true,
          messageId: responseData.sid,
        },
        usage: usageInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Track usage for sent SMS
   */
  async trackUsage(context: ProxyRequestContext, smsCount: number): Promise<ProxyResult['usage']> {
    const costCents = this.calculateCost(smsCount);

    const usageTrackingService = getUsageTrackingService();
    await usageTrackingService.recordUsage({
      userId: context.userId,
      appId: context.appId,
      service: 'twilio',
      endpoint: context.endpoint,
      units: smsCount,
      unitType: 'sms',
      costCents,
    });

    return {
      units: smsCount,
      unitType: 'sms',
      costCents,
    };
  }

  /**
   * Calculate cost in cents for SMS count
   */
  calculateCost(smsCount: number): number {
    const cost = smsCount * SMS_PRICING.pricePerSMS;
    return Math.max(1, Math.ceil(cost * 100));
  }

  /**
   * Validate phone number format (basic E.164 validation)
   */
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate SMS request
   */
  validateRequest(request: SMSSendRequest): { valid: boolean; error?: string } {
    if (!request.to) {
      return { valid: false, error: 'Recipient phone number is required' };
    }

    if (!this.validatePhoneNumber(request.to)) {
      return {
        valid: false,
        error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
      };
    }

    if (!request.body || request.body.trim().length === 0) {
      return { valid: false, error: 'Message body is required' };
    }

    if (request.body.length > 1600) {
      return { valid: false, error: 'Message body exceeds maximum length of 1600 characters' };
    }

    return { valid: true };
  }

  /**
   * Get SMS segment count for a message
   * Standard SMS is 160 chars, but varies with encoding
   */
  getSegmentCount(body: string): number {
    const GSM_CHARS_PER_SEGMENT = 160;
    const UNICODE_CHARS_PER_SEGMENT = 70;

    // Check if message contains non-GSM characters
    const gsmRegex =
      /^[@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ !"#¤%&'()*+,\-.\/0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà\r\n]*$/;
    const isGSM = gsmRegex.test(body);

    const charsPerSegment = isGSM ? GSM_CHARS_PER_SEGMENT : UNICODE_CHARS_PER_SEGMENT;
    return Math.ceil(body.length / charsPerSegment);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get user's own Twilio credentials if they provided them
   */
  private async getUserCredentials(userId: string): Promise<{
    accountSid: string;
    authToken: string;
    fromNumber: string;
  }> {
    // In production, query from app_api_config table
    console.log(`[SMSProxyService] Getting user credentials for ${userId}`);
    return {
      accountSid: '',
      authToken: '',
      fromNumber: '',
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let smsProxyServiceInstance: SMSProxyService | null = null;

/**
 * Get the SMSProxyService singleton
 */
export function getSMSProxyService(): SMSProxyService {
  if (!smsProxyServiceInstance) {
    smsProxyServiceInstance = new SMSProxyService();
  }
  return smsProxyServiceInstance;
}
