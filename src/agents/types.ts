/**
 * Agent System Types
 *
 * Type definitions for the deployment agent system including:
 * - DeploymentAgent: Orchestrates deployment workflows
 * - CodeTransformAgent: Transforms code for production
 */

// ============================================================================
// DEPLOYMENT CONFIGURATION TYPES
// ============================================================================

/**
 * Supported deployment platforms
 */
export type DeploymentPlatform = 'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux';

/**
 * Database provider options
 */
export type DatabaseProvider = 'turso' | 'neon' | 'byo';

/**
 * Hosting provider options
 */
export type HostingProvider = 'cloudflare' | 'vercel';

/**
 * Deployment status values
 */
export type DeploymentStatus =
  | 'pending'
  | 'analyzing'
  | 'provisioning_database'
  | 'transforming_code'
  | 'deploying'
  | 'configuring_domain'
  | 'verifying'
  | 'completed'
  | 'failed';

/**
 * Configuration for web deployment
 */
export interface WebDeploymentConfig {
  platform: 'web';
  database: {
    provider: DatabaseProvider;
    /** For BYO database */
    connectionString?: string;
  };
  hosting: {
    provider: HostingProvider;
  };
  domain?: {
    type: 'subdomain' | 'custom' | 'purchase';
    value?: string;
  };
  environmentVars?: Record<string, string>;
}

/**
 * Configuration for mobile deployment
 */
export interface MobileDeploymentConfig {
  platform: 'ios' | 'android';
  appName: string;
  bundleId: string;
  /** EAS Build configuration */
  easConfig?: {
    profile: 'development' | 'preview' | 'production';
  };
}

/**
 * Configuration for desktop deployment
 */
export interface DesktopDeploymentConfig {
  platform: 'windows' | 'macos' | 'linux';
  appName: string;
  /** Tauri configuration */
  tauriConfig?: {
    identifier: string;
    icon?: string;
  };
}

export type DeploymentConfig =
  | WebDeploymentConfig
  | MobileDeploymentConfig
  | DesktopDeploymentConfig;

// ============================================================================
// AGENT CONTEXT TYPES
// ============================================================================

/**
 * Project information passed to agents
 */
export interface ProjectContext {
  projectId: string;
  userId: string;
  projectName: string;
  /** The generated app code as JSON string */
  appCode: string;
  /** Parsed files from the app code */
  files: AppFile[];
  /** App concept/requirements if available */
  appConcept?: {
    name: string;
    description: string;
    features: string[];
    techStack?: string[];
  };
}

/**
 * Individual file in the generated app
 */
export interface AppFile {
  path: string;
  content: string;
  language: string;
}

/**
 * Database schema information
 */
export interface DatabaseSchema {
  /** Prisma schema content */
  prismaSchema?: string;
  /** SQL migration scripts */
  migrations?: string[];
  /** Whether app uses a database */
  hasDatabase: boolean;
}

// ============================================================================
// AGENT RESULT TYPES
// ============================================================================

/**
 * Result from project analysis
 */
export interface ProjectAnalysis {
  /** Recommended database provider */
  recommendedDatabase: DatabaseProvider;
  /** Reason for database recommendation */
  databaseReason: string;
  /** Whether the app needs edge runtime */
  needsEdgeRuntime: boolean;
  /** Detected frameworks/libraries */
  detectedFrameworks: string[];
  /** Required environment variables */
  requiredEnvVars: string[];
  /** Potential issues or warnings */
  warnings: string[];
  /** Database schema if detected */
  databaseSchema: DatabaseSchema;
}

/**
 * Result from code transformation
 */
export interface CodeTransformResult {
  success: boolean;
  /** Transformed files */
  transformedFiles: AppFile[];
  /** Changes made during transformation */
  changes: TransformChange[];
  /** Any errors encountered */
  errors?: string[];
}

/**
 * Individual transformation change
 */
export interface TransformChange {
  file: string;
  type: 'modified' | 'added' | 'removed';
  description: string;
}

/**
 * Result from deployment
 */
export interface DeploymentResult {
  success: boolean;
  status: DeploymentStatus;
  /** Deployment URL if successful */
  deploymentUrl?: string;
  /** Custom domain URL if configured */
  customDomainUrl?: string;
  /** Database connection info */
  database?: {
    provider: DatabaseProvider;
    id: string;
    /** Only for display, actual URL is encrypted */
    host?: string;
  };
  /** Hosting info */
  hosting?: {
    provider: HostingProvider;
    projectId: string;
  };
  /** Error message if failed */
  error?: string;
  /** Detailed error for debugging */
  errorDetails?: string;
  /** Steps completed */
  completedSteps: string[];
}

// ============================================================================
// AGENT MESSAGE TYPES
// ============================================================================

/**
 * Status update from agent during deployment
 */
export interface AgentStatusUpdate {
  status: DeploymentStatus;
  message: string;
  /** Progress percentage 0-100 */
  progress: number;
  /** Current step being executed */
  currentStep?: string;
  /** Timestamp of update */
  timestamp: string;
}

/**
 * Agent decision that requires user input
 */
export interface AgentDecisionRequest {
  type: 'database_choice' | 'env_var_required' | 'domain_config' | 'confirmation';
  question: string;
  options?: string[];
  defaultValue?: string;
  required: boolean;
}

// ============================================================================
// AGENT INTERFACE
// ============================================================================

/**
 * Base interface for deployment agents
 */
export interface IDeploymentAgent {
  /**
   * Analyze a project to determine deployment requirements
   */
  analyzeProject(context: ProjectContext): Promise<ProjectAnalysis>;

  /**
   * Deploy a project with the given configuration
   */
  deploy(
    context: ProjectContext,
    config: DeploymentConfig,
    onStatusUpdate?: (update: AgentStatusUpdate) => void
  ): Promise<DeploymentResult>;
}

/**
 * Interface for code transformation agent
 */
export interface ICodeTransformAgent {
  /**
   * Transform code for production deployment
   */
  transform(
    files: AppFile[],
    targetDatabase: DatabaseProvider,
    targetHosting: HostingProvider
  ): Promise<CodeTransformResult>;

  /**
   * Update Prisma schema for target database
   */
  transformPrismaSchema(schema: string, targetDatabase: DatabaseProvider): Promise<string>;
}

// ============================================================================
// INNGEST EVENT TYPES
// ============================================================================

/**
 * Event data for mobile build jobs
 * Note: Uses flattened structure for Inngest serialization
 */
export interface MobileBuildEvent {
  name: 'deploy/mobile.requested';
  data: {
    projectId: string;
    userId: string;
    platform: 'ios' | 'android';
    appName: string;
    bundleId: string;
    transformedCode: string;
    easProfile: 'development' | 'preview' | 'production';
  };
}

/**
 * Event data for desktop build jobs
 * Note: Uses flattened structure for Inngest serialization
 */
export interface DesktopBuildEvent {
  name: 'deploy/desktop.requested';
  data: {
    projectId: string;
    userId: string;
    platform: 'windows' | 'macos' | 'linux';
    appName: string;
    identifier: string;
    transformedCode: string;
  };
}

/**
 * Event data for database migration jobs
 */
export interface DatabaseMigrationEvent {
  name: 'deploy/database.migrate';
  data: {
    projectId: string;
    userId: string;
    sourceData: string; // JSON serialized browser SQLite data
    targetProvider: 'turso' | 'neon';
    targetConnectionUrl: string;
  };
}

/**
 * Event data for status updates
 */
export interface StatusUpdateEvent {
  name: 'deploy/status.updated';
  data: {
    projectId: string;
    userId: string;
    platform: string;
    status: string;
    message: string;
    progress: number;
    artifactUrl?: string;
    error?: string;
  };
}

/**
 * Event data for cancelling mobile builds
 */
export interface MobileBuildCancelEvent {
  name: 'deploy/mobile.cancelled';
  data: {
    projectId: string;
    userId: string;
  };
}

/**
 * Event data for cancelling desktop builds
 */
export interface DesktopBuildCancelEvent {
  name: 'deploy/desktop.cancelled';
  data: {
    projectId: string;
    userId: string;
  };
}

/**
 * Event data for cancelling database migrations
 */
export interface DatabaseMigrationCancelEvent {
  name: 'deploy/database.cancelled';
  data: {
    projectId: string;
    userId: string;
  };
}

export type DeploymentEvent =
  | MobileBuildEvent
  | DesktopBuildEvent
  | DatabaseMigrationEvent
  | StatusUpdateEvent
  | MobileBuildCancelEvent
  | DesktopBuildCancelEvent
  | DatabaseMigrationCancelEvent;
