# Layout Builder - Current State Assessment

> **Updated: 2026-01-30** | Comprehensive gap analysis of the layout builder
>
> **Vision**: Build, replicate, or merge ANY layout from multiple images, videos, and text — including all visual effects. Presets are welcome as starting points, but the system must handle arbitrary designs.

## Architecture Overview

The layout builder is a **standalone AI-powered design tool** at the `/app/design` route (NOT inside AIBuilder.tsx). It uses a **two-stage Gemini 3 Flash analysis pipeline** with self-healing capabilities.

**Total codebase: ~9,300+ lines across 18+ key files**

---

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| **Components** | | |
| `src/components/LayoutBuilderView.tsx` | 274 | Main orchestrator, chat state, panel coordination |
| `src/components/layout-builder/LayoutBuilderChatPanel.tsx` | 391 | Left panel: chat, media upload, text input |
| `src/components/layout-builder/LayoutCanvas.tsx` | 493 | Right panel: preview canvas, selection, self-healing UI |
| `src/components/layout-builder/FloatingEditBubble.tsx` | 137 | Contextual AI edit popup on selected components |
| `src/components/layout-builder/DynamicLayoutRenderer.tsx` | 89 | Builds/renders hierarchical component tree |
| `src/components/layout-builder/GenericComponentRenderer.tsx` | 874 | Renders ANY component type (the "atom") |
| `src/components/layout-builder/KeyframeInjector.tsx` | 150 | @keyframes CSS injection for animations |
| `src/components/effects/CSSParticleEffect.tsx` | 192 | Zero-dependency CSS particle system |
| `src/components/effects/VisualEffectRenderer.tsx` | 80 | Effect overlay routing (particle, canvas, CSS) |
| **State** | | |
| `src/hooks/useLayoutBuilder.ts` | 799 | Single source of truth: components, designSpec, history, healing |
| `src/store/useAppStore.ts` | 745 | Global store layout slice (manifests, designSpec, phasePlan) |
| **Services** | | |
| `src/services/GeminiLayoutService.ts` | 1,286 | Two-stage AI analysis, editing, critique |
| `src/services/VisionLoopEngine.ts` | 540 | Step-based self-healing orchestrator |
| `src/services/LayoutAutoFixEngine.ts` | 402 | Applies AI critique corrections to components |
| **Types** | | |
| `src/types/layoutDesign.ts` | 2,983 | Full type system (DetectedComponentEnhanced, LayoutDesign, etc.) |
| `src/types/designSpec.ts` | 109 | Design system spec type (structured effects configs) |
| `src/types/layoutAnalysis.ts` | 203 | Analysis result, critique, self-healing types |
| **Utils** | | |
| `src/utils/layoutValidation.ts` | 1,026 | Zod schemas, sanitization, hierarchy inference |
| `src/utils/layoutConverter.ts` | 200 | Components -> LayoutManifest conversion |
| `src/utils/colorUtils.ts` | 159 | Color normalization, transparency detection |
| `src/utils/colorHarmony.ts` | 475 | Color manipulation, WCAG checks |
| **Prompts** | | |
| `src/prompts/geminiLayoutBuilderPrompt.ts` | 499 | Gemini system prompt, detection requirements |
| **API** | | |
| `src/app/api/layout/analyze/route.ts` | 50 | POST endpoint for all layout operations |
| **Page** | | |
| `src/app/(protected)/app/design/page.tsx` | 70 | Design route page |

---

## Data Flow

```
User uploads image/video + instructions
  -> useLayoutBuilder.analyzeImage/Video()
    -> POST /api/layout/analyze
      -> GeminiLayoutService.analyzeImageTwoStage()
        -> Stage 1 "Architect": extractDesignSpec() -> DesignSpec
        -> Stage 2 "Engineer": buildComponentsFromSpec() -> DetectedComponentEnhanced[]
      -> sanitizeComponents() + inferContainerLayouts()
    <- { components, designSpec, errors, warnings }
  -> Hook updates local state + global store
  -> DynamicLayoutRenderer renders component tree
    -> KeyframeInjector injects @keyframes CSS
    -> VisualEffectRenderer overlays particle/canvas effects
  -> Auto-triggers self-healing loop (step-based)
    -> VisionLoopEngine.executeStep() per iteration
    -> Capture screenshot -> Gemini critique -> Apply fixes -> Re-render
    -> Repeat until 95% fidelity or 3 iterations
```

---

## What Currently Works

### Input Sources
- **Single image upload** (file input + drag-and-drop)
- **Single video upload** (client-side keyframe extraction, 3 frames)
- **Text instructions** (accompany media or standalone)
- **App context** (implicit from global store: app name, color scheme, style)
- **Multi-file upload** (UI supports it in chat panel)

### AI Capabilities
- Two-stage analysis (DesignSpec extraction -> Component building)
- 20-30+ component detection per image
- 80+ CSS style properties per component
- SVG path extraction for icons (pixel-perfect)
- Video motion/animation analysis
- AI-powered component editing (natural language)
- Self-healing vision loop with fidelity scoring
- Expanded auto-fix whitelist (25 CSS properties)
- Effect-aware critique (effect_missing, animation_missing, gradient_mismatch, image_missing issue types)

### Rendering
- Hierarchical component tree (parent-child)
- Hybrid positioning (absolute roots, relative children)
- Flex/grid container layouts (inferred from positions)
- 37 named icon types + raw SVG path support (`iconSvgPath` for pixel-perfect icons)
- Dynamic Google Fonts loading
- Interactive states (hover/active/focus via CSS variables + Tailwind classes)
- CSS particle effects (floating shapes, sparkles, trails)
- @keyframes injection system (live CSS animations)
- Image description placeholders (SVG icon + description text instead of `[IMG]`)
- Visual effects overlay system (z-index managed, pointer-events: none)
- Smart overflow handling to prevent text clipping

### Editing
- Click-to-select components
- FloatingEditBubble with AI edit input
- Delete / Duplicate actions
- Undo/redo history (component snapshots)
- Self-healing auto-refinement

### Export
- React code (clipboard)
- LayoutManifest (to global store for phase builder)
- Phase plan generation (layout -> build phases)

### Architecture Principles (CONFIRMED)
- **Presets welcome as starting points** — presets can provide convenience, but the system must handle ANY layout
- **Neutral defaults only** — gray palette from constants, transparent fallbacks
- **Trust AI data** — recovery over rejection
- **Stateless UI** — all state in useLayoutBuilder hook
- **Zero-preset rendering** — GenericComponentRenderer accepts arbitrary values from AI

---

## Gaps vs. Ultimate Vision

### Multi-Source Input (Partially Missing)

| Vision | Status |
|--------|--------|
| Natural language descriptions | Partial — works with media, unclear standalone layout generation |
| Single image -> exact replica | Working (with self-healing) |
| Multiple images -> selective combination | UI uploads multiple files, but no "take X from A, Y from B" instruction routing |
| Single video -> layout with animations | Working (keyframe extraction + motion analysis) |
| Multiple videos -> combine motions | Not implemented |
| Image + video hybrids | Not implemented |
| Video effect replication (particles, transitions) | Partial — type system and renderer support effects, but video-to-effect extraction is limited |

### Interactive Canvas (Partially Missing)

| Vision | Status |
|--------|--------|
| AI "sees" canvas | Partial — self-healing captures screenshots, but no real-time AI canvas awareness |
| Click elements + instruct changes | Working via FloatingEditBubble |
| AI modifies only intended elements | Working — surgical edits via applyAIEdit |
| Visual drag-to-reposition | Not implemented |
| Resize handles | Not implemented |
| Alignment/snapping guides | Not implemented |

### Missing UI Features
- No component tree / layer panel
- No direct property editor (all edits through AI)
- No z-index / layer management UI
- No grouping / ungrouping
- No component library / reusable elements

---

## Large/Critical Files Requiring Care

| File | Lines | Risk |
|------|-------|------|
| `layoutDesign.ts` | 2,983 | Type changes propagate everywhere |
| `GeminiLayoutService.ts` | 1,286 | AI prompt changes affect all analysis |
| `layoutValidation.ts` | 1,026 | Validation changes affect data integrity |
| `useLayoutBuilder.ts` | 799 | State changes affect all UI |
| `GenericComponentRenderer.tsx` | 874 | Rendering changes affect all components |
| `geminiLayoutBuilderPrompt.ts` | 499 | Prompt changes affect AI behavior |

---

## Detailed Component Analysis

### GenericComponentRenderer.tsx (874 lines — the rendering "atom")
- Zero-preset system: renders arbitrary values directly from AI
- 37 named icon types + raw SVG path rendering (`iconSvgPath`)
- Hybrid positioning: absolute for roots, relative for children
- Recursive child rendering with depth limit (max 10)
- 50+ CSS property mapping with unit normalization
- Smart overflow handling to prevent text clipping
- Interaction states via CSS variables (hover/active/focus)
- Image description placeholders with SVG icon
- Special handling: input elements, image galleries, icon containers

### useLayoutBuilder.ts (799 lines — state management)
- **State**: components, designSpec, selectedId, isAnalyzing, errors/warnings, healing state, history/future
- **Step-based healing**: `useEffect` monitors `healingState` and triggers next step AFTER React re-renders (solves stale DOM screenshot problem)
- **Auto-triggers healing** after initial analysis (once)
- **Integration**: `saveToWizard()` -> LayoutManifest -> global store; `generatePhasePlan()` -> build phases

### GeminiLayoutService.ts (1,286 lines — AI engine)
- **Two-stage pipeline**: Stage 1 "Architect" extracts DesignSpec; Stage 2 "Engineer" builds components with that context
- **Coordinate normalization**: 0-1000 -> 0-100% (auto-detected heuristic)
- **Icon extraction**: SVG path data preferred, Lucide name fallback
- **Video**: Keyframe transition analysis for motion replication
- **Interactions**: Extracts hover, active, and focus states
- **Visual effects**: Extracts particle configs, CSS keyframes, animation shorthand
- **Critique**: Enhanced critique with effect-aware issue types (effect_missing, animation_missing, gradient_mismatch, image_missing)

### layoutValidation.ts (1,026 lines — data integrity)
- Zod schemas for all AI-generated data (including interactions hover/active/focus, visualEffects, animations)
- **Recovery over rejection**: sanitizes partial data instead of throwing
- **Hierarchy validation**: detects orphans, missing parents, circular refs
- **Layout inference**: analyzes child positions to infer flex/grid (calculated gaps, not hardcoded)
- **Scale auto-conversion**: handles both 0-100 and 0-1000 transparently
- **Orphan repair**: attaches orphans to nearest container by bounds containment

---

## Type System Capabilities

### Supported Visual Effects
- Glassmorphism, neumorphism, gradient borders
- Text effects (gradient, glow, outline, shadow)
- Custom multi-layer shadows, mesh gradients
- Background animations (particles, floating shapes, aurora, waves)
- CSS keyframe animations (injected at runtime)
- DALL-E generated backgrounds

### Supported Interactions
- **Rendered**: Hover, active, focus states (CSS variables + Tailwind classes)
- **Type-defined only (not yet rendered)**: Disabled, loading states
- Scroll animations (fadeInUp, slideInLeft, etc.)
- Gesture interactions (swipe, drag, pinch, long-press)
- Page transitions (fade, slide, scale, flip)
- Custom keyframe animations

### Layout Modes
- Flow layout (semantic flow)
- Absolute positioning (bounds as %)
- Flex (row/column with gap, justify, align, wrap)
- Grid (columns, gap)
- Hybrid (mix of flow and absolute)

### Multi-Page Support
- Page roles (landing, dashboard, list, detail, form, auth, settings, profile, checkout)
- Per-page analysis (colors, typography, spacing, components)
- Shared design tokens across pages
- Navigation structure detection, inferred routes

---

## Summary

The layout builder has a **solid foundation** with:
- Well-architected two-stage AI pipeline
- Presets as starting points, arbitrary designs fully supported
- Self-healing for accuracy refinement
- Comprehensive type system (2,983 lines)
- Visual effects pipeline (particles, keyframes, overlays)
- Good separation of concerns (hooks/services/components)

The **4 main gaps** relative to the vision of "any layout buildable, replicable, or mergeable from multiple sources":
1. **Multi-source merge** — take elements from image A, combine with video B's layout + animations into a unified output
2. **Video effect replication** — capture and reproduce motion effects, transitions, particle systems seen in uploaded videos
3. **Direct manipulation** — drag, resize, snap for post-AI refinement
4. **Component management UI** — tree, layers, grouping
