import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import path from 'path';
import { DeployRequestSchema, type RailwayDeployment, type AppFile } from '@/types/railway';

// ============================================================================
// CONSTANTS
// ============================================================================

// Maximum file size in bytes (5MB total)
const MAX_TOTAL_SIZE = 5 * 1024 * 1024;

// Railway GraphQL API endpoint
const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

// In-memory store for deployment tracking (in production, use Redis or DB)
// Maps deployment ID to deployment record with user ownership
const deployments = new Map<string, RailwayDeployment>();

// Module-level logger for Railway API helpers
import { logger } from '@/utils/logger';
const railwayLog = logger.child({ route: '/api/railway/deploy' });

// ============================================================================
// PATH SECURITY
// ============================================================================

/**
 * Safely normalize and validate a file path
 * Prevents path traversal attacks including URL-encoded and unicode bypasses
 */
function sanitizePath(inputPath: string): string | null {
  // Decode URL-encoded characters first
  let decoded: string;
  try {
    decoded = decodeURIComponent(inputPath);
  } catch {
    // Invalid URL encoding
    return null;
  }

  // Normalize unicode (e.g., ‥ TWO DOT LEADER → ..)
  decoded = decoded.normalize('NFKC');

  // Remove null bytes
  decoded = decoded.replace(/\0/g, '');

  // Normalize path separators
  decoded = decoded.replace(/\\/g, '/');

  // Check for path traversal BEFORE normalization
  if (decoded.includes('..') || decoded.includes('//')) {
    return null;
  }

  // Check for absolute paths
  if (decoded.startsWith('/') || /^[a-zA-Z]:/.test(decoded)) {
    // Strip leading slash for relative path
    decoded = decoded.replace(/^\/+/, '').replace(/^[a-zA-Z]:[\\/]/, '');
  }

  // Strip ./ prefix
  decoded = decoded.replace(/^\.\//, '');

  // Use path.normalize and verify it doesn't escape
  const normalized = path.posix.normalize(decoded);

  // After normalization, check again for traversal
  if (normalized.includes('..') || normalized.startsWith('/')) {
    return null;
  }

  // Validate path length
  if (normalized.length > 500) {
    return null;
  }

  return normalized;
}

// ============================================================================
// RAILWAY API HELPERS
// ============================================================================

async function railwayQuery(query: string, variables?: Record<string, unknown>) {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) {
    throw new Error('RAILWAY_API_TOKEN not configured');
  }

  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    railwayLog.error('Railway API error', undefined, { errors: result.errors });
    throw new Error(result.errors[0]?.message || 'Railway API error');
  }

  return result.data;
}

/**
 * Sanitize project name for Railway
 * Railway requires: lowercase, letters/numbers/hyphens only, 3-32 chars
 */
function sanitizeProjectName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
    .slice(0, 32); // Max 32 chars

  // Ensure minimum 3 chars
  if (sanitized.length < 3) {
    return `app-${sanitized || 'preview'}`.slice(0, 32);
  }

  return sanitized;
}

/**
 * Create a new Railway project
 */
async function createProject(name: string): Promise<{ id: string }> {
  const projectName = sanitizeProjectName(name);
  railwayLog.debug('Sanitized project name', { original: name, sanitized: projectName });

  const data = await railwayQuery(
    `mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        id
      }
    }`,
    {
      input: {
        name: projectName,
        description: 'AI App Builder preview deployment',
        isPublic: false,
      },
    }
  );

  return data.projectCreate;
}

/**
 * Get the default environment for a project
 */
async function getDefaultEnvironment(projectId: string): Promise<{ id: string }> {
  const data = await railwayQuery(
    `query GetEnvironments($projectId: String!) {
      project(id: $projectId) {
        environments {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    }`,
    { projectId }
  );

  const environments = data.project?.environments?.edges || [];
  const production = environments.find(
    (e: { node: { name: string } }) => e.node.name === 'production'
  );

  if (!production) {
    throw new Error('No production environment found');
  }

  return production.node;
}

/**
 * Create a service in the project
 */
async function createService(
  projectId: string,
  environmentId: string,
  name: string
): Promise<{ id: string }> {
  const data = await railwayQuery(
    `mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
      }
    }`,
    {
      input: {
        projectId,
        name,
      },
    }
  );

  return data.serviceCreate;
}

/**
 * Generate package.json content
 */
function generatePackageJson(appName: string, dependencies: Record<string, string>): string {
  const pkg = {
    name: appName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      start: 'vite preview --port $PORT --host',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      ...dependencies,
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.2.1',
      vite: '^5.0.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Generate vite.config.js content
 */
function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
  },
});
`;
}

/**
 * Generate index.html content
 */
function generateIndexHtml(appName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

/**
 * Generate main.tsx entry point
 */
function generateMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

/**
 * Build the file tree for Railway deployment
 */
function buildFileTree(
  files: AppFile[],
  appName: string,
  dependencies: Record<string, string>
): Record<string, string> {
  const tree: Record<string, string> = {};

  // Add package.json
  tree['package.json'] = generatePackageJson(appName, dependencies);

  // Add vite.config.js
  tree['vite.config.js'] = generateViteConfig();

  // Add index.html
  tree['index.html'] = generateIndexHtml(appName);

  // Process app files
  let hasMainTsx = false;
  let hasIndexCss = false;

  // Allowed file extensions (safe for web apps)
  const allowedExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.json',
    '.html',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ]);

  for (const file of files) {
    // Use secure path sanitization
    const safePath = sanitizePath(file.path);
    if (!safePath) {
      railwayLog.warn('Skipping file with invalid path', { path: file.path });
      continue;
    }

    let filePath = safePath;

    // Get file extension
    const lastDot = filePath.lastIndexOf('.');
    const ext = lastDot > 0 ? filePath.substring(lastDot).toLowerCase() : '';

    // Security: Only allow certain file extensions
    if (!ext || !allowedExtensions.has(ext)) {
      railwayLog.warn('Skipping file with disallowed extension', { path: filePath, ext });
      continue;
    }

    // Check for main entry point
    if (filePath === 'src/main.tsx' || filePath === 'main.tsx') {
      hasMainTsx = true;
    }
    if (filePath === 'src/index.css' || filePath === 'index.css') {
      hasIndexCss = true;
    }

    // Ensure src/ prefix for source files
    if (
      !filePath.startsWith('src/') &&
      !filePath.startsWith('public/') &&
      !['package.json', 'vite.config.js', 'index.html', 'tsconfig.json'].includes(filePath)
    ) {
      filePath = `src/${filePath}`;
    }

    tree[filePath] = file.content;
  }

  // Add main.tsx if not present
  if (!hasMainTsx) {
    tree['src/main.tsx'] = generateMainTsx();
  }

  // Add empty index.css if not present
  if (!hasIndexCss) {
    tree['src/index.css'] = '/* Add your styles here */\n';
  }

  // Add tsconfig.json
  tree['tsconfig.json'] = JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    },
    null,
    2
  );

  return tree;
}

/**
 * Deploy files to Railway service using the template deployment method
 */
async function deployToService(
  projectId: string,
  serviceId: string,
  environmentId: string,
  files: Record<string, string>
): Promise<{ deploymentId: string }> {
  // For Railway, we need to use their GitHub integration or template deployment
  // Since we're doing dynamic file uploads, we'll use the service variables
  // to store file contents and use a buildpack that extracts them

  // Alternative approach: Use Railway's volume and upload files there
  // For MVP, we'll create a deployment with inline environment variables

  // Set service variables with file contents (base64 encoded)
  const variables: Record<string, string> = {
    APP_FILES: Buffer.from(JSON.stringify(files)).toString('base64'),
    NODE_ENV: 'production',
  };

  // Update service variables
  await railwayQuery(
    `mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId,
        environmentId,
        serviceId,
        variables,
      },
    }
  );

  // Trigger a deployment using a Nixpacks build with custom start command
  // that extracts files from APP_FILES env var and runs the app
  const data = await railwayQuery(
    `mutation ServiceInstanceUpdate($serviceId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, input: $input) {
        id
      }
    }`,
    {
      serviceId,
      input: {
        source: {
          image: 'node:20-alpine',
        },
        startCommand: `
          echo "Extracting app files..." &&
          echo $APP_FILES | base64 -d > /tmp/files.json &&
          node -e "
            const fs = require('fs');
            const files = JSON.parse(fs.readFileSync('/tmp/files.json'));
            for (const [path, content] of Object.entries(files)) {
              const dir = path.split('/').slice(0, -1).join('/');
              if (dir) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(path, content);
            }
          " &&
          npm install &&
          npm run build &&
          npm start
        `
          .replace(/\s+/g, ' ')
          .trim(),
      },
    }
  );

  return { deploymentId: data.serviceInstanceUpdate?.id || serviceId };
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse and validate request body with Zod
    let body;
    try {
      const rawBody = await request.json();
      body = DeployRequestSchema.parse(rawBody);
    } catch (zodError) {
      const errorMessage = zodError instanceof Error ? zodError.message : 'Invalid request body';
      return NextResponse.json({ error: `Validation failed: ${errorMessage}` }, { status: 400 });
    }

    const { files, dependencies, appName } = body;

    // Calculate total size in bytes (not just character count)
    const totalSize = files.reduce((sum, f) => {
      // Use Buffer to get actual byte size (handles Unicode properly)
      return sum + Buffer.byteLength(f.content || '', 'utf8');
    }, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: `Total file size exceeds limit (${Math.round(MAX_TOTAL_SIZE / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }

    // Create Railway project
    const project = await createProject(appName);
    railwayLog.info('Created Railway project', { projectId: project.id });

    // Get default environment
    const environment = await getDefaultEnvironment(project.id);
    railwayLog.debug('Using environment', { environmentId: environment.id });

    // Create service
    const service = await createService(project.id, environment.id, 'app');
    railwayLog.debug('Created service', { serviceId: service.id });

    // Build file tree
    const fileTree = buildFileTree(files, appName, dependencies);

    // Deploy files
    const deployment = await deployToService(project.id, service.id, environment.id, fileTree);
    railwayLog.info('Started deployment', { deploymentId: deployment.deploymentId });

    // Create deployment record with user ownership
    const deploymentRecord: RailwayDeployment = {
      id: deployment.deploymentId,
      projectId: project.id,
      serviceId: service.id,
      userId: user.id, // Track ownership for authorization
      status: 'building',
      previewUrl: null,
      buildLogs: ['Deployment started...'],
      createdAt: new Date().toISOString(),
    };

    // Store for status polling
    deployments.set(deployment.deploymentId, deploymentRecord);

    // Return deployment info (exclude userId from response)
    const { userId: _userId, ...publicDeployment } = deploymentRecord;
    return NextResponse.json(publicDeployment);
  } catch (error) {
    railwayLog.error('Railway deploy error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    );
  }
}

// Export deployments map for status route
export { deployments, railwayQuery };
