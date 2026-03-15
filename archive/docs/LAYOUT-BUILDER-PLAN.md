# Layout Builder - Full Visual Replication Plan

## Status Overview

| Feature                                      | Status      |
| -------------------------------------------- | ----------- |
| Component positioning (bounds-based)         | ✅ COMPLETE |
| Color extraction & application               | ✅ COMPLETE |
| Background effects (particles, aurora, etc.) | ✅ COMPLETE |
| Custom artistic background generation        | ✅ COMPLETE |

---

## Completed Fixes

### 1. Bounds-Based Component Positioning

**Problem:** Components were rendered in document flow order, ignoring detected positions.

**Solution:** Added `BoundsWrapper` component that uses absolute positioning based on detected bounds.

**Files Modified:**

- `src/components/layout-builder/DynamicLayoutRenderer.tsx`
  - Added `getBoundsStyle()` helper function
  - Added `BoundsWrapper` component
  - Added bounds-detection logic (`useBoundsLayout`)

### 2. Background Effects Passed to Frontend

**Problem:** Gemini detected background effects but they weren't forwarded to the frontend.

**Solution:** Added `backgroundEffect` to the design updates in the API response.

**Files Modified:**

- `src/app/api/layout/chat/route.ts` - Added backgroundEffect to effects object

### 3. Enhanced Color & Effect Detection

**Problem:** Gemini wasn't extracting exact colors or detecting background effects properly.

**Solution:** Added detailed prompts for color extraction and background effect detection rules.

**Files Modified:**

- `src/services/GeminiLayoutService.ts` - Added BACKGROUND EFFECT DETECTION RULES

### 4. AI Background Image Generation

**Problem:** Custom artistic backgrounds (illustrations, patterns, artwork) couldn't be recreated with CSS effects.

**Solution:** Integrated Gemini Imagen to generate new background images matching the reference style.

**Files Created:**

- `src/services/GeminiImageService.ts` - Background generation service
- `src/app/api/images/generate-background/route.ts` - Direct API endpoint

**Files Modified:**

- `src/types/layoutDesign.ts` - Added `custom-image` type and `CustomImageConfig`
- `src/components/layout-builder/BackgroundEffects.tsx` - Added `CustomImageEffect` renderer
- `src/app/api/layout/chat/route.ts` - Integrated auto-generation via `maybeGenerateCustomBackground()`
- `src/services/GeminiLayoutService.ts` - Updated prompts to detect `custom-image` backgrounds

---

## Implementation Details

### Type System

```typescript
// src/types/layoutDesign.ts

export type BackgroundEffectType =
  | 'particles'
  | 'floating-shapes'
  | 'gradient-animation'
  | 'parallax-dots'
  | 'mesh-gradient'
  | 'aurora'
  | 'waves'
  | 'custom-image' // NEW
  | 'none';

export interface CustomImageConfig extends Omit<BackgroundEffectConfig, 'intensity'> {
  type: 'custom-image';
  imageUrl: string;
  size?: 'cover' | 'contain' | 'auto';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  attachment?: 'scroll' | 'fixed';
  blend?: 'normal' | 'overlay' | 'multiply' | 'screen' | 'soft-light';
  intensity?: 'subtle' | 'medium' | 'strong';
}

// Union type for all background configs
export type AnyBackgroundEffectConfig =
  | BackgroundEffectConfig
  | ParticlesConfig
  | FloatingShapesConfig
  | GradientAnimationConfig
  | AuroraConfig
  | WavesConfig
  | CustomImageConfig;
```

### Background Generation Flow

1. **Detection**: Gemini analyzes reference image and detects `type: 'custom-image'` for artistic backgrounds
2. **Auto-Generation**: `maybeGenerateCustomBackground()` in layout/chat route detects this type
3. **Image Creation**: GeminiImageService uses the reference image and color palette to generate a matching background
4. **Storage**: Generated image is uploaded to Supabase storage
5. **Application**: Image URL is added to the design's `backgroundEffect.imageUrl`
6. **Rendering**: `CustomImageEffect` component renders the background

### Model Configuration

**Current Model:** `gemini-2.0-flash-exp`

- Supports image generation via `responseModalities: ['image', 'text']`
- Uses reference image + color-guided prompt

**Resolution Options:** 1K, 2K, 4K (default: 1K)

---

## API Endpoints

### POST /api/layout/chat

Main layout builder chat endpoint. Automatically generates custom backgrounds when detected.

### POST /api/images/generate-background

Direct endpoint for background generation (for manual triggers).

**Request:**

```json
{
  "referenceImage": "base64...",
  "colorPalette": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex"
  },
  "vibe": "modern and professional",
  "vibeKeywords": ["clean", "minimal"],
  "resolution": "1K"
}
```

**Response:**

```json
{
  "success": true,
  "imageUrl": "https://...",
  "uploaded": true,
  "duration": 5000
}
```

---

## Verification Checklist

### Completed Fixes

- [x] Upload reference image → components positioned correctly
- [x] Colors match the uploaded image
- [x] Background effects (particles, aurora) render properly
- [x] Layouts without bounds still work (backward compatibility)

### Background Generation

- [x] Gemini prompts updated to detect `custom-image` type
- [x] GeminiImageService created and functional
- [x] BackgroundEffects renders custom images
- [x] Auto-generation integrated into layout/chat flow
- [x] Direct API endpoint available
- [x] TypeScript types properly defined

---

## Environment Variables Required

```env
# Gemini API (either one works)
GOOGLE_API_KEY=your_key
GEMINI_API_KEY=your_key

# Supabase (for image storage)
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

---

## Testing

To test the custom background generation:

1. Upload a reference image with an artistic/custom background
2. Watch the console logs for:
   - `[Gemini-Only] Generating custom background image...`
   - `[Gemini-Only] Custom background generated: ...`
3. Check the preview for the generated background
4. Verify the design's `backgroundEffect.type` is `custom-image` and `imageUrl` is set
