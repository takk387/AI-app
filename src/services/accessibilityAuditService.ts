/**
 * Accessibility Audit Service
 *
 * Comprehensive WCAG accessibility testing using axe-core principles.
 * Provides violations, impact levels, and fix suggestions.
 *
 * Based on: axe-core (https://github.com/dequelabs/axe-core)
 * Cost: FREE (open source, runs locally)
 *
 * Note: For full browser-based testing, use the actual axe-core library.
 * This service provides HTML analysis and common accessibility checks.
 */

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';
export type WCAGLevel = 'A' | 'AA' | 'AAA';

export interface AccessibilityViolation {
  id: string;
  description: string;
  impact: ImpactLevel;
  wcagCriteria: string[];
  wcagLevel: WCAGLevel;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string;
    failureSummary: string;
    fix: string;
  }>;
}

export interface AccessibilityAuditResult {
  score: number; // 0-100
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  recommendations: string[];
}

export interface AuditOptions {
  html: string;
  rules?: string[];
  includeImpact?: ImpactLevel[];
  wcagLevel?: WCAGLevel;
}

// Common accessibility rules
const ACCESSIBILITY_RULES: Record<
  string,
  {
    id: string;
    description: string;
    impact: ImpactLevel;
    wcagCriteria: string[];
    wcagLevel: WCAGLevel;
    check: (html: string) => {
      pass: boolean;
      nodes: Array<{ html: string; target: string; fix: string }>;
    };
    help: string;
    helpUrl: string;
  }
> = {
  'image-alt': {
    id: 'image-alt',
    description: 'Images must have alternate text',
    impact: 'critical',
    wcagCriteria: ['1.1.1'],
    wcagLevel: 'A',
    check: (html) => {
      const imgRegex = /<img[^>]*>/gi;
      const images = html.match(imgRegex) || [];
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      for (const img of images) {
        const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(img);
        const hasRole = /role\s*=\s*["']presentation["']/i.test(img);
        const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(img);

        if (!hasAlt && !hasRole && !hasAriaHidden) {
          violations.push({
            html: img,
            target: 'img',
            fix: 'Add alt attribute: alt="Description of image" or alt="" for decorative images',
          });
        }
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Images must have alternate text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
  },
  'button-name': {
    id: 'button-name',
    description: 'Buttons must have discernible text',
    impact: 'critical',
    wcagCriteria: ['4.1.2'],
    wcagLevel: 'A',
    check: (html) => {
      const buttonRegex = /<button[^>]*>[\s\S]*?<\/button>/gi;
      const buttons = html.match(buttonRegex) || [];
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      for (const btn of buttons) {
        const innerText = btn.replace(/<[^>]*>/g, '').trim();
        const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(btn);
        const hasTitle = /title\s*=\s*["'][^"']+["']/i.test(btn);

        if (!innerText && !hasAriaLabel && !hasTitle) {
          violations.push({
            html: btn.substring(0, 100),
            target: 'button',
            fix: 'Add text content, aria-label, or title attribute',
          });
        }
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Buttons must have discernible text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/button-name',
  },
  'link-name': {
    id: 'link-name',
    description: 'Links must have discernible text',
    impact: 'serious',
    wcagCriteria: ['2.4.4', '4.1.2'],
    wcagLevel: 'A',
    check: (html) => {
      const linkRegex = /<a[^>]*>[\s\S]*?<\/a>/gi;
      const links = html.match(linkRegex) || [];
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      for (const link of links) {
        const innerText = link.replace(/<[^>]*>/g, '').trim();
        const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(link);
        const hasTitle = /title\s*=\s*["'][^"']+["']/i.test(link);
        const hasImg = /<img[^>]*alt\s*=\s*["'][^"']+["'][^>]*>/i.test(link);

        if (!innerText && !hasAriaLabel && !hasTitle && !hasImg) {
          violations.push({
            html: link.substring(0, 100),
            target: 'a',
            fix: 'Add link text, aria-label, or ensure image has alt text',
          });
        }
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Links must have discernible text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/link-name',
  },
  'color-contrast': {
    id: 'color-contrast',
    description: 'Elements must have sufficient color contrast',
    impact: 'serious',
    wcagCriteria: ['1.4.3'],
    wcagLevel: 'AA',
    check: (html) => {
      // Basic check for common low-contrast patterns
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      // Check for light gray text (common issue)
      const lightGrayPattern = /color\s*:\s*#[cdef][cdef][cdef]/gi;
      if (lightGrayPattern.test(html)) {
        violations.push({
          html: 'Inline style with light color',
          target: '[style*="color"]',
          fix: 'Ensure text has at least 4.5:1 contrast ratio (3:1 for large text)',
        });
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Elements must have sufficient color contrast',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
  },
  'html-lang': {
    id: 'html-lang',
    description: 'html element must have a lang attribute',
    impact: 'serious',
    wcagCriteria: ['3.1.1'],
    wcagLevel: 'A',
    check: (html) => {
      const hasLang = /<html[^>]*\slang\s*=\s*["'][^"']+["']/i.test(html);
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      if (!hasLang && /<html/i.test(html)) {
        violations.push({
          html: '<html>',
          target: 'html',
          fix: 'Add lang attribute: <html lang="en">',
        });
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: '<html> element must have a lang attribute',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/html-has-lang',
  },
  'form-label': {
    id: 'form-label',
    description: 'Form elements must have labels',
    impact: 'critical',
    wcagCriteria: ['1.3.1', '4.1.2'],
    wcagLevel: 'A',
    check: (html) => {
      const inputRegex =
        /<input[^>]*type\s*=\s*["'](?!hidden|submit|button|reset|image)[^"']*["'][^>]*>/gi;
      const inputs = html.match(inputRegex) || [];
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      for (const input of inputs) {
        const hasId = /id\s*=\s*["']([^"']+)["']/i.exec(input);
        const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(input);
        const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(input);
        const hasTitle = /title\s*=\s*["'][^"']+["']/i.test(input);

        if (hasId) {
          const labelRegex = new RegExp(`<label[^>]*for\\s*=\\s*["']${hasId[1]}["']`, 'i');
          if (!labelRegex.test(html) && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
            violations.push({
              html: input.substring(0, 100),
              target: 'input',
              fix: `Add <label for="${hasId[1]}">Label text</label> or aria-label attribute`,
            });
          }
        } else if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
          violations.push({
            html: input.substring(0, 100),
            target: 'input',
            fix: 'Add id and associated label, or aria-label attribute',
          });
        }
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Form elements must have labels',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
  },
  'heading-order': {
    id: 'heading-order',
    description: 'Heading levels should increase by one',
    impact: 'moderate',
    wcagCriteria: ['1.3.1'],
    wcagLevel: 'A',
    check: (html) => {
      const headingRegex = /<h([1-6])[^>]*>/gi;
      const violations: Array<{ html: string; target: string; fix: string }> = [];
      let lastLevel = 0;
      let match;

      while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1]);
        if (lastLevel > 0 && level > lastLevel + 1) {
          violations.push({
            html: match[0],
            target: `h${level}`,
            fix: `Heading skips from h${lastLevel} to h${level}. Use h${lastLevel + 1} instead.`,
          });
        }
        lastLevel = level;
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Heading levels should only increase by one',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/heading-order',
  },
  'landmark-one-main': {
    id: 'landmark-one-main',
    description: 'Document should have one main landmark',
    impact: 'moderate',
    wcagCriteria: ['1.3.1'],
    wcagLevel: 'A',
    check: (html) => {
      const mainCount =
        (html.match(/<main/gi) || []).length +
        (html.match(/role\s*=\s*["']main["']/gi) || []).length;
      const violations: Array<{ html: string; target: string; fix: string }> = [];

      if (mainCount === 0) {
        violations.push({
          html: 'document',
          target: 'body',
          fix: 'Add <main> element or role="main" to wrap main content',
        });
      } else if (mainCount > 1) {
        violations.push({
          html: 'document',
          target: 'main',
          fix: 'Document should have only one main landmark',
        });
      }

      return { pass: violations.length === 0, nodes: violations };
    },
    help: 'Document should have one main landmark',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/landmark-one-main',
  },
};

/**
 * Run accessibility audit on HTML content
 */
export async function auditAccessibility(options: AuditOptions): Promise<AccessibilityAuditResult> {
  const {
    html,
    rules,
    includeImpact = ['critical', 'serious', 'moderate', 'minor'],
    wcagLevel = 'AA',
  } = options;

  const violations: AccessibilityViolation[] = [];
  let passes = 0;
  let incomplete = 0;

  // Determine which rules to run
  const rulesToRun = rules
    ? Object.values(ACCESSIBILITY_RULES).filter((r) => rules.includes(r.id))
    : Object.values(ACCESSIBILITY_RULES);

  // Filter by WCAG level
  const wcagLevels: WCAGLevel[] =
    wcagLevel === 'AAA' ? ['A', 'AA', 'AAA'] : wcagLevel === 'AA' ? ['A', 'AA'] : ['A'];

  for (const rule of rulesToRun) {
    if (!wcagLevels.includes(rule.wcagLevel)) continue;
    if (!includeImpact.includes(rule.impact)) continue;

    try {
      const result = rule.check(html);

      if (result.pass) {
        passes++;
      } else {
        violations.push({
          id: rule.id,
          description: rule.description,
          impact: rule.impact,
          wcagCriteria: rule.wcagCriteria,
          wcagLevel: rule.wcagLevel,
          help: rule.help,
          helpUrl: rule.helpUrl,
          nodes: result.nodes.map((n) => ({
            ...n,
            failureSummary: `Fix: ${n.fix}`,
          })),
        });
      }
    } catch {
      incomplete++;
    }
  }

  // Calculate score (100 - weighted violations)
  const weights = { critical: 25, serious: 15, moderate: 10, minor: 5 };
  const totalDeduction = violations.reduce((sum, v) => sum + weights[v.impact] * v.nodes.length, 0);
  const score = Math.max(0, 100 - totalDeduction);

  // Count by impact
  const summary = {
    critical: violations.filter((v) => v.impact === 'critical').length,
    serious: violations.filter((v) => v.impact === 'serious').length,
    moderate: violations.filter((v) => v.impact === 'moderate').length,
    minor: violations.filter((v) => v.impact === 'minor').length,
  };

  // Generate recommendations
  const recommendations: string[] = [];
  if (summary.critical > 0) {
    recommendations.push(
      'Fix critical issues first - they prevent some users from accessing content'
    );
  }
  if (summary.serious > 0) {
    recommendations.push('Address serious issues - they significantly impact user experience');
  }
  if (!/<main/i.test(html)) {
    recommendations.push(
      'Add semantic landmarks (<main>, <nav>, <header>, <footer>) for screen reader navigation'
    );
  }
  if (!/<h1/i.test(html)) {
    recommendations.push('Ensure page has an h1 heading for document structure');
  }

  return {
    score,
    violations,
    passes,
    incomplete,
    summary,
    recommendations,
  };
}

/**
 * Check color contrast ratio
 */
export function checkColorContrast(
  foreground: string,
  background: string
): { ratio: number; passAA: boolean; passAAA: boolean; passLargeAA: boolean } {
  const getLuminance = (hex: string): number => {
    const rgb = hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passAA: ratio >= 4.5, // Normal text
    passAAA: ratio >= 7, // Enhanced
    passLargeAA: ratio >= 3, // Large text (18pt+ or 14pt bold)
  };
}

/**
 * Get all available audit rules
 */
export function getAvailableRules(): Array<{
  id: string;
  description: string;
  impact: ImpactLevel;
  wcagLevel: WCAGLevel;
}> {
  return Object.values(ACCESSIBILITY_RULES).map((rule) => ({
    id: rule.id,
    description: rule.description,
    impact: rule.impact,
    wcagLevel: rule.wcagLevel,
  }));
}

const accessibilityAuditService = {
  auditAccessibility,
  checkColorContrast,
  getAvailableRules,
};
export default accessibilityAuditService;
