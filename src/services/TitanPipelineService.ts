/**
 * Titan Pipeline Service (Full Agentic Stack)
 *
 * Orchestrator for:
 * - Router (Traffic Control) → TitanRouter.ts
 * - Surveyor (Vision Analysis) → TitanSurveyor.ts
 * - Architect (Structure via Claude) — bypassed, preserved here
 * - Physicist (Animation Math) — bypassed, preserved here
 * - Photographer (Asset Generation) — inline, uses GeminiImageService
 * - Builder (Code Synthesis) → TitanBuilder.ts
 * - Healing Loop (Self-healing) → TitanHealingLoop.ts
 * - Live Editor (Refinement) — preserved here (lightweight)
 */

import { GoogleGenAI, createPartFromUri } from '@google/genai';
import type {
  PipelineInput,
  MergeStrategy,
  VisualManifest,
  ComponentStructure,
  MotionPhysics,
  PipelineResult,
  LiveEditResult,
  FileInput,
  CanvasConfig,
} from '@/types/titanPipeline';
import { getAssetExtractionService } from './AssetExtractionService';

// Import from split modules
import { routeIntent as _routeIntent } from './TitanRouter';
import {
  surveyLayout as _surveyLayout,
  uploadFileToGemini as _uploadFileToGemini,
  enhanceImageQuality,
  extractImageMetadata,
  buildCanvasConfig,
} from './TitanSurveyor';
import { assembleCode as _assembleCode } from './TitanBuilder';
import {
  runHealingLoop,
  captureRenderedScreenshot as _captureRenderedScreenshot,
  extractJSXMarkup as _extractJSXMarkup,
} from './TitanHealingLoop';

// Re-export from split modules for backward compatibility
export const routeIntent = _routeIntent;
export const surveyLayout = _surveyLayout;
export const uploadFileToGemini = _uploadFileToGemini;
export const assembleCode = _assembleCode;
export const captureRenderedScreenshot = _captureRenderedScreenshot;
export const extractJSXMarkup = _extractJSXMarkup;

// ============================================================================
// CONFIGURATION (CONFIRMED 2026 SPECS)
// ============================================================================

const GEMINI_PRO_MODEL = 'gemini-3-pro-preview';
const GEMINI_DEEP_THINK_MODEL = 'gemini-3-pro-preview';

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key missing');
  return key;
}

// ============================================================================
// STEP 1: ARCHITECT (Structure) — BYPASSED, preserved for future integration
// ============================================================================

// ============================================================================
// STEP 1: ARCHITECT (Structure) — REMOVED (Builder handles structure)
// ============================================================================

// Architect service removed. Builder now handles structure generation directly.

// ============================================================================
// STEP 2: PHYSICIST (Motion) — BYPASSED, preserved for future integration
// ============================================================================

const PHYSICIST_PROMPT = `### Role
You are the **Physicist**. Analyze the video. Extract spring physics, gravity, and timing.
Return JSON: { "component_motions": [] }`;

export async function extractPhysics(
  files: FileInput[],
  _strategy?: MergeStrategy
): Promise<MotionPhysics> {
  if (files.length === 0) return { component_motions: [] };

  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [{ text: PHYSICIST_PROMPT }];
  for (const f of files) {
    const up = await _uploadFileToGemini(apiKey, f);
    parts.push(createPartFromUri(up.uri!, up.mimeType!));
  }

  const result = await ai.models.generateContent({
    model: GEMINI_DEEP_THINK_MODEL,
    contents: parts,
  });
  try {
    const jsonMatch = (result.text ?? '').match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { component_motions: [] };
  } catch (error) {
    console.warn('[TitanPipeline] Physicist JSON parse failed:', error);
    return { component_motions: [] };
  }
}

// ============================================================================
// STEP 5: LIVE EDITOR
// ============================================================================

const LIVE_EDITOR_PROMPT = `### Role
You are a **Live Code Editor**.

### Input
1. **Current Code:** The full component file.
2. **Selected Element:** The data-id of the element the user selected.
3. **Instruction:** What the user wants to change.

### Task
Return the COMPLETE updated component file with the requested changes applied.
* Preserve all existing logic, event handlers, and imports.
* Only modify the parts related to the user's instruction.
* If the user says "Make this blue", only change the relevant className/style.
* If the user says "Add a button", add it in the appropriate location.
* Keep all data-id attributes intact.

### Output
Return ONLY the updated code. No markdown fences, no explanations.`;

export async function liveEdit(
  currentCode: string,
  selectedDataId: string,
  instruction: string
): Promise<LiveEditResult> {
  try {
    const apiKey = getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `${LIVE_EDITOR_PROMPT}

### Current Code
\`\`\`tsx
${currentCode}
\`\`\`

### Selected Element
data-id="${selectedDataId}"

### Instruction
"${instruction}"`;

    const result = await ai.models.generateContent({
      model: GEMINI_PRO_MODEL,
      contents: prompt,
      config: { temperature: 0.2, maxOutputTokens: 16384 },
    });
    let updatedCode = result.text ?? currentCode;

    updatedCode = updatedCode
      .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();

    return { updatedCode, success: true };
  } catch (error) {
    return {
      updatedCode: currentCode,
      success: false,
      error: error instanceof Error ? error.message : 'Live edit failed',
    };
  }
}

// ============================================================================
// STEP 0.5: ASSET EXTRACTOR (Crop custom visuals from original image)
// Only used for EDIT/MERGE modes — CREATE mode skips extraction entirely.
// ============================================================================

/**
 * Walk manifest dom_tree, find nodes flagged for extraction, crop them from
 * the original image in parallel, and return a map of node ID → public URL.
 */
async function extractCustomVisualAssets(
  manifests: VisualManifest[],
  originalImageBase64: string
): Promise<Record<string, string>> {
  const extractionService = getAssetExtractionService();
  const extractedAssets: Record<string, string> = {};
  const tasks: Promise<void>[] = [];

  // Diagnostic counters
  let customVisualCount = 0;
  let iconNameCount = 0;
  let iconSvgPathCount = 0;

  function walkTree(node: Record<string, unknown>) {
    // Track icon detection patterns
    if (node.iconName) iconNameCount++;
    if (node.iconSvgPath || node.svgPath) iconSvgPathCount++;

    if (node.hasCustomVisual === true && node.extractionAction === 'crop') {
      customVisualCount++;
      if (!node.extractionBounds || typeof node.id !== 'string') {
        console.warn(`[TitanPipeline] Node flagged for extraction but missing bounds or id:`, {
          id: node.id,
          hasCustomVisual: node.hasCustomVisual,
          hasBounds: !!node.extractionBounds,
        });
      } else {
        const bounds = node.extractionBounds as {
          top: number;
          left: number;
          width: number;
          height: number;
        };
        const nodeId = node.id as string;

        tasks.push(
          extractionService
            .extractAsset({
              originalImage: originalImageBase64,
              bounds,
              targetElement: nodeId,
            })
            .then((result) => {
              if (result.success) {
                extractedAssets[nodeId] = result.url;
                console.log(`[AssetExtraction] Extracted: ${nodeId} → ${result.url}`);
              } else {
                console.warn(`[AssetExtraction] Failed for ${nodeId}: ${result.error}`);
              }
            })
            .catch((e) => {
              console.error(`[AssetExtraction] Error extracting ${nodeId}:`, e);
            })
        );
      }
    }

    const children = node.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === 'object') {
          walkTree(child);
        }
      }
    }
  }

  for (const manifest of manifests) {
    if (manifest.global_theme?.dom_tree) {
      walkTree(manifest.global_theme.dom_tree as unknown as Record<string, unknown>);
    }
  }

  // Log diagnostic summary
  console.log(`[TitanPipeline] Icon detection summary:`, {
    hasCustomVisual: customVisualCount,
    iconName: iconNameCount,
    iconSvgPath: iconSvgPathCount,
    note:
      iconNameCount > customVisualCount
        ? '⚠️ More iconName than hasCustomVisual — Surveyor may be using Lucide fallbacks'
        : '✅ Custom visual extraction preferred',
  });

  await Promise.all(tasks);

  // Restore fallback iconName on nodes where extraction failed
  function restoreFallbacks(node: Record<string, unknown>) {
    const nodeId = node.id as string | undefined;
    if (
      node.hasCustomVisual === true &&
      nodeId &&
      !extractedAssets[nodeId] &&
      node._originalIconName
    ) {
      node.iconName = node._originalIconName;
      delete node._originalIconName;
      console.warn(
        `[AssetExtraction] Restoring fallback iconName "${node.iconName}" for ${nodeId}`
      );
    }
    const children = node.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (child && typeof child === 'object') {
          restoreFallbacks(child);
        }
      }
    }
  }

  for (const manifest of manifests) {
    if (manifest.global_theme?.dom_tree) {
      restoreFallbacks(manifest.global_theme.dom_tree as unknown as Record<string, unknown>);
    }
  }

  return extractedAssets;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const warnings: string[] = [];
  const stepTimings: Record<string, number> = {};

  const routeStart = Date.now();
  const strategy = await _routeIntent(input);
  stepTimings.router = Date.now() - routeStart;
  console.log(
    '[TitanPipeline] Router strategy:',
    JSON.stringify({
      mode: strategy.mode,
      measure_pixels: strategy.execution_plan.measure_pixels,
      generate_assets: strategy.execution_plan.generate_assets?.length ?? 0,
      hasFiles: input.files.length,
    })
  );

  // GENERATE MODE: skip all vision steps, go straight to Builder with concept data
  if (strategy.mode === 'GENERATE') {
    console.log('[TitanPipeline] GENERATE mode — building full layout from concept');
    const buildStart = Date.now();
    const files = await _assembleCode(
      null, // no structure
      [], // no manifests
      null, // no physics
      strategy,
      null, // no existing code
      input.instructions,
      {}, // no assets
      undefined,
      undefined,
      input.appContext
    );
    stepTimings.builder = Date.now() - buildStart;
    return { files, strategy, manifests: [], physics: null, warnings, stepTimings };
  }

  const manifests: VisualManifest[] = [];
  let physics: MotionPhysics | null = null;
  const generatedAssets: Record<string, string> = {};

  // Extract ACTUAL image dimensions BEFORE any processing (upscaling, etc.)
  // This is the single source of truth for canvas sizing throughout the pipeline
  let canvasConfig: CanvasConfig | undefined;
  if (input.files.length > 0) {
    const metadata = await extractImageMetadata(input.files[0]);
    canvasConfig = buildCanvasConfig(metadata);
    console.log(
      `[TitanPipeline] Canvas config: ${canvasConfig.width}x${canvasConfig.height} (${canvasConfig.source})`
    );
  }

  await Promise.all([
    // Surveyor — also runs for reference images so Builder has structural context
    (async () => {
      const shouldSurvey =
        strategy.execution_plan.measure_pixels.length > 0 ||
        strategy.execution_plan.generate_assets?.some(
          (a: { source?: string }) => a.source === 'reference_image'
        );

      if (shouldSurvey && input.files.length > 0) {
        // Enhance image quality before analysis (upscale + sharpen for crisp replications)
        const enhancedFile = await enhanceImageQuality(input.files[0]);
        // Enable autoFixIconDecisions for ALL modes to ensure custom visuals are flagged
        const skipAutoFix = false;
        manifests.push(await _surveyLayout(enhancedFile, 0, canvasConfig, skipAutoFix));
      }
    })(),
    // Physicist
    (async () => {
      if (strategy.execution_plan.extract_physics.length) {
        const videoFiles = input.files.filter((f) => f.mimeType.startsWith('video'));
        physics = await extractPhysics(videoFiles, strategy);
      }
    })(),
    // Photographer — REMOVED (Asset generation deprecated)
    (async () => {
      // Logic removed. Pipeline no longer generates assets from scratch.
    })(),
  ]);

  // Warn if Surveyor ran but couldn't extract DOM structure
  if (manifests.length > 0 && !manifests[0]?.global_theme?.dom_tree) {
    warnings.push(
      'Surveyor could not extract DOM structure — Builder will work from image reference only'
    );
  }

  // Architect step bypassed — its output was not consumed by assembleCode.
  // buildStructure() and ARCHITECT_PROMPT are preserved for future integration.
  const structure = null;
  stepTimings.architect = 0;

  // Asset Extraction: crop custom visuals from original image
  // ENABLED for CREATE mode to support "Exact Replica" fidelity
  const extractStart = Date.now();
  let extractedAssets: Record<string, string> = {};
  if (input.files.length > 0 && manifests.length > 0) {
    try {
      extractedAssets = await extractCustomVisualAssets(manifests, input.files[0].base64);
      if (Object.keys(extractedAssets).length > 0) {
        console.log(
          `[TitanPipeline] Extracted ${Object.keys(extractedAssets).length} custom visual assets`
        );
      }
    } catch (e) {
      console.error(
        '[TitanPipeline] Asset extraction failed, continuing with generated assets:',
        e
      );
    }
  }
  stepTimings.extraction = Date.now() - extractStart;

  // Merge assets
  const finalAssets = { ...generatedAssets, ...extractedAssets };

  const buildStart = Date.now();
  const primaryImageRef = manifests[0]?.originalImageRef;
  let files = await _assembleCode(
    structure,
    manifests,
    physics,
    strategy,
    input.currentCode,
    input.instructions,
    finalAssets,
    primaryImageRef,
    undefined, // healingContext — only used by healing loop
    input.appContext
  );
  stepTimings.builder = Date.now() - buildStart;

  // HEALING LOOP: Compare rendered output vs original and apply fixes iteratively
  if (input.files.length > 0 && manifests.length > 0 && manifests[0]?.global_theme?.dom_tree) {
    console.log('[TitanPipeline] Starting healing loop (up to 3 iterations)...');

    const healResult = await runHealingLoop({
      files,
      manifests,
      physics,
      strategy,
      structure,
      input,
      finalAssets,
      primaryImageRef,
      canvasConfig,
      maxIterations: 3,
      targetFidelity: 95,
    });

    files = healResult.files;
    warnings.push(...healResult.warnings);
    stepTimings.healing = healResult.timingMs;
  }

  return { files, strategy, manifests, physics, warnings, stepTimings };
}

// ============================================================================
// SINGLETON ACCESSOR
// ============================================================================

let _instance: TitanPipelineServiceInstance | null = null;

class TitanPipelineServiceInstance {
  async runPipeline(input: PipelineInput): Promise<PipelineResult> {
    return runPipeline(input);
  }

  async liveEdit(
    currentCode: string,
    selectedDataId: string,
    instruction: string
  ): Promise<LiveEditResult> {
    return liveEdit(currentCode, selectedDataId, instruction);
  }
}

export function getTitanPipelineService(): TitanPipelineServiceInstance {
  if (!_instance) {
    _instance = new TitanPipelineServiceInstance();
  }
  return _instance;
}
