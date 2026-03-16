---
paths:
  - src/components/MainBuilderView.tsx
  - src/services/TitanPipelineService.ts
  - src/services/GeminiLayoutService.ts
  - src/services/VisionLoopEngine.ts
  - src/services/PhaseExecutionManager.ts
  - src/hooks/useDynamicBuildPhases.ts
  - src/types/dynamicPhases.ts
  - src/types/titanPipeline.ts
  - src/app/(protected)/app/page.tsx
  - src/app/(protected)/app/wizard/page.tsx
  - src/app/(protected)/app/design/page.tsx
  - src/app/(protected)/app/review/page.tsx
---

# Builder Core Domain

## 4-Step Page-Based Architecture

The app uses a linear 4-step flow with page-based navigation under the `(protected)` route group:

```
/app/wizard → /app/design → /app/review → /app
```

| Step | Route         | Component                   | Purpose                                  |
| ---- | ------------- | --------------------------- | ---------------------------------------- |
| 1    | `/app/wizard` | `NaturalConversationWizard` | Build AppConcept via conversation        |
| 2    | `/app/design` | `LayoutBuilderView`         | Visual layout design with Gemini Vision  |
| 3    | `/app/review` | Review page (13 components) | Review concept, features, phases, layout |
| 4    | `/app`        | `MainBuilderView`           | Execute Titan Pipeline, build app        |

Each step saves its output to Zustand store (`useAppStore`), and the next step reads from it. Navigation is via `router.push()`.

## Main Orchestrator

**Component:** `MainBuilderView.tsx` (~1622 lines)

Central component managing:

- Titan Pipeline execution (Router → Surveyor → Photographer → Builder)
- Phase execution control and progress tracking
- Sandpack preview with live editing
- Version history and rollback
- Self-healing vision loop integration

**Replaces the former `AIBuilder.tsx`** which no longer exists.

## Titan Pipeline

**Service:** `TitanPipelineService.ts` (~1074 lines)

The core pipeline that transforms user input (images + instructions) into generated code.

### Pipeline Steps

```
Router (Gemini) → Analyzes intent, creates MergeStrategy
    ↓
Surveyor (Gemini Vision) → Reverse-engineers UI from screenshots
    → Produces VisualManifest[] with measured components
    ↓
Architect → Currently bypassed (returns null)
    ↓
Physicist → Currently bypassed (returns null)
    ↓
Photographer (Gemini) → Generates material assets (textures, images)
    → Uses GeminiImageService for multimodal generation
    → Uploads to Supabase, injects URLs into Builder context
    ↓
Builder (Gemini) → Synthesizes final React/Tailwind code
    → Receives original image + VisualManifest + assets
    → Produces AppFile[] (code files)
```

### Key Types

```typescript
interface PipelineInput {
  files: FileInput[]; // Uploaded images
  instructions: string; // User's request
  currentCode: string | null; // Existing code for MERGE/EDIT
  appContext?: AppContext; // App name, colors, style
}

interface PipelineResult {
  files: AppFile[]; // Generated code files
  strategy: MergeStrategy; // CREATE | MERGE | EDIT
  manifests: VisualManifest[];
  physics: MotionPhysics | null;
  warnings: string[];
  stepTimings: Record<string, number>;
}
```

### Router Intent Detection

The Router classifies user intent and creates `MergeStrategy`:

- **CREATE** - No existing code, build from scratch
- **MERGE** - Existing code + new elements to add
- **EDIT** - Modify specific parts of existing code

The Router also detects:

- **UI screenshots** → `measure_pixels` array (Surveyor analyzes these)
- **Reference images** → `generate_assets` with `source: "reference_image"` (Photographer uses these)
- **Text-only generation** → `generate_assets` without `source` field

### Progress Callbacks

Pipeline reports progress via callback:

```typescript
type ProgressCallback = (progress: PipelineProgress) => void;

interface PipelineProgress {
  currentStep: PipelineStepName; // 'routing' | 'surveying' | ... | 'assembling'
  status: PipelineStepStatus; // 'idle' | 'running' | 'completed' | 'error'
  steps: Record<PipelineStepName, { status: PipelineStepStatus; message?: string }>;
}
```

## Phase Execution

### Phase 1 Auto-Complete

Phase 1 is special: it auto-completes by directly injecting layout builder code (from Zustand store) without making an AI call. This ensures the layout design from Step 2 is preserved exactly.

### Subsequent Phases

Phases 2+ use Claude AI via `PhaseExecutionManager`:

```
DynamicPhaseGenerator.generatePhases() → DynamicPhasePlan
    ↓
For each phase:
    PhaseExecutionManager.executePhase()
        → Context extraction
        → API call to /api/ai-builder/full-app-stream (SSE)
        → Code validation
        → AST modification if needed
    ↓
    Update version history
```

### useDynamicBuildPhases Hook

**Location:** `src/hooks/useDynamicBuildPhases.ts`

React hook wrapping phase execution:

```typescript
{
  currentPhase: DynamicPhase | null
  completedPhases: string[]
  executeNextPhase(): Promise<void>
  retryPhase(phaseId): Promise<void>
  pauseExecution(): void
  resumeExecution(): void
}
```

## Self-Healing Vision Loop

**Service:** `VisionLoopEngine.ts` (~499 lines)

After code generation, the vision loop improves fidelity:

```
Generated HTML → Puppeteer screenshot
    ↓
GeminiLayoutService.critiqueLayout() → LayoutCritiqueEnhanced
    → fidelityScore (0-100)
    → discrepancies[] with correctionJSON
    ↓
LayoutAutoFixEngine.applyCritique() → Apply corrections
    ↓
Re-screenshot → Re-critique → Repeat (up to 2 iterations)
```

Stops when: target fidelity reached, max iterations hit, or diminishing returns.

## Critical Dependencies

- `MainBuilderView.tsx` ← All build flow goes through here
- `TitanPipelineService.ts` ← Core pipeline orchestration
- `GeminiLayoutService.ts` ← Vision analysis and critique
- `DynamicPhaseGenerator` ← Determines build strategy
- `PhaseExecutionManager` ← Code generation engine
- `useDynamicBuildPhases` ← React integration
- `dynamicPhases.ts` types ← Contract between services
- `titanPipeline.ts` types ← Pipeline type definitions

## Error Handling

- Pipeline step failures reported via progress callback with `'error'` status
- Phase failures trigger retry with modified context
- AutoFixEngine attempts automatic fixes from critique
- User can manually intervene via chat
- Rollback available via version history
