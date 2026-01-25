import type { LayoutManifest } from '@/types/schema';

export type AppType =
  | 'dashboard'
  | 'ecommerce'
  | 'social'
  | 'productivity'
  | 'portfolio'
  | 'blog'
  | 'analytics'
  | 'general';

/**
 * Detect app type from description
 */
export function detectAppType(description: string): AppType {
  const lower = description.toLowerCase();
  if (lower.includes('dashboard') || lower.includes('admin')) return 'dashboard';
  if (lower.includes('shop') || lower.includes('store') || lower.includes('ecommerce'))
    return 'ecommerce';
  if (lower.includes('social') || lower.includes('community')) return 'social';
  if (lower.includes('task') || lower.includes('productivity')) return 'productivity';
  if (lower.includes('portfolio')) return 'portfolio';
  if (lower.includes('blog')) return 'blog';
  if (lower.includes('analytics') || lower.includes('metrics')) return 'analytics';
  return 'general';
}

/**
 * Builds optimized prompts for DALL-E based on the app's design system
 */
export function buildImagePrompt(
  context: string,
  manifest?: LayoutManifest,
  type: 'hero' | 'card' | 'background' = 'hero'
): string {
  let stylePrompt = 'modern, professional UI style';

  if (manifest?.designSystem?.colors) {
    const { primary, background } = manifest.designSystem.colors;
    stylePrompt = `minimalist aesthetic using primary color ${primary} on ${background} background`;
  }

  if (type === 'hero') {
    return `high quality hero image for ${context}, ${stylePrompt}, wide angle, suitable for website header, 4k`;
  }

  if (type === 'background') {
    return `subtle abstract background pattern for ${context}, ${stylePrompt}, low contrast, suitable for web background`;
  }

  return `professional image representing ${context}, ${stylePrompt}, high quality photography`;
}
