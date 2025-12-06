/**
 * DALL-E Rate Limiter & Cost Management
 *
 * Tracks image generation usage, estimates costs, and enforces daily limits
 * to prevent unexpected API charges.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface UsageTracker {
  imagesGenerated: number;
  lastReset: number;
  dailyLimit: number;
  estimatedCost: number;
  history: UsageEntry[];
}

export interface UsageEntry {
  timestamp: number;
  type: 'hero' | 'card' | 'background' | 'custom';
  size: string;
  quality: string;
  cost: number;
}

export interface UsageStats {
  today: {
    images: number;
    cost: number;
    remaining: number;
  };
  allTime: {
    images: number;
    cost: number;
  };
  limits: {
    daily: number;
    costWarning: number;
  };
}

// ============================================================================
// Cost Constants
// ============================================================================

export const COST_PER_IMAGE = {
  'hd-1792x1024': 0.12,
  'hd-1024x1792': 0.12,
  'hd-1024x1024': 0.08,
  'standard-1792x1024': 0.08,
  'standard-1024x1792': 0.08,
  'standard-1024x1024': 0.04,
} as const;

export type CostKey = keyof typeof COST_PER_IMAGE;

// Default limits
const DEFAULT_DAILY_LIMIT = 50;
const DEFAULT_COST_WARNING = 5.0; // Warn at $5
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Rate Limiter Class
// ============================================================================

class DalleRateLimiter {
  private usage: UsageTracker;
  private storageKey = 'dalle-usage-tracker';
  private initialized = false;

  constructor() {
    this.usage = this.getDefaultUsage();
  }

  private getDefaultUsage(): UsageTracker {
    return {
      imagesGenerated: 0,
      lastReset: Date.now(),
      dailyLimit: DEFAULT_DAILY_LIMIT,
      estimatedCost: 0,
      history: [],
    };
  }

  /**
   * Initialize the rate limiter (call on client side)
   */
  public initialize(): void {
    if (this.initialized) return;
    this.loadUsage();
    this.checkReset();
    this.initialized = true;
  }

  /**
   * Check if image generation is allowed
   */
  public canGenerate(): boolean {
    this.checkReset();
    return this.usage.imagesGenerated < this.usage.dailyLimit;
  }

  /**
   * Get number of remaining generations today
   */
  public getRemainingGenerations(): number {
    this.checkReset();
    return Math.max(0, this.usage.dailyLimit - this.usage.imagesGenerated);
  }

  /**
   * Record an image generation
   */
  public recordGeneration(
    type: 'hero' | 'card' | 'background' | 'custom',
    quality: 'hd' | 'standard',
    size: string
  ): void {
    const key = `${quality}-${size}` as CostKey;
    const cost = COST_PER_IMAGE[key] || 0.04;

    this.usage.imagesGenerated++;
    this.usage.estimatedCost += cost;

    // Add to history (keep last 100 entries)
    this.usage.history.push({
      timestamp: Date.now(),
      type,
      size,
      quality,
      cost,
    });

    if (this.usage.history.length > 100) {
      this.usage.history = this.usage.history.slice(-100);
    }

    this.saveUsage();
  }

  /**
   * Get current usage statistics
   */
  public getUsage(): UsageTracker {
    this.checkReset();
    return { ...this.usage };
  }

  /**
   * Get formatted usage stats
   */
  public getStats(): UsageStats {
    this.checkReset();

    // Calculate all-time stats from history
    const allTimeImages = this.usage.history.length;
    const allTimeCost = this.usage.history.reduce((sum, entry) => sum + entry.cost, 0);

    return {
      today: {
        images: this.usage.imagesGenerated,
        cost: this.usage.estimatedCost,
        remaining: this.getRemainingGenerations(),
      },
      allTime: {
        images: allTimeImages,
        cost: allTimeCost,
      },
      limits: {
        daily: this.usage.dailyLimit,
        costWarning: DEFAULT_COST_WARNING,
      },
    };
  }

  /**
   * Set the daily generation limit
   */
  public setDailyLimit(limit: number): void {
    this.usage.dailyLimit = Math.max(1, limit);
    this.saveUsage();
  }

  /**
   * Check if cost warning threshold is exceeded
   */
  public isCostWarning(): boolean {
    return this.usage.estimatedCost >= DEFAULT_COST_WARNING;
  }

  /**
   * Get estimated cost for a specific image type
   */
  public getEstimatedCost(quality: 'hd' | 'standard', size: string): number {
    const key = `${quality}-${size}` as CostKey;
    return COST_PER_IMAGE[key] || 0.04;
  }

  /**
   * Reset daily counters manually
   */
  public resetDaily(): void {
    this.usage.imagesGenerated = 0;
    this.usage.estimatedCost = 0;
    this.usage.lastReset = Date.now();
    this.saveUsage();
  }

  /**
   * Clear all usage data
   */
  public clearAll(): void {
    this.usage = this.getDefaultUsage();
    this.saveUsage();
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private checkReset(): void {
    const now = Date.now();

    if (now - this.usage.lastReset > DAY_IN_MS) {
      this.usage.imagesGenerated = 0;
      this.usage.estimatedCost = 0;
      this.usage.lastReset = now;
      this.saveUsage();
    }
  }

  private loadUsage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.usage = {
          ...this.getDefaultUsage(),
          ...parsed,
        };
      }
    } catch {
      // Use defaults on error
    }
  }

  private saveUsage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.usage));
    } catch {
      // Ignore storage errors
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let rateLimiterInstance: DalleRateLimiter | null = null;

export function getDalleRateLimiter(): DalleRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new DalleRateLimiter();
  }
  return rateLimiterInstance;
}

// Convenience exports
export const dalleRateLimiter = {
  initialize: () => getDalleRateLimiter().initialize(),
  canGenerate: () => getDalleRateLimiter().canGenerate(),
  getRemainingGenerations: () => getDalleRateLimiter().getRemainingGenerations(),
  recordGeneration: (
    type: 'hero' | 'card' | 'background' | 'custom',
    quality: 'hd' | 'standard',
    size: string
  ) => getDalleRateLimiter().recordGeneration(type, quality, size),
  getUsage: () => getDalleRateLimiter().getUsage(),
  getStats: () => getDalleRateLimiter().getStats(),
  setDailyLimit: (limit: number) => getDalleRateLimiter().setDailyLimit(limit),
  isCostWarning: () => getDalleRateLimiter().isCostWarning(),
  getEstimatedCost: (quality: 'hd' | 'standard', size: string) =>
    getDalleRateLimiter().getEstimatedCost(quality, size),
  resetDaily: () => getDalleRateLimiter().resetDaily(),
  clearAll: () => getDalleRateLimiter().clearAll(),
};

export default dalleRateLimiter;
