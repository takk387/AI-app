'use client';

// Re-export types from centralized location
export type {
  AppFile,
  RailwayDeployment,
  RailwayDeploymentStatus,
  RailwayEvents,
} from '@/types/railway';

import type {
  AppFile,
  RailwayDeployment,
  RailwayDeploymentStatus,
  RailwayEvents,
} from '@/types/railway';
import { logger } from '@/utils/logger';

// Create a child logger for Railway service
const log = logger.child({ route: 'railway-service' });

// ============================================================================
// RAILWAY SERVICE
// ============================================================================

/**
 * Service for managing Railway preview deployments.
 * Communicates with Railway API via backend routes to keep tokens secure.
 */
class RailwayService {
  private static instance: RailwayService | null = null;
  private currentDeployment: (RailwayDeployment & { userId?: string }) | null = null;
  private events: RailwayEvents = {};
  private statusPollInterval: NodeJS.Timeout | null = null;
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private pollFailureCount = 0;
  private currentPollInterval: number;

  // Auto-cleanup after 30 minutes of idle
  private static readonly CLEANUP_TIMEOUT_MS = 30 * 60 * 1000;
  // Initial poll interval (3 seconds)
  private static readonly INITIAL_POLL_INTERVAL_MS = 3000;
  // Maximum poll interval after backoff (30 seconds)
  private static readonly MAX_POLL_INTERVAL_MS = 30000;
  // Maximum consecutive failures before stopping
  private static readonly MAX_POLL_FAILURES = 10;

  private constructor() {
    // Private constructor for singleton
    this.currentPollInterval = RailwayService.INITIAL_POLL_INTERVAL_MS;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): RailwayService {
    if (!RailwayService.instance) {
      RailwayService.instance = new RailwayService();
    }
    return RailwayService.instance;
  }

  /**
   * Set event handlers
   */
  setEventHandlers(events: RailwayEvents): void {
    this.events = events;
  }

  /**
   * Clear event handlers (call on component unmount to prevent memory leaks)
   */
  clearEventHandlers(): void {
    this.events = {};
  }

  /**
   * Get current deployment
   */
  getCurrentDeployment(): RailwayDeployment | null {
    return this.currentDeployment;
  }

  /**
   * Get current status
   */
  getStatus(): RailwayDeploymentStatus | 'idle' {
    return this.currentDeployment?.status ?? 'idle';
  }

  /**
   * Get preview URL if deployment is ready
   */
  getPreviewUrl(): string | null {
    return this.currentDeployment?.previewUrl ?? null;
  }

  /**
   * Deploy app files to Railway
   * @param files - App files to deploy
   * @param dependencies - npm dependencies
   * @param appId - Unique app identifier (GeneratedComponent.id) for project reuse
   * @param appName - Display name for the app
   */
  async deploy(
    files: AppFile[],
    dependencies: Record<string, string>,
    appId: string,
    appName?: string
  ): Promise<RailwayDeployment> {
    // Stop any existing polling but DON'T cleanup/delete the project
    // We want to reuse the same Railway project for the same app
    if (this.currentDeployment) {
      this.stopStatusPolling();
      this.clearCleanupTimeout();
    }

    // Update status
    this.updateStatus('creating');

    try {
      // Call our backend API to create/update the deployment
      const response = await fetch('/api/railway/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          dependencies,
          appId,
          appName: appName || `preview-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Railway deployment');
      }

      const deployment: RailwayDeployment = await response.json();
      this.currentDeployment = deployment;

      // Start polling for status updates
      this.startStatusPolling();

      // Set up auto-cleanup
      this.scheduleCleanup();

      return deployment;
    } catch (error) {
      this.updateStatus('error');
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.onError?.(err);
      throw err;
    }
  }

  /**
   * Start polling for deployment status with exponential backoff
   */
  private startStatusPolling(): void {
    this.stopStatusPolling();
    this.pollFailureCount = 0;
    this.currentPollInterval = RailwayService.INITIAL_POLL_INTERVAL_MS;

    this.scheduleNextPoll();
  }

  /**
   * Schedule the next poll with current interval
   */
  private scheduleNextPoll(): void {
    this.statusPollInterval = setTimeout(async () => {
      await this.pollStatus();
    }, this.currentPollInterval);
  }

  /**
   * Poll for status once
   */
  private async pollStatus(): Promise<void> {
    if (!this.currentDeployment) {
      this.stopStatusPolling();
      return;
    }

    try {
      const response = await fetch(`/api/railway/status/${this.currentDeployment.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch deployment status');
      }

      const status = await response.json();

      // Reset failure count and interval on success
      this.pollFailureCount = 0;
      this.currentPollInterval = RailwayService.INITIAL_POLL_INTERVAL_MS;

      // Update local state
      this.currentDeployment = {
        ...this.currentDeployment,
        status: status.status,
        previewUrl: status.previewUrl,
        buildLogs: status.buildLogs || this.currentDeployment.buildLogs,
      };

      // Emit status change
      this.updateStatus(status.status);

      // Emit new build logs
      if (status.newLogs) {
        for (const log of status.newLogs) {
          this.events.onBuildLog?.(log);
        }
      }

      // Stop polling if deployment is ready or errored
      if (status.status === 'ready') {
        this.stopStatusPolling();
        if (status.previewUrl) {
          this.events.onReady?.(status.previewUrl);
        }
      } else if (status.status === 'error') {
        this.stopStatusPolling();
        this.events.onError?.(new Error(status.error || 'Deployment failed'));
      } else {
        // Continue polling
        this.scheduleNextPoll();
      }
    } catch (error) {
      log.error('Error polling Railway status', error);
      this.pollFailureCount++;

      // Check if we've exceeded max failures
      if (this.pollFailureCount >= RailwayService.MAX_POLL_FAILURES) {
        log.error('Max poll failures reached, stopping polling', undefined, {
          failures: this.pollFailureCount,
        });
        this.stopStatusPolling();
        this.events.onError?.(new Error('Lost connection to deployment. Please try again.'));
        return;
      }

      // Exponential backoff: double the interval up to max
      this.currentPollInterval = Math.min(
        this.currentPollInterval * 2,
        RailwayService.MAX_POLL_INTERVAL_MS
      );

      log.debug('Retrying poll', {
        retryInSeconds: this.currentPollInterval / 1000,
        attempt: this.pollFailureCount,
        maxAttempts: RailwayService.MAX_POLL_FAILURES,
      });
      this.scheduleNextPoll();
    }
  }

  /**
   * Stop polling for status
   */
  private stopStatusPolling(): void {
    if (this.statusPollInterval) {
      clearTimeout(this.statusPollInterval);
      this.statusPollInterval = null;
    }
    this.pollFailureCount = 0;
    this.currentPollInterval = RailwayService.INITIAL_POLL_INTERVAL_MS;
  }

  /**
   * Schedule auto-cleanup
   */
  private scheduleCleanup(): void {
    this.clearCleanupTimeout();
    this.cleanupTimeout = setTimeout(async () => {
      log.info('Auto-cleanup after idle timeout');
      try {
        await this.cleanup();
      } catch (error) {
        log.error('Auto-cleanup failed', error);
      }
    }, RailwayService.CLEANUP_TIMEOUT_MS);
  }

  /**
   * Clear cleanup timeout
   */
  private clearCleanupTimeout(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }

  /**
   * Reset cleanup timer (call on user activity)
   */
  resetCleanupTimer(): void {
    if (this.currentDeployment && this.currentDeployment.status === 'ready') {
      this.scheduleCleanup();
    }
  }

  /**
   * Update status and emit event
   */
  private updateStatus(status: RailwayDeploymentStatus): void {
    if (this.currentDeployment) {
      this.currentDeployment.status = status;
    }
    this.events.onStatusChange?.(status);
  }

  /**
   * Clean up the current deployment
   * Note: Does NOT clear event handlers - call clearEventHandlers() separately
   * to prevent memory leaks from stale component references
   */
  async cleanup(): Promise<void> {
    this.stopStatusPolling();
    this.clearCleanupTimeout();

    if (!this.currentDeployment) {
      return;
    }

    const deploymentId = this.currentDeployment.id;
    const previousStatus = this.currentDeployment.status;

    // Only update status if not already in a terminal state
    if (previousStatus !== 'error' && previousStatus !== 'ready') {
      this.updateStatus('cleaning_up');
    }

    try {
      const response = await fetch(`/api/railway/cleanup/${deploymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Cleanup request failed');
      }
    } catch (error) {
      log.error('Error cleaning up Railway deployment', error, { deploymentId });
      // Don't throw - cleanup is best-effort
    }

    this.currentDeployment = null;
    // Note: We don't clear events here - component should call clearEventHandlers()
  }

  /**
   * Check if a deployment is active
   */
  isActive(): boolean {
    return this.currentDeployment !== null;
  }

  /**
   * Check if deployment is ready
   */
  isReady(): boolean {
    return this.currentDeployment?.status === 'ready';
  }
}

// Export singleton getter
export function getRailwayService(): RailwayService {
  return RailwayService.getInstance();
}

export default RailwayService;
