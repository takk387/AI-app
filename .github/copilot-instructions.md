# AI App Builder - Copilot Instructions

## Project Overview

Personal AI App Builder that generates complete React apps through natural conversation with Claude AI.

### 4-Step Page-Based Flow

1. **Wizard** (`NaturalConversationWizard.tsx` at `/app/wizard`) - Chat-based planning that builds an `AppConcept` through conversation with Claude
2. **Layout Builder** (`LayoutBuilderView.tsx` at `/app/design`) - Visual design mode with Gemini Vision layout analysis
3. **Review** (13 review components at `/app/review`) - Review concept, features, phases, layout before building
4. **Builder** (`MainBuilderView.tsx` at `/app`) - Titan Pipeline execution + Sandpack preview

### Core Data Flow

```
Step 1: /app/wizard → AppConcept + PhasePlan (via NaturalConversationWizard)
    ↓
Step 2: /app/design → LayoutManifest + DesignSpec (via LayoutBuilderView + Gemini Vision)
    ↓
Step 3: /app/review → User reviews all gathered data
    ↓
Step 4: /app → Titan Pipeline: Router → Surveyor → Photographer → Builder
    → Phase 1 auto-injects layout code
    → Phases 2+ use Claude AI via PhaseExecutionManager
    → Sandpack Preview + Version History
```

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **State:** Zustand 4.5 with Immer middleware (8 slices in `useAppStore.ts`)
- **AI:** Anthropic Claude SDK (Sonnet), Google GenAI SDK (Gemini 2.5 Flash/Pro for vision + image generation)
- **AI (Secondary):** OpenAI SDK (embeddings/proxy only - DALL-E removed)
- **Backend:** Next.js API Routes with SSE streaming
- **Database:** Supabase (PostgreSQL, Auth, Storage)
- **Parsing:** Tree-sitter for AST analysis, TypeScript Compiler API for semantic analysis

## Key Files & Architecture

### Orchestration Layer

| File                                           | Purpose                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `src/components/MainBuilderView.tsx`           | Main orchestrator (~1622 lines) - Titan Pipeline, phase control |
| `src/store/useAppStore.ts`                     | Central Zustand store (790 lines, 8 slices) - all shared state  |
| `src/components/NaturalConversationWizard.tsx` | Step 1 wizard - builds AppConcept via conversation              |
| `src/components/LayoutBuilderView.tsx`         | Step 2 - visual design with Gemini Vision                       |
| `src/services/TitanPipelineService.ts`         | Titan Pipeline orchestrator (~1074 lines)                       |
| `src/services/GeminiLayoutService.ts`          | Gemini Vision layout analysis + critique (~1364 lines)          |

### Services Layer (Stateless)

| Service                    | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `DynamicPhaseGenerator.ts` | Analyzes AppConcept → generates 3-25+ phases based on complexity        |
| `PhaseExecutionManager.ts` | Executes phases, builds context prompts, tracks accumulated code        |
| `CodeParser.ts`            | AST parsing with TypeScript Compiler API (exports, imports, components) |
| `CodeContextService.ts`    | Smart context extraction for phase execution (48KB window)              |

### Type Definitions (Large Files - Check Usages Before Modifying)

| Type File          | Size                                                                     | Purpose                                                                          |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `layoutDesign.ts`  | 41KB                                                                     | Complete design specification (colors, typography, spacing, components, effects) |
| `dynamicPhases.ts` | 634 lines                                                                | Phase planning types, feature classification, execution context                  |
| `appConcept.ts`    | Core planning types (features, workflows, roles, technical requirements) |

### API Routes Pattern

All AI routes in `src/app/api/ai-builder/`:

- `full-app-stream/` - SSE streaming for app generation
- `modify/` - Surgical code modifications (diff-based)
- `plan-phases/` - Phase plan generation
- `review/` - Code quality review

## Critical Patterns

### Zustand Store - MUST Use Shallow Comparison

```typescript
// ✅ CORRECT - useShallow for objects
import { useShallow } from 'zustand/react/shallow';
const { messages, isGenerating } = useAppStore(
  useShallow((state) => ({
    messages: state.messages,
    isGenerating: state.isGenerating,
  }))
);

// ✅ CORRECT - Single value (no shallow needed)
const messages = useAppStore((state) => state.messages);

// ❌ WRONG - Creates new object every render → infinite re-renders
const data = useAppStore((state) => ({ messages: state.messages }));
```

### Import Paths - Always Use @ Alias

```typescript
// ✅ CORRECT
import { useAppStore } from '@/store/useAppStore';
import type { LayoutDesign } from '@/types/layoutDesign';

// ❌ WRONG - Causes bundling issues, inconsistent resolution
import { useAppStore } from '../store/useAppStore';
```

### AST Code Modifications

```typescript
// ✅ CORRECT - Use ASTModifier class from astModifier.ts
const modifier = new ASTModifier(code);
await modifier.initialize();
modifier.addImport({ source: 'react', namedImports: ['useState'] });
const result = modifier.apply();

// ❌ WRONG - String manipulation misses edge cases
code.replace('function old', 'function new');
```

### SSE Streaming Pattern (All AI Routes)

```typescript
const stream = new TransformStream();
const writer = stream.writable.getWriter();
const encoder = new TextEncoder();

// Send events
await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'progress', ... })}\n\n`));

return new Response(stream.readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
});
```

### Services vs Hooks Separation

- **Services** (`src/services/`): Stateless, pure business logic, no React dependencies
- **Hooks** (`src/hooks/`): React state, side effects, call services

```typescript
// ✅ Service - stateless
export class DynamicPhaseGenerator {
  static generatePlan(concept: AppConcept): DynamicPhasePlan { ... }
}

// ✅ Hook - manages state, calls service
export function useDynamicBuildPhases() {
  const [plan, setPlan] = useState<DynamicPhasePlan | null>(null);
  const initializePlan = (concept) => setPlan(DynamicPhaseGenerator.generatePlan(concept));
  return { plan, initializePlan };
}
```

## Commands

```bash
npm run dev           # Start dev server
npm run dev:mock      # Mock AI mode (NEXT_PUBLIC_MOCK_AI=true) - no API calls
npm run dev:debug     # Debug panels (state inspector, API logs)
npm run typecheck     # TypeScript validation (MUST pass)
npm run lint          # ESLint (MUST pass)
npm run lint:fix      # Auto-fix lint issues
npm test              # Run core tests
npm run test:hooks    # Hook tests (JSDOM environment)
npm run test:services # Service tests (Node environment)
npm run test:all      # All tests including integration
```

## Testing Structure

| Environment | Location                                            | Purpose                        |
| ----------- | --------------------------------------------------- | ------------------------------ |
| Node        | `tests/**/*.test.ts`, `src/services/__tests__/`     | Services, utilities, API logic |
| JSDOM       | `src/hooks/__tests__/`, `src/components/__tests__/` | React hooks, components        |

**Mocks:** `tests/__mocks__/` for tree-sitter, js-tiktoken (native modules)

## Key Directories

| Directory                             | Purpose                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `src/services/`                       | Business logic (28+ services) - DynamicPhaseGenerator, CodeParser, etc. |
| `src/hooks/`                          | Custom hooks (30+) - useLayoutBuilder, useDynamicBuildPhases, etc.      |
| `src/store/`                          | Zustand store with 8 slices                                             |
| `src/types/`                          | TypeScript types (16 files) - layoutDesign.ts is 41KB                   |
| `src/utils/`                          | Utilities (40+) - astModifier.ts is 61KB for AST operations             |
| `src/prompts/`                        | AI system prompts organized by feature                                  |
| `src/data/`                           | Presets (animations, effects, templates, component patterns)            |
| `src/components/layout-builder/`      | Layout builder sub-components                                           |
| `src/components/conversation-wizard/` | Wizard sub-components                                                   |

## Before Making Changes

1. **Read the full file** before modifying - understand existing patterns
2. **Check dependencies:** `grep -r "functionName"` to find all usages before changing signatures
3. **Type changes to `layoutDesign.ts` or `dynamicPhases.ts`** affect many files - check all usages first
4. **API route changes** - verify SSE streaming pattern is preserved

## Validation Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] No `@ts-ignore` or `any` types added
- [ ] Zustand selectors use `useShallow` for object selections
- [ ] Services remain stateless (side effects go in hooks)
- [ ] Imports use `@/` alias

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon key
ANTHROPIC_API_KEY             # Claude API key (required)
GOOGLE_GENERATIVE_AI_API_KEY  # Gemini API key (vision, image generation)
OPENAI_API_KEY                # OpenAI (embeddings/proxy only)
NEXT_PUBLIC_MOCK_AI=true      # Enable mock mode for dev without API
NEXT_PUBLIC_DEBUG_PANEL=true  # Enable debug panels
```

## Additional Documentation

- `.claude/rules/` - Domain-specific rules (state-management, api-routes, testing, layout-builder, etc.)
- `.github/agents/` - Agent-specific documentation for different contexts
- `docs/ARCHITECTURE_ANALYSIS.md` - Complete architecture documentation
- `docs/TODO.md` - Technical debt and improvement plan

---

## Context & Memory System (Critical for Quality)

The system maintains full context across phases to ensure every detail from planning reaches code generation.

### Context Preservation Chain

```
AppConcept (wizard)     →  PhaseConceptContext  →  Phase Execution Prompt
LayoutDesign (builder)  →  formatLayoutDesignForPrompt()  →  Exact CSS/Tailwind values
Conversation History    →  compressConversation()  →  Summarized + Recent Messages
```

### Key Context Files

| File                                    | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `src/services/CodeContextService.ts`    | Smart context extraction with 48KB token window |
| `src/services/ContextCache.ts`          | Caches analysis to avoid recomputation          |
| `src/utils/contextCompression.ts`       | Token-aware compression preserving key details  |
| `src/utils/semanticMemory.ts`           | Cross-session memory with Supabase + embeddings |
| `src/services/PhaseExecutionManager.ts` | Builds phase prompts with full concept context  |

### Context Compression Strategy

```typescript
// contextCompression.ts - Preserves critical info while reducing tokens
interface ConversationSummary {
  projectDescription: string; // Core intent
  featuresBuilt: string[]; // What's been implemented
  userPreferences: string[]; // Style/technical preferences
  keyDecisions: string[]; // Important choices made
}

// Compression happens when messages exceed 6000 tokens
// Always preserves last 20 messages verbatim
```

### Phase Context Includes

- Full AppConcept (purpose, targetUsers, roles, workflows)
- Complete LayoutDesign with CSS variable mappings
- Previously generated files (accumulated code)
- Feature specifications and validation rules
- API contracts established in prior phases

### Smart Context Selection (CodeContextService)

```typescript
// Prioritizes context by relevance:
// 1. Files directly related to current phase
// 2. Type definitions used by the phase
// 3. Dependency chain files
// 4. Summaries of omitted files
```

---

## Prompt Engineering System (Quality Code Generation)

The prompt system ensures Claude generates production-ready code on the first pass.

### Prompt Structure

```
src/prompts/
├── builder.ts              # Main prompt builder (combines all sections)
├── quality-standards.ts    # Mandatory code quality rules
├── builderExpertPrompt.ts  # ACT mode intent detection
├── wizardSystemPrompt.ts   # PLAN mode natural conversation
├── layoutBuilderSystemPrompt.ts  # Visual design with vision
├── designTokenPrompt.ts    # Design token → CSS/Tailwind mapping
├── common/
│   ├── component-syntax.ts # React syntax rules (no nested functions)
│   └── response-format.ts  # Delimiter format (===FILE:path===)
├── full-app/
│   ├── frontend-rules-compressed.ts  # Frontend-only rules
│   └── fullstack-rules-compressed.ts # Full-stack rules
└── modify/
    ├── ast-operations-compressed.ts  # AST modification patterns
    └── examples-compressed.ts        # Modification examples
```

### Critical Quality Rules (quality-standards.ts)

```typescript
// Injected into ALL generation prompts:
// - React: No conditional hooks, always key props, complete dependency arrays
// - Security: No dangerouslySetInnerHTML without sanitization, no eval()
// - TypeScript: No `any` types, interfaces for all props
// - Completeness: No console.log, handle all loading/error states
```

### Design Token Preservation

```typescript
// PhaseExecutionManager.ts - formatLayoutDesignForPrompt()
// Converts LayoutDesign → exact CSS/Tailwind classes

// Example output in prompt:
'- Border Radius: lg → rounded-lg (CSS: 0.5rem)';
'- Primary: #3B82F6 → Use as bg-[#3B82F6] or var(--color-primary)';
'- Heading Weight: semibold → font-semibold (CSS: 600)';
```

### Response Format (Delimiters, not JSON)

```
===NAME=== Component Name
===DESCRIPTION=== Brief description
===FILE:src/App.tsx===
// Code here
===FILE:src/components/Header.tsx===
// More code
===END===
```

### Anti-Hallucination Rules

Every prompt includes:

```
- DO NOT invent or assume missing requirements
- DO NOT guess at undisclosed file contents
- If context seems incomplete, ask or implement simplest working version
- Only import from files shown in context
- Flag assumptions in code comments
```

### Prompt Modification Guidelines

1. **Token Budget**: Compressed prompts have strict token limits (~200-300 tokens each)
2. **Test Changes**: Prompt changes can break code generation - test thoroughly
3. **Preserve Delimiters**: Code parsing depends on exact delimiter format
4. **Quality Rules First**: Never remove security or React best-practice rules

---

## Feature Domain Classification (Phase Planning)

The system classifies features into domains to determine phase grouping and execution order.

### 17 Feature Domains (dynamicPhases.ts)

| Domain         | Purpose                                 | Actual Keywords (from PHASE_KEYWORDS)                                            |
| -------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `setup`        | Project structure, config, dependencies | setup, config, initialize, project, structure, dependencies, folder              |
| `database`     | Schema, ORM, migrations, seed data      | database, schema, table, field, relationship, model, data, constraint, migration |
| `auth`         | Authentication, authorization, sessions | login, register, password, role, permission, session, auth, jwt, oauth, user     |
| `core-entity`  | Main business objects                   | entity, model, object, core, main, primary, business                             |
| `feature`      | Standard app features                   | feature, functionality, user story, acceptance, validation, requirement          |
| `ui-component` | Reusable UI components                  | button, form, modal, component, ui, design, layout, responsive                   |
| `integration`  | External services                       | api, integration, webhook, external, service, third-party, endpoint              |
| `real-time`    | WebSocket, live updates                 | real-time, websocket, live, sync, push, instant, notification                    |
| `storage`      | File upload, media handling             | upload, file, image, storage, media, attachment, document                        |
| `notification` | Push, email, in-app notifications       | notification, alert, email, push, message, notify                                |
| `offline`      | Offline support, sync                   | offline, sync, local, cache, service worker, pwa                                 |
| `search`       | Search, filtering, indexing             | search, filter, query, find, autocomplete, index                                 |
| `analytics`    | Tracking, dashboards, reporting         | analytics, dashboard, chart, metric, report, visualization                       |
| `admin`        | Admin panels, moderation tools          | admin, manage, moderate, settings, configuration, control                        |
| `ui-role`      | Role-specific dashboards/views          | dashboard, view, role, access, permission, portal                                |
| `testing`      | Test setup, fixtures, mocks             | test, mock, fixture, assertion, coverage                                         |
| `polish`       | Animations, UX refinements              | animation, transition, loading, error, empty state, ux, feedback                 |

### Domain Classification Logic (DynamicPhaseGenerator.ts)

```typescript
// Features are classified by keyword matching in name + description
const PHASE_KEYWORDS: Record<FeatureDomain, string[]> = {
  auth: [
    'login',
    'register',
    'password',
    'role',
    'permission',
    'session',
    'auth',
    'jwt',
    'oauth',
    'user',
  ],
  database: [
    'database',
    'schema',
    'table',
    'field',
    'relationship',
    'model',
    'data',
    'constraint',
    'migration',
  ],
  // ... etc
};

// Classification affects:
// 1. Phase grouping (related domains can share a phase)
// 2. Execution order (setup → database → auth → entities → features → polish)
// 3. Token estimation (complex domains get more tokens)
```

### Domains That Always Get Separate Phases

```typescript
alwaysSeparateDomains: ['auth', 'database', 'real-time', 'offline', 'integration'];
// These domains are too complex to combine with other features
```

### Automatic Memory Infrastructure Detection

The system automatically detects when user apps need memory/state infrastructure and generates appropriate phases.

**TechnicalRequirements flags (appConcept.ts):**
| Flag | Purpose | Triggers Phase |
|------|---------|----------------|
| `stateComplexity: 'complex'` | Complex state with many interdependencies | State Management Setup |
| `needsStateHistory: true` | Undo/redo, drafts, action history | State Management Setup |
| `needsContextPersistence: true` | Cross-session memory, learning, preferences | Memory & Context System |
| `needsCaching: true` | Performance caching, memoization | Caching Layer |
| `needsOfflineSupport: true` | Offline-first, service workers | Offline Support |

**Auto-detection keywords (DynamicPhaseGenerator.ts):**

```typescript
// Memory/context indicators
const MEMORY_INDICATOR_KEYWORDS = [
  'remember',
  'memory',
  'recall',
  'learns',
  'adapts',
  'personalize',
  'conversation',
  'context',
  'previous',
  'preferences',
  'history',
];

// State complexity indicators
const STATE_COMPLEXITY_KEYWORDS = {
  complex: [
    'workflow',
    'wizard',
    'cart',
    'collaboration',
    'editor',
    'undo',
    'redo',
    'draft',
    'ai assistant',
    'chatbot',
    'learns',
  ],
  moderate: ['form', 'dashboard', 'settings', 'preferences', 'filter'],
};
```

**Static detection methods:**

```typescript
// Infer state complexity from features
DynamicPhaseGenerator.inferStateComplexity(features): 'simple' | 'moderate' | 'complex'

// Detect memory infrastructure needs
DynamicPhaseGenerator.detectMemoryNeeds(features, description): {
  needsContextPersistence: boolean;
  needsStateHistory: boolean;
  needsCaching: boolean;
}
```

### Phase Configuration Defaults

```typescript
{
  maxTokensPerPhase: 16000,    // Hard limit per phase
  targetTokensPerPhase: 5000,  // Optimal target
  maxFeaturesPerPhase: 4,      // Max features to combine
  minPhases: 2,                // Always at least setup + build
  maxPhases: 30,               // Upper bound
  complexityMultipliers: {
    simple: 1.0,     // Basic CRUD
    moderate: 1.5,   // Form validation, state management
    complex: 2.5     // Real-time, offline, integrations
  }
}
```

---

## Semantic Memory System (Cross-Session Context)

Enables memory persistence across sessions using Supabase with optional embeddings for semantic search.

### 11 Memory Types (semanticMemory.ts)

| Type             | Purpose                       | Detection Pattern                                 |
| ---------------- | ----------------------------- | ------------------------------------------------- |
| `preference`     | User preferences              | "I prefer...", "I like...", "I want..."           |
| `decision`       | Key decisions made            | "decided to...", "chose to...", "going with..."   |
| `project`        | Project descriptions          | "building a...", "app that...", "project for..."  |
| `feature`        | Built features                | "added...", "implemented...", "created..."        |
| `style`          | Design/styling preferences    | color names, "theme", "dark mode", "styling"      |
| `error_solution` | Bug fixes and solutions       | "fixed by...", "solution was...", "resolved..."   |
| `data_model`     | Database models/schemas       | "model", "schema", "entity", "table", "field"     |
| `workflow`       | User workflows and processes  | "workflow", "process", "step", "flow"             |
| `integration`    | External service integrations | "integrate", "connect", "API", service names      |
| `constraint`     | Business constraints/rules    | "must", "require", "constraint", "rule", "limit"  |
| `api_contract`   | API endpoint contracts        | "endpoint", "route", "API", "request", "response" |

### Memory Extraction Pipeline

```typescript
// 1. Extract from messages using regex patterns
const MEMORY_PATTERNS: Record<MemoryType, RegExp[]> = {
  preference: [/I prefer\s+(.+)/i, /I like\s+(.+)/i, /I want\s+(.+)/i],
  decision: [/decided to\s+(.+)/i, /chose to\s+(.+)/i, /going with\s+(.+)/i],
  // ... etc
};

// 2. Calculate importance (0-1 scale)
// - User messages weighted higher than assistant
// - Project/decision/constraint types have base importance boost

// 3. Generate embeddings for high-importance memories (> 0.6)
// - Enables semantic similarity search later

// 4. Store in Supabase with hierarchical organization
```

### Hierarchical Memory Organization

```typescript
type MemoryCategory =
  | 'app' // App-level context
  | 'feature' // Feature-specific context
  | 'ui' // UI/UX decisions
  | 'technical' // Code/architecture choices
  | 'workflow' // Process preferences
  | 'user'; // User-related context

type MemorySpecificity =
  | 'high' // Highly specific (applies to exact feature)
  | 'medium' // Moderately specific (applies to current project)
  | 'low'; // General (applies across projects)
```

### Memory Retrieval for Context

```typescript
// SemanticMemoryManager.recall() retrieves relevant memories:
// 1. Filter by project_id if scoped to project
// 2. Match by keywords (fast path)
// 3. Semantic search via embeddings (if available)
// 4. Score by importance + recency
// 5. Return top N most relevant memories

// Used in PhaseExecutionManager to inject prior context
```

### Database Schema (semantic_memories table)

```sql
CREATE TABLE semantic_memories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type memory_type NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  importance FLOAT DEFAULT 0.5,
  category memory_category,
  specificity memory_specificity,
  project_id UUID,
  embedding VECTOR(1536),  -- For semantic search
  created_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0
);
```
