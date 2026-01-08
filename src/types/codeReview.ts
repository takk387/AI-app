/**
 * Code Review System - Type Definitions
 *
 * Automatic code reviewer that runs after each phase and at build completion.
 * Detects issues, auto-fixes safe problems, and verifies requirements.
 */

// ============================================================================
// ISSUE CATEGORIES
// ============================================================================

/**
 * Categories of issues the code reviewer can detect
 */
export type IssueCategory =
  | 'missing_feature' // Semantic - feature from requirements not implemented
  | 'syntax_error' // TypeScript/JavaScript syntax issues
  | 'type_error' // TypeScript type issues
  | 'security_xss' // XSS vulnerabilities (dangerouslySetInnerHTML, etc.)
  | 'security_injection' // SQL/Code injection risks
  | 'security_eval' // Use of eval() or Function()
  | 'react_hooks_rule' // Hooks called conditionally or in wrong order
  | 'react_missing_key' // Missing key prop in lists
  | 'react_missing_deps' // Missing useEffect/useCallback dependencies
  | 'react_invalid_hook' // Invalid hook usage (outside component)
  | 'performance_rerender' // Unnecessary re-renders (inline objects/functions)
  | 'performance_memo' // Missing memoization opportunities
  | 'performance_expensive' // Expensive operations in render
  | 'accessibility' // a11y issues (missing alt, aria labels, etc.)
  | 'import_unused' // Unused imports
  | 'import_missing' // Missing required imports
  | 'logic_warning'; // Logic consistency warnings (soft)

/**
 * Severity levels for issues
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Review strictness levels
 */
export type ReviewStrictness = 'relaxed' | 'standard' | 'strict';

// ============================================================================
// REVIEW ISSUES
// ============================================================================

/**
 * A single issue detected during code review
 */
export interface ReviewIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  code?: string; // The problematic code snippet
  suggestion?: string; // How to fix it
  autoFixable: boolean;
  requirementRef?: string; // Which requirement this relates to (for missing_feature)
}

/**
 * A fix that was applied automatically
 */
export interface AppliedFix {
  issueId: string;
  file: string;
  line?: number;
  beforeCode: string;
  afterCode: string;
  description: string;
  category: IssueCategory;
  functionalityPreserved: boolean;
}

// ============================================================================
// QUALITY SCORES
// ============================================================================

/**
 * Individual category scores
 */
export interface CategoryScores {
  syntax: number; // 0-100
  security: number; // 0-100
  bestPractices: number; // 0-100 (React rules, hooks, etc.)
  performance: number; // 0-100
  accessibility: number; // 0-100
  requirements?: number; // 0-100 (only in comprehensive review)
  logic?: number; // 0-100 (logic consistency)
}

/**
 * Compact quality report for UI display
 */
export interface QualityReport {
  timestamp: string;
  reviewType: 'light' | 'comprehensive';
  phaseNumber?: number;
  phaseName?: string;

  // Summary counts
  totalIssues: number;
  fixedIssues: number;
  remainingIssues: number;

  // Issues by category
  issuesByCategory: Partial<Record<IssueCategory, number>>;

  // Issues by severity
  issuesBySeverity: Record<IssueSeverity, number>;

  // Scores
  scores: CategoryScores;
  overallScore: number; // 0-100 weighted average

  // Status
  passed: boolean; // True if overallScore >= 70 and no critical issues

  // Details
  issues: ReviewIssue[]; // Only unfixed issues
  fixes: AppliedFix[]; // Applied auto-fixes

  // Validation pipeline status
  validationComplete: boolean;
  reviewComplete: boolean;

  // Duration
  durationMs: number;
}

// ============================================================================
// PIPELINE STATUS
// ============================================================================

/**
 * Status of the quality check pipeline
 */
export type PipelineStep = 'idle' | 'validating' | 'reviewing' | 'fixing' | 'complete' | 'error';

/**
 * Quality pipeline state for UI
 */
export interface QualityPipelineState {
  currentStep: PipelineStep;
  validationStatus: 'pending' | 'running' | 'passed' | 'failed';
  reviewStatus: 'pending' | 'running' | 'passed' | 'warning' | 'failed';
  fixStatus: 'pending' | 'running' | 'complete' | 'skipped';
  progress: number; // 0-100
  currentFile?: string;
  error?: string;
}

// ============================================================================
// REVIEW CONTEXT
// ============================================================================

/**
 * Context for phase-level review
 */
export interface PhaseReviewContext {
  phaseNumber: number;
  phaseName: string;
  features?: string[];
  expectedFeatures?: string[];
  previousPhaseFeatures?: string[];
}

/**
 * Context for comprehensive review (end of build)
 */
export interface ComprehensiveReviewContext {
  /** Original requirements from user conversation */
  originalRequirements?: string;
  /** Features expected to be implemented */
  expectedFeatures?: string[];
  /** All features with metadata */
  allFeatures: Array<{
    name: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  technicalRequirements: {
    needsAuth?: boolean;
    authType?: string;
    needsDatabase?: boolean;
    databaseType?: string;
    needsRealtime?: boolean;
  };
  implementedFeatures?: string[];
  apiContracts?: Array<{
    endpoint: string;
    method: string;
    authentication: boolean;
  }>;
}

/**
 * File to be reviewed
 */
export interface ReviewFile {
  path: string;
  content: string;
  language?: string;
  modifiedInPhase?: number;
  isNew?: boolean;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Request body for /api/ai-builder/review
 */
export interface ReviewRequest {
  reviewType: 'light' | 'comprehensive';
  files: ReviewFile[];
  requirements?: ComprehensiveReviewContext;
  phaseContext?: PhaseReviewContext;
  strictness?: ReviewStrictness;
  enableLogicAnalysis?: boolean;
}

/**
 * Response from /api/ai-builder/review
 */
export interface ReviewResponse {
  success: boolean;
  issues: ReviewIssue[];
  fixes: AppliedFix[];
  report: QualityReport;
  modifiedFiles?: ReviewFile[];
  error?: string;
}

// ============================================================================
// ANALYZER TYPES
// ============================================================================

/**
 * Result from a single analyzer
 */
export interface AnalyzerResult {
  analyzerName: string;
  issues: ReviewIssue[];
  score: number; // 0-100
  durationMs: number;
}

/**
 * Configuration for analyzers based on strictness
 */
export interface AnalyzerConfig {
  strictness: ReviewStrictness;
  enabledCategories: IssueCategory[];
  severityThreshold: IssueSeverity;
}

// ============================================================================
// PATTERN TRACKING
// ============================================================================

/**
 * Tracked pattern for feeding back into prompts
 */
export interface TrackedPattern {
  category: IssueCategory;
  pattern: string;
  occurrences: number;
  lastSeen: string;
  autoFixSuccess: number;
  autoFixFailure: number;
}

/**
 * Pattern cache for prompt injection
 */
export interface PatternCache {
  patterns: TrackedPattern[];
  lastUpdated: string;
  totalIssuesTracked: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get severity weight for score calculation
 */
export function getSeverityWeight(severity: IssueSeverity): number {
  switch (severity) {
    case 'critical':
      return 25;
    case 'high':
      return 15;
    case 'medium':
      return 8;
    case 'low':
      return 3;
  }
}

/**
 * Calculate overall score from issues
 */
export function calculateScore(issues: ReviewIssue[], maxPenalty: number = 100): number {
  const totalPenalty = issues.reduce((sum, issue) => sum + getSeverityWeight(issue.severity), 0);
  return Math.max(0, maxPenalty - totalPenalty);
}

/**
 * Check if issues pass the quality threshold
 */
export function passesQualityCheck(
  report: QualityReport,
  minScore: number = 70
): { passed: boolean; reason?: string } {
  if (report.issuesBySeverity.critical > 0) {
    return { passed: false, reason: `${report.issuesBySeverity.critical} critical issue(s) found` };
  }
  if (report.overallScore < minScore) {
    return { passed: false, reason: `Score ${report.overallScore} below threshold ${minScore}` };
  }
  return { passed: true };
}

/**
 * Get enabled categories based on strictness
 */
export function getEnabledCategories(strictness: ReviewStrictness): IssueCategory[] {
  const critical: IssueCategory[] = [
    'syntax_error',
    'type_error',
    'security_xss',
    'security_injection',
    'security_eval',
    'react_hooks_rule',
    'react_invalid_hook',
  ];

  const standard: IssueCategory[] = [
    ...critical,
    'react_missing_key',
    'react_missing_deps',
    'performance_rerender',
    'import_missing',
    'logic_warning',
  ];

  const strict: IssueCategory[] = [
    ...standard,
    'performance_memo',
    'performance_expensive',
    'accessibility',
    'import_unused',
    'missing_feature',
    'logic_warning',
  ];

  switch (strictness) {
    case 'relaxed':
      return critical;
    case 'standard':
      return standard;
    case 'strict':
      return strict;
  }
}

/**
 * Generate a unique issue ID
 */
export function generateIssueId(category: IssueCategory, file: string, line?: number): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  const lineStr = line ? `-L${line}` : '';
  return `${category}${lineStr}-${timestamp}-${random}`;
}
