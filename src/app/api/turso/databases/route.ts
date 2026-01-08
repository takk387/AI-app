/**
 * /api/turso/databases
 *
 * Manage Turso databases - list, get, and delete.
 *
 * SECURITY NOTE: These routes access organization-level Turso resources.
 * Ownership is verified by checking the deployed_apps table for matching databaseId.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getTursoService, getDeployedAppsService } from '@/services/deployment';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const CreateTokenRequestSchema = z.object({
  databaseName: z.string().min(1).max(100),
  expiration: z.enum(['never', '1d', '1w', '2w', '1m', '3m', '6m', '1y'] as const).default('1y'),
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET - List user's Turso databases (filtered by ownership via deployed_apps)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const databaseName = url.searchParams.get('name');

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's deployed apps with Turso databases
    const deployedAppsService = getDeployedAppsService();
    const userApps = await deployedAppsService.list({
      userId: user.id,
      platform: 'web',
    });

    const userDatabaseIds = new Set(
      (userApps.data || [])
        .filter((app) => app.databaseProvider === 'turso' && app.databaseId)
        .map((app) => app.databaseId)
    );

    const tursoService = getTursoService();

    // Get specific database (verify ownership)
    if (databaseName) {
      // Verify user owns this database
      if (!userDatabaseIds.has(databaseName)) {
        return NextResponse.json(
          { success: false, error: 'Database not found or unauthorized' },
          { status: 403 }
        );
      }

      const database = await tursoService.getDatabase(databaseName);

      if (!database) {
        return NextResponse.json({ success: false, error: 'Database not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        database,
      });
    }

    // List only databases the user owns
    const allDatabases = await tursoService.listDatabases();
    const userDatabases = allDatabases.filter((db) => userDatabaseIds.has(db.name));

    return NextResponse.json({
      success: true,
      databases: userDatabases,
    });
  } catch (error) {
    console.error('Turso list databases error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list databases' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a Turso database (with ownership verification)
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const databaseName = url.searchParams.get('name');

    if (!databaseName) {
      return NextResponse.json(
        { success: false, error: 'Database name required' },
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

    // Verify user owns this database via deployed_apps
    const deployedAppsService = getDeployedAppsService();
    const userApps = await deployedAppsService.list({
      userId: user.id,
      platform: 'web',
    });

    const ownsDatabase = (userApps.data || []).some(
      (app) => app.databaseProvider === 'turso' && app.databaseId === databaseName
    );

    if (!ownsDatabase) {
      return NextResponse.json(
        { success: false, error: 'Database not found or unauthorized' },
        { status: 403 }
      );
    }

    const tursoService = getTursoService();
    const result = await tursoService.deleteDatabase(databaseName);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database deleted',
    });
  } catch (error) {
    console.error('Turso delete database error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete database' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create auth token for a database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parseResult = CreateTokenRequestSchema.safeParse(body);
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

    const { databaseName, expiration } = parseResult.data;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this database via deployed_apps
    const deployedAppsService = getDeployedAppsService();
    const userApps = await deployedAppsService.list({
      userId: user.id,
      platform: 'web',
    });

    const ownsDatabase = (userApps.data || []).some(
      (app) => app.databaseProvider === 'turso' && app.databaseId === databaseName
    );

    if (!ownsDatabase) {
      return NextResponse.json(
        { success: false, error: 'Database not found or unauthorized' },
        { status: 403 }
      );
    }

    const tursoService = getTursoService();
    const tokenResponse = await tursoService.createAuthToken(databaseName, {
      expiration,
    });

    return NextResponse.json({
      success: true,
      token: tokenResponse.jwt,
    });
  } catch (error) {
    console.error('Turso create token error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create token' }, { status: 500 });
  }
}
