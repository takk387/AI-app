/**
 * DesktopDeploymentPipeline
 *
 * Desktop deployment steps: validate, generate Tauri config,
 * build Windows/macOS/Linux, package installers.
 */

import type { DesktopDeployConfig } from '@/types/deployment/unified';
import type { DeploymentContext, StepResult, DesktopDeploymentResult } from './deploymentTypes';
import { DESKTOP_STEPS } from './deploymentTypes';
import type { PipelineCallbacks } from './WebDeploymentPipeline';

import { getDesktopDeployService } from './DesktopDeployService';

// ============================================================================
// DESKTOP DEPLOYMENT PIPELINE
// ============================================================================

/**
 * Execute the full desktop deployment pipeline.
 */
export async function executeDesktopPipeline(
  config: DesktopDeployConfig,
  callbacks: PipelineCallbacks
): Promise<DesktopDeploymentResult> {
  const context = callbacks.getContext();
  context.desktopConfig = config;
  callbacks.initializeProgress(DESKTOP_STEPS);

  try {
    // Step 1: Validate
    await callbacks.executeStep('validate', () => validateDesktopConfig(config));

    // Step 2: Generate Tauri config
    await callbacks.executeStep('generate-config', () => generateTauriConfig(config, context));

    // Step 3: Build Windows (skip if not targeting)
    if (config.platforms.includes('windows')) {
      await callbacks.executeStep('build-windows', () => buildWindows(config, context));
    } else {
      callbacks.skipStep('build-windows');
    }

    // Step 4: Build macOS (skip if not targeting)
    if (config.platforms.includes('macos')) {
      await callbacks.executeStep('build-macos', () => buildMacOS(config, context));
    } else {
      callbacks.skipStep('build-macos');
    }

    // Step 5: Build Linux (skip if not targeting)
    if (config.platforms.includes('linux')) {
      await callbacks.executeStep('build-linux', () => buildLinux(config, context));
    } else {
      callbacks.skipStep('build-linux');
    }

    // Step 6: Package
    await callbacks.executeStep('package', () => packageInstallers(config));

    callbacks.completeDeployment();

    return {
      success: true,
      artifacts: getDesktopArtifacts(context),
      context,
    };
  } catch (error) {
    return callbacks.handleError(error);
  }
}

// ============================================================================
// STEP IMPLEMENTATIONS
// ============================================================================

async function validateDesktopConfig(config: DesktopDeployConfig): Promise<StepResult> {
  if (!config.appId?.trim()) {
    return { success: false, error: 'App ID is required' };
  }

  if (config.platforms.length === 0) {
    return { success: false, error: 'At least one platform must be selected' };
  }

  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(config.version)) {
    return { success: false, error: 'Invalid version format (expected x.y.z)' };
  }

  return { success: true };
}

async function generateTauriConfig(
  config: DesktopDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const desktopService = getDesktopDeployService();
    const tauriConfig = desktopService.generateTauriConfig(config);

    // Store config in context
    context.desktopConfig = config;

    return {
      success: true,
      data: {
        productName: tauriConfig.productName,
        version: tauriConfig.version,
        identifier: tauriConfig.identifier,
        platforms: config.platforms,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate Tauri config',
    };
  }
}

async function buildWindows(
  config: DesktopDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const desktopService = getDesktopDeployService();

    // Trigger Windows build via Inngest background job
    const result = await desktopService.deploy(
      context.projectId,
      context.userId,
      { ...config, platforms: ['windows'] },
      JSON.stringify(context.transformedCode || {})
    );

    if (!result.success) {
      return { success: false, error: result.error || 'Windows build failed to start' };
    }

    // Initialize or update desktop build result
    context.desktopBuild = context.desktopBuild || { success: true, builds: {} };

    return {
      success: true,
      data: {
        platform: 'windows',
        status: 'queued',
        buildId: result.buildIds?.windows,
        message: 'Windows build queued. This may take 15-45 minutes.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Windows build failed',
    };
  }
}

async function buildMacOS(
  config: DesktopDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const desktopService = getDesktopDeployService();

    // Trigger macOS build via Inngest background job
    const result = await desktopService.deploy(
      context.projectId,
      context.userId,
      { ...config, platforms: ['macos'] },
      JSON.stringify(context.transformedCode || {})
    );

    if (!result.success) {
      return { success: false, error: result.error || 'macOS build failed to start' };
    }

    return {
      success: true,
      data: {
        platform: 'macos',
        status: 'queued',
        buildId: result.buildIds?.macos,
        message: 'macOS build queued. This may take 15-45 minutes.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'macOS build failed',
    };
  }
}

async function buildLinux(
  config: DesktopDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    const desktopService = getDesktopDeployService();

    // Trigger Linux build via Inngest background job
    const result = await desktopService.deploy(
      context.projectId,
      context.userId,
      { ...config, platforms: ['linux'] },
      JSON.stringify(context.transformedCode || {})
    );

    if (!result.success) {
      return { success: false, error: result.error || 'Linux build failed to start' };
    }

    return {
      success: true,
      data: {
        platform: 'linux',
        status: 'queued',
        buildId: result.buildIds?.linux,
        message: 'Linux build queued. This may take 15-45 minutes.',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Linux build failed',
    };
  }
}

async function packageInstallers(config: DesktopDeployConfig): Promise<StepResult> {
  try {
    // Packaging is handled by the Tauri build process via Inngest.
    // This step confirms all platform builds were queued successfully.

    const desktopService = getDesktopDeployService();
    const validation = desktopService.validateConfig(config);

    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    return {
      success: true,
      data: {
        message: 'Desktop builds submitted. Check your build dashboard for status.',
        platforms: config.platforms,
        formats: {
          windows: config.windowsFormat,
          macos: config.macosFormat,
          linux: config.linuxFormat,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Installer packaging failed',
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getDesktopArtifacts(context: DeploymentContext): DesktopDeploymentResult['artifacts'] {
  const builds = context.desktopBuild?.builds;
  if (!builds) return undefined;

  return {
    windows: builds.windows?.artifacts?.[0]?.downloadUrl,
    macos: builds.macos?.artifacts?.[0]?.downloadUrl,
    linux: builds.linux?.artifacts?.[0]?.downloadUrl,
  };
}
