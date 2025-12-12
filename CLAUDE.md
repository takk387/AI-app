# AI App Builder - Project Memory

## Overview

Personal AI App Builder - Build React components and apps using Claude AI with natural conversation, visual design, and full-stack support.

**Core Features:**

- Dual-mode AI system (PLAN mode for planning, ACT mode for building)
- AI-powered dynamic phase generation (2-25+ phases based on complexity)
- Visual layout builder with Claude vision capabilities
- AST-based surgical code modifications
- Version control and rollback system
- Cloud storage with Supabase integration

## Tech Stack

- **Frontend:** Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS
- **State:** Zustand 4.5 with Immer middleware
- **Backend:** Next.js API Routes with SSE streaming
- **Database:** Supabase (PostgreSQL, Auth, Storage)
- **AI:** Anthropic Claude SDK (Sonnet), OpenAI SDK (DALL-E 3)
- **Parsing:** Tree-sitter for AST analysis, js-tiktoken for tokens

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes (SSE streaming)
│   ├── login/, signup/     # Auth pages
│   └── layout.tsx, page.tsx
│
├── components/             # React components (60+ files)
│   ├── AIBuilder.tsx       # Main orchestrator (~1570 lines)
│   ├── NaturalConversationWizard.tsx  # PLAN mode wizard
│   ├── LayoutBuilderWizard.tsx        # Visual design mode
│   ├── layout-builder/     # Layout sub-components
│   ├── conversation-wizard/ # Planning sub-components
│   ├── modals/             # Modal dialogs
│   ├── build/              # Build UI components
│   └── ui/                 # Base UI components
│
├── hooks/                  # Custom hooks (30+ files)
│   ├── useLayoutBuilder.ts # Layout design state
│   ├── useAppStore.ts      # App store integration
│   ├── useDynamicBuildPhases.ts # Phase execution
│   └── __tests__/          # Hook tests
│
├── services/               # Business logic (25+ files)
│   ├── DynamicPhaseGenerator.ts  # AI phase planning
│   ├── PhaseExecutionManager.ts  # Phase orchestration
│   ├── CodeParser.ts       # AST parsing
│   └── analyzers/          # Specialized analyzers
│
├── store/                  # Zustand state
│   └── useAppStore.ts      # Central store (500+ lines, 8 slices)
│
├── types/                  # TypeScript types (16 files)
│   ├── layoutDesign.ts     # Design system (41KB)
│   ├── appConcept.ts       # Planning types
│   └── dynamicPhases.ts    # Phase types
│
├── utils/                  # Utilities (40+ files)
│   ├── astModifier.ts      # AST code editing (61KB)
│   ├── codeValidator.ts    # Syntax validation
│   └── designPatterns.ts   # Design patterns
│
├── prompts/                # AI system prompts
├── data/                   # Presets and templates
└── contexts/               # React Context providers
```

## Core Data Flow

```
User Input (NaturalConversationWizard)
    ↓
AppConcept object created
    ↓
DynamicPhaseGenerator → generates phase plan
    ↓
AIBuilder orchestrates (PLAN/ACT modes)
    ↓
PhaseExecutionManager → code generation
    ↓
Preview (Sandpack) + Version History
```

## Key Entry Points

| File                            | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `AIBuilder.tsx`                 | Main orchestrator, mode switching, phase control |
| `useAppStore.ts`                | Central state - all data flows through here      |
| `NaturalConversationWizard.tsx` | PLAN mode - builds AppConcept                    |
| `LayoutBuilderWizard.tsx`       | Visual design with AI vision                     |
| `DynamicPhaseGenerator.ts`      | Converts AppConcept → phase plan                 |
| `PhaseExecutionManager.ts`      | Executes phases, generates code                  |

## Essential Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier format
npm run typecheck    # TypeScript check
npm test             # Run all tests
npm run test:hooks   # Hook tests (JSDOM)
npm run test:services # Service tests (Node)
```

## Critical Warnings

### Don't Break These Dependencies

- `useAppStore.ts` ← Many components depend on this store
- `types/layoutDesign.ts` ← Layout builder types used everywhere
- `AIBuilder.tsx` ← Orchestrates all modes and phases
- `middleware.ts` ← Auth flow, all API routes depend on this

### Important Patterns

- All API routes use SSE streaming for AI responses
- Zustand selectors use shallow comparison - don't break this
- Tree-sitter is used for AST parsing - test changes carefully
- Component state lives in useAppStore, not local state

### File Relationships

- `NaturalConversationWizard` → creates `AppConcept` → feeds `DynamicPhaseGenerator`
- `LayoutBuilderWizard` → uses `useLayoutBuilder` hook → updates `layoutDesign` types
- `AIBuilder` → uses `useDynamicBuildPhases` → calls `PhaseExecutionManager`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
ANTHROPIC_API_KEY=            # Claude API key
OPENAI_API_KEY=               # DALL-E API key
```

## See Also

Check `.claude/rules/` for domain-specific documentation:

- `layout-builder.md` - Layout builder patterns
- `conversation-wizard.md` - Planning wizard flow
- `ai-builder-core.md` - Core orchestration
- `api-routes.md` - API patterns
- `state-management.md` - State patterns
- `testing.md` - Testing conventions
- `services-layer.md` - Context/parsing services
- `utilities.md` - Utility functions and AST

---

## How Claude Should Work With This Project

### Before Making Changes

1. **Read before editing** - Always read the full file before modifying. Understand existing patterns.
2. **Check dependencies** - Use grep to find all usages of functions/types before changing signatures.
3. **Understand the data flow** - Trace how data moves: AppConcept → PhaseGenerator → PhaseExecutionManager → Preview
4. **Respect existing patterns** - Match the style of surrounding code. Don't introduce new patterns without reason.

### When Modifying Code

- **useAppStore** - Always use shallow comparison with selectors. Never chain selectors.
- **Types** - Changes to `layoutDesign.ts` or `dynamicPhases.ts` affect many files. Check all usages first.
- **Services** - Services are stateless. Side effects happen in hooks. Keep this separation.
- **API Routes** - All AI routes use SSE streaming. Follow the existing pattern exactly.

### After Making Changes

1. Run `npm run typecheck` - Must pass with no errors
2. Run `npm run lint` - Fix any lint issues
3. Run `npm test` - All tests must pass
4. Test in browser if UI changes - Verify the change works visually

## Common Mistakes to Avoid

### Zustand Store

```typescript
// WRONG - Creates new object every render, causes infinite re-renders
const data = useAppStore((state) => ({ messages: state.messages }));

// CORRECT - Use shallow comparison
import { shallow } from 'zustand/shallow';
const data = useAppStore((state) => ({ messages: state.messages }), shallow);

// ALSO CORRECT - Select single value (no shallow needed)
const messages = useAppStore((state) => state.messages);
```

### Import Paths

```typescript
// WRONG - Inconsistent imports cause bundling issues
import { useAppStore } from '../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';

// CORRECT - Always use @ alias
import { useAppStore } from '@/store/useAppStore';
```

### Component State

```typescript
// WRONG - Local state for data that should be shared
const [messages, setMessages] = useState([]);

// CORRECT - Use Zustand for shared state
const messages = useAppStore((state) => state.messages);
const addMessage = useAppStore((state) => state.addMessage);
```

### Type Modifications

```typescript
// WRONG - Adding optional field without migration
interface LayoutDesign {
  newField: string; // Breaks existing data
}

// CORRECT - Optional with default handling
interface LayoutDesign {
  newField?: string; // Safe addition
}
// AND handle in code:
const value = layoutDesign.newField ?? 'default';
```

### AST Modifications

```typescript
// WRONG - String manipulation for code changes
code.replace('function old', 'function new');

// CORRECT - Use astModifier.ts utilities
import { modifyFunction } from '@/utils/astModifier';
const result = modifyFunction(code, 'old', { rename: 'new' });
```

## Current Development Focus

**Active Work Areas (check git status for latest):**

- `src/services/CodeContextService.ts` - Context extraction and caching
- `src/services/ContextCache.ts` - Cache management
- `src/utils/contextCompression.ts` - Token compression
- `src/utils/semanticMemory.ts` - Semantic caching
- `src/services/DynamicPhaseGenerator.ts` - Phase planning
- `src/types/dynamicPhases.ts` - Phase type definitions

**Current Goals:**

- Improve context compression for large apps
- Reduce token usage during phase execution
- Better cache invalidation strategies

**When working on these files:**

1. Check existing cache invalidation logic before adding new caches
2. Verify token count accuracy after compression changes
3. Run memory/performance tests after modifications

## Success Criteria

### For Any Code Change

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] No `@ts-ignore` or `any` types added
- [ ] No console.log statements left in code
- [ ] Code matches existing patterns in file

### For Component Changes

- [ ] UI renders correctly in browser
- [ ] No React warnings in console
- [ ] Responsive at all breakpoints
- [ ] Zustand selectors use shallow comparison

### For Service Changes

- [ ] Service remains stateless
- [ ] Error handling follows existing patterns
- [ ] Cache invalidation tested if caching added

### For Type Changes

- [ ] All usages updated
- [ ] Optional fields have default handling
- [ ] No breaking changes to existing data
