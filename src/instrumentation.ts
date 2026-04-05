export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
        environment: process.env.NODE_ENV,
        enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      });
    }

    // Register logger → Sentry bridge
    const { logger } = await import('@/utils/logger');
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      logger.registerErrorHook((entry) => {
        Sentry.captureMessage(entry.message, {
          level: 'error',
          extra: { ...entry.context, stack: entry.stack },
          tags: {
            requestId: entry.requestId || 'unknown',
            route: entry.route || 'unknown',
          },
        });
      });
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.2,
        environment: process.env.NODE_ENV,
      });
    }
  }
}

export async function onRequestError(
  error: { digest: string } & Error,
  _request: { path: string; method: string; headers: Record<string, string> },
  _context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
  }
) {
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error, {
      tags: { routePath: _context.routePath, routeType: _context.routeType },
    });
  } catch {
    // Sentry not available
  }
}
