/**
 * /api/cloudflare/projects
 *
 * Manage Cloudflare Pages projects - list, get, and delete.
 *
 * SECURITY NOTE: These routes access organization-level Cloudflare resources.
 * Ownership is verified by checking the deployed_apps table for matching hostingProjectId.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getCloudflareService, getDeployedAppsService } from '@/services/deployment';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const CloudflareActionRequestSchema = z.object({
  projectName: z.string().min(1).max(100),
  action: z.enum([
    'listDeployments',
    'getDeployment',
    'rollback',
    'retry',
    'cancel',
    'listDomains',
  ] as const),
  deploymentId: z.string().optional(),
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET - List user's Cloudflare Pages projects (filtered by ownership via deployed_apps)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectName = url.searchParams.get('name');

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's deployed apps with Cloudflare hosting
    const deployedAppsService = getDeployedAppsService();
    const userApps = await deployedAppsService.list({
      userId: user.id,
      platform: 'web',
    });

    const userProjectIds = new Set(
      (userApps.data || [])
        .filter((app) => app.hostingProvider === 'cloudflare' && app.hostingProjectId)
        .map((app) => app.hostingProjectId)
    );

    const cloudflareService = getCloudflareService();

    // Get specific project (verify ownership)
    if (projectName) {
      // Verify user owns this project
      if (!userProjectIds.has(projectName)) {
        return NextResponse.json(
          { success: false, error: 'Project not found or unauthorized' },
          { status: 403 }
        );
      }

      const project = await cloudflareService.getProject(projectName);

      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        project,
      });
    }

    // List only projects the user owns
    const allProjects = await cloudflareService.listProjects();
    const userProjects = allProjects.filter((p) => userProjectIds.has(p.name));

    return NextResponse.json({
      success: true,
      projects: userProjects,
    });
  } catch (error) {
    console.error('Cloudflare list projects error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list projects' }, { status: 500 });
  }
}

/**
 * DELETE - Delete a Cloudflare Pages project (with ownership verification)
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const projectName = url.searchParams.get('name');

    if (!projectName) {
      return NextResponse.json({ success: false, error: 'Project name required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this project via deployed_apps
    const deployedAppsService = getDeployedAppsService();
    const userApps = await deployedAppsService.list({
      userId: user.id,
      platform: 'web',
    });

    const ownsProject = (userApps.data || []).some(
      (app) => app.hostingProvider === 'cloudflare' && app.hostingProjectId === projectName
    );

    if (!ownsProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found or unauthorized' },
        { status: 403 }
      );
    }

    const cloudflareService = getCloudflareService();
    const result = await cloudflareService.deleteProject(projectName);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted',
    });
  } catch (error) {
    console.error('Cloudflare delete project error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

/**
 * POST - Perform actions on a project (list deployments, rollback, etc.)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = CloudflareActionRequestSchema.safeParse(body);
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

    const { projectName, action, deploymentId } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this project via deployed_apps
    const deployedAppsService = getDeployedAppsService();
    const userApps = await deployedAppsService.list({
      userId: user.id,
      platform: 'web',
    });

    const ownsProject = (userApps.data || []).some(
      (app) => app.hostingProvider === 'cloudflare' && app.hostingProjectId === projectName
    );

    if (!ownsProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found or unauthorized' },
        { status: 403 }
      );
    }

    const cloudflareService = getCloudflareService();

    switch (action) {
      case 'listDeployments': {
        const deployments = await cloudflareService.listDeployments(projectName);
        return NextResponse.json({
          success: true,
          deployments,
        });
      }

      case 'getDeployment': {
        if (!deploymentId) {
          return NextResponse.json(
            { success: false, error: 'Deployment ID required' },
            { status: 400 }
          );
        }
        const deployment = await cloudflareService.getDeployment(projectName, deploymentId);
        if (!deployment) {
          return NextResponse.json(
            { success: false, error: 'Deployment not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          deployment,
        });
      }

      case 'rollback': {
        if (!deploymentId) {
          return NextResponse.json(
            { success: false, error: 'Deployment ID required' },
            { status: 400 }
          );
        }
        const deployment = await cloudflareService.rollbackDeployment(projectName, deploymentId);
        return NextResponse.json({
          success: true,
          deployment,
        });
      }

      case 'retry': {
        if (!deploymentId) {
          return NextResponse.json(
            { success: false, error: 'Deployment ID required' },
            { status: 400 }
          );
        }
        const deployment = await cloudflareService.retryDeployment(projectName, deploymentId);
        return NextResponse.json({
          success: true,
          deployment,
        });
      }

      case 'cancel': {
        if (!deploymentId) {
          return NextResponse.json(
            { success: false, error: 'Deployment ID required' },
            { status: 400 }
          );
        }
        const deployment = await cloudflareService.cancelDeployment(projectName, deploymentId);
        return NextResponse.json({
          success: true,
          deployment,
        });
      }

      case 'listDomains': {
        const domains = await cloudflareService.listDomains(projectName);
        return NextResponse.json({
          success: true,
          domains,
        });
      }

      default: {
        // TypeScript exhaustive check - this should never be reached
        const _exhaustiveCheck: never = action;
        return NextResponse.json(
          { success: false, error: `Unknown action: ${_exhaustiveCheck}` },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Cloudflare action error:', error);
    return NextResponse.json({ success: false, error: 'Action failed' }, { status: 500 });
  }
}
