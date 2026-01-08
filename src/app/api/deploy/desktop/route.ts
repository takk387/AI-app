/**
 * POST /api/deploy/desktop
 *
 * Build desktop apps (Windows/macOS/Linux) via Tauri.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createDeploymentOrchestrator, getDeployedAppsService } from '@/services/deployment';
import type {
  DesktopDeployConfig,
  WindowsFormat,
  MacOSFormat,
  LinuxFormat,
} from '@/types/deployment/unified';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DesktopDeployRequestSchema = z.object({
  projectId: z.string().uuid(),
  config: z.object({
    platforms: z.array(z.enum(['windows', 'macos', 'linux'] as const)).min(1),
    appName: z.string().min(1).max(100),
    appId: z.string().min(1).max(255),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in x.y.z format'),
    windowsFormat: z.enum(['msi', 'exe', 'portable'] as const).default('msi'),
    macosFormat: z.enum(['dmg', 'app', 'pkg'] as const).default('dmg'),
    linuxFormat: z.enum(['appimage', 'deb', 'rpm'] as const).default('appimage'),
    signApp: z.boolean().default(false),
  }),
});

type _DesktopDeployRequest = z.infer<typeof DesktopDeployRequestSchema>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Start desktop build
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DesktopDeployRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { projectId, config } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('project_documentation')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Create deployed app records for each platform
    const deployedAppsService = getDeployedAppsService();
    const deploymentIds: Record<string, string> = {};

    for (const platform of config.platforms) {
      const createResult = await deployedAppsService.create({
        userId: user.id,
        projectId,
        platform,
        config: {
          appId: config.appId,
          appName: config.appName,
          version: config.version,
          format:
            platform === 'windows'
              ? config.windowsFormat
              : platform === 'macos'
                ? config.macosFormat
                : config.linuxFormat,
          signApp: config.signApp,
        },
      });

      if (createResult.success && createResult.data) {
        deploymentIds[platform] = createResult.data.id;
      }
    }

    // Verify at least one deployment record was created
    if (Object.keys(deploymentIds).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create deployment records' },
        { status: 500 }
      );
    }

    // Create orchestrator and start deployment
    const desktopConfig: DesktopDeployConfig = {
      platforms: config.platforms,
      appName: config.appName,
      appId: config.appId,
      version: config.version,
      windowsFormat: config.windowsFormat as WindowsFormat,
      macosFormat: config.macosFormat as MacOSFormat,
      linuxFormat: config.linuxFormat as LinuxFormat,
      signApp: config.signApp,
    };

    // Use first platform as primary
    const primaryPlatform = config.platforms[0];

    const orchestrator = createDeploymentOrchestrator(
      projectId,
      project.name,
      user.id,
      primaryPlatform,
      {
        onProgress: async (progress) => {
          // Update all platform deployments
          for (const [, deploymentId] of Object.entries(deploymentIds)) {
            await deployedAppsService.update(deploymentId, {
              status:
                progress.status === 'completed'
                  ? 'active'
                  : progress.status === 'failed'
                    ? 'failed'
                    : 'deploying',
              buildStatus: progress.currentStep,
            });
          }
        },
      }
    );

    // Start deployment asynchronously
    orchestrator
      .deployDesktop(desktopConfig)
      .then(async (result) => {
        for (const [platform, deploymentId] of Object.entries(deploymentIds)) {
          if (result.success && result.artifacts) {
            const artifactUrl = result.artifacts[platform as keyof typeof result.artifacts];
            await deployedAppsService.update(deploymentId, {
              status: 'active',
              artifactUrl,
              lastDeployedAt: new Date().toISOString(),
            });
          } else {
            console.error(`Desktop deployment failed for ${platform}:`, result.error);
            await deployedAppsService.markFailed(deploymentId);
          }
        }
      })
      .catch(async (error) => {
        console.error('Desktop deployment error:', error);
        for (const deploymentId of Object.values(deploymentIds)) {
          await deployedAppsService.markFailed(deploymentId);
        }
      });

    return NextResponse.json({
      success: true,
      deploymentIds,
      message: 'Desktop build started',
    });
  } catch (error) {
    console.error('Desktop deploy error:', error);
    return NextResponse.json({ success: false, error: 'Desktop build failed' }, { status: 500 });
  }
}

/**
 * GET - List desktop deployments for a project
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const platform = url.searchParams.get('platform') as 'windows' | 'macos' | 'linux' | null;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const deployedAppsService = getDeployedAppsService();

    // Get deployments for requested platforms
    const platforms = platform ? [platform] : (['windows', 'macos', 'linux'] as const);
    const deployments: Record<string, unknown[]> = {};

    for (const p of platforms) {
      const result = await deployedAppsService.list({
        userId: user.id,
        projectId: projectId || undefined,
        platform: p,
      });

      if (result.success && result.data) {
        deployments[p] = result.data;
      }
    }

    return NextResponse.json({
      success: true,
      deployments,
    });
  } catch (error) {
    console.error('List desktop deployments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list deployments' },
      { status: 500 }
    );
  }
}
