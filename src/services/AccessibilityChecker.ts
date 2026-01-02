import type {
  LayoutDesign,
  ColorSettings,
  TypographySettings,
  EffectsSettings,
} from '@/types/layoutDesign';

/**
 * Accessibility issue severity levels
 */
export type A11ySeverity = 'error' | 'warning' | 'info';

/**
 * WCAG conformance levels
 */
export type WCAGLevel = 'A' | 'AA' | 'AAA';

/**
 * Accessibility issue categories
 */
export type A11yCategory =
  | 'color-contrast'
  | 'touch-target'
  | 'focus-indicator'
  | 'text-size'
  | 'motion'
  | 'semantic'
  | 'alt-text'
  | 'heading-structure'
  | 'link-text'
  | 'form-labels';

/**
 * Single accessibility issue
 */
export interface A11yIssue {
  id: string;
  category: A11yCategory;
  severity: A11ySeverity;
  wcagLevel: WCAGLevel;
  wcagCriteria: string;
  title: string;
  description: string;
  element?: string;
  currentValue?: string;
  requiredValue?: string;
  suggestion: string;
  canAutoFix: boolean;
}

/**
 * Accessibility check result
 */
export interface A11yCheckResult {
  passed: boolean;
  score: number; // 0-100
  issues: A11yIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  wcagCompliance: {
    levelA: boolean;
    levelAA: boolean;
    levelAAA: boolean;
  };
}

/**
 * Color for contrast checking
 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * AccessibilityChecker Service
 *
 * Validates LayoutDesign against WCAG 2.1 guidelines.
 * Checks color contrast, touch targets, focus indicators, and more.
 */
class AccessibilityCheckerClass {
  private issueIdCounter = 0;

  /**
   * Run full accessibility check on a layout design
   */
  check(design: Partial<LayoutDesign>): A11yCheckResult {
    this.issueIdCounter = 0;
    const issues: A11yIssue[] = [];

    // Run all checks
    issues.push(...this.checkColorContrast(design));
    issues.push(...this.checkTouchTargets(design));
    issues.push(...this.checkFocusIndicators(design));
    issues.push(...this.checkTextSize(design));
    issues.push(...this.checkMotion(design));

    // Calculate summary
    const summary = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };

    // Calculate WCAG compliance
    const wcagCompliance = {
      levelA: !issues.some((i) => i.wcagLevel === 'A' && i.severity === 'error'),
      levelAA: !issues.some(
        (i) => (i.wcagLevel === 'A' || i.wcagLevel === 'AA') && i.severity === 'error'
      ),
      levelAAA: !issues.some((i) => i.severity === 'error'),
    };

    // Calculate score (100 - penalties)
    const errorPenalty = summary.errors * 15;
    const warningPenalty = summary.warnings * 5;
    const infoPenalty = summary.info * 1;
    const score = Math.max(0, 100 - errorPenalty - warningPenalty - infoPenalty);

    return {
      passed: summary.errors === 0,
      score,
      issues,
      summary,
      wcagCompliance,
    };
  }

  /**
   * Check color contrast ratios
   */
  private checkColorContrast(design: Partial<LayoutDesign>): A11yIssue[] {
    const issues: A11yIssue[] = [];
    const colors: Partial<ColorSettings> = design.globalStyles?.colors || {};

    // Check text on background
    if (colors.text && colors.background) {
      const ratio = this.getContrastRatio(colors.text, colors.background);

      if (ratio < 4.5) {
        issues.push({
          id: this.generateId(),
          category: 'color-contrast',
          severity: ratio < 3 ? 'error' : 'warning',
          wcagLevel: 'AA',
          wcagCriteria: '1.4.3 Contrast (Minimum)',
          title: 'Low text contrast',
          description: `Primary text has insufficient contrast against background.`,
          element: 'Primary Text',
          currentValue: `${ratio.toFixed(2)}:1`,
          requiredValue: '4.5:1 for normal text, 3:1 for large text',
          suggestion: 'Increase the contrast by using a darker text color or lighter background.',
          canAutoFix: true,
        });
      }

      // Check for AAA compliance (7:1)
      if (ratio >= 4.5 && ratio < 7) {
        issues.push({
          id: this.generateId(),
          category: 'color-contrast',
          severity: 'info',
          wcagLevel: 'AAA',
          wcagCriteria: '1.4.6 Contrast (Enhanced)',
          title: 'Could improve text contrast for AAA',
          description: `Primary text meets AA but not AAA contrast requirements.`,
          element: 'Primary Text',
          currentValue: `${ratio.toFixed(2)}:1`,
          requiredValue: '7:1 for AAA compliance',
          suggestion: 'For enhanced accessibility, consider increasing contrast to 7:1.',
          canAutoFix: false,
        });
      }
    }

    // Check muted text
    if (colors.textMuted && colors.background) {
      const ratio = this.getContrastRatio(colors.textMuted, colors.background);

      if (ratio < 4.5) {
        issues.push({
          id: this.generateId(),
          category: 'color-contrast',
          severity: ratio < 3 ? 'error' : 'warning',
          wcagLevel: 'AA',
          wcagCriteria: '1.4.3 Contrast (Minimum)',
          title: 'Low muted text contrast',
          description: `Muted text has insufficient contrast against background.`,
          element: 'Muted Text',
          currentValue: `${ratio.toFixed(2)}:1`,
          requiredValue: '4.5:1',
          suggestion: 'Increase the contrast of muted text color.',
          canAutoFix: true,
        });
      }
    }

    // Check primary color on background
    if (colors.primary && colors.background) {
      const ratio = this.getContrastRatio(colors.primary, colors.background);

      if (ratio < 3) {
        issues.push({
          id: this.generateId(),
          category: 'color-contrast',
          severity: 'warning',
          wcagLevel: 'AA',
          wcagCriteria: '1.4.11 Non-text Contrast',
          title: 'Low UI component contrast',
          description: `Primary color (buttons, links) may be hard to distinguish.`,
          element: 'Primary Color',
          currentValue: `${ratio.toFixed(2)}:1`,
          requiredValue: '3:1 for UI components',
          suggestion: 'Ensure primary color has at least 3:1 contrast with background.',
          canAutoFix: false,
        });
      }
    }

    return issues;
  }

  /**
   * Check touch target sizes
   */
  private checkTouchTargets(design: Partial<LayoutDesign>): A11yIssue[] {
    const issues: A11yIssue[] = [];
    const spacing = design.globalStyles?.spacing;

    // Check if density is compact (may indicate small touch targets)
    if (spacing?.density === 'compact') {
      issues.push({
        id: this.generateId(),
        category: 'touch-target',
        severity: 'warning',
        wcagLevel: 'AA',
        wcagCriteria: '2.5.5 Target Size',
        title: 'Compact spacing may affect touch targets',
        description: 'Compact density may result in touch targets smaller than 44x44 pixels.',
        element: 'Global Spacing',
        currentValue: 'compact',
        requiredValue: '44px minimum touch targets',
        suggestion: 'Consider using normal or relaxed density for better touch accessibility.',
        canAutoFix: false,
      });
    }

    return issues;
  }

  /**
   * Check focus indicators
   */
  private checkFocusIndicators(design: Partial<LayoutDesign>): A11yIssue[] {
    const issues: A11yIssue[] = [];
    const effects: Partial<EffectsSettings> = design.globalStyles?.effects || {};

    // Check if animations are disabled (may affect focus indicators)
    if (effects.animations === 'none') {
      issues.push({
        id: this.generateId(),
        category: 'focus-indicator',
        severity: 'info',
        wcagLevel: 'AA',
        wcagCriteria: '2.4.7 Focus Visible',
        title: 'Ensure focus indicators are visible',
        description: 'With animations disabled, ensure static focus indicators are clear.',
        element: 'Global Focus Style',
        currentValue: 'animations: none',
        requiredValue: 'Visible focus ring with 3:1 contrast',
        suggestion: 'Add a visible focus ring style (e.g., blue outline or ring).',
        canAutoFix: false,
      });
    }

    return issues;
  }

  /**
   * Check text sizes
   */
  private checkTextSize(design: Partial<LayoutDesign>): A11yIssue[] {
    const issues: A11yIssue[] = [];
    const typography: Partial<TypographySettings> = design.globalStyles?.typography || {};

    // Check if body size is too small
    if (typography.bodySize === 'xs') {
      issues.push({
        id: this.generateId(),
        category: 'text-size',
        severity: 'warning',
        wcagLevel: 'AA',
        wcagCriteria: '1.4.4 Resize Text',
        title: 'Base text size may be too small',
        description: 'Extra small text can be difficult to read for users with visual impairments.',
        element: 'Body Font Size',
        currentValue: 'xs',
        requiredValue: 'sm or larger',
        suggestion: 'Consider using at least sm (small) as the body font size.',
        canAutoFix: false,
      });
    }

    // Check line height
    if (typography.lineHeight === 'tight') {
      issues.push({
        id: this.generateId(),
        category: 'text-size',
        severity: 'warning',
        wcagLevel: 'AAA',
        wcagCriteria: '1.4.12 Text Spacing',
        title: 'Line height could be improved',
        description: 'Tight line spacing can make text harder to read.',
        element: 'Line Height',
        currentValue: 'tight',
        requiredValue: 'normal or relaxed',
        suggestion: 'Increase line height to normal or relaxed for better readability.',
        canAutoFix: false,
      });
    }

    return issues;
  }

  /**
   * Check motion and animation settings
   */
  private checkMotion(design: Partial<LayoutDesign>): A11yIssue[] {
    const issues: A11yIssue[] = [];
    const effects: Partial<EffectsSettings> = design.globalStyles?.effects || {};

    // Check for playful animations
    if (effects.animations === 'playful') {
      issues.push({
        id: this.generateId(),
        category: 'motion',
        severity: 'info',
        wcagLevel: 'AA',
        wcagCriteria: '2.3.3 Animation from Interactions',
        title: 'Consider reduced motion preferences',
        description: 'Playful animations may be distracting for some users.',
        element: 'Animations',
        currentValue: 'playful',
        requiredValue: 'Respect prefers-reduced-motion',
        suggestion: 'Add support for prefers-reduced-motion media query to reduce animations.',
        canAutoFix: false,
      });
    }

    return issues;
  }

  /**
   * Generate unique issue ID
   */
  private generateId(): string {
    return `a11y-${++this.issueIdCounter}`;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(foreground: string, background: string): number {
    const fg = this.parseColor(foreground);
    const bg = this.parseColor(background);

    if (!fg || !bg) return 0;

    const l1 = this.getRelativeLuminance(fg);
    const l2 = this.getRelativeLuminance(bg);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Parse hex/rgb color to RGB object
   */
  private parseColor(color: string): RGB | null {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      }
    }

    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    return null;
  }

  /**
   * Calculate relative luminance
   */
  private getRelativeLuminance(color: RGB): number {
    const sRGB = [color.r / 255, color.g / 255, color.b / 255];
    const [r, g, b] = sRGB.map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Adjust a color to meet contrast requirements
   */
  adjustColorForContrast(foreground: string, background: string, targetRatio: number): string {
    const fg = this.parseColor(foreground);
    const bg = this.parseColor(background);

    if (!fg || !bg) return foreground;

    const bgLum = this.getRelativeLuminance(bg);

    // Determine if we need to lighten or darken
    const shouldLighten = bgLum < 0.5;

    const adjusted = { ...fg };
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const ratio = this.getContrastRatio(
        `rgb(${adjusted.r}, ${adjusted.g}, ${adjusted.b})`,
        background
      );

      if (ratio >= targetRatio) break;

      // Adjust color
      if (shouldLighten) {
        adjusted.r = Math.min(255, adjusted.r + 5);
        adjusted.g = Math.min(255, adjusted.g + 5);
        adjusted.b = Math.min(255, adjusted.b + 5);
      } else {
        adjusted.r = Math.max(0, adjusted.r - 5);
        adjusted.g = Math.max(0, adjusted.g - 5);
        adjusted.b = Math.max(0, adjusted.b - 5);
      }

      attempts++;
    }

    // Convert back to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(adjusted.r)}${toHex(adjusted.g)}${toHex(adjusted.b)}`;
  }

  /**
   * Get auto-fixable issues
   */
  getAutoFixableIssues(result: A11yCheckResult): A11yIssue[] {
    return result.issues.filter((issue) => issue.canAutoFix);
  }
}

// Export singleton instance
export const AccessibilityChecker = new AccessibilityCheckerClass();

// Export class for testing
export { AccessibilityCheckerClass };
