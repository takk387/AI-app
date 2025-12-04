/* eslint-disable no-console */
/**
 * useRenderPerformance Hook
 *
 * Tracks component render performance and warns on slow renders (>100ms).
 * Metrics are stored in memory and can be retrieved via getPerformanceMetrics().
 *
 * @example
 * ```typescript
 * function HeavyComponent() {
 *   useRenderPerformance('HeavyComponent');
 *   // ... component code
 * }
 *
 * // To get metrics:
 * import { getPerformanceMetrics } from '@/hooks/useRenderPerformance';
 * const metrics = getPerformanceMetrics();
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { DEBUG } from '@/utils/debug';

/**
 * Performance metrics for a single component
 */
export interface RenderMetrics {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  slowRenders: number; // Renders > threshold
  lastRenderTimestamp: number;
}

/**
 * Configuration options for the hook
 */
export interface PerformanceOptions {
  /** Threshold in ms for slow render warning (default: 100) */
  slowThreshold?: number;
  /** Enable console warnings (default: true in development) */
  warnOnSlowRender?: boolean;
  /** Enable detailed logging (default: false) */
  verbose?: boolean;
}

// Global metrics store
const metricsStore = new Map<string, RenderMetrics>();

// Configuration constants
const DEFAULT_SLOW_THRESHOLD = 100; // milliseconds
const MAX_TRACKED_COMPONENTS = 500; // Prevent unbounded memory growth

/**
 * Get all stored performance metrics
 */
export function getPerformanceMetrics(): Map<string, RenderMetrics> {
  return new Map(metricsStore);
}

/**
 * Get metrics for a specific component
 */
export function getComponentMetrics(componentName: string): RenderMetrics | undefined {
  return metricsStore.get(componentName);
}

/**
 * Clear all performance metrics
 */
export function clearPerformanceMetrics(): void {
  metricsStore.clear();
}

/**
 * Get a summary of slow renders across all components
 */
export function getSlowRenderSummary(): Array<{
  name: string;
  slowRenders: number;
  avgTime: number;
}> {
  return Array.from(metricsStore.values())
    .filter((m) => m.slowRenders > 0)
    .map((m) => ({
      name: m.componentName,
      slowRenders: m.slowRenders,
      avgTime: Math.round(m.averageRenderTime * 100) / 100,
    }))
    .sort((a, b) => b.slowRenders - a.slowRenders);
}

/**
 * Get total render statistics
 */
export function getTotalRenderStats(): {
  totalRenders: number;
  totalSlowRenders: number;
  componentsTracked: number;
  averageRenderTime: number;
} {
  let totalRenders = 0;
  let totalSlowRenders = 0;
  let totalTime = 0;

  metricsStore.forEach((metrics) => {
    totalRenders += metrics.renderCount;
    totalSlowRenders += metrics.slowRenders;
    totalTime += metrics.averageRenderTime * metrics.renderCount;
  });

  return {
    totalRenders,
    totalSlowRenders,
    componentsTracked: metricsStore.size,
    averageRenderTime: totalRenders > 0 ? Math.round((totalTime / totalRenders) * 100) / 100 : 0,
  };
}

/**
 * Hook to track component render performance
 *
 * @param componentName - Name of the component being tracked
 * @param options - Optional configuration
 */
export function useRenderPerformance(
  componentName: string,
  options: PerformanceOptions = {}
): void {
  const {
    slowThreshold = DEFAULT_SLOW_THRESHOLD,
    warnOnSlowRender = process.env.NODE_ENV === 'development',
    verbose = false,
  } = options;

  const renderStartRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const minTimeRef = useRef<number>(Infinity);
  const maxTimeRef = useRef<number>(0);
  const slowRendersRef = useRef<number>(0);

  // Mark render start (this runs synchronously during render)
  renderStartRef.current = performance.now();

  // NOTE: Empty dependency array intentionally omitted to track EVERY render
  // This is the correct pattern for render performance measurement
  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    renderCountRef.current++;
    totalTimeRef.current += renderTime;

    // Track min/max
    if (renderTime < minTimeRef.current) {
      minTimeRef.current = renderTime;
    }
    if (renderTime > maxTimeRef.current) {
      maxTimeRef.current = renderTime;
    }

    // Check for slow render
    const isSlowRender = renderTime > slowThreshold;
    if (isSlowRender) {
      slowRendersRef.current++;

      // Warn on slow renders
      if (warnOnSlowRender && (DEBUG.LOG_API || process.env.NODE_ENV === 'development')) {
        console.warn(
          `[PERF] Slow render: ${componentName} took ${renderTime.toFixed(1)}ms (threshold: ${slowThreshold}ms)`
        );
      }
    }

    // Verbose logging
    if (verbose && DEBUG.LOG_API) {
      console.log(
        `[PERF] ${componentName} render #${renderCountRef.current}: ${renderTime.toFixed(1)}ms`
      );
    }

    // Update metrics store
    const metrics: RenderMetrics = {
      componentName,
      renderCount: renderCountRef.current,
      lastRenderTime: renderTime,
      averageRenderTime: totalTimeRef.current / renderCountRef.current,
      minRenderTime: minTimeRef.current === Infinity ? renderTime : minTimeRef.current,
      maxRenderTime: maxTimeRef.current,
      slowRenders: slowRendersRef.current,
      lastRenderTimestamp: Date.now(),
    };

    metricsStore.set(componentName, metrics);

    // Prune old entries if store exceeds limit (keep most recently updated)
    if (metricsStore.size > MAX_TRACKED_COMPONENTS) {
      const entries = Array.from(metricsStore.entries());
      // Sort by lastRenderTimestamp ascending (oldest first)
      entries.sort((a, b) => a[1].lastRenderTimestamp - b[1].lastRenderTimestamp);
      // Remove oldest entries until we're under the limit
      const toRemove = entries.slice(0, metricsStore.size - MAX_TRACKED_COMPONENTS);
      toRemove.forEach(([key]) => metricsStore.delete(key));
    }
  });
}

/**
 * Higher-order component wrapper for performance tracking
 *
 * @example
 * ```typescript
 * const TrackedComponent = withRenderPerformance(MyComponent, 'MyComponent');
 * ```
 */
export function withRenderPerformance<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  options?: PerformanceOptions
): React.FC<P> {
  const TrackedComponent: React.FC<P> = (props) => {
    useRenderPerformance(componentName, options);
    return React.createElement(WrappedComponent, props);
  };

  TrackedComponent.displayName = `Tracked(${componentName})`;
  return TrackedComponent;
}

export default useRenderPerformance;
