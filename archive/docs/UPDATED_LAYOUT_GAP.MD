# Layout Builder - Current State Assessment

> **Updated: 2026-01-30** | Comprehensive gap analysis of the layout builder
>
> **Vision**: Build, replicate, or merge ANY layout from multiple images, videos, and text — including all visual effects. Presets are welcome as starting points, but the system must handle arbitrary designs.

## Architecture Overview

The layout builder is a **standalone AI-powered design tool** at the `/app/design` route (NOT inside AIBuilder.tsx). It uses a **two-stage Gemini 3 Flash analysis pipeline** with self-healing capabilities.

**Total codebase: ~16,600+ lines across 33+ key files**

---

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| **Components** | | |
| `src/components/LayoutBuilderView.tsx` | 387 | Main orchestrator, chat state, panel coordination |
| `src/components/layout-builder/LayoutBuilderChatPanel.tsx` | 391 | Left panel: chat, media upload, text input |
| `src/components/layout-builder/LayoutCanvas.tsx` | 578 | Right panel: preview canvas, selection, manipulation, self-healing UI |
| `src/components/layout-builder/FloatingEditBubble.tsx` | 137 | Contextual AI edit popup on selected components |
| `src/components/layout-builder/DynamicLayoutRenderer.tsx` | 91 | Builds/renders hierarchical component tree |
| `src/components/layout-builder/GenericComponentRenderer.tsx` | 942 | Renders ANY component type (the "atom") |
| `src/components/layout-builder/KeyframeInjector.tsx` | 185 | @keyframes CSS injection for animations |
| `src/components/layout-builder/ComponentTreePanel.tsx` | 507 | Collapsible tree view, visibility/lock toggles, rename, delete, duplicate |
| `src/components/layout-builder/ManipulationOverlay.tsx` | 326 | Drag handles, 8-point resize, snap guide lines |
| `src/components/layout-builder/ComponentGroupManager.ts` | 176 | Group/ungroup/reparent pure utility functions |
| `src/components/effects/CSSParticleEffect.tsx` | 192 | Zero-dependency CSS particle system |
| `src/components/effects/VisualEffectRenderer.tsx` | 95 | Effect overlay routing (particle, canvas, CSS) |
| **State** | | |
| `src/hooks/useLayoutBuilder.ts` | 974 | Single source of truth: components, designSpec, history, healing, manipulation |
| `src/hooks/useDirectManipulation.ts` | 296 | Drag/resize state management with snap integration |
| `src/hooks/useAppBuilderSync.ts` | 206 | Layout-to-app-builder sync, design token extraction |
| `src/store/useAppStore.ts` | 761 | Global store layout slice (manifests, designSpec, phasePlan) |
| **Services** | | |
| `src/services/GeminiLayoutService.ts` | 1,351 | Two-stage AI analysis, editing, critique |
| `src/services/VisionLoopEngine.ts` | 499 | Step-based self-healing orchestrator |
| `src/services/LayoutAutoFixEngine.ts` | 403 | Applies AI critique corrections to components |
| `src/services/LayoutExportService.ts` | 276 | Design token extraction, CSS variables, Tailwind config export |
| `src/services/GeminiImageService.ts` | 344 | Gemini-powered background image generation and upload |
| **Types** | | |
| `src/types/layoutDesign.ts` | 2,999 | Full type system (DetectedComponentEnhanced, LayoutDesign, etc.) |
| `src/types/designSpec.ts` | 109 | Design system spec type (structured effects configs) |
| `src/types/layoutAnalysis.ts` | 203 | Analysis result, critique, self-healing types |
| `src/types/manipulation.ts` | 55 | Bounds, ResizeHandle, DragState, SnapLine types |
| `src/types/componentManagement.ts` | 28 | TreeStateMap type for component tree panel |
| **Utils** | | |
| `src/utils/layoutValidation.ts` | 1,087 | Zod schemas, sanitization, hierarchy inference |
| `src/utils/layoutConverter.ts` | 200 | Components -> LayoutManifest conversion |
| `src/utils/colorUtils.ts` | 159 | Color normalization, transparency detection |
| `src/utils/colorHarmony.ts` | 475 | Color manipulation, WCAG checks |
| `src/utils/snapEngine.ts` | 197 | Snap line calculation and bounds snapping |
| `src/utils/videoProcessor.ts` | 239 | Client-side video keyframe extraction |
| `src/utils/designTokenMappings.ts` | 454 | Design token mapping utilities for phase execution |
| **Prompts** | | |
| `src/prompts/geminiLayoutBuilderPrompt.ts` | 509 | Gemini system prompt, detection requirements |
| **API** | | |
| `src/app/api/layout/analyze/route.ts` | 50 | POST endpoint for all layout operations |
| **Page** | | |
| `src/app/(protected)/app/design/page.tsx` | 69 | Design route page |

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
- 38 named icon types + raw SVG path support (`iconSvgPath` for pixel-perfect icons)
- Dynamic Google Fonts loading
- Interactive states (hover/active/focus via CSS variables + Tailwind classes)
- CSS particle effects (floating shapes, sparkles, trails)
- @keyframes injection system (live CSS animations)
- Image description placeholders (SVG icon + description text instead of `[IMG]`)
- Visual effects overlay system (z-index managed, pointer-events: none)
- Smart overflow handling to prevent text clipping

### Direct Manipulation
- Click-to-select components
- Drag-to-reposition via ManipulationOverlay (transparent overlay layer)
- 8-point resize handles (4 corners + 4 edges) with live preview
- Alignment/snapping guides during drag and resize (snapEngine)
- Component tree / layer panel (collapsible hierarchy, visibility/lock toggles, rename)
- Grouping / ungrouping components (ComponentGroupManager)

### AI Editing
- FloatingEditBubble with AI edit input
- Delete / Duplicate actions
- Undo/redo history (component snapshots)
- Self-healing auto-refinement

### Export
- React code (clipboard)
- LayoutManifest (to global store for phase builder)
- Phase plan generation (layout -> build phases)
- Design token extraction (CSS variables, Tailwind config, JSON via LayoutExportService)

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
| Natural language descriptions | Partial — works with media, no standalone text-to-layout generation (always requires image) |
| Single image -> exact replica | Working (with self-healing) |
| Multiple images -> selective combination | Partial — sourceId tracking merges components additively, but no "take X from A, Y from B" semantic instruction routing to AI |
| Single video -> layout with animations | Working (keyframe extraction + motion analysis) |
| Multiple videos -> combine motions | Not implemented |
| Image + video hybrids | Not implemented |
| Video effect replication (particles, transitions) | Partial — type system and renderer support effects, but video-to-effect extraction is limited |

### Interactive Canvas (Working)

| Vision | Status |
|--------|--------|
| AI "sees" canvas | Partial — self-healing captures screenshots, but no real-time AI canvas awareness |
| Click elements + instruct changes | Working via FloatingEditBubble |
| AI modifies only intended elements | Working — surgical edits via applyAIEdit |
| Visual drag-to-reposition | Working — ManipulationOverlay + useDirectManipulation hook |
| Resize handles | Working — 8-point system (4 corners + 4 edges) in ManipulationOverlay |
| Alignment/snapping guides | Working — snapEngine.ts + SnapLine rendering in ManipulationOverlay |

### Missing UI Features
- No direct property editor (all edits through AI or direct manipulation)
- No z-index / layer management UI (z-index exists in types/rendering, no manual UI)
- No component library / reusable elements

---

## Large/Critical Files Requiring Care

| File | Lines | Risk |
|------|-------|------|
| `layoutDesign.ts` | 2,999 | Type changes propagate everywhere |
| `GeminiLayoutService.ts` | 1,351 | AI prompt changes affect all analysis |
| `layoutValidation.ts` | 1,087 | Validation changes affect data integrity |
| `useLayoutBuilder.ts` | 974 | State changes affect all UI and manipulation |
| `GenericComponentRenderer.tsx` | 942 | Rendering changes affect all components |
| `geminiLayoutBuilderPrompt.ts` | 509 | Prompt changes affect AI behavior |
| `ComponentTreePanel.tsx` | 507 | Tree view affects component management UX |
| `designTokenMappings.ts` | 454 | Token mappings affect phase execution |

---

## Detailed Component Analysis

### GenericComponentRenderer.tsx (942 lines — the rendering "atom")
- Zero-preset system: renders arbitrary values directly from AI
- 38 named icon types + raw SVG path rendering (`iconSvgPath`)
- Hybrid positioning: absolute for roots, relative for children
- Recursive child rendering with depth limit (max 10)
- 50+ CSS property mapping with unit normalization
- Smart overflow handling to prevent text clipping
- Interaction states via CSS variables (hover/active/focus)
- Image description placeholders with SVG icon
- Special handling: input elements, image galleries, icon containers

### useLayoutBuilder.ts (974 lines — state management)
- **State**: components, designSpec, selectedId, isAnalyzing, errors/warnings, healing state, history/future
- **Step-based healing**: `useEffect` monitors `healingState` and triggers next step AFTER React re-renders (solves stale DOM screenshot problem)
- **Auto-triggers healing** after initial analysis (once)
- **Direct manipulation**: drag/resize via `updateComponentStyle`, `commitBounds`; grouping/ungrouping via ComponentGroupManager
- **Multi-source tracking**: `sourceId` tagging for additive component merging
- **Integration**: `saveToWizard()` -> LayoutManifest -> global store; `generatePhasePlan()` -> build phases

### GeminiLayoutService.ts (1,351 lines — AI engine)
- **Two-stage pipeline**: Stage 1 "Architect" extracts DesignSpec; Stage 2 "Engineer" builds components with that context
- **Coordinate normalization**: 0-1000 -> 0-100% (auto-detected heuristic)
- **Icon extraction**: SVG path data preferred, Lucide name fallback
- **Video**: Keyframe transition analysis for motion replication
- **Interactions**: Extracts hover, active, and focus states
- **Visual effects**: Extracts particle configs, CSS keyframes, animation shorthand
- **Critique**: Enhanced critique with effect-aware issue types (effect_missing, animation_missing, gradient_mismatch, image_missing)

### layoutValidation.ts (1,087 lines — data integrity)
- Zod schemas for all AI-generated data (including interactions hover/active/focus, visualEffects, animations)
- **Recovery over rejection**: sanitizes partial data instead of throwing
- **Hierarchy validation**: detects orphans, missing parents, circular refs
- **Layout inference**: analyzes child positions to infer flex/grid (calculated gaps, not hardcoded)
- **Scale auto-conversion**: handles both 0-100 and 0-1000 transparently
- **Orphan repair**: attaches orphans to nearest container by bounds containment

---

## Dead Code / Unused Files

| File | Lines | Evidence |
|------|-------|---------|
| `src/app/api/layout/screenshot/route.ts` | 192 | Not referenced anywhere — screenshots are client-side via html2canvas callback |
| `src/utils/designCritiqueEngine.ts` | 108 | Not imported by any file |
| `src/services/designSystemGenerator.ts` | 707 | All imports commented out in both API routes |

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
- **Rendered**: Custom keyframe animations (via KeyframeInjector)
- **Type-defined only (not yet rendered)**: Disabled, loading states
- **Type-defined only (not yet rendered)**: Scroll animations (fadeInUp, slideInLeft, etc.)
- **Type-defined only (not yet rendered)**: Gesture interactions (swipe, drag, pinch, long-press)
- **Type-defined only (not yet rendered)**: Page transitions (fade, slide, scale, flip)

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

The layout builder has a **mature foundation** with:
- Well-architected two-stage AI pipeline
- Presets as starting points, arbitrary designs fully supported
- Self-healing for accuracy refinement
- Comprehensive type system (2,999 lines)
- Visual effects pipeline (particles, keyframes, overlays)
- Direct manipulation layer (drag, resize, snap guides)
- Component management (tree panel, grouping/ungrouping)
- Design token extraction and export (CSS variables, Tailwind config, JSON)
- Good separation of concerns (hooks/services/components)

The **4 remaining gaps** relative to the vision of "any layout buildable, replicable, or mergeable from multiple sources":
1. **Multi-video / hybrid input** — combine multiple videos or mix image+video sources into a unified analysis
2. **Video effect replication** — capture and reproduce motion effects, transitions, particle systems seen in uploaded videos
3. **Direct property editor** — manual CSS/style property editing without AI (only AI editing + drag/resize currently)
4. **Text-only layout generation** — generate full layouts from natural language descriptions without requiring image input
