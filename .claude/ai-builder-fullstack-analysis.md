# AI App Builder Full-Stack Limitations Analysis

## Executive Summary

The AI builder has **infrastructure for full-stack development** but suffers from critical gaps in **data collection**, **proactive planning**, and **hardcoded technology constraints** that prevent it from building production-quality full-stack applications.

---

## Verified Critical Issues

### Issue 1: Incomplete Backend Requirements Collection

**Location:** `src/components/NaturalConversationWizard.tsx`, `src/app/api/wizard/chat/route.ts`, `src/prompts/wizardSystemPrompt.ts`

**What the wizard DOES collect:**
- Boolean flags: `needsAuth`, `needsDatabase`, `needsAPI`, `needsFileUpload`, `needsRealtime`
- Auth type: `'simple' | 'email' | 'oauth'`
- Data models: `DataModel[]` with field names, types, and constraints
- API endpoints: `string[]` (just names)
- State complexity: `'simple' | 'moderate' | 'complex'`
- I18n languages: `string[]`

**What the wizard NEVER collects:**
| Category | Missing Data |
|----------|--------------|
| **Scale** | User count, concurrent users, data volume, throughput requirements |
| **Infrastructure** | Hosting provider, cloud vs on-prem, deployment target, CDN needs |
| **Database Choice** | SQL vs NoSQL, PostgreSQL vs MongoDB, scaling strategy |
| **Security/Compliance** | GDPR, HIPAA, SOC2, encryption requirements, audit logging |
| **API Design** | REST vs GraphQL vs tRPC, versioning strategy, rate limiting |
| **Integrations** | Third-party services (Stripe, Twilio, SendGrid), OAuth providers |
| **Monitoring** | Logging, tracing, error tracking, observability requirements |
| **Performance** | Latency SLAs, uptime requirements, caching strategy |

**Impact:** Backend architecture is INFERRED, not PLANNED with the user.

---

### Issue 2: Hardcoded Technology Stack (Zero Flexibility)

**Location:** `src/services/BackendArchitectureAgent.ts` (lines 29-56)

The `BackendArchitectureAgent` system prompt explicitly states these are **REQUIRED**:

```typescript
## Technology Stack (REQUIRED)
- **Database**: SQLite with Prisma ORM
- **API**: Next.js API Routes (REST)
- **Auth**: NextAuth.js
- **Real-time**: Server-Sent Events
- **File Storage**: Local filesystem
```

**What CANNOT be generated:**
| Category | Hardcoded | Cannot Generate |
|----------|-----------|-----------------|
| Framework | Next.js 15 | Express, Fastify, NestJS, Django, Rails |
| ORM | Prisma | Drizzle, TypeORM, Mongoose, raw SQL |
| Auth | NextAuth.js | Clerk, Auth0, Supabase Auth, Firebase Auth |
| Real-time | SSE | WebSockets, Socket.io, Pusher |
| API Style | REST | GraphQL, tRPC, gRPC |
| Database | SQLite | PostgreSQL, MongoDB, MySQL (direct) |
| CSS | Tailwind | CSS Modules, Styled Components |
| State | Zustand | Redux, Jotai, MobX |

---

### Issue 3: Static Backend Templates

**Location:** `src/prompts/full-app/backend-templates.ts`

The system has **TWO-TIER** backend code generation:

1. **PRIMARY (ArchitectureSpec):** AI generates custom architecture per-app
2. **FALLBACK (Static Templates):** Pre-written template strings if no architecture spec

**Static templates include:**
- `AUTH_TEMPLATE` (lines 15-174) - Hardcoded NextAuth.js boilerplate
- `FILE_UPLOAD_TEMPLATE` (lines 180-346) - Hardcoded local/S3 upload
- `REALTIME_TEMPLATE` (lines 352-467) - Hardcoded SSE implementation
- `DATABASE_SEED_TEMPLATE` (lines 473-522) - Hardcoded Prisma seed
- `I18N_TEMPLATE` (lines 528-660) - Hardcoded next-intl setup

**Selection logic in `builder.ts` (lines 131-139):**
```typescript
if (architectureSpec) {
  backendContext = formatArchitectureSpec(architectureSpec); // AI-generated
} else if (techStack) {
  backendContext = getBackendTemplates(techStack); // Static fallback
}
```

**Impact:** Same boilerplate code regardless of app complexity or requirements.

---

### Issue 4: No Backend Code Validation

**Location:** `src/utils/codeValidator.ts`

**What IS validated:**
- JavaScript/TypeScript syntax (Tree-sitter AST parsing)
- JSX tag balance
- String completion
- Brace matching

**What is NOT validated:**
- Prisma schema correctness
- Database migration validity
- API route functionality
- Authentication flow logic
- Database query correctness
- Type safety across API boundaries

**Impact:** Generated backend code passes syntax checks but may fail at runtime.

---

### Issue 5: Preview Sandbox Constraints Contaminate Full-Stack Code

**Location:** `src/prompts/full-app/frontend-rules-compressed.ts`, `src/prompts/full-app/fullstack-rules-compressed.ts`

To work in the Sandpack preview, full-stack apps must:
- Add `'use client'` directive (can't use RSC data fetching)
- NO async Server Components (causes preview errors)
- NO Next.js Link/Image/useRouter components
- Use mock data for preview, commented fetch() for production
- NO TypeScript interfaces in App.tsx

**Impact:** Code generated for preview doesn't represent production patterns.

---

### Issue 6: Architecture Generated AFTER Wizard (User Doesn't Plan Backend)

**Location:** `src/components/NaturalConversationWizard.tsx` (lines 196-202, 406-407)

**Verified Flow:**
1. User completes wizard conversation → AppConcept built
2. User clicks "Analyze Architecture" button (optional)
3. `BackendArchitectureAgent.analyze()` generates ArchitectureSpec
4. User sees `ArchitectureReviewPanel` with database/API/auth details
5. User can "Proceed to Phases" or "Regenerate"

**But critically:**
- Architecture decisions are made BY THE AI, not discussed with user
- Technology stack is locked before user sees anything
- Scalability assumptions are hardcoded ("100k+ users" - line 34 of BackendArchitectureAgent)
- No negotiation of infrastructure choices

---

### Issue 7: Token Budget Contention

**Location:** `src/app/api/ai-builder/full-app/generation-logic.ts` (lines 354-400)

**Token budgets (no backend/frontend split):**
| Phase | Max Tokens | Thinking Budget | Timeout |
|-------|------------|-----------------|---------|
| Foundation (Phase 1) | 48,000 | 24,000 | 6 min |
| Additive (Phase 2+) | 32,000 | 16,000 | 5 min |
| Small modifications | 24,000 | 12,000 | 3 min |

**Impact:** Backend code competes with frontend for the same token pool. Complex backends may get truncated.

---

### Issue 8: Missing Backend Phase Types

**Location:** `src/services/DynamicPhaseGenerator.ts`

**Phases that ARE auto-generated:**
- `database` - Schema, ORM, migrations
- `auth` - Authentication, authorization
- `integration` - External services
- `real-time` - SSE channels
- `storage` - File upload

**Phases that are NEVER auto-generated:**
| Missing Phase | What's Needed |
|---------------|---------------|
| **DevOps/Deployment** | Docker, CI/CD, environments, Vercel/AWS config |
| **Monitoring/Logging** | Error tracking, tracing, metrics, observability |
| **Testing Infrastructure** | Unit tests, integration tests, E2E setup |
| **Security Hardening** | Rate limiting, CORS, CSRF, input sanitization |
| **Performance Optimization** | Caching strategy, query optimization, indexing |
| **API Documentation** | OpenAPI/Swagger spec, endpoint docs |
| **Middleware** | Request validation, logging, error handling |

---

### Issue 9: Auto-Detection is Keyword-Based (Not Proactive)

**Location:** `src/services/DynamicPhaseGenerator.ts` (lines 118-200)

Backend features are detected by keyword matching in feature descriptions:
- "offline", "sync", "service worker" → `needsOfflineSupport`
- "remember", "learns", "adapts" → `needsContextPersistence`
- "undo", "redo", "draft" → `needsStateHistory`
- "third-party", "integration", "webhook" → integration domain

**Impact:** If user doesn't mention keywords, features aren't planned:
- User doesn't say "Stripe" → payment processing not discussed
- User doesn't say "monitoring" → observability not planned
- User doesn't mention "scaling" → performance requirements unknown

---

## Root Cause Analysis

### Cause 1: Visual Design Tool First, Backend Second
The system was designed as a **UI builder with backend bolted on**:
- Workflow: Collect idea → Design UI → Add backend if needed
- Should be: Collect requirements → Design architecture → Generate both

### Cause 2: Sandbox Preview Priority
Everything optimized for Sandpack preview which can't run:
- Server-side code
- Database connections
- Real authentication
- File uploads

### Cause 3: Complexity Avoidance
The wizard avoids "interrogating" users. But without detailed requirements, backend is guessed.

### Cause 4: Single Technology Stack Assumption
Hardcoded Next.js/Prisma/NextAuth means no adaptation to different project needs.

---

## What IS Working Well

**Positive findings:**
- `ArchitectureSpec` type is comprehensive (database, API, auth, realtime, storage, caching)
- `ArchitectureReviewPanel` shows user the generated architecture
- Phase dependency tracking works correctly
- RBAC and multi-role support exists
- Smart code context selection for multi-phase builds
- Phase integrity checks (P1-P9) for frontend code

---

## Recommended Fixes

### High Priority (Core Architecture)

| Fix | Location | Change |
|-----|----------|--------|
| **1. Add backend requirements phase** | `wizardSystemPrompt.ts` | Ask about scale, integrations, compliance, infrastructure |
| **2. Make tech stack configurable** | `BackendArchitectureAgent.ts` | Allow user to choose database, auth, API style |
| **3. Show architecture for approval** | `NaturalConversationWizard.tsx` | Present decisions before code generation |
| **4. Remove sandbox constraints for full-stack** | `fullstack-rules-compressed.ts` | Generate real Next.js patterns, not preview-compatible |
| **5. Add backend validation phases** | `DynamicPhaseGenerator.ts` | Test database, API, auth during phase execution |

### Medium Priority (Flexibility)

| Fix | Location | Change |
|-----|----------|--------|
| **6. Dynamic template generation** | `backend-templates.ts` | Generate auth/db code based on specific requirements |
| **7. Add deployment planning phase** | `DynamicPhaseGenerator.ts` | Generate Docker, CI/CD, environment configs |
| **8. Increase backend token budget** | `generation-logic.ts` | Reserve tokens specifically for backend complexity |

### Lower Priority (Quality)

| Fix | Location | Change |
|-----|----------|--------|
| **9. Add backend integrity checks** | `PhaseExecutionManager.ts` | P10+ for Prisma validation, API testing |
| **10. Generate tests for backend** | `builder.ts` | API tests, integration tests for generated code |

---

## Key Files to Modify

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `src/prompts/wizardSystemPrompt.ts` | Wizard conversation instructions | Add backend requirement questions |
| `src/types/appConcept.ts` | AppConcept type definition | Add scale, infrastructure, compliance fields |
| `src/services/BackendArchitectureAgent.ts` | Backend architecture generation | Make tech stack configurable |
| `src/prompts/full-app/backend-templates.ts` | Static backend templates | Dynamicize or remove |
| `src/services/DynamicPhaseGenerator.ts` | Phase planning | Add missing backend phases |
| `src/utils/codeValidator.ts` | Code validation | Add backend-specific validation |
| `src/prompts/full-app/fullstack-rules-compressed.ts` | Full-stack code rules | Remove preview constraints |

---

## Verification Plan

After implementing fixes:
1. Create a full-stack app request: "Build a SaaS with user auth, payment processing, and real-time collaboration"
2. Verify wizard asks about scale, compliance, integrations
3. Verify user can choose tech stack (not hardcoded)
4. Verify architecture is shown for approval before code generation
5. Verify backend code is validated (not just syntax)
6. Verify generated code includes DevOps, monitoring, testing phases
7. Run `npm run typecheck` and `npm run build` on generated code

---

---

## Workflow Compatibility Analysis

### Critical Data Flow (MUST NOT BREAK)

```
NaturalConversationWizard.tsx:287-395
    ↓ sendMessage() → /api/wizard/chat
    ← updatedState: WizardState

NaturalConversationWizard.tsx:415-442
    ↓ handleAction('start_building')
    → Creates AppConcept object
    → Calls onComplete(concept, phasePlan)

page.tsx:20-37 (wizard page)
    ↓ handleComplete()
    → store.setAppConcept(concept)
    → store.setDynamicPhasePlan(phasePlan)
    → router.push('/app/design')

/api/wizard/generate-phases:51-247
    ← POST with AppConcept
    → DynamicPhaseGenerator.generatePhasePlan()
    ← Returns DynamicPhasePlan with embedded concept

build/page.tsx
    ← Reads store.dynamicPhasePlan
    → useDynamicBuildPhases(dynamicPhasePlan)
    → PhaseExecutionManager executes phases
```

### REQUIRED Fields (Validation will FAIL without these)

| Field | Location | Why Required |
|-------|----------|--------------|
| `AppConcept.name` | generate-phases:66 | API returns 400 if missing |
| `AppConcept.coreFeatures[]` | generate-phases:75 | Must have length > 0 |
| `Feature.id` | DynamicPhaseGenerator | Phase ordering |
| `Feature.name` | DynamicPhaseGenerator | Phase naming |
| `Feature.description` | DynamicPhaseGenerator | Context for code gen |
| `Feature.priority` | DynamicPhaseGenerator | Phase ordering |

### OPTIONAL Fields (Auto-defaulted if missing)

| Field | Default Value |
|-------|---------------|
| `description` | `A ${concept.name} application` |
| `purpose` | `concept.description` or 'To be defined' |
| `targetUsers` | 'General users' |
| `technical.*` | `false` for all boolean flags |
| `uiPreferences.*` | System defaults |
| `architectureSpec` | Generated if `needsBackend` detected |

### Zustand Store Keys (CANNOT RENAME)

```typescript
store.appConcept        // Read by build page
store.dynamicPhasePlan  // Read by useDynamicBuildPhases
store.currentAppId      // Read by documentation tracking
```

---

## Safe Implementation Strategy

### Fix 1: Add backend requirements to wizard - SAFE ✓

**Change:** Update `wizardSystemPrompt.ts` to ask about scale, integrations, compliance

**Why Safe:**
- Only changes CONVERSATION prompts, not data structures
- New fields go into `technical` object which already exists
- `technical` fields default to `false` if not set
- No breaking changes to AppConcept type

**Implementation:**
```typescript
// Add to TechnicalRequirements type (appConcept.ts)
technical: {
  // Existing fields...
  needsAuth: boolean;
  needsDatabase: boolean;

  // NEW optional fields (won't break existing flow)
  scale?: 'small' | 'medium' | 'large' | 'enterprise';
  hostingPreference?: 'vercel' | 'aws' | 'self-hosted';
  complianceNeeds?: string[];
  integrationsNeeded?: string[];
}
```

### Fix 2: Make tech stack configurable - SAFE ✓

**Change:** Update `BackendArchitectureAgent.ts` to accept user preferences

**Why Safe:**
- `ArchitectureSpec` is OPTIONAL in AppConcept
- If not provided, system uses defaults (current behavior)
- New preferences stored in existing `technical` object
- BackendArchitectureAgent already reads from AppConcept.technical

**Implementation:**
```typescript
// Add to TechnicalRequirements (optional)
technical: {
  // NEW optional preferences
  preferredDatabase?: 'sqlite' | 'postgresql' | 'mongodb';
  preferredAuth?: 'nextauth' | 'clerk' | 'supabase';
  preferredApiStyle?: 'rest' | 'graphql' | 'trpc';
}

// BackendArchitectureAgent reads these and generates accordingly
// Falls back to current defaults if not specified
```

### Fix 3: Architecture approval already exists - NO CHANGE NEEDED ✓

**Finding:** `ArchitectureReviewPanel` already shows architecture for user approval

**Current Flow:**
1. User can click "Analyze Architecture"
2. `ArchitectureReviewPanel` displays database/API/auth details
3. User can "Proceed" or "Regenerate"

**No changes needed** - just ensure it's more prominent in UI

### Fix 4: Remove sandbox constraints for full-stack - SAFE WITH CARE ⚠️

**Change:** Update `fullstack-rules-compressed.ts` to generate real Next.js patterns

**Risk:** Preview will break for full-stack apps

**Safe Implementation:**
```typescript
// Add app type detection in generation-logic.ts
if (appType === 'FULL_STACK') {
  // Use production patterns (RSC, Link, Image)
  // Preview shows "Run locally for full experience" message
} else {
  // Keep sandbox-compatible patterns for FRONTEND_ONLY
}
```

**Why Safe:**
- Only affects code GENERATION prompts
- AppConcept structure unchanged
- Phase plan structure unchanged
- Preview gracefully degrades with message

### Fix 5: Add backend validation phases - SAFE ✓

**Change:** Add new phase types in `DynamicPhaseGenerator.ts`

**Why Safe:**
- Just adds NEW phase types to existing array
- Existing phases unchanged
- Phase execution already handles any phase type
- No changes to AppConcept or store

**Implementation:**
```typescript
// Add to FeatureDomain type (dynamicPhases.ts)
type FeatureDomain =
  | 'setup' | 'core' | 'data' | ...existing...
  | 'devops'      // NEW
  | 'monitoring'  // NEW
  | 'testing';    // NEW

// DynamicPhaseGenerator adds these phases when detected
```

### Fix 6-10: All safe - only ADD, never REMOVE

All remaining fixes:
- Add new optional fields to types
- Add new phase types
- Add new validation logic
- Add new token budget logic

**None remove or rename existing fields.**

---

## What MUST NOT Change

| Item | Reason |
|------|--------|
| `AppConcept.name` required | API validation fails |
| `AppConcept.coreFeatures[]` required | Phase generation fails |
| `Feature` structure | Phase ordering breaks |
| Store key `appConcept` | Build page breaks |
| Store key `dynamicPhasePlan` | Phase execution breaks |
| `DynamicPhasePlan.concept` embedding | Phase context lost |
| `onComplete(concept, phasePlan)` signature | Wizard→Builder handoff breaks |

---

## Analysis Metadata

- **Date:** 2026-01-21
- **Analyzed by:** Claude Opus 4.5
- **Files examined:** 25+ files across prompts, services, components, types, and API routes
- **Verification:** Triple-checked with separate Explore agents
- **Workflow compatibility:** Verified against NaturalConversationWizard → AIBuilder flow
- **Gemini cross-reference:** 2 claims valid, 4 incorrect (see fix plan for details)
