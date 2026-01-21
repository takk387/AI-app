/**
 * Design Variant Generator
 *
 * Generates multiple design variations for A/B comparison.
 * Each variant includes rationale, trade-offs, and use cases.
 */

import type { LayoutDesign, GlobalStyles, EffectsSettings } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type VariationStyle = 'subtle' | 'moderate' | 'dramatic';

export interface DesignVariant {
  id: string;
  name: string;
  description: string;
  changes: Partial<LayoutDesign>;
  tradeOffs: {
    pros: string[];
    cons: string[];
  };
  bestFor: string[];
  previewDescription: string;
}

export interface DesignVariants {
  baseDesign: Partial<LayoutDesign>;
  variants: DesignVariant[];
  comparisonNotes: string;
}

export interface VariantGeneratorOptions {
  targetElement?: string;
  variantCount?: number;
  variationStyle?: VariationStyle;
  preserveProperties?: string[];
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Adjust color brightness
 */
function adjustBrightness(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const adjust = (c: number) => Math.min(255, Math.max(0, Math.round(c + (c * percent) / 100)));

  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');

  return `#${newR}${newG}${newB}`;
}

/**
 * Shift hue of a color
 */
function shiftHue(hex: string, degrees: number): string {
  const cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  let g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  let b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Shift hue
  h = (h + degrees / 360) % 1;
  if (h < 0) h += 1;

  // Convert HSL back to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================================
// VARIANT GENERATORS
// ============================================================================

/**
 * Generate global style variants
 */
function generateGlobalVariants(
  baseDesign: Partial<LayoutDesign>,
  style: VariationStyle
): DesignVariant[] {
  const variants: DesignVariant[] = [];
  const baseColors = baseDesign.globalStyles?.colors;
  const baseEffects = baseDesign.globalStyles?.effects;

  // Variant 1: Bold & Modern
  variants.push({
    id: `variant_${Date.now()}_bold`,
    name: 'Bold & Modern',
    description: 'High contrast, dramatic shadows, and larger border radius for a striking look',
    changes: {
      globalStyles: {
        ...baseDesign.globalStyles,
        effects: {
          ...baseEffects,
          borderRadius: 'xl',
          shadows: 'strong',
          animations: 'smooth',
        } as EffectsSettings,
        colors: baseColors
          ? {
              ...baseColors,
              primary: adjustBrightness(baseColors.primary || '#6B7280', 10),
            }
          : undefined,
      } as GlobalStyles,
    },
    tradeOffs: {
      pros: ['Eye-catching and memorable', 'Strong visual hierarchy', 'Modern, trendy appearance'],
      cons: [
        'May feel too bold for conservative brands',
        'Heavy shadows can impact performance',
        'Not ideal for text-heavy content',
      ],
    },
    bestFor: ['startups', 'creative agencies', 'product launches', 'landing pages'],
    previewDescription:
      'Dramatic shadows lift elements off the page. Large border radius gives a friendly, modern feel. Colors are slightly more saturated.',
  });

  // Variant 2: Minimal & Clean
  variants.push({
    id: `variant_${Date.now()}_minimal`,
    name: 'Minimal & Clean',
    description: 'Subtle effects, generous whitespace, and refined typography',
    changes: {
      globalStyles: {
        ...baseDesign.globalStyles,
        effects: {
          ...baseEffects,
          borderRadius: 'md',
          shadows: 'subtle',
          animations: 'subtle',
          gradients: false,
        } as EffectsSettings,
        spacing: {
          ...baseDesign.globalStyles?.spacing,
          density: 'relaxed',
          sectionPadding: 'lg',
        },
      } as GlobalStyles,
    },
    tradeOffs: {
      pros: [
        'Timeless, professional appearance',
        'Fast loading, minimal visual noise',
        'Excellent readability',
      ],
      cons: [
        'May feel too plain for some audiences',
        'Requires strong content to shine',
        'Less emotionally engaging',
      ],
    },
    bestFor: ['professional services', 'portfolios', 'documentation', 'enterprise'],
    previewDescription:
      'Clean lines and plenty of breathing room. Subtle shadows provide just enough depth. Animation is refined and purposeful.',
  });

  // Variant 3: Warm & Inviting
  variants.push({
    id: `variant_${Date.now()}_warm`,
    name: 'Warm & Inviting',
    description: 'Warmer color palette with softer shadows and friendly rounded corners',
    changes: {
      globalStyles: {
        ...baseDesign.globalStyles,
        effects: {
          ...baseEffects,
          borderRadius: 'lg',
          shadows: 'medium',
        } as EffectsSettings,
        colors: baseColors
          ? {
              ...baseColors,
              primary: shiftHue(baseColors.primary || '#6B7280', 30), // Shift toward warmer tones
              accent: baseColors.accent || '#6B7280',
            }
          : undefined,
      } as GlobalStyles,
    },
    tradeOffs: {
      pros: [
        'Feels approachable and friendly',
        'Good for building trust',
        'Stands out from cold, corporate designs',
      ],
      cons: [
        'Warm colors may not suit all brands',
        'Can feel less professional in some contexts',
        'Orange tones need careful handling',
      ],
    },
    bestFor: ['community platforms', 'food & hospitality', 'education', 'wellness'],
    previewDescription:
      'Colors shifted toward warmer tones. Rounded corners and medium shadows create a welcoming atmosphere.',
  });

  // Variant 4: Dark & Dramatic (if not already dark)
  if (baseDesign.basePreferences?.colorScheme !== 'dark') {
    variants.push({
      id: `variant_${Date.now()}_dark`,
      name: 'Dark & Dramatic',
      description: 'Dark color scheme with high contrast accents',
      changes: {
        basePreferences: {
          style: baseDesign.basePreferences?.style ?? 'modern',
          layout: baseDesign.basePreferences?.layout ?? 'single-page',
          colorScheme: 'dark',
        },
        globalStyles: {
          ...baseDesign.globalStyles,
          colors: {
            ...baseColors,
            background: '#374151',
            surface: '#4B5563',
            text: '#F9FAFB',
            textMuted: '#D1D5DB',
          },
          effects: {
            ...baseEffects,
            shadows: 'medium',
          } as EffectsSettings,
        } as GlobalStyles,
      },
      tradeOffs: {
        pros: ['Dramatic, premium feel', 'Reduces eye strain in low light', 'Makes colors pop'],
        cons: [
          'Not suitable for all audiences',
          'Requires careful contrast management',
          'Some users prefer light mode',
        ],
      },
      bestFor: ['tech products', 'gaming', 'entertainment', 'creative tools'],
      previewDescription:
        'Deep blue-gray background with bright text. Accent colors become focal points against the dark canvas.',
    });
  }

  // Variant 5: Playful & Energetic
  variants.push({
    id: `variant_${Date.now()}_playful`,
    name: 'Playful & Energetic',
    description: 'Vibrant colors, bouncy animations, and fun rounded shapes',
    changes: {
      basePreferences: {
        colorScheme: baseDesign.basePreferences?.colorScheme ?? 'light',
        layout: baseDesign.basePreferences?.layout ?? 'single-page',
        style: 'playful',
      },
      globalStyles: {
        ...baseDesign.globalStyles,
        effects: {
          ...baseEffects,
          borderRadius: 'full',
          animations: 'playful',
          gradients: true,
        } as EffectsSettings,
        colors: baseColors
          ? {
              ...baseColors,
              primary: '#6B7280', // Neutral gray - AI generates actual colors
              accent: '#9CA3AF', // Neutral gray - AI generates actual colors
            }
          : undefined,
      } as GlobalStyles,
    },
    tradeOffs: {
      pros: [
        'Memorable and distinctive',
        'Appeals to younger audiences',
        'Creates positive emotional response',
      ],
      cons: [
        'May not suit serious topics',
        'Can feel unprofessional',
        'Animations may distract from content',
      ],
    },
    bestFor: ['consumer apps', 'gaming', 'kids/education', 'social platforms'],
    previewDescription:
      'Fully rounded elements with gradient accents. Animations are bouncy and delightful. Purple and pink create an energetic vibe.',
  });

  return variants;
}

/**
 * Generate hero section variants
 */
function generateHeroVariants(baseDesign: Partial<LayoutDesign>): DesignVariant[] {
  const variants: DesignVariant[] = [];
  const baseHero = baseDesign.components?.hero;

  variants.push({
    id: `variant_${Date.now()}_hero_centered`,
    name: 'Centered Hero',
    description: 'Content centered with strong visual focus',
    changes: {
      components: {
        ...baseDesign.components,
        hero: {
          ...baseHero,
          visible: true,
          layout: 'centered',
          height: 'tall',
          hasImage: baseHero?.hasImage ?? false,
          hasSubtitle: baseHero?.hasSubtitle ?? true,
          hasCTA: true,
          ctaCount: 2,
        },
      },
    },
    tradeOffs: {
      pros: ['Strong focal point', 'Works well with short copy', 'Symmetrical balance'],
      cons: ['Less space for content', 'May feel generic', 'Image placement limited'],
    },
    bestFor: ['landing pages', 'product launches', 'announcements'],
    previewDescription:
      'Headline and CTA buttons centered on the page. Clean, focused layout that draws attention to your main message.',
  });

  variants.push({
    id: `variant_${Date.now()}_hero_split`,
    name: 'Split Hero',
    description: 'Content and image side by side',
    changes: {
      components: {
        ...baseDesign.components,
        hero: {
          ...baseHero,
          visible: true,
          layout: 'split',
          height: 'standard',
          hasImage: true,
          imagePosition: 'right',
          hasSubtitle: baseHero?.hasSubtitle ?? true,
          hasCTA: true,
          ctaCount: baseHero?.ctaCount ?? 1,
        },
      },
    },
    tradeOffs: {
      pros: ['Room for imagery', 'Professional appearance', 'Good for longer copy'],
      cons: ['Requires quality image', 'More complex layout', 'May feel corporate'],
    },
    bestFor: ['SaaS products', 'services', 'portfolios'],
    previewDescription:
      'Text on the left, compelling image on the right. Classic layout that balances information with visuals.',
  });

  variants.push({
    id: `variant_${Date.now()}_hero_fullscreen`,
    name: 'Fullscreen Hero',
    description: 'Full viewport height with background image',
    changes: {
      components: {
        ...baseDesign.components,
        hero: {
          ...baseHero,
          visible: true,
          layout: 'image-background',
          height: 'fullscreen',
          hasImage: true,
          imagePosition: 'background',
          hasSubtitle: baseHero?.hasSubtitle ?? true,
          hasCTA: true,
          ctaCount: baseHero?.ctaCount ?? 1,
        },
      },
    },
    tradeOffs: {
      pros: ['Maximum impact', 'Immersive experience', 'Great for storytelling'],
      cons: ['Pushes content below fold', 'Text readability challenges', 'Slower load time'],
    },
    bestFor: ['creative agencies', 'photography', 'luxury brands', 'events'],
    previewDescription:
      'Hero takes up the entire screen with a stunning background image. Text overlaid with careful contrast.',
  });

  return variants;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate design variants for comparison
 */
export function generateDesignVariants(
  baseDesign: Partial<LayoutDesign>,
  options: VariantGeneratorOptions = {}
): DesignVariants {
  const { targetElement = 'global', variantCount = 3, variationStyle = 'moderate' } = options;

  let allVariants: DesignVariant[] = [];

  // Generate variants based on target
  switch (targetElement) {
    case 'hero':
      allVariants = generateHeroVariants(baseDesign);
      break;
    case 'global':
    default:
      allVariants = generateGlobalVariants(baseDesign, variationStyle);
      break;
  }

  // Limit to requested count
  const selectedVariants = allVariants.slice(0, variantCount);

  // Generate comparison notes
  const comparisonNotes = generateComparisonNotes(selectedVariants);

  return {
    baseDesign,
    variants: selectedVariants,
    comparisonNotes,
  };
}

/**
 * Generate comparison notes for variants
 */
function generateComparisonNotes(variants: DesignVariant[]): string {
  if (variants.length === 0) return 'No variants generated.';

  const names = variants.map((v) => v.name).join(', ');
  const notes = `Generated ${variants.length} design variants: ${names}.

Key differences:
${variants.map((v) => `- **${v.name}**: ${v.description}`).join('\n')}

Each variant has different trade-offs. Consider your target audience and brand personality when choosing.`;

  return notes;
}

/**
 * Apply a variant to the base design
 */
export function applyVariant(
  baseDesign: Partial<LayoutDesign>,
  variant: DesignVariant
): Partial<LayoutDesign> {
  return deepMerge(baseDesign, variant.changes);
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}
