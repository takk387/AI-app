/**
 * DeploymentOrchestrator Service
 *
 * Main coordinator for multi-platform deployment workflows.
 * Provides the shared step-execution framework and delegates platform-specific
 * logic to WebDeploymentPipeline, MobileDeploymentPipeline, and DesktopDeploymentPipeline.
 */

import type {
  DeploymentPlatform,
  DeploymentProgress,
  DeploymentStep,
  WebDeployConfig,
  MobileDeployConfig,
  DesktopDeployConfig,
} from '@/types/deployment/unified';

import type {
  DeploymentContext,
  StepResult,
  OrchestrationOptions,
  WebDeploymentResult,
  MobileDeploymentResult,
  DesktopDeploymentResult,
} from './deploymentTypes';

import type { PipelineCallbacks } from './WebDeploymentPipeline';
import { executeWebPipeline } from './WebDeploymentPipeline';
import { executeMobilePipeline } from './MobileDeploymentPipeline';
import { executeDesktopPipeline } from './DesktopDeploymentPipeline';

// Re-export types so existing barrel imports continue to work
export type {
  DeploymentContext,
  StepResult,
  ProgressCallback,
  OrchestrationOptions,
  WebDeploymentResult,
  MobileDeploymentResult,
  DesktopDeploymentResult,
} from './deploymentTypes';

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

/**
 * DeploymentOrchestrator
 *
 * Coordinates the deployment workflow across different platforms.
 * Owns progress tracking and step execution; delegates platform logic to pipelines.
 */
export class DeploymentOrchestrator {
  private context: DeploymentContext;
  private progress: DeploymentProgress;
  private options: OrchestrationOptions;

  constructor(
    projectId: string,
    projectName: string,
    userId: string,
    platform: DeploymentPlatform,
    options: OrchestrationOptions = {}
  ) {
    this.context = {
      projectId,
      projectName,
      userId,
      platform,
      startedAt: new Date().toISOString(),
    };

    this.progress = {
      platform,
      status: 'idle',
      steps: [],
      overallProgress: 0,
    };

    this.options = options;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API — Facade methods that delegate to pipeline modules
  // --------------------------------------------------------------------------

  /**
   * Deploy to web (Turso/Neon + Cloudflare/Vercel)
   */
  async deployWeb(config: WebDeployConfig): Promise<WebDeploymentResult> {
    return executeWebPipeline(config, this.createPipelineCallbacks());
  }

  /**
   * Deploy mobile app (iOS/Android via Capacitor + EAS)
   */
  async deployMobile(config: MobileDeployConfig): Promise<MobileDeploymentResult> {
    return executeMobilePipeline(config, this.createPipelineCallbacks());
  }

  /**
   * Deploy desktop app (Windows/macOS/Linux via Tauri)
   */
  async deployDesktop(config: DesktopDeployConfig): Promise<DesktopDeploymentResult> {
    return executeDesktopPipeline(config, this.createPipelineCallbacks());
  }

  /**
   * Get current deployment progress
   */
  getProgress(): DeploymentProgress {
    return { ...this.progress };
  }

  /**
   * Cancel ongoing deployment
   */
  cancel(): void {
    this.progress.status = 'failed';
    this.progress.error = 'Deployment cancelled by user';
    this.progress.completedAt = new Date().toISOString();
    this.notifyProgress();
  }

  // --------------------------------------------------------------------------
  // SHARED FRAMEWORK — Step execution, progress tracking
  // --------------------------------------------------------------------------

  private createPipelineCallbacks(): PipelineCallbacks {
    return {
      executeStep: (stepId, executor) => this.executeStep(stepId, executor),
      skipStep: (stepId) => this.skipStep(stepId),
      initializeProgress: (steps) => this.initializeProgress(steps),
      completeDeployment: () => this.completeDeployment(),
      handleError: (error) => this.handleError(error),
      getContext: () => this.context,
    };
  }

  private initializeProgress(steps: Omit<DeploymentStep, 'status'>[]): void {
    this.progress = {
      platform: this.context.platform,
      status: 'configuring',
      steps: steps.map((step) => ({ ...step, status: 'pending' as const })),
      overallProgress: 0,
      startedAt: new Date().toISOString(),
    };
    this.notifyProgress();
  }

  private async executeStep(stepId: string, executor: () => Promise<StepResult>): Promise<void> {
    // Check for abort
    if (this.options.abortSignal?.aborted) {
      throw new Error('Deployment aborted');
    }

    // Update step to in_progress
    this.updateStep(stepId, 'in_progress');

    try {
      // Execute (or simulate in dry run)
      const result = this.options.dryRun ? { success: true } : await executor();

      if (!result.success) {
        throw new Error(result.error || `Step ${stepId} failed`);
      }

      // Update step to completed
      this.updateStep(stepId, 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStep(stepId, 'failed', undefined, errorMessage);
      throw error;
    }
  }

  private skipStep(stepId: string): void {
    this.updateStep(stepId, 'skipped');
  }

  private updateStep(
    stepId: string,
    status: DeploymentStep['status'],
    message?: string,
    error?: string
  ): void {
    const stepIndex = this.progress.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    this.progress.steps[stepIndex] = {
      ...this.progress.steps[stepIndex],
      status,
      message,
      error,
      ...(status === 'in_progress' ? { startedAt: new Date().toISOString() } : {}),
      ...(status === 'completed' || status === 'failed' || status === 'skipped'
        ? { completedAt: new Date().toISOString() }
        : {}),
    };

    if (status === 'in_progress') {
      this.progress.currentStep = stepId;
    }

    this.updateOverallProgress();
    this.notifyProgress();
  }

  private updateOverallProgress(): void {
    const completed = this.progress.steps.filter(
      (s) => s.status === 'completed' || s.status === 'skipped'
    ).length;
    this.progress.overallProgress = Math.round((completed / this.progress.steps.length) * 100);
  }

  private completeDeployment(): void {
    this.progress.status = 'completed';
    this.progress.overallProgress = 100;
    this.progress.completedAt = new Date().toISOString();
    this.progress.deploymentUrl = this.context.deployedProject?.productionUrl;
    this.notifyProgress();
  }

  private handleError(error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.progress.status = 'failed';
    this.progress.error = errorMessage;
    this.progress.completedAt = new Date().toISOString();
    this.notifyProgress();
    throw error;
  }

  private notifyProgress(): void {
    this.options.onProgress?.(this.getProgress());
  }

  private async simulateDelay(ms: number): Promise<void> {
    if (this.options.dryRun) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a deployment orchestrator instance
 */
export function createDeploymentOrchestrator(
  projectId: string,
  projectName: string,
  userId: string,
  platform: DeploymentPlatform,
  options?: OrchestrationOptions
): DeploymentOrchestrator {
  return new DeploymentOrchestrator(projectId, projectName, userId, platform, options);
}
