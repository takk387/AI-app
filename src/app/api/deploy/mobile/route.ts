/**
 * POST /api/deploy/mobile
 *
 * Build and deploy mobile apps (iOS/Android) via Capacitor and EAS Build.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createDeploymentOrchestrator, getDeployedAppsService } from '@/services/deployment';
import type { MobileDeployConfig, MobileBuildType } from '@/types/deployment/unified';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const MobileDeployRequestSchema = z.object({
  projectId: z.string().uuid(),
  config: z.object({
    platform: z.enum(['ios', 'android', 'both'] as const),
    appName: z.string().min(1).max(100),
    bundleId: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i, 'Invalid bundle ID format'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in x.y.z format'),
    iosBuildType: z.enum(['development', 'preview', 'production'] as const).default('preview'),
    androidBuildType: z.enum(['development', 'preview', 'production'] as const).default('preview'),
    easProjectId: z.string().optional(),
  }),
});

type _MobileDeployRequest = z.infer<typeof MobileDeployRequestSchema>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Start mobile build
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = MobileDeployRequestSchema.safeParse(body);
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

    // Determine platforms to build
    const platforms: ('ios' | 'android')[] =
      config.platform === 'both' ? ['ios', 'android'] : [config.platform];

    // Create deployed app records for each platform
    const deployedAppsService = getDeployedAppsService();
    const deploymentIds: Record<string, string> = {};

    for (const platform of platforms) {
      const createResult = await deployedAppsService.create({
        userId: user.id,
        projectId,
        platform,
        config: {
          bundleId: config.bundleId,
          appName: config.appName,
          version: config.version,
          buildType: platform === 'ios' ? config.iosBuildType : config.androidBuildType,
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
    const mobileConfig: MobileDeployConfig = {
      platform: config.platform,
      appName: config.appName,
      bundleId: config.bundleId,
      version: config.version,
      iosBuildType: config.iosBuildType as MobileBuildType,
      androidBuildType: config.androidBuildType as MobileBuildType,
      easProjectId: config.easProjectId,
    };

    // Determine primary platform for orchestrator
    const primaryPlatform = config.platform === 'both' ? 'ios' : config.platform;

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
      .deployMobile(mobileConfig)
      .then(async (result) => {
        for (const [platform, deploymentId] of Object.entries(deploymentIds)) {
          if (result.success) {
            const artifactUrl = platform === 'ios' ? result.iosBuildUrl : result.androidBuildUrl;
            await deployedAppsService.update(deploymentId, {
              status: 'active',
              artifactUrl,
              lastDeployedAt: new Date().toISOString(),
            });
          } else {
            console.error(`Mobile deployment failed for ${platform}:`, result.error);
            await deployedAppsService.markFailed(deploymentId);
          }
        }
      })
      .catch(async (error) => {
        console.error('Mobile deployment error:', error);
        for (const deploymentId of Object.values(deploymentIds)) {
          await deployedAppsService.markFailed(deploymentId);
        }
      });

    return NextResponse.json({
      success: true,
      deploymentIds,
      message: 'Mobile build started',
    });
  } catch (error) {
    console.error('Mobile deploy error:', error);
    return NextResponse.json({ success: false, error: 'Mobile build failed' }, { status: 500 });
  }
}

/**
 * GET - List mobile deployments for a project
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const platform = url.searchParams.get('platform') as 'ios' | 'android' | null;

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

    // Get iOS and Android deployments
    const platforms = platform ? [platform] : (['ios', 'android'] as const);
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
    console.error('List mobile deployments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list deployments' },
      { status: 500 }
    );
  }
}
