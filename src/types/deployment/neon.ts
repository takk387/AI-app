/**
 * Neon Database Types
 *
 * Type definitions for Neon serverless PostgreSQL provisioning.
 * Reference: https://api-docs.neon.tech/reference/getting-started-with-neon-api
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

/**
 * Neon API configuration
 */
export interface NeonConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Default Neon API base URL
 */
export const NEON_API_BASE_URL = 'https://console.neon.tech/api/v2';

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Neon region identifiers
 */
export type NeonRegion =
  | 'aws-us-east-1'
  | 'aws-us-east-2'
  | 'aws-us-west-2'
  | 'aws-eu-central-1'
  | 'aws-eu-west-1'
  | 'aws-eu-west-2'
  | 'aws-ap-southeast-1'
  | 'aws-ap-southeast-2'
  | 'aws-ap-northeast-1';

/**
 * Project status
 */
export type NeonProjectStatus = 'init' | 'ready' | 'deleting' | 'deleted';

/**
 * Neon project (workspace)
 */
export interface NeonProject {
  id: string;
  name: string;
  platformId: string;
  regionId: NeonRegion;
  pgVersion: number;
  storePasswords: boolean;
  createdAt: string;
  updatedAt: string;
  provisionedTime?: number;
  cpuUsedSec?: number;
  computeTimeSeconds?: number;
  writtenDataBytes?: number;
  dataTransferBytes?: number;
  dataSizeBytes?: number;
  activeTime?: number;
  owner: {
    email: string;
    name?: string;
    branchesLimit: number;
    subscriptionType: 'free' | 'pro' | 'scale' | 'enterprise';
  };
}

/**
 * Project creation request
 */
export interface CreateProjectRequest {
  project: {
    name?: string;
    regionId?: NeonRegion;
    pgVersion?: 14 | 15 | 16;
    storePasswords?: boolean;
    defaultEndpointSettings?: {
      autoscalingLimitMinCu?: number;
      autoscalingLimitMaxCu?: number;
      suspendTimeoutSeconds?: number;
    };
  };
}

// ============================================================================
// BRANCH TYPES
// ============================================================================

/**
 * Branch status
 */
export type NeonBranchStatus = 'init' | 'ready' | 'deleting';

/**
 * Neon branch (database branch)
 */
export interface NeonBranch {
  id: string;
  projectId: string;
  parentId?: string;
  parentLsn?: string;
  parentTimestamp?: string;
  name: string;
  currentState: NeonBranchStatus;
  pendingState?: NeonBranchStatus;
  logicalSize?: number;
  physicalSize?: number;
  createdAt: string;
  updatedAt: string;
  default: boolean;
  protected: boolean;
}

// ============================================================================
// ENDPOINT TYPES
// ============================================================================

/**
 * Endpoint type
 */
export type NeonEndpointType = 'read_write' | 'read_only';

/**
 * Endpoint status
 */
export type NeonEndpointStatus = 'init' | 'active' | 'idle' | 'deleting';

/**
 * Neon endpoint (compute)
 */
export interface NeonEndpoint {
  id: string;
  host: string;
  projectId: string;
  branchId: string;
  type: NeonEndpointType;
  currentState: NeonEndpointStatus;
  pendingState?: NeonEndpointStatus;
  regionId: NeonRegion;
  autoscalingLimitMinCu: number;
  autoscalingLimitMaxCu: number;
  poolerEnabled: boolean;
  poolerMode: 'transaction' | 'session';
  disabled: boolean;
  passwordless: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  proxyHost: string;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Neon database
 */
export interface NeonDatabase {
  id: number;
  branchId: string;
  name: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ROLE/USER TYPES
// ============================================================================

/**
 * Neon role (database user)
 */
export interface NeonRole {
  branchId: string;
  name: string;
  password?: string;
  protected: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONNECTION STRING TYPES
// ============================================================================

/**
 * Connection string URI format
 */
export interface NeonConnectionUri {
  connectionUri: string;
  connectionParameters: {
    database: string;
    host: string;
    password?: string;
    role: string;
    poolerHost?: string;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Create project response
 */
export interface CreateProjectResponse {
  project: NeonProject;
  connectionUris: NeonConnectionUri[];
  roles: NeonRole[];
  databases: NeonDatabase[];
  operations: NeonOperation[];
  branch: NeonBranch;
  endpoints: NeonEndpoint[];
}

/**
 * List projects response
 */
export interface ListProjectsResponse {
  projects: NeonProject[];
}

/**
 * Operation status
 */
export type NeonOperationStatus =
  | 'scheduling'
  | 'running'
  | 'finished'
  | 'failed'
  | 'error'
  | 'cancelling'
  | 'cancelled'
  | 'skipped';

/**
 * Neon operation
 */
export interface NeonOperation {
  id: string;
  projectId: string;
  branchId?: string;
  endpointId?: string;
  action: string;
  status: NeonOperationStatus;
  error?: string;
  failuresCount?: number;
  retryAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API error response
 */
export interface NeonApiError {
  code: string;
  message: string;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Provisioned Neon database result
 */
export interface ProvisionedNeonDatabase {
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  endpointId: string;
  endpointHost: string;
  databaseName: string;
  roleName: string;
  connectionUri: string;
  poolerConnectionUri?: string;
  region: NeonRegion;
  createdAt: string;
}

/**
 * Neon provision request
 */
export interface ProvisionNeonRequest {
  projectId: string;
  projectName: string;
  region?: NeonRegion;
  pgVersion?: 14 | 15 | 16;
}

/**
 * Neon provision result
 */
export interface ProvisionNeonResult {
  success: boolean;
  database?: ProvisionedNeonDatabase;
  error?: string;
}

/**
 * Neon deletion result
 */
export interface DeleteNeonResult {
  success: boolean;
  error?: string;
}
