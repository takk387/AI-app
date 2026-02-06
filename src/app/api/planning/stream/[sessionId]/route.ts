/**
 * Planning Stream API Route
 *
 * SSE streaming endpoint for the Dual AI Planning pipeline.
 * Retrieves session data, runs BackgroundPlanningOrchestrator,
 * and streams progress events to the client via Server-Sent Events.
 *
 * GET /api/planning/stream/[sessionId] → SSE stream
 *
 * Event format: data: { type, data: { stage, progress, message, ... } }
 */

import { getSession, deleteSession, updateSessionStatus } from '@/lib/planningSessionStore';
import { BackgroundPlanningOrchestratorService } from '@/services/BackgroundPlanningOrchestrator';
import type { DualPlanProgress, DualPlanSSEEvent } from '@/types/dualPlanning';

export const maxDuration = 600; // 10 minutes
export const dynamic = 'force-dynamic';

function formatSSE(event: DualPlanSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // Retrieve session
  const session = getSession(sessionId);

  if (!session) {
    return new Response(
      formatSSE({
        type: 'error',
        data: {
          stage: 'error',
          progress: 0,
          message: 'Planning session not found or expired',
          error: 'Session not found',
        },
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  // Prevent double execution
  if (session.status === 'running') {
    return new Response(
      formatSSE({
        type: 'error',
        data: {
          stage: 'error',
          progress: 0,
          message: 'Planning session is already running',
          error: 'Session already active',
        },
      }),
      {
        status: 409,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  // Mark session as running
  updateSessionStatus(sessionId, 'running');

  // Create SSE stream
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let writerClosed = false;

  const writeEvent = async (event: DualPlanSSEEvent) => {
    if (writerClosed) return;
    try {
      await writer.write(encoder.encode(formatSSE(event)));
    } catch {
      writerClosed = true;
    }
  };

  const closeWriter = async () => {
    if (writerClosed) return;
    writerClosed = true;
    try {
      await writer.close();
    } catch {
      // Already closed
    }
  };

  // Run pipeline in background
  (async () => {
    try {
      // Determine base URL for internal API calls
      // In server-side context, we need the full URL
      const baseUrl =
        (process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL)
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';

      const orchestrator = new BackgroundPlanningOrchestratorService(baseUrl);

      const result = await orchestrator.execute(
        session.concept,
        session.layoutManifest,
        (progress: DualPlanProgress) => {
          // Stream progress events
          writeEvent({
            type: 'progress',
            data: {
              stage: progress.stage,
              progress: progress.percent,
              message: progress.message,
              details: progress.details,
            },
          });
        },
        session.cachedIntelligence
      );

      // Send final event based on result type
      switch (result.type) {
        case 'complete':
          await writeEvent({
            type: 'complete',
            data: {
              stage: 'complete',
              progress: 100,
              message: 'Architecture planning complete',
              architecture: result.architecture,
            },
          });
          updateSessionStatus(sessionId, 'complete');
          break;

        case 'escalation':
          await writeEvent({
            type: 'escalation',
            data: {
              stage: 'escalated',
              progress: 80,
              message: result.escalation?.reason ?? 'Consensus not reached',
              escalation: result.escalation,
            },
          });
          updateSessionStatus(sessionId, 'complete');
          break;

        case 'error':
          await writeEvent({
            type: 'error',
            data: {
              stage: 'error',
              progress: 0,
              message: result.error ?? 'Pipeline failed',
              error: result.error,
            },
          });
          updateSessionStatus(sessionId, 'error');
          break;
      }

      // Cleanup session after completion
      deleteSession(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown pipeline error';
      console.error('[planning/stream] Pipeline error:', errorMessage);

      await writeEvent({
        type: 'error',
        data: {
          stage: 'error',
          progress: 0,
          message: errorMessage,
          error: errorMessage,
        },
      });

      updateSessionStatus(sessionId, 'error');
      deleteSession(sessionId);
    } finally {
      await closeWriter();
    }
  })();

  // Return SSE response immediately
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
