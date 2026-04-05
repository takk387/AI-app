import { Langfuse } from 'langfuse';

let langfuseInstance: Langfuse | null = null;

const LANGFUSE_ENABLED = !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);

export function getLangfuse(): Langfuse | null {
  if (!LANGFUSE_ENABLED) return null;

  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY as string,
      secretKey: process.env.LANGFUSE_SECRET_KEY as string,
      baseUrl: process.env.LANGFUSE_BASEURL || undefined,
      flushAt: 5,
      flushInterval: 1000,
    });
  }

  return langfuseInstance;
}

export interface GenerationParams {
  model: string;
  input: unknown;
  modelParameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GenerationResult {
  output: unknown;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
  };
}

export interface SpanRef {
  end: () => void;
}

export interface TraceContext {
  traceId: string;
  startGeneration: (name: string, params: GenerationParams) => GenerationHandle;
  startSpan: (name: string) => SpanRef;
  setError: (error: Error | string) => void;
  flush: () => Promise<void>;
}

export interface GenerationHandle {
  end: (result: GenerationResult) => void;
  setError: (error: Error | string) => void;
}

function createNoopTrace(traceId: string): TraceContext {
  const noopSpan: SpanRef = { end: () => {} };
  const noopGen: GenerationHandle = {
    end: () => {},
    setError: () => {},
  };
  return {
    traceId,
    startGeneration: () => noopGen,
    startSpan: () => noopSpan,
    setError: () => {},
    flush: async () => {},
  };
}

export function traceAICall(options: {
  name: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}): TraceContext {
  const langfuse = getLangfuse();

  if (!langfuse) {
    return createNoopTrace(options.requestId);
  }

  const trace = langfuse.trace({
    id: options.requestId,
    name: options.name,
    userId: options.userId,
    sessionId: options.sessionId,
    metadata: options.metadata,
    tags: options.tags,
  });

  return {
    traceId: options.requestId,

    startGeneration(name: string, params: GenerationParams): GenerationHandle {
      const startTime = Date.now();
      const generation = trace.generation({
        name,
        model: params.model,
        input: params.input,
        modelParameters: params.modelParameters as
          | Record<string, string | number | boolean | string[] | null>
          | undefined,
        metadata: params.metadata as
          | Record<string, string | number | boolean | string[] | null>
          | undefined,
      });

      return {
        end(result: GenerationResult) {
          generation.end({
            output: result.output,
            usage: result.usage
              ? {
                  input: result.usage.input,
                  output: result.usage.output,
                  total: result.usage.total,
                }
              : undefined,
            metadata: { durationMs: Date.now() - startTime },
          });
        },
        setError(error: Error | string) {
          const message = typeof error === 'string' ? error : error.message;
          generation.end({
            output: null,
            level: 'ERROR',
            statusMessage: message,
            metadata: { durationMs: Date.now() - startTime },
          });
        },
      };
    },

    startSpan(name: string): SpanRef {
      const span = trace.span({ name });
      return {
        end() {
          span.end();
        },
      };
    },

    setError(error: Error | string) {
      const message = typeof error === 'string' ? error : error.message;
      trace.update({ metadata: { error: message } });
    },

    async flush() {
      await langfuse.flushAsync();
    },
  };
}

export async function shutdownLangfuse(): Promise<void> {
  if (langfuseInstance) {
    await langfuseInstance.shutdownAsync();
    langfuseInstance = null;
  }
}
