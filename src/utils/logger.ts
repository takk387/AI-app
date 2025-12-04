/* eslint-disable no-console */
/**
 * Structured Logger
 *
 * Provides consistent JSON-formatted logging with request ID threading.
 * All logs include timestamps and can be filtered by log level.
 *
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * // Basic usage
 * logger.info('User logged in', { userId: '123' });
 *
 * // With request context (in API routes)
 * logger.setContext({ requestId: 'req_abc123' });
 * logger.info('Processing request');
 * logger.clearContext();
 *
 * // Error logging
 * logger.error('Failed to process', error, { route: '/api/build' });
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  route?: string;
  duration?: number;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
}

/**
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured Logger Class
 *
 * Provides JSON-formatted logging with context threading and level filtering.
 */
class Logger {
  private minLevel: LogLevel = 'info';
  private context: LogContext = {};
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Set the minimum log level (logs below this level are ignored)
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get the current minimum log level
   */
  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Set the current request context (threadable through async operations)
   */
  setContext(ctx: LogContext): void {
    this.context = { ...this.context, ...ctx };
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Get the current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, undefined, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, undefined, context);
  }

  /**
   * Log an error message with optional Error object
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    this.log('error', message, error, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(ctx: LogContext): ChildLogger {
    return new ChildLogger(this, ctx);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
    overrideContext?: LogContext
  ): void {
    // Check if this level should be logged
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    // Use override context if provided (for ChildLogger), otherwise use instance context
    const effectiveContext = overrideContext || this.context;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...effectiveContext,
    };

    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    // Add error stack if provided
    if (error) {
      if (error instanceof Error) {
        entry.stack = error.stack;
        entry.context = {
          ...entry.context,
          errorName: error.name,
          errorMessage: error.message,
        };
      } else {
        entry.context = {
          ...entry.context,
          error: String(error),
        };
      }
    }

    // Output format depends on environment
    if (this.isDevelopment) {
      // Human-readable format in development
      this.logDevelopment(level, entry);
    } else {
      // JSON format in production (for log aggregation)
      console[level](JSON.stringify(entry));
    }
  }

  /**
   * Log with explicit context (used by ChildLogger to avoid state mutation)
   * @internal
   */
  logWithContext(
    level: LogLevel,
    message: string,
    childContext: LogContext,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    // Merge parent context with child context (child takes precedence)
    const mergedContext: LogContext = {
      ...this.context,
      ...childContext,
    };
    this.log(level, message, error, context, mergedContext);
  }

  /**
   * Human-readable logging for development
   */
  private logDevelopment(level: LogLevel, entry: LogEntry): void {
    const prefix = this.getPrefix(level);
    const requestInfo = entry.requestId ? ` [${entry.requestId}]` : '';
    const routeInfo = entry.route ? ` ${entry.route}` : '';
    const durationInfo = entry.duration ? ` (${entry.duration}ms)` : '';

    const mainLine = `${prefix}${requestInfo}${routeInfo} ${entry.message}${durationInfo}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      console[level](mainLine, entry.context);
    } else {
      console[level](mainLine);
    }

    // Print stack trace for errors
    if (entry.stack && level === 'error') {
      console.error(entry.stack);
    }
  }

  /**
   * Get colored prefix for log level
   */
  private getPrefix(level: LogLevel): string {
    const prefixes: Record<LogLevel, string> = {
      debug: '[DEBUG]',
      info: '[INFO]',
      warn: '[WARN]',
      error: '[ERROR]',
    };
    return prefixes[level];
  }
}

/**
 * Child Logger with inherited context
 *
 * IMPORTANT: ChildLogger does NOT modify the parent logger's context.
 * Instead, it merges its own context with the parent's context at log time.
 * This ensures thread-safety for concurrent requests.
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private childContext: LogContext
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.logWithContext('debug', message, this.childContext, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.logWithContext('info', message, this.childContext, undefined, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.logWithContext('warn', message, this.childContext, undefined, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    this.parent.logWithContext('error', message, this.childContext, error, context);
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a request-scoped logger for API routes
 *
 * @example
 * ```typescript
 * export async function POST(req: Request) {
 *   const log = createRequestLogger('/api/ai-builder');
 *   log.info('Request started');
 *   // ... handle request
 *   log.info('Request completed', { duration: 1234 });
 *   return Response.json({ success: true });
 * }
 * ```
 */
export function createRequestLogger(route: string, userId?: string): {
  requestId: string;
  log: ChildLogger;
  startTime: number;
  getDuration: () => number;
} {
  const requestId = generateRequestId();
  const startTime = performance.now();

  const log = logger.child({
    requestId,
    route,
    userId,
  });

  return {
    requestId,
    log,
    startTime,
    getDuration: () => Math.round(performance.now() - startTime),
  };
}

export default logger;
