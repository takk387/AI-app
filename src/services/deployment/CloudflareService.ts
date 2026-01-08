/**
 * CloudflareService
 *
 * Service for deploying applications to Cloudflare Pages.
 * Reference: https://developers.cloudflare.com/api/
 */

import type {
  CloudflareConfig,
  PagesProject,
  PagesDeployment,
  CreatePagesProjectRequest,
  CreateDeploymentRequest,
  CustomDomain,
  CloudflareApiResponse,
  CloudflareApiError,
  DeployToPagesRequest,
  DeployToPagesResult,
  DeployedPagesProject,
  ConfigureDomainRequest,
  ConfigureDomainResult,
  PagesDeploymentConfig,
} from '@/types/deployment/cloudflare';
import { CLOUDFLARE_API_BASE_URL } from '@/types/deployment/cloudflare';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Project name prefix for generated apps
 */
const PROJECT_PREFIX = 'aiapp';

/**
 * Default build configuration
 */
const DEFAULT_BUILD_CONFIG = {
  buildCommand: 'npm run build',
  destinationDir: '.next',
  rootDir: '',
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class CloudflareService {
  private config: CloudflareConfig;
  private baseUrl: string;

  constructor(config?: Partial<CloudflareConfig>) {
    const accountId = config?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = config?.apiToken || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error(
        'Cloudflare configuration missing: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required'
      );
    }

    this.config = {
      accountId,
      apiToken,
      baseUrl: config?.baseUrl || CLOUDFLARE_API_BASE_URL,
    };

    this.baseUrl = `${this.config.baseUrl}/accounts/${this.config.accountId}/pages`;
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Deploy an application to Cloudflare Pages
   */
  async deployToPages(request: DeployToPagesRequest): Promise<DeployToPagesResult> {
    try {
      // Generate a unique project name
      const projectName = this.generateProjectName(request.projectName);

      // Check if project exists, create if not
      let project = await this.getProject(projectName);

      if (!project) {
        project = await this.createProject({
          name: projectName,
          productionBranch: request.branch || 'main',
          buildConfig: DEFAULT_BUILD_CONFIG,
          deploymentConfig: {
            production: this.buildDeploymentConfig(request.environmentVars),
            preview: this.buildDeploymentConfig(request.environmentVars),
          },
        });
      }

      // Create deployment with direct upload
      const deployment = await this.createDirectUploadDeployment(
        projectName,
        request.files,
        request.branch
      );

      const deployedProject: DeployedPagesProject = {
        projectId: project.id,
        projectName: project.name,
        subdomain: project.subdomain,
        productionUrl: `https://${project.subdomain}.pages.dev`,
        deploymentId: deployment.id,
        deploymentUrl: deployment.url,
        environment: deployment.environment,
        createdAt: deployment.createdOn,
        customDomains: project.domains,
      };

      return {
        success: true,
        deployment: deployedProject,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Configure a custom domain for a project
   */
  async configureDomain(request: ConfigureDomainRequest): Promise<ConfigureDomainResult> {
    try {
      const domain = await this.addDomain(request.projectName, request.domain);

      // Generate DNS records based on validation requirements
      const dnsRecords: {
        type: 'CNAME' | 'A' | 'AAAA' | 'TXT';
        name: string;
        value: string;
        ttl: number;
      }[] = [
        {
          type: 'CNAME',
          name: request.domain,
          value: `${request.projectName}.pages.dev`,
          ttl: 3600,
        },
      ];

      // Add TXT record for validation if required
      if (domain.validationData?.txtName && domain.validationData?.txtValue) {
        dnsRecords.push({
          type: 'TXT',
          name: domain.validationData.txtName,
          value: domain.validationData.txtValue,
          ttl: 3600,
        });
      }

      return {
        success: true,
        domain,
        dnsRecords,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Domain configuration failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectName: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request(`/projects/${projectName}`, {
        method: 'DELETE',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Project deletion failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get a project by name
   */
  async getProject(projectName: string): Promise<PagesProject | null> {
    try {
      const response = await this.request<CloudflareApiResponse<PagesProject>>(
        `/projects/${projectName}`
      );
      return response.result;
    } catch {
      return null;
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<PagesProject[]> {
    const response = await this.request<CloudflareApiResponse<PagesProject[]>>('/projects');
    return response.result;
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(projectName: string, deploymentId: string): Promise<PagesDeployment | null> {
    try {
      const response = await this.request<CloudflareApiResponse<PagesDeployment>>(
        `/projects/${projectName}/deployments/${deploymentId}`
      );
      return response.result;
    } catch {
      return null;
    }
  }

  /**
   * List deployments for a project
   */
  async listDeployments(projectName: string): Promise<PagesDeployment[]> {
    const response = await this.request<CloudflareApiResponse<PagesDeployment[]>>(
      `/projects/${projectName}/deployments`
    );
    return response.result;
  }

  /**
   * Get project domains
   */
  async listDomains(projectName: string): Promise<CustomDomain[]> {
    const response = await this.request<CloudflareApiResponse<CustomDomain[]>>(
      `/projects/${projectName}/domains`
    );
    return response.result;
  }

  /**
   * Rollback to a previous deployment
   */
  async rollbackDeployment(projectName: string, deploymentId: string): Promise<PagesDeployment> {
    const response = await this.request<CloudflareApiResponse<PagesDeployment>>(
      `/projects/${projectName}/deployments/${deploymentId}/rollback`,
      { method: 'POST' }
    );
    return response.result;
  }

  /**
   * Retry a failed deployment
   */
  async retryDeployment(projectName: string, deploymentId: string): Promise<PagesDeployment> {
    const response = await this.request<CloudflareApiResponse<PagesDeployment>>(
      `/projects/${projectName}/deployments/${deploymentId}/retry`,
      { method: 'POST' }
    );
    return response.result;
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(projectName: string, deploymentId: string): Promise<PagesDeployment> {
    const response = await this.request<CloudflareApiResponse<PagesDeployment>>(
      `/projects/${projectName}/deployments/${deploymentId}/cancel`,
      { method: 'POST' }
    );
    return response.result;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  /**
   * Create a new Pages project
   */
  private async createProject(request: CreatePagesProjectRequest): Promise<PagesProject> {
    const response = await this.request<CloudflareApiResponse<PagesProject>>('/projects', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.result;
  }

  /**
   * Create a direct upload deployment
   */
  private async createDirectUploadDeployment(
    projectName: string,
    files: Record<string, string | Uint8Array>,
    branch?: string
  ): Promise<PagesDeployment> {
    // Create deployment
    const createParams: CreateDeploymentRequest = {
      branch: branch || 'main',
    };

    const createResponse = await this.request<CloudflareApiResponse<PagesDeployment>>(
      `/projects/${projectName}/deployments`,
      {
        method: 'POST',
        body: JSON.stringify(createParams),
      }
    );

    const deployment = createResponse.result;

    // Upload files
    await this.uploadDeploymentFiles(projectName, deployment.id, files);

    return deployment;
  }

  /**
   * Upload files to a deployment
   */
  private async uploadDeploymentFiles(
    projectName: string,
    deploymentId: string,
    files: Record<string, string | Uint8Array>
  ): Promise<void> {
    // Create form data with files
    const formData = new FormData();

    for (const [path, content] of Object.entries(files)) {
      let blob: Blob;
      if (typeof content === 'string') {
        blob = new Blob([content], { type: 'text/plain' });
      } else {
        // Create a new Uint8Array copy to ensure compatibility with Blob
        const copy = new Uint8Array(content);
        blob = new Blob([copy], { type: 'application/octet-stream' });
      }

      formData.append(path, blob, path);
    }

    await fetch(`${this.baseUrl}/projects/${projectName}/deployments/${deploymentId}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
      },
      body: formData,
    });
  }

  /**
   * Add a custom domain to a project
   */
  private async addDomain(projectName: string, domain: string): Promise<CustomDomain> {
    const response = await this.request<CloudflareApiResponse<CustomDomain>>(
      `/projects/${projectName}/domains`,
      {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
      }
    );
    return response.result;
  }

  /**
   * Generate a unique project name
   */
  private generateProjectName(name: string): string {
    // Sanitize name (Cloudflare has strict naming rules)
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);

    // Add unique suffix
    const suffix = Date.now().toString(36).substring(-6);

    return `${PROJECT_PREFIX}-${sanitized}-${suffix}`;
  }

  /**
   * Build deployment configuration with environment variables
   */
  private buildDeploymentConfig(environmentVars?: Record<string, string>): PagesDeploymentConfig {
    const config: PagesDeploymentConfig = {
      compatibilityDate: new Date().toISOString().split('T')[0],
      compatibilityFlags: ['nodejs_compat'],
    };

    if (environmentVars && Object.keys(environmentVars).length > 0) {
      config.environmentVariables = {};
      for (const [key, value] of Object.entries(environmentVars)) {
        config.environmentVariables[key] = {
          value,
          type:
            key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN')
              ? 'secret_text'
              : 'plain_text',
        };
      }
    }

    return config;
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = (await response.json()) as CloudflareApiResponse<unknown>;

    if (!response.ok || !data.success) {
      const errors = data.errors as CloudflareApiError[];
      const errorMessage = errors?.[0]?.message || `Cloudflare API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cloudflareServiceInstance: CloudflareService | null = null;

/**
 * Get or create the Cloudflare service instance
 */
export function getCloudflareService(config?: Partial<CloudflareConfig>): CloudflareService {
  if (!cloudflareServiceInstance) {
    cloudflareServiceInstance = new CloudflareService(config);
  }
  return cloudflareServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetCloudflareService(): void {
  cloudflareServiceInstance = null;
}
