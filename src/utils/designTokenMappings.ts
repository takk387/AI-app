/**
 * Design Token Mappings
 *
 * Maps LayoutDesign values to concrete CSS/Tailwind classes.
 * These mappings ensure generated code exactly matches the design specifications.
 */

// ============================================================================
// BORDER RADIUS MAPPINGS
// ============================================================================

export const borderRadiusMap: Record<string, { tailwind: string; css: string }> = {
  none: { tailwind: 'rounded-none', css: '0px' },
  sm: { tailwind: 'rounded-sm', css: '0.125rem' },
  md: { tailwind: 'rounded-md', css: '0.375rem' },
  lg: { tailwind: 'rounded-lg', css: '0.5rem' },
  xl: { tailwind: 'rounded-xl', css: '0.75rem' },
  full: { tailwind: 'rounded-full', css: '9999px' },
};

// ============================================================================
// SHADOW MAPPINGS
// ============================================================================

export const shadowMap: Record<string, { tailwind: string; css: string }> = {
  none: { tailwind: 'shadow-none', css: 'none' },
  subtle: { tailwind: 'shadow-sm', css: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  medium: {
    tailwind: 'shadow-md',
    css: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  strong: {
    tailwind: 'shadow-lg',
    css: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
};

// ============================================================================
// BLUR MAPPINGS
// ============================================================================

export const blurMap: Record<string, { tailwind: string; css: string }> = {
  none: { tailwind: '', css: 'none' },
  subtle: { tailwind: 'backdrop-blur-sm', css: 'blur(4px)' },
  medium: { tailwind: 'backdrop-blur-md', css: 'blur(12px)' },
  strong: { tailwind: 'backdrop-blur-lg', css: 'blur(16px)' },
};

// ============================================================================
// SPACING DENSITY MAPPINGS
// ============================================================================

export const spacingDensityMap: Record<
  string,
  { gap: string; padding: string; tailwindGap: string; tailwindPadding: string }
> = {
  compact: { gap: '0.5rem', padding: '0.5rem', tailwindGap: 'gap-2', tailwindPadding: 'p-2' },
  normal: { gap: '1rem', padding: '1rem', tailwindGap: 'gap-4', tailwindPadding: 'p-4' },
  relaxed: { gap: '1.5rem', padding: '1.5rem', tailwindGap: 'gap-6', tailwindPadding: 'p-6' },
};

// ============================================================================
// SECTION PADDING MAPPINGS
// ============================================================================

export const sectionPaddingMap: Record<string, { tailwind: string; css: string }> = {
  sm: { tailwind: 'py-8', css: '2rem' },
  md: { tailwind: 'py-12', css: '3rem' },
  lg: { tailwind: 'py-16', css: '4rem' },
  xl: { tailwind: 'py-24', css: '6rem' },
};

// ============================================================================
// CONTAINER WIDTH MAPPINGS
// ============================================================================

export const containerWidthMap: Record<string, { tailwind: string; css: string }> = {
  narrow: { tailwind: 'max-w-3xl', css: '48rem' },
  standard: { tailwind: 'max-w-5xl', css: '64rem' },
  wide: { tailwind: 'max-w-7xl', css: '80rem' },
  full: { tailwind: 'max-w-full', css: '100%' },
};

// ============================================================================
// COMPONENT GAP MAPPINGS
// ============================================================================

export const componentGapMap: Record<string, { tailwind: string; css: string }> = {
  sm: { tailwind: 'gap-2', css: '0.5rem' },
  md: { tailwind: 'gap-4', css: '1rem' },
  lg: { tailwind: 'gap-6', css: '1.5rem' },
  xl: { tailwind: 'gap-8', css: '2rem' },
};

// ============================================================================
// TYPOGRAPHY MAPPINGS
// ============================================================================

export const fontWeightMap: Record<string, { tailwind: string; css: string }> = {
  light: { tailwind: 'font-light', css: '300' },
  normal: { tailwind: 'font-normal', css: '400' },
  medium: { tailwind: 'font-medium', css: '500' },
  semibold: { tailwind: 'font-semibold', css: '600' },
  bold: { tailwind: 'font-bold', css: '700' },
};

export const headingSizeMap: Record<string, { h1: string; h2: string; h3: string; h4: string }> = {
  sm: { h1: 'text-2xl', h2: 'text-xl', h3: 'text-lg', h4: 'text-base' },
  base: { h1: 'text-3xl', h2: 'text-2xl', h3: 'text-xl', h4: 'text-lg' },
  lg: { h1: 'text-4xl', h2: 'text-3xl', h3: 'text-2xl', h4: 'text-xl' },
  xl: { h1: 'text-5xl', h2: 'text-4xl', h3: 'text-3xl', h4: 'text-2xl' },
};

export const bodySizeMap: Record<string, { tailwind: string; css: string }> = {
  xs: { tailwind: 'text-xs', css: '0.75rem' },
  sm: { tailwind: 'text-sm', css: '0.875rem' },
  base: { tailwind: 'text-base', css: '1rem' },
  lg: { tailwind: 'text-lg', css: '1.125rem' },
  xl: { tailwind: 'text-xl', css: '1.25rem' },
};

export const lineHeightMap: Record<string, { tailwind: string; css: string }> = {
  tight: { tailwind: 'leading-tight', css: '1.25' },
  normal: { tailwind: 'leading-normal', css: '1.5' },
  relaxed: { tailwind: 'leading-relaxed', css: '1.625' },
};

export const letterSpacingMap: Record<string, { tailwind: string; css: string }> = {
  tight: { tailwind: 'tracking-tight', css: '-0.025em' },
  normal: { tailwind: 'tracking-normal', css: '0' },
  wide: { tailwind: 'tracking-wide', css: '0.025em' },
};

// ============================================================================
// ANIMATION MAPPINGS
// ============================================================================

export const animationMap: Record<
  string,
  { duration: string; easing: string; description: string }
> = {
  none: { duration: '0ms', easing: 'linear', description: 'No animations' },
  subtle: { duration: '150ms', easing: 'ease-out', description: 'Quick, subtle transitions' },
  smooth: { duration: '300ms', easing: 'ease-in-out', description: 'Smooth, natural transitions' },
  playful: {
    duration: '500ms',
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    description: 'Bouncy, playful animations',
  },
};

// ============================================================================
// HEADER COMPONENT MAPPINGS
// ============================================================================

export const headerHeightMap: Record<string, { tailwind: string; css: string }> = {
  compact: { tailwind: 'h-14', css: '3.5rem' },
  standard: { tailwind: 'h-16', css: '4rem' },
  tall: { tailwind: 'h-20', css: '5rem' },
};

export const headerStyleMap: Record<string, string> = {
  solid: 'bg-[var(--color-surface)] border-b border-[var(--color-border)]',
  gradient: 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]',
  blur: 'bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]/50',
  transparent: 'bg-transparent',
};

// ============================================================================
// HERO COMPONENT MAPPINGS
// ============================================================================

export const heroHeightMap: Record<string, { tailwind: string; css: string }> = {
  compact: { tailwind: 'min-h-[300px]', css: '300px' },
  standard: { tailwind: 'min-h-[500px]', css: '500px' },
  tall: { tailwind: 'min-h-[700px]', css: '700px' },
  fullscreen: { tailwind: 'min-h-screen', css: '100vh' },
};

export const heroLayoutMap: Record<string, string> = {
  centered: 'flex flex-col items-center justify-center text-center',
  'left-aligned': 'flex flex-col items-start justify-center text-left',
  split: 'grid grid-cols-1 md:grid-cols-2 gap-8 items-center',
  'image-background': 'relative flex items-center justify-center bg-cover bg-center',
};

// ============================================================================
// CARD COMPONENT MAPPINGS
// ============================================================================

export const cardStyleMap: Record<string, string> = {
  minimal: 'bg-transparent',
  bordered: 'bg-[var(--color-surface)] border border-[var(--color-border)]',
  elevated: 'bg-[var(--color-surface)] shadow-[var(--shadow)]',
  filled: 'bg-[var(--color-surface)]',
};

export const cardHoverEffectMap: Record<string, string> = {
  none: '',
  lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-[var(--transition-duration)]',
  glow: 'hover:shadow-[0_0_20px_var(--color-primary)] transition-shadow duration-[var(--transition-duration)]',
  scale: 'hover:scale-105 transition-transform duration-[var(--transition-duration)]',
  border:
    'hover:border-[var(--color-primary)] transition-colors duration-[var(--transition-duration)]',
};

// ============================================================================
// SIDEBAR COMPONENT MAPPINGS
// ============================================================================

export const sidebarWidthMap: Record<string, { tailwind: string; css: string }> = {
  narrow: { tailwind: 'w-16', css: '4rem' },
  standard: { tailwind: 'w-64', css: '16rem' },
  wide: { tailwind: 'w-80', css: '20rem' },
};

// ============================================================================
// LIST COMPONENT MAPPINGS
// ============================================================================

export const listStyleMap: Record<string, string> = {
  simple: '',
  bordered: 'border border-[var(--color-border)] rounded-[var(--border-radius)]',
  striped: '[&>*:nth-child(odd)]:bg-[var(--color-surface)]',
  cards: 'space-y-2 [&>*]:bg-[var(--color-surface)] [&>*]:rounded-[var(--border-radius)] [&>*]:p-4',
};

export const listDensityMap: Record<string, { tailwind: string; paddingY: string }> = {
  compact: { tailwind: 'py-2', paddingY: '0.5rem' },
  normal: { tailwind: 'py-3', paddingY: '0.75rem' },
  relaxed: { tailwind: 'py-4', paddingY: '1rem' },
};

// ============================================================================
// FOOTER COMPONENT MAPPINGS
// ============================================================================

export const footerStyleMap: Record<string, string> = {
  minimal: 'py-6 text-center',
  standard: 'py-12',
  rich: 'py-16',
};

export const footerColumnsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate CSS variables string from design colors
 */
export function generateColorCSSVariables(colors: {
  primary: string;
  secondary?: string;
  accent?: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}): string {
  return `  --color-primary: ${colors.primary};
  --color-secondary: ${colors.secondary || colors.primary};
  --color-accent: ${colors.accent || colors.primary};
  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-border: ${colors.border};
  --color-success: ${colors.success || '#6B7280'};
  --color-warning: ${colors.warning || '#6B7280'};
  --color-error: ${colors.error || '#6B7280'};
  --color-info: ${colors.info || '#6B7280'};`;
}

/**
 * Generate CSS variables string from design effects
 */
export function generateEffectCSSVariables(effects: {
  borderRadius: string;
  shadows: string;
  animations: string;
  blur: string;
}): string {
  const radius = borderRadiusMap[effects.borderRadius] || borderRadiusMap.lg;
  const shadow = shadowMap[effects.shadows] || shadowMap.medium;
  const animation = animationMap[effects.animations] || animationMap.smooth;

  return `  --border-radius: ${radius.css};
  --shadow: ${shadow.css};
  --transition-duration: ${animation.duration};
  --transition-easing: ${animation.easing};`;
}

/**
 * Generate CSS variables string from typography settings
 */
export function generateTypographyCSSVariables(typography: {
  fontFamily: string;
  headingWeight: string;
  bodyWeight: string;
  lineHeight: string;
  letterSpacing: string;
}): string {
  const headingWeight = fontWeightMap[typography.headingWeight] || fontWeightMap.semibold;
  const bodyWeight = fontWeightMap[typography.bodyWeight] || fontWeightMap.normal;
  const lineHeight = lineHeightMap[typography.lineHeight] || lineHeightMap.normal;
  const letterSpacing = letterSpacingMap[typography.letterSpacing] || letterSpacingMap.normal;

  return `  --font-family: ${typography.fontFamily};
  --font-weight-heading: ${headingWeight.css};
  --font-weight-body: ${bodyWeight.css};
  --line-height: ${lineHeight.css};
  --letter-spacing: ${letterSpacing.css};`;
}

/**
 * Generate CSS variables string from spacing settings
 */
export function generateSpacingCSSVariables(spacing: {
  density: string;
  containerWidth: string;
  sectionPadding: string;
  componentGap: string;
}): string {
  const density = spacingDensityMap[spacing.density] || spacingDensityMap.normal;
  const container = containerWidthMap[spacing.containerWidth] || containerWidthMap.standard;
  const section = sectionPaddingMap[spacing.sectionPadding] || sectionPaddingMap.lg;
  const gap = componentGapMap[spacing.componentGap] || componentGapMap.md;

  return `  --spacing-gap: ${density.gap};
  --spacing-padding: ${density.padding};
  --container-width: ${container.css};
  --section-padding: ${section.css};
  --component-gap: ${gap.css};`;
}

/**
 * Generate complete globals.css content with all design tokens
 */
export function generateGlobalsCSSContent(design: {
  globalStyles: {
    colors: {
      primary: string;
      secondary?: string;
      accent?: string;
      background: string;
      surface: string;
      text: string;
      textMuted: string;
      border: string;
      success?: string;
      warning?: string;
      error?: string;
      info?: string;
    };
    typography: {
      fontFamily: string;
      headingWeight: string;
      bodyWeight: string;
      lineHeight: string;
      letterSpacing: string;
    };
    spacing: {
      density: string;
      containerWidth: string;
      sectionPadding: string;
      componentGap: string;
    };
    effects: {
      borderRadius: string;
      shadows: string;
      animations: string;
      blur: string;
    };
  };
}): string {
  const { colors, typography, spacing, effects } = design.globalStyles;

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Color Tokens */
${generateColorCSSVariables(colors)}

  /* Typography Tokens */
${generateTypographyCSSVariables(typography)}

  /* Spacing Tokens */
${generateSpacingCSSVariables(spacing)}

  /* Effect Tokens */
${generateEffectCSSVariables(effects)}
}

/* Base Styles */
body {
  font-family: var(--font-family);
  font-weight: var(--font-weight-body);
  line-height: var(--line-height);
  letter-spacing: var(--letter-spacing);
  background-color: var(--color-background);
  color: var(--color-text);
}

/* Heading Styles */
h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-weight-heading);
}

/* Component Base Classes */
.card {
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--border-radius);
  transition: all var(--transition-duration) var(--transition-easing);
}

.btn-primary:hover {
  opacity: 0.9;
}

.container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 0 var(--spacing-padding);
}

.section {
  padding-top: var(--section-padding);
  padding-bottom: var(--section-padding);
}
`;
}
