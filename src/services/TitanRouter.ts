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
- **PHOTOREALISM & TEXTURE DETECTION (CRITICAL):**
  If the user request mentions ANY specific material, texture, photographic element,
  or realistic visual effect, you MUST add a "generate_assets" task.
  Do not rely on a fixed keyword list. If it sounds like a visual texture or material, generate it.
  Examples: "wood", "glass", "marble", "fabric", "leather", "stone", "metal", "cloud",
  "iridescent sheen", "holographic card", "crumpled paper", "carbon fiber", "aqueous",
  "crystalline", or any other material/texture/visual reference.
- **REFERENCE IMAGE DETECTION (CRITICAL):**
  If the user uploads a file AND their request indicates they want to USE that image
  as part of the generated UI (not reverse-engineer it), you MUST:
  1. Add a "generate_assets" entry with "source": "reference_image"
  2. Do NOT put the file index in "measure_pixels" (it is not a UI screenshot)
  Detect this intent from phrases like: "using this photo", "with this image",
  "incorporate this picture", "use this as", "make a ... from this",
  "based on this photo", "put this image on", or any phrasing where the
  uploaded image is source material, not a design to replicate.
  If the intent is ambiguous (could be both), put the file in BOTH measure_pixels
  AND generate_assets with source: "reference_image".
- Name assets by their target: "button_bg" for buttons, "hero_bg" for hero sections,
  "card_bg" for cards.
- Example 1: User says "make the button look like polished wood" →
  generate_assets: [{ "name": "button_bg", "description": "polished oak wood with natural grain and warm lighting", "vibe": "photorealistic" }]
- Example 2: User uploads a photo and says "create a button using this photo" →
  measure_pixels: [], generate_assets: [{ "name": "button_bg", "description": "create a photorealistic button incorporating the uploaded photo", "vibe": "photorealistic", "source": "reference_image" }]
- Images that ARE UI screenshots -> measure_pixels. Images that ARE reference material for generation -> generate_assets with source: "reference_image". Videos -> extract_physics.

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
      { "name": "cloud_texture", "description": "fluffy white realistic cloud texture", "vibe": "photorealistic" },
      { "name": "button_bg", "description": "button using uploaded photo", "vibe": "photorealistic", "source": "reference_image" }
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
