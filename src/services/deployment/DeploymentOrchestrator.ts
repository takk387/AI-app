/**
 * DeploymentOrchestrator Service
 *
 * Main coordinator for multi-platform deployment workflows.
 * Orchestrates database provisioning, code transformation, hosting deployment,
 * and domain configuration.
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

// Import actual services
import { getTursoService } from './TursoService';
import { getNeonService } from './NeonService';
import { getCloudflareService } from './CloudflareService';
import { getDomainService } from './DomainService';
import { getMobileDeployService } from './MobileDeployService';
import { getDesktopDeployService } from './DesktopDeployService';
import { getDatabaseMigrationService } from './DatabaseMigrationService';

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
const WEB_STEPS: Omit<DeploymentStep, 'status'>[] = [
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
const MOBILE_STEPS: Omit<DeploymentStep, 'status'>[] = [
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
const DESKTOP_STEPS: Omit<DeploymentStep, 'status'>[] = [
  { id: 'validate', name: 'Validating configuration' },
  { id: 'generate-config', name: 'Generating Tauri config' },
  { id: 'build-windows', name: 'Building Windows app' },
  { id: 'build-macos', name: 'Building macOS app' },
  { id: 'build-linux', name: 'Building Linux app' },
  { id: 'package', name: 'Packaging installers' },
];

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

/**
 * DeploymentOrchestrator
 *
 * Coordinates the deployment workflow across different platforms.
 */
export class DeploymentOrchestrator {
  private context: DeploymentContext;
  private progress: DeploymentProgress;
  private options: OrchestrationOptions;

  constructor(
    projectId: string,
    projectName: string,
    userId: string,
    platform: DeploymentPlatform,
    options: OrchestrationOptions = {}
  ) {
    this.context = {
      projectId,
      projectName,
      userId,
      platform,
      startedAt: new Date().toISOString(),
    };

    this.progress = {
      platform,
      status: 'idle',
      steps: [],
      overallProgress: 0,
    };

    this.options = options;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Deploy to web (Turso/Neon + Cloudflare/Vercel)
   */
  async deployWeb(config: WebDeployConfig): Promise<WebDeploymentResult> {
    this.context.webConfig = config;
    this.initializeProgress(WEB_STEPS);

    try {
      // Step 1: Validate
      await this.executeStep('validate', () => this.validateWebConfig(config));

      // Step 2: Provision database (skip if BYO with URL)
      if (config.database !== 'byo' || !config.databaseUrl) {
        await this.executeStep('provision-db', () => this.provisionDatabase(config));
      } else {
        this.skipStep('provision-db');
      }

      // Step 3: Run migrations
      await this.executeStep('migrate', () => this.runMigrations());

      // Step 4: Transform code
      await this.executeStep('transform', () => this.transformCodeForProduction(config));

      // Step 5: Build
      await this.executeStep('build', () => this.buildApplication());

      // Step 6: Deploy
      await this.executeStep('deploy', () => this.deployToHosting(config));

      // Step 7: Configure domain (skip if no custom domain)
      const customDomain = config.customDomain;
      if (customDomain) {
        await this.executeStep('configure-domain', () => this.configureDomain(customDomain));
      } else {
        this.skipStep('configure-domain');
      }

      // Step 8: Verify
      await this.executeStep('verify', () => this.verifyDeployment());

      this.completeDeployment();

      return {
        success: true,
        deploymentUrl: this.context.deployedProject?.productionUrl,
        databaseUrl: this.getDatabaseUrl(),
        context: this.context,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Deploy mobile app (iOS/Android via Capacitor + EAS)
   */
  async deployMobile(config: MobileDeployConfig): Promise<MobileDeploymentResult> {
    this.context.mobileConfig = config;
    this.initializeProgress(MOBILE_STEPS);

    try {
      // Step 1: Validate
      await this.executeStep('validate', () => this.validateMobileConfig(config));

      // Step 2: Generate Capacitor config
      await this.executeStep('generate-config', () => this.generateCapacitorConfig(config));

      // Step 3: Sync native projects
      await this.executeStep('sync', () => this.syncCapacitorProjects());

      // Step 4: Build iOS (skip if not targeting iOS)
      if (config.platform === 'ios' || config.platform === 'both') {
        await this.executeStep('build-ios', () => this.buildIOS(config));
      } else {
        this.skipStep('build-ios');
      }

      // Step 5: Build Android (skip if not targeting Android)
      if (config.platform === 'android' || config.platform === 'both') {
        await this.executeStep('build-android', () => this.buildAndroid(config));
      } else {
        this.skipStep('build-android');
      }

      // Step 6: Upload to EAS
      await this.executeStep('upload', () => this.uploadToEAS());

      this.completeDeployment();

      return {
        success: true,
        iosBuildUrl: this.context.mobileBuild?.builds?.ios?.artifacts?.buildUrl,
        androidBuildUrl: this.context.mobileBuild?.builds?.android?.artifacts?.buildUrl,
        context: this.context,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Deploy desktop app (Windows/macOS/Linux via Tauri)
   */
  async deployDesktop(config: DesktopDeployConfig): Promise<DesktopDeploymentResult> {
    this.context.desktopConfig = config;
    this.initializeProgress(DESKTOP_STEPS);

    try {
      // Step 1: Validate
      await this.executeStep('validate', () => this.validateDesktopConfig(config));

      // Step 2: Generate Tauri config
      await this.executeStep('generate-config', () => this.generateTauriConfig(config));

      // Step 3: Build Windows (skip if not targeting)
      if (config.platforms.includes('windows')) {
        await this.executeStep('build-windows', () => this.buildWindows(config));
      } else {
        this.skipStep('build-windows');
      }

      // Step 4: Build macOS (skip if not targeting)
      if (config.platforms.includes('macos')) {
        await this.executeStep('build-macos', () => this.buildMacOS(config));
      } else {
        this.skipStep('build-macos');
      }

      // Step 5: Build Linux (skip if not targeting)
      if (config.platforms.includes('linux')) {
        await this.executeStep('build-linux', () => this.buildLinux(config));
      } else {
        this.skipStep('build-linux');
      }

      // Step 6: Package
      await this.executeStep('package', () => this.packageInstallers(config));

      this.completeDeployment();

      return {
        success: true,
        artifacts: this.getDesktopArtifacts(),
        context: this.context,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get current deployment progress
   */
  getProgress(): DeploymentProgress {
    return { ...this.progress };
  }

  /**
   * Cancel ongoing deployment
   */
  cancel(): void {
    this.progress.status = 'failed';
    this.progress.error = 'Deployment cancelled by user';
    this.progress.completedAt = new Date().toISOString();
    this.notifyProgress();
  }

  // --------------------------------------------------------------------------
  // STEP EXECUTION
  // --------------------------------------------------------------------------

  private initializeProgress(steps: Omit<DeploymentStep, 'status'>[]): void {
    this.progress = {
      platform: this.context.platform,
      status: 'configuring',
      steps: steps.map((step) => ({ ...step, status: 'pending' as const })),
      overallProgress: 0,
      startedAt: new Date().toISOString(),
    };
    this.notifyProgress();
  }

  private async executeStep(stepId: string, executor: () => Promise<StepResult>): Promise<void> {
    // Check for abort
    if (this.options.abortSignal?.aborted) {
      throw new Error('Deployment aborted');
    }

    // Update step to in_progress
    this.updateStep(stepId, 'in_progress');

    try {
      // Execute (or simulate in dry run)
      const result = this.options.dryRun ? { success: true } : await executor();

      if (!result.success) {
        throw new Error(result.error || `Step ${stepId} failed`);
      }

      // Update step to completed
      this.updateStep(stepId, 'completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStep(stepId, 'failed', undefined, errorMessage);
      throw error;
    }
  }

  private skipStep(stepId: string): void {
    this.updateStep(stepId, 'skipped');
  }

  private updateStep(
    stepId: string,
    status: DeploymentStep['status'],
    message?: string,
    error?: string
  ): void {
    const stepIndex = this.progress.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    this.progress.steps[stepIndex] = {
      ...this.progress.steps[stepIndex],
      status,
      message,
      error,
      ...(status === 'in_progress' ? { startedAt: new Date().toISOString() } : {}),
      ...(status === 'completed' || status === 'failed' || status === 'skipped'
        ? { completedAt: new Date().toISOString() }
        : {}),
    };

    if (status === 'in_progress') {
      this.progress.currentStep = stepId;
    }

    this.updateOverallProgress();
    this.notifyProgress();
  }

  private updateOverallProgress(): void {
    const completed = this.progress.steps.filter(
      (s) => s.status === 'completed' || s.status === 'skipped'
    ).length;
    this.progress.overallProgress = Math.round((completed / this.progress.steps.length) * 100);
  }

  private completeDeployment(): void {
    this.progress.status = 'completed';
    this.progress.overallProgress = 100;
    this.progress.completedAt = new Date().toISOString();
    this.progress.deploymentUrl = this.context.deployedProject?.productionUrl;
    this.notifyProgress();
  }

  private handleError(error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.progress.status = 'failed';
    this.progress.error = errorMessage;
    this.progress.completedAt = new Date().toISOString();
    this.notifyProgress();
    throw error;
  }

  private notifyProgress(): void {
    this.options.onProgress?.(this.getProgress());
  }

  // --------------------------------------------------------------------------
  // WEB DEPLOYMENT STEPS (Stub implementations - to be connected to services)
  // --------------------------------------------------------------------------

  private async validateWebConfig(config: WebDeployConfig): Promise<StepResult> {
    // Validate database configuration
    if (config.database === 'byo' && !config.databaseUrl) {
      return { success: false, error: 'Database URL required for BYO provider' };
    }

    return { success: true };
  }

  private async provisionDatabase(config: WebDeployConfig): Promise<StepResult> {
    try {
      if (config.database === 'turso') {
        const tursoService = getTursoService();

        const result = await tursoService.provisionDatabase({
          projectId: this.context.projectId,
          projectName: this.context.projectName,
        });

        if (!result.success || !result.database) {
          return { success: false, error: result.error || 'Failed to provision Turso database' };
        }

        this.context.provisionedDatabase = result.database;
        return { success: true, data: result.database };
      }

      if (config.database === 'neon') {
        const neonService = getNeonService();

        const result = await neonService.provisionDatabase({
          projectId: this.context.projectId,
          projectName: this.context.projectName,
        });

        if (!result.success || !result.database) {
          return { success: false, error: result.error || 'Failed to provision Neon database' };
        }

        this.context.provisionedDatabase = result.database;
        return { success: true, data: result.database };
      }

      // BYO - use provided URL
      if (config.database === 'byo' && config.databaseUrl) {
        return { success: true };
      }

      return { success: false, error: 'Invalid database provider' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database provisioning failed',
      };
    }
  }

  private async runMigrations(): Promise<StepResult> {
    try {
      // Skip migrations if no database was provisioned or using BYO
      if (!this.context.provisionedDatabase && this.context.webConfig?.database === 'byo') {
        // BYO databases are assumed to already have schema
        return { success: true, data: { skipped: true, reason: 'BYO database' } };
      }

      if (!this.context.provisionedDatabase) {
        return { success: true, data: { skipped: true, reason: 'No database provisioned' } };
      }

      const migrationService = getDatabaseMigrationService();
      const dbUrl = this.getDatabaseUrl();

      if (!dbUrl) {
        return { success: false, error: 'No database URL available for migrations' };
      }

      // For now, we create the basic schema. In a full implementation,
      // this would extract schema from the app's Prisma/Drizzle definitions
      // and migrate any browser SQLite data.
      const result = await migrationService.migrate({
        projectId: this.context.projectId,
        sourceData: {
          schema: [], // Empty schema means just verify connection
          data: {},
        },
        targetProvider: this.context.webConfig?.database || 'turso',
        targetConnectionUrl: dbUrl,
        options: {
          validateData: false,
        },
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Migration failed' };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      };
    }
  }

  private async transformCodeForProduction(config: WebDeployConfig): Promise<StepResult> {
    try {
      // Build environment variables for production
      const envVars: Record<string, string> = {
        ...config.environmentVars,
        NODE_ENV: 'production',
      };

      // Add database connection string if provisioned
      const dbUrl = this.getDatabaseUrl();
      if (dbUrl) {
        if (config.database === 'turso') {
          envVars['TURSO_DATABASE_URL'] = dbUrl;
          // Auth token would come from the provisioned database
          if (this.context.provisionedDatabase && 'authToken' in this.context.provisionedDatabase) {
            envVars['TURSO_AUTH_TOKEN'] = this.context.provisionedDatabase.authToken || '';
          }
        } else if (config.database === 'neon') {
          envVars['DATABASE_URL'] = dbUrl;
        } else if (config.database === 'byo' && config.databaseUrl) {
          envVars['DATABASE_URL'] = config.databaseUrl;
        }
      }

      // Store environment variables in context for deployment
      this.context.environmentVars = envVars;

      // In a full implementation, this would:
      // 1. Transform Prisma schema to use the correct adapter (libsql vs pg)
      // 2. Update next.config.js for static export if needed
      // 3. Bundle and minify the application code
      // For now, we mark the transformed code as ready
      this.context.transformedCode = {
        // Placeholder - actual code transformation would happen here
        _env_ready: 'true',
      };

      return { success: true, data: { envVarsSet: Object.keys(envVars).length } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code transformation failed',
      };
    }
  }

  private async buildApplication(): Promise<StepResult> {
    try {
      // The actual build happens during Cloudflare Pages deployment
      // or would be handled by a CI/CD pipeline.
      // Here we prepare the build configuration and validate.

      const config = this.context.webConfig;
      if (!config) {
        return { success: false, error: 'No web configuration available' };
      }

      // Validate that we have the necessary artifacts
      if (!this.context.environmentVars) {
        return { success: false, error: 'Environment variables not prepared' };
      }

      // For Cloudflare Pages, the build happens server-side
      // For Vercel, similarly the build is handled by their platform
      // We mark this step as complete since the actual build
      // will be triggered during the deploy step

      return {
        success: true,
        data: {
          buildReady: true,
          hosting: config.hosting,
          envVarsCount: Object.keys(this.context.environmentVars).length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Build preparation failed',
      };
    }
  }

  private async deployToHosting(config: WebDeployConfig): Promise<StepResult> {
    try {
      if (config.hosting === 'cloudflare') {
        const cloudflareService = getCloudflareService();
        const projectName = `${this.context.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

        // Deploy to Cloudflare Pages (handles project creation and deployment in one call)
        const result = await cloudflareService.deployToPages({
          projectId: this.context.projectId,
          projectName,
          files: this.context.transformedCode || {},
          branch: 'main',
          environmentVars: this.context.environmentVars,
        });

        if (!result.success || !result.deployment) {
          return { success: false, error: result.error || 'Failed to deploy to Cloudflare' };
        }

        // Store the full deployment result
        this.context.deployedProject = result.deployment;

        return { success: true, data: this.context.deployedProject };
      }

      if (config.hosting === 'vercel') {
        // Vercel deployment not yet implemented - would use similar pattern
        return { success: false, error: 'Vercel deployment not yet implemented' };
      }

      return { success: false, error: 'Invalid hosting provider' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Hosting deployment failed',
      };
    }
  }

  private async configureDomain(domain: string): Promise<StepResult> {
    try {
      const domainService = getDomainService();

      // Validate domain
      const validation = domainService.validateDomain(domain);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Get target host from deployed project
      const targetHost =
        this.context.deployedProject?.productionUrl?.replace(/^https?:\/\//, '') || '';
      if (!targetHost) {
        return { success: false, error: 'No deployment URL available for domain configuration' };
      }

      // Setup domain
      const result = await domainService.setupDomain(this.context.projectId, {
        domain,
        provider: this.context.webConfig?.hosting === 'cloudflare' ? 'cloudflare' : 'custom',
        targetHost,
        targetType: 'cname',
        sslEnabled: true,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to configure domain' };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Domain configuration failed',
      };
    }
  }

  private async verifyDeployment(): Promise<StepResult> {
    try {
      const deploymentUrl = this.context.deployedProject?.productionUrl;

      if (!deploymentUrl) {
        // No URL to verify - deployment may still be processing
        return {
          success: true,
          data: { verified: false, reason: 'No deployment URL available yet' },
        };
      }

      // Attempt to reach the deployed URL
      // Give the deployment some time to propagate (max 3 attempts)
      const maxAttempts = 3;
      const delayBetweenAttempts = 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await fetch(deploymentUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok || response.status === 304) {
            return {
              success: true,
              data: {
                verified: true,
                url: deploymentUrl,
                statusCode: response.status,
                attempt,
              },
            };
          }

          // If we get a non-OK response, wait and retry
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delayBetweenAttempts));
          }
        } catch {
          // Network error - wait and retry
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delayBetweenAttempts));
          }
        }
      }

      // Deployment may still be propagating - don't fail, just note it
      return {
        success: true,
        data: {
          verified: false,
          url: deploymentUrl,
          reason: 'Deployment may still be propagating. Check the URL in a few minutes.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  // --------------------------------------------------------------------------
  // MOBILE DEPLOYMENT STEPS (Stub implementations)
  // --------------------------------------------------------------------------

  private async validateMobileConfig(config: MobileDeployConfig): Promise<StepResult> {
    if (!config.bundleId?.trim()) {
      return { success: false, error: 'Bundle ID is required' };
    }

    const bundleIdRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;
    if (!bundleIdRegex.test(config.bundleId)) {
      return { success: false, error: 'Invalid bundle ID format' };
    }

    return { success: true };
  }

  private async generateCapacitorConfig(config: MobileDeployConfig): Promise<StepResult> {
    try {
      const mobileService = getMobileDeployService();
      const capacitorConfig = mobileService.generateCapacitorConfig(config);

      // Store config in context for later steps
      this.context.mobileConfig = config;

      return {
        success: true,
        data: {
          appId: capacitorConfig.appId,
          appName: capacitorConfig.appName,
          webDir: capacitorConfig.webDir,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate Capacitor config',
      };
    }
  }

  private async syncCapacitorProjects(): Promise<StepResult> {
    try {
      // Capacitor sync is handled by the mobile deploy service
      // as part of the build process. This step validates readiness.
      const config = this.context.mobileConfig;
      if (!config) {
        return { success: false, error: 'Mobile config not available' };
      }

      const mobileService = getMobileDeployService();
      const validation = mobileService.validateConfig(config);

      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      return { success: true, data: { syncReady: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync Capacitor projects',
      };
    }
  }

  private async buildIOS(config: MobileDeployConfig): Promise<StepResult> {
    try {
      const mobileService = getMobileDeployService();

      // Trigger iOS build via Inngest background job
      const result = await mobileService.deploy(
        this.context.projectId,
        this.context.userId,
        { ...config, platform: 'ios' },
        JSON.stringify(this.context.transformedCode || {})
      );

      if (!result.success) {
        return { success: false, error: result.error || 'iOS build failed to start' };
      }

      // Store partial build result
      this.context.mobileBuild = result;

      return {
        success: true,
        data: {
          platform: 'ios',
          status: 'queued',
          message: 'iOS build queued. This may take 10-30 minutes.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'iOS build failed',
      };
    }
  }

  private async buildAndroid(config: MobileDeployConfig): Promise<StepResult> {
    try {
      const mobileService = getMobileDeployService();

      // Trigger Android build via Inngest background job
      const result = await mobileService.deploy(
        this.context.projectId,
        this.context.userId,
        { ...config, platform: 'android' },
        JSON.stringify(this.context.transformedCode || {})
      );

      if (!result.success) {
        return { success: false, error: result.error || 'Android build failed to start' };
      }

      // Merge with existing build result
      if (this.context.mobileBuild) {
        this.context.mobileBuild = {
          ...this.context.mobileBuild,
          ...result,
        };
      } else {
        this.context.mobileBuild = result;
      }

      return {
        success: true,
        data: {
          platform: 'android',
          status: 'queued',
          message: 'Android build queued. This may take 10-30 minutes.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Android build failed',
      };
    }
  }

  private async uploadToEAS(): Promise<StepResult> {
    try {
      // EAS upload is handled automatically by the MobileDeployService
      // as part of the build process via Inngest.
      // This step confirms the builds were queued successfully.

      if (!this.context.mobileBuild?.success) {
        return { success: false, error: 'No successful builds to upload' };
      }

      return {
        success: true,
        data: {
          message: 'Builds submitted to EAS. Check your Expo dashboard for status.',
          builds: this.context.mobileBuild.builds,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'EAS upload failed',
      };
    }
  }

  // --------------------------------------------------------------------------
  // DESKTOP DEPLOYMENT STEPS (Stub implementations)
  // --------------------------------------------------------------------------

  private async validateDesktopConfig(config: DesktopDeployConfig): Promise<StepResult> {
    if (!config.appId?.trim()) {
      return { success: false, error: 'App ID is required' };
    }

    if (config.platforms.length === 0) {
      return { success: false, error: 'At least one platform must be selected' };
    }

    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(config.version)) {
      return { success: false, error: 'Invalid version format (expected x.y.z)' };
    }

    return { success: true };
  }

  private async generateTauriConfig(config: DesktopDeployConfig): Promise<StepResult> {
    try {
      const desktopService = getDesktopDeployService();
      const tauriConfig = desktopService.generateTauriConfig(config);

      // Store config in context
      this.context.desktopConfig = config;

      return {
        success: true,
        data: {
          productName: tauriConfig.productName,
          version: tauriConfig.version,
          identifier: tauriConfig.identifier,
          platforms: config.platforms,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate Tauri config',
      };
    }
  }

  private async buildWindows(config: DesktopDeployConfig): Promise<StepResult> {
    try {
      const desktopService = getDesktopDeployService();

      // Trigger Windows build via Inngest background job
      const result = await desktopService.deploy(
        this.context.projectId,
        this.context.userId,
        { ...config, platforms: ['windows'] },
        JSON.stringify(this.context.transformedCode || {})
      );

      if (!result.success) {
        return { success: false, error: result.error || 'Windows build failed to start' };
      }

      // Initialize or update desktop build result
      this.context.desktopBuild = this.context.desktopBuild || { success: true, builds: {} };

      return {
        success: true,
        data: {
          platform: 'windows',
          status: 'queued',
          buildId: result.buildIds?.windows,
          message: 'Windows build queued. This may take 15-45 minutes.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Windows build failed',
      };
    }
  }

  private async buildMacOS(config: DesktopDeployConfig): Promise<StepResult> {
    try {
      const desktopService = getDesktopDeployService();

      // Trigger macOS build via Inngest background job
      const result = await desktopService.deploy(
        this.context.projectId,
        this.context.userId,
        { ...config, platforms: ['macos'] },
        JSON.stringify(this.context.transformedCode || {})
      );

      if (!result.success) {
        return { success: false, error: result.error || 'macOS build failed to start' };
      }

      return {
        success: true,
        data: {
          platform: 'macos',
          status: 'queued',
          buildId: result.buildIds?.macos,
          message: 'macOS build queued. This may take 15-45 minutes.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'macOS build failed',
      };
    }
  }

  private async buildLinux(config: DesktopDeployConfig): Promise<StepResult> {
    try {
      const desktopService = getDesktopDeployService();

      // Trigger Linux build via Inngest background job
      const result = await desktopService.deploy(
        this.context.projectId,
        this.context.userId,
        { ...config, platforms: ['linux'] },
        JSON.stringify(this.context.transformedCode || {})
      );

      if (!result.success) {
        return { success: false, error: result.error || 'Linux build failed to start' };
      }

      return {
        success: true,
        data: {
          platform: 'linux',
          status: 'queued',
          buildId: result.buildIds?.linux,
          message: 'Linux build queued. This may take 15-45 minutes.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Linux build failed',
      };
    }
  }

  private async packageInstallers(config: DesktopDeployConfig): Promise<StepResult> {
    try {
      // Packaging is handled by the Tauri build process via Inngest.
      // This step confirms all platform builds were queued successfully.

      const desktopService = getDesktopDeployService();
      const validation = desktopService.validateConfig(config);

      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      return {
        success: true,
        data: {
          message: 'Desktop builds submitted. Check your build dashboard for status.',
          platforms: config.platforms,
          formats: {
            windows: config.windowsFormat,
            macos: config.macosFormat,
            linux: config.linuxFormat,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installer packaging failed',
      };
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private getDatabaseUrl(): string | undefined {
    if (!this.context.provisionedDatabase) return undefined;

    // Check if it's a Turso database
    if ('connectionUrl' in this.context.provisionedDatabase) {
      return this.context.provisionedDatabase.connectionUrl;
    }

    // Check if it's a Neon database
    if ('connectionUri' in this.context.provisionedDatabase) {
      return this.context.provisionedDatabase.connectionUri;
    }

    return undefined;
  }

  private getDesktopArtifacts(): DesktopDeploymentResult['artifacts'] {
    const builds = this.context.desktopBuild?.builds;
    if (!builds) return undefined;

    return {
      windows: builds.windows?.artifacts?.[0]?.downloadUrl,
      macos: builds.macos?.artifacts?.[0]?.downloadUrl,
      linux: builds.linux?.artifacts?.[0]?.downloadUrl,
    };
  }

  private async simulateDelay(ms: number): Promise<void> {
    if (this.options.dryRun) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a deployment orchestrator instance
 */
export function createDeploymentOrchestrator(
  projectId: string,
  projectName: string,
  userId: string,
  platform: DeploymentPlatform,
  options?: OrchestrationOptions
): DeploymentOrchestrator {
  return new DeploymentOrchestrator(projectId, projectName, userId, platform, options);
}
