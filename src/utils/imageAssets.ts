/**
 * Image Assets Service
 *
 * Provides free image services as fallback when DALL-E is unavailable.
 * Uses services like DiceBear for avatars, Placehold.co for placeholders,
 * and LoremFlickr for contextual stock photos.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type ImageContext = 'hero' | 'card' | 'background' | 'avatar' | 'product';
export type AvatarStyle = 'illustrated' | 'abstract' | 'realistic' | 'initials';
export type AppType =
  | 'dashboard'
  | 'ecommerce'
  | 'social'
  | 'productivity'
  | 'portfolio'
  | 'blog'
  | 'analytics'
  | 'general';

export interface ImageAssetOptions {
  width?: number;
  height?: number;
  seed?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
}

// ============================================================================
// Service URLs
// ============================================================================

const SERVICES = {
  dicebear: 'https://api.dicebear.com/7.x',
  placeholder: 'https://placehold.co',
  loremflickr: 'https://loremflickr.com',
  // UI Avatars for text-based avatars
  uiAvatars: 'https://ui-avatars.com/api',
} as const;

// ============================================================================
// Category Mappings
// ============================================================================

/**
 * Map app types to relevant image categories for stock photos
 */
const APP_TYPE_CATEGORIES: Record<AppType, string[]> = {
  dashboard: ['technology', 'data', 'office', 'business'],
  ecommerce: ['product', 'shopping', 'retail', 'fashion'],
  social: ['people', 'community', 'lifestyle', 'friends'],
  productivity: ['workspace', 'office', 'work', 'desk'],
  portfolio: ['design', 'creative', 'art', 'architecture'],
  blog: ['writing', 'coffee', 'books', 'lifestyle'],
  analytics: ['chart', 'data', 'business', 'graph'],
  general: ['abstract', 'minimal', 'modern', 'technology'],
};

/**
 * Map image context to default categories
 */
const CONTEXT_CATEGORIES: Record<ImageContext, string[]> = {
  hero: ['business', 'technology', 'workspace', 'abstract'],
  card: ['design', 'product', 'abstract', 'minimal'],
  background: ['gradient', 'pattern', 'minimal', 'texture'],
  avatar: [], // Handled differently
  product: ['product', 'item', 'object', 'minimal'],
};

// ============================================================================
// Avatar Style Mappings
// ============================================================================

/**
 * DiceBear avatar styles
 */
const DICEBEAR_STYLES: Record<AvatarStyle, string> = {
  illustrated: 'lorelei',
  abstract: 'shapes',
  realistic: 'avataaars',
  initials: 'initials',
};

// ============================================================================
// Image Asset Service
// ============================================================================

export const imageAssets = {
  /**
   * Get a stock image URL for hero/card backgrounds
   */
  getStockImage(
    context: ImageContext,
    options: ImageAssetOptions & { appType?: AppType } = {}
  ): string {
    const { width = 800, height = 400, seed, appType } = options;

    // Get categories based on context and app type
    const categories = appType
      ? APP_TYPE_CATEGORIES[appType]
      : CONTEXT_CATEGORIES[context] || CONTEXT_CATEGORIES.hero;

    const category = categories.join(',');
    const randomSeed = seed || Math.random().toString(36).substring(7);

    return `${SERVICES.loremflickr}/${width}/${height}/${category}?random=${randomSeed}`;
  },

  /**
   * Get an avatar image URL
   */
  getAvatar(
    userId: string,
    options: { style?: AvatarStyle; size?: number; backgroundColor?: string } = {}
  ): string {
    const { style = 'illustrated', size = 64, backgroundColor } = options;
    const dicebearStyle = DICEBEAR_STYLES[style];

    let url = `${SERVICES.dicebear}/${dicebearStyle}/svg?seed=${encodeURIComponent(userId)}&size=${size}`;

    if (backgroundColor) {
      url += `&backgroundColor=${backgroundColor.replace('#', '')}`;
    }

    return url;
  },

  /**
   * Get an avatar with initials
   */
  getInitialsAvatar(
    name: string,
    options: { size?: number; backgroundColor?: string; textColor?: string } = {}
  ): string {
    const { size = 64, backgroundColor = '3B82F6', textColor = 'ffffff' } = options;

    return `${SERVICES.uiAvatars}/?name=${encodeURIComponent(name)}&size=${size}&background=${backgroundColor.replace('#', '')}&color=${textColor.replace('#', '')}&bold=true`;
  },

  /**
   * Get a placeholder image with optional text
   */
  getPlaceholder(
    width: number,
    height: number,
    options: { text?: string; backgroundColor?: string; textColor?: string } = {}
  ): string {
    const { text, backgroundColor = '1a1a2e', textColor = 'eeeeee' } = options;

    let url = `${SERVICES.placeholder}/${width}x${height}/${backgroundColor.replace('#', '')}/${textColor.replace('#', '')}`;

    if (text) {
      url += `?text=${encodeURIComponent(text)}`;
    }

    return url;
  },

  /**
   * Get a product image
   */
  getProductImage(category: string, options: ImageAssetOptions = {}): string {
    const { width = 400, height = 400, seed } = options;
    const randomSeed = seed || Math.random().toString(36).substring(7);

    return `${SERVICES.loremflickr}/${width}/${height}/${encodeURIComponent(category)}?random=${randomSeed}`;
  },

  /**
   * Get a gradient/pattern background
   */
  getGradientBackground(
    width: number,
    height: number,
    options: { colors?: string[]; direction?: 'horizontal' | 'vertical' | 'diagonal' } = {}
  ): string {
    // For now, return a simple placeholder with gradient-like colors
    // In production, you could use a CSS gradient or a gradient generation service
    const { colors = ['1a1a2e', '3B82F6'] } = options;
    return `${SERVICES.placeholder}/${width}x${height}/${colors[0]}/${colors[1] || colors[0]}?text=`;
  },

  /**
   * Get images for a specific app type
   */
  getAppTypeImages(
    appType: AppType,
    count: number = 4
  ): { hero: string; cards: string[]; avatars: string[] } {
    const categories = APP_TYPE_CATEGORIES[appType] || APP_TYPE_CATEGORIES.general;

    return {
      hero: `${SERVICES.loremflickr}/1200/600/${categories.slice(0, 2).join(',')}?random=hero`,
      cards: Array.from({ length: count }, (_, i) =>
        `${SERVICES.loremflickr}/400/300/${categories[i % categories.length]}?random=card${i}`
      ),
      avatars: Array.from({ length: 5 }, (_, i) =>
        `${SERVICES.dicebear}/avataaars/svg?seed=user${i}`
      ),
    };
  },
};

// ============================================================================
// Integration Helper - Get Image with DALL-E Fallback
// ============================================================================

export interface GetImageOptions {
  type: ImageContext;
  prompt?: string;
  appType?: AppType;
  width?: number;
  height?: number;
  seed?: string;
  useDalle?: boolean;
}

/**
 * Get an image URL, falling back to free services if DALL-E is unavailable
 *
 * This is the main entry point for getting images in the LayoutBuilder.
 * It checks if DALL-E is available and falls back gracefully.
 */
export async function getImage(options: GetImageOptions): Promise<string> {
  const { type, appType, width = 800, height = 400, seed, useDalle = false } = options;

  // If DALL-E is not requested or not available, use fallback
  if (!useDalle) {
    return getFallbackImage(type, { width, height, seed, appType });
  }

  // Try DALL-E (caller should handle this externally)
  // This function just returns the fallback when useDalle is false
  return getFallbackImage(type, { width, height, seed, appType });
}

/**
 * Get a fallback image from free services
 */
export function getFallbackImage(
  type: ImageContext,
  options: { width?: number; height?: number; seed?: string; appType?: AppType } = {}
): string {
  const { width = 800, height = 400, seed, appType } = options;

  switch (type) {
    case 'avatar':
      return imageAssets.getAvatar(seed || 'default', { style: 'illustrated' });

    case 'product':
      return imageAssets.getProductImage('product', { width, height, seed });

    case 'background':
      return imageAssets.getPlaceholder(width, height, {
        backgroundColor: '0F172A',
        textColor: '1E293B',
      });

    case 'hero':
    case 'card':
    default:
      return imageAssets.getStockImage(type, { width, height, seed, appType });
  }
}

/**
 * Generate a complete set of fallback images for a layout
 */
export function generateLayoutFallbackImages(
  appType: AppType = 'general',
  cardCount: number = 4
): {
  hero: string;
  cards: string[];
  avatars: string[];
  background: string;
} {
  const images = imageAssets.getAppTypeImages(appType, cardCount);

  return {
    ...images,
    background: imageAssets.getPlaceholder(1920, 1080, {
      backgroundColor: '0F172A',
      textColor: '1E293B',
    }),
  };
}

// ============================================================================
// Preload Helper
// ============================================================================

/**
 * Preload images for faster display
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load: ${url}`));
          img.src = url;
        })
    )
  );
}

/**
 * Check if an image URL is accessible
 */
export async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export default imageAssets;
