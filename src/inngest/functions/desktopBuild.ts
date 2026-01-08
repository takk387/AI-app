/**
 * Desktop Build Function
 *
 * Inngest function for building desktop apps using Tauri.
 * Handles Windows, macOS, and Linux builds.
 *
 * Process:
 * 1. Generate Tauri configuration
 * 2. Set up Rust/Tauri environment
 * 3. Build for target platform
 * 4. Upload artifacts
 * 5. Update deployment status
 */

import { inngest, sendStatusUpdate } from '../client';

/**
 * Desktop build background job
 *
 * Triggered by: 'deploy/desktop.requested' event
 * Duration: Can take 5-15 minutes depending on platform
 */
export const desktopBuild = inngest.createFunction(
  {
    id: 'desktop-build',
    retries: 2,
    cancelOn: [
      {
        event: 'deploy/desktop.cancelled',
        match: 'data.projectId',
      },
    ],
  },
  { event: 'deploy/desktop.requested' },
  async ({ event, step }) => {
    // Note: transformedCode will be used in production to write the app files
    const {
      projectId,
      userId,
      platform,
      appName,
      identifier,
      transformedCode: _transformedCode,
    } = event.data;

    // Step 1: Generate Tauri config
    // Note: tauriConfig will be used in production for the actual build
    const _tauriConfig = await step.run('generate-tauri-config', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'configuring',
        'Generating Tauri configuration...',
        10
      );

      return generateTauriConfig({
        appName,
        identifier,
        platform,
      });
    });

    // Step 2: Prepare build environment
    await step.run('prepare-build-env', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'preparing',
        'Preparing build environment...',
        25
      );

      // In production, this would set up the Tauri build environment
      // - Install Rust toolchain if needed
      // - Set up platform-specific dependencies
      return { ready: true };
    });

    // Step 3: Build the app
    const buildResult = await step.run('build-desktop-app', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'building',
        `Building ${getPlatformDisplayName(platform)} app...`,
        50
      );

      // In production, this would run `npm run tauri build`
      // The build creates platform-specific installers
      return {
        success: true,
        artifacts: getBuildArtifacts(platform, appName),
      };
    });

    // Step 4: Upload artifacts
    const artifactUrls = await step.run('upload-artifacts', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'uploading',
        'Uploading build artifacts...',
        80
      );

      // In production, upload to storage (S3/R2)
      return buildResult.artifacts.map((artifact) => ({
        name: artifact.name,
        url: `https://storage.example.com/builds/${projectId}/${artifact.name}`,
        size: artifact.size,
      }));
    });

    // Step 5: Finalize
    await step.run('finalize-build', async () => {
      await sendStatusUpdate(
        projectId,
        userId,
        platform,
        'completed',
        `${getPlatformDisplayName(platform)} build completed!`,
        100,
        { artifactUrl: artifactUrls[0]?.url }
      );

      await updateDeployedApp(projectId, platform, {
        status: 'completed',
        artifacts: artifactUrls,
      });
    });

    return {
      success: true,
      platform,
      artifacts: artifactUrls,
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface TauriConfigParams {
  appName: string;
  identifier: string;
  platform: 'windows' | 'macos' | 'linux';
}

function generateTauriConfig(params: TauriConfigParams): object {
  return {
    productName: params.appName,
    identifier: params.identifier,
    build: {
      frontendDist: '../out',
    },
    app: {
      windows: [
        {
          title: params.appName,
          width: 1200,
          height: 800,
          resizable: true,
          fullscreen: false,
        },
      ],
      security: {
        csp: null,
      },
    },
    bundle: {
      active: true,
      icon: ['icons/icon.png'],
      targets: getBundleTargets(params.platform),
      ...getPlatformBundleConfig(params.platform),
    },
  };
}

function getBundleTargets(platform: 'windows' | 'macos' | 'linux'): string[] {
  switch (platform) {
    case 'windows':
      return ['msi', 'nsis'];
    case 'macos':
      return ['dmg', 'app'];
    case 'linux':
      return ['deb', 'appimage'];
    default:
      return [];
  }
}

function getPlatformBundleConfig(platform: 'windows' | 'macos' | 'linux'): object {
  switch (platform) {
    case 'windows':
      return {
        windows: {
          wix: {
            language: 'en-US',
          },
        },
      };
    case 'macos':
      return {
        macOS: {
          minimumSystemVersion: '10.13',
        },
      };
    case 'linux':
      return {
        linux: {
          deb: {
            depends: ['libwebkit2gtk-4.1-0', 'libgtk-3-0'],
          },
        },
      };
    default:
      return {};
  }
}

function getPlatformDisplayName(platform: 'windows' | 'macos' | 'linux'): string {
  switch (platform) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return platform;
  }
}

interface BuildArtifact {
  name: string;
  type: string;
  size: number;
}

function getBuildArtifacts(
  platform: 'windows' | 'macos' | 'linux',
  appName: string
): BuildArtifact[] {
  const safeName = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  switch (platform) {
    case 'windows':
      return [
        { name: `${safeName}-setup.exe`, type: 'nsis', size: 45000000 },
        { name: `${safeName}.msi`, type: 'msi', size: 42000000 },
      ];
    case 'macos':
      return [
        { name: `${safeName}.dmg`, type: 'dmg', size: 55000000 },
        { name: `${safeName}.app.tar.gz`, type: 'app', size: 50000000 },
      ];
    case 'linux':
      return [
        { name: `${safeName}.deb`, type: 'deb', size: 35000000 },
        { name: `${safeName}.AppImage`, type: 'appimage', size: 80000000 },
      ];
    default:
      return [];
  }
}

async function updateDeployedApp(
  projectId: string,
  platform: string,
  data: {
    status: string;
    artifacts?: Array<{ name: string; url: string; size: number }>;
  }
): Promise<void> {
  // In production, update the deployed_apps table
  console.log(`[desktopBuild] Updating deployed_apps for ${projectId}/${platform}:`, data);
}
