# Fix: Visual Fidelity — Code & Architecture Issues (Not Prompts)

## Root Cause Analysis

The prompts are correct. The problem is the **code that passes data between pipeline steps** and the **rendering environment**. Three independent investigations found the same thing:

### Why replicas aren't exact — ranked by impact:

| #   | Problem                                                                                                                                                | Location                                       | Impact                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Surveyor doesn't enable Agentic Vision** — code execution is off, so Flash falls back to static image analysis instead of its Think→Act→Observe loop | `TitanPipelineService.ts:232-234`              | Missing 5-10% quality boost on vision tasks. No zoom/crop/annotate capability for precise CSS extraction                                      |
| 2   | **No maxOutputTokens** on Surveyor or Builder                                                                                                          | `TitanPipelineService.ts:232,450`              | Complex designs get truncated mid-JSON. The dom_tree simply cuts off                                                                          |
| 3   | **Tailwind CDN preflight resets** in Sandpack                                                                                                          | `LayoutCanvas.tsx:404`                         | Resets margins, padding, line-heights, borders on ALL elements. Even exact inline styles can't override inherited/cascading preflight effects |
| 4   | **Architect output ($$ Claude Opus) is computed and THROWN AWAY**                                                                                      | `TitanPipelineService.ts:439` (`_structure`)   | Wasted API call. Zero value added to pipeline. Adds latency                                                                                   |
| 5   | **Only first image surveyed**                                                                                                                          | `TitanPipelineService.ts:611`                  | Multi-image uploads lose all images after the first                                                                                           |
| 6   | **currentCode ignored in Builder**                                                                                                                     | `TitanPipelineService.ts:438` (`_currentCode`) | EDIT mode generates from scratch instead of modifying existing code                                                                           |

---

## Fixes (3 changes, 2 files)

### Fix 1: Migrate TitanPipelineService to `@google/genai` + Enable Agentic Vision

**File:** `src/services/TitanPipelineService.ts`

**Why:** Two reasons combined:

1. Gemini 3 Flash has [Agentic Vision](https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/) — a Think → Act → Observe loop where the model zooms, crops, annotates images via code execution. This delivers a consistent 5-10% quality boost on vision benchmarks. The Surveyor is the most critical step (extracts exact CSS) and Agentic Vision is designed for exactly this. Flash [outperforms Pro](https://www.aifreeapi.com/en/posts/gemini-3-flash-vs-pro-capabilities) on agentic tasks (78% vs 76.2% SWE-bench).
2. The current `@google/generative-ai` SDK (v0.24.1) is [past end-of-life (Aug 2025)](https://www.npmjs.com/package/@google/generative-ai). The new `@google/genai` SDK is the [recommended replacement](https://ai.google.dev/gemini-api/docs/migrate) with active development.

**Scope:** Migrate only `TitanPipelineService.ts`. The other two files (`GeminiImageService.ts`, `GeminiLayoutService.ts`) keep the old SDK for now — both SDKs coexist.

**Key migration patterns:**

- `genAI.getGenerativeModel({...}).generateContent(parts)` → `ai.models.generateContent({ model, contents, config })`
- `result.response.text()` → `result.text`
- `{ fileData: { mimeType, fileUri } }` → `createPartFromUri(uri, mimeType)`
- `GoogleAIFileManager.uploadFile(buffer, opts)` → `ai.files.upload({ file: blob, config })`
- `fileManager.getFile(name)` → `ai.files.get({ name })`
- `generationConfig` → `config` (flattened into per-call config)
- `FileState` values unchanged: `PROCESSING`, `ACTIVE`, `FAILED`

### Fix 2: Neutralize Tailwind Preflight in Sandpack

**File:** `src/components/layout-builder/LayoutCanvas.tsx`

**Approach:** Inject a hidden Sandpack file (`/preflight-undo.ts`) that appends a `<style>` tag restoring browser defaults using CSS `revert` keyword. This runs AFTER the Tailwind CDN processes, so it overrides preflight via cascade order.

### Fix 3: Skip Architect Step for now (save Claude Opus cost + latency)

**File:** `src/services/TitanPipelineService.ts` — `runPipeline()`

**Approach:** Skip the Architect call but **preserve the function and prompt** for future use. Don't delete `buildStructure` or `ARCHITECT_PROMPT` — just bypass the call.

---

## Files Modified

| File                                             | Changes                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/services/TitanPipelineService.ts`           | Fix 1 (SDK migration + Agentic Vision + maxOutputTokens on Surveyor & Builder), Fix 3 (skip Architect) |
| `src/components/layout-builder/LayoutCanvas.tsx` | Fix 2 (neutralize Tailwind preflight via injected `/preflight-undo.ts`)                                |

## Verification

1. `npm run typecheck` — must pass
2. `npm run lint` — must pass
3. **Visual fidelity test** — upload a design with specific colors/shadows/gradients, verify the generated code uses exact CSS values
4. **Preflight test** — inspect the Sandpack preview's computed styles, verify no preflight resets are applied
5. **Live editor** — verify click-to-edit still works (data-id attributes present)
6. **Large design test** — upload a complex multi-section design, verify the output isn't truncated
