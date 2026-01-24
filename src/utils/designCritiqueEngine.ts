import type { LayoutManifest } from '@/types/schema';

export interface DesignCritique {
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Analyze LayoutManifest for design quality
 */
export function critiqueDesign(manifest: LayoutManifest): DesignCritique {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const colors = manifest.designSystem?.colors;
  const fonts = manifest.designSystem?.fonts;

  // Rule 1: Check contrast (heuristic)
  if (colors?.background === colors?.text) {
    issues.push('Text color matches background color (low contrast).');
    score -= 20;
  }

  // Rule 2: Check typography
  if (!fonts?.heading || !fonts?.body) {
    suggestions.push('Define heading and body fonts for consistency.');
    score -= 5;
  }

  // Rule 3: Missing colors
  if (!colors?.primary) {
    suggestions.push('Define a primary color for the design system.');
    score -= 5;
  }

  return { score, issues, suggestions };
}
