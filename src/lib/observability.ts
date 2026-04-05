import { createRequestLogger, type ChildLogger } from '@/utils/logger';
import {
  traceAICall,
  type TraceContext,
  type GenerationParams,
  type GenerationHandle,
} from '@/lib/langfuse';

export interface ObservableRequest {
  requestId: string;
  log: ChildLogger;
  trace: TraceContext;
  startTime: number;
  getDuration: () => number;
  startGeneration: (name: string, params: GenerationParams) => GenerationHandle;
  captureError: (error: Error | unknown, context?: Record<string, unknown>) => void;
  finish: () => Promise<void>;
}

export function createObservableRequest(
  route: string,
  options?: {
    userId?: string;
    sessionId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }
): ObservableRequest {
  const { requestId, log, startTime, getDuration } = createRequestLogger(route, options?.userId);

  const trace = traceAICall({
    name: route,
    requestId,
    userId: options?.userId,
    sessionId: options?.sessionId,
    metadata: options?.metadata,
    tags: options?.tags,
  });

  log.info('Request started');

  return {
    requestId,
    log,
    trace,
    startTime,
    getDuration,

    startGeneration(name: string, params: GenerationParams): GenerationHandle {
      return trace.startGeneration(name, params);
    },

    captureError(error: Error | unknown, context?: Record<string, unknown>) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error(err.message, err, context);
      trace.setError(err);

      try {
        import('@sentry/nextjs').then((Sentry) => {
          Sentry.captureException(err, {
            tags: { requestId, route },
            extra: context,
          });
        });
      } catch {
        // Sentry not available — no-op
      }
    },

    async finish() {
      log.info('Request completed', { durationMs: getDuration() });
      await trace.flush();
    },
  };
}
