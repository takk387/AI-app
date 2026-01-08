/**
 * API Gateway Types
 *
 * Type definitions for the managed API services system including:
 * - Proxy services for OpenAI, Anthropic, Email, SMS, Storage
 * - Usage tracking and billing
 */

// ============================================================================
// SERVICE CONFIGURATION TYPES
// ============================================================================

/**
 * Supported API services that can be proxied
 */
export type APIService = 'openai' | 'anthropic' | 'sendgrid' | 'resend' | 'twilio' | 'storage';

/**
 * API key configuration - platform managed vs user provided
 */
export type APIKeyMode = 'platform' | 'byo';

/**
 * Configuration for a proxied API service
 */
export interface APIServiceConfig {
  service: APIService;
  mode: APIKeyMode;
  /** User's own API key if mode is 'byo' */
  userApiKey?: string;
  /** Whether service is enabled for the app */
  enabled: boolean;
}

/**
 * Full API configuration for a deployed app
 */
export interface AppAPIConfig {
  appId: string;
  userId: string;
  services: APIServiceConfig[];
  /** Monthly spend limit in cents */
  spendLimitCents: number;
  /** Whether to pause on limit reached */
  pauseOnLimit: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// USAGE TRACKING TYPES
// ============================================================================

/**
 * Unit types for different services
 */
export type UsageUnitType =
  | 'tokens' // AI models (input + output)
  | 'input_tokens' // AI models (input only)
  | 'output_tokens' // AI models (output only)
  | 'emails' // Email service
  | 'sms' // SMS service
  | 'bytes' // Storage
  | 'requests'; // Generic API requests

/**
 * Single usage record
 */
export interface UsageRecord {
  id: string;
  userId: string;
  appId: string;
  service: APIService;
  endpoint: string;
  units: number;
  unitType: UsageUnitType;
  costCents: number;
  /** Additional metadata about the request */
  metadata?: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    recipient?: string;
    fileSize?: number;
    [key: string]: unknown;
  };
  createdAt: string;
}

/**
 * Aggregated usage for a time period
 */
export interface UsageAggregation {
  userId: string;
  appId?: string;
  service: APIService;
  periodStart: string;
  periodEnd: string;
  totalUnits: number;
  unitType: UsageUnitType;
  totalCostCents: number;
  requestCount: number;
}

/**
 * Monthly usage summary
 */
export interface MonthlyUsageSummary {
  userId: string;
  periodYear: number;
  periodMonth: number;

  // AI Services
  openaiTokens: number;
  openaiCostCents: number;
  anthropicTokens: number;
  anthropicCostCents: number;

  // Communication Services
  emailsSent: number;
  emailCostCents: number;
  smsSent: number;
  smsCostCents: number;

  // Storage
  storageBytes: number;
  storageCostCents: number;

  // Totals
  totalCostCents: number;

  // Billing
  stripeInvoiceId?: string;
  invoicedAt?: string;
  paidAt?: string;
}

/**
 * Current period usage with limits
 */
export interface CurrentUsage {
  userId: string;
  periodStart: string;
  periodEnd: string;
  usage: MonthlyUsageSummary;
  limits: {
    spendLimitCents: number;
    currentSpendCents: number;
    percentUsed: number;
    isAtLimit: boolean;
  };
}

// ============================================================================
// PRICING TYPES
// ============================================================================

/**
 * Pricing configuration for a service
 */
export interface ServicePricing {
  service: APIService;
  /** Cost per unit in cents (e.g., per 1K tokens) */
  costPerUnit: number;
  /** Number of units in the base (e.g., 1000 for "per 1K tokens") */
  unitBase: number;
  unitType: UsageUnitType;
  /** Platform markup percentage */
  markupPercent: number;
  /** Final price per unit base in cents */
  pricePerUnit: number;
}

/**
 * Model-specific pricing for AI services
 */
export interface AIModelPricing {
  service: 'openai' | 'anthropic';
  model: string;
  inputPricePerMillionTokens: number;
  outputPricePerMillionTokens: number;
  /** Platform markup percentage */
  markupPercent: number;
}

// ============================================================================
// PROXY REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Proxy request context
 */
export interface ProxyRequestContext {
  userId: string;
  appId: string;
  service: APIService;
  endpoint: string;
  /** Whether using platform API key */
  isPlatformKey: boolean;
}

/**
 * Result from a proxied request
 */
export interface ProxyResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** Usage recorded for this request */
  usage?: {
    units: number;
    unitType: UsageUnitType;
    costCents: number;
  };
}

// ============================================================================
// OPENAI SPECIFIC TYPES
// ============================================================================

/**
 * OpenAI chat completion request (simplified)
 */
export interface OpenAIChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * OpenAI usage from response
 */
export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ============================================================================
// ANTHROPIC SPECIFIC TYPES
// ============================================================================

/**
 * Anthropic message request (simplified)
 */
export interface AnthropicMessageRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  max_tokens: number;
  system?: string;
}

/**
 * Anthropic usage from response
 */
export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

// ============================================================================
// EMAIL TYPES
// ============================================================================

/**
 * Email send request
 */
export interface EmailSendRequest {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// SMS TYPES
// ============================================================================

/**
 * SMS send request
 */
export interface SMSSendRequest {
  to: string;
  body: string;
  from?: string;
}

/**
 * SMS send result
 */
export interface SMSSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// STORAGE TYPES
// ============================================================================

/**
 * Storage upload request metadata
 */
export interface StorageUploadRequest {
  fileName: string;
  contentType: string;
  size: number;
  /** Optional folder path */
  folder?: string;
  /** Whether file is public */
  isPublic?: boolean;
}

/**
 * Storage upload result
 */
export interface StorageUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  size?: number;
  error?: string;
}

// ============================================================================
// BILLING TYPES
// ============================================================================

/**
 * Stripe metered billing record
 */
export interface MeteredBillingRecord {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSubscriptionItemId: string;
  service: APIService;
  quantity: number;
  timestamp: string;
}

/**
 * Invoice summary
 */
export interface InvoiceSummary {
  userId: string;
  stripeInvoiceId: string;
  periodStart: string;
  periodEnd: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  paidAt?: string;
  lineItems: Array<{
    service: APIService;
    description: string;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
  }>;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Interface for usage tracking service
 */
export interface IUsageTrackingService {
  recordUsage(record: Omit<UsageRecord, 'id' | 'createdAt'>): Promise<UsageRecord>;
  getCurrentUsage(userId: string): Promise<CurrentUsage>;
  getUsageHistory(userId: string, months?: number): Promise<MonthlyUsageSummary[]>;
  getUsageByApp(userId: string, appId: string): Promise<UsageAggregation[]>;
  checkSpendLimit(userId: string): Promise<{ allowed: boolean; remaining: number }>;
}

/**
 * Interface for billing service
 */
export interface IBillingService {
  reportUsage(record: MeteredBillingRecord): Promise<void>;
  getInvoices(userId: string): Promise<InvoiceSummary[]>;
  getCurrentInvoice(userId: string): Promise<InvoiceSummary | null>;
}

/**
 * Interface for proxy services
 */
export interface IProxyService<TRequest, TResult> {
  proxy(request: TRequest, context: ProxyRequestContext): Promise<ProxyResult<TResult>>;
}

// ============================================================================
// DASHBOARD DISPLAY TYPES
// ============================================================================

/**
 * User's current period usage summary for dashboard
 */
export interface UsageSummary {
  userId: string;
  periodStart: string;
  periodEnd: string;
  apiUsage: {
    openai: { tokens: number; costCents: number };
    anthropic: { tokens: number; costCents: number };
    sendgrid: { emails: number; costCents: number };
    twilio: { sms: number; costCents: number };
    storage: { bytes: number; costCents: number };
  };
  deploymentUsage: {
    totalRequests: number;
    totalBandwidthBytes: number;
    totalDbOperations: number;
    totalCostCents: number;
  };
  totalCostCents: number;
  spendLimitCents: number;
  remainingBudgetCents: number;
}

/**
 * Per-app usage breakdown for dashboard
 */
export interface AppUsageBreakdown {
  appId: string;
  appName: string;
  platform: string;
  apiCostCents: number;
  requests: number;
  bandwidthBytes: number;
  dbOperations: number;
  deploymentCostCents: number;
  totalCostCents: number;
}

/**
 * Usage query filters
 */
export interface UsageQueryFilters {
  userId?: string;
  appId?: string;
  service?: APIService;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
