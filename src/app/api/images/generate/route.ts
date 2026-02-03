/**
 * Image Generation API Route
 *
 * Provides endpoints for generating images using Gemini Imagen (Nanobanana Pro 2).
 * Supports hero images, card thumbnails, and background images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiImageService } from '@/services/GeminiImageService';

// ============================================================================
// Request Types
// ============================================================================

interface BaseImageRequest {
  vibe: string;
  vibeKeywords: string[];
}

interface HeroImageRequest extends BaseImageRequest {
  type: 'hero';
  appName?: string;
  appDescription: string;
}

interface CardImageRequest extends BaseImageRequest {
  type: 'card';
  cardTitle: string;
  cardContext?: string;
}

interface BackgroundImageRequest extends BaseImageRequest {
  type: 'background';
  pattern?: 'abstract' | 'geometric' | 'gradient' | 'texture';
}

interface BatchCardRequest extends BaseImageRequest {
  type: 'batch-cards';
  cards: Array<{ title: string; context?: string }>;
}

interface CustomImageRequest {
  type: 'custom';
  vibe: string;
  vibeKeywords: string[];
  targetElement?: string;
  referenceImage?: string;
}

type ImageRequest =
  | HeroImageRequest
  | CardImageRequest
  | BackgroundImageRequest
  | BatchCardRequest
  | CustomImageRequest;

// ============================================================================
// Response Types
// ============================================================================

interface SuccessResponse {
  success: true;
  image?: {
    url: string;
    prompt: string;
  };
  images?: Array<{
    url: string;
    prompt: string;
  }>;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

// ============================================================================
// Rate Limiting (Simple in-memory implementation)
// ============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(clientId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

// ============================================================================
// Request Validation
// ============================================================================

function validateRequest(
  body: unknown
): { valid: true; request: ImageRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.type || typeof req.type !== 'string') {
    return { valid: false, error: 'Missing or invalid "type" field' };
  }

  // All request types need vibe and vibeKeywords
  if (req.type !== 'custom' && (!req.vibe || !Array.isArray(req.vibeKeywords))) {
    return { valid: false, error: 'Missing or invalid "vibe" or "vibeKeywords" fields' };
  }

  switch (req.type) {
    case 'hero':
      if (!req.appDescription || typeof req.appDescription !== 'string') {
        return { valid: false, error: 'Hero image requires "appDescription" string' };
      }
      return { valid: true, request: req as unknown as HeroImageRequest };

    case 'card':
      if (!req.cardTitle || typeof req.cardTitle !== 'string') {
        return { valid: false, error: 'Card image requires "cardTitle" string' };
      }
      return { valid: true, request: req as unknown as CardImageRequest };

    case 'background':
      return { valid: true, request: req as unknown as BackgroundImageRequest };

    case 'batch-cards':
      if (!Array.isArray(req.cards) || req.cards.length === 0) {
        return { valid: false, error: 'Batch cards requires non-empty "cards" array' };
      }
      return { valid: true, request: req as unknown as BatchCardRequest };

    case 'custom':
      if (!req.vibe || !Array.isArray(req.vibeKeywords)) {
        return { valid: false, error: 'Custom image requires "vibe" and "vibeKeywords"' };
      }
      return { valid: true, request: req as unknown as CustomImageRequest };

    default:
      return { valid: false, error: `Unknown request type: ${req.type}` };
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Check if Gemini is available
    const geminiService = getGeminiImageService();
    if (!geminiService.checkAvailability()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Gemini Imagen service is not configured. Please set GOOGLE_API_KEY environment variable.',
          code: 'SERVICE_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous';
    const rateCheck = checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfter),
          },
        }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateRequest(body);

    if (validation.valid === false) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const imageRequest = validation.request;

    // Process request based on type
    switch (imageRequest.type) {
      case 'hero': {
        const result = await geminiService.generateBackgroundFromReference({
          vibe: imageRequest.vibe,
          vibeKeywords: [
            ...(imageRequest.vibeKeywords || []),
            imageRequest.appName || '',
            imageRequest.appDescription,
            'hero banner',
          ],
          targetElement: 'hero section',
        });

        if (!result.imageUrl) {
          throw new Error('Image generation failed');
        }

        return NextResponse.json({
          success: true,
          image: {
            url: result.imageUrl,
            prompt: `Hero image: ${imageRequest.appDescription}`,
          },
        });
      }

      case 'card': {
        const result = await geminiService.generateBackgroundFromReference({
          vibe: imageRequest.vibe,
          vibeKeywords: [
            ...(imageRequest.vibeKeywords || []),
            imageRequest.cardTitle,
            imageRequest.cardContext || '',
          ],
          targetElement: 'card',
        });

        if (!result.imageUrl) {
          throw new Error('Image generation failed');
        }

        return NextResponse.json({
          success: true,
          image: {
            url: result.imageUrl,
            prompt: `Card image: ${imageRequest.cardTitle}`,
          },
        });
      }

      case 'background': {
        const result = await geminiService.generateBackgroundFromReference({
          vibe: `${imageRequest.vibe}, ${imageRequest.pattern || 'abstract'}`,
          vibeKeywords: [...(imageRequest.vibeKeywords || []), 'background', 'seamless'],
          targetElement: 'background',
        });

        if (!result.imageUrl) {
          throw new Error('Image generation failed');
        }

        return NextResponse.json({
          success: true,
          image: {
            url: result.imageUrl,
            prompt: `Background: ${imageRequest.pattern || 'abstract'}`,
          },
        });
      }

      case 'batch-cards': {
        const results = await Promise.all(
          imageRequest.cards.map(async (card) => {
            const result = await geminiService.generateBackgroundFromReference({
              vibe: imageRequest.vibe,
              vibeKeywords: [...(imageRequest.vibeKeywords || []), card.title, card.context || ''],
              targetElement: 'card',
            });

            return result.imageUrl
              ? {
                  url: result.imageUrl,
                  prompt: `Card: ${card.title}`,
                }
              : null;
          })
        );

        const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

        return NextResponse.json({
          success: true,
          images: validResults,
        });
      }

      case 'custom': {
        const result = await geminiService.generateBackgroundFromReference({
          vibe: imageRequest.vibe,
          vibeKeywords: imageRequest.vibeKeywords,
          targetElement: imageRequest.targetElement,
          referenceImage: imageRequest.referenceImage,
        });

        if (!result.imageUrl) {
          throw new Error('Image generation failed');
        }

        return NextResponse.json({
          success: true,
          image: {
            url: result.imageUrl,
            prompt: `Custom: ${imageRequest.vibeKeywords.join(', ')}`,
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unknown request type',
            code: 'UNKNOWN_TYPE',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Image generation API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate image. Please try again.',
        code: 'GENERATION_FAILED',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Service Status
// ============================================================================

export async function GET(): Promise<NextResponse> {
  const geminiService = getGeminiImageService();
  const available = geminiService.checkAvailability();

  return NextResponse.json({
    service: 'gemini-imagen-generation',
    model: 'gemini-3-pro-image-preview (Nanobanana Pro 2)',
    available,
    note: 'Gemini Imagen replaces DALL-E for all image generation',
  });
}
