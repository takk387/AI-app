# Bugfix Round 4 — Diagnosis & Implementation Brief

**Date:** 2026-03-16
**Context:** After Round 3 fixes were verified, continued end-to-end testing of a ClickCount app revealed 4 issues in Step 5 (Builder). These stem from three root causes: the DynamicPhaseGenerator producing irrelevant phases for simple apps, leftover PLAN/ACT dual-mode architecture that the rebuild blueprint explicitly marked for removal but was never cleaned out, and system prompt bloat that wastes ~87KB of tokens on every request regardless of app complexity.

---

## Mandatory Workflow

Follow the **Masterchain Debugging Workflow** from `CLAUDE.md`:

- **Phase 1 (Diagnosis)** is already done below — root causes are identified with file paths and line numbers.
- **Phase 2 (Fix):** Apply one issue at a time. Show BEFORE/AFTER diffs. Verify preservation after each.
- Run `npm run typecheck && npm run lint` after each fix.
- **Issue 14 (PLAN/ACT cleanup) must be done LAST** — Issues 12 and 13 can be done in either order.

---

## Issue 12 — Phase plan includes irrelevant phases for simple apps

**Priority:** HIGH — Causes wasted API calls and user confusion.

### Symptom

A simple ClickCount counter app (increment, decrement, reset, history) gets a 5-phase plan that includes "Phase 2: Authentication System" with features "login, signup." This phase is completely irrelevant — a counter needs no auth.

### Root Cause

The phase generation pipeline has a `getImplicitFeatures()` function that adds an "Authentication System" feature whenever `tech.needsAuth` is truthy, with no validation that auth actually makes sense for the app.

**File:** `src/services/phaseGeneration/featureClassifier.ts`
**Lines 101-121:** `getImplicitFeatures()`

```
if (tech.needsAuth) → adds implicit auth feature with domain: 'auth', requiresOwnPhase: true
```

**File:** `src/services/DynamicPhaseGenerator.ts`
**Lines 357-385:** `generatePhasesFromGroups()`

```
if (featuresByDomain.has('auth')) → always generates "Authentication System" phase
```

The wizard's state extraction sends `needsAuth` to the phase generator. For a simple counter where auth was never discussed, this value is either `null` getting coerced to truthy, or the dual AI planning pipeline includes auth in its architecture spec because it defaults to including it.

### Fix

Add app complexity validation in `getImplicitFeatures()`. Only add implicit auth when the app actually needs it — evidence of user roles, multi-user features, or explicit auth mentions.

**File:** `src/services/phaseGeneration/featureClassifier.ts`

**BEFORE (lines 101-121):**

```typescript
// Current: blindly trusts tech.needsAuth
if (tech.needsAuth) {
  implicitFeatures.push({
    name: 'Authentication System',
    description: 'User authentication with login and signup',
    domain: 'auth',
    complexity: 'medium',
    requiresOwnPhase: true,
    features: ['login', 'signup'],
  });
}
```

**AFTER:**

```typescript
// Only add auth if the app genuinely needs it — evidence-based check
// FRONTEND_ONLY apps never need auth phases (confirmed via live test: AI itself reports appType as FRONTEND_ONLY)
const isFrontendOnly =
  concept.appType === 'FRONTEND_ONLY' || concept.technical?.appType === 'FRONTEND_ONLY';
const hasUserRoles = concept.roles && concept.roles.length > 0;
const hasMultiUserFeatures =
  concept.coreFeatures?.some((f: string) => {
    const lower = f.toLowerCase();
    return (
      lower.includes('login') ||
      lower.includes('signup') ||
      lower.includes('sign up') ||
      lower.includes('auth') ||
      lower.includes('account') ||
      lower.includes('user profile') ||
      lower.includes('permission') ||
      lower.includes('role')
    );
  }) ?? false;

if (tech.needsAuth && !isFrontendOnly && (hasUserRoles || hasMultiUserFeatures)) {
  implicitFeatures.push({
    name: 'Authentication System',
    description: 'User authentication with login and signup',
    domain: 'auth',
    complexity: 'medium',
    requiresOwnPhase: true,
    features: ['login', 'signup'],
  });
}
```

**Key:** `tech.needsAuth` alone is no longer sufficient — there must also be evidence of multi-user features in the app concept. A counter, todo list, or calculator won't pass this check. An app with "user profiles" or "admin dashboard" will.

### Verification

1. `npm run typecheck` — no errors
2. `npm run lint` — no new errors
3. Create a simple app (counter, calculator) through the wizard → verify phase plan has NO auth phase
4. Create an app with user features (social app, dashboard with roles) → verify auth phase IS included

---

## Issue 13 — "No response from AI" hides real Claude response

**Priority:** MEDIUM — Misleading error wastes 3+ minutes per retry attempt.

### Symptom

When Phase 2 (Authentication System) auto-executes for the counter app, it fails 3 times with "Phase 2 Failed: No response from AI. (Attempt X/3)". Each attempt takes ~3 minutes. The user sees no explanation of _why_ it failed.

### Root Cause

Claude **does respond** — it takes ~3 minutes to think and generate a response. But the response contains no `===FILE:...===` markers because Claude can't produce valid code for a nonsensical task (auth for a counter). The file parser finds zero files and reports it as "no response."

**File:** `src/app/api/ai-builder/full-app-stream/route.ts`
**Lines 1021-1046:** File parsing after stream completes

```typescript
// Regex extracts files between ===FILE:=== markers
const fileRegex =
  /===FILE:([\s\S]*?)===\s*([\s\S]*?)(?====FILE:|===DEPENDENCIES===|===SETUP===|===END===|$)/g;
// ...
if (files.length === 0) {
  // Sends error event with code: 'NO_FILES' — this is what the client sees as "no response"
  await writeEvent({
    type: 'error',
    message: 'No files generated in response',
    code: 'NO_FILES',
    recoverable: true,
  });
}
```

**File:** `src/hooks/usePhaseExecution.ts`
**Lines 346-361:** Receives the error and shows "No response from AI"

```typescript
} else {
  // streamResult is null — treated as "no response"
  const failMsg: ChatMessage = {
    // ...
    content: retries >= MAX_PHASE_RETRIES
      ? `**Phase ${phaseNumber} Failed Permanently:** No response from AI after ${retries} attempts.`
      : `**Phase ${phaseNumber} Failed:** No response from AI. (Attempt ${retries}/${MAX_PHASE_RETRIES})`,
  };
}
```

### Fix — Two parts

**Part A:** Capture and forward Claude's actual response text when no files are found.

**File:** `src/app/api/ai-builder/full-app-stream/route.ts`

Where files are parsed (around line 1021-1046), when `files.length === 0`, include a snippet of the raw response in the error event so the client knows _why_ no code was generated:

**BEFORE:**

```typescript
if (files.length === 0) {
  await writeEvent({
    type: 'error',
    message: 'No files generated in response',
    code: 'NO_FILES',
    recoverable: true,
  });
}
```

**AFTER:**

```typescript
if (files.length === 0) {
  // Include a snippet of what Claude actually said (first 300 chars)
  const responseSnippet = fullResponseText.slice(0, 300).trim();
  await writeEvent({
    type: 'error',
    message: responseSnippet
      ? `AI responded but generated no code files. AI said: "${responseSnippet}${fullResponseText.length > 300 ? '...' : ''}"`
      : 'No files generated in response',
    code: 'NO_FILES',
    recoverable: true,
  });
}
```

**Part B:** Show Claude's actual response in the failure message.

**File:** `src/hooks/usePhaseExecution.ts`

Where the "No response from AI" message is constructed (around line 346-361), use the error message from the stream (which now includes Claude's response snippet):

**BEFORE:**

```typescript
content: retries >= MAX_PHASE_RETRIES
  ? `**Phase ${phaseNumber} Failed Permanently:** No response from AI after ${retries} attempts.`
  : `**Phase ${phaseNumber} Failed:** No response from AI. (Attempt ${retries}/${MAX_PHASE_RETRIES})`,
```

**AFTER:**

```typescript
content: retries >= MAX_PHASE_RETRIES
  ? `**Phase ${phaseNumber} Failed Permanently:** Could not generate code after ${retries} attempts.${lastErrorMessage ? `\n\n${lastErrorMessage}` : ''}`
  : `**Phase ${phaseNumber} Failed:** Could not generate code. (Attempt ${retries}/${MAX_PHASE_RETRIES})${lastErrorMessage ? `\n\n${lastErrorMessage}` : ''}`,
```

**Note:** The implementer needs to capture `lastErrorMessage` from the streaming error event. Check how error events from the SSE stream are currently handled in `usePhaseExecution.ts` — the error event's `message` field should be available.

### Verification

1. `npm run typecheck` — no errors
2. Trigger a phase that Claude can't produce code for → verify the failure message shows what Claude actually said instead of "No response from AI"

---

## Issue 14 — Dead PLAN/ACT mode code causes chat history bugs

**Priority:** CRITICAL — Breaks conversational iteration in the Builder.

### Symptom

When a user chats with the AI in the Builder after Phase 2 failures, the AI says "your message is actually the **first one here**" — it cannot see any prior conversation messages. The user sees a full chat history in the UI but Claude receives an empty or malformed conversation.

### Root Cause — Multi-layered

The rebuild blueprint (`BUILDER_PAGE_REDESIGN_BLUEPRINT.md`) explicitly stated:

> **Line 222:** `PLAN/ACT mode toggle → (removed) → Single unified chat with intent detection`
> **Line 663:** "No PLAN/ACT toggle. Intent detection handles everything. Two modes was artificial."

But PLAN/ACT mode was **never removed**. There are **79 references across 18 files**. The dual-mode architecture creates the following chat history problems:

#### Problem A: Message role alternation violation

The Zustand store accumulates messages from different sources without enforcing alternation:

- `handleBuildTrigger` in `useSendMessageHandlers.ts` (lines 151-170) adds TWO consecutive assistant messages: "Building your app..." then "App created!"
- Phase execution in `usePhaseExecution.ts` (line 225) adds system-role messages for phase status
- `compressForACTMode` (line 59) filters out system messages, leaving potential consecutive same-role entries
- The Anthropic API requires strict user/assistant alternation — consecutive same-role messages cause errors or garbled context

**Example message sequence in store after Phase 1 + build:**

```
1. system:    "Phase 1: Layout Injection Complete..."
2. user:      "Build the click counter..."
3. assistant: "Building your app..."         ← from handleBuildTrigger line 157
4. assistant: "App created!..."              ← from handleBuildTrigger line 170
5. system:    "Building Phase 2..."
6. system:    "Phase 2 Failed..."
7. user:      "can you not see the chat?"
```

After filtering system messages: `[user, assistant, assistant, user]` — messages 3-4 are consecutive assistant, violating Anthropic's API requirement.

#### Problem B: Phase execution sends no chat history

**File:** `src/hooks/usePhaseExecution.ts` (lines 238-262)

The request body for phase building omits `conversationHistory` entirely:

```typescript
const requestBody: Record<string, unknown> = {
  prompt: executionPrompt,
  isPhaseBuilding: true,
  isModification: phaseNumber > 1,
  phaseContext: {
    /* ... */
  },
  currentAppState,
  // NO conversationHistory
  // NO contextSummary
};
```

#### Problem C: Two different API endpoints for chat vs build

- Direct chat → `/api/ai-builder` (intent router) — includes `conversationHistory`
- Build/phase execution → `/api/ai-builder/full-app-stream` — history included for user-triggered builds, omitted for phase auto-execution

### Fix — Three-part cleanup

#### Part 1: Add `sanitizeMessagesForAPI()` utility

Create a utility that ensures messages alternate properly before sending to Claude.

**New function in:** `src/hooks/useSendMessageHandlers.ts` (or a new `src/utils/messageUtils.ts`)

```typescript
/**
 * Sanitize messages for Anthropic API — merge consecutive same-role messages
 * and ensure strict user/assistant alternation.
 */
export function sanitizeMessagesForAPI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (messages.length === 0) return [];

  const sanitized: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    const last = sanitized[sanitized.length - 1];
    if (last && last.role === msg.role) {
      // Merge consecutive same-role messages
      last.content = `${last.content}\n\n${msg.content}`;
    } else {
      sanitized.push({ ...msg });
    }
  }

  // Ensure first message is from user (API requirement)
  if (sanitized.length > 0 && sanitized[0].role === 'assistant') {
    sanitized.shift();
  }

  return sanitized;
}
```

#### Part 2: Apply sanitization in both API routes

**File:** `src/app/api/ai-builder/route.ts` (after line 134, before line 137)

```typescript
// After building messages from conversationHistory, sanitize before adding current prompt
// ... existing history loop ...

// Sanitize to ensure alternation (merges consecutive same-role messages)
const sanitizedHistory = sanitizeMessagesForAPI(messages);
messages.length = 0;
messages.push(...sanitizedHistory);

// Add current user prompt
messages.push({ role: 'user', content: prompt });
```

**File:** `src/app/api/ai-builder/full-app-stream/route.ts` (after the conversationHistory loop, around line 427)

Same sanitization pattern.

#### Part 3: Remove dead PLAN mode code from Builder path

The Builder (Step 5) is **always** in ACT mode. The PLAN mode code paths in `useSendMessage.ts` are dead code — the Wizard (Step 1) has its own `NaturalConversationWizard` component with its own chat handling.

**File:** `src/hooks/useSendMessage.ts`

Remove the `if (currentMode === 'PLAN')` branches (lines 162-205). The Builder always uses the ACT path. Specifically:

1. **Lines 162-205:** Delete the entire PLAN mode branch. Keep only the ACT mode body (lines 206-226).
2. **Lines 247-254:** Delete PLAN mode response handling (`wizardState`, `suggestedActions`).
3. **Line 296:** Remove `isWizardResponse` check.

**File:** `src/store/useAppStore.ts`

- **Line 465:** Change default `currentMode: 'PLAN'` to `currentMode: 'ACT'` — or remove `currentMode` entirely if no other file needs it in the Builder.

**Files with `currentMode` references (18 files, 79 occurrences):**

```
src/hooks/useSendMessage.ts           — 10 refs (main cleanup target)
src/components/MainBuilderView.tsx    — 11 refs
src/components/ChatPanel.tsx          — 11 refs
src/store/useAppStore.ts              — 11 refs
src/hooks/useBuilderEffects.ts        — 6 refs
src/contexts/BuilderContext.tsx        — 5 refs
src/hooks/usePhaseExecution.ts        — 4 refs
src/hooks/useConceptUpdates.ts        — 4 refs
src/components/ErrorBoundary.tsx       — 3 refs
src/hooks/useChatSystem.ts            — 2 refs
+ 8 more files with 1 ref each
```

**Approach:** In each file, find the `currentMode` checks. If it's a `=== 'PLAN'` check in the Builder, delete the branch (dead code). If it's a `=== 'ACT'` check, the condition is always true — remove the conditional wrapper and keep the body.

**Do NOT remove `currentMode` from the store yet** if the Wizard page still references it. Just ensure the Builder path hardcodes ACT behavior. A full store cleanup can be a follow-up.

### Verification

1. `npm run typecheck` — no errors
2. `npm run lint` — no new errors
3. Chat with the AI in the Builder → send multiple messages → verify the AI remembers prior messages
4. Trigger a build → then chat → verify the AI knows about the build that just happened
5. Phase execution → then chat → verify the AI has context about phase status
6. Wizard (Step 1) still works independently (PLAN mode is only used there)

---

## Issue 15 — System prompt bloat wastes tokens, crowds out app code context

**Priority:** HIGH — Directly causes file truncation and reduces code generation quality.

### Symptom

The Builder's code generation system prompt (`buildFullAppPrompt()` in `src/prompts/builder.ts`) concatenates 16 prompt sections unconditionally, totaling ~3,835 lines (~87KB). For a simple FRONTEND_ONLY counter app, Claude receives 87KB of system instructions (including full backend templates for NextAuth, Prisma, file uploads, rate limiting, CSRF protection) before seeing any app code. This crowds out the actual code context — files are truncated to 2000 characters in the intent router, and the full-app-stream route has limited room for conversation history.

A live test confirmed this: the AI in the Builder reported seeing truncated files and identified the app as `FRONTEND_ONLY`, yet it received the full FULL_STACK prompt suite.

### Root Cause

`buildFullAppPrompt()` (builder.ts lines 113-211) concatenates every section regardless of app type, detected features, or current phase domain. The only conditional sections are `imageContext`, `modificationContext`, `designTokenContext`, and `backendContext` — everything else is always included.

**Sections that should be conditional but aren't:**

| Section                            | Size           | Should gate on                                                                |
| ---------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `FORM_UX_STANDARDS`                | ~70 lines      | App has forms/CRUD features                                                   |
| `SECURITY_HARDENING_STANDARDS`     | ~82 lines      | `appType === 'FULL_STACK'`                                                    |
| `FULLAPP_EXAMPLES_COMPRESSED`      | ~277 lines     | Can be replaced with 30-line skeleton                                         |
| `PERFORMANCE_RESILIENCE_STANDARDS` | ~112 lines     | Can be compressed to 15-line checklist                                        |
| `getFullstackRules('FULL_STACK')`  | ~38 lines base | Returns base rules even for FRONTEND_ONLY                                     |
| `TEST_GENERATION_GUIDELINES`       | ~12 lines      | `phaseDomain === 'testing'`                                                   |
| `CODE_QUALITY_STANDARDS`           | ~65 lines      | "Production Features" subsection duplicates `PRODUCTION_STANDARDS_COMPRESSED` |

**Token savings estimate for FRONTEND_ONLY apps: ~1,057 lines (~30KB+), a ~91% reduction.**

### Fix — Tiered prompt builder with `PromptBuildConfig`

Replace the current 7-positional-parameter function with a config-driven section selector.

#### Part 1: New `PromptBuildConfig` interface

**File:** `src/prompts/builder.ts` (add near top, after imports)

```typescript
export interface PromptBuildConfig {
  baseInstructions: string;
  appType: 'FRONTEND_ONLY' | 'FULL_STACK';
  features: Set<string>; // from featureClassifier: 'auth', 'forms', 'realtime', 'storage', 'crud'
  phaseDomain?: string; // current phase: 'ui', 'auth', 'database', 'testing', etc.
  includeImageContext?: boolean;
  isModification?: boolean;
  layoutManifest?: LayoutManifest;
  techStack?: TechnicalRequirements;
  architectureSpec?: ArchitectureSpec;
}
```

#### Part 2: Rewrite `buildFullAppPrompt` to select sections conditionally

**File:** `src/prompts/builder.ts`

**BEFORE:** (lines 113-211) — Concatenates everything unconditionally.

**AFTER:**

```typescript
export function buildFullAppPrompt(config: PromptBuildConfig): string {
  const sections: string[] = [config.baseInstructions];

  // --- Always included (small, high-value) ---
  sections.push(ACCURACY_GUIDELINES);
  sections.push(COMPONENT_SYNTAX_RULES);
  sections.push(DELIMITER_FORMAT);
  sections.push(VERSION_INSTRUCTIONS);
  sections.push(SKELETON_EXAMPLE); // new 30-line replacement for 277-line examples

  // --- Conditional on context ---
  if (config.includeImageContext) {
    sections.push(
      `🎨 IMAGE-INSPIRED DESIGN:\nAnalyze uploaded image for colors, style, patterns. Apply aesthetic to app design using Tailwind CSS.`
    );
  }
  if (config.isModification) {
    sections.push(MODIFICATION_CONTEXT);
  }
  if (config.layoutManifest) {
    sections.push(buildDesignTokenContext(config.layoutManifest));
  }

  // --- Core quality (always, but deduplicated) ---
  sections.push(CODE_QUALITY_STANDARDS_CORE); // production subsection removed (covered by PRODUCTION_STANDARDS)
  sections.push(PRODUCTION_STANDARDS_COMPRESSED);
  sections.push(PERFORMANCE_CHECKLIST); // new 15-line compressed version
  sections.push(FRONTEND_RULES_COMPRESSED);

  // --- Conditional on app type ---
  if (config.appType === 'FULL_STACK') {
    sections.push(getFullstackRules('FULL_STACK'));
    sections.push(SECURITY_HARDENING_STANDARDS);

    if (config.architectureSpec) {
      sections.push(formatArchitectureSpec(config.architectureSpec));
    } else if (config.techStack) {
      sections.push(getBackendTemplates(config.techStack));
    }
  }

  // --- Conditional on detected features ---
  if (config.features.has('forms') || config.features.has('crud')) {
    sections.push(FORM_UX_STANDARDS);
  }

  // --- Conditional on phase domain ---
  if (config.phaseDomain === 'testing') {
    sections.push(TEST_GENERATION_GUIDELINES);
  }

  sections.push(`APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games, dashboards (preview sandbox)
- FULL_STACK: Database, auth, API routes, file uploads (local dev required)

REMEMBER:
- Complete code (never truncate mid-line/tag/string)
- ${config.layoutManifest ? 'Use CSS variables from design system (var(--color-*), etc.)' : 'Tailwind CSS for styling'}
- Include setup instructions`);

  return sections.filter(Boolean).join('\n\n').trim();
}
```

#### Part 3: Create compressed replacements

**New export in `src/prompts/full-app/examples-compressed.ts`:**

```typescript
/**
 * Skeleton example — shows delimiter format only.
 * Replaces 277-line FULLAPP_EXAMPLES_COMPRESSED.
 */
export const SKELETON_EXAMPLE = `
## OUTPUT FORMAT EXAMPLE

Use this exact delimiter format for all generated files:

===NAME===
My App

===EXPLANATION===
Brief description of the app and its features.

===FILE:app/page.tsx===
'use client';
import { useState } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">My App</h1>
    </main>
  );
}

===FILE:app/layout.tsx===
// ... layout with metadata, fonts, ErrorBoundary wrapper

===DEPENDENCIES===
react,react-dom

===SETUP===
npm install && npm run dev

===END===
`.trim();
```

**New export in `src/prompts/production-standards.ts`:**

```typescript
/**
 * Compressed performance checklist — replaces 112-line PERFORMANCE_RESILIENCE_STANDARDS.
 * Claude knows how to implement all of these; it just needs the checklist.
 */
export const PERFORMANCE_CHECKLIST = `
## PERFORMANCE & RESILIENCE CHECKLIST

Every generated app must include:
- Loading skeletons or spinners for all async operations
- Error boundaries wrapping the main App component with fallback UI and retry
- Retry with exponential backoff for failed API calls (max 3 attempts)
- Empty state UI when data arrays are empty (not just blank screen)
- Debounced search inputs (300ms) when search triggers API calls
- React.lazy + Suspense for route-level code splitting in apps with 3+ routes
- Memoized expensive computations (useMemo) and stable callbacks (useCallback)
- Graceful offline handling: detect navigator.onLine, show banner, queue actions
`.trim();
```

**New export in `src/prompts/quality-standards.ts`:**

```typescript
/**
 * Core quality standards with production subsection removed (covered by PRODUCTION_STANDARDS_COMPRESSED).
 * Replaces CODE_QUALITY_STANDARDS to avoid duplication.
 */
export const CODE_QUALITY_STANDARDS_CORE = `
## MANDATORY CODE QUALITY STANDARDS

### React Best Practices (CRITICAL)
- NEVER call hooks inside conditions, loops, or nested functions
- ALWAYS add key prop to elements rendered in .map() - use item.id, NOT array index
- ALWAYS include ALL dependencies in useEffect/useCallback/useMemo dependency arrays

### Performance
- MEMOIZE expensive operations with useMemo; stable callbacks with useCallback
- USE React.memo for pure components receiving props from frequently re-rendering parents

### Security (CRITICAL)
- NEVER use dangerouslySetInnerHTML without sanitization
- NEVER use eval(), new Function(), or setTimeout with string arguments
- ESCAPE all user-generated content before display

### Code Completeness
- NO console.log or debugger statements
- ALL async operations MUST handle loading and error states
- ALL forms MUST have validation with clear error messages
- ALL functions that can fail MUST have try/catch with user feedback

### TypeScript
- NO \`any\` types - use proper typing or \`unknown\` with type guards
- DEFINE interfaces for ALL component props
- HANDLE undefined/null explicitly with ?. or ??

### State Management
- INITIALIZE all state with appropriate defaults
- AVOID redundant state - derive values when possible
- CLEAN UP side effects in useEffect return functions
`.trim();
```

**Modify `src/prompts/full-app/fullstack-rules-compressed.ts`:**

```typescript
// BEFORE: getFullstackRules always returns BASE_RULES even for FRONTEND_ONLY
// AFTER: Return empty string for FRONTEND_ONLY
export function getFullstackRules(appType: AppType): string {
  if (appType === 'FRONTEND_ONLY') return '';
  return `${BASE_RULES}\n\n${FULLSTACK_RULES}`;
}
```

#### Part 4: Update callers to pass `PromptBuildConfig`

**File:** `src/app/api/ai-builder/full-app-stream/route.ts` (around line 394)

**BEFORE:**

```typescript
const systemPrompt = buildFullAppPrompt(
  baseInstructions,
  hasImage,
  isModification,
  layoutManifest,
  undefined,
  architectureSpec
);
```

**AFTER:**

```typescript
// Determine app type from request context
const appType: 'FRONTEND_ONLY' | 'FULL_STACK' =
  currentAppState?.appType === 'FRONTEND_ONLY' ? 'FRONTEND_ONLY' : 'FULL_STACK';

// Extract detected features from phase contexts or architecture spec
const features = new Set<string>();
if (architectureSpec?.auth) features.add('auth');
if (architectureSpec?.database) features.add('database');
if (architectureSpec?.storage) features.add('storage');
if (architectureSpec?.realtime) features.add('realtime');
// Check phase names for form/crud indicators
const phaseName = rawPhaseContext?.phaseName?.toLowerCase() ?? '';
if (phaseName.includes('form') || phaseName.includes('crud')) features.add('forms');

const systemPrompt = buildFullAppPrompt({
  baseInstructions,
  appType,
  features,
  phaseDomain: phaseName.includes('test') ? 'testing' : undefined,
  includeImageContext: hasImage,
  isModification,
  layoutManifest,
  architectureSpec,
});
```

**File:** `src/app/api/ai-builder/full-app/route.ts` (around line 173)

Same pattern — extract `appType` from request body, build `features` set, pass config object.

#### Part 5: Raise file truncation limit in intent router

**File:** `src/prompts/builderExpertPrompt.ts` (line 199)

**BEFORE:**

```typescript
content: f.content.length > 2000 ? f.content.slice(0, 2000) + '\n... (truncated)' : f.content;
```

**AFTER:**

```typescript
content: f.content.length > 6000 ? f.content.slice(0, 6000) + '\n... (truncated)' : f.content;
```

With the system prompt reduced by ~30KB for frontend apps, we can afford to give the intent router 3x more file content. For full-stack apps, the savings are smaller (~20KB) but still enough to raise the limit meaningfully.

### Expected Results

| App Type                           | Current System Prompt | After Fix         | Savings |
| ---------------------------------- | --------------------- | ----------------- | ------- |
| FRONTEND_ONLY (counter, calc)      | ~3,835 lines, ~87KB   | ~250 lines, ~8KB  | ~91%    |
| FULL_STACK with forms (todo, CRM)  | ~3,835 lines, ~87KB   | ~600 lines, ~20KB | ~77%    |
| FULL_STACK everything (e-commerce) | ~3,835 lines, ~87KB   | ~900 lines, ~30KB | ~65%    |

### Verification

1. `npm run typecheck` — no errors (new interface, updated callers)
2. `npm run lint` — no new errors
3. Build a FRONTEND_ONLY app → measure system prompt size → confirm < 10KB
4. Build a FULL_STACK app with auth+database → confirm backend templates ARE included
5. Build a FULL_STACK app with forms → confirm FORM_UX_STANDARDS IS included
6. Build a FULL_STACK app without forms → confirm FORM_UX_STANDARDS is NOT included
7. Verify code generation quality is equal or better (smaller prompt = more room for actual code context)
8. Verify `===FILE:===` delimiter format still works (skeleton example covers it)

### Files Modified

| File                                                 | Change                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/prompts/builder.ts`                             | New `PromptBuildConfig` interface; rewrite `buildFullAppPrompt` to section selector |
| `src/prompts/quality-standards.ts`                   | Add `CODE_QUALITY_STANDARDS_CORE` export (no production dupe)                       |
| `src/prompts/production-standards.ts`                | Add `PERFORMANCE_CHECKLIST` export (15-line compressed)                             |
| `src/prompts/full-app/examples-compressed.ts`        | Add `SKELETON_EXAMPLE` export (30-line replacement)                                 |
| `src/prompts/full-app/fullstack-rules-compressed.ts` | Return empty for FRONTEND_ONLY                                                      |
| `src/prompts/builderExpertPrompt.ts`                 | Raise truncation limit from 2000 → 6000 chars                                       |
| `src/app/api/ai-builder/full-app-stream/route.ts`    | Pass `PromptBuildConfig` instead of positional args                                 |
| `src/app/api/ai-builder/full-app/route.ts`           | Pass `PromptBuildConfig` instead of positional args                                 |

### Why This Is Permanent

1. **New sections must be gated.** The config-driven pattern makes it natural to add sections conditionally. There's no "dump everything" path anymore.
2. **`features` Set comes from architecture spec and phase context.** No manual maintenance — the data already exists in the pipeline.
3. **`appType` comes from the request.** Already computed by the caller and available in `currentAppState.appType`.

---

## Implementation Order

1. **Issue 12 first** (featureClassifier fix) — prevents the bad phase plan that triggers Issues 13
2. **Issue 13 second** (error message improvement) — better DX even when phases legitimately fail
3. **Issue 15 third** (prompt optimization) — reduces system prompt before fixing chat history, since smaller prompts leave more room for conversation history
4. **Issue 14 last** (PLAN/ACT cleanup + message sanitization) — largest change, most files touched

---

## Files Modified (Summary)

| File                                                 | Issues     | Changes                                                                                |
| ---------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `src/services/phaseGeneration/featureClassifier.ts`  | 12         | Add evidence check before implicit auth                                                |
| `src/app/api/ai-builder/full-app-stream/route.ts`    | 13, 14, 15 | Include Claude's response in NO_FILES error; sanitize messages; pass PromptBuildConfig |
| `src/app/api/ai-builder/full-app/route.ts`           | 15         | Pass PromptBuildConfig instead of positional args                                      |
| `src/hooks/usePhaseExecution.ts`                     | 13         | Show actual error message instead of "No response from AI"                             |
| `src/app/api/ai-builder/route.ts`                    | 14         | Sanitize messages for alternation                                                      |
| `src/hooks/useSendMessage.ts`                        | 14         | Remove dead PLAN mode branches                                                         |
| `src/hooks/useSendMessageHandlers.ts`                | 14         | Add `sanitizeMessagesForAPI()`                                                         |
| `src/store/useAppStore.ts`                           | 14         | Default `currentMode` to ACT (or remove)                                               |
| `src/components/MainBuilderView.tsx`                 | 14         | Remove PLAN mode conditionals                                                          |
| `src/components/ChatPanel.tsx`                       | 14         | Remove PLAN mode conditionals                                                          |
| `src/hooks/useBuilderEffects.ts`                     | 14         | Remove PLAN mode conditionals                                                          |
| `src/contexts/BuilderContext.tsx`                    | 14         | Remove PLAN mode conditionals                                                          |
| `src/prompts/builder.ts`                             | 15         | New PromptBuildConfig interface; rewrite to section selector                           |
| `src/prompts/quality-standards.ts`                   | 15         | Add CODE_QUALITY_STANDARDS_CORE (deduplicated)                                         |
| `src/prompts/production-standards.ts`                | 15         | Add PERFORMANCE_CHECKLIST (15-line compressed)                                         |
| `src/prompts/full-app/examples-compressed.ts`        | 15         | Add SKELETON_EXAMPLE (30-line replacement)                                             |
| `src/prompts/full-app/fullstack-rules-compressed.ts` | 15         | Return empty for FRONTEND_ONLY                                                         |
| `src/prompts/builderExpertPrompt.ts`                 | 15         | Raise truncation limit 2000 → 6000 chars                                               |
| + ~8 more files                                      | 14         | Remove dead `currentMode` checks                                                       |

---

_Diagnosed by: Claude Opus 4.6, 2026-03-16_
