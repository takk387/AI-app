/**
 * Syntax Analyzer
 *
 * Extends the existing codeValidator.ts with additional syntax checks.
 * Uses Tree-sitter for AST-based validation when available (server-side only).
 */

import type { ReviewIssue, AnalyzerResult, ReviewFile } from '@/types/codeReview';
import { generateIssueId } from '@/types/codeReview';

// Check if we're on the server
const isServer = typeof window === 'undefined';

// Dynamically import validation functions only on server
// These use tree-sitter which is not available in browser
type CodeValidatorModule = typeof import('@/utils/codeValidator');
let codeValidatorModule: CodeValidatorModule | null = null;
let codeValidatorLoaded = false;

// Async loader for code validator (called lazily when needed)
async function loadCodeValidator(): Promise<CodeValidatorModule | null> {
  if (codeValidatorLoaded) return codeValidatorModule;
  codeValidatorLoaded = true;

  if (!isServer) return null;

  try {
    // Dynamic import with webpackIgnore to prevent bundling in client
    codeValidatorModule = await import(/* webpackIgnore: true */ '@/utils/codeValidator');
    return codeValidatorModule;
  } catch {
    // codeValidator not available (e.g., in browser)
    console.warn('Tree-sitter validation not available in this environment');
    return null;
  }
}

// ============================================================================
// ADDITIONAL SYNTAX PATTERNS
// ============================================================================

interface SyntaxPattern {
  pattern: RegExp;
  category: 'syntax_error' | 'type_error' | 'import_unused' | 'import_missing';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  autoFixable: boolean;
}

const SYNTAX_PATTERNS: SyntaxPattern[] = [
  // Common TypeScript errors
  {
    pattern: /:\s*any\b/g,
    category: 'type_error',
    severity: 'low',
    message: 'Using "any" type reduces type safety',
    suggestion: 'Consider using a more specific type',
    autoFixable: false,
  },
  {
    pattern: /as\s+any\b/g,
    category: 'type_error',
    severity: 'medium',
    message: 'Type assertion to "any" bypasses type checking',
    suggestion: 'Use a more specific type assertion or fix the underlying type issue',
    autoFixable: false,
  },
  {
    pattern: /@ts-ignore/g,
    category: 'type_error',
    severity: 'medium',
    message: '@ts-ignore suppresses TypeScript errors',
    suggestion: 'Fix the underlying type issue instead of suppressing it',
    autoFixable: false,
  },
  {
    pattern: /@ts-expect-error(?!\s+\S)/g,
    category: 'type_error',
    severity: 'low',
    message: '@ts-expect-error without description',
    suggestion: 'Add a description explaining why this error is expected',
    autoFixable: false,
  },

  // Common syntax issues
  {
    pattern: /console\.log\s*\(/g,
    category: 'syntax_error',
    severity: 'low',
    message: 'console.log left in code',
    suggestion: 'Remove console.log statements for production code',
    autoFixable: true,
  },
  {
    pattern: /debugger\s*;?/g,
    category: 'syntax_error',
    severity: 'medium',
    message: 'debugger statement left in code',
    suggestion: 'Remove debugger statements',
    autoFixable: true,
  },

  // Import issues
  {
    pattern: /import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]\s*;\s*\/\/\s*unused/gi,
    category: 'import_unused',
    severity: 'low',
    message: 'Import marked as unused',
    suggestion: 'Remove unused imports',
    autoFixable: true,
  },

  // Async/await issues
  {
    pattern: /async\s+function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*\{[^}]*\}(?!\s*\.catch)/g,
    category: 'syntax_error',
    severity: 'low',
    message: 'Async function without error handling',
    suggestion: 'Consider adding try/catch for error handling',
    autoFixable: false,
  },

  // Double semicolons
  {
    pattern: /;{2,}/g,
    category: 'syntax_error',
    severity: 'low',
    message: 'Multiple semicolons',
    suggestion: 'Remove extra semicolons',
    autoFixable: true,
  },
];

// ============================================================================
// ANALYZER IMPLEMENTATION
// ============================================================================

/**
 * Check for unused imports by analyzing the file
 */
function checkUnusedImports(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Extract all imports
  const importPattern = /import\s+(?:\{([^}]+)\}|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"][^'"]+['"]/g;

  let match;
  while ((match = importPattern.exec(file.content)) !== null) {
    const importedNames: string[] = [];

    // Named imports
    if (match[1]) {
      const names = match[1].split(',').map((n) => {
        const parts = n.trim().split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      importedNames.push(...names.filter((n) => n && n !== 'type'));
    }

    // Namespace import
    if (match[2]) {
      const nsMatch = match[2].match(/\*\s+as\s+(\w+)/);
      if (nsMatch) importedNames.push(nsMatch[1]);
    }

    // Default import
    if (match[3]) {
      importedNames.push(match[3]);
    }

    // Check if each import is used in the file
    const codeWithoutImports = file.content.replace(
      /import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g,
      ''
    );

    for (const name of importedNames) {
      if (!name) continue;

      // Create a pattern to check if the name is used
      const usagePattern = new RegExp(`\\b${name}\\b`, 'g');
      const matches = codeWithoutImports.match(usagePattern);

      if (!matches || matches.length === 0) {
        const beforeMatch = file.content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        issues.push({
          id: generateIssueId('import_unused', file.path, lineNumber),
          category: 'import_unused',
          severity: 'low',
          file: file.path,
          line: lineNumber,
          message: `Unused import: '${name}'`,
          code: lines[lineNumber - 1]?.trim() || '',
          suggestion: 'Remove the unused import',
          autoFixable: true,
        });
      }
    }
  }

  return issues;
}

/**
 * Check for missing imports by looking for undefined references
 */
function checkMissingImports(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Common React hooks that should be imported
  const reactHooks = [
    'useState',
    'useEffect',
    'useContext',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
  ];

  // Check if React hooks are used but not imported
  for (const hook of reactHooks) {
    const usagePattern = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    const importPattern = new RegExp(`import\\s+[^;]*\\b${hook}\\b[^;]*from\\s+['"]react['"]`);

    if (usagePattern.test(file.content) && !importPattern.test(file.content)) {
      // Find the first usage
      usagePattern.lastIndex = 0;
      const match = usagePattern.exec(file.content);
      if (match) {
        const beforeMatch = file.content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        issues.push({
          id: generateIssueId('import_missing', file.path, lineNumber),
          category: 'import_missing',
          severity: 'high',
          file: file.path,
          line: lineNumber,
          message: `'${hook}' is used but not imported from 'react'`,
          code: lines[lineNumber - 1]?.trim() || '',
          suggestion: `Add import: import { ${hook} } from 'react'`,
          autoFixable: true,
        });
      }
    }
  }

  return issues;
}

/**
 * Run pattern-based syntax checks
 */
function runPatternChecks(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  for (const pattern of SYNTAX_PATTERNS) {
    pattern.pattern.lastIndex = 0;

    let match;
    while ((match = pattern.pattern.exec(file.content)) !== null) {
      const beforeMatch = file.content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const line = lines[lineNumber - 1] || '';

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
 * Convert existing validation errors to ReviewIssues
 */
function convertValidationErrors(
  file: ReviewFile,
  validationErrors: Array<{
    type: string;
    message: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning';
    fix?: string;
    code?: string;
  }>
): ReviewIssue[] {
  return validationErrors.map((error) => ({
    id: generateIssueId('syntax_error', file.path, error.line),
    category: 'syntax_error' as const,
    severity: error.severity === 'error' ? ('critical' as const) : ('medium' as const),
    file: file.path,
    line: error.line,
    column: error.column,
    message: error.message,
    code: error.code,
    suggestion: error.fix,
    autoFixable: false,
  }));
}

/**
 * Main syntax analyzer function
 */
export async function analyzeSyntaxIssues(files: ReviewFile[]): Promise<AnalyzerResult> {
  const startTime = Date.now();
  const allIssues: ReviewIssue[] = [];

  // Load code validator (may be null if not on server)
  const validator = await loadCodeValidator();

  for (const file of files) {
    // Only analyze code files
    if (!file.path.match(/\.(tsx?|jsx?|mjs|cjs)$/)) {
      continue;
    }

    try {
      // Run existing codeValidator if available
      if (validator) {
        const validationResult = await validator.validateGeneratedCode(file.content, file.path);
        if (!validationResult.valid) {
          allIssues.push(...convertValidationErrors(file, validationResult.errors));
        }
      }

      // Run additional pattern checks (these work without tree-sitter)
      allIssues.push(...runPatternChecks(file));

      // Check for unused imports
      allIssues.push(...checkUnusedImports(file));

      // Check for missing imports
      allIssues.push(...checkMissingImports(file));

      // Run specific checks from codeValidator if available
      if (validator) {
        const nestedFunctionErrors = validator.hasNestedFunctionDeclarations(file.content);
        allIssues.push(...convertValidationErrors(file, nestedFunctionErrors));

        const jsxTagErrors = validator.hasBalancedJSXTags(file.content);
        allIssues.push(...convertValidationErrors(file, jsxTagErrors));

        const stringErrors = validator.hasUnclosedStrings(file.content);
        allIssues.push(...convertValidationErrors(file, stringErrors));
      }
    } catch (error) {
      // If validation fails, add a generic error
      allIssues.push({
        id: generateIssueId('syntax_error', file.path, 1),
        category: 'syntax_error',
        severity: 'high',
        file: file.path,
        line: 1,
        message: `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoFixable: false,
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniqueIssues = allIssues.filter((issue) => {
    const key = `${issue.file}:${issue.line}:${issue.category}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate score
  const criticalCount = uniqueIssues.filter((i) => i.severity === 'critical').length;
  const highCount = uniqueIssues.filter((i) => i.severity === 'high').length;
  const mediumCount = uniqueIssues.filter((i) => i.severity === 'medium').length;
  const lowCount = uniqueIssues.filter((i) => i.severity === 'low').length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score -= lowCount * 3;
  score = Math.max(0, score);

  return {
    analyzerName: 'SyntaxAnalyzer',
    issues: uniqueIssues,
    score,
    durationMs: Date.now() - startTime,
  };
}

const SyntaxAnalyzer = { analyzeSyntaxIssues };
export default SyntaxAnalyzer;
