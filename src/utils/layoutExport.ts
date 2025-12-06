/**
 * Layout Export Utilities
 *
 * Provides functions to export LayoutDesign to various formats:
 * - React components
 * - Tailwind CSS configuration
 * - CSS custom properties (variables)
 * - Design tokens (Figma-compatible JSON)
 */

import type {
  LayoutDesign,
  GlobalStyles,
  ExtendedLayoutDesign,
  GridConfig,
} from '@/types/layoutDesign';

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
    `  --color-success: ${colors.success || '#22C55E'};`,
    `  --color-warning: ${colors.warning || '#F59E0B'};`,
    `  --color-error: ${colors.error || '#EF4444'};`,
    `  --color-info: ${colors.info || '#3B82F6'};`,
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
          success: colors.success || '#22C55E',
          warning: colors.warning || '#F59E0B',
          error: colors.error || '#EF4444',
          info: colors.info || '#3B82F6',
        },
        spacing: {
          'density': spacingPresetToValue(spacing.density),
          'section': spacingPresetToValue(spacing.sectionPadding),
          'gap': spacingPresetToValue(spacing.componentGap),
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
      secondary: { value: colors.secondary || colors.primary, type: 'color', description: 'Secondary brand color' },
      accent: { value: colors.accent || colors.primary, type: 'color', description: 'Accent color for highlights' },
      background: { value: colors.background, type: 'color', description: 'Page background color' },
      surface: { value: colors.surface, type: 'color', description: 'Card/surface background color' },
      text: { value: colors.text, type: 'color', description: 'Primary text color' },
      textMuted: { value: colors.textMuted, type: 'color', description: 'Secondary/muted text color' },
      border: { value: colors.border, type: 'color', description: 'Border color' },
      success: { value: colors.success || '#22C55E', type: 'color', description: 'Success state color' },
      warning: { value: colors.warning || '#F59E0B', type: 'color', description: 'Warning state color' },
      error: { value: colors.error || '#EF4444', type: 'color', description: 'Error state color' },
      info: { value: colors.info || '#3B82F6', type: 'color', description: 'Info state color' },
    },
    typography: {
      fontFamily: {
        body: { value: typography.fontFamily, type: 'fontFamily', description: 'Body text font' },
        heading: { value: typography.headingFont || typography.fontFamily, type: 'fontFamily', description: 'Heading font' },
      },
      fontWeight: {
        body: { value: typography.bodyWeight, type: 'fontWeight', description: 'Body text weight' },
        heading: { value: typography.headingWeight, type: 'fontWeight', description: 'Heading weight' },
      },
      fontSize: {
        body: { value: typography.bodySize, type: 'fontSize', description: 'Base body text size' },
        heading: { value: typography.headingSize, type: 'fontSize', description: 'Base heading size' },
      },
      lineHeight: { value: typography.lineHeight, type: 'lineHeight', description: 'Line height preset' },
      letterSpacing: { value: typography.letterSpacing, type: 'letterSpacing', description: 'Letter spacing preset' },
    },
    spacing: {
      density: { value: spacing.density, type: 'spacing', description: 'Overall spacing density' },
      containerWidth: { value: spacing.containerWidth, type: 'dimension', description: 'Max container width' },
      sectionPadding: { value: spacing.sectionPadding, type: 'spacing', description: 'Section vertical padding' },
      componentGap: { value: spacing.componentGap, type: 'spacing', description: 'Gap between components' },
    },
    effects: {
      borderRadius: { value: effects.borderRadius, type: 'borderRadius', description: 'Default border radius' },
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
      mobileBreakpoint: { value: responsive.mobileBreakpoint, type: 'dimension', description: 'Mobile breakpoint (px)' },
      tabletBreakpoint: { value: responsive.tabletBreakpoint, type: 'dimension', description: 'Tablet breakpoint (px)' },
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
 * Generate CSS class string from design settings
 */
function generateClassString(globalStyles: GlobalStyles): string {
  const classes: string[] = [];

  // Typography classes
  classes.push(`font-[${globalStyles.typography.fontFamily.split(',')[0].trim()}]`);

  // Spacing classes
  switch (globalStyles.spacing.density) {
    case 'compact':
      classes.push('gap-2');
      break;
    case 'relaxed':
      classes.push('gap-6');
      break;
    default:
      classes.push('gap-4');
  }

  return classes.join(' ');
}

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
      ${structure.hasHeader ? `{/* Header */}
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
          ${components.header?.hasCTA ? `<button
            className="px-4 py-2 rounded-lg text-white"
            style={{
              backgroundColor: 'var(--color-primary)',
              borderRadius: 'var(--border-radius)',
            }}
          >
            ${components.header.ctaText || 'Get Started'}
          </button>` : ''}
        </div>
      </header>` : ''}

      ${structure.hasSidebar ? `{/* Sidebar */}
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
      </aside>` : ''}

      {/* Main Content */}
      <main className="${structure.hasSidebar ? (structure.sidebarPosition === 'left' ? 'ml-64' : 'mr-64') : ''} ${structure.hasHeader ? 'pt-16' : ''}">
        <div className="${structure.contentLayout === 'centered' ? 'container mx-auto' : 'w-full'} px-4 py-8">
          {children}
        </div>
      </main>

      ${structure.hasFooter ? `{/* Footer */}
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
      </footer>` : ''}
    </div>
  );
}

export default ${componentName};
`;

  return component;
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
    lines.push(`grid-template-columns: repeat(${config.columns}, minmax(${config.minColumnWidth || '250px'}, 1fr));`);
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
  format: 'css' | 'tailwind' | 'tokens' | 'react' | 'all';
  includeComments?: boolean;
}

export interface ExportResult {
  css?: string;
  tailwind?: string;
  tokens?: object;
  react?: string;
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

  return result;
}

/**
 * Download exported content as a file
 */
export function downloadExport(content: string, filename: string, mimeType: string = 'text/plain'): void {
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
