/**
 * Mobile Build Function
 *
 * Inngest function for building iOS and Android apps using Capacitor + EAS Build.
 * This is a long-running process that handles:
 * 1. Generating Capacitor configuration
 * 2. Preparing native project files
 * 3. Triggering EAS Build
 * 4. Polling for build completion
 * 5. Updating deployment status
 */

import { inngest, sendStatusUpdate } from '../client';

/**
 * Mobile build background job
 *
 * Triggered by: 'deploy/mobile.requested' event
 * Duration: Can take 10-30+ minutes depending on platform
 */
export const mobileBuild = inngest.createFunction(
  {
    id: 'mobile-build',
    retries: 2,
    // Cancel if taking too long (45 minutes max)
    cancelOn: [
      {
        event: 'deploy/mobile.cancelled',
        match: 'data.projectId',
      },
    ],
  },
  { event: 'deploy/mobile.requested' },
  async ({ event, step }) => {
    // Note: easProfile will be used in production when triggering EAS Build
    const {
      projectId,
      userId,
      platform,
      appName,
      bundleId,
      transformedCode,
      easProfile: _easProfile,
    } = event.data;

    // Step 1: Generate Capacitor config
    const capacitorConfig = await step.run('generate-capacitor-config', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'configuring',
        'Generating Capacitor configuration...',
        10
      );

      return generateCapacitorConfig({
        appName,
        bundleId,
        platform,
      });
    });

    // Step 2: Prepare native project
    // Note: nativeProject contains files that will be used in production EAS build
    const _nativeProject = await step.run('prepare-native-project', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'preparing',
        'Preparing native project files...',
        25
      );

      return prepareNativeProject({
        transformedCode,
        capacitorConfig,
        platform,
      });
    });

    // Step 3: Trigger EAS Build
    const buildId = await step.run('trigger-eas-build', async () => {
      await sendStatusUpdate(projectId, userId, platform, 'building', 'Starting EAS Build...', 40);

      // In production, this would call the EAS Build API
      // For now, return a mock build ID
      return `build-${projectId.substring(0, 8)}-${Date.now()}`;
    });

    // Step 4: Wait for build to start processing
    await step.sleep('wait-for-build-start', '10s');

    // Step 5: Poll for build completion
    const buildResult = await step.run('poll-build-status', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'building',
        'Building native app (this may take 10-20 minutes)...',
        50
      );

      // In production, this would poll EAS Build API
      // Simulating a successful build
      return {
        status: 'success',
        artifactUrl: `https://expo.dev/artifacts/${buildId}/${platform === 'ios' ? 'app.ipa' : 'app.apk'}`,
      };
    });

    // Step 6: Handle build result
    if (buildResult.status === 'success') {
      await step.run('update-success-status', async () => {
        await sendStatusUpdate(
          projectId,
          userId,
          platform,
          'completed',
          `${platform === 'ios' ? 'iOS' : 'Android'} build completed successfully!`,
          100,
          { artifactUrl: buildResult.artifactUrl }
        );

        // Update deployed_apps table
        await updateDeployedApp(projectId, platform, {
          status: 'completed',
          artifactUrl: buildResult.artifactUrl,
          buildId,
        });
      });

      return {
        success: true,
        buildId,
        artifactUrl: buildResult.artifactUrl,
      };
    } else {
      await step.run('update-failure-status', async () => {
        await sendStatusUpdate(
          projectId,
          userId,
          platform,
          'failed',
          'Build failed. Please check the logs.',
          0,
          { error: 'Build failed' }
        );

        await updateDeployedApp(projectId, platform, {
          status: 'failed',
          buildId,
        });
      });

      return {
        success: false,
        buildId,
        error: 'Build failed',
      };
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface CapacitorConfigParams {
  appName: string;
  bundleId: string;
  platform: 'ios' | 'android';
}

function generateCapacitorConfig(params: CapacitorConfigParams): string {
  return JSON.stringify(
    {
      appId: params.bundleId,
      appName: params.appName,
      webDir: 'out',
      plugins: {
        SplashScreen: {
          launchAutoHide: false,
        },
      },
      ios: {
        contentInset: 'automatic',
      },
      android: {
        allowMixedContent: true,
      },
    },
    null,
    2
  );
}

interface NativeProjectParams {
  transformedCode: string;
  capacitorConfig: string;
  platform: 'ios' | 'android';
}

async function prepareNativeProject(params: NativeProjectParams): Promise<{
  ready: boolean;
  files: string[];
}> {
  // In production, this would:
  // 1. Extract the transformed code
  // 2. Run `npx cap add <platform>`
  // 3. Run `npx cap sync`
  // 4. Package for EAS Build

  console.log(`[mobileBuild] Preparing ${params.platform} project`);

  return {
    ready: true,
    files: [
      'capacitor.config.json',
      params.platform === 'ios' ? 'ios/App/App.xcodeproj' : 'android/app/build.gradle',
    ],
  };
}

async function updateDeployedApp(
  projectId: string,
  platform: string,
  data: {
    status: string;
    artifactUrl?: string;
    buildId?: string;
  }
): Promise<void> {
  // In production, this would update the deployed_apps table
  console.log(`[mobileBuild] Updating deployed_apps for ${projectId}/${platform}:`, data);
}
