/**
 * App Image Generator Service
 *
 * Orchestrates Gemini Imagen (Nanobanana Pro 2) image generation for the AI App Builder.
 * Generates hero images, card images, and backgrounds that match
 * the app's design system and purpose.
 */

import { getGeminiImageService } from './GeminiImageService';
import { detectAppType } from '@/utils/imagePromptBuilder';
import { generateLayoutFallbackImages } from '@/utils/imageAssets';
import type { LayoutManifest } from '@/types/schema';

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
  quality?: 'low' | 'medium' | 'high';
}

const DEFAULT_OPTIONS: AppImageGenerationOptions = {
  generateHero: true,
  generateCards: true,
  generateBackground: false,
  maxCards: 4,
  quality: 'medium',
};

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Generate images for an app build
 *
 * This function orchestrates the complete image generation process:
 * 1. Checks Gemini availability
 * 2. Generates hero, card, and background images using Nanobanana Pro 2
 * 3. Falls back to free services if Gemini unavailable
 * 4. Tracks generation time
 */
export async function generateImagesForApp(
  appName: string,
  appDescription: string,
  layoutManifest: LayoutManifest | undefined,
  features: string[],
  options: AppImageGenerationOptions = {}
): Promise<AppImageGenerationResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const geminiService = getGeminiImageService();

  // Check if we can generate images
  const geminiAvailable = geminiService.checkAvailability();

  if (!geminiAvailable) {
    return buildFallbackResult(appDescription, features.length, startTime);
  }

  // Detect app type for context
  const appType = detectAppType(appDescription);
  const vibe =
    appType === 'portfolio'
      ? 'creative and artistic'
      : appType === 'blog'
        ? 'clean and editorial'
        : appType === 'dashboard'
          ? 'professional and data-focused'
          : 'modern and engaging';

  const result: AppImageGenerationResult = {
    cards: [],
    fallbackUsed: false,
    totalCost: 0, // Gemini pricing is different - would need to implement
    generationTime: 0,
  };

  try {
    // Generate hero image
    if (opts.generateHero) {
      try {
        const heroImage = await geminiService.generateBackgroundFromReference({
          vibe,
          vibeKeywords: [appName, appDescription, 'hero banner', 'wide format'],
          targetElement: 'hero section',
        });

        if (heroImage.imageUrl) {
          result.hero = {
            url: heroImage.imageUrl,
            prompt: `Hero image for ${appName}`,
          };
        }
      } catch (error) {
        console.error('Hero image generation failed:', error);
        // Continue with card generation even if hero fails
      }
    }

    // Generate card images for features
    if (opts.generateCards && features.length > 0) {
      const cardsToGenerate = features.slice(0, opts.maxCards || 4);

      try {
        // Generate cards sequentially (Gemini service doesn't have batch method yet)
        const cardPromises = cardsToGenerate.map(async (feature, index) => {
          try {
            const cardImage = await geminiService.generateBackgroundFromReference({
              vibe,
              vibeKeywords: [feature, 'card illustration', 'icon style'],
              targetElement: 'card',
            });

            return cardImage.imageUrl
              ? {
                  url: cardImage.imageUrl,
                  prompt: `Card image for ${feature}`,
                  title: feature,
                }
              : null;
          } catch (error) {
            console.error(`Card ${index} generation failed:`, error);
            return null;
          }
        });

        const cardResults = await Promise.all(cardPromises);
        result.cards = cardResults.filter(
          (card): card is NonNullable<typeof card> => card !== null
        );
      } catch (error) {
        console.error('Card image generation failed:', error);
        // Continue without cards
      }
    }

    // Generate background image (optional)
    if (opts.generateBackground) {
      try {
        const backgroundImage = await geminiService.generateBackgroundFromReference({
          vibe: `${vibe}, abstract pattern`,
          vibeKeywords: ['background', 'texture', 'seamless'],
          targetElement: 'background',
        });

        if (backgroundImage.imageUrl) {
          result.background = {
            url: backgroundImage.imageUrl,
            prompt: 'Abstract background pattern',
          };
        }
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
 * Check if image generation is available
 */
export function canGenerateImages(): {
  available: boolean;
  reason?: string;
} {
  const geminiService = getGeminiImageService();

  if (!geminiService.checkAvailability()) {
    return {
      available: false,
      reason: 'Gemini Imagen service not available (check GOOGLE_API_KEY)',
    };
  }

  return { available: true };
}

/**
 * Estimate cost for generating images (Gemini pricing TBD)
 */
export function estimateImageGenerationCost(
  options: AppImageGenerationOptions = DEFAULT_OPTIONS
): number {
  // Gemini Imagen pricing is different from DALL-E
  // For now, return 0 until proper pricing is implemented
  return 0;
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
  // Gemini doesn't have the same rate limiting as DALL-E
  // Return default values
  return {
    remaining: 100, // Placeholder
    todayCount: 0,
    todayCost: 0,
    costWarning: false,
  };
}
