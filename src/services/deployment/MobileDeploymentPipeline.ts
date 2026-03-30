/**
 * MobileDeploymentPipeline
 *
 * Mobile deployment steps: validate, generate Capacitor config, sync native projects,
 * build iOS, build Android, upload to EAS.
 */

import type { MobileDeployConfig } from '@/types/deployment/unified';
import type { DeploymentContext, StepResult, MobileDeploymentResult } from './deploymentTypes';
import { MOBILE_STEPS } from './deploymentTypes';
import type { PipelineCallbacks } from './WebDeploymentPipeline';

import { getMobileDeployService } from './MobileDeployService';

// ============================================================================
// MOBILE DEPLOYMENT PIPELINE
// ============================================================================

/**
 * Execute the full mobile deployment pipeline.
 */
export async function executeMobilePipeline(
  config: MobileDeployConfig,
  callbacks: PipelineCallbacks
): Promise<MobileDeploymentResult> {
  const context = callbacks.getContext();
  context.mobileConfig = config;
  callbacks.initializeProgress(MOBILE_STEPS);

  try {
    // Step 1: Validate
    await callbacks.executeStep('validate', () => validateMobileConfig(config));

    // Step 2: Generate Capacitor config
    await callbacks.executeStep('generate-config', () => generateCapacitorConfig(config, context));

    // Step 3: Sync native projects
    await callbacks.executeStep('sync', () => syncCapacitorProjects(context));

    // Step 4: Build iOS (skip if not targeting iOS)
    if (config.platform === 'ios' || config.platform === 'both') {
      await callbacks.executeStep('build-ios', () => buildIOS(config, context));
    } else {
      callbacks.skipStep('build-ios');
    }

    // Step 5: Build Android (skip if not targeting Android)
    if (config.platform === 'android' || config.platform === 'both') {
      await callbacks.executeStep('build-android', () => buildAndroid(config, context));
    } else {
      callbacks.skipStep('build-android');
    }

    // Step 6: Upload to EAS
    await callbacks.executeStep('upload', () => uploadToEAS(context));

    callbacks.completeDeployment();

    return {
      success: true,
      iosBuildUrl: context.mobileBuild?.builds?.ios?.artifacts?.buildUrl,
      androidBuildUrl: context.mobileBuild?.builds?.android?.artifacts?.buildUrl,
      context,
    };
  } catch (error) {
    return callbacks.handleError(error);
  }
}

// ============================================================================
// STEP IMPLEMENTATIONS
// ============================================================================

async function validateMobileConfig(config: MobileDeployConfig): Promise<StepResult> {
  if (!config.bundleId?.trim()) {
    return { success: false, error: 'Bundle ID is required' };
  }

  const bundleIdRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;
  if (!bundleIdRegex.test(config.bundleId)) {
    return { success: false, error: 'Invalid bundle ID format' };
  }

  return { success: true };
}

async function generateCapacitorConfig(
  config: MobileDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const mobileService = getMobileDeployService();
    const capacitorConfig = mobileService.generateCapacitorConfig(config);

    // Store config in context for later steps
    context.mobileConfig = config;

    return {
      success: true,
      data: {
        appId: capacitorConfig.appId,
        appName: capacitorConfig.appName,
        webDir: capacitorConfig.webDir,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate Capacitor config',
    };
  }
}

async function syncCapacitorProjects(context: DeploymentContext): Promise<StepResult> {
  try {
    // Capacitor sync is handled by the mobile deploy service
    // as part of the build process. This step validates readiness.
    const config = context.mobileConfig;
    if (!config) {
      return { success: false, error: 'Mobile config not available' };
    }

    const mobileService = getMobileDeployService();
    const validation = mobileService.validateConfig(config);

    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    return { success: true, data: { syncReady: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Capacitor projects',
    };
  }
}

async function buildIOS(
  config: MobileDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const mobileService = getMobileDeployService();

    // Trigger iOS build via Inngest background job
    const result = await mobileService.deploy(
      context.projectId,
      context.userId,
      { ...config, platform: 'ios' },
      JSON.stringify(context.transformedCode || {})
    );

    if (!result.success) {
      return { success: false, error: result.error || 'iOS build failed to start' };
    }

    // Store partial build result
    context.mobileBuild = result;

    return {
      success: true,
      data: {
        platform: 'ios',
        status: 'queued',
        message: 'iOS build queued. This may take 10-30 minutes.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'iOS build failed',
    };
  }
}

async function buildAndroid(
  config: MobileDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const mobileService = getMobileDeployService();

    // Trigger Android build via Inngest background job
    const result = await mobileService.deploy(
      context.projectId,
      context.userId,
      { ...config, platform: 'android' },
      JSON.stringify(context.transformedCode || {})
    );

    if (!result.success) {
      return { success: false, error: result.error || 'Android build failed to start' };
    }

    // Merge with existing build result
    if (context.mobileBuild) {
      context.mobileBuild = {
        ...context.mobileBuild,
        ...result,
      };
    } else {
      context.mobileBuild = result;
    }

    return {
      success: true,
      data: {
        platform: 'android',
        status: 'queued',
        message: 'Android build queued. This may take 10-30 minutes.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Android build failed',
    };
  }
}

async function uploadToEAS(context: DeploymentContext): Promise<StepResult> {
  try {
    // EAS upload is handled automatically by the MobileDeployService
    // as part of the build process via Inngest.
    // This step confirms the builds were queued successfully.

    if (!context.mobileBuild?.success) {
      return { success: false, error: 'No successful builds to upload' };
    }

    return {
      success: true,
      data: {
        message: 'Builds submitted to EAS. Check your Expo dashboard for status.',
        builds: context.mobileBuild.builds,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'EAS upload failed',
    };
  }
}
