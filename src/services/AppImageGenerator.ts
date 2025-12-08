/**
 * App Image Generator Service
 *
 * Orchestrates DALL-E 3 image generation for the AI App Builder.
 * Generates hero images, card images, and backgrounds that match
 * the app's design system and purpose.
 */

import { getDalleService, type DesignContext, getImageCost } from './dalleService';
import { getDalleRateLimiter } from '@/utils/dalleRateLimiter';
import { detectAppType } from '@/utils/imagePromptBuilder';
import { generateLayoutFallbackImages } from '@/utils/imageAssets';
import type { LayoutDesign } from '@/types/layoutDesign';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AppImageGenerationResult {
  hero?: {
    url: string;
    prompt: string;
  };
  cards: Array<{
    url: string;
    prompt: string;
    title: string;
  }>;
  background?: {
    url: string;
    prompt: string;
  };
  fallbackUsed: boolean;
  totalCost: number;
  generationTime: number;
}

export interface AppImageGenerationOptions {
  generateHero?: boolean;
  generateCards?: boolean;
  generateBackground?: boolean;
  maxCards?: number;
  quality?: 'standard' | 'hd';
}

const DEFAULT_OPTIONS: AppImageGenerationOptions = {
  generateHero: true,
  generateCards: true,
  generateBackground: false,
  maxCards: 4,
  quality: 'standard',
};

// ============================================================================
// Design Context Builder
// ============================================================================

/**
 * Build design context from LayoutDesign or fallback to defaults
 */
function buildDesignContext(design?: LayoutDesign): DesignContext {
  if (!design) {
    return {
      colorScheme: 'dark',
      style: 'modern',
    };
  }

  return {
    colorScheme: design.basePreferences?.colorScheme === 'light' ? 'light' : 'dark',
    style: design.basePreferences?.style || 'modern',
    primaryColor: design.globalStyles?.colors?.primary,
    mood:
      design.basePreferences?.style === 'playful'
        ? 'fun and energetic'
        : design.basePreferences?.style === 'minimalist'
          ? 'calm and focused'
          : design.basePreferences?.style === 'professional'
            ? 'trustworthy and reliable'
            : 'modern and innovative',
  };
}

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generate images for an app build
 *
 * This function orchestrates the complete image generation process:
 * 1. Checks rate limits and DALL-E availability
 * 2. Builds design context from LayoutDesign
 * 3. Generates hero, card, and background images
 * 4. Falls back to free services if DALL-E unavailable
 * 5. Tracks costs and generation time
 */
export async function generateImagesForApp(
  appName: string,
  appDescription: string,
  design: LayoutDesign | undefined,
  features: string[],
  options: AppImageGenerationOptions = {}
): Promise<AppImageGenerationResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rateLimiter = getDalleRateLimiter();
  const dalleService = getDalleService();

  // Check if we can generate images
  const canGenerate = rateLimiter.canGenerate();
  const dalleAvailable = dalleService.checkAvailability();

  if (!canGenerate || !dalleAvailable) {
    return buildFallbackResult(appDescription, features.length, startTime);
  }

  // Build design context
  const designContext = buildDesignContext(design);
  const appType = detectAppType(appDescription);

  // Add app type to design context
  designContext.appType = appType;

  const result: AppImageGenerationResult = {
    cards: [],
    fallbackUsed: false,
    totalCost: 0,
    generationTime: 0,
  };

  try {
    // Generate hero image
    if (opts.generateHero) {
      try {
        const heroImage = await dalleService.generateHeroImage({
          appName,
          appDescription,
          designContext,
        });

        result.hero = {
          url: heroImage.url,
          prompt: heroImage.revisedPrompt,
        };

        // Record usage and cost
        rateLimiter.recordGeneration('hero', 'hd', '1792x1024'); // Hero is always HD wide
        result.totalCost += getImageCost('hd', '1792x1024');
      } catch (error) {
        console.error('Hero image generation failed:', error);
        // Continue with card generation even if hero fails
      }
    }

    // Generate card images for features
    if (opts.generateCards && features.length > 0) {
      const cardsToGenerate = features.slice(0, opts.maxCards || 4);

      try {
        const cardImages = await dalleService.generateCardImages(
          cardsToGenerate.map((title) => ({ title, context: appDescription })),
          designContext,
          4 // Max concurrent
        );

        result.cards = cardImages.map((img, index) => ({
          url: img.url,
          prompt: img.revisedPrompt,
          title: cardsToGenerate[index] || `Feature ${index + 1}`,
        }));

        // Record usage and cost for each card
        cardImages.forEach(() => {
          rateLimiter.recordGeneration('card', 'standard', '1024x1024');
          result.totalCost += getImageCost('standard', '1024x1024');
        });
      } catch (error) {
        console.error('Card image generation failed:', error);
        // Continue without cards
      }
    }

    // Generate background image (optional)
    if (opts.generateBackground) {
      try {
        const backgroundImage = await dalleService.generateBackgroundImage({
          designContext,
          pattern: 'abstract',
        });

        result.background = {
          url: backgroundImage.url,
          prompt: backgroundImage.revisedPrompt,
        };

        rateLimiter.recordGeneration('background', 'standard', '1024x1024');
        result.totalCost += getImageCost('standard', '1024x1024');
      } catch (error) {
        console.error('Background image generation failed:', error);
        // Continue without background
      }
    }

    // If no images were generated, use fallback
    if (!result.hero && result.cards.length === 0) {
      return buildFallbackResult(appDescription, features.length, startTime);
    }

    result.generationTime = Date.now() - startTime;
    return result;
  } catch (error) {
    console.error('Image generation failed completely:', error);
    return buildFallbackResult(appDescription, features.length, startTime);
  }
}

/**
 * Build a fallback result using free image services
 */
function buildFallbackResult(
  appDescription: string,
  featureCount: number,
  startTime: number
): AppImageGenerationResult {
  const appType = detectAppType(appDescription);
  const fallbackImages = generateLayoutFallbackImages(appType, Math.min(featureCount, 4));

  return {
    hero: {
      url: fallbackImages.hero,
      prompt: 'Fallback image',
    },
    cards: fallbackImages.cards.map((url, index) => ({
      url,
      prompt: 'Fallback image',
      title: `Feature ${index + 1}`,
    })),
    background: {
      url: fallbackImages.background,
      prompt: 'Fallback background',
    },
    fallbackUsed: true,
    totalCost: 0,
    generationTime: Date.now() - startTime,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if image generation is available and allowed
 */
export function canGenerateImages(): {
  available: boolean;
  reason?: string;
} {
  const rateLimiter = getDalleRateLimiter();
  const dalleService = getDalleService();

  if (!dalleService.checkAvailability()) {
    return {
      available: false,
      reason: 'DALL-E service not available (check OPENAI_API_KEY)',
    };
  }

  if (!rateLimiter.canGenerate()) {
    return {
      available: false,
      reason: `Daily limit reached (${rateLimiter.getRemainingGenerations()} remaining)`,
    };
  }

  return { available: true };
}

/**
 * Estimate cost for generating images
 */
export function estimateImageGenerationCost(
  options: AppImageGenerationOptions = DEFAULT_OPTIONS
): number {
  let cost = 0;

  if (options.generateHero) {
    cost += getImageCost('hd', '1792x1024'); // $0.12
  }

  if (options.generateCards) {
    const cardCount = options.maxCards || 4;
    cost += cardCount * getImageCost('standard', '1024x1024'); // $0.04 each
  }

  if (options.generateBackground) {
    cost += getImageCost('standard', '1024x1024'); // $0.04
  }

  return cost;
}

/**
 * Get generation statistics
 */
export function getImageGenerationStats(): {
  remaining: number;
  todayCount: number;
  todayCost: number;
  costWarning: boolean;
} {
  const rateLimiter = getDalleRateLimiter();
  const stats = rateLimiter.getStats();

  return {
    remaining: rateLimiter.getRemainingGenerations(),
    todayCount: stats.today.images,
    todayCost: stats.today.cost,
    costWarning: rateLimiter.isCostWarning(),
  };
}
