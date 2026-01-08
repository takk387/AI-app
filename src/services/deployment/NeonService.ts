/**
 * NeonService
 *
 * Service for provisioning and managing Neon PostgreSQL databases.
 * Reference: https://api-docs.neon.tech/reference/getting-started-with-neon-api
 */

import type {
  NeonConfig,
  NeonRegion,
  NeonProject,
  NeonBranch,
  NeonEndpoint,
  NeonDatabase,
  NeonRole,
  CreateProjectRequest,
  CreateProjectResponse,
  ListProjectsResponse,
  ProvisionNeonRequest,
  ProvisionNeonResult,
  ProvisionedNeonDatabase,
  DeleteNeonResult,
  NeonApiError,
} from '@/types/deployment/neon';
import { NEON_API_BASE_URL } from '@/types/deployment/neon';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default region for new projects
 */
const DEFAULT_REGION: NeonRegion = 'aws-us-east-1';

/**
 * Default PostgreSQL version
 */
const DEFAULT_PG_VERSION = 16;

/**
 * Project name prefix for generated apps
 */
const PROJECT_PREFIX = 'aiapp';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class NeonService {
  private config: NeonConfig;
  private baseUrl: string;

  constructor(config?: Partial<NeonConfig>) {
    const apiKey = config?.apiKey || process.env.NEON_API_KEY;

    if (!apiKey) {
      throw new Error('Neon configuration missing: NEON_API_KEY required');
    }

    const baseUrl = config?.baseUrl || NEON_API_BASE_URL;
    this.config = {
      apiKey,
      baseUrl,
    };

    this.baseUrl = baseUrl;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Provision a new Neon database for a project
   */
  async provisionDatabase(request: ProvisionNeonRequest): Promise<ProvisionNeonResult> {
    try {
      // Generate a unique project name
      const projectName = this.generateProjectName(request.projectName);

      // Create the project (this creates branch, endpoint, database, and role)
      const createRequest: CreateProjectRequest = {
        project: {
          name: projectName,
          regionId: request.region || DEFAULT_REGION,
          pgVersion: request.pgVersion || DEFAULT_PG_VERSION,
          storePasswords: true,
          defaultEndpointSettings: {
            autoscalingLimitMinCu: 0.25,
            autoscalingLimitMaxCu: 2,
            suspendTimeoutSeconds: 300, // 5 minutes
          },
        },
      };

      const response = await this.createProject(createRequest);

      // Extract the connection details
      const connectionUri = response.connectionUris[0];
      const branch = response.branch;
      const endpoint = response.endpoints[0];
      const database = response.databases[0];
      const role = response.roles.find((r) => !r.protected);

      if (!connectionUri || !branch || !endpoint || !database || !role) {
        return {
          success: false,
          error: 'Failed to extract connection details from Neon response',
        };
      }

      const provisionedDb: ProvisionedNeonDatabase = {
        projectId: response.project.id,
        projectName: response.project.name,
        branchId: branch.id,
        branchName: branch.name,
        endpointId: endpoint.id,
        endpointHost: endpoint.host,
        databaseName: database.name,
        roleName: role.name,
        connectionUri: connectionUri.connectionUri,
        poolerConnectionUri: endpoint.poolerEnabled
          ? this.buildPoolerConnectionUri(connectionUri.connectionUri)
          : undefined,
        region: response.project.regionId as NeonRegion,
        createdAt: response.project.createdAt,
      };

      return {
        success: true,
        database: provisionedDb,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database provisioning failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete a Neon project
   */
  async deleteProject(projectId: string): Promise<DeleteNeonResult> {
    try {
      await this.request(`/projects/${projectId}`, {
        method: 'DELETE',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Project deletion failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<NeonProject | null> {
    try {
      const response = await this.request<{ project: NeonProject }>(`/projects/${projectId}`);
      return response.project;
    } catch {
      return null;
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<NeonProject[]> {
    const response = await this.request<ListProjectsResponse>('/projects');
    return response.projects;
  }

  /**
   * Get project branches
   */
  async listBranches(projectId: string): Promise<NeonBranch[]> {
    const response = await this.request<{ branches: NeonBranch[] }>(
      `/projects/${projectId}/branches`
    );
    return response.branches;
  }

  /**
   * Get project endpoints
   */
  async listEndpoints(projectId: string): Promise<NeonEndpoint[]> {
    const response = await this.request<{ endpoints: NeonEndpoint[] }>(
      `/projects/${projectId}/endpoints`
    );
    return response.endpoints;
  }

  /**
   * Get branch databases
   */
  async listDatabases(projectId: string, branchId: string): Promise<NeonDatabase[]> {
    const response = await this.request<{ databases: NeonDatabase[] }>(
      `/projects/${projectId}/branches/${branchId}/databases`
    );
    return response.databases;
  }

  /**
   * Get branch roles
   */
  async listRoles(projectId: string, branchId: string): Promise<NeonRole[]> {
    const response = await this.request<{ roles: NeonRole[] }>(
      `/projects/${projectId}/branches/${branchId}/roles`
    );
    return response.roles;
  }

  /**
   * Reset role password
   */
  async resetRolePassword(
    projectId: string,
    branchId: string,
    roleName: string
  ): Promise<NeonRole> {
    const response = await this.request<{ role: NeonRole }>(
      `/projects/${projectId}/branches/${branchId}/roles/${roleName}/reset_password`,
      { method: 'POST' }
    );
    return response.role;
  }

  /**
   * Get connection URI for a project
   */
  async getConnectionUri(
    projectId: string,
    branchId?: string,
    endpointId?: string,
    databaseName?: string,
    roleName?: string
  ): Promise<string> {
    const params = new URLSearchParams();
    if (branchId) params.set('branch_id', branchId);
    if (endpointId) params.set('endpoint_id', endpointId);
    if (databaseName) params.set('database_name', databaseName);
    if (roleName) params.set('role_name', roleName);

    const response = await this.request<{ uri: string }>(
      `/projects/${projectId}/connection_uri?${params.toString()}`
    );
    return response.uri;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  /**
   * Create a new Neon project
   */
  private async createProject(request: CreateProjectRequest): Promise<CreateProjectResponse> {
    return this.request<CreateProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate a unique project name
   */
  private generateProjectName(name: string): string {
    // Sanitize name
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    // Add unique suffix
    const suffix = Date.now().toString(36).substring(-6);

    return `${PROJECT_PREFIX}-${sanitized}-${suffix}`;
  }

  /**
   * Build pooler connection URI from direct connection URI
   */
  private buildPoolerConnectionUri(connectionUri: string): string {
    try {
      const url = new URL(connectionUri);
      // Neon pooler uses -pooler suffix on the host
      const poolerHost = url.host.replace('.', '-pooler.');
      url.host = poolerHost;
      return url.toString();
    } catch {
      return connectionUri;
    }
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Neon API error: ${response.status}`;

      try {
        const errorBody = (await response.json()) as NeonApiError;
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // Use default error message
      }

      throw new Error(errorMessage);
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let neonServiceInstance: NeonService | null = null;

/**
 * Get or create the Neon service instance
 */
export function getNeonService(config?: Partial<NeonConfig>): NeonService {
  if (!neonServiceInstance) {
    neonServiceInstance = new NeonService(config);
  }
  return neonServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetNeonService(): void {
  neonServiceInstance = null;
}
