/**
 * DesktopDeployService
 *
 * Handles Windows, macOS, and Linux deployment via Tauri.
 * Coordinates with Inngest background jobs for long-running builds.
 */

import type {
  DesktopDeployConfig,
  DeploymentProgress,
  DeploymentStep,
} from '@/types/deployment/unified';
import type {
  TauriConfig,
  TauriBuildStatus,
  TauriPlatform,
  TauriWindowConfig,
  TauriBundleConfig,
} from '@/types/deployment/desktop';
import { triggerDesktopBuild, cancelDesktopBuild } from '@/inngest/client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Desktop build result
 */
export interface DesktopBuildResult {
  success: boolean;
  platforms: TauriPlatform[];
  error?: string;
  buildIds?: Record<TauriPlatform, string>;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: DeploymentProgress) => void;

/**
 * Desktop deployment step IDs
 */
type DesktopDeploymentStepId = 'preparing' | 'building' | 'packaging' | 'verifying';

// ============================================================================
// DESKTOP DEPLOY SERVICE
// ============================================================================

export class DesktopDeployService {
  /**
   * Deploy to desktop platforms (Windows, macOS, Linux)
   */
  async deploy(
    projectId: string,
    userId: string,
    config: DesktopDeployConfig,
    transformedCode: string,
    onProgress?: ProgressCallback
  ): Promise<DesktopBuildResult> {
    const buildIds: Record<string, string> = {};

    try {
      // Step 1: Prepare
      this.reportProgress(onProgress, 'preparing', 'in_progress', 'Preparing desktop build...');

      // Generate Tauri config
      const tauriConfig = this.generateTauriConfig(config);

      this.reportProgress(onProgress, 'preparing', 'completed', 'Tauri configuration ready');

      // Step 2: Trigger background builds via Inngest for each platform
      this.reportProgress(onProgress, 'building', 'in_progress', 'Starting build process...');

      // Build each platform
      for (const platform of config.platforms) {
        await triggerDesktopBuild({
          projectId,
          userId,
          platform,
          appName: config.appName,
          identifier: config.appId,
          transformedCode,
        });

        // Generate a build ID for tracking
        buildIds[platform] = `${projectId}-${platform}-${Date.now()}`;
      }

      this.reportProgress(
        onProgress,
        'building',
        'in_progress',
        `Desktop builds queued for ${config.platforms.join(', ')}. This may take 15-45 minutes.`
      );

      // Return pending status - the build continues in background
      return {
        success: true,
        platforms: config.platforms,
        buildIds: buildIds as Record<TauriPlatform, string>,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress(onProgress, 'building', 'failed', errorMessage);

      return {
        success: false,
        platforms: config.platforms,
        error: errorMessage,
      };
    }
  }

  /**
   * Cancel in-progress builds
   */
  async cancelBuild(
    projectId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await cancelDesktopBuild({ projectId, userId });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel build',
      };
    }
  }

  /**
   * Get build status for a project
   */
  async getBuildStatus(_projectId: string): Promise<{
    status: TauriBuildStatus;
    platforms?: Record<TauriPlatform, { status: TauriBuildStatus; artifactUrl?: string }>;
    message?: string;
  }> {
    // In production, query the deployed_apps table or build service API
    console.log(`[DesktopDeployService] Getting build status`);

    // Placeholder - return pending status
    return {
      status: 'building',
      message: 'Build in progress',
    };
  }

  /**
   * Generate Tauri configuration
   */
  generateTauriConfig(config: DesktopDeployConfig): TauriConfig {
    const identifier =
      config.appId || `com.app.${config.appName.toLowerCase().replace(/\s+/g, '')}`;

    const windowConfig: TauriWindowConfig = {
      title: config.appName || 'My App',
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      resizable: true,
      center: true,
      decorations: true,
      visible: true,
      focus: true,
    };

    const bundleConfig: TauriBundleConfig = {
      active: true,
      identifier,
      icon: [
        'icons/32x32.png',
        'icons/128x128.png',
        'icons/128x128@2x.png',
        'icons/icon.icns',
        'icons/icon.ico',
      ],
      shortDescription: config.appName,
    };

    // Add platform-specific bundle targets
    const targets: TauriBundleConfig['targets'] = [];

    if (config.platforms.includes('windows')) {
      switch (config.windowsFormat) {
        case 'msi':
          targets.push('msi');
          break;
        case 'exe':
        case 'portable':
          targets.push('nsis');
          break;
      }

      bundleConfig.windows = {
        webviewInstallMode: {
          type: 'downloadBootstrapper',
        },
        allowDowngrades: false,
        nsis: {
          installMode: 'currentUser',
        },
      };
    }

    if (config.platforms.includes('macos')) {
      switch (config.macosFormat) {
        case 'dmg':
          targets.push('dmg');
          break;
        case 'app':
          targets.push('app');
          break;
        case 'pkg':
          targets.push('dmg'); // pkg not directly supported, use dmg
          break;
      }

      bundleConfig.macOS = {
        minimumSystemVersion: '10.13',
      };

      if (config.signApp) {
        bundleConfig.macOS.signingIdentity = '-'; // Will be replaced with actual identity
      }
    }

    if (config.platforms.includes('linux')) {
      switch (config.linuxFormat) {
        case 'appimage':
          targets.push('appimage');
          break;
        case 'deb':
          targets.push('deb');
          break;
        case 'rpm':
          targets.push('rpm');
          break;
      }

      bundleConfig.deb = {
        depends: [],
      };
    }

    bundleConfig.targets = targets.length > 0 ? targets : ['all'];

    const tauriConfig: TauriConfig = {
      $schema: 'https://schema.tauri.app/config/2',
      productName: config.appName,
      version: config.version || '1.0.0',
      identifier,
      build: {
        devPath: 'http://localhost:3000',
        distDir: '../out',
        beforeBuildCommand: 'npm run build',
        beforeDevCommand: 'npm run dev',
        withGlobalTauri: false,
      },
      bundle: bundleConfig,
      security: {
        csp: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
      },
      windows: [windowConfig],
    };

    return tauriConfig;
  }

  /**
   * Validate desktop deployment config
   */
  validateConfig(config: DesktopDeployConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.platforms || config.platforms.length === 0) {
      errors.push('At least one platform is required (windows, macos, or linux)');
    }

    if (!config.appName) {
      errors.push('App name is required');
    }

    if (!config.appId) {
      errors.push('App ID (bundle identifier) is required');
    } else if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(config.appId.toLowerCase())) {
      errors.push('App ID must be a valid reverse-domain identifier (e.g., com.company.appname)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate Cargo.toml content for Tauri project
   */
  generateCargoToml(config: DesktopDeployConfig): string {
    const name = config.appName.toLowerCase().replace(/\s+/g, '-');

    return `[package]
name = "${name}"
version = "${config.version || '1.0.0'}"
description = "${config.appName}"
edition = "2021"
rust-version = "1.70"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde_json = "1"
serde = { version = "1", features = ["derive"] }
tauri = { version = "2", features = [] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: ProgressCallback | undefined,
    stepId: DesktopDeploymentStepId,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    message?: string
  ): void {
    if (!callback) return;

    const stepOrder: DesktopDeploymentStepId[] = [
      'preparing',
      'building',
      'packaging',
      'verifying',
    ];
    const currentIndex = stepOrder.indexOf(stepId);

    const steps: DeploymentStep[] = stepOrder.map((id, idx) => ({
      id,
      name: this.getStepName(id),
      status: idx < currentIndex ? 'completed' : idx === currentIndex ? status : 'pending',
      message: idx === currentIndex ? message : undefined,
    }));

    // Calculate overall progress
    let overallProgress = 0;
    if (status === 'completed') {
      overallProgress = ((currentIndex + 1) / stepOrder.length) * 100;
    } else if (status === 'in_progress') {
      overallProgress = (currentIndex / stepOrder.length) * 100 + 100 / stepOrder.length / 2;
    } else if (status === 'failed') {
      overallProgress = (currentIndex / stepOrder.length) * 100;
    }

    callback({
      platform: 'windows', // Will be updated per-platform in real implementation
      status:
        status === 'failed'
          ? 'failed'
          : status === 'completed' && stepId === 'verifying'
            ? 'completed'
            : 'building',
      steps,
      currentStep: stepId,
      overallProgress: Math.round(overallProgress),
      error: status === 'failed' ? message : undefined,
    });
  }

  /**
   * Get human-readable step name
   */
  private getStepName(stepId: DesktopDeploymentStepId): string {
    switch (stepId) {
      case 'preparing':
        return 'Preparing Tauri configuration';
      case 'building':
        return 'Building desktop applications';
      case 'packaging':
        return 'Packaging installers';
      case 'verifying':
        return 'Verifying builds';
      default:
        return stepId;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let desktopDeployServiceInstance: DesktopDeployService | null = null;

/**
 * Get the DesktopDeployService singleton
 */
export function getDesktopDeployService(): DesktopDeployService {
  if (!desktopDeployServiceInstance) {
    desktopDeployServiceInstance = new DesktopDeployService();
  }
  return desktopDeployServiceInstance;
}
