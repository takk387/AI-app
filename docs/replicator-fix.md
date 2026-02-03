# Replicator Fix: Transform from Interpretation Engine to Exact Replication Engine

**Status:** Planning Complete - Ready for Implementation  
**Date:** February 2, 2026  
**Estimated Time:** 8-10 hours total

---

## Executive Summary

The AI-app currently fails to create exact replicas of custom artistic visuals (buttons, icons, backgrounds, gradients) because:

1. **Missing Pipeline Integration** - The VisionLoopEngine (healing loop) exists but never runs
2. **Toothless Auto-Fixer** - LayoutAutoFixEngine only fixes `style`/`bounds`, ignores `content` (icons, images, SVG paths)
3. **DALL-E Interference** - Legacy DALL-E code conflicts with Gemini Imagen 3 integration
4. **Generation Over Extraction** - System generates approximations instead of extracting/cropping actual visuals

This plan fixes all four issues to achieve 95%+ visual fidelity.

---

## Root Cause Analysis

### Problem 1: Disconnected Healing Loop (Cline's Finding)

**Current Flow:**

```
Image Upload → Surveyor (extract manifest) → Builder (generate code) → STOP
```

**What's Missing:**

- No screenshot capture of rendered output
- No comparison vs original design
- No iteration to fix discrepancies
- VisionLoopEngine exists but is never called

### Problem 2: Content Fixes Ignored (Gemini's Finding)

**File:** `src/services/LayoutAutoFixEngine.ts`

**Current Behavior:**

```typescript
// Only processes these:
if (discrepancy.correctionJSON.style) { ... }  // ✅ Colors, spacing
if (discrepancy.correctionJSON.bounds) { ... } // ✅ Position, size

// COMPLETELY IGNORES:
if (discrepancy.correctionJSON.content) { ... } // ❌ Icons, images, text, SVG paths
```

**Impact:**

- AI detects wrong icon → suggests fix → Auto-fixer ignores it
- Result: Custom arrow stays generic Lucide icon

### Problem 3: DALL-E vs Gemini Conflict

**Found:**

- `src/services/dalleService.ts` - Full OpenAI implementation (unused by main pipeline)
- `src/services/AppImageGenerator.ts` - Uses DALL-E for some image generation paths
- `src/services/GeminiImageService.ts` - Uses Gemini Imagen 3 (correctly integrated in TitanPipeline)

**Conflict:**

- TitanPipelineService → ✅ Uses GeminiImageService
- AppImageGenerator (legacy) → ❌ Uses DalleService
- Creates inconsistency

### Problem 4: Generation vs Extraction

**Current Approach:**

```typescript
// Surveyor detects custom button texture
content: {
  imageDescription: "A blue cloud-textured button..."  // ❌ Text description
}

// Photographer generates approximation
await generateImageFromDescription(...)  // ❌ DALL-E/Gemini creates NEW image
```

**Missing:**

```typescript
// What SHOULD happen
extraction: {
  action: "crop",
  bounds: { top, left, width, height }  // ✅ Crop from original
}

// Extract actual pixels
const croppedTexture = await cropFromOriginal(originalImage, bounds)
```

---

## The Complete Fix: 5-Phase Implementation Plan

### Phase 0: Remove DALL-E Completely 🗑️

**Time:** 30 minutes  
**Priority:** High (eliminates confusion)

#### Files to Modify:

**1. Delete Files:**

```
src/services/dalleService.ts          → DELETE
src/utils/dalleRateLimiter.ts         → DELETE (if exists)
```

**2. Update `src/services/AppImageGenerator.ts`:**

```typescript
// BEFORE
import { getDalleService } from './dalleService';
const dalleService = getDalleService();
const heroImage = await dalleService.generateHeroImage({...});

// AFTER
import { getGeminiImageService } from './GeminiImageService';
const geminiService = getGeminiImageService();
const heroImage = await geminiService.generateBackgroundFromReference({
  vibe: designContext.vibe,
  vibeKeywords: [appName, appDescription],
  targetElement: 'hero section'
});
```

**3. Search & Replace Across Codebase:**

```bash
# Find all DALL-E imports
grep -r "dalleService" src/

# Replace with Gemini equivalents
```

**Verification:**

- ✅ No `import.*dalleService` in codebase
- ✅ All image generation uses `GeminiImageService`
- ✅ `npm run typecheck` passes

---

### Phase 1: Upgrade LayoutAutoFixEngine to Handle Content 🔧

**Time:** 1-2 hours  
**Priority:** Critical (fixes toothless fixer)

#### Changes to `src/services/LayoutAutoFixEngine.ts`:

**1. Add Content Properties Whitelist:**

```typescript
/**
 * Properties that are safe to auto-fix in content object
 */
const SAFE_CONTENT_PROPERTIES = [
  'text',
  'imageDescription',
  'imageAlt',
  'hasImage',
  'hasIcon',
  'iconSvgPath',
  'iconViewBox',
  'iconName',
  'iconColor',
  'iconPosition',
  'iconSize',
];
```

**2. Create `applyContentFix()` Method:**

```typescript
/**
 * Apply a single content property fix
 */
private applyContentFix(
  component: DetectedComponentEnhanced,
  property: string,
  value: unknown
): LayoutFixResult {
  // Ensure content object exists
  if (!component.content) {
    component.content = {};
  }

  const oldValue = (component.content as Record<string, unknown>)[property];

  // Check if property is safe to modify
  if (!SAFE_CONTENT_PROPERTIES.includes(property)) {
    return {
      componentId: component.id,
      success: false,
      property,
      oldValue: oldValue as string | number | undefined,
      newValue: value as string | number | undefined,
      error: `Property ${property} is not in the safe content properties list`,
    };
  }

  // Apply the fix
  (component.content as Record<string, unknown>)[property] = value;

  return {
    componentId: component.id,
    success: true,
    property: `content.${property}`,
    oldValue: oldValue as string | number | undefined,
    newValue: value as string | number | undefined,
  };
}
```

**3. Update `applyDiscrepancyFix()` to Process Content:**

```typescript
private applyDiscrepancyFix(
  components: DetectedComponentEnhanced[],
  discrepancy: LayoutDiscrepancy
): { applied: boolean; skipped: boolean; results: LayoutFixResult[] } {
  const results: LayoutFixResult[] = [];

  // ... existing component lookup code ...

  // Apply style corrections (existing)
  if (discrepancy.correctionJSON.style) {
    const styleUpdates = discrepancy.correctionJSON.style;
    for (const [property, value] of Object.entries(styleUpdates)) {
      const fixResult = this.applyStyleFix(component, property, value);
      results.push(fixResult);
    }
  }

  // [NEW] Apply content corrections
  if (discrepancy.correctionJSON.content) {
    const contentUpdates = discrepancy.correctionJSON.content;
    for (const [property, value] of Object.entries(contentUpdates)) {
      const fixResult = this.applyContentFix(component, property, value);
      results.push(fixResult);
    }
  }

  // Apply bounds corrections (existing)
  if (discrepancy.correctionJSON.bounds && this.config.validateBounds) {
    // ... existing bounds code ...
  }

  // ... rest of existing code ...
}
```

**Verification:**

- ✅ AutoFix engine can now modify `content.iconSvgPath`, `content.text`, etc.
- ✅ Test: Create fake discrepancy with `correctionJSON.content = { iconSvgPath: "M12..." }`
- ✅ Verify component.content.iconSvgPath gets updated

---

### Phase 2: Create Asset Extraction Service 🎨

**Time:** 2-3 hours  
**Priority:** High (enables exact replication)

#### New File: `src/services/AssetExtractionService.ts`

```typescript
/**
 * Asset Extraction Service
 *
 * Crops custom visuals from reference images instead of generating approximations.
 * Uses Sharp for server-side image processing.
 */

import sharp from 'sharp';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ExtractionRequest {
  /** Base64 original image */
  originalImage: string;
  /** Normalized bounds (0-100 scale) */
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** What this asset is for (used in filename) */
  targetElement: string;
}

export interface ExtractionResult {
  /** Public URL of uploaded asset */
  url: string;
  /** Whether extraction succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

class AssetExtractionService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sbUrl && sbKey) {
      this.supabase = createClient(sbUrl, sbKey);
    }
  }

  /**
   * Extract (crop) a region from the original image
   */
  async extractAsset(request: ExtractionRequest): Promise<ExtractionResult> {
    if (!this.supabase) {
      return { success: false, url: '', error: 'Supabase not configured' };
    }

    try {
      // 1. Convert base64 to buffer
      const base64Data = request.originalImage.includes(',')
        ? request.originalImage.split(',')[1]
        : request.originalImage;
      const buffer = Buffer.from(base64Data, 'base64');

      // 2. Get original image metadata
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      // 3. Convert normalized bounds (0-100) to pixel coordinates
      const cropX = Math.round((request.bounds.left / 100) * metadata.width);
      const cropY = Math.round((request.bounds.top / 100) * metadata.height);
      const cropWidth = Math.round((request.bounds.width / 100) * metadata.width);
      const cropHeight = Math.round((request.bounds.height / 100) * metadata.height);

      // 4. Crop and optimize
      const croppedBuffer = await sharp(buffer)
        .extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight,
        })
        .webp({ quality: 90 }) // Convert to WebP for smaller size
        .toBuffer();

      // 5. Upload to Supabase Storage
      const filename = `extracted-${request.targetElement}-${Date.now()}.webp`;
      const { data, error } = await this.supabase.storage
        .from('ai-images')
        .upload(filename, croppedBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (error) throw error;

      // 6. Get public URL
      const { data: urlData } = this.supabase.storage.from('ai-images').getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('[AssetExtractionService] Extraction failed:', error);
      return {
        success: false,
        url: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract multiple assets in parallel
   */
  async extractBatch(requests: ExtractionRequest[]): Promise<ExtractionResult[]> {
    return Promise.all(requests.map((req) => this.extractAsset(req)));
  }
}

// Singleton
let instance: AssetExtractionService | null = null;

export function getAssetExtractionService(): AssetExtractionService {
  if (!instance) {
    instance = new AssetExtractionService();
  }
  return instance;
}
```

#### Package Installation:

```bash
npm install sharp
```

#### Add to `package.json`:

```json
{
  "dependencies": {
    "sharp": "^0.33.2"
  }
}
```

**Verification:**

- ✅ Sharp installed and imports successfully
- ✅ Test: Extract a 100x100 region from test image
- ✅ Verify cropped image uploads to Supabase Storage
- ✅ Verify public URL is accessible

---

### Phase 3: Integrate VisionLoopEngine into Pipeline 🔄

**Time:** 2-3 hours  
**Priority:** Critical (connects healing loop)

#### Changes to `src/services/TitanPipelineService.ts`:

**1. Add Imports:**

```typescript
import { createVisionLoopEngine } from './VisionLoopEngine';
import { getAssetExtractionService } from './AssetExtractionService';
import puppeteer from 'puppeteer';
```

**2. Add Screenshot Capture Function:**

```typescript
/**
 * Render generated code and capture screenshot
 */
async function captureRenderedScreenshot(code: string): Promise<string | null> {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Create full HTML document
    const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; font-family: 'Inter', sans-serif; }
  </style>
</head>
<body>
  ${code}
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Capture screenshot
    const screenshot = await page.screenshot({ type: 'png', fullPage: true });
    await browser.close();

    // Convert to base64
    return `data:image/png;base64,${screenshot.toString('base64')}`;
  } catch (error) {
    console.error('[TitanPipeline] Screenshot capture failed:', error);
    if (browser) await browser.close();
    return null;
  }
}
```

**3. Update `runPipeline()` to Include Healing Loop:**

```typescript
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const warnings: string[] = [];
  const stepTimings: Record<string, number> = {};

  // ... existing router, surveyor, photographer code ...

  // Builder (initial code generation)
  const buildStart = Date.now();
  const primaryImageRef = manifests[0]?.originalImageRef;
  let files = await assembleCode(
    structure,
    manifests,
    physics,
    strategy,
    input.currentCode,
    input.instructions,
    generatedAssets,
    primaryImageRef
  );
  stepTimings.builder = Date.now() - buildStart;

  // [NEW] Phase: Healing Loop (1 iteration for speed)
  if (input.files.length > 0 && manifests.length > 0) {
    console.log('[TitanPipeline] Starting healing loop...');
    const healStart = Date.now();

    try {
      // 1. Extract App.tsx content for rendering
      const appFile = files.find((f) => f.path === '/src/App.tsx');
      if (!appFile) {
        warnings.push('No App.tsx found, skipping healing loop');
      } else {
        // 2. Render and screenshot
        const screenshot = await captureRenderedScreenshot(appFile.content);
        if (!screenshot) {
          warnings.push('Screenshot capture failed, skipping healing loop');
        } else {
          // 3. Run vision loop (1 iteration)
          const visionEngine = createVisionLoopEngine({ maxIterations: 1 });
          const originalImage = input.files[0].base64;

          // Get current components from manifest
          const currentComponents = manifests[0]?.global_theme?.dom_tree
            ? [manifests[0].global_theme.dom_tree]
            : [];

          const stepResult = await visionEngine.executeStep(
            originalImage,
            currentComponents,
            null, // designSpec not needed for this flow
            async () => screenshot,
            1
          );

          console.log('[TitanPipeline] Healing iteration complete:', {
            fidelityScore: stepResult.fidelityScore,
            changesApplied: stepResult.changesApplied,
          });

          // 4. If fixes were applied, regenerate code
          if (stepResult.changesApplied > 0) {
            console.log('[TitanPipeline] Regenerating code with fixes...');

            // Update manifest with fixed components
            if (manifests[0]?.global_theme?.dom_tree) {
              manifests[0].global_theme.dom_tree = stepResult.components[0];
            }

            // Regenerate code
            files = await assembleCode(
              structure,
              manifests,
              physics,
              strategy,
              input.currentCode,
              input.instructions,
              generatedAssets,
              primaryImageRef
            );

            warnings.push(
              `Healing loop applied ${stepResult.changesApplied} fixes (fidelity: ${stepResult.fidelityScore}%)`
            );
          }
        }
      }
    } catch (error) {
      console.error('[TitanPipeline] Healing loop error:', error);
      warnings.push('Healing loop encountered an error but pipeline continued');
    }

    stepTimings.healing = Date.now() - healStart;
  }

  return { files, strategy, manifests, physics, warnings, stepTimings };
}
```

**4. Install Puppeteer:**

```bash
npm install puppeteer
```

**Verification:**

- ✅ Pipeline generates initial code
- ✅ Code is rendered in headless browser
- ✅ Screenshot is captured
- ✅ VisionLoopEngine compares vs original
- ✅ Fixes are applied if fidelity < 95%
- ✅ Code is regenerated with fixes
- ✅ Final result includes healing metrics in warnings

---

### Phase 4: Update Prompts to Prioritize Extraction 📝

**Time:** 1 hour  
**Priority:** High (prevents approximations)

#### Changes to `src/services/TitanPipelineService.ts`:

**1. Update SURVEYOR_PROMPT (Lines 100-150):**

Add extraction detection:

```typescript
const SURVEYOR_PROMPT = `### Role
You are the **UI Reverse Engineer**.

### Task
// ... existing instructions ...

### CRITICAL - CUSTOM VISUAL DETECTION:
For ANY non-standard visual element (textured buttons, custom icons, logos, gradients):
1. Set "hasCustomVisual": true
2. Set "extractionAction": "crop" (to extract from original)
3. Provide exact bounds for cropping
4. DO NOT provide imageDescription (we will extract, not generate)

### Output Schema (Strict JSON)
{
  "canvas": { ... },
  "dom_tree": {
    "type": "div",
    // ... existing fields ...
    "hasCustomVisual": true/false,  // [NEW] Flag for extraction
    "extractionAction": "crop"|"skip",  // [NEW] What to do with this element
    "extractionBounds": { top, left, width, height },  // [NEW] Where to crop from
    "children": []
  }
}
`;
```

**2. Update BUILDER_PROMPT (Lines 350-450):**

Prioritize extracted assets:

```typescript
const BUILDER_PROMPT = `### Role
You are the **Universal Builder**.

### Instructions

1. **ASSET PRIORITY (CRITICAL):**
   a) If extractedAssetUrl exists → USE IT (exact replica from original)
   b) If iconSvgPath exists → RENDER inline SVG (exact shape)
   c) LAST RESORT: Use generated asset URL from Assets object

   NEVER generate/approximate when extraction is available.

2. **DATA-ID ATTRIBUTES (MANDATORY):** ...

3. **REPLICATION MODE (CRITICAL):** ...

// ... rest of existing prompt ...
`;
```

**3. Update `assembleCode()` to Handle Extracted Assets:**

```typescript
export async function assembleCode(
  _structure: ComponentStructure | null,
  manifests: VisualManifest[],
  physics: MotionPhysics | null,
  _strategy: MergeStrategy,
  _currentCode: string | null,
  instructions: string,
  assets: Record<string, string>,
  originalImageRef?: { fileUri: string; mimeType: string }
): Promise<AppFile[]> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // [NEW] Extract custom visuals before building
  const extractionService = getAssetExtractionService();
  const extractedAssets: Record<string, string> = {};

  for (const manifest of manifests) {
    if (manifest.global_theme?.dom_tree) {
      await extractCustomVisuals(
        manifest.global_theme.dom_tree,
        originalImageRef,
        extractedAssets,
        extractionService
      );
    }
  }

  // Merge extracted + generated assets
  const allAssets = { ...assets, ...extractedAssets };

  // ... rest of existing code with allAssets instead of assets ...
}

/**
 * Recursively find and extract custom visuals
 */
async function extractCustomVisuals(
  node: any,
  originalImageRef: any,
  extractedAssets: Record<string, string>,
  extractionService: any
): Promise<void> {
  if (node.hasCustomVisual && node.extractionAction === 'crop' && node.extractionBounds) {
    console.log('[AssetExtraction] Extracting:', node.id);

    // Load original image
    const response = await fetch(originalImageRef.fileUri);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const result = await extractionService.extractAsset({
      originalImage: `data:${originalImageRef.mimeType};base64,${base64}`,
      bounds: node.extractionBounds,
      targetElement: node.id,
    });

    if (result.success) {
      extractedAssets[node.id] = result.url;
      console.log('[AssetExtraction] Success:', result.url);
    }
  }

  // Recurse
  if (node.children) {
    for (const child of node.children) {
      await extractCustomVisuals(child, originalImageRef, extractedAssets, extractionService);
    }
  }
}
```

**Verification:**

- ✅ Surveyor detects custom visuals and flags for extraction
- ✅ `extractCustomVisuals()` crops regions from original image
- ✅ Extracted assets are prioritized over generated ones in Builder
- ✅ Test: Upload image with custom button → verify exact texture is cropped

---

### Phase 5: Testing & Validation ✅

**Time:** 2 hours  
**Priority:** Critical (confirms fix works)

#### Test Cases:

**Test 1: Custom Gradient Button**

```
Input: Screenshot with button having unique gradient (e.g., #FF0080 → #8000FF at 135deg)
Expected:
- Surveyor detects gradient
- Builder applies exact gradient CSS
- Healing loop verifies gradient angle/colors
- Fidelity score: 95%+
```

**Test 2: Hand-Drawn Icon**

```
Input: Screenshot with custom non-Lucide icon (e.g., hand-drawn arrow)
Expected:
- Surveyor extracts SVG path or flags for extraction
- Builder renders inline SVG with exact path
- NOT replaced with generic Lucide icon
- Fidelity score: 95%+
```

**Test 3: Textured Background**

```
Input: Screenshot with photographic texture (e.g., wood grain, fabric)
Expected:
- Surveyor flags texture for extraction
- AssetExtractionService crops texture region
- Builder applies as backgroundImage
- Healing loop confirms texture matches
- Fidelity score: 95%+
```

**Test 4: Logo Extraction**

```
Input: Screenshot with company logo
Expected:
- Surveyor detects logo, flags for extraction
- Logo is cropped from original image
- Applied as <img> or background
- NOT replaced with placeholder
- Fidelity score: 95%+
```

**Test 5: Glassmorphism Effect**

```
Input: Screenshot with blur + transparency effect
Expected:
- Surveyor detects backdrop-filter
- Builder applies exact blur/opacity values
- Healing loop verifies effect presence
- Fidelity score: 95%+
```

#### Validation Checklist:

- [ ] All tests pass with fidelity ≥ 95%
- [ ] No DALL-E references in codebase
- [ ] Healing loop runs automatically
- [ ] AutoFix engine modifies content
- [ ] Asset extraction works for 10+ elements
- [ ] No regression on standard designs
- [ ] Performance: Pipeline completes in <30s

---

## Expected Outcomes

### Before (Current State):

| Input               | Current Output            | Fidelity |
| ------------------- | ------------------------- | -------- |
| Custom cloud button | White rectangle           | ~65%     |
| Hand-drawn arrow    | Generic Lucide ArrowRight | ~70%     |
| Wood texture bg     | Solid brown color         | ~60%     |
| Company logo        | [IMG] placeholder         | ~50%     |
| Gradient mesh       | Single solid color        | ~65%     |

### After (All Phases Complete):

| Input               | Expected Output                                         | Fidelity |
| ------------------- | ------------------------------------------------------- | -------- |
| Custom cloud button | **Exact cloud shape (clip-path) + texture (extracted)** | **95%+** |
| Hand-drawn arrow    | **Exact SVG path rendered inline**                      | **95%+** |
| Wood texture bg     | **Cropped original texture as backgroundImage**         | **95%+** |
| Company logo        | **Extracted logo as image or SVG**                      | **95%+** |
| Gradient mesh       | **Exact gradient with all color stops**                 | **95%+** |

---

## Implementation Order

**Week 1:**

1. Monday: Phase 0 (Remove DALL-E) - 30 min
2. Monday: Phase 1 (Upgrade AutoFix) - 2 hours
3. Tuesday: Phase 2 (Asset Extraction) - 3 hours
4. Wednesday: Phase 3 (Integrate Healing Loop) - 3 hours
5. Thursday: Phase 4 (Prompt Updates) - 1 hour
6. Friday: Phase 5 (Testing & Validation) - 2 hours

**Total:** 11.5 hours across 5 days

---

## Success Metrics

1. **Fidelity Score:** 95%+ on custom visual tests
2. **Healing Loop:** Runs automatically, applies 5-15 fixes per iteration
3. **Asset Extraction:** Successfully crops 90%+ of flagged elements
4. **AutoFix Coverage:** Handles style + bounds + content
5. **No DALL-E:** Zero references in active codebase
6. **Performance:** Pipeline completes in ≤30 seconds
7. **User Feedback:** "Exact replicas" confirmed by users

---

## Rollback Plan

If any phase causes issues:

1. **Phase 0 Rollback:** Restore DALL-E files from git
2. **Phase 1 Rollback:** Revert AutoFix changes, system still works (just doesn't fix content)
3. **Phase 2 Rollback:** Remove AssetExtraction calls, falls back to generation
4. **Phase 3 Rollback:** Comment out healing loop in pipeline
5. **Phase 4 Rollback:** Revert prompt changes

Each phase is independently reversible without breaking the system.

---

## Future Enhancements (Post-Fix)

1. **Multi-Iteration Healing:** Increase maxIterations to 3 for 98%+ fidelity
2. **Asset Caching:** Cache extracted assets to avoid re-cropping
3. **SVG Tracing:** Auto-trace bitmap graphics to SVG for scalability
4. **Smart Preset Detection:** When to use preset vs custom (user preference)
5. **Fidelity Dashboard:** Real-time fidelity scoring in UI

---

## Questions & Answers

**Q: Will this slow down the pipeline?**  
A: Phase 3 adds ~5-10 seconds (1 healing iteration). Total pipeline: 20-30 seconds.

**Q: What if extraction fails?**  
A: Falls back to Gemini Imagen 3 generation (current behavior).

**Q: Does this work for video inputs?**  
A: Yes, Surveyor extracts keyframes, healing loop applies to each frame.

**Q: Can users disable healing loop?**  
A: Yes, add `skipHealing: true` flag to PipelineInput.

**Q: What about mobile/responsive?**  
A: Extraction works at any viewport size. Healing loop tests at 1440px desktop.

---

## Conclusion

This 5-phase plan transforms the AI-app from an "Interpretation Engine" (generates approximations) to a "Replication Engine" (extracts exact visuals). By connecting the existing healing loop, upgrading the auto-fixer, removing DALL-E interference, and implementing asset extraction, we achieve 95%+ visual fidelity on custom artistic elements.

**Ready to implement? Toggle to Act mode and let's start with Phase 0!**
