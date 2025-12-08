/**
 * Spec Sheet Export Utility
 *
 * Exports design analysis to various formats:
 * - CSS Variables
 * - Tailwind Config
 * - JSON Spec
 * - Figma Design Tokens
 */

import type { CompleteDesignAnalysis, FontSpec, GradientDefinition } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export interface SpecSheetExport {
  json: string;
  css: string;
  tailwindConfig: string;
  figmaTokens: string;
  summary: string;
}

export interface ExportOptions {
  includeComments?: boolean;
  prefix?: string;
  format?: 'compact' | 'expanded';
}

// ============================================================================
// CSS VARIABLE GENERATION
// ============================================================================

/**
 * Generate CSS custom properties from design analysis
 */
export function generateCSSVariables(
  analysis: CompleteDesignAnalysis,
  options: ExportOptions = {}
): string {
  const { includeComments = true, prefix = '' } = options;
  const p = prefix ? `${prefix}-` : '';
  const lines: string[] = [];

  const addComment = (text: string) => {
    if (includeComments) {
      lines.push(`  /* ${text} */`);
    }
  };

  lines.push(':root {');

  // Colors
  addComment('Colors - Primary Palette');
  if (analysis.colors.primary) lines.push(`  --${p}color-primary: ${analysis.colors.primary};`);
  if (analysis.colors.secondary)
    lines.push(`  --${p}color-secondary: ${analysis.colors.secondary};`);
  if (analysis.colors.accent) lines.push(`  --${p}color-accent: ${analysis.colors.accent};`);
  lines.push('');

  addComment('Colors - Background & Surface');
  if (analysis.colors.background)
    lines.push(`  --${p}color-background: ${analysis.colors.background};`);
  if (analysis.colors.surface) lines.push(`  --${p}color-surface: ${analysis.colors.surface};`);
  if (analysis.colors.surfaceAlt)
    lines.push(`  --${p}color-surface-alt: ${analysis.colors.surfaceAlt};`);
  lines.push('');

  addComment('Colors - Text');
  if (analysis.colors.text) lines.push(`  --${p}color-text: ${analysis.colors.text};`);
  if (analysis.colors.textMuted)
    lines.push(`  --${p}color-text-muted: ${analysis.colors.textMuted};`);
  if (analysis.colors.textInverted)
    lines.push(`  --${p}color-text-inverted: ${analysis.colors.textInverted};`);
  lines.push('');

  addComment('Colors - Borders');
  if (analysis.colors.border) lines.push(`  --${p}color-border: ${analysis.colors.border};`);
  if (analysis.colors.borderLight)
    lines.push(`  --${p}color-border-light: ${analysis.colors.borderLight};`);
  lines.push('');

  addComment('Colors - Semantic');
  if (analysis.colors.success) lines.push(`  --${p}color-success: ${analysis.colors.success};`);
  if (analysis.colors.warning) lines.push(`  --${p}color-warning: ${analysis.colors.warning};`);
  if (analysis.colors.error) lines.push(`  --${p}color-error: ${analysis.colors.error};`);
  if (analysis.colors.info) lines.push(`  --${p}color-info: ${analysis.colors.info};`);
  lines.push('');

  // Gradients
  if (analysis.colors.gradients && analysis.colors.gradients.length > 0) {
    addComment('Gradients');
    analysis.colors.gradients.forEach((gradient, i) => {
      lines.push(`  --${p}gradient-${i + 1}: ${gradient.css};`);
    });
    lines.push('');
  }

  // Typography
  if (analysis.typography) {
    addComment('Typography - Font Families');
    if (analysis.typography.headingFont) {
      const fallbacks = analysis.typography.headingFont.fallbacks?.join(', ') || 'sans-serif';
      lines.push(
        `  --${p}font-heading: '${analysis.typography.headingFont.family}', ${fallbacks};`
      );
    }
    if (analysis.typography.bodyFont) {
      const fallbacks = analysis.typography.bodyFont.fallbacks?.join(', ') || 'sans-serif';
      lines.push(`  --${p}font-body: '${analysis.typography.bodyFont.family}', ${fallbacks};`);
    }
    if (analysis.typography.monoFont) {
      const fallbacks = analysis.typography.monoFont.fallbacks?.join(', ') || 'monospace';
      lines.push(`  --${p}font-mono: '${analysis.typography.monoFont.family}', ${fallbacks};`);
    }
    lines.push('');

    addComment('Typography - Heading Sizes');
    if (analysis.typography.displaySizes) {
      Object.entries(analysis.typography.displaySizes).forEach(([key, scale]) => {
        if (scale) {
          lines.push(`  --${p}text-${key}: ${scale.size};`);
          lines.push(`  --${p}text-${key}-line-height: ${scale.lineHeight};`);
          lines.push(`  --${p}text-${key}-weight: ${scale.weight};`);
          if (scale.letterSpacing) {
            lines.push(`  --${p}text-${key}-tracking: ${scale.letterSpacing};`);
          }
        }
      });
    }
    lines.push('');

    addComment('Typography - Body Sizes');
    if (analysis.typography.bodySizes) {
      Object.entries(analysis.typography.bodySizes).forEach(([key, scale]) => {
        if (scale) {
          lines.push(`  --${p}text-body-${key}: ${scale.size};`);
        }
      });
    }
    lines.push('');
  }

  // Spacing
  if (analysis.spacing) {
    addComment('Spacing');
    lines.push(`  --${p}spacing-unit: ${analysis.spacing.baseUnit}px;`);
    if (analysis.spacing.scale) {
      analysis.spacing.scale.forEach((value, i) => {
        lines.push(`  --${p}spacing-${i + 1}: ${value}px;`);
      });
    }
    if (analysis.spacing.containerMaxWidth) {
      lines.push(`  --${p}container-max-width: ${analysis.spacing.containerMaxWidth};`);
    }
    lines.push('');
  }

  // Border Radius
  if (analysis.effects?.borderRadius) {
    addComment('Border Radius');
    Object.entries(analysis.effects.borderRadius).forEach(([key, value]) => {
      if (value) {
        lines.push(`  --${p}radius-${key}: ${value};`);
      }
    });
    lines.push('');
  }

  // Shadows
  if (analysis.effects?.shadows) {
    addComment('Shadows');
    Object.entries(analysis.effects.shadows).forEach(([key, value]) => {
      if (value) {
        lines.push(`  --${p}shadow-${key}: ${value};`);
      }
    });
    lines.push('');
  }

  // Transitions
  if (analysis.effects?.transitions) {
    addComment('Transitions');
    Object.entries(analysis.effects.transitions).forEach(([key, value]) => {
      if (value) {
        lines.push(`  --${p}transition-${key}: ${value};`);
      }
    });
  }

  lines.push('}');

  return lines.join('\n');
}

// ============================================================================
// TAILWIND CONFIG GENERATION
// ============================================================================

/**
 * Generate Tailwind CSS config extension from design analysis
 */
export function generateTailwindConfig(
  analysis: CompleteDesignAnalysis,
  options: ExportOptions = {}
): string {
  const { includeComments = true } = options;

  interface TailwindConfig {
    theme: {
      extend: Record<string, unknown>;
    };
  }

  const config: TailwindConfig = {
    theme: {
      extend: {},
    },
  };

  const extend = config.theme.extend;

  // Colors
  const colors: Record<string, string> = {};
  if (analysis.colors.primary) colors.primary = analysis.colors.primary;
  if (analysis.colors.secondary) colors.secondary = analysis.colors.secondary;
  if (analysis.colors.accent) colors.accent = analysis.colors.accent;
  if (analysis.colors.background) colors.background = analysis.colors.background;
  if (analysis.colors.surface) colors.surface = analysis.colors.surface;
  if (analysis.colors.text) colors.foreground = analysis.colors.text;
  if (analysis.colors.textMuted) colors.muted = analysis.colors.textMuted;
  if (analysis.colors.border) colors.border = analysis.colors.border;
  if (analysis.colors.success) colors.success = analysis.colors.success;
  if (analysis.colors.warning) colors.warning = analysis.colors.warning;
  if (analysis.colors.error) colors.error = analysis.colors.error;
  if (analysis.colors.info) colors.info = analysis.colors.info;

  if (Object.keys(colors).length > 0) {
    extend.colors = colors;
  }

  // Font Family
  const fontFamily: Record<string, string[]> = {};
  if (analysis.typography?.headingFont) {
    fontFamily.heading = [
      analysis.typography.headingFont.family,
      ...(analysis.typography.headingFont.fallbacks || ['sans-serif']),
    ];
  }
  if (analysis.typography?.bodyFont) {
    fontFamily.body = [
      analysis.typography.bodyFont.family,
      ...(analysis.typography.bodyFont.fallbacks || ['sans-serif']),
    ];
  }
  if (analysis.typography?.monoFont) {
    fontFamily.mono = [
      analysis.typography.monoFont.family,
      ...(analysis.typography.monoFont.fallbacks || ['monospace']),
    ];
  }

  if (Object.keys(fontFamily).length > 0) {
    extend.fontFamily = fontFamily;
  }

  // Font Size
  if (analysis.typography?.displaySizes) {
    const fontSize: Record<string, [string, Record<string, string>]> = {};
    Object.entries(analysis.typography.displaySizes).forEach(([key, scale]) => {
      if (scale) {
        fontSize[key] = [
          scale.size,
          {
            lineHeight: String(scale.lineHeight),
            fontWeight: String(scale.weight),
            ...(scale.letterSpacing ? { letterSpacing: scale.letterSpacing } : {}),
          },
        ];
      }
    });
    if (Object.keys(fontSize).length > 0) {
      extend.fontSize = fontSize;
    }
  }

  // Spacing
  if (analysis.spacing?.scale) {
    const spacing: Record<string, string> = {};
    analysis.spacing.scale.forEach((value, i) => {
      spacing[String(i + 1)] = `${value}px`;
    });
    extend.spacing = spacing;
  }

  // Border Radius
  if (analysis.effects?.borderRadius) {
    const borderRadius: Record<string, string> = {};
    Object.entries(analysis.effects.borderRadius).forEach(([key, value]) => {
      if (value) {
        borderRadius[key] = value;
      }
    });
    if (Object.keys(borderRadius).length > 0) {
      extend.borderRadius = borderRadius;
    }
  }

  // Box Shadow
  if (analysis.effects?.shadows) {
    const boxShadow: Record<string, string> = {};
    Object.entries(analysis.effects.shadows).forEach(([key, value]) => {
      if (value) {
        boxShadow[key] = value;
      }
    });
    if (Object.keys(boxShadow).length > 0) {
      extend.boxShadow = boxShadow;
    }
  }

  // Generate output
  let output = includeComments
    ? `// Tailwind CSS Config Extension\n// Generated from design analysis\n\n`
    : '';

  output += `module.exports = ${JSON.stringify(config, null, 2)}`;

  return output;
}

// ============================================================================
// FIGMA TOKENS GENERATION
// ============================================================================

/**
 * Generate Figma Design Tokens format from design analysis
 */
export function generateFigmaTokens(
  analysis: CompleteDesignAnalysis,
  options: ExportOptions = {}
): string {
  const tokens: Record<string, unknown> = {};

  // Color tokens
  const colorTokens: Record<string, { value: string; type: string }> = {};

  if (analysis.colors.primary) {
    colorTokens.primary = { value: analysis.colors.primary, type: 'color' };
  }
  if (analysis.colors.secondary) {
    colorTokens.secondary = { value: analysis.colors.secondary, type: 'color' };
  }
  if (analysis.colors.accent) {
    colorTokens.accent = { value: analysis.colors.accent, type: 'color' };
  }
  if (analysis.colors.background) {
    colorTokens.background = { value: analysis.colors.background, type: 'color' };
  }
  if (analysis.colors.surface) {
    colorTokens.surface = { value: analysis.colors.surface, type: 'color' };
  }
  if (analysis.colors.text) {
    colorTokens.text = { value: analysis.colors.text, type: 'color' };
  }
  if (analysis.colors.textMuted) {
    colorTokens['text-muted'] = { value: analysis.colors.textMuted, type: 'color' };
  }
  if (analysis.colors.border) {
    colorTokens.border = { value: analysis.colors.border, type: 'color' };
  }

  tokens.color = colorTokens;

  // Typography tokens
  const typographyTokens: Record<string, unknown> = {};

  if (analysis.typography?.headingFont) {
    typographyTokens['font-heading'] = {
      value: analysis.typography.headingFont.family,
      type: 'fontFamilies',
    };
  }
  if (analysis.typography?.bodyFont) {
    typographyTokens['font-body'] = {
      value: analysis.typography.bodyFont.family,
      type: 'fontFamilies',
    };
  }

  if (analysis.typography?.displaySizes) {
    Object.entries(analysis.typography.displaySizes).forEach(([key, scale]) => {
      if (scale) {
        typographyTokens[`size-${key}`] = { value: scale.size, type: 'fontSizes' };
        typographyTokens[`weight-${key}`] = { value: String(scale.weight), type: 'fontWeights' };
        typographyTokens[`line-height-${key}`] = {
          value: String(scale.lineHeight),
          type: 'lineHeights',
        };
      }
    });
  }

  tokens.typography = typographyTokens;

  // Spacing tokens
  if (analysis.spacing?.scale) {
    const spacingTokens: Record<string, { value: string; type: string }> = {};
    analysis.spacing.scale.forEach((value, i) => {
      spacingTokens[`space-${i + 1}`] = { value: `${value}px`, type: 'spacing' };
    });
    tokens.spacing = spacingTokens;
  }

  // Border radius tokens
  if (analysis.effects?.borderRadius) {
    const radiusTokens: Record<string, { value: string; type: string }> = {};
    Object.entries(analysis.effects.borderRadius).forEach(([key, value]) => {
      if (value) {
        radiusTokens[`radius-${key}`] = { value, type: 'borderRadius' };
      }
    });
    tokens.borderRadius = radiusTokens;
  }

  // Shadow tokens
  if (analysis.effects?.shadows) {
    const shadowTokens: Record<string, { value: string; type: string }> = {};
    Object.entries(analysis.effects.shadows).forEach(([key, value]) => {
      if (value) {
        shadowTokens[`shadow-${key}`] = { value, type: 'boxShadow' };
      }
    });
    tokens.boxShadow = shadowTokens;
  }

  return JSON.stringify(tokens, null, 2);
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate human-readable summary of the design analysis
 */
export function generateSummary(analysis: CompleteDesignAnalysis): string {
  const lines: string[] = [];

  lines.push('# Design Specification Summary');
  lines.push('');

  // Colors
  lines.push('## Color Palette');
  lines.push('');
  lines.push('| Role | Color |');
  lines.push('|------|-------|');
  if (analysis.colors.primary) lines.push(`| Primary | ${analysis.colors.primary} |`);
  if (analysis.colors.secondary) lines.push(`| Secondary | ${analysis.colors.secondary} |`);
  if (analysis.colors.accent) lines.push(`| Accent | ${analysis.colors.accent} |`);
  if (analysis.colors.background) lines.push(`| Background | ${analysis.colors.background} |`);
  if (analysis.colors.text) lines.push(`| Text | ${analysis.colors.text} |`);
  lines.push('');

  // Typography
  if (analysis.typography) {
    lines.push('## Typography');
    lines.push('');

    if (analysis.typography.headingFont) {
      lines.push(`**Heading Font:** ${analysis.typography.headingFont.family}`);
      if (analysis.typography.headingFont.googleFontUrl) {
        lines.push(`  - Google Fonts: ${analysis.typography.headingFont.googleFontUrl}`);
      }
    }

    if (analysis.typography.bodyFont) {
      lines.push(`**Body Font:** ${analysis.typography.bodyFont.family}`);
      if (analysis.typography.bodyFont.googleFontUrl) {
        lines.push(`  - Google Fonts: ${analysis.typography.bodyFont.googleFontUrl}`);
      }
    }
    lines.push('');

    if (analysis.typography.displaySizes) {
      lines.push('### Heading Sizes');
      lines.push('');
      lines.push('| Level | Size | Weight | Line Height |');
      lines.push('|-------|------|--------|-------------|');
      Object.entries(analysis.typography.displaySizes).forEach(([key, scale]) => {
        if (scale) {
          lines.push(`| ${key} | ${scale.size} | ${scale.weight} | ${scale.lineHeight} |`);
        }
      });
      lines.push('');
    }
  }

  // Spacing
  if (analysis.spacing) {
    lines.push('## Spacing System');
    lines.push('');
    lines.push(`**Base Unit:** ${analysis.spacing.baseUnit}px`);
    if (analysis.spacing.scale) {
      lines.push(`**Scale:** ${analysis.spacing.scale.join('px, ')}px`);
    }
    if (analysis.spacing.containerMaxWidth) {
      lines.push(`**Container Max Width:** ${analysis.spacing.containerMaxWidth}`);
    }
    lines.push('');
  }

  // Effects
  if (analysis.effects) {
    lines.push('## Effects');
    lines.push('');

    if (analysis.effects.borderRadius) {
      lines.push('### Border Radius');
      Object.entries(analysis.effects.borderRadius).forEach(([key, value]) => {
        if (value) {
          lines.push(`- **${key}:** ${value}`);
        }
      });
      lines.push('');
    }

    if (analysis.effects.shadows) {
      lines.push('### Shadows');
      Object.entries(analysis.effects.shadows).forEach(([key, value]) => {
        if (value) {
          lines.push(`- **${key}:** ${value}`);
        }
      });
      lines.push('');
    }
  }

  // Layout
  if (analysis.layout) {
    lines.push('## Layout');
    lines.push('');
    lines.push(`**Type:** ${analysis.layout.type}`);
    if (analysis.layout.gridColumns) {
      lines.push(`**Grid Columns:** ${analysis.layout.gridColumns}`);
    }
    if (analysis.layout.gridGutter) {
      lines.push(`**Grid Gutter:** ${analysis.layout.gridGutter}`);
    }
    lines.push('');
  }

  // Components
  if (analysis.components) {
    lines.push('## Detected Components');
    lines.push('');
    const componentList = Object.entries(analysis.components)
      .filter(([, value]) => value)
      .map(([key]) => key);
    lines.push(componentList.map((c) => `- ${c}`).join('\n'));
    lines.push('');
  }

  // Animations
  if (analysis.animations) {
    const animCount =
      (analysis.animations.hover?.length || 0) +
      (analysis.animations.entrance?.length || 0) +
      (analysis.animations.scroll?.length || 0);

    if (animCount > 0) {
      lines.push('## Animations');
      lines.push('');
      lines.push(`**Total Detected:** ${animCount}`);
      if (analysis.animations.hover?.length) {
        lines.push(`- Hover Effects: ${analysis.animations.hover.length}`);
      }
      if (analysis.animations.entrance?.length) {
        lines.push(`- Entrance Animations: ${analysis.animations.entrance.length}`);
      }
      if (analysis.animations.scroll?.length) {
        lines.push(`- Scroll Animations: ${analysis.animations.scroll.length}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Export complete design spec sheet in all formats
 */
export function exportSpecSheet(
  analysis: CompleteDesignAnalysis,
  options: ExportOptions = {}
): SpecSheetExport {
  return {
    json: JSON.stringify(analysis, null, 2),
    css: generateCSSVariables(analysis, options),
    tailwindConfig: generateTailwindConfig(analysis, options),
    figmaTokens: generateFigmaTokens(analysis, options),
    summary: generateSummary(analysis),
  };
}

/**
 * Download spec sheet as file
 */
export function downloadSpecSheet(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download all spec sheets as a zip (requires JSZip library)
 */
export async function downloadAllSpecs(
  analysis: CompleteDesignAnalysis,
  projectName: string = 'design-specs'
): Promise<void> {
  const specs = exportSpecSheet(analysis);

  // If JSZip is available, create a zip
  if (typeof window !== 'undefined' && 'JSZip' in window) {
    const JSZip = (window as unknown as { JSZip: typeof import('jszip') }).JSZip;
    const zip = new JSZip();

    zip.file(`${projectName}/variables.css`, specs.css);
    zip.file(`${projectName}/tailwind.config.js`, specs.tailwindConfig);
    zip.file(`${projectName}/tokens.json`, specs.figmaTokens);
    zip.file(`${projectName}/analysis.json`, specs.json);
    zip.file(`${projectName}/README.md`, specs.summary);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback: download CSS only
    downloadSpecSheet(specs.css, `${projectName}-variables.css`, 'text/css');
  }
}

export default exportSpecSheet;
