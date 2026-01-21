/**
 * Accessibility Checker Utility
 *
 * Validates design accessibility against WCAG guidelines:
 * - Color contrast ratios
 * - Text readability
 * - Interactive element accessibility
 * - Focus state visibility
 */

import type { LayoutDesign, ColorSettings } from '@/types/layoutDesign';
import { getContrastRatio, suggestAccessibleColor, isLightColor } from './colorHarmony';

// ============================================================================
// TYPES
// ============================================================================

export interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning';
  element: string;
  property: string;
  message: string;
  wcagCriterion: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  currentValue?: string;
  suggestedValue?: string;
  details?: string;
}

export interface AccessibilityReport {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: AccessibilityIssue[];
  passedChecks: PassedCheck[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    total: number;
  };
}

export interface PassedCheck {
  id: string;
  element: string;
  message: string;
  wcagCriterion: string;
}

// ============================================================================
// WCAG THRESHOLDS
// ============================================================================

const WCAG_CONTRAST = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
};

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

/**
 * Check text contrast against background
 */
function checkTextContrast(
  colors: Partial<ColorSettings>,
  issues: AccessibilityIssue[],
  passed: PassedCheck[]
): void {
  const background = colors.background || '#FFFFFF';
  const text = colors.text || '#000000';
  const textMuted = colors.textMuted || '#666666';

  // Check body text
  const textRatio = getContrastRatio(text, background);
  if (textRatio < WCAG_CONTRAST.AA_NORMAL) {
    issues.push({
      id: 'text-contrast',
      type: 'error',
      element: 'Body Text',
      property: 'text / background',
      message: `Text contrast ratio is ${textRatio.toFixed(2)}:1 (needs ${WCAG_CONTRAST.AA_NORMAL}:1 for WCAG AA)`,
      wcagCriterion: '1.4.3',
      wcagLevel: 'AA',
      currentValue: `${text} on ${background}`,
      suggestedValue: suggestAccessibleColor(text, background, 'AA'),
      details: 'Body text must have sufficient contrast for readability.',
    });
  } else {
    passed.push({
      id: 'text-contrast',
      element: 'Body Text',
      message: `Contrast ratio ${textRatio.toFixed(2)}:1 meets WCAG AA`,
      wcagCriterion: '1.4.3',
    });
  }

  // Check muted text
  const mutedRatio = getContrastRatio(textMuted, background);
  if (mutedRatio < WCAG_CONTRAST.AA_LARGE) {
    issues.push({
      id: 'muted-text-contrast',
      type: 'warning',
      element: 'Muted Text',
      property: 'textMuted / background',
      message: `Muted text contrast ratio is ${mutedRatio.toFixed(2)}:1 (needs ${WCAG_CONTRAST.AA_LARGE}:1 for large text)`,
      wcagCriterion: '1.4.3',
      wcagLevel: 'AA',
      currentValue: `${textMuted} on ${background}`,
      suggestedValue: suggestAccessibleColor(textMuted, background, 'AA'),
      details: 'Muted/secondary text should still be readable.',
    });
  } else {
    passed.push({
      id: 'muted-text-contrast',
      element: 'Muted Text',
      message: `Contrast ratio ${mutedRatio.toFixed(2)}:1 is acceptable`,
      wcagCriterion: '1.4.3',
    });
  }
}

/**
 * Check surface/card contrast
 */
function checkSurfaceContrast(
  colors: Partial<ColorSettings>,
  issues: AccessibilityIssue[],
  passed: PassedCheck[]
): void {
  const surface = colors.surface || '#F5F5F5';
  const background = colors.background || '#FFFFFF';
  const text = colors.text || '#000000';

  // Check text on surface
  const textOnSurfaceRatio = getContrastRatio(text, surface);
  if (textOnSurfaceRatio < WCAG_CONTRAST.AA_NORMAL) {
    issues.push({
      id: 'text-on-surface-contrast',
      type: 'error',
      element: 'Text on Cards/Surface',
      property: 'text / surface',
      message: `Text on surface contrast is ${textOnSurfaceRatio.toFixed(2)}:1 (needs ${WCAG_CONTRAST.AA_NORMAL}:1)`,
      wcagCriterion: '1.4.3',
      wcagLevel: 'AA',
      currentValue: `${text} on ${surface}`,
      suggestedValue: suggestAccessibleColor(text, surface, 'AA'),
    });
  } else {
    passed.push({
      id: 'text-on-surface-contrast',
      element: 'Text on Cards/Surface',
      message: `Contrast ratio ${textOnSurfaceRatio.toFixed(2)}:1 meets WCAG AA`,
      wcagCriterion: '1.4.3',
    });
  }

  // Check surface vs background (for card visibility)
  const surfaceBgRatio = getContrastRatio(surface, background);
  if (surfaceBgRatio < 1.1) {
    issues.push({
      id: 'surface-visibility',
      type: 'warning',
      element: 'Card/Surface Visibility',
      property: 'surface / background',
      message: `Surface color is nearly identical to background (${surfaceBgRatio.toFixed(2)}:1)`,
      wcagCriterion: '1.4.11',
      wcagLevel: 'AA',
      currentValue: `${surface} on ${background}`,
      details: 'Cards and surfaces should be visually distinguishable from the background.',
    });
  } else {
    passed.push({
      id: 'surface-visibility',
      element: 'Card/Surface Visibility',
      message: 'Surface is visually distinguishable from background',
      wcagCriterion: '1.4.11',
    });
  }
}

/**
 * Check primary color accessibility (for buttons, links)
 */
function checkPrimaryColorAccessibility(
  colors: Partial<ColorSettings>,
  issues: AccessibilityIssue[],
  passed: PassedCheck[]
): void {
  const primary = colors.primary || '#6B7280'; // Neutral gray fallback
  const background = colors.background || '#FFFFFF';

  // Check if primary color works as button text would need white/black text
  const isLight = isLightColor(primary);
  const buttonTextColor = isLight ? '#000000' : '#FFFFFF';
  const buttonTextRatio = getContrastRatio(buttonTextColor, primary);

  if (buttonTextRatio < WCAG_CONTRAST.AA_NORMAL) {
    issues.push({
      id: 'button-text-contrast',
      type: 'error',
      element: 'Button Text',
      property: 'buttonText / primary',
      message: `Button text contrast is ${buttonTextRatio.toFixed(2)}:1 (needs ${WCAG_CONTRAST.AA_NORMAL}:1)`,
      wcagCriterion: '1.4.3',
      wcagLevel: 'AA',
      currentValue: `${buttonTextColor} on ${primary}`,
      details: 'Primary buttons need readable text.',
    });
  } else {
    passed.push({
      id: 'button-text-contrast',
      element: 'Button Text',
      message: `Button text contrast ${buttonTextRatio.toFixed(2)}:1 meets WCAG AA`,
      wcagCriterion: '1.4.3',
    });
  }

  // Check primary link visibility on background
  const primaryOnBgRatio = getContrastRatio(primary, background);
  if (primaryOnBgRatio < WCAG_CONTRAST.AA_NORMAL) {
    issues.push({
      id: 'link-contrast',
      type: 'warning',
      element: 'Links/Primary on Background',
      property: 'primary / background',
      message: `Primary color on background is ${primaryOnBgRatio.toFixed(2)}:1 (should be ${WCAG_CONTRAST.AA_NORMAL}:1 for links)`,
      wcagCriterion: '1.4.3',
      wcagLevel: 'AA',
      currentValue: `${primary} on ${background}`,
      suggestedValue: suggestAccessibleColor(primary, background, 'AA'),
    });
  } else {
    passed.push({
      id: 'link-contrast',
      element: 'Links/Primary on Background',
      message: `Primary color contrast ${primaryOnBgRatio.toFixed(2)}:1 meets WCAG AA`,
      wcagCriterion: '1.4.3',
    });
  }
}

/**
 * Check border visibility for UI elements
 */
function checkBorderVisibility(
  colors: Partial<ColorSettings>,
  issues: AccessibilityIssue[],
  passed: PassedCheck[]
): void {
  const border = colors.border || '#E5E7EB';
  const background = colors.background || '#FFFFFF';

  const borderRatio = getContrastRatio(border, background);
  if (borderRatio < 1.5) {
    issues.push({
      id: 'border-visibility',
      type: 'warning',
      element: 'Input/Card Borders',
      property: 'border / background',
      message: `Border contrast is ${borderRatio.toFixed(2)}:1 (recommend at least 1.5:1 for visibility)`,
      wcagCriterion: '1.4.11',
      wcagLevel: 'AA',
      currentValue: `${border} on ${background}`,
      details: 'Borders should be visible for UI component boundaries.',
    });
  } else {
    passed.push({
      id: 'border-visibility',
      element: 'Input/Card Borders',
      message: 'Border visibility is adequate',
      wcagCriterion: '1.4.11',
    });
  }
}

/**
 * Check status colors accessibility
 */
function checkStatusColors(
  colors: Partial<ColorSettings>,
  issues: AccessibilityIssue[],
  passed: PassedCheck[]
): void {
  const background = colors.background || '#FFFFFF';
  const statusColors: { name: string; color: string | undefined }[] = [
    { name: 'Success', color: colors.success },
    { name: 'Warning', color: colors.warning },
    { name: 'Error', color: colors.error },
    { name: 'Info', color: colors.info },
  ];

  for (const { name, color } of statusColors) {
    if (!color) continue;

    const ratio = getContrastRatio(color, background);
    if (ratio < WCAG_CONTRAST.AA_LARGE) {
      issues.push({
        id: `${name.toLowerCase()}-color-contrast`,
        type: 'warning',
        element: `${name} Color`,
        property: `${name.toLowerCase()} / background`,
        message: `${name} color contrast is ${ratio.toFixed(2)}:1`,
        wcagCriterion: '1.4.1',
        wcagLevel: 'A',
        currentValue: `${color} on ${background}`,
        details: 'Status colors should be distinguishable (not relying solely on color).',
      });
    } else {
      passed.push({
        id: `${name.toLowerCase()}-color-contrast`,
        element: `${name} Color`,
        message: `${name} color contrast ${ratio.toFixed(2)}:1 is visible`,
        wcagCriterion: '1.4.1',
      });
    }
  }
}

// ============================================================================
// MAIN CHECKER FUNCTION
// ============================================================================

/**
 * Run all accessibility checks on a design
 */
export function checkDesignAccessibility(design: LayoutDesign): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];
  const passedChecks: PassedCheck[] = [];

  const colors = design.globalStyles?.colors || {};

  // Run all checks
  checkTextContrast(colors, issues, passedChecks);
  checkSurfaceContrast(colors, issues, passedChecks);
  checkPrimaryColorAccessibility(colors, issues, passedChecks);
  checkBorderVisibility(colors, issues, passedChecks);
  checkStatusColors(colors, issues, passedChecks);

  // Calculate score
  const errors = issues.filter((i) => i.type === 'error').length;
  const warnings = issues.filter((i) => i.type === 'warning').length;
  const total = issues.length + passedChecks.length;

  // Score calculation: errors = -20 points, warnings = -5 points, start at 100
  const score = Math.max(0, Math.min(100, 100 - errors * 20 - warnings * 5));

  // Grade calculation
  let grade: AccessibilityReport['grade'];
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    issues,
    passedChecks,
    summary: {
      errors,
      warnings,
      passed: passedChecks.length,
      total,
    },
  };
}

/**
 * Quick check for a single color pair
 */
export function quickContrastCheck(
  foreground: string,
  background: string
): { ratio: number; level: string; passes: boolean } {
  const ratio = getContrastRatio(foreground, background);
  let level: string;
  let passes: boolean;

  if (ratio >= WCAG_CONTRAST.AAA_NORMAL) {
    level = 'AAA';
    passes = true;
  } else if (ratio >= WCAG_CONTRAST.AA_NORMAL) {
    level = 'AA';
    passes = true;
  } else if (ratio >= WCAG_CONTRAST.AA_LARGE) {
    level = 'AA-Large';
    passes = true;
  } else {
    level = 'Fail';
    passes = false;
  }

  return { ratio, level, passes };
}

/**
 * Get auto-fix suggestions for all issues
 */
export function getAutoFixSuggestions(
  report: AccessibilityReport,
  colors: Partial<ColorSettings>
): Partial<ColorSettings> {
  const fixes: Partial<ColorSettings> = {};
  const background = colors.background || '#FFFFFF';

  for (const issue of report.issues) {
    if (issue.suggestedValue) {
      // Map issue IDs to color settings keys
      switch (issue.id) {
        case 'text-contrast':
          fixes.text = issue.suggestedValue;
          break;
        case 'muted-text-contrast':
          fixes.textMuted = issue.suggestedValue;
          break;
        case 'link-contrast':
          fixes.primary = issue.suggestedValue;
          break;
        // Add more mappings as needed
      }
    }
  }

  return fixes;
}

// ============================================================================
// EXPORTS
// ============================================================================

const accessibilityChecker = {
  checkDesignAccessibility,
  quickContrastCheck,
  getAutoFixSuggestions,
  WCAG_CONTRAST,
};

export default accessibilityChecker;
