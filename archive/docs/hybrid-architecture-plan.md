# Layout Builder Fix Plan - Phase 13: Hybrid Precision-Flow Architecture

## Status: APPROVED FOR IMPLEMENTATION

**User Decision:** Implement Full Hybrid Architecture

---

## IMPLEMENTATION PLAN

### Overview

Add dual-mode rendering that supports:

1. **Strict Mode (Pixel-Perfect)**: Absolute positioning with exact bounds from image analysis
2. **Responsive Mode (Flow)**: Tailwind-based responsive layout

---

## FILES TO MODIFY

### 1. Schema Update: `src/types/schema.ts`

Add `layout` object to UISpecNode:

```typescript
layout?: {
  mode: 'flow' | 'absolute';
  bounds?: {
    x: number;      // percentage (0-100)
    y: number;      // percentage (0-100)
    width: number;  // percentage (0-100)
    height: number; // percentage (0-100)
    unit: '%' | 'px';
  };
  zIndex?: number;
  rotation?: number;
};
```

Add Zod validation for the new fields.

---

### 2. Engine Update: `src/components/Engine.tsx`

**Add `viewMode` prop:**

```typescript
interface EngineProps {
  // ...existing props
  viewMode?: 'strict' | 'responsive';
}
```

**Add conditional rendering logic:**

```typescript
const isStrict = viewMode === 'strict';
const hasBounds = node.layout?.mode === 'absolute' && node.layout?.bounds;

const computedStyle: React.CSSProperties = {};

if (isStrict && hasBounds && node.layout?.bounds) {
  const { x, y, width, height, unit } = node.layout.bounds;
  computedStyle.position = 'absolute';
  computedStyle.left = `${x}${unit}`;
  computedStyle.top = `${y}${unit}`;
  computedStyle.width = `${width}${unit}`;
  computedStyle.height = `${height}${unit}`;
  if (node.layout.zIndex) computedStyle.zIndex = node.layout.zIndex;
}
```

**Update LayoutPreview to accept viewMode.**

---

### 3. API Prompt Update: `src/app/api/architect/generate-manifest/route.ts`

**Add HYBRID LAYOUT PROTOCOL to prompt:**

```
HYBRID LAYOUT PROTOCOL (CRITICAL):
You must generate TWO truths for every element:
1. **Flow Truth (Tailwind)**: Responsive classes (flex, grid, gap)
2. **Visual Truth (Bounds)**: Exact percentage coordinates

For EVERY container, image, or major section, populate:
"layout": {
  "mode": "absolute",
  "bounds": { "x": 10, "y": 20, "width": 80, "height": 30, "unit": "%" },
  "zIndex": 10
}

- X/Y/Width/Height must be PERCENTAGES (0-100) relative to viewport
- Calculate bounds by visually analyzing the image
- EVEN IF you write flex classes, providing bounds is MANDATORY
```

---

### 4. Design Critique Update: `src/utils/designCritiqueEngine.ts`

**Add spatial fidelity check:**

```typescript
function critiqueSpatialFidelity(node: UISpecNode, issues: string[]): number {
  // Check if structural nodes have bounds
  // Warn if major containers missing layout.bounds
  // Return fidelity score (0-100)
}
```

---

### 5. LayoutBuilderWizard UI: `src/components/LayoutBuilderWizard.tsx`

**Add view mode toggle button:**

- "Exact Vision" (Strict Mode) - pixel-perfect
- "Responsive Code" (Flow Mode) - Tailwind

---

### 6. Vibe API Update: `src/app/api/builder/vibe/route.ts`

**Critical:** Preserve layout bounds when AI refines styles.

Add `restoreLayoutBounds()` helper that:

- Maps original layout data by node ID
- Merges back to new manifest after AI styling
- Ensures "Visual Truth" isn't lost during vibe changes

```typescript
function restoreLayoutBounds(
  original: LayoutManifest,
  newManifest: LayoutManifest
): LayoutManifest {
  const layoutMap = new Map<string, any>();
  // Map original layouts
  traverse(original.root, (n) => {
    if (n.layout) layoutMap.set(n.id, n.layout);
  });
  // Apply to new manifest
  const mergedRoot = JSON.parse(JSON.stringify(newManifest.root));
  traverse(mergedRoot, (n) => {
    if (layoutMap.has(n.id)) {
      n.layout = layoutMap.get(n.id);
    }
  });
  return { ...newManifest, root: mergedRoot };
}
```

---

### 7. Video Processor: `src/utils/videoProcessor.ts`

**Implement actual keyframe extraction** for video-to-layout pipeline:

```typescript
export const extractKeyframes = async (
  file: File,
  options: VideoProcessingOptions = {}
): Promise<VideoFrame[]> => {
  // Create video element and canvas
  // Seek to timestamps (start, middle, end)
  // Capture frames as base64 data URLs
  // Return array of VideoFrame objects
};
```

This enables "Video → Exact Vision" by providing Architect with raw visual frames.

---

## IMPLEMENTATION ORDER

1. **Schema** (src/types/schema.ts) - Add layout interface
2. **Engine** (src/components/Engine.tsx) - Add viewMode conditional rendering
3. **API Prompt** (route.ts) - Add HYBRID LAYOUT PROTOCOL
4. **Critique** (designCritiqueEngine.ts) - Add spatial fidelity check
5. **Vibe API** (vibe/route.ts) - Add layout bounds preservation
6. **Video Processor** (videoProcessor.ts) - Implement keyframe extraction
7. **UI Toggle** (LayoutBuilderWizard.tsx) - Add mode switch button

---

## FILES SUMMARY

| #   | File                                               | Purpose                                         |
| --- | -------------------------------------------------- | ----------------------------------------------- |
| 1   | `src/types/schema.ts`                              | Add layout interface with bounds                |
| 2   | `src/components/Engine.tsx`                        | Add viewMode + conditional absolute positioning |
| 3   | `src/app/api/architect/generate-manifest/route.ts` | Add HYBRID LAYOUT PROTOCOL to prompt            |
| 4   | `src/utils/designCritiqueEngine.ts`                | Add spatial fidelity check                      |
| 5   | `src/app/api/builder/vibe/route.ts`                | Preserve layout bounds during style changes     |
| 6   | `src/utils/videoProcessor.ts`                      | Implement keyframe extraction                   |
| 7   | `src/components/LayoutBuilderWizard.tsx`           | Add view mode toggle UI                         |

---

## VERIFICATION

1. **Schema validation:**
   - `npm run typecheck` must pass
   - Existing manifests should still work (optional fields)

2. **Rendering test:**
   - Upload image with clear sections
   - Toggle between Strict and Responsive modes
   - Strict mode should show pixel-perfect positioning
   - Responsive mode should use Tailwind flow

3. **Bounds generation:**
   - Check console logs for generated bounds
   - Verify AI provides bounds for major containers

4. **Vibe preservation test:**
   - Apply a vibe change to a layout with bounds
   - Verify bounds are NOT lost after styling

5. **Video test:**
   - Upload a video file
   - Verify keyframes are extracted (check console)

---

## COMMIT MESSAGE

```
feat(layout-builder): implement hybrid precision-flow architecture

- Add layout.bounds to UISpecNode schema for pixel-perfect positioning
- Add viewMode prop to Engine (strict/responsive)
- Add HYBRID LAYOUT PROTOCOL to Gemini prompt
- Add spatial fidelity check to designCritiqueEngine
- Preserve layout bounds in Vibe API during style changes
- Implement video keyframe extraction for visual analysis
- Enable toggle between Exact Vision and Responsive Code modes

BREAKING: Manifests now support optional layout.bounds field
```
