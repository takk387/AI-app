/**
 * Layout Export Utilities
 *
 * Provides functions to export LayoutDesign to various formats:
 * - React components
 * - Tailwind CSS configuration
 * - CSS custom properties (variables)
 * - Design tokens (Figma-compatible JSON)
 * - shadcn/ui theme (globals.css)
 */

import type {
  LayoutDesign,
  GridConfig,
  CarouselDesign,
  StepperDesign,
  TimelineDesign,
  PaginationDesign,
  BreadcrumbDesign,
  ResponsiveOverrides,
} from '@/types/layoutDesign';

// ============================================================================
// COLOR CONVERSION UTILITIES
// ============================================================================

/**
 * Convert hex color to HSL values (without hsl() wrapper)
 * Returns format: "210 40% 98%" for shadcn/ui compatibility
 */
function hexToHSL(hex: string): string {
  // Validate input
  if (!hex || typeof hex !== 'string') return '0 0% 50%';

  // Remove # if present
  hex = hex.replace(/^#/, '').trim();

  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // Validate length
  if (hex.length !== 6) return '0 0% 50%';

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Check for NaN values
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '0 0% 50%';

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

  // Format: "H S% L%" (shadcn format without hsl() wrapper)
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Generate a foreground color (light or dark) based on background luminance
 */
function getForegroundHSL(backgroundHex: string): string {
  // Validate input
  if (!backgroundHex || typeof backgroundHex !== 'string') return '210 40% 98%';

  const hex = backgroundHex.replace(/^#/, '').trim();
  if (hex.length < 6) return '210 40% 98%';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Check for NaN values
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '210 40% 98%';

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return light text for dark backgrounds, dark text for light backgrounds
  return luminance > 0.5 ? '222.2 84% 4.9%' : '210 40% 98%';
}

/**
 * Adjust HSL lightness for generating variants
 */
function adjustLightness(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  const parts = hsl.split(' ');
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);

  const newL = Math.max(0, Math.min(100, l + amount));
  return `${h} ${s} ${newL}%`;
}

// ============================================================================
// CSS VARIABLES EXPORT
// ============================================================================

/**
 * Convert spacing preset to CSS value
 */
function spacingPresetToValue(preset: string): string {
  const map: Record<string, string> = {
    compact: '0.5rem',
    normal: '1rem',
    relaxed: '1.5rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    narrow: '640px',
    standard: '1024px',
    wide: '1280px',
    full: '100%',
  };
  return map[preset] || preset;
}

/**
 * Convert effects preset to CSS value
 */
function effectsPresetToValue(type: string, preset: string): string {
  const borderRadiusMap: Record<string, string> = {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  };

  const shadowMap: Record<string, string> = {
    none: 'none',
    subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    strong: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  };

  const blurMap: Record<string, string> = {
    none: '0',
    subtle: '4px',
    medium: '12px',
    strong: '24px',
  };

  switch (type) {
    case 'borderRadius':
      return borderRadiusMap[preset] || preset;
    case 'shadows':
      return shadowMap[preset] || preset;
    case 'blur':
      return blurMap[preset] || preset;
    default:
      return preset;
  }
}

/**
 * Export LayoutDesign to CSS custom properties
 */
export function exportToCSSVariables(design: LayoutDesign): string {
  const { globalStyles } = design;
  const { typography, colors, spacing, effects } = globalStyles;

  const lines: string[] = [
    ':root {',
    '  /* Typography */',
    `  --font-family: ${typography.fontFamily};`,
    `  --font-heading: ${typography.headingFont || typography.fontFamily};`,
    `  --font-weight-heading: ${typography.headingWeight === 'bold' ? '700' : typography.headingWeight === 'semibold' ? '600' : typography.headingWeight === 'medium' ? '500' : typography.headingWeight === 'light' ? '300' : '400'};`,
    `  --font-weight-body: ${typography.bodyWeight === 'medium' ? '500' : typography.bodyWeight === 'light' ? '300' : '400'};`,
    `  --font-size-heading: ${typography.headingSize === 'xl' ? '2.25rem' : typography.headingSize === 'lg' ? '1.875rem' : typography.headingSize === 'sm' ? '1.25rem' : '1.5rem'};`,
    `  --font-size-body: ${typography.bodySize === 'xs' ? '0.75rem' : typography.bodySize === 'sm' ? '0.875rem' : '1rem'};`,
    `  --line-height: ${typography.lineHeight === 'tight' ? '1.25' : typography.lineHeight === 'relaxed' ? '1.75' : '1.5'};`,
    `  --letter-spacing: ${typography.letterSpacing === 'tight' ? '-0.025em' : typography.letterSpacing === 'wide' ? '0.025em' : '0'};`,
    '',
    '  /* Colors */',
    `  --color-primary: ${colors.primary};`,
    `  --color-secondary: ${colors.secondary || colors.primary};`,
    `  --color-accent: ${colors.accent || colors.primary};`,
    `  --color-background: ${colors.background};`,
    `  --color-surface: ${colors.surface};`,
    `  --color-text: ${colors.text};`,
    `  --color-text-muted: ${colors.textMuted};`,
    `  --color-border: ${colors.border};`,
    `  --color-success: ${colors.success || '#6B7280'};`,
    `  --color-warning: ${colors.warning || '#6B7280'};`,
    `  --color-error: ${colors.error || '#6B7280'};`,
    `  --color-info: ${colors.info || '#6B7280'};`,
    '',
    '  /* Spacing */',
    `  --spacing-density: ${spacingPresetToValue(spacing.density)};`,
    `  --container-width: ${spacingPresetToValue(spacing.containerWidth)};`,
    `  --section-padding: ${spacingPresetToValue(spacing.sectionPadding)};`,
    `  --component-gap: ${spacingPresetToValue(spacing.componentGap)};`,
    '',
    '  /* Effects */',
    `  --border-radius: ${effectsPresetToValue('borderRadius', effects.borderRadius)};`,
    `  --shadow: ${effectsPresetToValue('shadows', effects.shadows)};`,
    `  --blur: ${effectsPresetToValue('blur', effects.blur)};`,
    `  --use-gradients: ${effects.gradients ? '1' : '0'};`,
    '}',
  ];

  return lines.join('\n');
}

// ============================================================================
// SHADCN/UI THEME EXPORT
// ============================================================================

/**
 * Export LayoutDesign to shadcn/ui globals.css format
 * Generates CSS variables in HSL format compatible with shadcn/ui components
 */
export function exportToShadcnTheme(design: LayoutDesign): string {
  const { globalStyles } = design;
  const { colors, effects } = globalStyles;

  // Convert hex colors to HSL format
  const primary = hexToHSL(colors.primary);
  const primaryForeground = getForegroundHSL(colors.primary);
  const secondary = hexToHSL(colors.secondary || colors.primary);
  const secondaryForeground = getForegroundHSL(colors.secondary || colors.primary);
  const accent = hexToHSL(colors.accent || colors.primary);
  const accentForeground = getForegroundHSL(colors.accent || colors.primary);
  const background = hexToHSL(colors.background);
  const foreground = hexToHSL(colors.text);
  const card = hexToHSL(colors.surface);
  const cardForeground = hexToHSL(colors.text);
  const muted = adjustLightness(colors.background, -5);
  const mutedForeground = hexToHSL(colors.textMuted);
  const border = hexToHSL(colors.border);
  const input = hexToHSL(colors.border);
  const ring = hexToHSL(colors.primary);

  // Status colors - neutral gray fallbacks
  const destructive = hexToHSL(colors.error || '#6B7280');
  const destructiveForeground = getForegroundHSL(colors.error || '#6B7280');

  // Get border radius value
  const radiusMap: Record<string, string> = {
    none: '0',
    sm: '0.3rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  };
  const radius = radiusMap[effects.borderRadius] || '0.5rem';

  // Generate dark mode colors (invert light/dark)
  const darkBackground = hexToHSL(colors.text);
  const darkForeground = hexToHSL(colors.background);
  const darkCard = adjustLightness(colors.text, 5);
  const darkCardForeground = hexToHSL(colors.background);
  const darkMuted = adjustLightness(colors.text, 10);
  const darkMutedForeground = adjustLightness(colors.background, -20);
  const darkBorder = adjustLightness(colors.text, 15);

  const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: ${background};
    --foreground: ${foreground};
    --card: ${card};
    --card-foreground: ${cardForeground};
    --popover: ${card};
    --popover-foreground: ${cardForeground};
    --primary: ${primary};
    --primary-foreground: ${primaryForeground};
    --secondary: ${secondary};
    --secondary-foreground: ${secondaryForeground};
    --muted: ${muted};
    --muted-foreground: ${mutedForeground};
    --accent: ${accent};
    --accent-foreground: ${accentForeground};
    --destructive: ${destructive};
    --destructive-foreground: ${destructiveForeground};
    --border: ${border};
    --input: ${input};
    --ring: ${ring};
    --radius: ${radius};
    --chart-1: ${hexToHSL(colors.primary)};
    --chart-2: ${hexToHSL(colors.secondary || colors.primary)};
    --chart-3: ${hexToHSL(colors.accent || colors.primary)};
    --chart-4: ${hexToHSL(colors.success || '#6B7280')};
    --chart-5: ${hexToHSL(colors.warning || '#6B7280')};
  }

  .dark {
    --background: ${darkBackground};
    --foreground: ${darkForeground};
    --card: ${darkCard};
    --card-foreground: ${darkCardForeground};
    --popover: ${darkCard};
    --popover-foreground: ${darkCardForeground};
    --primary: ${primary};
    --primary-foreground: ${primaryForeground};
    --secondary: ${darkMuted};
    --secondary-foreground: ${darkForeground};
    --muted: ${darkMuted};
    --muted-foreground: ${darkMutedForeground};
    --accent: ${darkMuted};
    --accent-foreground: ${darkForeground};
    --destructive: ${destructive};
    --destructive-foreground: ${destructiveForeground};
    --border: ${darkBorder};
    --input: ${darkBorder};
    --ring: ${primary};
    --chart-1: ${hexToHSL(colors.primary)};
    --chart-2: ${hexToHSL(colors.secondary || colors.primary)};
    --chart-3: ${hexToHSL(colors.accent || colors.primary)};
    --chart-4: ${hexToHSL(colors.success || '#6B7280')};
    --chart-5: ${hexToHSL(colors.warning || '#6B7280')};
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

  return css;
}

// ============================================================================
// TAILWIND CONFIG EXPORT
// ============================================================================

/**
 * Export LayoutDesign to Tailwind CSS configuration
 */
export function exportToTailwindConfig(design: LayoutDesign): string {
  const { globalStyles, responsive } = design;
  const { typography, colors, spacing, effects } = globalStyles;

  const config = {
    theme: {
      extend: {
        fontFamily: {
          sans: [typography.fontFamily, 'system-ui', 'sans-serif'],
          heading: [typography.headingFont || typography.fontFamily, 'system-ui', 'sans-serif'],
        },
        colors: {
          primary: {
            DEFAULT: colors.primary,
            50: `${colors.primary}10`,
            100: `${colors.primary}20`,
            200: `${colors.primary}40`,
            300: `${colors.primary}60`,
            400: `${colors.primary}80`,
            500: colors.primary,
            600: colors.primary,
            700: colors.primary,
            800: colors.primary,
            900: colors.primary,
          },
          secondary: colors.secondary || colors.primary,
          accent: colors.accent || colors.primary,
          background: colors.background,
          surface: colors.surface,
          border: colors.border,
          muted: colors.textMuted,
          success: colors.success || '#6B7280',
          warning: colors.warning || '#6B7280',
          error: colors.error || '#6B7280',
          info: colors.info || '#6B7280',
        },
        spacing: {
          density: spacingPresetToValue(spacing.density),
          section: spacingPresetToValue(spacing.sectionPadding),
          gap: spacingPresetToValue(spacing.componentGap),
        },
        maxWidth: {
          container: spacingPresetToValue(spacing.containerWidth),
        },
        borderRadius: {
          DEFAULT: effectsPresetToValue('borderRadius', effects.borderRadius),
        },
        boxShadow: {
          DEFAULT: effectsPresetToValue('shadows', effects.shadows),
        },
        screens: {
          mobile: `${responsive.mobileBreakpoint}px`,
          tablet: `${responsive.tabletBreakpoint}px`,
        },
      },
    },
  };

  return `/** @type {import('tailwindcss').Config} */
module.exports = ${JSON.stringify(config, null, 2)}`;
}

// ============================================================================
// DESIGN TOKENS EXPORT (Figma-compatible)
// ============================================================================

interface DesignToken {
  value: string | number | boolean;
  type: string;
  description?: string;
}

interface DesignTokenGroup {
  [key: string]: DesignToken | DesignTokenGroup;
}

/**
 * Export LayoutDesign to Figma-compatible design tokens (JSON)
 */
export function exportToFigmaTokens(design: LayoutDesign): object {
  const { globalStyles, structure, responsive } = design;
  const { typography, colors, spacing, effects } = globalStyles;

  const tokens: DesignTokenGroup = {
    color: {
      primary: { value: colors.primary, type: 'color', description: 'Primary brand color' },
      secondary: {
        value: colors.secondary || colors.primary,
        type: 'color',
        description: 'Secondary brand color',
      },
      accent: {
        value: colors.accent || colors.primary,
        type: 'color',
        description: 'Accent color for highlights',
      },
      background: { value: colors.background, type: 'color', description: 'Page background color' },
      surface: {
        value: colors.surface,
        type: 'color',
        description: 'Card/surface background color',
      },
      text: { value: colors.text, type: 'color', description: 'Primary text color' },
      textMuted: {
        value: colors.textMuted,
        type: 'color',
        description: 'Secondary/muted text color',
      },
      border: { value: colors.border, type: 'color', description: 'Border color' },
      success: {
        value: colors.success || '#6B7280',
        type: 'color',
        description: 'Success state color',
      },
      warning: {
        value: colors.warning || '#6B7280',
        type: 'color',
        description: 'Warning state color',
      },
      error: { value: colors.error || '#6B7280', type: 'color', description: 'Error state color' },
      info: { value: colors.info || '#6B7280', type: 'color', description: 'Info state color' },
    },
    typography: {
      fontFamily: {
        body: { value: typography.fontFamily, type: 'fontFamily', description: 'Body text font' },
        heading: {
          value: typography.headingFont || typography.fontFamily,
          type: 'fontFamily',
          description: 'Heading font',
        },
      },
      fontWeight: {
        body: { value: typography.bodyWeight, type: 'fontWeight', description: 'Body text weight' },
        heading: {
          value: typography.headingWeight,
          type: 'fontWeight',
          description: 'Heading weight',
        },
      },
      fontSize: {
        body: { value: typography.bodySize, type: 'fontSize', description: 'Base body text size' },
        heading: {
          value: typography.headingSize,
          type: 'fontSize',
          description: 'Base heading size',
        },
      },
      lineHeight: {
        value: typography.lineHeight,
        type: 'lineHeight',
        description: 'Line height preset',
      },
      letterSpacing: {
        value: typography.letterSpacing,
        type: 'letterSpacing',
        description: 'Letter spacing preset',
      },
    },
    spacing: {
      density: { value: spacing.density, type: 'spacing', description: 'Overall spacing density' },
      containerWidth: {
        value: spacing.containerWidth,
        type: 'dimension',
        description: 'Max container width',
      },
      sectionPadding: {
        value: spacing.sectionPadding,
        type: 'spacing',
        description: 'Section vertical padding',
      },
      componentGap: {
        value: spacing.componentGap,
        type: 'spacing',
        description: 'Gap between components',
      },
    },
    effects: {
      borderRadius: {
        value: effects.borderRadius,
        type: 'borderRadius',
        description: 'Default border radius',
      },
      shadows: { value: effects.shadows, type: 'shadow', description: 'Shadow intensity' },
      blur: { value: effects.blur, type: 'blur', description: 'Blur intensity' },
      animations: { value: effects.animations, type: 'animation', description: 'Animation style' },
      gradients: { value: effects.gradients, type: 'boolean', description: 'Use gradients' },
    },
    layout: {
      type: { value: structure.type, type: 'string', description: 'Layout type' },
      hasHeader: { value: structure.hasHeader, type: 'boolean' },
      hasSidebar: { value: structure.hasSidebar, type: 'boolean' },
      hasFooter: { value: structure.hasFooter, type: 'boolean' },
      sidebarPosition: { value: structure.sidebarPosition, type: 'string' },
      contentLayout: { value: structure.contentLayout, type: 'string' },
      mainContentWidth: { value: structure.mainContentWidth, type: 'string' },
    },
    responsive: {
      mobileBreakpoint: {
        value: responsive.mobileBreakpoint,
        type: 'dimension',
        description: 'Mobile breakpoint (px)',
      },
      tabletBreakpoint: {
        value: responsive.tabletBreakpoint,
        type: 'dimension',
        description: 'Tablet breakpoint (px)',
      },
      mobileLayout: { value: responsive.mobileLayout, type: 'string' },
      mobileHeader: { value: responsive.mobileHeader, type: 'string' },
    },
  };

  return tokens;
}

// ============================================================================
// REACT COMPONENT EXPORT
// ============================================================================

/**
 * Generate CSS class string from design settings (currently unused but kept for future use)
 */
// function generateClassString(globalStyles: GlobalStyles): string {
//   const classes: string[] = [];

//   // Typography classes
//   classes.push(`font-[${globalStyles.typography.fontFamily.split(',')[0].trim()}]`);

//   // Spacing classes
//   switch (globalStyles.spacing.density) {
//     case 'compact':
//       classes.push('gap-2');
//       break;
//     case 'relaxed':
//       classes.push('gap-6');
//       break;
//     default:
//       classes.push('gap-4');
//   }

//   return classes.join(' ');
// }

/**
 * Export LayoutDesign to a React component string
 */
export function exportToReactComponent(design: LayoutDesign): string {
  const { globalStyles, components, structure } = design;
  const { colors, effects } = globalStyles;

  const componentName = design.name.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedLayout';

  const component = `'use client';

import React from 'react';

/**
 * ${design.name}
 * Generated from LayoutDesign
 *
 * Design Specifications:
 * - Style: ${design.basePreferences.style}
 * - Color Scheme: ${design.basePreferences.colorScheme}
 * - Layout: ${design.basePreferences.layout}
 */

// Design tokens as CSS custom properties
const designTokens = {
  '--color-primary': '${colors.primary}',
  '--color-secondary': '${colors.secondary || colors.primary}',
  '--color-accent': '${colors.accent || colors.primary}',
  '--color-background': '${colors.background}',
  '--color-surface': '${colors.surface}',
  '--color-text': '${colors.text}',
  '--color-text-muted': '${colors.textMuted}',
  '--color-border': '${colors.border}',
  '--border-radius': '${effectsPresetToValue('borderRadius', effects.borderRadius)}',
} as React.CSSProperties;

interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}

export function ${componentName}({ children, className = '' }: ${componentName}Props) {
  return (
    <div
      className={\`min-h-screen \${className}\`}
      style={{
        ...designTokens,
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
      }}
    >
      ${
        structure.hasHeader
          ? `{/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">{/* Logo */}</div>
          <nav className="flex items-center gap-4">
            {/* Navigation items */}
          </nav>
          ${
            components.header?.hasCTA
              ? `<button
            className="px-4 py-2 rounded-lg text-white"
            style={{
              backgroundColor: 'var(--color-primary)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            ${components.header.ctaText || 'Get Started'}
          </button>`
              : ''
          }
        </div>
      </header>`
          : ''
      }

      ${
        structure.hasSidebar
          ? `{/* Sidebar */}
      <aside
        className="fixed ${structure.sidebarPosition === 'left' ? 'left-0' : 'right-0'} top-0 h-screen w-64 border-r pt-16"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <nav className="p-4">
          {/* Sidebar navigation */}
        </nav>
      </aside>`
          : ''
      }

      {/* Main Content */}
      <main className="${structure.hasSidebar ? (structure.sidebarPosition === 'left' ? 'ml-64' : 'mr-64') : ''} ${structure.hasHeader ? 'pt-16' : ''}">
        <div className="${structure.contentLayout === 'centered' ? 'container mx-auto' : 'w-full'} px-4 py-8">
          {children}
        </div>
      </main>

      ${
        structure.hasFooter
          ? `{/* Footer */}
      <footer
        className="border-t py-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="container mx-auto px-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
          <p>&copy; {new Date().getFullYear()} ${design.name}. All rights reserved.</p>
        </div>
      </footer>`
          : ''
      }
    </div>
  );
}

export default ${componentName};
`;

  return component;
}

// ============================================================================
// NEW COMPONENT TYPE EXPORTS
// ============================================================================

/**
 * Generate CSS for CarouselDesign
 */
export function exportCarouselToCSS(carousel: CarouselDesign): string {
  const transitionDuration =
    carousel.transitionDuration === 'fast'
      ? '200ms'
      : carousel.transitionDuration === 'slow'
        ? '600ms'
        : '400ms';

  return `.carousel {
  position: relative;
  overflow: hidden;
}
.carousel-track {
  display: flex;
  transition: transform ${transitionDuration} ease-out;
}
.carousel-slide {
  flex: 0 0 100%;
}
${
  carousel.showIndicators
    ? `.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
.carousel-indicator {
  width: ${carousel.indicatorStyle === 'bars' ? '24px' : '8px'};
  height: 8px;
  border-radius: ${carousel.indicatorStyle === 'dots' ? '50%' : '4px'};
  background: var(--color-text-muted);
  opacity: 0.5;
  cursor: pointer;
}
.carousel-indicator.active {
  opacity: 1;
  background: var(--color-primary);
}`
    : ''
}
${
  carousel.showControls
    ? `.carousel-control {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 8px;
  cursor: pointer;
}
.carousel-control.prev { left: 16px; }
.carousel-control.next { right: 16px; }`
    : ''
}`;
}

/**
 * Generate CSS for StepperDesign
 */
export function exportStepperToCSS(stepper: StepperDesign): string {
  const size = stepper.size === 'sm' ? '24px' : stepper.size === 'lg' ? '40px' : '32px';

  return `.stepper {
  display: flex;
  ${stepper.variant === 'vertical' ? 'flex-direction: column;' : 'flex-direction: row; align-items: center;'}
}
.stepper-step {
  display: flex;
  align-items: center;
  ${stepper.variant === 'vertical' ? 'flex-direction: row;' : 'flex-direction: column;'}
}
.stepper-marker {
  width: ${size};
  height: ${size};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  font-weight: 600;
}
.stepper-step.completed .stepper-marker {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
.stepper-step.active .stepper-marker {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.stepper-connector {
  ${
    stepper.variant === 'vertical'
      ? 'width: 2px; height: 40px; margin: 8px 0 8px calc(' + size + ' / 2 - 1px);'
      : 'height: 2px; flex: 1; margin: 0 16px;'
  }
  background: var(--color-border);
  ${stepper.connectorStyle === 'dashed' ? 'background: transparent; border-top: 2px dashed var(--color-border);' : ''}
}
.stepper-step.completed + .stepper-connector {
  background: var(--color-primary);
}`;
}

/**
 * Generate CSS for TimelineDesign
 */
export function exportTimelineToCSS(timeline: TimelineDesign): string {
  const markerSize = timeline.markerStyle === 'diamond' ? '12px' : '10px';

  return `.timeline {
  position: relative;
  ${timeline.variant === 'horizontal' ? 'display: flex; overflow-x: auto;' : ''}
}
.timeline-connector {
  position: absolute;
  ${timeline.variant === 'horizontal' ? 'top: 50%; left: 0; right: 0; height: 2px;' : 'left: 20px; top: 0; bottom: 0; width: 2px;'}
  background: var(--color-border);
  ${timeline.connectorStyle === 'dashed' ? 'background: transparent; border-left: 2px dashed var(--color-border);' : ''}
  ${timeline.connectorStyle === 'dotted' ? 'background: transparent; border-left: 2px dotted var(--color-border);' : ''}
}
.timeline-item {
  position: relative;
  ${
    timeline.variant === 'horizontal'
      ? 'flex: 0 0 auto; padding: 0 24px;'
      : timeline.variant === 'alternating'
        ? 'width: 50%; padding: 0 40px;'
        : 'padding-left: 50px; margin-bottom: 24px;'
  }
}
${
  timeline.variant === 'alternating'
    ? `.timeline-item:nth-child(even) { margin-left: 50%; }
.timeline-item:nth-child(odd) { text-align: right; }`
    : ''
}
.timeline-marker {
  position: absolute;
  ${timeline.variant === 'horizontal' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : 'left: 15px; top: 4px;'}
  width: ${markerSize};
  height: ${markerSize};
  background: var(--color-primary);
  ${
    timeline.markerStyle === 'circle'
      ? 'border-radius: 50%;'
      : timeline.markerStyle === 'square'
        ? 'border-radius: 2px;'
        : timeline.markerStyle === 'diamond'
          ? 'transform: rotate(45deg);'
          : ''
  }
}`;
}

/**
 * Generate CSS for PaginationDesign
 */
export function exportPaginationToCSS(pagination: PaginationDesign): string {
  const size = pagination.size === 'sm' ? '28px' : pagination.size === 'lg' ? '44px' : '36px';
  const radius =
    pagination.shape === 'pill' ? '999px' : pagination.shape === 'square' ? '4px' : '8px';

  return `.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pagination-item {
  min-width: ${size};
  height: ${size};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${radius};
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: all 150ms ease;
}
.pagination-item:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
.pagination-item.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
.pagination-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
${
  pagination.variant === 'load-more'
    ? `.load-more-btn {
  width: 100%;
  padding: 12px 24px;
  border-radius: ${radius};
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}`
    : ''
}`;
}

/**
 * Generate CSS for BreadcrumbDesign
 */
export function exportBreadcrumbToCSS(breadcrumb: BreadcrumbDesign): string {
  const separator =
    breadcrumb.separator === 'chevron'
      ? '"›"'
      : breadcrumb.separator === 'arrow'
        ? '"→"'
        : breadcrumb.separator === 'dot'
          ? '"·"'
          : '"/"';

  return `.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.breadcrumb-item {
  color: var(--color-text-muted);
  text-decoration: none;
}
.breadcrumb-item:hover {
  color: var(--color-primary);
}
.breadcrumb-item.active {
  color: var(--color-text);
  pointer-events: none;
}
.breadcrumb-separator {
  color: var(--color-text-muted);
}
.breadcrumb-separator::after {
  content: ${separator};
}
${
  breadcrumb.truncate
    ? `.breadcrumb.truncated .breadcrumb-item:not(:first-child):not(:last-child):not(:nth-last-child(2)) {
  display: none;
}
.breadcrumb.truncated .breadcrumb-ellipsis {
  display: inline;
}`
    : ''
}`;
}

/**
 * Generate responsive override CSS
 */
export function exportResponsiveOverrides<T>(
  overrides: ResponsiveOverrides<T> | undefined,
  componentName: string
): string {
  if (!overrides) return '';

  const lines: string[] = [];

  if (overrides.mobile) {
    lines.push(`@media (max-width: 639px) {
  .${componentName} {
    ${Object.entries(overrides.mobile)
      .map(([key, value]) => `--${componentName}-${key}: ${value};`)
      .join('\n    ')}
  }
}`);
  }

  if (overrides.tablet) {
    lines.push(`@media (min-width: 640px) and (max-width: 1023px) {
  .${componentName} {
    ${Object.entries(overrides.tablet)
      .map(([key, value]) => `--${componentName}-${key}: ${value};`)
      .join('\n    ')}
  }
}`);
  }

  if (overrides.desktop) {
    lines.push(`@media (min-width: 1024px) {
  .${componentName} {
    ${Object.entries(overrides.desktop)
      .map(([key, value]) => `--${componentName}-${key}: ${value};`)
      .join('\n    ')}
  }
}`);
  }

  return lines.join('\n\n');
}

// ============================================================================
// GRID CONFIG EXPORT
// ============================================================================

/**
 * Export GridConfig to CSS grid template
 */
export function exportGridConfigToCSS(config: GridConfig): string {
  const lines: string[] = [];

  // Grid template columns
  if (typeof config.columns === 'number') {
    lines.push(`grid-template-columns: repeat(${config.columns}, 1fr);`);
  } else if (config.columnWidths) {
    lines.push(`grid-template-columns: ${config.columnWidths.join(' ')};`);
  } else {
    lines.push(
      `grid-template-columns: repeat(${config.columns}, minmax(${config.minColumnWidth || '250px'}, 1fr));`
    );
  }

  // Gap
  lines.push(`gap: ${config.gap};`);
  if (config.rowGap && config.rowGap !== config.gap) {
    lines.push(`row-gap: ${config.rowGap};`);
  }

  // Alignment
  if (config.alignItems) {
    lines.push(`align-items: ${config.alignItems};`);
  }
  if (config.justifyItems) {
    lines.push(`justify-items: ${config.justifyItems};`);
  }

  return `.grid-container {\n  display: grid;\n  ${lines.join('\n  ')}\n}`;
}

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export interface ExportOptions {
  format: 'css' | 'tailwind' | 'tokens' | 'react' | 'shadcn' | 'all';
  includeComments?: boolean;
}

export interface ExportResult {
  css?: string;
  tailwind?: string;
  tokens?: object;
  react?: string;
  shadcn?: string;
}

/**
 * Export LayoutDesign to multiple formats
 */
export function exportLayout(design: LayoutDesign, options: ExportOptions): ExportResult {
  const result: ExportResult = {};

  if (options.format === 'all' || options.format === 'css') {
    result.css = exportToCSSVariables(design);
  }

  if (options.format === 'all' || options.format === 'tailwind') {
    result.tailwind = exportToTailwindConfig(design);
  }

  if (options.format === 'all' || options.format === 'tokens') {
    result.tokens = exportToFigmaTokens(design);
  }

  if (options.format === 'all' || options.format === 'react') {
    result.react = exportToReactComponent(design);
  }

  if (options.format === 'all' || options.format === 'shadcn') {
    result.shadcn = exportToShadcnTheme(design);
  }

  return result;
}

/**
 * Download exported content as a file
 */
export function downloadExport(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy content to clipboard
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
