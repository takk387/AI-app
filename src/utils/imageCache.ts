/**
 * Image Cache
 *
 * Client-side caching for DALL-E generated images to minimize API costs.
 * Uses localStorage with automatic expiration and cleanup.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface CachedImage {
  url: string;
  prompt: string;
  promptHash: string;
  type: 'hero' | 'card' | 'background' | 'custom';
  size: string;
  quality: string;
  generatedAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  hitRate: number;
}

export interface CacheConfig {
  maxEntries: number;
  defaultTTL: number;
  storageKey: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 50,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  storageKey: 'dalle-image-cache',
};

// Stats tracking
let cacheHits = 0;
let cacheMisses = 0;

// ============================================================================
// Image Cache Class
// ============================================================================

class ImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private config: CacheConfig;
  private initialized = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the cache (call on client side)
   */
  public initialize(): void {
    if (this.initialized) return;
    this.loadFromStorage();
    this.cleanExpired();
    this.initialized = true;
  }

  /**
   * Generate a hash for a prompt string
   */
  private hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Generate a cache key from prompt and parameters
   */
  private getCacheKey(prompt: string, size: string, quality: string): string {
    const promptHash = this.hashPrompt(prompt);
    return `${promptHash}-${size}-${quality}`;
  }

  /**
   * Get an image from cache
   */
  public get(prompt: string, size: string, quality: string): CachedImage | null {
    const key = this.getCacheKey(prompt, size, quality);
    const cached = this.cache.get(key);

    if (!cached) {
      cacheMisses++;
      return null;
    }

    // Check expiration
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.saveToStorage();
      cacheMisses++;
      return null;
    }

    // Update access stats
    cached.accessCount++;
    cached.lastAccessed = Date.now();
    this.saveToStorage();
    cacheHits++;

    return cached;
  }

  /**
   * Store an image in cache
   */
  public set(
    prompt: string,
    url: string,
    options: {
      type: 'hero' | 'card' | 'background' | 'custom';
      size: string;
      quality: string;
      ttl?: number;
    }
  ): void {
    const { type, size, quality, ttl = this.config.defaultTTL } = options;
    const key = this.getCacheKey(prompt, size, quality);
    const now = Date.now();

    const entry: CachedImage = {
      url,
      prompt,
      promptHash: this.hashPrompt(prompt),
      type,
      size,
      quality,
      generatedAt: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessed: now,
    };

    // Enforce max entries by removing oldest
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.saveToStorage();
  }

  /**
   * Check if an image is cached
   */
  public has(prompt: string, size: string, quality: string): boolean {
    const key = this.getCacheKey(prompt, size, quality);
    const cached = this.cache.get(key);

    if (!cached) return false;
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a specific entry from cache
   */
  public delete(prompt: string, size: string, quality: string): boolean {
    const key = this.getCacheKey(prompt, size, quality);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Clear all cached images
   */
  public clear(): void {
    this.cache.clear();
    cacheHits = 0;
    cacheMisses = 0;
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalHitsAndMisses = cacheHits + cacheMisses;

    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of entries) {
      if (oldestEntry === null || entry.generatedAt < oldestEntry) {
        oldestEntry = entry.generatedAt;
      }
      if (newestEntry === null || entry.generatedAt > newestEntry) {
        newestEntry = entry.generatedAt;
      }
    }

    return {
      totalEntries: this.cache.size,
      totalSize: this.estimateSize(),
      oldestEntry,
      newestEntry,
      hitRate: totalHitsAndMisses > 0 ? cacheHits / totalHitsAndMisses : 0,
    };
  }

  /**
   * Get all cached entries (for debugging/display)
   */
  public getAllEntries(): CachedImage[] {
    return Array.from(this.cache.values()).sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  /**
   * Get entries by type
   */
  public getEntriesByType(type: 'hero' | 'card' | 'background' | 'custom'): CachedImage[] {
    return Array.from(this.cache.values())
      .filter((entry) => entry.type === type)
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt < now) {
        this.cache.delete(key);
      }
    }
    this.saveToStorage();
  }

  private evictOldest(): void {
    // Find the entry with oldest lastAccessed time
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private estimateSize(): number {
    // Rough estimate of storage size in bytes
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.url.length * 2; // UTF-16
      size += entry.prompt.length * 2;
      size += 200; // Overhead for other fields
    }
    return size;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const entries: [string, CachedImage][] = JSON.parse(stored);
        this.cache = new Map(entries);
      }
    } catch {
      // Ignore storage errors, start with empty cache
      this.cache = new Map();
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const entries = Array.from(this.cache.entries());
      localStorage.setItem(this.config.storageKey, JSON.stringify(entries));
    } catch (error) {
      // Storage full - evict entries and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.evictOldest();
        this.evictOldest();
        try {
          const entries = Array.from(this.cache.entries());
          localStorage.setItem(this.config.storageKey, JSON.stringify(entries));
        } catch {
          // Give up on storage
        }
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let imageCacheInstance: ImageCache | null = null;

export function getImageCache(config?: Partial<CacheConfig>): ImageCache {
  if (!imageCacheInstance) {
    imageCacheInstance = new ImageCache(config);
  }
  return imageCacheInstance;
}

// Convenience exports
export const imageCache = {
  initialize: () => getImageCache().initialize(),
  get: (prompt: string, size: string, quality: string) =>
    getImageCache().get(prompt, size, quality),
  set: (
    prompt: string,
    url: string,
    options: {
      type: 'hero' | 'card' | 'background' | 'custom';
      size: string;
      quality: string;
      ttl?: number;
    }
  ) => getImageCache().set(prompt, url, options),
  has: (prompt: string, size: string, quality: string) =>
    getImageCache().has(prompt, size, quality),
  delete: (prompt: string, size: string, quality: string) =>
    getImageCache().delete(prompt, size, quality),
  clear: () => getImageCache().clear(),
  getStats: () => getImageCache().getStats(),
  getAllEntries: () => getImageCache().getAllEntries(),
  getEntriesByType: (type: 'hero' | 'card' | 'background' | 'custom') =>
    getImageCache().getEntriesByType(type),
};

export default imageCache;
