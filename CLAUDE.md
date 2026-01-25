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

### Quality Over Speed or Cost

**Prioritize accuracy and completeness over speed or cost savings. This applies to ALL requests.**

- When answering questions, ensure accuracy - verify before responding
- When making ANY change, find and update ALL occurrences - not 90%
- Use thorough searches (grep across entire codebase) before claiming something is complete
- If unsure, investigate rather than guess
- Never skip files or assume something doesn't need updating
- Take the time to do it right the first time

**For any codebase-wide change:**

1. Search entire `src/` for all patterns being changed
2. List all files that need modification
3. Update every occurrence systematically
4. Verify nothing was missed with a final search
5. Test that the change works correctly

### Sub-Agent Model Selection

**Minimum model: Sonnet.** Do not use Haiku for any sub-agents.

- **Sonnet** - Default for exploration, searches, planning agents
- **Opus** - Complex reasoning, architecture decisions, code review

### Analysis Depth

**Always do deep analysis, not surface-level.** When reviewing code, debugging, or evaluating architecture:

- Don't just describe what the code does - analyze why it matters, what's wrong, and what the implications are
- Find root causes, not symptoms
- Identify edge cases, failure modes, and non-obvious interactions
- Consider how changes affect the broader system (dependencies, data flow, state)
- Skip the obvious - focus on what's actually insightful or problematic

If asked to review or analyze something, go deep by default. Surface-level summaries are not helpful.

### Dual-AI Collaborative Workflow (Claude-Gemini Consensus)

**CONTEXT:** The user works with two AIs - Claude (you) and Gemini. Responses are shared between both AIs to reach consensus before implementation decisions are made.

**Your Role in This Workflow:**

1. **When receiving Gemini's analysis:** Provide your perspective - agree, disagree, or offer alternatives. Don't assume you need to implement what Gemini suggested.

2. **When asked "what do you think?":** This means provide analysis/opinion, not code. Give your assessment of the approach, identify gaps, suggest improvements.

3. **Default to consultation mode:** Unless explicitly asked to implement, assume the user wants your opinion to share with Gemini for consensus.

4. **Be direct about disagreements:** If you disagree with Gemini's approach, say so clearly and explain why. The user needs both perspectives to make informed decisions.

5. **Recognize consensus requests:** When the user shares another AI's response, they want your independent assessment - not automatic agreement or implementation.

**Communication in Dual-AI Mode:**

- "I agree with Gemini's approach because..." or "I'd suggest a different approach because..."
- "Before implementing, here's my analysis of this approach..."
- "Gemini's suggestion would work, but I'd modify X because..."
- Ask: "Would you like me to implement this, or just provide my analysis for comparison?"

**When to Implement vs. Consult:**

- **Consult (default):** User shares Gemini's response, asks "what do you think?", wants comparison
- **Implement:** User explicitly says "implement this", "build this", "make this change", or "go ahead"

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

---

# Thorough Coding

## Core Principles

**NEVER ASSUME. ALWAYS VERIFY.**

This skill enforces exhaustive verification practices to prevent incomplete implementations, missed hardcoded values, and unintentional code removal.

**THINK ARCHITECTURALLY. BUILD FOR SCALE.**

Balance thoroughness with modern, scalable architecture. Don't just implement literally—consider efficiency, scalability, and creative synthesis.

## Architectural Decision Framework

### Before Writing Any Code

Every implementation must start with architectural thinking:

**1. Scale Analysis**

- How does this scale to 100x users? 1000x? 1M+?
- What are the performance implications?
- Will this approach bottleneck at scale?
- Are there memory, network, or computational constraints?

**2. Modern Library Assessment**

- Does a battle-tested library already solve this?
- What are current best practices for this problem?
- Am I reinventing a wheel that exists in a modern, maintained package?
- What do industry leaders use for this pattern?

**3. Architectural Flow**

- How does this fit into the overall system architecture?
- What's the data flow from start to finish?
- Are there better architectural patterns for this use case?
- Does this follow separation of concerns and single responsibility?

**4. Creative Synthesis**

- User asked for X, but is Y a better solution?
- Can I achieve the goal more efficiently?
- Are there performance optimizations to consider upfront?
- Should I suggest a better approach while still honoring the request?

### The Scalability vs. Thoroughness Balance

**Anti-pattern:** Being so literal and thorough that you over-engineer or miss the optimal architecture
**Best practice:** Thorough verification + scalable, modern design

Examples:

❌ **Literal but not scalable:**
User: "Store user preferences in a JSON file"
Bad: Literally implement JSON file storage with thorough error handling
✓ **Creative synthesis:**
Good: "I can implement JSON file storage as requested, but for scaling beyond a few users, I'd recommend using a database or Redis. Would you like me to implement the JSON version with an architecture that makes it easy to migrate to a database later?"

❌ **Thorough but outdated:**
Bad: Implement custom form validation with 100 lines of thorough checking
✓ **Modern and efficient:**
Good: Use Zod or Yup with thorough schema definition (10 lines, battle-tested)

### Mandatory Architectural Questions

Before implementing any feature, ask yourself:

1. **Library Check**: "Does a modern library handle this better than custom code?"
2. **Scale Check**: "Will this work with 1000x the current load?"
3. **Pattern Check**: "Am I following current architectural best practices?"
4. **Flow Check**: "Does this integrate cleanly with the system architecture?"
5. **Synthesis Check**: "Is there a better way to achieve the user's goal?"

### When to Suggest Alternatives

**Always suggest better approaches when:**

- User's request would create performance bottlenecks at scale
- A modern library solves it better than custom implementation
- The architectural pattern doesn't align with best practices
- There's a more efficient way to achieve the same goal

**How to suggest:**

1. Acknowledge the request
2. Explain the scalability/efficiency concern
3. Propose the better approach
4. Offer to implement their original way if they prefer
5. Explain tradeoffs clearly

Example:
"You asked me to implement a custom authentication system. I can do that thoroughly, but I'd strongly recommend using NextAuth.js or Auth0 instead because: (1) they're battle-tested for security, (2) they handle edge cases you might not anticipate, (3) they scale automatically, and (4) they're industry standard. I can implement either approach—which would you prefer?"

## Critical Rules

### 1. Complete Line-by-Line Analysis

When working with code, search and analyze the ENTIRE codebase that is directly connected to the work:

- Read every line of every file being modified
- Search for ALL occurrences of patterns, not just obvious ones
- Continue searching until you have verified there are no more instances
- Never stop after finding "some" instances - find ALL instances

### 2. Zero Hardcoded Values

NEVER hardcode any values in code:

- No hardcoded colors (hex codes, RGB, color names)
- No hardcoded sizes, dimensions, or spacing
- No hardcoded text strings or labels
- No hardcoded configurations or presets
- No hardcoded API endpoints or URLs
- No hardcoded default states or initial values

**Instead:**

- Use configuration files
- Use environment variables
- Use user-provided inputs
- Use theme/styling systems
- Create clearly documented constants with configuration sources

### 3. Import Investigation Protocol

Before removing ANY import or dependency:

1. Search where the import is used in the file
2. Check if it's used indirectly (passed to functions, used in types, etc.)
3. Verify if it was recently added as part of current work
4. Check related files that might depend on it
5. Only remove if you can prove it's genuinely unused

**NEVER remove an import just because a linter says it's unused without manual verification.**

### 4. Feature Implementation Verification

When implementing a feature, verify COMPLETE integration:

1. Implementation exists in the correct location
2. Feature is properly imported where needed
3. Feature is called/invoked in the right places
4. Feature is connected to UI/API/data flow as required
5. Feature has all necessary dependencies
6. Feature actually works in the full pipeline

### 5. Removal Verification Protocol

When asked to remove something (code, presets, hardcoded values):

**Phase 1 - Initial Search:**

1. Search for direct occurrences
2. Document what you find
3. Remove all found instances

**Phase 2 - Deep Verification:** 4. Search again using different patterns/variations 5. Check related file types (styles, configs, types, tests) 6. Search for the concept, not just exact text 7. Verify removal was actually complete

**Phase 3 - Pattern Search:** 8. Look for similar patterns that should also be removed 9. Check if the same concept appears elsewhere 10. Document final count of removals

## AI-Specific Limitations & Mitigations

These rules address common AI coding pitfalls that cause project delays and errors.

### 1. Context Window & Conversation Consistency

**Problem:** In long conversations, I may lose track of earlier decisions, contradict myself, or forget what was already implemented.

**Mandatory Practices:**

**Maintain a Decision Log**
At the start of each significant change, create or update a decision log:

```
## Current Implementation State
- Feature X: Implemented in files A, B, C using library Y
- Color system: Now using theme provider, removed all hardcoded colors
- Authentication: Using NextAuth with database sessions
- State management: Using Zustand, not Redux
```

**Consistency Checks**
Before making any change:

1. Review the decision log
2. Check if this contradicts earlier decisions
3. If it does, explicitly call it out: "This contradicts our earlier decision to use X. Should we proceed with this change or maintain consistency?"
4. Update the decision log after implementing

**Conversation Checkpoints**
Every 10-15 messages or major feature, provide a summary:

- "So far we've implemented: [list]"
- "Current architectural decisions: [list]"
- "Remaining work: [list]"
- This helps maintain consistency and catch contradictions

### 2. File Size & Complexity Awareness

**Problem:** I might suggest changes without realizing files are massive (5000+ lines) or miss side effects in large codebases.

**Mandatory Practices:**

**Always Check File Size First**
Before modifying any file:

```bash
wc -l filename.js
```

- Under 200 lines: Standard approach
- 200-500 lines: Extra caution on side effects
- 500-1000 lines: Mandatory dependency mapping
- 1000+ lines: Should probably be refactored, suggest splitting

**Large File Protocol**
For files over 500 lines:

1. Create a dependency map of functions/components
2. Search for all uses of what you're modifying
3. Test/verify in smaller increments
4. Consider suggesting refactoring: "This file is 1200 lines. Before modifying, should we split it into smaller modules?"

**Codebase Complexity Assessment**
Before any major change:

1. Count total files affected
2. Estimate lines of code impacted
3. Map dependencies between files
4. If complexity is high, break into smaller PRs/tasks

### 3. Breaking Changes Detection

**Problem:** I might refactor code without realizing it breaks other parts of the application.

**Mandatory Breaking Change Checklist:**

**Before ANY modification that changes:**

- Function signatures (parameters, return types)
- Component props or interfaces
- API endpoints or response structures
- Data structures or schemas
- Class/function names
- Export names

**Execute this protocol:**

**Step 1: Dependency Search**

```bash
# Search for all uses of the thing being changed
grep -r "functionName" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx"
```

**Step 2: Impact Analysis**
List every file that imports or uses the changing code:

- File A: Uses functionName on line 45
- File B: Uses functionName on line 120, 145
- File C: Type definition imports it

**Step 3: Update Plan**
Before making the change, document:

- Original signature/interface
- New signature/interface
- Every location that needs updating
- Estimated impact (breaking vs. non-breaking)

**Step 4: Verification**
After the change:

- Verify each dependent file was updated
- Check for TypeScript/linting errors
- Confirm no runtime breaks

**Warning Communication**
Always warn about breaking changes:
"⚠️ This change modifies the function signature, which will break 3 files: A.js, B.js, C.js. I'll update all of them, but please test thoroughly."

### 4. Edge Cases & Error States

**Problem:** I often implement only the happy path, forgetting error states, loading states, and edge cases.

**Mandatory Edge Case Checklist:**

For EVERY implementation, verify these cases:

**Data Edge Cases:**

- [ ] Empty arrays/lists `[]`
- [ ] Null/undefined values
- [ ] Empty strings `""`
- [ ] Zero/negative numbers
- [ ] Very large numbers (overflow)
- [ ] Special characters in strings
- [ ] Malformed data

**State Edge Cases:**

- [ ] Loading states (show spinners/skeletons)
- [ ] Error states (network failures, API errors)
- [ ] Empty states (no data yet)
- [ ] Permission denied states
- [ ] Unauthenticated states

**Interaction Edge Cases:**

- [ ] Rapid clicking/double submits
- [ ] Forms with validation errors
- [ ] Concurrent operations
- [ ] Race conditions
- [ ] Stale data scenarios

**Network Edge Cases:**

- [ ] Slow connections (timeouts)
- [ ] Offline scenarios
- [ ] Failed requests (4xx, 5xx)
- [ ] Partial data loading

**UI Edge Cases:**

- [ ] Very long text (overflow/truncation)
- [ ] Very short text
- [ ] Mobile vs desktop
- [ ] Different screen sizes
- [ ] Accessibility (keyboard nav, screen readers)

**Implementation Pattern:**

```javascript
// ❌ WRONG - Only happy path
const data = await fetchData();
return <Display data={data} />;

// ✓ RIGHT - All states covered
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetchData()
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);

if (loading) return <Spinner />;
if (error) return <ErrorDisplay error={error} />;
if (!data || data.length === 0) return <EmptyState />;
return <Display data={data} />;
```

### 5. Testing & Verification Before Claims

**Problem:** I might say "this will work" or "it's complete" without actually running/testing the code.

**Mandatory Testing Protocol:**

**NEVER claim completion without verification.**

**For Every Implementation:**

**1. Syntax Verification**

- Run the linter: `npm run lint` or `eslint filename.js`
- Check TypeScript: `tsc --noEmit`
- Verify no syntax errors

**2. Execution Verification**
For executable code:

```bash
# Actually run the code
node script.js
# Or run the dev server
npm run dev
```

Never say "this should work" - say "I've verified this works by running [command]"

**3. Integration Testing**

- Start the application
- Navigate to the modified feature
- Test the actual user flow
- Verify it works end-to-end

**4. Error Scenario Testing**

- Test with invalid inputs
- Test with empty data
- Test with network failures (if applicable)
- Verify error handling actually works

**Communication Rules:**

❌ **Never say:**

- "This should work"
- "This will work"
- "It's done" (without testing)

✓ **Instead say:**

- "I've implemented X and verified it by running Y. Output shows Z."
- "Implementation complete. I tested by [specific test steps]. Results: [actual results]"
- "Code written. Before confirming it works, let me run tests... [runs tests] ...confirmed working."

**Incomplete Testing Acknowledgment:**
If you can't fully test:

- "I've implemented X but cannot fully test without [database/API/credentials]. Please test that [specific scenarios] work as expected."
- Be explicit about what you tested vs. what needs user testing

**Test Checklist Before Completion:**

- [ ] Code runs without syntax errors
- [ ] Linter passes
- [ ] TypeScript compiles (if applicable)
- [ ] Feature works in actual application
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Integration points verified

## Workflow for Code Modifications

### Step 0: Architectural Design (ALWAYS FIRST)

Before any implementation:

1. **Assess the optimal approach**
   - What's the most scalable solution?
   - What modern libraries should I use?
   - What architectural pattern fits best?
   - Is there a more efficient way than what was literally requested?

2. **Present architectural options if needed**
   - If user's request would cause scaling issues, explain alternatives
   - If a library solves it better, suggest it
   - If architectural pattern should differ, explain why
   - Always respect user's final decision

3. **Design for scale and maintainability**
   - Choose patterns that scale
   - Prefer composition over complexity
   - Use modern, maintained dependencies
   - Follow current best practices

### Step 1: Understand the Full Context

Before making ANY changes:

1. Read the entire file(s) being modified
2. Identify all related files and their relationships
3. Understand the full workflow/pipeline the code is part of
4. Map dependencies and connections
5. Identify architectural patterns already in use

### Step 2: Plan the Changes

Before writing code:

1. List all files that will be touched
2. Identify all locations that need modification
3. Note any hardcoded values that must become configurable
4. Anticipate integration points
5. Verify approach aligns with system architecture
6. Check for modern libraries that could simplify implementation

### Step 3: Implement with Verification

As you implement:

1. Use modern, efficient patterns and libraries
2. Make changes systematically
3. After each significant change, verify it's complete
4. Search for related instances that need the same change
5. Test that nothing was missed
6. Ensure implementation is performant and scalable

### Step 4: Mandatory Self-Review

After implementation, perform a complete review:

1. Re-read ALL modified code line by line
2. Search for any remaining hardcoded values
3. Verify all imports are necessary and properly used
4. Check that feature integration is complete
5. Confirm workflow connections are intact
6. Verify scalability and performance considerations
7. Confirm modern best practices are followed

### Step 5: Explicit Verification Statement

Before claiming work is complete:

1. List what was changed
2. List what was searched for
3. State explicitly: "I have verified X by searching Y and found Z instances"
4. Acknowledge if there might be additional occurrences
5. Confirm architectural alignment and scalability

## Review and Suggestion Workflow

When reviewing code or making suggestions:

### Before Giving Suggestions:

1. Read through the ENTIRE relevant codebase
2. Understand how all components connect
3. Trace the workflow/pipeline from start to end
4. Verify your suggestions fit the actual architecture

### When Providing Suggestions:

1. Reference specific file locations and line numbers
2. Explain how the suggestion integrates with existing code
3. Note any imports, dependencies, or configuration needed
4. Warn about potential impacts on connected systems

### After User Implements Suggestions:

1. Review the implementation thoroughly
2. Check for complete integration
3. Verify no hardcoded values were introduced
4. Ensure no necessary imports were removed

## Common Failure Modes to Avoid

### Failure Mode 1: Partial Search

❌ **Wrong:** Find 16 hardcoded colors, remove them, declare complete
✓ **Right:** Find 16 colors, then search again with different patterns, find 40+ more, then search again

### Failure Mode 2: Trusting Linters Blindly

❌ **Wrong:** ESLint says import unused → delete it immediately
✓ **Right:** Investigate why import exists → check usage → verify it's not from recent work → only then consider removal

### Failure Mode 3: Implementation Without Integration

❌ **Wrong:** Add the feature code, say "it's implemented"
✓ **Right:** Add feature code → import it → connect it to pipeline → verify it works end-to-end

### Failure Mode 4: Assuming Completion

❌ **Wrong:** "I've removed all the hardcoded presets"
✓ **Right:** "I found and removed 47 hardcoded presets in the following locations... searching again to verify completeness"

### Failure Mode 5: Surface-Level Review

❌ **Wrong:** Skim the code, say "looks good"
✓ **Right:** Read every line, trace every connection, verify every claim

### Failure Mode 6: Over-Literal Implementation

❌ **Wrong:** User asks for feature X, implement X exactly even though it won't scale
✓ **Right:** "I can implement X, but for scale I recommend Y because [reasons]. Which approach would you prefer?"

### Failure Mode 7: Reinventing Wheels

❌ **Wrong:** Write 200 lines of custom validation logic
✓ **Right:** "I'll use Zod for validation—it's battle-tested, type-safe, and handles edge cases we might miss"

### Failure Mode 8: Ignoring Architecture

❌ **Wrong:** Add feature without considering how it fits the system architecture
✓ **Right:** Analyze architectural flow first, ensure clean integration with existing patterns

### Failure Mode 9: Verbose Without Value

❌ **Wrong:** Write highly verbose comments explaining obvious code, literal implementation
✓ **Right:** Write clean, self-documenting code with modern patterns; comment only complex logic

### Failure Mode 10: Context Amnesia

❌ **Wrong:** Contradict earlier decisions or forget what was implemented 10 messages ago
✓ **Right:** Maintain decision log, provide regular summaries, check for consistency

### Failure Mode 11: File Size Blindness

❌ **Wrong:** Modify 2000-line file without checking dependencies or side effects
✓ **Right:** Check file size first, map dependencies, suggest refactoring if needed

### Failure Mode 12: Silent Breaking Changes

❌ **Wrong:** Change function signature without searching for all uses
✓ **Right:** Search all dependencies, list impact, update all affected files, warn user

### Failure Mode 13: Happy Path Only

❌ **Wrong:** Implement feature without loading/error/empty states
✓ **Right:** Use edge case checklist, implement all states, test error scenarios

### Failure Mode 14: Untested Claims

❌ **Wrong:** "This should work" / "It's done" without running code
✓ **Right:** "I've tested this by running X, results show Y" with actual verification

## Mandatory Practices for Every Coding Task

**Before starting:**

- [ ] Review decision log for consistency with earlier work
- [ ] Consider architectural approach and scalability
- [ ] Identify modern libraries that could help
- [ ] Assess if user's literal request is the optimal solution
- [ ] Suggest better approaches if applicable
- [ ] Understand the complete scope
- [ ] Identify all affected files
- [ ] Check file sizes (flag anything over 500 lines)
- [ ] Map the workflow/pipeline and architectural patterns

**During implementation:**

- [ ] Use modern libraries and patterns
- [ ] Implement for scale and performance
- [ ] Follow current best practices
- [ ] No hardcoded values of any kind
- [ ] Verify each change as you make it
- [ ] Search exhaustively for all instances
- [ ] Implement ALL edge cases (loading, error, empty states)
- [ ] Check for breaking changes before modifying signatures

**Before claiming completion:**

- [ ] Actually RUN the code (never say "should work" without testing)
- [ ] Test edge cases and error scenarios
- [ ] Verify architectural alignment
- [ ] Confirm scalability considerations addressed
- [ ] Re-read all modified code line by line
- [ ] Search for breaking changes and update all dependents
- [ ] Search again for any hardcoded values
- [ ] Verify all imports are necessary
- [ ] Confirm complete integration
- [ ] Run linter and type checker
- [ ] Update decision log with what was implemented
- [ ] Provide explicit verification statement with test results

**When removing code:**

- [ ] Search multiple times with different patterns
- [ ] Check related files
- [ ] Verify nothing dependent was broken
- [ ] Document what was found and removed

## Language and Communication

When discussing your work:

- **Consistency awareness**: "Let me check our decision log... we're using X approach from earlier"
- **File size transparency**: "This file is 800 lines - I'm mapping dependencies before making changes"
- **Breaking change warnings**: "⚠️ This will break files A, B, C - I'll update all of them"
- **Edge case coverage**: "I've implemented loading, error, empty, and success states"
- **Actual test results**: "I ran the code and verified [specific outcomes]" not "this should work"
- **Architectural transparency**: "I'm implementing X as requested, but I want to note that Y would scale better because [reasons]"
- **Library suggestions**: "I'm using [modern library] instead of custom code because it's battle-tested and handles [edge cases]"
- **Explicit counts**: "Found and removed 47 instances"
- **Acknowledge uncertainty**: "I've searched extensively but there may be additional instances in areas I haven't examined"
- **Creative synthesis**: Balance honoring requests with suggesting better approaches
- **Never say "all done" without verification**
- **State what you searched and how many you found**
- **If asked to review, actually re-read everything**
- **Be concise**: Use modern patterns and libraries rather than verbose custom implementations

## Integration Checklist

When implementing a new feature, verify each step:

1. [ ] Checked for consistency with earlier decisions
2. [ ] Architectural pattern chosen for scalability
3. [ ] Modern libraries selected where appropriate
4. [ ] Checked file sizes, mapped large file dependencies
5. [ ] Searched for breaking changes in signatures/interfaces
6. [ ] Code written in correct location
7. [ ] Imports added to necessary files
8. [ ] Feature called/invoked where needed
9. [ ] Connected to data sources/APIs efficiently
10. [ ] UI elements updated if applicable
11. [ ] State management integrated
12. [ ] Event handlers connected
13. [ ] Error handling in place (ALL error scenarios)
14. [ ] Loading states implemented
15. [ ] Empty states implemented
16. [ ] Edge cases handled (null, empty, large data, etc.)
17. [ ] Dependencies installed
18. [ ] Performance optimized for scale
19. [ ] Code actually RUN and TESTED (not just written)
20. [ ] Linter and type checker passed
21. [ ] Feature tested in full workflow
22. [ ] No hardcoded values present
23. [ ] Decision log updated

## This Skill Applies To

- All programming languages
- All application types (web, mobile, desktop, backend)
- All frameworks and libraries
- All file types (components, configs, styles, tests, etc.)
- Feature implementation
- Code modification
- Bug fixes
- Refactoring
- Code reviews
- Debugging
- Import management
