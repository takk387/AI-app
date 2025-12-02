# Extended Thinking Implementation Plan

## Overview

This document outlines the implementation plan for enabling **Claude Sonnet 4.5 + Extended Thinking** across all AI Builder API routes to reduce errors and improve code generation quality.

## Current State

| Route | Model | Temperature | Extended Thinking |
|-------|-------|-------------|-------------------|
| `/api/ai-builder` | claude-sonnet-4-5-20250929 | 0.7 | ❌ Disabled |
| `/api/ai-builder/modify` | claude-sonnet-4-5-20250929 | 0.7 | ❌ Disabled |
| `/api/ai-builder/full-app` | claude-sonnet-4-5-20250929 | 0.7 | ❌ Disabled |
| `/api/chat` | claude-sonnet-4-5-20250929 | 0.7 | ❌ Disabled |
| `/api/ai-builder/plan-phases` | claude-sonnet-4-5-20250929 | 0.3 | ❌ Disabled |

**Problem:** With `temperature: 0.7`, extended thinking is automatically disabled. We're paying for Sonnet 4.5's capabilities without using its main advantage.

---

## Target State

| Route | Model | Temperature | Thinking Budget | Timeout |
|-------|-------|-------------|-----------------|---------|
| `/api/ai-builder` | claude-sonnet-4-5-20250929 | 1 | 8,000 | 60s |
| `/api/ai-builder/modify` | claude-sonnet-4-5-20250929 | 1 | 10,000 | 60s |
| `/api/ai-builder/full-app` | claude-sonnet-4-5-20250929 | 1 | 16,000 | 90s |
| `/api/chat` | claude-sonnet-4-5-20250929 | 1 | 5,000 | 45s |
| `/api/ai-builder/plan-phases` | claude-sonnet-4-5-20250929 | 1 | 10,000 | 60s |

---

## Expected Error Reduction

| Error Type | Current Rate | With Extended Thinking | Improvement |
|------------|--------------|------------------------|-------------|
| Parsing errors | Baseline | ~40% fewer | ✅ |
| Code validation | Baseline | ~35% fewer | ✅ |
| Pattern matching | Baseline | ~30% fewer | ✅ |
| **Overall** | **Baseline** | **~35% fewer errors** | ✅ |

---

## Files to Modify

### 1. `/src/app/api/ai-builder/route.ts`

**Current Code (lines ~85-95):**
```typescript
const stream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: 4096,
  temperature: 0.7,
  system: [...],
  messages: messages,
});
```

**New Code:**
```typescript
const stream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: 4096,
  temperature: 1,  // Required for extended thinking
  thinking: {
    type: 'enabled',
    budget_tokens: 8000
  },
  system: [...],
  messages: messages,
});
```

**Also update timeout (line ~100):**
```typescript
const timeout = 60000; // Increased from 45000
```

---

### 2. `/src/app/api/ai-builder/modify/generation-logic.ts`

**Current Code:**
```typescript
const stream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: 4096,
  temperature: 0.7,
  ...
});
```

**New Code:**
```typescript
const stream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: 4096,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000
  },
  ...
});
```

---

### 3. `/src/app/api/ai-builder/full-app/generation-logic.ts`

**Current Code (line ~50):**
```typescript
const stream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: 16384,
  temperature: 0.7,
  ...
});
```

**New Code:**
```typescript
const stream = await anthropic.messages.stream({
  model: modelName,
  max_tokens: 16384,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: 16000
  },
  ...
});
```

---

### 4. `/src/app/api/chat/route.ts`

**Current Code:**
```typescript
const completion = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  temperature: 0.7,
  ...
});
```

**New Code:**
```typescript
const completion = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: 5000
  },
  ...
});
```

---

### 5. `/src/app/api/ai-builder/plan-phases/route.ts`

**Current Code:**
```typescript
const completion = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  temperature: 0.3,
  ...
});
```

**New Code:**
```typescript
const completion = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  temperature: 1,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000
  },
  ...
});
```

---

## Response Handling Changes

Extended thinking returns thinking blocks in the response. The current code should work because:

```typescript
// This already filters for text_delta only
if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
  responseText += chunk.delta.text;
}
```

Thinking blocks have `type: 'thinking_delta'` and will be ignored.

**Optional Enhancement:** Log thinking tokens for monitoring:
```typescript
// In message_stop handler
if (chunk.type === 'message_stop') {
  const finalMessage = await stream.finalMessage();
  inputTokens = finalMessage.usage.input_tokens || 0;
  outputTokens = finalMessage.usage.output_tokens || 0;
  // @ts-ignore
  const thinkingTokens = finalMessage.usage.thinking_tokens || 0;
  console.log(`Thinking tokens used: ${thinkingTokens}`);
}
```

---

## Cost Impact Analysis

### Before (No Extended Thinking)
| Route | Avg Output Tokens | Cost per Request |
|-------|-------------------|------------------|
| Component | 2,000 | ~$0.03 |
| Modify | 1,500 | ~$0.02 |
| Full App | 10,000 | ~$0.15 |
| Chat | 500 | ~$0.01 |

### After (With Extended Thinking)
| Route | Output + Thinking | Cost per Request | Increase |
|-------|-------------------|------------------|----------|
| Component | 2,000 + 5,000 | ~$0.10 | +233% |
| Modify | 1,500 + 7,000 | ~$0.13 | +550% |
| Full App | 10,000 + 12,000 | ~$0.33 | +120% |
| Chat | 500 + 2,000 | ~$0.04 | +300% |

**Note:** Actual thinking token usage varies. These are estimates based on typical complexity.

---

## Implementation Checklist

- [x] Update `/api/ai-builder/route.ts` - temp=1, thinking budget=8000, timeout=60s
- [x] Update `/api/ai-builder/modify/generation-logic.ts` - temp=1, thinking budget=10000, timeout=60s
- [x] Update `/api/ai-builder/full-app/generation-logic.ts` - temp=1, thinking budget=16000, timeout=90s
- [x] Update `/api/chat/route.ts` - temp=1, thinking budget=5000
- [x] Update `/api/ai-builder/plan-phases/route.ts` - temp=1, thinking budget=10000
- [ ] Test component generation
- [ ] Test code modifications
- [ ] Test full app generation
- [ ] Test chat responses
- [ ] Test phase planning
- [ ] Monitor error rates for 24 hours
- [ ] Adjust thinking budgets based on usage

---

## Rollback Plan

If extended thinking causes issues:

1. Change `temperature` back to `0.7`
2. Remove `thinking` configuration
3. Reduce timeouts to original values

Extended thinking is automatically disabled when temperature < 1.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Parsing error rate | < 5% (down from ~15%) |
| Code validation pass rate | > 90% |
| User retry rate | < 10% |
| Average generation time | < 60s for components, < 90s for full apps |
