import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Health Check Response Types
 */
interface CheckResult {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  percentUsed: number;
}

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    database: CheckResult;
    storage: CheckResult;
    memory: MemoryMetrics;
    aiService: CheckResult;
  };
}

/**
 * Check Supabase database connection
 */
async function checkSupabaseConnection(): Promise<CheckResult> {
  const startTime = performance.now();

  try {
    const supabase = await createClient();

    // Simple query to test connection
    const { error } = await supabase.from('generated_apps').select('id').limit(1);

    const latency = Math.round(performance.now() - startTime);

    if (error) {
      // Table might not exist, but connection is ok if we get here
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return { status: 'ok', latency, details: { tableExists: false } };
      }
      return { status: 'error', latency, error: error.message };
    }

    return { status: 'ok', latency };
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    return {
      status: 'error',
      latency,
      error: err instanceof Error ? err.message : 'Database connection failed',
    };
  }
}

/**
 * Check Supabase storage buckets
 */
async function checkStorageBuckets(): Promise<CheckResult> {
  const startTime = performance.now();

  try {
    const supabase = await createClient();

    // List buckets to verify storage access
    const { data, error } = await supabase.storage.listBuckets();

    const latency = Math.round(performance.now() - startTime);

    if (error) {
      return { status: 'error', latency, error: error.message };
    }

    return {
      status: 'ok',
      latency,
      details: {
        bucketsCount: data?.length || 0,
        buckets: data?.map((b) => b.name) || [],
      },
    };
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    return {
      status: 'error',
      latency,
      error: err instanceof Error ? err.message : 'Storage check failed',
    };
  }
}

/**
 * Get memory usage metrics
 */
function getMemoryMetrics(): MemoryMetrics {
  const usage = process.memoryUsage();

  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    percentUsed: Math.round((usage.heapUsed / usage.heapTotal) * 100),
  };
}

/**
 * Check Anthropic API status (lightweight check)
 */
async function checkAnthropicStatus(): Promise<CheckResult> {
  const startTime = performance.now();

  try {
    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        status: 'error',
        error: 'ANTHROPIC_API_KEY not configured',
      };
    }

    // We don't make an actual API call to avoid costs
    // Just verify the key format looks valid
    const isValidFormat = apiKey.startsWith('sk-ant-');

    const latency = Math.round(performance.now() - startTime);

    if (!isValidFormat) {
      return {
        status: 'error',
        latency,
        error: 'Invalid API key format',
      };
    }

    return {
      status: 'ok',
      latency,
      details: {
        keyConfigured: true,
        keyPrefix: apiKey.substring(0, 10) + '...',
      },
    };
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    return {
      status: 'error',
      latency,
      error: err instanceof Error ? err.message : 'AI service check failed',
    };
  }
}

/**
 * Timeout wrapper for health checks
 * Returns error result if check takes longer than specified timeout
 */
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

async function withTimeout<T extends CheckResult>(
  promise: Promise<T>,
  checkName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Health check '${checkName}' timed out after ${HEALTH_CHECK_TIMEOUT}ms`));
    }, HEALTH_CHECK_TIMEOUT);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    // Clear timeout to prevent timer leak
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (err) {
    // Clear timeout on error as well
    if (timeoutId) clearTimeout(timeoutId);
    return {
      status: 'error',
      error: err instanceof Error ? err.message : `${checkName} check failed`,
    } as T;
  }
}

/**
 * Determine overall health status based on individual checks
 */
function determineOverallStatus(
  checks: HealthCheckResponse['checks']
): 'ok' | 'degraded' | 'unhealthy' {
  const criticalChecks = [checks.database, checks.aiService];
  const nonCriticalChecks = [checks.storage];

  // If any critical check fails, status is unhealthy
  if (criticalChecks.some((check) => check.status === 'error')) {
    return 'unhealthy';
  }

  // If non-critical checks fail, status is degraded
  if (nonCriticalChecks.some((check) => check.status === 'error')) {
    return 'degraded';
  }

  // Memory warning threshold (85%)
  if (checks.memory.percentUsed > 85) {
    return 'degraded';
  }

  return 'ok';
}

/**
 * Health check endpoint for Railway/container orchestration
 *
 * Returns comprehensive health information including:
 * - Database connectivity
 * - Storage bucket access
 * - Memory usage
 * - AI service configuration
 *
 * @example Response:
 * ```json
 * {
 *   "status": "ok",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "version": "0.1.0",
 *   "uptime": 3600,
 *   "environment": "production",
 *   "checks": {
 *     "database": { "status": "ok", "latency": 45 },
 *     "storage": { "status": "ok", "latency": 32, "details": { "bucketsCount": 3 } },
 *     "memory": { "heapUsed": 128, "heapTotal": 256, "rss": 320, "percentUsed": 50 },
 *     "aiService": { "status": "ok", "latency": 1 }
 *   }
 * }
 * ```
 */
export async function GET() {
  const startTime = performance.now();

  // Run checks in parallel for speed, with timeout protection
  const [database, storage, aiService] = await Promise.all([
    withTimeout(checkSupabaseConnection(), 'database'),
    withTimeout(checkStorageBuckets(), 'storage'),
    withTimeout(checkAnthropicStatus(), 'aiService'),
  ]);

  const memory = getMemoryMetrics();

  const checks = {
    database,
    storage,
    memory,
    aiService,
  };

  const overallStatus = determineOverallStatus(checks);
  const totalLatency = Math.round(performance.now() - startTime);

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    checks,
  };

  // Add total check duration
  const responseWithMeta = {
    ...response,
    _meta: {
      checkDuration: totalLatency,
    },
  };

  // Return appropriate HTTP status code
  // 200 = healthy, 207 = degraded (Multi-Status), 503 = unhealthy
  const httpStatus = overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 207 : 200;

  return NextResponse.json(responseWithMeta, { status: httpStatus });
}
