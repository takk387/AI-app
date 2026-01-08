'use client';

/**
 * Logic Consistency Analyzer
 *
 * Uses Claude AI to perform specialized logic analysis:
 * - Identify logical contradictions (e.g. off-by-one errors)
 * - Check for edge cases
 * - Verify state consistency
 * - Ensure type logic aligns with requirements
 *
 * DESIGNED AS A SOFT WARNING SYSTEM.
 * Issues are categorized as 'logic_warning' with 'medium' or 'low' severity.
 */

import type { ReviewIssue, ComprehensiveReviewContext, AnalyzerResult } from '@/types/codeReview';

// ============================================================================
// TYPES
// ============================================================================

export interface LogicAnalysisResult extends AnalyzerResult {
  issues: ReviewIssue[];
}

interface AnalysisFile {
  path: string;
  content: string;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildLogicAnalysisPrompt(
  files: AnalysisFile[],
  context: ComprehensiveReviewContext
): string {
  const fileList = files.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');

  const requirements = context.originalRequirements
    ? `## Original Requirements\n${context.originalRequirements}\n`
    : '';

  const features = context.expectedFeatures?.length
    ? `## Expected Features\n${context.expectedFeatures.map((f) => `- ${f}`).join('\n')}\n`
    : '';

  return `You are a Logic Consistency Analyzer. Your job is to find subtle logical contradictions and edge cases in the code.

${requirements}
${features}

## Code Files to Review
${fileList}

## Your Task
Analyze the code for LOGICAL INCONSISTENCIES. Do NOT report syntax errors or missing features (those are handled elsewhere).
Focus on:
1. **Contradictions:** Code logic that contradicts the requirements (e.g. "User must be 18+" but code checks \`age > 21\`).
2. **Edge Cases:** Potential crashes or bad states (e.g. accessing array index without length check, off-by-one errors in loops).
3. **State Inconsistency:** React state updates that might race or be overwritten incorrectly.
4. **Type Logic:** Checking for null on non-nullable types or vice versa.

## Output Format (JSON Only)
Respond with a JSON object.
IMPORTANT: All issues must be category "logic_warning". Severity must be "medium" or "low" (SOFT WARNINGS ONLY).

{
  "issues": [
    {
      "category": "logic_warning",
      "severity": "medium", 
      "file": "path/to/file.tsx",
      "line": 42,
      "message": "Potential off-by-one error: loop condition should be < not <=",
      "suggestion": "Change <= to <"
    }
  ]
}

If no logical issues are found, return { "issues": [] }.
`;
}

// ============================================================================
// ANALYZER
// ============================================================================

/**
 * Perform logic consistency analysis using Claude AI
 */
export async function analyzeLogicConsistency(
  files: AnalysisFile[],
  context: ComprehensiveReviewContext
): Promise<LogicAnalysisResult> {
  const startTime = Date.now();

  try {
    const prompt = buildLogicAnalysisPrompt(files, context);

    // Reuse the existing semantic analysis endpoint as it is a generic AI proxy
    const response = await fetch('/api/ai-builder/analyze-semantic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.error('Logic analysis failed:', response.statusText);
      return {
        analyzerName: 'LogicConsistency',
        issues: [],
        score: 100,
        durationMs: Date.now() - startTime,
      };
    }

    const data = await response.json();

    if (!data.success || !data.analysis) {
      return {
        analyzerName: 'LogicConsistency',
        issues: [],
        score: 100,
        durationMs: Date.now() - startTime,
      };
    }

    // Parse response
    const analysis = typeof data.analysis === 'string' ? JSON.parse(data.analysis) : data.analysis;
    const issues: ReviewIssue[] = [];

    if (Array.isArray(analysis.issues)) {
      for (const issue of analysis.issues) {
        issues.push({
          id: `logic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          category: 'logic_warning', // Enforce category
          severity: ['medium', 'low'].includes(issue.severity) ? issue.severity : 'medium', // Enforce soft severity
          file: issue.file || files[0]?.path || 'unknown',
          line: issue.line,
          message: issue.message || 'Logic inconsistency detected',
          suggestion: issue.suggestion,
          autoFixable: false,
        });
      }
    }

    // Calculate a score (logic issues reduce score but don't fail build)
    const score = Math.max(0, 100 - issues.length * 5);

    return {
      analyzerName: 'LogicConsistency',
      issues,
      score,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Logic consistency analysis error:', error);
    return {
      analyzerName: 'LogicConsistency',
      issues: [],
      score: 100,
      durationMs: Date.now() - startTime,
    };
  }
}
