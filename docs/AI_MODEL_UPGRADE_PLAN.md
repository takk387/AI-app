# AI Model Upgrade Plan

## Overview

Update AI models across the codebase to use latest versions for improved quality, speed, and cost efficiency.

---

## Changes

### 1. Gemini Update (High Priority)

**File:** `src/services/GeminiLayoutService.ts`
**Line:** ~166

```typescript
// Before
this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// After
this.model = this.client.getGenerativeModel({ model: 'gemini-3-flash-preview' });
```

**Reason:** `gemini-2.0-flash-exp` is experimental. Upgrade to `gemini-3-flash-preview` - the latest model with 78% SWE-bench score, outperforms all previous versions including Gemini 3 Pro.

**New Features Available:**

- `thinking_level` parameter: `minimal`, `low`, `medium`, `high` for controlling reasoning depth
- 1M token context window
- Pricing: $0.50/1M input, $3/1M output

---

### 2. Claude Sonnet 4 → 4.5 (High Priority)

Update two routes still using the older May 2025 model.

**File 1:** `src/app/api/figma/generate-code/route.ts`
**Line:** ~70

```typescript
// Before
model: 'claude-sonnet-4-20250514',

// After
model: 'claude-sonnet-4-5-20250929',
```

**File 2:** `src/app/api/ai-builder/analyze-semantic/route.ts`
Find and update any `claude-sonnet-4-20250514` references to `claude-sonnet-4-5-20250929`.

**Reason:** Consistency with rest of codebase; newer model has better coding/reasoning.

**Improvements:**

- SWE-bench: 77.2% (up from 72.7%)
- Code editing error rate: 0% (down from 9%)
- Same pricing as Sonnet 4 ($3/$15 per million tokens)
- ASL-3 safety tier (higher than Sonnet 4's ASL-2)

---

### 3. DALL-E 3 → GPT Image 1 (High Priority)

**Status:** OPENAI_API_KEY confirmed in Railway - implementing migration.

**File:** `src/services/dalleService.ts`

**API Parameter Changes:**

| Parameter       | DALL-E 3                              | GPT Image 1                                   |
| --------------- | ------------------------------------- | --------------------------------------------- |
| `model`         | `dall-e-3`                            | `gpt-image-1`                                 |
| `size`          | `1024x1024`, `1792x1024`, `1024x1792` | `1024x1024`, `1536x1024`, `1024x1536`, `auto` |
| `quality`       | `standard`, `hd`                      | `low`, `medium`, `high` (default: high)       |
| `style`         | `vivid`, `natural`                    | **NOT SUPPORTED - REMOVE**                    |
| `output_format` | N/A                                   | `png`, `jpeg`, `webp` (NEW - jpeg is faster)  |
| `background`    | N/A                                   | `transparent` supported (NEW)                 |

**Changes needed:**

1. Update model name (line ~127):

```typescript
// Before
model: 'dall-e-3',

// After
model: 'gpt-image-1',
```

2. Update size type (line ~14):

```typescript
// Before
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';

// After
export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
```

3. Update quality type (line ~15):

```typescript
// Before
export type ImageQuality = 'standard' | 'hd';

// After
export type ImageQuality = 'low' | 'medium' | 'high';
```

4. Remove `ImageStyle` type entirely - not supported by GPT Image 1.

5. Update API call (lines ~126-133):

```typescript
// Before
const response = await this.client.images.generate({
  model: 'dall-e-3',
  prompt,
  size,
  quality,
  style, // REMOVE THIS
  n: 1,
});

// After
const response = await this.client.images.generate({
  model: 'gpt-image-1',
  prompt,
  size: this.mapSize(size),
  quality: this.mapQuality(quality),
  output_format: 'jpeg', // Faster than png
  n: 1,
});
```

6. Add mapping helpers:

```typescript
private mapSize(oldSize: string): ImageSize {
  const sizeMap: Record<string, ImageSize> = {
    '1024x1024': '1024x1024',
    '1792x1024': '1536x1024',
    '1024x1792': '1024x1536',
  };
  return sizeMap[oldSize] || '1024x1024';
}

private mapQuality(oldQuality: string): 'low' | 'medium' | 'high' {
  // Map old DALL-E quality to new GPT Image quality
  return oldQuality === 'hd' ? 'high' : 'medium';
}
```

7. Update cost tracking (lines ~62-69):

```typescript
// New GPT Image 1 pricing (50-75% cheaper)
const COST_PER_IMAGE: Record<string, number> = {
  'high-1536x1024': 0.08,
  'high-1024x1536': 0.08,
  'high-1024x1024': 0.04,
  'medium-1536x1024': 0.04,
  'medium-1024x1536': 0.04,
  'medium-1024x1024': 0.02,
  'low-1024x1024': 0.015,
};
```

8. Update cache key generation to remove style parameter.

**Reason:** DALL-E 3 deprecated November 2025, removal May 2026. GPT Image 1 is 50-75% cheaper with better text rendering.

---

### 4. Opus for Planning (Optional - Quality Improvement)

Upgrade phase/architecture planning to use Claude Opus 4.5 for better reasoning.

**File 1:** `src/app/api/wizard/generate-phases/route.ts`
**File 2:** `src/app/api/wizard/generate-architecture/route.ts`

```typescript
// Before
model: 'claude-sonnet-4-5-20250929',

// After
model: 'claude-opus-4-5-20251101',
```

**Reason:** Opus excels at long-horizon planning and sustained reasoning. Planning is a one-time cost per app, so higher price is justified.

**Trade-off:** Higher cost (~$15/$75 per million tokens vs $3/$15 for Sonnet).

---

## Execution Order

1. **Gemini update** - Simple one-line change, low risk
2. **Claude Sonnet consistency** - Simple model ID updates
3. **GPT Image 1 migration** - More complex, requires type and API changes
4. **Opus upgrade** - Optional, discuss cost implications first

---

## Testing

After each change:

1. Run `npm run typecheck` - Verify no type errors
2. Run `npm run build` - Verify build succeeds
3. Test affected features manually:
   - Gemini: Layout builder visual analysis
   - Sonnet updates: Figma import, semantic analysis
   - GPT Image 1: Image generation in layout preview (if enabled)
   - Opus: Phase generation wizard

---

## Rollback

All changes are simple model ID swaps. To rollback, revert the model string to the previous value.

---

## Sources

- [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/image-generation)
- [OpenAI API Reference - Images](https://platform.openai.com/docs/api-reference/images)
- [OpenAI Models - GPT Image 1](https://platform.openai.com/docs/models/gpt-image-1)
- [Introducing Gemini 3 Flash - Google](https://blog.google/products/gemini/gemini-3-flash/)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Introducing Claude Sonnet 4.5 - Anthropic](https://www.anthropic.com/news/claude-sonnet-4-5)
- [Claude Models Overview](https://docs.claude.com/en/docs/about-claude/models/overview)
