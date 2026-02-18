/**
 * Phase Execution Service
 *
 * Manages the execution of dynamic phases, including:
 * - Building context prompts for each phase
 * - Tracking accumulated code and features
 * - Handling phase dependencies
 * - Managing the execution flow
 *
 * Sub-module delegation:
 * - phaseExecution/promptBuilder     — Prompt assembly & layout formatting
 * - phaseExecution/qualityReview     — Code quality review orchestration
 * - phaseExecution/phaseIntegrity    — Phase Integrity System (P1-P9)
 * - phaseExecution/executionUtils    — OperationResult type & utility helpers
 */

import type {
  DynamicPhase,
  DynamicPhasePlan,
  PhaseExecutionContext,
  PhaseExecutionResult,
  AccumulatedFile,
  AccumulatedFeature,
  APIContract,
  // Phase Integrity Types (P1-P9)
  FileConflictResult,
  PhaseSnapshot,
  TypeCheckResult,
  TypeDefinition,
  TypeCompatibilityResult,
  PhaseTestResults,
  ContractValidationResult,
  RegressionTestResult,
  ImportValidationResult,
} from '@/types/dynamicPhases';
import type { QualityReport, ReviewFile, ReviewStrictness } from '@/types/codeReview';
import { DynamicPhaseGenerator } from './DynamicPhaseGenerator';
import { getCodeContextService, CodeContextService } from './CodeContextService';
import type { CodeContextSnapshot } from '@/types/codeContext';

// Sub-module imports
import { type OperationResult, success, skipped, error } from './phaseExecution/executionUtils';

import { type PhaseExecutionContextWithEnhancedTracking } from './phaseExecution/promptBuilder';

import {
  type QualityReviewState,
  runPhaseQualityReview as _runPhaseQualityReview,
  runFinalQualityReview as _runFinalQualityReview,
} from './phaseExecution/qualityReview';

import {
  type PhaseIntegrityState,
  detectFileConflicts as _detectFileConflicts,
  validateImportExports as _validateImportExports,
  capturePhaseSnapshot as _capturePhaseSnapshot,
  rollbackToSnapshot as _rollbackToSnapshot,
  syncPlanState as _syncPlanState,
  getPhaseSnapshot as _getPhaseSnapshot,
  runPhaseTypeCheck as _runPhaseTypeCheck,
  getTypeCheckResult as _getTypeCheckResult,
  checkTypeCompatibility as _checkTypeCompatibility,
  runPhaseTests as _runPhaseTests,
  getPhaseTestResults as _getPhaseTestResults,
  validateApiContracts as _validateApiContracts,
  verifyArchitectureImplementation as _verifyArchitectureImplementation,
  runRegressionTests as _runRegressionTests,
} from './phaseExecution/phaseIntegrity';

// ============================================================================
// RE-EXPORTS (preserve public API for consumers)
// ============================================================================

// Consumers import these from this file — keep backwards compatibility
export type { OperationResult } from './phaseExecution/executionUtils';
export {
  extractFilePaths,
  extractImplementedFeatures,
  createPhaseResult,
} from './phaseExecution/executionUtils';

export {
  formatLayoutManifestForPrompt,
  formatLayoutDesignForPrompt,
  buildPhaseExecutionPrompt,
} from './phaseExecution/promptBuilder';

// ============================================================================
// PHASE EXECUTION MANAGER
// ============================================================================

export class PhaseExecutionManager {
  private plan: DynamicPhasePlan;
  private accumulatedCode: string = '';
  private accumulatedFiles: string[] = [];
  private accumulatedFeatures: string[] = [];
  private completedPhases: number[] = [];

  // Enhanced tracking
  private accumulatedFilesRich: AccumulatedFile[] = [];
  private accumulatedFeaturesRich: AccumulatedFeature[] = [];
  private establishedPatterns: string[] = [];
  private apiContracts: APIContract[] = [];
  private phaseGenerator: DynamicPhaseGenerator;

  // Store raw file contents for smart context building
  private rawGeneratedFiles: Array<{ path: string; content: string }> = [];

  // Quality review tracking
  private qualityReports: Map<number, QualityReport> = new Map();
  private reviewStrictness: ReviewStrictness = 'standard';

  // ========== PHASE INTEGRITY TRACKING (P1-P9) ==========
  // P1: File conflict detection
  private fileVersionMap: Map<string, { hash: string; phase: number; exports: string[] }> =
    new Map();

  // P3: Phase snapshots for rollback
  private phaseSnapshots: Map<number, PhaseSnapshot> = new Map();

  // P5: TypeScript type check results
  private typeCheckResults: Map<number, TypeCheckResult> = new Map();

  // P6: Type definitions for compatibility checking
  private typeDefinitions: TypeDefinition[] = [];

  // P7: Smoke test results
  private phaseTestResults: Map<number, PhaseTestResults> = new Map();

  constructor(plan: DynamicPhasePlan) {
    this.plan = plan;
    this.phaseGenerator = new DynamicPhaseGenerator();

    // Initialize from plan if available
    if (plan.accumulatedFilesRich) {
      this.accumulatedFilesRich = [...plan.accumulatedFilesRich];
    }
    if (plan.accumulatedFeaturesRich) {
      this.accumulatedFeaturesRich = [...plan.accumulatedFeaturesRich];
    }
    if (plan.establishedPatterns) {
      this.establishedPatterns = [...plan.establishedPatterns];
    }
    if (plan.apiContracts) {
      this.apiContracts = [...plan.apiContracts];
    }
  }

  // ==========================================================================
  // CONTEXT BUILDING
  // ==========================================================================

  /**
   * Get the execution context for a specific phase
   * Now includes full concept context for rich detail preservation
   */
  getExecutionContext(phaseNumber: number): PhaseExecutionContext {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      throw new Error(`Phase ${phaseNumber} not found in plan`);
    }

    const concept = this.plan.concept;

    return {
      phaseNumber,
      totalPhases: this.plan.totalPhases,
      phaseName: phase.name,
      phaseDescription: phase.description,
      features: phase.features,
      testCriteria: phase.testCriteria,
      // Raw accumulated code as fallback — CodeContextService provides richer context
      // via cachedSmartContextSnapshot (populated by getExecutionContextAsync)
      previousPhaseCode: this.accumulatedCode || null,
      allPhases: this.plan.phases,
      completedPhases: [...this.completedPhases],
      cumulativeFeatures: [...this.accumulatedFeatures],
      cumulativeFiles: [...this.accumulatedFiles],
      appName: this.plan.appName,
      appDescription: this.plan.appDescription,
      appType: concept.technical.needsDatabase ? 'full-stack' : 'frontend',
      techStack: concept.technical,

      // ENHANCED: Full concept context for rich detail preservation
      fullConcept: {
        purpose: concept.purpose,
        targetUsers: concept.targetUsers,
        uiPreferences: concept.uiPreferences,
        layoutManifest: concept.layoutManifest, // CRITICAL: Include layout manifest for code generation
        roles: concept.roles,
        conversationContext: concept.conversationContext,
        dataModels: concept.technical.dataModels,
        workflows: concept.workflows, // CRITICAL: Include workflows for multi-step process generation
      },

      // Phase-specific concept context
      phaseConceptContext: phase.conceptContext,

      // Which user roles this phase serves
      relevantRoles: phase.relevantRoles,

      // Extracted phase context from conversation analysis (if available)
      extractedPhaseContext: this.plan.phaseContexts?.[phase.domain],

      // Enhanced tracking for prompt builder
      apiContracts: [...this.apiContracts],
      establishedPatterns: [...this.establishedPatterns],
      accumulatedFilesRich: [...this.accumulatedFilesRich],

      // Smart context from CodeContextService (if available)
      // Call getOptimizedPhaseContext() before getExecutionContext() to populate this
      smartContextSnapshot: this.cachedSmartContextSnapshot,

      // Architecture context for backend phases (from BackendArchitectureAgent)
      // Enables phase-specific backend implementation instructions
      architectureContext: phase.architectureContext,
    } as PhaseExecutionContextWithEnhancedTracking;
  }

  /**
   * Get execution context with smart context pre-loaded (async)
   * This is the recommended way to get context for phase execution
   */
  async getExecutionContextAsync(
    phaseNumber: number,
    maxTokens: number = 16000
  ): Promise<PhaseExecutionContext> {
    // Initialize CodeContextService if not already done
    if (!this.codeContextService && this.rawGeneratedFiles.length > 0) {
      this.initializeCodeContext();
    }

    // Pre-fetch smart context (populates cache)
    const contextResult = await this.getOptimizedPhaseContext(phaseNumber, maxTokens);

    // Log if context was skipped (not an error, just informational)
    if (contextResult.status === 'skipped') {
      console.log(`[PhaseExecutionManager] Smart context skipped: ${contextResult.reason}`);
    } else if (contextResult.status === 'error') {
      console.error(`[PhaseExecutionManager] Smart context error: ${contextResult.error}`);
    }

    // Return context with cached smart snapshot
    return this.getExecutionContext(phaseNumber);
  }

  /**
   * Clear the cached smart context (call after phase completion)
   */
  clearCachedSmartContext(): void {
    this.cachedSmartContextSnapshot = null;
  }

  // ==========================================================================
  // PHASE RESULT TRACKING
  // ==========================================================================

  /**
   * Record the result of executing a phase
   * Enhanced to extract rich metadata from generated code
   */
  recordPhaseResult(result: PhaseExecutionResult): void {
    if (result.success) {
      this.completedPhases.push(result.phaseNumber);
      this.accumulatedCode = result.generatedCode;
      this.accumulatedFiles = [...this.accumulatedFiles, ...result.generatedFiles];
      this.accumulatedFeatures = [...this.accumulatedFeatures, ...result.implementedFeatures];

      // Extract raw file contents and analyze
      const rawFiles = this.extractRawFiles(result.generatedCode);
      this.rawGeneratedFiles = [...this.rawGeneratedFiles, ...rawFiles];

      // Use DynamicPhaseGenerator to analyze files for rich metadata
      if (rawFiles.length > 0) {
        const analysis = this.phaseGenerator.analyzeGeneratedFiles(rawFiles);

        // Merge with existing rich tracking
        this.accumulatedFilesRich = [...this.accumulatedFilesRich, ...analysis.accumulatedFiles];
        this.apiContracts = [...this.apiContracts, ...analysis.apiContracts];

        // Merge patterns (deduplicate)
        const patternSet = new Set([...this.establishedPatterns, ...analysis.establishedPatterns]);
        this.establishedPatterns = Array.from(patternSet);
      }

      // Update rich feature tracking
      for (const feature of result.implementedFeatures) {
        const existingFeature = this.accumulatedFeaturesRich.find((f) => f.name === feature);
        if (existingFeature) {
          existingFeature.status = 'complete';
          existingFeature.implementedIn = [
            ...existingFeature.implementedIn,
            ...result.generatedFiles,
          ];
        } else {
          this.accumulatedFeaturesRich.push({
            name: feature,
            status: 'complete',
            implementedIn: result.generatedFiles,
            apiEndpoints: this.apiContracts
              .filter((c) =>
                feature.toLowerCase().includes(c.endpoint.split('/').pop()?.toLowerCase() || '')
              )
              .map((c) => c.endpoint),
            components: rawFiles.filter((f) => f.path.includes('/components/')).map((f) => f.path),
            dataModels: [], // Would need deeper analysis
            testCoverage: false,
          });
        }
      }

      // Update plan state
      const phase = this.plan.phases.find((p) => p.number === result.phaseNumber);
      if (phase) {
        phase.status = 'completed';
        phase.completedAt = new Date().toISOString();
        phase.generatedCode = result.generatedCode;
        // Phase Comparison: Track what was actually built
        phase.implementedFeatures = result.implementedFeatures;
        phase.builtFiles = result.generatedFiles;
        phase.builtSummary = result.builtSummary || this.generateBuiltSummary(result);
      }

      // Update both legacy and enhanced tracking in plan
      this.plan.completedPhaseNumbers = [...this.completedPhases];
      this.plan.accumulatedFiles = [...this.accumulatedFiles];
      this.plan.accumulatedFeatures = [...this.accumulatedFeatures];
      this.plan.accumulatedFilesRich = [...this.accumulatedFilesRich];
      this.plan.accumulatedFeaturesRich = [...this.accumulatedFeaturesRich];
      this.plan.establishedPatterns = [...this.establishedPatterns];
      this.plan.apiContracts = [...this.apiContracts];
      this.plan.currentPhaseNumber = result.phaseNumber + 1;
      this.plan.updatedAt = new Date().toISOString();
    } else {
      const phase = this.plan.phases.find((p) => p.number === result.phaseNumber);
      if (phase) {
        phase.status = 'failed';
        phase.errors = result.errors;
      }
      this.plan.failedPhaseNumbers.push(result.phaseNumber);
    }

    // Clear cached smart context so next phase gets fresh context
    this.clearCachedSmartContext();
  }

  /**
   * Extract raw file contents from generated code string
   */
  private extractRawFiles(generatedCode: string): Array<{ path: string; content: string }> {
    // Primary: parse JSON (generatedCode is JSON.stringify(streamResult))
    try {
      const parsed = JSON.parse(generatedCode);
      if (parsed?.files && Array.isArray(parsed.files)) {
        return parsed.files.filter(
          (f: Record<string, unknown>) =>
            typeof f.path === 'string' && typeof f.content === 'string'
        ) as Array<{ path: string; content: string }>;
      }
    } catch {
      // Not JSON — fall through to delimiter parsing
    }

    // Fallback: legacy ===FILE:=== delimiter format
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
   * Generate a concise summary of what was built from execution result
   * Used for Phase Comparison display when no explicit summary provided
   */
  private generateBuiltSummary(result: PhaseExecutionResult): string {
    const parts: string[] = [];

    // Add implemented features (max 3)
    if (result.implementedFeatures.length > 0) {
      const features = result.implementedFeatures.slice(0, 3);
      parts.push(features.join(', '));
      if (result.implementedFeatures.length > 3) {
        parts.push(`+${result.implementedFeatures.length - 3} more features`);
      }
    }

    // Add file count
    if (result.generatedFiles.length > 0) {
      parts.push(
        `${result.generatedFiles.length} file${result.generatedFiles.length > 1 ? 's' : ''} created`
      );
    }

    return parts.join(' • ') || 'Phase completed';
  }

  // ==========================================================================
  // ACCESSORS & STATE QUERIES
  // ==========================================================================

  /** Get API contracts established so far */
  getAPIContracts(): APIContract[] {
    return [...this.apiContracts];
  }

  /** Get established coding patterns */
  getEstablishedPatterns(): string[] {
    return [...this.establishedPatterns];
  }

  /** Get rich file tracking */
  getAccumulatedFilesRich(): AccumulatedFile[] {
    return [...this.accumulatedFilesRich];
  }

  /** Get the next phase to execute */
  getNextPhase(): DynamicPhase | null {
    return this.plan.phases.find((p) => p.status === 'pending') || null;
  }

  /** Check if all phases are complete */
  isComplete(): boolean {
    return this.plan.phases.every((p) => p.status === 'completed' || p.status === 'skipped');
  }

  /** Get current progress */
  getProgress(): {
    completed: number;
    total: number;
    percentage: number;
    currentPhase: DynamicPhase | null;
  } {
    const completed = this.completedPhases.length;
    const total = this.plan.totalPhases;
    const currentPhase = this.plan.phases.find((p) => p.status === 'in-progress') || null;

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      currentPhase,
    };
  }

  /** Get the updated plan */
  getPlan(): DynamicPhasePlan {
    return this.plan;
  }

  /** Skip a phase */
  skipPhase(phaseNumber: number): void {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (phase) {
      phase.status = 'skipped';
    }
  }

  /** Reset a failed phase for retry */
  resetPhase(phaseNumber: number): void {
    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (phase) {
      phase.status = 'pending';
      phase.errors = undefined;
      this.plan.failedPhaseNumbers = this.plan.failedPhaseNumbers.filter((n) => n !== phaseNumber);
    }
  }

  /** Get raw generated files (for external access) */
  getRawGeneratedFiles(): Array<{ path: string; content: string }> {
    return [...this.rawGeneratedFiles];
  }

  /** Get accumulated code (for P4 fix) */
  getAccumulatedCode(): string {
    return this.accumulatedCode;
  }

  /** Add generated file paths to tracking (keeps manager and plan in sync) */
  addFiles(files: string[]): void {
    this.accumulatedFiles = [...this.accumulatedFiles, ...files];
    this.plan.accumulatedFiles = [...this.accumulatedFiles];
  }

  /** Add implemented feature names to tracking (keeps manager and plan in sync) */
  addFeatures(features: string[]): void {
    this.accumulatedFeatures = [...this.accumulatedFeatures, ...features];
    this.plan.accumulatedFeatures = [...this.accumulatedFeatures];
  }

  /** Get a copy of the plan (for P4 fix) */
  getPlanCopy(): DynamicPhasePlan {
    return { ...this.plan };
  }

  // ==========================================================================
  // CODE CONTEXT API INTEGRATION
  // ==========================================================================

  private codeContextService: CodeContextService | null = null;
  private cachedSmartContextSnapshot: CodeContextSnapshot | null = null;

  /**
   * Initialize the CodeContextService for enhanced context management
   */
  initializeCodeContext(): CodeContextService {
    if (!this.codeContextService) {
      const appType = this.plan.concept.technical.needsDatabase ? 'FULL_STACK' : 'FRONTEND_ONLY';
      this.codeContextService = getCodeContextService(this.plan.id, this.plan.appName, appType);

      // Initialize with existing files
      if (this.rawGeneratedFiles.length > 0) {
        this.codeContextService.updateContext(this.rawGeneratedFiles, { incremental: false });
      }
    }
    return this.codeContextService;
  }

  /**
   * Get optimized context for a phase using CodeContextService
   * Falls back to raw accumulated code if service not initialized
   */
  async getOptimizedPhaseContext(
    phaseNumber: number,
    maxTokens: number = 16000
  ): Promise<OperationResult<CodeContextSnapshot>> {
    if (!this.codeContextService) {
      return skipped('CodeContextService not initialized - using legacy context');
    }

    const phase = this.plan.phases.find((p) => p.number === phaseNumber);
    if (!phase) {
      return error(`Phase ${phaseNumber} not found in plan`);
    }

    // Update context with latest files
    if (this.rawGeneratedFiles.length > 0) {
      const updateResult = await this.codeContextService.updateContext(this.rawGeneratedFiles, {
        incremental: true,
        phaseNumber: phaseNumber,
      });

      if (updateResult.failures.length > 0) {
        console.warn(
          `[PhaseExecutionManager] ${updateResult.failures.length} files failed to parse:`,
          updateResult.failures.map((f) => f.path)
        );
      }
    }

    // Get optimized context for this phase
    const snapshot = await this.codeContextService.getPhaseContext(
      phaseNumber,
      phase.features,
      maxTokens
    );

    // Cache for synchronous access
    this.cachedSmartContextSnapshot = snapshot;

    return success(snapshot);
  }

  /**
   * Get context for modifying generated code
   */
  async getModificationContext(
    targetFile: string,
    changeDescription: string,
    maxTokens: number = 16000
  ): Promise<CodeContextSnapshot | null> {
    if (!this.codeContextService) {
      this.initializeCodeContext();
    }

    if (!this.codeContextService) {
      return null;
    }

    return this.codeContextService.getModificationContext(targetFile, changeDescription, maxTokens);
  }

  /** Get the CodeContextService instance */
  getCodeContextService(): CodeContextService | null {
    return this.codeContextService;
  }

  // ==========================================================================
  // QUALITY REVIEW API (delegated to phaseExecution/qualityReview)
  // ==========================================================================

  /** Set the review strictness level */
  setReviewStrictness(strictness: ReviewStrictness): void {
    this.reviewStrictness = strictness;
  }

  /** Get the review strictness level */
  getReviewStrictness(): ReviewStrictness {
    return this.reviewStrictness;
  }

  /** Build quality review state snapshot for delegation */
  private getQualityReviewState(): QualityReviewState {
    return {
      plan: this.plan,
      reviewStrictness: this.reviewStrictness,
      qualityReports: this.qualityReports,
      rawGeneratedFiles: this.rawGeneratedFiles,
      accumulatedCode: this.accumulatedCode,
      accumulatedFeaturesRich: this.accumulatedFeaturesRich,
      apiContracts: this.apiContracts,
    };
  }

  /** Sync back mutable state from quality review */
  private syncFromQualityReview(state: QualityReviewState): void {
    this.accumulatedCode = state.accumulatedCode;
    this.rawGeneratedFiles = state.rawGeneratedFiles;
  }

  async runPhaseQualityReview(
    phaseNumber: number
  ): Promise<OperationResult<{ report: QualityReport; modifiedFiles: ReviewFile[] }>> {
    const state = this.getQualityReviewState();
    const result = await _runPhaseQualityReview(state, phaseNumber);
    this.syncFromQualityReview(state);
    return result;
  }

  async runFinalQualityReview(): Promise<
    OperationResult<{ report: QualityReport; modifiedFiles: ReviewFile[] }>
  > {
    const state = this.getQualityReviewState();
    const result = await _runFinalQualityReview(state);
    this.syncFromQualityReview(state);
    return result;
  }

  getPhaseQualityReport(phaseNumber: number): QualityReport | null {
    return this.qualityReports.get(phaseNumber) || null;
  }

  getFinalQualityReport(): QualityReport | null {
    return this.qualityReports.get(-1) || null;
  }

  getAllQualityReports(): Map<number, QualityReport> {
    return new Map(this.qualityReports);
  }

  // ==========================================================================
  // PHASE INTEGRITY API (delegated to phaseExecution/phaseIntegrity)
  // ==========================================================================

  /** Build phase integrity state snapshot for delegation */
  private getIntegrityState(): PhaseIntegrityState {
    return {
      plan: this.plan,
      accumulatedCode: this.accumulatedCode,
      accumulatedFiles: this.accumulatedFiles,
      accumulatedFeatures: this.accumulatedFeatures,
      accumulatedFilesRich: this.accumulatedFilesRich,
      accumulatedFeaturesRich: this.accumulatedFeaturesRich,
      establishedPatterns: this.establishedPatterns,
      apiContracts: this.apiContracts,
      rawGeneratedFiles: this.rawGeneratedFiles,
      completedPhases: this.completedPhases,
      fileVersionMap: this.fileVersionMap,
      phaseSnapshots: this.phaseSnapshots,
      typeCheckResults: this.typeCheckResults,
      typeDefinitions: this.typeDefinitions,
      phaseTestResults: this.phaseTestResults,
    };
  }

  /** Sync back mutable state from integrity operations */
  private syncFromIntegrity(state: PhaseIntegrityState): void {
    this.accumulatedCode = state.accumulatedCode;
    this.accumulatedFiles = state.accumulatedFiles;
    this.accumulatedFeatures = state.accumulatedFeatures;
    this.accumulatedFilesRich = state.accumulatedFilesRich;
    this.accumulatedFeaturesRich = state.accumulatedFeaturesRich;
    this.establishedPatterns = state.establishedPatterns;
    this.apiContracts = state.apiContracts;
    this.rawGeneratedFiles = state.rawGeneratedFiles;
    this.completedPhases = state.completedPhases;
  }

  // P1: File Conflict Detection
  detectFileConflicts(
    newFiles: Array<{ path: string; content: string }>,
    phaseNumber: number
  ): FileConflictResult {
    const state = this.getIntegrityState();
    return _detectFileConflicts(state, newFiles, phaseNumber);
  }

  // P2: Import/Export Validation
  validateImportExports(): ImportValidationResult {
    return _validateImportExports(this.getIntegrityState());
  }

  // P3: Phase Snapshot & Rollback
  capturePhaseSnapshot(phaseNumber: number): PhaseSnapshot {
    const state = this.getIntegrityState();
    return _capturePhaseSnapshot(state, phaseNumber);
  }

  rollbackToSnapshot(phaseNumber: number): boolean {
    const state = this.getIntegrityState();
    const result = _rollbackToSnapshot(state, phaseNumber);
    this.syncFromIntegrity(state);
    return result;
  }

  syncPlanState(): void {
    _syncPlanState(this.getIntegrityState());
  }

  getPhaseSnapshot(phaseNumber: number): PhaseSnapshot | null {
    return _getPhaseSnapshot(this.getIntegrityState(), phaseNumber);
  }

  // P5: Cross-Phase Type Checking
  async runPhaseTypeCheck(phaseNumber: number): Promise<TypeCheckResult> {
    return _runPhaseTypeCheck(this.getIntegrityState(), phaseNumber);
  }

  getTypeCheckResult(phaseNumber: number): TypeCheckResult | null {
    return _getTypeCheckResult(this.getIntegrityState(), phaseNumber);
  }

  // P6: Type Compatibility Checks
  async checkTypeCompatibility(phaseNumber: number): Promise<TypeCompatibilityResult> {
    const state = this.getIntegrityState();
    const result = await _checkTypeCompatibility(state, phaseNumber);
    // typeDefinitions updated in-place via state reference
    return result;
  }

  // P7: Smoke Test Execution
  async runPhaseTests(phaseNumber: number): Promise<PhaseTestResults> {
    return _runPhaseTests(this.getIntegrityState(), phaseNumber);
  }

  getPhaseTestResults(phaseNumber: number): PhaseTestResults | null {
    return _getPhaseTestResults(this.getIntegrityState(), phaseNumber);
  }

  // P8: API Contract Enforcement
  validateApiContracts(): ContractValidationResult {
    return _validateApiContracts(this.getIntegrityState());
  }

  // P16: Architecture Verification
  async verifyArchitectureImplementation(): Promise<{ verified: boolean; issues: string[] }> {
    return _verifyArchitectureImplementation(this.getIntegrityState());
  }

  // P9: Regression Testing
  async runRegressionTests(currentPhase: number): Promise<RegressionTestResult> {
    return _runRegressionTests(this.getIntegrityState(), currentPhase);
  }
}

export default PhaseExecutionManager;
