/**
 * Google Fonts Database
 *
 * Curated list of 50 popular Google Fonts with their characteristics
 * for the Typography Panel font picker.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleFont {
  family: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  style:
    | 'geometric'
    | 'humanist'
    | 'neo-grotesque'
    | 'transitional'
    | 'didone'
    | 'slab'
    | 'modern'
    | 'classic'
    | 'decorative';
  weights: number[];
  characteristics: string[];
  popular?: boolean;
}

// ============================================================================
// GOOGLE FONTS DATABASE
// ============================================================================

export const GOOGLE_FONTS: GoogleFont[] = [
  // -------------------------------------------------------------------------
  // Sans-Serif - Geometric
  // -------------------------------------------------------------------------
  {
    family: 'Inter',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['clean', 'modern', 'readable', 'ui-friendly'],
    popular: true,
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['friendly', 'rounded', 'modern'],
    popular: true,
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['bold', 'elegant', 'urban'],
    popular: true,
  },
  {
    family: 'DM Sans',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['clean', 'modern', 'low-contrast'],
  },
  {
    family: 'Space Grotesk',
    category: 'sans-serif',
    style: 'geometric',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['techy', 'modern', 'unique'],
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    style: 'geometric',
    weights: [200, 300, 400, 500, 600, 700, 800],
    characteristics: ['friendly', 'modern', 'startup'],
  },
  {
    family: 'Outfit',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['versatile', 'modern', 'clean'],
  },
  {
    family: 'Sora',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    characteristics: ['techy', 'futuristic', 'clean'],
  },

  // -------------------------------------------------------------------------
  // Sans-Serif - Humanist
  // -------------------------------------------------------------------------
  {
    family: 'Open Sans',
    category: 'sans-serif',
    style: 'humanist',
    weights: [300, 400, 500, 600, 700, 800],
    characteristics: ['neutral', 'readable', 'friendly'],
    popular: true,
  },
  {
    family: 'Lato',
    category: 'sans-serif',
    style: 'humanist',
    weights: [100, 300, 400, 700, 900],
    characteristics: ['warm', 'stable', 'serious'],
    popular: true,
  },
  {
    family: 'Nunito',
    category: 'sans-serif',
    style: 'humanist',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['rounded', 'friendly', 'balanced'],
  },
  {
    family: 'Nunito Sans',
    category: 'sans-serif',
    style: 'humanist',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['clean', 'readable', 'modern'],
  },
  {
    family: 'Source Sans 3',
    category: 'sans-serif',
    style: 'humanist',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['readable', 'professional', 'versatile'],
  },
  {
    family: 'Work Sans',
    category: 'sans-serif',
    style: 'humanist',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['optimized', 'screen-friendly', 'modern'],
  },
  {
    family: 'Mulish',
    category: 'sans-serif',
    style: 'humanist',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['minimalist', 'elegant', 'readable'],
  },

  // -------------------------------------------------------------------------
  // Sans-Serif - Neo-Grotesque
  // -------------------------------------------------------------------------
  {
    family: 'Roboto',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 300, 400, 500, 700, 900],
    characteristics: ['mechanical', 'modern', 'android'],
    popular: true,
  },
  {
    family: 'Roboto Flex',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['variable', 'flexible', 'modern'],
  },
  {
    family: 'IBM Plex Sans',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700],
    characteristics: ['corporate', 'technical', 'readable'],
  },
  {
    family: 'Manrope',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [200, 300, 400, 500, 600, 700, 800],
    characteristics: ['modern', 'clean', 'versatile'],
  },
  {
    family: 'Figtree',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [300, 400, 500, 600, 700, 800, 900],
    characteristics: ['friendly', 'modern', 'readable'],
  },
  {
    family: 'Albert Sans',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['geometric', 'modern', 'clean'],
  },
  {
    family: 'Barlow',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['industrial', 'modern', 'readable'],
  },
  {
    family: 'Rubik',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [300, 400, 500, 600, 700, 800, 900],
    characteristics: ['slightly-rounded', 'friendly', 'modern'],
  },
  {
    family: 'Raleway',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['elegant', 'thin', 'display'],
  },

  // -------------------------------------------------------------------------
  // Serif - Transitional
  // -------------------------------------------------------------------------
  {
    family: 'Merriweather',
    category: 'serif',
    style: 'transitional',
    weights: [300, 400, 700, 900],
    characteristics: ['readable', 'sturdy', 'screen-optimized'],
    popular: true,
  },
  {
    family: 'Lora',
    category: 'serif',
    style: 'transitional',
    weights: [400, 500, 600, 700],
    characteristics: ['elegant', 'balanced', 'readable'],
  },
  {
    family: 'Source Serif 4',
    category: 'serif',
    style: 'transitional',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['readable', 'professional', 'editorial'],
  },
  {
    family: 'Libre Baskerville',
    category: 'serif',
    style: 'transitional',
    weights: [400, 700],
    characteristics: ['classic', 'readable', 'editorial'],
  },
  {
    family: 'Crimson Pro',
    category: 'serif',
    style: 'transitional',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['elegant', 'readable', 'book'],
  },
  {
    family: 'Bitter',
    category: 'serif',
    style: 'slab',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['screen-friendly', 'sturdy', 'readable'],
  },

  // -------------------------------------------------------------------------
  // Serif - Didone (High Contrast)
  // -------------------------------------------------------------------------
  {
    family: 'Playfair Display',
    category: 'serif',
    style: 'didone',
    weights: [400, 500, 600, 700, 800, 900],
    characteristics: ['elegant', 'high-contrast', 'display'],
    popular: true,
  },
  {
    family: 'Cormorant',
    category: 'serif',
    style: 'didone',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['elegant', 'display', 'high-contrast'],
  },
  {
    family: 'Bodoni Moda',
    category: 'serif',
    style: 'didone',
    weights: [400, 500, 600, 700, 800, 900],
    characteristics: ['elegant', 'fashion', 'high-contrast'],
  },
  {
    family: 'DM Serif Display',
    category: 'serif',
    style: 'didone',
    weights: [400],
    characteristics: ['elegant', 'display', 'low-contrast'],
  },

  // -------------------------------------------------------------------------
  // Serif - Classic
  // -------------------------------------------------------------------------
  {
    family: 'EB Garamond',
    category: 'serif',
    style: 'classic',
    weights: [400, 500, 600, 700, 800],
    characteristics: ['classic', 'elegant', 'old-style'],
  },
  {
    family: 'Cormorant Garamond',
    category: 'serif',
    style: 'classic',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['elegant', 'display', 'classic'],
  },
  {
    family: 'Spectral',
    category: 'serif',
    style: 'classic',
    weights: [200, 300, 400, 500, 600, 700, 800],
    characteristics: ['readable', 'screen-friendly', 'elegant'],
  },

  // -------------------------------------------------------------------------
  // Monospace
  // -------------------------------------------------------------------------
  {
    family: 'Roboto Mono',
    category: 'monospace',
    style: 'modern',
    weights: [100, 200, 300, 400, 500, 600, 700],
    characteristics: ['code', 'technical', 'readable'],
    popular: true,
  },
  {
    family: 'JetBrains Mono',
    category: 'monospace',
    style: 'modern',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    characteristics: ['code', 'developer', 'ligatures'],
  },
  {
    family: 'Fira Code',
    category: 'monospace',
    style: 'modern',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['code', 'ligatures', 'readable'],
  },
  {
    family: 'Source Code Pro',
    category: 'monospace',
    style: 'modern',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['code', 'readable', 'professional'],
  },
  {
    family: 'IBM Plex Mono',
    category: 'monospace',
    style: 'modern',
    weights: [100, 200, 300, 400, 500, 600, 700],
    characteristics: ['code', 'corporate', 'technical'],
  },
  {
    family: 'Space Mono',
    category: 'monospace',
    style: 'modern',
    weights: [400, 700],
    characteristics: ['code', 'display', 'unique'],
  },
  {
    family: 'Inconsolata',
    category: 'monospace',
    style: 'modern',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['code', 'readable', 'classic'],
  },

  // -------------------------------------------------------------------------
  // Display
  // -------------------------------------------------------------------------
  {
    family: 'Bebas Neue',
    category: 'display',
    style: 'decorative',
    weights: [400],
    characteristics: ['bold', 'condensed', 'impact'],
  },
  {
    family: 'Oswald',
    category: 'display',
    style: 'decorative',
    weights: [200, 300, 400, 500, 600, 700],
    characteristics: ['condensed', 'bold', 'impact'],
  },
  {
    family: 'Anton',
    category: 'display',
    style: 'decorative',
    weights: [400],
    characteristics: ['bold', 'impact', 'headlines'],
  },
  {
    family: 'Abril Fatface',
    category: 'display',
    style: 'decorative',
    weights: [400],
    characteristics: ['elegant', 'display', 'headlines'],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get Google Fonts URL for embedding
 */
export function getFontUrl(family: string, weights: number[]): string {
  const encodedFamily = family.replace(/ /g, '+');
  const weightsParam = weights.join(';');
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightsParam}&display=swap`;
}

/**
 * Get multiple fonts URL
 */
export function getMultipleFontsUrl(fonts: { family: string; weights: number[] }[]): string {
  const familyParams = fonts
    .map(({ family, weights }) => `family=${family.replace(/ /g, '+')}:wght@${weights.join(';')}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

/**
 * Get fonts by category
 */
export function getFontsByCategory(category: GoogleFont['category']): GoogleFont[] {
  return GOOGLE_FONTS.filter((font) => font.category === category);
}

/**
 * Get popular fonts
 */
export function getPopularFonts(): GoogleFont[] {
  return GOOGLE_FONTS.filter((font) => font.popular);
}

/**
 * Search fonts by characteristics
 */
export function searchFonts(query: string): GoogleFont[] {
  const lowerQuery = query.toLowerCase();
  return GOOGLE_FONTS.filter(
    (font) =>
      font.family.toLowerCase().includes(lowerQuery) ||
      font.characteristics.some((c) => c.includes(lowerQuery)) ||
      font.style.includes(lowerQuery) ||
      font.category.includes(lowerQuery)
  );
}

/**
 * Get font by family name
 */
export function getFontByFamily(family: string): GoogleFont | undefined {
  return GOOGLE_FONTS.find((font) => font.family.toLowerCase() === family.toLowerCase());
}

/**
 * Get CSS font-family string with fallbacks
 */
export function getFontFamilyString(family: string): string {
  const font = getFontByFamily(family);
  if (!font) return `'${family}', sans-serif`;

  const fallbacks =
    font.category === 'serif'
      ? 'Georgia, Times, serif'
      : font.category === 'monospace'
        ? 'Consolas, Monaco, monospace'
        : 'system-ui, -apple-system, sans-serif';

  return `'${family}', ${fallbacks}`;
}

// ============================================================================
// FONT CATEGORIES FOR UI
// ============================================================================

export const FONT_CATEGORIES = [
  { id: 'popular', label: 'Popular', icon: '⭐' },
  { id: 'sans-serif', label: 'Sans Serif', icon: 'Aa' },
  { id: 'serif', label: 'Serif', icon: 'Aa' },
  { id: 'monospace', label: 'Monospace', icon: '</>' },
  { id: 'display', label: 'Display', icon: 'A' },
] as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default GOOGLE_FONTS;
