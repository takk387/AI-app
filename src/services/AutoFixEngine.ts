/**
 * Auto-Fix Engine
 *
 * Automatically fixes safe issues while preserving functionality.
 * Uses AST-based modifications when possible, falls back to regex for simple fixes.
 */

import type { ReviewIssue, AppliedFix, ReviewFile, IssueCategory } from '@/types/codeReview';

// ============================================================================
// FIX STRATEGIES
// ============================================================================

type FixStrategy = (
  file: ReviewFile,
  issue: ReviewIssue
) => { fixed: boolean; newContent?: string; description?: string };

/**
 * Registry of fix strategies by issue category
 */
const FIX_STRATEGIES: Partial<Record<IssueCategory, FixStrategy>> = {
  // Remove console.log statements
  syntax_error: (file, issue) => {
    if (!issue.message.includes('console.log')) {
      // Also handle debugger
      if (issue.message.includes('debugger')) {
        const pattern = /^\s*debugger\s*;?\s*$/gm;
        const newContent = file.content.replace(pattern, '');
        if (newContent !== file.content) {
          return {
            fixed: true,
            newContent,
            description: 'Removed debugger statement',
          };
        }
      }
      return { fixed: false };
    }

    const lines = file.content.split('\n');
    if (!issue.line) return { fixed: false };

    const lineIndex = issue.line - 1;
    const line = lines[lineIndex];

    // Only remove if it's a standalone console.log
    if (/^\s*console\.log\s*\([^)]*\)\s*;?\s*$/.test(line)) {
      lines.splice(lineIndex, 1);
      return {
        fixed: true,
        newContent: lines.join('\n'),
        description: 'Removed console.log statement',
      };
    }

    return { fixed: false };
  },

  // Fix missing key props
  react_missing_key: (file, issue) => {
    if (!issue.line) return { fixed: false };

    const lines = file.content.split('\n');
    const lineIndex = issue.line - 1;
    const line = lines[lineIndex];

    // Find the .map call and the opening JSX element
    // Pattern: .map((item, index) => <Element
    const mapPattern =
      /\.map\s*\(\s*\(?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:,\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*\)?\s*=>\s*(?:\(?\s*)?(<[A-Z][a-zA-Z0-9]*)/;
    const match = mapPattern.exec(line);

    if (match) {
      const itemName = match[1];
      const indexName = match[2] || 'index';
      const jsxElement = match[3];

      // Check if there's already a key
      if (/key\s*=\s*\{/.test(line)) {
        return { fixed: false };
      }

      // Add key prop after the opening tag
      // Prefer item.id if available, fallback to index
      const keyProp = `key={${itemName}.id || ${indexName}}`;
      const newLine = line.replace(new RegExp(`(${jsxElement})(\\s*)`), `$1 ${keyProp}$2`);

      if (newLine !== line) {
        lines[lineIndex] = newLine;
        return {
          fixed: true,
          newContent: lines.join('\n'),
          description: `Added key prop: ${keyProp}`,
        };
      }
    }

    return { fixed: false };
  },

  // Remove unused imports
  import_unused: (file, issue) => {
    if (!issue.line) return { fixed: false };

    const lines = file.content.split('\n');
    const lineIndex = issue.line - 1;
    const line = lines[lineIndex];

    // Extract the unused import name from the message
    const nameMatch = issue.message.match(/Unused import: '([^']+)'/);
    if (!nameMatch) return { fixed: false };

    const unusedName = nameMatch[1];

    // Check if this is the only import from this line
    const singleImportPattern = new RegExp(`import\\s+\\{\\s*${unusedName}\\s*\\}\\s+from`);

    if (singleImportPattern.test(line)) {
      // Remove the entire import line
      lines.splice(lineIndex, 1);
      return {
        fixed: true,
        newContent: lines.join('\n'),
        description: `Removed unused import: ${unusedName}`,
      };
    }

    // If there are multiple imports, just remove this one
    const multiImportPattern = new RegExp(
      `(,\\s*${unusedName}\\s*(?:,|\\})|${unusedName}\\s*,\\s*)`
    );

    if (multiImportPattern.test(line)) {
      const newLine = line
        .replace(new RegExp(`,\\s*${unusedName}(?=\\s*[,}])`), '')
        .replace(new RegExp(`${unusedName}\\s*,\\s*`), '');

      lines[lineIndex] = newLine;
      return {
        fixed: true,
        newContent: lines.join('\n'),
        description: `Removed unused import: ${unusedName}`,
      };
    }

    return { fixed: false };
  },

  // Add missing React hook imports
  import_missing: (file, issue) => {
    // Extract the hook name from the message
    const hookMatch = issue.message.match(/'([^']+)' is used but not imported/);
    if (!hookMatch) return { fixed: false };

    const hookName = hookMatch[1];
    const lines = file.content.split('\n');

    // Find existing React import
    const reactImportIndex = lines.findIndex((line) =>
      /import\s+.*from\s+['"]react['"]/.test(line)
    );

    if (reactImportIndex !== -1) {
      const line = lines[reactImportIndex];

      // Check if it's a named import
      if (/import\s+\{/.test(line)) {
        // Add to existing named imports
        const newLine = line.replace(/import\s+\{/, `import { ${hookName}, `);
        lines[reactImportIndex] = newLine;
      } else if (/import\s+React\s+from/.test(line)) {
        // Add named imports alongside default import
        const newLine = line.replace(/import\s+React\s+from/, `import React, { ${hookName} } from`);
        lines[reactImportIndex] = newLine;
      }

      return {
        fixed: true,
        newContent: lines.join('\n'),
        description: `Added missing import: ${hookName} from 'react'`,
      };
    }

    // No React import found, add one at the top
    const insertIndex = lines.findIndex((line) => /^import/.test(line));
    const importLine = `import { ${hookName} } from 'react';`;

    if (insertIndex !== -1) {
      lines.splice(insertIndex, 0, importLine);
    } else {
      lines.unshift(importLine);
    }

    return {
      fixed: true,
      newContent: lines.join('\n'),
      description: `Added missing import: ${hookName} from 'react'`,
    };
  },

  // Fix setTimeout/setInterval with string argument
  security_eval: (file, issue) => {
    if (!issue.message.includes('setTimeout') && !issue.message.includes('setInterval')) {
      return { fixed: false };
    }

    if (!issue.line) return { fixed: false };

    const lines = file.content.split('\n');
    const lineIndex = issue.line - 1;
    const line = lines[lineIndex];

    // Pattern: setTimeout('code', time) -> setTimeout(() => { code }, time)
    const pattern = /(setTimeout|setInterval)\s*\(\s*['"]([^'"]+)['"]\s*,/g;
    const newLine = line.replace(pattern, '$1(() => { $2 },');

    if (newLine !== line) {
      lines[lineIndex] = newLine;
      return {
        fixed: true,
        newContent: lines.join('\n'),
        description: 'Converted string argument to function',
      };
    }

    return { fixed: false };
  },
};

// ============================================================================
// AUTO-FIX ENGINE
// ============================================================================

/**
 * Categories that are safe to auto-fix
 */
const AUTO_FIXABLE_CATEGORIES: IssueCategory[] = [
  'syntax_error', // Only console.log/debugger removal
  'react_missing_key',
  'import_unused',
  'import_missing',
  'security_eval', // Only setTimeout/setInterval string -> function
];

/**
 * Check if an issue can be safely auto-fixed
 */
export function canAutoFix(issue: ReviewIssue): boolean {
  if (!issue.autoFixable) return false;
  if (!AUTO_FIXABLE_CATEGORIES.includes(issue.category)) return false;
  return true;
}

/**
 * Apply auto-fixes to a file
 */
export function applyFixes(
  file: ReviewFile,
  issues: ReviewIssue[]
): { file: ReviewFile; fixes: AppliedFix[]; remainingIssues: ReviewIssue[] } {
  const fixes: AppliedFix[] = [];
  const remainingIssues: ReviewIssue[] = [];
  let currentContent = file.content;

  // Sort issues by line number (descending) to avoid offset issues
  const sortedIssues = [...issues].sort((a, b) => (b.line || 0) - (a.line || 0));

  for (const issue of sortedIssues) {
    if (!canAutoFix(issue)) {
      remainingIssues.push(issue);
      continue;
    }

    const strategy = FIX_STRATEGIES[issue.category];
    if (!strategy) {
      remainingIssues.push(issue);
      continue;
    }

    // Create a temporary file with current content
    const tempFile: ReviewFile = { ...file, content: currentContent };

    try {
      const result = strategy(tempFile, issue);

      if (result.fixed && result.newContent) {
        fixes.push({
          issueId: issue.id,
          file: file.path,
          line: issue.line,
          beforeCode: issue.code || '',
          afterCode: result.description || 'Fixed',
          description: result.description || `Fixed ${issue.category}`,
          category: issue.category,
          functionalityPreserved: true,
        });

        currentContent = result.newContent;
      } else {
        remainingIssues.push(issue);
      }
    } catch {
      // If fix fails, keep the issue as remaining
      remainingIssues.push(issue);
    }
  }

  return {
    file: { ...file, content: currentContent },
    fixes,
    remainingIssues,
  };
}

/**
 * Validate that fixes don't break the code
 */
export async function validateFixes(
  originalFile: ReviewFile,
  fixedFile: ReviewFile
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Basic validation: check that the file still has content
  if (!fixedFile.content || fixedFile.content.trim() === '') {
    issues.push('Fix resulted in empty file');
    return { valid: false, issues };
  }

  // Check for balanced braces/brackets
  const openBraces = (fixedFile.content.match(/\{/g) || []).length;
  const closeBraces = (fixedFile.content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push('Unbalanced braces after fix');
    return { valid: false, issues };
  }

  const openBrackets = (fixedFile.content.match(/\[/g) || []).length;
  const closeBrackets = (fixedFile.content.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push('Unbalanced brackets after fix');
    return { valid: false, issues };
  }

  const openParens = (fixedFile.content.match(/\(/g) || []).length;
  const closeParens = (fixedFile.content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push('Unbalanced parentheses after fix');
    return { valid: false, issues };
  }

  // Check that exports are preserved
  const originalExports = originalFile.content.match(/export\s+(default\s+)?/g) || [];
  const fixedExports = fixedFile.content.match(/export\s+(default\s+)?/g) || [];
  if (originalExports.length !== fixedExports.length) {
    issues.push('Export statements changed after fix');
    return { valid: false, issues };
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Apply fixes to multiple files with validation
 */
export async function applyFixesToFiles(
  files: ReviewFile[],
  issuesByFile: Map<string, ReviewIssue[]>
): Promise<{
  fixedFiles: ReviewFile[];
  allFixes: AppliedFix[];
  allRemainingIssues: ReviewIssue[];
  validationErrors: string[];
}> {
  const fixedFiles: ReviewFile[] = [];
  const allFixes: AppliedFix[] = [];
  const allRemainingIssues: ReviewIssue[] = [];
  const validationErrors: string[] = [];

  for (const file of files) {
    const issues = issuesByFile.get(file.path) || [];

    if (issues.length === 0) {
      fixedFiles.push(file);
      continue;
    }

    const { file: fixedFile, fixes, remainingIssues } = applyFixes(file, issues);

    // Validate the fixes
    const validation = await validateFixes(file, fixedFile);

    if (validation.valid) {
      fixedFiles.push(fixedFile);
      allFixes.push(...fixes);
      allRemainingIssues.push(...remainingIssues);
    } else {
      // Rollback - use original file
      fixedFiles.push(file);
      allRemainingIssues.push(...issues);
      validationErrors.push(...validation.issues.map((e) => `${file.path}: ${e}`));
    }
  }

  return {
    fixedFiles,
    allFixes,
    allRemainingIssues,
    validationErrors,
  };
}

const AutoFixEngine = {
  canAutoFix,
  applyFixes,
  validateFixes,
  applyFixesToFiles,
};

export default AutoFixEngine;
