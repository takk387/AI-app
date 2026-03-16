# Bugfix Round 3 — Diagnosis & Implementation Brief

**Date:** 2026-03-16
**Context:** Full end-to-end testing (Wizard → Design → AI Plan → Review → Builder) revealed 3 issues. Steps 1-4 pass cleanly. Step 5 (Builder) hits a client-side timeout, a phase naming mismatch, and a preview sizing problem.

---

## Mandatory Workflow

Follow the **Masterchain Debugging Workflow** from `CLAUDE.md`:

- **Phase 1 (Diagnosis)** is already done below — root causes are identified.
- **Phase 2 (Fix):** Apply the BEFORE/AFTER changes exactly. One fix at a time. Verify preservation after each.
- Run `npm run typecheck && npm run lint` after each fix.

---

## Issue 9 — API Timeout: Client kills stream before Claude finishes thinking

**Priority:** CRITICAL — blocks all code generation in the Builder.

### Root Cause

The streaming client (`useStreamingGeneration.ts`) sets a 45-second per-chunk timeout. The server (`full-app-stream/route.ts`) calls `anthropic.messages.stream()` with extended thinking enabled (20,000-token budget for Phase 1). During Claude's thinking phase, **no SSE chunks are emitted** — the SDK only starts streaming `content_block_delta` events after thinking completes. This means 30-60+ seconds of silence while Claude thinks, which exceeds the 45s chunk timeout, causing the client to abort.

The server sends a `thinking` SSE event at line 477 _before_ the API call, but then nothing arrives until Claude's thinking finishes and text generation begins.

### Timeline of failure

```
T+0s:    Server sends "thinking" SSE event → client receives chunk, resets 45s timer
T+0.1s:  Server calls anthropic.messages.stream() with thinking budget 20,000
T+0.1-45s: Claude is thinking — SDK emits nothing — client timer counting down
T+45s:   Client chunk timer fires → abortController.abort() → stream killed
T+50-90s: Claude would have started streaming text, but connection is already dead
```

### Fix — Two-part solution

**Part A:** Add a server-side heartbeat that sends keep-alive SSE events during the thinking phase.

**File:** `src/app/api/ai-builder/full-app-stream/route.ts`

**BEFORE (line 816-833):**

```typescript
// Stream from Claude with abort signal
const aiStream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: tokenBudget.max_tokens,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: tokenBudget.thinking_budget,
  },
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages,
});
```

**AFTER:**

```typescript
// Keep-alive heartbeat during Claude's thinking phase
// Sends a "thinking" SSE event every 10s to prevent client chunk timeout
let thinkingHeartbeat: ReturnType<typeof setInterval> | null = setInterval(async () => {
  if (!writerClosed) {
    try {
      await writeEvent({
        type: 'thinking',
        timestamp: Date.now(),
        message: 'AI is still thinking...',
      });
    } catch {
      // Writer closed, will be cleaned up below
    }
  }
}, 10_000);

// Stream from Claude with abort signal
const aiStream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: tokenBudget.max_tokens,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: tokenBudget.thinking_budget,
  },
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages,
});
```

Then stop the heartbeat once streaming begins. Find the `for await (const chunk of aiStream)` loop at line 852:

**BEFORE (line 852-861):**

```typescript
        for await (const chunk of aiStream) {
          // Check if client disconnected
          if (writerClosed) {
            break;
          }

          // Check timeout
          if (Date.now() - startTime > timeout) {
            throw new Error(`AI response timeout after ${timeout / 1000}s`);
          }
```

**AFTER:**

```typescript
        for await (const chunk of aiStream) {
          // Stop heartbeat once real chunks arrive
          if (thinkingHeartbeat) {
            clearInterval(thinkingHeartbeat);
            thinkingHeartbeat = null;
          }

          // Check if client disconnected
          if (writerClosed) {
            break;
          }

          // Check timeout
          if (Date.now() - startTime > timeout) {
            throw new Error(`AI response timeout after ${timeout / 1000}s`);
          }
```

Also clear the heartbeat in the error/cleanup paths. Search for `clearTimeout(globalTimeoutId)` in the streaming section (not agentic) and add `if (thinkingHeartbeat) { clearInterval(thinkingHeartbeat); thinkingHeartbeat = null; }` immediately before it. There should be a catch block and a finally/cleanup area after the streaming loop.

**Part B:** Increase client chunk timeout as a safety margin.

**File:** `src/hooks/useStreamingGeneration.ts`

**BEFORE (line 144-145):**

```typescript
// Timeouts: 45s between chunks (generous for AI thinking), 5min total
const CHUNK_TIMEOUT_MS = 45_000;
```

**AFTER:**

```typescript
// Timeouts: 120s between chunks (allows for extended thinking phase), 5min total
const CHUNK_TIMEOUT_MS = 120_000;
```

### Verification

1. `npm run typecheck` passes
2. `npm run lint` passes
3. Deploy and test: send a build request in Builder chat — should no longer timeout
4. Railway logs should show heartbeat events instead of "Slow request" errors
5. The chat should show "AI is still thinking..." updates during the thinking phase

---

## Issue 10 — "Missing backend dependencies: Database Schema Setup"

**Priority:** Medium — console warning, potential phase ordering bug.

### Root Cause

Phase naming mismatch. When `architectureToPhaseContext.ts` converts the dual AI architecture result into phase context, it creates a phase named **"Database Schema Setup"** (line 260). But `DynamicPhaseGenerator.ts` creates phases named **"Database Schema"** (line 346) — without "Setup". When `resolveBackendDependencies()` runs (line 265), it can't match "Database Schema Setup" against the actual phase named "Database Schema", logs the warning, and skips the dependency.

### Fix

**File:** `src/utils/architectureToPhaseContext.ts`

**BEFORE (line 260):**

```typescript
        name: 'Database Schema Setup',
```

**AFTER:**

```typescript
        name: 'Database Schema',
```

### Verification

1. `npm run typecheck` passes
2. `npm run lint` passes
3. Deploy, create a new app through the full flow — Railway logs should no longer show "Missing backend dependencies: Database Schema Setup"

---

## Issue 11 — Sandpack preview not filling its container

**Priority:** High — visible UI defect, wasted space in Builder.

### Root Cause

Two problems:

**A. `max-w-[1800px]` caps the entire builder layout.** In `MainBuilderView.tsx` line 649, the container that holds the ResizablePanelGroup (chat + code + preview) has `max-w-[1800px] mx-auto`, artificially limiting the layout on wide screens.

**B. Missing Sandpack CSS propagation rules.** In `globals.css` (lines 744-772), critical CSS rules force height/width propagation through Sandpack's internal DOM elements (`.sp-wrapper`, `.sp-stack`, `.sp-preview-container`, `iframe`). But these rules are scoped to `.layout-canvas-sandpack` — a class only applied to the **Design step's LayoutCanvas**, not to the **Builder's PreviewPanel**. Without these `!important` overrides, Sandpack's internal elements don't expand to fill their containers.

### Fix

**Part A:** Remove the max-width constraint.

**File:** `src/components/MainBuilderView.tsx`

**BEFORE (line 649):**

```tsx
        <div className="flex-1 min-h-0 max-w-[1800px] mx-auto w-full px-4 py-2">
```

**AFTER:**

```tsx
        <div className="flex-1 min-h-0 w-full px-4 py-2">
```

**Part B:** Add Sandpack CSS propagation to the Builder's preview.

**File:** `src/components/builder/PreviewPanel.tsx`

**BEFORE (line 227):**

```tsx
        <div style={{ width: '100%', height: '100%' }}>
```

**AFTER:**

```tsx
        <div className="builder-sandpack-preview" style={{ width: '100%', height: '100%' }}>
```

**File:** `src/app/globals.css`

Add the following CSS block immediately after the existing `.layout-canvas-sandpack` rules (after line 772):

```css
/* ============================================
   Builder Preview Panel — Sandpack fill rules
   Same propagation as layout canvas but for the
   Builder (Step 5) preview panel.
   ============================================ */

.builder-sandpack-preview .sp-wrapper {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 0% !important;
}

.builder-sandpack-preview .sp-layout {
  height: 100% !important;
  flex: 1 1 0% !important;
  display: flex !important;
  flex-direction: column !important;
}

.builder-sandpack-preview .sp-stack {
  height: 100% !important;
  flex: 1 1 0% !important;
  display: flex !important;
  flex-direction: column !important;
}

.builder-sandpack-preview .sp-preview-container {
  height: 100% !important;
  flex: 1 1 0% !important;
  display: flex !important;
  flex-direction: column !important;
}

.builder-sandpack-preview .sp-preview-container iframe {
  height: 100% !important;
  flex: 1 1 0% !important;
}

.builder-sandpack-preview .sp-preview-actions {
  position: absolute !important;
}
```

### Verification

1. `npm run typecheck` passes
2. `npm run lint` passes
3. Deploy and open Builder — preview panel should fill the entire right side without wasted space
4. Test at different viewport widths — preview should expand on wide screens
5. Verify the Design step preview is unaffected (still uses `.layout-canvas-sandpack`)

---

## Files Modified (Summary)

| File                                              | Issue | Change                                                              |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `src/app/api/ai-builder/full-app-stream/route.ts` | 9     | Add thinking heartbeat interval before stream, clear on first chunk |
| `src/hooks/useStreamingGeneration.ts`             | 9     | Increase `CHUNK_TIMEOUT_MS` from 45s to 120s                        |
| `src/utils/architectureToPhaseContext.ts`         | 10    | Rename "Database Schema Setup" → "Database Schema"                  |
| `src/components/MainBuilderView.tsx`              | 11    | Remove `max-w-[1800px] mx-auto`                                     |
| `src/components/builder/PreviewPanel.tsx`         | 11    | Add `builder-sandpack-preview` class to wrapper div                 |
| `src/app/globals.css`                             | 11    | Add `.builder-sandpack-preview` Sandpack CSS rules                  |

## Fix Order

1. **Issue 9 first** (API timeout) — this is the blocker
2. **Issue 11 second** (preview sizing) — high-visibility UI fix
3. **Issue 10 last** (naming mismatch) — lowest risk, one-line change
