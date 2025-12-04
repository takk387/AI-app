/**
 * Analytics & Monitoring System
 * Phase 4: Analytics & Feedback Loop
 *
 * Tracks request metrics, errors, performance, and usage patterns
 * across all AI builder routes for data-driven optimization.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type RouteType =
  | 'ai-builder' // Single component generation
  | 'ai-builder/modify' // Code modification
  | 'ai-builder/full-app' // Full app generation
  | 'ai-builder/full-app-stream' // Full app generation with streaming
  | 'ai-builder/plan-phases' // Planning
  | 'chat'; // Chat interface

export type EventType =
  | 'request_start'
  | 'request_complete'
  | 'request_error'
  | 'validation_run'
  | 'validation_error'
  | 'ai_response'
  | 'token_usage';

export type ErrorCategory =
  | 'validation_error' // Code validation failures
  | 'ai_error' // AI model errors
  | 'parsing_error' // Response parsing failures
  | 'timeout_error' // Request timeouts
  | 'rate_limit_error' // API rate limits
  | 'unknown_error'; // Uncategorized errors

export interface RequestMetrics {
  routeType: RouteType;
  requestId: string;
  timestamp: number;

  // Performance
  responseTime?: number; // milliseconds
  tokenUsage?: {
    input: number;
    output: number;
    cached?: number;
  };

  // Request details
  modelUsed?: string;
  promptLength?: number;
  responseLength?: number;

  // Success/Failure
  success: boolean;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  errorStack?: string;

  // Validation
  validationRan?: boolean;
  validationIssuesFound?: number;
  validationIssuesFixed?: number;

  // User context
  userAgent?: string;
  ipAddress?: string;

  // Custom metadata
  metadata?: Record<string, any>;
}

export interface AnalyticsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  errorsByCategory: Record<ErrorCategory, number>;
  requestsByRoute: Record<RouteType, number>;
}

// ============================================================================
// ANALYTICS LOGGER CLASS
// ============================================================================

class AnalyticsLogger {
  private metrics: RequestMetrics[] = [];
  private maxStoredMetrics = 1000; // Keep last 1000 requests in memory

  /**
   * Log a request start event
   */
  logRequestStart(routeType: RouteType, requestId: string, metadata?: Record<string, any>): void {
    const metric: RequestMetrics = {
      routeType,
      requestId,
      timestamp: Date.now(),
      success: false, // Will be updated on completion
      metadata,
    };

    this.metrics.push(metric);
    this.trimMetrics();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] Request started: ${routeType} (${requestId})`);
    }
  }

  /**
   * Log a successful request completion
   */
  logRequestComplete(requestId: string, updates: Partial<RequestMetrics>): void {
    const metric = this.findMetric(requestId);
    if (!metric) {
      console.warn(`[Analytics] Metric not found for requestId: ${requestId}`);
      return;
    }

    Object.assign(metric, updates, {
      success: true,
      responseTime: Date.now() - metric.timestamp,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Analytics] Request completed: ${metric.routeType} (${requestId}) - ${metric.responseTime}ms`
      );
    }

    // Log summary if significant
    this.logRequestSummary(metric);
  }

  /**
   * Log a failed request
   */
  logRequestError(
    requestId: string,
    error: Error | string,
    category: ErrorCategory = 'unknown_error',
    updates?: Partial<RequestMetrics>
  ): void {
    const metric = this.findMetric(requestId);
    if (!metric) {
      console.warn(`[Analytics] Metric not found for requestId: ${requestId}`);
      return;
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    Object.assign(metric, updates, {
      success: false,
      responseTime: Date.now() - metric.timestamp,
      errorCategory: category,
      errorMessage,
      errorStack,
    });

    console.error(`[Analytics] Request failed: ${metric.routeType} (${requestId})`, {
      category,
      error: errorMessage,
      responseTime: metric.responseTime,
    });
  }

  /**
   * Log validation results
   */
  logValidation(requestId: string, issuesFound: number, issuesFixed: number): void {
    const metric = this.findMetric(requestId);
    if (!metric) return;

    metric.validationRan = true;
    metric.validationIssuesFound = issuesFound;
    metric.validationIssuesFixed = issuesFixed;

    if (process.env.NODE_ENV === 'development' && issuesFound > 0) {
      console.log(
        `[Analytics] Validation: ${issuesFixed}/${issuesFound} issues fixed (${requestId})`
      );
    }
  }

  /**
   * Log token usage
   */
  logTokenUsage(requestId: string, input: number, output: number, cached?: number): void {
    const metric = this.findMetric(requestId);
    if (!metric) return;

    metric.tokenUsage = { input, output, cached };

    if (process.env.NODE_ENV === 'development') {
      const total = input + output;
      console.log(
        `[Analytics] Tokens: ${total} (${input} in, ${output} out${cached ? `, ${cached} cached` : ''}) - ${requestId}`
      );
    }
  }

  /**
   * Get analytics summary
   */
  getSummary(since?: number): AnalyticsSummary {
    const relevantMetrics = since ? this.metrics.filter((m) => m.timestamp >= since) : this.metrics;

    const summary: AnalyticsSummary = {
      totalRequests: relevantMetrics.length,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      errorsByCategory: {
        validation_error: 0,
        ai_error: 0,
        parsing_error: 0,
        timeout_error: 0,
        rate_limit_error: 0,
        unknown_error: 0,
      },
      requestsByRoute: {
        'ai-builder': 0,
        'ai-builder/modify': 0,
        'ai-builder/full-app': 0,
        'ai-builder/full-app-stream': 0,
        'ai-builder/plan-phases': 0,
        chat: 0,
      },
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    relevantMetrics.forEach((metric) => {
      // Success/Failure
      if (metric.success) {
        summary.successfulRequests++;
      } else {
        summary.failedRequests++;
        if (metric.errorCategory) {
          summary.errorsByCategory[metric.errorCategory]++;
        }
      }

      // Response time
      if (metric.responseTime !== undefined) {
        totalResponseTime += metric.responseTime;
        responseTimeCount++;
      }

      // Token usage
      if (metric.tokenUsage) {
        summary.totalTokensUsed += metric.tokenUsage.input + metric.tokenUsage.output;
      }

      // Route distribution
      summary.requestsByRoute[metric.routeType]++;
    });

    summary.averageResponseTime =
      responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0;

    return summary;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): RequestMetrics[] {
    return this.metrics
      .filter((m) => !m.success)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get metrics by route
   */
  getMetricsByRoute(routeType: RouteType, limit = 50): RequestMetrics[] {
    return this.metrics
      .filter((m) => m.routeType === routeType)
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear all stored metrics
   */
  clear(): void {
    this.metrics = [];
    console.log('[Analytics] Metrics cleared');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private findMetric(requestId: string): RequestMetrics | undefined {
    return this.metrics.find((m) => m.requestId === requestId);
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }
  }

  private logRequestSummary(metric: RequestMetrics): void {
    // Log significant events
    const responseTime = metric.responseTime || 0;

    // Slow request warning (>10s)
    if (responseTime > 10000) {
      console.warn(`[Analytics] Slow request: ${metric.routeType} took ${responseTime}ms`);
    }

    // High token usage warning (>20k tokens)
    if (metric.tokenUsage) {
      const totalTokens = metric.tokenUsage.input + metric.tokenUsage.output;
      if (totalTokens > 20000) {
        console.warn(`[Analytics] High token usage: ${totalTokens} tokens (${metric.routeType})`);
      }
    }

    // Validation issues
    if (metric.validationIssuesFound && metric.validationIssuesFound > 5) {
      console.warn(
        `[Analytics] Many validation issues: ${metric.validationIssuesFound} found (${metric.routeType})`
      );
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const analytics = new AnalyticsLogger();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Categorize an error
 */
export function categorizeError(error: Error | string): ErrorCategory {
  const message = typeof error === 'string' ? error : error.message;
  const messageLower = message.toLowerCase();

  if (messageLower.includes('validation') || messageLower.includes('invalid')) {
    return 'validation_error';
  }
  if (messageLower.includes('timeout') || messageLower.includes('timed out')) {
    return 'timeout_error';
  }
  if (messageLower.includes('rate limit') || messageLower.includes('429')) {
    return 'rate_limit_error';
  }
  if (messageLower.includes('parse') || messageLower.includes('json')) {
    return 'parsing_error';
  }
  if (messageLower.includes('anthropic') || messageLower.includes('api')) {
    return 'ai_error';
  }

  return 'unknown_error';
}

/**
 * Log periodic analytics summary (call this on a schedule)
 */
export function logPeriodicSummary(periodName: string = 'hour'): void {
  const summary = analytics.getSummary();

  console.log(`\n[Analytics Summary - Last ${periodName}]`);
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(
    `Success Rate: ${summary.totalRequests > 0 ? Math.round((summary.successfulRequests / summary.totalRequests) * 100) : 0}%`
  );
  console.log(`Avg Response Time: ${summary.averageResponseTime}ms`);
  console.log(`Total Tokens: ${summary.totalTokensUsed.toLocaleString()}`);

  if (summary.failedRequests > 0) {
    console.log('\nErrors by Category:');
    Object.entries(summary.errorsByCategory).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`  ${category}: ${count}`);
      }
    });
  }

  console.log('\nRequests by Route:');
  Object.entries(summary.requestsByRoute).forEach(([route, count]) => {
    if (count > 0) {
      console.log(`  ${route}: ${count}`);
    }
  });
  console.log('');
}

// ============================================================================
// PERFORMANCE TRACKING HELPER
// ============================================================================

/**
 * Create a performance tracker for a request
 */
export class PerformanceTracker {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now() - this.startTime);
  }

  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  getCheckpoints(): Record<string, number> {
    return Object.fromEntries(this.checkpoints);
  }

  log(prefix: string = 'Performance'): void {
    console.log(`[${prefix}] Total: ${this.getElapsed()}ms`);
    this.checkpoints.forEach((time, name) => {
      console.log(`  ${name}: ${time}ms`);
    });
  }
}
