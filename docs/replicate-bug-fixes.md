# Layout Builder Exact Replication Fix Plan

## Executive Summary

The layout builder has **26 distinct barriers** preventing exact image replication, found across two comprehensive analysis passes. They span hardcoded dimensions, triple-normalization, template bias, creative-mode prompts, asset disconnection, data loss in transit, and aggressive post-processing. This plan provides a **backward-compatible, phased solution** to achieve pixel-perfect replication.

## Complete Issue Inventory (26 Issues)

### 🔴 CRITICAL (Silent Design Overrides)

1. **Hardcoded 1440x900 canvas** — `TitanSurveyor.ts:393`, `TitanHealingLoop.ts:103`
2. **TRIPLE normalization** — `GeminiComponentBuilder.ts:107` (heuristic), `layoutValidation.ts:592` (`safeNumber`), `layoutValidation.ts:41` (`toPercentage`) — THREE separate places try to normalize coordinates
3. **Hardcoded 16px gap fallback** — `layoutValidation.ts:965`
4. **Color fallbacks** — `colorUtils.ts:13` returns `#000000`, `colorUtils.ts:156` returns `#f3f4f6`
5. **Template dimensions in prompts** — 900px hero, 1440px canvas examples throughout
6. **Asset disconnect** — `TitanBuilder.ts` requires AI to "look up" assets by ID, often fails
7. **Hardcoded default design spec** — `GeminiLayoutService.ts:195-236` injects Tailwind blue theme
8. **System prompt trains creative deviation** — `geminiLayoutBuilderPrompt.ts:11-218` — "creative partner", "suggest improvements", "pixel-perfect OR creative interpretations"
9. **AssetExtraction assumes 0-100 scale** — `AssetExtractionService.ts:109` — Crops at 1/10th size if 0-1000 bounds arrive
10. **iconName permanently deleted** — `TitanPipelineService.ts:268` — Deletes before asset available; unrecoverable if extraction fails

### 🟡 HIGH (Data Loss / Misinterpretation)

11. **Fragile coordinate scale detection** — `GeminiComponentBuilder.ts:123` (`maxCoord > 105` heuristic)
12. **Gap recalculation overrides measured values** — `layoutValidation.ts:927-966`
13. **Absolute critique thresholds** — `GeminiLayoutCritique.ts:202` (">10px" rule doesn't scale)
14. **Builder prompt missing negative constraints** — No "don't add hover effects", "don't improve"
15. **Icon list contradiction** — Surveyor allows 12 icons, Builder lists many more (Home, User, Star, Heart etc.)
16. **`toPercentageWithMin()` hardcoded 1% minimum** — `layoutValidation.ts:51` — Tiny elements artificially enlarged
17. **VisualManifest → LayoutManifest conversion loses data** — `useLayoutBuilder.ts:135-202` — Colors deduped, structure flattened, fonts default to 'Inter'
18. **Healing loop critique too aggressive** — No exemptions for rendering artifacts (anti-aliasing, sub-pixel, font rendering)
19. **Vague request examples train deviation** — `geminiLayoutBuilderPrompt.ts:63-79` — "Make it modern" = add shadows/gradients automatically

### 🟢 MEDIUM (Edge Cases / Refinements)

20. **MIN_DIMENSION=1920 upscaling** — `TitanSurveyor.ts:31`
21. **Typography validation clamps font sizes** — `GeminiComponentBuilder.ts:36-62`
22. **Design token preset rounding** — `designTokenMappings.ts` rounds to Tailwind presets
23. **resolveRootOverlaps destroys intentional overlaps** — `layoutValidation.ts:1088`
24. **Font fallback to 'Inter'** — `useLayoutBuilder.ts:198-199` injects 'Inter' when fonts missing
25. **Math.round precision loss** — `AssetExtractionService.ts:109-112` loses sub-pixel accuracy
26. **DEFAULT_BOUNDS hardcoded 20x10** — `layoutValidation.ts:24-29` — Missing bounds get arbitrary size

---

## Implementation Plan

### Phase 1: Configuration-Driven Dimensions (CRITICAL - Week 1)

**Goal**: Support any aspect ratio by measuring actual image dimensions

#### Files to Modify:

1. `src/types/titanPipeline.ts`
2. `src/services/TitanSurveyor.ts`
3. `src/services/TitanHealingLoop.ts`
4. `src/services/TitanPipelineService.ts`

#### Changes:

**1.1 Add Canvas Configuration Types** (`src/types/titanPipeline.ts`)

```typescript
export interface CanvasConfig {
  width: number;
  height: number;
  source: 'measured' | 'fallback';
  aspectRatio: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
}
```

**1.2 Extract Image Metadata** (`src/services/TitanSurveyor.ts`)

- Add `extractImageMetadata()` function before `enhanceImageQuality()`
- Use Sharp to read actual image dimensions
- Return metadata for threading through pipeline

**1.3 Update Surveyor to Use Measured Canvas** (`src/services/TitanSurveyor.ts`)

- Line ~350: Add `canvasConfig?: CanvasConfig` parameter to `runTitanSurveyor()`
- Extract metadata at function start (before enhancement)
- Pass measured dimensions to prompt: "The uploaded image is ${canvas.width}px × ${canvas.height}px"
- Line 393: Replace hardcoded `{ width: 1440, height: 900 }` with measured canvas

**1.4 Update Healing Loop Viewport** (`src/services/TitanHealingLoop.ts`)

- Line ~86: Add `canvasConfig?: CanvasConfig` parameter
- Line 103: Replace `setViewport({ width: 1440, height: 900 })` with `setViewport(canvasConfig || defaultViewport)`

**1.5 Thread Canvas Through Pipeline** (`src/services/TitanPipelineService.ts`)

- Extract canvas from first manifest after Surveyor runs
- Pass canvas to Healing Loop for consistent screenshot dimensions

**Backward Compatibility**: ✅ Defaults to measured dimensions, fallback to 1440x900 only if extraction fails

---

### Phase 2: Eliminate Triple-Normalization (CRITICAL - Week 1)

**Goal**: Single source of truth for coordinate scale. Currently THREE separate functions try to normalize:

- `GeminiComponentBuilder.ts:107-143` — `normalizeCoordinates()` heuristic (`maxCoord > 105`)
- `layoutValidation.ts:579-595` — `safeNumber()` (`num > 100 ? num / 10 : num`)
- `layoutValidation.ts:41-55` — `toPercentage()` / `toPercentageWithMin()` clamping

#### Files to Modify:

1. `src/types/layoutDesign.ts`
2. `src/services/GeminiComponentBuilder.ts`
3. `src/services/TitanSurveyor.ts`
4. `src/utils/layoutValidation.ts`
5. `src/services/AssetExtractionService.ts`

#### Changes:

**2.1 Add Explicit Scale Metadata** (`src/types/layoutDesign.ts`)

```typescript
export interface DetectedComponentEnhanced {
  // ... existing fields
  _coordinateScale?: '0-100' | '0-1000';
}
```

**2.2 Update Surveyor Prompt** (`src/services/TitanSurveyor.ts`, line ~120)

- Instruct AI to include `"_coordinateScale": "0-100"` in EVERY component
- Example: `{ "top": 0, "left": 0, "width": 100, "height": 8, "_coordinateScale": "0-100" }`

**2.3 Update Component Builder Prompt** (`src/services/GeminiComponentBuilder.ts`, line ~154)

- Instruct AI to include `"_coordinateScale": "0-1000"` in EVERY component

**2.4 Remove Heuristic Detection** (`src/services/GeminiComponentBuilder.ts`, lines 107-143)

- **DELETE** fragile `maxCoord > 105` heuristic
- **KEEP** only explicit scale check (lines 90-105)
- Default to 0-100 if no metadata present (safest assumption)

**2.5 Remove `safeNumber()` scale conversion** (`src/utils/layoutValidation.ts`, line 592)

```typescript
// BEFORE (line 592): Guesses scale from value magnitude
const converted = num > 100 ? num / 10 : num;

// AFTER: Trust upstream normalization, just clamp
const converted = num;
```

**2.6 Fix `toPercentageWithMin()` minimum** (`src/utils/layoutValidation.ts`, line 51)

```typescript
// BEFORE: Hardcoded 1% minimum enlarges tiny elements
function toPercentageWithMin(val, defaultVal, min = 1);

// AFTER: Allow sub-1% for thin dividers, tiny icons
function toPercentageWithMin(val, defaultVal, min = 0.1);
```

**2.7 Fix AssetExtraction scale assumption** (`src/services/AssetExtractionService.ts`, line 109)

- Add scale-aware conversion: check if bounds > 100 → divide by 10 before computing crop pixels
- Or require upstream to always pass normalized 0-100 bounds (verify call sites)

**Backward Compatibility**: ✅ Components without metadata assume 0-100 scale

---

### Phase 3: Remove Hardcoded Fallbacks (HIGH - Week 2)

**Goal**: Preserve measured values instead of injecting defaults

#### Files to Modify:

1. `src/utils/layoutValidation.ts`
2. `src/utils/colorUtils.ts`
3. `src/services/GeminiLayoutService.ts`
4. `src/hooks/useLayoutBuilder.ts`

#### Changes:

**3.1 Preserve Measured Gaps** (`src/utils/layoutValidation.ts`, line 950)

```typescript
// Before: Always recalculate gap
const calculatedGap = `${Math.round(Math.max(0, avgGap))}%`;

// After: Preserve existing gap if available
const existingGap = component.layout?.gap;
const calculatedGap = existingGap || `${Math.round(Math.max(0, avgGap))}%`;
console.log(
  `[inferContainerLayouts] ${component.id}: ${existingGap ? 'preserving' : 'calculating'} gap`
);
```

**3.2 Remove Hardcoded Color Fallbacks** (`src/utils/colorUtils.ts`)

- **DELETE** `getVisibleFallbackLegacy()` function (lines 154-159) - deprecated, injects hardcoded grays
- **UPDATE** `getVisibleFallback()` to return `'transparent'` instead of `'#f3f4f6'` when color is undefined
- **FIX** `normalizeColor()` to return `'transparent'` instead of `'#000000'` for undefined colors

**3.3 Fix Default Design Spec Fallback** (`src/services/GeminiLayoutService.ts`, lines 195-236)

```typescript
// Before: Silent fallback to Tailwind blue theme
private getDefaultDesignSpec(): DesignSpec {
  return {
    colorPalette: { primary: '#3b82f6', ... }, // Hardcoded Tailwind colors
    typography: { headingFont: 'Inter', ... },
  };
}

// After: Fail loudly or use neutral defaults
private getDefaultDesignSpec(): DesignSpec {
  console.warn('[GeminiLayoutService] Stage 1 failed - using neutral defaults');
  return {
    colorPalette: {
      primary: 'inherit',
      secondary: 'inherit',
      accent: 'inherit',
      background: 'transparent',
      text: 'inherit',
    },
    typography: { headingFont: 'inherit', bodyFont: 'inherit' },
    spacing: { unit: 0, scale: [] }, // Signal "unknown"
  };
}
```

- Or better: Throw error to trigger Stage 1 retry

**3.4 Fix Font Fallback to 'Inter'** (`src/hooks/useLayoutBuilder.ts`, lines 198-199)

```typescript
// BEFORE: Hardcoded 'Inter' when fonts missing
heading: fontsArray[0] ?? 'Inter',
body: fontsArray[1] ?? fontsArray[0] ?? 'Inter',

// AFTER: Use 'inherit' to signal "no font detected"
heading: fontsArray[0] ?? 'inherit',
body: fontsArray[1] ?? fontsArray[0] ?? 'inherit',
```

**3.5 Fix DEFAULT_BOUNDS** (`src/utils/layoutValidation.ts`, lines 24-29)

```typescript
// BEFORE: Arbitrary small defaults
export const DEFAULT_BOUNDS = { top: 0, left: 0, width: 20, height: 10 };

// AFTER: Full-width default signals "unknown size, display as block"
export const DEFAULT_BOUNDS = { top: 0, left: 0, width: 100, height: 5 };
```

- Components missing bounds should display as full-width blocks, not 20% chips

**Backward Compatibility**: ✅ Functions remain, logic changes only

---

### Phase 4: Fix Asset Injection & Prompt Constraints (CRITICAL - Week 2)

**Goal**: Ensure extracted images are reliably used + add negative constraints for replication mode

#### Files to Modify:

1. `src/services/TitanBuilder.ts`
2. `src/services/TitanSurveyor.ts`
3. `src/services/GeminiComponentBuilder.ts`
4. `src/prompts/geminiLayoutBuilderPrompt.ts`
5. `src/services/TitanPipelineService.ts`
6. `src/services/GeminiLayoutCritique.ts`

#### Changes:

**4.1 Inject Assets Directly into Manifest Nodes** (`src/services/TitanBuilder.ts`)

```typescript
// BEFORE: Assets passed as separate context, AI must "look up"
// PROBLEM: AI often forgets or substitutes Lucide icons

// AFTER: Pre-process manifests to inject asset URLs directly into nodes
for (const manifest of manifests) {
  for (const node of manifest.global_theme?.dom_tree ?? []) {
    if (assets[node.id]) {
      node.extractedAssetUrl = assets[node.id];
      node.hasCustomVisual = true; // Signal to AI: use this, don't substitute
    }
  }
}

// Update prompt to reference node.extractedAssetUrl directly:
('If node.extractedAssetUrl exists, use: <img src={node.extractedAssetUrl} />');
('NEVER substitute Lucide icons when extractedAssetUrl is present');
```

**4.2 Add Negative Constraints to Builder Prompt** (`src/services/TitanBuilder.ts`)

```typescript
### REPLICATION CONSTRAINTS (MANDATORY)
- Do NOT add hover/focus effects unless specified in interactionStates
- Do NOT adjust spacing, padding, or margins from manifest values
- Do NOT substitute colors for "better" alternatives
- Do NOT add responsive breakpoints unless explicitly requested
- Do NOT replace extractedAssetUrl images with Lucide icons
- The manifest is GROUND TRUTH. Translate it to code, don't improve it.
```

**4.3 Dynamic Examples in Surveyor Prompt** (`src/services/TitanSurveyor.ts`, line ~127)

- **REMOVE**: `{ "width": "1440px", "height": "86px" }` hardcoded examples
- **REPLACE**: Calculate example percentages from actual canvas dimensions
- Example: `"height": ${Math.round((80 / canvas.height) * 100)}` (80px header on actual canvas)

**4.4 Remove Pixel Values in Component Builder** (`src/services/GeminiComponentBuilder.ts`, line ~200)

- **REMOVE**: All "900px hero", "1440px wide" mentions
- **REPLACE**: Relative descriptions ("40% of viewport height", "full width")

**4.5 Overhaul Layout Builder System Prompt** (`src/prompts/geminiLayoutBuilderPrompt.ts`)

The current prompt has multiple contradictions that undermine replication:

- Line 11: "creative, enthusiastic" persona
- Line 24: "Suggest improvements and offer design insights"
- Line 64-79: Vague request examples train AI to deviate ("Make it modern" = add shadows/gradients)
- Line 178: "Never Say I Can't" — enables deviation
- Line 183: "Be Creative: Offer suggestions and improvements"
- Line 213: "pixel-perfect replicas **or creative interpretations**" — the "or" permits deviation

**Changes needed:**

1. Add mode-aware preamble at top of prompt:

```typescript
### MODE: FORENSIC REPLICATION (when reference image provided)
When replicating from an image, switch to forensic analyst mode:
- Your job is to MEASURE and REPRODUCE, not to CREATE or IMPROVE
- Report exactly what you see, even if the design has flaws
- Do NOT apply vague request transformations ("make it modern", "more professional")
  when a reference image exists — the reference IS the ground truth
- Preserve the source design with pixel-perfect accuracy
```

2. Guard all "creative" instructions with: "Only when NO reference image is provided"
3. Line 213: Change to "Build pixel-perfect replicas from reference images"
4. Remove or guard Examples 5-6 (lines 63-79) with "ONLY when no reference image"

**4.6 Reconcile Icon Lists** (`src/services/TitanSurveyor.ts` + `src/services/TitanBuilder.ts`)

- Surveyor (line 138-142) allows 12 standard UI chrome icons
- Builder (line 81-87) lists additional icons: Home, User, Settings, Star, Heart
- **FIX**: Use SAME list in both. Import from `iconConstants.ts` (`isUIChromeIcon()`) to ensure single source of truth
- Any icon NOT in the shared list must use `extractedAssetUrl` or `iconSvgPath`

**4.7 Preserve iconName as Fallback** (`src/services/TitanPipelineService.ts`, line ~268)

```typescript
// BEFORE: Permanently deletes iconName
delete node.iconName;

// AFTER: Preserve as fallback in case extraction fails
node._originalIconName = node.iconName; // Backup before deletion
delete node.iconName;

// Then in Builder, if extractedAssetUrl is missing:
// Use node._originalIconName as last resort (better than nothing)
```

**4.8 Add Healing Loop Rendering Artifact Exemptions** (`src/services/GeminiLayoutCritique.ts`)
Add to critique prompt:

```
### ACCEPTABLE RENDERING DIFFERENCES (do NOT flag):
- Anti-aliasing differences between browser and original image
- Sub-pixel positioning (±1px shifts)
- Font rendering differences (hinting, smoothing)
- Tailwind class specificity vs exact CSS minor differences
- Image compression artifacts vs original quality

Only flag differences visible to a human at normal viewing distance.
```

**Backward Compatibility**: ✅ Prompts are runtime-only, manifest preprocessing doesn't break existing code

---

### Phase 5: Relative Critique Thresholds (MEDIUM - Week 3)

**Goal**: Scale-aware critique severity thresholds

#### Files to Modify:

1. `src/services/GeminiLayoutCritique.ts`

#### Changes:

**5.1 Add Canvas Context to Critique** (`src/services/GeminiLayoutCritique.ts`, line 148)

- Add `canvas: CanvasConfig` parameter to `critiqueLayoutEnhanced()`
- Update prompt severity guidelines:
  ```
  - critical: Difference > 5% of component size
  - moderate: Difference > 2% of component size (e.g., ${Math.round(canvas.width * 0.02)}px at current scale)
  - minor: Difference < 2% of component size
  ```
- Instruct AI to use percentages instead of absolute pixels

**Backward Compatibility**: ✅ Add default canvas if not provided

---

### Phase 6: Refine Overlap Resolution (MEDIUM - Week 3)

**Goal**: Only fix genuinely broken layouts, not intentional overlaps

#### File to Modify:

1. `src/utils/layoutValidation.ts`

#### Changes:

**6.1 Add Overlap Threshold** (`src/utils/layoutValidation.ts`, lines 1088-1107)

```typescript
// BEFORE: Fixes any overlap, even 1px
if (next.bounds.top < currentBottom) {
  next.bounds.top = currentBottom;
}

// AFTER: Only fix if >50% of next section is buried (clearly broken)
const overlapAmount = currentBottom - next.bounds.top;
const overlapPercent = overlapAmount / next.bounds.height;

if (overlapPercent > 0.5) {
  console.log(`[resolveRootOverlaps] Fixing ${Math.round(overlapPercent * 100)}% overlap`);
  next.bounds.top = currentBottom;
} else {
  console.log(
    `[resolveRootOverlaps] Preserving intentional ${Math.round(overlapPercent * 100)}% overlap`
  );
}
```

- Preserves hero sections with sticky headers overlapping
- Preserves floating CTAs overlapping section boundaries
- Only fixes truly broken AI output

**Backward Compatibility**: ✅ Logic refinement, no API changes

---

### Phase 7-9: Optional Refinements (LOW - Week 3)

#### 7. Typography Validation Opt-Out

- **File**: `src/services/GeminiComponentBuilder.ts`
- **Change**: Add `TRUST_AI_TYPOGRAPHY=true` env var to skip validation
- **Impact**: Preserves exact AI font measurements

#### 8. Design Token Exact Mode

- **File**: `src/utils/designPatterns.ts`
- **Change**: Add `exactDesignTokens` mode to skip preset rounding
- **Impact**: Uses measured values instead of Tailwind presets

#### 9. Configurable Upscaling

- **File**: `src/services/TitanSurveyor.ts`
- **Change**: Add `MIN_IMAGE_DIMENSION=0` env var to disable upscaling
- **Impact**: Preserves small images without interpolation

---

## Critical Files Reference (13 files)

| File                                             | Issues #        | Key Problems                                                                           | Changes                                                                                 |
| ------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/services/TitanSurveyor.ts`                  | 1,5,20          | Hardcoded 1440x900 canvas, 1920px upscale, template examples in prompt                 | Extract metadata, dynamic canvas, dynamic examples                                      |
| `src/services/TitanBuilder.ts`                   | 6,14,15         | Asset disconnect, missing negative constraints, icon list mismatch                     | Inject assets into nodes, add REPLICATION CONSTRAINTS, reconcile icon list              |
| `src/services/TitanPipelineService.ts`           | 1,10            | Canvas not threaded, iconName permanently deleted                                      | Thread canvas through pipeline, preserve iconName as fallback                           |
| `src/services/GeminiComponentBuilder.ts`         | 2,11,21         | Triple-normalization heuristic, fragile scale detection, typography clamping           | Remove heuristic, explicit scale, opt-out typography validation                         |
| `src/services/GeminiLayoutService.ts`            | 7               | Hardcoded Tailwind blue design spec fallback                                           | Use neutral defaults or fail loudly                                                     |
| `src/utils/layoutValidation.ts`                  | 2,3,12,16,23,26 | safeNumber re-normalizes, 16px gap, gap recalculation, 1% min, overlap, DEFAULT_BOUNDS | Remove safeNumber conversion, preserve gaps, lower min, overlap threshold, fix defaults |
| `src/utils/colorUtils.ts`                        | 4               | normalizeColor→#000000, getVisibleFallbackLegacy→#f3f4f6                               | Return transparent, delete legacy function                                              |
| `src/services/AssetExtractionService.ts`         | 9,25            | Assumes 0-100 scale, Math.round precision loss                                         | Scale-aware conversion, precision preservation                                          |
| `src/services/TitanHealingLoop.ts`               | 1               | Hardcoded 1440x900 viewport                                                            | Dynamic viewport from canvas                                                            |
| `src/services/GeminiLayoutCritique.ts`           | 13,18           | Absolute thresholds, no rendering artifact exemptions                                  | Relative percentages, add exemption list                                                |
| `src/prompts/geminiLayoutBuilderPrompt.ts`       | 8,19            | "Creative partner" persona, vague request training                                     | Add FORENSIC mode, guard creative instructions                                          |
| `src/hooks/useLayoutBuilder.ts`                  | 17,24           | VisualManifest data loss, font fallback to 'Inter'                                     | Preserve structure, use 'inherit'                                                       |
| `src/types/titanPipeline.ts` + `layoutDesign.ts` | 2               | Missing CanvasConfig and \_coordinateScale types                                       | Add interfaces                                                                          |

---

## Testing Strategy

### Unit Tests (Add to existing test suites)

```typescript
// Canvas dimension extraction (#1)
expect(extractImageMetadata(mobileImage).width).toBe(375); // Not 1440

// No triple-normalization with explicit scale (#2)
expect(normalizeCoordinates([{ bounds: { top: 500 }, _coordinateScale: '0-1000' }])[0].bounds.top).toBe(50);

// safeNumber no longer re-normalizes (#2)
expect(safeNumber(75, 0)).toBe(75); // Not divided by 10

// Gap preservation (#3, #12)
expect(inferContainerLayouts([{ layout: { gap: '12%' }, children: [...] }])[0].layout.gap).toBe('12%');

// Color fallbacks return transparent (#4)
expect(normalizeColor(undefined)).toBe('transparent'); // Not '#000000'
expect(getVisibleFallback(undefined)).toBe('transparent'); // Not '#f3f4f6'

// Tiny element minimum (#16)
expect(toPercentageWithMin(0.3, 5)).toBe(0.3); // Not clamped to 1%

// Font fallback (#24)
expect(convertVisualManifestToLayoutManifest([emptyManifest]).designSystem.fonts.heading).toBe('inherit'); // Not 'Inter'
```

### Manual Verification Checklist

- [ ] Upload 375x812 mobile screenshot → renders at correct aspect ratio (#1)
- [ ] Upload 1920x1080 desktop screenshot → exact match (#1)
- [ ] Upload 3440x1440 ultrawide → no distortion (#1)
- [ ] Upload layout with 24px gaps → preserves 24px, not recalculated (#3, #12)
- [ ] Upload design with custom colors → no gray or black fallbacks (#4)
- [ ] Upload design with custom images/photos → extracted assets appear, not Lucide icons (#6, #10)
- [ ] Upload design with intentional overlaps (sticky header) → overlap preserved (#23)
- [ ] Upload small 800x600 image with upscaling disabled → no artifacts (#20)
- [ ] Stage 1 design spec extraction fails → neutral defaults, not Tailwind blue (#7)
- [ ] Upload reference image with "make it modern" instruction → AI replicates image exactly, ignores vague request (#8, #19)
- [ ] Upload design with thin dividers (1px) → preserved, not enlarged to 1% (#16)
- [ ] Healing loop doesn't "fix" anti-aliasing or sub-pixel differences (#18)
- [ ] Non-chrome icons use extracted assets, not generic Lucide (#10, #15)

### Integration Test Cases

1. **Mobile Layout**: 375x812 portrait, verify no squashing/stretching
2. **Ultrawide**: 3440x1440, verify bounds remain accurate
3. **Custom Spacing**: Design with 18px gaps, verify preservation
4. **Edge Case Scale**: Layout with maxCoord=103, verify no misdetection
5. **Color Accuracy**: Transparent backgrounds, verify no gray/black injection
6. **Image Replication**: Design with product photos, verify images appear (not Lucide)
7. **Intentional Overlaps**: Hero with sticky nav, verify overlap preserved
8. **Design Spec Failure**: Simulate Stage 1 timeout, verify neutral defaults
9. **Forensic vs Creative**: Reference image + vague request → image wins
10. **Icon Extraction Failure**: Non-chrome icon with missing bounds → fallback to \_originalIconName, not empty
11. **Scale Consistency**: Coordinates pass through pipeline without being divided multiple times
12. **Thin Elements**: 0.5% height divider preserved, not enlarged to 1%

---

## Implementation Order

### Week 1 (Critical Path)

1. ✅ **Phase 1**: Configuration-driven dimensions
2. ✅ **Phase 2**: Eliminate triple-normalization
3. 🧪 Test with mobile (375x812), desktop (1920x1080), ultrawide (3440x1440)

### Week 2 (High-Value Fixes)

4. ✅ **Phase 3**: Remove hardcoded fallbacks (gaps, colors, design spec, fonts, bounds)
5. ✅ **Phase 4**: Fix asset injection + prompt constraints (FORENSIC mode)
6. 🧪 Test gap preservation, color accuracy, image replication, forensic mode

### Week 3 (Refinements)

7. ✅ **Phase 5**: Relative critique thresholds
8. ✅ **Phase 6**: Refine overlap resolution (50% threshold)
9. ✅ **Phases 7-9**: Optional refinements (env vars)
10. 🧪 End-to-end exact replication verification

---

## Backward Compatibility Summary

| Phase | Breaking Changes                                  | Migration Required |
| ----- | ------------------------------------------------- | ------------------ |
| 1     | ❌ None (defaults to measured)                    | No                 |
| 2     | ❌ None (assumes 0-100 if no metadata)            | No                 |
| 3     | ❌ None (functions remain, logic changes)         | No                 |
| 4     | ❌ None (manifest preprocessing, runtime prompts) | No                 |
| 5     | ❌ None (adds parameter with default)             | No                 |
| 6     | ❌ None (logic refinement)                        | No                 |
| 7-9   | ❌ None (opt-in via env vars)                     | No                 |

**All phases are fully backward compatible.** Existing layouts continue to work. New layouts benefit from exact replication improvements.

---

## Success Criteria

After implementation, the layout builder should:

1. ✅ Support **any aspect ratio** — mobile portrait, desktop, ultrawide, square (#1)
2. ✅ **Single normalization pass** — coordinates normalized exactly once, not 2-3 times (#2)
3. ✅ **Zero hardcoded template values** — no 1440px, 16px gaps, #f3f4f6, #000000, 'Inter' (#3,4,7,24,26)
4. ✅ **Explicit coordinate scale metadata** — no fragile heuristics (#11)
5. ✅ **Dynamic viewport** in healing loop matching source image (#1)
6. ✅ **Relative critique thresholds** — % of component size, not absolute pixels (#13)
7. ✅ **Reliable asset rendering** — extracted images used, not Lucide substitutes (#6,10,15)
8. ✅ **FORENSIC mode** when reference image provided — measure/reproduce, not improve (#8,14,19)
9. ✅ **Preserve intentional design** — overlaps, custom colors, exact spacing, tiny elements (#23,16)
10. ✅ **Scale-aware asset extraction** — correct crop regions regardless of coordinate scale (#9)
11. ✅ **Recoverable icon fallback** — iconName preserved as backup if extraction fails (#10)
12. ✅ **No rendering artifact false positives** — healing loop ignores anti-aliasing, sub-pixel (#18)
13. ✅ **100% backward compatible** — all existing features work (#all)

---

## Risk Mitigation

- **Metadata extraction failure**: Fallback to 1440x900 with warning log
- **Missing scale metadata**: Default to 0-100 (safest assumption)
- **Gap preservation edge case**: Only apply if existing gap is valid percentage
- **Color fallback removal**: Return transparent instead of undefined to prevent CSS errors
- **Prompt changes**: Test with multiple design types before deploying

All changes include console logging for debugging and verification during rollout.
