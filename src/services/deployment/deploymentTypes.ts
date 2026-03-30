/**
 * Deployment Types
 *
 * Shared interfaces, types, and step constants for the deployment orchestrator
 * and its platform-specific pipelines.
 */

import type {
  DeploymentPlatform,
  DeploymentProgress,
  DeploymentStep,
  WebDeployConfig,
  MobileDeployConfig,
  DesktopDeployConfig,
} from '@/types/deployment/unified';
import type { ProvisionedDatabase } from '@/types/deployment/turso';
import type { ProvisionedNeonDatabase } from '@/types/deployment/neon';
import type { DeployedPagesProject } from '@/types/deployment/cloudflare';
import type { MobileBuildResult } from '@/types/deployment/mobile';
import type { DesktopBuildResponse } from '@/types/deployment/desktop';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Deployment context passed between orchestration steps
 */
export interface DeploymentContext {
  projectId: string;
  projectName: string;
  userId: string;
  platform: DeploymentPlatform;
  startedAt: string;

  // Web deployment context
  webConfig?: WebDeployConfig;
  provisionedDatabase?: ProvisionedDatabase | ProvisionedNeonDatabase;
  deployedProject?: DeployedPagesProject;

  // Mobile deployment context
  mobileConfig?: MobileDeployConfig;
  mobileBuild?: MobileBuildResult;

  // Desktop deployment context
  desktopConfig?: DesktopDeployConfig;
  desktopBuild?: DesktopBuildResponse;

  // Generated artifacts
  transformedCode?: Record<string, string>;
  environmentVars?: Record<string, string>;
}

/**
 * Step execution result
 */
export interface StepResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: DeploymentProgress) => void;

/**
 * Orchestration options
 */
export interface OrchestrationOptions {
  onProgress?: ProgressCallback;
  abortSignal?: AbortSignal;
  dryRun?: boolean;
}

/**
 * Web deployment result
 */
export interface WebDeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  databaseUrl?: string;
  error?: string;
  context?: DeploymentContext;
}

/**
 * Mobile deployment result
 */
export interface MobileDeploymentResult {
  success: boolean;
  iosBuildUrl?: string;
  androidBuildUrl?: string;
  error?: string;
  context?: DeploymentContext;
}

/**
 * Desktop deployment result
 */
export interface DesktopDeploymentResult {
  success: boolean;
  artifacts?: {
    windows?: string;
    macos?: string;
    linux?: string;
  };
  error?: string;
  context?: DeploymentContext;
}

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

/**
 * Web deployment step definitions
 */
export const WEB_STEPS: Omit<DeploymentStep, 'status'>[] = [
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
 * Mobile deployment step definitions
 */
export const MOBILE_STEPS: Omit<DeploymentStep, 'status'>[] = [
  { id: 'validate', name: 'Validating configuration' },
  { id: 'generate-config', name: 'Generating Capacitor config' },
  { id: 'sync', name: 'Syncing native projects' },
  { id: 'build-ios', name: 'Building iOS app' },
  { id: 'build-android', name: 'Building Android app' },
  { id: 'upload', name: 'Uploading to EAS' },
];

/**
 * Desktop deployment step definitions
 */
export const DESKTOP_STEPS: Omit<DeploymentStep, 'status'>[] = [
  { id: 'validate', name: 'Validating configuration' },
  { id: 'generate-config', name: 'Generating Tauri config' },
  { id: 'build-windows', name: 'Building Windows app' },
  { id: 'build-macos', name: 'Building macOS app' },
  { id: 'build-linux', name: 'Building Linux app' },
  { id: 'package', name: 'Packaging installers' },
];
