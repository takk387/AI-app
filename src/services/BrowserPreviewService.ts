'use client';

// Use esbuild types (compatible with esbuild-wasm)
// At runtime, we dynamically import esbuild-wasm
import type * as esbuildTypes from 'esbuild';
import type { AppFile } from '@/types/railway';
import { logger } from '@/utils/logger';
import { getInBrowserDatabaseService } from './InBrowserDatabaseService';
import { getApiMockService } from './ApiMockService';

// Runtime module reference (loaded dynamically)
let esbuild: typeof esbuildTypes | null = null;

const log = logger.child({ route: 'browser-preview-service' });

// ============================================================================
// TYPES
// ============================================================================

export interface BrowserPreviewResult {
  html: string;
  errors: string[];
  warnings: string[];
  hasDatabase?: boolean;
  hasApiRoutes?: boolean;
}

export interface BundleOptions {
  entryPoint?: string;
  target?: string[];
  minify?: boolean;
  /** Enable in-browser SQLite database (sql.js) */
  enableDatabase?: boolean;
  /** Enable API route mocking via fetch interception */
  enableApiMocking?: boolean;
}

// ============================================================================
// BROWSER PREVIEW SERVICE
// ============================================================================

/**
 * Service for in-browser bundling using esbuild-wasm.
 * Provides instant preview for frontend-only apps without server deployment.
 */
class BrowserPreviewService {
  private static instance: BrowserPreviewService | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): BrowserPreviewService {
    if (!BrowserPreviewService.instance) {
      BrowserPreviewService.instance = new BrowserPreviewService();
    }
    return BrowserPreviewService.instance;
  }

  /**
   * Initialize esbuild-wasm (lazy, only when needed)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        log.info('Initializing esbuild-wasm...');
        // Dynamic import for browser compatibility
        const esbuildModule = await import('esbuild-wasm');
        await esbuildModule.initialize({
          wasmURL: 'https://unpkg.com/esbuild-wasm@0.24.2/esbuild.wasm',
        });
        esbuild = esbuildModule;
        this.initialized = true;
        log.info('esbuild-wasm initialized successfully');
      } catch (error) {
        log.error('Failed to initialize esbuild-wasm', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Bundle files for browser preview
   */
  async bundle(files: AppFile[], options: BundleOptions = {}): Promise<BrowserPreviewResult> {
    await this.initialize();

    if (!esbuild) {
      return {
        html: '',
        errors: ['esbuild-wasm failed to initialize'],
        warnings: [],
      };
    }

    const {
      entryPoint: providedEntryPoint,
      target = ['es2020'],
      minify = false,
      enableDatabase = true,
      enableApiMocking = true,
    } = options;

    // Initialize database and API mocking if enabled
    let hasDatabase = false;
    let hasApiRoutes = false;

    if (enableDatabase) {
      try {
        const dbService = getInBrowserDatabaseService();
        hasDatabase = await dbService.initializeFromFiles(files);
        if (hasDatabase) {
          log.info('In-browser database initialized from Prisma schema');
        }
      } catch (error) {
        log.warn('Failed to initialize in-browser database', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (enableApiMocking) {
      try {
        const apiService = getApiMockService();
        const routeCount = apiService.initializeFromFiles(files);
        hasApiRoutes = routeCount > 0;
        if (hasApiRoutes) {
          log.info(`Initialized ${routeCount} mock API routes`);
        }
      } catch (error) {
        log.warn('Failed to initialize API mocking', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Create virtual file system for esbuild
    const virtualFs: Record<string, string> = {};
    for (const file of files) {
      // Normalize path
      const normalizedPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      virtualFs[normalizedPath] = file.content;
    }

    // Auto-detect entry point if not provided or not found
    const entryPoint = this.findEntryPoint(files, virtualFs, providedEntryPoint);

    if (!entryPoint) {
      const fileList = files.map((f) => f.path).join(', ');
      return {
        html: '',
        errors: [
          `No valid entry point found. Looked for: app/page.tsx, pages/index.tsx, src/App.tsx, App.tsx, index.tsx, main.tsx. Available files: ${fileList}`,
        ],
        warnings: [],
      };
    }

    log.info('Using entry point', { entryPoint });

    try {
      const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        format: 'esm',
        target,
        minify,
        write: false,
        plugins: [this.createVirtualFsPlugin(virtualFs)],
        loader: {
          '.tsx': 'tsx',
          '.ts': 'ts',
          '.jsx': 'jsx',
          '.js': 'js',
          '.css': 'css',
          '.json': 'json',
          '.svg': 'text',
          '.png': 'dataurl',
          '.jpg': 'dataurl',
          '.jpeg': 'dataurl',
          '.gif': 'dataurl',
          '.webp': 'dataurl',
        },
        define: {
          'process.env.NODE_ENV': '"development"',
        },
        jsx: 'automatic',
        jsxImportSource: 'react',
      });

      // Get bundled code
      const bundledCode = result.outputFiles?.[0]?.text || '';

      // Generate HTML wrapper with API mocking injection
      const html = this.generateHtml(bundledCode, files, {
        hasDatabase,
        hasApiRoutes,
      });

      return {
        html,
        errors: result.errors.map((e: esbuildTypes.Message) => e.text),
        warnings: result.warnings.map((w: esbuildTypes.Message) => w.text),
        hasDatabase,
        hasApiRoutes,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Bundle failed', error);
      return {
        html: '',
        errors: [message],
        warnings: [],
      };
    }
  }

  /**
   * Create a virtual file system plugin for esbuild
   */
  private createVirtualFsPlugin(virtualFs: Record<string, string>): esbuildTypes.Plugin {
    return {
      name: 'virtual-fs',
      setup(build: esbuildTypes.PluginBuild) {
        // Handle virtual files
        build.onResolve({ filter: /.*/ }, (args: esbuildTypes.OnResolveArgs) => {
          // Handle bare imports (npm packages)
          if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
            // External packages loaded from CDN
            return {
              path: `https://esm.sh/${args.path}`,
              external: true,
            };
          }

          // Resolve relative paths
          let resolvedPath = args.path;
          if (args.path.startsWith('./') || args.path.startsWith('../')) {
            const dir = args.importer ? args.importer.replace(/\/[^/]+$/, '') : '';
            resolvedPath = resolvePath(dir, args.path);
          }

          // Remove leading slash
          resolvedPath = resolvedPath.startsWith('/') ? resolvedPath.slice(1) : resolvedPath;

          // Try to resolve with extensions
          const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '.json', '.css'];
          for (const ext of extensions) {
            const fullPath = resolvedPath + ext;
            if (virtualFs[fullPath]) {
              return { path: fullPath, namespace: 'virtual' };
            }
            // Try index files
            const indexPath = `${resolvedPath}/index${ext}`;
            if (virtualFs[indexPath]) {
              return { path: indexPath, namespace: 'virtual' };
            }
          }

          return { path: resolvedPath, namespace: 'virtual' };
        });

        // Load virtual files
        build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args: esbuildTypes.OnLoadArgs) => {
          const content = virtualFs[args.path];
          if (content === undefined) {
            return { errors: [{ text: `File not found: ${args.path}` }] };
          }

          const ext = args.path.split('.').pop() || '';
          const loader = getLoader(ext);

          return { contents: content, loader };
        });
      },
    };
  }

  /**
   * Find the best entry point from available files
   * Supports Next.js (App Router & Pages Router), Create React App, Vite, and simple React projects
   */
  private findEntryPoint(
    files: AppFile[],
    virtualFs: Record<string, string>,
    providedEntryPoint?: string
  ): string | null {
    // Helper to find matching file
    const findFile = (pattern: string): string | null => {
      const normalized = pattern.startsWith('/') ? pattern.slice(1) : pattern;
      if (virtualFs[normalized]) return normalized;

      // Try with leading slash removed from files
      for (const file of files) {
        const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
        if (filePath === normalized || filePath.endsWith(`/${normalized}`)) {
          return filePath;
        }
      }
      return null;
    };

    // If provided entry point exists, use it
    if (providedEntryPoint) {
      const found = findFile(providedEntryPoint);
      if (found) return found;
    }

    // Common entry points in order of priority
    const entryPointCandidates = [
      // Next.js App Router
      'app/page.tsx',
      'app/page.jsx',
      'src/app/page.tsx',
      'src/app/page.jsx',
      // Next.js Pages Router
      'pages/index.tsx',
      'pages/index.jsx',
      'src/pages/index.tsx',
      'src/pages/index.jsx',
      // Create React App / Standard React
      'src/App.tsx',
      'src/App.jsx',
      'src/App.ts',
      'src/App.js',
      'App.tsx',
      'App.jsx',
      'App.ts',
      'App.js',
      // Vite style
      'src/main.tsx',
      'src/main.jsx',
      'src/main.ts',
      'src/main.js',
      'main.tsx',
      'main.jsx',
      // Generic index
      'src/index.tsx',
      'src/index.jsx',
      'src/index.ts',
      'src/index.js',
      'index.tsx',
      'index.jsx',
      'index.ts',
      'index.js',
    ];

    for (const candidate of entryPointCandidates) {
      const found = findFile(candidate);
      if (found) {
        return found;
      }
    }

    // Last resort: find any .tsx or .jsx file that looks like a main component
    const mainComponentFile = files.find((f) => {
      const content = f.content;
      const path = f.path.toLowerCase();
      // Look for files that export a default function/component
      const hasDefaultExport = /export\s+default\s+(function|class|const)/.test(content);
      const isReactComponent =
        /import\s+.*React/.test(content) || /from\s+['"]react['"]/.test(content);
      const isNotApiRoute = !path.includes('/api/');
      const isNotTest = !path.includes('.test.') && !path.includes('.spec.');
      return hasDefaultExport && isReactComponent && isNotApiRoute && isNotTest;
    });

    if (mainComponentFile) {
      const normalized = mainComponentFile.path.startsWith('/')
        ? mainComponentFile.path.slice(1)
        : mainComponentFile.path;
      return normalized;
    }

    return null;
  }

  /**
   * Generate HTML wrapper for the bundled code
   */
  private generateHtml(
    bundledCode: string,
    files: AppFile[],
    options: { hasDatabase: boolean; hasApiRoutes: boolean } = {
      hasDatabase: false,
      hasApiRoutes: false,
    }
  ): string {
    // Find CSS files
    const cssFiles = files.filter((f) => f.path.endsWith('.css'));
    const cssContent = cssFiles.map((f) => f.content).join('\n');

    // Check for Tailwind usage
    const hasTailwind = files.some(
      (f) => f.content.includes('tailwindcss') || f.content.includes('@tailwind')
    );

    // Generate fetch interception script for API mocking
    const fetchInterceptionScript = options.hasApiRoutes
      ? this.generateFetchInterceptionScript(files)
      : '';

    // Generate database initialization script
    const databaseScript = options.hasDatabase ? this.generateDatabaseScript(files) : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  ${hasTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  ${databaseScript}
  ${fetchInterceptionScript}
  <script type="module">
    import React from 'https://esm.sh/react@18';
    import ReactDOM from 'https://esm.sh/react-dom@18/client';

    // Make React available globally for the bundle
    window.React = React;

    ${bundledCode}

    // Find and render the default export
    const App = typeof module !== 'undefined' ? module.exports?.default : null;
    if (App && document.getElementById('root')) {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    }
  </script>
</body>
</html>`;
  }

  /**
   * Generate fetch interception script for API mocking
   */
  private generateFetchInterceptionScript(files: AppFile[]): string {
    // Find all API route files and extract their handlers
    const apiRoutes = files.filter(
      (f) =>
        f.path.includes('/api/') &&
        (f.path.endsWith('route.ts') ||
          f.path.endsWith('route.tsx') ||
          f.path.endsWith('.ts') ||
          f.path.endsWith('.tsx'))
    );

    if (apiRoutes.length === 0) return '';

    // Build route handlers map
    const routeHandlers: Record<string, string> = {};
    for (const route of apiRoutes) {
      // Extract route path from file path
      // e.g., "app/api/users/route.ts" -> "/api/users"
      const routePath = this.extractApiRoutePath(route.path);
      if (routePath) {
        routeHandlers[routePath] = route.content;
      }
    }

    return `
  <script>
    // API Route Mocking - Intercept fetch calls to /api/*
    (function() {
      const originalFetch = window.fetch;
      const mockRoutes = ${JSON.stringify(Object.keys(routeHandlers))};

      // Simple in-memory database for mock data
      window.__mockDb = window.__mockDb || {
        data: {},
        get(collection) { return this.data[collection] || []; },
        set(collection, items) { this.data[collection] = items; },
        add(collection, item) {
          if (!this.data[collection]) this.data[collection] = [];
          item.id = item.id || crypto.randomUUID();
          item.createdAt = item.createdAt || new Date().toISOString();
          this.data[collection].push(item);
          return item;
        },
        update(collection, id, updates) {
          const items = this.data[collection] || [];
          const index = items.findIndex(i => i.id === id);
          if (index >= 0) {
            items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
            return items[index];
          }
          return null;
        },
        delete(collection, id) {
          const items = this.data[collection] || [];
          const index = items.findIndex(i => i.id === id);
          if (index >= 0) {
            return items.splice(index, 1)[0];
          }
          return null;
        },
        find(collection, id) {
          return (this.data[collection] || []).find(i => i.id === id);
        }
      };

      window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : input.url;

        // Only intercept /api/* routes
        if (!url.startsWith('/api/')) {
          return originalFetch.apply(this, arguments);
        }

        const method = (init?.method || 'GET').toUpperCase();
        const urlObj = new URL(url, window.location.origin);
        const pathname = urlObj.pathname;

        // Extract collection name from path (e.g., /api/users -> users)
        const pathParts = pathname.split('/').filter(Boolean);
        const collection = pathParts[1] || 'items';
        const itemId = pathParts[2];

        console.log('[Mock API]', method, pathname);

        try {
          let body = null;
          if (init?.body) {
            try {
              body = JSON.parse(init.body);
            } catch { body = init.body; }
          }

          let responseData;
          let status = 200;

          switch (method) {
            case 'GET':
              if (itemId) {
                responseData = window.__mockDb.find(collection, itemId);
                if (!responseData) status = 404;
              } else {
                responseData = window.__mockDb.get(collection);
              }
              break;
            case 'POST':
              responseData = window.__mockDb.add(collection, body || {});
              status = 201;
              break;
            case 'PUT':
            case 'PATCH':
              if (itemId) {
                responseData = window.__mockDb.update(collection, itemId, body || {});
                if (!responseData) status = 404;
              } else {
                status = 400;
                responseData = { error: 'Item ID required for update' };
              }
              break;
            case 'DELETE':
              if (itemId) {
                responseData = window.__mockDb.delete(collection, itemId);
                if (!responseData) status = 404;
              } else {
                status = 400;
                responseData = { error: 'Item ID required for delete' };
              }
              break;
            default:
              responseData = { error: 'Method not supported' };
              status = 405;
          }

          return new Response(JSON.stringify(responseData || { error: 'Not found' }), {
            status,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('[Mock API Error]', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };

      console.log('[Mock API] Initialized with routes:', mockRoutes);
    })();
  </script>`;
  }

  /**
   * Generate database initialization script
   */
  private generateDatabaseScript(files: AppFile[]): string {
    // Find Prisma schema to extract model structure
    const prismaFile = files.find(
      (f) => f.path.includes('schema.prisma') || f.path.endsWith('.prisma')
    );

    if (!prismaFile) return '';

    // Extract models from Prisma schema for seeding
    const models = this.extractPrismaModels(prismaFile.content);

    return `
  <script>
    // Initialize mock database with Prisma schema models
    (function() {
      const models = ${JSON.stringify(models)};

      // Pre-populate collections based on Prisma models
      models.forEach(model => {
        if (!window.__mockDb) window.__mockDb = { data: {} };
        if (!window.__mockDb.data[model.toLowerCase()]) {
          window.__mockDb.data[model.toLowerCase()] = [];
        }
      });

      console.log('[Mock DB] Initialized collections:', models.map(m => m.toLowerCase()));
    })();
  </script>`;
  }

  /**
   * Extract API route path from file path
   */
  private extractApiRoutePath(filePath: string): string | null {
    // Normalize path separators
    const normalized = filePath.replace(/\\/g, '/');

    // Match patterns like "app/api/users/route.ts" or "pages/api/users.ts"
    const appRouterMatch = normalized.match(/app\/api\/(.+?)\/route\.(ts|tsx|js|jsx)$/);
    if (appRouterMatch) {
      return `/api/${appRouterMatch[1]}`;
    }

    const pagesApiMatch = normalized.match(/pages\/api\/(.+?)\.(ts|tsx|js|jsx)$/);
    if (pagesApiMatch) {
      return `/api/${pagesApiMatch[1]}`;
    }

    // Simple api folder match
    const simpleMatch = normalized.match(/api\/(.+?)\.(ts|tsx|js|jsx)$/);
    if (simpleMatch) {
      const routeName = simpleMatch[1].replace(/\/route$/, '');
      return `/api/${routeName}`;
    }

    return null;
  }

  /**
   * Extract model names from Prisma schema
   */
  private extractPrismaModels(schema: string): string[] {
    const models: string[] = [];
    const modelRegex = /model\s+(\w+)\s*\{/g;
    let match;
    while ((match = modelRegex.exec(schema)) !== null) {
      models.push(match[1]);
    }
    return models;
  }

  /**
   * Check if esbuild is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve relative path
 */
function resolvePath(base: string, relative: string): string {
  const stack = base.split('/').filter(Boolean);
  const parts = relative.split('/');

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Get esbuild loader for file extension
 */
function getLoader(ext: string): esbuildTypes.Loader {
  const loaders: Record<string, esbuildTypes.Loader> = {
    tsx: 'tsx',
    ts: 'ts',
    jsx: 'jsx',
    js: 'js',
    css: 'css',
    json: 'json',
    svg: 'text',
    png: 'dataurl',
    jpg: 'dataurl',
    jpeg: 'dataurl',
    gif: 'dataurl',
    webp: 'dataurl',
  };
  return loaders[ext] || 'text';
}

// Export singleton getter
export function getBrowserPreviewService(): BrowserPreviewService {
  return BrowserPreviewService.getInstance();
}

export default BrowserPreviewService;
