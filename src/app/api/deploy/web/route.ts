/**
 * POST /api/deploy/web
 *
 * Deploy a web application to production (Turso/Neon + Cloudflare).
 * Orchestrates database provisioning, code transformation, and hosting deployment.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createDeploymentOrchestrator, getDeployedAppsService } from '@/services/deployment';
import type {
  WebDeployConfig,
  DatabaseProvider,
  HostingProvider,
} from '@/types/deployment/unified';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const WebDeployRequestSchema = z.object({
  projectId: z.string().uuid(),
  config: z.object({
    database: z.enum(['turso', 'neon', 'byo'] as const),
    databaseUrl: z.string().optional(),
    hosting: z.enum(['cloudflare', 'vercel'] as const),
    customDomain: z.string().optional(),
    environmentVars: z.record(z.string(), z.string()).default({}),
  }),
});

type _WebDeployRequest = z.infer<typeof WebDeployRequestSchema>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Start web deployment
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = WebDeployRequestSchema.safeParse(body);
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

    // Validate BYO database URL
    if (config.database === 'byo' && !config.databaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Database URL required for BYO provider' },
        { status: 400 }
      );
    }

    // Create deployed app record
    const deployedAppsService = getDeployedAppsService();
    const createResult = await deployedAppsService.create({
      userId: user.id,
      projectId,
      platform: 'web',
      databaseProvider: config.database as DatabaseProvider,
      hostingProvider: config.hosting as HostingProvider,
      config: { environmentVars: config.environmentVars },
    });

    if (!createResult.success || !createResult.data) {
      return NextResponse.json(
        { success: false, error: createResult.error || 'Failed to create deployment record' },
        { status: 500 }
      );
    }

    const deployedApp = createResult.data;

    // Create orchestrator and start deployment
    const webConfig: WebDeployConfig = {
      database: config.database,
      databaseUrl: config.databaseUrl,
      hosting: config.hosting,
      customDomain: config.customDomain,
      environmentVars: config.environmentVars,
    };

    const orchestrator = createDeploymentOrchestrator(projectId, project.name, user.id, 'web', {
      onProgress: async (progress) => {
        // Update deployed app status
        await deployedAppsService.update(deployedApp.id, {
          status:
            progress.status === 'completed'
              ? 'active'
              : progress.status === 'failed'
                ? 'failed'
                : 'deploying',
        });
      },
    });

    // Start deployment asynchronously
    // In production, this would be handled by a background job system
    orchestrator
      .deployWeb(webConfig)
      .then(async (result) => {
        if (result.success) {
          await deployedAppsService.markActive(deployedApp.id, result.deploymentUrl || '');
        } else {
          console.error('Web deployment failed:', result.error);
          await deployedAppsService.markFailed(deployedApp.id);
        }
      })
      .catch(async (error) => {
        console.error('Web deployment error:', error);
        await deployedAppsService.markFailed(deployedApp.id);
      });

    return NextResponse.json({
      success: true,
      deploymentId: deployedApp.id,
      message: 'Deployment started',
    });
  } catch (error) {
    console.error('Web deploy error:', error);
    return NextResponse.json({ success: false, error: 'Deployment failed' }, { status: 500 });
  }
}

/**
 * GET - List web deployments for a project
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

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
    const result = await deployedAppsService.list({
      userId: user.id,
      projectId: projectId || undefined,
      platform: 'web',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deployments: result.data,
    });
  } catch (error) {
    console.error('List deployments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list deployments' },
      { status: 500 }
    );
  }
}
