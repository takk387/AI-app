/**
 * POST /api/deploy/database
 *
 * Provision a database for a project (Turso or Neon).
 * Can be used standalone without full deployment.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getTursoService, getNeonService } from '@/services/deployment';
import type { DatabaseProvider } from '@/types/deployment/unified';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const DatabaseProvisionRequestSchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string().min(1).max(100),
  provider: z.enum(['turso', 'neon'] as const),
  region: z.string().optional(),
});

type _DatabaseProvisionRequest = z.infer<typeof DatabaseProvisionRequestSchema>;

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST - Provision a new database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = DatabaseProvisionRequestSchema.safeParse(body);
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

    const { projectId, projectName, provider, region } = parseResult.data;

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

    // Provision database based on provider
    let result;
    if (provider === 'turso') {
      const tursoService = getTursoService();
      result = await tursoService.provisionDatabase({
        projectId,
        projectName,
        region: region as Parameters<typeof tursoService.provisionDatabase>[0]['region'],
      });

      if (result.success && result.database) {
        return NextResponse.json({
          success: true,
          provider: 'turso' as DatabaseProvider,
          database: {
            name: result.database.name,
            id: result.database.dbId,
            hostname: result.database.hostname,
            connectionUrl: result.database.connectionUrl,
            region: result.database.primaryRegion,
            createdAt: result.database.createdAt,
          },
        });
      }
    } else {
      const neonService = getNeonService();
      result = await neonService.provisionDatabase({
        projectId,
        projectName,
        region: region as Parameters<typeof neonService.provisionDatabase>[0]['region'],
      });

      if (result.success && result.database) {
        return NextResponse.json({
          success: true,
          provider: 'neon' as DatabaseProvider,
          database: {
            projectId: result.database.projectId,
            name: result.database.projectName,
            branchId: result.database.branchId,
            endpointHost: result.database.endpointHost,
            connectionUri: result.database.connectionUri,
            poolerConnectionUri: result.database.poolerConnectionUri,
            region: result.database.region,
            createdAt: result.database.createdAt,
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: result?.error || 'Database provisioning failed' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Database provision error:', error);
    return NextResponse.json(
      { success: false, error: 'Database provisioning failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a provisioned database
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider') as DatabaseProvider | null;
    const databaseId = url.searchParams.get('databaseId');
    const projectId = url.searchParams.get('projectId');

    if (!provider || !databaseId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Provider, databaseId, and projectId required' },
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

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('project_documentation')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or unauthorized' },
        { status: 403 }
      );
    }

    // Delete database based on provider
    let result;
    if (provider === 'turso') {
      const tursoService = getTursoService();
      result = await tursoService.deleteDatabase(databaseId);
    } else if (provider === 'neon') {
      const neonService = getNeonService();
      result = await neonService.deleteProject(databaseId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid provider' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database deleted',
    });
  } catch (error) {
    console.error('Database delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete database' },
      { status: 500 }
    );
  }
}
