/**
 * Background Image Generation API
 *
 * Generates custom background images using Gemini Imagen
 * based on reference screenshots and detected design tokens.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  geminiImageService,
  type BackgroundGenerationRequest,
} from '@/services/GeminiImageService';
import { logger } from '@/utils/logger';

// ============================================================================
// Request Validation
// ============================================================================

const GenerateBackgroundSchema = z.object({
  /** Base64 encoded reference image */
  referenceImage: z.string().min(1),
  /** Detected color palette */
  colorPalette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string().optional(),
    background: z.string(),
    surface: z.string().optional(),
    text: z.string().optional(),
    textMuted: z.string().optional(),
  }),
  /** One-sentence vibe description */
  vibe: z.string().default('modern and clean'),
  /** Keywords describing the aesthetic */
  vibeKeywords: z.array(z.string()).default([]),
  /** Optional specific style instructions */
  styleInstructions: z.string().optional(),
  /** Desired resolution */
  resolution: z.enum(['1K', '2K', '4K']).default('1K'),
});

// ============================================================================
// API Configuration
// ============================================================================

export const maxDuration = 60; // 60 seconds for image generation
export const dynamic = 'force-dynamic';

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Check service availability
    if (!geminiImageService.checkAvailability()) {
      return NextResponse.json(
        { error: 'Gemini API not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = GenerateBackgroundSchema.parse(body);

    logger.info('[generate-background] Starting generation', {
      primary: validatedRequest.colorPalette.primary,
      secondary: validatedRequest.colorPalette.secondary,
      vibe: validatedRequest.vibe,
    });

    // Generate the background
    const result = await geminiImageService.generateBackgroundFromReference(
      validatedRequest as BackgroundGenerationRequest
    );

    const duration = Date.now() - startTime;
    logger.info(`[generate-background] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      uploaded: result.uploaded,
      duration,
    });
  } catch (error) {
    logger.error('[generate-background] Error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Background generation failed', message: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Service Info
// ============================================================================

export async function GET() {
  const isAvailable = geminiImageService.checkAvailability();

  return NextResponse.json({
    name: 'Background Image Generation API',
    version: '1.0',
    description: 'Generate custom background images using Gemini Imagen',
    available: isAvailable,
    endpoints: {
      generate: 'POST /api/images/generate-background',
    },
    requiredFields: {
      referenceImage: 'Base64 encoded reference screenshot',
      colorPalette: 'Object with primary, secondary, background colors',
    },
    optionalFields: {
      vibe: 'One-sentence style description',
      vibeKeywords: 'Array of aesthetic keywords',
      styleInstructions: 'Additional style guidance',
      resolution: '1K, 2K, or 4K',
    },
  });
}
