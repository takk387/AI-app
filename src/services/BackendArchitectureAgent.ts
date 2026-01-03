/**
 * Backend Architecture Agent
 *
 * Uses Claude API to analyze AppConcept and generate custom backend architecture.
 * Runs BEFORE phase generation to inform the DynamicPhaseGenerator about
 * backend infrastructure decisions.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AppConcept, Feature, UserRole, Workflow } from '@/types/appConcept';
import type {
  ArchitectureSpec,
  ArchitectureGenerationResult,
  ArchitectureGenerationOptions,
  DatabaseArchitecture,
  APIArchitecture,
  AuthArchitecture,
  RealtimeArchitecture,
  StorageArchitecture,
  CachingArchitecture,
  BackendPhaseSpec,
  ArchitectureReasoning,
} from '@/types/architectureSpec';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const ARCHITECTURE_SYSTEM_PROMPT = `You are an expert software architect designing production-ready, scalable backend architectures for web applications.

## Your Role
Analyze application requirements and design a complete backend architecture that:
1. Is production-ready from day one
2. Scales to 100k+ users without architectural changes
3. Follows security best practices
4. Uses efficient, optimized patterns

## Technology Stack (REQUIRED)
- **Database**: SQLite with Prisma ORM (portable, with migration path to PostgreSQL)
- **API**: Next.js API Routes (REST)
- **Auth**: NextAuth.js (when authentication is needed)
- **Real-time**: Server-Sent Events (when real-time is needed)
- **File Storage**: Local filesystem (with cloud migration path)

## Output Format
You MUST respond with a valid JSON object. Do NOT include any text before or after the JSON.
Do NOT use markdown code blocks. Just output raw JSON.

## Quality Requirements
1. **Complete Prisma Schema**: Generate a full, valid Prisma schema that can be used directly
2. **API Routes**: Define all routes needed for the features
3. **RBAC**: If roles exist, implement proper role-based access control
4. **Security**: Include validation, sanitization, and auth checks
5. **Performance**: Add indexes for common queries
6. **Error Handling**: Define custom error types`;

// ============================================================================
// AGENT CLASS
// ============================================================================

export class BackendArchitectureAgent {
  private anthropic: Anthropic;
  private defaultOptions: Required<ArchitectureGenerationOptions> = {
    databasePreference: 'sqlite',
    maxTokenBudget: 16000,
    enableThinking: true,
    skipAuth: false,
    skipRealtime: false,
    skipStorage: false,
  };

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Analyze AppConcept and generate ArchitectureSpec
   */
  async analyze(
    appConcept: AppConcept,
    options?: ArchitectureGenerationOptions
  ): Promise<ArchitectureGenerationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];

    try {
      // Check if backend is actually needed
      const needsBackend = this.checkBackendNeeds(appConcept);
      if (!needsBackend.needed) {
        return {
          success: true,
          spec: undefined,
          warnings: ['No backend required for this app - frontend only'],
        };
      }

      // Build the analysis prompt
      const prompt = this.buildAnalysisPrompt(appConcept, opts, needsBackend);

      console.log('[BackendArchitectureAgent] Analyzing app concept:', appConcept.name);

      // Call Claude with extended thinking for complex decisions
      const response = await this.callClaude(prompt, opts);

      // Parse the response into ArchitectureSpec
      const spec = this.parseResponse(response, appConcept);

      // Validate the spec
      const validation = this.validateSpec(spec, appConcept);
      warnings.push(...validation.warnings);

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          warnings,
        };
      }

      console.log(
        '[BackendArchitectureAgent] Generated architecture with',
        spec.backendPhases.length,
        'backend phases'
      );

      return {
        success: true,
        spec,
        warnings,
      };
    } catch (error) {
      console.error('[BackendArchitectureAgent] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Architecture analysis failed',
        warnings,
      };
    }
  }

  /**
   * Check what backend features are needed
   */
  private checkBackendNeeds(appConcept: AppConcept): {
    needed: boolean;
    auth: boolean;
    database: boolean;
    realtime: boolean;
    storage: boolean;
    api: boolean;
  } {
    const tech = appConcept.technical;
    return {
      needed:
        tech.needsAuth ||
        tech.needsDatabase ||
        tech.needsRealtime ||
        tech.needsFileUpload ||
        tech.needsAPI,
      auth: tech.needsAuth,
      database: tech.needsDatabase,
      realtime: tech.needsRealtime,
      storage: tech.needsFileUpload,
      api: tech.needsAPI,
    };
  }

  /**
   * Build the analysis prompt for Claude
   */
  private buildAnalysisPrompt(
    appConcept: AppConcept,
    options: Required<ArchitectureGenerationOptions>,
    needs: ReturnType<typeof this.checkBackendNeeds>
  ): string {
    const features = appConcept.coreFeatures || [];
    const roles = appConcept.roles || [];
    const workflows = appConcept.workflows || [];
    const dataModels = appConcept.technical.dataModels || [];

    return `## Application Analysis Request

### Basic Information
- **Name**: ${appConcept.name}
- **Description**: ${appConcept.description || 'Not provided'}
- **Purpose**: ${appConcept.purpose || 'Not provided'}
- **Target Users**: ${appConcept.targetUsers || 'General users'}

### Core Features (${features.length} total)
${features.map((f: Feature) => `- **${f.name}** (${f.priority || 'medium'}): ${f.description || 'No description'}`).join('\n') || '- No features defined'}

### User Roles
${roles.length > 0 ? roles.map((r: UserRole) => `- **${r.name}**: ${r.capabilities?.join(', ') || 'No capabilities defined'}`).join('\n') : '- No specific roles defined (single user type)'}

### Workflows
${workflows.length > 0 ? workflows.map((w: Workflow) => `- **${w.name}**: ${w.steps?.join(' → ') || 'No steps defined'}`).join('\n') : '- No specific workflows defined'}

### Technical Requirements
- **Needs Auth**: ${needs.auth} ${appConcept.technical.authType ? `(${appConcept.technical.authType})` : ''}
- **Needs Database**: ${needs.database}
- **Needs Real-time**: ${needs.realtime}
- **Needs File Upload**: ${needs.storage}
- **Needs API**: ${needs.api}

${
  dataModels.length > 0
    ? `### Existing Data Model Hints
${dataModels.map((m) => `- **${m.name}**: ${m.fields?.map((f) => f.name).join(', ') || 'No fields'}`).join('\n')}`
    : ''
}

### Architecture Constraints
- Database: ${options.databasePreference} with Prisma ORM
- API Style: REST with Next.js API Routes
- Auth: NextAuth.js (if auth needed)
- Design for scale: 100k+ users

## Required Output Structure

Generate a JSON object with this EXACT structure:

{
  "reasoning": {
    "summary": "Brief summary of architecture decisions",
    "decisions": [
      {
        "area": "database|api|auth|realtime|storage|caching",
        "decision": "What was decided",
        "reasoning": "Why this decision",
        "alternatives": ["Alternative 1", "Alternative 2"]
      }
    ],
    "scalabilityNotes": ["Note 1", "Note 2"],
    "securityNotes": ["Note 1", "Note 2"],
    "performanceNotes": ["Note 1"],
    "tradeoffs": ["Tradeoff 1"]
  },
  "database": {
    "strategy": "sqlite",
    "prismaSchema": "// Full Prisma schema here\\n...",
    "tables": [
      {
        "name": "User",
        "description": "User accounts",
        "fields": [
          {"name": "id", "type": "String", "required": true, "unique": true},
          {"name": "email", "type": "String", "required": true, "unique": true}
        ],
        "relations": [],
        "accessRoles": ["admin", "user"]
      }
    ],
    "indexes": [
      {"name": "idx_user_email", "table": "User", "fields": ["email"], "unique": true, "reason": "Fast email lookup"}
    ],
    "migrationNotes": ["Note about future migrations"]
  },
  "api": {
    "style": "rest",
    "routes": [
      {
        "path": "/api/users",
        "method": "GET",
        "description": "List all users",
        "feature": "User Management",
        "requestSchema": "{ page?: number, limit?: number }",
        "responseSchema": "{ users: User[], total: number }",
        "requiresAuth": true,
        "requiredRoles": ["admin"]
      }
    ],
    "middleware": [],
    "errorHandling": {
      "strategy": "standard",
      "customErrors": [
        {"code": "USER_NOT_FOUND", "message": "User not found", "httpStatus": 404}
      ]
    }
  },
  ${
    needs.auth
      ? `"auth": {
    "strategy": "next-auth",
    "providers": [{"type": "credentials", "configuration": {}}],
    "session": {"strategy": "jwt", "maxAge": 2592000, "updateAge": 86400},
    "rbac": {
      "roles": [{"name": "admin", "description": "Administrator", "isDefault": false}],
      "permissions": [{"name": "users:read", "description": "Read users", "resource": "users", "actions": ["read"]}],
      "rolePermissions": [{"role": "admin", "permissions": ["users:read"]}]
    },
    "files": []
  },`
      : ''
  }
  ${
    needs.realtime
      ? `"realtime": {
    "strategy": "sse",
    "channels": [{"name": "updates", "description": "Real-time updates", "events": [], "subscribers": []}],
    "files": []
  },`
      : ''
  }
  ${
    needs.storage
      ? `"storage": {
    "strategy": "local",
    "buckets": [{"name": "uploads", "description": "User uploads", "allowedMimeTypes": ["image/*"], "maxFileSize": 5242880, "isPublic": false}],
    "validation": {"maxSize": 5242880, "allowedTypes": ["image/jpeg", "image/png"]},
    "files": []
  },`
      : ''
  }
  "backendPhases": [
    {
      "name": "Database Setup",
      "description": "Set up Prisma schema and database",
      "domain": "database",
      "priority": 1,
      "dependencies": [],
      "files": [{"path": "prisma/schema.prisma", "description": "Prisma schema"}],
      "features": ["Database initialization"],
      "testCriteria": ["Schema is valid", "Migrations run successfully"],
      "estimatedTokens": 3000
    }
  ]
}

CRITICAL:
- Output ONLY the JSON object, no other text
- Ensure the Prisma schema is complete and valid
- Include ALL tables needed for the features
- Add proper indexes for performance
- Define ALL API routes needed for the features`;
  }

  /**
   * Call Claude API with extended thinking
   */
  private async callClaude(
    prompt: string,
    options: Required<ArchitectureGenerationOptions>
  ): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: options.maxTokenBudget,
      temperature: 1,
      thinking: options.enableThinking
        ? {
            type: 'enabled',
            budget_tokens: Math.floor(options.maxTokenBudget / 2),
          }
        : undefined,
      system: [
        {
          type: 'text',
          text: ARCHITECTURE_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    return responseText;
  }

  /**
   * Parse Claude's response into structured ArchitectureSpec
   * Uses multiple extraction strategies to handle various response formats
   */
  private parseResponse(response: string, appConcept: AppConcept): ArchitectureSpec {
    let jsonStr = response.trim();

    // Strategy 1: Strip markdown code blocks FIRST (most common issue)
    // Handle ```json ... ``` or ``` ... ```
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Strategy 2: Find JSON object boundaries (handles any leading/trailing text)
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    // Strategy 3: If still no valid JSON structure, try regex extraction from original
    if (!jsonStr.startsWith('{')) {
      const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
    }

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[BackendArchitectureAgent] JSON parse error:', e);
      console.error(
        '[BackendArchitectureAgent] Attempted to parse:',
        jsonStr.substring(0, 500) + '...'
      );
      console.error('[BackendArchitectureAgent] Raw response:', response.substring(0, 200) + '...');
      throw new Error('Failed to parse architecture response as JSON');
    }

    // Transform to ArchitectureSpec structure
    return {
      id: `arch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      appName: appConcept.name,
      generatedAt: new Date().toISOString(),
      architectureReasoning: this.parseReasoning(parsed.reasoning as Record<string, unknown>),
      database: this.parseDatabaseArchitecture(parsed.database as Record<string, unknown>),
      api: this.parseAPIArchitecture(parsed.api as Record<string, unknown>),
      auth: parsed.auth
        ? this.parseAuthArchitecture(parsed.auth as Record<string, unknown>)
        : undefined,
      realtime: parsed.realtime as RealtimeArchitecture | undefined,
      storage: parsed.storage as StorageArchitecture | undefined,
      caching: parsed.caching as CachingArchitecture | undefined,
      backendPhases: this.parseBackendPhases(parsed.backendPhases as unknown[]),
      tokenUsage: {
        input: 0,
        output: 0,
      },
    };
  }

  private parseReasoning(raw: Record<string, unknown>): ArchitectureReasoning {
    return {
      summary: (raw?.summary as string) || 'No summary provided',
      decisions: (raw?.decisions as ArchitectureReasoning['decisions']) || [],
      scalabilityNotes: (raw?.scalabilityNotes as string[]) || [],
      securityNotes: (raw?.securityNotes as string[]) || [],
      performanceNotes: (raw?.performanceNotes as string[]) || [],
      tradeoffs: (raw?.tradeoffs as string[]) || [],
    };
  }

  private parseDatabaseArchitecture(raw: Record<string, unknown>): DatabaseArchitecture {
    return {
      strategy: (raw?.strategy as DatabaseArchitecture['strategy']) || 'sqlite',
      prismaSchema: (raw?.prismaSchema as string) || '',
      tables: (raw?.tables as DatabaseArchitecture['tables']) || [],
      indexes: (raw?.indexes as DatabaseArchitecture['indexes']) || [],
      seedData: raw?.seedData as DatabaseArchitecture['seedData'],
      migrationNotes: (raw?.migrationNotes as string[]) || [],
    };
  }

  private parseAPIArchitecture(raw: Record<string, unknown>): APIArchitecture {
    return {
      style: (raw?.style as APIArchitecture['style']) || 'rest',
      routes: (raw?.routes as APIArchitecture['routes']) || [],
      middleware: (raw?.middleware as APIArchitecture['middleware']) || [],
      errorHandling: (raw?.errorHandling as APIArchitecture['errorHandling']) || {
        strategy: 'standard',
        customErrors: [],
      },
      rateLimiting: raw?.rateLimiting as APIArchitecture['rateLimiting'],
    };
  }

  private parseAuthArchitecture(raw: Record<string, unknown>): AuthArchitecture {
    return {
      strategy: (raw?.strategy as AuthArchitecture['strategy']) || 'next-auth',
      providers: (raw?.providers as AuthArchitecture['providers']) || [],
      session: (raw?.session as AuthArchitecture['session']) || {
        strategy: 'jwt',
        maxAge: 2592000,
        updateAge: 86400,
      },
      rbac: raw?.rbac as AuthArchitecture['rbac'],
      files: (raw?.files as AuthArchitecture['files']) || [],
    };
  }

  private parseBackendPhases(raw: unknown[]): BackendPhaseSpec[] {
    if (!Array.isArray(raw)) return [];

    return raw.map((phase) => {
      const p = phase as Record<string, unknown>;
      return {
        name: (p.name as string) || 'Unnamed Phase',
        description: (p.description as string) || '',
        domain: (p.domain as BackendPhaseSpec['domain']) || 'database',
        priority: (p.priority as number) || 1,
        dependencies: (p.dependencies as string[]) || [],
        files: (p.files as BackendPhaseSpec['files']) || [],
        features: (p.features as string[]) || [],
        testCriteria: (p.testCriteria as string[]) || [],
        estimatedTokens: (p.estimatedTokens as number) || 3000,
      };
    });
  }

  /**
   * Validate the generated spec
   */
  private validateSpec(
    spec: ArchitectureSpec,
    appConcept: AppConcept
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check database
    if (appConcept.technical.needsDatabase) {
      if (!spec.database.prismaSchema || spec.database.prismaSchema.length < 50) {
        errors.push('Prisma schema is missing or too short');
      }
      if (spec.database.tables.length === 0) {
        warnings.push('No table definitions provided');
      }
    }

    // Check API
    if (appConcept.technical.needsAPI) {
      if (spec.api.routes.length === 0) {
        warnings.push('No API routes defined');
      }
    }

    // Check auth
    if (appConcept.technical.needsAuth && !spec.auth) {
      errors.push('Auth architecture required but not provided');
    }

    // Check backend phases
    if (spec.backendPhases.length === 0) {
      warnings.push('No backend phases defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Singleton instance for convenience
 */
let agentInstance: BackendArchitectureAgent | null = null;

export function getBackendArchitectureAgent(): BackendArchitectureAgent {
  if (!agentInstance) {
    agentInstance = new BackendArchitectureAgent();
  }
  return agentInstance;
}
