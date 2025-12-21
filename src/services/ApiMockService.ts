'use client';

import type { AppFile } from '@/types/railway';
import { logger } from '@/utils/logger';
import { getInBrowserDatabaseService } from './InBrowserDatabaseService';

const log = logger.child({ route: 'api-mock-service' });

// ============================================================================
// TYPES
// ============================================================================

export interface MockApiRoute {
  path: string; // e.g., '/api/users' or '/api/users/[id]'
  methods: string[]; // e.g., ['GET', 'POST']
  handler: string; // The route handler code
}

export interface MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

/** Mock Prisma model operations */
export interface MockPrismaModel {
  findMany: (args?: { where?: Record<string, unknown> }) => Promise<Record<string, unknown>[]>;
  findUnique: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
  create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  update: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
  delete: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown>>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
}

// ============================================================================
// API MOCK SERVICE
// ============================================================================

/**
 * Service for mocking API routes in browser preview.
 * Parses API route files and executes them when fetch is intercepted.
 */
class ApiMockService {
  private static instance: ApiMockService | null = null;
  private routes: Map<string, MockApiRoute> = new Map();
  private initialized = false;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): ApiMockService {
    if (!ApiMockService.instance) {
      ApiMockService.instance = new ApiMockService();
    }
    return ApiMockService.instance;
  }

  /**
   * Initialize routes from app files
   * @returns The number of routes registered
   */
  initializeFromFiles(files: AppFile[]): number {
    this.routes.clear();

    // Find API route files
    const apiFiles = files.filter(
      (f) =>
        (f.path.includes('/api/') || f.path.startsWith('api/')) &&
        (f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js'))
    );

    for (const file of apiFiles) {
      const route = this.parseApiRoute(file);
      if (route) {
        this.routes.set(route.path, route);
        log.debug('Registered mock API route', { path: route.path, methods: route.methods });
      }
    }

    this.initialized = true;
    log.info('API mock service initialized', { routeCount: this.routes.size });
    return this.routes.size;
  }

  /**
   * Parse an API route file to extract route info
   */
  private parseApiRoute(file: AppFile): MockApiRoute | null {
    // Convert file path to API route path
    // e.g., 'app/api/users/route.ts' -> '/api/users'
    // e.g., 'pages/api/users.ts' -> '/api/users'
    // e.g., 'api/users/[id]/route.ts' -> '/api/users/[id]'

    let routePath = file.path;

    // Remove file extension
    routePath = routePath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Remove 'route' suffix (Next.js app router)
    routePath = routePath.replace(/\/route$/, '');

    // Handle pages/api pattern
    routePath = routePath.replace(/^pages\//, '/');

    // Handle app/api pattern
    routePath = routePath.replace(/^app\//, '/');

    // Ensure leading slash
    if (!routePath.startsWith('/')) {
      routePath = '/' + routePath;
    }

    // Detect HTTP methods from exports
    const methods: string[] = [];
    const methodPatterns = [
      /export\s+(async\s+)?function\s+GET/,
      /export\s+(async\s+)?function\s+POST/,
      /export\s+(async\s+)?function\s+PUT/,
      /export\s+(async\s+)?function\s+PATCH/,
      /export\s+(async\s+)?function\s+DELETE/,
      /export\s+const\s+GET\s*=/,
      /export\s+const\s+POST\s*=/,
      /export\s+const\s+PUT\s*=/,
      /export\s+const\s+PATCH\s*=/,
      /export\s+const\s+DELETE\s*=/,
    ];

    for (const pattern of methodPatterns) {
      if (pattern.test(file.content)) {
        const match = pattern.toString().match(/(GET|POST|PUT|PATCH|DELETE)/);
        if (match && !methods.includes(match[1])) {
          methods.push(match[1]);
        }
      }
    }

    // If no specific methods found, assume GET
    if (methods.length === 0) {
      // Check for default export (pages/api style)
      if (/export\s+default/.test(file.content)) {
        methods.push('GET', 'POST', 'PUT', 'DELETE');
      } else {
        return null;
      }
    }

    return {
      path: routePath,
      methods,
      handler: file.content,
    };
  }

  /**
   * Check if a URL matches a route pattern
   */
  private matchRoute(
    url: string,
    routePath: string
  ): { matches: boolean; params: Record<string, string> } {
    const params: Record<string, string> = {};

    // Split paths into segments
    const urlParts = url.split('/').filter(Boolean);
    const routeParts = routePath.split('/').filter(Boolean);

    if (urlParts.length !== routeParts.length) {
      return { matches: false, params };
    }

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const urlPart = urlParts[i];

      // Check for dynamic segment [param]
      const dynamicMatch = routePart.match(/^\[(\w+)\]$/);
      if (dynamicMatch) {
        params[dynamicMatch[1]] = urlPart;
      } else if (routePart !== urlPart) {
        return { matches: false, params };
      }
    }

    return { matches: true, params };
  }

  /**
   * Handle a mock API request
   */
  async handleRequest(request: MockRequest): Promise<MockResponse> {
    // Parse URL
    const urlObj = new URL(request.url, 'http://localhost');
    const pathname = urlObj.pathname;
    const query: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Find matching route
    let matchedRoute: MockApiRoute | null = null;
    let params: Record<string, string> = {};

    for (const [routePath, route] of this.routes) {
      const result = this.matchRoute(pathname, routePath);
      if (result.matches && route.methods.includes(request.method)) {
        matchedRoute = route;
        params = result.params;
        break;
      }
    }

    if (!matchedRoute) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'API route not found' },
      };
    }

    // Execute the route handler
    try {
      const response = await this.executeHandler(matchedRoute, {
        ...request,
        params,
        query,
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('API handler error', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: message },
      };
    }
  }

  /**
   * Execute a route handler in a sandboxed environment
   */
  private async executeHandler(route: MockApiRoute, request: MockRequest): Promise<MockResponse> {
    // Create a mock NextRequest-like object
    const mockReq = {
      method: request.method,
      url: request.url,
      headers: new Map(Object.entries(request.headers)),
      json: async () => request.body,
      text: async () => JSON.stringify(request.body),
      nextUrl: {
        pathname: new URL(request.url, 'http://localhost').pathname,
        searchParams: new URLSearchParams(request.query),
      },
    };

    // Create a response builder
    let responseStatus = 200;
    let responseHeaders: Record<string, string> = {};
    let responseBody: unknown = null;

    // Mock NextResponse object for future use
    const _mockNextResponse = {
      json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
        responseBody = body;
        responseStatus = init?.status || 200;
        responseHeaders = { 'Content-Type': 'application/json', ...init?.headers };
        return { status: responseStatus, headers: responseHeaders, body: responseBody };
      },
      error: () => {
        responseStatus = 500;
        responseBody = { error: 'Internal Server Error' };
        return { status: 500 };
      },
    };

    // Get database service for handlers that need it
    const db = getInBrowserDatabaseService();

    // Create a simplified prisma-like client
    const mockPrisma = this.createMockPrismaClient(db);

    // Execute handler based on method
    try {
      // This is a simplified execution - in reality we'd need proper sandboxing
      // For now, we'll handle common patterns

      const handler = route.handler;
      const method = request.method;

      // Try to extract and simulate the handler logic
      const response = await this.simulateHandler(handler, method, mockReq, mockPrisma);

      return {
        status: response.status || 200,
        headers: response.headers || { 'Content-Type': 'application/json' },
        body: response.body,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: `Handler execution failed: ${message}` },
      };
    }
  }

  /**
   * Create a mock Prisma client that uses sql.js
   */
  private createMockPrismaClient(
    db: ReturnType<typeof getInBrowserDatabaseService>
  ): Record<string, MockPrismaModel> {
    // This creates a proxy that intercepts Prisma-like calls
    // and converts them to SQL queries

    const createModelProxy = (modelName: string) => {
      return {
        findMany: async (args?: { where?: Record<string, unknown> }) => {
          let sql = `SELECT * FROM ${modelName}`;
          if (args?.where) {
            const conditions = Object.entries(args.where)
              .map(([key, value]) => `${key} = '${value}'`)
              .join(' AND ');
            sql += ` WHERE ${conditions}`;
          }
          const result = await db.query(sql);
          if (result.success && result.data && result.data.length > 0) {
            const queryData = result.data[0];
            return queryData.values.map((row) => {
              const obj: Record<string, unknown> = {};
              queryData.columns.forEach((col, i) => {
                obj[col] = row[i];
              });
              return obj;
            });
          }
          return [];
        },

        findUnique: async (args: { where: Record<string, unknown> }) => {
          const conditions = Object.entries(args.where)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(' AND ');
          const sql = `SELECT * FROM ${modelName} WHERE ${conditions} LIMIT 1`;
          const result = await db.query(sql);
          if (
            result.success &&
            result.data &&
            result.data.length > 0 &&
            result.data[0].values.length > 0
          ) {
            const queryData = result.data[0];
            const obj: Record<string, unknown> = {};
            queryData.columns.forEach((col, i) => {
              obj[col] = queryData.values[0][i];
            });
            return obj;
          }
          return null;
        },

        create: async (args: { data: Record<string, unknown> }) => {
          const columns = Object.keys(args.data).join(', ');
          const values = Object.values(args.data)
            .map((v) => (typeof v === 'string' ? `'${v}'` : v))
            .join(', ');
          const sql = `INSERT INTO ${modelName} (${columns}) VALUES (${values})`;
          await db.query(sql);
          return args.data;
        },

        update: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          const setClause = Object.entries(args.data)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(', ');
          const whereClause = Object.entries(args.where)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(' AND ');
          const sql = `UPDATE ${modelName} SET ${setClause} WHERE ${whereClause}`;
          await db.query(sql);
          return { ...args.where, ...args.data };
        },

        delete: async (args: { where: Record<string, unknown> }) => {
          const whereClause = Object.entries(args.where)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(' AND ');
          const sql = `DELETE FROM ${modelName} WHERE ${whereClause}`;
          await db.query(sql);
          return args.where;
        },

        count: async (args?: { where?: Record<string, unknown> }) => {
          let sql = `SELECT COUNT(*) as count FROM ${modelName}`;
          if (args?.where) {
            const conditions = Object.entries(args.where)
              .map(([key, value]) => `${key} = '${value}'`)
              .join(' AND ');
            sql += ` WHERE ${conditions}`;
          }
          const result = await db.query(sql);
          if (result.success && result.data && result.data.length > 0) {
            return result.data[0].values[0][0] as number;
          }
          return 0;
        },
      };
    };

    // Return a proxy that creates model proxies on demand
    return new Proxy({} as Record<string, MockPrismaModel>, {
      get: (_target, prop: string) => {
        // Convert camelCase to table name (e.g., 'user' -> 'User')
        const tableName = prop.charAt(0).toUpperCase() + prop.slice(1);
        return createModelProxy(tableName);
      },
    });
  }

  /**
   * Simulate handler execution by pattern matching common patterns
   */
  private async simulateHandler(
    handlerCode: string,
    method: string,
    request: { json: () => Promise<unknown>; nextUrl: { searchParams: URLSearchParams } },
    prisma: Record<string, MockPrismaModel>
  ): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
    // This is a pattern-based simulation
    // It looks for common API patterns and simulates them

    // Extract model name from handler code
    const modelMatch = handlerCode.match(/prisma\.(\w+)\./);
    const modelName = modelMatch ? modelMatch[1] : null;

    if (!modelName) {
      // No Prisma usage detected, return empty success
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'OK' },
      };
    }

    const model = (prisma as Record<string, MockPrismaModel>)[modelName];

    try {
      switch (method) {
        case 'GET': {
          // Check for findUnique pattern (single item by ID)
          if (handlerCode.includes('findUnique') || handlerCode.includes('findFirst')) {
            const id = request.nextUrl.searchParams.get('id');
            if (id) {
              const item = await model.findUnique({ where: { id } });
              return {
                status: item ? 200 : 404,
                headers: { 'Content-Type': 'application/json' },
                body: item || { error: 'Not found' },
              };
            }
          }
          // Default to findMany
          const items = await model.findMany();
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: items,
          };
        }

        case 'POST': {
          const body = (await request.json()) as Record<string, unknown>;
          const created = await model.create({ data: body });
          return {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
            body: created,
          };
        }

        case 'PUT':
        case 'PATCH': {
          const body = (await request.json()) as Record<string, unknown>;
          const id = request.nextUrl.searchParams.get('id') || (body.id as string);
          if (!id) {
            return {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
              body: { error: 'ID required' },
            };
          }
          const { id: _, ...data } = body;
          const updated = await model.update({ where: { id }, data });
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: updated,
          };
        }

        case 'DELETE': {
          const id = request.nextUrl.searchParams.get('id');
          if (!id) {
            return {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
              body: { error: 'ID required' },
            };
          }
          await model.delete({ where: { id } });
          return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { success: true },
          };
        }

        default:
          return {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Method not allowed' },
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: message },
      };
    }
  }

  /**
   * Check if a URL should be intercepted
   */
  shouldIntercept(url: string): boolean {
    try {
      const urlObj = new URL(url, 'http://localhost');
      return urlObj.pathname.startsWith('/api/');
    } catch {
      return false;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get registered routes
   */
  getRoutes(): MockApiRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.routes.clear();
    this.initialized = false;
  }
}

// Export singleton getter
export function getApiMockService(): ApiMockService {
  return ApiMockService.getInstance();
}

export default ApiMockService;
