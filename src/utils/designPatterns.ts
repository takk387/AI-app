/**
 * Design Patterns - Structural Design Templates
 *
 * These patterns represent common professional design aesthetics that can be
 * applied to layouts. Each pattern includes style specifications for
 * typography, spacing, and effects.
 *
 * IMPORTANT: Colors in these patterns are IGNORED during application.
 * All colors should be AI-generated based on user input or extracted from
 * uploaded images. The color values here are for reference only and will
 * NOT be applied to designs. See applyPatternToDesign() for implementation.
 */

import type {
  GlobalStyles,
  LayoutDesign,
  LayoutStructure,
  HeaderDesign,
  SidebarDesign,
  CardDesign,
  HeroDesign,
} from '@/types/layoutDesign';

// ============================================================================
// Design Pattern Interface
// ============================================================================

export interface DesignPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[]; // For natural language matching
  preview?: string; // Optional preview image URL
  globalStyles: Partial<GlobalStyles>;
  structure?: Partial<LayoutStructure>;
  components?: {
    header?: Partial<HeaderDesign>;
    sidebar?: Partial<SidebarDesign>;
    cards?: Partial<CardDesign>;
    hero?: Partial<HeroDesign>;
  };
}

// ============================================================================
// Design Patterns Collection
// ============================================================================

export const DESIGN_PATTERNS: Record<string, DesignPattern> = {
  // ---------------------------------------------------------------------------
  // Glassmorphism
  // ---------------------------------------------------------------------------
  glassmorphism: {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass effect with transparency, blur, and soft borders',
    keywords: ['glass', 'frosted', 'blur', 'transparent', 'modern', 'elegant', 'ios'],
    globalStyles: {
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#EC4899',
        background: '#0F172A',
        surface: 'rgba(255, 255, 255, 0.1)',
        text: '#F8FAFC',
        textMuted: '#CBD5E1',
        border: 'rgba(255, 255, 255, 0.2)',
      },
      effects: {
        borderRadius: 'xl',
        shadows: 'subtle',
        animations: 'smooth',
        blur: 'medium',
        gradients: true,
      },
      spacing: {
        density: 'normal',
        containerWidth: 'standard',
        sectionPadding: 'lg',
        componentGap: 'md',
      },
    },
    components: {
      header: { style: 'blur' },
      cards: { style: 'minimal', hoverEffect: 'glow' },
    },
  },

  // ---------------------------------------------------------------------------
  // Neumorphism
  // ---------------------------------------------------------------------------
  neumorphism: {
    id: 'neumorphism',
    name: 'Neumorphism',
    description: 'Soft, extruded UI with subtle shadows creating depth',
    keywords: ['neomorphism', 'soft', 'extruded', '3d', 'tactile', 'skeumorphic'],
    globalStyles: {
      colors: {
        primary: '#6366F1',
        secondary: '#818CF8',
        background: '#E2E8F0',
        surface: '#E2E8F0',
        text: '#1E293B',
        textMuted: '#64748B',
        border: '#CBD5E1',
      },
      effects: {
        borderRadius: 'xl',
        shadows: 'subtle',
        animations: 'subtle',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'standard',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
    },
    components: {
      cards: { style: 'elevated', hoverEffect: 'lift' },
    },
  },

  // ---------------------------------------------------------------------------
  // Minimal
  // ---------------------------------------------------------------------------
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean design with maximum whitespace and subtle elements',
    keywords: ['minimal', 'minimalist', 'clean', 'simple', 'whitespace', 'zen'],
    globalStyles: {
      colors: {
        primary: '#0F172A',
        secondary: '#475569',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#0F172A',
        textMuted: '#64748B',
        border: '#E2E8F0',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: 'medium',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'base',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
      },
      effects: {
        borderRadius: 'sm',
        shadows: 'none',
        animations: 'subtle',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'narrow',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
    },
    components: {
      cards: { style: 'bordered', hoverEffect: 'none' },
      hero: { layout: 'centered', height: 'tall' },
    },
  },

  // ---------------------------------------------------------------------------
  // Dark Mode Pro
  // ---------------------------------------------------------------------------
  darkModePro: {
    id: 'darkModePro',
    name: 'Dark Mode Pro',
    description: 'Professional dark theme with accent highlights and subtle depth',
    keywords: ['dark', 'night', 'pro', 'developer', 'tech', 'coding'],
    globalStyles: {
      colors: {
        primary: '#3B82F6',
        secondary: '#6366F1',
        accent: '#F59E0B',
        background: '#09090B',
        surface: '#18181B',
        text: '#FAFAFA',
        textMuted: '#A1A1AA',
        border: '#27272A',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      effects: {
        borderRadius: 'lg',
        shadows: 'subtle',
        animations: 'smooth',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'normal',
        containerWidth: 'standard',
        sectionPadding: 'lg',
        componentGap: 'md',
      },
    },
    components: {
      cards: { style: 'bordered', hoverEffect: 'glow' },
    },
  },

  // ---------------------------------------------------------------------------
  // Corporate SaaS
  // ---------------------------------------------------------------------------
  corporateSaas: {
    id: 'corporateSaas',
    name: 'Corporate SaaS',
    description: 'Professional, trustworthy design for B2B applications',
    keywords: ['corporate', 'business', 'enterprise', 'saas', 'professional', 'b2b', 'trustworthy'],
    globalStyles: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        accent: '#0EA5E9',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#0F172A',
        textMuted: '#64748B',
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#CA8A04',
        error: '#DC2626',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'base',
        lineHeight: 'normal',
        letterSpacing: 'normal',
      },
      effects: {
        borderRadius: 'md',
        shadows: 'medium',
        animations: 'smooth',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'normal',
        containerWidth: 'wide',
        sectionPadding: 'lg',
        componentGap: 'md',
      },
    },
    structure: {
      type: 'dashboard',
      hasHeader: true,
      hasSidebar: true,
    },
    components: {
      sidebar: { visible: true, style: 'standard', collapsible: true },
      cards: { style: 'elevated', hoverEffect: 'lift' },
    },
  },

  // ---------------------------------------------------------------------------
  // Playful
  // ---------------------------------------------------------------------------
  playful: {
    id: 'playful',
    name: 'Playful',
    description: 'Vibrant, energetic design with bright colors and rounded shapes',
    keywords: ['playful', 'fun', 'colorful', 'vibrant', 'friendly', 'energetic', 'creative'],
    globalStyles: {
      colors: {
        primary: '#8B5CF6',
        secondary: '#EC4899',
        accent: '#F59E0B',
        background: '#FAFAFA',
        surface: '#FFFFFF',
        text: '#1F2937',
        textMuted: '#6B7280',
        border: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      typography: {
        fontFamily: 'Poppins, system-ui, sans-serif',
        headingWeight: 'bold',
        bodyWeight: 'normal',
        headingSize: 'xl',
        bodySize: 'base',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
      },
      effects: {
        borderRadius: 'full',
        shadows: 'medium',
        animations: 'playful',
        blur: 'none',
        gradients: true,
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'standard',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
    },
    components: {
      cards: { style: 'filled', hoverEffect: 'scale' },
      hero: { height: 'tall', layout: 'centered' },
    },
  },

  // ---------------------------------------------------------------------------
  // Brutalist
  // ---------------------------------------------------------------------------
  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    description: 'Raw, bold design with sharp edges and high contrast',
    keywords: ['brutalist', 'raw', 'bold', 'contrast', 'harsh', 'artistic', 'edgy'],
    globalStyles: {
      colors: {
        primary: '#000000',
        secondary: '#FFFFFF',
        accent: '#FF0000',
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textMuted: '#666666',
        border: '#000000',
      },
      typography: {
        fontFamily: 'Roboto Mono, monospace',
        headingWeight: 'bold',
        bodyWeight: 'normal',
        headingSize: 'xl',
        bodySize: 'base',
        lineHeight: 'tight',
        letterSpacing: 'tight',
      },
      effects: {
        borderRadius: 'none',
        shadows: 'strong',
        animations: 'none',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'compact',
        containerWidth: 'full',
        sectionPadding: 'md',
        componentGap: 'sm',
      },
    },
    components: {
      cards: { style: 'bordered', hoverEffect: 'none' },
    },
  },

  // ---------------------------------------------------------------------------
  // Warm Organic
  // ---------------------------------------------------------------------------
  warmOrganic: {
    id: 'warmOrganic',
    name: 'Warm Organic',
    description: 'Earthy, natural tones with soft curves and comfortable spacing',
    keywords: ['warm', 'organic', 'natural', 'earthy', 'cozy', 'friendly', 'sustainable'],
    globalStyles: {
      colors: {
        primary: '#B45309',
        secondary: '#A16207',
        accent: '#059669',
        background: '#FEF7ED',
        surface: '#FFFBF5',
        text: '#422006',
        textMuted: '#78716C',
        border: '#E7E5E4',
      },
      typography: {
        fontFamily: 'Georgia, serif',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'base',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
      },
      effects: {
        borderRadius: 'lg',
        shadows: 'subtle',
        animations: 'smooth',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'narrow',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
    },
    components: {
      cards: { style: 'minimal', hoverEffect: 'lift' },
    },
  },

  // ---------------------------------------------------------------------------
  // Tech Startup
  // ---------------------------------------------------------------------------
  techStartup: {
    id: 'techStartup',
    name: 'Tech Startup',
    description: 'Modern, innovative design with gradients and bold typography',
    keywords: ['startup', 'tech', 'innovation', 'modern', 'gradient', 'futuristic'],
    globalStyles: {
      colors: {
        primary: '#7C3AED',
        secondary: '#2DD4BF',
        accent: '#F97316',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F8FAFC',
        textMuted: '#94A3B8',
        border: '#334155',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: 'bold',
        bodyWeight: 'normal',
        headingSize: 'xl',
        bodySize: 'base',
        lineHeight: 'normal',
        letterSpacing: 'tight',
      },
      effects: {
        borderRadius: 'xl',
        shadows: 'medium',
        animations: 'smooth',
        blur: 'subtle',
        gradients: true,
      },
      spacing: {
        density: 'normal',
        containerWidth: 'standard',
        sectionPadding: 'xl',
        componentGap: 'md',
      },
    },
    structure: {
      type: 'landing',
      hasHeader: true,
      hasSidebar: false,
    },
    components: {
      hero: { visible: true, height: 'fullscreen', layout: 'centered' },
      cards: { style: 'elevated', hoverEffect: 'glow' },
    },
  },

  // ---------------------------------------------------------------------------
  // Editorial
  // ---------------------------------------------------------------------------
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Typography-focused design for content-heavy applications',
    keywords: ['editorial', 'magazine', 'blog', 'content', 'reading', 'article', 'publication'],
    globalStyles: {
      colors: {
        primary: '#0F172A',
        secondary: '#475569',
        accent: '#DC2626',
        background: '#FFFFFF',
        surface: '#FAFAFA',
        text: '#1E293B',
        textMuted: '#64748B',
        border: '#E2E8F0',
      },
      typography: {
        fontFamily: 'Georgia, Times New Roman, serif',
        headingFont: 'Playfair Display, serif',
        headingWeight: 'bold',
        bodyWeight: 'normal',
        headingSize: 'xl',
        bodySize: 'base',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
      },
      effects: {
        borderRadius: 'none',
        shadows: 'none',
        animations: 'subtle',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'relaxed',
        containerWidth: 'narrow',
        sectionPadding: 'xl',
        componentGap: 'lg',
      },
    },
    structure: {
      type: 'single-page',
      contentLayout: 'centered',
      mainContentWidth: 'narrow',
    },
    components: {
      cards: { style: 'minimal', hoverEffect: 'none' },
    },
  },

  // ---------------------------------------------------------------------------
  // E-commerce
  // ---------------------------------------------------------------------------
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Conversion-focused design for online stores',
    keywords: ['ecommerce', 'shop', 'store', 'retail', 'product', 'cart', 'shopping'],
    globalStyles: {
      colors: {
        primary: '#0F172A',
        secondary: '#64748B',
        accent: '#DC2626',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#0F172A',
        textMuted: '#64748B',
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#DC2626',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: 'semibold',
        bodyWeight: 'normal',
        headingSize: 'lg',
        bodySize: 'sm',
        lineHeight: 'normal',
        letterSpacing: 'normal',
      },
      effects: {
        borderRadius: 'md',
        shadows: 'subtle',
        animations: 'smooth',
        blur: 'none',
        gradients: false,
      },
      spacing: {
        density: 'compact',
        containerWidth: 'wide',
        sectionPadding: 'md',
        componentGap: 'sm',
      },
    },
    structure: {
      type: 'multi-page',
      hasHeader: true,
      hasSidebar: false,
    },
    components: {
      header: { hasSearch: true, hasCTA: true, ctaText: 'Cart' },
      cards: { style: 'minimal', imagePosition: 'top', hoverEffect: 'scale' },
    },
  },
};

// ============================================================================
// Pattern Matching Functions
// ============================================================================

/**
 * Match user description to a design pattern using keyword analysis
 */
export function matchDesignPattern(description: string): DesignPattern | null {
  const lower = description.toLowerCase();
  const words = lower.split(/\s+/);

  let bestMatch: { pattern: DesignPattern; score: number } | null = null;

  for (const [, pattern] of Object.entries(DESIGN_PATTERNS)) {
    let score = 0;

    // Check for keyword matches
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        score += 2; // Full keyword match
      }
      // Partial match for each word
      for (const word of words) {
        if (word.includes(keyword) || keyword.includes(word)) {
          score += 1;
        }
      }
    }

    // Check pattern name match
    if (lower.includes(pattern.name.toLowerCase())) {
      score += 5;
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern, score };
    }
  }

  // Return pattern only if score is significant
  return bestMatch && bestMatch.score >= 2 ? bestMatch.pattern : null;
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): DesignPattern | null {
  return DESIGN_PATTERNS[id] || null;
}

/**
 * Get all available patterns
 */
export function getAllPatterns(): DesignPattern[] {
  return Object.values(DESIGN_PATTERNS);
}

/**
 * Apply a design pattern to an existing LayoutDesign
 *
 * IMPORTANT: This function intentionally does NOT apply colors from patterns.
 * Colors should be AI-generated based on user input or extracted from images.
 * Only typography, spacing, effects, and structural properties are applied.
 */
export function applyPatternToDesign(
  design: Partial<LayoutDesign>,
  pattern: DesignPattern
): Partial<LayoutDesign> {
  return {
    ...design,
    globalStyles: {
      ...design.globalStyles,
      // NOTE: Colors are intentionally NOT applied from patterns
      // Colors should come from AI generation or image extraction
      colors: design.globalStyles?.colors,
      typography: {
        ...design.globalStyles?.typography,
        ...pattern.globalStyles.typography,
      },
      spacing: {
        ...design.globalStyles?.spacing,
        ...pattern.globalStyles.spacing,
      },
      effects: {
        ...design.globalStyles?.effects,
        ...pattern.globalStyles.effects,
      },
    } as LayoutDesign['globalStyles'],
    structure: {
      ...design.structure,
      ...pattern.structure,
    } as LayoutDesign['structure'],
    components: {
      ...design.components,
      ...pattern.components,
    } as LayoutDesign['components'],
  };
}

/**
 * Get patterns that match a color scheme preference
 */
export function getPatternsByColorScheme(scheme: 'light' | 'dark'): DesignPattern[] {
  return Object.values(DESIGN_PATTERNS).filter((pattern) => {
    const bg = pattern.globalStyles.colors?.background || '#FFFFFF';
    // Simple heuristic: dark backgrounds have low RGB values
    const isDark = bg.startsWith('#0') || bg.startsWith('#1') || bg.startsWith('#2');
    return scheme === 'dark' ? isDark : !isDark;
  });
}

/**
 * Get patterns suitable for a specific app type
 */
export function getPatternsByAppType(
  appType: 'dashboard' | 'landing' | 'ecommerce' | 'blog' | 'portfolio'
): DesignPattern[] {
  const typeKeywords: Record<string, string[]> = {
    dashboard: ['corporate', 'saas', 'dark', 'pro', 'professional'],
    landing: ['startup', 'playful', 'modern', 'minimal'],
    ecommerce: ['ecommerce', 'clean', 'minimal', 'corporate'],
    blog: ['editorial', 'minimal', 'organic', 'clean'],
    portfolio: ['minimal', 'creative', 'playful', 'editorial'],
  };

  const keywords = typeKeywords[appType] || [];

  return Object.values(DESIGN_PATTERNS).filter((pattern) =>
    pattern.keywords.some((k) => keywords.includes(k))
  );
}

export default DESIGN_PATTERNS;
