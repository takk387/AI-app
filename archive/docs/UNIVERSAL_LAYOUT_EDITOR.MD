# Plan: Universal Visual Editor — Titan Stack with Context Bundles

## Vision
Replace the broken JSON-property rendering engine with a **code-generation pipeline**. One unified pipeline handles **all** inputs (text, image, video, multi-file merge, editing existing code). Inputs are treated as a dynamic **Context Bundle** — `files[]` + `currentCode` + `prompt`. The Router assigns roles to each file. The Builder outputs real Next.js component code. The canvas renders it via **Sandpack** (`@codesandbox/sandpack-react`) — which handles npm dependency resolution natively (framer-motion, lucide-react, etc.).

## Architecture: The Universal Pipeline

```
User uploads files[] + optional currentCode + prompt
  → Step -1: Universal Router (Gemini Flash, temp 0.0)
     → merge_strategy.json (mode, file_roles, execution_plan)
  → Step 0: Surveyor (Gemini Flash + Code Execution + File API upload)
     → visual_manifest[].json (one per image — deterministic pixel measurements via cv2/PIL)
  → Step 1: Universal Architect (Claude 4.5 Opus)
     → structure.json (React/Tailwind DOM skeleton — from manifests OR invented from text)
  → Step 2: Physicist (Gemini Deep Think — highest reasoning model)
     → motion_physics.json (cubic-bezier, spring physics, only for video overrides)
  → Step 4: Builder (Gemini Pro)
     → AppFile[] (production Next.js/Tailwind/Framer Motion code with data-id attributes)
  → Render in LayoutCanvas via Sandpack (@codesandbox/sandpack-react)
  → Inspector script injected as hidden file in Sandpack → click-to-select → FloatingEditBubble → Live Editor
```

**Input-dependent activation (Router decides):**

| Scenario | Mode | Router | Surveyor | Architect | Physicist | Builder |
|----------|------|--------|----------|-----------|-----------|---------|
| Single image | CREATE | Assigns file as layout_source | Measures 1 image | Builds skeleton from manifest | Skipped | Codes the visuals |
| Two images (merge) | MERGE | Assigns roles (header from A, grid from B) | Measures both images | Merges manifests per strategy | Skipped | Fuses everything |
| Image + video | MERGE | layout_source + motion_source | Measures image | Builds skeleton | Extracts motion | Fuses layout + motion |
| Text only | CREATE | No files, strategy: invent | Skipped | Invents layout from prompt | Skipped | Codes from structure |
| Edit existing + text | EDIT | base_source=codebase, preserve=true | Skipped | Skipped | Skipped | Applies change to currentCode |
| Edit existing + new image | EDIT | base_source=codebase, image=component_source | Measures new image | Skipped | Skipped | Injects measured component into currentCode |

**The 6 Prompts (Complete "Titan Package"):**

| # | Agent | Model | Purpose | Status |
|---|-------|-------|---------|--------|
| -1 | Universal Router | gemini-3-flash (temp 0.0) | Decides mode (CREATE/MERGE/EDIT), assigns file roles | NEW |
| 0 | Surveyor | gemini-3-flash + Code Execution + **File API upload** | Measures pixels deterministically (cv2/PIL on Google's servers). Images uploaded via Gemini File API first. | NEW |
| 1 | Universal Architect | claude-4-5-opus | Builds DOM structure from manifests OR invents from text | NEW |
| 2 | Sniper Physicist | **gemini-3-deep-think** (highest reasoning model) | Extracts motion physics from video — cubic-bezier math, spring constants, damping ratios | NEW |
| 4 | Universal Builder | gemini-3-pro | Generates final compilable Next.js code from all inputs | NEW |
| 5 | Live Editor | gemini-3-pro (fast) | Lightweight edits for FloatingEditBubble (no full pipeline) | NEW |

## Files to DELETE / ARCHIVE

These are replaced by code generation + iframe preview:

| File | Lines | Reason |
|------|-------|--------|
| `src/components/layout-builder/GenericComponentRenderer.tsx` | 942 | Replaced by code preview — the renderer bottleneck |
| `src/components/layout-builder/DynamicLayoutRenderer.tsx` | 91 | No longer mapping JSON to DOM |
| `src/components/layout-builder/KeyframeInjector.tsx` | 185 | Animations are now in generated code |
| `src/components/effects/VisualEffectRenderer.tsx` | 95 | Effects are now in generated code |
| `src/components/effects/CSSParticleEffect.tsx` | 192 | Particles are now in generated code |
| `src/services/LayoutAutoFixEngine.ts` | 403 | Self-healing will work on code, not JSON properties |

## Files to CREATE

### 1. `src/types/titanPipeline.ts` (~200 lines)
Type definitions for all pipeline contracts:

```typescript
// --- Input Bundle (Dynamic Context Slots) ---
interface FileInput {
  base64: string;
  mimeType: string;
  filename: string;
}

interface PipelineInput {
  files: FileInput[];           // Dynamic array — 0 to N images/videos
  currentCode: string | null;   // Existing code if editing, null if creating
  instructions: string;         // User prompt
  appContext?: { name?: string; colorScheme?: string; primaryColor?: string; style?: string };
}

// --- Step -1: Router Output ---
interface MergeStrategy {
  mode: 'CREATE' | 'MERGE' | 'EDIT';
  base_source: 'codebase' | `file_${number}` | null;
  file_roles: FileRole[];
  execution_plan: {
    measure_pixels: number[];    // Indices of images to send to Surveyor
    extract_physics: number[];   // Indices of videos to send to Physicist
    preserve_existing_code: boolean;
  };
}

interface FileRole {
  file_index: number;
  role: 'layout_source' | 'style_source' | 'component_source' | 'motion_source';
  applies_to: string[];  // ['global'] or ['navbar', 'hero', 'button']
}

// --- Step 0: Surveyor Output (one per measured image) ---
interface VisualManifest {
  file_index: number;
  canvas: { width: number; height: number };
  measured_components: MeasuredComponent[];
  global_theme: { colors: string[]; fonts: string[]; spacing_unit: number };
}

interface MeasuredComponent {
  id: string;
  tag: string;
  bounds: { x: number; y: number; width: number; height: number };
  computed_styles: Record<string, string>;
  children: MeasuredComponent[];
}

// --- Step 1: Architect Output ---
interface ComponentStructure {
  tree: StructureNode[];
  layout_strategy: 'flex' | 'grid' | 'hybrid';
  responsive_breakpoints?: Record<string, object>;
}

interface StructureNode {
  id: string;
  tag: string;
  classes: string[];    // Tailwind layout classes only
  children: StructureNode[];
  source_manifest?: number;  // Which manifest this came from (for merges)
}

// --- Step 2: Physicist Output ---
interface MotionPhysics {
  component_motions: ComponentMotion[];
  page_transitions?: PageTransition[];
}

interface ComponentMotion {
  target_id: string;
  entrance?: { type: string; bezier: number[]; duration_ms: number; delay_ms: number };
  scroll?: { trigger: string; animation: string; threshold: number };
  hover?: { scale?: number; rotate?: number; translate_y?: number; spring?: SpringConfig };
  loop?: { type: string; duration_ms: number; keyframes?: Record<string, Record<string, string>> };
}

// --- Step 4: Builder Output ---
// Uses existing AppFile from src/types/railway.ts: { path: string; content: string }

// --- Pipeline Result ---
interface PipelineResult {
  files: AppFile[];
  strategy: MergeStrategy;
  manifests: VisualManifest[];
  physics: MotionPhysics | null;
  warnings: string[];
  stepTimings: Record<string, number>;
}

// --- Pipeline Step Status (for progress UI) ---
type PipelineStepName = 'router' | 'surveyor' | 'architect' | 'physicist' | 'builder';
type PipelineStepStatus = 'pending' | 'running' | 'complete' | 'skipped' | 'error';

interface PipelineProgress {
  currentStep: PipelineStepName;
  steps: Record<PipelineStepName, PipelineStepStatus>;
  message: string;
}
```

### 2. `src/services/TitanPipelineService.ts` (~700 lines)
Server-side orchestrator with methods for each step. All 6 prompts embedded here.

**`routeIntent(input: PipelineInput)`** → Universal Router
- Model: Gemini Flash, temp 0.0
- Receives: `files[]` metadata (filename, mimeType), `currentCode` presence, `instructions`
- Returns: `MergeStrategy` with mode, file_roles, execution_plan
- Prompt handles N files + edit detection

**`surveyLayout(imageBase64: string, fileIndex: number)`** → Surveyor
- Model: Gemini Flash + `tools: [{ codeExecution: {} }]`
- **CRITICAL: Upload image to Gemini File API first** (`fileManager.uploadFile()`), then pass the file reference to the model. The Code Execution Python sandbox needs a valid file reference — raw base64 cannot be passed into the Python environment.
- Python runs on Google's servers (cv2/PIL) using the uploaded file reference
- Called once per image in `execution_plan.measure_pixels[]`
- Returns: `VisualManifest` with deterministic pixel measurements

**`buildStructure(manifests: VisualManifest[], strategy: MergeStrategy, instructions: string)`** → Universal Architect
- Model: Claude 4.5 Opus via Anthropic SDK
- Handles multiple manifests (merge) or zero manifests (text-only invention)
- When merging: follows strategy to assign manifest regions to DOM sections
- When text-only: invents professional layout with reasonable Tailwind defaults
- Returns: `ComponentStructure`

**`extractPhysics(videoFrames: string[][], strategy: MergeStrategy)`** → Sniper Physicist
- Model: **gemini-3-deep-think** (highest available reasoning model — NOT Flash. Physics math requires deep reasoning for accurate cubic-bezier computation, spring constant derivation, and damping ratio calculations)
- Only called for indices in `execution_plan.extract_physics[]`
- Extracts cubic-bezier curves, spring configs (stiffness, damping, mass), scroll-trigger thresholds
- Returns: `MotionPhysics`

**`assembleCode(structure, manifests, physics, strategy, currentCode, instructions)`** → Universal Builder
- Model: Gemini Pro
- If mode=EDIT: starts from currentCode, applies targeted changes
- If mode=CREATE: builds from structure.json + manifests
- If mode=MERGE: fuses multiple sources per strategy
- Outputs: `AppFile[]` with `data-id` attributes on every major element
- Includes conflict resolution: specific instructions > measured data > vibe guesses

**`liveEdit(codeSnippet: string, instruction: string)`** → Live Editor
- Model: Gemini Pro (fast)
- Lightweight — no full pipeline, just code-in → code-out
- Preserves existing logic/event handlers, only updates CSS/Tailwind
- Used by FloatingEditBubble for quick edits

**`runPipeline(input: PipelineInput)`** → Orchestrator
- Calls routeIntent → reads execution_plan → calls active steps in sequence
- Returns `PipelineResult`

### 3. `src/app/api/layout/pipeline/route.ts` (~80 lines)
New API endpoint for the Titan pipeline:
- POST with `{ files: FileInput[], currentCode?: string, instructions: string, appContext? }`
- Also handles `{ action: 'live-edit', codeSnippet: string, instruction: string }` for FloatingEditBubble
- Calls `TitanPipelineService.runPipeline()` or `liveEdit()`
- Returns `{ files: AppFile[], strategy, manifests, warnings }` or `{ updatedCode: string }`
- Streaming optional (SSE for step-by-step progress)

### 4. `src/utils/inspectorBridge.ts` (~100 lines)
PostMessage bridge between Sandpack iframe and main app:

**`INSPECTOR_FILE_PATH`** = `/src/inspector.js` — constant for the hidden Sandpack file path

**`createInspectorFileContent()`** → returns JS string to be added as a hidden file in Sandpack's `files` prop
  - Imported in Sandpack's `/src/index.tsx` entry file
  - Adds click listeners on all `[data-id]` elements
  - On click: sends `{ type: 'COMPONENT_SELECTED', id, tagName, outerHTML, rect }` via postMessage to parent
  - Adds hover highlight overlay (subtle blue border on mouseover)
  - Prevents default navigation for `<a>` tags
  - Self-initializing on DOMContentLoaded

**`useInspectorBridge()`** → React hook (no iframeRef needed — uses window message listener)
  - Listens for postMessage events from Sandpack iframe
  - Returns `{ selectedComponentId, selectedHTML, selectedRect }`
  - `selectedRect` used for positioning FloatingEditBubble relative to Sandpack container

## Files to MODIFY

### 5. `src/hooks/useLayoutBuilder.ts` (974 lines → ~500 lines, major rewrite)
**Core change:** Manage `generatedCode: AppFile[]` instead of `components: DetectedComponentEnhanced[]`

- Remove: component array state, healing state, manipulation state, sourceId tracking
- Add: `generatedCode: AppFile[]` state — the single source of truth
- Add: `pipelineProgress: PipelineProgress` state — for step progress UI
- Add: `mergeStrategy: MergeStrategy | null` state
- Add: `runPipeline(files: UploadedMedia[], instructions: string)` — converts media to FileInput[], sends to `/api/layout/pipeline`, stores result
- Add: `refineComponent(dataId: string, prompt: string, outerHTML: string)` — calls Live Editor endpoint with code snippet + instruction, patches generatedCode
- Add: `editWithMedia(files: UploadedMedia[], instructions: string)` — sends files[] + currentCode to pipeline (mode=EDIT)
- Keep: `exportCode()` (now simpler — code IS the output)
- Keep: history/future for undo/redo (snapshots of `generatedCode: AppFile[]`)

### 6. `src/components/layout-builder/LayoutCanvas.tsx` (578 lines → ~300 lines, major rewrite)
**Core change:** Replace DynamicLayoutRenderer with Sandpack code preview

- Remove: DynamicLayoutRenderer, ManipulationOverlay, screenshot capture, healing UI, component selection by JSON id
- Add: `<SandpackProvider>` + `<SandpackPreview>` from `@codesandbox/sandpack-react`
  - Template: `react-ts`
  - Dependencies: `{ "framer-motion": "latest", "lucide-react": "latest", "clsx": "latest", "tailwind-merge": "latest" }`
  - External resources: Tailwind CSS CDN (`https://cdn.tailwindcss.com`)
  - Files: Convert `AppFile[]` to Sandpack files format + inject inspector script as hidden `/src/inspector.js`
- Add: Use `useInspectorBridge()` to listen for component selection via postMessage
- Add: Position FloatingEditBubble using `selectedRect` from inspector bridge (relative to Sandpack container)
- Keep: FloatingEditBubble (with new props — see below)
- Keep: Toolbar (undo/redo, export)
- Keep: Drop zone for file upload when no code exists yet
- Keep: Pipeline progress/error display

**NOTE:** The existing `BrowserPreview` + esbuild-wasm stays untouched for the main app builder (PreviewContainer.tsx). Only the layout builder uses Sandpack.

### 7. `src/components/layout-builder/FloatingEditBubble.tsx` (137 lines → ~150 lines)
**Core change:** Use Live Editor prompt instead of JSON property edits

- Remove: `DetectedComponentEnhanced` import and prop typing
- Remove: Bounds-based positioning (replaced by inspector rect)
- Add: New props: `{ dataId: string, componentType: string, outerHTML: string, rect: DOMRect, onRefine, onClose }`
- Add: `onRefine(dataId: string, prompt: string, outerHTML: string)` callback
- Add: Position using `rect` from inspector bridge (absolute to iframe container)
- Keep: UI (input field, delete/duplicate buttons, loading state)
- Keep: Auto-focus, submit-on-enter behavior

### 8. `src/components/LayoutBuilderView.tsx` (387 lines → ~320 lines)
**Core change:** Wire up unified pipeline with Context Bundle input model

- Remove: ComponentTreePanel integration (paused — hard with code gen)
- Remove: ManipulationOverlay / useDirectManipulation (paused — drag/drop deferred)
- Remove: useSourceRegistry (replaced by Titan Router's merge_strategy)
- Update: `handleAnalyzeMedia()` → converts UploadedMedia[] to FileInput[], calls `useLayoutBuilder.runPipeline(files, instructions)`
- Update: `handleSendMessage()` → if text-only with existing code, calls `runPipeline([], message)` with currentCode (mode=EDIT)
- Update: `handleSendMessage()` → if text-only with NO code, calls `runPipeline([], message)` (mode=CREATE, text-only generation)
- Update: `handleSendMessage()` → if media + existing code, calls `editWithMedia(files, instructions)` (mode=EDIT with new reference)
- Add: Pass `pipelineProgress` to both ChatPanel and Canvas for progress display
- Keep: Chat panel + canvas layout, message state

### 9. `src/components/layout-builder/LayoutBuilderChatPanel.tsx` (391 lines → ~420 lines)
**Changes:** Pipeline progress + unified input feedback

- Add: `pipelineProgress?: PipelineProgress` prop
- Add: Render step progress in chat area (e.g., "Routing intent... → Measuring layout... → Building structure... → Generating code...")
- Add: Show which mode the Router selected (CREATE/MERGE/EDIT) in progress display
- Keep: File upload (image + video), text input, multi-file support
- Keep: Chat message display

### 10. `src/services/GeminiLayoutService.ts` (1,351 lines)
**Keep existing methods** (for backwards compat). The new `TitanPipelineService` handles the Titan Stack. GeminiLayoutService stays available but is not called by the new pipeline.

### 11. `src/app/api/layout/analyze/route.ts` (50 lines)
**Keep existing endpoint.** The new pipeline uses `/api/layout/pipeline`. Old endpoint stays for any legacy flows during transition.

## Implementation Phases

### Phase 0: Save Plan
1. Save this complete plan as `UNIVERSAL_LAYOUT_EDITOR.MD` in the project root

### Phase 1: Types + Pipeline Service (backend foundation)
1. Create `src/types/titanPipeline.ts` — all contract types (PipelineInput with files[], MergeStrategy, VisualManifest, etc.)
2. Create `src/services/TitanPipelineService.ts` — all 6 agents (Router, Surveyor, Architect, Physicist, Builder, Live Editor) + orchestrator
3. Create `src/app/api/layout/pipeline/route.ts` — API endpoint accepting `{ files[], currentCode?, instructions }` + live-edit action
4. **Test:** Call the pipeline endpoint directly with curl/Postman:
   - Test CREATE mode: `{ files: [imageBase64], instructions: "Replicate this" }`
   - Test MERGE mode: `{ files: [img1, img2], instructions: "Header from first, grid from second" }`
   - Test EDIT mode: `{ files: [], currentCode: "...", instructions: "Make the gap bigger" }`
   - Test text-only: `{ files: [], instructions: "Build a login page" }`
   - Verify Builder outputs valid compilable React code

### Phase 2: Preview Engine Swap (frontend rendering)
1. Install `@codesandbox/sandpack-react` via npm
2. Create `src/utils/inspectorBridge.ts` — inspector file content + useInspectorBridge hook
3. Rewrite `LayoutCanvas.tsx` — SandpackProvider/SandpackPreview + inspector bridge + FloatingEditBubble positioning
4. Update `FloatingEditBubble.tsx` — new props (dataId, rect, outerHTML, onRefine)
5. **Test:** Hard-code a sample React component string, verify:
   - It renders in the Sandpack preview
   - Dependencies resolve (framer-motion, lucide-react imports work)
   - Tailwind CSS classes apply correctly
   - Click on a `[data-id]` element sends postMessage to parent
   - FloatingEditBubble appears at correct position
   - Live Edit returns updated code snippet

### Phase 3: Hook + View Refactor (wire it together)
1. Rewrite `useLayoutBuilder.ts` — generatedCode state, runPipeline(), refineComponent(), editWithMedia()
2. Update `LayoutBuilderView.tsx` — unified input handling (all scenarios: create, merge, edit, text-only)
3. Update `LayoutBuilderChatPanel.tsx` — pipeline step progress display
4. **Test full scenarios:**
   - Upload 1 image → pipeline runs → code renders in preview → click component → edit via bubble
   - Upload 2 images + "header from A, grid from B" → MERGE mode → renders merged layout
   - Type "Make the gap bigger" while viewing existing layout → EDIT mode → code updates
   - Upload new image while viewing existing layout → "Replace center with this" → EDIT with reference
   - Type "Build a login page" with no existing code → CREATE from text

### Phase 4: Cleanup
1. Delete old rendering files (GenericComponentRenderer, DynamicLayoutRenderer, KeyframeInjector, VisualEffectRenderer, CSSParticleEffect, LayoutAutoFixEngine)
2. Remove unused imports across the codebase
3. Update `MASTER_CONTEXT_VERIFIED.md` and `UPDATED_LAYOUT_GAP.MD`
4. **Test:** `npm run typecheck`, `npm run lint`, `npm test`

## Key Technical Decisions

**Dynamic Context Bundles:** All inputs are `files[]` (0 to N) + `currentCode` (nullable) + `instructions`. The backend is stateless — it doesn't care if it's building from scratch, merging two images, or fixing a button. It just follows the `MergeStrategy` generated by the Router.

**File Array Support:** The API accepts `files[]` even for single uploads (list of 1). This future-proofs for any combination without refactoring.

**State Passing (Edit Loop):** The API accepts `currentCode` (the existing generated code string). If null → new project. If populated → edit mode. This creates a feedback loop: Frontend → API → Router (detects EDIT) → Builder (applies targeted change) → Frontend updates preview.

**Preview engine:** Sandpack (`@codesandbox/sandpack-react`) for the layout builder. This solves the critical esbuild-wasm brittleness problem — when the AI imports `framer-motion` or `lucide-react`, esbuild fails unless we manually shim every dependency. Sandpack resolves npm packages natively. The existing `BrowserPreview` + esbuild-wasm stays untouched for the main app builder (PreviewContainer.tsx).

**Sandpack configuration:**
- Template: `react-ts`
- Pre-loaded dependencies: `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`
- External resource: Tailwind CSS CDN (`https://cdn.tailwindcss.com`)
- Files prop: Convert `AppFile[]` to Sandpack format + hidden inspector script file

**Builder output format:** `AppFile[]` from `src/types/railway.ts`: `{ path: string; content: string }`. Converted to Sandpack files format `{ [path]: { code: string } }` in LayoutCanvas.

**Inspector injection:** Inspector script added as a hidden file `/src/inspector.js` in Sandpack's `files` prop and imported in the entry file. Adds click listeners on `[data-id]` elements, sends postMessage to parent window.

**Live Editor (Fast Edits):** FloatingEditBubble uses a lightweight Gemini Pro prompt — sends the selected `outerHTML` + user instruction, gets back updated snippet. No full pipeline needed for "Make this blue."

**Full Pipeline (Heavy Edits):** For edits that need new media (e.g., "Replace this section with this uploaded image"), the full pipeline runs with `currentCode` + new `files[]`. Router sets mode=EDIT and the Builder does targeted injection.

**Surveyor File Upload:** Uses `@google/generative-ai` SDK. Images MUST be uploaded to Gemini File API first via `fileManager.uploadFile()` before passing to the model with Code Execution. The Python sandbox needs a file reference, not raw base64.

**Physicist Model:** Uses `gemini-3-deep-think` (highest available reasoning model), NOT Flash. Physics math (cubic-bezier derivation, spring constants, damping ratios) requires deep reasoning for accuracy.

**Sora 2:** Dropped. Builder generates CSS directly (gradients, filters, animations, particles via CSS/JS).

## Verification

1. `npm run typecheck` — new types compile cleanly
2. `npm run lint` — no lint errors
3. `npm test` — existing tests pass (some layout builder tests may need updates)
4. Manual CREATE: Upload single image → pipeline executes (Router→Surveyor→Architect→Builder) → code renders in preview
5. Manual MERGE: Upload 2 images + merge instruction → Router assigns roles → both measured → Architect merges → Builder fuses → renders merged layout
6. Manual EDIT (text): Click component → type "Make this blue" in bubble → Live Editor returns updated code → preview refreshes
7. Manual EDIT (media): Upload new image while viewing layout → "Replace hero with this" → Router detects EDIT → Surveyor measures new image → Builder injects into currentCode
8. Manual TEXT-ONLY: Type "Build a dashboard" with no media → Router selects CREATE → Architect invents layout → Builder generates code
9. Manual: Verify undo/redo works on code snapshots
10. Manual: Verify pipeline progress shows in chat panel (step names + status)
