/**
 * Planning Start API Route
 *
 * Creates a planning session for the Dual AI Planning pipeline.
 * The session stores concept + layoutManifest for retrieval by the stream endpoint.
 *
 * POST: { concept: AppConcept, layoutManifest: LayoutManifest } → { sessionId }
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import type { PlanningSession } from '@/types/dualPlanning';
import { setSession, cleanupExpiredSessions } from '@/lib/planningSessionStore';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Cleanup old sessions periodically
    cleanupExpiredSessions();

    const body = await request.json();
    const { concept, layoutManifest, cachedIntelligence } = body;

    // Validate inputs
    if (!concept || !concept.name) {
      return NextResponse.json({ error: 'Valid AppConcept is required' }, { status: 400 });
    }

    if (!layoutManifest || !layoutManifest.root) {
      return NextResponse.json({ error: 'Valid LayoutManifest is required' }, { status: 400 });
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const session: PlanningSession = {
      id: sessionId,
      concept,
      layoutManifest,
      createdAt: Date.now(),
      status: 'pending',
      cachedIntelligence: cachedIntelligence ?? undefined,
    };

    setSession(sessionId, session);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('[planning/start] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create planning session' },
      { status: 500 }
    );
  }
}
