/**
 * Layout Validation Utility
 *
 * Validates LayoutDesign objects to ensure they're ready for the Dynamic Phase Builder.
 * Checks required fields, component completeness, accessibility, and design system consistency.
 */

import { LayoutDesign } from '@/types/layoutDesign';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  score: number; // 0-100, quality score
}

/**
 * Validates a LayoutDesign object for Phase Builder compatibility
 */
export function validateLayoutForPhaseBuilder(layout: Partial<LayoutDesign>): ValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  // 1. Validate Required Fields
  validateRequiredFields(layout, issues);

  // 2. Validate Color System
  validateColorSystem(layout, issues, warnings);

  // 3. Validate Structure
  validateStructure(layout, issues, warnings);

  // 4. Validate Components
  validateComponents(layout, issues, warnings, info);

  // 5. Validate Accessibility
  validateAccessibility(layout, warnings, info);

  // 6. Validate Typography
  validateTypography(layout, warnings, info);

  // 7. Validate Layout Type
  validateLayoutType(layout, issues);

  // Calculate quality score
  const score = calculateQualityScore(issues, warnings, info);

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    info,
    score,
  };
}

/**
 * Validate required fields exist
 */
function validateRequiredFields(layout: Partial<LayoutDesign>, issues: ValidationIssue[]): void {
  if (!layout.id) {
    issues.push({
      severity: 'error',
      field: 'id',
      message: 'Layout ID is required',
      suggestion: 'Generate a unique ID for this layout',
    });
  }

  if (!layout.name || layout.name.trim() === '') {
    issues.push({
      severity: 'error',
      field: 'name',
      message: 'Layout name is required',
      suggestion: 'Provide a descriptive name for this layout',
    });
  }

  if (!layout.basePreferences?.layout) {
    issues.push({
      severity: 'error',
      field: 'basePreferences.layout',
      message: 'Layout type is required',
      suggestion: 'Specify a layout type (e.g., "landing-page", "dashboard", "blog")',
    });
  }

  if (!layout.globalStyles?.colors) {
    issues.push({
      severity: 'error',
      field: 'colors',
      message: 'Color system is required',
      suggestion: 'Define primary, secondary, accent, background, and text colors',
    });
  }

  if (!layout.structure) {
    issues.push({
      severity: 'error',
      field: 'structure',
      message: 'Layout structure is required',
      suggestion: 'Define the layout structure with sections and components',
    });
  }
}

/**
 * Validate color system completeness and accessibility
 */
function validateColorSystem(
  layout: Partial<LayoutDesign>,
  issues: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  if (!layout.globalStyles?.colors) return;

  const colors = layout.globalStyles.colors;
  const requiredColors: Array<keyof typeof colors> = [
    'primary',
    'secondary',
    'accent',
    'background',
    'text',
  ];
  const missingColors = requiredColors.filter((color) => !colors[color]);

  if (missingColors.length > 0) {
    issues.push({
      severity: 'error',
      field: 'colors',
      message: `Missing required colors: ${missingColors.join(', ')}`,
      suggestion: 'Define all required colors for a complete design system',
    });
  }

  // Validate color format (hex, rgb, hsl)
  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'string' && value && !isValidColor(value)) {
      warnings.push({
        severity: 'warning',
        field: `colors.${key}`,
        message: `Invalid color format: ${value}`,
        suggestion: 'Use valid hex (#RRGGBB), rgb(r,g,b), or hsl(h,s%,l%) format',
      });
    }
  });

  // Check contrast ratio between background and text
  if (colors.background && colors.text) {
    const contrastRatio = calculateContrastRatio(colors.background, colors.text);

    if (contrastRatio < 4.5) {
      warnings.push({
        severity: 'warning',
        field: 'colors',
        message: `Low contrast ratio (${contrastRatio.toFixed(2)}:1) between background and text`,
        suggestion: 'Aim for at least 4.5:1 for normal text, 3:1 for large text (WCAG AA)',
      });
    }
  }
}

/**
 * Validate layout structure
 */
function validateStructure(
  layout: Partial<LayoutDesign>,
  issues: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  if (!layout.structure) return;

  // Check for detected components
  if (!layout.structure.detectedComponents || layout.structure.detectedComponents.length === 0) {
    warnings.push({
      severity: 'warning',
      field: 'structure.detectedComponents',
      message: 'No components detected in layout',
      suggestion: 'Analyze reference images to detect components, or manually add components',
    });
  }
}

/**
 * Validate components completeness
 */
function validateComponents(
  layout: Partial<LayoutDesign>,
  issues: ValidationIssue[],
  warnings: ValidationIssue[],
  info: ValidationIssue[]
): void {
  if (!layout.structure?.detectedComponents) return;

  const components = layout.structure.detectedComponents;

  // Check component count
  if (components.length < 5) {
    info.push({
      severity: 'info',
      field: 'structure.detectedComponents',
      message: `Only ${components.length} components detected`,
      suggestion: 'Consider analyzing reference images more thoroughly to detect 20-30+ components',
    });
  } else if (components.length >= 20) {
    info.push({
      severity: 'info',
      field: 'structure.detectedComponents',
      message: `Excellent! ${components.length} components detected`,
      suggestion: 'Great component coverage for a professional layout',
    });
  }

  // Validate each component
  components.forEach((component: any, index: number) => {
    if (!component.type) {
      issues.push({
        severity: 'error',
        field: `structure.detectedComponents[${index}].type`,
        message: `Component ${index} is missing a type`,
        suggestion: 'Specify component type (e.g., "NavigationDesign", "HeroDesign")',
      });
    }

    if (!component.id) {
      warnings.push({
        severity: 'warning',
        field: `structure.detectedComponents[${index}].id`,
        message: `Component ${index} is missing an ID`,
        suggestion: 'Provide a unique ID for each component',
      });
    }

    // Check for component props/content
    if (!component.props && !component.content) {
      warnings.push({
        severity: 'warning',
        field: `structure.detectedComponents[${index}]`,
        message: `Component ${index} (${component.type}) has no props or content`,
        suggestion: 'Add props or content to make the component functional',
      });
    }
  });

  // Check for essential components
  const componentTypes = components.map((c: any) => c.type?.toLowerCase() || '');
  const essentialComponents = {
    navigation: componentTypes.some((t: string) => t.includes('nav')),
    hero: componentTypes.some((t: string) => t.includes('hero')),
    footer: componentTypes.some((t: string) => t.includes('footer')),
  };

  if (!essentialComponents.navigation) {
    info.push({
      severity: 'info',
      field: 'structure.detectedComponents',
      message: 'No navigation component detected',
      suggestion: 'Consider adding a navigation component for better user experience',
    });
  }

  if (!essentialComponents.hero) {
    info.push({
      severity: 'info',
      field: 'structure.detectedComponents',
      message: 'No hero section detected',
      suggestion: 'Consider adding a hero section to make a strong first impression',
    });
  }

  if (!essentialComponents.footer) {
    info.push({
      severity: 'info',
      field: 'structure.detectedComponents',
      message: 'No footer component detected',
      suggestion: 'Consider adding a footer with links and contact information',
    });
  }
}

/**
 * Validate accessibility requirements
 */
function validateAccessibility(
  layout: Partial<LayoutDesign>,
  warnings: ValidationIssue[],
  info: ValidationIssue[]
): void {
  // Check for basic accessibility considerations
  if (layout.globalStyles?.colors) {
    const colors = layout.globalStyles.colors;
    if (colors.background && colors.text) {
      const contrastRatio = calculateContrastRatio(colors.background, colors.text);
      if (contrastRatio < 4.5) {
        info.push({
          severity: 'info',
          field: 'accessibility',
          message: 'Consider improving color contrast for better accessibility',
          suggestion: 'Aim for at least 4.5:1 contrast ratio (WCAG AA)',
        });
      }
    }
  }
}

/**
 * Validate typography system
 */
function validateTypography(
  layout: Partial<LayoutDesign>,
  warnings: ValidationIssue[],
  info: ValidationIssue[]
): void {
  if (!layout.globalStyles?.typography) {
    info.push({
      severity: 'info',
      field: 'globalStyles.typography',
      message: 'No typography system defined',
      suggestion: 'Define font families, sizes, and weights for consistent typography',
    });
    return;
  }

  const typography = layout.globalStyles.typography;

  // Check for font families
  if (!typography.headingFont && !typography.fontFamily) {
    warnings.push({
      severity: 'warning',
      field: 'globalStyles.typography',
      message: 'No font families defined',
      suggestion: 'Define at least heading and body font families',
    });
  }
}

/**
 * Validate layout type
 */
function validateLayoutType(layout: Partial<LayoutDesign>, issues: ValidationIssue[]): void {
  const validLayoutTypes = ['single-page', 'multi-page', 'dashboard', 'custom'];

  const layoutType = layout.basePreferences?.layout;
  if (layoutType && !validLayoutTypes.includes(layoutType)) {
    issues.push({
      severity: 'error',
      field: 'basePreferences.layout',
      message: `Invalid layout type: ${layoutType}`,
      suggestion: `Use one of: ${validLayoutTypes.join(', ')}`,
    });
  }
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(
  issues: ValidationIssue[],
  warnings: ValidationIssue[],
  info: ValidationIssue[]
): number {
  let score = 100;

  // Deduct points for issues
  score -= issues.length * 20; // -20 per error
  score -= warnings.length * 5; // -5 per warning
  score -= info.length * 1; // -1 per info

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Check if a color string is valid
 */
function isValidColor(color: string): boolean {
  // Hex format: #RGB or #RRGGBB
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) return true;

  // RGB format: rgb(r, g, b)
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color)) return true;

  // RGBA format: rgba(r, g, b, a)
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(color)) return true;

  // HSL format: hsl(h, s%, l%)
  if (/^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/.test(color)) return true;

  // HSLA format: hsla(h, s%, l%, a)
  if (/^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/.test(color)) return true;

  return false;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * Returns a ratio between 1:1 (no contrast) and 21:1 (maximum contrast)
 */
function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color (WCAG formula)
 */
function getRelativeLuminance(color: string): number {
  // Convert color to RGB
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  // Convert RGB to relative luminance
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const normalized = val / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Expand shorthand (e.g., #RGB -> #RRGGBB)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Format validation result as human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`\n=== Layout Validation Report ===`);
  lines.push(`Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push(`Quality Score: ${result.score}/100`);
  lines.push('');

  if (result.issues.length > 0) {
    lines.push(`🚨 Errors (${result.issues.length}):`);
    result.issues.forEach((issue) => {
      lines.push(`  • ${issue.field}: ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`    → ${issue.suggestion}`);
      }
    });
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning) => {
      lines.push(`  • ${warning.field}: ${warning.message}`);
      if (warning.suggestion) {
        lines.push(`    → ${warning.suggestion}`);
      }
    });
    lines.push('');
  }

  if (result.info.length > 0) {
    lines.push(`ℹ️  Info (${result.info.length}):`);
    result.info.forEach((info) => {
      lines.push(`  • ${info.field}: ${info.message}`);
      if (info.suggestion) {
        lines.push(`    → ${info.suggestion}`);
      }
    });
    lines.push('');
  }

  if (result.isValid && result.issues.length === 0 && result.warnings.length === 0) {
    lines.push('✨ Layout is ready for Phase Builder!');
  }

  return lines.join('\n');
}

/**
 * Quick validation check (returns boolean only)
 */
export function isLayoutValid(layout: Partial<LayoutDesign>): boolean {
  const result = validateLayoutForPhaseBuilder(layout);
  return result.isValid;
}

/**
 * Get validation summary (counts only)
 */
export function getValidationSummary(layout: Partial<LayoutDesign>): {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  score: number;
} {
  const result = validateLayoutForPhaseBuilder(layout);
  return {
    isValid: result.isValid,
    errorCount: result.issues.length,
    warningCount: result.warnings.length,
    infoCount: result.info.length,
    score: result.score,
  };
}
