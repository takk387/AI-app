/**
 * Architecture Generation - API Route
 *
 * Takes a completed AppConcept and generates backend architecture
 * using the BackendArchitectureAgent service.
 *
 * This is a separate step from phase generation, allowing users
 * to review and confirm the architecture before proceeding.
 */

import { NextResponse } from 'next/server';
import { BackendArchitectureAgent } from '@/services/BackendArchitectureAgent';
import type { AppConcept } from '@/types/appConcept';
import type { ArchitectureSpec } from '@/types/architectureSpec';
import { logger } from '@/utils/logger';

// Next.js Route Segment Config
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface GenerateArchitectureRequest {
  concept: AppConcept;
}

interface GenerateArchitectureResponse {
  success: boolean;
  architectureSpec?: ArchitectureSpec;
  reasoning?: {
    summary: string;
    decisions: Array<{ area: string; decision: string; reasoning: string }>;
  };
  warnings?: string[];
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<GenerateArchitectureResponse>> {
  try {
    const body: GenerateArchitectureRequest = await request.json();
    const { concept } = body;

    // Validate concept
    if (!concept) {
      return NextResponse.json(
        {
          success: false,
          error: 'App concept is required',
        },
        { status: 400 }
      );
    }

    if (!concept.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'App concept must have a name',
        },
        { status: 400 }
      );
    }

    // Check if backend is needed
    const needsBackend =
      concept.technical?.needsAuth ||
      concept.technical?.needsDatabase ||
      concept.technical?.needsRealtime ||
      concept.technical?.needsFileUpload;

    if (!needsBackend) {
      return NextResponse.json({
        success: true,
        warnings: ['No backend requirements detected. Architecture generation skipped.'],
      });
    }

    // Generate architecture using BackendArchitectureAgent
    logger.info('[generate-architecture] Calling BackendArchitectureAgent...');
    const agent = new BackendArchitectureAgent();
    const result = await agent.analyze(concept);

    if (!result.success || !result.spec) {
      logger.error('[generate-architecture] Architecture generation failed', undefined, {
        error: result.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Architecture generation failed',
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }

    logger.info(
      `[generate-architecture] Success: ${result.spec.database.tables.length} tables, ${result.spec.api.routes.length} routes`
    );

    return NextResponse.json({
      success: true,
      architectureSpec: result.spec,
      reasoning: result.spec.architectureReasoning,
      warnings: result.warnings,
    });
  } catch (error) {
    logger.error('[generate-architecture] Unexpected error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
