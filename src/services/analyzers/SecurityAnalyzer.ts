/**
 * Security Analyzer
 *
 * Detects security vulnerabilities in generated code:
 * - XSS vulnerabilities (dangerouslySetInnerHTML, unescaped user input)
 * - Code injection (eval, Function constructor, innerHTML)
 * - SQL injection patterns
 * - Insecure patterns (hardcoded secrets, etc.)
 */

import type { ReviewIssue, AnalyzerResult, ReviewFile } from '@/types/codeReview';
import { generateIssueId } from '@/types/codeReview';

// ============================================================================
// SECURITY PATTERNS
// ============================================================================

interface SecurityPattern {
  pattern: RegExp;
  category: 'security_xss' | 'security_injection' | 'security_eval';
  severity: 'critical' | 'high' | 'medium';
  message: string;
  suggestion: string;
  autoFixable: boolean;
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // XSS Vulnerabilities
  {
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/g,
    category: 'security_xss',
    severity: 'high',
    message: 'Using dangerouslySetInnerHTML can lead to XSS attacks',
    suggestion: 'Sanitize HTML content using DOMPurify or a similar library before rendering',
    autoFixable: false,
  },
  {
    pattern: /\.innerHTML\s*=\s*(?!['"`])/g,
    category: 'security_xss',
    severity: 'critical',
    message: 'Direct innerHTML assignment with dynamic content is vulnerable to XSS',
    suggestion: 'Use textContent for text, or sanitize HTML before assignment',
    autoFixable: false,
  },
  {
    pattern: /document\.write\s*\(/g,
    category: 'security_xss',
    severity: 'high',
    message: 'document.write can be exploited for XSS attacks',
    suggestion: 'Use DOM manipulation methods instead (createElement, appendChild)',
    autoFixable: false,
  },

  // Code Injection
  {
    pattern: /\beval\s*\(/g,
    category: 'security_eval',
    severity: 'critical',
    message: 'eval() executes arbitrary code and is a security risk',
    suggestion:
      'Avoid eval(). Use JSON.parse() for JSON, or refactor to avoid dynamic code execution',
    autoFixable: false,
  },
  {
    pattern: /new\s+Function\s*\(/g,
    category: 'security_eval',
    severity: 'critical',
    message: 'Function constructor can execute arbitrary code',
    suggestion: 'Avoid dynamic function creation. Use regular functions or arrow functions',
    autoFixable: false,
  },
  {
    pattern: /setTimeout\s*\(\s*['"`]/g,
    category: 'security_eval',
    severity: 'high',
    message: 'setTimeout with string argument can execute arbitrary code',
    suggestion: 'Pass a function reference instead of a string',
    autoFixable: true,
  },
  {
    pattern: /setInterval\s*\(\s*['"`]/g,
    category: 'security_eval',
    severity: 'high',
    message: 'setInterval with string argument can execute arbitrary code',
    suggestion: 'Pass a function reference instead of a string',
    autoFixable: true,
  },

  // SQL Injection patterns (for fullstack apps)
  {
    pattern: /`SELECT\s+.*\$\{/gi,
    category: 'security_injection',
    severity: 'critical',
    message: 'SQL query with template literal interpolation is vulnerable to injection',
    suggestion: 'Use parameterized queries or an ORM with proper escaping',
    autoFixable: false,
  },
  {
    pattern: /`INSERT\s+.*\$\{/gi,
    category: 'security_injection',
    severity: 'critical',
    message: 'SQL INSERT with template literal interpolation is vulnerable to injection',
    suggestion: 'Use parameterized queries or an ORM with proper escaping',
    autoFixable: false,
  },
  {
    pattern: /`UPDATE\s+.*\$\{/gi,
    category: 'security_injection',
    severity: 'critical',
    message: 'SQL UPDATE with template literal interpolation is vulnerable to injection',
    suggestion: 'Use parameterized queries or an ORM with proper escaping',
    autoFixable: false,
  },
  {
    pattern: /`DELETE\s+.*\$\{/gi,
    category: 'security_injection',
    severity: 'critical',
    message: 'SQL DELETE with template literal interpolation is vulnerable to injection',
    suggestion: 'Use parameterized queries or an ORM with proper escaping',
    autoFixable: false,
  },
  {
    pattern: /query\s*\(\s*`[^`]*\$\{/g,
    category: 'security_injection',
    severity: 'critical',
    message: 'Database query with string interpolation may be vulnerable to injection',
    suggestion: 'Use parameterized queries with placeholders',
    autoFixable: false,
  },

  // Insecure patterns
  {
    pattern: /(?:password|secret|api[_-]?key|token)\s*[:=]\s*['"`][^'"`]{8,}['"`]/gi,
    category: 'security_injection',
    severity: 'high',
    message: 'Potential hardcoded secret or credential detected',
    suggestion: 'Move secrets to environment variables (process.env)',
    autoFixable: false,
  },

  // React-specific XSS
  {
    pattern: /href\s*=\s*\{[^}]*\+/g,
    category: 'security_xss',
    severity: 'medium',
    message: 'Dynamic href with concatenation may allow javascript: protocol injection',
    suggestion: 'Validate URLs and ensure they start with safe protocols (http, https)',
    autoFixable: false,
  },
];

// ============================================================================
// ANALYZER IMPLEMENTATION
// ============================================================================

/**
 * Analyze a single file for security issues
 */
function analyzeFile(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  for (const pattern of SECURITY_PATTERNS) {
    // Reset regex state
    pattern.pattern.lastIndex = 0;

    let match;
    while ((match = pattern.pattern.exec(file.content)) !== null) {
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
 * Check for unescaped user input patterns
 */
function checkUnescapedInput(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Pattern: Using user input directly in JSX without sanitization
  // Look for patterns like: <div>{userInput}</div> where userInput comes from props/state
  const _jsxInterpolationPattern = /\{([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\}/g;

  // Check if the file has any user input sources
  const hasFormInput = /(?:onChange|onInput|value)\s*=\s*\{/g.test(file.content);
  const hasUrlParams = /useSearchParams|useParams|query\./g.test(file.content);
  const hasUserInput = hasFormInput || hasUrlParams;

  if (!hasUserInput) {
    return issues;
  }

  // Look for dangerous rendering patterns
  const dangerousPatterns = [
    {
      pattern: /<[a-z]+[^>]*>\s*\{[^}]*(?:input|query|param|search|user)[^}]*\}/gi,
      message: 'User input rendered directly in JSX may need sanitization',
    },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(file.content)) !== null) {
      const beforeMatch = file.content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const line = lines[lineNumber - 1] || '';

      issues.push({
        id: generateIssueId('security_xss', file.path, lineNumber),
        category: 'security_xss',
        severity: 'medium',
        file: file.path,
        line: lineNumber,
        message,
        code: line.trim(),
        suggestion: 'Consider sanitizing user input before rendering',
        autoFixable: false,
      });
    }
  }

  return issues;
}

/**
 * Main security analyzer function
 */
export async function analyzeSecurityIssues(files: ReviewFile[]): Promise<AnalyzerResult> {
  const startTime = Date.now();
  const allIssues: ReviewIssue[] = [];

  for (const file of files) {
    // Skip non-code files
    if (!file.path.match(/\.(tsx?|jsx?|mjs|cjs)$/)) {
      continue;
    }

    // Run pattern-based analysis
    const patternIssues = analyzeFile(file);
    allIssues.push(...patternIssues);

    // Check for unescaped user input
    const inputIssues = checkUnescapedInput(file);
    allIssues.push(...inputIssues);
  }

  // Calculate score
  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const highCount = allIssues.filter((i) => i.severity === 'high').length;
  const mediumCount = allIssues.filter((i) => i.severity === 'medium').length;

  // Score calculation: start at 100, deduct for issues
  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score = Math.max(0, score);

  return {
    analyzerName: 'SecurityAnalyzer',
    issues: allIssues,
    score,
    durationMs: Date.now() - startTime,
  };
}

const SecurityAnalyzer = { analyzeSecurityIssues };
export default SecurityAnalyzer;
