/**
 * Architecture to Phase Context Bridge
 *
 * Converts FinalValidatedArchitecture (from Dual AI Planning) into
 * ArchitectureSpec format that DynamicPhaseGenerator already expects.
 *
 * This bridge allows the dual AI architecture planning output to
 * seamlessly integrate with the existing phase generation pipeline
 * without modifying DynamicPhaseGenerator's interface.
 */

import type { FinalValidatedArchitecture } from '@/types/dualPlanning';
import type {
  ArchitectureSpec,
  DatabaseArchitecture as ArchSpecDatabase,
  APIArchitecture as ArchSpecAPI,
  AuthArchitecture as ArchSpecAuth,
  RealtimeArchitecture as ArchSpecRealtime,
  BackendPhaseSpec,
  TableDefinition,
  FieldDefinition,
  RelationDefinition,
  APIRouteSpec,
} from '@/types/architectureSpec';
import type { FeatureDomain } from '@/types/dynamicPhases';

/**
 * Convert a FinalValidatedArchitecture into an ArchitectureSpec
 * that DynamicPhaseGenerator.generatePhasePlanWithArchitecture() accepts.
 */
export function convertToArchitectureSpec(
  arch: FinalValidatedArchitecture,
  appName: string
): ArchitectureSpec {
  return {
    id: `dual-ai-${Date.now()}`,
    appName,
    generatedAt: arch.validation?.approvedAt ?? new Date().toISOString(),

    architectureReasoning: buildReasoning(arch),
    database: convertDatabase(arch),
    api: convertAPI(arch),
    auth: arch.auth ? convertAuth(arch) : undefined,
    realtime: arch.realtime?.enabled ? convertRealtime(arch) : undefined,
    backendPhases: buildBackendPhases(arch),
    tokenUsage: { input: 0, output: 0 },
  };
}

// ============================================================================
// REASONING
// ============================================================================

function buildReasoning(arch: FinalValidatedArchitecture) {
  const decisions = [];

  decisions.push({
    area: 'database' as const,
    decision: `Use ${arch.database?.provider ?? 'postgresql'}`,
    reasoning: 'Selected through dual AI consensus',
    alternatives: [],
  });

  decisions.push({
    area: 'api' as const,
    decision: `${arch.api?.style ?? 'REST'} API`,
    reasoning: 'Selected through dual AI consensus',
    alternatives: [],
  });

  if (arch.auth) {
    decisions.push({
      area: 'auth' as const,
      decision: `${arch.auth.provider} with ${arch.auth.strategy}`,
      reasoning: 'Selected through dual AI consensus',
      alternatives: [],
    });
  }

  return {
    summary: `Architecture planned via dual AI consensus in ${arch.consensusReport?.rounds ?? 0} round(s). Coverage: ${arch.validation?.coverage ?? 0}%.`,
    decisions,
    scalabilityNotes: arch.scaling?.optimization?.techniques ?? [],
    securityNotes: [],
    performanceNotes: arch.scaling?.caching
      ? [`Caching strategy: ${arch.scaling.caching.strategy}`]
      : [],
    tradeoffs: arch.consensusReport?.compromises ?? [],
  };
}

// ============================================================================
// DATABASE
// ============================================================================

/** Infer relation type from a relation name string (best-effort heuristic) */
function inferRelationType(name: string): RelationDefinition['type'] {
  const lower = name.toLowerCase();
  // Singular nouns typically imply one-to-one (profile, address, settings, avatar)
  const oneToOnePatterns = ['profile', 'address', 'setting', 'avatar', 'config', 'metadata', 'preference'];
  if (oneToOnePatterns.some((p) => lower.includes(p))) return 'one-to-one';
  // Plural junction-table patterns imply many-to-many (tags, categories, roles, permissions)
  const manyToManyPatterns = ['tags', 'categories', 'roles', 'permissions', 'labels', 'groups'];
  if (manyToManyPatterns.some((p) => lower.includes(p))) return 'many-to-many';
  // Default: one-to-many (posts, comments, orders, items, etc.)
  return 'one-to-many';
}

function convertDatabase(arch: FinalValidatedArchitecture): ArchSpecDatabase {
  const provider = arch.database?.provider?.toLowerCase() ?? 'postgresql';

  // Map provider to ArchitectureSpec strategy
  let strategy: 'sqlite' | 'postgresql' | 'supabase' = 'postgresql';
  if (provider.includes('sqlite')) strategy = 'sqlite';
  else if (provider.includes('supabase')) strategy = 'supabase';
  else if (provider.includes('postgres')) strategy = 'postgresql';

  const tables: TableDefinition[] = (arch.database?.models ?? []).map((model) => ({
    name: model.name,
    description: `${model.name} table`,
    fields: (model.fields ?? []).map(
      (f): FieldDefinition => ({
        name: f.name,
        type: mapFieldType(f.type),
        required: f.required,
        unique: f.unique,
      })
    ),
    relations: (model.relations ?? []).map(
      (r): RelationDefinition => ({
        name: r,
        type: inferRelationType(r),
        targetTable: r,
      })
    ),
  }));

  return {
    strategy,
    prismaSchema: arch.database?.schema ?? '',
    tables,
    indexes: [],
    migrationNotes: [],
  };
}

function mapFieldType(type: string): FieldDefinition['type'] {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('number')) return 'Int';
  if (t.includes('float') || t.includes('decimal')) return 'Float';
  if (t.includes('bool')) return 'Boolean';
  if (t.includes('date') || t.includes('time')) return 'DateTime';
  if (t.includes('json') || t.includes('object')) return 'Json';
  return 'String';
}

// ============================================================================
// API
// ============================================================================

function convertAPI(arch: FinalValidatedArchitecture): ArchSpecAPI {
  const style = arch.api?.style?.toLowerCase() ?? 'rest';
  let apiStyle: 'rest' | 'trpc' | 'graphql' = 'rest';
  if (style.includes('trpc')) apiStyle = 'trpc';
  else if (style.includes('graphql')) apiStyle = 'graphql';

  const routes: APIRouteSpec[] = (arch.api?.routes ?? []).map((r) => ({
    path: r.path,
    method: (r.method?.toUpperCase() as APIRouteSpec['method']) ?? 'GET',
    description: r.handler ?? r.path,
    feature: r.handler ?? 'general',
    requiresAuth: (r.middleware ?? []).some((m) => m.toLowerCase().includes('auth')),
  }));

  return {
    style: apiStyle,
    routes,
    middleware: [],
    errorHandling: {
      strategy: 'standard',
      customErrors: [],
    },
  };
}

// ============================================================================
// AUTH
// ============================================================================

function convertAuth(arch: FinalValidatedArchitecture): ArchSpecAuth | undefined {
  if (!arch.auth) return undefined;

  const providerMap: Record<string, 'next-auth' | 'supabase' | 'custom-jwt'> = {
    NextAuth: 'next-auth',
    Clerk: 'custom-jwt',
    Auth0: 'custom-jwt',
    Supabase: 'supabase',
    custom: 'custom-jwt',
  };

  return {
    strategy: providerMap[arch.auth.provider] ?? 'next-auth',
    providers: (arch.auth.flows ?? []).map((flow) => ({
      type: flow === 'oauth' ? ('oauth' as const) : ('credentials' as const),
      configuration: {},
    })),
    session: {
      strategy: arch.auth.strategy?.toLowerCase() === 'jwt' ? 'jwt' : 'database',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 1 day
    },
    files: [],
  };
}

// ============================================================================
// REALTIME
// ============================================================================

function convertRealtime(arch: FinalValidatedArchitecture): ArchSpecRealtime | undefined {
  if (!arch.realtime?.enabled) return undefined;

  const techMap: Record<string, 'sse' | 'websocket' | 'polling' | 'supabase-realtime'> = {
    SSE: 'sse',
    WebSocket: 'websocket',
    none: 'sse',
  };

  return {
    strategy: techMap[arch.realtime.technology] ?? 'sse',
    channels: (arch.realtime.channels ?? []).map((ch) => ({
      name: ch.name,
      description: ch.name,
      events: (ch.events ?? []).map((e) => ({ name: e, payload: '{}' })),
      subscribers: [],
    })),
    files: [],
  };
}

// ============================================================================
// BACKEND PHASES
// ============================================================================

function buildBackendPhases(arch: FinalValidatedArchitecture): BackendPhaseSpec[] {
  const phases: BackendPhaseSpec[] = [];
  let priority = 10;

  // Database setup phase
  if (arch.database?.models?.length) {
    phases.push({
      name: 'Database Schema Setup',
      description: `Set up ${arch.database.provider} database with ${arch.database.models.length} models`,
      domain: 'database' as FeatureDomain,
      priority: priority++,
      dependencies: ['Project Setup'],
      files: arch.database.schema
        ? [
            {
              path: 'prisma/schema.prisma',
              description: 'Prisma schema',
              content: arch.database.schema,
            },
          ]
        : [],
      features: arch.database.models.map((m) => m.name),
      testCriteria: ['Database connection works', 'All models can be queried'],
      estimatedTokens: 3000,
    });
  }

  // Auth phase
  if (arch.auth) {
    phases.push({
      name: 'Authentication System',
      description: `${arch.auth.provider} authentication with ${arch.auth.strategy} strategy`,
      domain: 'auth' as FeatureDomain,
      priority: priority++,
      dependencies: ['Database Schema Setup'],
      files: [],
      features: arch.auth.flows ?? [],
      testCriteria: ['Login works', 'Session persists', 'Protected routes are guarded'],
      estimatedTokens: 4000,
    });
  }

  // API routes phase
  if (arch.api?.routes?.length) {
    phases.push({
      name: 'API Routes',
      description: `${arch.api.style} API with ${arch.api.routes.length} endpoints`,
      domain: 'feature' as FeatureDomain,
      priority: priority++,
      dependencies: ['Database Schema Setup'],
      files: [],
      features: arch.api.routes.map((r) => `${r.method} ${r.path}`),
      testCriteria: ['All endpoints return correct status codes', 'CRUD operations work'],
      estimatedTokens: 5000,
    });
  }

  // Agentic workflows phase
  if (arch.agentic?.enabled && arch.agentic.workflows.length > 0) {
    phases.push({
      name: 'Agentic Workflows',
      description: `${arch.agentic.framework} workflows: ${arch.agentic.workflows.map((w) => w.name).join(', ')}`,
      domain: 'feature' as FeatureDomain,
      priority: priority++,
      dependencies: ['API Routes'],
      files: [],
      features: arch.agentic.workflows.map((w) => w.name),
      testCriteria: arch.agentic.workflows.map((w) => `${w.name} workflow executes correctly`),
      estimatedTokens: 6000,
    });
  }

  // Realtime phase
  if (arch.realtime?.enabled) {
    phases.push({
      name: 'Real-time Features',
      description: `${arch.realtime.technology} real-time with ${arch.realtime.channels.length} channels`,
      domain: 'real-time' as FeatureDomain,
      priority: priority++,
      dependencies: ['API Routes'],
      files: [],
      features: arch.realtime.channels.map((ch) => ch.name),
      testCriteria: ['Real-time connections establish', 'Events are received'],
      estimatedTokens: 4000,
    });
  }

  return phases;
}
