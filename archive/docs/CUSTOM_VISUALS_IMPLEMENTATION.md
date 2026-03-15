# Custom Visuals Fix - Implementation Record

> Fixes all 8 root causes preventing custom visuals (particles, logos, animations, effects) from working in the layout builder.

## Problem

The layout builder could not render custom visual effects detected by Gemini:

- Particle trails, floating shapes, sparkle effects
- CSS animations (gradient shifts, glow pulses, shimmer)
- Logos and images (rendered as `[IMG]` placeholder text)
- Glassmorphism, mesh gradients, advanced CSS effects

## Root Causes (8 total)

| #   | Root Cause                                                                                              | Layer     |
| --- | ------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Dead prompt file (`geminiLayoutBuilderPrompt.ts`) never imported - advanced effects content unreachable | Detection |
| 2   | `DesignSpec.effects` only had booleans (`hasGradients`, `hasBlur`) - no structured configs              | Detection |
| 3   | `animation`, `animationKeyframes`, `transition` not in Stage 2 prompt schema                            | Detection |
| 4   | `content.imageDescription` / `content.imageAlt` not in Stage 2 prompt                                   | Detection |
| 5   | No `visualEffects` field for non-CSS effects (particles, canvas)                                        | Detection |
| 6   | No `<img>` rendering - only `[IMG]` text placeholder                                                    | Rendering |
| 7   | No `@keyframes` injection - CSS animations dead on arrival                                              | Rendering |
| 8   | Auto-fix engine only whitelisted 12 CSS properties                                                      | Pipeline  |

## Implementation (3 Phases, 12 Tasks)

### Phase 1: Detection (Prompts + Schema)

**Task 1.1 - Wire up dead prompt content**

- Merged advanced effects content (glassmorphism, mesh gradients, neumorphism, inner glows) from `geminiLayoutBuilderPrompt.ts` inline into Stage 1 and Stage 2 prompts in `GeminiLayoutService.ts`

**Task 1.2 - Expand Stage 1 effects field**

- `src/types/designSpec.ts`: Expanded `effects` with optional structured configs:
  - `gradients?: Array<{ type, colors, angle, positions }>`
  - `glassmorphism?: { detected, blur, opacity, borderOpacity, saturation }`
  - `neumorphism?: { detected, lightShadow, darkShadow, intensity }`
  - `animations?: Array<{ description, type }>`
  - `backgroundEffects?: Array<{ type, description, colors }>`
- Changed `shadows` from union type to `string`

**Task 1.3 - Add animation/transition to Stage 2 prompt**

- Added `animation`, `animationKeyframes`, `transition` to Stage 2 style schema
- Added hierarchy rule 11: Animation & Transition Detection

**Task 1.4 - Add image description extraction**

- Added `imageDescription`, `imageAlt` to Stage 2 content schema
- Added hierarchy rule 13: Image & Logo Detection

**Task 1.5 - Add visual effects field**

- Added `visualEffects` array to Stage 2 component schema with `particleConfig` and `cssKeyframes`
- Added hierarchy rule 12: Visual Effects Detection
- `src/types/layoutDesign.ts`: Added `VisualEffect` interface and `visualEffects?: VisualEffect[]` to `DetectedComponentEnhanced`
- `src/utils/layoutValidation.ts`: Added Zod schemas with `.passthrough()` for all new fields

### Phase 2: Rendering

**Task 2.1 - Image description placeholders**

- `src/components/layout-builder/GenericComponentRenderer.tsx`: Replaced `[IMG]` text with:
  - SVG image icon + `imageDescription` text + `imageAlt` italic text
  - Falls back to `[IMG]` only when no description available

**Task 2.2 - @keyframes injection system**

- `src/components/layout-builder/KeyframeInjector.tsx` (NEW):
  - Scans all components for `style.animationKeyframes` and `visualEffects[].cssKeyframes`
  - Extracts animation names from CSS shorthand using `extractAnimationName()`
  - Generates `@keyframes` CSS rules and injects via `<style>` tag
  - Namespaces keyframe names as `{componentId}--{name}` to prevent collisions
- `src/components/layout-builder/DynamicLayoutRenderer.tsx`: Mounts `<KeyframeInjector>` before component tree

**Task 2.3 - Visual effects rendering**

- `src/components/effects/CSSParticleEffect.tsx` (NEW):
  - Zero-dependency CSS particle system
  - Generates randomized particles with position, size, color, direction, speed
  - Per-particle `@keyframes` rules injected via `<style>` tag
  - Particle count capped at 100 for performance
- `src/components/effects/VisualEffectRenderer.tsx` (NEW):
  - Routes effects: `particle-system` -> CSSParticleEffect, `canvas-effect` -> future
  - Renders as child overlay inside positioned parent (z-index: 9999)
  - `pointer-events: none` + `aria-hidden="true"` for non-interference

**Task 2.4 - Fix overflow clipping**

- `src/components/layout-builder/LayoutCanvas.tsx`: Changed inner container from `height: '800px'` to `minHeight: '800px', overflow: 'visible'`

### Phase 3: Pipeline

**Task 3.1 - Expand auto-fix whitelist**

- `src/services/LayoutAutoFixEngine.ts`: Expanded `SAFE_STYLE_PROPERTIES` from 12 to 25:
  - Added: `fontFamily`, `textAlign`, `lineHeight`, `letterSpacing`, `shadow`, `backgroundImage`, `backdropFilter`, `filter`, `transform`, `animation`, `animationKeyframes`, `transition`, `mixBlendMode`, `textShadow`

**Task 3.2 - Effect-aware critique issue types**

- `src/types/layoutAnalysis.ts`: Added 4 new types to `LayoutDiscrepancy.issue`:
  - `effect_missing`, `image_missing`, `gradient_mismatch`, `animation_missing`
- `src/services/GeminiLayoutService.ts`: Updated critique prompt with new issue types and descriptions

**Task 3.3 - Preserve effects through validation**

- `src/utils/layoutValidation.ts`: Added `.passthrough()` to component schema, explicit Zod schemas for `interactions`, `visualEffects` with sub-objects
- `src/utils/layoutConverter.ts`: Preserved alt text: `alt: component.content?.imageAlt || component.content?.imageDescription`

## Bugs Found & Fixed During Verification

| #   | Bug                                                           | File                                                    | Fix                                                                                   |
| --- | ------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `display: contents` broke particle overlay positioning        | `VisualEffectRenderer.tsx`                              | Changed to child overlay inside positioned parent                                     |
| 2   | Zod allowed `undefined` for required `VisualEffect` fields    | `layoutValidation.ts`                                   | Added `.default()` for `description`, `type`, `trigger`                               |
| 3   | No particle count cap (memory risk at 1000+)                  | `CSSParticleEffect.tsx`                                 | `Math.min(Math.max(count, 0), 100)`                                                   |
| 4   | Same animation name collision across components               | `KeyframeInjector.tsx` + `GenericComponentRenderer.tsx` | Namespaced as `{componentId}--{name}`                                                 |
| 5   | `animationKeyframes` blocked by auto-fix whitelist            | `LayoutAutoFixEngine.ts`                                | Added to `SAFE_STYLE_PROPERTIES`                                                      |
| 6   | Inline `transition` conflicted with Tailwind `transition-all` | `GenericComponentRenderer.tsx`                          | Made Tailwind class conditional: `!style.transition && 'transition-all duration-200'` |
| 7   | Particle overlay z-index (1) hidden under children            | `VisualEffectRenderer.tsx`                              | Increased to 9999                                                                     |

## Files Modified (Summary)

| File                                                         | Status   | Changes                                                                       |
| ------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------- |
| `src/types/designSpec.ts`                                    | Modified | Expanded effects type                                                         |
| `src/types/layoutDesign.ts`                                  | Modified | `VisualEffect` interface, new fields on style/content/component               |
| `src/types/layoutAnalysis.ts`                                | Modified | 4 new critique issue types                                                    |
| `src/services/GeminiLayoutService.ts`                        | Modified | Stage 1+2 prompts, critique prompt                                            |
| `src/services/LayoutAutoFixEngine.ts`                        | Modified | Expanded safe property whitelist                                              |
| `src/utils/layoutValidation.ts`                              | Modified | Zod schemas for all new fields                                                |
| `src/utils/layoutConverter.ts`                               | Modified | Alt text preservation                                                         |
| `src/components/layout-builder/GenericComponentRenderer.tsx` | Modified | Image placeholders, animation namespacing, transition fix, effect integration |
| `src/components/layout-builder/DynamicLayoutRenderer.tsx`    | Modified | KeyframeInjector mount                                                        |
| `src/components/layout-builder/LayoutCanvas.tsx`             | Modified | Overflow fix                                                                  |
| `src/components/layout-builder/KeyframeInjector.tsx`         | **NEW**  | @keyframes CSS injection                                                      |
| `src/components/effects/CSSParticleEffect.tsx`               | **NEW**  | CSS particle system                                                           |
| `src/components/effects/VisualEffectRenderer.tsx`            | **NEW**  | Effect overlay routing                                                        |

## Known Limitations

- `layoutConverter.ts` loses `animation`/`animationKeyframes`/`visualEffects` during LayoutManifest export (secondary path; primary rendering pipeline unaffected)
- Multiple comma-separated CSS animations only extract the first name
- `canvas-effect` type recognized but not yet rendered (future Tier 3)
- DALL-E image generation from `imageDescription` not yet implemented (future)

## Verification Results

- **TypeScript**: Clean (only pre-existing `versions.generated` error)
- **ESLint**: 0 errors, all warnings pre-existing
- **Tests**: 370/370 pass
