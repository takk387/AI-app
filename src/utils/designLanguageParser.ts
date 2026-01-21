/**
 * Design Language Parser
 *
 * Parses natural language descriptions into LayoutDesign values.
 * Allows users to describe designs in plain English and get structured output.
 */

import type { LayoutDesign, GlobalStyles, LayoutStructure } from '@/types/layoutDesign';
import { matchDesignPattern, applyPatternToDesign } from './designPatterns';

// ============================================================================
// Type Definitions
// ============================================================================

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface ParsedDesign {
  globalStyles: DeepPartial<GlobalStyles>;
  structure: DeepPartial<LayoutStructure>;
  basePreferences: DeepPartial<LayoutDesign['basePreferences']>;
}

interface VocabularyEntry {
  design: DeepPartial<ParsedDesign>;
  weight?: number; // Higher weight = stronger signal
}

// ============================================================================
// Design Vocabulary
// ============================================================================

/**
 * Vocabulary mapping words to design values
 * Each word can influence multiple design properties
 */
const DESIGN_VOCABULARY: Record<string, VocabularyEntry> = {
  // ---------------------------------------------------------------------------
  // Mood / Style Words
  // ---------------------------------------------------------------------------
  clean: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed' },
        effects: { shadows: 'subtle', borderRadius: 'sm' },
      },
    },
    weight: 2,
  },
  minimal: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed', sectionPadding: 'xl' },
        effects: { shadows: 'none', borderRadius: 'sm', gradients: false },
      },
      basePreferences: { style: 'minimalist' },
    },
    weight: 3,
  },
  minimalist: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed', sectionPadding: 'xl' },
        effects: { shadows: 'none', borderRadius: 'sm', gradients: false },
      },
      basePreferences: { style: 'minimalist' },
    },
    weight: 3,
  },
  bold: {
    design: {
      globalStyles: {
        typography: { headingWeight: 'bold', headingSize: 'xl' },
        effects: { shadows: 'strong' },
      },
    },
    weight: 2,
  },
  playful: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'full', animations: 'playful' },
        typography: { lineHeight: 'relaxed' },
      },
      basePreferences: { style: 'playful' },
    },
    weight: 3,
  },
  fun: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'xl', animations: 'playful' },
      },
      basePreferences: { style: 'playful' },
    },
    weight: 2,
  },
  professional: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'md', shadows: 'medium' },
        typography: { fontFamily: 'Inter, system-ui, sans-serif', headingWeight: 'semibold' },
      },
      basePreferences: { style: 'professional' },
    },
    weight: 3,
  },
  corporate: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'md', shadows: 'medium' },
        typography: { fontFamily: 'Inter, system-ui, sans-serif' },
        colors: { primary: '#2563EB' },
      },
      basePreferences: { style: 'professional' },
    },
    weight: 3,
  },
  modern: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'lg', animations: 'smooth' },
        typography: { fontFamily: 'Inter, system-ui, sans-serif' },
      },
      basePreferences: { style: 'modern' },
    },
    weight: 2,
  },
  elegant: {
    design: {
      globalStyles: {
        typography: { fontFamily: 'Playfair Display, serif', headingWeight: 'medium' },
        effects: { borderRadius: 'sm', shadows: 'subtle' },
        spacing: { density: 'relaxed' },
      },
    },
    weight: 2,
  },
  sleek: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'lg', shadows: 'subtle', animations: 'smooth' },
      },
      basePreferences: { style: 'modern' },
    },
    weight: 2,
  },
  friendly: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'xl' },
        typography: { lineHeight: 'relaxed' },
      },
    },
    weight: 1,
  },
  serious: {
    design: {
      globalStyles: {
        effects: { borderRadius: 'sm', animations: 'subtle' },
        typography: { headingWeight: 'semibold' },
      },
      basePreferences: { style: 'professional' },
    },
    weight: 2,
  },

  // ---------------------------------------------------------------------------
  // Color Scheme Words
  // ---------------------------------------------------------------------------
  dark: {
    design: {
      globalStyles: {
        colors: {
          background: '#0F172A',
          surface: '#1E293B',
          text: '#F8FAFC',
          textMuted: '#94A3B8',
          border: '#334155',
        },
      },
      basePreferences: { colorScheme: 'dark' },
    },
    weight: 3,
  },
  light: {
    design: {
      globalStyles: {
        colors: {
          background: '#FFFFFF',
          surface: '#F8FAFC',
          text: '#0F172A',
          textMuted: '#64748B',
          border: '#E2E8F0',
        },
      },
      basePreferences: { colorScheme: 'light' },
    },
    weight: 3,
  },
  bright: {
    design: {
      globalStyles: {
        colors: { background: '#FFFFFF' },
      },
      basePreferences: { colorScheme: 'light' },
    },
    weight: 2,
  },
  vibrant: {
    design: {
      globalStyles: {
        effects: { gradients: true },
      },
    },
    weight: 1,
  },
  muted: {
    design: {
      globalStyles: {
        effects: { shadows: 'subtle' },
      },
    },
    weight: 1,
  },
  colorful: {
    design: {
      globalStyles: {
        effects: { gradients: true },
      },
    },
    weight: 1,
  },
  monochrome: {
    design: {
      globalStyles: {
        effects: { gradients: false },
      },
    },
    weight: 1,
  },

  // ---------------------------------------------------------------------------
  // Layout Structure Words
  // ---------------------------------------------------------------------------
  dashboard: {
    design: {
      structure: { type: 'dashboard', hasSidebar: true, hasHeader: true },
      globalStyles: { spacing: { density: 'compact' } },
      basePreferences: { layout: 'dashboard' },
    },
    weight: 3,
  },
  landing: {
    design: {
      structure: { type: 'landing', hasSidebar: false, hasHeader: true },
      globalStyles: { spacing: { density: 'relaxed' } },
      basePreferences: { layout: 'single-page' },
    },
    weight: 3,
  },
  'single-page': {
    design: {
      structure: { type: 'single-page', hasSidebar: false },
      basePreferences: { layout: 'single-page' },
    },
    weight: 2,
  },
  'multi-page': {
    design: {
      structure: { type: 'multi-page' },
      basePreferences: { layout: 'multi-page' },
    },
    weight: 2,
  },
  sidebar: {
    design: {
      structure: { hasSidebar: true },
    },
    weight: 2,
  },
  'no-sidebar': {
    design: {
      structure: { hasSidebar: false },
    },
    weight: 2,
  },

  // ---------------------------------------------------------------------------
  // Density / Spacing Words
  // ---------------------------------------------------------------------------
  spacious: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed', sectionPadding: 'xl', componentGap: 'lg' },
      },
    },
    weight: 2,
  },
  airy: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed', sectionPadding: 'xl' },
      },
    },
    weight: 2,
  },
  compact: {
    design: {
      globalStyles: {
        spacing: { density: 'compact', componentGap: 'sm', sectionPadding: 'md' },
      },
    },
    weight: 2,
  },
  dense: {
    design: {
      globalStyles: {
        spacing: { density: 'compact', componentGap: 'sm' },
      },
    },
    weight: 2,
  },
  tight: {
    design: {
      globalStyles: {
        spacing: { density: 'compact' },
        typography: { lineHeight: 'tight', letterSpacing: 'tight' },
      },
    },
    weight: 2,
  },
  breathing: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed' },
        typography: { lineHeight: 'relaxed' },
      },
    },
    weight: 1,
  },

  // ---------------------------------------------------------------------------
  // Effect Words
  // ---------------------------------------------------------------------------
  rounded: {
    design: {
      globalStyles: { effects: { borderRadius: 'xl' } },
    },
    weight: 2,
  },
  sharp: {
    design: {
      globalStyles: { effects: { borderRadius: 'none' } },
    },
    weight: 2,
  },
  flat: {
    design: {
      globalStyles: { effects: { shadows: 'none' } },
    },
    weight: 2,
  },
  elevated: {
    design: {
      globalStyles: { effects: { shadows: 'strong' } },
    },
    weight: 2,
  },
  shadowed: {
    design: {
      globalStyles: { effects: { shadows: 'medium' } },
    },
    weight: 1,
  },
  gradient: {
    design: {
      globalStyles: { effects: { gradients: true } },
    },
    weight: 2,
  },
  animated: {
    design: {
      globalStyles: { effects: { animations: 'smooth' } },
    },
    weight: 1,
  },
  static: {
    design: {
      globalStyles: { effects: { animations: 'none' } },
    },
    weight: 1,
  },
  blurred: {
    design: {
      globalStyles: { effects: { blur: 'medium' } },
    },
    weight: 2,
  },
  glassmorphism: {
    design: {
      globalStyles: {
        effects: { blur: 'medium', borderRadius: 'xl', gradients: true },
      },
    },
    weight: 3,
  },
  glass: {
    design: {
      globalStyles: {
        effects: { blur: 'medium', borderRadius: 'xl' },
      },
    },
    weight: 2,
  },

  // ---------------------------------------------------------------------------
  // Typography Words
  // ---------------------------------------------------------------------------
  serif: {
    design: {
      globalStyles: {
        typography: { fontFamily: 'Georgia, Times New Roman, serif' },
      },
    },
    weight: 2,
  },
  'sans-serif': {
    design: {
      globalStyles: {
        typography: { fontFamily: 'Inter, system-ui, sans-serif' },
      },
    },
    weight: 2,
  },
  monospace: {
    design: {
      globalStyles: {
        typography: { fontFamily: 'Roboto Mono, Consolas, monospace' },
      },
    },
    weight: 2,
  },
  readable: {
    design: {
      globalStyles: {
        typography: { lineHeight: 'relaxed', bodySize: 'base' },
        spacing: { containerWidth: 'narrow' },
      },
    },
    weight: 1,
  },
  large: {
    design: {
      globalStyles: {
        typography: { headingSize: 'xl', bodySize: 'base' },
      },
    },
    weight: 1,
  },
  small: {
    design: {
      globalStyles: {
        typography: { headingSize: 'base', bodySize: 'sm' },
      },
    },
    weight: 1,
  },

  // ---------------------------------------------------------------------------
  // Container Width Words
  // ---------------------------------------------------------------------------
  wide: {
    design: {
      globalStyles: { spacing: { containerWidth: 'wide' } },
    },
    weight: 2,
  },
  narrow: {
    design: {
      globalStyles: { spacing: { containerWidth: 'narrow' } },
    },
    weight: 2,
  },
  'full-width': {
    design: {
      globalStyles: { spacing: { containerWidth: 'full' } },
    },
    weight: 2,
  },
  centered: {
    design: {
      structure: { contentLayout: 'centered' },
    },
    weight: 1,
  },

  // ---------------------------------------------------------------------------
  // App Type Words
  // ---------------------------------------------------------------------------
  blog: {
    design: {
      globalStyles: {
        typography: { lineHeight: 'relaxed' },
        spacing: { containerWidth: 'narrow', density: 'relaxed' },
      },
    },
    weight: 2,
  },
  ecommerce: {
    design: {
      globalStyles: {
        spacing: { density: 'compact', containerWidth: 'wide' },
      },
      structure: { type: 'multi-page' },
    },
    weight: 2,
  },
  shop: {
    design: {
      globalStyles: {
        spacing: { density: 'compact', containerWidth: 'wide' },
      },
      structure: { type: 'multi-page' },
    },
    weight: 2,
  },
  portfolio: {
    design: {
      globalStyles: {
        spacing: { density: 'relaxed' },
        effects: { animations: 'smooth' },
      },
    },
    weight: 2,
  },
  saas: {
    design: {
      globalStyles: {
        // Colors removed - should be AI-generated based on user input
        effects: { borderRadius: 'lg', shadows: 'medium' },
      },
      basePreferences: { style: 'professional' },
    },
    weight: 2,
  },
  admin: {
    design: {
      structure: { type: 'dashboard', hasSidebar: true },
      globalStyles: { spacing: { density: 'compact' } },
    },
    weight: 2,
  },
};

// ============================================================================
// Color Name Mapping
// ============================================================================

/**
 * Map color names to hex values for primary color setting
 */
const COLOR_NAMES: Record<string, string> = {
  red: '#EF4444',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',
  lime: '#84CC16',
  green: '#22C55E',
  emerald: '#10B981',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  sky: '#0EA5E9',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  purple: '#A855F7',
  fuchsia: '#D946EF',
  pink: '#EC4899',
  rose: '#F43F5E',
  slate: '#64748B',
  gray: '#6B7280',
  zinc: '#71717A',
  neutral: '#737373',
  stone: '#78716C',
  black: '#000000',
  white: '#FFFFFF',
};

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Deep merge two objects, with source values overwriting target
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key as keyof typeof source];
    const targetValue = result[key as keyof T];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== undefined &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as DeepPartial<object>
      );
    } else if (sourceValue !== undefined) {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Parse a natural language description into design values
 */
export function parseDesignDescription(description: string): DeepPartial<LayoutDesign> {
  const lower = description.toLowerCase();
  const words = lower.split(/[\s,]+/).filter(Boolean);

  // Initialize result
  let result: DeepPartial<ParsedDesign> = {
    globalStyles: {},
    structure: {},
    basePreferences: {},
  };

  // First, check for design pattern match
  const pattern = matchDesignPattern(description);
  if (pattern) {
    // Apply pattern as base
    const patternDesign = applyPatternToDesign({}, pattern);
    result = deepMerge(result, {
      globalStyles: patternDesign.globalStyles,
      structure: patternDesign.structure,
      basePreferences: patternDesign.basePreferences,
    } as DeepPartial<ParsedDesign>);
  }

  // Then apply vocabulary matches (can override pattern)
  for (const word of words) {
    // Check direct word match
    if (DESIGN_VOCABULARY[word]) {
      const entry = DESIGN_VOCABULARY[word];
      result = deepMerge(result, entry.design);
    }

    // Check for hyphenated matches (e.g., "full-width")
    for (const [vocabWord, entry] of Object.entries(DESIGN_VOCABULARY)) {
      if (lower.includes(vocabWord) && vocabWord.includes('-')) {
        result = deepMerge(result, entry.design);
      }
    }
  }

  // Check for color names and apply as primary color
  for (const [colorName, hexValue] of Object.entries(COLOR_NAMES)) {
    if (words.includes(colorName)) {
      result = deepMerge(result, {
        globalStyles: { colors: { primary: hexValue } },
      });
      break; // Only use first color found
    }
  }

  // Check for hex color patterns
  const hexMatch = description.match(/#[0-9A-Fa-f]{6}/);
  if (hexMatch) {
    result = deepMerge(result, {
      globalStyles: { colors: { primary: hexMatch[0] } },
    });
  }

  return result as DeepPartial<LayoutDesign>;
}

/**
 * Extract keywords from a description for pattern matching
 */
export function extractKeywords(description: string): string[] {
  const lower = description.toLowerCase();
  const words = lower.split(/[\s,]+/).filter(Boolean);

  const keywords: string[] = [];

  // Add vocabulary matches
  for (const word of words) {
    if (DESIGN_VOCABULARY[word]) {
      keywords.push(word);
    }
  }

  // Add color matches
  for (const colorName of Object.keys(COLOR_NAMES)) {
    if (words.includes(colorName)) {
      keywords.push(colorName);
    }
  }

  return [...new Set(keywords)];
}

/**
 * Suggest design improvements based on current design
 */
export function suggestImprovements(
  currentDesign: Partial<LayoutDesign>,
  targetDescription: string
): string[] {
  const suggestions: string[] = [];
  const parsed = parseDesignDescription(targetDescription);

  // Compare colors
  if (
    parsed.globalStyles?.colors?.primary &&
    currentDesign.globalStyles?.colors?.primary !== parsed.globalStyles.colors.primary
  ) {
    suggestions.push(
      `Change primary color to ${parsed.globalStyles.colors.primary} to match your description`
    );
  }

  // Compare spacing
  if (
    parsed.globalStyles?.spacing?.density &&
    currentDesign.globalStyles?.spacing?.density !== parsed.globalStyles.spacing.density
  ) {
    suggestions.push(
      `Adjust spacing density to "${parsed.globalStyles.spacing.density}" for better match`
    );
  }

  // Compare effects
  if (
    parsed.globalStyles?.effects?.borderRadius &&
    currentDesign.globalStyles?.effects?.borderRadius !== parsed.globalStyles.effects.borderRadius
  ) {
    suggestions.push(
      `Set border radius to "${parsed.globalStyles.effects.borderRadius}" to achieve your desired look`
    );
  }

  return suggestions;
}

/**
 * Get a human-readable description of design changes
 */
export function describeDesignChanges(
  before: Partial<LayoutDesign>,
  after: Partial<LayoutDesign>
): string[] {
  const changes: string[] = [];

  // Colors
  if (before.globalStyles?.colors?.primary !== after.globalStyles?.colors?.primary) {
    changes.push(`Primary color: ${after.globalStyles?.colors?.primary}`);
  }
  if (before.globalStyles?.colors?.background !== after.globalStyles?.colors?.background) {
    changes.push(`Background: ${after.globalStyles?.colors?.background}`);
  }

  // Spacing
  if (before.globalStyles?.spacing?.density !== after.globalStyles?.spacing?.density) {
    changes.push(`Spacing density: ${after.globalStyles?.spacing?.density}`);
  }

  // Effects
  if (before.globalStyles?.effects?.borderRadius !== after.globalStyles?.effects?.borderRadius) {
    changes.push(`Border radius: ${after.globalStyles?.effects?.borderRadius}`);
  }
  if (before.globalStyles?.effects?.shadows !== after.globalStyles?.effects?.shadows) {
    changes.push(`Shadows: ${after.globalStyles?.effects?.shadows}`);
  }

  // Structure
  if (before.structure?.type !== after.structure?.type) {
    changes.push(`Layout type: ${after.structure?.type}`);
  }
  if (before.structure?.hasSidebar !== after.structure?.hasSidebar) {
    changes.push(`Sidebar: ${after.structure?.hasSidebar ? 'visible' : 'hidden'}`);
  }

  return changes;
}

export default parseDesignDescription;
