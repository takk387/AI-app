'use client';

/**
 * Semantic Analyzer
 *
 * Uses Claude AI to perform deep semantic analysis:
 * - Verify requirements were implemented
 * - Check for logical errors
 * - Identify missing features from original discussion
 * - Ensure code matches agreed functionality
 */

import type { ReviewIssue, ComprehensiveReviewContext } from '@/types/codeReview';

// ============================================================================
// TYPES
// ============================================================================

export interface SemanticAnalysisResult {
  issues: ReviewIssue[];
  requirementsCoverage: RequirementsCoverage;
  suggestions: string[];
}

export interface RequirementsCoverage {
  totalRequirements: number;
  implementedCount: number;
  missingRequirements: string[];
  partiallyImplemented: string[];
  coveragePercent: number;
}

interface AnalysisFile {
  path: string;
  content: string;
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildSemanticAnalysisPrompt(
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

  const apiContracts = context.apiContracts?.length
    ? `## API Contracts\n${JSON.stringify(context.apiContracts, null, 2)}\n`
    : '';

  return `You are a code review expert. Analyze the following code files and verify they correctly implement the specified requirements.

${requirements}
${features}
${apiContracts}

## Code Files to Review
${fileList}

## Your Task
1. Check if all requirements and features are properly implemented
2. Identify any missing functionality
3. Find logical errors or bugs that could cause runtime issues
4. Check if the code matches the agreed API contracts
5. Identify any functionality that differs from what was specified

Respond with a JSON object in this exact format:
{
  "issues": [
    {
      "category": "missing_feature" | "logic_error" | "api_mismatch" | "incomplete_implementation",
      "severity": "critical" | "high" | "medium" | "low",
      "file": "path/to/file.tsx",
      "line": 42,
      "message": "Description of the issue",
      "requirementRef": "Which requirement this relates to (if applicable)"
    }
  ],
  "requirementsCoverage": {
    "totalRequirements": 5,
    "implementedCount": 4,
    "missingRequirements": ["Feature X not implemented"],
    "partiallyImplemented": ["Feature Y is incomplete - missing error handling"],
    "coveragePercent": 80
  },
  "suggestions": [
    "Consider adding input validation for...",
    "The error handling could be improved by..."
  ]
}

Only include actual issues found. If the code correctly implements all requirements, return empty arrays.
Be specific about file paths and line numbers when possible.`;
}

// ============================================================================
// ANALYZER
// ============================================================================

/**
 * Perform semantic analysis using Claude AI
 */
export async function analyzeSemantics(
  files: AnalysisFile[],
  context: ComprehensiveReviewContext,
  signal?: AbortSignal
): Promise<SemanticAnalysisResult> {
  // Skip if no requirements context provided
  if (
    !context.originalRequirements &&
    !context.expectedFeatures?.length &&
    !context.apiContracts?.length
  ) {
    return {
      issues: [],
      requirementsCoverage: {
        totalRequirements: 0,
        implementedCount: 0,
        missingRequirements: [],
        partiallyImplemented: [],
        coveragePercent: 100,
      },
      suggestions: [],
    };
  }

  try {
    const prompt = buildSemanticAnalysisPrompt(files, context);

    // Call the AI analysis endpoint
    const response = await fetch('/api/ai-builder/analyze-semantic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal,
    });

    if (!response.ok) {
      console.error('Semantic analysis failed:', response.statusText);
      return getDefaultResult();
    }

    const data = await response.json();

    if (!data.success || !data.analysis) {
      console.error('Invalid semantic analysis response');
      return getDefaultResult();
    }

    // Parse and validate the response
    const analysis = parseAnalysisResponse(data.analysis, files);

    return analysis;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error;
    }
    console.error('Semantic analysis error:', error);
    return getDefaultResult();
  }
}

/**
 * Parse and validate the AI response
 */
function parseAnalysisResponse(
  rawAnalysis: unknown,
  files: AnalysisFile[]
): SemanticAnalysisResult {
  const analysis = typeof rawAnalysis === 'string' ? JSON.parse(rawAnalysis) : rawAnalysis;

  // Validate and transform issues
  const issues: ReviewIssue[] = [];
  const _validFiles = new Set(files.map((f) => f.path));

  if (Array.isArray(analysis.issues)) {
    for (const issue of analysis.issues) {
      // Validate file path exists
      const filePath = issue.file || files[0]?.path || 'unknown';

      // Map category to our types
      const category = mapCategory(issue.category);
      const severity = validateSeverity(issue.severity);

      issues.push({
        id: `semantic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        category,
        severity,
        file: filePath,
        line: typeof issue.line === 'number' ? issue.line : undefined,
        message: issue.message || 'Semantic issue detected',
        autoFixable: false, // Semantic issues generally require manual review
        requirementRef: issue.requirementRef,
      });
    }
  }

  // Validate requirements coverage
  const requirementsCoverage = validateRequirementsCoverage(analysis.requirementsCoverage);

  // Validate suggestions
  const suggestions: string[] = [];
  if (Array.isArray(analysis.suggestions)) {
    for (const suggestion of analysis.suggestions) {
      if (typeof suggestion === 'string' && suggestion.trim()) {
        suggestions.push(suggestion.trim());
      }
    }
  }

  return {
    issues,
    requirementsCoverage,
    suggestions,
  };
}

/**
 * Map AI category to our IssueCategory type
 */
function mapCategory(category: string): ReviewIssue['category'] {
  const categoryMap: Record<string, ReviewIssue['category']> = {
    missing_feature: 'missing_feature',
    logic_error: 'syntax_error',
    api_mismatch: 'missing_feature',
    incomplete_implementation: 'missing_feature',
  };

  return categoryMap[category] || 'missing_feature';
}

/**
 * Validate severity value
 */
function validateSeverity(severity: string): ReviewIssue['severity'] {
  const validSeverities = ['critical', 'high', 'medium', 'low'];
  return validSeverities.includes(severity) ? (severity as ReviewIssue['severity']) : 'medium';
}

/**
 * Validate requirements coverage object
 */
function validateRequirementsCoverage(coverage: unknown): RequirementsCoverage {
  if (!coverage || typeof coverage !== 'object') {
    return {
      totalRequirements: 0,
      implementedCount: 0,
      missingRequirements: [],
      partiallyImplemented: [],
      coveragePercent: 100,
    };
  }

  const c = coverage as Record<string, unknown>;

  return {
    totalRequirements: typeof c.totalRequirements === 'number' ? c.totalRequirements : 0,
    implementedCount: typeof c.implementedCount === 'number' ? c.implementedCount : 0,
    missingRequirements: Array.isArray(c.missingRequirements)
      ? c.missingRequirements.filter((r) => typeof r === 'string')
      : [],
    partiallyImplemented: Array.isArray(c.partiallyImplemented)
      ? c.partiallyImplemented.filter((r) => typeof r === 'string')
      : [],
    coveragePercent: typeof c.coveragePercent === 'number' ? c.coveragePercent : 100,
  };
}

/**
 * Get default result for error cases
 */
function getDefaultResult(): SemanticAnalysisResult {
  return {
    issues: [],
    requirementsCoverage: {
      totalRequirements: 0,
      implementedCount: 0,
      missingRequirements: [],
      partiallyImplemented: [],
      coveragePercent: 100,
    },
    suggestions: [],
  };
}

export default analyzeSemantics;
