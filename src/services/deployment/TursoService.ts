/**
 * TursoService
 *
 * Service for provisioning and managing Turso (libSQL) databases.
 * Reference: https://docs.turso.tech/api-reference
 */

import type {
  TursoConfig,
  TursoRegion,
  TursoDatabase,
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  CreateTokenRequest,
  CreateTokenResponse,
  ListDatabasesResponse,
  ProvisionDatabaseRequest,
  ProvisionDatabaseResult,
  ProvisionedDatabase,
  DeleteDatabaseResult,
  TokenExpiration,
  TursoApiError,
} from '@/types/deployment/turso';
import { TURSO_API_BASE_URL } from '@/types/deployment/turso';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default region for new databases (used when creating groups)
 */
const _DEFAULT_REGION: TursoRegion = 'iad'; // Ashburn, Virginia

/**
 * Default token expiration
 */
const DEFAULT_TOKEN_EXPIRATION: TokenExpiration = '1y';

/**
 * Database name prefix for generated apps
 */
const DATABASE_PREFIX = 'aiapp';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class TursoService {
  private config: TursoConfig;
  private baseUrl: string;

  constructor(config?: Partial<TursoConfig>) {
    const organizationId = config?.organizationId || process.env.TURSO_ORG_ID;
    const apiToken = config?.apiToken || process.env.TURSO_API_TOKEN;

    if (!organizationId || !apiToken) {
      throw new Error('Turso configuration missing: TURSO_ORG_ID and TURSO_API_TOKEN required');
    }

    this.config = {
      organizationId,
      apiToken,
      baseUrl: config?.baseUrl || TURSO_API_BASE_URL,
    };

    this.baseUrl = `${this.config.baseUrl}/organizations/${this.config.organizationId}`;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Provision a new database for a project
   */
  async provisionDatabase(request: ProvisionDatabaseRequest): Promise<ProvisionDatabaseResult> {
    try {
      // Generate a unique database name
      const dbName = this.generateDatabaseName(request.projectName);

      // Create the database
      const database = await this.createDatabase({
        name: dbName,
      });

      // Create an auth token
      const tokenResponse = await this.createAuthToken(dbName, {
        expiration: request.tokenExpiration || DEFAULT_TOKEN_EXPIRATION,
        permission: 'full-access',
      });

      // Build the connection URL
      const connectionUrl = this.buildConnectionUrl(database.hostname, tokenResponse.jwt);

      const provisionedDb: ProvisionedDatabase = {
        name: database.name,
        dbId: database.dbId,
        hostname: database.hostname,
        connectionUrl,
        authToken: tokenResponse.jwt,
        primaryRegion: database.primaryRegion as TursoRegion,
        createdAt: database.createdAt,
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
   * Delete a database
   */
  async deleteDatabase(databaseName: string): Promise<DeleteDatabaseResult> {
    try {
      await this.request(`/databases/${databaseName}`, {
        method: 'DELETE',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database deletion failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get a database by name
   */
  async getDatabase(databaseName: string): Promise<TursoDatabase | null> {
    try {
      const response = await this.request<{ database: TursoDatabase }>(
        `/databases/${databaseName}`
      );
      return response.database;
    } catch {
      return null;
    }
  }

  /**
   * List all databases
   */
  async listDatabases(): Promise<TursoDatabase[]> {
    const response = await this.request<ListDatabasesResponse>('/databases');
    return response.databases;
  }

  /**
   * Create a new auth token for a database
   */
  async createAuthToken(
    databaseName: string,
    options?: CreateTokenRequest
  ): Promise<CreateTokenResponse> {
    return this.request<CreateTokenResponse>(`/databases/${databaseName}/auth/tokens`, {
      method: 'POST',
      body: JSON.stringify({
        expiration: options?.expiration || DEFAULT_TOKEN_EXPIRATION,
        authorization: options?.permission || 'full-access',
      }),
    });
  }

  /**
   * Rotate auth token for a database
   */
  async rotateAuthToken(
    databaseName: string,
    expiration?: TokenExpiration
  ): Promise<CreateTokenResponse> {
    // Invalidate existing tokens
    await this.request(`/databases/${databaseName}/auth/rotate`, {
      method: 'POST',
    });

    // Create new token
    return this.createAuthToken(databaseName, { expiration });
  }

  /**
   * Check if a database name is available
   */
  async isDatabaseNameAvailable(name: string): Promise<boolean> {
    const database = await this.getDatabase(name);
    return database === null;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  /**
   * Create a new database
   */
  private async createDatabase(request: CreateDatabaseRequest): Promise<TursoDatabase> {
    const response = await this.request<CreateDatabaseResponse>('/databases', {
      method: 'POST',
      body: JSON.stringify({
        name: request.name,
        group: request.group || 'default',
        seed: request.seed,
        schema: request.schema,
        is_schema: request.isSchema,
      }),
    });

    return response.database;
  }

  /**
   * Generate a unique database name
   */
  private generateDatabaseName(projectName: string): string {
    // Sanitize project name
    const sanitized = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    // Add unique suffix
    const suffix = Date.now().toString(36).substring(-6);

    return `${DATABASE_PREFIX}-${sanitized}-${suffix}`;
  }

  /**
   * Build a libSQL connection URL
   */
  private buildConnectionUrl(hostname: string, authToken: string): string {
    return `libsql://${hostname}?authToken=${authToken}`;
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Turso API error: ${response.status}`;

      try {
        const errorBody = (await response.json()) as TursoApiError;
        errorMessage = errorBody.message || errorBody.error || errorMessage;
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

let tursoServiceInstance: TursoService | null = null;

/**
 * Get or create the Turso service instance
 */
export function getTursoService(config?: Partial<TursoConfig>): TursoService {
  if (!tursoServiceInstance) {
    tursoServiceInstance = new TursoService(config);
  }
  return tursoServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetTursoService(): void {
  tursoServiceInstance = null;
}
