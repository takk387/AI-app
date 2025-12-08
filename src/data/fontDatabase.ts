/**
 * Font Database
 *
 * Curated list of 50+ Google Fonts with visual characteristics
 * for intelligent font matching from design references.
 */

// ============================================================================
// TYPES
// ============================================================================

export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';

export type FontStyle =
  | 'geometric'
  | 'humanist'
  | 'neo-grotesque'
  | 'grotesque'
  | 'transitional'
  | 'modern'
  | 'didone'
  | 'slab'
  | 'old-style'
  | 'rounded'
  | 'condensed'
  | 'expanded';

export type FontCharacteristic =
  | 'clean'
  | 'modern'
  | 'readable'
  | 'friendly'
  | 'rounded'
  | 'bold'
  | 'elegant'
  | 'neutral'
  | 'warm'
  | 'stable'
  | 'mechanical'
  | 'technical'
  | 'high-contrast'
  | 'sturdy'
  | 'classic'
  | 'professional'
  | 'playful'
  | 'sophisticated'
  | 'minimalist'
  | 'condensed'
  | 'wide'
  | 'sharp'
  | 'soft'
  | 'universal'
  | 'refined'
  | 'corporate'
  | 'retro'
  | 'impactful'
  | 'fun'
  | 'strong';

export interface FontEntry {
  family: string;
  category: FontCategory;
  style: FontStyle;
  weights: number[];
  characteristics: FontCharacteristic[];
  xHeight: 'low' | 'medium' | 'high';
  contrast: 'low' | 'medium' | 'high';
  terminals: 'rounded' | 'squared' | 'sharp' | 'mixed';
  googleFontUrl: string;
  fallbacks: string[];
  popularFor: string[]; // Use cases
  similarTo: string[]; // Similar fonts
}

export interface FontMatch {
  font: FontEntry;
  confidence: number; // 0-1
  matchReasons: string[];
}

// ============================================================================
// FONT DATABASE
// ============================================================================

export const FONT_DATABASE: FontEntry[] = [
  // -------------------------------------------------------------------------
  // SANS-SERIF - GEOMETRIC
  // -------------------------------------------------------------------------
  {
    family: 'Inter',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['clean', 'modern', 'readable', 'neutral', 'technical'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    popularFor: ['UI/UX', 'web apps', 'dashboards', 'tech', 'SaaS'],
    similarTo: ['Roboto', 'SF Pro', 'Helvetica Neue'],
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['friendly', 'rounded', 'modern', 'clean', 'playful'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'rounded',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['startups', 'modern websites', 'apps', 'marketing'],
    similarTo: ['Montserrat', 'Nunito', 'Quicksand'],
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    style: 'geometric',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['bold', 'elegant', 'modern', 'professional', 'sophisticated'],
    xHeight: 'medium',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['headings', 'fashion', 'luxury', 'portfolios'],
    similarTo: ['Gotham', 'Proxima Nova', 'Poppins'],
  },
  {
    family: 'Nunito',
    category: 'sans-serif',
    style: 'rounded',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['friendly', 'rounded', 'soft', 'warm', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'rounded',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['children', 'friendly apps', 'education', 'healthcare'],
    similarTo: ['Poppins', 'Quicksand', 'Varela Round'],
  },
  {
    family: 'Quicksand',
    category: 'sans-serif',
    style: 'rounded',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['rounded', 'soft', 'friendly', 'modern', 'playful'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'rounded',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['creative', 'lifestyle', 'blogs', 'portfolios'],
    similarTo: ['Nunito', 'Comfortaa', 'Varela Round'],
  },
  {
    family: 'DM Sans',
    category: 'sans-serif',
    style: 'geometric',
    weights: [400, 500, 700],
    characteristics: ['clean', 'modern', 'minimalist', 'professional'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['tech', 'startups', 'modern apps', 'SaaS'],
    similarTo: ['Inter', 'Manrope', 'Plus Jakarta Sans'],
  },
  {
    family: 'Space Grotesk',
    category: 'sans-serif',
    style: 'geometric',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['technical', 'modern', 'sharp', 'bold'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['tech', 'crypto', 'gaming', 'developer tools'],
    similarTo: ['Space Mono', 'IBM Plex Sans', 'Archivo'],
  },
  {
    family: 'Manrope',
    category: 'sans-serif',
    style: 'geometric',
    weights: [200, 300, 400, 500, 600, 700, 800],
    characteristics: ['clean', 'modern', 'professional', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['SaaS', 'fintech', 'enterprise', 'dashboards'],
    similarTo: ['Inter', 'DM Sans', 'Plus Jakarta Sans'],
  },
  {
    family: 'Plus Jakarta Sans',
    category: 'sans-serif',
    style: 'geometric',
    weights: [200, 300, 400, 500, 600, 700, 800],
    characteristics: ['modern', 'clean', 'professional', 'sophisticated'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['modern websites', 'apps', 'startups'],
    similarTo: ['Inter', 'Manrope', 'DM Sans'],
  },

  // -------------------------------------------------------------------------
  // SANS-SERIF - HUMANIST
  // -------------------------------------------------------------------------
  {
    family: 'Open Sans',
    category: 'sans-serif',
    style: 'humanist',
    weights: [300, 400, 500, 600, 700, 800],
    characteristics: ['neutral', 'readable', 'clean', 'professional', 'stable'],
    xHeight: 'high',
    contrast: 'medium',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['body text', 'general purpose', 'corporate', 'documentation'],
    similarTo: ['Source Sans Pro', 'Lato', 'Roboto'],
  },
  {
    family: 'Lato',
    category: 'sans-serif',
    style: 'humanist',
    weights: [100, 300, 400, 700, 900],
    characteristics: ['warm', 'stable', 'friendly', 'professional', 'readable'],
    xHeight: 'medium',
    contrast: 'medium',
    terminals: 'rounded',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['body text', 'corporate', 'business', 'portfolios'],
    similarTo: ['Open Sans', 'Source Sans Pro', 'Noto Sans'],
  },
  {
    family: 'Source Sans Pro',
    category: 'sans-serif',
    style: 'humanist',
    weights: [200, 300, 400, 600, 700, 900],
    characteristics: ['clean', 'readable', 'professional', 'neutral'],
    xHeight: 'high',
    contrast: 'medium',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@200;300;400;600;700;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['documentation', 'UI', 'body text', 'technical'],
    similarTo: ['Open Sans', 'Lato', 'Noto Sans'],
  },
  {
    family: 'Noto Sans',
    category: 'sans-serif',
    style: 'humanist',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['neutral', 'readable', 'universal', 'clean'],
    xHeight: 'high',
    contrast: 'medium',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['multilingual', 'global apps', 'documentation'],
    similarTo: ['Open Sans', 'Source Sans Pro', 'Roboto'],
  },
  {
    family: 'Mulish',
    category: 'sans-serif',
    style: 'humanist',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['friendly', 'modern', 'clean', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Mulish:wght@200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['apps', 'websites', 'UI design'],
    similarTo: ['Nunito Sans', 'Open Sans', 'Work Sans'],
  },
  {
    family: 'Work Sans',
    category: 'sans-serif',
    style: 'humanist',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['modern', 'professional', 'clean', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Work+Sans:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['professional', 'business', 'corporate', 'apps'],
    similarTo: ['Mulish', 'Rubik', 'IBM Plex Sans'],
  },
  {
    family: 'Rubik',
    category: 'sans-serif',
    style: 'humanist',
    weights: [300, 400, 500, 600, 700, 800, 900],
    characteristics: ['friendly', 'rounded', 'modern', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'rounded',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['apps', 'modern websites', 'UI design'],
    similarTo: ['Work Sans', 'Nunito', 'Karla'],
  },

  // -------------------------------------------------------------------------
  // SANS-SERIF - NEO-GROTESQUE
  // -------------------------------------------------------------------------
  {
    family: 'Roboto',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 300, 400, 500, 700, 900],
    characteristics: ['mechanical', 'modern', 'clean', 'neutral', 'technical'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['Android', 'Material Design', 'tech', 'apps'],
    similarTo: ['Inter', 'Open Sans', 'SF Pro'],
  },
  {
    family: 'Outfit',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['modern', 'clean', 'professional', 'sharp'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['modern websites', 'tech', 'startups'],
    similarTo: ['Inter', 'Roboto', 'Manrope'],
  },
  {
    family: 'Sora',
    category: 'sans-serif',
    style: 'neo-grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    characteristics: ['modern', 'clean', 'technical', 'professional'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Sora:wght@100;200;300;400;500;600;700;800&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['tech', 'modern apps', 'dashboards'],
    similarTo: ['Inter', 'Outfit', 'Space Grotesk'],
  },

  // -------------------------------------------------------------------------
  // SANS-SERIF - CONDENSED
  // -------------------------------------------------------------------------
  {
    family: 'Oswald',
    category: 'sans-serif',
    style: 'condensed',
    weights: [200, 300, 400, 500, 600, 700],
    characteristics: ['condensed', 'bold', 'modern', 'sharp'],
    xHeight: 'medium',
    contrast: 'medium',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['headings', 'sports', 'news', 'impactful text'],
    similarTo: ['Bebas Neue', 'Anton', 'Barlow Condensed'],
  },
  {
    family: 'Barlow Condensed',
    category: 'sans-serif',
    style: 'condensed',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['condensed', 'modern', 'technical', 'clean'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['headings', 'navigation', 'sports', 'automotive'],
    similarTo: ['Oswald', 'Roboto Condensed', 'Anton'],
  },
  {
    family: 'Archivo',
    category: 'sans-serif',
    style: 'grotesque',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['technical', 'modern', 'clean', 'professional'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Archivo:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['system-ui', 'sans-serif'],
    popularFor: ['tech', 'documentation', 'apps'],
    similarTo: ['Space Grotesk', 'IBM Plex Sans', 'Roboto'],
  },

  // -------------------------------------------------------------------------
  // SERIF - TRANSITIONAL / MODERN
  // -------------------------------------------------------------------------
  {
    family: 'Playfair Display',
    category: 'serif',
    style: 'didone',
    weights: [400, 500, 600, 700, 800, 900],
    characteristics: ['elegant', 'high-contrast', 'sophisticated', 'classic'],
    xHeight: 'low',
    contrast: 'high',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['luxury', 'fashion', 'editorial', 'headings'],
    similarTo: ['Bodoni Moda', 'Cormorant', 'Libre Baskerville'],
  },
  {
    family: 'Merriweather',
    category: 'serif',
    style: 'transitional',
    weights: [300, 400, 700, 900],
    characteristics: ['readable', 'sturdy', 'classic', 'professional'],
    xHeight: 'high',
    contrast: 'medium',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['body text', 'blogs', 'articles', 'editorial'],
    similarTo: ['Source Serif Pro', 'Lora', 'Libre Baskerville'],
  },
  {
    family: 'Lora',
    category: 'serif',
    style: 'transitional',
    weights: [400, 500, 600, 700],
    characteristics: ['elegant', 'readable', 'classic', 'warm'],
    xHeight: 'medium',
    contrast: 'medium',
    terminals: 'rounded',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['blogs', 'editorial', 'body text', 'literary'],
    similarTo: ['Merriweather', 'Source Serif Pro', 'Crimson Pro'],
  },
  {
    family: 'Source Serif Pro',
    category: 'serif',
    style: 'transitional',
    weights: [200, 300, 400, 600, 700, 900],
    characteristics: ['readable', 'professional', 'clean', 'classic'],
    xHeight: 'high',
    contrast: 'medium',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Source+Serif+Pro:wght@200;300;400;600;700;900&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['documentation', 'body text', 'editorial', 'professional'],
    similarTo: ['Merriweather', 'Lora', 'Libre Baskerville'],
  },
  {
    family: 'Cormorant',
    category: 'serif',
    style: 'didone',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['elegant', 'high-contrast', 'sophisticated', 'refined'],
    xHeight: 'low',
    contrast: 'high',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400;500;600;700&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['luxury', 'fashion', 'editorial', 'headings'],
    similarTo: ['Playfair Display', 'Bodoni Moda', 'EB Garamond'],
  },
  {
    family: 'Libre Baskerville',
    category: 'serif',
    style: 'transitional',
    weights: [400, 700],
    characteristics: ['classic', 'readable', 'professional', 'elegant'],
    xHeight: 'medium',
    contrast: 'high',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
    fallbacks: ['Georgia', 'Baskerville', 'serif'],
    popularFor: ['editorial', 'body text', 'books', 'articles'],
    similarTo: ['Merriweather', 'Source Serif Pro', 'EB Garamond'],
  },
  {
    family: 'EB Garamond',
    category: 'serif',
    style: 'old-style',
    weights: [400, 500, 600, 700, 800],
    characteristics: ['classic', 'elegant', 'readable', 'refined'],
    xHeight: 'low',
    contrast: 'high',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700;800&display=swap',
    fallbacks: ['Garamond', 'Georgia', 'serif'],
    popularFor: ['books', 'literary', 'academic', 'traditional'],
    similarTo: ['Cormorant', 'Libre Baskerville', 'Crimson Pro'],
  },
  {
    family: 'Crimson Pro',
    category: 'serif',
    style: 'old-style',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['elegant', 'readable', 'warm', 'classic'],
    xHeight: 'medium',
    contrast: 'medium',
    terminals: 'sharp',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['body text', 'editorial', 'literary', 'blogs'],
    similarTo: ['Lora', 'EB Garamond', 'Libre Baskerville'],
  },
  {
    family: 'DM Serif Display',
    category: 'serif',
    style: 'didone',
    weights: [400],
    characteristics: ['elegant', 'bold', 'high-contrast', 'sophisticated'],
    xHeight: 'low',
    contrast: 'high',
    terminals: 'sharp',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['headings', 'display', 'luxury', 'fashion'],
    similarTo: ['Playfair Display', 'Cormorant', 'Bodoni Moda'],
  },

  // -------------------------------------------------------------------------
  // SERIF - SLAB
  // -------------------------------------------------------------------------
  {
    family: 'Roboto Slab',
    category: 'serif',
    style: 'slab',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['modern', 'sturdy', 'readable', 'technical'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['headings', 'tech', 'apps', 'documentation'],
    similarTo: ['Bitter', 'Zilla Slab', 'Crete Round'],
  },
  {
    family: 'Bitter',
    category: 'serif',
    style: 'slab',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    characteristics: ['readable', 'sturdy', 'warm', 'professional'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Bitter:wght@100;200;300;400;500;600;700;800;900&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['body text', 'editorial', 'blogs', 'reading'],
    similarTo: ['Roboto Slab', 'Zilla Slab', 'Arvo'],
  },
  {
    family: 'Zilla Slab',
    category: 'serif',
    style: 'slab',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['modern', 'technical', 'clean', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@300;400;500;600;700&display=swap',
    fallbacks: ['Georgia', 'serif'],
    popularFor: ['tech', 'documentation', 'Mozilla', 'developer'],
    similarTo: ['Roboto Slab', 'Bitter', 'IBM Plex Serif'],
  },

  // -------------------------------------------------------------------------
  // MONOSPACE
  // -------------------------------------------------------------------------
  {
    family: 'JetBrains Mono',
    category: 'monospace',
    style: 'modern',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    characteristics: ['technical', 'modern', 'readable', 'clean'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&display=swap',
    fallbacks: ['Consolas', 'Monaco', 'monospace'],
    popularFor: ['code', 'developer tools', 'terminals', 'IDE'],
    similarTo: ['Fira Code', 'Source Code Pro', 'IBM Plex Mono'],
  },
  {
    family: 'Fira Code',
    category: 'monospace',
    style: 'modern',
    weights: [300, 400, 500, 600, 700],
    characteristics: ['technical', 'modern', 'clean', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap',
    fallbacks: ['Consolas', 'Monaco', 'monospace'],
    popularFor: ['code', 'developer tools', 'programming', 'ligatures'],
    similarTo: ['JetBrains Mono', 'Source Code Pro', 'Cascadia Code'],
  },
  {
    family: 'Source Code Pro',
    category: 'monospace',
    style: 'modern',
    weights: [200, 300, 400, 500, 600, 700, 900],
    characteristics: ['clean', 'readable', 'professional', 'technical'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@200;300;400;500;600;700;900&display=swap',
    fallbacks: ['Consolas', 'Monaco', 'monospace'],
    popularFor: ['code', 'documentation', 'technical', 'Adobe'],
    similarTo: ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono'],
  },
  {
    family: 'IBM Plex Mono',
    category: 'monospace',
    style: 'modern',
    weights: [100, 200, 300, 400, 500, 600, 700],
    characteristics: ['technical', 'professional', 'clean', 'corporate'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@100;200;300;400;500;600;700&display=swap',
    fallbacks: ['Consolas', 'Monaco', 'monospace'],
    popularFor: ['code', 'enterprise', 'IBM', 'corporate'],
    similarTo: ['JetBrains Mono', 'Source Code Pro', 'Roboto Mono'],
  },
  {
    family: 'Space Mono',
    category: 'monospace',
    style: 'geometric',
    weights: [400, 700],
    characteristics: ['technical', 'bold', 'modern', 'retro'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    fallbacks: ['Consolas', 'Monaco', 'monospace'],
    popularFor: ['retro tech', 'terminals', 'gaming', 'display'],
    similarTo: ['Space Grotesk', 'JetBrains Mono', 'Fira Code'],
  },
  {
    family: 'Roboto Mono',
    category: 'monospace',
    style: 'modern',
    weights: [100, 200, 300, 400, 500, 600, 700],
    characteristics: ['clean', 'modern', 'technical', 'readable'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl:
      'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@100;200;300;400;500;600;700&display=swap',
    fallbacks: ['Consolas', 'Monaco', 'monospace'],
    popularFor: ['code', 'Android', 'Material Design', 'tech'],
    similarTo: ['Source Code Pro', 'IBM Plex Mono', 'JetBrains Mono'],
  },

  // -------------------------------------------------------------------------
  // DISPLAY
  // -------------------------------------------------------------------------
  {
    family: 'Bebas Neue',
    category: 'display',
    style: 'condensed',
    weights: [400],
    characteristics: ['bold', 'condensed', 'modern', 'impactful'],
    xHeight: 'medium',
    contrast: 'medium',
    terminals: 'squared',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
    fallbacks: ['Impact', 'sans-serif'],
    popularFor: ['headings', 'posters', 'sports', 'movies'],
    similarTo: ['Oswald', 'Anton', 'Barlow Condensed'],
  },
  {
    family: 'Anton',
    category: 'display',
    style: 'condensed',
    weights: [400],
    characteristics: ['bold', 'condensed', 'impactful', 'strong'],
    xHeight: 'medium',
    contrast: 'low',
    terminals: 'squared',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Anton&display=swap',
    fallbacks: ['Impact', 'sans-serif'],
    popularFor: ['headlines', 'posters', 'sports', 'impactful'],
    similarTo: ['Bebas Neue', 'Oswald', 'Black Ops One'],
  },
  {
    family: 'Righteous',
    category: 'display',
    style: 'rounded',
    weights: [400],
    characteristics: ['playful', 'rounded', 'retro', 'fun'],
    xHeight: 'high',
    contrast: 'low',
    terminals: 'rounded',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap',
    fallbacks: ['cursive', 'sans-serif'],
    popularFor: ['gaming', 'entertainment', 'retro', 'fun'],
    similarTo: ['Bungee', 'Russo One', 'Audiowide'],
  },
];

// ============================================================================
// FONT MATCHING FUNCTIONS
// ============================================================================

/**
 * Match a description to fonts in the database
 */
export function matchFontFromDescription(
  description: string,
  category?: FontCategory
): FontMatch[] {
  const lowerDesc = description.toLowerCase();
  const matches: FontMatch[] = [];

  for (const font of FONT_DATABASE) {
    // Filter by category if specified
    if (category && font.category !== category) continue;

    let confidence = 0;
    const matchReasons: string[] = [];

    // Check for exact family name match
    if (lowerDesc.includes(font.family.toLowerCase())) {
      confidence = 1;
      matchReasons.push(`Exact family name match: ${font.family}`);
    } else {
      // Check characteristics
      for (const char of font.characteristics) {
        if (lowerDesc.includes(char)) {
          confidence += 0.15;
          matchReasons.push(`Characteristic match: ${char}`);
        }
      }

      // Check style
      if (lowerDesc.includes(font.style)) {
        confidence += 0.2;
        matchReasons.push(`Style match: ${font.style}`);
      }

      // Check category
      if (lowerDesc.includes(font.category)) {
        confidence += 0.1;
        matchReasons.push(`Category match: ${font.category}`);
      }

      // Check popular uses
      for (const use of font.popularFor) {
        if (lowerDesc.includes(use.toLowerCase())) {
          confidence += 0.1;
          matchReasons.push(`Use case match: ${use}`);
        }
      }

      // Check similar fonts
      for (const similar of font.similarTo) {
        if (lowerDesc.includes(similar.toLowerCase())) {
          confidence += 0.1;
          matchReasons.push(`Similar to mentioned font: ${similar}`);
        }
      }

      // Check terminal type
      if (
        (lowerDesc.includes('rounded') && font.terminals === 'rounded') ||
        (lowerDesc.includes('sharp') && font.terminals === 'sharp') ||
        (lowerDesc.includes('squared') && font.terminals === 'squared')
      ) {
        confidence += 0.1;
        matchReasons.push(`Terminal style match: ${font.terminals}`);
      }

      // Check contrast
      if (
        (lowerDesc.includes('high contrast') && font.contrast === 'high') ||
        (lowerDesc.includes('low contrast') && font.contrast === 'low')
      ) {
        confidence += 0.1;
        matchReasons.push(`Contrast match: ${font.contrast}`);
      }
    }

    // Cap confidence at 1
    confidence = Math.min(confidence, 1);

    if (confidence > 0.2 || matchReasons.length > 0) {
      matches.push({
        font,
        confidence,
        matchReasons,
      });
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get font by exact family name
 */
export function getFontByFamily(family: string): FontEntry | undefined {
  return FONT_DATABASE.find((f) => f.family.toLowerCase() === family.toLowerCase());
}

/**
 * Get fonts by category
 */
export function getFontsByCategory(category: FontCategory): FontEntry[] {
  return FONT_DATABASE.filter((f) => f.category === category);
}

/**
 * Get fonts by style
 */
export function getFontsByStyle(style: FontStyle): FontEntry[] {
  return FONT_DATABASE.filter((f) => f.style === style);
}

/**
 * Get fonts with specific characteristic
 */
export function getFontsWithCharacteristic(characteristic: FontCharacteristic): FontEntry[] {
  return FONT_DATABASE.filter((f) => f.characteristics.includes(characteristic));
}

/**
 * Get recommended font pairing
 */
export function getRecommendedPairing(
  headingFont: string
): { body: FontEntry; mono?: FontEntry } | null {
  const heading = getFontByFamily(headingFont);
  if (!heading) return null;

  // Pairing rules
  const pairings: Record<string, { body: string; mono?: string }> = {
    // Sans pairs
    Inter: { body: 'Inter', mono: 'JetBrains Mono' },
    Poppins: { body: 'Open Sans', mono: 'Fira Code' },
    Montserrat: { body: 'Open Sans', mono: 'Source Code Pro' },
    'Space Grotesk': { body: 'Inter', mono: 'Space Mono' },
    Roboto: { body: 'Roboto', mono: 'Roboto Mono' },
    // Serif pairs
    'Playfair Display': { body: 'Source Sans Pro', mono: 'Source Code Pro' },
    Merriweather: { body: 'Open Sans', mono: 'Fira Code' },
    Lora: { body: 'Source Sans Pro', mono: 'Source Code Pro' },
    // Mixed pairs
    'DM Serif Display': { body: 'DM Sans', mono: 'JetBrains Mono' },
  };

  const pair = pairings[headingFont];
  if (pair) {
    const body = getFontByFamily(pair.body);
    const mono = pair.mono ? getFontByFamily(pair.mono) : undefined;
    if (body) {
      return { body, mono };
    }
  }

  // Default pairing based on category
  if (heading.category === 'serif') {
    return {
      body: getFontByFamily('Open Sans')!,
      mono: getFontByFamily('Source Code Pro'),
    };
  }

  return {
    body: getFontByFamily('Inter')!,
    mono: getFontByFamily('JetBrains Mono'),
  };
}

/**
 * Generate Google Fonts import URL for multiple fonts
 */
export function generateGoogleFontsUrl(fonts: FontEntry[]): string {
  const families = fonts.map((f) => {
    const weights = f.weights.join(';');
    return `family=${f.family.replace(/ /g, '+')}:wght@${weights}`;
  });

  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}
