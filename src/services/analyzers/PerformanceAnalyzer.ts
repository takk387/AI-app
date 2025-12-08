/**
 * Performance Analyzer
 *
 * Detects performance issues in React code:
 * - Inline object/array creation in JSX (causes re-renders)
 * - Inline function creation in JSX
 * - Missing useMemo/useCallback for expensive operations
 * - Expensive operations in render path
 */

import type { ReviewIssue, AnalyzerResult, ReviewFile } from '@/types/codeReview';
import { generateIssueId } from '@/types/codeReview';

// ============================================================================
// PERFORMANCE PATTERNS
// ============================================================================

interface PerformancePattern {
  pattern: RegExp;
  category: 'performance_rerender' | 'performance_memo' | 'performance_expensive';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  autoFixable: boolean;
}

const PERFORMANCE_PATTERNS: PerformancePattern[] = [
  // Inline object in JSX props (causes re-render on every render)
  {
    pattern: /(?:style|className|sx)\s*=\s*\{\s*\{[^}]+\}\s*\}/g,
    category: 'performance_rerender',
    severity: 'medium',
    message: 'Inline object in JSX prop causes unnecessary re-renders',
    suggestion: 'Move the object to a constant outside the component or use useMemo',
    autoFixable: false,
  },

  // Inline array in JSX props
  {
    pattern: /(?:items|options|data|columns)\s*=\s*\{\s*\[[^\]]+\]\s*\}/g,
    category: 'performance_rerender',
    severity: 'medium',
    message: 'Inline array in JSX prop causes unnecessary re-renders',
    suggestion: 'Move the array to a constant outside the component or use useMemo',
    autoFixable: false,
  },

  // Inline arrow function in JSX (creates new function every render)
  {
    pattern:
      /(?:onClick|onChange|onSubmit|onBlur|onFocus|onKeyDown|onKeyUp|onMouseOver|onMouseOut)\s*=\s*\{\s*\([^)]*\)\s*=>/g,
    category: 'performance_rerender',
    severity: 'medium',
    message: 'Inline arrow function in event handler creates new function on every render',
    suggestion: 'Use useCallback to memoize the handler, or define it outside JSX',
    autoFixable: true,
  },

  // Inline function call in JSX (excluding simple expressions)
  {
    pattern: /(?:onClick|onChange|onSubmit)\s*=\s*\{\s*\(\)\s*=>\s*[a-zA-Z]+\([^)]*\)\s*\}/g,
    category: 'performance_rerender',
    severity: 'low',
    message: 'Inline function wrapping a call in event handler',
    suggestion: 'Consider using useCallback if the parent re-renders frequently',
    autoFixable: true,
  },

  // .filter().map() chain (could be combined or memoized)
  {
    pattern: /\.filter\s*\([^)]+\)\s*\.map\s*\(/g,
    category: 'performance_memo',
    severity: 'low',
    message: 'Chained filter().map() runs on every render',
    suggestion: 'Consider using useMemo to cache the result if the source data is stable',
    autoFixable: false,
  },

  // Expensive sort in render
  {
    pattern: /\.sort\s*\([^)]*\)\s*\.map\s*\(/g,
    category: 'performance_expensive',
    severity: 'medium',
    message: 'Sorting data in the render path can be expensive',
    suggestion: 'Use useMemo to memoize sorted data',
    autoFixable: false,
  },

  // JSON.parse/stringify in render
  {
    pattern: /(?:JSON\.parse|JSON\.stringify)\s*\(/g,
    category: 'performance_expensive',
    severity: 'low',
    message: 'JSON parsing/stringifying in render path may impact performance',
    suggestion: 'Consider memoizing with useMemo if called with stable data',
    autoFixable: false,
  },

  // new Date() in render (creates new object each render)
  {
    pattern: /(?:new\s+Date\s*\(\)|Date\.now\s*\(\))/g,
    category: 'performance_rerender',
    severity: 'low',
    message: 'Creating Date objects in render can cause issues with memoization',
    suggestion: 'Store date in state or memoize if used for comparisons',
    autoFixable: false,
  },

  // Object.keys/values/entries().map in render
  {
    pattern: /Object\.(?:keys|values|entries)\s*\([^)]+\)\s*\.map\s*\(/g,
    category: 'performance_memo',
    severity: 'low',
    message: 'Object transformation in render runs every time',
    suggestion: 'Use useMemo if the object reference is stable',
    autoFixable: false,
  },

  // Large spread in JSX
  {
    pattern: /\{\s*\.\.\.(?:props|data|item)\s*\}/g,
    category: 'performance_rerender',
    severity: 'low',
    message: 'Spreading objects in JSX may pass unnecessary props',
    suggestion: 'Consider destructuring only the needed props',
    autoFixable: false,
  },
];

// ============================================================================
// ANALYZER IMPLEMENTATION
// ============================================================================

/**
 * Check if we're inside the return statement / JSX of a component
 */
function isInRenderPath(content: string, matchIndex: number): boolean {
  // Simple heuristic: check if 'return' appears before this point
  // and we're likely in JSX context
  const beforeMatch = content.substring(0, matchIndex);
  const lastReturn = beforeMatch.lastIndexOf('return');
  const lastFunction = beforeMatch.lastIndexOf('function');
  const lastArrow = beforeMatch.lastIndexOf('=>');

  // If there's a return and it's after the last function/arrow, we're in render path
  return lastReturn > Math.max(lastFunction, lastArrow);
}

/**
 * Analyze a single file for performance issues
 */
function analyzeFile(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  for (const pattern of PERFORMANCE_PATTERNS) {
    pattern.pattern.lastIndex = 0;

    let match;
    while ((match = pattern.pattern.exec(file.content)) !== null) {
      // Only report if in render path for some patterns
      if (
        pattern.category === 'performance_expensive' &&
        !isInRenderPath(file.content, match.index)
      ) {
        continue;
      }

      // Find line number
      const beforeMatch = file.content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const line = lines[lineNumber - 1] || '';

      // Find column
      const lastNewline = beforeMatch.lastIndexOf('\n');
      const column = match.index - lastNewline;

      issues.push({
        id: generateIssueId(pattern.category, file.path, lineNumber),
        category: pattern.category,
        severity: pattern.severity,
        file: file.path,
        line: lineNumber,
        column,
        message: pattern.message,
        code: line.trim(),
        suggestion: pattern.suggestion,
        autoFixable: pattern.autoFixable,
      });
    }
  }

  return issues;
}

/**
 * Check for components that could benefit from React.memo
 */
function checkMemoOpportunities(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Look for functional components that receive many props
  const componentPattern =
    /(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=:]\s*(?:\([^)]*\)|[a-zA-Z]+)\s*(?:=>|:)/g;

  let match;
  while ((match = componentPattern.exec(file.content)) !== null) {
    const componentName = match[1];
    const beforeMatch = file.content.substring(0, match.index);
    const lineNumber = beforeMatch.split('\n').length;

    // Check if component is already wrapped with memo
    const afterMatch = file.content.substring(match.index);
    const isAlreadyMemo = /React\.memo|memo\s*\(/.test(
      file.content.substring(Math.max(0, match.index - 50), match.index)
    );

    if (isAlreadyMemo) continue;

    // Check if component receives many props (heuristic: more than 3)
    const propsMatch = /\(\s*\{([^}]+)\}/.exec(afterMatch);
    if (propsMatch) {
      const propsCount = (propsMatch[1].match(/,/g) || []).length + 1;
      if (propsCount >= 4) {
        issues.push({
          id: generateIssueId('performance_memo', file.path, lineNumber),
          category: 'performance_memo',
          severity: 'low',
          file: file.path,
          line: lineNumber,
          message: `Component '${componentName}' receives ${propsCount} props and might benefit from React.memo`,
          code: lines[lineNumber - 1]?.trim() || '',
          suggestion: 'Consider wrapping with React.memo if parent re-renders frequently',
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

/**
 * Check for expensive computations without useMemo
 */
function checkExpensiveComputations(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Patterns that indicate expensive operations
  const expensivePatterns = [
    { pattern: /\.reduce\s*\([^)]+,[^)]+\)/g, name: 'reduce' },
    { pattern: /\.sort\s*\([^)]*\)/g, name: 'sort' },
    { pattern: /\.slice\s*\([^)]*\)\.sort/g, name: 'slice+sort' },
    { pattern: /Array\.from\s*\([^)]+\)/g, name: 'Array.from' },
    { pattern: /new\s+Map\s*\([^)]*\)/g, name: 'new Map' },
    { pattern: /new\s+Set\s*\([^)]*\)/g, name: 'new Set' },
  ];

  for (const { pattern, name } of expensivePatterns) {
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(file.content)) !== null) {
      // Check if inside useMemo
      const beforeMatch = file.content.substring(Math.max(0, match.index - 100), match.index);
      const isInMemo = /useMemo\s*\(\s*\(\)\s*=>/.test(beforeMatch);

      if (isInMemo) continue;

      // Check if in render path
      if (!isInRenderPath(file.content, match.index)) continue;

      const beforeMatchFull = file.content.substring(0, match.index);
      const lineNumber = beforeMatchFull.split('\n').length;
      const line = lines[lineNumber - 1] || '';

      issues.push({
        id: generateIssueId('performance_expensive', file.path, lineNumber),
        category: 'performance_expensive',
        severity: 'medium',
        file: file.path,
        line: lineNumber,
        message: `Expensive operation '${name}' in render path without memoization`,
        code: line.trim(),
        suggestion: 'Wrap in useMemo to avoid recalculation on every render',
        autoFixable: false,
      });
    }
  }

  return issues;
}

/**
 * Main performance analyzer function
 */
export async function analyzePerformanceIssues(files: ReviewFile[]): Promise<AnalyzerResult> {
  const startTime = Date.now();
  const allIssues: ReviewIssue[] = [];

  for (const file of files) {
    // Only analyze React files
    if (!file.path.match(/\.(tsx|jsx)$/)) {
      continue;
    }

    // Run all performance checks
    allIssues.push(...analyzeFile(file));
    allIssues.push(...checkMemoOpportunities(file));
    allIssues.push(...checkExpensiveComputations(file));
  }

  // Deduplicate issues
  const seen = new Set<string>();
  const uniqueIssues = allIssues.filter((issue) => {
    const key = `${issue.file}:${issue.line}:${issue.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate score (performance issues are generally less severe)
  const highCount = uniqueIssues.filter((i) => i.severity === 'high').length;
  const mediumCount = uniqueIssues.filter((i) => i.severity === 'medium').length;
  const lowCount = uniqueIssues.filter((i) => i.severity === 'low').length;

  let score = 100;
  score -= highCount * 10;
  score -= mediumCount * 5;
  score -= lowCount * 2;
  score = Math.max(0, score);

  return {
    analyzerName: 'PerformanceAnalyzer',
    issues: uniqueIssues,
    score,
    durationMs: Date.now() - startTime,
  };
}

const PerformanceAnalyzer = { analyzePerformanceIssues };
export default PerformanceAnalyzer;
