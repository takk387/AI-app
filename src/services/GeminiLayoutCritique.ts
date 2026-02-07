/**
 * Gemini Layout Critique - Vision Loop Critiquer
 *
 * Compares original design reference vs generated output screenshots
 * for self-healing layout refinement.
 *
 * Contains both legacy (critiqueLayout) and enhanced (critiqueLayoutEnhanced) methods.
 *
 * SDK: @google/genai (new SDK with code execution support)
 */

import { GoogleGenAI, createPartFromBase64 } from '@google/genai';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { LayoutCritiqueEnhanced } from '@/types/layoutAnalysis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Strip data URI prefix from base64 string and return data + mimeType
 */
function parseBase64Image(base64: string): { data: string; mimeType: string } {
  const mimeMatch = base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const data = base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  return { data, mimeType };
}

// ============================================================================
// TYPES
// ============================================================================

export interface LayoutCritique {
  score: number; // 0-100
  discrepancies: {
    componentId?: string;
    issue: string; // "Padding too small", "Wrong color"
    suggestion: string; // "Increase padding to 24px"
    correctionJSON?: Partial<DetectedComponentEnhanced>;
  }[];
}

// ============================================================================
// LEGACY CRITIQUE
// ============================================================================

/**
 * The "Vision Loop" Critiquer (Legacy)
 * Compares the original reference vs. the generated output (screenshot)
 *
 * @param apiKey - Gemini API key
 * @param originalImage - Base64-encoded original design reference
 * @param generatedImage - Base64-encoded screenshot of generated output
 */
export async function critiqueLayout(
  apiKey: string,
  originalImage: string,
  generatedImage: string
): Promise<LayoutCritique> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
      You are a QA Design Engineer.
      Image 1: Original Design Reference.
      Image 2: Current AI-Generated Output.

      Compare them pixel-by-pixel. Identify discrepancies in:
      - Padding/Margins (e.g., "Button padding is 10px too small")
      - Alignment (e.g., "Logo is not vertically centered")
      - Colors (e.g., "Background is #FFF, needs to be #F5F5F5")
      - Font Weights

      Return a 'LayoutCritique' JSON with specific, executable corrections.
      Return ONLY valid JSON. No markdown, no explanation.
    `;

  const originalParsed = parseBase64Image(originalImage);
  const generatedParsed = parseBase64Image(generatedImage);

  const result = await ai.models.generateContent({
    model: MODEL_FLASH,
    contents: [
      { text: prompt },
      createPartFromBase64(originalParsed.data, originalParsed.mimeType),
      createPartFromBase64(generatedParsed.data, generatedParsed.mimeType),
    ],
    config: {
      tools: [{ codeExecution: {} }],
      maxOutputTokens: 65536,
    },
  });

  const text = result.text ?? '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]) as LayoutCritique;
  } catch (e) {
    console.error('Failed to parse Critique response', e);
    return { score: 0, discrepancies: [] };
  }
}

// ============================================================================
// ENHANCED CRITIQUE
// ============================================================================

/**
 * Enhanced Vision Loop Critiquer for Self-Healing
 *
 * Compares original design vs generated layout and returns structured
 * corrections that can be automatically applied by the AutoFixEngine.
 *
 * @param apiKey - Gemini API key
 * @param originalImage - Base64 encoded original design reference
 * @param generatedImage - Base64 encoded screenshot of current layout
 * @param components - Current component array for context
 * @param targetFidelity - Target fidelity score (default: 95)
 */
export async function critiqueLayoutEnhanced(
  apiKey: string,
  originalImage: string,
  generatedImage: string,
  components: DetectedComponentEnhanced[],
  targetFidelity: number = 95
): Promise<LayoutCritiqueEnhanced> {
  const ai = new GoogleGenAI({ apiKey });

  // Build rich component context for the AI (enables content + style corrections)
  const componentContext = components.map((c) => ({
    id: c.id,
    type: c.type,
    bounds: c.bounds,
    style: {
      backgroundColor: c.style?.backgroundColor,
      textColor: c.style?.textColor,
      fontSize: c.style?.fontSize,
      fontWeight: c.style?.fontWeight,
      borderRadius: c.style?.borderRadius,
      backgroundImage: c.style?.backgroundImage,
      opacity: c.style?.opacity,
    },
    content: {
      text: typeof c.content?.text === 'string' ? c.content.text.substring(0, 80) : undefined,
      hasIcon: c.content?.hasIcon,
      hasImage: c.content?.hasImage,
      iconName: c.content?.iconName,
      // For long SVG paths, send a sentinel instead of truncating — truncation
      // causes the critique AI to think the path is corrupt and suggest replacements
      iconSvgPath: c.content?.iconSvgPath
        ? c.content.iconSvgPath.length > 500
          ? '<CUSTOM_SVG_DO_NOT_MODIFY>'
          : c.content.iconSvgPath
        : undefined,
    },
  }));

  const prompt = `
      You are an expert QA Design Engineer performing pixel-perfect visual comparison.

      **Image 1**: Original Design Reference (the target we want to match)
      **Image 2**: Current AI-Generated Layout (what we've built so far)

      **Current Components** (for reference when creating corrections):
      ${JSON.stringify(componentContext, null, 2)}

      **Your Task**: Compare the two images and identify ALL visual discrepancies.

      For each discrepancy, provide:
      1. Which component is affected (use the component ID from the list above)
      2. What type of issue it is
      3. How severe it is
      4. What the expected value should be
      5. What the actual value is
      6. A JSON patch to fix it

      **Return this exact JSON structure**:
      {
        "fidelityScore": <0-100, how close is the generated layout to the original>,
        "overallAssessment": "<brief summary of the layout quality>",
        "discrepancies": [
          {
            "componentId": "<id from components list, or 'unknown' if can't identify>",
            "issue": "<descriptive_snake_case_type>",
            "severity": "minor|moderate|critical",
            "expected": "<what it should be, e.g., '#FF0000' or '24px'>",
            "actual": "<what it currently is>",
            "correctionJSON": {
              "style": { "<css_property>": "<corrected value>" },
              "content": { "<content_property>": "<corrected value>" },
              "bounds": { "<bounds_property>": <corrected number> }
            }
          }
        ],
        "passesThreshold": <true if fidelityScore >= ${targetFidelity}>,
        "recommendation": "accept|refine|regenerate"
      }

      **correctionJSON rules**:
      - "style": Use for ANY CSS property (color, padding, flexDirection, clipPath, zIndex, etc.)
      - "content": Use for text, icons, images, SVG paths (text, iconName, iconSvgPath, src, etc.)
      - "bounds": Use for position/size (width, height, top, left)
      - Include only the sections that need corrections (omit empty sections)

      **ICON PRESERVATION (CRITICAL)**:
      - If a component has iconSvgPath = "<CUSTOM_SVG_DO_NOT_MODIFY>", do NOT suggest icon corrections for that component. The icon was custom-extracted and must be preserved exactly.
      - Only suggest icon changes if the rendered icon is clearly the WRONG shape or meaning compared to the original.
      - NEVER replace a custom SVG path with a generic iconName.

      **ACCEPTABLE RENDERING DIFFERENCES (do NOT flag these):**
      - Anti-aliasing differences between browser rendering and original image
      - Sub-pixel positioning shifts (±1px)
      - Font rendering differences (hinting, smoothing, kerning micro-differences)
      - Image compression artifacts vs original quality
      - Minor opacity variations due to different rendering engines
      Only flag differences that are visible to a human at normal viewing distance.

      **Severity Guidelines** (use RELATIVE thresholds, not absolute pixels):
      - critical: Difference > 5% of the component's own size, or completely wrong colors/missing elements
      - moderate: Difference 2-5% of the component's size (e.g., noticeable spacing or font weight error)
      - minor: Difference < 2% of the component's size (slight color variation, tiny spacing shift)

      **Issue Types** (use descriptive snake_case - these are examples, use ANY type that fits):
      color_drift, spacing_error, typography_mismatch, position_offset, size_mismatch,
      missing_element, extra_element, content_mismatch, effect_missing, image_missing,
      gradient_mismatch, animation_missing, layout_mismatch, shape_mismatch,
      border_mismatch, icon_mismatch, shadow_mismatch, opacity_mismatch, or any other descriptive type

      **Recommendation Logic**:
      - "accept": fidelityScore >= ${targetFidelity} and no critical issues
      - "refine": fidelityScore >= 70 and fixable discrepancies
      - "regenerate": fidelityScore < 70 or unfixable structural issues

      Return ONLY valid JSON. No markdown, no explanation.
    `;

  const originalParsed = parseBase64Image(originalImage);
  const generatedParsed = parseBase64Image(generatedImage);

  try {
    const result = await ai.models.generateContent({
      model: MODEL_FLASH,
      contents: [
        { text: prompt },
        createPartFromBase64(originalParsed.data, originalParsed.mimeType),
        createPartFromBase64(generatedParsed.data, generatedParsed.mimeType),
      ],
      config: {
        tools: [{ codeExecution: {} }],
        maxOutputTokens: 65536,
      },
    });

    const text = result.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in critique response');
    const critique = JSON.parse(jsonMatch[0]) as LayoutCritiqueEnhanced;

    // Validate and sanitize the response
    return {
      fidelityScore: Math.min(100, Math.max(0, critique.fidelityScore || 0)),
      overallAssessment: critique.overallAssessment || 'No assessment provided',
      discrepancies: Array.isArray(critique.discrepancies) ? critique.discrepancies : [],
      passesThreshold: critique.fidelityScore >= targetFidelity,
      recommendation:
        critique.recommendation || (critique.fidelityScore >= targetFidelity ? 'accept' : 'refine'),
    };
  } catch (e) {
    console.error('[GeminiLayoutCritique] Failed to parse enhanced critique response', e);
    return {
      fidelityScore: 0,
      overallAssessment: 'Failed to analyze layout comparison',
      discrepancies: [],
      passesThreshold: false,
      recommendation: 'regenerate',
    };
  }
}
