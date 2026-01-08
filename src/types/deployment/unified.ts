/**
 * Unified Deployment Types
 *
 * Types for the multi-platform deployment system supporting web, mobile, and desktop.
 */

// ============================================================================
// PLATFORM TYPES
// ============================================================================

/**
 * Deployment platform types
 */
export type DeploymentPlatform = 'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux';

/**
 * Deployment status (matches deployed_apps.status in database)
 */
export type DeployedAppStatus =
  | 'pending'
  | 'deploying'
  | 'active'
  | 'failed'
  | 'stopped'
  | 'deleted';

/**
 * Deployment progress status (UI state, not persisted)
 */
export type DeploymentProgressStatus =
  | 'idle'
  | 'configuring'
  | 'provisioning'
  | 'building'
  | 'deploying'
  | 'completed'
  | 'failed';

/**
 * Build status for mobile/desktop deployments
 */
export type BuildStatus = 'pending' | 'queued' | 'building' | 'completed' | 'failed' | 'canceled';

/**
 * Database provider options
 */
export type DatabaseProvider = 'turso' | 'neon' | 'byo';

/**
 * Hosting provider options
 */
export type HostingProvider = 'cloudflare' | 'vercel';

// ============================================================================
// DEPLOYED APP RECORD (matches deployed_apps table)
// ============================================================================

/**
 * Deployed app record from database
 */
export interface DeployedApp {
  id: string;
  userId: string;
  projectId: string;

  // Deployment info
  platform: DeploymentPlatform;
  status: DeployedAppStatus;
  deploymentUrl?: string;
  customDomain?: string;

  // Database (web deployments)
  databaseProvider?: DatabaseProvider;
  databaseId?: string;
  // Note: databaseUrlEncrypted is not exposed to client

  // Hosting (web deployments)
  hostingProvider?: HostingProvider;
  hostingProjectId?: string;

  // Build (mobile/desktop deployments)
  buildId?: string;
  buildStatus?: BuildStatus;
  artifactUrl?: string;

  // Version tracking
  version?: string;

  // Metadata
  config?: Record<string, unknown>;
  // Note: environmentVarsEncrypted is not exposed to client

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastDeployedAt?: string;
}

/**
 * Create deployed app request
 */
export interface CreateDeployedAppRequest {
  projectId: string;
  platform: DeploymentPlatform;
  status?: DeployedAppStatus;
  deploymentUrl?: string;
  customDomain?: string;
  databaseProvider?: DatabaseProvider;
  databaseId?: string;
  hostingProvider?: HostingProvider;
  hostingProjectId?: string;
  buildId?: string;
  buildStatus?: BuildStatus;
  version?: string;
  config?: Record<string, unknown>;
}

/**
 * Update deployed app request
 */
export interface UpdateDeployedAppRequest {
  status?: DeployedAppStatus;
  deploymentUrl?: string;
  customDomain?: string;
  databaseProvider?: DatabaseProvider;
  databaseId?: string;
  hostingProvider?: HostingProvider;
  hostingProjectId?: string;
  buildId?: string;
  buildStatus?: BuildStatus;
  artifactUrl?: string;
  version?: string;
  config?: Record<string, unknown>;
  lastDeployedAt?: string;
}

/**
 * Deployed app service result
 */
export interface DeployedAppResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Web deployment configuration
 */
export interface WebDeployConfig {
  database: DatabaseProvider;
  databaseUrl?: string; // For BYO provider
  hosting: HostingProvider;
  customDomain?: string;
  environmentVars: Record<string, string>;
}

/**
 * Mobile build type
 */
export type MobileBuildType = 'development' | 'preview' | 'production';

/**
 * Mobile deployment configuration
 */
export interface MobileDeployConfig {
  platform: 'ios' | 'android' | 'both';
  appName: string;
  bundleId: string;
  version: string;
  iosBuildType: MobileBuildType;
  androidBuildType: MobileBuildType;
  // EAS Build configuration
  easProjectId?: string;
}

/**
 * Windows installer format
 */
export type WindowsFormat = 'msi' | 'exe' | 'portable';

/**
 * macOS installer format
 */
export type MacOSFormat = 'dmg' | 'app' | 'pkg';

/**
 * Linux installer format
 */
export type LinuxFormat = 'appimage' | 'deb' | 'rpm';

/**
 * Desktop deployment configuration
 */
export interface DesktopDeployConfig {
  platforms: Array<'windows' | 'macos' | 'linux'>;
  appName: string;
  appId: string;
  version: string;
  windowsFormat: WindowsFormat;
  macosFormat: MacOSFormat;
  linuxFormat: LinuxFormat;
  signApp: boolean;
}

// ============================================================================
// DEPLOYMENT STATE
// ============================================================================

/**
 * Deployment step
 */
export interface DeploymentStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  message?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/**
 * Deployment progress state
 */
export interface DeploymentProgress {
  platform: DeploymentPlatform;
  status: DeploymentProgressStatus;
  steps: DeploymentStep[];
  currentStep?: string;
  overallProgress: number; // 0-100
  deploymentUrl?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Unified deployment hook return type
 */
export interface UseUnifiedDeploymentReturn {
  // Web config
  webConfig: WebDeployConfig;
  updateWebConfig: (updates: Partial<WebDeployConfig>) => void;

  // Mobile config
  mobileConfig: MobileDeployConfig;
  updateMobileConfig: (updates: Partial<MobileDeployConfig>) => void;

  // Desktop config
  desktopConfig: DesktopDeployConfig;
  updateDesktopConfig: (updates: Partial<DesktopDeployConfig>) => void;

  // Deployment state
  progress: DeploymentProgress;
  isDeploying: boolean;
  error: string | null;

  // Actions
  deploy: (platform: DeploymentPlatform) => Promise<void>;
  cancel: () => void;
  reset: () => void;

  // Validation
  isConfigValid: (platform: DeploymentPlatform) => boolean;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Deploy request payload
 */
export interface DeployRequest {
  projectId: string;
  platform: DeploymentPlatform;
  config: WebDeployConfig | MobileDeployConfig | DesktopDeployConfig;
}

/**
 * Deploy response
 */
export interface DeployResponse {
  success: boolean;
  deploymentId?: string;
  error?: string;
}

/**
 * Deployment status response
 */
export interface DeploymentStatusResponse {
  deploymentId: string;
  progress: DeploymentProgress;
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default web deployment config
 */
export const DEFAULT_WEB_CONFIG: WebDeployConfig = {
  database: 'turso',
  hosting: 'cloudflare',
  environmentVars: {},
};

/**
 * Default mobile deployment config
 */
export const DEFAULT_MOBILE_CONFIG: MobileDeployConfig = {
  platform: 'both',
  appName: '',
  bundleId: '',
  version: '1.0.0',
  iosBuildType: 'preview',
  androidBuildType: 'preview',
};

/**
 * Default desktop deployment config
 */
export const DEFAULT_DESKTOP_CONFIG: DesktopDeployConfig = {
  platforms: ['windows', 'macos'],
  appName: '',
  appId: '',
  version: '1.0.0',
  windowsFormat: 'msi',
  macosFormat: 'dmg',
  linuxFormat: 'appimage',
  signApp: false,
};

/**
 * Default deployment progress
 */
export const DEFAULT_DEPLOYMENT_PROGRESS: DeploymentProgress = {
  platform: 'web',
  status: 'idle',
  steps: [],
  overallProgress: 0,
};

/**
 * Web deployment steps
 */
export const WEB_DEPLOYMENT_STEPS: Omit<DeploymentStep, 'status'>[] = [
  { id: 'validate', name: 'Validating configuration' },
  { id: 'provision-db', name: 'Provisioning database' },
  { id: 'migrate', name: 'Running migrations' },
  { id: 'transform', name: 'Transforming code for production' },
  { id: 'build', name: 'Building application' },
  { id: 'deploy', name: 'Deploying to hosting' },
  { id: 'configure-domain', name: 'Configuring domain' },
  { id: 'verify', name: 'Verifying deployment' },
];

/**
 * Mobile deployment steps
 */
export const MOBILE_DEPLOYMENT_STEPS: Omit<DeploymentStep, 'status'>[] = [
  { id: 'validate', name: 'Validating configuration' },
  { id: 'generate-config', name: 'Generating Capacitor config' },
  { id: 'sync', name: 'Syncing native projects' },
  { id: 'build-ios', name: 'Building iOS app' },
  { id: 'build-android', name: 'Building Android app' },
  { id: 'upload', name: 'Uploading to EAS' },
];

/**
 * Desktop deployment steps
 */
export const DESKTOP_DEPLOYMENT_STEPS: Omit<DeploymentStep, 'status'>[] = [
  { id: 'validate', name: 'Validating configuration' },
  { id: 'generate-config', name: 'Generating Tauri config' },
  { id: 'build-windows', name: 'Building Windows app' },
  { id: 'build-macos', name: 'Building macOS app' },
  { id: 'build-linux', name: 'Building Linux app' },
  { id: 'package', name: 'Packaging installers' },
];
