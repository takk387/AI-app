/**
 * Intelligence Gathering API Route
 *
 * Runs Stage 2 (LiveIntelligenceGatherer) independently from the full pipeline.
 * Called by useBackgroundIntelligence hook during the Design step to pre-cache
 * intelligence data before the AI Plan page starts.
 *
 * POST: { concept: AppConcept } → { intelligence: IntelligenceContext }
 */

import { NextResponse } from 'next/server';
import { LiveIntelligenceGathererService } from '@/services/LiveIntelligenceGatherer';

export const maxDuration = 60; // Intelligence gathering can take up to 60s
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { concept } = body;

    if (!concept || !concept.name) {
      return NextResponse.json(
        { error: 'Valid AppConcept with name is required' },
        { status: 400 }
      );
    }

    // Determine base URL for internal API calls
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const gatherer = new LiveIntelligenceGathererService(baseUrl);
    const intelligence = await gatherer.gather(concept);

    return NextResponse.json({ intelligence });
  } catch (error) {
    console.error('[planning/intelligence] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Intelligence gathering failed' },
      { status: 500 }
    );
  }
}
