/**
 * React Analyzer
 *
 * Detects React-specific issues:
 * - Hooks rules violations (conditional hooks, wrong order)
 * - Missing key props in lists
 * - Missing useEffect/useCallback dependencies
 * - Invalid hook usage (outside components)
 */

import type { ReviewIssue, AnalyzerResult, ReviewFile } from '@/types/codeReview';
import { generateIssueId } from '@/types/codeReview';

// ============================================================================
// REACT PATTERNS
// ============================================================================

interface _ReactPattern {
  pattern: RegExp;
  category: 'react_hooks_rule' | 'react_missing_key' | 'react_missing_deps' | 'react_invalid_hook';
  severity: 'critical' | 'high' | 'medium';
  message: string;
  suggestion: string;
  autoFixable: boolean;
  contextCheck?: (line: string, fullContent: string, lineIndex: number) => boolean;
}

// Hook names for detection
const HOOK_NAMES = [
  'useState',
  'useEffect',
  'useContext',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useImperativeHandle',
  'useLayoutEffect',
  'useDebugValue',
  'useDeferredValue',
  'useTransition',
  'useId',
  'useSyncExternalStore',
  'useInsertionEffect',
  // Common custom hooks
  'useQuery',
  'useMutation',
  'useForm',
  'useRouter',
  'usePathname',
  'useSearchParams',
  'useParams',
];

const HOOK_PATTERN = new RegExp(`\\b(${HOOK_NAMES.join('|')})\\s*\\(`, 'g');

// ============================================================================
// ANALYZER IMPLEMENTATION
// ============================================================================

/**
 * Check for hooks called inside conditions
 */
function checkConditionalHooks(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Track if we're inside a conditional block
  let conditionalDepth = 0;
  let _conditionalStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for conditional block starts
    if (/^\s*if\s*\(/.test(line) || /\?\s*$/.test(line) || /&&\s*$/.test(line)) {
      if (conditionalDepth === 0) {
        _conditionalStartLine = lineNumber;
      }
      conditionalDepth++;
    }

    // Check for block ends
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    conditionalDepth = Math.max(0, conditionalDepth + openBraces - closeBraces);

    // Check for hooks inside conditionals
    if (conditionalDepth > 0) {
      HOOK_PATTERN.lastIndex = 0;
      const hookMatch = HOOK_PATTERN.exec(line);
      if (hookMatch) {
        issues.push({
          id: generateIssueId('react_hooks_rule', file.path, lineNumber),
          category: 'react_hooks_rule',
          severity: 'critical',
          file: file.path,
          line: lineNumber,
          message: `Hook '${hookMatch[1]}' is called conditionally. Hooks must be called in the same order every render.`,
          code: line.trim(),
          suggestion: 'Move the hook call outside the conditional block',
          autoFixable: false,
        });
      }
    }
  }

  return issues;
}

/**
 * Check for hooks inside loops
 */
function checkHooksInLoops(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  let loopDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for loop starts
    if (
      /\b(for|while|do)\s*[(\{]/.test(line) ||
      /\.(?:map|forEach|filter|reduce)\s*\(/.test(line)
    ) {
      loopDepth++;
    }

    // Check for hooks inside loops
    if (loopDepth > 0) {
      HOOK_PATTERN.lastIndex = 0;
      const hookMatch = HOOK_PATTERN.exec(line);
      if (hookMatch) {
        // Exception: useCallback/useMemo inside map for creating handlers is sometimes OK
        if (!/(useCallback|useMemo)/.test(hookMatch[1])) {
          issues.push({
            id: generateIssueId('react_hooks_rule', file.path, lineNumber),
            category: 'react_hooks_rule',
            severity: 'critical',
            file: file.path,
            line: lineNumber,
            message: `Hook '${hookMatch[1]}' is called inside a loop. Hooks must be called at the top level.`,
            code: line.trim(),
            suggestion: 'Move the hook call outside the loop',
            autoFixable: false,
          });
        }
      }
    }

    // Track closing braces for loops
    if (/\}/.test(line) && loopDepth > 0) {
      loopDepth--;
    }
  }

  return issues;
}

/**
 * Check for missing key props in map
 */
function checkMissingKeys(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Pattern: .map( followed by JSX without key
  const _mapPattern =
    /\.map\s*\(\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*(?:\(?\s*<|\{[^}]*return\s*<)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check if line has .map with JSX return
    if (/\.map\s*\(/.test(line)) {
      // Look at the next few lines for the JSX element
      const contextLines = lines.slice(i, Math.min(i + 5, lines.length)).join('\n');

      // Check if there's a JSX element without key prop
      const hasMap = /\.map\s*\(/.test(contextLines);
      const hasJSX = /<[A-Z][a-zA-Z0-9]*|<[a-z]+/.test(contextLines);
      const hasKey = /key\s*=\s*\{/.test(contextLines);

      if (hasMap && hasJSX && !hasKey) {
        issues.push({
          id: generateIssueId('react_missing_key', file.path, lineNumber),
          category: 'react_missing_key',
          severity: 'high',
          file: file.path,
          line: lineNumber,
          message: 'Missing "key" prop for element in .map() iteration',
          code: line.trim(),
          suggestion: 'Add a unique "key" prop to the element: key={item.id} or key={index}',
          autoFixable: true,
        });
      }
    }
  }

  return issues;
}

/**
 * Check for missing useEffect dependencies
 */
function checkMissingDependencies(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Find useEffect/useCallback/useMemo calls
  const hookWithDepsPattern =
    /\b(useEffect|useCallback|useMemo)\s*\(\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for hooks that take dependency arrays
    const hookMatch = hookWithDepsPattern.exec(line);
    if (hookMatch) {
      // Look for the closing of the hook call (find the dependency array or lack thereof)
      let depth = 0;
      let _foundDeps = false;
      let searchLine = i;

      // Search through the next lines to find the dependency array
      while (searchLine < Math.min(i + 20, lines.length)) {
        const searchContent = lines[searchLine];

        // Count parentheses
        for (const char of searchContent) {
          if (char === '(') depth++;
          if (char === ')') depth--;
        }

        // Check for dependency array pattern: , [
        if (/,\s*\[/.test(searchContent)) {
          _foundDeps = true;
          break;
        }

        // If we've closed all parentheses, stop
        if (depth <= 0) break;
        searchLine++;
      }

      // Check for empty dependency array when variables are used
      const contextLines = lines.slice(i, searchLine + 1).join('\n');
      const hasEmptyDeps = /,\s*\[\s*\]/.test(contextLines);

      if (hasEmptyDeps) {
        // Check if state/props are used inside
        const usesVariables = /\b(props\.|state\.|set[A-Z]|dispatch|navigate)\b/.test(contextLines);
        if (usesVariables) {
          issues.push({
            id: generateIssueId('react_missing_deps', file.path, lineNumber),
            category: 'react_missing_deps',
            severity: 'medium',
            file: file.path,
            line: lineNumber,
            message: `${hookMatch[1]} has an empty dependency array but uses variables that may need to be included`,
            code: line.trim(),
            suggestion: 'Review dependencies and add any used values to the dependency array',
            autoFixable: false,
          });
        }
      }

      hookWithDepsPattern.lastIndex = 0;
    }
  }

  return issues;
}

/**
 * Check for hooks called outside React components
 */
function checkHooksOutsideComponents(file: ReviewFile): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = file.content.split('\n');

  // Track if we're inside a component or custom hook
  let inComponent = false;
  let componentDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for component/hook function declaration
    const isComponentDecl =
      /^(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*|use[A-Z][a-zA-Z0-9]*)\s*[=(]/.test(
        line
      );

    if (isComponentDecl) {
      inComponent = true;
      componentDepth = 0;
    }

    // Track braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (inComponent) {
      componentDepth += openBraces - closeBraces;
      if (componentDepth <= 0) {
        inComponent = false;
      }
    }

    // Check for hooks outside components
    if (!inComponent) {
      HOOK_PATTERN.lastIndex = 0;
      const hookMatch = HOOK_PATTERN.exec(line);
      if (hookMatch) {
        // Check if this is a custom hook definition (use* at start of line)
        const isHookDefinition = /^(?:export\s+)?(?:function|const)\s+use[A-Z]/.test(line);
        if (!isHookDefinition) {
          issues.push({
            id: generateIssueId('react_invalid_hook', file.path, lineNumber),
            category: 'react_invalid_hook',
            severity: 'critical',
            file: file.path,
            line: lineNumber,
            message: `Hook '${hookMatch[1]}' is called outside a React function component or custom hook`,
            code: line.trim(),
            suggestion:
              'Hooks can only be called inside React function components or custom hooks (use* functions)',
            autoFixable: false,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Main React analyzer function
 */
export async function analyzeReactIssues(files: ReviewFile[]): Promise<AnalyzerResult> {
  const startTime = Date.now();
  const allIssues: ReviewIssue[] = [];

  for (const file of files) {
    // Only analyze React files
    if (!file.path.match(/\.(tsx|jsx)$/)) {
      continue;
    }

    // Run all React checks
    allIssues.push(...checkConditionalHooks(file));
    allIssues.push(...checkHooksInLoops(file));
    allIssues.push(...checkMissingKeys(file));
    allIssues.push(...checkMissingDependencies(file));
    allIssues.push(...checkHooksOutsideComponents(file));
  }

  // Deduplicate issues by file+line+category
  const seen = new Set<string>();
  const uniqueIssues = allIssues.filter((issue) => {
    const key = `${issue.file}:${issue.line}:${issue.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Calculate score
  const criticalCount = uniqueIssues.filter((i) => i.severity === 'critical').length;
  const highCount = uniqueIssues.filter((i) => i.severity === 'high').length;
  const mediumCount = uniqueIssues.filter((i) => i.severity === 'medium').length;

  let score = 100;
  score -= criticalCount * 25;
  score -= highCount * 15;
  score -= mediumCount * 8;
  score = Math.max(0, score);

  return {
    analyzerName: 'ReactAnalyzer',
    issues: uniqueIssues,
    score,
    durationMs: Date.now() - startTime,
  };
}

const ReactAnalyzer = { analyzeReactIssues };
export default ReactAnalyzer;
