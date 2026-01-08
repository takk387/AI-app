/**
 * MobileDeployService
 *
 * Handles iOS and Android deployment via Capacitor and EAS Build.
 * Coordinates with Inngest background jobs for long-running builds.
 */

import type {
  MobileDeployConfig,
  DeploymentProgress,
  DeploymentStep,
} from '@/types/deployment/unified';
import type {
  MobileBuildResult,
  MobileBuildStatus as MobileBuildStatusType,
} from '@/types/deployment/mobile';
import { triggerMobileBuild, cancelMobileBuild } from '@/inngest/client';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Capacitor configuration for mobile projects
 */
export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  plugins?: Record<string, unknown>;
  ios?: {
    scheme?: string;
    contentInset?: string;
  };
  android?: {
    buildOptions?: {
      keystorePath?: string;
      keystorePassword?: string;
      keystoreAlias?: string;
      keystoreAliasPassword?: string;
    };
  };
}

/**
 * EAS Build configuration
 */
export interface EASBuildConfig {
  build: {
    development?: Record<string, unknown>;
    preview?: Record<string, unknown>;
    production?: {
      ios?: {
        buildConfiguration?: string;
        image?: string;
      };
      android?: {
        buildType?: string;
        gradleCommand?: string;
      };
    };
  };
  submit?: {
    production?: {
      ios?: {
        appleId?: string;
        ascAppId?: string;
      };
      android?: {
        serviceAccountKeyPath?: string;
        track?: string;
      };
    };
  };
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: DeploymentProgress) => void;

/**
 * Mobile deployment step names
 */
type MobileDeployStepId = 'preparing' | 'building' | 'deploying' | 'verifying';

// ============================================================================
// MOBILE DEPLOY SERVICE
// ============================================================================

export class MobileDeployService {
  /**
   * Deploy to mobile platform (iOS or Android)
   */
  async deploy(
    projectId: string,
    userId: string,
    config: MobileDeployConfig,
    transformedCode: string,
    onProgress?: ProgressCallback
  ): Promise<MobileBuildResult> {
    try {
      // Step 1: Prepare
      this.reportProgress(onProgress, 'preparing', 'in_progress', 'Preparing mobile build...');

      // Generate Capacitor config
      const capacitorConfig = this.generateCapacitorConfig(config);

      this.reportProgress(onProgress, 'preparing', 'completed', 'Build configuration ready');

      // Step 2: Trigger background build via Inngest
      this.reportProgress(onProgress, 'building', 'in_progress', 'Starting build process...');

      // Determine which platforms to build
      const platformsToBuilt: ('ios' | 'android')[] =
        config.platform === 'both' ? ['ios', 'android'] : [config.platform];

      // Trigger the Inngest function for each platform
      for (const platform of platformsToBuilt) {
        await triggerMobileBuild({
          projectId,
          userId,
          platform: platform as 'ios' | 'android',
          appName: config.appName,
          bundleId: config.bundleId,
          transformedCode,
          easProfile: this.mapBuildTypeToProfile(config.iosBuildType),
        });
      }

      this.reportProgress(
        onProgress,
        'building',
        'in_progress',
        `${config.platform.toUpperCase()} build queued. This may take 10-30 minutes.`
      );

      // Return pending status - the build continues in background
      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress(onProgress, 'building', 'failed', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Cancel an in-progress build
   */
  async cancelBuild(
    projectId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await cancelMobileBuild({ projectId, userId });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel build',
      };
    }
  }

  /**
   * Get build status
   */
  async getBuildStatus(_projectId: string): Promise<MobileBuildStatusType> {
    // In production, query the deployed_apps table or EAS Build API
    console.log(`[MobileDeployService] Getting build status`);

    // Placeholder - return pending status
    return {
      overallStatus: 'pending',
    };
  }

  /**
   * Generate Capacitor configuration
   */
  generateCapacitorConfig(config: MobileDeployConfig): CapacitorConfig {
    const capacitorConfig: CapacitorConfig = {
      appId: config.bundleId || `com.app.${config.appName?.replace(/\s+/g, '').toLowerCase()}`,
      appName: config.appName || 'My App',
      webDir: 'out', // Next.js static export directory
      bundledWebRuntime: false,
      plugins: {},
    };

    // Add platform-specific config
    if (config.platform === 'ios' || config.platform === 'both') {
      capacitorConfig.ios = {
        scheme: config.appName?.replace(/\s+/g, '') || 'App',
      };
    }

    if (config.platform === 'android' || config.platform === 'both') {
      capacitorConfig.android = {
        buildOptions: {},
      };
    }

    return capacitorConfig;
  }

  /**
   * Generate EAS Build configuration
   */
  generateEASConfig(config: MobileDeployConfig): EASBuildConfig {
    const easConfig: EASBuildConfig = {
      build: {
        development: {
          developmentClient: true,
          distribution: 'internal',
        },
        preview: {
          distribution: 'internal',
        },
        production: {},
      },
    };

    // Platform-specific production config
    if (config.platform === 'ios' || config.platform === 'both') {
      easConfig.build.production!.ios = {
        buildConfiguration: 'Release',
        image: 'latest',
      };
    }

    if (config.platform === 'android' || config.platform === 'both') {
      easConfig.build.production!.android = {
        buildType: 'apk', // or 'app-bundle' for Play Store
        gradleCommand: ':app:assembleRelease',
      };
    }

    return easConfig;
  }

  /**
   * Validate mobile deployment config
   */
  validateConfig(config: MobileDeployConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.platform) {
      errors.push('Platform is required (ios, android, or both)');
    }

    if (!config.appName) {
      errors.push('App name is required');
    }

    if (!config.bundleId) {
      errors.push('Bundle ID is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Map build type to EAS profile
   */
  private mapBuildTypeToProfile(
    buildType: MobileDeployConfig['iosBuildType']
  ): 'development' | 'preview' | 'production' {
    switch (buildType) {
      case 'development':
        return 'development';
      case 'preview':
        return 'preview';
      case 'production':
        return 'production';
      default:
        return 'production';
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: ProgressCallback | undefined,
    stepId: MobileDeployStepId,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    message?: string
  ): void {
    if (!callback) return;

    const stepOrder: MobileDeployStepId[] = ['preparing', 'building', 'deploying', 'verifying'];
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
      platform: 'ios',
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
  private getStepName(stepId: MobileDeployStepId): string {
    switch (stepId) {
      case 'preparing':
        return 'Preparing build configuration';
      case 'building':
        return 'Building mobile app';
      case 'deploying':
        return 'Deploying to store';
      case 'verifying':
        return 'Verifying deployment';
      default:
        return stepId;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let mobileDeployServiceInstance: MobileDeployService | null = null;

/**
 * Get the MobileDeployService singleton
 */
export function getMobileDeployService(): MobileDeployService {
  if (!mobileDeployServiceInstance) {
    mobileDeployServiceInstance = new MobileDeployService();
  }
  return mobileDeployServiceInstance;
}
