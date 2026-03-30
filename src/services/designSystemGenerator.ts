/**
 * Design System Generator
 *
 * Extracts design tokens from a LayoutDesign and exports them in various formats.
 * Supports Style Dictionary, Tailwind config, CSS variables, and more.
 */

import type { LayoutDesign } from '@/types/layoutDesign';
import { getPresetKey } from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat =
  | 'style-dictionary'
  | 'tailwind-config'
  | 'css-variables'
  | 'scss-variables'
  | 'json';

export interface TokenDefinition {
  value: string | number;
  type: string;
  description?: string;
  category?: string;
}

export interface ComponentSpec {
  name: string;
  variants: string[];
  defaultProps: Record<string, unknown>;
  tokenUsage: string[];
}

export interface DesignSystemMetadata {
  name: string;
  version: string;
  generatedAt: string;
  sourceDesignId?: string;
}

export interface GeneratedDesignSystem {
  metadata: DesignSystemMetadata;
  tokens: {
    colors: Record<string, TokenDefinition>;
    typography: Record<string, TokenDefinition>;
    spacing: Record<string, TokenDefinition>;
    borderRadius: Record<string, TokenDefinition>;
    shadows: Record<string, TokenDefinition>;
    animations: Record<string, TokenDefinition>;
  };
  components: Record<string, ComponentSpec>;
  exports: {
    styleDictionary?: string;
    tailwindConfig?: string;
    cssVariables?: string;
    scssVariables?: string;
    json?: string;
  };
  documentation?: {
    colorUsage: string;
    typographyScale: string;
    spacingSystem: string;
    componentGuidelines: string;
  };
}

export interface DesignSystemOptions {
  outputFormats?: ExportFormat[];
  includeDocumentation?: boolean;
  componentSpecs?: boolean;
  namespace?: string;
}

// ============================================================================
// TOKEN EXTRACTION
// ============================================================================

/**
 * Extract color tokens from design
 */
function extractColorTokens(design: Partial<LayoutDesign>): Record<string, TokenDefinition> {
  const colors = design.globalStyles?.colors;
  const tokens: Record<string, TokenDefinition> = {};

  if (!colors) return tokens;

  const colorMap: Record<string, { description: string; category: string }> = {
    primary: { description: 'Primary brand color for CTAs and key elements', category: 'brand' },
    secondary: { description: 'Secondary brand color for supporting elements', category: 'brand' },
    accent: { description: 'Accent color for highlights and emphasis', category: 'brand' },
    background: { description: 'Main background color', category: 'background' },
    surface: { description: 'Surface/card background color', category: 'background' },
    text: { description: 'Primary text color', category: 'text' },
    textMuted: { description: 'Secondary/muted text color', category: 'text' },
    border: { description: 'Border and divider color', category: 'border' },
    success: { description: 'Success/positive state color', category: 'semantic' },
    warning: { description: 'Warning/caution state color', category: 'semantic' },
    error: { description: 'Error/destructive state color', category: 'semantic' },
    info: { description: 'Info/neutral state color', category: 'semantic' },
  };

  for (const [key, value] of Object.entries(colors)) {
    if (value) {
      const meta = colorMap[key] || { description: `${key} color`, category: 'other' };
      tokens[key] = {
        value,
        type: 'color',
        description: meta.description,
        category: meta.category,
      };
    }
  }

  return tokens;
}

/**
 * Extract typography tokens from design
 */
function extractTypographyTokens(design: Partial<LayoutDesign>): Record<string, TokenDefinition> {
  const typography = design.globalStyles?.typography;
  const tokens: Record<string, TokenDefinition> = {};

  if (!typography) return tokens;

  if (typography.fontFamily) {
    tokens.fontFamily = {
      value: typography.fontFamily,
      type: 'fontFamily',
      description: 'Primary font family',
    };
  }

  if (typography.headingWeight) {
    tokens.headingWeight = {
      value: typography.headingWeight,
      type: 'fontWeight',
      description: 'Heading font weight',
    };
  }

  if (typography.bodyWeight) {
    tokens.bodyWeight = {
      value: typography.bodyWeight,
      type: 'fontWeight',
      description: 'Body text font weight',
    };
  }

  // Font size scale
  const sizeScale: Record<string, string> = {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  };

  const headingSizeKey = getPresetKey(typography.headingSize, 'lg');
  if (headingSizeKey && sizeScale[headingSizeKey]) {
    tokens.headingSize = {
      value: sizeScale[headingSizeKey],
      type: 'fontSize',
      description: 'Heading font size',
    };
  }

  const bodySizeKey = getPresetKey(typography.bodySize, 'base');
  if (bodySizeKey && sizeScale[bodySizeKey]) {
    tokens.bodySize = {
      value: sizeScale[bodySizeKey],
      type: 'fontSize',
      description: 'Body text font size',
    };
  }

  // Line height
  const lineHeightScale: Record<string, string> = {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  };

  const lineHeightKey = getPresetKey(typography.lineHeight, 'normal');
  if (lineHeightKey && lineHeightScale[lineHeightKey]) {
    tokens.lineHeight = {
      value: lineHeightScale[lineHeightKey],
      type: 'lineHeight',
      description: 'Default line height',
    };
  }

  return tokens;
}

/**
 * Extract spacing tokens from design
 */
function extractSpacingTokens(design: Partial<LayoutDesign>): Record<string, TokenDefinition> {
  const spacing = design.globalStyles?.spacing;
  const tokens: Record<string, TokenDefinition> = {};

  // Base spacing scale
  const spacingScale: Record<string, string> = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  };

  tokens.base = { value: '1rem', type: 'spacing', description: 'Base spacing unit (16px)' };
  tokens.xs = { value: spacingScale.xs, type: 'spacing', description: 'Extra small spacing' };
  tokens.sm = { value: spacingScale.sm, type: 'spacing', description: 'Small spacing' };
  tokens.md = { value: spacingScale.md, type: 'spacing', description: 'Medium spacing' };
  tokens.lg = { value: spacingScale.lg, type: 'spacing', description: 'Large spacing' };
  tokens.xl = { value: spacingScale.xl, type: 'spacing', description: 'Extra large spacing' };

  // Section padding based on design
  if (spacing?.sectionPadding) {
    const paddingValues: Record<string, string> = {
      sm: '2rem',
      md: '4rem',
      lg: '6rem',
      xl: '8rem',
    };
    const sectionPaddingKey = getPresetKey(spacing.sectionPadding, 'lg');
    tokens.sectionPadding = {
      value: paddingValues[sectionPaddingKey] || '4rem',
      type: 'spacing',
      description: 'Section vertical padding',
    };
  }

  // Component gap
  if (spacing?.componentGap) {
    const gapValues: Record<string, string> = {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    };
    const componentGapKey = getPresetKey(spacing.componentGap, 'md');
    tokens.componentGap = {
      value: gapValues[componentGapKey] || '1rem',
      type: 'spacing',
      description: 'Gap between components',
    };
  }

  return tokens;
}

/**
 * Extract border radius tokens from design
 */
function extractBorderRadiusTokens(design: Partial<LayoutDesign>): Record<string, TokenDefinition> {
  const radiusScale: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  };

  const tokens: Record<string, TokenDefinition> = {};
  const currentRadius = design.globalStyles?.effects?.borderRadius || 'md';

  for (const [key, value] of Object.entries(radiusScale)) {
    tokens[key] = {
      value,
      type: 'borderRadius',
      description: `${key === 'none' ? 'No' : key.charAt(0).toUpperCase() + key.slice(1)} border radius`,
      category: key === currentRadius ? 'default' : undefined,
    };
  }

  return tokens;
}

/**
 * Extract shadow tokens from design
 */
function extractShadowTokens(design: Partial<LayoutDesign>): Record<string, TokenDefinition> {
  const shadowScale: Record<string, string> = {
    none: 'none',
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    strong: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  const tokens: Record<string, TokenDefinition> = {};
  const currentShadow = design.globalStyles?.effects?.shadows || 'medium';

  for (const [key, value] of Object.entries(shadowScale)) {
    tokens[key] = {
      value,
      type: 'shadow',
      description: `${key.charAt(0).toUpperCase() + key.slice(1)} shadow`,
      category: key === currentShadow ? 'default' : undefined,
    };
  }

  return tokens;
}

/**
 * Extract animation tokens from design
 */
function extractAnimationTokens(design: Partial<LayoutDesign>): Record<string, TokenDefinition> {
  const tokens: Record<string, TokenDefinition> = {};
  const animationStyle = design.globalStyles?.effects?.animations || 'subtle';

  const durationScale: Record<string, Record<string, string>> = {
    none: { fast: '0ms', normal: '0ms', slow: '0ms' },
    subtle: { fast: '100ms', normal: '200ms', slow: '300ms' },
    smooth: { fast: '150ms', normal: '300ms', slow: '500ms' },
    playful: { fast: '200ms', normal: '400ms', slow: '700ms' },
  };

  const durations = durationScale[animationStyle] || durationScale.subtle;

  tokens.durationFast = {
    value: durations.fast,
    type: 'duration',
    description: 'Fast animation duration',
  };
  tokens.durationNormal = {
    value: durations.normal,
    type: 'duration',
    description: 'Normal animation duration',
  };
  tokens.durationSlow = {
    value: durations.slow,
    type: 'duration',
    description: 'Slow animation duration',
  };

  tokens.easingDefault = {
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
    type: 'easing',
    description: 'Default easing function',
  };

  return tokens;
}

// ============================================================================
// EXPORT FORMATTERS
// ============================================================================

/**
 * Generate CSS variables export
 */
function generateCSSVariables(tokens: GeneratedDesignSystem['tokens'], namespace: string): string {
  const prefix = namespace ? `--${namespace}-` : '--';
  const lines: string[] = [':root {'];

  // Colors
  lines.push('  /* Colors */');
  for (const [key, token] of Object.entries(tokens.colors)) {
    lines.push(`  ${prefix}color-${key}: ${token.value};`);
  }

  // Typography
  lines.push('');
  lines.push('  /* Typography */');
  for (const [key, token] of Object.entries(tokens.typography)) {
    lines.push(`  ${prefix}${key}: ${token.value};`);
  }

  // Spacing
  lines.push('');
  lines.push('  /* Spacing */');
  for (const [key, token] of Object.entries(tokens.spacing)) {
    lines.push(`  ${prefix}spacing-${key}: ${token.value};`);
  }

  // Border Radius
  lines.push('');
  lines.push('  /* Border Radius */');
  for (const [key, token] of Object.entries(tokens.borderRadius)) {
    lines.push(`  ${prefix}radius-${key}: ${token.value};`);
  }

  // Shadows
  lines.push('');
  lines.push('  /* Shadows */');
  for (const [key, token] of Object.entries(tokens.shadows)) {
    lines.push(`  ${prefix}shadow-${key}: ${token.value};`);
  }

  // Animations
  lines.push('');
  lines.push('  /* Animations */');
  for (const [key, token] of Object.entries(tokens.animations)) {
    lines.push(`  ${prefix}${key}: ${token.value};`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate SCSS variables export
 */
function generateSCSSVariables(tokens: GeneratedDesignSystem['tokens'], namespace: string): string {
  const prefix = namespace ? `$${namespace}-` : '$';
  const lines: string[] = [];

  // Colors
  lines.push('// Colors');
  for (const [key, token] of Object.entries(tokens.colors)) {
    lines.push(`${prefix}color-${key}: ${token.value};`);
  }

  // Typography
  lines.push('');
  lines.push('// Typography');
  for (const [key, token] of Object.entries(tokens.typography)) {
    lines.push(`${prefix}${key}: ${token.value};`);
  }

  // Spacing
  lines.push('');
  lines.push('// Spacing');
  for (const [key, token] of Object.entries(tokens.spacing)) {
    lines.push(`${prefix}spacing-${key}: ${token.value};`);
  }

  // Border Radius
  lines.push('');
  lines.push('// Border Radius');
  for (const [key, token] of Object.entries(tokens.borderRadius)) {
    lines.push(`${prefix}radius-${key}: ${token.value};`);
  }

  // Shadows
  lines.push('');
  lines.push('// Shadows');
  for (const [key, token] of Object.entries(tokens.shadows)) {
    lines.push(`${prefix}shadow-${key}: ${token.value};`);
  }

  return lines.join('\n');
}

/**
 * Generate Tailwind config export
 */
function generateTailwindConfig(tokens: GeneratedDesignSystem['tokens']): string {
  const config = {
    theme: {
      extend: {
        colors: {} as Record<string, string>,
        fontFamily: {} as Record<string, string[]>,
        fontSize: {} as Record<string, string>,
        spacing: {} as Record<string, string>,
        borderRadius: {} as Record<string, string>,
        boxShadow: {} as Record<string, string>,
      },
    },
  };

  // Colors
  for (const [key, token] of Object.entries(tokens.colors)) {
    config.theme.extend.colors[key] = token.value as string;
  }

  // Typography
  if (tokens.typography.fontFamily) {
    config.theme.extend.fontFamily.sans = [tokens.typography.fontFamily.value as string];
  }
  for (const [key, token] of Object.entries(tokens.typography)) {
    if (token.type === 'fontSize') {
      config.theme.extend.fontSize[key] = token.value as string;
    }
  }

  // Spacing
  for (const [key, token] of Object.entries(tokens.spacing)) {
    config.theme.extend.spacing[key] = token.value as string;
  }

  // Border Radius
  for (const [key, token] of Object.entries(tokens.borderRadius)) {
    config.theme.extend.borderRadius[key] = token.value as string;
  }

  // Shadows
  for (const [key, token] of Object.entries(tokens.shadows)) {
    config.theme.extend.boxShadow[key] = token.value as string;
  }

  return `module.exports = ${JSON.stringify(config, null, 2)}`;
}

/**
 * Generate Style Dictionary export
 */
function generateStyleDictionary(
  tokens: GeneratedDesignSystem['tokens'],
  metadata: DesignSystemMetadata
): string {
  const sdTokens: Record<string, Record<string, unknown>> = {
    color: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadow: {},
    animation: {},
  };

  // Convert tokens to Style Dictionary format
  for (const [key, token] of Object.entries(tokens.colors)) {
    sdTokens.color[key] = { value: token.value, type: 'color' };
  }

  for (const [key, token] of Object.entries(tokens.typography)) {
    sdTokens.typography[key] = { value: token.value, type: token.type };
  }

  for (const [key, token] of Object.entries(tokens.spacing)) {
    sdTokens.spacing[key] = { value: token.value, type: 'spacing' };
  }

  for (const [key, token] of Object.entries(tokens.borderRadius)) {
    sdTokens.borderRadius[key] = { value: token.value, type: 'borderRadius' };
  }

  for (const [key, token] of Object.entries(tokens.shadows)) {
    sdTokens.shadow[key] = { value: token.value, type: 'boxShadow' };
  }

  for (const [key, token] of Object.entries(tokens.animations)) {
    sdTokens.animation[key] = { value: token.value, type: token.type };
  }

  return JSON.stringify(
    {
      $metadata: metadata,
      ...sdTokens,
    },
    null,
    2
  );
}

// ============================================================================
// DOCUMENTATION GENERATION
// ============================================================================

/**
 * Generate documentation for the design system
 */
function generateDocumentation(
  _tokens: GeneratedDesignSystem['tokens']
): GeneratedDesignSystem['documentation'] {
  return {
    colorUsage: `# Color Usage

## Brand Colors
- **Primary**: Use for CTAs, links, and key interactive elements
- **Secondary**: Use for supporting elements and secondary actions
- **Accent**: Use sparingly for highlights and emphasis

## Background Colors
- **Background**: Main page background
- **Surface**: Cards, modals, and elevated surfaces

## Text Colors
- **Text**: Primary text content
- **Text Muted**: Secondary text, captions, placeholders

## Semantic Colors
- **Success**: Positive actions and confirmations
- **Warning**: Caution states and important notices
- **Error**: Error states and destructive actions
- **Info**: Informational states`,

    typographyScale: `# Typography Scale

## Font Sizes
- **xs** (12px): Small labels, badges
- **sm** (14px): Secondary text, captions
- **base** (16px): Body text
- **lg** (18px): Large body text
- **xl** (20px): Small headings
- **2xl** (24px): Section headings

## Font Weights
- **Light** (300): Stylistic large text
- **Normal** (400): Body text
- **Medium** (500): Emphasis
- **Semibold** (600): Subheadings
- **Bold** (700): Headings`,

    spacingSystem: `# Spacing System

Uses a base-8 spacing scale:
- **xs** (4px): Tight spacing, icon gaps
- **sm** (8px): Form inputs, button padding
- **md** (16px): Standard component spacing
- **lg** (24px): Section content
- **xl** (32px): Major sections
- **2xl** (48px): Page sections`,

    componentGuidelines: `# Component Guidelines

## Buttons
- Use primary color for main CTAs
- Use border radius token for consistency
- Apply appropriate shadow for elevation

## Cards
- Use surface color for background
- Apply border radius and shadow tokens
- Use consistent padding from spacing scale

## Forms
- Use text color for input text
- Use border color for outlines
- Use muted text for placeholders`,
  };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate a complete design system from a LayoutDesign
 */
export function generateDesignSystem(
  design: Partial<LayoutDesign>,
  options: DesignSystemOptions = {}
): GeneratedDesignSystem {
  const {
    outputFormats = ['css-variables', 'tailwind-config', 'json'],
    includeDocumentation = true,
    namespace = '',
  } = options;

  // Extract all tokens
  const tokens = {
    colors: extractColorTokens(design),
    typography: extractTypographyTokens(design),
    spacing: extractSpacingTokens(design),
    borderRadius: extractBorderRadiusTokens(design),
    shadows: extractShadowTokens(design),
    animations: extractAnimationTokens(design),
  };

  // Create metadata
  const metadata: DesignSystemMetadata = {
    name: namespace || 'design-system',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
  };

  // Generate exports
  const exports: GeneratedDesignSystem['exports'] = {};

  if (outputFormats.includes('css-variables')) {
    exports.cssVariables = generateCSSVariables(tokens, namespace);
  }

  if (outputFormats.includes('scss-variables')) {
    exports.scssVariables = generateSCSSVariables(tokens, namespace);
  }

  if (outputFormats.includes('tailwind-config')) {
    exports.tailwindConfig = generateTailwindConfig(tokens);
  }

  if (outputFormats.includes('style-dictionary')) {
    exports.styleDictionary = generateStyleDictionary(tokens, metadata);
  }

  if (outputFormats.includes('json')) {
    exports.json = JSON.stringify({ metadata, tokens }, null, 2);
  }

  // Generate documentation
  const documentation = includeDocumentation ? generateDocumentation(tokens) : undefined;

  return {
    metadata,
    tokens,
    components: {},
    exports,
    documentation,
  };
}

/**
 * Get available export formats
 */
export function getAvailableFormats(): ExportFormat[] {
  return ['style-dictionary', 'tailwind-config', 'css-variables', 'scss-variables', 'json'];
}
