/**
 * Development Tools - Index
 *
 * Export all development/debugging components from a single entry point.
 * These are only active in development mode.
 */

export { DevTools } from './DevTools';
export { DebugPanel, trackAPIRequest, updateAPIRequest, trackSSEEvent, trackTokenUsage } from './DebugPanel';
export { MockAIBanner } from './MockAIBanner';

// Re-export performance metrics utilities for convenience
export {
  useRenderPerformance,
  getPerformanceMetrics,
  getComponentMetrics,
  clearPerformanceMetrics,
  getSlowRenderSummary,
  getTotalRenderStats,
  withRenderPerformance,
} from '@/hooks/useRenderPerformance';
export type { RenderMetrics, PerformanceOptions } from '@/hooks/useRenderPerformance';

// Re-export error report utilities
export {
  getStoredErrorReports,
  clearStoredErrorReports,
} from '@/components/ErrorBoundary';
export type { ErrorReport } from '@/components/ErrorBoundary';

// Re-export logger utilities
export {
  logger,
  createRequestLogger,
  generateRequestId,
} from '@/utils/logger';
export type { LogLevel, LogEntry, LogContext } from '@/utils/logger';
