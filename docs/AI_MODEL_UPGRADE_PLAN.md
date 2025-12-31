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

### 3. DALL-E 3 → GPT Image 1.5 (High Priority)

**Status:** OPENAI_API_KEY confirmed in Railway - implementing migration.

**Why GPT Image 1.5 (not 1.0):** Released Dec 16, 2025 - 4x faster, 20% cheaper, better text rendering and instruction following.

**Files to Update:**

| File                                | Changes                               |
| ----------------------------------- | ------------------------------------- |
| `src/services/dalleService.ts`      | Main service - model, types, API call |
| `src/utils/dalleRateLimiter.ts`     | Cost constants and size mappings      |
| `src/services/AppImageGenerator.ts` | Quality type reference                |
| `src/utils/imageUrlInjector.ts`     | Comment update (cosmetic)             |

**API Parameter Changes:**

| Parameter       | DALL-E 3                              | GPT Image 1.5                                 |
| --------------- | ------------------------------------- | --------------------------------------------- |
| `model`         | `dall-e-3`                            | `gpt-image-1.5`                               |
| `size`          | `1024x1024`, `1792x1024`, `1024x1792` | `1024x1024`, `1536x1024`, `1024x1536`, `auto` |
| `quality`       | `standard`, `hd`                      | `low`, `medium`, `high` (default: high)       |
| `style`         | `vivid`, `natural`                    | **NOT SUPPORTED - REMOVE**                    |
| `output_format` | N/A                                   | `png`, `jpeg`, `webp` (NEW - jpeg is faster)  |
| `background`    | N/A                                   | `transparent` supported (NEW)                 |
| `response`      | Returns `url`                         | Returns `b64_json` only (**CRITICAL**)        |

---

#### File 1: `src/services/dalleService.ts`

**1. Update types (lines ~14-16):**

```typescript
// Before
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';

// After
export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
export type ImageQuality = 'low' | 'medium' | 'high';
// Remove ImageStyle entirely
```

**2. Update cost tracking (lines ~62-69):**

```typescript
// Before (DALL-E 3 pricing)
const COST_PER_IMAGE: Record<string, number> = {
  'hd-1792x1024': 0.12,
  'hd-1024x1792': 0.12,
  'hd-1024x1024': 0.08,
  'standard-1792x1024': 0.08,
  'standard-1024x1792': 0.08,
  'standard-1024x1024': 0.04,
};

// After (GPT Image 1.5 pricing - 60-80% cheaper)
const COST_PER_IMAGE: Record<string, number> = {
  'high-1536x1024': 0.064,
  'high-1024x1536': 0.064,
  'high-1024x1024': 0.032,
  'medium-1536x1024': 0.032,
  'medium-1024x1536': 0.032,
  'medium-1024x1024': 0.016,
  'low-1024x1024': 0.012,
};
```

**3. Update `getImageCost` function (line ~71):**

```typescript
// Update parameter type
export function getImageCost(quality: ImageQuality, size: ImageSize): number {
  const key = `${quality}-${size}`;
  return COST_PER_IMAGE[key] || 0.016; // Default to medium-1024x1024
}
```

**4. Update API call AND upload to Supabase Storage (lines ~125-146):**

```typescript
// Before
const response = await this.client.images.generate({
  model: 'dall-e-3',
  prompt,
  size,
  quality,
  style,
  n: 1,
});

const imageData = response.data?.[0];
if (!imageData?.url) {
  throw new Error('No image data returned from DALL-E');
}

const result: GeneratedImage = {
  url: imageData.url,  // DALL-E returns URL
  ...
};

// After
const response = await this.client.images.generate({
  model: 'gpt-image-1.5',
  prompt,
  size: this.mapSize(size),
  quality: this.mapQuality(quality),
  output_format: 'jpeg',
  n: 1,
});

const imageData = response.data?.[0];
if (!imageData?.b64_json) {
  throw new Error('No image data returned from GPT Image');
}

// Upload base64 to Supabase Storage and get persistent URL
const url = await this.uploadToSupabase(imageData.b64_json, size);

const result: GeneratedImage = {
  url,  // Persistent Supabase Storage URL
  ...
};
```

**Add Supabase upload helper (new method):**

```typescript
import { createClient } from '@supabase/supabase-js';

// Add to class
private supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for storage
);

private async uploadToSupabase(base64: string, size: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  const filename = `generated/${Date.now()}-${size}.jpg`;

  const { data, error } = await this.supabase.storage
    .from('ai-images')  // Bucket name
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000', // 1 year cache
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = this.supabase.storage
    .from('ai-images')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
```

**Supabase Setup Required:**

1. Create storage bucket `ai-images` in Supabase dashboard
2. Set bucket to public (for generated app images)
3. Add `SUPABASE_SERVICE_ROLE_KEY` to Railway environment variables

---

#### Supabase Storage Setup (SQL)

Run this in the Supabase SQL Editor:

```sql
-- Create the ai-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-images',
  'ai-images',
  true,  -- Public bucket for generated app images
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- RLS Policy: Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-images');

-- RLS Policy: Allow service role to upload (for server-side generation)
CREATE POLICY "Allow service role uploads"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'ai-images');

-- RLS Policy: Allow public read access (images are public)
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ai-images');

-- RLS Policy: Allow service role to delete (for cleanup)
CREATE POLICY "Allow service role delete"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'ai-images');
```

---

#### Railway Environment Variable

Add the Supabase service role key to Railway:

**Option 1: Railway CLI**

```bash
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

**Option 2: Railway Dashboard**

1. Go to your Railway project
2. Click on the service
3. Go to **Variables** tab
4. Add new variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (copy from Supabase Dashboard → Settings → API → service_role key)

**Where to find the service role key:**

1. Go to Supabase Dashboard
2. Click **Settings** (gear icon)
3. Click **API**
4. Copy the `service_role` key (NOT the `anon` key)

⚠️ **Security Note:** The service role key bypasses RLS. Only use it server-side, never expose to client.

---

**5. Add mapping helpers (new methods in class):**

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
  return oldQuality === 'hd' ? 'high' : 'medium';
}
```

**6. Update `generateHeroImage` (line ~164-170):**

```typescript
// Before
return this.generateImage({
  prompt,
  size: '1792x1024', // Old DALL-E size
  quality: 'hd',
  style: request.designContext.style === 'playful' ? 'vivid' : 'natural',
});

// After
return this.generateImage({
  prompt,
  size: '1536x1024', // New GPT Image size
  quality: 'high',
  // style removed
});
```

**7. Update `generateCardImage` and `generateBackgroundImage`:**

Remove `style` parameter from both methods.

**8. Update `getCacheKey` (lines ~323-337):**

```typescript
// Before
private getCacheKey(prompt, size, quality, style): string {
  ...
  return `${hash.toString(36)}-${size}-${quality}-${style}`;
}

// After
private getCacheKey(prompt: string, size: ImageSize, quality: ImageQuality): string {
  ...
  return `${hash.toString(36)}-${size}-${quality}`;
}
```

**9. Update `ImageGenerationRequest` interface (lines ~18-23):**

Remove `style` property.

---

#### File 2: `src/utils/dalleRateLimiter.ts`

**Update cost constants (lines ~48-55):**

```typescript
// Before
export const COST_PER_IMAGE = {
  'hd-1792x1024': 0.12,
  'hd-1024x1792': 0.12,
  'hd-1024x1024': 0.08,
  'standard-1792x1024': 0.08,
  'standard-1024x1792': 0.08,
  'standard-1024x1024': 0.04,
} as const;

// After
export const COST_PER_IMAGE = {
  'high-1536x1024': 0.064,
  'high-1024x1536': 0.064,
  'high-1024x1024': 0.032,
  'medium-1536x1024': 0.032,
  'medium-1024x1536': 0.032,
  'medium-1024x1024': 0.016,
  'low-1024x1024': 0.012,
} as const;
```

**Update `recordGeneration` method signature (line ~118):**

```typescript
// Before
public recordGeneration(
  type: 'hero' | 'card' | 'background' | 'custom',
  quality: 'hd' | 'standard',
  size: string
): void

// After
public recordGeneration(
  type: 'hero' | 'card' | 'background' | 'custom',
  quality: 'high' | 'medium' | 'low',
  size: string
): void
```

---

#### File 3: `src/services/AppImageGenerator.ts`

**Update quality type (line ~43):**

```typescript
// Before
quality?: 'standard' | 'hd';

// After
quality?: 'low' | 'medium' | 'high';
```

**Update hero image recording (line ~148):**

```typescript
// Before
rateLimiter.recordGeneration('hero', 'hd', '1792x1024');

// After
rateLimiter.recordGeneration('hero', 'high', '1536x1024');
```

---

#### File 4: `src/utils/imageUrlInjector.ts` (cosmetic)

**Update comment (line ~68):**

```typescript
// Before
' * This file contains URLs for images generated by DALL-E 3 or fallback services.',

// After
' * This file contains URLs for images generated by GPT Image 1.5 or fallback services.',
```

---

**Reason:** DALL-E 3 deprecated November 2025, removal May 2026. GPT Image 1.5 is 60-80% cheaper, 4x faster, with better text rendering and instruction following.

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
3. **GPT Image 1.5 migration** - Complex, 4 files to update:
   - `dalleService.ts` - Types, API call, base64 handling
   - `dalleRateLimiter.ts` - Cost constants
   - `AppImageGenerator.ts` - Quality type, size references
   - `imageUrlInjector.ts` - Comment (cosmetic)
4. **Opus upgrade** - Optional, discuss cost implications first

---

## Testing

After each change:

1. Run `npm run typecheck` - Verify no type errors
2. Run `npm run build` - Verify build succeeds
3. Test affected features manually:
   - Gemini: Layout builder visual analysis
   - Sonnet updates: Figma import, semantic analysis
   - GPT Image 1.5: Image generation in layout preview (if enabled)
   - Opus: Phase generation wizard

---

## Rollback

All changes are simple model ID swaps. To rollback, revert the model string to the previous value.

---

## Sources

**GPT Image 1.5:**

- [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/image-generation)
- [OpenAI API Reference - Images](https://platform.openai.com/docs/api-reference/images)
- [OpenAI Models - GPT Image 1.5](https://platform.openai.com/docs/models/gpt-image-1.5)
- [GPT-Image-1.5 Rollout - OpenAI Community](https://community.openai.com/t/gpt-image-1-5-rolling-out-in-the-api-and-chatgpt/1369443)
- [GPT-Image-1.5 Prompting Guide - OpenAI Cookbook](https://cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide)

**Gemini:**

- [Introducing Gemini 3 Flash - Google](https://blog.google/products/gemini/gemini-3-flash/)
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)

**Claude:**

- [Introducing Claude Sonnet 4.5 - Anthropic](https://www.anthropic.com/news/claude-sonnet-4-5)
- [Claude Models Overview](https://docs.claude.com/en/docs/about-claude/models/overview)
