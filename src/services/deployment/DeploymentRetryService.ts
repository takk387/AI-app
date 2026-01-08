/**
 * DeploymentRetryService
 *
 * Handles retry logic for failed deployments with:
 * - Exponential backoff
 * - Retry limits per error type
 * - Automatic recovery for transient failures
 * - Deployment state persistence
 */

// ============================================================================
// TYPES
// ============================================================================

export type RetryableErrorType =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'server_error'
  | 'build_transient';

export type NonRetryableErrorType =
  | 'auth'
  | 'quota_exceeded'
  | 'invalid_config'
  | 'build_permanent'
  | 'not_found';

export type DeploymentErrorType = RetryableErrorType | NonRetryableErrorType;

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RetryState {
  attemptNumber: number;
  lastError: string | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  errorType: DeploymentErrorType | null;
}

export interface DeploymentRetryRecord {
  deploymentId: string;
  appId: string;
  platform: 'web' | 'mobile' | 'desktop';
  retryState: RetryState;
  config: DeploymentConfig;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentConfig {
  // Generic config that can hold any deployment settings
  [key: string]: unknown;
}

export interface RetryResult {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
  attemptNumber: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

const ERROR_SPECIFIC_CONFIG: Partial<Record<DeploymentErrorType, Partial<RetryConfig>>> = {
  network: { maxRetries: 5, baseDelayMs: 2000 },
  timeout: { maxRetries: 3, baseDelayMs: 5000 },
  rate_limit: { maxRetries: 3, baseDelayMs: 60000, maxDelayMs: 300000 },
  server_error: { maxRetries: 3, baseDelayMs: 3000 },
  build_transient: { maxRetries: 2, baseDelayMs: 10000 },
};

const RETRYABLE_ERROR_TYPES: Set<DeploymentErrorType> = new Set([
  'network',
  'timeout',
  'rate_limit',
  'server_error',
  'build_transient',
]);

const RETRY_STORAGE_KEY = 'ai_app_builder_deployment_retry_queue';

// ============================================================================
// DEPLOYMENT RETRY SERVICE
// ============================================================================

export class DeploymentRetryService {
  private retryQueue: Map<string, DeploymentRetryRecord> = new Map();

  constructor() {
    this.loadFromStorage();
    // Clean up any stale records on initialization
    this.cleanupStaleRecords();
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Classify an error and determine if it's retryable
   */
  classifyError(error: Error | string): DeploymentErrorType {
    const errorMessage =
      typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound')
    ) {
      return 'network';
    }

    // Timeout errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('deadline exceeded')
    ) {
      return 'timeout';
    }

    // Rate limiting
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('429')
    ) {
      return 'rate_limit';
    }

    // Server errors (5xx)
    if (
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('internal server error') ||
      errorMessage.includes('service unavailable')
    ) {
      return 'server_error';
    }

    // Authentication errors
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid token')
    ) {
      return 'auth';
    }

    // Quota/limit errors
    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('limit exceeded') ||
      errorMessage.includes('max deployments')
    ) {
      return 'quota_exceeded';
    }

    // Invalid configuration
    if (
      errorMessage.includes('invalid') ||
      errorMessage.includes('validation failed') ||
      errorMessage.includes('missing required')
    ) {
      return 'invalid_config';
    }

    // Not found
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return 'not_found';
    }

    // Build errors - check if transient or permanent
    if (errorMessage.includes('build')) {
      // Transient build errors (can retry)
      if (errorMessage.includes('out of memory') || errorMessage.includes('resource exhausted')) {
        return 'build_transient';
      }
      // Permanent build errors (don't retry)
      return 'build_permanent';
    }

    // Default to server error (retryable)
    return 'server_error';
  }

  /**
   * Check if an error type is retryable
   */
  isRetryable(errorType: DeploymentErrorType): boolean {
    return RETRYABLE_ERROR_TYPES.has(errorType);
  }

  /**
   * Calculate retry delay using exponential backoff with jitter
   */
  calculateRetryDelay(attemptNumber: number, errorType: DeploymentErrorType): number {
    const config = this.getConfigForErrorType(errorType);

    // Exponential backoff: baseDelay * (multiplier ^ attemptNumber)
    const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter (±20%) to prevent thundering herd
    const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);

    return Math.round(cappedDelay + jitter);
  }

  /**
   * Determine if we should retry and get retry info
   * @param _deploymentId - Reserved for future per-deployment retry tracking
   * @param error - The error to classify and check
   * @param currentAttempt - Current attempt number (0-indexed)
   */
  shouldRetry(
    _deploymentId: string,
    error: Error | string,
    currentAttempt: number = 0
  ): RetryResult {
    const errorType = this.classifyError(error);

    if (!this.isRetryable(errorType)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Error type '${errorType}' is not retryable`,
        attemptNumber: currentAttempt,
      };
    }

    const config = this.getConfigForErrorType(errorType);

    if (currentAttempt >= config.maxRetries) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max retries (${config.maxRetries}) exceeded for error type '${errorType}'`,
        attemptNumber: currentAttempt,
      };
    }

    const delayMs = this.calculateRetryDelay(currentAttempt, errorType);

    return {
      shouldRetry: true,
      delayMs,
      reason: `Retrying after ${delayMs}ms (attempt ${currentAttempt + 1}/${config.maxRetries})`,
      attemptNumber: currentAttempt + 1,
    };
  }

  /**
   * Add a deployment to the retry queue
   */
  addToRetryQueue(
    deploymentId: string,
    appId: string,
    platform: 'web' | 'mobile' | 'desktop',
    config: DeploymentConfig,
    error: Error | string
  ): DeploymentRetryRecord {
    const errorType = this.classifyError(error);
    const now = new Date().toISOString();
    const retryResult = this.shouldRetry(deploymentId, error, 0);

    const record: DeploymentRetryRecord = {
      deploymentId,
      appId,
      platform,
      config,
      retryState: {
        attemptNumber: 1,
        lastError: typeof error === 'string' ? error : error.message,
        lastAttemptAt: now,
        nextRetryAt: retryResult.shouldRetry
          ? new Date(Date.now() + retryResult.delayMs).toISOString()
          : null,
        errorType,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.retryQueue.set(deploymentId, record);
    this.saveToStorage();

    console.log(`[DeploymentRetryService] Added to retry queue:`, {
      deploymentId,
      errorType,
      nextRetryAt: record.retryState.nextRetryAt,
    });

    return record;
  }

  /**
   * Update retry state after an attempt
   */
  updateRetryState(deploymentId: string, error: Error | string): RetryResult {
    const record = this.retryQueue.get(deploymentId);

    if (!record) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: 'Deployment not found in retry queue',
        attemptNumber: 0,
      };
    }

    const retryResult = this.shouldRetry(deploymentId, error, record.retryState.attemptNumber);

    const now = new Date().toISOString();

    record.retryState = {
      ...record.retryState,
      attemptNumber: retryResult.attemptNumber,
      lastError: typeof error === 'string' ? error : error.message,
      lastAttemptAt: now,
      nextRetryAt: retryResult.shouldRetry
        ? new Date(Date.now() + retryResult.delayMs).toISOString()
        : null,
      errorType: this.classifyError(error),
    };
    record.updatedAt = now;

    this.saveToStorage();

    return retryResult;
  }

  /**
   * Remove a deployment from the retry queue (on success or permanent failure)
   */
  removeFromRetryQueue(deploymentId: string): boolean {
    const deleted = this.retryQueue.delete(deploymentId);
    if (deleted) {
      this.saveToStorage();
      console.log(`[DeploymentRetryService] Removed from retry queue: ${deploymentId}`);
    }
    return deleted;
  }

  /**
   * Get a deployment from the retry queue
   */
  getRetryRecord(deploymentId: string): DeploymentRetryRecord | undefined {
    return this.retryQueue.get(deploymentId);
  }

  /**
   * Get all deployments due for retry
   */
  getRetryableDeploys(): DeploymentRetryRecord[] {
    const now = Date.now();
    const dueForRetry: DeploymentRetryRecord[] = [];

    for (const record of this.retryQueue.values()) {
      if (
        record.retryState.nextRetryAt &&
        new Date(record.retryState.nextRetryAt).getTime() <= now
      ) {
        dueForRetry.push(record);
      }
    }

    return dueForRetry;
  }

  /**
   * Get all records in the retry queue
   */
  getAllRetryRecords(): DeploymentRetryRecord[] {
    return Array.from(this.retryQueue.values());
  }

  /**
   * Clear all retry records
   */
  clearRetryQueue(): void {
    this.retryQueue.clear();
    this.saveToStorage();
  }

  /**
   * Clean up stale/expired retry records
   * Records are considered stale if:
   * - They have no nextRetryAt (exhausted retries)
   * - They are older than 24 hours
   */
  cleanupStaleRecords(): number {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let removed = 0;

    for (const [id, record] of this.retryQueue.entries()) {
      const recordAge = now - new Date(record.createdAt).getTime();
      const isExpired = !record.retryState.nextRetryAt;
      const isStale = recordAge > maxAge;

      if (isExpired || isStale) {
        this.retryQueue.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveToStorage();
      console.log(`[DeploymentRetryService] Cleaned up ${removed} stale records`);
    }

    return removed;
  }

  /**
   * Execute a function with automatic retry
   */
  async executeWithRetry<T>(
    deploymentId: string,
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      onRetry?: (attempt: number, error: Error, delayMs: number) => void;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, onRetry } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        // Success - remove from retry queue if present
        this.removeFromRetryQueue(deploymentId);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const retryResult = this.shouldRetry(deploymentId, lastError, attempt);

        if (!retryResult.shouldRetry) {
          throw lastError;
        }

        console.log(`[DeploymentRetryService] ${retryResult.reason}`);

        if (onRetry) {
          onRetry(attempt + 1, lastError, retryResult.delayMs);
        }

        // Wait before retrying
        await this.delay(retryResult.delayMs);
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getConfigForErrorType(errorType: DeploymentErrorType): RetryConfig {
    const specificConfig = ERROR_SPECIFIC_CONFIG[errorType] || {};
    return { ...DEFAULT_RETRY_CONFIG, ...specificConfig };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const records = Array.from(this.retryQueue.entries());
      localStorage.setItem(RETRY_STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn('[DeploymentRetryService] Failed to save to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(RETRY_STORAGE_KEY);
      if (stored) {
        const records: [string, DeploymentRetryRecord][] = JSON.parse(stored);
        this.retryQueue = new Map(records);
        console.log(`[DeploymentRetryService] Loaded ${this.retryQueue.size} records from storage`);
      }
    } catch (error) {
      console.warn('[DeploymentRetryService] Failed to load from storage:', error);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let deploymentRetryServiceInstance: DeploymentRetryService | null = null;

/**
 * Get the DeploymentRetryService singleton
 */
export function getDeploymentRetryService(): DeploymentRetryService {
  if (!deploymentRetryServiceInstance) {
    deploymentRetryServiceInstance = new DeploymentRetryService();
  }
  return deploymentRetryServiceInstance;
}

/**
 * Reset the DeploymentRetryService singleton (for testing)
 */
export function resetDeploymentRetryService(): void {
  if (deploymentRetryServiceInstance) {
    deploymentRetryServiceInstance.clearRetryQueue();
  }
  deploymentRetryServiceInstance = null;
}
