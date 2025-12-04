/**
 * Analytics API Endpoint
 * Phase 4: Analytics & Feedback Loop
 *
 * Provides access to analytics data collected by the analytics system.
 * Use for monitoring, debugging, and optimization.
 */

import { NextResponse } from 'next/server';
import { analytics } from '@/utils/analytics';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const since = searchParams.get('since');
    const route = searchParams.get('route');
    const limit = parseInt(searchParams.get('limit') || '10');

    switch (action) {
      case 'summary': {
        // Get overall summary
        const sinceTimestamp = since ? parseInt(since) : undefined;
        const summary = analytics.getSummary(sinceTimestamp);

        return NextResponse.json({
          action: 'summary',
          period: since
            ? `last ${Math.round((Date.now() - sinceTimestamp) / 1000 / 60)} minutes`
            : 'all time',
          data: summary,
        });
      }

      case 'errors': {
        // Get recent errors
        const errors = analytics.getRecentErrors(limit);

        return NextResponse.json({
          action: 'errors',
          count: errors.length,
          data: errors.map((error) => ({
            requestId: error.requestId,
            route: error.routeType,
            timestamp: new Date(error.timestamp).toISOString(),
            category: error.errorCategory,
            message: error.errorMessage,
            responseTime: error.responseTime,
          })),
        });
      }

      case 'route': {
        // Get metrics by specific route
        if (!route) {
          return NextResponse.json(
            {
              error: 'Route parameter required for route action',
            },
            { status: 400 }
          );
        }

        const routeMetrics = analytics.getMetricsByRoute(route as any, limit);

        return NextResponse.json({
          action: 'route',
          route: route,
          count: routeMetrics.length,
          data: routeMetrics.map((metric) => ({
            requestId: metric.requestId,
            timestamp: new Date(metric.timestamp).toISOString(),
            success: metric.success,
            responseTime: metric.responseTime,
            tokenUsage: metric.tokenUsage,
            validationIssues: metric.validationIssuesFound,
            metadata: metric.metadata,
          })),
        });
      }

      case 'export': {
        // Export all metrics as JSON
        const allMetrics = analytics.exportMetrics();

        return NextResponse.json({
          action: 'export',
          count: allMetrics.length,
          data: allMetrics,
        });
      }

      case 'clear': {
        // Clear all stored metrics (admin action)
        analytics.clear();

        return NextResponse.json({
          action: 'clear',
          message: 'All analytics metrics cleared',
        });
      }

      default: {
        return NextResponse.json(
          {
            error: 'Invalid action. Valid actions: summary, errors, route, export, clear',
            availableActions: ['summary', 'errors', 'route', 'export', 'clear'],
          },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve analytics' },
      { status: 500 }
    );
  }
}

// POST endpoint for triggering periodic summary logs
export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'log-summary') {
      const { logPeriodicSummary } = await import('@/utils/analytics');
      logPeriodicSummary('custom');

      return NextResponse.json({
        message: 'Summary logged to console',
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid action. Valid actions: log-summary',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in analytics API POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
