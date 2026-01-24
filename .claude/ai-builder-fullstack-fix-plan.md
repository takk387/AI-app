# AI App Builder Full-Stack Fix Plan

## Overview

This plan addresses **17 critical issues** (18 identified, 1 invalid) that prevent the AI builder from generating production-quality full-stack applications.

**Two Workflows Supported:**
1. **Guided Path:** NaturalConversationWizard → LayoutBuilder → Build → AIBuilder
2. **Direct Path:** AIBuilder (MainBuilderView) accessed directly at `/app`

All fixes ensure **zero breaking changes** to both workflows. Fixes are additive - they add optional fields and new capabilities without removing or renaming existing required fields.

---

## Safe Implementation Strategy

### Guiding Principle

**All fixes ADD optional fields and features. None REMOVE or RENAME existing required fields.**

---

## Fix 1: Add Backend Requirements to Wizard

**Status:** SAFE ✓

**Files to Modify:**
- `src/prompts/wizardSystemPrompt.ts` - Add backend requirement questions
- `src/types/appConcept.ts` - Add optional fields to TechnicalRequirements

**Changes:**

```typescript
// src/types/appConcept.ts - ADD to TechnicalRequirements interface
interface TechnicalRequirements {
  // Existing fields (unchanged)...
  needsAuth: boolean;
  needsDatabase: boolean;
  needsAPI: boolean;
  needsFileUpload: boolean;
  needsRealtime: boolean;

  // NEW optional fields
  scale?: 'small' | 'medium' | 'large' | 'enterprise';
  expectedUsers?: string;  // "100", "10k", "1M+"
  hostingPreference?: 'vercel' | 'aws' | 'gcp' | 'self-hosted';
  complianceNeeds?: string[];  // ['GDPR', 'HIPAA', 'SOC2']
  integrationsNeeded?: string[];  // ['Stripe', 'SendGrid', 'Twilio']
  performanceRequirements?: {
    latencySLA?: string;  // "< 200ms"
    uptimeSLA?: string;   // "99.9%"
  };
}
```

```typescript
// src/prompts/wizardSystemPrompt.ts - ADD to conversation prompts
// When user mentions backend features, ask follow-up questions:

"For apps with authentication, ask:
- How many users do you expect? (helps determine auth scaling)
- Do you need social login (Google, GitHub) or just email/password?
- Any compliance requirements (GDPR, HIPAA)?

For apps with database, ask:
- What kind of data will you store? (helps determine SQL vs NoSQL)
- How much data do you expect? (helps determine scaling strategy)
- Do you need real-time sync or is eventual consistency okay?

For apps with payments/integrations, ask:
- Which payment provider? (Stripe, PayPal, etc.)
- Any other third-party services needed?"
```

**Why Safe:**
- All new fields are OPTIONAL (`?:`)
- Existing flow unchanged if fields not provided
- `technical.*` defaults to `false` for booleans, `undefined` for new fields

---

## Fix 2: Make Tech Stack Configurable

**Status:** SAFE ✓

**Files to Modify:**
- `src/types/appConcept.ts` - Add tech preferences
- `src/services/BackendArchitectureAgent.ts` - Read preferences, use defaults

**Changes:**

```typescript
// src/types/appConcept.ts - ADD to TechnicalRequirements
interface TechnicalRequirements {
  // Existing + Fix 1 fields...

  // NEW tech stack preferences (all optional)
  preferredDatabase?: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';
  preferredAuth?: 'nextauth' | 'clerk' | 'auth0' | 'supabase';
  preferredApiStyle?: 'rest' | 'graphql' | 'trpc';
  preferredOrm?: 'prisma' | 'drizzle' | 'typeorm';
}
```

```typescript
// src/services/BackendArchitectureAgent.ts - MODIFY buildAnalysisPrompt()
// Replace hardcoded "REQUIRED" tech stack with configurable preferences

const techStackSection = `
## Technology Stack
${concept.technical.preferredDatabase
  ? `- **Database**: ${concept.technical.preferredDatabase} (user preference)`
  : '- **Database**: SQLite with Prisma ORM (default)'}
${concept.technical.preferredAuth
  ? `- **Auth**: ${concept.technical.preferredAuth} (user preference)`
  : '- **Auth**: NextAuth.js (default)'}
${concept.technical.preferredApiStyle
  ? `- **API**: ${concept.technical.preferredApiStyle} (user preference)`
  : '- **API**: Next.js API Routes REST (default)'}
`;
```

**Why Safe:**
- All preferences are OPTIONAL
- Falls back to current defaults if not specified
- BackendArchitectureAgent already reads from AppConcept.technical

---

## Fix 3: Architecture Gate Before Phase Planning

**Status:** REQUIRES UI/FLOW CHANGE ⚠️

**The Critical Flow (Already Exists in Code):**
```
AppConcept + ArchitectureSpec → DynamicPhaseGenerator.generatePhasePlanWithArchitecture()
```

The architecture is NOT just for user review - it's a **critical input** to phase planning. Without it, phases are generated without backend context.

**Current Problem:**
- "Analyze Architecture" button exists but may not be prominent
- User might skip it and try to build without architecture
- If skipped, `generatePhasePlanWithArchitecture()` doesn't get the architecture context

**Desired Flow:**

```
User completes app concept conversation
    ↓
AI signals: "App concept ready!"
    ↓
[GATE] "Analyze Architecture" button appears prominently
    ↓
User clicks button
    ↓
BackendArchitectureAgent.analyze(AppConcept) runs
    ↓
ArchitectureSpec generated (database, API, auth, backendPhases)
    ↓
User reviews in ArchitectureReviewPanel
    ↓
User clicks "Proceed to Phases"
    ↓
DynamicPhaseGenerator.generatePhasePlanWithArchitecture(AppConcept, ArchitectureSpec)
    ↓
Phases planned WITH backend phases from ArchitectureSpec.backendPhases
    ↓
Building begins with full context
```

**Files to Modify:**
- `src/components/NaturalConversationWizard.tsx` - Show button prominently when planning complete
- `src/prompts/wizardSystemPrompt.ts` - AI signals when to show button

**Changes:**

```typescript
// src/components/NaturalConversationWizard.tsx

// Show "Analyze Architecture" button when planning is complete
const isPlanningComplete = useMemo(() => {
  return wizardState.name &&
    wizardState.features?.length > 0 &&
    wizardState.description;
}, [wizardState]);

const needsBackend = wizardState.technical?.needsAuth ||
  wizardState.technical?.needsDatabase ||
  wizardState.technical?.needsAPI;

// Render the gate
{isPlanningComplete && needsBackend && !architectureSpec && (
  <div className="planning-complete-gate">
    <h3>App Concept Complete!</h3>
    <p>Click to generate the architecture plan for your app.</p>
    <button onClick={() => generateArchitecture()}>
      Analyze Architecture
    </button>
  </div>
)}

// After architecture is generated, show review panel
{architectureSpec && (
  <ArchitectureReviewPanel
    architectureSpec={architectureSpec}
    onProceed={() => {
      // Pass BOTH to phase generation
      generatePhases(architectureSpec);
    }}
    onRegenerate={regenerateArchitecture}
  />
)}
```

```typescript
// src/prompts/wizardSystemPrompt.ts - AI signals completion
"When you have gathered:
- App name and description
- Core features with priorities
- Technical requirements (auth, database, API needs)
- Data models (if applicable)

Signal completion by saying:
'Your app concept is complete! Click **Analyze Architecture** to generate the database schema, API routes, and backend structure before we start building.'

Do NOT suggest building until architecture is analyzed and approved."
```

**Why This Matters:**
- `ArchitectureSpec.backendPhases` contains the backend phase definitions
- `DynamicPhaseGenerator.injectBackendPhases()` inserts these into the plan
- Without architecture, backend phases are missing or auto-generated with less context
- The button is a **gate** ensuring architecture flows into phase planning

---

## Fix 4: Remove Sandbox Constraints for Full-Stack

**Status:** SAFE WITH CARE ⚠️

**Files to Modify:**
- `src/prompts/full-app/fullstack-rules-compressed.ts` - Conditional rules
- `src/app/api/ai-builder/full-app/generation-logic.ts` - App type detection

**Changes:**

```typescript
// src/prompts/full-app/fullstack-rules-compressed.ts
// ADD conditional section based on app type

export function getFullstackRules(appType: 'FRONTEND_ONLY' | 'FULL_STACK') {
  const baseRules = `...existing rules...`;

  if (appType === 'FULL_STACK') {
    return `${baseRules}

## Full-Stack Production Patterns (Local Dev Required)
- USE Next.js Link component for navigation
- USE Next.js Image component for optimized images
- USE Server Components for data fetching where appropriate
- USE proper async/await patterns in API routes
- GENERATE real database queries, not mock data
- INCLUDE proper error boundaries and loading states

NOTE: This app requires local development. Preview will show:
"This full-stack app requires local setup. Run 'npm install && npx prisma migrate dev && npm run dev' to test."
`;
  }

  // FRONTEND_ONLY keeps current sandbox-compatible rules
  return baseRules;
}
```

**Why Safe:**
- FRONTEND_ONLY apps unchanged (backward compatible)
- FULL_STACK apps get production patterns
- Preview gracefully shows setup instructions instead of breaking

---

## Fix 5: Add Backend Validation Phases

**Status:** SAFE ✓

**Files to Modify:**
- `src/types/dynamicPhases.ts` - Add new FeatureDomain values
- `src/services/DynamicPhaseGenerator.ts` - Add phase detection logic

**Changes:**

```typescript
// src/types/dynamicPhases.ts - EXTEND FeatureDomain type
export type FeatureDomain =
  | 'setup'
  | 'core'
  | 'data'
  | 'ui'
  | 'interaction'
  | 'integration'
  | 'polish'
  | 'database'     // existing
  | 'auth'         // existing
  | 'real-time'    // existing
  | 'storage'      // existing
  // NEW domains
  | 'devops'       // Docker, CI/CD, deployment config
  | 'monitoring'   // Logging, error tracking, observability
  | 'testing'      // Unit tests, integration tests, E2E
  | 'security'     // Rate limiting, CORS, input validation
  | 'documentation'; // API docs, README, setup guides
```

```typescript
// src/services/DynamicPhaseGenerator.ts - ADD detection logic
// In generateBackendPhases() or similar method

if (concept.technical.scale === 'large' || concept.technical.scale === 'enterprise') {
  phases.push({
    domain: 'devops',
    name: 'DevOps & Deployment',
    description: 'Docker configuration, CI/CD pipeline, environment setup',
    files: ['Dockerfile', 'docker-compose.yml', '.github/workflows/deploy.yml'],
    priority: phases.length + 1
  });

  phases.push({
    domain: 'monitoring',
    name: 'Monitoring & Observability',
    description: 'Error tracking, logging, performance monitoring',
    files: ['lib/logger.ts', 'lib/monitoring.ts'],
    priority: phases.length + 1
  });
}

if (concept.technical.needsAPI) {
  phases.push({
    domain: 'testing',
    name: 'API Testing',
    description: 'Unit tests and integration tests for API routes',
    files: ['__tests__/api/*.test.ts'],
    priority: phases.length + 1
  });
}
```

**Why Safe:**
- Only ADDS new domain values to union type
- Existing domains unchanged
- Phase execution already handles any domain type
- New phases only added when conditions met

---

## Fix 6: Dynamic Template Generation

**Status:** SAFE ✓

**Files to Modify:**
- `src/prompts/full-app/backend-templates.ts` - Parameterize templates

**Changes:**

```typescript
// src/prompts/full-app/backend-templates.ts
// MODIFY getBackendTemplates() to accept preferences

export function getBackendTemplates(
  tech: TechnicalRequirements,
  preferences?: {
    database?: string;
    auth?: string;
    apiStyle?: string;
  }
): string {
  const templates: string[] = [];

  if (tech.needsAuth) {
    // Use preference or default
    const authProvider = preferences?.auth || 'nextauth';
    templates.push(getAuthTemplate(authProvider));
  }

  if (tech.needsDatabase) {
    const dbType = preferences?.database || 'sqlite';
    templates.push(getDatabaseTemplate(dbType));
  }

  // ... rest of logic
  return templates.join('\n\n');
}

function getAuthTemplate(provider: string): string {
  switch (provider) {
    case 'clerk':
      return CLERK_AUTH_TEMPLATE;
    case 'supabase':
      return SUPABASE_AUTH_TEMPLATE;
    case 'nextauth':
    default:
      return AUTH_TEMPLATE;  // existing template
  }
}
```

**Why Safe:**
- Defaults to current behavior if no preferences
- New templates are additive
- Existing AUTH_TEMPLATE unchanged

---

## Fix 7: Add Deployment Planning Phase

**Status:** SAFE ✓

**Files to Modify:**
- `src/services/DynamicPhaseGenerator.ts` - Add devops phase logic

**Implementation:** Included in Fix 5 above.

---

## Fix 8: Increase Backend Token Budget

**Status:** SAFE ✓

**Files to Modify:**
- `src/app/api/ai-builder/full-app/generation-logic.ts` - Adjust budgets

**Changes:**

```typescript
// src/app/api/ai-builder/full-app/generation-logic.ts
// MODIFY getTokenBudget() to account for backend complexity

function getTokenBudget(phase: DynamicPhase, appType: string): TokenBudget {
  const isBackendPhase = ['database', 'auth', 'devops', 'monitoring', 'testing']
    .includes(phase.domain);

  if (phase.number === 1) {
    return {
      max_tokens: 48000,
      thinking_budget: 24000,
      timeout: 360000
    };
  }

  // Backend phases get larger budget
  if (isBackendPhase && appType === 'FULL_STACK') {
    return {
      max_tokens: 40000,  // Increased from 32000
      thinking_budget: 20000,  // Increased from 16000
      timeout: 360000  // 6 minutes
    };
  }

  // Frontend phases keep current budget
  return {
    max_tokens: 32000,
    thinking_budget: 16000,
    timeout: 300000
  };
}
```

**Why Safe:**
- Only increases budgets, doesn't reduce
- Frontend-only apps unchanged
- Backward compatible

---

## Fix 9: Add Backend Integrity Checks

**Status:** SAFE ✓

**Files to Modify:**
- `src/services/PhaseExecutionManager.ts` - Add backend validation
- `src/utils/codeValidator.ts` - Add Prisma/API validation

**Changes:**

```typescript
// src/utils/codeValidator.ts - ADD backend validation functions

export function validatePrismaSchema(content: string): ValidationResult {
  // Check for common Prisma schema issues
  const issues: string[] = [];

  if (!content.includes('generator client')) {
    issues.push('Missing Prisma client generator');
  }
  if (!content.includes('datasource db')) {
    issues.push('Missing datasource configuration');
  }
  // Check for model definitions
  if (!content.match(/model \w+ \{/)) {
    issues.push('No models defined in schema');
  }

  return {
    valid: issues.length === 0,
    errors: issues
  };
}

export function validateApiRoute(content: string, path: string): ValidationResult {
  const issues: string[] = [];

  // Check for proper exports
  if (!content.match(/export (async function|const) (GET|POST|PUT|DELETE|PATCH)/)) {
    issues.push(`API route ${path} missing HTTP method export`);
  }

  // Check for error handling
  if (!content.includes('catch') && !content.includes('try')) {
    issues.push(`API route ${path} missing error handling`);
  }

  return {
    valid: issues.length === 0,
    errors: issues
  };
}
```

**Why Safe:**
- Validation is additive (new functions)
- Existing validation unchanged
- Returns warnings, doesn't block generation

---

## Fix 10: Generate Tests for Backend

**Status:** SAFE ✓

**Files to Modify:**
- `src/prompts/builder.ts` - Add test generation instructions

**Changes:**

```typescript
// src/prompts/builder.ts - ADD to buildFullAppPrompt()

const testGenerationInstructions = `
## Test Generation (for FULL_STACK apps with testing phase)

When generating the testing phase, include:

1. **API Route Tests** (using vitest + supertest):
   ===FILE:__tests__/api/[endpoint].test.ts===
   - Test all HTTP methods
   - Test error cases (400, 401, 404, 500)
   - Test with valid and invalid data

2. **Database Tests**:
   - Test CRUD operations
   - Test relationships
   - Use test database (SQLite in-memory)

3. **Auth Tests**:
   - Test login/logout flows
   - Test protected routes
   - Test session handling
`;

// Include only for FULL_STACK apps with testing enabled
if (appType === 'FULL_STACK' && concept.technical.needsAPI) {
  prompt += testGenerationInstructions;
}
```

**Why Safe:**
- Only adds instructions for specific app types
- Existing prompts unchanged
- Test files are additive (new files, don't modify existing)

---

## What MUST NOT Change

| Item | Reason |
|------|--------|
| `AppConcept.name` required | API validation fails (generate-phases:66) |
| `AppConcept.coreFeatures[]` required | Phase generation fails (generate-phases:75) |
| `Feature` structure (id, name, description, priority) | Phase ordering breaks |
| Zustand store key `appConcept` | Build page reads this |
| Zustand store key `dynamicPhasePlan` | Phase execution reads this |
| Zustand store key `currentAppId` | Documentation tracking |
| `DynamicPhasePlan.concept` embedding | Phase context lost |
| `onComplete(concept, phasePlan)` signature | Wizard→Builder handoff |

---

## Implementation Order

1. **Phase 1 - Types** (no runtime impact)
   - Update `src/types/appConcept.ts` with new optional fields
   - Update `src/types/dynamicPhases.ts` with new domains
   - Run `npm run typecheck`

2. **Phase 2 - Prompts** (affects new generations only)
   - Update `src/prompts/wizardSystemPrompt.ts`
   - Update `src/prompts/full-app/fullstack-rules-compressed.ts`
   - Update `src/prompts/builder.ts`

3. **Phase 3 - Services** (affects new generations only)
   - Update `src/services/BackendArchitectureAgent.ts`
   - Update `src/services/DynamicPhaseGenerator.ts`

4. **Phase 4 - Validation** (additive)
   - Update `src/utils/codeValidator.ts`
   - Update `src/services/PhaseExecutionManager.ts`

5. **Phase 5 - Token Budget** (affects performance only)
   - Update `src/app/api/ai-builder/full-app/generation-logic.ts`

---

## Verification Checklist

### Regression Tests (existing flow must work)

- [ ] Create FRONTEND_ONLY app via wizard → verify preview works
- [ ] Complete wizard without mentioning backend → verify no errors
- [ ] Skip "Analyze Architecture" → verify phases still generate
- [ ] Use Layout Builder → verify design flows to AIBuilder

### New Feature Tests

- [ ] Request full-stack SaaS app → verify wizard asks about scale
- [ ] Specify PostgreSQL preference → verify architecture uses it
- [ ] Request "enterprise" scale → verify DevOps phase generated
- [ ] Check backend code → verify proper patterns (not sandbox-compatible)

### Type Safety

- [ ] Run `npm run typecheck` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm test` - all tests pass

---

## Files Summary

| File | Action | Risk |
|------|--------|------|
| `src/types/appConcept.ts` | Add optional fields | None |
| `src/types/dynamicPhases.ts` | Add domain values | None |
| `src/prompts/wizardSystemPrompt.ts` | Add questions | None |
| `src/prompts/full-app/fullstack-rules-compressed.ts` | Conditional rules | Low |
| `src/prompts/builder.ts` | Add test instructions | None |
| `src/services/BackendArchitectureAgent.ts` | Read preferences | None |
| `src/services/DynamicPhaseGenerator.ts` | Add phase logic | None |
| `src/utils/codeValidator.ts` | Add validation | None |
| `src/app/api/ai-builder/full-app/generation-logic.ts` | Adjust budgets | None |

---

---

## Gemini Review Cross-Reference

### Gemini's Claims vs. Actual Codebase

| Claim | Gemini's Assessment | Actual Status | Evidence |
|-------|---------------------|---------------|----------|
| **Split-Brain Problem** | "No mechanism to pass backend output" | **PARTIALLY INCORRECT** | `architectureContext` in PhaseExecutionManager (lines 826-857) passes Prisma schema and API routes |
| **Context Amnesia** | "No pin list for critical files" | **VERIFIED** | CodeContextService has no explicit pinning for database.d.ts or schema files |
| **Dormant Compiler** | "No validation before writing" | **DISPROVEN** | TypeScriptCompilerService exists and is called in generation-logic.ts (lines 621-672) |
| **Replace Trap** | "Only whole-file replacement" | **DISPROVEN** | modify/route.ts has 10+ surgical AST operations; astModifier.ts is comprehensive |
| **Weak Database State** | "No schema tracking" | **PARTIALLY VERIFIED** | Schema extracted but migration has TODOs; not comprehensively injected |
| **Missing Integration Test** | "No verification phase" | **DISPROVEN** | P9 regression testing, API contract validation, type compatibility all exist |

### Valid Issues from Gemini (To Address)

1. **Context Amnesia (Issue 2)** - VALID
   - CodeContextService lacks "pin list" for critical schema files
   - Files selected by token budget, not dependency importance
   - **Fix:** Add pinned files list for `database.d.ts`, `schema.prisma`, `types/index.ts`

2. **Weak Database State (Issue 5)** - PARTIALLY VALID
   - Migration service has `// TODO` comments for actual execution
   - Schema not comprehensively injected into ALL prompts
   - **Fix:** Inject schema summary into every phase context

### Incorrect Claims from Gemini (No Action Needed)

1. **Dormant Compiler** - TypeScriptCompilerService IS implemented and used
2. **Replace Trap** - Surgical AST edits ARE available and encouraged in prompts
3. **Missing Integration Test** - P9 regression testing EXISTS in PhaseExecutionManager
4. **Split-Brain** - architectureContext DOES pass backend schemas to frontend

### Gemini's "Safe Mode" Implementation Plan

**Their proposed changes:**
1. `BuilderService.ts` - Add `validationLevel` parameter ✅ Good idea
2. `CodeContextService.ts` - Add pin list and soft loading ✅ Good idea
3. Fork context strategy for Layout Builder vs Full Stack ✅ Already addressed in our Fix 4

**Compatibility concerns they raised (and my response):**
- Layout Builder needs `validationLevel: 'loose'` → Already covered in our Fix 4 (conditional rules)
- Wizard may not have database.d.ts yet → Soft loading (check `fileExists` first)
- Tool Use could break Layout Builder → Only apply to modify route, not layout chat

---

## Additional Fixes from Gemini Review

### Fix 11: Add Pin List for Critical Files

**Status:** SAFE ✓ (addresses Gemini's valid "Context Amnesia" concern)

**Files to Modify:**
- `src/services/CodeContextService.ts` - Add pinned files

**Changes:**

```typescript
// src/services/CodeContextService.ts - ADD pinned files constant

const PINNED_FILES = [
  'src/types/database.d.ts',
  'src/types/index.ts',
  'prisma/schema.prisma',
  'supabase/schema.sql',
  'src/lib/db.ts',
];

// MODIFY getMinimalContext() to always include pinned files first
getMinimalContext(maxTokens: number = 8000): CodeContextSnapshot {
  const selected: SelectedFile[] = [];
  let usedTokens = 0;

  // FIRST: Always include pinned files if they exist
  for (const pinnedPath of PINNED_FILES) {
    const content = this.state.files.get(pinnedPath);
    if (content) {
      const tokens = estimateTokens(content);
      if (usedTokens + tokens <= maxTokens * 0.3) { // Reserve 30% for pinned
        selected.push({
          path: pinnedPath,
          content,
          relevanceScore: 1.0, // Max relevance
          category: 'pinned-schema',
        });
        usedTokens += tokens;
      }
    }
  }

  // THEN: Fill remaining budget with type files
  const typeFiles = this.getFilesByType(['type-definition']);
  // ... rest of existing logic
}
```

**Why Safe:**
- Only ADDS prioritization logic
- Existing file selection unchanged
- Soft loading (checks if file exists)

### Fix 12: Complete Database Migration Service

**Status:** SAFE ✓ (addresses Gemini's valid "Weak State" concern)

**Files to Modify:**
- `src/services/deployment/DatabaseMigrationService.ts` - Complete TODO

**Changes:**

```typescript
// src/services/deployment/DatabaseMigrationService.ts
// Replace TODO with actual implementation or clear fallback

private async executeMigration(
  schema: TableSchema[],
  data: Record<string, Record<string, unknown>[]>,
  connectionUrl: string,
  targetProvider: DatabaseProvider,
  options?: MigrationOptions
): Promise<{ rowsMigrated: number }> {

  // For local development without real DB connection
  if (!connectionUrl || connectionUrl.includes('placeholder')) {
    console.log('[Migration] No database configured - generating SQL only');
    const sql = this.generateSQL(schema, targetProvider);

    // Write SQL to file for manual execution
    return { rowsMigrated: 0, generatedSQL: sql };
  }

  // For real database connections
  // ... actual Prisma/SQL execution
}
```

**Why Safe:**
- Graceful fallback for local development
- Doesn't break existing flow
- Adds capability without removing

### Fix 13: Add Validation Level to BuilderService

**Status:** SAFE ✓ (addresses Gemini's Layout Builder concern)

**Files to Modify:**
- `src/services/BuilderService.ts` (if exists, or equivalent file writing logic)

**Changes:**

```typescript
// Add validation options interface
interface WriteOptions {
  skipValidation?: boolean;       // Default false
  validationLevel?: 'strict' | 'loose' | 'syntax-only';
  source?: 'full-stack' | 'layout-builder' | 'wizard';
}

async saveFile(path: string, content: string, options: WriteOptions = {}) {
  // Layout Builder: syntax-only validation (allow type errors for draft code)
  // Full Stack Builder: strict validation (block on any error)
  // Wizard: skip validation (JSON specs, not code)

  if (options.source === 'layout-builder') {
    options.validationLevel = options.validationLevel || 'syntax-only';
  } else if (options.source === 'full-stack') {
    options.validationLevel = options.validationLevel || 'strict';
  }

  if (!options.skipValidation && options.validationLevel !== 'syntax-only') {
    const result = await this.validate(content, path, options.validationLevel);
    if (!result.valid && options.validationLevel === 'strict') {
      throw new ValidationError(result.errors);
    }
  }

  // ... write file
}
```

**Why Safe:**
- Adds options, doesn't change defaults
- Layout Builder continues to work
- Full Stack gets stricter validation

---

## Updated Files Summary

| File | Action | Risk | Source |
|------|--------|------|--------|
| `src/types/appConcept.ts` | Add optional fields | None | My analysis |
| `src/types/dynamicPhases.ts` | Add domain values | None | My analysis |
| `src/prompts/wizardSystemPrompt.ts` | Add questions | None | My analysis |
| `src/prompts/full-app/fullstack-rules-compressed.ts` | Conditional rules | Low | My analysis |
| `src/prompts/builder.ts` | Add test instructions | None | My analysis |
| `src/services/BackendArchitectureAgent.ts` | Read preferences | None | My analysis |
| `src/services/DynamicPhaseGenerator.ts` | Add phase logic | None | My analysis |
| `src/utils/codeValidator.ts` | Add validation | None | My analysis |
| `src/app/api/ai-builder/full-app/generation-logic.ts` | Adjust budgets | None | My analysis |
| `src/services/CodeContextService.ts` | Add pin list | None | **Gemini** |
| `src/services/deployment/DatabaseMigrationService.ts` | Complete TODO | None | **Gemini** |
| `src/services/BuilderService.ts` | Add validation levels | None | **Gemini** |

---

## Additional Critical Issues (Verified)

### Fix 14: Phase Dependency Resolution Bug (CRITICAL)

**Location:** `src/services/DynamicPhaseGenerator.ts` (lines 433-444)

**The Bug:**
```typescript
private resolveBackendDependencies(
  dependencies: string[],
  existingPhases: DynamicPhase[],
  insertAfter: number
): number[] {
  return dependencies
    .map((depName) => {
      const found = existingPhases.find((p) => p.name.toLowerCase() === depName.toLowerCase());
      return found ? found.number : 1; // BUG: Default to phase 1 if not found
    })
    .filter((num) => num <= insertAfter + 1); // BUG: Filter silently removes dependencies
}
```

**Problem:**
1. Dependencies not found default to phase 1 (line 441)
2. Filter then removes phases past insertion point (line 443)
3. **Missing dependencies silently disappear** - no error thrown
4. Phases execute without required dependencies ready

**Fix:**
```typescript
private resolveBackendDependencies(
  dependencies: string[],
  existingPhases: DynamicPhase[],
  insertAfter: number
): number[] {
  const resolved: number[] = [];
  const missing: string[] = [];

  for (const depName of dependencies) {
    const found = existingPhases.find((p) => p.name.toLowerCase() === depName.toLowerCase());
    if (found) {
      if (found.number <= insertAfter + 1) {
        resolved.push(found.number);
      } else {
        // Dependency exists but hasn't run yet - reorder phases
        console.warn(`Dependency ${depName} (phase ${found.number}) runs after current phase`);
      }
    } else {
      missing.push(depName);
    }
  }

  if (missing.length > 0) {
    console.error(`Missing dependencies: ${missing.join(', ')}`);
    // Option: throw new Error(`Missing phase dependencies: ${missing.join(', ')}`);
  }

  return resolved;
}
```

---

### Fix 15: Type Checking Fail-Open Bug (CRITICAL)

**Location:** `src/services/PhaseExecutionManager.ts` (line 1946)

**The Bug:**
```typescript
async runPhaseTypeCheck(phaseNumber: number): Promise<TypeCheckResult> {
  try {
    // ... type checking logic ...
    return result;
  } catch (err) {
    console.error('Type checking failed:', err);
    return { success: true, errors: [], warnings: [] }; // BUG: Returns success on failure!
  }
}
```

**Problem:**
- When type checking crashes, it returns `success: true`
- Caller thinks code is valid when it may have TypeScript errors
- Same pattern found in:
  - Type compatibility check (lines 1993-1996)
  - Smoke tests (lines 2024-2034)
  - Regression tests (lines 2157-2164)

**Fix:**
```typescript
async runPhaseTypeCheck(phaseNumber: number): Promise<TypeCheckResult> {
  try {
    // ... type checking logic ...
    return result;
  } catch (err) {
    console.error('Type checking failed:', err);
    // FIXED: Return failure, not success
    return {
      success: false,
      errors: [{
        code: 'TYPE_CHECK_CRASH',
        message: `Type checking crashed: ${err instanceof Error ? err.message : String(err)}`,
        file: 'unknown',
        line: 0
      }],
      warnings: []
    };
  }
}

// Apply same fix to:
// - checkTypeCompatibility (line 1993-1996)
// - runSmokeTests (line 2024-2034)
// - runRegressionTests (line 2157-2164)
```

---

### Fix 16: Post-Generation Architecture Verification (HIGH)

**Location:** Missing entirely - needs to be added

**The Problem:**
- ArchitectureSpec defines: API routes, database tables, auth requirements
- Code is generated based on this spec
- **No verification** that generated code actually matches the spec
- API routes may not exist, database schema may differ, auth may be missing

**Fix:** Add verification after code generation

```typescript
// src/services/PhaseExecutionManager.ts - ADD new method

async verifyArchitectureImplementation(): Promise<ArchitectureVerificationResult> {
  if (!this.plan.architectureSpec) {
    return { verified: true, issues: [] };
  }

  const issues: string[] = [];
  const spec = this.plan.architectureSpec;

  // 1. Verify API routes exist
  if (spec.api?.routes) {
    for (const route of spec.api.routes) {
      const routeFile = this.rawGeneratedFiles.find(f =>
        f.path.includes(`api/${route.path}`) || f.path.includes(`app/api/${route.path}`)
      );
      if (!routeFile) {
        issues.push(`Missing API route: ${route.method} ${route.path}`);
      } else {
        // Check for HTTP method export
        if (!routeFile.content.includes(`export async function ${route.method}`)) {
          issues.push(`API route ${route.path} missing ${route.method} handler`);
        }
      }
    }
  }

  // 2. Verify Prisma schema matches
  if (spec.database?.tables) {
    const schemaFile = this.rawGeneratedFiles.find(f => f.path.includes('schema.prisma'));
    if (schemaFile) {
      for (const table of spec.database.tables) {
        if (!schemaFile.content.includes(`model ${table.name}`)) {
          issues.push(`Missing database model: ${table.name}`);
        }
      }
    }
  }

  // 3. Verify auth is applied (if required)
  if (spec.auth?.strategy) {
    const apiFiles = this.rawGeneratedFiles.filter(f => f.path.includes('/api/') && !f.path.includes('auth'));
    for (const file of apiFiles) {
      if (!file.content.includes('requireAuth') && !file.content.includes('getServerSession')) {
        issues.push(`API route ${file.path} may be missing authentication`);
      }
    }
  }

  return {
    verified: issues.length === 0,
    issues
  };
}
```

---

### Fix 17: Replace Regex Parsing with AST (MEDIUM)

**Location:** `src/app/api/ai-builder/full-app/generation-logic.ts` (lines 273-310, 561-567)

**The Problem:**
```typescript
// Current: Regex-based brace counting (unreliable)
const openBraces = (file.content.match(/{/g) || []).length;
const closeBraces = (file.content.match(/}/g) || []).length;
```

This fails for: `const obj = { nested: {} }; // comment with }`

**Fix:** Use existing AST utilities

```typescript
// Use treeSitterParser.ts instead of regex
import { parseCode, validateSyntax } from '@/utils/treeSitterParser';

function detectTruncation(file: { path: string; content: string }): TruncationResult {
  try {
    const result = validateSyntax(file.content, file.path);
    return {
      isTruncated: !result.valid,
      reason: result.errors.join('; ')
    };
  } catch (err) {
    // Fallback to simpler check if AST parsing fails
    return {
      isTruncated: !file.content.trim().endsWith('}') && !file.content.trim().endsWith(';'),
      reason: 'Could not parse with AST, using heuristic'
    };
  }
}
```

---

### Fix 18: Auth Not Propagated to API Routes (CRITICAL)

**Location:** `src/prompts/full-app/backend-templates.ts` (lines 15-174)

**The Problem:**
- AUTH_TEMPLATE provides `requireAuth()` helper but no example of using it
- Generated API routes don't automatically include auth checks
- APIs are left unprotected even when `needsAuth: true`

**Fix:** Update AUTH_TEMPLATE with protected route examples

```typescript
// src/prompts/full-app/backend-templates.ts - UPDATE AUTH_TEMPLATE

export const AUTH_TEMPLATE = `
### NextAuth.js Implementation

When authentication is required, include these files:

===FILE:app/api/auth/[...nextauth]/route.ts===
// ... existing NextAuth config ...

===FILE:lib/auth.ts===
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

// For API routes (returns 401 instead of redirect)
export async function requireAuthAPI() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

===FILE:PROTECTED_API_ROUTE_EXAMPLE===
// IMPORTANT: Apply this pattern to ALL generated API routes when auth is enabled

import { requireAuthAPI } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await requireAuthAPI(); // ← ALWAYS include this
    const userId = session.user.id;

    // ... your route logic here ...

    return NextResponse.json({ data });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

### CRITICAL INSTRUCTION FOR AI:
When \`needsAuth: true\`, EVERY generated API route (except /api/auth/*) MUST:
1. Import requireAuthAPI from '@/lib/auth'
2. Call await requireAuthAPI() at the start of the handler
3. Handle the Unauthorized error with 401 response
`;
```

---

## Updated Files Summary

| File | Action | Risk | Source |
|------|--------|------|--------|
| `src/types/appConcept.ts` | Add optional fields | None | My analysis |
| `src/types/dynamicPhases.ts` | Add domain values | None | My analysis |
| `src/prompts/wizardSystemPrompt.ts` | Add questions | None | My analysis |
| `src/prompts/full-app/fullstack-rules-compressed.ts` | Conditional rules | Low | My analysis |
| `src/prompts/builder.ts` | Add test instructions | None | My analysis |
| `src/services/BackendArchitectureAgent.ts` | Read preferences | None | My analysis |
| `src/services/DynamicPhaseGenerator.ts` | Fix dependency bug + add phases | **Medium** | **New Issue** |
| `src/utils/codeValidator.ts` | Add validation | None | My analysis |
| `src/app/api/ai-builder/full-app/generation-logic.ts` | Adjust budgets + fix regex | **Medium** | **New Issue** |
| `src/services/CodeContextService.ts` | Add pin list | None | Gemini |
| `src/services/deployment/DatabaseMigrationService.ts` | Complete TODO | None | Gemini |
| `src/services/BuilderService.ts` | Add validation levels | None | Gemini |
| `src/services/PhaseExecutionManager.ts` | Fix fail-open + add verification | **High** | **New Issue** |
| `src/prompts/full-app/backend-templates.ts` | Add protected route pattern | **Medium** | **New Issue** |

---

## Two Workflow Architecture

### Workflow 1: Guided Path (Wizard → Design → Build → Builder)
```
/app/wizard → /app/design → /app/build → /app
     ↓              ↓             ↓          ↓
NaturalConversation  Layout    Phase      Main
   Wizard           Builder   Execution  Builder
```
- Creates structured `AppConcept` through conversation
- Optionally generates `ArchitectureSpec` via "Analyze Architecture" button
- Pre-generates `DynamicPhasePlan` with backend phases
- All data flows through Zustand store

**Files involved:**
- `src/app/(protected)/app/wizard/page.tsx` - Entry point
- `src/components/NaturalConversationWizard.tsx` - Concept building
- `src/components/LayoutBuilderWizard.tsx` - Visual layout
- `src/app/(protected)/app/build/page.tsx` - Phase execution
- `src/components/MainBuilderView.tsx` - Final builder

### Workflow 2: Direct Builder (Skip Everything)
```
/app (directly) → MainBuilderView
```
- **No prerequisites** - works WITHOUT appConcept, dynamicPhasePlan, or layoutDesign
- User builds incrementally via chat conversation
- Concept created on-the-fly during chat
- No architecture analysis, no pre-planned phases
- Full flexibility, less structure

**Files involved:**
- `src/app/(protected)/app/page.tsx` - Direct entry
- `src/components/MainBuilderView.tsx` - Handles everything

### Critical Compatibility Requirements

| Store Key | Workflow 1 | Workflow 2 | Fix Impact |
|-----------|------------|------------|------------|
| `appConcept` | Populated by wizard | **null** (built via chat) | Must remain OPTIONAL |
| `dynamicPhasePlan` | Pre-generated | **null** (on-demand) | Must remain OPTIONAL |
| `architectureSpec` | Generated if button clicked | **null** (never generated) | Must remain OPTIONAL |
| `currentLayoutDesign` | Created in LayoutBuilder | **null** (skipped) | Must remain OPTIONAL |

---

## Breaking Changes Analysis (Safety Review)

### ✅ SAFE FIXES (No Breaking Changes)

| Fix | Status | Reason |
|-----|--------|--------|
| **1. Backend requirements** | ✅ SAFE | All fields optional; existing code uses `??` and optional chaining |
| **2. Tech stack configurable** | ✅ SAFE | Optional fields with fallback defaults |
| **3. Architecture gate** | ✅ ALREADY EXISTS | "Analyze Architecture" button already implemented |
| **4. Sandbox constraints** | ✅ SAFE | Conditional prompts; no type changes |
| **6. Dynamic templates** | ✅ SAFE | `getBackendTemplates()` already uses conditional logic |
| **7. Deployment phase** | ✅ SAFE | No hardcoded phase limits (maxPhases: 30) |
| **8. Token budget** | ✅ SAFE | Modular budget object; no breaking callers |
| **9. Backend integrity P10+** | ✅ SAFE | Phase system uses dynamic Maps, no enumeration |
| **10. Test generation** | ✅ SAFE | Additive prompt changes only |
| **11. Context pinning** | ✅ SAFE | Optional field + new methods |
| **12. Database migration** | ✅ SAFE | Completing private methods; public API unchanged |
| **16. Architecture verification** | ✅ SAFE | Additive step after generation |
| **18. Auth propagation** | ✅ SAFE | Adding example patterns to templates |

### ⚠️ CRITICAL BREAKING CHANGES DETECTED

#### Fix 5: Add Backend Validation Phases (`devops`, `monitoring`)

**WILL BREAK TypeScript compilation** unless these files are also updated:

| File | Line | Issue | Required Fix |
|------|------|-------|--------------|
| `src/types/dynamicPhases.ts` | 27-45 | `FeatureDomain` type missing new values | Add `'devops' \| 'monitoring'` to union |
| `src/services/DynamicPhaseGenerator.ts` | 1103-1122 | `domainNames` Record missing entries | Add `devops: 'DevOps & Infrastructure', monitoring: 'Monitoring & Observability'` |
| `src/services/DynamicPhaseGenerator.ts` | 1472-1506 | Switch statement missing cases | Add case handlers for new domains |
| `src/services/DynamicPhaseGenerator.ts` | 974-987 | `domainPriority` array incomplete | Add new domains to priority ordering |
| `src/services/phaseContextExtractor.ts` | 48 | `PHASE_TOPICS` Record missing entries | Add entries for new domains |
| `src/services/phaseContextExtractor.ts` | 72 | `PHASE_QUERIES` Record missing entries | Add entries for new domains |

#### Fix 13: Validation Levels (BuilderService.ts)

**REQUIRES CLARIFICATION:** Add NEW methods only, don't modify existing signatures.

#### Fix 15: Type Checking Fail-Open

**BEHAVIOR CHANGE:** Changing `success: true` to `success: false` on crash will cause phases to fail instead of silently pass. Need to add error handling in callers first.

#### Fix 17: Regex Parsing Instead of AST

**REMOVED FROM PLAN:** The regex parses AI response delimiters (`===NAME===`), not code syntax. AST tools don't apply here.

---

## Implementation Order

**Phase 1 - Safe Additions (No Breaking Changes)**
*These only affect Workflow 1 (Wizard path) - Workflow 2 (Direct) unaffected*
1. Fix 1: Add optional backend requirement fields
2. Fix 2: Add optional tech stack preferences
3. Fix 4: Make fullstack rules conditional
4. Fix 6: Enhance dynamic template generation
5. Fix 11: Add context pinning
6. Fix 18: Add protected route patterns

**Phase 2 - Coordinated Changes (Must Update Multiple Files)**
*Affects both workflows - must ensure null-safe access*
1. Fix 5: Add new FeatureDomain values (update 6 files atomically)
2. Fix 7: Add deployment phase generation
3. Fix 9: Add P10+ integrity checks
4. Fix 10: Add test generation instructions

**Phase 3 - Behavior Changes (Require Careful Testing)**
*Test BOTH workflows after each change*
1. Fix 14: Fix dependency resolution silent failure
2. Fix 15: Fix type check fail-open (add error handling first)
3. Fix 12: Complete database migration TODO

**Phase 4 - UI Enhancements (Workflow 1 Only)**
1. Fix 3: Make architecture button more prominent
2. Fix 8: Adjust token budgets

**Removed:**
- Fix 17: Invalid (regex is correct for delimiter parsing)

---

## Verification Plan

### Workflow 1 Tests (Guided Path)
1. Complete wizard conversation → verify AppConcept created
2. Click "Analyze Architecture" → verify ArchitectureReviewPanel shows
3. Proceed to phases → verify DynamicPhasePlan includes backend phases
4. Navigate to /app/build → verify store has concept and plan
5. Start building → verify PhaseExecutionManager receives context
6. Request "SaaS with auth" → verify backend code generated

### Workflow 2 Tests (Direct Builder)
1. Navigate to /app directly → verify MainBuilderView loads
2. Verify no errors with null appConcept, null phasePlan
3. Request "build me a todo app" → verify code generates
4. Verify concept builds incrementally from chat
5. Verify full-stack requests work without ArchitectureSpec

### Both Workflows
1. Run `npm run typecheck` - must pass
2. Run `npm run lint` - must pass
3. Run `npm test` - all tests pass
4. Verify Sandpack preview works for frontend-only apps

---

## Analysis Metadata

- **Date:** 2026-01-22 (Updated)
- **Based on:** ai-builder-fullstack-analysis.md
- **Cross-referenced:** Gemini's review (6 claims verified)
- **Workflows verified:**
  - Workflow 1: NaturalConversationWizard → LayoutBuilder → AIBuilder
  - Workflow 2: Direct MainBuilderView access
- **Breaking changes found:** 4 (Fix 5, 13, 15, 17)
- **Fixes removed:** 1 (Fix 17 - invalid)
- **Gemini claims verified:** 2 valid, 4 incorrect or partially incorrect
