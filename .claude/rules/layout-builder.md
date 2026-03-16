---
paths:
  - src/components/LayoutBuilderView.tsx
  - src/hooks/useLayoutBuilder.ts
  - src/components/layout-builder/**
  - src/app/(protected)/app/design/page.tsx
  - src/services/GeminiLayoutCritique.ts
  - src/services/VisionLoopEngine.ts
  - src/services/LayoutAutoFixEngine.ts
  - src/types/layoutDesign.ts
  - src/types/layoutAnalysis.ts
  - src/utils/layoutValidation.ts
---

# Layout Builder Domain (Step 2)

## Overview

The Layout Builder is Step 2 in the 5-step page flow (`/app/design`). Users upload reference images or sketches, and Gemini Vision analyzes them to produce structured layout components that feed into the Builder.

```
/app/wizard → ***/app/design*** → /app/ai-plan → /app/review → /app
```

## Component Architecture

### LayoutBuilderView

**Location:** `src/components/LayoutBuilderView.tsx` (~286 lines)

Main view for the design step. Manages:

- Image upload and preview
- Triggering Gemini Vision analysis
- Displaying detected components on LayoutCanvas
- Chat panel for iterative refinement
- Navigation to /app/review when complete

### Sub-Components (`layout-builder/`)

| Component                      | Purpose                                                                  |
| ------------------------------ | ------------------------------------------------------------------------ |
| `LayoutCanvas.tsx`             | Renders detected components as positioned overlays on the original image |
| `DynamicLayoutRenderer.tsx`    | Renders layout components dynamically based on type                      |
| `GenericComponentRenderer.tsx` | Fallback renderer for unknown component types                            |
| `FloatingEditBubble.tsx`       | Click-to-edit popup for individual components                            |
| `LayoutBuilderChatPanel.tsx`   | Chat interface for iterative refinement requests                         |
| `KeyframeInjector.tsx`         | Injects CSS keyframe animations into the layout preview                  |

## Data Flow

```
User uploads image(s)
    ↓
Titan Pipeline (TitanSurveyor) analyzes layout via Gemini Vision
    → Produces VisualManifest with dom_tree
    ↓
layoutValidation.ts (Zod) → Validate and sanitize AI output
    ↓
LayoutCanvas renders components as overlays
    ↓
(Optional) Self-Healing Vision Loop:
    VisionLoopEngine → Puppeteer screenshot → critiqueLayoutEnhanced() (GeminiLayoutCritique.ts)
    → LayoutAutoFixEngine.applyCritique() → Iterate
    ↓
Save to Zustand store:
    - layoutBuilderFiles (generated code files)
    - currentLayoutManifest (VisualManifest)
    ↓
Navigate to /app/review
```

## Key Types

### DetectedComponentEnhanced

**Location:** `src/types/layoutDesign.ts`

Core type flowing through the entire layout pipeline:

```typescript
interface DetectedComponentEnhanced {
  id: string;
  type: string; // Open-ended (button, card, hero, nav, etc.)
  bounds: { top: number; left: number; width: number; height: number };
  style: Record<string, unknown>;
  content?: Record<string, unknown>; // text, icon, image references
  text?: string;
  role?: string; // Open-ended (header, navigation, hero, etc.)
  // ... additional optional fields
}
```

### DesignSpec

**Location:** `src/types/designSpec.ts`

Extracted design specification:

```typescript
interface DesignSpec {
  colors: { primary: string; secondary: string; accent: string; background: string; text: string };
  typography: { headingFont: string; bodyFont: string; sizes: Record<string, string> };
  spacing: { unit: number; scale: number[] };
  // ... additional design tokens
}
```

### LayoutAnalysisResult

**Location:** `src/types/layoutAnalysis.ts`

Result from the two-stage analysis:

```typescript
interface LayoutAnalysisResult {
  success: boolean;
  components: DetectedComponentEnhanced[];
  designSpec: DesignSpec | null;
  errors: string[];
  warnings: string[];
  metadata: { componentCount: number; parseAttempts: number /* ... */ };
}
```

## Store Integration

Layout data is persisted in Zustand store (`useAppStore`):

- `layoutBuilderFiles` - Generated code files from layout analysis
- `currentLayoutManifest` - VisualManifest data for the Builder
- These are read by MainBuilderView (Step 5) for Phase 1 auto-injection

## Hook: useLayoutBuilder

**Location:** `src/hooks/useLayoutBuilder.ts`

Manages layout design state:

- Detected components array
- Selected component (for editing)
- Design spec
- Analysis loading/error states
- Component CRUD operations

## Inspector Bridge

Click-to-edit functionality in the Sandpack preview:

**Types in:** `src/types/titanPipeline.ts`

```typescript
interface InspectorMessage {
  type: 'COMPONENT_SELECTED';
  id: string;           // data-id attribute
  tagName: string;
  outerHTML: string;
  rect: { top: number; left: number; width: number; height: number };
}

interface InspectorBridgeState {
  selectedComponentId: string | null;
  selectedHTML: string | null;
  selectedRect: { ... } | null;
  clearSelection: () => void;
}
```

## Self-Healing Vision Loop

The layout builder can optionally run a self-healing loop to improve fidelity:

1. Render components to HTML
2. Capture Puppeteer screenshot
3. `GeminiLayoutService.critiqueLayout()` compares rendered vs original
4. `LayoutAutoFixEngine.applyCritique()` patches component styles/content/bounds
5. Repeat (up to 2 iterations or until target fidelity reached)

**Security:** Uses blocklist strategy - only dangerous CSS properties blocked, everything else passes through.

## Critical Dependencies

- `layoutDesign.ts` types ← Used by all layout components and services
- `layoutAnalysis.ts` types ← Critique and self-healing types
- `layoutValidation.ts` ← Zod schemas for AI output validation
- `GeminiLayoutCritique` ← Vision critique for healing loop (new SDK + code execution)
- `VisionLoopEngine` ← Self-healing orchestration (calls critique directly)
- `LayoutAutoFixEngine` ← Correction application
- `useLayoutBuilder` hook ← React state management
