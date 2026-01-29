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
import type { LayoutAnalysisResult, LayoutCritiqueEnhanced, LayoutDiscrepancy } from '@/types/layoutAnalysis';

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
            // IMPORTANT: List ALL unique colors visible in the image
            {"name": "button-bg", "hex": "#...", "usage": "primary buttons"},
            {"name": "header-bg", "hex": "#...", "usage": "header background"},
            {"name": "card-border", "hex": "#...", "usage": "card borders"},
            // Include: gradients, shadows, hover states, dividers, icons, etc.
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

      IMPORTANT FOR COLORS: Extract ALL unique colors visible in the image.
      The more complete the color palette, the better Stage 2 can match the design.
      Include subtle variations (e.g., both #f3f4f6 and #f9fafb if both appear).
      Don't limit yourself to named roles - capture every distinct color you see.

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
            additional: [],
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

      YOUR TASK: Create a HIERARCHICAL JSON Scene Graph of every visible UI element.

      COORDINATE SYSTEM: Use normalized 0-1000 scale where:
      - 0 = left/top edge of the image/parent
      - 1000 = right/bottom edge of the image/parent
      - 500 = center

      COMPONENT ROLES:
      1. "container" - Has children, uses flex/grid layout to arrange them
      2. "leaf" - No children, renders actual content (text, image, button, icon)
      3. "overlay" - Positioned absolutely over other content (modals, tooltips, dropdowns)

      For EACH element, return:
      {
        "id": "descriptive-unique-id",
        "type": "header|sidebar|hero|section|container|cards|navigation|footer|form|logo|button|text|image|input|link|icon|badge|avatar|divider|list|menu|card|unknown",
        "role": "container|leaf|overlay",
        "parentId": "<parent-id or null for root sections>",
        "children": ["child-id-1", "child-id-2"],
        "bounds": {
          "top": <0-1000>,
          "left": <0-1000>,
          "width": <0-1000>,
          "height": <0-1000>
        },
        "layout": {
          "type": "flex|grid|none",
          "direction": "row|column",
          "gap": "16px",
          "justify": "start|center|end|between",
          "align": "start|center|end|stretch"
        },
        "style": {
          "backgroundColor": "<hex - MEASURE from image, use designSpec colors when they match>",
          "textColor": "<hex - MEASURE from image>",
          "fontSize": "<px value>",
          "fontWeight": "<weight>",
          "padding": "<px value>",
          "borderRadius": "<px value>"
        },
        "content": {
          "text": "<EXACT visible text>",
          "hasImage": true/false,
          "hasIcon": true/false
        },
        "zIndex": <number>,
        "confidence": 0.9
      }

      HIERARCHY RULES:

      1. **DETECT VISUAL CONTAINERS**:
         - Headers are containers with logo, nav, and CTA as children
         - Hero sections contain heading, subheading, and buttons as children
         - Card groups are containers with individual cards as children
         - Footers contain columns which contain links

      2. **ASSIGN PARENT-CHILD RELATIONSHIPS**:
         Every component (except root sections) MUST have a parentId.

         Example header structure:
         - "header-container" (parentId: null, role: "container", children: ["logo", "nav-container", "cta-button"])
         - "logo" (parentId: "header-container", role: "leaf")
         - "nav-container" (parentId: "header-container", role: "container", children: ["nav-1", "nav-2", "nav-3"])
         - "nav-1" (parentId: "nav-container", role: "leaf")
         - "nav-2" (parentId: "nav-container", role: "leaf")
         - "nav-3" (parentId: "nav-container", role: "leaf")
         - "cta-button" (parentId: "header-container", role: "leaf")

      3. **SPECIFY CONTAINER LAYOUTS**:
         Containers MUST include a "layout" object:
         - Header with horizontal items: { "type": "flex", "direction": "row", "justify": "between", "align": "center" }
         - Card grid: { "type": "grid", "columns": "repeat(3, 1fr)", "gap": "24px" }
         - Vertical stack: { "type": "flex", "direction": "column", "gap": "16px" }

      4. **ROOT COMPONENTS** (parentId: null):
         These are major page sections positioned with absolute bounds on the viewport:
         - header (top: 0, height: ~60-80)
         - hero (below header)
         - features/content sections
         - footer (bottom)

         Typically 3-7 root sections for a landing page.

      5. **CHILD BOUNDS ARE RELATIVE**:
         - Root components: bounds relative to viewport (0-1000)
         - Children: bounds relative to parent's content area (0-1000 within parent)

      6. **LEAF COMPONENTS**:
         These have role: "leaf", no children array, and render actual content:
         - Buttons, text, images, icons, links, inputs, badges, avatars

      7. **COLOR HANDLING - VISUAL FIDELITY OVER SYSTEM CONSISTENCY**:
         - MEASURE the actual hex color from the image for each component
         - Use designSpec.colorPalette colors when they closely match what you see
         - If a component's actual color is NOT in the Design Spec, use the EXACT measured hex
         - NEVER return undefined or empty string for visible colors - always provide the hex
         - Transparent backgrounds should explicitly use "transparent" or "rgba(0,0,0,0)"
         - Font sizes from designSpec.typography.fontSizes
         - Spacing from designSpec.spacing.scale

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

      // Debug: Log Stage 2 output to verify colors and hierarchy
      console.log('[GeminiLayoutService] Stage 2 result:', {
        count: components.length,
        hasHierarchy: components.some(c => c.parentId || (c.children && c.children.length > 0)),
        colorsSample: components.slice(0, 5).map(c => ({
          id: c.id,
          bg: c.style?.backgroundColor,
          text: c.style?.textColor,
          role: c.role,
          parentId: c.parentId,
        }))
      });

      return components;
    } catch (e) {
      console.error('[GeminiLayoutService] Failed to parse components', e);
      return [];
    }
  }

  /**
   * Two-Stage Analysis: Extract DesignSpec, then build components
   * This is the new recommended approach
   *
   * Returns a structured result with both components AND designSpec
   * so the design system is preserved throughout the pipeline.
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error extracting design spec';
      result.errors.push(`Stage 1 (DesignSpec): ${errorMsg}`);
      console.error('[GeminiLayoutService] Stage 1 failed:', errorMsg);
      // Continue to Stage 2 even if Stage 1 fails - components may still be extractable
    }

    // Stage 2: Build components using the spec
    console.log('[GeminiLayoutService] Stage 2: Building components from spec...');
    try {
      // Use default spec if Stage 1 failed
      const specForStage2 = result.designSpec || this.getDefaultDesignSpec();
      const components = await this.buildComponentsFromSpec(imageBase64, specForStage2, instructions);
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
      result.warnings.push('Design specification extraction failed; using default colors. Layout may not match original design precisely.');
    }

    return result;
  }

  /**
   * Get default design spec for fallback scenarios
   */
  private getDefaultDesignSpec(): DesignSpec {
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
      vibe: 'Modern and clean',
      confidence: 0.5, // Low confidence for default
    } as DesignSpec;
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
   * The "Vision Loop" Critiquer (Legacy)
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
   * Enhanced Vision Loop Critiquer for Self-Healing
   *
   * Compares original design vs generated layout and returns structured
   * corrections that can be automatically applied by the AutoFixEngine.
   *
   * @param originalImage - Base64 encoded original design reference
   * @param generatedImage - Base64 encoded screenshot of current layout
   * @param components - Current component array for context
   * @param targetFidelity - Target fidelity score (default: 95)
   */
  async critiqueLayoutEnhanced(
    originalImage: string,
    generatedImage: string,
    components: DetectedComponentEnhanced[],
    targetFidelity: number = 95
  ): Promise<LayoutCritiqueEnhanced> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    // Build component context for the AI
    const componentContext = components.map((c) => ({
      id: c.id,
      type: c.type,
      bounds: c.bounds,
      hasText: !!c.content?.text,
      backgroundColor: c.style?.backgroundColor,
      textColor: c.style?.textColor,
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
            "issue": "color_drift|spacing_error|typography_mismatch|position_offset|size_mismatch|missing_element|extra_element|content_mismatch",
            "severity": "minor|moderate|critical",
            "expected": "<what it should be, e.g., '#FF0000' or '24px'>",
            "actual": "<what it currently is>",
            "correctionJSON": {
              "style": { "<property>": "<corrected value>" }
            }
          }
        ],
        "passesThreshold": <true if fidelityScore >= ${targetFidelity}>,
        "recommendation": "accept|refine|regenerate"
      }

      **Severity Guidelines**:
      - critical: Major visual difference that breaks the design (wrong colors, missing elements, broken layout)
      - moderate: Noticeable difference that affects quality (spacing off by >10px, wrong font weight)
      - minor: Small difference that most users wouldn't notice (spacing off by <5px, slight color variation)

      **Issue Types**:
      - color_drift: Background or text color doesn't match
      - spacing_error: Padding, margin, or gap is incorrect
      - typography_mismatch: Font size, weight, or family is wrong
      - position_offset: Element is in the wrong position
      - size_mismatch: Element has wrong dimensions
      - missing_element: Element exists in original but not in generated
      - extra_element: Element exists in generated but not in original
      - content_mismatch: Text content is different

      **Recommendation Logic**:
      - "accept": fidelityScore >= ${targetFidelity} and no critical issues
      - "refine": fidelityScore >= 70 and fixable discrepancies
      - "regenerate": fidelityScore < 70 or unfixable structural issues

      Return ONLY valid JSON. No markdown, no explanation.
    `;

    const originalPart = this.fileToPart(originalImage);
    const generatedPart = this.fileToPart(generatedImage);

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
        recommendation: critique.recommendation || (critique.fidelityScore >= targetFidelity ? 'accept' : 'refine'),
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
