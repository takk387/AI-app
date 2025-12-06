/**
 * DALL-E 3 Service
 *
 * Provides image generation capabilities using OpenAI's DALL-E 3 model.
 * Integrates with the LayoutBuilder to generate contextual visual assets.
 */

import OpenAI from 'openai';

// ============================================================================
// Type Definitions
// ============================================================================

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';

export interface ImageGenerationRequest {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
}

export interface GeneratedImage {
  url: string;
  revisedPrompt: string;
  size: ImageSize;
  quality: ImageQuality;
  generatedAt: number;
}

export interface DesignContext {
  colorScheme: 'light' | 'dark';
  style: 'modern' | 'minimalist' | 'playful' | 'professional' | 'custom';
  primaryColor?: string;
  mood?: string;
  appType?: string;
}

export interface HeroImageRequest {
  appName?: string;
  appDescription: string;
  designContext: DesignContext;
}

export interface CardImageRequest {
  cardTitle: string;
  cardContext?: string;
  designContext: DesignContext;
}

export interface BackgroundImageRequest {
  designContext: DesignContext;
  pattern?: 'abstract' | 'geometric' | 'gradient' | 'texture';
}

// ============================================================================
// Cost Tracking
// ============================================================================

const COST_PER_IMAGE: Record<string, number> = {
  'hd-1792x1024': 0.12,
  'hd-1024x1792': 0.12,
  'hd-1024x1024': 0.08,
  'standard-1792x1024': 0.08,
  'standard-1024x1792': 0.08,
  'standard-1024x1024': 0.04,
};

export function getImageCost(quality: ImageQuality, size: ImageSize): number {
  const key = `${quality}-${size}`;
  return COST_PER_IMAGE[key] || 0.04;
}

// ============================================================================
// DALL-E Service Class
// ============================================================================

class DalleService {
  private client: OpenAI | null = null;
  private cache: Map<string, GeneratedImage> = new Map();
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.isAvailable = true;
    } else {
      console.warn('DALL-E service: OPENAI_API_KEY not configured');
      this.isAvailable = false;
    }
  }

  /**
   * Check if DALL-E service is available
   */
  public checkAvailability(): boolean {
    return this.isAvailable && this.client !== null;
  }

  /**
   * Generate an image using DALL-E 3
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    if (!this.client) {
      throw new Error('DALL-E service not initialized: OPENAI_API_KEY not configured');
    }

    const { prompt, size = '1024x1024', quality = 'standard', style = 'natural' } = request;

    // Check cache first
    const cacheKey = this.getCacheKey(prompt, size, quality, style);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt,
        size,
        quality,
        style,
        n: 1,
      });

      const result: GeneratedImage = {
        url: response.data[0].url!,
        revisedPrompt: response.data[0].revised_prompt || prompt,
        size,
        quality,
        generatedAt: Date.now(),
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('DALL-E image generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a hero image for an app layout
   */
  async generateHeroImage(request: HeroImageRequest): Promise<GeneratedImage> {
    const prompt = this.buildHeroPrompt(request);

    return this.generateImage({
      prompt,
      size: '1792x1024',
      quality: 'hd',
      style: request.designContext.style === 'playful' ? 'vivid' : 'natural',
    });
  }

  /**
   * Generate a card thumbnail image
   */
  async generateCardImage(request: CardImageRequest): Promise<GeneratedImage> {
    const prompt = this.buildCardPrompt(request);

    return this.generateImage({
      prompt,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
    });
  }

  /**
   * Generate a background/texture image
   */
  async generateBackgroundImage(request: BackgroundImageRequest): Promise<GeneratedImage> {
    const prompt = this.buildBackgroundPrompt(request);

    return this.generateImage({
      prompt,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
    });
  }

  /**
   * Generate multiple card images in parallel
   */
  async generateCardImages(
    cards: Array<{ title: string; context?: string }>,
    designContext: DesignContext,
    maxConcurrent: number = 4
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    // Process in batches to avoid rate limiting
    for (let i = 0; i < cards.length; i += maxConcurrent) {
      const batch = cards.slice(i, i + maxConcurrent);
      const batchPromises = batch.map((card) =>
        this.generateCardImage({
          cardTitle: card.title,
          cardContext: card.context,
          designContext,
        }).catch((error) => {
          console.error(`Failed to generate card image for "${card.title}":`, error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is GeneratedImage => r !== null));
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Prompt Building
  // ---------------------------------------------------------------------------

  private buildHeroPrompt(request: HeroImageRequest): string {
    const { appName, appDescription, designContext } = request;
    const { colorScheme, style, primaryColor, mood, appType } = designContext;

    const styleDescriptors = this.getStyleDescriptors(style);
    const colorMode =
      colorScheme === 'dark'
        ? 'dark background with subtle glowing accents, moody atmospheric lighting'
        : 'light, bright background with soft shadows, clean and airy feel';

    const colorHint = primaryColor ? `with accent color hints of ${primaryColor}` : '';
    const moodHint = mood ? `evoking a ${mood} feeling` : '';
    const appTypeHint = appType ? `suitable for a ${appType} application` : '';

    return `Create a modern, professional hero image for a web application${appName ? ` called "${appName}"` : ''}.

Application concept: ${appDescription}

Visual requirements:
- ${styleDescriptors.join(', ')}
- ${colorMode} ${colorHint}
- Abstract, modern composition without text or logos
- Clean, minimalist design suitable for a tech product
- Professional, high-end aesthetic ${moodHint}
- ${appTypeHint}
- No UI elements, buttons, or interface mockups
- Artistic interpretation that suggests the app's purpose without being literal`;
  }

  private buildCardPrompt(request: CardImageRequest): string {
    const { cardTitle, cardContext, designContext } = request;
    const { colorScheme, style } = designContext;

    const styleDescriptors = this.getStyleDescriptors(style);

    return `Create a minimalist thumbnail image for a card titled "${cardTitle}".

${cardContext ? `Context: ${cardContext}` : ''}

Visual requirements:
- ${styleDescriptors.slice(0, 2).join(', ')}
- Simple, iconic representation
- No text or labels
- ${colorScheme === 'dark' ? 'Works well on dark backgrounds' : 'Works well on light backgrounds'}
- Abstract or symbolic representation of the concept
- Professional quality, suitable for a modern web application
- Square composition optimized for card thumbnail use`;
  }

  private buildBackgroundPrompt(request: BackgroundImageRequest): string {
    const { designContext, pattern = 'abstract' } = request;
    const { colorScheme, style, primaryColor } = designContext;

    const patternDescriptions: Record<string, string> = {
      abstract: 'flowing abstract shapes and soft gradients',
      geometric: 'subtle geometric patterns and clean lines',
      gradient: 'smooth color gradients with subtle color transitions',
      texture: 'subtle texture with fine grain or noise',
    };

    return `Create a subtle background image for a ${style} ${colorScheme} themed web application.

Visual requirements:
- ${patternDescriptions[pattern]}
- ${colorScheme === 'dark' ? 'Dark tones based around #0F172A' : 'Light tones based around #FFFFFF'}
${primaryColor ? `- Subtle hints of ${primaryColor} as accent` : ''}
- Must be suitable as a website background
- Not distracting, allows content to remain readable
- Seamless or edge-fading for clean integration
- Professional, modern aesthetic`;
  }

  private getStyleDescriptors(style: string): string[] {
    const descriptors: Record<string, string[]> = {
      modern: ['sleek', 'contemporary', 'clean lines', 'sophisticated'],
      minimalist: ['ultra-clean', 'lots of whitespace', 'simple shapes', 'subtle'],
      playful: ['vibrant', 'energetic', 'friendly colors', 'dynamic'],
      professional: ['corporate', 'trustworthy', 'refined', 'polished'],
      custom: ['modern', 'clean', 'professional'],
    };

    return descriptors[style] || descriptors.custom;
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  private getCacheKey(
    prompt: string,
    size: ImageSize,
    quality: ImageQuality,
    style: ImageStyle
  ): string {
    // Create a simple hash of the prompt for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `${hash.toString(36)}-${size}-${quality}-${style}`;
  }

  /**
   * Clear the image cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

// Create singleton instance (lazy initialization on server)
let dalleServiceInstance: DalleService | null = null;

export function getDalleService(): DalleService {
  if (!dalleServiceInstance) {
    dalleServiceInstance = new DalleService();
  }
  return dalleServiceInstance;
}

// For direct import where singleton is acceptable
export const dalleService = {
  generateImage: (request: ImageGenerationRequest) => getDalleService().generateImage(request),
  generateHeroImage: (request: HeroImageRequest) => getDalleService().generateHeroImage(request),
  generateCardImage: (request: CardImageRequest) => getDalleService().generateCardImage(request),
  generateBackgroundImage: (request: BackgroundImageRequest) =>
    getDalleService().generateBackgroundImage(request),
  generateCardImages: (
    cards: Array<{ title: string; context?: string }>,
    designContext: DesignContext,
    maxConcurrent?: number
  ) => getDalleService().generateCardImages(cards, designContext, maxConcurrent),
  checkAvailability: () => getDalleService().checkAvailability(),
  clearCache: () => getDalleService().clearCache(),
  getCacheStats: () => getDalleService().getCacheStats(),
};

export default dalleService;
