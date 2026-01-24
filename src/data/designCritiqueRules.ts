/**
 * Design Critique Rules Database
 *
 * Contains rules for evaluating design quality across different principles.
 * Each rule has a check function, severity level, and suggested fix.
 *
 * MIGRATED to Gemini 3: Uses LayoutManifest instead of LayoutDesign
 */

import type { LayoutManifest } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

export type CritiqueSeverity = 'critical' | 'major' | 'minor';
export type CritiquePrinciple =
  | 'visualHierarchy'
  | 'consistency'
  | 'contrast'
  | 'whitespace'
  | 'colorHarmony'
  | 'alignment'
  | 'typography'
  | 'accessibility';

export interface CritiqueRule {
  id: string;
  principle: CritiquePrinciple;
  severity: CritiqueSeverity;
  name: string;
  description: string;
  check: (manifest: LayoutManifest) => CritiqueViolation | null;
}

export interface CritiqueViolation {
  ruleId: string;
  principle: CritiquePrinciple;
  severity: CritiqueSeverity;
  issue: string;
  currentValue?: string;
  suggestedValue?: string;
  propertyPath?: string;
  rationale: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get luminance of a hex color
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return 0.5;

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const adjust = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a hex color is valid
 */
function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Normalize hex to 6-digit format
 */
function normalizeHex(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return '#' + clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  return '#' + clean;
}

// ============================================================================
// CONTRAST RULES
// ============================================================================

const contrastRules: CritiqueRule[] = [
  {
    id: 'contrast-text-background',
    principle: 'contrast',
    severity: 'critical',
    name: 'Text Contrast on Background',
    description: 'Text must have sufficient contrast with background (4.5:1 minimum)',
    check: (manifest) => {
      const colors = manifest.designSystem?.colors;
      if (!colors?.text || !colors?.background) return null;
      if (!isValidHex(colors.text) || !isValidHex(colors.background)) return null;

      const ratio = getContrastRatio(normalizeHex(colors.text), normalizeHex(colors.background));
      if (ratio < 4.5) {
        return {
          ruleId: 'contrast-text-background',
          principle: 'contrast',
          severity: 'critical',
          issue: `Text contrast is too low (${ratio.toFixed(1)}:1)`,
          currentValue: `${ratio.toFixed(1)}:1`,
          suggestedValue: '4.5:1 or higher',
          propertyPath: 'designSystem.colors.text',
          rationale: 'WCAG AA requires 4.5:1 contrast for normal text to ensure readability',
        };
      }
      return null;
    },
  },
  {
    id: 'contrast-muted-background',
    principle: 'contrast',
    severity: 'major',
    name: 'Muted Text Contrast',
    description: 'Muted text should still meet minimum contrast requirements',
    check: (manifest) => {
      const colors = manifest.designSystem?.colors;
      if (!colors?.textMuted || !colors?.background) return null;
      if (!isValidHex(colors.textMuted) || !isValidHex(colors.background)) return null;

      const ratio = getContrastRatio(
        normalizeHex(colors.textMuted),
        normalizeHex(colors.background)
      );
      if (ratio < 3) {
        return {
          ruleId: 'contrast-muted-background',
          principle: 'contrast',
          severity: 'major',
          issue: `Muted text contrast is very low (${ratio.toFixed(1)}:1)`,
          currentValue: `${ratio.toFixed(1)}:1`,
          suggestedValue: '3:1 or higher',
          propertyPath: 'designSystem.colors.textMuted',
          rationale: 'Even secondary text needs adequate contrast for accessibility',
        };
      }
      return null;
    },
  },
  {
    id: 'contrast-primary-background',
    principle: 'contrast',
    severity: 'major',
    name: 'Primary Color Contrast',
    description: 'Primary color should have good contrast with background for CTAs',
    check: (manifest) => {
      const colors = manifest.designSystem?.colors;
      if (!colors?.primary || !colors?.background) return null;
      if (!isValidHex(colors.primary) || !isValidHex(colors.background)) return null;

      const ratio = getContrastRatio(normalizeHex(colors.primary), normalizeHex(colors.background));
      if (ratio < 3) {
        return {
          ruleId: 'contrast-primary-background',
          principle: 'contrast',
          severity: 'major',
          issue: `Primary color has low contrast with background (${ratio.toFixed(1)}:1)`,
          currentValue: `${ratio.toFixed(1)}:1`,
          suggestedValue: '3:1 or higher',
          propertyPath: 'designSystem.colors.primary',
          rationale: 'Primary color buttons and links need to stand out',
        };
      }
      return null;
    },
  },
];

// ============================================================================
// TYPOGRAPHY RULES
// ============================================================================

const typographyRules: CritiqueRule[] = [
  {
    id: 'typography-fonts-defined',
    principle: 'typography',
    severity: 'major',
    name: 'Font Families Defined',
    description: 'Design should have defined heading and body fonts',
    check: (manifest) => {
      const fonts = manifest.designSystem?.fonts;

      if (!fonts?.heading || !fonts?.body) {
        return {
          ruleId: 'typography-fonts-defined',
          principle: 'typography',
          severity: 'major',
          issue: 'Missing font definitions',
          currentValue: `Heading: ${fonts?.heading || 'undefined'}, Body: ${fonts?.body || 'undefined'}`,
          suggestedValue: 'Define both heading and body fonts',
          propertyPath: 'designSystem.fonts',
          rationale: 'Consistent typography requires defined font families',
        };
      }
      return null;
    },
  },
  {
    id: 'typography-heading-body-different',
    principle: 'typography',
    severity: 'minor',
    name: 'Typography Contrast',
    description: 'Heading and body fonts can differ for visual interest',
    check: (manifest) => {
      const fonts = manifest.designSystem?.fonts;

      // This is informational - same fonts are fine, just noting the option
      if (fonts?.heading === fonts?.body) {
        return {
          ruleId: 'typography-heading-body-different',
          principle: 'typography',
          severity: 'minor',
          issue: 'Heading and body fonts are identical',
          currentValue: fonts?.heading,
          suggestedValue: 'Consider using a different heading font for contrast',
          propertyPath: 'designSystem.fonts.heading',
          rationale: 'Different fonts can create better visual hierarchy (optional)',
        };
      }
      return null;
    },
  },
];

// ============================================================================
// COLOR HARMONY RULES
// ============================================================================

const colorHarmonyRules: CritiqueRule[] = [
  {
    id: 'color-primary-secondary-similar',
    principle: 'colorHarmony',
    severity: 'minor',
    name: 'Primary-Secondary Distinction',
    description: 'Primary and secondary colors should be distinct',
    check: (manifest) => {
      const colors = manifest.designSystem?.colors;
      if (!colors?.primary || !colors?.secondary) return null;
      if (!isValidHex(colors.primary) || !isValidHex(colors.secondary)) return null;

      const primary = normalizeHex(colors.primary);
      const secondary = normalizeHex(colors.secondary);

      // Check if colors are too similar (within ~30 units on RGB)
      const pR = parseInt(primary.slice(1, 3), 16);
      const pG = parseInt(primary.slice(3, 5), 16);
      const pB = parseInt(primary.slice(5, 7), 16);
      const sR = parseInt(secondary.slice(1, 3), 16);
      const sG = parseInt(secondary.slice(3, 5), 16);
      const sB = parseInt(secondary.slice(5, 7), 16);

      const diff = Math.abs(pR - sR) + Math.abs(pG - sG) + Math.abs(pB - sB);

      if (diff < 50) {
        return {
          ruleId: 'color-primary-secondary-similar',
          principle: 'colorHarmony',
          severity: 'minor',
          issue: 'Primary and secondary colors are too similar',
          currentValue: `Primary: ${primary}, Secondary: ${secondary}`,
          suggestedValue: 'Use more contrasting secondary color',
          propertyPath: 'designSystem.colors.secondary',
          rationale: 'Distinct colors create better visual variety',
        };
      }
      return null;
    },
  },
  {
    id: 'color-semantic-missing',
    principle: 'colorHarmony',
    severity: 'minor',
    name: 'Semantic Colors',
    description: 'Semantic colors (success, warning, error) should be defined',
    check: (manifest) => {
      const colors = manifest.designSystem?.colors;

      if (colors && (!colors.success || !colors.warning || !colors.error)) {
        const missing = [];
        if (!colors.success) missing.push('success');
        if (!colors.warning) missing.push('warning');
        if (!colors.error) missing.push('error');

        return {
          ruleId: 'color-semantic-missing',
          principle: 'colorHarmony',
          severity: 'minor',
          issue: `Missing semantic colors: ${missing.join(', ')}`,
          currentValue: 'undefined',
          suggestedValue: 'Define success (#22c55e), warning (#f59e0b), error (#ef4444)',
          propertyPath: 'designSystem.colors',
          rationale: 'Semantic colors communicate status and feedback',
        };
      }
      return null;
    },
  },
];

// ============================================================================
// CONSISTENCY RULES
// ============================================================================

const consistencyRules: CritiqueRule[] = [
  {
    id: 'consistency-color-scheme',
    principle: 'consistency',
    severity: 'minor',
    name: 'Color Scheme Consistency',
    description: 'Dark backgrounds should use light text and vice versa',
    check: (manifest) => {
      const colors = manifest.designSystem?.colors;
      if (!colors?.background || !colors?.text) return null;
      if (!isValidHex(colors.background) || !isValidHex(colors.text)) return null;

      const bgLum = getLuminance(normalizeHex(colors.background));
      const textLum = getLuminance(normalizeHex(colors.text));

      // Dark background (low luminance) should have light text (high luminance)
      // Light background (high luminance) should have dark text (low luminance)
      const isDarkBg = bgLum < 0.3;
      const isLightText = textLum > 0.5;

      if (isDarkBg === isLightText) {
        // Both are aligned (dark bg + light text, or light bg + dark text) - good
        return null;
      }

      return {
        ruleId: 'consistency-color-scheme',
        principle: 'consistency',
        severity: 'minor',
        issue: 'Background and text colors may not be well matched',
        currentValue: `Background luminance: ${bgLum.toFixed(2)}, Text luminance: ${textLum.toFixed(2)}`,
        suggestedValue: isDarkBg ? 'Use lighter text color' : 'Use darker text color',
        propertyPath: 'designSystem.colors.text',
        rationale: 'Text should contrast with background for readability',
      };
    },
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

export const CRITIQUE_RULES: CritiqueRule[] = [
  ...contrastRules,
  ...typographyRules,
  ...colorHarmonyRules,
  ...consistencyRules,
];

/**
 * Get rules by principle
 */
export function getRulesByPrinciple(principle: CritiquePrinciple): CritiqueRule[] {
  return CRITIQUE_RULES.filter((rule) => rule.principle === principle);
}

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity: CritiqueSeverity): CritiqueRule[] {
  return CRITIQUE_RULES.filter((rule) => rule.severity === severity);
}

/**
 * Get all principle categories
 */
export function getAllPrinciples(): CritiquePrinciple[] {
  return [
    'visualHierarchy',
    'consistency',
    'contrast',
    'whitespace',
    'colorHarmony',
    'alignment',
    'typography',
    'accessibility',
  ];
}

/**
 * Run all critique rules against a manifest
 */
export function critiqueManifest(manifest: LayoutManifest): CritiqueViolation[] {
  const violations: CritiqueViolation[] = [];

  for (const rule of CRITIQUE_RULES) {
    const violation = rule.check(manifest);
    if (violation) {
      violations.push(violation);
    }
  }

  return violations;
}
