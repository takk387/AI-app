/**
 * Titan Pipeline Service (Full Agentic Stack)
 *
 * Orchestrator for:
 * - Router (Traffic Control)
 * - Surveyor (Vision Analysis via Python)
 * - Architect (Structure via Claude)
 * - Physicist (Animation Math)
 * - Photographer (Asset Generation)
 * - Builder (Code Synthesis)
 * - Live Editor (Refinement)
 */

import { GoogleGenAI, createPartFromUri } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import type { AppFile } from '@/types/railway';
import type {
  PipelineInput,
  MergeStrategy,
  VisualManifest,
  ComponentStructure,
  MotionPhysics,
  PipelineResult,
  LiveEditResult,
  FileInput,
} from '@/types/titanPipeline';
import { geminiImageService } from '@/services/GeminiImageService';

// ============================================================================
// CONFIGURATION (CONFIRMED 2026 SPECS)
// ============================================================================

const GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';
const GEMINI_PRO_MODEL = 'gemini-3-pro-preview';
const GEMINI_DEEP_THINK_MODEL = 'gemini-3-pro-preview';
const CLAUDE_OPUS_MODEL = 'claude-opus-4-5-20251101';

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key missing');
  return key;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic API key missing');
  return key;
}

// ============================================================================
// SHARED HELPER: FILE UPLOAD
// ============================================================================

async function uploadFileToGemini(apiKey: string, file: FileInput) {
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: file.mimeType });

  let uploadedFile = await ai.files.upload({
    file: blob,
    config: { displayName: file.filename, mimeType: file.mimeType },
  });

  while (uploadedFile.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    uploadedFile = await ai.files.get({ name: uploadedFile.name! });
  }

  if (uploadedFile.state === 'FAILED') throw new Error(`Upload failed: ${file.filename}`);
  return uploadedFile;
}

// ============================================================================
// STEP -1: UNIVERSAL ROUTER
// ============================================================================

const ROUTER_PROMPT = `### Role
You are the **Pipeline Traffic Controller**.

### Rules
- If current_code exists and no new files -> mode: "EDIT"
- If new files uploaded -> mode: "CREATE" or "MERGE"
- **PHOTOREALISM TRIGGER:** If user asks for "photorealistic", "texture", "realistic", "wood",
  "glass", "cloud", "grain", "stone", "metal", "fabric", "leather", "marble", "material",
  or specific materials, you MUST add a "generate_assets" task.
- Name assets by their target: "button_bg" for buttons, "hero_bg" for hero sections,
  "card_bg" for cards.
- Example: User says "make the button look like polished wood" →
  generate_assets: [{ "name": "button_bg", "description": "polished oak wood with natural grain and warm lighting", "vibe": "photorealistic" }]
- Images -> measure_pixels. Videos -> extract_physics.

### Output Schema (JSON)
{
  "mode": "CREATE" | "MERGE" | "EDIT",
  "base_source": "codebase" | "file_0" | null,
  "file_roles": [],
  "execution_plan": {
    "measure_pixels": [0],
    "extract_physics": [],
    "preserve_existing_code": false,
    "generate_assets": [
      { "name": "cloud_texture", "description": "fluffy white realistic cloud texture", "vibe": "photorealistic" }
    ]
  }
}`;

export async function routeIntent(input: PipelineInput): Promise<MergeStrategy> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `${ROUTER_PROMPT}

  User Request: "${input.instructions}"
  Files: ${input.files.length}
  Code Exists: ${!!input.currentCode}
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
    return {
      mode: input.currentCode ? 'EDIT' : 'CREATE',
      base_source: input.currentCode ? 'codebase' : null,
      file_roles: [],
      execution_plan: {
        measure_pixels: [],
        extract_physics: [],
        preserve_existing_code: false,
      },
    };
  }
}

// ============================================================================
// STEP 0: SURVEYOR (Visual Reverse Engineering)
// ============================================================================

const SURVEYOR_PROMPT = `### Role
You are the **UI Reverse Engineer**.

### Task
Analyze the image and reconstruct the **exact DOM Component Tree**.
1. **Structure:** Identify Flex Rows vs Columns. Group elements logically (e.g., "Card", "Navbar").
2. **Styles:** Extract hex codes, border-radius, shadows, and font-weights.
3. **Content:** You MUST extract the text inside buttons, headings, and paragraphs.
4. **Icons:** Detect and extract all icons, logos, and symbolic graphics.
   - Prefer extracting the SVG 'd' path if clear.
   - Fallback to closest Lucide React icon name.
   - Measure icon color.
5. **Advanced Effects (CRITICAL for visual fidelity):**
   - Gradients: Extract full CSS gradient syntax (type, angle, color stops with %)
   - Glassmorphism: backdrop-filter blur, background opacity
   - Transforms: rotation, scale, skew
   - Filters: blur, brightness, saturation
   - Clip-path: shaped elements (circular avatars, angled sections)
   - Animations: describe any visible motion
   - For ANY CSS property visible in the design, include it in the styles object
6. **Interactive States:**
   - For buttons, links, and interactive cards: infer likely hover/active/focus states
     based on the visual design (shadow changes, color shifts, scale effects).
   - Include an "interactionStates" field on the element node (sibling to "styles"):
     "interactionStates": { "hover": { ...css }, "active": { ...css }, "focus": { ...css } }
7. **Icon & Logo Containers:**
   - If an icon/logo sits inside a visible container (circle, badge, rounded rect),
     include the container as a parent node with its own styles.
   - Extract spacing between icon and adjacent text.

### Critical Instruction
Do NOT just list bounding boxes. Output a recursive JSON tree.
If an element contains text, use the "text" field.

### Output Schema (Strict JSON)
{
  "canvas": { "width": number, "height": number, "background": string },
  "dom_tree": {
    "type": "div" | "button" | "p" | "img" | "h1" | "svg" | "span",
    "id": "main_container",
    "styles": {
      "display": "flex",
      "flexDirection": "column",
      "backgroundColor": "#ffffff",
      "backgroundImage": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "borderRadius": "8px",
      "boxShadow": "0 4px 6px rgba(0,0,0,0.1)",
      "backdropFilter": "blur(12px)",
      "filter": "brightness(1.1)",
      "opacity": "0.9",
      "transform": "rotate(3deg)",
      "clipPath": "polygon(...)",
      "transition": "all 0.3s ease",
      "fontFamily": "Inter",
      "fontSize": "16px",
      "fontWeight": "600",
      "letterSpacing": "0.05em",
      "lineHeight": "1.5",
      "textShadow": "0 2px 4px rgba(0,0,0,0.3)"
    },
    "interactionStates": {
      "hover": { "boxShadow": "0 8px 16px rgba(0,0,0,0.15)", "transform": "translateY(-1px)" },
      "active": { "transform": "scale(0.98)" },
      "focus": { "outline": "2px solid #3b82f6", "outlineOffset": "2px" }
    },
    "text": "Click Me",
    "hasIcon": boolean,
    "iconSvgPath": "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    "iconViewBox": "0 0 24 24",
    "iconName": "Layers",
    "iconColor": "#000000",
    "iconPosition": "left",
    "iconSize": "md",
    "children": [
      // Recursive nodes...
    ]
  },
  "assets_needed": []
}`;

export async function surveyLayout(file: FileInput, fileIndex: number): Promise<VisualManifest> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const fileState = await uploadFileToGemini(apiKey, file);

  // Enable Agentic Vision: code execution activates Think→Act→Observe loop
  // for precise CSS extraction (zoom, crop, annotate capabilities)
  const result = await ai.models.generateContent({
    model: GEMINI_FLASH_MODEL,
    contents: [createPartFromUri(fileState.uri!, fileState.mimeType!), { text: SURVEYOR_PROMPT }],
    config: {
      tools: [{ codeExecution: {} }],
      maxOutputTokens: 65536,
    },
  });

  try {
    const text = result.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const data = JSON.parse(jsonMatch[0]);

    return {
      file_index: fileIndex,
      originalImageRef: { fileUri: fileState.uri!, mimeType: fileState.mimeType! },
      canvas: data.canvas,
      global_theme: { dom_tree: data.dom_tree, assets: data.assets_needed },
      measured_components: [],
    };
  } catch (e) {
    console.error('Surveyor Failed:', e);
    return {
      file_index: fileIndex,
      measured_components: [],
      canvas: { width: 1440, height: 900 },
      global_theme: {},
    };
  }
}

// ============================================================================
// STEP 1: ARCHITECT (Structure)
// ============================================================================

const ARCHITECT_PROMPT = `### Role
You are the **Architect**. Convert visual manifests into a component structure tree.

### Rules
1. If 'dom_tree' is provided in manifests, USE IT AS-IS. Do not simplify or restructure.
2. PRESERVE every style property from the Surveyor's output — do not drop any CSS values.
3. Add data-id attributes to every element for the inspector system.
4. Use semantic HTML tags (nav, header, main, section, article, button, footer).
5. Preserve ALL nested elements — do not flatten or merge nodes.
6. Keep any interactionStates objects intact for the Builder to use.

### Output Schema (JSON)
{
  "tree": [{ "type": "div", "data_id": "root", "styles": {}, "children": [] }],
  "layout_strategy": "flex" | "grid"
}`;

export async function buildStructure(
  manifests: VisualManifest[],
  strategy: MergeStrategy,
  instructions: string
): Promise<ComponentStructure> {
  const apiKey = getAnthropicApiKey();
  const anthropic = new Anthropic({ apiKey });

  const msg = await anthropic.messages.create({
    model: CLAUDE_OPUS_MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `${ARCHITECT_PROMPT}\nInstructions: ${instructions}\nManifests: ${JSON.stringify(manifests)}`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { tree: [], layout_strategy: 'flex' };
  } catch {
    return { tree: [], layout_strategy: 'flex' };
  }
}

// ============================================================================
// STEP 2: PHYSICIST (Motion)
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
    const up = await uploadFileToGemini(apiKey, f);
    parts.push(createPartFromUri(up.uri!, up.mimeType!));
  }

  const result = await ai.models.generateContent({
    model: GEMINI_DEEP_THINK_MODEL,
    contents: parts,
  });
  try {
    const jsonMatch = (result.text ?? '').match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { component_motions: [] };
  } catch {
    return { component_motions: [] };
  }
}

// ============================================================================
// STEP 4: BUILDER (Code Synthesis)
// ============================================================================

const BUILDER_PROMPT = `### Role
You are the **Universal Builder**. Write the final React code.

### Instructions
1. **Use the Assets (Priority #1):**
   - Assets maps names to URLs: {"button_bg": "https://...", "hero_bg": "https://..."}
   - Match names to elements: "button_bg" -> apply to buttons, "hero_bg" -> hero section, "card_bg" -> cards.
   - Apply via: style={{ backgroundImage: \`url(\${assetUrl})\`, backgroundSize: 'cover', backgroundPosition: 'center' }}
   - Do NOT set backgroundColor when a background image is active.
   - Do NOT use CSS gradients if an image asset is available.

2. **DATA-ID ATTRIBUTES (MANDATORY — DO NOT SKIP):**
   - You MUST add a unique data-id attribute to EVERY HTML element you generate.
   - Format: data-id="descriptive_name" (e.g., "hero_section", "nav_logo", "cta_button")
   - This is REQUIRED for the visual inspector. Without data-id, the editor breaks.
   - Every div, button, p, h1, span, img, nav, section, footer MUST have data-id.

3. **REPLICATION MODE (CRITICAL):**
   - If the Manifests contain a 'dom_tree', you MUST recursively build that exact structure.
   - Map 'type' to HTML tags. Apply styles with EXACT values from the manifest — do not approximate.
   - **Style application strategy:**
     - Use inline style={{}} with the exact CSS values from the manifest for all visual properties.
     - Use Tailwind only for structural layout (flex, grid, display, positioning).
     - Use CSS classes in styles.css for anything that needs selectors (hover, focus, active,
       transitions, @keyframes, pseudo-elements).
   - NEVER replace an exact value with a "close enough" Tailwind utility class.
   - If the manifest says boxShadow: "0 8px 32px rgba(0,0,0,0.15)", use that exact value.
   - Pixel-perfect accuracy is the goal.

4. **Icons (Rendering):**
   - **Priority 1:** If \`iconSvgPath\` exists -> render inline \`<svg>\` with the path data, applying \`iconColor\` as stroke/fill and \`iconViewBox\`.
   - **Priority 2:** If only \`iconName\` exists -> import from \`lucide-react\` and render \`<IconName />\`.
   - Apply positioning via flex layout.
   - Map sizes: sm=16px, md=20px, lg=24px.
   - If \`iconContainerStyle\` exists -> wrap icon in a styled container div.
   - Available Lucide icons: Home, User, Menu, Search, Settings, Star, Heart, Check, Plus, ArrowRight, etc.

5. **Physics:** Implement the physics using Framer Motion.

6. **Shaped & Textured Elements (CRITICAL for photorealism):**
   - When the user asks for an element that "looks like" a real object (cloud, stone, wood, etc.),
     create BOTH the shape AND the texture:
     a) **Shape:** Use CSS clip-path, SVG clipPath, or creative border-radius to form the silhouette.
        Examples: cloud -> clip-path with rounded bumps, leaf -> custom polygon, stone -> irregular rounded.
     b) **Texture:** If an asset URL exists, apply it as backgroundImage with backgroundSize: cover.
        If no asset, use CSS gradients, box-shadows, and filters to approximate the material.
     c) **Depth:** Add box-shadow, inner highlights, and subtle gradients for 3D realism.
     d) **Interactivity:** The element must still function (clickable, hover states).
   - Example: "photorealistic cloud button" ->
     clip-path: path('M25,60 a20,20 0,0,1 0,-40 a20,20 0,0,1 35,0 a20,20 0,0,1 0,40 z');
     backgroundImage: url(cloud_texture.png); backgroundSize: cover;
     box-shadow for depth; filter: drop-shadow for floating effect.
   - Do NOT just set a backgroundColor. Use real CSS shape techniques.

7. **ORIGINAL DESIGN REFERENCE (CRITICAL):**
   - You may receive an original design image alongside these instructions.
   - If provided, use it as the GROUND TRUTH for visual accuracy.
   - Match exact colors, gradients, spacing, typography, and element positioning.
   - Pay special attention to: logos (recreate as inline SVG), icons (extract exact paths),
     custom button styles, background patterns, and gradient directions.
   - For logos/icons you cannot extract as SVG: describe them in a comment and use the
     closest visual approximation with CSS shapes and colors.
   - The manifests provide structured data, but the image is the ultimate reference.

8. **Interaction States (REQUIRED for buttons and links):**
   - For every button and interactive element, implement hover, active, and focus states.
   - If the manifest includes "interactionStates", use those exact values in styles.css.
   - If no explicit states are provided, derive natural transitions from the default styles
     (e.g., subtle shadow increase on hover, slight scale on active, ring on focus).
   - Define these as CSS classes in styles.css and apply them in App.tsx.

### Output Format
Return TWO files separated by markers:

--- FILE: App.tsx ---
[Full App.tsx code with import './styles.css' at the top]

--- FILE: styles.css ---
[@keyframes, CSS custom properties, complex hover/focus selectors. Leave empty if not needed.]

Rules:
- App.tsx MUST include: import './styles.css';
- Use CSS classes from styles.css for animations, complex hover effects, and pseudo-selectors.
- Use inline styles for simple properties (colors, spacing, sizing).
- No markdown fences. Just the raw code.`;

export async function assembleCode(
  _structure: ComponentStructure | null,
  manifests: VisualManifest[],
  physics: MotionPhysics | null,
  _strategy: MergeStrategy,
  _currentCode: string | null,
  instructions: string,
  assets: Record<string, string>,
  originalImageRef?: { fileUri: string; mimeType: string }
): Promise<AppFile[]> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const hasAssets = Object.keys(assets).length > 0;
  const assetContext = hasAssets
    ? `\n\n### ASSET CONTEXT
These texture/material images were generated for the user's request:
${Object.entries(assets)
  .map(([name, url]) => `- "${name}" → ${url}`)
  .join('\n')}
Apply them via backgroundImage on the matching elements. Combine with clip-path for shaped elements.`
    : '';

  const prompt = `${BUILDER_PROMPT}

  ### ASSETS (Use these URLs!)
  ${JSON.stringify(assets, null, 2)}
  ${assetContext}

  ### INSTRUCTIONS
  ${instructions}

  ### MANIFESTS (Look for dom_tree)
  ${JSON.stringify(manifests, null, 2)}

  ### PHYSICS
  ${JSON.stringify(physics)}
  `;

  // Build multimodal content: original image (if available) + text prompt
  const contentParts: any[] = [];
  if (originalImageRef) {
    contentParts.push(createPartFromUri(originalImageRef.fileUri, originalImageRef.mimeType));
  }
  contentParts.push({ text: prompt });

  const result = await ai.models.generateContent({
    model: GEMINI_PRO_MODEL,
    contents: contentParts,
    config: { maxOutputTokens: 65536 },
  });
  const responseText = (result.text ?? '')
    .replace(/^```(?:tsx?|jsx?|typescript|javascript|css)?\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();

  // Parse multi-file output (App.tsx + optional styles.css)
  const appMatch = responseText.match(
    /---\s*FILE:\s*App\.tsx\s*---\s*\n([\s\S]*?)(?=---\s*FILE:|$)/
  );
  const cssMatch = responseText.match(/---\s*FILE:\s*styles\.css\s*---\s*\n([\s\S]*?)$/);

  const files: AppFile[] = [];

  // App.tsx: use parsed content, or entire response as fallback (backward compat)
  files.push({
    path: '/src/App.tsx',
    content: appMatch ? appMatch[1].trim() : responseText,
  });

  // styles.css: always include (App.tsx imports it; missing file breaks Sandpack)
  files.push({
    path: '/src/styles.css',
    content: cssMatch && cssMatch[1].trim() ? cssMatch[1].trim() : '/* Generated styles */',
  });

  // index.tsx: always include
  files.push({
    path: '/src/index.tsx',
    content: `import './preflight-undo';\nimport React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './inspector';\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<React.StrictMode><App /></React.StrictMode>);`,
  });

  return files;
}

// ============================================================================
// STEP 5: LIVE EDITOR (RESTORED)
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
// MAIN ORCHESTRATOR
// ============================================================================

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const warnings: string[] = [];
  const stepTimings: Record<string, number> = {};

  const routeStart = Date.now();
  const strategy = await routeIntent(input);
  stepTimings.router = Date.now() - routeStart;

  const manifests: VisualManifest[] = [];
  let physics: MotionPhysics | null = null;
  const generatedAssets: Record<string, string> = {};

  await Promise.all([
    // Surveyor
    (async () => {
      if (strategy.execution_plan.measure_pixels.length && input.files.length > 0) {
        manifests.push(await surveyLayout(input.files[0], 0));
      }
    })(),
    // Physicist
    (async () => {
      if (strategy.execution_plan.extract_physics.length) {
        const videoFiles = input.files.filter((f) => f.mimeType.startsWith('video'));
        physics = await extractPhysics(videoFiles, strategy);
      }
    })(),
    // Photographer
    (async () => {
      if (strategy.execution_plan.generate_assets) {
        for (const asset of strategy.execution_plan.generate_assets) {
          try {
            const result = await geminiImageService.generateBackgroundFromReference({
              vibe: asset.vibe || 'photorealistic',
              vibeKeywords: [asset.description],
              referenceImage: input.files.length > 0 ? input.files[0].base64 : '',
              targetElement: asset.name.includes('button')
                ? 'button'
                : asset.name.includes('hero')
                  ? 'hero section'
                  : asset.name.includes('card')
                    ? 'card'
                    : 'background',
            });
            if (result.imageUrl) generatedAssets[asset.name] = result.imageUrl;
          } catch (e) {
            console.error('Asset generation failed', e);
          }
        }
      }
    })(),
  ]);

  // Architect step bypassed — its output was not consumed by assembleCode.
  // buildStructure() and ARCHITECT_PROMPT are preserved for future integration.
  const structure = null;
  stepTimings.architect = 0;

  const buildStart = Date.now();
  const primaryImageRef = manifests[0]?.originalImageRef;
  const files = await assembleCode(
    structure,
    manifests,
    physics,
    strategy,
    input.currentCode,
    input.instructions,
    generatedAssets,
    primaryImageRef
  );
  stepTimings.builder = Date.now() - buildStart;

  return { files, strategy, manifests, physics, warnings, stepTimings };
}

// ============================================================================
// SINGLETON ACCESSOR (RESTORED)
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
