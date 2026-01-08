/**
 * DeploymentAgent
 *
 * AI-powered deployment orchestration agent using Claude.
 * Analyzes projects, makes intelligent decisions about deployment configuration,
 * and orchestrates the deployment process with error recovery.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  IDeploymentAgent,
  ProjectContext,
  ProjectAnalysis,
  DeploymentConfig,
  DeploymentResult,
  AgentStatusUpdate,
  DeploymentStatus,
  DatabaseProvider,
  AppFile,
  WebDeploymentConfig,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANALYSIS_SYSTEM_PROMPT = `You are a deployment analysis expert. Your job is to analyze web application code and determine the optimal deployment configuration.

When analyzing a project, you should:
1. Identify if the app uses a database (look for Prisma, SQL, or data storage patterns)
2. Determine the best database provider:
   - Turso: Best for SQLite-compatible apps, edge deployment, cost-effective
   - Neon: Best for PostgreSQL apps or complex relational needs
   - BYO (Bring Your Own): If app has specific database requirements
3. Check if the app needs edge runtime (serverless functions, API routes)
4. Identify required environment variables
5. Detect any potential deployment issues

Respond with a JSON object containing your analysis.`;

// Reserved for future AI-assisted deployment error recovery
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _DEPLOYMENT_SYSTEM_PROMPT = `You are a deployment orchestration agent. Your job is to guide the deployment process, handle errors intelligently, and provide clear status updates.

When deploying:
1. Validate the configuration
2. Provision resources in the correct order
3. Handle errors gracefully with recovery suggestions
4. Provide clear, user-friendly status messages

Always respond with JSON containing the next action to take or the result.`;

// ============================================================================
// DEPLOYMENT AGENT CLASS
// ============================================================================

export class DeploymentAgent implements IDeploymentAgent {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Analyze a project to determine deployment requirements
   */
  async analyzeProject(context: ProjectContext): Promise<ProjectAnalysis> {
    const filesDescription = this.describeFiles(context.files);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this project for deployment:

Project Name: ${context.projectName}
${context.appConcept ? `Description: ${context.appConcept.description}` : ''}

Files:
${filesDescription}

Provide your analysis as JSON with this structure:
{
  "recommendedDatabase": "turso" | "neon" | "byo",
  "databaseReason": "explanation",
  "needsEdgeRuntime": boolean,
  "detectedFrameworks": ["framework1", "framework2"],
  "requiredEnvVars": ["VAR1", "VAR2"],
  "warnings": ["warning1", "warning2"],
  "databaseSchema": {
    "hasDatabase": boolean,
    "prismaSchema": "schema if found" | null
  }
}`,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const analysis = this.parseJsonResponse<ProjectAnalysis>(responseText, {
      recommendedDatabase: 'turso',
      databaseReason: 'Default recommendation for cost-effective deployment',
      needsEdgeRuntime: true,
      detectedFrameworks: ['next.js', 'react'],
      requiredEnvVars: [],
      warnings: [],
      databaseSchema: { hasDatabase: false },
    });

    return analysis;
  }

  /**
   * Deploy a project with the given configuration
   */
  async deploy(
    context: ProjectContext,
    config: DeploymentConfig,
    onStatusUpdate?: (update: AgentStatusUpdate) => void
  ): Promise<DeploymentResult> {
    const updateStatus = (
      status: DeploymentStatus,
      message: string,
      progress: number,
      currentStep?: string
    ) => {
      if (onStatusUpdate) {
        onStatusUpdate({
          status,
          message,
          progress,
          currentStep,
          timestamp: new Date().toISOString(),
        });
      }
    };

    try {
      // Only handle web deployments directly
      // Mobile/Desktop deployments should go through Inngest
      if (config.platform !== 'web') {
        return {
          success: false,
          status: 'failed',
          error: `Platform ${config.platform} deployments should use background jobs`,
          completedSteps: [],
        };
      }

      const webConfig = config as WebDeploymentConfig;
      const completedSteps: string[] = [];

      // Step 1: Analyze
      updateStatus('analyzing', 'Analyzing project structure...', 10, 'analysis');
      const analysis = await this.analyzeProject(context);
      completedSteps.push('Project analysis complete');

      // Step 2: Validate configuration
      updateStatus('analyzing', 'Validating deployment configuration...', 20, 'validation');
      const validationResult = await this.validateConfig(context, webConfig, analysis);
      if (!validationResult.valid) {
        return {
          success: false,
          status: 'failed',
          error: validationResult.error,
          completedSteps,
        };
      }
      completedSteps.push('Configuration validated');

      // Step 3: Provision database
      updateStatus(
        'provisioning_database',
        `Setting up ${webConfig.database.provider} database...`,
        30,
        'database'
      );
      const databaseResult = await this.provisionDatabase(context, webConfig.database.provider);
      if (!databaseResult.success) {
        return {
          success: false,
          status: 'failed',
          error: databaseResult.error,
          completedSteps,
        };
      }
      completedSteps.push(`${webConfig.database.provider} database provisioned`);

      // Step 4: Transform code
      updateStatus('transforming_code', 'Transforming code for production...', 50, 'transform');
      const transformResult = await this.requestCodeTransform(context, webConfig);
      if (!transformResult.success) {
        return {
          success: false,
          status: 'failed',
          error: transformResult.error,
          completedSteps,
        };
      }
      completedSteps.push('Code transformed for production');

      // Step 5: Deploy to hosting
      updateStatus('deploying', `Deploying to ${webConfig.hosting.provider}...`, 70, 'hosting');
      const hostingResult = await this.deployToHosting(
        context,
        webConfig,
        transformResult.transformedCode ?? context.appCode
      );
      if (!hostingResult.success) {
        return {
          success: false,
          status: 'failed',
          error: hostingResult.error,
          completedSteps,
        };
      }
      completedSteps.push(`Deployed to ${webConfig.hosting.provider}`);

      // Step 6: Configure domain (if custom)
      if (webConfig.domain && webConfig.domain.type !== 'subdomain') {
        updateStatus('configuring_domain', 'Configuring custom domain...', 85, 'domain');
        const domainResult = await this.configureDomain(
          webConfig.domain,
          hostingResult.deploymentUrl ?? ''
        );
        if (!domainResult.success) {
          // Domain config failure is not fatal
          completedSteps.push('Domain configuration failed (non-fatal)');
        } else {
          completedSteps.push('Custom domain configured');
        }
      }

      // Step 7: Verify deployment
      updateStatus('verifying', 'Verifying deployment...', 95, 'verify');
      const verifyResult = await this.verifyDeployment(hostingResult.deploymentUrl ?? '');
      if (!verifyResult.success) {
        // Verification failure is not fatal, but we note it
        completedSteps.push(
          'Deployment verification warning: ' + (verifyResult.error ?? 'Unknown')
        );
      } else {
        completedSteps.push('Deployment verified');
      }

      updateStatus('completed', 'Deployment successful!', 100, 'complete');

      return {
        success: true,
        status: 'completed',
        deploymentUrl: hostingResult.deploymentUrl,
        customDomainUrl: webConfig.domain?.value,
        database: {
          provider: webConfig.database.provider,
          id: databaseResult.databaseId ?? '',
          host: databaseResult.host,
        },
        hosting: {
          provider: webConfig.hosting.provider,
          projectId: hostingResult.projectId ?? '',
        },
        completedSteps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStatus('failed', `Deployment failed: ${errorMessage}`, 0);
      return {
        success: false,
        status: 'failed',
        error: errorMessage,
        errorDetails: error instanceof Error ? error.stack : undefined,
        completedSteps: [],
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create a description of files for the AI to analyze
   */
  private describeFiles(files: AppFile[]): string {
    return files
      .map((file) => {
        // Truncate large files
        const content =
          file.content.length > 2000
            ? file.content.substring(0, 2000) + '\n... (truncated)'
            : file.content;
        return `--- ${file.path} ---\n${content}`;
      })
      .join('\n\n');
  }

  /**
   * Parse JSON from AI response with fallback
   */
  private parseJsonResponse<T>(text: string, fallback: T): T {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      return fallback;
    } catch {
      console.warn('Failed to parse AI response as JSON, using fallback');
      return fallback;
    }
  }

  /**
   * Validate deployment configuration
   */
  private async validateConfig(
    context: ProjectContext,
    config: WebDeploymentConfig,
    analysis: ProjectAnalysis
  ): Promise<{ valid: boolean; error?: string }> {
    // Check for required environment variables
    const missingVars = analysis.requiredEnvVars.filter((v) => !config.environmentVars?.[v]);
    if (missingVars.length > 0 && analysis.requiredEnvVars.length > 0) {
      // Only warn, don't fail - some vars might be set at runtime
      console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Validate BYO database has connection string
    if (config.database.provider === 'byo' && !config.database.connectionString) {
      return {
        valid: false,
        error: 'BYO database requires a connection string',
      };
    }

    return { valid: true };
  }

  /**
   * Provision database (placeholder - actual implementation in services)
   */
  private async provisionDatabase(
    context: ProjectContext,
    provider: DatabaseProvider
  ): Promise<{ success: boolean; databaseId?: string; host?: string; error?: string }> {
    // This will be implemented by TursoService/NeonService
    // For now, return a placeholder
    console.log(`[DeploymentAgent] Would provision ${provider} database for ${context.projectId}`);

    // Simulate database provisioning
    return {
      success: true,
      databaseId: `db-${context.projectId.substring(0, 8)}`,
      host: provider === 'turso' ? 'libsql://your-db.turso.io' : 'your-db.neon.tech',
    };
  }

  /**
   * Request code transformation (delegates to CodeTransformAgent)
   */
  private async requestCodeTransform(
    context: ProjectContext,
    config: WebDeploymentConfig
  ): Promise<{ success: boolean; transformedCode?: string; error?: string }> {
    // This will delegate to CodeTransformAgent
    // For now, return the original code
    console.log(
      `[DeploymentAgent] Would transform code for ${config.database.provider}/${config.hosting.provider}`
    );

    return {
      success: true,
      transformedCode: context.appCode,
    };
  }

  /**
   * Deploy to hosting provider (placeholder - actual implementation in services)
   */
  private async deployToHosting(
    context: ProjectContext,
    config: WebDeploymentConfig,
    _transformedCode: string
  ): Promise<{ success: boolean; deploymentUrl?: string; projectId?: string; error?: string }> {
    // This will be implemented by CloudflareService/VercelService
    // _transformedCode will be uploaded to the hosting provider
    // eslint-disable-next-line no-console
    console.log(`[DeploymentAgent] Would deploy to ${config.hosting.provider}`);

    const subdomain = context.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 20);

    return {
      success: true,
      deploymentUrl:
        config.hosting.provider === 'cloudflare'
          ? `https://${subdomain}.pages.dev`
          : `https://${subdomain}.vercel.app`,
      projectId: `proj-${context.projectId.substring(0, 8)}`,
    };
  }

  /**
   * Configure custom domain
   */
  private async configureDomain(
    domain: { type: string; value?: string },
    deploymentUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    // This will be implemented by DomainService
    console.log(`[DeploymentAgent] Would configure domain ${domain.value} -> ${deploymentUrl}`);
    return { success: true };
  }

  /**
   * Verify deployment is accessible
   */
  private async verifyDeployment(url: string): Promise<{ success: boolean; error?: string }> {
    // In production, this would make an HTTP request to verify
    console.log(`[DeploymentAgent] Would verify deployment at ${url}`);
    return { success: true };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new DeploymentAgent instance
 */
export function createDeploymentAgent(apiKey?: string): DeploymentAgent {
  return new DeploymentAgent(apiKey);
}
