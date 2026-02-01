# Fix: Builder Can't Create Shaped + Textured UI Elements

**Status:** Implemented (2026-02-01)

## Problem

When user types "create a photorealistic button that looks like a cloud":

- User wants: a cloud-SHAPED button with realistic cloud textures
- AI produces: a plain white rectangle, or a white blob that hovers
- AI doesn't combine SHAPE (clip-path/SVG silhouette) + TEXTURE (generated image)

## Root Cause

The BUILDER_PROMPT has no guidance on:

1. Creating non-rectangular shaped elements (clip-path, SVG masks, border-radius combos)
2. Combining custom shapes with photorealistic textures
3. Understanding "looks like X" means both shape AND material

The Photographer generates a flat texture image, but the Builder doesn't know how to clip it into a cloud shape. And when no asset is generated, the Builder doesn't know how to create realistic-looking elements using CSS at all.

## File: `src/services/TitanPipelineService.ts`

### Fix A: Add shape + texture guidance to BUILDER_PROMPT (after line 312)

Add new instruction #6:

```
6. **Shaped & Textured Elements (CRITICAL for photorealism):**
   - When the user asks for an element that "looks like" a real object (cloud, stone, wood, etc.),
     create BOTH the shape AND the texture:
     a) **Shape:** Use CSS clip-path, SVG clipPath, or creative border-radius to form the silhouette.
        Examples: cloud → clip-path with rounded bumps, leaf → custom polygon, stone → irregular rounded.
     b) **Texture:** If an asset URL exists, apply it as backgroundImage with backgroundSize: cover.
        If no asset, use CSS gradients, box-shadows, and filters to approximate the material.
     c) **Depth:** Add box-shadow, inner highlights, and subtle gradients for 3D realism.
     d) **Interactivity:** The element must still function (clickable, hover states).
   - Example: "photorealistic cloud button" →
     clip-path: path('M25,60 a20,20 0,0,1 0,-40 a20,20 0,0,1 35,0 a20,20 0,0,1 0,40 z');
     backgroundImage: url(cloud_texture.png); backgroundSize: cover;
     box-shadow for depth; filter: drop-shadow for floating effect.
   - Do NOT just set a backgroundColor. Use real CSS shape techniques.
```

### Fix B: Improve GeminiImageService prompt for shaped elements

Currently the image generation prompt creates a seamless texture. For shaped elements, the texture needs to look like the actual object (a cloud), not just a flat material swatch.

In `src/services/GeminiImageService.ts`, update the prompt in `generateBackgroundFromReference` to detect when the target is a shaped element and generate accordingly:

```typescript
const isShapedElement =
  request.targetElement && !['background', 'hero section'].includes(request.targetElement);

const prompt = isShapedElement
  ? `Generate a photorealistic image of a ${request.vibeKeywords.join(', ')}.
    Style: ${request.vibe}, photorealistic, high detail.
    Requirements: Render the full object with depth and lighting. Suitable for use as a UI element background with clip-path masking. No text, no people.
    Include: Realistic shadows, highlights, and 3D volume.`
  : `Generate a photorealistic texture image ${targetHint}.
    Subject: ${request.vibeKeywords.join(', ')}.
    Style: ${request.vibe}, photorealistic, high detail.
    Requirements: Suitable for web UI use. Clean edges. No text, no people.
    If for a button: include subtle depth, lighting, and edge highlights.`;
```

### Fix C: Annotate instructions with asset context in `assembleCode` (line 347-360)

When assets were generated, add context so the Builder knows what's available and how to use it:

```typescript
const hasAssets = Object.keys(assets).length > 0;
const assetContext = hasAssets
  ? `\n\n  ### ASSET CONTEXT
  These texture/material images were generated for the user's request:
  ${Object.entries(assets)
    .map(([name, url]) => `  - "${name}" → ${url}`)
    .join('\n')}
  Apply them via backgroundImage on the matching elements. Combine with clip-path for shaped elements.`
  : '';
```

Insert `${assetContext}` after the ASSETS JSON block in the prompt.

---

## Files Modified

| File                                   | Change                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `src/services/TitanPipelineService.ts` | BUILDER_PROMPT: add shape+texture instruction; `assembleCode`: add asset context  |
| `src/services/GeminiImageService.ts`   | Split prompt: shaped elements get object render, backgrounds get seamless texture |

## Verification

1. `npm run typecheck` - No type errors
2. `npm run lint` - No lint errors
3. Test: "create a photorealistic button that looks like a cloud" → verify:
   - Button has a cloud-shaped clip-path or SVG silhouette
   - Cloud texture applied as backgroundImage (or CSS gradient approximation)
   - Button has depth (box-shadow, highlights)
   - Button is still clickable with hover state
