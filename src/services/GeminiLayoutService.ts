/**
 * Gemini Layout Service
 *
 * Core intelligence engine for the "Ultimate Layout Builder".
 * Uses Gemini 3 Flash for high-speed multimodal analysis of:
 * - Images (Layout Detection)
 * - Videos (Motion & Flow Extraction)
 * - Hybrid Inputs (Layout + Style mixing)
 *
 * Capabilities:
 * - "Vision Loop": Critiques generated layouts against originals
 * - "Motion Extraction": Analyzes video keyframes for animation configs
 * - "Zero-Preset": Detects arbitrary values (px, hex) for exact replication
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DetectedComponentEnhanced, PageAnalysis, LayoutStructure } from '@/types/layoutDesign';
import { sanitizeComponents } from '@/utils/layoutValidation';
import type { DesignSpec } from '@/types/designSpec';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';
// const MODEL_PRO_IMAGE = 'gemini-3-pro-preview'; // Future use for assets

interface VideoMotionAnalysis {
  keyframes: {
    start: number; // 0-1 percentage
    end: number;
  };
  transitions: {
    type: 'fade' | 'slide' | 'scale' | 'none';
    duration: number; // ms
    ease: string;
  }[];
  hoverEffects: boolean;
  scrollEffects: boolean;
}

interface LayoutCritique {
  score: number; // 0-100
  discrepancies: {
    componentId?: string;
    issue: string; // "Padding too small", "Wrong color"
    suggestion: string; // "Increase padding to 24px"
    correctionJSON?: Partial<DetectedComponentEnhanced>;
  }[];
}

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

  /**
   * STAGE 1: The Architect
   * Extract high-level design specification (colors, fonts, structure)
   * This provides context for Stage 2 to build accurate components
   */
  async extractDesignSpec(imageBase64: string, instructions?: string): Promise<DesignSpec> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are "The Architect" - a design system expert with exceptional vision.
      
      USER INSTRUCTIONS: ${instructions || 'Analyze this design.'}

      YOUR TASK: Extract the design system specification from this screenshot.
      DO NOT detect individual components yet. Focus on the DESIGN SYSTEM:

      Return this JSON structure:
      {
        "colorPalette": {
          "primary": "<hex>",
          "secondary": "<hex>", 
          "accent": "<hex>",
          "background": "<hex>",
          "surface": "<hex>",
          "text": "<hex>",
          "textMuted": "<hex>",
          "border": "<hex>",
          "additional": [
            {"name": "button-bg", "hex": "#...", "usage": "primary buttons"},
            {"name": "header-bg", "hex": "#...", "usage": "header background"}
          ]
        },
        "typography": {
          "headingFont": "font name or 'Inter' if unsure",
          "bodyFont": "font name or 'Inter' if unsure",
          "fontSizes": {
            "h1": "48px",
            "h2": "36px",
            "h3": "24px",
            "body": "16px",
            "small": "14px"
          },
          "fontWeights": {
            "heading": 700,
            "body": 400,
            "bold": 600
          }
        },
        "spacing": {
          "unit": 8,
          "scale": [4, 8, 12, 16, 24, 32, 48, 64],
          "containerPadding": "24px",
          "sectionGap": "48px"
        },
        "structure": {
          "type": "header-top|sidebar-left|sidebar-right|centered|split|dashboard",
          "hasHeader": true/false,
          "hasSidebar": true/false,
          "hasFooter": true/false,
          "mainContentWidth": "narrow|standard|wide|full"
        },
        "componentTypes": [
          {"type": "hero", "count": 1, "locations": ["top"]},
          {"type": "navigation", "count": 1, "locations": ["top"]},
          {"type": "cards", "count": 3, "locations": ["middle"]}
        ],
        "effects": {
          "borderRadius": "8px",
          "shadows": "subtle",
          "hasGradients": false,
          "hasBlur": false
        },
        "vibe": "Modern and minimalist" or "Bold and colorful" etc,
        "confidence": 0.9
      }

      FOCUS: Extract the DESIGN SYSTEM, not individual components.
      Return ONLY valid JSON. No markdown, no explanation.
    `;

    const imagePart = this.fileToPart(imageBase64);
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    try {
      const spec = JSON.parse(response.text());

      // Basic validation - ensure required fields exist with defaults
      if (!spec.colorPalette || !spec.typography || !spec.structure) {
        console.warn('[GeminiLayoutService] Incomplete DesignSpec, applying defaults');
        return {
          colorPalette: {
            primary: '#3b82f6',
            secondary: '#6b7280',
            accent: '#f59e0b',
            background: '#ffffff',
            surface: '#f3f4f6',
            text: '#1f2937',
            textMuted: '#6b7280',
            border: '#e5e7eb',
            ...spec.colorPalette,
          },
          typography: {
            headingFont: 'Inter',
            bodyFont: 'Inter',
            fontSizes: { h1: '48px', h2: '36px', h3: '24px', body: '16px', small: '14px' },
            fontWeights: { heading: 700, body: 400, bold: 600 },
            ...spec.typography,
          },
          spacing: {
            unit: 8,
            scale: [4, 8, 12, 16, 24, 32, 48, 64],
            containerPadding: '24px',
            sectionGap: '48px',
            ...spec.spacing,
          },
          structure: {
            type: 'header-top',
            hasHeader: true,
            hasSidebar: false,
            hasFooter: true,
            mainContentWidth: 'standard',
            ...spec.structure,
          },
          componentTypes: spec.componentTypes || [],
          effects: {
            borderRadius: '8px',
            shadows: 'subtle',
            hasGradients: false,
            hasBlur: false,
            ...spec.effects,
          },
          vibe: spec.vibe || 'Modern and clean',
          confidence: spec.confidence || 0.8,
        } as DesignSpec;
      }

      return spec as DesignSpec;
    } catch (e) {
      console.error('[GeminiLayoutService] Failed to parse DesignSpec', e);
      throw new Error('Failed to extract design specification');
    }
  }

  /**
   * STAGE 2: The Engineer
   * Build specific component list using the DesignSpec from Stage 1
   * Colors are provided, so no guessing needed
   */
  async buildComponentsFromSpec(
    imageBase64: string,
    designSpec: DesignSpec,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are "The Engineer" - a pixel-perfect layout reconstruction specialist.

      USER INSTRUCTIONS: ${instructions || 'Build component list.'}

      DESIGN SPEC (from Stage 1 - The Architect):
      ${JSON.stringify(designSpec, null, 2)}

      YOUR TASK: Create a JSON Scene Graph of EVERY visible UI element.

      COORDINATE SYSTEM: Use normalized 0-1000 scale where:
      - 0 = left/top edge of the image
      - 1000 = right/bottom edge of the image
      - 500 = center of the image

      This gives you 10x more precision than percentages!

      For EACH visible element, return:
      {
        "id": "descriptive-unique-id",
        "type": "header|logo|navigation|hero|button|text|image|card|input|link|icon|container|section|footer|sidebar|menu|badge|avatar|divider|list|unknown",
        "bounds": {
          "top": <0-1000 from top edge>,
          "left": <0-1000 from left edge>,
          "width": <0-1000 element width>,
          "height": <0-1000 element height>
        },
        "style": {
          "backgroundColor": "<hex from designSpec.colorPalette>",
          "textColor": "<hex from designSpec.colorPalette>",
          "fontSize": "<px value from designSpec.typography>",
          "fontWeight": "<weight from designSpec.typography>",
          "padding": "<px value from designSpec.spacing>",
          "borderRadius": "<px value from designSpec.effects>"
        },
        "content": {
          "text": "<EXACT text you can read - be thorough>",
          "hasImage": true/false,
          "hasIcon": true/false
        },
        "zIndex": <number based on visual layer: 1-10 backgrounds, 11-50 content, 51-100 interactive, 100+ overlays>,
        "confidence": 0.9
      }

      CRITICAL RULES:

      1. **DETECT EVERY ELEMENT INDIVIDUALLY**:
         - Each heading = separate component
         - Each paragraph = separate component
         - Each button = separate component
         - Each link = separate component
         - Each image = separate component
         - Each icon = separate component
         - Each input field = separate component
         - Each card = separate component

      2. **DO NOT NEST EVERYTHING IN ONE CONTAINER**:
         Example: If you see a header with logo + nav links + CTA button, return:
         - "header-bg" (background container, zIndex: 1, bounds covering full header area)
         - "header-logo" (the logo image/text, zIndex: 2, precise bounds)
         - "nav-link-home" (first nav link, zIndex: 2, precise bounds)
         - "nav-link-about" (second nav link, zIndex: 2, precise bounds)
         - "nav-link-services" (third nav link, zIndex: 2, precise bounds)
         - "header-cta-button" (CTA button, zIndex: 3, precise bounds)
         That's 6 components for ONE header section!

      3. **UNIQUE BOUNDS FOR EACH ELEMENT**:
         A button at top-right corner of a header should have bounds like:
         { "top": 20, "left": 850, "width": 120, "height": 40 }
         NOT the same bounds as its parent container!

      4. **ASSIGN Z-INDEX BY VISUAL LAYER**:
         - Background/container elements: zIndex 1-10
         - Text and content elements: zIndex 11-50
         - Interactive elements (buttons, links): zIndex 51-100
         - Overlays, modals, tooltips: zIndex 100+

      5. **MINIMUM 20 COMPONENTS** for any real UI
         A typical landing page has 30-50+ individual elements.
         Count them: logo + nav links + hero heading + hero subtext + hero button + hero image + feature cards + footer links...

      6. **USE DESIGN SPEC VALUES**:
         - Colors from designSpec.colorPalette
         - Font sizes from designSpec.typography.fontSizes
         - Spacing from designSpec.spacing.scale
         - Border radius from designSpec.effects.borderRadius

      Return ONLY a JSON array of components. No markdown, no explanation, no wrapping object.
    `;

    const imagePart = this.fileToPart(imageBase64);
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());
      const { components, errors } = sanitizeComponents(rawData);
      if (errors.length > 0) {
        console.warn('[GeminiLayoutService] Validation issues in buildComponentsFromSpec:', errors);
      }
      return components;
    } catch (e) {
      console.error('[GeminiLayoutService] Failed to parse components', e);
      return [];
    }
  }

  /**
   * Two-Stage Analysis: Extract DesignSpec, then build components
   * This is the new recommended approach
   */
  async analyzeImageTwoStage(
    imageBase64: string,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    console.log('[GeminiLayoutService] Starting two-stage analysis...');

    // Stage 1: Extract design specification
    console.log('[GeminiLayoutService] Stage 1: Extracting DesignSpec...');
    const designSpec = await this.extractDesignSpec(imageBase64, instructions);
    console.log('[GeminiLayoutService] DesignSpec extracted:', {
      colors: designSpec.colorPalette.primary,
      structure: designSpec.structure.type,
      componentTypes: designSpec.componentTypes.length,
    });

    // Stage 2: Build components using the spec
    console.log('[GeminiLayoutService] Stage 2: Building components from spec...');
    const components = await this.buildComponentsFromSpec(imageBase64, designSpec, instructions);
    console.log('[GeminiLayoutService] Built', components.length, 'components');

    return components;
  }

  /**
   * LEGACY: Single-stage analysis (kept for backward compatibility)
   * Analyze an image to extract pixel-perfect layout components
   * Uses Gemini 3 Flash for speed and high context window
   */
  async analyzeImage(
    imageBase64: string,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: {
        responseMimeType: 'application/json',
        // Note: thinking_level parameter not yet supported in SDK, will be added in future update
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

      Return ONLY the JSON array. No markdown, no explanation.
    `;

    const imagePart = this.fileToPart(imageBase64);
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());
      const { components, errors } = sanitizeComponents(rawData);
      if (errors.length > 0) {
        console.warn('[GeminiLayoutService] Validation issues in analyzeImage:', errors);
      }
      return components;
    } catch (e) {
      console.error('Failed to parse Gemini response', e);
      return [];
    }
  }

  /**
   * Analyze video keyframes to extract motion and flow
   * @param frames Array of base64 images (Start, Middle, End)
   */
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

  /**
   * The "Vision Loop" Critiquer
   * Compares the original reference vs. the generated output (screenshot)
   */
  async critiqueLayout(originalImage: string, generatedImage: string): Promise<LayoutCritique> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
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

    const originalPart = this.fileToPart(originalImage);
    const generatedPart = this.fileToPart(generatedImage);

    const result = await model.generateContent([prompt, originalPart, generatedPart]);
    const response = result.response;

    try {
      return JSON.parse(response.text()) as LayoutCritique;
    } catch (e) {
      console.error('Failed to parse Critique response', e);
      return { score: 0, discrepancies: [] };
    }
  }

  /**
   * Edit a specific component based on User Instruction
   */
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

  // --- Helper ---
  private fileToPart(base64: string) {
    return {
      inlineData: {
        data: base64.replace(/^data:image\/[a-z]+;base64,/, ''),
        mimeType: 'image/jpeg',
      },
    };
  }
}

// Singleton export
let geminiLayoutService: GeminiLayoutService | null = null;

export function getGeminiLayoutService(): GeminiLayoutService {
  if (!geminiLayoutService) {
    geminiLayoutService = new GeminiLayoutService();
  }
  return geminiLayoutService;
}
