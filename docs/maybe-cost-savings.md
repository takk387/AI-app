# AI Builder Cost Reduction Analysis

## Current Setup

**Model:** `claude-sonnet-4-5-20250929` (Sonnet 4.5)

**Token Budgets (from `generation-logic.ts:360-380`):**

| Phase Type           | Max Tokens | Thinking Budget | Response Budget |
| -------------------- | ---------- | --------------- | --------------- |
| Phase 1 (Foundation) | 48,000     | 24,000          | 24,000          |
| Phase 2+ (Additive)  | 32,000     | 16,000          | 16,000          |
| Small Modifications  | 24,000     | 12,000          | 12,000          |

---

## What's Already Optimized

1. **Prompt Caching IS Enabled** (`full-app-stream/route.ts:489-494`)

   ```typescript
   system: [
     {
       type: 'text',
       text: systemPrompt,
       cache_control: { type: 'ephemeral' }, // Already there
     },
   ];
   ```

2. **Token Budgets Scale by Phase** - Phase 1 gets 48K, later phases get 32K

3. **CodeContextService Exists** (`PhaseExecutionManager.ts:1311-1332`) with:
   - `getOptimizedPhaseContext()` - smart file selection
   - `getModificationContext()` - targeted context for edits
   - Importance scoring and token budgeting

---

## What's NOT Optimized

### 1. Extended Thinking Always Enabled

**Location:** `full-app-stream/route.ts:485-488`

```typescript
thinking: {
  type: 'enabled',  // Even for Phase 2+
  budget_tokens: tokenBudget.thinking_budget,
}
```

- Thinking costs extra but Phase 2+ is additive work that may not need deep reasoning

### 2. Full Current App State Sent

**Location:** `full-app-stream/route.ts:282-305`

```typescript
// All files included inline - no smart selection
${currentAppState.files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n')}
```

- Could be 10K-50K+ tokens for large apps

### 3. Smart Context Service NOT Used in Routes

- `PhaseExecutionManager` has `getOptimizedPhaseContext()`
- But `full-app-stream/route.ts` bypasses it and sends raw files

### 4. Full Conversation History

**Location:** `full-app-stream/route.ts:405-413`

- No filtering, grows unbounded

---

## Cost Reduction Opportunities

### Opportunity 1: Disable Extended Thinking for Phase 2+

**Estimated Savings:** 30-40%

**Location:** `full-app-stream/route.ts:481-497`

**Current:**

```typescript
const tokenBudget = getTokenBudget(phaseNumber);
// ...
thinking: {
  type: 'enabled',
  budget_tokens: tokenBudget.thinking_budget,
}
```

**Proposed:**

```typescript
const tokenBudget = getTokenBudget(phaseNumber);
const useThinking = phaseNumber === 1;  // Only Phase 1 needs deep thinking

// In the API call:
...(useThinking ? {
  thinking: {
    type: 'enabled',
    budget_tokens: tokenBudget.thinking_budget,
  }
} : {})
```

**Why Safe:** Phase 1 builds architecture. Phase 2+ is additive - "add this feature to existing code" - doesn't need deep reasoning.

---

### Opportunity 2: Use CodeContextService Instead of Raw Files

**Estimated Savings:** 20-40%

**The service already exists!** (`PhaseExecutionManager.ts:1344-1385`)

**Current Flow:**

```
Route → sends ALL files inline → Claude
```

**Proposed Flow:**

```
Route → CodeContextService.getPhaseContext() → sends SMART selection → Claude
```

**What CodeContextService Does:**

- Scores files by importance (types > components > utils)
- Filters to relevant files for current phase
- Respects token budget (default 16K)
- Returns only what's needed

---

### Opportunity 3: Filter Conversation History

**Estimated Savings:** 10-20%

**Current:** Full history sent (`full-app-stream/route.ts:405-413`)

**Solution:** The phase generator already has relevance extraction:

```typescript
// DynamicPhaseGenerator already has keyword matching
const PHASE_KEYWORDS = {
  auth: ['login', 'signup', 'auth', 'password', ...],
  ui: ['layout', 'design', 'style', ...],
  // etc.
}
```

Use this to filter conversation to phase-relevant messages.

---

## Quick Win Implementation

**Safest change with biggest impact:**

Disable extended thinking for Phase 2+ in `generation-logic.ts`:

```typescript
// In getTokenBudget function (line 385-400)
export function getTokenBudget(phaseNumber: number, complexity?: PhaseComplexity): TokenBudget {
  const budget =
    phaseNumber === 1
      ? TOKEN_BUDGETS.foundation
      : complexity?.level === 'small'
        ? TOKEN_BUDGETS.small
        : TOKEN_BUDGETS.additive;

  // Disable thinking for non-foundation phases
  if (phaseNumber > 1) {
    return {
      ...budget,
      thinking_budget: 0, // No thinking for additive phases
    };
  }

  return budget;
}
```

Then in the route, conditionally include thinking:

```typescript
const thinkingConfig =
  tokenBudget.thinking_budget > 0
    ? { thinking: { type: 'enabled', budget_tokens: tokenBudget.thinking_budget } }
    : {};

const aiStream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: tokenBudget.max_tokens,
  temperature: 1,
  ...thinkingConfig,
  // ...
});
```

---

## Estimated Impact Summary

| Change                        | Tokens Saved Per Request | Risk Level          |
| ----------------------------- | ------------------------ | ------------------- |
| Disable thinking for Phase 2+ | 16K-24K per phase        | Low                 |
| Use CodeContextService        | 10K-30K per request      | Low (already built) |
| Filter conversation           | 5K-15K per request       | Low                 |

**Total potential savings: 50-70% reduction in tokens for Phase 2+ requests**

---

## Files to Modify

| File                                                  | Change                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| `src/app/api/ai-builder/full-app/generation-logic.ts` | Update `getTokenBudget()` to return 0 thinking for Phase 2+ |
| `src/app/api/ai-builder/full-app-stream/route.ts`     | Conditionally include thinking config                       |
| `src/app/api/ai-builder/full-app-stream/route.ts`     | Wire in CodeContextService for smart file selection         |

---

## Notes

- All proposed changes are low-risk because they use existing infrastructure
- CodeContextService is already built and tested, just not wired into routes
- Extended thinking removal for Phase 2+ is safe because additive work is simpler than architecture
- Test thoroughly before deploying to production
