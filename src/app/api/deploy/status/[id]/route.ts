/**
 * GET /api/deploy/status/[id]
 *
 * Get deployment status by ID.
 * Used for polling deployment progress.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDeployedAppsService } from '@/services/deployment';

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET - Get deployment status
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Deployment ID required' },
        { status: 400 }
      );
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

    // Get deployment
    const deployedAppsService = getDeployedAppsService();
    const result = await deployedAppsService.getById(id);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Deployment not found' },
        { status: 404 }
      );
    }

    const deployment = result.data;

    // Verify ownership
    if (deployment.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        projectId: deployment.projectId,
        platform: deployment.platform,
        status: deployment.status,
        deploymentUrl: deployment.deploymentUrl,
        customDomain: deployment.customDomain,
        databaseProvider: deployment.databaseProvider,
        hostingProvider: deployment.hostingProvider,
        createdAt: deployment.createdAt,
        updatedAt: deployment.updatedAt,
        lastDeployedAt: deployment.lastDeployedAt,
      },
    });
  } catch (error) {
    console.error('Get deployment status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel or delete a deployment
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Deployment ID required' },
        { status: 400 }
      );
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

    // Get deployment to verify ownership
    const deployedAppsService = getDeployedAppsService();
    const getResult = await deployedAppsService.getById(id);

    if (!getResult.success || !getResult.data) {
      return NextResponse.json({ success: false, error: 'Deployment not found' }, { status: 404 });
    }

    if (getResult.data.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Update status to deleted (soft delete)
    const updateResult = await deployedAppsService.update(id, {
      status: 'deleted',
    });

    if (!updateResult.success) {
      return NextResponse.json({ success: false, error: updateResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Deployment deleted',
    });
  } catch (error) {
    console.error('Delete deployment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete deployment' },
      { status: 500 }
    );
  }
}
