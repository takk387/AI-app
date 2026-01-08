/**
 * CodeTransformAgent
 *
 * AI-powered code transformation agent using Claude.
 * Transforms generated code for production deployment including:
 * - Updating Prisma schemas for target database
 * - Adding production dependencies
 * - Configuring edge runtime
 * - Updating environment variable references
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ICodeTransformAgent,
  AppFile,
  DatabaseProvider,
  HostingProvider,
  CodeTransformResult,
  TransformChange,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const TRANSFORM_SYSTEM_PROMPT = `You are a code transformation expert specializing in preparing Next.js applications for production deployment.

Your job is to transform code to work with production infrastructure:

1. **Prisma Schema Transformations:**
   - For Turso: Change provider to "sqlite" and add @prisma/adapter-libsql
   - For Neon: Keep provider as "postgresql" and add @prisma/adapter-neon
   - Update datasource URL to use environment variables

2. **API Route Transformations:**
   - Add edge runtime configuration where beneficial
   - Update database client initialization for serverless

3. **Environment Variables:**
   - Replace hardcoded values with process.env references
   - Add appropriate fallbacks for development

4. **Dependencies:**
   - Add required production adapters
   - Remove development-only dependencies from production bundles

Always respond with valid JSON containing the transformed file content.`;

const PRISMA_TURSO_TEMPLATE = `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;

const PRISMA_NEON_TEMPLATE = `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`;

// ============================================================================
// CODE TRANSFORM AGENT CLASS
// ============================================================================

export class CodeTransformAgent implements ICodeTransformAgent {
  private client: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Transform code for production deployment
   */
  async transform(
    files: AppFile[],
    targetDatabase: DatabaseProvider,
    targetHosting: HostingProvider
  ): Promise<CodeTransformResult> {
    const changes: TransformChange[] = [];
    const transformedFiles: AppFile[] = [];

    try {
      for (const file of files) {
        const transformed = await this.transformFile(file, targetDatabase, targetHosting);

        transformedFiles.push(transformed.file);

        if (transformed.changed) {
          changes.push({
            file: file.path,
            type: 'modified',
            description: transformed.description,
          });
        }
      }

      // Add any additional required files
      const additionalFiles = this.getAdditionalFiles(files, targetDatabase, targetHosting);
      for (const addedFile of additionalFiles) {
        transformedFiles.push(addedFile);
        changes.push({
          file: addedFile.path,
          type: 'added',
          description: `Added ${addedFile.path} for ${targetDatabase}/${targetHosting} deployment`,
        });
      }

      return {
        success: true,
        transformedFiles,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        transformedFiles: files, // Return original on error
        changes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Transform Prisma schema for target database
   */
  async transformPrismaSchema(schema: string, targetDatabase: DatabaseProvider): Promise<string> {
    if (targetDatabase === 'byo') {
      // For BYO, just ensure proper env var usage
      return schema.replace(/url\s*=\s*"[^"]*"/, 'url = env("DATABASE_URL")');
    }

    // Use AI to intelligently transform the schema while preserving models
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: TRANSFORM_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Transform this Prisma schema for ${targetDatabase} deployment.

Original schema:
\`\`\`prisma
${schema}
\`\`\`

${
  targetDatabase === 'turso'
    ? `
Use this generator/datasource configuration:
${PRISMA_TURSO_TEMPLATE}

Keep all the model definitions exactly as they are. Only change the generator and datasource blocks.
`
    : `
Use this generator/datasource configuration:
${PRISMA_NEON_TEMPLATE}

Keep all the model definitions exactly as they are. Only change the generator and datasource blocks.
`
}

Respond with ONLY the transformed Prisma schema, no explanation.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract schema from response (might be wrapped in code blocks)
    const schemaMatch = responseText.match(/```(?:prisma)?\s*([\s\S]*?)```/);
    if (schemaMatch) {
      return schemaMatch[1].trim();
    }

    // If no code blocks, return the whole response trimmed
    return responseText.trim();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Transform a single file
   */
  private async transformFile(
    file: AppFile,
    targetDatabase: DatabaseProvider,
    targetHosting: HostingProvider
  ): Promise<{ file: AppFile; changed: boolean; description: string }> {
    // Handle Prisma schema specially
    if (file.path.endsWith('schema.prisma')) {
      const transformed = await this.transformPrismaSchema(file.content, targetDatabase);
      return {
        file: { ...file, content: transformed },
        changed: transformed !== file.content,
        description: `Updated Prisma schema for ${targetDatabase}`,
      };
    }

    // Handle database client files
    if (this.isDatabaseClientFile(file)) {
      const transformed = this.transformDatabaseClient(file, targetDatabase);
      return {
        file: transformed,
        changed: transformed.content !== file.content,
        description: `Updated database client for ${targetDatabase}`,
      };
    }

    // Handle API routes for edge runtime
    if (this.isApiRoute(file) && targetHosting === 'cloudflare') {
      const transformed = this.addEdgeRuntime(file);
      return {
        file: transformed,
        changed: transformed.content !== file.content,
        description: 'Added edge runtime configuration',
      };
    }

    // No transformation needed
    return {
      file,
      changed: false,
      description: 'No changes needed',
    };
  }

  /**
   * Check if file is a database client file
   */
  private isDatabaseClientFile(file: AppFile): boolean {
    const dbPatterns = [
      'prisma.ts',
      'prisma.js',
      'db.ts',
      'db.js',
      'database.ts',
      'database.js',
      'lib/prisma',
      'lib/db',
    ];
    return dbPatterns.some((pattern) => file.path.includes(pattern));
  }

  /**
   * Check if file is an API route
   */
  private isApiRoute(file: AppFile): boolean {
    return (
      file.path.includes('/api/') &&
      (file.path.endsWith('route.ts') || file.path.endsWith('route.js'))
    );
  }

  /**
   * Transform database client for production
   */
  private transformDatabaseClient(file: AppFile, targetDatabase: DatabaseProvider): AppFile {
    let content = file.content;

    if (targetDatabase === 'turso') {
      // Add Turso adapter import and setup
      const tursoSetup = `import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

export { prisma };
`;
      // Replace simple PrismaClient instantiation
      if (content.includes('new PrismaClient()')) {
        content = tursoSetup;
      }
    } else if (targetDatabase === 'neon') {
      // Add Neon adapter import and setup
      const neonSetup = `import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
`;
      if (content.includes('new PrismaClient()')) {
        content = neonSetup;
      }
    }

    return { ...file, content };
  }

  /**
   * Add edge runtime to API route
   */
  private addEdgeRuntime(file: AppFile): AppFile {
    let content = file.content;

    // Check if edge runtime is already configured
    if (content.includes("runtime = 'edge'")) {
      return file;
    }

    // Add edge runtime export at the top of the file
    const edgeExport = "export const runtime = 'edge';\n\n";

    // Find the first import or export statement
    const firstStatement = content.match(/^(import|export)/m);
    if (firstStatement && firstStatement.index !== undefined) {
      content =
        content.slice(0, firstStatement.index) + edgeExport + content.slice(firstStatement.index);
    } else {
      content = edgeExport + content;
    }

    return { ...file, content };
  }

  /**
   * Get additional files needed for deployment
   */
  private getAdditionalFiles(
    existingFiles: AppFile[],
    targetDatabase: DatabaseProvider,
    targetHosting: HostingProvider
  ): AppFile[] {
    const additionalFiles: AppFile[] = [];

    // Add .env.example with required variables
    const envExample = this.generateEnvExample(targetDatabase, targetHosting);
    additionalFiles.push({
      path: '.env.example',
      content: envExample,
      language: 'text',
    });

    // Add Cloudflare-specific files
    if (targetHosting === 'cloudflare') {
      // Check if wrangler.toml exists
      const hasWrangler = existingFiles.some((f) => f.path.includes('wrangler.toml'));
      if (!hasWrangler) {
        additionalFiles.push({
          path: 'wrangler.toml',
          content: this.generateWranglerConfig(),
          language: 'toml',
        });
      }
    }

    return additionalFiles;
  }

  /**
   * Generate .env.example content
   */
  private generateEnvExample(
    targetDatabase: DatabaseProvider,
    targetHosting: HostingProvider
  ): string {
    let content = '# Environment Variables\n\n';

    if (targetDatabase === 'turso') {
      content += '# Turso Database\n';
      content += 'TURSO_DATABASE_URL=libsql://your-database.turso.io\n';
      content += 'TURSO_AUTH_TOKEN=your-auth-token\n\n';
    } else if (targetDatabase === 'neon') {
      content += '# Neon Database\n';
      content += 'DATABASE_URL=postgresql://user:pass@host/db?sslmode=require\n';
      content += 'DIRECT_URL=postgresql://user:pass@host/db?sslmode=require\n\n';
    } else {
      content += '# Database\n';
      content += 'DATABASE_URL=your-database-url\n\n';
    }

    if (targetHosting === 'cloudflare') {
      content += '# Cloudflare\n';
      content += '# Set via wrangler secret\n\n';
    }

    content += '# Application\n';
    content += 'NEXT_PUBLIC_APP_URL=https://your-app.com\n';

    return content;
  }

  /**
   * Generate wrangler.toml for Cloudflare Pages
   */
  private generateWranglerConfig(): string {
    return `# Cloudflare Pages Configuration
name = "my-app"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
NEXT_PUBLIC_APP_URL = "https://my-app.pages.dev"

# Secrets should be set via: wrangler secret put SECRET_NAME
# - TURSO_DATABASE_URL
# - TURSO_AUTH_TOKEN
`;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new CodeTransformAgent instance
 */
export function createCodeTransformAgent(apiKey?: string): CodeTransformAgent {
  return new CodeTransformAgent(apiKey);
}
