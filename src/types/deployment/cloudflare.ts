/**
 * Cloudflare Pages Types
 *
 * Type definitions for Cloudflare Pages deployment.
 * Reference: https://developers.cloudflare.com/api/
 */

// ============================================================================
// API CONFIGURATION
// ============================================================================

/**
 * Cloudflare API configuration
 */
export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  baseUrl?: string;
}

/**
 * Default Cloudflare API base URL
 */
export const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Pages project source configuration
 */
export interface PagesSourceConfig {
  type: 'github' | 'gitlab';
  config: {
    owner: string;
    repoName: string;
    productionBranch: string;
    prCommentsEnabled?: boolean;
    deploymentsEnabled?: boolean;
    productionDeploymentsEnabled?: boolean;
    previewDeploymentSetting?: 'all' | 'none' | 'custom';
    previewBranchIncludes?: string[];
    previewBranchExcludes?: string[];
  };
}

/**
 * Build configuration
 */
export interface PagesBuildConfig {
  buildCommand?: string;
  destinationDir?: string;
  rootDir?: string;
  webAnalyticsTag?: string;
  webAnalyticsToken?: string;
}

/**
 * Deployment configuration
 */
export interface PagesDeploymentConfig {
  productionBranch?: string;
  previewBranchPrefix?: string;
  environmentVariables?: Record<string, { value: string; type?: 'plain_text' | 'secret_text' }>;
  kvNamespaces?: Record<string, { namespaceId: string }>;
  durableObjectNamespaces?: Record<string, { namespaceId: string }>;
  d1Databases?: Record<string, { id: string }>;
  r2Buckets?: Record<string, { name: string }>;
  serviceBindings?: Record<string, { service: string; environment?: string }>;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  usageModel?: 'bundled' | 'unbound';
  placement?: { mode: 'smart' };
}

/**
 * Pages project
 */
export interface PagesProject {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  source?: PagesSourceConfig;
  buildConfig: PagesBuildConfig;
  deploymentConfig: {
    preview: PagesDeploymentConfig;
    production: PagesDeploymentConfig;
  };
  latestDeployment?: PagesDeployment;
  canonicalDeployment?: PagesDeployment;
  productionBranch: string;
  createdOn: string;
  productionScriptName?: string;
}

/**
 * Create project request
 */
export interface CreatePagesProjectRequest {
  name: string;
  productionBranch?: string;
  buildConfig?: PagesBuildConfig;
  deploymentConfig?: {
    preview?: PagesDeploymentConfig;
    production?: PagesDeploymentConfig;
  };
}

// ============================================================================
// DEPLOYMENT TYPES
// ============================================================================

/**
 * Deployment stage name
 */
export type DeploymentStageName = 'queued' | 'initialize' | 'clone_repo' | 'build' | 'deploy';

/**
 * Deployment stage status
 */
export type DeploymentStageStatus =
  | 'idle'
  | 'active'
  | 'canceled'
  | 'success'
  | 'failure'
  | 'skipped';

/**
 * Deployment stage
 */
export interface DeploymentStage {
  name: DeploymentStageName;
  status: DeploymentStageStatus;
  startedOn?: string;
  endedOn?: string;
}

/**
 * Deployment trigger
 */
export interface DeploymentTrigger {
  type: 'ad_hoc' | 'github' | 'gitlab' | 'rollback';
  metadata?: {
    branch?: string;
    commitHash?: string;
    commitMessage?: string;
  };
}

/**
 * Pages deployment
 */
export interface PagesDeployment {
  id: string;
  shortId: string;
  projectId: string;
  projectName: string;
  environment: 'production' | 'preview';
  url: string;
  createdOn: string;
  modifiedOn: string;
  aliases?: string[];
  latestStage: DeploymentStage;
  envVars: Record<string, { value: string; type: 'plain_text' | 'secret_text' }>;
  kvNamespaces: Record<string, { namespaceId: string }>;
  compatibilityDate?: string;
  compatibilityFlags?: string[];
  buildConfig: PagesBuildConfig;
  source?: {
    type: 'github' | 'gitlab';
    config: {
      owner: string;
      repoName: string;
      productionBranch: string;
      prId?: number;
    };
  };
  stages: DeploymentStage[];
  deployTrigger: DeploymentTrigger;
  productionBranch?: string;
  isSkipped: boolean;
  deploymentTrigger?: DeploymentTrigger;
  files?: Record<string, string>;
}

/**
 * Create deployment request (direct upload)
 */
export interface CreateDeploymentRequest {
  branch?: string;
}

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/**
 * Custom domain status
 */
export type CustomDomainStatus = 'pending' | 'active' | 'deactivated' | 'blocked' | 'error';

/**
 * Custom domain validation status
 */
export type DomainValidationStatus = 'pending' | 'active' | 'blocked';

/**
 * Custom domain
 */
export interface CustomDomain {
  id: string;
  name: string;
  status: CustomDomainStatus;
  validationStatus: DomainValidationStatus;
  validationData?: {
    method: 'http' | 'txt';
    status: 'pending' | 'active';
    txtName?: string;
    txtValue?: string;
  };
  zoneTag?: string;
  createdOn: string;
}

/**
 * Add domain request
 */
export interface AddDomainRequest {
  name: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * API success response wrapper
 */
export interface CloudflareApiResponse<T> {
  success: boolean;
  errors: CloudflareApiError[];
  messages: string[];
  result: T;
  resultInfo?: {
    page: number;
    perPage: number;
    count: number;
    totalCount: number;
  };
}

/**
 * API error
 */
export interface CloudflareApiError {
  code: number;
  message: string;
  errorChain?: CloudflareApiError[];
}

/**
 * List projects response
 */
export type ListProjectsResponse = CloudflareApiResponse<PagesProject[]>;

/**
 * Get project response
 */
export type GetProjectResponse = CloudflareApiResponse<PagesProject>;

/**
 * Create project response
 */
export type CreateProjectResponse = CloudflareApiResponse<PagesProject>;

/**
 * Create deployment response
 */
export type CreateDeploymentResponse = CloudflareApiResponse<PagesDeployment>;

/**
 * List deployments response
 */
export type ListDeploymentsResponse = CloudflareApiResponse<PagesDeployment[]>;

/**
 * Get deployment response
 */
export type GetDeploymentResponse = CloudflareApiResponse<PagesDeployment>;

/**
 * Add domain response
 */
export type AddDomainResponse = CloudflareApiResponse<CustomDomain>;

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Deployed Pages project result
 */
export interface DeployedPagesProject {
  projectId: string;
  projectName: string;
  subdomain: string;
  productionUrl: string;
  deploymentId: string;
  deploymentUrl: string;
  environment: 'production' | 'preview';
  createdAt: string;
  customDomains: string[];
}

/**
 * Pages deployment request
 */
export interface DeployToPagesRequest {
  projectId: string;
  projectName: string;
  files: Record<string, string | Uint8Array>;
  branch?: string;
  environment?: 'production' | 'preview';
  environmentVars?: Record<string, string>;
}

/**
 * Pages deployment result
 */
export interface DeployToPagesResult {
  success: boolean;
  deployment?: DeployedPagesProject;
  error?: string;
}

/**
 * Domain configuration request
 */
export interface ConfigureDomainRequest {
  projectName: string;
  domain: string;
}

/**
 * Domain configuration result
 */
export interface ConfigureDomainResult {
  success: boolean;
  domain?: CustomDomain;
  dnsRecords?: {
    type: 'CNAME' | 'A' | 'AAAA' | 'TXT';
    name: string;
    value: string;
    ttl?: number;
  }[];
  error?: string;
}
