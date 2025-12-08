/**
 * Code Review Service
 *
 * Main orchestrator for the code review system.
 * Coordinates analyzers, manages auto-fixes, and generates quality reports.
 */

import type {
  ReviewFile,
  ReviewIssue,
  AppliedFix,
  QualityReport,
  QualityPipelineState,
  PhaseReviewContext,
  ComprehensiveReviewContext,
  ReviewStrictness,
  CategoryScores,
  AnalyzerResult,
  IssueCategory,
} from '@/types/codeReview';
import { getEnabledCategories, calculateScore, passesQualityCheck } from '@/types/codeReview';

// Dynamic imports for analyzers to avoid bundling tree-sitter in client
// SyntaxAnalyzer uses tree-sitter which is server-only
async function getAnalyzers() {
  const [
    { analyzeSyntaxIssues },
    { analyzeSecurityIssues },
    { analyzeReactIssues },
    { analyzePerformanceIssues },
    { analyzeSemantics },
    { applyFixesToFiles },
  ] = await Promise.all([
    import('./analyzers/SyntaxAnalyzer'),
    import('./analyzers/SecurityAnalyzer'),
    import('./analyzers/ReactAnalyzer'),
    import('./analyzers/PerformanceAnalyzer'),
    import('./analyzers/SemanticAnalyzer'),
    import('./AutoFixEngine'),
  ]);
  return {
    analyzeSyntaxIssues,
    analyzeSecurityIssues,
    analyzeReactIssues,
    analyzePerformanceIssues,
    analyzeSemantics,
    applyFixesToFiles,
  };
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

interface CodeReviewConfig {
  strictness: ReviewStrictness;
  enableAutoFix: boolean;
  maxIssuesPerFile: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: CodeReviewConfig = {
  strictness: 'standard',
  enableAutoFix: true,
  maxIssuesPerFile: 50,
  timeoutMs: 30000,
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let pipelineState: QualityPipelineState = {
  currentStep: 'idle',
  validationStatus: 'pending',
  reviewStatus: 'pending',
  fixStatus: 'pending',
  progress: 0,
};

/**
 * Get current pipeline state
 */
export function getPipelineState(): QualityPipelineState {
  return { ...pipelineState };
}

/**
 * Update pipeline state
 */
function updatePipelineState(updates: Partial<QualityPipelineState>): void {
  pipelineState = { ...pipelineState, ...updates };
}

/**
 * Reset pipeline state
 */
export function resetPipelineState(): void {
  pipelineState = {
    currentStep: 'idle',
    validationStatus: 'pending',
    reviewStatus: 'pending',
    fixStatus: 'pending',
    progress: 0,
  };
}

// ============================================================================
// LIGHT REVIEW (Per Phase)
// ============================================================================

/**
 * Perform a light review on files from a single phase.
 * Fast, local analysis only - no AI calls.
 */
export async function performLightReview(
  files: ReviewFile[],
  phaseContext?: PhaseReviewContext,
  config: Partial<CodeReviewConfig> = {}
): Promise<{
  issues: ReviewIssue[];
  fixes: AppliedFix[];
  report: QualityReport;
  modifiedFiles: ReviewFile[];
}> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const enabledCategories = getEnabledCategories(mergedConfig.strictness);

  updatePipelineState({
    currentStep: 'validating',
    validationStatus: 'running',
    progress: 0,
  });

  // Load analyzers dynamically to avoid bundling tree-sitter in client
  const {
    analyzeSyntaxIssues,
    analyzeSecurityIssues,
    analyzeReactIssues,
    analyzePerformanceIssues,
    applyFixesToFiles,
  } = await getAnalyzers();

  // Run analyzers in parallel
  const analyzerPromises: Promise<AnalyzerResult>[] = [
    analyzeSyntaxIssues(files),
    analyzeSecurityIssues(files),
    analyzeReactIssues(files),
  ];

  // Only run performance analyzer in standard/strict mode
  if (mergedConfig.strictness !== 'relaxed') {
    analyzerPromises.push(analyzePerformanceIssues(files));
  }

  updatePipelineState({ progress: 20 });

  const results = await Promise.all(analyzerPromises);

  updatePipelineState({
    currentStep: 'reviewing',
    validationStatus: 'passed',
    reviewStatus: 'running',
    progress: 50,
  });

  // Collect all issues
  let allIssues: ReviewIssue[] = [];
  for (const result of results) {
    allIssues.push(...result.issues);
  }

  // Filter by enabled categories
  allIssues = allIssues.filter((issue) => enabledCategories.includes(issue.category));

  // Limit issues per file
  const issuesByFile = new Map<string, ReviewIssue[]>();
  for (const issue of allIssues) {
    const fileIssues = issuesByFile.get(issue.file) || [];
    if (fileIssues.length < mergedConfig.maxIssuesPerFile) {
      fileIssues.push(issue);
      issuesByFile.set(issue.file, fileIssues);
    }
  }

  updatePipelineState({ progress: 70 });

  // Apply auto-fixes if enabled
  let fixes: AppliedFix[] = [];
  let modifiedFiles = files;
  let remainingIssues = allIssues;

  if (mergedConfig.enableAutoFix) {
    updatePipelineState({
      currentStep: 'fixing',
      reviewStatus: 'passed',
      fixStatus: 'running',
      progress: 80,
    });

    const fixResult = await applyFixesToFiles(files, issuesByFile);
    fixes = fixResult.allFixes;
    modifiedFiles = fixResult.fixedFiles;
    remainingIssues = fixResult.allRemainingIssues;
  }

  updatePipelineState({ progress: 90 });

  // Calculate scores
  const scores = calculateCategoryScores(remainingIssues, results);
  const overallScore = calculateOverallScore(scores);

  // Generate report
  const report = generateReport(
    'light',
    remainingIssues,
    fixes,
    scores,
    overallScore,
    Date.now() - startTime,
    phaseContext?.phaseNumber,
    phaseContext?.phaseName
  );

  updatePipelineState({
    currentStep: 'complete',
    fixStatus: mergedConfig.enableAutoFix ? 'complete' : 'skipped',
    reviewStatus: report.passed ? 'passed' : 'warning',
    progress: 100,
  });

  return {
    issues: remainingIssues,
    fixes,
    report,
    modifiedFiles,
  };
}

// ============================================================================
// COMPREHENSIVE REVIEW (End of Build)
// ============================================================================

/**
 * Perform a comprehensive review at the end of a build.
 * Includes all light review checks plus semantic analysis with Claude AI.
 */
export async function performComprehensiveReview(
  files: ReviewFile[],
  requirements: ComprehensiveReviewContext,
  config: Partial<CodeReviewConfig> = {}
): Promise<{
  issues: ReviewIssue[];
  fixes: AppliedFix[];
  report: QualityReport;
  modifiedFiles: ReviewFile[];
}> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  // First, run light review
  const lightResult = await performLightReview(files, undefined, {
    ...config,
    enableAutoFix: false, // Don't fix yet, we'll fix after semantic analysis
  });

  updatePipelineState({
    currentStep: 'reviewing',
    reviewStatus: 'running',
    progress: 60,
  });

  // Load analyzers dynamically
  const { analyzeSemantics, applyFixesToFiles } = await getAnalyzers();

  // Perform semantic analysis with Claude AI
  const semanticResult = await analyzeSemantics(
    files.map((f) => ({ path: f.path, content: f.content })),
    {
      originalRequirements: requirements.originalRequirements,
      expectedFeatures: requirements.allFeatures.map((f) => f.name),
      apiContracts: requirements.apiContracts,
      allFeatures: requirements.allFeatures,
      technicalRequirements: requirements.technicalRequirements,
    }
  );

  // Combine heuristic check with AI analysis for robustness
  const heuristicIssues = checkRequirementsImplemented(files, requirements);
  const semanticIssues = [...semanticResult.issues, ...heuristicIssues].filter(
    (issue, index, arr) => arr.findIndex((i) => i.message === issue.message) === index // Deduplicate
  );

  // Combine all issues
  const allIssues = [...lightResult.issues, ...semanticIssues];

  updatePipelineState({ progress: 80 });

  // Now apply fixes
  const issuesByFile = new Map<string, ReviewIssue[]>();
  for (const issue of allIssues) {
    const fileIssues = issuesByFile.get(issue.file) || [];
    fileIssues.push(issue);
    issuesByFile.set(issue.file, fileIssues);
  }

  let fixes: AppliedFix[] = [];
  let modifiedFiles = files;
  let remainingIssues = allIssues;

  if (mergedConfig.enableAutoFix) {
    updatePipelineState({
      currentStep: 'fixing',
      fixStatus: 'running',
      progress: 85,
    });

    const fixResult = await applyFixesToFiles(files, issuesByFile);
    fixes = fixResult.allFixes;
    modifiedFiles = fixResult.fixedFiles;
    remainingIssues = fixResult.allRemainingIssues;
  }

  updatePipelineState({ progress: 95 });

  // Calculate scores including requirements
  const scores = calculateCategoryScores(remainingIssues, []);
  scores.requirements = calculateRequirementsScore(requirements, semanticIssues);
  const overallScore = calculateOverallScore(scores);

  // Generate report
  const report = generateReport(
    'comprehensive',
    remainingIssues,
    fixes,
    scores,
    overallScore,
    Date.now() - startTime
  );

  updatePipelineState({
    currentStep: 'complete',
    fixStatus: mergedConfig.enableAutoFix ? 'complete' : 'skipped',
    reviewStatus: report.passed
      ? 'passed'
      : report.issuesBySeverity.critical > 0
        ? 'failed'
        : 'warning',
    progress: 100,
  });

  return {
    issues: remainingIssues,
    fixes,
    report,
    modifiedFiles,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if requirements are implemented (simple heuristic version)
 */
function checkRequirementsImplemented(
  files: ReviewFile[],
  requirements: ComprehensiveReviewContext
): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const allCode = files.map((f) => f.content).join('\n');

  for (const feature of requirements.allFeatures) {
    // Simple keyword matching - in a real implementation, this would use Claude AI
    const keywords = feature.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const found = keywords.some(
      (keyword) =>
        allCode.toLowerCase().includes(keyword) ||
        allCode.toLowerCase().includes(keyword.replace(/s$/, '')) // Handle plurals
    );

    if (!found && feature.priority === 'high') {
      issues.push({
        id: `missing-feature-${feature.name.replace(/\s+/g, '-').toLowerCase()}`,
        category: 'missing_feature',
        severity: 'high',
        file: 'project',
        message: `Feature "${feature.name}" may not be fully implemented`,
        suggestion: `Review implementation of: ${feature.description}`,
        autoFixable: false,
        requirementRef: feature.name,
      });
    }
  }

  // Check for auth if required
  if (requirements.technicalRequirements.needsAuth) {
    const hasAuth = /(?:signIn|signOut|login|logout|auth|session|useAuth|useSession)/i.test(
      allCode
    );
    if (!hasAuth) {
      issues.push({
        id: 'missing-auth',
        category: 'missing_feature',
        severity: 'critical',
        file: 'project',
        message: 'Authentication was required but may not be implemented',
        suggestion: 'Add authentication using NextAuth.js, Clerk, or similar',
        autoFixable: false,
        requirementRef: 'Authentication',
      });
    }
  }

  // Check for database if required
  if (requirements.technicalRequirements.needsDatabase) {
    const hasDb = /(?:prisma|supabase|mongodb|postgres|database|db\.|query|mutation)/i.test(
      allCode
    );
    if (!hasDb) {
      issues.push({
        id: 'missing-database',
        category: 'missing_feature',
        severity: 'high',
        file: 'project',
        message: 'Database was required but may not be implemented',
        suggestion: 'Add database integration using Prisma, Supabase, or similar',
        autoFixable: false,
        requirementRef: 'Database',
      });
    }
  }

  return issues;
}

/**
 * Calculate category scores from issues and analyzer results
 */
function calculateCategoryScores(
  issues: ReviewIssue[],
  _analyzerResults: AnalyzerResult[]
): CategoryScores {
  // Group issues by category
  const syntaxIssues = issues.filter((i) =>
    ['syntax_error', 'type_error', 'import_unused', 'import_missing'].includes(i.category)
  );
  const securityIssues = issues.filter((i) =>
    ['security_xss', 'security_injection', 'security_eval'].includes(i.category)
  );
  const bestPracticesIssues = issues.filter((i) =>
    ['react_hooks_rule', 'react_missing_key', 'react_missing_deps', 'react_invalid_hook'].includes(
      i.category
    )
  );
  const performanceIssues = issues.filter((i) =>
    ['performance_rerender', 'performance_memo', 'performance_expensive'].includes(i.category)
  );
  const accessibilityIssues = issues.filter((i) => i.category === 'accessibility');

  return {
    syntax: calculateScore(syntaxIssues),
    security: calculateScore(securityIssues),
    bestPractices: calculateScore(bestPracticesIssues),
    performance: calculateScore(performanceIssues),
    accessibility: calculateScore(accessibilityIssues),
  };
}

/**
 * Calculate overall score from category scores
 */
function calculateOverallScore(scores: CategoryScores): number {
  // Weighted average - security and syntax are more important
  const weights = {
    syntax: 0.25,
    security: 0.3,
    bestPractices: 0.2,
    performance: 0.15,
    accessibility: 0.1,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (category === 'requirements') continue; // Handle separately
    const weight = weights[category as keyof typeof weights] || 0.1;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  // Add requirements if present
  if (scores.requirements !== undefined) {
    weightedSum += scores.requirements * 0.15;
    totalWeight += 0.15;
  }

  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate requirements score
 */
function calculateRequirementsScore(
  requirements: ComprehensiveReviewContext,
  semanticIssues: ReviewIssue[]
): number {
  const totalFeatures = requirements.allFeatures.length;
  if (totalFeatures === 0) return 100;

  const missingFeatures = semanticIssues.filter((i) => i.category === 'missing_feature').length;

  const implementedRatio = (totalFeatures - missingFeatures) / totalFeatures;
  return Math.round(implementedRatio * 100);
}

/**
 * Generate a quality report
 */
function generateReport(
  reviewType: 'light' | 'comprehensive',
  issues: ReviewIssue[],
  fixes: AppliedFix[],
  scores: CategoryScores,
  overallScore: number,
  durationMs: number,
  phaseNumber?: number,
  phaseName?: string
): QualityReport {
  // Count by category
  const issuesByCategory: Partial<Record<IssueCategory, number>> = {};
  for (const issue of issues) {
    issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
  }

  // Count by severity
  const issuesBySeverity = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };

  const { passed } = passesQualityCheck({ overallScore, issuesBySeverity } as QualityReport);

  return {
    timestamp: new Date().toISOString(),
    reviewType,
    phaseNumber,
    phaseName,
    totalIssues: issues.length + fixes.length,
    fixedIssues: fixes.length,
    remainingIssues: issues.length,
    issuesByCategory,
    issuesBySeverity,
    scores,
    overallScore,
    passed,
    issues,
    fixes,
    validationComplete: true,
    reviewComplete: true,
    durationMs,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const CodeReviewService = {
  performLightReview,
  performComprehensiveReview,
  getPipelineState,
  resetPipelineState,
};

export default CodeReviewService;
