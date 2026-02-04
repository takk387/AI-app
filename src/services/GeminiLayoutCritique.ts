/**
 * Gemini Layout Critique - Vision Loop Critiquer
 *
 * Extracted from GeminiLayoutService.ts
 * Compares original design reference vs generated output screenshots
 * for self-healing layout refinement.
 *
 * Contains both legacy (critiqueLayout) and enhanced (critiqueLayoutEnhanced) methods.
 *
 * SDK: @google/generative-ai (older SDK)
 */

import type { GoogleGenerativeAI } from '@google/generative-ai';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { LayoutCritiqueEnhanced } from '@/types/layoutAnalysis';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';

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
 * @param client - Initialized GoogleGenerativeAI client
 * @param fileToPart - Helper to convert base64 image to Gemini inline data part
 * @param originalImage - Base64-encoded original design reference
 * @param generatedImage - Base64-encoded screenshot of generated output
 */
export async function critiqueLayout(
  client: GoogleGenerativeAI,
  fileToPart: (base64: string) => { inlineData: { data: string; mimeType: string } },
  originalImage: string,
  generatedImage: string
): Promise<LayoutCritique> {
  const model = client.getGenerativeModel({
    model: MODEL_FLASH,
    generationConfig: { responseMimeType: 'application/json' },
  });

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
    `;

  const originalPart = fileToPart(originalImage);
  const generatedPart = fileToPart(generatedImage);

  const result = await model.generateContent([prompt, originalPart, generatedPart]);
  const response = result.response;

  try {
    return JSON.parse(response.text()) as LayoutCritique;
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
 * @param client - Initialized GoogleGenerativeAI client
 * @param fileToPart - Helper to convert base64 image to Gemini inline data part
 * @param originalImage - Base64 encoded original design reference
 * @param generatedImage - Base64 encoded screenshot of current layout
 * @param components - Current component array for context
 * @param targetFidelity - Target fidelity score (default: 95)
 */
export async function critiqueLayoutEnhanced(
  client: GoogleGenerativeAI,
  fileToPart: (base64: string) => { inlineData: { data: string; mimeType: string } },
  originalImage: string,
  generatedImage: string,
  components: DetectedComponentEnhanced[],
  targetFidelity: number = 95
): Promise<LayoutCritiqueEnhanced> {
  const model = client.getGenerativeModel({
    model: MODEL_FLASH,
    generationConfig: { responseMimeType: 'application/json' },
  });

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
      iconSvgPath: c.content?.iconSvgPath ? '[SVG path present]' : undefined,
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

      **Severity Guidelines**:
      - critical: Major visual difference that breaks the design (wrong colors, missing elements, broken layout)
      - moderate: Noticeable difference that affects quality (spacing off by >10px, wrong font weight)
      - minor: Small difference that most users wouldn't notice (spacing off by <5px, slight color variation)

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

  const originalPart = fileToPart(originalImage);
  const generatedPart = fileToPart(generatedImage);

  try {
    const result = await model.generateContent([prompt, originalPart, generatedPart]);
    const response = result.response;
    const critique = JSON.parse(response.text()) as LayoutCritiqueEnhanced;

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
    console.error('[GeminiLayoutService] Failed to parse enhanced critique response', e);
    return {
      fidelityScore: 0,
      overallAssessment: 'Failed to analyze layout comparison',
      discrepancies: [],
      passesThreshold: false,
      recommendation: 'regenerate',
    };
  }
}
