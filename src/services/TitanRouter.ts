/**
 * Titan Router - Intent Traffic Controller
 *
 * Extracted from TitanPipelineService.ts
 * Analyzes user intent and decides execution strategy (CREATE/MERGE/EDIT).
 *
 * SDK: @google/genai (new SDK with agentic features)
 */

import { GoogleGenAI } from '@google/genai';
import type { PipelineInput, MergeStrategy } from '@/types/titanPipeline';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key missing');
  return key;
}

// ============================================================================
// ROUTER PROMPT
// ============================================================================

const ROUTER_PROMPT = `### Role
You are the **Pipeline Traffic Controller**.

### Rules
- If NO files, NO current_code, AND App Context has features -> mode: "GENERATE"
   (The user wants to auto-generate the full app layout from their concept.)
- If current_code exists and no new files -> mode: "EDIT"
- If new files uploaded -> mode: "CREATE" or "MERGE"
- **ASSET EXTRACTION (CRITICAL):**
  - Identify CUSTOM visuals that need to be EXTRACTED from the uploaded image.
  - Do NOT suggest generating new images from scratch (no "Photographer").
  - Use "generate_assets" ONLY for elements present in the input image that need cropping.
  - Set source: "reference_image" for these assets.
  - Example: "Extract the hero background texture from the image."

### Output Schema (JSON)
{
  "mode": "CREATE" | "MERGE" | "EDIT" | "GENERATE",
  "base_source": "codebase" | "file_0" | null,
  "file_roles": [],
  "execution_plan": {
    "measure_pixels": [0],
    "extract_physics": [],
    "preserve_existing_code": false,
    "generate_assets": [
      { "name": "hero_bg", "description": "Texture from top section", "source": "reference_image" }
    ]
  }
}`;

// ============================================================================
// ROUTER IMPLEMENTATION
// ============================================================================

export async function routeIntent(input: PipelineInput): Promise<MergeStrategy> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Build app context summary for the Router
  const appContextSummary = input.appContext
    ? `\n  App Context: ${JSON.stringify({
        name: input.appContext.name,
        layout: input.appContext.layout,
        features: input.appContext.coreFeatures?.map((f) => f.name) ?? [],
        needsAuth: input.appContext.needsAuth,
        roles: input.appContext.roles?.map((r) => r.name) ?? [],
      })}`
    : '';

  const prompt = `${ROUTER_PROMPT}

  User Request: "${input.instructions}"
  Files: ${input.files.length}
  Code Exists: ${!!input.currentCode}${appContextSummary}
  `;

  const result = await ai.models.generateContent({
    model: GEMINI_FLASH_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  const text = result.text ?? '';

  try {
    return JSON.parse(text);
  } catch {
    const hasFiles = input.files.length > 0;
    const isGenerate =
      !input.currentCode && !hasFiles && (input.appContext?.coreFeatures?.length ?? 0) > 0;

    console.warn('[TitanPipeline] Router returned invalid JSON, using fallback strategy');
    return {
      mode: isGenerate ? 'GENERATE' : input.currentCode ? 'EDIT' : 'CREATE',
      base_source: input.currentCode ? 'codebase' : null,
      file_roles: [],
      execution_plan: {
        measure_pixels: hasFiles ? [0] : [],
        extract_physics: [],
        preserve_existing_code: !!input.currentCode,
        generate_assets: [],
      },
    };
  }
}
