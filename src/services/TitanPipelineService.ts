/**
 * Titan Pipeline Service
 *
 * Server-side orchestrator for the Universal Visual Editor.
 * Implements 6 AI agents that transform user inputs into production code:
 *
 *   Step -1: Universal Router (Gemini Flash) → MergeStrategy
 *   Step 0:  Surveyor (Gemini Flash + Code Execution) → VisualManifest[]
 *   Step 1:  Universal Architect (Claude Opus) → ComponentStructure
 *   Step 2:  Sniper Physicist (Gemini Deep Think) → MotionPhysics
 *   Step 4:  Universal Builder (Gemini Pro) → AppFile[]
 *   Step 5:  Live Editor (Gemini Pro) → updated code snippet
 *
 * The orchestrator (runPipeline) activates steps based on the Router's
 * execution_plan — skipping unnecessary steps for the input type.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
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
// CONFIGURATION
// ============================================================================

const GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';
const GEMINI_PRO_MODEL = 'gemini-3-pro-preview';
const GEMINI_DEEP_THINK_MODEL = 'gemini-3-pro-preview';
const CLAUDE_OPUS_MODEL = 'claude-opus-4-5-20251101';

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY.');
  return key;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY.');
  return key;
}

// ============================================================================
// SHARED HELPER: FILE UPLOAD
// ============================================================================

/**
 * Upload a file (image or video) to the Gemini File API and wait until active.
 * Used by both the Surveyor (images) and the Physicist (videos).
 */
async function uploadFileToGemini(apiKey: string, file: FileInput) {
  const fileManager = new GoogleAIFileManager(apiKey);
  const base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
  const buffer = Buffer.from(base64Data, 'base64');

  const uploadResult = await fileManager.uploadFile(buffer, {
    mimeType: file.mimeType,
    displayName: file.filename,
  });

  let fileState = uploadResult.file;
  while (fileState.state === 'PROCESSING') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    fileState = await fileManager.getFile(fileState.name);
  }

  if (fileState.state === 'FAILED') {
    throw new Error(`File upload failed for ${file.filename}`);
  }

  return fileState;
}

// ============================================================================
// STEP -1: UNIVERSAL ROUTER
// ============================================================================

const ROUTER_PROMPT = `### Role
You are the **Pipeline Traffic Controller**.

### Inputs
1. \`files\`: List of [filename, mime_type] for uploaded files.
2. \`current_code\`: Boolean indicating if existing code is present.
3. \`user_prompt\`: The user's instructions.

### Task
Analyze the user's intent and assign a **Role** to every input file.
Determine if we are **Creating New**, **Merging**, or **Editing**.

### Rules
- If current_code is true and no new files: mode = "EDIT"
- If current_code is true and new files exist: mode = "EDIT" (inject new content into existing)
- If multiple files with different content: mode = "MERGE"
- If single file or text only: mode = "CREATE"
- **PHOTOREALISM RULE:** If user asks for "photorealistic", "texture", "realistic", "wood", "glass", "cloud", or specific materials (wood, glass, cloud), you MUST add them to "generate_assets".
- Images go to measure_pixels, Videos go to extract_physics
- Assign roles: layout_source, style_source, component_source, motion_source
- applies_to should be ["global"] unless the user specifies specific components

### Output Schema (strict JSON, no markdown)
{
  "mode": "CREATE" | "MERGE" | "EDIT",
  "base_source": "codebase" | "file_0" | null,
  "file_roles": [
    {
      "file_index": 0,
      "role": "layout_source" | "style_source" | "component_source" | "motion_source",
      "applies_to": ["global"] or ["navbar", "hero", "button"]
    }
  ],
  "execution_plan": {
    "measure_pixels": [0, 1],
    "extract_physics": [2],
    "preserve_existing_code": true,
    "generate_assets": [
      { "name": "cloud_texture", "description": "fluffy white realistic cloud texture", "vibe": "photorealistic" }
    ]
  }
}`;

export async function routeIntent(input: PipelineInput): Promise<MergeStrategy> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_FLASH_MODEL,
    generationConfig: { temperature: 0.0, responseMimeType: 'application/json' },
  });

  const filesDescription = input.files
    .map((f, i) => `[${i}] ${f.filename} (${f.mimeType})`)
    .join('\n');

  const prompt = `${ROUTER_PROMPT}

### Current Input
files:
${filesDescription || '(no files uploaded)'}

current_code: ${input.currentCode ? 'true' : 'false'}

user_prompt: "${input.instructions}"`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const strategy: MergeStrategy = JSON.parse(text);

    // Validate and normalize
    if (!['CREATE', 'MERGE', 'EDIT'].includes(strategy.mode)) {
      strategy.mode = input.currentCode ? 'EDIT' : 'CREATE';
    }
    if (!strategy.file_roles) strategy.file_roles = [];
    if (!strategy.execution_plan) {
      strategy.execution_plan = {
        measure_pixels: [],
        extract_physics: [],
        preserve_existing_code: !!input.currentCode,
      };
    }

    return strategy;
  } catch {
    // Fallback strategy if JSON parse fails
    const imageIndices = input.files
      .map((f, i) => (f.mimeType.startsWith('image/') ? i : -1))
      .filter((i) => i >= 0);
    const videoIndices = input.files
      .map((f, i) => (f.mimeType.startsWith('video/') ? i : -1))
      .filter((i) => i >= 0);

    return {
      mode: input.currentCode ? 'EDIT' : input.files.length > 1 ? 'MERGE' : 'CREATE',
      base_source: input.currentCode ? 'codebase' : input.files.length > 0 ? 'file_0' : null,
      file_roles: input.files.map((f, i) => ({
        file_index: i,
        role: f.mimeType.startsWith('video/')
          ? ('motion_source' as const)
          : ('layout_source' as const),
        applies_to: ['global'],
      })),
      execution_plan: {
        measure_pixels: imageIndices,
        extract_physics: videoIndices,
        preserve_existing_code: !!input.currentCode,
      },
    };
  }
}

// ============================================================================
// STEP 0: SURVEYOR
// ============================================================================

const SURVEYOR_PROMPT = `### Role
You are the **Pixel Surveyor**. You measure UI layouts with precision.

### Task
Using Python with PIL/Pillow, analyze the uploaded image and extract:
1. Canvas dimensions (width x height)
2. For each visible UI component:
   - Bounding box (x, y, width, height in pixels)
   - Semantic tag (section, nav, div, header, footer, button, input, img, h1-h6, p, span, ul, li)
   - Computed styles (background color, text color, font size, padding, border radius, etc.)
3. Component hierarchy (parent-child relationships based on containment)
4. Global theme (dominant colors, fonts, spacing patterns)

### Instructions
Write Python code using PIL to:
1. Open the image
2. Analyze regions of distinct color/content
3. Identify component boundaries
4. Extract color values and approximate font sizes
5. Build a component tree

### Output
Print a JSON object with this exact schema:
{
  "canvas": { "width": number, "height": number },
  "measured_components": [
    {
      "id": "comp_0",
      "tag": "section",
      "bounds": { "x": 0, "y": 0, "width": 1440, "height": 80 },
      "computed_styles": { "backgroundColor": "#1a1a2e", "color": "#ffffff", "fontSize": "16px" },
      "children": []
    }
  ],
  "global_theme": {
    "colors": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    "fonts": ["Inter", "system-ui"],
    "spacing_unit": 8
  }
}`;

export async function surveyLayout(file: FileInput, fileIndex: number): Promise<VisualManifest> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  // Upload image to Gemini File API using shared helper
  const fileState = await uploadFileToGemini(apiKey, file);

  const model = genAI.getGenerativeModel({
    model: GEMINI_FLASH_MODEL,
    tools: [{ codeExecution: {} }],
  });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: fileState.mimeType,
        fileUri: fileState.uri,
      },
    },
    { text: SURVEYOR_PROMPT },
  ]);

  const text = result.response.text();

  // Extract JSON from the response (may be wrapped in code execution output)
  const jsonMatch = text.match(/\{[\s\S]*"canvas"[\s\S]*"measured_components"[\s\S]*\}/);
  if (!jsonMatch) {
    // Return minimal manifest if parsing fails
    return {
      file_index: fileIndex,
      canvas: { width: 1440, height: 900 },
      measured_components: [],
      global_theme: { colors: [], fonts: ['system-ui'], spacing_unit: 8 },
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      file_index: fileIndex,
      canvas: parsed.canvas || { width: 1440, height: 900 },
      measured_components: parsed.measured_components || [],
      global_theme: parsed.global_theme || { colors: [], fonts: ['system-ui'], spacing_unit: 8 },
    };
  } catch {
    return {
      file_index: fileIndex,
      canvas: { width: 1440, height: 900 },
      measured_components: [],
      global_theme: { colors: [], fonts: ['system-ui'], spacing_unit: 8 },
    };
  }
}

// ============================================================================
// STEP 1: UNIVERSAL ARCHITECT
// ============================================================================

const ARCHITECT_PROMPT = `### Role
You are the **Universal Frontend Architect**. Your goal is to output a clean structure.json (DOM Tree).

### Inputs
1. **Strategy:** The merge_strategy (contains user intent and source mapping).
2. **Manifests:** List of visual_manifest objects (may be empty if text-only).
3. **User Prompt:** The raw request.

### Execution Logic
**Scenario A: Image-Based (Tracing)**
* IF manifests are provided:
* Follow the dimensions strictly.
* If multiple manifests exist, follow the merge_strategy to decide which manifest owns which section (e.g., "Header from Manifest 0, Grid from Manifest 1").
* Map measured_components to semantic structure nodes.

**Scenario B: Text-Based (Invention)**
* IF manifests are EMPTY:
* Invent a professional layout based on the User Prompt.
* Define reasonable defaults (e.g., gap-4, p-6, grid-cols-3).
* Use modern design patterns (hero sections, card grids, CTAs).

### Constraints
* **Structure Only:** Use semantic HTML tags (section, nav, div, header, footer, main, aside, article).
* **Layout Classes:** Use Tailwind Grid/Flex classes (grid-cols-3, flex-row, gap-4, p-6, etc.).
* **No Visuals:** Do not define colors, shadows, or fonts yet (the Builder will handle that).
* **IDs Required:** Every node MUST have a unique id (used as data-id in generated code).
* **Roles:** Add a role field to major sections for semantic clarity.

### Output
Return ONLY valid JSON with this schema (no markdown, no explanation):
{
  "tree": [
    {
      "id": "root",
      "tag": "div",
      "classes": ["min-h-screen", "flex", "flex-col"],
      "role": "page-root",
      "children": [
        {
          "id": "nav-1",
          "tag": "nav",
          "classes": ["flex", "items-center", "justify-between", "px-6", "py-4"],
          "role": "navbar",
          "children": []
        }
      ]
    }
  ],
  "layout_strategy": "flex" | "grid" | "hybrid"
}`;

export async function buildStructure(
  manifests: VisualManifest[],
  strategy: MergeStrategy,
  instructions: string
): Promise<ComponentStructure> {
  const apiKey = getAnthropicApiKey();
  const anthropic = new Anthropic({ apiKey });

  const manifestsJson =
    manifests.length > 0
      ? JSON.stringify(manifests, null, 2)
      : '(no manifests — invent layout from text)';

  const response = await anthropic.messages.create({
    model: CLAUDE_OPUS_MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `${ARCHITECT_PROMPT}

### Strategy
${JSON.stringify(strategy, null, 2)}

### Manifests
${manifestsJson}

### User Prompt
"${instructions}"`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*"tree"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tree: parsed.tree || [],
        layout_strategy: parsed.layout_strategy || 'flex',
        responsive_breakpoints: parsed.responsive_breakpoints,
      };
    }
    // Direct parse attempt
    const parsed = JSON.parse(text);
    return {
      tree: parsed.tree || [],
      layout_strategy: parsed.layout_strategy || 'flex',
      responsive_breakpoints: parsed.responsive_breakpoints,
    };
  } catch {
    // Fallback: minimal structure
    return {
      tree: [
        {
          id: 'root',
          tag: 'div',
          classes: ['min-h-screen', 'flex', 'flex-col'],
          role: 'page-root',
          children: [],
        },
      ],
      layout_strategy: 'flex',
    };
  }
}

// ============================================================================
// STEP 2: SNIPER PHYSICIST
// ============================================================================

const PHYSICIST_PROMPT = `### Role
You are the **Sniper Physicist**. You analyze video frames to extract precise motion physics.

### Task
Given video keyframes (start, middle, end), reverse-engineer the web animations:

1. **Entrance Animations:** How do elements appear? (fade, slide, scale, rotate)
   - Extract cubic-bezier curves for easing
   - Measure duration and stagger delays
2. **Scroll Animations:** Do elements animate on scroll?
   - Identify trigger points and thresholds
3. **Hover Interactions:** Do elements respond to hover?
   - Scale factors, rotation degrees, translate offsets
   - Spring physics (stiffness, damping, mass)
4. **Looping Animations:** Are there continuous animations?
   - Floating, pulsing, rotating, bouncing
   - Keyframe definitions
5. **Page Transitions:** How do pages/sections transition?

### Instructions
- Compare frames to detect motion between them
- Be precise with bezier curves (not generic "ease-in-out")
- Only include animations you can actually detect — don't invent
- Use spring physics for interactive animations (hover, drag)

### Output
Return ONLY valid JSON (no markdown):
{
  "component_motions": [
    {
      "target_id": "hero-heading",
      "entrance": {
        "type": "slide-up",
        "bezier": [0.22, 1.0, 0.36, 1.0],
        "duration_ms": 600,
        "delay_ms": 0
      },
      "hover": {
        "scale": 1.02,
        "spring": { "stiffness": 300, "damping": 20, "mass": 1 }
      }
    }
  ],
  "page_transitions": [
    {
      "type": "fade",
      "duration_ms": 300,
      "bezier": [0.4, 0.0, 0.2, 1.0]
    }
  ]
}`;

export async function extractPhysics(
  files: FileInput[],
  strategy: MergeStrategy
): Promise<MotionPhysics> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  // Use deep think model for physics math
  const model = genAI.getGenerativeModel({
    model: GEMINI_DEEP_THINK_MODEL,
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  });

  // Upload videos via File API (videos cannot be sent as inline base64)
  const parts: Array<{ fileData: { mimeType: string; fileUri: string } } | { text: string }> = [];

  for (const file of files) {
    try {
      const uploaded = await uploadFileToGemini(apiKey, file);
      parts.push({
        fileData: {
          mimeType: uploaded.mimeType,
          fileUri: uploaded.uri,
        },
      });
    } catch (error) {
      // Log but continue — partial video analysis is better than none
      console.warn(
        `Failed to upload video for physics extraction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  parts.push({ text: PHYSICIST_PROMPT });

  // Only call the model if we have at least one uploaded video
  if (parts.length <= 1) {
    return { component_motions: [] };
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text);
    return {
      component_motions: parsed.component_motions || [],
      page_transitions: parsed.page_transitions,
    };
  } catch {
    return { component_motions: [] };
  }
}

// ============================================================================
// STEP 4: UNIVERSAL BUILDER
// ============================================================================

const BUILDER_PROMPT = `### Role
You are the **Universal UI Engineer**. You synthesize production-ready React code from multiple sources.

### Inputs
1. **Base Context:**
   * If mode="EDIT", use the provided Current Code. Do not rewrite the whole thing — target the specific sections requested.
   * If mode="CREATE", use the generated Structure JSON.
   * If mode="MERGE", combine multiple sources per the merge strategy.
2. **New Specs:** manifests[] (Measurements) and physics[] (Motion).
3. **Strategy:** The merge_strategy.json.
4. **User Prompt:** The raw instructions.

### Instructions
1. **The Base:** Start with the Base Context.
2. **The Merge:** If the Strategy says "Header comes from File 0", apply those dimensions. If "Buttons come from File 1", apply those styles.
3. **Conflict Resolution:**
   * Specific user instructions override measured data.
   * Measured data overrides guesses.
4. **data-id Attributes:** Add unique data-id attributes to EVERY major container and interactive element. These are used for click-to-select editing.
5. **Styling:** Use Tailwind CSS classes. For complex values that Tailwind can't express, use inline styles.
6. **Animations:** Use Framer Motion for all animations. Import { motion } from 'framer-motion'.
7. **Icons:** Use lucide-react for icons. Import specific icons by name.
8. **Structure:** Create a single default-exported React component.
9. **Responsiveness:** Include responsive breakpoints (sm:, md:, lg:, xl:).

### Output Format
Return ONLY the component code. No markdown fences, no explanations.
The component must:
- Be a valid TypeScript React component (.tsx)
- Have a default export
- Import React and any needed libraries (framer-motion, lucide-react)
- Use Tailwind CSS classes
- Have data-id on all major elements
- Be fully self-contained (no external state or props required)

Example structure:
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Menu } from 'lucide-react';

### Output
Return ONLY the full App.tsx code. No markdown.`;

export async function assembleCode(
  structure: ComponentStructure | null,
  manifests: VisualManifest[],
  physics: MotionPhysics | null,
  strategy: MergeStrategy,
  currentCode: string | null,
  instructions: string,
  assets: Record<string, string> = {} // NEW: Received assets
): Promise<AppFile[]> {
  const apiKey = getGeminiApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: GEMINI_PRO_MODEL,
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
  });

  const baseContext =
    strategy.mode === 'EDIT' && currentCode
      ? `### Current Code (EDIT mode — modify this, don't rewrite entirely)\n\`\`\`tsx\n${currentCode}\n\`\`\``
      : structure
        ? `### Structure JSON\n${JSON.stringify(structure, null, 2)}`
        : '### No structure provided — build from scratch based on user prompt.';

  const manifestsContext =
    manifests.length > 0
      ? `### Visual Manifests\n${JSON.stringify(manifests, null, 2)}`
      : '### No visual manifests (text-based generation).';

  const physicsContext =
    physics && physics.component_motions.length > 0
      ? `### Motion Physics\n${JSON.stringify(physics, null, 2)}`
      : '### No motion data (static layout).';

  const assetsContext = Object.keys(assets).length > 0
    ? `### AVAILABLE ASSETS
The Photographer has generated these photorealistic textures for you. 
USE THEM in your CSS (backgroundImage) or <img> tags instead of trying to draw them with CSS gradients.
${JSON.stringify(assets, null, 2)}`
    : '';

  const prompt = `${BUILDER_PROMPT}

${baseContext}

${manifestsContext}

${physicsContext}

${assetsContext}

### Strategy
${JSON.stringify(strategy, null, 2)}

### User Instructions
"${instructions}"`;

  // If we have images, include them for visual reference
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Include source images for visual context (first 3 max)
  for (const manifest of manifests.slice(0, 3)) {
    const fileIndex = manifest.file_index;
    // We don't have direct access to files here, so we rely on manifests for measurements
    // The Builder uses manifest data, not raw images
  }

  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  let code = result.response.text();

  // Clean up code — remove markdown fences if present
  code = code
    .replace(/^```(?:tsx?|jsx?|typescript|javascript)?\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();

  // Wrap in entry file structure for Sandpack
  const componentFile: AppFile = {
    path: '/src/App.tsx',
    content: code,
  };

  const indexFile: AppFile = {
    path: '/src/index.tsx',
    content: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './inspector';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  };

  return [componentFile, indexFile];
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
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: GEMINI_PRO_MODEL,
      generationConfig: { temperature: 0.2, maxOutputTokens: 16384 },
    });

    const prompt = `${LIVE_EDITOR_PROMPT}

### Current Code
\`\`\`tsx
${currentCode}
\`\`\`

### Selected Element
data-id="${selectedDataId}"

### Instruction
"${instruction}"`;

    const result = await model.generateContent(prompt);
    let updatedCode = result.response.text();

    // Clean up code
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
// ORCHESTRATOR
// ============================================================================

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const warnings: string[] = [];
  const stepTimings: Record<string, number> = {};

  // --- Step -1: Route Intent ---
  const routerStart = Date.now();
  let strategy: MergeStrategy;
  try {
    strategy = await routeIntent(input);
  } catch (error) {
    warnings.push(
      `Router failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback.`
    );
    strategy = {
      mode: input.currentCode ? 'EDIT' : 'CREATE',
      base_source: input.currentCode ? 'codebase' : null,
      file_roles: input.files.map((f, i) => ({
        file_index: i,
        role: f.mimeType.startsWith('video/')
          ? ('motion_source' as const)
          : ('layout_source' as const),
        applies_to: ['global'],
      })),
      execution_plan: {
        measure_pixels: input.files
          .map((f, i) => (f.mimeType.startsWith('image/') ? i : -1))
          .filter((i) => i >= 0),
        extract_physics: input.files
          .map((f, i) => (f.mimeType.startsWith('video/') ? i : -1))
          .filter((i) => i >= 0),
        preserve_existing_code: !!input.currentCode,
      },
    };
  }
  stepTimings.router = Date.now() - routerStart;

  // --- Step 0: Survey Layout (for each image) ---
  const manifests: VisualManifest[] = [];
  if (strategy.execution_plan.measure_pixels.length > 0) {
    const surveyStart = Date.now();
    for (const fileIndex of strategy.execution_plan.measure_pixels) {
      if (fileIndex >= 0 && fileIndex < input.files.length) {
        try {
          const manifest = await surveyLayout(input.files[fileIndex], fileIndex);
          manifests.push(manifest);
        } catch (error) {
          warnings.push(
            `Surveyor failed for file ${fileIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
    stepTimings.surveyor = Date.now() - surveyStart;
  }

  // --- Step 1: Build Structure ---
  let structure: ComponentStructure | null = null;
  // Skip Architect if EDIT mode with text-only (Builder handles directly)
  const needsArchitect = strategy.mode !== 'EDIT' || manifests.length > 0;

  if (needsArchitect) {
    const architectStart = Date.now();
    try {
      structure = await buildStructure(manifests, strategy, input.instructions);
    } catch (error) {
      warnings.push(
        `Architect failed: ${error instanceof Error ? error.message : 'Unknown error'}. Builder will work without structure.`
      );
    }
    stepTimings.architect = Date.now() - architectStart;
  }

  // --- Step 2: Extract Physics (for each video) ---
  let physics: MotionPhysics | null = null;
  if (strategy.execution_plan.extract_physics.length > 0) {
    const physicsStart = Date.now();
    try {
      // Collect actual FileInput objects for video files
      const videoFiles: FileInput[] = [];
      for (const fileIndex of strategy.execution_plan.extract_physics) {
        if (fileIndex >= 0 && fileIndex < input.files.length) {
          videoFiles.push(input.files[fileIndex]);
        }
      }
      if (videoFiles.length > 0) {
        // Pass the actual files — extractPhysics uploads via File API
        physics = await extractPhysics(videoFiles, strategy);
      }
    } catch (error) {
      warnings.push(
        `Physicist failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    stepTimings.physicist = Date.now() - physicsStart;
  }

  // --- Step 3: The Photographer (Asset Generation) ---
  const generatedAssets: Record<string, string> = {};
  
  // @ts-ignore
  if (strategy.execution_plan.generate_assets?.length > 0) {
    const photographerStart = Date.now();
    
    // @ts-ignore
    const assetTasks = strategy.execution_plan.generate_assets.map(async (asset: any) => {
      try {
        const result = await geminiImageService.generateBackgroundFromReference({
          referenceImage: "", // Empty for text-to-image
          colorPalette: { primary: "#ffffff", secondary: "#888888", background: "#000000" }, // Defaults
          vibe: "Photorealistic",
          vibeKeywords: [asset.description, "high quality", "texture"],
        });
        
        if (result.imageUrl) {
          generatedAssets[asset.name] = result.imageUrl;
        }
      } catch (e) {
        console.error(`Failed to generate asset ${asset.name}`, e);
      }
    });

    await Promise.all(assetTasks);
    stepTimings.photographer = Date.now() - photographerStart;
  }

  // --- Step 4: Assemble Code ---
  const builderStart = Date.now();
  let files: AppFile[];
  try {
    files = await assembleCode(
      structure,
      manifests,
      physics,
      strategy,
      input.currentCode,
      input.instructions,
      generatedAssets
    );
  } catch (error) {
    warnings.push(`Builder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Return minimal fallback
    files = [
      {
        path: '/src/App.tsx',
        content: `import React from 'react';

export default function GeneratedLayout() {
  return (
    <div data-id="root" className="min-h-screen flex items-center justify-center bg-gray-100">
      <div data-id="error-card" className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Generation Failed</h1>
        <p className="text-gray-600">The code generator encountered an error. Please try again.</p>
      </div>
    </div>
  );
}`,
      },
      {
        path: '/src/index.tsx',
        content: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);`,
      },
    ];
  }
  stepTimings.builder = Date.now() - builderStart;

  return {
    files,
    strategy,
    manifests,
    physics,
    warnings,
    stepTimings,
  };
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
