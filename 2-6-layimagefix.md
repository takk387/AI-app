# Fix Layout Replication: Sizing, Structure & Custom Icons

## Problems

1. **Layouts look enlarged/cramped** — proportions don't match the reference image
2. **Custom icons lost or replaced** — brand logos and artistic icons become generic Lucide icons or vanish

## Root Causes (7 issues across both pipelines)

### Titan Pipeline (Step 5 — the built app)

| #   | Issue                                              | File                                                                | Lines     | Effect                                                                            |
| --- | -------------------------------------------------- | ------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| 1   | Surveyor output schema missing `bounds` field      | [TitanSurveyor.ts](src/services/TitanSurveyor.ts)                   | 180-224   | `autoFixIconDecisions()` can't set `extractionBounds` → icons fall back to Lucide |
| 2   | Hardcoded height ranges in ComponentBuilder prompt | [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts) | 368-381   | AI uses template sizes (`header ~60-80`) instead of measuring the image           |
| 3   | Healing loop can't render extracted assets         | [TitanHealingLoop.ts](src/services/TitanHealingLoop.ts)             | 86-230    | Screenshot shows broken `<img>` for assets → critique "fixes" by removing them    |
| 4   | `resolveRootOverlaps` injects artificial 2% gaps   | [layoutValidation.ts](src/utils/layoutValidation.ts)                | 1095-1102 | Overrides measured positions, pushes sections apart                               |
| 5   | Builder prompt lacks sizing instructions           | [TitanBuilder.ts](src/services/TitanBuilder.ts)                     | 36-136    | Builder gets no dimensional data, guesses sizes from CSS alone                    |

### Layout Builder Pipeline (Step 2 — also affects Phase 1 injection)

| #   | Issue                                                 | File                                                                | Lines   | Effect                                                                    |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| 6   | `stripNonChromeIconNames` deletes non-whitelist icons | [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts) | 503-537 | Any icon not in 12-icon whitelist gets stripped                           |
| 7   | `normalizeCoordinates` heuristic misdetects scale     | [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts) | 69-122  | If all coords ≤105, treats 0-1000 values as percentages → 10x enlargement |

---

## Implementation Plan

### Fix 1: Add `bounds` to Surveyor Output Schema

**File:** [TitanSurveyor.ts](src/services/TitanSurveyor.ts)

**1a. Add bounds requirement to Task instructions** (after line 115, new numbered item before current #4)

Add instruction requiring every node to include `"bounds": { top, left, width, height }` in percentage (0-100) relative to canvas (root) or parent (children). Emphasize this is MANDATORY — required for icon extraction and sizing accuracy.

**1b. Add `bounds` to Output Schema example** (lines 180-224)

Add to the `dom_tree` schema example, right after `"id"`:

```json
"bounds": { "top": 0, "left": 0, "width": 100, "height": 8 },
```

Add dimensional properties to the `styles` example:

```json
"width": "320px",
"height": "48px",
"padding": "12px 24px",
"gap": "16px",
```

**1c. Update `autoFixIconDecisions()` to check `extractionBounds` first** (lines 240-307)

The AI may provide `extractionBounds` directly (as the prompt requests) even without `bounds`. Change logic:

```
1. Check if extractionBounds already exists → skip (already set)
2. Check if bounds exists → copy to extractionBounds
3. If neither → log warning with node id
```

Apply same pattern to Fix 2 (image nodes) and Fix 3 (hasImage nodes).

### Fix 2: Remove Hardcoded Height Ranges from Prompt

**File:** [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts)

**2a. Replace lines 368-381** (ROOT COMPONENTS section)

Remove the hardcoded template heights:

```diff
-         - header (top: 0, height: ~60-80)
-         - hero (below header)
-         - features/content sections
-         - footer (bottom)
-
-          Typically 3-7 root sections for a landing page.
-
-          ROOT COMPONENTS MUST NOT OVERLAP. Stack them vertically:
-          - Each root section's top MUST be >= the previous section's (top + height)
-          - Leave a small gap (20-40 in 0-1000 scale) between sections
-          - Full-width sections: left=0, width=1000
-          - Assign heights based on content: header ~60-80, hero ~300-500, sections ~200-400, footer ~150-250
```

Replace with:

```
         MEASURE EVERY SECTION FROM THE IMAGE. Do NOT use template heights.
         - Look at the image and measure where each section starts (top) and how tall it is (height)
         - Express as 0-1000 coordinates relative to the full page height
         - If the header is tiny (3% of page), set height: 30. If huge, set accordingly.
         - NEVER round to "convenient" numbers. Use the EXACT proportions from the image.

         ROOT COMPONENTS MUST NOT OVERLAP. Stack them vertically:
         - Each root section's top MUST be >= the previous section's (top + height)
         - Full-width sections: left=0, width=1000
```

### Fix 3: Make Healing Loop Asset-Aware

**File:** [TitanHealingLoop.ts](src/services/TitanHealingLoop.ts)

**3a. Update `captureRenderedScreenshot` signature** (line 86)

Add `assets?: Record<string, string>` parameter.

**3b. Inject asset URLs into the rendered HTML** (lines 104-192)

After the Lucide icon setup in the `<script>` section, add code to:

1. Accept the assets map as a JS variable
2. After React renders, scan all rendered `<img>` elements
3. For any `<img>` with a `src` that references an asset key/pattern, ensure the URL is resolvable
4. Alternatively: inject a `<style>` block that maps `data-id` elements to their asset background images

**3c. Update `runHealingLoop` to pass assets** (around line 314)

Pass the `finalAssets` map through to `captureRenderedScreenshot`.

### Fix 4: Stop Forcing Artificial Section Gaps

**File:** [layoutValidation.ts](src/utils/layoutValidation.ts)

**4a. Change GAP from 2 to 0** (line 1095)

```diff
-    const GAP = 2;
+    const GAP = 0;
```

**4b. Only fix actual overlaps** (line 1102)

```diff
-    if (next.bounds.top < currentBottom + GAP) {
+    if (next.bounds.top < currentBottom) {
```

This preserves the overlap-prevention logic but stops injecting artificial spacing that distorts the measured layout.

### Fix 5: Add Sizing Instructions to Builder Prompt

**File:** [TitanBuilder.ts](src/services/TitanBuilder.ts)

**5a. Add sizing section to REPLICATION MODE** (after line 63)

```
- SIZING FROM MANIFEST:
  - The manifest "canvas" object provides viewport reference dimensions.
  - Each node may include "bounds" with percentage coordinates.
  - Use canvas dimensions as reference: element_width_px = (bounds.width / 100) * canvas.width
  - Apply explicit width/height from the styles object when provided.
  - For root sections, ensure proper vertical stacking with heights matching the manifest.
  - MEASURE element sizes from the original image. If a button looks ~120px wide, set width explicitly.
  - Preserve spacing between elements — gaps, margins, section spacing.
```

### Fix 6: Stop Stripping Custom Icons in ComponentBuilder

**File:** [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts)

**6a. Convert `stripNonChromeIconNames` to a pass-through** (lines 503-537)

Replace the stripping logic with a log-only function. The Builder already handles icon fallback priority (SVG path → asset → Lucide → skip), so stripping upstream just destroys data:

```typescript
function stripNonChromeIconNames(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  // Log non-chrome icons for debugging, but DO NOT remove them.
  for (const c of components) {
    if (c.content?.hasIcon && c.content.iconName && !c.content.iconSvgPath) {
      if (!isUIChromeIcon(c.content.iconName)) {
        console.log(
          `[ComponentBuilder:IconInfo] "${c.content.iconName}" on ${c.id} is non-chrome (will use Lucide fallback or asset)`
        );
      }
    }
  }
  return components;
}
```

**6b. Update ICON DETECTION prompt section** (lines 411-421)

Add explicit instruction for artistic/custom icons to use `hasCustomVisual` + `extractionAction: "crop"` with `extractionBounds`, matching the Surveyor's approach.

### Fix 7: Improve Coordinate Scale Detection

**File:** [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts)

**7a. Add explicit scale metadata to prompt** (~line 144)

Add `"coordinateScale": "0-1000"` to the required JSON output schema so the AI explicitly declares its scale.

**7b. Update `normalizeCoordinates()` to check metadata first** (lines 69-122)

```
1. Check for explicit coordinateScale field
   - "0-1000" → always divide by 10
   - "0-100" → leave as-is
2. No metadata → fall back to existing maxCoord heuristic
3. Clean up coordinateScale field after conversion
```

This eliminates the silent failure when all coords happen to be ≤105.

---

## Files Modified (6 files)

| File                                                                | Changes                                                                                                                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [TitanSurveyor.ts](src/services/TitanSurveyor.ts)                   | Add `bounds` to schema + prompt, fix `autoFixIconDecisions()` fallback logic                                                                                                 |
| [GeminiComponentBuilder.ts](src/services/GeminiComponentBuilder.ts) | Remove hardcoded heights, convert icon stripping to pass-through, add extraction instructions to icon prompt, add scale metadata to prompt, improve `normalizeCoordinates()` |
| [TitanHealingLoop.ts](src/services/TitanHealingLoop.ts)             | Make `captureRenderedScreenshot` accept + inject assets                                                                                                                      |
| [layoutValidation.ts](src/utils/layoutValidation.ts)                | Set GAP=0 in `resolveRootOverlaps`, fix overlap condition                                                                                                                    |
| [TitanBuilder.ts](src/services/TitanBuilder.ts)                     | Add sizing/bounds instructions to REPLICATION MODE                                                                                                                           |
| [GeminiLayoutCritique.ts](src/services/GeminiLayoutCritique.ts)     | Stop truncating SVG paths, add icon preservation rule to prompt                                                                                                              |

---

## Implementation Order

1. **Fix 1** (Surveyor bounds) — unlocks icon extraction AND sizing
2. **Fix 2** (hardcoded heights) — immediate sizing improvement
3. **Fix 4** (`resolveRootOverlaps` gap) — stops post-processing from distorting layout
4. **Fix 5** (Builder sizing instructions) — Builder uses the new bounds data
5. **Fix 6** (stop icon stripping) — preserves icon data through pipeline
6. **Fix 3** (healing loop assets) — prevents healing loop from destroying asset references
7. **Fix 7** (scale detection) — improves Layout Builder path accuracy

---

## Verification

1. `npm run typecheck` — must pass
2. `npm run lint` — must pass
3. `npm run test` — must pass
4. **Manual test — Sizing**: Upload a reference image with distinct section proportions. Verify the built output matches (small header, large hero, etc.)
5. **Manual test — Icons**: Upload a reference image with brand logos / custom icons. Verify they are cropped from the original image and rendered as `<img>`, not as generic Lucide icons
6. **Console check**: `[Surveyor:VisualFix] Icon "X" → hasCustomVisual` confirms extraction activation. Absence of `has no bounds` warnings confirms bounds data is flowing.
7. **Healing loop check**: Run healing loop on a build with extracted assets. Verify assets appear in the healing screenshot (not broken images).
