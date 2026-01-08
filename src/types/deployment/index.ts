/**
 * Deployment Types Index
 *
 * Re-exports all deployment-related types.
 */

// Unified deployment types (Phase 2)
export * from './unified';

// Database provider types - Turso
export * from './turso';

// Database provider types - Neon (with renamed exports to avoid collisions)
export {
  NEON_API_BASE_URL,
  type NeonConfig,
  type NeonRegion,
  type NeonProjectStatus,
  type NeonProject,
  type NeonBranchStatus,
  type NeonBranch,
  type NeonEndpointType,
  type NeonEndpointStatus,
  type NeonEndpoint,
  type NeonDatabase,
  type NeonRole,
  type NeonConnectionUri,
  type NeonOperationStatus,
  type NeonOperation,
  type CreateProjectRequest as NeonCreateProjectRequest,
  type CreateProjectResponse as NeonCreateProjectResponse,
  type ListProjectsResponse as NeonListProjectsResponse,
  type ProvisionNeonRequest,
  type ProvisionNeonResult,
  type ProvisionedNeonDatabase,
  type DeleteNeonResult,
  type NeonApiError,
} from './neon';

// Hosting provider types - Cloudflare (with renamed exports to avoid collisions)
export {
  CLOUDFLARE_API_BASE_URL,
  type CloudflareConfig,
  type PagesSourceConfig,
  type PagesBuildConfig,
  type PagesDeploymentConfig,
  type PagesProject,
  type CreatePagesProjectRequest,
  type DeploymentStageName,
  type DeploymentStageStatus,
  type DeploymentStage,
  type DeploymentTrigger,
  type PagesDeployment,
  type CreateDeploymentRequest,
  type CustomDomainStatus,
  type DomainValidationStatus,
  type CustomDomain,
  type AddDomainRequest,
  type CloudflareApiResponse,
  type CloudflareApiError,
  type GetProjectResponse,
  type ListProjectsResponse as CloudflareListProjectsResponse,
  type GetDeploymentResponse,
  type ListDeploymentsResponse,
  type CreateProjectResponse as CloudflareCreateProjectResponse,
  type CreateDeploymentResponse,
  type AddDomainResponse,
  type DeployToPagesRequest,
  type DeployToPagesResult,
  type DeployedPagesProject,
  type ConfigureDomainRequest,
  type ConfigureDomainResult,
} from './cloudflare';

// Platform-specific types
export * from './mobile';
export * from './desktop';

// Note: Subscription types are in @/types/subscription
// Note: Usage tracking types are in @/types/api-gateway
