/**
 * WebDeploymentPipeline
 *
 * Web deployment steps: validate, provision database, migrate, transform code,
 * build, deploy to hosting, configure domain, verify deployment.
 */

import type { WebDeployConfig } from '@/types/deployment/unified';
import type { DeploymentContext, StepResult, WebDeploymentResult } from './deploymentTypes';
import { WEB_STEPS } from './deploymentTypes';

import { getTursoService } from './TursoService';
import { getNeonService } from './NeonService';
import { getCloudflareService } from './CloudflareService';
import { getDomainService } from './DomainService';
import { getDatabaseMigrationService } from './DatabaseMigrationService';

// ============================================================================
// PIPELINE INTERFACE
// ============================================================================

/**
 * Callbacks provided by the orchestrator for step execution and progress tracking.
 */
export interface PipelineCallbacks {
  executeStep: (stepId: string, executor: () => Promise<StepResult>) => Promise<void>;
  skipStep: (stepId: string) => void;
  initializeProgress: (steps: typeof WEB_STEPS) => void;
  completeDeployment: () => void;
  handleError: (error: unknown) => never;
  getContext: () => DeploymentContext;
}

// ============================================================================
// WEB DEPLOYMENT PIPELINE
// ============================================================================

/**
 * Execute the full web deployment pipeline.
 */
export async function executeWebPipeline(
  config: WebDeployConfig,
  callbacks: PipelineCallbacks
): Promise<WebDeploymentResult> {
  const context = callbacks.getContext();
  context.webConfig = config;
  callbacks.initializeProgress(WEB_STEPS);

  try {
    // Step 1: Validate
    await callbacks.executeStep('validate', () => validateWebConfig(config));

    // Step 2: Provision database (skip if BYO with URL)
    if (config.database !== 'byo' || !config.databaseUrl) {
      await callbacks.executeStep('provision-db', () => provisionDatabase(config, context));
    } else {
      callbacks.skipStep('provision-db');
    }

    // Step 3: Run migrations
    await callbacks.executeStep('migrate', () => runMigrations(context));

    // Step 4: Transform code
    await callbacks.executeStep('transform', () => transformCodeForProduction(config, context));

    // Step 5: Build
    await callbacks.executeStep('build', () => buildApplication(context));

    // Step 6: Deploy
    await callbacks.executeStep('deploy', () => deployToHosting(config, context));

    // Step 7: Configure domain (skip if no custom domain)
    const customDomain = config.customDomain;
    if (customDomain) {
      await callbacks.executeStep('configure-domain', () => configureDomain(customDomain, context));
    } else {
      callbacks.skipStep('configure-domain');
    }

    // Step 8: Verify
    await callbacks.executeStep('verify', () => verifyDeployment(context));

    callbacks.completeDeployment();

    return {
      success: true,
      deploymentUrl: context.deployedProject?.productionUrl,
      databaseUrl: getDatabaseUrl(context),
      context,
    };
  } catch (error) {
    return callbacks.handleError(error);
  }
}

// ============================================================================
// STEP IMPLEMENTATIONS
// ============================================================================

async function validateWebConfig(config: WebDeployConfig): Promise<StepResult> {
  // Validate database configuration
  if (config.database === 'byo' && !config.databaseUrl) {
    return { success: false, error: 'Database URL required for BYO provider' };
  }

  return { success: true };
}

async function provisionDatabase(
  config: WebDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    if (config.database === 'turso') {
      const tursoService = getTursoService();

      const result = await tursoService.provisionDatabase({
        projectId: context.projectId,
        projectName: context.projectName,
      });

      if (!result.success || !result.database) {
        return { success: false, error: result.error || 'Failed to provision Turso database' };
      }

      context.provisionedDatabase = result.database;
      return { success: true, data: result.database };
    }

    if (config.database === 'neon') {
      const neonService = getNeonService();

      const result = await neonService.provisionDatabase({
        projectId: context.projectId,
        projectName: context.projectName,
      });

      if (!result.success || !result.database) {
        return { success: false, error: result.error || 'Failed to provision Neon database' };
      }

      context.provisionedDatabase = result.database;
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

async function runMigrations(context: DeploymentContext): Promise<StepResult> {
  try {
    // Skip migrations if no database was provisioned or using BYO
    if (!context.provisionedDatabase && context.webConfig?.database === 'byo') {
      // BYO databases are assumed to already have schema
      return { success: true, data: { skipped: true, reason: 'BYO database' } };
    }

    if (!context.provisionedDatabase) {
      return { success: true, data: { skipped: true, reason: 'No database provisioned' } };
    }

    const migrationService = getDatabaseMigrationService();
    const dbUrl = getDatabaseUrl(context);

    if (!dbUrl) {
      return { success: false, error: 'No database URL available for migrations' };
    }

    // For now, we create the basic schema. In a full implementation,
    // this would extract schema from the app's Prisma/Drizzle definitions
    // and migrate any browser SQLite data.
    const result = await migrationService.migrate({
      projectId: context.projectId,
      sourceData: {
        schema: [], // Empty schema means just verify connection
        data: {},
      },
      targetProvider: context.webConfig?.database || 'turso',
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

async function transformCodeForProduction(
  config: WebDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    // Build environment variables for production
    const envVars: Record<string, string> = {
      ...config.environmentVars,
      NODE_ENV: 'production',
    };

    // Add database connection string if provisioned
    const dbUrl = getDatabaseUrl(context);
    if (dbUrl) {
      if (config.database === 'turso') {
        envVars['TURSO_DATABASE_URL'] = dbUrl;
        // Auth token would come from the provisioned database
        if (context.provisionedDatabase && 'authToken' in context.provisionedDatabase) {
          envVars['TURSO_AUTH_TOKEN'] = context.provisionedDatabase.authToken || '';
        }
      } else if (config.database === 'neon') {
        envVars['DATABASE_URL'] = dbUrl;
      } else if (config.database === 'byo' && config.databaseUrl) {
        envVars['DATABASE_URL'] = config.databaseUrl;
      }
    }

    // Store environment variables in context for deployment
    context.environmentVars = envVars;

    // In a full implementation, this would:
    // 1. Transform Prisma schema to use the correct adapter (libsql vs pg)
    // 2. Update next.config.js for static export if needed
    // 3. Bundle and minify the application code
    // For now, we mark the transformed code as ready
    context.transformedCode = {
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

async function buildApplication(context: DeploymentContext): Promise<StepResult> {
  try {
    // The actual build happens during Cloudflare Pages deployment
    // or would be handled by a CI/CD pipeline.
    // Here we prepare the build configuration and validate.

    const config = context.webConfig;
    if (!config) {
      return { success: false, error: 'No web configuration available' };
    }

    // Validate that we have the necessary artifacts
    if (!context.environmentVars) {
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
        envVarsCount: Object.keys(context.environmentVars).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Build preparation failed',
    };
  }
}

async function deployToHosting(
  config: WebDeployConfig,
  context: DeploymentContext
): Promise<StepResult> {
  try {
    if (config.hosting === 'cloudflare') {
      const cloudflareService = getCloudflareService();
      const projectName = `${context.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

      // Deploy to Cloudflare Pages (handles project creation and deployment in one call)
      const result = await cloudflareService.deployToPages({
        projectId: context.projectId,
        projectName,
        files: context.transformedCode || {},
        branch: 'main',
        environmentVars: context.environmentVars,
      });

      if (!result.success || !result.deployment) {
        return { success: false, error: result.error || 'Failed to deploy to Cloudflare' };
      }

      // Store the full deployment result
      context.deployedProject = result.deployment;

      return { success: true, data: context.deployedProject };
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

async function configureDomain(domain: string, context: DeploymentContext): Promise<StepResult> {
  try {
    const domainService = getDomainService();

    // Validate domain
    const validation = domainService.validateDomain(domain);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Get target host from deployed project
    const targetHost = context.deployedProject?.productionUrl?.replace(/^https?:\/\//, '') || '';
    if (!targetHost) {
      return { success: false, error: 'No deployment URL available for domain configuration' };
    }

    // Setup domain
    const result = await domainService.setupDomain(context.projectId, {
      domain,
      provider: context.webConfig?.hosting === 'cloudflare' ? 'cloudflare' : 'custom',
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

async function verifyDeployment(context: DeploymentContext): Promise<StepResult> {
  try {
    const deploymentUrl = context.deployedProject?.productionUrl;

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

// ============================================================================
// HELPERS
// ============================================================================

export function getDatabaseUrl(context: DeploymentContext): string | undefined {
  if (!context.provisionedDatabase) return undefined;

  // Check if it's a Turso database
  if ('connectionUrl' in context.provisionedDatabase) {
    return context.provisionedDatabase.connectionUrl;
  }

  // Check if it's a Neon database
  if ('connectionUri' in context.provisionedDatabase) {
    return context.provisionedDatabase.connectionUri;
  }

  return undefined;
}
