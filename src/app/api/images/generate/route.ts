/**
 * Image Generation API Route
 *
 * Provides endpoints for generating images using DALL-E 3.
 * Supports hero images, card thumbnails, and background images.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDalleService,
  getImageCost,
  type DesignContext,
  type ImageSize,
  type ImageQuality,
} from '@/services/dalleService';

// ============================================================================
// Request Types
// ============================================================================

interface BaseImageRequest {
  designContext: DesignContext;
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
  maxConcurrent?: number;
}

interface CustomImageRequest {
  type: 'custom';
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: 'vivid' | 'natural';
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
    revisedPrompt: string;
    size: string;
    quality: string;
  };
  images?: Array<{
    url: string;
    revisedPrompt: string;
    size: string;
    quality: string;
  }>;
  estimatedCost: number;
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

function validateDesignContext(context: unknown): context is DesignContext {
  if (!context || typeof context !== 'object') return false;

  const ctx = context as Record<string, unknown>;

  if (!ctx.colorScheme || !['light', 'dark'].includes(ctx.colorScheme as string)) {
    return false;
  }

  if (
    !ctx.style ||
    !['modern', 'minimalist', 'playful', 'professional', 'custom'].includes(ctx.style as string)
  ) {
    return false;
  }

  return true;
}

function validateRequest(body: unknown): { valid: true; request: ImageRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.type || typeof req.type !== 'string') {
    return { valid: false, error: 'Missing or invalid "type" field' };
  }

  switch (req.type) {
    case 'hero':
      if (!req.appDescription || typeof req.appDescription !== 'string') {
        return { valid: false, error: 'Hero image requires "appDescription" string' };
      }
      if (!validateDesignContext(req.designContext)) {
        return { valid: false, error: 'Invalid or missing "designContext"' };
      }
      return { valid: true, request: req as unknown as HeroImageRequest };

    case 'card':
      if (!req.cardTitle || typeof req.cardTitle !== 'string') {
        return { valid: false, error: 'Card image requires "cardTitle" string' };
      }
      if (!validateDesignContext(req.designContext)) {
        return { valid: false, error: 'Invalid or missing "designContext"' };
      }
      return { valid: true, request: req as unknown as CardImageRequest };

    case 'background':
      if (!validateDesignContext(req.designContext)) {
        return { valid: false, error: 'Invalid or missing "designContext"' };
      }
      return { valid: true, request: req as unknown as BackgroundImageRequest };

    case 'batch-cards':
      if (!Array.isArray(req.cards) || req.cards.length === 0) {
        return { valid: false, error: 'Batch cards requires non-empty "cards" array' };
      }
      if (!validateDesignContext(req.designContext)) {
        return { valid: false, error: 'Invalid or missing "designContext"' };
      }
      return { valid: true, request: req as unknown as BatchCardRequest };

    case 'custom':
      if (!req.prompt || typeof req.prompt !== 'string') {
        return { valid: false, error: 'Custom image requires "prompt" string' };
      }
      return { valid: true, request: req as unknown as CustomImageRequest };

    default:
      return { valid: false, error: `Unknown request type: ${req.type}` };
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    // Check if DALL-E is available
    const dalleService = getDalleService();
    if (!dalleService.checkAvailability()) {
      return NextResponse.json(
        {
          success: false,
          error: 'DALL-E 3 service is not configured. Please set OPENAI_API_KEY environment variable.',
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
        const result = await dalleService.generateHeroImage({
          appName: imageRequest.appName,
          appDescription: imageRequest.appDescription,
          designContext: imageRequest.designContext,
        });

        return NextResponse.json({
          success: true,
          image: {
            url: result.url,
            revisedPrompt: result.revisedPrompt,
            size: result.size,
            quality: result.quality,
          },
          estimatedCost: getImageCost(result.quality, result.size),
        });
      }

      case 'card': {
        const result = await dalleService.generateCardImage({
          cardTitle: imageRequest.cardTitle,
          cardContext: imageRequest.cardContext,
          designContext: imageRequest.designContext,
        });

        return NextResponse.json({
          success: true,
          image: {
            url: result.url,
            revisedPrompt: result.revisedPrompt,
            size: result.size,
            quality: result.quality,
          },
          estimatedCost: getImageCost(result.quality, result.size),
        });
      }

      case 'background': {
        const result = await dalleService.generateBackgroundImage({
          designContext: imageRequest.designContext,
          pattern: imageRequest.pattern,
        });

        return NextResponse.json({
          success: true,
          image: {
            url: result.url,
            revisedPrompt: result.revisedPrompt,
            size: result.size,
            quality: result.quality,
          },
          estimatedCost: getImageCost(result.quality, result.size),
        });
      }

      case 'batch-cards': {
        const results = await dalleService.generateCardImages(
          imageRequest.cards,
          imageRequest.designContext,
          imageRequest.maxConcurrent
        );

        const totalCost = results.reduce(
          (sum, r) => sum + getImageCost(r.quality, r.size),
          0
        );

        return NextResponse.json({
          success: true,
          images: results.map((r) => ({
            url: r.url,
            revisedPrompt: r.revisedPrompt,
            size: r.size,
            quality: r.quality,
          })),
          estimatedCost: totalCost,
        });
      }

      case 'custom': {
        const result = await dalleService.generateImage({
          prompt: imageRequest.prompt,
          size: imageRequest.size,
          quality: imageRequest.quality,
          style: imageRequest.style,
        });

        return NextResponse.json({
          success: true,
          image: {
            url: result.url,
            revisedPrompt: result.revisedPrompt,
            size: result.size,
            quality: result.quality,
          },
          estimatedCost: getImageCost(result.quality, result.size),
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

    // Handle OpenAI-specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'OpenAI rate limit exceeded. Please try again later.',
            code: 'OPENAI_RATE_LIMIT',
          },
          { status: 429 }
        );
      }

      if (error.message.includes('content policy')) {
        return NextResponse.json(
          {
            success: false,
            error: 'The image request was rejected due to content policy. Please modify your request.',
            code: 'CONTENT_POLICY',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('billing')) {
        return NextResponse.json(
          {
            success: false,
            error: 'OpenAI billing issue. Please check your account.',
            code: 'BILLING_ERROR',
          },
          { status: 402 }
        );
      }
    }

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
  const dalleService = getDalleService();
  const available = dalleService.checkAvailability();
  const cacheStats = dalleService.getCacheStats();

  return NextResponse.json({
    service: 'dalle-image-generation',
    available,
    cache: cacheStats,
    pricing: {
      hero: { size: '1792x1024', quality: 'hd', cost: '$0.12' },
      card: { size: '1024x1024', quality: 'standard', cost: '$0.04' },
      background: { size: '1024x1024', quality: 'standard', cost: '$0.04' },
    },
  });
}
