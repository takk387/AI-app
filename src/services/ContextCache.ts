/**
 * ContextCache - Hash-based caching for code context analysis and selection
 * Provides efficient caching with automatic invalidation
 */

import { hashSync } from '../utils/hashUtils';
import { FileAnalysis, CodeContextSnapshot, ContextSelectionRequest } from '../types/codeContext';

// ============================================================================
// CACHE ENTRY TYPES
// ============================================================================

interface CacheEntry<T> {
  value: T;
  hash: string;
  timestamp: number;
  hits: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

// ============================================================================
// CONTEXT CACHE CLASS
// ============================================================================

export class ContextCache {
  private analysisCache: Map<string, CacheEntry<FileAnalysis>> = new Map();
  private snapshotCache: Map<string, CacheEntry<CodeContextSnapshot>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  private readonly maxAnalysisCacheSize: number;
  private readonly maxSnapshotCacheSize: number;
  private readonly ttlMs: number;

  constructor(options?: {
    maxAnalysisCacheSize?: number;
    maxSnapshotCacheSize?: number;
    ttlMs?: number;
  }) {
    this.maxAnalysisCacheSize = options?.maxAnalysisCacheSize ?? 500;
    this.maxSnapshotCacheSize = options?.maxSnapshotCacheSize ?? 50;
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  // ==========================================================================
  // FILE ANALYSIS CACHE
  // ==========================================================================

  /**
   * Get cached file analysis if content hash matches
   */
  getAnalysis(path: string, contentHash: string): FileAnalysis | null {
    const entry = this.analysisCache.get(path);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if hash matches and not expired
    if (entry.hash === contentHash && !this.isExpired(entry)) {
      entry.hits++;
      this.stats.hits++;
      return entry.value;
    }

    // Hash mismatch or expired - invalidate
    this.analysisCache.delete(path);
    this.stats.misses++;
    return null;
  }

  /**
   * Cache a file analysis result
   */
  setAnalysis(path: string, analysis: FileAnalysis): void {
    // Evict if at capacity
    if (this.analysisCache.size >= this.maxAnalysisCacheSize) {
      this.evictLRU(this.analysisCache);
    }

    this.analysisCache.set(path, {
      value: analysis,
      hash: analysis.hash,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if a file needs re-analysis based on content hash
   */
  needsReanalysis(path: string, contentHash: string): boolean {
    const entry = this.analysisCache.get(path);
    return !entry || entry.hash !== contentHash || this.isExpired(entry);
  }

  /**
   * Invalidate analysis cache for specific files
   */
  invalidateAnalysis(paths: string[]): void {
    for (const path of paths) {
      this.analysisCache.delete(path);
    }
  }

  // ==========================================================================
  // CONTEXT SNAPSHOT CACHE
  // ==========================================================================

  /**
   * Generate cache key for a context selection request
   */
  getSnapshotCacheKey(request: ContextSelectionRequest, version: number): string {
    const keyData = {
      intent: request.intent,
      maxTokens: request.maxTokens,
      focusFiles: request.focusFiles?.sort(),
      excludeFiles: request.excludeFiles?.sort(),
      phaseNumber: request.phaseNumber,
      version,
    };

    return this.hashObject(keyData);
  }

  /**
   * Get cached context snapshot
   */
  getSnapshot(cacheKey: string): CodeContextSnapshot | null {
    const entry = this.snapshotCache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.snapshotCache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Cache a context snapshot
   */
  setSnapshot(cacheKey: string, snapshot: CodeContextSnapshot): void {
    // Evict if at capacity
    if (this.snapshotCache.size >= this.maxSnapshotCacheSize) {
      this.evictLRU(this.snapshotCache);
    }

    this.snapshotCache.set(cacheKey, {
      value: snapshot,
      hash: cacheKey,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Invalidate all snapshot caches (when files change)
   */
  invalidateSnapshots(): void {
    this.snapshotCache.clear();
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all caches
   */
  clear(): void {
    this.analysisCache.clear();
    this.snapshotCache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      size: this.analysisCache.size + this.snapshotCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
    };
  }

  /**
   * Prune expired entries from all caches
   */
  prune(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [key, entry] of this.analysisCache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.analysisCache.delete(key);
        pruned++;
      }
    }

    for (const [key, entry] of this.snapshotCache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.snapshotCache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs;
  }

  private evictLRU<T>(cache: Map<string, CacheEntry<T>>): void {
    // Find entry with lowest hits and oldest timestamp
    let oldestKey: string | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of cache) {
      // Score based on recency and access frequency
      const age = Date.now() - entry.timestamp;
      const score = entry.hits / (age / 1000 + 1);

      if (score < lowestScore) {
        lowestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private hashObject(obj: unknown): string {
    const str = JSON.stringify(obj, Object.keys(obj as object).sort());
    return hashSync(str);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let cacheInstance: ContextCache | null = null;

export function getContextCache(options?: {
  maxAnalysisCacheSize?: number;
  maxSnapshotCacheSize?: number;
  ttlMs?: number;
}): ContextCache {
  if (!cacheInstance || options) {
    cacheInstance = new ContextCache(options);
  }
  return cacheInstance;
}
