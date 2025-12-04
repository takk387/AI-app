/* eslint-disable no-console */
/**
 * Debug Utilities
 *
 * Environment-based debug flags and utilities for development.
 * All debug features are disabled by default and only work in development.
 *
 * @example Enable mock AI mode:
 * ```bash
 * NEXT_PUBLIC_MOCK_AI=true npm run dev
 * ```
 */

/**
 * Check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Check if we're running on the server
 */
export const isServer = typeof window === 'undefined';

/**
 * Debug flags - all require development mode to be active
 *
 * IMPORTANT: These flags ONLY work in development mode.
 * Production always uses real AI and disables all debug features.
 */
export const DEBUG = {
  /**
   * Use mock AI responses instead of real Claude API
   * Enable: NEXT_PUBLIC_MOCK_AI=true
   */
  MOCK_AI: isDevelopment && process.env.NEXT_PUBLIC_MOCK_AI === 'true',

  /**
   * Log all API calls to console
   * Enable: NEXT_PUBLIC_DEBUG_API=true
   */
  LOG_API: isDevelopment && process.env.NEXT_PUBLIC_DEBUG_API === 'true',

  /**
   * Log token usage for each request
   * Enable: NEXT_PUBLIC_DEBUG_TOKENS=true
   */
  LOG_TOKENS: isDevelopment && process.env.NEXT_PUBLIC_DEBUG_TOKENS === 'true',

  /**
   * Log phase execution details
   * Enable: NEXT_PUBLIC_DEBUG_PHASES=true
   */
  LOG_PHASES: isDevelopment && process.env.NEXT_PUBLIC_DEBUG_PHASES === 'true',

  /**
   * Show debug panel UI overlay
   * Enable: NEXT_PUBLIC_DEBUG_PANEL=true
   */
  SHOW_PANEL: isDevelopment && process.env.NEXT_PUBLIC_DEBUG_PANEL === 'true',

  /**
   * Expose app state to window.__APP_STATE__
   * Enable: NEXT_PUBLIC_DEBUG_STATE=true
   */
  EXPOSE_STATE: isDevelopment && process.env.NEXT_PUBLIC_DEBUG_STATE === 'true',

  /**
   * Enable verbose error logging
   * Always true in development
   */
  VERBOSE_ERRORS: isDevelopment,
} as const;

/**
 * Log a debug message if the specified flag is enabled
 */
export function debugLog(
  flag: keyof typeof DEBUG,
  message: string,
  data?: unknown
): void {
  if (DEBUG[flag]) {
    const prefix = `[${flag}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

/**
 * Log API request/response if LOG_API is enabled
 */
export function logAPI(
  method: string,
  route: string,
  data?: Record<string, unknown>
): void {
  if (DEBUG.LOG_API) {
    const prefix = `[API] ${method} ${route}`;
    const duration = data?.duration;
    if (typeof duration === 'number') {
      console.log(`${prefix} (${duration}ms)`, data);
    } else {
      console.log(prefix, data);
    }
  }
}

/**
 * Log token usage if LOG_TOKENS is enabled
 */
export function logTokens(
  route: string,
  usage: { input?: number; output?: number; cached?: number }
): void {
  if (DEBUG.LOG_TOKENS) {
    const total = (usage.input || 0) + (usage.output || 0);
    console.log(`[TOKENS] ${route}:`, {
      input: usage.input || 0,
      output: usage.output || 0,
      cached: usage.cached || 0,
      total,
    });
  }
}

/**
 * Log phase execution if LOG_PHASES is enabled
 */
export function logPhase(
  action: 'start' | 'complete' | 'skip' | 'error',
  phaseName: string,
  details?: unknown
): void {
  if (DEBUG.LOG_PHASES) {
    const emoji = {
      start: '▶️',
      complete: '✅',
      skip: '⏭️',
      error: '❌',
    }[action];
    console.log(`[PHASE] ${emoji} ${action.toUpperCase()}: ${phaseName}`, details || '');
  }
}

/**
 * Print startup debug status to console
 * Call this once on app initialization
 */
export function printDebugStatus(): void {
  if (!isDevelopment) return;

  const activeFlags = Object.entries(DEBUG)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  if (activeFlags.length > 0) {
    console.log('');
    console.log('🔧 DEBUG MODE ACTIVE');
    console.log('   Active flags:', activeFlags.join(', '));
    if (DEBUG.MOCK_AI) {
      console.warn('   ⚠️  MOCK AI ENABLED - Claude API calls are disabled');
    }
    console.log('');
  }
}

/**
 * Performance timing utility
 */
export function createTimer(label: string): { end: () => number } {
  const start = performance.now();
  return {
    end: () => {
      const duration = Math.round(performance.now() - start);
      if (DEBUG.LOG_API || DEBUG.LOG_PHASES) {
        console.log(`[TIMER] ${label}: ${duration}ms`);
      }
      return duration;
    },
  };
}
