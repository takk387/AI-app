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
import type { VisualManifest, FileInput } from '@/types/titanPipeline';

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
// IMAGE ENHANCEMENT: Upscale and sharpen for crisp replications
// ============================================================================

const MIN_DIMENSION = 1920; // Minimum longest edge for quality analysis

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
2. **Styles:** Extract hex codes, border-radius, shadows, and font-weights.
3. **Content:** You MUST extract the text inside buttons, headings, and paragraphs.
4. **Icons — DEFAULT TO EXTRACTION (Critical for Custom Icons):**
   
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

5. **CRITICAL - CUSTOM VISUAL DETECTION:**
   For ANY non-standard visual element (textured buttons, custom icons, logos, unique gradients, images):
   - Set "hasCustomVisual": true
   - Set "extractionAction": "crop" (to extract exact pixels from original)
   - Provide precise bounds for cropping: { top, left, width, height } in percentage (0-100)
   - DO NOT provide "imageDescription" - we extract, not generate

   Examples of custom visuals to flag:
   - Company logos (always extract)
   - Custom icons (not standard Lucide)
   - Textured backgrounds (wood, fabric, clouds, etc.)
   - Photographs or realistic images
   - Hand-drawn elements
   - Unique gradient combinations
6. **Advanced Effects (CRITICAL for visual fidelity):**
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

// ============================================================================
// SURVEYOR IMPLEMENTATION
// ============================================================================

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
    console.error('[TitanPipeline] Surveyor failed:', e);
    return {
      file_index: fileIndex,
      originalImageRef: fileState?.uri
        ? { fileUri: fileState.uri, mimeType: fileState.mimeType! }
        : undefined,
      measured_components: [],
      canvas: { width: 1440, height: 900 },
      global_theme: {},
    };
  }
}
