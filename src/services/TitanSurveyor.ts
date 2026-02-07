/**
 * Titan Surveyor - Visual Reverse Engineering
 *
 * Extracted from TitanPipelineService.ts
 * Analyzes images and reconstructs DOM tree structure.
 *
 * SDK: @google/genai (new SDK with agentic features - code execution, file upload)
 */

import { GoogleGenAI, createPartFromUri } from '@google/genai';
import sharp from 'sharp';
import type { VisualManifest, FileInput, CanvasConfig, ImageMetadata } from '@/types/titanPipeline';
import { FALLBACK_CANVAS } from '@/types/titanPipeline';
import { isUIChromeIcon } from './iconConstants';

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
// IMAGE METADATA EXTRACTION (measures actual dimensions before any processing)
// ============================================================================

/**
 * Extract actual image dimensions using Sharp BEFORE any enhancement.
 * This is the single source of truth for canvas sizing throughout the pipeline.
 */
export async function extractImageMetadata(file: FileInput): Promise<ImageMetadata> {
  try {
    const base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
    const buffer = Buffer.from(base64Data, 'base64');
    const metadata = await sharp(buffer).metadata();

    const result: ImageMetadata = {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    };

    console.log(
      `[TitanSurveyor] Image metadata: ${result.width}x${result.height} (${result.format})`
    );
    return result;
  } catch (error) {
    console.warn('[TitanSurveyor] Metadata extraction failed:', error);
    return { width: 0, height: 0, format: 'unknown' };
  }
}

/**
 * Build a CanvasConfig from measured image metadata.
 * Falls back to FALLBACK_CANVAS only if metadata extraction returned zeroes.
 */
export function buildCanvasConfig(metadata: ImageMetadata): CanvasConfig {
  if (metadata.width > 0 && metadata.height > 0) {
    return {
      width: metadata.width,
      height: metadata.height,
      source: 'measured',
      aspectRatio: metadata.width / metadata.height,
    };
  }

  console.warn('[TitanSurveyor] Invalid metadata dimensions, using fallback canvas');
  return { ...FALLBACK_CANVAS };
}

// ============================================================================
// IMAGE ENHANCEMENT: Upscale and sharpen for crisp replications
// ============================================================================

// Configurable via env var: set MIN_IMAGE_DIMENSION=0 to disable upscaling entirely
const MIN_DIMENSION = parseInt(process.env.MIN_IMAGE_DIMENSION || '1920', 10);

/**
 * Enhance image quality before AI analysis.
 * - Upscales small images to at least 1920px on the longest edge
 * - Applies subtle sharpening to combat blur from compression
 * - Converts to high-quality PNG for lossless processing
 */
export async function enhanceImageQuality(file: FileInput): Promise<FileInput> {
  try {
    const base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
    const buffer = Buffer.from(base64Data, 'base64');

    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const maxDim = Math.max(width, height);

    // Skip if image is already high resolution
    if (maxDim >= MIN_DIMENSION) {
      console.log(`[TitanSurveyor] Image already ${maxDim}px, skipping enhancement`);
      return file;
    }

    let processed = sharp(buffer);

    // Upscale to minimum dimension using high-quality lanczos3 algorithm
    const scale = MIN_DIMENSION / maxDim;
    processed = processed.resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      kernel: 'lanczos3',
    });
    console.log(`[TitanSurveyor] Upscaling image ${maxDim}px → ${MIN_DIMENSION}px`);

    // Apply subtle sharpening to combat blur
    processed = processed.sharpen({ sigma: 0.8 });

    // Output as high-quality PNG
    const enhancedBuffer = await processed.png({ compressionLevel: 6 }).toBuffer();

    return {
      ...file,
      base64: `data:image/png;base64,${enhancedBuffer.toString('base64')}`,
      mimeType: 'image/png',
    };
  } catch (error) {
    console.warn('[TitanSurveyor] Image enhancement failed, using original:', error);
    return file; // Fallback to original on error
  }
}

// ============================================================================
// SHARED HELPER: FILE UPLOAD
// ============================================================================

export async function uploadFileToGemini(apiKey: string, file: FileInput) {
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
// SURVEYOR PROMPT
// ============================================================================

const SURVEYOR_PROMPT = `### Role
You are the **UI Reverse Engineer**.

### Task
Analyze the image and reconstruct the **exact DOM Component Tree**.
1. **Structure:** Identify Flex Rows vs Columns. Group elements logically (e.g., "Card", "Navbar").
2. **Styles:** Extract hex codes, border-radius, shadows, and font-weights. Include explicit width, height, padding, margin, and gap values in px units where measurable.
3. **Content:** You MUST extract the text inside buttons, headings, and paragraphs.
4. **Bounds (MANDATORY for every node):**
   - Every node MUST include a \`"bounds"\` field: { top, left, width, height }
   - Values are percentages (0-100):
     - Root nodes: relative to canvas (the full image)
     - Child nodes: relative to parent content area
   - Measure ACTUAL pixel positions from the image, then convert to percentages using canvas dimensions
   - These bounds are REQUIRED for:
     a) Extracting custom icons/logos from the original image
     b) Providing the Builder with exact element sizes for pixel-perfect output
   - Example: A header spanning the full width at the top = { "top": 0, "left": 0, "width": 100, "height": 8 }
5. **Icons — DEFAULT TO EXTRACTION (Critical for Custom Icons):**
   
   **DEFAULT BEHAVIOR FOR ALL ICONS:**
   Extract the icon by setting:
   - \`hasCustomVisual\`: true
   - \`extractionAction\`: "crop"
   - \`extractionBounds\`: { top, left, width, height } in percentage (0-100)
   - Measure and set \`iconColor\`: "#hexcode"
   
   **EXCEPTION - Use Lucide ONLY for these 12 standard UI icons:**
   - Navigation: ChevronLeft, ChevronRight, ChevronUp, ChevronDown
   - Actions: X (close), Menu (hamburger), Check, Plus, Minus
   - Utility: Search, ArrowRight, ArrowLeft
   
   **NEVER use Lucide for:**
   - Company logos or brand marks (e.g., social media icons, app icons)
   - Stylized icons with artistic flourishes, shadows, gradients
   - Decorative icons (stars with textures, hearts with patterns)
   - Custom illustrations or drawings
   - Icons with unique shapes not matching standard UI patterns
   - Any icon where you're uncertain if it's standard UI
   
   **Rule of Thumb:** When in doubt, EXTRACT. Only use Lucide if you're 100% certain it's
   a basic navigation or utility icon from the exception list above.

6. **CRITICAL - CUSTOM VISUAL DETECTION:**
   For ANY non-standard visual element (textured buttons, custom icons, logos, unique gradients, images):
   - Set "hasCustomVisual": true
   - Set "extractionAction": "crop" (to extract exact pixels from original)
   - Use the element's "bounds" field for cropping coordinates (already required by rule 4)
   - DO NOT provide "imageDescription" - we extract, not generate

   Examples of custom visuals to flag:
   - Company logos (always extract)
   - Custom icons (not standard Lucide)
   - Textured backgrounds (wood, fabric, clouds, etc.)
   - Photographs or realistic images
   - Hand-drawn elements
   - Unique gradient combinations
7. **Advanced Effects (CRITICAL for visual fidelity):**
   - Gradients: Extract full CSS gradient syntax (type, angle, color stops with %)
   - Glassmorphism: backdrop-filter blur, background opacity
   - Transforms: rotation, scale, skew
   - Filters: blur, brightness, saturation
   - Clip-path: shaped elements (circular avatars, angled sections)
   - Animations: describe any visible motion
   - For ANY CSS property visible in the design, include it in the styles object
8. **Interactive States:**
   - For buttons, links, and interactive cards: infer likely hover/active/focus states
     based on the visual design (shadow changes, color shifts, scale effects).
   - Include an "interactionStates" field on the element node (sibling to "styles"):
     "interactionStates": { "hover": { ...css }, "active": { ...css }, "focus": { ...css } }
9. **Icon & Logo Containers:**
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
    "bounds": { "top": 0, "left": 0, "width": 100, "height": 8 },
    "styles": {
      "display": "flex",
      "flexDirection": "column",
      "width": "1440px",
      "height": "86px",
      "padding": "16px 24px",
      "margin": "0",
      "gap": "16px",
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
    "hasIcon": true,
    "hasCustomVisual": true,
    "extractionAction": "crop",
    "extractionBounds": { "top": 2, "left": 5, "width": 4, "height": 6 },
    "iconColor": "#1DA1F2",
    "iconPosition": "left",
    "iconSize": "md",
    "iconSvgPath": null,
    "iconViewBox": "0 0 24 24",
    "iconName": null,
    "children": [
      // Recursive nodes — each child MUST also have "bounds"
    ]
  },
  "assets_needed": []
}`;

// ============================================================================
// VISUAL AUTO-FIX (earliest enforcement point — immediately after AI response)
// ============================================================================

/**
 * Walk the parsed dom_tree and force hasCustomVisual=true on nodes that need
 * extraction from the reference image. Catches the AI's tendency to skip
 * flagging custom visuals.
 *
 * Enforces extraction for:
 * 1. Non-UI-chrome icons (iconName that isn't chevron/X/menu/etc.)
 * 2. Image nodes (type: "img") — photos, illustrations, logos
 * 3. Nodes the AI identified as having images (hasImage: true)
 */
function autoFixIconDecisions(node: Record<string, unknown>): void {
  const alreadyCustomVisual = node.hasCustomVisual === true;

  // Check extractionBounds first (AI may have provided them directly), then fall back to bounds
  const existingExtractionBounds = node.extractionBounds as
    | { top: number; left: number; width: number; height: number }
    | undefined;
  const bounds = node.bounds as
    | { top: number; left: number; width: number; height: number }
    | undefined;
  const extractionSource = existingExtractionBounds || bounds;

  // --- Fix 1: Non-chrome icon names → force extraction ---
  const iconName = node.iconName as string | undefined;
  const hasIconSvgPath = !!node.iconSvgPath;

  if (iconName && !hasIconSvgPath && !alreadyCustomVisual && !isUIChromeIcon(iconName)) {
    if (extractionSource) {
      node.hasCustomVisual = true;
      node.extractionAction = 'crop';
      node.extractionBounds = {
        top: extractionSource.top,
        left: extractionSource.left,
        width: extractionSource.width,
        height: extractionSource.height,
      };
      // Preserve iconName as fallback in case extraction fails
      node._originalIconName = node.iconName;
      delete node.iconName;

      console.log(`[Surveyor:VisualFix] Icon "${iconName}" → hasCustomVisual (node: ${node.id})`);
    } else {
      console.warn(
        `[Surveyor:VisualFix] Icon "${iconName}" has no bounds or extractionBounds for extraction (node: ${node.id}). Cannot crop.`
      );
    }
  }

  // --- Fix 2: Image nodes (type: "img") → force extraction ---
  if (node.type === 'img' && !alreadyCustomVisual && !node.hasCustomVisual) {
    if (extractionSource) {
      node.hasCustomVisual = true;
      node.extractionAction = 'crop';
      node.extractionBounds = {
        top: extractionSource.top,
        left: extractionSource.left,
        width: extractionSource.width,
        height: extractionSource.height,
      };

      console.log(`[Surveyor:VisualFix] Image node → hasCustomVisual (node: ${node.id})`);
    } else {
      console.warn(
        `[Surveyor:VisualFix] Image node has no bounds or extractionBounds for extraction (node: ${node.id}). Cannot crop.`
      );
    }
  }

  // --- Fix 3: Nodes with hasImage flag → force extraction ---
  if (node.hasImage === true && !alreadyCustomVisual && !node.hasCustomVisual) {
    if (extractionSource) {
      node.hasCustomVisual = true;
      node.extractionAction = 'crop';
      node.extractionBounds = {
        top: extractionSource.top,
        left: extractionSource.left,
        width: extractionSource.width,
        height: extractionSource.height,
      };

      console.log(`[Surveyor:VisualFix] hasImage node → hasCustomVisual (node: ${node.id})`);
    } else {
      console.warn(
        `[Surveyor:VisualFix] hasImage node has no bounds or extractionBounds for extraction (node: ${node.id}). Cannot crop.`
      );
    }
  }

  // Recurse through children
  const children = node.children as Record<string, unknown>[] | undefined;
  if (Array.isArray(children)) {
    for (const child of children) {
      if (child && typeof child === 'object') {
        autoFixIconDecisions(child);
      }
    }
  }
}

// ============================================================================
// SURVEYOR IMPLEMENTATION
// ============================================================================

export async function surveyLayout(
  file: FileInput,
  fileIndex: number,
  canvasConfig?: CanvasConfig
): Promise<VisualManifest> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const fileState = await uploadFileToGemini(apiKey, file);

  // Prepend measured canvas dimensions to the prompt so the AI knows the actual image size
  const canvasPreamble = canvasConfig
    ? `\n### Image Dimensions (MEASURED — use these, do not guess)\nThe uploaded image is ${canvasConfig.width}px × ${canvasConfig.height}px (aspect ratio ${canvasConfig.aspectRatio.toFixed(3)}). Use these exact dimensions as the canvas size in your output.\n\n`
    : '';

  // Enable Agentic Vision: code execution activates Think→Act→Observe loop
  // for precise CSS extraction (zoom, crop, annotate capabilities)
  const result = await ai.models.generateContent({
    model: GEMINI_FLASH_MODEL,
    contents: [
      createPartFromUri(fileState.uri!, fileState.mimeType!),
      { text: canvasPreamble + SURVEYOR_PROMPT },
    ],
    config: {
      tools: [{ codeExecution: {} }],
      maxOutputTokens: 65536,
    },
  });

  // Use measured canvas for fallback, not hardcoded values
  const fallbackCanvas = canvasConfig
    ? { width: canvasConfig.width, height: canvasConfig.height }
    : { width: FALLBACK_CANVAS.width, height: FALLBACK_CANVAS.height };

  try {
    const text = result.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const data = JSON.parse(jsonMatch[0]);

    // Auto-fix: convert non-UI-chrome iconName → hasCustomVisual at the source
    if (data.dom_tree) {
      autoFixIconDecisions(data.dom_tree);
    }

    return {
      file_index: fileIndex,
      originalImageRef: { fileUri: fileState.uri!, mimeType: fileState.mimeType! },
      canvas: data.canvas || fallbackCanvas,
      global_theme: { dom_tree: data.dom_tree, assets: data.assets_needed },
      measured_components: [],
    };
  } catch (e) {
    console.error('[TitanPipeline] Surveyor failed:', e);
    return {
      file_index: fileIndex,
      originalImageRef: fileState?.uri
        ? { fileUri: fileState.uri, mimeType: fileState.mimeType! }
        : undefined,
      measured_components: [],
      canvas: fallbackCanvas,
      global_theme: {},
    };
  }
}
