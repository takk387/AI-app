/**
 * Gemini Layout Service
 *
 * Core intelligence engine for the "Ultimate Layout Builder".
 * Uses Gemini 3 Flash for high-speed multimodal analysis of:
 * - Images (Layout Detection)
 * - Videos (Motion & Flow Extraction)
 * - Hybrid Inputs (Layout + Style mixing)
 *
 * Orchestrator for:
 * - Stage 1: Design Spec Extraction → GeminiDesignSpecExtractor.ts
 * - Stage 2: Component Building → GeminiComponentBuilder.ts
 * - Critique (Legacy + Enhanced) → GeminiLayoutCritique.ts
 * - Video Analysis, Component Editing, Legacy Analysis — inline (lightweight)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import {
  sanitizeComponents,
  inferContainerLayouts,
  resolveRootOverlaps,
} from '@/utils/layoutValidation';
import type { DesignSpec } from '@/types/designSpec';
import type { LayoutAnalysisResult, LayoutCritiqueEnhanced } from '@/types/layoutAnalysis';
import type { VideoMotionAnalysis } from '@/types/motionConfig';

// Import from split modules
import { extractDesignSpec as _extractDesignSpec } from './GeminiDesignSpecExtractor';
import {
  buildComponentsFromSpec as _buildComponentsFromSpec,
  validateTypographyScaling,
} from './GeminiComponentBuilder';
import {
  critiqueLayout as _critiqueLayout,
  critiqueLayoutEnhanced as _critiqueLayoutEnhanced,
  type LayoutCritique,
} from './GeminiLayoutCritique';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';

// ============================================================================
// SERVICE CLASS
// ============================================================================

class GeminiLayoutService {
  private client: GoogleGenerativeAI | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.isAvailable = true;
    } else {
      console.warn('[GeminiLayoutService] API key not configured');
    }
  }

  // --- Helper ---
  private fileToPart(base64: string) {
    // Extract MIME type from data URI (handles PNG, JPEG, SVG, WebP, etc.)
    const mimeMatch = base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    // Remove the data URI prefix - broader regex handles uppercase and special chars
    const data = base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    return {
      inlineData: {
        data,
        mimeType,
      },
    };
  }

  // ==========================================================================
  // STAGE 1: The Architect (delegates to GeminiDesignSpecExtractor)
  // ==========================================================================

  async extractDesignSpec(imageBase64: string, instructions?: string): Promise<DesignSpec> {
    if (!this.client) throw new Error('Gemini API not configured');
    return _extractDesignSpec(this.client, this.fileToPart.bind(this), imageBase64, instructions);
  }

  // ==========================================================================
  // STAGE 2: The Engineer (delegates to GeminiComponentBuilder)
  // ==========================================================================

  async buildComponentsFromSpec(
    imageBase64: string,
    designSpec: DesignSpec,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    if (!this.client) throw new Error('Gemini API not configured');
    return _buildComponentsFromSpec(
      this.client,
      this.fileToPart.bind(this),
      imageBase64,
      designSpec,
      instructions
    );
  }

  // ==========================================================================
  // TWO-STAGE ORCHESTRATOR
  // ==========================================================================

  /**
   * Two-Stage Analysis: Extract DesignSpec, then build components
   * This is the recommended approach.
   */
  async analyzeImageTwoStage(
    imageBase64: string,
    instructions?: string
  ): Promise<LayoutAnalysisResult> {
    console.log('[GeminiLayoutService] Starting two-stage analysis...');

    const result: LayoutAnalysisResult = {
      success: false,
      components: [],
      designSpec: null,
      errors: [],
      warnings: [],
      metadata: {
        componentCount: 0,
        parseAttempts: 0,
        recoveredComponents: 0,
        designSpecExtracted: false,
        componentsBuilt: false,
      },
    };

    // Stage 1: Extract design specification
    console.log('[GeminiLayoutService] Stage 1: Extracting DesignSpec...');
    try {
      const designSpec = await this.extractDesignSpec(imageBase64, instructions);
      result.designSpec = designSpec;
      result.metadata.designSpecExtracted = true;
      console.log('[GeminiLayoutService] DesignSpec extracted:', {
        colors: designSpec.colorPalette.primary,
        structure: designSpec.structure.type,
        componentTypes: designSpec.componentTypes.length,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error extracting design spec';
      result.errors.push(`Stage 1 (DesignSpec): ${errorMsg}`);
      console.error('[GeminiLayoutService] Stage 1 failed:', errorMsg);
      // Continue to Stage 2 even if Stage 1 fails - components may still be extractable
    }

    // Stage 2: Build components using the spec
    console.log('[GeminiLayoutService] Stage 2: Building components from spec...');
    try {
      // Use default spec if Stage 1 failed
      const specForStage2 = result.designSpec || this.getDefaultDesignSpec();
      const components = await this.buildComponentsFromSpec(
        imageBase64,
        specForStage2,
        instructions
      );
      result.components = components;
      result.metadata.componentCount = components.length;
      result.metadata.componentsBuilt = true;
      console.log('[GeminiLayoutService] Built', components.length, 'components');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error building components';
      result.errors.push(`Stage 2 (Components): ${errorMsg}`);
      console.error('[GeminiLayoutService] Stage 2 failed:', errorMsg);
    }

    // Determine overall success
    result.success = result.metadata.componentsBuilt && result.components.length > 0;

    // Add warning if design spec extraction failed but components succeeded
    if (!result.metadata.designSpecExtracted && result.metadata.componentsBuilt) {
      result.warnings.push(
        'Design specification extraction failed; using default colors. Layout may not match original design precisely.'
      );
    }

    return result;
  }

  /**
   * Get default design spec for fallback scenarios
   */
  private getDefaultDesignSpec(): DesignSpec {
    console.warn(
      '[GeminiLayoutService] Stage 1 design spec extraction failed — using visible neutral defaults.'
    );
    return {
      colorPalette: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        accent: '#8b5cf6',
        background: '#ffffff',
        surface: '#f9fafb',
        text: '#111827',
        textMuted: '#6b7280',
        border: '#e5e7eb',
        additional: [],
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSizes: { h1: '48px', h2: '36px', h3: '24px', body: '16px', small: '14px' },
        fontWeights: { heading: 700, body: 400, bold: 600 },
      },
      spacing: {
        unit: 8,
        scale: [4, 8, 12, 16, 24, 32, 48, 64],
        containerPadding: '24px',
        sectionGap: '48px',
      },
      structure: {
        type: 'header-top',
        hasHeader: true,
        hasSidebar: false,
        hasFooter: true,
        mainContentWidth: 'standard',
      },
      componentTypes: [],
      effects: {
        borderRadius: '8px',
        shadows: 'subtle',
        hasGradients: false,
        hasBlur: false,
      },
      vibe: 'Neutral',
      confidence: 0.1, // Very low confidence — signals this is a fallback
    } as DesignSpec;
  }

  // ==========================================================================
  // LEGACY: Single-stage analysis (kept for backward compatibility)
  // ==========================================================================

  async analyzeImage(
    imageBase64: string,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      You are an expert UI designer with pixel-perfect vision. Analyze this screenshot and create a complete JSON representation of EVERY visible UI element.

      USER INSTRUCTIONS: ${instructions || 'Create a pixel-perfect replica of this design.'}

      YOUR TASK:
      Return a JSON array where EACH visible element (text, button, image, icon, container, etc.) is a separate object.

      REQUIRED JSON SCHEMA FOR EACH COMPONENT:
      {
        "id": "unique-descriptive-id",
        "type": "header|sidebar|hero|cards|navigation|footer|form|table|carousel|timeline|stepper|stats|testimonials|pricing|features|cta|breadcrumb|pagination|tabs|modal-trigger|search-bar|user-menu|logo|content-section|image-gallery|video-player|map|chart|button|input|list|menu|modal|dropdown|badge|avatar|divider|progress|unknown",
        "bounds": {
          "top": <number 0-100, percentage from top of viewport>,
          "left": <number 0-100, percentage from left edge>,
          "width": <number 0-100, percentage of viewport width>,
          "height": <number 0-100, percentage of viewport height>
        },
        "style": {
          "backgroundColor": "<exact hex color like #1a1a2e - NEVER use 'transparent' or 'white' - use the ACTUAL visible color>",
          "textColor": "<exact hex color - measure the actual text color you see>",
          "fontSize": "<exact size like 48px, 16px>",
          "fontWeight": "<bold|normal|600|700>",
          "padding": "<exact value like 16px or 12px 24px>",
          "borderRadius": "<exact value like 8px, 12px>",
          "borderColor": "<hex color if bordered>",
          "borderWidth": "<1px, 2px etc>",
          "shadow": "<box-shadow value if present>",
          "customCSS": { "<any other CSS properties>": "<values>" }
        },
        "content": {
          "text": "<actual text content you can read - be thorough, extract ALL visible text>",
          "hasImage": true/false,
          "hasIcon": true/false
        },
        "confidence": <0.0-1.0>
      }

      CRITICAL REQUIREMENTS:
      1. **EXHAUSTIVE DETECTION**: Find 20-50+ components. Include EVERY:
         - Heading, paragraph, and text element
         - Button, link, and clickable element
         - Image, icon, and graphic
         - Input field, form element
         - Card, container, section
         - Navigation item, menu item
         - Badge, tag, label

      2. **PIXEL-PERFECT BOUNDS**: Measure precisely where each element sits:
         - top: 0 = very top, 50 = middle, 100 = bottom
         - left: 0 = left edge, 50 = center, 100 = right edge
         - width/height: as percentage of total viewport

      3. **EXTRACT ACTUAL TEXT**: Read ALL visible text and put it in content.text
         - DO NOT leave text empty - extract everything you can read
         - For logos, extract the company/brand name
         - For buttons, extract the button text
         - For headings, extract the full heading text

      4. **MEASURE ACTUAL COLORS**: Look at the screenshot and identify the REAL colors:
         - DO NOT use "transparent" - instead measure what color you actually see
         - DO NOT use "white" unless the background is truly #FFFFFF
         - For dark backgrounds, use colors like #1a1a1a, #2d2d2d, #000000
         - For red backgrounds, use colors like #cc0000, #ff0000, #8b0000
         - For blue backgrounds, use colors like #0066cc, #1e3a8a, #003d82
         - ALWAYS use exact hex codes based on what you see

      5. **USE EXACT CSS VALUES**: No Tailwind classes. Use "padding": "16px", "fontSize": "24px", "backgroundColor": "#1a1a2e"

      6. **UNIQUE IDS**: Give each component a descriptive ID like "header-logo", "hero-main-heading", "cta-primary-button", "footer-social-links"

      SPECIAL RULE FOR COLORS:
      - If an element appears to have a dark background, measure the darkness and return a hex like #1a1a1a or #2d2d2d
      - If an element has a colored background (red, blue, green, etc.), return the actual hex color
      - Only use "transparent" if the element truly has no background and you can see through to elements behind it
      - When in doubt, provide a color - it's better to have a slightly wrong color than "transparent"

      TYPOGRAPHY SIZING:
      - Font sizes must be proportional to the component's bounds height
      - Max fontSize ≈ (height% / 100) × 800 × 0.4 pixels. Example: height 5% → max ~16px, height 10% → max ~32px
      - Always include lineHeight (1.2 or 1.4) for text elements
      - For single-line text (nav items, buttons): add "whiteSpace": "nowrap" in customCSS

      Return ONLY the JSON array. No markdown, no explanation.
    `;

    const imagePart = this.fileToPart(imageBase64);
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());
      const { components: sanitizedComponents, errors } = sanitizeComponents(rawData);
      if (errors.length > 0) {
        console.warn('[GeminiLayoutService] Validation issues in analyzeImage:', errors);
      }
      // Infer layout for containers missing layout data
      const withInferredLayouts = inferContainerLayouts(sanitizedComponents);
      // Validate typography scaling to prevent font overflow
      const withValidatedTypography = validateTypographyScaling(withInferredLayouts);
      // Resolve root overlaps
      const components = resolveRootOverlaps(withValidatedTypography);
      return components;
    } catch (e) {
      console.error('Failed to parse Gemini response', e);
      return [];
    }
  }

  // ==========================================================================
  // VIDEO ANALYSIS
  // ==========================================================================

  async analyzeVideoFlow(frames: string[], instructions?: string): Promise<VideoMotionAnalysis> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Analyze these 3 video frames (Start, Middle, End) to reverse-engineer the web animations.

      USER INSTRUCTIONS: ${instructions || 'Analyze the natural motion flow.'}

      Look for:
      1. **Entrance Animations**: Do elements fade in? Slide up? Scale up?
      2. **Timing**: Based on the difference between frames, estimate duration.
      3. **Scroll Parallax**: Do background elements move slower than foreground?

      Return a 'VideoMotionAnalysis' JSON object describing the detected framer-motion configs.
    `;

    // Convert all frames to parts
    const imageParts = frames.map((f) => this.fileToPart(f));

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;

    try {
      return JSON.parse(response.text()) as VideoMotionAnalysis;
    } catch (e) {
      console.error('Failed to parse Video Motion response', e);
      return {
        keyframes: { start: 0, end: 1 },
        transitions: [],
        hoverEffects: false,
        scrollEffects: false,
      };
    }
  }

  // ==========================================================================
  // CRITIQUE (delegates to GeminiLayoutCritique)
  // ==========================================================================

  async critiqueLayout(originalImage: string, generatedImage: string): Promise<LayoutCritique> {
    if (!this.client) throw new Error('Gemini API not configured');
    return _critiqueLayout(this.client, this.fileToPart.bind(this), originalImage, generatedImage);
  }

  async critiqueLayoutEnhanced(
    originalImage: string,
    generatedImage: string,
    components: DetectedComponentEnhanced[],
    targetFidelity: number = 95
  ): Promise<LayoutCritiqueEnhanced> {
    if (!this.client) throw new Error('Gemini API not configured');
    return _critiqueLayoutEnhanced(
      this.client,
      this.fileToPart.bind(this),
      originalImage,
      generatedImage,
      components,
      targetFidelity
    );
  }

  // ==========================================================================
  // COMPONENT EDITING
  // ==========================================================================

  async editComponent(
    component: DetectedComponentEnhanced,
    prompt: string
  ): Promise<DetectedComponentEnhanced> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const systemPrompt = `
      You constitute the "Mutation Engine" of a Zero-Preset Layout Builder.

      Task: Modify the given JSON component based on the User's Request.
      User Request: "${prompt}"

      Input Component:
      ${JSON.stringify(component, null, 2)}

      Rules:
      1. Return ONLY the modified component JSON.
      2. If the request implies a style change (e.g. "make blue"), update 'style'.
      3. If the request implies content change (e.g. "change text"), update 'content'.
      4. Maintain the 'id' and 'type' unless explicitly asked to change structure.
    `;

    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());
      // Merge with original component to preserve bounds if AI omits them
      const merged = { ...component, ...rawData };
      const { components } = sanitizeComponents([merged]);
      return components[0] || component; // Fallback to original if validation fails
    } catch (e) {
      console.error('Failed to parse Edit response', e);
      return component; // Fallback to original
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let geminiLayoutService: GeminiLayoutService | null = null;

export function getGeminiLayoutService(): GeminiLayoutService {
  if (!geminiLayoutService) {
    geminiLayoutService = new GeminiLayoutService();
  }
  return geminiLayoutService;
}
