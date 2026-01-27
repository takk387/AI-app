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
          "backgroundColor": "<exact hex color like #1a1a2e>",
          "textColor": "<exact hex color>",
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
          "text": "<actual text content you can read>",
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

      3. **EXTRACT ACTUAL TEXT**: Read all visible text and put it in content.text

      4. **USE EXACT CSS VALUES**: No Tailwind classes. Use "padding": "16px", "fontSize": "24px", "backgroundColor": "#1a1a2e"

      5. **UNIQUE IDS**: Give each component a descriptive ID like "header-logo", "hero-main-heading", "cta-primary-button", "footer-social-links"

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
