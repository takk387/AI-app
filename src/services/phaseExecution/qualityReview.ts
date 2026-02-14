/**
 * Quality Review Module
 *
 * Manages code quality reviews during and after phase execution:
 * - Per-phase light reviews
 * - Final comprehensive review with semantic analysis
 * - Report storage and retrieval
 */

import type { DynamicPhasePlan, AccumulatedFeature, APIContract } from '@/types/dynamicPhases';
import type { QualityReport, ReviewFile, ReviewStrictness } from '@/types/codeReview';
import { success, skipped, error, getFileLanguage, type OperationResult } from './executionUtils';

// ============================================================================
// LAZY CODE REVIEW SERVICE
// ============================================================================

// Dynamic import for CodeReviewService to avoid bundling tree-sitter in client
// This is imported lazily only when quality review methods are called (server-side only)
type CodeReviewServiceType = typeof import('../CodeReviewService');
let codeReviewService: CodeReviewServiceType | null = null;

async function getCodeReviewService(): Promise<CodeReviewServiceType> {
  if (!codeReviewService) {
    // webpackIgnore tells webpack to skip this import during bundling
    // This import will only be resolved at runtime on the server
    codeReviewService = await import(/* webpackIgnore: true */ '../CodeReviewService');
  }
  return codeReviewService;
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Extract raw file contents from generated code string
 */
function extractRawFilesFromCode(
  generatedCode: string
): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const filePattern = /===FILE:([^=]+)===\n([\s\S]*?)(?=\n===(?:FILE|DEPENDENCIES|END)===|$)/g;
  let match;

  while ((match = filePattern.exec(generatedCode)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return files;
}

/**
 * Rebuild accumulated code from raw files and plan metadata
 */
function rebuildAccumulatedCodeFromFiles(
  plan: DynamicPhasePlan,
  rawGeneratedFiles: Array<{ path: string; content: string }>
): string {
  let code = `===NAME===\n${plan.appName}\n`;
  code += `===DESCRIPTION===\n${plan.appDescription}\n`;
  code += `===APP_TYPE===\n${plan.concept.technical.needsDatabase ? 'FULL_STACK' : 'FRONTEND_ONLY'}\n`;

  for (const file of rawGeneratedFiles) {
    code += `===FILE:${file.path}===\n${file.content}\n`;
  }

  code += `===END===`;
  return code;
}

// ============================================================================
// QUALITY REVIEW INTERFACE
// ============================================================================

/**
 * State container passed from PhaseExecutionManager to quality review functions.
 * Holds references to the mutable state that reviews read and write.
 */
export interface QualityReviewState {
  plan: DynamicPhasePlan;
  reviewStrictness: ReviewStrictness;
  qualityReports: Map<number, QualityReport>;
  rawGeneratedFiles: Array<{ path: string; content: string }>;
  accumulatedCode: string;
  accumulatedFeaturesRich: AccumulatedFeature[];
  apiContracts: APIContract[];
}

/**
 * Run a light quality review on files from a specific phase.
 * Should be called after recordPhaseResult().
 *
 * @returns OperationResult with report and any modified files
 */
export async function runPhaseQualityReview(
  state: QualityReviewState,
  phaseNumber: number
): Promise<
  OperationResult<{
    report: QualityReport;
    modifiedFiles: ReviewFile[];
  }>
> {
  const phase = state.plan.phases.find((p) => p.number === phaseNumber);
  if (!phase) {
    return error(`Phase ${phaseNumber} not found in plan`);
  }

  // Get files generated in this phase
  if (!phase.generatedCode) {
    return skipped(`No files generated in phase ${phaseNumber}`);
  }

  const phaseFiles = extractRawFilesFromCode(phase.generatedCode);
  if (phaseFiles.length === 0) {
    return skipped(`No files generated in phase ${phaseNumber}`);
  }

  // Convert to ReviewFile format
  const reviewFiles: ReviewFile[] = phaseFiles.map((f) => ({
    path: f.path,
    content: f.content,
    language: getFileLanguage(f.path),
  }));

  try {
    // Run light review (dynamic import to avoid bundling tree-sitter in client)
    const { performLightReview } = await getCodeReviewService();
    const result = await performLightReview(
      reviewFiles,
      {
        phaseNumber,
        phaseName: phase.name,
        features: phase.features,
      },
      { strictness: state.reviewStrictness }
    );

    // Store the report
    state.qualityReports.set(phaseNumber, result.report);

    // Update raw files with fixed content
    if (result.modifiedFiles.length > 0) {
      updateFilesWithFixes(state, result.modifiedFiles);
    }

    return success({
      report: result.report,
      modifiedFiles: result.modifiedFiles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(`Quality review failed: ${message}`, err);
  }
}

/**
 * Run a comprehensive quality review at the end of the build.
 * Includes semantic analysis with Claude AI.
 *
 * @returns OperationResult with report and any modified files
 */
export async function runFinalQualityReview(
  state: QualityReviewState
): Promise<
  OperationResult<{
    report: QualityReport;
    modifiedFiles: ReviewFile[];
  }>
> {
  if (state.rawGeneratedFiles.length === 0) {
    return skipped('No generated files to review');
  }

  // Convert all files to ReviewFile format
  const reviewFiles: ReviewFile[] = state.rawGeneratedFiles.map((f) => ({
    path: f.path,
    content: f.content,
    language: getFileLanguage(f.path),
  }));

  // Build comprehensive review context
  const requirements = {
    originalRequirements: state.plan.concept.conversationContext || '',
    expectedFeatures: state.accumulatedFeaturesRich.map((f) => f.name),
    apiContracts: state.apiContracts,
    allFeatures: state.accumulatedFeaturesRich.map((f) => ({
      name: f.name,
      description: f.name,
      priority: 'high' as const,
    })),
    technicalRequirements: state.plan.concept.technical,
  };

  try {
    // Run comprehensive review (dynamic import to avoid bundling tree-sitter in client)
    const { performComprehensiveReview } = await getCodeReviewService();
    const result = await performComprehensiveReview(reviewFiles, requirements, {
      strictness: state.reviewStrictness,
    });

    // Store the final report
    state.qualityReports.set(-1, result.report); // -1 indicates final review

    // Update files with fixes
    if (result.modifiedFiles.length > 0) {
      updateFilesWithFixes(state, result.modifiedFiles);
    }

    return success({
      report: result.report,
      modifiedFiles: result.modifiedFiles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(`Comprehensive review failed: ${message}`, err);
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Update raw files with fixed content and rebuild accumulated code
 */
function updateFilesWithFixes(state: QualityReviewState, modifiedFiles: ReviewFile[]): void {
  for (const modified of modifiedFiles) {
    const index = state.rawGeneratedFiles.findIndex((f) => f.path === modified.path);
    if (index !== -1) {
      state.rawGeneratedFiles[index].content = modified.content;
    }
  }

  // Update accumulated code with the fixed files
  state.accumulatedCode = rebuildAccumulatedCodeFromFiles(state.plan, state.rawGeneratedFiles);
}
