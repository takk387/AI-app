/**
 * DeployedAppsService
 *
 * Service for CRUD operations on deployed applications.
 * Manages the deployed_apps table in Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  DeploymentPlatform,
  DatabaseProvider,
  HostingProvider,
} from '@/types/deployment/unified';

// Re-export for consumers of this service
export type { DeploymentPlatform, DatabaseProvider, HostingProvider };

// ============================================================================
// TYPES
// ============================================================================

/**
 * Deployed app status (different from deployment progress status)
 * Represents the persisted state in the database
 */
export type DeploymentStatus =
  | 'pending'
  | 'deploying'
  | 'active'
  | 'failed'
  | 'stopped'
  | 'deleted';

/**
 * Deployed app record
 */
export interface DeployedApp {
  id: string;
  userId: string;
  projectId: string;

  // Deployment info
  platform: DeploymentPlatform;
  status: DeploymentStatus;
  deploymentUrl?: string;
  customDomain?: string;

  // Database (web)
  databaseProvider?: DatabaseProvider;
  databaseId?: string;

  // Hosting (web)
  hostingProvider?: HostingProvider;
  hostingProjectId?: string;

  // Build (mobile/desktop)
  buildId?: string;
  buildStatus?: string;
  artifactUrl?: string;

  // Metadata
  config?: Record<string, unknown>;
  version?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastDeployedAt?: string;
}

/**
 * Create deployed app request
 */
export interface CreateDeployedAppRequest {
  userId: string;
  projectId: string;
  platform: DeploymentPlatform;
  databaseProvider?: DatabaseProvider;
  hostingProvider?: HostingProvider;
  config?: Record<string, unknown>;
}

/**
 * Update deployed app request
 */
export interface UpdateDeployedAppRequest {
  status?: DeploymentStatus;
  deploymentUrl?: string;
  customDomain?: string;
  databaseId?: string;
  hostingProjectId?: string;
  buildId?: string;
  buildStatus?: string;
  artifactUrl?: string;
  config?: Record<string, unknown>;
  version?: string;
  lastDeployedAt?: string;
}

/**
 * Query filters
 */
export interface DeployedAppFilters {
  userId?: string;
  projectId?: string;
  platform?: DeploymentPlatform;
  status?: DeploymentStatus;
  limit?: number;
  offset?: number;
}

/**
 * Service result
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// DATABASE ROW TYPE (snake_case for Supabase)
// ============================================================================

interface DeployedAppRow {
  id: string;
  user_id: string;
  project_id: string;
  platform: string;
  status: string;
  deployment_url: string | null;
  custom_domain: string | null;
  database_provider: string | null;
  database_id: string | null;
  hosting_provider: string | null;
  hosting_project_id: string | null;
  build_id: string | null;
  build_status: string | null;
  artifact_url: string | null;
  config: Record<string, unknown> | null;
  version: string | null;
  created_at: string;
  updated_at: string;
  last_deployed_at: string | null;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DeployedAppsService {
  private supabase: SupabaseClient;
  private tableName = 'deployed_apps';

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(url, key);
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Create a new deployed app record
   */
  async create(request: CreateDeployedAppRequest): Promise<ServiceResult<DeployedApp>> {
    try {
      const now = new Date().toISOString();

      const row: Omit<DeployedAppRow, 'id'> = {
        user_id: request.userId,
        project_id: request.projectId,
        platform: request.platform,
        status: 'pending',
        deployment_url: null,
        custom_domain: null,
        database_provider: request.databaseProvider || null,
        database_id: null,
        hosting_provider: request.hostingProvider || null,
        hosting_project_id: null,
        build_id: null,
        build_status: null,
        artifact_url: null,
        config: request.config || null,
        version: null,
        created_at: now,
        updated_at: now,
        last_deployed_at: null,
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(row)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.rowToDeployedApp(data as DeployedAppRow),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create deployed app';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get a deployed app by ID
   */
  async getById(id: string): Promise<ServiceResult<DeployedApp>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select()
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Deployed app not found' };
      }

      return {
        success: true,
        data: this.rowToDeployedApp(data as DeployedAppRow),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get deployed app';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get deployed app by project ID and platform
   */
  async getByProjectAndPlatform(
    projectId: string,
    platform: DeploymentPlatform
  ): Promise<ServiceResult<DeployedApp>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select()
        .eq('project_id', projectId)
        .eq('platform', platform)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Deployed app not found' };
      }

      return {
        success: true,
        data: this.rowToDeployedApp(data as DeployedAppRow),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get deployed app';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * List deployed apps with filters
   */
  async list(filters: DeployedAppFilters = {}): Promise<ServiceResult<DeployedApp[]>> {
    try {
      let query = this.supabase.from(this.tableName).select();

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Order by last deployed, then created
      query = query.order('last_deployed_at', { ascending: false, nullsFirst: false });
      query = query.order('created_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: (data as DeployedAppRow[]).map((row) => this.rowToDeployedApp(row)),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list deployed apps';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update a deployed app
   */
  async update(id: string, updates: UpdateDeployedAppRequest): Promise<ServiceResult<DeployedApp>> {
    try {
      const updateRow: Partial<DeployedAppRow> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status !== undefined) {
        updateRow.status = updates.status;
      }
      if (updates.deploymentUrl !== undefined) {
        updateRow.deployment_url = updates.deploymentUrl;
      }
      if (updates.customDomain !== undefined) {
        updateRow.custom_domain = updates.customDomain;
      }
      if (updates.databaseId !== undefined) {
        updateRow.database_id = updates.databaseId;
      }
      if (updates.hostingProjectId !== undefined) {
        updateRow.hosting_project_id = updates.hostingProjectId;
      }
      if (updates.buildId !== undefined) {
        updateRow.build_id = updates.buildId;
      }
      if (updates.buildStatus !== undefined) {
        updateRow.build_status = updates.buildStatus;
      }
      if (updates.artifactUrl !== undefined) {
        updateRow.artifact_url = updates.artifactUrl;
      }
      if (updates.config !== undefined) {
        updateRow.config = updates.config;
      }
      if (updates.version !== undefined) {
        updateRow.version = updates.version;
      }
      if (updates.lastDeployedAt !== undefined) {
        updateRow.last_deployed_at = updates.lastDeployedAt;
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateRow)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: this.rowToDeployedApp(data as DeployedAppRow),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update deployed app';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Mark deployment as active
   */
  async markActive(id: string, deploymentUrl: string): Promise<ServiceResult<DeployedApp>> {
    return this.update(id, {
      status: 'active',
      deploymentUrl,
      lastDeployedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark deployment as failed
   */
  async markFailed(id: string): Promise<ServiceResult<DeployedApp>> {
    return this.update(id, {
      status: 'failed',
    });
  }

  /**
   * Delete a deployed app record
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete deployed app';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get deployment count for a user
   */
  async getCountByUser(userId: string): Promise<ServiceResult<number>> {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'deleted');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: count || 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get count';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get active deployments for a user
   */
  async getActiveByUser(userId: string): Promise<ServiceResult<DeployedApp[]>> {
    return this.list({
      userId,
      status: 'active',
    });
  }

  /**
   * Check if a deployment exists for project and platform
   */
  async exists(projectId: string, platform: DeploymentPlatform): Promise<boolean> {
    const result = await this.getByProjectAndPlatform(projectId, platform);
    return result.success && result.data !== undefined;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  /**
   * Convert database row to DeployedApp object
   */
  private rowToDeployedApp(row: DeployedAppRow): DeployedApp {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      platform: row.platform as DeploymentPlatform,
      status: row.status as DeploymentStatus,
      deploymentUrl: row.deployment_url || undefined,
      customDomain: row.custom_domain || undefined,
      databaseProvider: row.database_provider as DatabaseProvider | undefined,
      databaseId: row.database_id || undefined,
      hostingProvider: row.hosting_provider as HostingProvider | undefined,
      hostingProjectId: row.hosting_project_id || undefined,
      buildId: row.build_id || undefined,
      buildStatus: row.build_status || undefined,
      artifactUrl: row.artifact_url || undefined,
      config: row.config || undefined,
      version: row.version || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastDeployedAt: row.last_deployed_at || undefined,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let deployedAppsServiceInstance: DeployedAppsService | null = null;

/**
 * Get or create the deployed apps service instance
 */
export function getDeployedAppsService(
  supabaseUrl?: string,
  supabaseKey?: string
): DeployedAppsService {
  if (!deployedAppsServiceInstance) {
    deployedAppsServiceInstance = new DeployedAppsService(supabaseUrl, supabaseKey);
  }
  return deployedAppsServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetDeployedAppsService(): void {
  deployedAppsServiceInstance = null;
}
