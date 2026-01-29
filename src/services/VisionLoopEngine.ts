/**
 * Vision Loop Engine
 *
 * The orchestrator for the self-healing layout architecture.
 * Implements: Generate → Render → Capture → Critique → Heal → Verify cycle
 *
 * Features:
 * - Automated layout refinement loop
 * - Configurable fidelity thresholds
 * - Diminishing returns detection
 * - Version control integration for snapshots
 * - Progress callbacks for UI updates
 */

import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { DesignSpec } from '@/types/designSpec';
import type {
  LayoutCritiqueEnhanced,
  SelfHealingConfig,
  SelfHealingResult,
  SelfHealingIteration,
  ScreenshotRequest,
  ScreenshotResponse,
} from '@/types/layoutAnalysis';

// Re-export types for convenience (consumers can import from this file)
export type { SelfHealingResult, SelfHealingConfig } from '@/types/layoutAnalysis';
import { LayoutAutoFixEngine, createLayoutAutoFixEngine } from './LayoutAutoFixEngine';
import { getGeminiLayoutService } from './GeminiLayoutService';

/**
 * Progress callback for UI updates
 */
export type VisionLoopProgressCallback = (progress: VisionLoopProgress) => void;

/**
 * Progress update during vision loop execution
 */
export interface VisionLoopProgress {
  /** Current phase of the loop */
  phase: 'capturing' | 'critiquing' | 'fixing' | 'verifying' | 'complete' | 'error';
  /** Current iteration number */
  iteration: number;
  /** Total iterations allowed */
  maxIterations: number;
  /** Current fidelity score (if available) */
  fidelityScore?: number;
  /** Target fidelity score */
  targetFidelity: number;
  /** Human-readable message */
  message: string;
  /** Number of fixes applied in current iteration */
  fixesApplied?: number;
}

/**
 * Default configuration for the vision loop
 */
const DEFAULT_CONFIG: SelfHealingConfig = {
  maxIterations: 3,
  targetFidelity: 95,
  minImprovementThreshold: 2,
  saveSnapshots: true,
};

/**
 * Vision Loop Engine Class
 */
export class VisionLoopEngine {
  private config: SelfHealingConfig;
  private autoFixEngine: LayoutAutoFixEngine;
  private geminiService: ReturnType<typeof getGeminiLayoutService>;
  private onProgress?: VisionLoopProgressCallback;
  private aborted: boolean = false;

  constructor(config: Partial<SelfHealingConfig> = {}, onProgress?: VisionLoopProgressCallback) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.autoFixEngine = createLayoutAutoFixEngine({
      skipCritical: false,
      validateBounds: true,
    });
    this.geminiService = getGeminiLayoutService();
    this.onProgress = onProgress;
  }

  /**
   * Abort the current loop
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Reset abort flag for new run
   */
  private resetAbort(): void {
    this.aborted = false;
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: VisionLoopProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * Run the self-healing vision loop
   *
   * @param originalImage - Base64 encoded original design reference
   * @param initialComponents - Starting component array
   * @param designSpec - Design specification for context
   * @param renderToHtml - Function to get current layout HTML (captures current DOM state)
   *
   * Note: renderToHtml captures the current DOM state. For accurate intermediate
   * screenshots, the component state should be updated and React should re-render
   * before each iteration. Currently, this means the first iteration is most accurate.
   */
  async runLoop(
    originalImage: string,
    initialComponents: DetectedComponentEnhanced[],
    designSpec: DesignSpec | null,
    renderToHtml: () => string
  ): Promise<SelfHealingResult> {
    this.resetAbort();

    const result: SelfHealingResult = {
      finalComponents: [...initialComponents],
      finalDesignSpec: designSpec,
      iterations: 0,
      finalFidelityScore: 0,
      targetReached: false,
      stopReason: 'max_iterations',
      history: [],
    };

    let currentComponents = [...initialComponents];
    let previousScore = 0;

    for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
      if (this.aborted) {
        result.stopReason = 'user_cancelled';
        break;
      }

      result.iterations = iteration;

      try {
        // Phase 1: Capture screenshot
        this.reportProgress({
          phase: 'capturing',
          iteration,
          maxIterations: this.config.maxIterations,
          targetFidelity: this.config.targetFidelity,
          message: `Iteration ${iteration}: Capturing screenshot...`,
        });

        const html = renderToHtml();
        const screenshot = await this.captureScreenshot(html);

        if (!screenshot) {
          console.warn('[VisionLoopEngine] Screenshot capture failed, using fallback');
          // Continue without screenshot - critique will be less accurate
        }

        // Phase 2: Critique
        this.reportProgress({
          phase: 'critiquing',
          iteration,
          maxIterations: this.config.maxIterations,
          targetFidelity: this.config.targetFidelity,
          message: `Iteration ${iteration}: AI analyzing layout...`,
        });

        const critique = await this.geminiService.critiqueLayoutEnhanced(
          originalImage,
          screenshot || originalImage, // Fallback to original if screenshot fails
          currentComponents,
          this.config.targetFidelity
        );

        const iterationRecord: SelfHealingIteration = {
          iteration,
          fidelityScore: critique.fidelityScore,
          improvement: critique.fidelityScore - previousScore,
          changesApplied: 0,
          modifiedComponentIds: [],
        };

        // Check if target reached
        if (critique.passesThreshold) {
          result.finalFidelityScore = critique.fidelityScore;
          result.targetReached = true;
          result.stopReason = 'target_reached';
          result.finalComponents = currentComponents;
          iterationRecord.changesApplied = 0;
          result.history.push(iterationRecord);

          this.reportProgress({
            phase: 'complete',
            iteration,
            maxIterations: this.config.maxIterations,
            fidelityScore: critique.fidelityScore,
            targetFidelity: this.config.targetFidelity,
            message: `Target fidelity reached: ${critique.fidelityScore}%`,
          });

          break;
        }

        // Check for diminishing returns
        const improvement = critique.fidelityScore - previousScore;
        if (iteration > 1 && improvement < this.config.minImprovementThreshold) {
          result.finalFidelityScore = critique.fidelityScore;
          result.stopReason = 'diminishing_returns';
          result.finalComponents = currentComponents;
          iterationRecord.changesApplied = 0;
          result.history.push(iterationRecord);

          this.reportProgress({
            phase: 'complete',
            iteration,
            maxIterations: this.config.maxIterations,
            fidelityScore: critique.fidelityScore,
            targetFidelity: this.config.targetFidelity,
            message: `Stopping: Diminishing returns (${improvement.toFixed(1)}% improvement)`,
          });

          break;
        }

        // Phase 3: Apply fixes
        this.reportProgress({
          phase: 'fixing',
          iteration,
          maxIterations: this.config.maxIterations,
          fidelityScore: critique.fidelityScore,
          targetFidelity: this.config.targetFidelity,
          message: `Iteration ${iteration}: Applying ${critique.discrepancies.length} fixes...`,
        });

        const fixResult = this.autoFixEngine.applyCritique(currentComponents, critique);
        currentComponents = fixResult.components;

        iterationRecord.changesApplied = fixResult.appliedCount;
        iterationRecord.modifiedComponentIds = fixResult.modifiedComponentIds;

        // Phase 4: Verify (logged for next iteration)
        this.reportProgress({
          phase: 'verifying',
          iteration,
          maxIterations: this.config.maxIterations,
          fidelityScore: critique.fidelityScore,
          targetFidelity: this.config.targetFidelity,
          fixesApplied: fixResult.appliedCount,
          message: `Iteration ${iteration}: Applied ${fixResult.appliedCount} fixes, score: ${critique.fidelityScore}%`,
        });

        previousScore = critique.fidelityScore;
        result.finalFidelityScore = critique.fidelityScore;
        result.finalComponents = currentComponents;
        result.history.push(iterationRecord);

      } catch (error) {
        console.error(`[VisionLoopEngine] Iteration ${iteration} error:`, error);
        result.stopReason = 'error';

        this.reportProgress({
          phase: 'error',
          iteration,
          maxIterations: this.config.maxIterations,
          targetFidelity: this.config.targetFidelity,
          message: `Error in iteration ${iteration}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });

        break;
      }
    }

    // Final progress report
    if (!this.aborted && result.stopReason === 'max_iterations') {
      this.reportProgress({
        phase: 'complete',
        iteration: result.iterations,
        maxIterations: this.config.maxIterations,
        fidelityScore: result.finalFidelityScore,
        targetFidelity: this.config.targetFidelity,
        message: `Completed ${result.iterations} iterations. Final score: ${result.finalFidelityScore}%`,
      });
    }

    return result;
  }

  /**
   * Capture screenshot using the API route
   */
  private async captureScreenshot(html: string): Promise<string | null> {
    try {
      const request: ScreenshotRequest = {
        html,
        viewport: { width: 1280, height: 800 },
      };

      const response = await fetch('/api/layout/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        console.warn('[VisionLoopEngine] Screenshot API returned error:', response.status);
        return null;
      }

      const data: ScreenshotResponse = await response.json();

      if (!data.success || !data.image) {
        console.warn('[VisionLoopEngine] Screenshot API failed:', data.error);
        return null;
      }

      return data.image;
    } catch (error) {
      console.error('[VisionLoopEngine] Screenshot capture error:', error);
      return null;
    }
  }

  /**
   * Run a single critique without the full loop (for manual inspection)
   */
  async runSingleCritique(
    originalImage: string,
    components: DetectedComponentEnhanced[],
    renderToHtml: () => string
  ): Promise<LayoutCritiqueEnhanced> {
    const html = renderToHtml();
    const screenshot = await this.captureScreenshot(html);

    return this.geminiService.critiqueLayoutEnhanced(
      originalImage,
      screenshot || originalImage,
      components,
      this.config.targetFidelity
    );
  }

  /**
   * Preview what fixes would be applied without actually applying them
   */
  previewFixes(
    components: DetectedComponentEnhanced[],
    critique: LayoutCritiqueEnhanced
  ): { wouldApply: number; wouldSkip: number; details: string[] } {
    return this.autoFixEngine.previewFixes(components, critique);
  }
}

/**
 * Create a new VisionLoopEngine instance
 */
export function createVisionLoopEngine(
  config?: Partial<SelfHealingConfig>,
  onProgress?: VisionLoopProgressCallback
): VisionLoopEngine {
  return new VisionLoopEngine(config, onProgress);
}
