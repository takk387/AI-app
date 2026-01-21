/**
 * Design System Generator
 *
 * Generates design system files (globals.css, tailwind.config.ts, design-tokens.ts)
 * from a LayoutDesign to be injected into generated apps.
 */

import type { LayoutDesign } from '@/types/layoutDesign';
import {
  borderRadiusMap,
  shadowMap,
  animationMap,
  containerWidthMap,
  sectionPaddingMap,
  componentGapMap,
  fontWeightMap,
  lineHeightMap,
  letterSpacingMap,
  spacingDensityMap,
} from './designTokenMappings';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedDesignFiles {
  globalsCss: string;
  tailwindConfig: string;
  designTokensTs: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate all design system files from a LayoutDesign
 */
export function generateDesignSystemFiles(layoutDesign: LayoutDesign): GeneratedDesignFiles {
  return {
    globalsCss: generateGlobalsCss(layoutDesign),
    tailwindConfig: generateTailwindConfig(layoutDesign),
    designTokensTs: generateDesignTokensTs(layoutDesign),
  };
}

/**
 * Generate design files as an array for injection into generated output
 */
export function generateDesignFilesArray(layoutDesign: LayoutDesign): GeneratedFile[] {
  const files = generateDesignSystemFiles(layoutDesign);

  return [
    { path: 'app/globals.css', content: files.globalsCss },
    { path: 'tailwind.config.ts', content: files.tailwindConfig },
    { path: 'lib/design-tokens.ts', content: files.designTokensTs },
  ];
}

// ============================================================================
// GLOBALS.CSS GENERATOR
// ============================================================================

function generateGlobalsCss(layoutDesign: LayoutDesign): string {
  const { globalStyles } = layoutDesign;
  const { colors, typography, spacing, effects } = globalStyles;

  // Get mapped values
  const radius = borderRadiusMap[effects.borderRadius] || borderRadiusMap.lg;
  const shadow = shadowMap[effects.shadows] || shadowMap.medium;
  const animation = animationMap[effects.animations] || animationMap.smooth;
  const container = containerWidthMap[spacing.containerWidth] || containerWidthMap.standard;
  const sectionPad = sectionPaddingMap[spacing.sectionPadding] || sectionPaddingMap.lg;
  const gap = componentGapMap[spacing.componentGap] || componentGapMap.md;
  const density = spacingDensityMap[spacing.density] || spacingDensityMap.normal;
  const headingWeight = fontWeightMap[typography.headingWeight] || fontWeightMap.semibold;
  const bodyWeight = fontWeightMap[typography.bodyWeight] || fontWeightMap.normal;
  const lineHeight = lineHeightMap[typography.lineHeight] || lineHeightMap.normal;
  const letterSp = letterSpacingMap[typography.letterSpacing] || letterSpacingMap.normal;

  // Build Google Fonts import if custom font specified
  const fontImport = typography.headingFont
    ? `@import url('https://fonts.googleapis.com/css2?family=${typography.headingFont.replace(/ /g, '+')}:wght@400;500;600;700&display=swap');`
    : '';

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

${fontImport}

/* ============================================================================
   DESIGN SYSTEM TOKENS
   Generated from Layout Builder - ${layoutDesign.name}
   ============================================================================ */

:root {
  /* Color Tokens */
  --color-primary: ${colors.primary};
  --color-primary-hover: ${adjustColorBrightness(colors.primary, -10)};
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
  --color-info: ${colors.info || '#6B7280'};

  /* Typography Tokens */
  --font-family: ${typography.fontFamily};
  --font-heading: ${typography.headingFont || typography.fontFamily};
  --font-weight-heading: ${headingWeight.css};
  --font-weight-body: ${bodyWeight.css};
  --line-height: ${lineHeight.css};
  --letter-spacing: ${letterSp.css};

  /* Spacing Tokens */
  --spacing-base: ${density.padding};
  --spacing-gap: ${density.gap};
  --container-width: ${container.css};
  --section-padding: ${sectionPad.css};
  --component-gap: ${gap.css};

  /* Effect Tokens */
  --border-radius: ${radius.css};
  --border-radius-sm: ${borderRadiusMap.sm?.css || '0.125rem'};
  --border-radius-lg: ${borderRadiusMap.lg?.css || '0.5rem'};
  --border-radius-full: ${borderRadiusMap.full?.css || '9999px'};
  --shadow: ${shadow.css};
  --shadow-sm: ${shadowMap.subtle?.css || '0 1px 2px 0 rgb(0 0 0 / 0.05)'};
  --shadow-lg: ${shadowMap.strong?.css || '0 10px 15px -3px rgb(0 0 0 / 0.1)'};
  --transition-duration: ${animation.duration};
  --transition-easing: ${animation.easing};
}

/* ============================================================================
   BASE STYLES
   ============================================================================ */

body {
  font-family: var(--font-family);
  font-weight: var(--font-weight-body);
  line-height: var(--line-height);
  letter-spacing: var(--letter-spacing);
  background-color: var(--color-background);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: var(--font-weight-heading);
  color: var(--color-text);
}

/* Links */
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-duration) var(--transition-easing);
}

a:hover {
  color: var(--color-primary-hover);
}

/* ============================================================================
   COMPONENT CLASSES
   ============================================================================ */

/* Container */
.container {
  max-width: var(--container-width);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--spacing-base);
  padding-right: var(--spacing-base);
}

/* Section */
.section {
  padding-top: var(--section-padding);
  padding-bottom: var(--section-padding);
}

/* Card */
.card {
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-bordered {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-weight: 500;
  border-radius: var(--border-radius);
  transition: all var(--transition-duration) var(--transition-easing);
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-secondary {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-border);
}

.btn-ghost {
  background-color: transparent;
  color: var(--color-text);
}

.btn-ghost:hover {
  background-color: var(--color-surface);
}

/* Input */
.input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text);
  transition: border-color var(--transition-duration) var(--transition-easing);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px ${hexToRgba(colors.primary, 0.1)};
}

.input::placeholder {
  color: var(--color-text-muted);
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--border-radius-full);
  background-color: var(--color-primary);
  color: white;
}

.badge-secondary {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

/* Divider */
.divider {
  height: 1px;
  background-color: var(--color-border);
  margin: var(--component-gap) 0;
}

/* ============================================================================
   UTILITY CLASSES
   ============================================================================ */

.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-muted { color: var(--color-text-muted); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

.bg-primary { background-color: var(--color-primary); }
.bg-surface { background-color: var(--color-surface); }
.bg-background { background-color: var(--color-background); }

.border-default { border-color: var(--color-border); }
.border-primary { border-color: var(--color-primary); }

.rounded-default { border-radius: var(--border-radius); }
.shadow-default { box-shadow: var(--shadow); }

.transition-default {
  transition: all var(--transition-duration) var(--transition-easing);
}
`;
}

// ============================================================================
// TAILWIND CONFIG GENERATOR
// ============================================================================

function generateTailwindConfig(_layoutDesign: LayoutDesign): string {
  // Note: This config uses CSS variables, so it doesn't need direct access to layoutDesign values
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        // Semantic Colors
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
        // Text Colors
        foreground: "var(--color-text)",
        muted: "var(--color-text-muted)",
      },
      fontFamily: {
        sans: ["var(--font-family)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-family)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--border-radius)",
        sm: "var(--border-radius-sm)",
        lg: "var(--border-radius-lg)",
        full: "var(--border-radius-full)",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
        sm: "var(--shadow-sm)",
        lg: "var(--shadow-lg)",
      },
      transitionDuration: {
        DEFAULT: "var(--transition-duration)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--transition-easing)",
      },
      spacing: {
        section: "var(--section-padding)",
        container: "var(--container-width)",
      },
      maxWidth: {
        container: "var(--container-width)",
      },
    },
  },
  plugins: [],
};

export default config;
`;
}

// ============================================================================
// DESIGN TOKENS TS GENERATOR
// ============================================================================

function generateDesignTokensTs(layoutDesign: LayoutDesign): string {
  const { globalStyles, name, basePreferences } = layoutDesign;
  const { colors, typography, spacing, effects } = globalStyles;

  return `/**
 * Design Tokens
 * Generated from Layout Builder - ${name}
 *
 * Use these constants when you need design values in JavaScript/TypeScript.
 * For CSS, prefer using CSS variables (var(--color-primary), etc.)
 */

export const designTokens = {
  name: "${name}",
  style: "${basePreferences.style}",
  colorScheme: "${basePreferences.colorScheme}",

  colors: {
    primary: "${colors.primary}",
    primaryHover: "${adjustColorBrightness(colors.primary, -10)}",
    secondary: "${colors.secondary || colors.primary}",
    accent: "${colors.accent || colors.primary}",
    background: "${colors.background}",
    surface: "${colors.surface}",
    text: "${colors.text}",
    textMuted: "${colors.textMuted}",
    border: "${colors.border}",
    success: "${colors.success || '#6B7280'}",
    warning: "${colors.warning || '#6B7280'}",
    error: "${colors.error || '#6B7280'}",
    info: "${colors.info || '#6B7280'}",
  },

  typography: {
    fontFamily: "${typography.fontFamily}",
    headingFont: "${typography.headingFont || typography.fontFamily}",
    headingWeight: ${fontWeightMap[typography.headingWeight]?.css || '600'},
    bodyWeight: ${fontWeightMap[typography.bodyWeight]?.css || '400'},
    lineHeight: ${lineHeightMap[typography.lineHeight]?.css || '1.5'},
    letterSpacing: "${letterSpacingMap[typography.letterSpacing]?.css || '0'}",
  },

  spacing: {
    density: "${spacing.density}",
    containerWidth: "${containerWidthMap[spacing.containerWidth]?.css || '64rem'}",
    sectionPadding: "${sectionPaddingMap[spacing.sectionPadding]?.css || '4rem'}",
    componentGap: "${componentGapMap[spacing.componentGap]?.css || '1rem'}",
  },

  effects: {
    borderRadius: "${borderRadiusMap[effects.borderRadius]?.css || '0.5rem'}",
    shadow: "${shadowMap[effects.shadows]?.css || '0 4px 6px -1px rgb(0 0 0 / 0.1)'}",
    transitionDuration: "${animationMap[effects.animations]?.duration || '300ms'}",
    transitionEasing: "${animationMap[effects.animations]?.easing || 'ease-in-out'}",
    gradients: ${effects.gradients},
  },
} as const;

export type DesignTokens = typeof designTokens;

// Helper to get CSS variable
export function cssVar(name: keyof typeof cssVarNames): string {
  return \`var(\${cssVarNames[name]})\`;
}

export const cssVarNames = {
  colorPrimary: "--color-primary",
  colorPrimaryHover: "--color-primary-hover",
  colorSecondary: "--color-secondary",
  colorAccent: "--color-accent",
  colorBackground: "--color-background",
  colorSurface: "--color-surface",
  colorText: "--color-text",
  colorTextMuted: "--color-text-muted",
  colorBorder: "--color-border",
  colorSuccess: "--color-success",
  colorWarning: "--color-warning",
  colorError: "--color-error",
  fontFamily: "--font-family",
  fontHeading: "--font-heading",
  borderRadius: "--border-radius",
  shadow: "--shadow",
  transitionDuration: "--transition-duration",
  transitionEasing: "--transition-easing",
} as const;

export default designTokens;
`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Adjust color brightness by percentage
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  r = Math.min(255, Math.max(0, r + (r * percent) / 100));
  g = Math.min(255, Math.max(0, g + (g * percent) / 100));
  b = Math.min(255, Math.max(0, b + (b * percent) / 100));

  // Convert back to hex
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================================
// EXPORTS
// ============================================================================

const designSystemGenerator = {
  generateDesignSystemFiles,
  generateDesignFilesArray,
};

export default designSystemGenerator;
