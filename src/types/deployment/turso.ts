/**
 * Turso Database Types
 *
 * Type definitions for Turso (libSQL) database provisioning and management.
 * Reference: https://docs.turso.tech/api-reference
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

/**
 * Turso API configuration
 */
export interface TursoConfig {
  organizationId: string;
  apiToken: string;
  baseUrl?: string;
}

/**
 * Default Turso API base URL
 */
export const TURSO_API_BASE_URL = 'https://api.turso.tech/v1';

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Turso database location/region
 */
export type TursoRegion =
  | 'ams' // Amsterdam
  | 'arn' // Stockholm
  | 'bog' // Bogota
  | 'bos' // Boston
  | 'cdg' // Paris
  | 'den' // Denver
  | 'dfw' // Dallas
  | 'ewr' // Newark
  | 'fra' // Frankfurt
  | 'gdl' // Guadalajara
  | 'gig' // Rio de Janeiro
  | 'gru' // Sao Paulo
  | 'hkg' // Hong Kong
  | 'iad' // Ashburn
  | 'jnb' // Johannesburg
  | 'lax' // Los Angeles
  | 'lhr' // London
  | 'mad' // Madrid
  | 'mia' // Miami
  | 'nrt' // Tokyo
  | 'ord' // Chicago
  | 'otp' // Bucharest
  | 'phx' // Phoenix
  | 'qro' // Queretaro
  | 'scl' // Santiago
  | 'sea' // Seattle
  | 'sin' // Singapore
  | 'sjc' // San Jose
  | 'syd' // Sydney
  | 'waw' // Warsaw
  | 'yul' // Montreal
  | 'yyz'; // Toronto

/**
 * Database group information
 */
export interface TursoDatabaseGroup {
  name: string;
  primaryLocation: TursoRegion;
  locations: TursoRegion[];
}

/**
 * Database instance status
 */
export type TursoDatabaseStatus = 'active' | 'creating' | 'deleting' | 'error';

/**
 * Turso database instance
 */
export interface TursoDatabase {
  name: string;
  dbId: string;
  hostname: string;
  primaryRegion: TursoRegion;
  regions: TursoRegion[];
  group: string;
  status: TursoDatabaseStatus;
  createdAt: string;
  version: string;
  isSchema: boolean;
}

/**
 * Database creation request
 */
export interface CreateDatabaseRequest {
  name: string;
  group?: string;
  seed?: {
    type: 'database' | 'dump';
    name?: string;
    url?: string;
    timestamp?: string;
  };
  schema?: string;
  isSchema?: boolean;
}

/**
 * Database creation response
 */
export interface CreateDatabaseResponse {
  database: TursoDatabase;
}

// ============================================================================
// AUTH TOKEN TYPES
// ============================================================================

/**
 * Token expiration options
 */
export type TokenExpiration = 'never' | '1d' | '1w' | '2w' | '1m' | '3m' | '6m' | '1y';

/**
 * Token permission level
 */
export type TokenPermission = 'read-only' | 'full-access';

/**
 * Database auth token
 */
export interface TursoAuthToken {
  id: string;
  name: string;
  token: string;
  expiresAt?: string;
}

/**
 * Token creation request
 */
export interface CreateTokenRequest {
  expiration?: TokenExpiration;
  permission?: TokenPermission;
}

/**
 * Token creation response
 */
export interface CreateTokenResponse {
  jwt: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * List databases response
 */
export interface ListDatabasesResponse {
  databases: TursoDatabase[];
}

/**
 * Database usage stats
 */
export interface DatabaseUsage {
  rowsRead: number;
  rowsWritten: number;
  storageBytes: number;
}

/**
 * Database stats response
 */
export interface DatabaseStatsResponse {
  database: TursoDatabase;
  usage: DatabaseUsage;
}

/**
 * API error response
 */
export interface TursoApiError {
  error: string;
  message: string;
  code?: string;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Provisioned database result
 */
export interface ProvisionedDatabase {
  name: string;
  dbId: string;
  hostname: string;
  connectionUrl: string;
  authToken: string;
  primaryRegion: TursoRegion;
  createdAt: string;
}

/**
 * Database provision request
 */
export interface ProvisionDatabaseRequest {
  projectId: string;
  projectName: string;
  region?: TursoRegion;
  tokenExpiration?: TokenExpiration;
}

/**
 * Database provision result
 */
export interface ProvisionDatabaseResult {
  success: boolean;
  database?: ProvisionedDatabase;
  error?: string;
}

/**
 * Database deletion result
 */
export interface DeleteDatabaseResult {
  success: boolean;
  error?: string;
}
