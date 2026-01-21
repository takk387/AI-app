/**
 * Image Prompt Builder
 *
 * Builds context-aware DALL-E 3 prompts that match the design system.
 * Ensures generated images are visually cohesive with the layout design.
 */

import type { LayoutDesign } from '@/types/layoutDesign';
import type { MockContent } from '@/utils/mockContentGenerator';

// ============================================================================
// Type Definitions
// ============================================================================

export type AppType =
  | 'dashboard'
  | 'ecommerce'
  | 'social'
  | 'productivity'
  | 'portfolio'
  | 'blog'
  | 'analytics'
  | 'general';

export interface ImagePromptContext {
  appName: string;
  appDescription: string;
  appType: AppType;
  design: Partial<LayoutDesign>;
}

export interface GeneratedPrompts {
  hero: string;
  cards: string[];
  background: string;
}

// ============================================================================
// Visual Theme Mappings
// ============================================================================

/**
 * Map app types to visual themes for image generation
 */
const VISUAL_THEMES: Record<AppType, string> = {
  dashboard:
    'data visualization, analytics charts, metrics displays, business intelligence, modern dashboard interface elements',
  ecommerce:
    'products, shopping, retail environment, modern commerce, elegant product displays, shopping experience',
  social:
    'community, human connections, social networking, people interacting, communication, sharing moments',
  productivity:
    'workflow optimization, organized workspace, task management, efficiency tools, professional environment',
  portfolio:
    'creative work showcase, artistic expression, design projects, professional achievements, visual storytelling',
  blog: 'writing, storytelling, content creation, articles, books, coffee shop atmosphere, creative writing',
  analytics:
    'data insights, graphs and charts, business intelligence, statistical visualization, trend analysis',
  general:
    'technology, innovation, modern application, digital transformation, abstract tech concepts',
};

/**
 * Map design styles to visual aesthetics
 */
const STYLE_AESTHETICS: Record<string, string> = {
  modern: 'sleek, contemporary, clean lines, sophisticated, cutting-edge',
  minimalist: 'ultra-clean, abundant whitespace, simple geometric shapes, subtle, zen-like',
  playful: 'vibrant, energetic, friendly, colorful, dynamic, fun',
  professional: 'corporate, trustworthy, refined, polished, business-appropriate',
  custom: 'modern, clean, professional, versatile',
};

/**
 * Color scheme descriptions for prompts
 */
const COLOR_MODES: Record<'light' | 'dark', string> = {
  dark: 'dark background with subtle glowing accents, moody atmospheric lighting, rich deep colors',
  light: 'light bright background with soft shadows, clean airy feel, fresh and inviting',
};

// ============================================================================
// Prompt Building Functions
// ============================================================================

/**
 * Build comprehensive prompts for all layout image types
 */
export function buildImagePrompts(context: ImagePromptContext): GeneratedPrompts {
  const { appName, appDescription, appType, design } = context;
  const colors = design.globalStyles?.colors;
  const style = design.basePreferences?.style || 'modern';
  const colorScheme = design.basePreferences?.colorScheme || 'dark';

  const theme = VISUAL_THEMES[appType] || VISUAL_THEMES.general;
  const aesthetic = STYLE_AESTHETICS[style] || STYLE_AESTHETICS.modern;
  const colorMode = COLOR_MODES[colorScheme === 'dark' ? 'dark' : 'light'];
  const primaryColor = colors?.primary || '#6B7280';

  return {
    hero: buildHeroPrompt(
      appName,
      appDescription,
      theme,
      aesthetic,
      colorMode,
      primaryColor,
      style
    ),
    cards: buildCardPrompts(theme, aesthetic, colorMode, appType),
    background: buildBackgroundPrompt(style, colorScheme, colors?.background),
  };
}

/**
 * Build hero image prompt
 */
function buildHeroPrompt(
  appName: string,
  appDescription: string,
  theme: string,
  aesthetic: string,
  colorMode: string,
  primaryColor: string,
  style: string
): string {
  const emotionalTone =
    style === 'playful'
      ? 'energy, creativity, and excitement'
      : 'trust, innovation, and professionalism';

  return `Create a stunning hero image for "${appName}" - ${appDescription}.

Visual theme: ${theme}
Aesthetic qualities: ${aesthetic}
Color palette: ${colorMode}, with accent hints of ${primaryColor}

Style requirements:
- Abstract, modern composition that suggests the application's purpose
- No text, logos, or literal UI mockups
- Professional quality suitable for a premium tech product
- Evokes feelings of ${emotionalTone}
- Cinematic composition with strong visual hierarchy
- Suitable as a website hero section background

Technical requirements:
- High resolution, sharp details
- Balanced composition for text overlay
- Edge areas should be less busy to accommodate UI elements`;
}

/**
 * Build card thumbnail prompts
 */
function buildCardPrompts(
  theme: string,
  aesthetic: string,
  colorMode: string,
  appType: AppType
): string[] {
  const themeElements = theme.split(',').map((s) => s.trim());
  const cardCount = 4;
  const prompts: string[] = [];

  for (let i = 0; i < cardCount; i++) {
    const element = themeElements[i % themeElements.length];

    prompts.push(`Create a minimalist icon-style thumbnail representing "${element}".

Aesthetic: ${aesthetic}
Color environment: ${colorMode}

Requirements:
- Simple, symbolic representation
- No text or labels
- Abstract or iconic interpretation
- Works as a small card thumbnail
- Professional quality
- Consistent with ${appType} application design language
- Square composition optimized for card use`);
  }

  return prompts;
}

/**
 * Build background/texture prompt
 */
function buildBackgroundPrompt(
  style: string,
  colorScheme: string,
  backgroundColor?: string
): string {
  const baseColor = backgroundColor || (colorScheme === 'dark' ? '#0F172A' : '#FFFFFF');

  return `Create a subtle background image for a ${style} ${colorScheme} themed web application.

Requirements:
- Subtle, non-distracting pattern or gradient
- Base color around ${baseColor}
- Must allow text and content to remain highly readable
- Seamless or soft edge-fading design
- Professional, modern aesthetic
- Can be tileable or have soft gradient falloff

Style: ${STYLE_AESTHETICS[style] || 'modern, clean'}`;
}

// ============================================================================
// Mock Content Integration
// ============================================================================

/**
 * Generate prompts based on mock content from the layout
 */
export function buildPromptsFromMockContent(
  mockContent: MockContent,
  design: Partial<LayoutDesign>
): {
  heroPrompt: string;
  cardPrompts: string[];
} {
  const colorScheme = design.basePreferences?.colorScheme || 'dark';
  const style = design.basePreferences?.style || 'modern';
  const aesthetic = STYLE_AESTHETICS[style] || STYLE_AESTHETICS.modern;
  const colorMode = COLOR_MODES[colorScheme === 'dark' ? 'dark' : 'light'];

  return {
    heroPrompt: `Modern hero image for: ${mockContent.hero.title}
Subtitle context: ${mockContent.hero.subtitle}
Call to action: ${mockContent.hero.cta}

Style: ${aesthetic}
Color mode: ${colorMode}

Requirements:
- Abstract representation of the concept
- No text in the image
- Professional, high-quality composition
- Suitable for hero section with text overlay`,

    cardPrompts: mockContent.cards.map(
      (card) =>
        `Minimalist thumbnail for "${card.title}" (${card.tag})
Context: ${card.subtitle}

Style: ${aesthetic}, clean and modern
Color compatibility: ${colorScheme} mode friendly

Requirements:
- Simple, iconic representation
- No text
- Works well at small sizes
- Professional quality`
    ),
  };
}

// ============================================================================
// Specialized Prompt Builders
// ============================================================================

/**
 * Build prompt for a specific feature card
 */
export function buildFeatureCardPrompt(
  featureName: string,
  featureDescription: string,
  designContext: {
    style: string;
    colorScheme: 'light' | 'dark';
    primaryColor?: string;
  }
): string {
  const aesthetic = STYLE_AESTHETICS[designContext.style] || STYLE_AESTHETICS.modern;
  const colorMode = COLOR_MODES[designContext.colorScheme];

  return `Create a feature card thumbnail for "${featureName}".
Feature description: ${featureDescription}

Visual style: ${aesthetic}
Color environment: ${colorMode}
${designContext.primaryColor ? `Accent color hint: ${designContext.primaryColor}` : ''}

Requirements:
- Abstract, symbolic representation of the feature
- No text, labels, or UI elements
- Simple, iconic design
- Works at small thumbnail size (200-400px)
- Professional quality`;
}

/**
 * Build prompt for user avatar/profile image
 */
export function buildAvatarPrompt(
  style: 'illustrated' | 'abstract' | 'professional',
  designContext: {
    colorScheme: 'light' | 'dark';
    primaryColor?: string;
  }
): string {
  const styleDescriptions: Record<string, string> = {
    illustrated: 'friendly illustrated character, cartoon style, approachable',
    abstract: 'abstract geometric representation, modern art style, colorful shapes',
    professional: 'professional portrait silhouette, business appropriate, clean',
  };

  return `Create a user avatar image.
Style: ${styleDescriptions[style]}
Color scheme: ${designContext.colorScheme} mode compatible
${designContext.primaryColor ? `Accent color: ${designContext.primaryColor}` : ''}

Requirements:
- Circular composition
- No specific human features (generic/abstract)
- Professional quality
- Works at small sizes (40-80px)`;
}

/**
 * Build prompt for product/item image
 */
export function buildProductImagePrompt(
  productCategory: string,
  designContext: {
    style: string;
    colorScheme: 'light' | 'dark';
  }
): string {
  const aesthetic = STYLE_AESTHETICS[designContext.style] || STYLE_AESTHETICS.modern;

  return `Create a product image for: ${productCategory}

Visual style: ${aesthetic}
Background: ${designContext.colorScheme === 'dark' ? 'dark, moody' : 'light, clean white'}

Requirements:
- Professional product photography style
- Clean background (no clutter)
- Good lighting and shadows
- Suitable for e-commerce display
- Square composition`;
}

/**
 * Build prompt for illustration/graphic
 */
export function buildIllustrationPrompt(
  concept: string,
  designContext: {
    style: string;
    colorScheme: 'light' | 'dark';
    primaryColor?: string;
    secondaryColor?: string;
  }
): string {
  const aesthetic = STYLE_AESTHETICS[designContext.style] || STYLE_AESTHETICS.modern;

  return `Create an illustration representing: ${concept}

Style: ${aesthetic}, modern digital illustration
Color palette:
- Primary: ${designContext.primaryColor || '#6B7280'}
- Secondary: ${designContext.secondaryColor || '#9CA3AF'}
- Background compatible with ${designContext.colorScheme} mode

Requirements:
- Flat or semi-flat illustration style
- No text
- Suitable for web use
- Scalable design (works at various sizes)
- Professional, polished finish`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect app type from description
 */
export function detectAppType(description: string, purpose?: string): AppType {
  const text = `${description} ${purpose || ''}`.toLowerCase();

  if (text.includes('dashboard') || text.includes('admin') || text.includes('management')) {
    return 'dashboard';
  }
  if (
    text.includes('shop') ||
    text.includes('store') ||
    text.includes('product') ||
    text.includes('cart')
  ) {
    return 'ecommerce';
  }
  if (
    text.includes('social') ||
    text.includes('community') ||
    text.includes('friend') ||
    text.includes('post')
  ) {
    return 'social';
  }
  if (
    text.includes('task') ||
    text.includes('todo') ||
    text.includes('project') ||
    text.includes('work')
  ) {
    return 'productivity';
  }
  if (text.includes('portfolio') || text.includes('showcase')) {
    return 'portfolio';
  }
  if (text.includes('blog') || text.includes('article') || text.includes('content')) {
    return 'blog';
  }
  if (text.includes('analytics') || text.includes('metrics') || text.includes('report')) {
    return 'analytics';
  }

  return 'general';
}

/**
 * Enhance prompt with design system context
 */
export function enhancePromptWithDesign(basePrompt: string, design: Partial<LayoutDesign>): string {
  const colors = design.globalStyles?.colors;
  const effects = design.globalStyles?.effects;
  const style = design.basePreferences?.style || 'modern';

  const enhancements: string[] = [];

  if (colors?.primary) {
    enhancements.push(`Color accent: ${colors.primary}`);
  }

  if (effects?.borderRadius === 'full' || effects?.borderRadius === 'xl') {
    enhancements.push('Rounded, soft aesthetic');
  } else if (effects?.borderRadius === 'none') {
    enhancements.push('Sharp, geometric aesthetic');
  }

  if (effects?.gradients) {
    enhancements.push('Include subtle gradient elements');
  }

  if (style === 'playful') {
    enhancements.push('Energetic, vibrant feel');
  } else if (style === 'minimalist') {
    enhancements.push('Extremely clean, minimal elements');
  }

  if (enhancements.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

Design system alignment:
${enhancements.map((e) => `- ${e}`).join('\n')}`;
}

export default buildImagePrompts;
