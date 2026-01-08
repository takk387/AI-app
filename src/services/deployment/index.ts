/**
 * Deployment Services
 *
 * Barrel export for all deployment-related services.
 */

// ============================================================================
// SERVICES
// ============================================================================

export { DeploymentOrchestrator, createDeploymentOrchestrator } from './DeploymentOrchestrator';

export { TursoService, getTursoService, resetTursoService } from './TursoService';

export { NeonService, getNeonService, resetNeonService } from './NeonService';

export {
  CloudflareService,
  getCloudflareService,
  resetCloudflareService,
} from './CloudflareService';

export {
  DatabaseMigrationService,
  getDatabaseMigrationService,
  resetDatabaseMigrationService,
} from './DatabaseMigrationService';

export {
  EnvironmentService,
  getEnvironmentService,
  resetEnvironmentService,
} from './EnvironmentService';

export { DomainService, getDomainService, resetDomainService } from './DomainService';

export {
  DeployedAppsService,
  getDeployedAppsService,
  resetDeployedAppsService,
} from './DeployedAppsService';

export { SubscriptionService, getSubscriptionService, TIER_CONFIGS } from './SubscriptionService';

export { PricingService, getPricingService } from './PricingService';

export { MobileDeployService, getMobileDeployService } from './MobileDeployService';

export { DesktopDeployService, getDesktopDeployService } from './DesktopDeployService';

export {
  DomainPurchaseService,
  getDomainPurchaseService,
  resetDomainPurchaseService,
  TLD_PRICING,
} from './DomainPurchaseService';

export {
  DeploymentRetryService,
  getDeploymentRetryService,
  resetDeploymentRetryService,
} from './DeploymentRetryService';

// ============================================================================
// TYPES - Re-export from services
// ============================================================================

// DeploymentOrchestrator types
export type {
  DeploymentContext,
  StepResult,
  ProgressCallback,
  OrchestrationOptions,
  WebDeploymentResult,
  MobileDeploymentResult,
  DesktopDeploymentResult,
} from './DeploymentOrchestrator';

// DatabaseMigrationService types
export type {
  MigrationStatus,
  TableSchema,
  ColumnSchema,
  IndexSchema,
  ForeignKeySchema,
  ExtractedData,
  MigrationRequest,
  MigrationOptions,
  MigrationProgress,
  MigrationResult,
} from './DatabaseMigrationService';

// EnvironmentService types
export type {
  EnvVarType,
  EnvVarDefinition,
  EncryptedEnvVar,
  ValidationResult as EnvValidationResult,
  EnvFileFormat,
} from './EnvironmentService';

// DomainService types
export type {
  DomainProvider,
  DNSRecordType,
  DNSRecord,
  DomainStatus,
  DomainConfig,
  DomainValidation,
  DomainSetupResult,
  DomainVerificationResult,
  RegisteredDomain,
} from './DomainService';

// DeployedAppsService types
export type {
  DeploymentPlatform,
  DeploymentStatus,
  DatabaseProvider,
  HostingProvider,
  DeployedApp,
  CreateDeployedAppRequest,
  UpdateDeployedAppRequest,
  DeployedAppFilters,
  ServiceResult,
} from './DeployedAppsService';

// PricingService types
export type {
  ServicePricingInfo,
  UsageCostBreakdown,
  MonthlyCostEstimate,
  DeploymentCostEstimate,
} from './PricingService';

// Subscription types (re-exported from types/subscription)
export type {
  SubscriptionTier,
  SubscriptionStatus,
  TierLimits,
  UserSubscription,
  SubscriptionWithUsage,
  CreateSubscriptionRequest,
  ChangeSubscriptionRequest,
  SubscriptionChangeResult,
  UsageCheckResult,
  DeploymentLimitCheck,
  DomainLimitCheck,
  SpendLimitCheck,
} from '@/types/subscription';

// MobileDeployService types
export type {
  CapacitorConfig,
  EASBuildConfig,
  ProgressCallback as MobileProgressCallback,
} from './MobileDeployService';

// DesktopDeployService types
export type {
  DesktopBuildResult,
  ProgressCallback as DesktopProgressCallback,
} from './DesktopDeployService';

// DomainPurchaseService types
export type {
  DomainAvailability,
  DomainSearchResult,
  DomainPurchaseRequest,
  RegistrantContact,
  DomainPurchaseResult,
  DomainTransferRequest,
  TransferStatus,
  DomainTransferResult,
  RegisteredDomainInfo,
} from './DomainPurchaseService';

// DeploymentRetryService types
export type {
  RetryableErrorType,
  NonRetryableErrorType,
  DeploymentErrorType,
  RetryConfig,
  RetryState,
  DeploymentRetryRecord,
  RetryResult,
} from './DeploymentRetryService';
