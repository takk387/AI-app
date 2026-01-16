/**
 * Gemini Layout Service
 *
 * Provides visual analysis capabilities using Google's Gemini Pro 3 model.
 * Acts as the "Creative Director" in the dual-model Layout Builder pipeline.
 * Handles screenshot analysis, color extraction, layout structure detection,
 * and "vibe" interpretation.
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import type {
  PageReference,
  PageAnalysis,
  DetectedComponentEnhanced,
  DetectedNavigation,
  NavigationItem,
  InferredRoute,
  MultiPageAnalysisResult,
  PageRole,
} from '@/types/layoutDesign';
import { GEMINI_LAYOUT_BUILDER_SYSTEM_PROMPT } from '@/prompts/geminiLayoutBuilderPrompt';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract MIME type from a base64 data URL
 * Returns the actual MIME type to ensure correct image format is sent to Gemini
 */
function getMimeType(imageBase64: string): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
  const match = imageBase64.match(/^data:(image\/[^;]+);base64,/);
  if (match) {
    const mimeType = match[1];
    if (
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/gif' ||
      mimeType === 'image/webp'
    ) {
      return mimeType;
    }
  }
  // Default to PNG if we can't determine the type
  return 'image/png';
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface VisualAnalysis {
  layoutType:
    | 'single-page'
    | 'dashboard'
    | 'landing'
    | 'e-commerce'
    | 'portfolio'
    | 'blog'
    | 'saas';
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  typography: {
    headingStyle: string;
    bodyStyle: string;
    headingWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
    bodyWeight: 'light' | 'normal' | 'medium';
    estimatedHeadingFont?: string;
    estimatedBodyFont?: string;
  };
  spacing: {
    density: 'compact' | 'normal' | 'relaxed';
    sectionPadding: 'sm' | 'md' | 'lg' | 'xl';
    componentGap: 'sm' | 'md' | 'lg';
  };
  components: DetectedComponent[];
  effects: {
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    shadows: 'none' | 'subtle' | 'medium' | 'strong';
    hasGradients: boolean;
    hasBlur: boolean;
    hasAnimations: boolean;
    backgroundEffect?: {
      type:
        | 'particles'
        | 'floating-shapes'
        | 'gradient-animation'
        | 'parallax-dots'
        | 'mesh-gradient'
        | 'aurora'
        | 'waves'
        | 'none';
      intensity: 'subtle' | 'medium' | 'strong';
      colors?: string[];
    };
  };
  vibe: string;
  vibeKeywords: string[];
  confidence: number;
}

export interface DetectedComponent {
  type:
    | 'header'
    | 'sidebar'
    | 'hero'
    | 'cards'
    | 'navigation'
    | 'footer'
    | 'form'
    | 'table'
    | 'carousel'
    | 'timeline'
    | 'stepper'
    | 'stats'
    | 'testimonials'
    | 'pricing'
    | 'features'
    | 'cta'
    | 'unknown';
  position: {
    area: 'top' | 'left' | 'right' | 'center' | 'bottom';
    approximateHeight?: string;
    approximateWidth?: string;
  };
  style: {
    variant?: string;
    hasBackground?: boolean;
    isFloating?: boolean;
    isSticky?: boolean;
  };
  confidence: number;
}

export interface DesignDirection {
  summary: string;
  suggestedChanges: SuggestedChange[];
  styleRecommendations: string[];
  accessibilityNotes: string[];
}

export interface SuggestedChange {
  property: string;
  currentValue?: string;
  suggestedValue: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface LayoutStructure {
  structure: 'single-page' | 'multi-page' | 'dashboard' | 'wizard' | 'split';
  hasHeader: boolean;
  hasSidebar: boolean;
  sidebarPosition?: 'left' | 'right';
  hasFooter: boolean;
  mainContentAreas: string[];
  estimatedComponentCount: number;
}

/**
 * Extracted styles from a reference image for selective application
 */
export interface ExtractedStyles {
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
  };
  typography: {
    fontFamily?: string;
    headingWeight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
    bodySize?: 'xs' | 'sm' | 'base' | 'lg';
    lineHeight?: 'tight' | 'normal' | 'relaxed';
  };
  spacing: {
    density?: 'compact' | 'normal' | 'relaxed';
    sectionPadding?: 'sm' | 'md' | 'lg' | 'xl';
    componentGap?: 'sm' | 'md' | 'lg';
  };
  effects: {
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    shadows?: 'none' | 'subtle' | 'medium' | 'strong';
    hasGradients?: boolean;
    hasBlur?: boolean;
    backgroundEffect?: {
      type:
        | 'particles'
        | 'floating-shapes'
        | 'gradient-animation'
        | 'parallax-dots'
        | 'mesh-gradient'
        | 'aurora'
        | 'waves'
        | 'none';
      intensity: 'subtle' | 'medium' | 'strong';
      colors?: string[];
    };
  };
  vibe: string;
  recommendations: string[];
}

export interface ColorPalette {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  colorScheme: 'light' | 'dark';
  harmony: 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'custom';
  mood: string;
}

export interface GeminiChatRequest {
  message: string;
  images?: string[]; // Base64 encoded images
  currentDesign?: Record<string, unknown>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface GeminiChatResponse {
  message: string;
  analysis?: VisualAnalysis;
  designUpdates?: Record<string, unknown>;
  suggestedActions?: Array<{ label: string; action: string }>;
  modelUsed: 'gemini';
}

// ============================================================================
// Gemini Service Class
// ============================================================================

class GeminiLayoutService {
  private client: GoogleGenerativeAI | null = null;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
  private cache: Map<string, VisualAnalysis> = new Map();
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      // Gemini 3 Flash is optimal for vision/multimodal tasks (3x faster, better visual understanding)
      const modelPriority = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      const modelToUse = modelPriority[0];
      this.model = this.client.getGenerativeModel({ model: modelToUse });
      this.isAvailable = true;
      console.log(`[GeminiLayoutService] Initialized with model: ${modelToUse}`);
    } else {
      console.warn('Gemini service: GOOGLE_API_KEY not configured');
      this.isAvailable = false;
    }
  }

  /**
   * Check if Gemini service is available
   */
  public checkAvailability(): boolean {
    return this.isAvailable && this.model !== null;
  }

  /**
   * Analyze a screenshot and extract visual design information
   */
  async analyzeScreenshot(imageBase64: string): Promise<VisualAnalysis> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(imageBase64);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const imagePart: Part = {
      inlineData: {
        mimeType: getMimeType(imageBase64),
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const prompt = `You are an expert visual designer analyzing a UI screenshot. Analyze this design and return a JSON object with the following structure:

{
  "layoutType": "single-page" | "dashboard" | "landing" | "e-commerce" | "portfolio" | "blog" | "saas",
  "colorPalette": {
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "accent": "#hexcode",
    "background": "#hexcode",
    "surface": "#hexcode",
    "text": "#hexcode",
    "textMuted": "#hexcode"
  },
  "typography": {
    "headingStyle": "description of heading style",
    "bodyStyle": "description of body text style",
    "headingWeight": "light" | "normal" | "medium" | "semibold" | "bold",
    "bodyWeight": "light" | "normal" | "medium",
    "estimatedHeadingFont": "font name guess",
    "estimatedBodyFont": "font name guess"
  },
  "spacing": {
    "density": "compact" | "normal" | "relaxed",
    "sectionPadding": "sm" | "md" | "lg" | "xl",
    "componentGap": "sm" | "md" | "lg"
  },
  "components": [
    {
      "type": "header" | "sidebar" | "hero" | "cards" | "navigation" | "footer" | "form" | "table" | "carousel" | "timeline" | "stepper" | "stats" | "testimonials" | "pricing" | "features" | "cta" | "unknown",
      "position": {
        "area": "top" | "left" | "right" | "center" | "bottom",
        "approximateHeight": "e.g., 80px or 10%",
        "approximateWidth": "e.g., 100% or 250px"
      },
      "style": {
        "variant": "style variant description",
        "hasBackground": true/false,
        "isFloating": true/false,
        "isSticky": true/false
      },
      "confidence": 0.0-1.0
    }
  ],
  "effects": {
    "borderRadius": "none" | "sm" | "md" | "lg" | "xl" | "full",
    "shadows": "none" | "subtle" | "medium" | "strong",
    "hasGradients": true/false,
    "hasBlur": true/false,
    "hasAnimations": true/false,
    "backgroundEffect": {
      "type": "particles" | "floating-shapes" | "gradient-animation" | "parallax-dots" | "mesh-gradient" | "aurora" | "waves" | "none",
      "intensity": "subtle" | "medium" | "strong",
      "colors": ["#hex1", "#hex2"]
    }
  },
  "vibe": "One sentence describing the overall aesthetic/vibe",
  "vibeKeywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.0-1.0
}

Analyze the screenshot carefully and extract the ACTUAL colors visible in the image.

CRITICAL COLOR EXTRACTION RULES:
- Extract the EXACT hex colors you see, not typical UI defaults
- Include ALL prominent colors: whites, light colors, pastels, greens, oranges
- If the image has a white or light background, use #FFFFFF or the actual light color
- Do NOT default to dark colors (#0F172A, #1E293B) unless the image is actually dark
- Primary color should be the most visually prominent accent/brand color
- Background should match what you actually see in the image

Identify all UI components. Describe the overall design aesthetic.

Return ONLY valid JSON, no markdown formatting or explanation.`;

    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse visual analysis response');
      }

      const analysis: VisualAnalysis = JSON.parse(jsonMatch[0]);

      // Cache the result
      this.cache.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('Gemini visual analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate layout direction based on user intent and reference image
   */
  async generateLayoutDirection(imageBase64: string, userIntent: string): Promise<DesignDirection> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const imagePart: Part = {
      inlineData: {
        mimeType: getMimeType(imageBase64),
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const prompt = `You are an expert visual designer. The user wants to: "${userIntent}"

Looking at this reference image, provide design direction. Return a JSON object:

{
  "summary": "Brief summary of the design direction",
  "suggestedChanges": [
    {
      "property": "property path like globalStyles.colors.primary",
      "currentValue": "current value if known",
      "suggestedValue": "suggested new value",
      "reason": "why this change helps achieve the user's goal",
      "priority": "high" | "medium" | "low"
    }
  ],
  "styleRecommendations": ["recommendation 1", "recommendation 2"],
  "accessibilityNotes": ["any accessibility considerations"]
}

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse design direction response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Gemini design direction failed:', error);
      throw error;
    }
  }

  /**
   * Extract color palette from an image
   */
  async extractColorPalette(imageBase64: string): Promise<ColorPalette> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const imagePart: Part = {
      inlineData: {
        mimeType: getMimeType(imageBase64),
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const prompt = `Analyze this image and extract its color palette. Return a JSON object:

{
  "colors": {
    "primary": "#hexcode - the dominant brand/accent color",
    "secondary": "#hexcode - secondary accent color",
    "accent": "#hexcode - highlight color",
    "background": "#hexcode - main background color",
    "surface": "#hexcode - card/surface color",
    "text": "#hexcode - primary text color"
  },
  "colorScheme": "light" | "dark",
  "harmony": "complementary" | "analogous" | "triadic" | "monochromatic" | "custom",
  "mood": "description of the color mood/feeling"
}

Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse color palette response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Gemini color extraction failed:', error);
      throw error;
    }
  }

  /**
   * Detect layout structure from an image
   */
  async detectLayoutStructure(imageBase64: string): Promise<LayoutStructure> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const imagePart: Part = {
      inlineData: {
        mimeType: getMimeType(imageBase64),
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const prompt = `Analyze the layout structure of this UI screenshot. Return a JSON object:

{
  "structure": "single-page" | "multi-page" | "dashboard" | "wizard" | "split",
  "hasHeader": true/false,
  "hasSidebar": true/false,
  "sidebarPosition": "left" | "right" | null,
  "hasFooter": true/false,
  "mainContentAreas": ["area1", "area2"],
  "estimatedComponentCount": number
}

Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse layout structure response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Gemini layout structure detection failed:', error);
      throw error;
    }
  }

  /**
   * Handle a chat message with optional images (for single-model Gemini requests)
   */
  async chat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const parts: Part[] = [];

    // Add system context
    const systemPrompt = this.buildSystemPrompt(request.currentDesign);
    parts.push({ text: systemPrompt });

    // Add conversation history
    if (request.conversationHistory) {
      for (const msg of request.conversationHistory.slice(-10)) {
        parts.push({ text: `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}` });
      }
    }

    // Add images if present
    if (request.images && request.images.length > 0) {
      for (const imageBase64 of request.images) {
        parts.push({
          inlineData: {
            mimeType: getMimeType(imageBase64),
            data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          },
        });
      }
    }

    // Add user message
    parts.push({ text: `User: ${request.message}` });

    try {
      const result = await this.model.generateContent(parts);
      const response = result.response;
      const text = response.text();

      // Try to extract JSON design updates if present
      let designUpdates: Record<string, unknown> | undefined;
      let analysis: VisualAnalysis | undefined;

      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.layoutType) {
            analysis = parsed as VisualAnalysis;
          } else {
            designUpdates = parsed;
          }
        } catch {
          // Not valid JSON, ignore
        }
      }

      return {
        message: text.replace(/```json\n?[\s\S]*?\n?```/g, '').trim(),
        analysis,
        designUpdates,
        suggestedActions: this.extractSuggestedActions(text),
        modelUsed: 'gemini',
      };
    } catch (error) {
      console.error('Gemini chat failed:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private buildSystemPrompt(currentDesign?: Record<string, unknown>): string {
    // Use the comprehensive system prompt from Phase 4
    const basePrompt = GEMINI_LAYOUT_BUILDER_SYSTEM_PROMPT;

    // Add current design context if available
    const contextSection = currentDesign
      ? `\n\n## Current Design Context\n\n${JSON.stringify(currentDesign, null, 2).slice(0, 2000)}`
      : '';

    return basePrompt + contextSection;
  }

  private extractSuggestedActions(text: string): Array<{ label: string; action: string }> {
    const actions: Array<{ label: string; action: string }> = [];

    // Extract common action patterns from response
    if (text.toLowerCase().includes('color')) {
      actions.push({ label: 'Apply colors', action: 'apply_colors' });
    }
    if (text.toLowerCase().includes('typography') || text.toLowerCase().includes('font')) {
      actions.push({ label: 'Apply typography', action: 'apply_typography' });
    }
    if (text.toLowerCase().includes('spacing') || text.toLowerCase().includes('padding')) {
      actions.push({ label: 'Apply spacing', action: 'apply_spacing' });
    }
    if (text.toLowerCase().includes('layout')) {
      actions.push({ label: 'Apply layout', action: 'apply_layout' });
    }

    return actions;
  }

  private getCacheKey(imageBase64: string): string {
    // Create a robust hash that samples the entire image to prevent collisions
    // Previously only used first 1000 chars, causing different images to return same cached colors
    let hash = 0;
    const len = imageBase64.length;
    // Sample every 100th character across the entire image for better distribution
    const step = Math.max(1, Math.floor(len / 1000));
    for (let i = 0; i < len; i += step) {
      const char = imageBase64.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    // Include length in key to further prevent collisions between different-sized images
    return `gemini-${len}-${hash.toString(36)}`;
  }

  /**
   * Extract applicable styles from a reference image
   * Returns structured style data that can be selectively applied
   */
  async extractApplicableStyles(imageBase64: string): Promise<ExtractedStyles> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const imagePart: Part = {
      inlineData: {
        mimeType: getMimeType(imageBase64),
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const prompt = `Analyze this design reference image and extract applicable styles.

Return a JSON object with these categories (all optional, only include what's clearly visible):

{
  "colors": {
    "primary": "#hex color for main brand color",
    "secondary": "#hex for secondary color",
    "accent": "#hex for accent/highlight color",
    "background": "#hex for main background",
    "surface": "#hex for card/surface backgrounds",
    "text": "#hex for main text color"
  },
  "typography": {
    "fontFamily": "detected or suggested font family",
    "headingWeight": "light|normal|medium|semibold|bold",
    "bodySize": "xs|sm|base|lg",
    "lineHeight": "tight|normal|relaxed"
  },
  "spacing": {
    "density": "compact|normal|relaxed",
    "sectionPadding": "sm|md|lg|xl",
    "componentGap": "sm|md|lg"
  },
  "effects": {
    "borderRadius": "none|sm|md|lg|xl|full",
    "shadows": "none|subtle|medium|strong",
    "hasGradients": true/false,
    "hasBlur": true/false,
    "backgroundEffect": {
      "type": "particles|floating-shapes|gradient-animation|parallax-dots|mesh-gradient|aurora|waves|none",
      "intensity": "subtle|medium|strong",
      "colors": ["#hex1", "#hex2"]
    }
  },
  "vibe": "one sentence describing the overall design vibe",
  "recommendations": ["array of specific style recommendations"]
}

Only include properties you can clearly identify from the image.
Return ONLY the JSON object, no markdown or explanation.`;

    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        colors: parsed.colors || {},
        typography: parsed.typography || {},
        spacing: parsed.spacing || {},
        effects: parsed.effects || {},
        vibe: parsed.vibe || '',
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('[GeminiLayoutService] extractApplicableStyles error:', error);
      throw error;
    }
  }

  // =========================================================================
  // MULTI-PAGE ANALYSIS METHODS
  // =========================================================================

  /**
   * Analyze a single page with enhanced component detection
   * Returns precise bounding boxes and hierarchy information
   */
  async analyzePageEnhanced(imageBase64: string, pageName?: string): Promise<PageAnalysis> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const imagePart: Part = {
      inlineData: {
        mimeType: getMimeType(imageBase64),
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const prompt = `You are an expert UI/UX analyst analyzing a UI for EXACT REPLICATION by a code generation system.
${pageName ? `This page is named: "${pageName}"` : ''}

CRITICAL MISSION: Every component you detect will be built into a real application by the Dynamic Phase Builder.
If you miss something, it won't exist in the final app. Be EXHAUSTIVE and PRECISE.

Your analysis feeds into:
1. Visual preview (DynamicLayoutRenderer) - renders the layout in real-time
2. Code generation (Dynamic Phase Builder) - generates production React components
3. Production deployment (AI App Builder) - deploys the working application

DETECTION REQUIREMENTS:
- Detect EVERY visible UI element, no matter how small
- Include structural components (header, footer, sidebar, navigation)
- Include content sections (hero, features, pricing, testimonials, stats, cta)
- Include interactive elements (buttons, inputs, forms, modals, dropdowns)
- Include data display (tables, charts, stats, badges, cards)
- Include navigation (tabs, breadcrumbs, pagination, menus)
- Include micro-elements (dividers, avatars, icons, tooltips, progress bars)

PRECISION REQUIREMENTS:
- Provide EXACT measurements as viewport percentages (0-100)
- Extract EXACT hex colors (no approximations like #000 or #FFF - use actual colors)
- Identify parent-child relationships (nested structure)
- Detect interactive states (hover, active, focus, disabled)
- Capture content samples (text, placeholders, labels)
- Note responsive indicators if visible

Return a JSON object with PRECISE measurements as percentages of viewport (0-100):

{
  "pageRole": "landing" | "dashboard" | "list" | "detail" | "form" | "auth" | "settings" | "profile" | "checkout" | "search" | "error" | "custom",
  "layoutType": "single-page" | "dashboard" | "landing" | "e-commerce" | "portfolio" | "blog" | "saas",
  "colorPalette": {
    "primary": "#EXACT_HEX",
    "secondary": "#EXACT_HEX",
    "accent": "#EXACT_HEX",
    "background": "#EXACT_HEX",
    "surface": "#EXACT_HEX",
    "text": "#EXACT_HEX",
    "textMuted": "#EXACT_HEX"
  },
  "typography": {
    "headingStyle": "description",
    "bodyStyle": "description",
    "headingWeight": "light" | "normal" | "medium" | "semibold" | "bold",
    "bodyWeight": "light" | "normal" | "medium",
    "estimatedHeadingFont": "font name",
    "estimatedBodyFont": "font name",
    "fontSize": { "heading": "24px", "body": "16px", "small": "14px" },
    "lineHeight": { "heading": "1.2", "body": "1.6" }
  },
  "spacing": {
    "density": "compact" | "normal" | "relaxed",
    "sectionPadding": "sm" | "md" | "lg" | "xl",
    "componentGap": "sm" | "md" | "lg",
    "margins": { "top": "16px", "bottom": "16px", "left": "24px", "right": "24px" }
  },
  "components": [
    {
      "id": "unique_id",
      "type": "header" | "sidebar" | "hero" | "cards" | "navigation" | "footer" | "form" | "table" | "carousel" | "stats" | "cta" | "breadcrumb" | "pagination" | "tabs" | "search-bar" | "user-menu" | "logo" | "content-section" | "image-gallery" | "chart" | "button" | "input" | "list" | "menu" | "modal" | "dropdown" | "badge" | "avatar" | "divider" | "progress" | "unknown",
      "bounds": {
        "top": 0,     // 0-100 percentage of viewport
        "left": 0,    // 0-100 percentage of viewport
        "width": 100, // 0-100 percentage of viewport
        "height": 8   // 0-100 percentage of viewport
      },
      "style": {
        "variant": "style description",
        "hasBackground": true/false,
        "backgroundColor": "#HEX if visible",
        "textColor": "#HEX if visible",
        "borderColor": "#HEX if visible",
        "borderWidth": "1px|2px|4px",
        "isFloating": true/false,
        "isSticky": true/false,
        "borderRadius": "none|sm|md|lg|xl|full",
        "shadow": "none|subtle|medium|strong",
        "padding": "sm|md|lg",
        "fontSize": "xs|sm|base|lg|xl",
        "fontWeight": "light|normal|medium|semibold|bold",
        "textAlign": "left|center|right",
        "display": "block|flex|grid|inline",
        "alignment": "start|center|end|between|around",
        "gap": "sm|md|lg"
      },
      "content": {
        "text": "Sample text if visible",
        "hasIcon": true/false,
        "hasImage": true/false,
        "itemCount": 0,
        "placeholder": "placeholder text if input"
      },
      "parentId": "parent_component_id or null",
      "children": ["child_id_1", "child_id_2"],
      "zIndex": 1,
      "navigatesTo": "page_slug if this is a navigation link",
      "isNavigationItem": true/false,
      "isInteractive": true/false,
      "confidence": 0.0-1.0
    }
  ],
  "effects": {
    "borderRadius": "none" | "sm" | "md" | "lg" | "xl" | "full",
    "shadows": "none" | "subtle" | "medium" | "strong",
    "hasGradients": true/false,
    "hasBlur": true/false,
    "hasAnimations": true/false,
    "backgroundEffect": {
      "type": "particles" | "floating-shapes" | "gradient-animation" | "parallax-dots" | "mesh-gradient" | "aurora" | "waves" | "none",
      "intensity": "subtle" | "medium" | "strong",
      "colors": ["#hex1", "#hex2"]
    }
  },
  "vibe": "One sentence describing the aesthetic",
  "vibeKeywords": ["keyword1", "keyword2"],
  "confidence": 0.0-1.0
}

CRITICAL RULES FOR EXACT REPLICATION:
1. Extract EXACT hex colors visible in the image (not approximations)
2. Provide PRECISE bounding boxes as viewport percentages (measure carefully)
3. Identify parent-child relationships between components (nested structure)
4. Mark navigation items and their destinations if detectable
5. Include ALL visible UI components, not just major sections - aim for 20-30+ components per complex layout
6. For each component, extract:
   - Exact background color, text color, border color
   - Font size and weight as they appear
   - Padding/spacing values
   - Border radius, shadows
   - Alignment and layout properties
7. Capture sample text content from components when visible
8. Detect interactive elements (buttons, links, inputs)
9. Identify component variants (primary button vs secondary, filled vs outlined)
10. Note any special states (hover styles, active states, disabled states)

COMPONENT TYPES SUPPORTED (30+ types):
header, sidebar, hero, cards, navigation, footer, form, table, carousel, timeline, stepper, stats, 
testimonials, pricing, features, cta, breadcrumb, pagination, tabs, search-bar, user-menu, logo, 
content-section, image-gallery, chart, button, input, list, menu, modal, dropdown, badge, avatar, 
divider, progress, and more

REMEMBER: Missing elements = missing features in production. Be thorough, precise, and complete.

Return ONLY valid JSON, no markdown.`;

    try {
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse enhanced page analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Ensure components have IDs and complete style information
      const components: DetectedComponentEnhanced[] = (parsed.components || []).map(
        (c: Partial<DetectedComponentEnhanced>, index: number) => ({
          id: c.id || `component_${index}`,
          type: c.type || 'unknown',
          bounds: c.bounds || { top: 0, left: 0, width: 100, height: 10 },
          style: {
            ...c.style,
            // Ensure essential style properties have defaults
            hasBackground: c.style?.hasBackground ?? false,
            borderRadius: c.style?.borderRadius || 'md',
            shadow: c.style?.shadow || 'none',
            padding: c.style?.padding || 'md',
            fontSize: c.style?.fontSize || 'base',
            fontWeight: c.style?.fontWeight || 'normal',
            textAlign: c.style?.textAlign || 'left',
          },
          content: c.content || {},
          parentId: c.parentId,
          children: c.children,
          zIndex: c.zIndex || 1,
          navigatesTo: c.navigatesTo,
          isNavigationItem: c.isNavigationItem,
          isInteractive: c.isInteractive,
          confidence: c.confidence || 0.5,
        })
      );

      return {
        pageRole: parsed.pageRole || 'custom',
        layoutType: parsed.layoutType || 'single-page',
        colorPalette: parsed.colorPalette || {},
        typography: parsed.typography || {},
        spacing: parsed.spacing || {},
        components,
        effects: parsed.effects || {},
        vibe: parsed.vibe || '',
        vibeKeywords: parsed.vibeKeywords || [],
        confidence: parsed.confidence || 0.7,
      };
    } catch (error) {
      console.error('[GeminiLayoutService] analyzePageEnhanced error:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple pages and detect shared design tokens
   */
  async analyzeMultiplePages(
    pages: Array<{ id: string; imageBase64: string; name?: string }>
  ): Promise<MultiPageAnalysisResult> {
    if (!this.model) {
      throw new Error('Gemini service not initialized: GOOGLE_API_KEY not configured');
    }

    const startTime = Date.now();
    const analyzedPages: PageReference[] = [];

    // Analyze pages in batches to avoid rate limits (2-3 concurrent)
    const batchSize = 2;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const batchPromises = batch.map(async (page) => {
        try {
          const analysis = await this.analyzePageEnhanced(page.imageBase64, page.name);
          return {
            id: page.id,
            name: page.name || `Page ${i + 1}`,
            slug: this.generateSlug(page.name || `Page ${i + 1}`),
            referenceImage: page.imageBase64,
            analysis,
            order: pages.indexOf(page),
            isMain: pages.indexOf(page) === 0,
            status: 'complete' as const,
            createdAt: new Date().toISOString(),
          };
        } catch (error) {
          console.error(`[GeminiLayoutService] Failed to analyze page ${page.id}:`, error);
          return {
            id: page.id,
            name: page.name || `Page ${i + 1}`,
            slug: this.generateSlug(page.name || `Page ${i + 1}`),
            referenceImage: page.imageBase64,
            order: pages.indexOf(page),
            isMain: pages.indexOf(page) === 0,
            status: 'error' as const,
            errorMessage: error instanceof Error ? error.message : 'Analysis failed',
            createdAt: new Date().toISOString(),
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      analyzedPages.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Extract shared design tokens from successfully analyzed pages
    const successfulPages = analyzedPages.filter((p) => p.analysis);
    const sharedDesign = this.extractSharedDesign(successfulPages);

    // Detect navigation structure
    const navigation = await this.detectNavigationFromPages(successfulPages);

    // Infer routes
    const inferredRoutes = this.inferRoutesFromPages(successfulPages);

    const processingTime = Date.now() - startTime;

    return {
      pages: analyzedPages,
      sharedDesign,
      navigation,
      inferredRoutes,
      confidence: successfulPages.length / pages.length,
      metadata: {
        totalPages: pages.length,
        analyzedPages: successfulPages.length,
        processingTimeMs: processingTime,
        modelUsed: 'gemini',
      },
    };
  }

  /**
   * Detect navigation structure by analyzing common elements across pages
   */
  async detectNavigationFromPages(pages: PageReference[]): Promise<DetectedNavigation> {
    // Extract navigation items from components marked as navigation
    const navItems: NavigationItem[] = [];
    let navStyle: DetectedNavigation['style'] = 'horizontal';
    let navPosition: DetectedNavigation['position'] = 'header';

    for (const page of pages) {
      if (!page.analysis) continue;

      for (const component of page.analysis.components) {
        if (component.isNavigationItem && component.navigatesTo) {
          // Check if we already have this nav item
          const existing = navItems.find((item) => item.targetPageSlug === component.navigatesTo);
          if (!existing) {
            navItems.push({
              label: this.formatSlugAsLabel(component.navigatesTo),
              targetPageSlug: component.navigatesTo,
              order: navItems.length,
              isActive: component.navigatesTo === page.slug,
            });
          }
        }

        // Detect navigation style from component type and position
        if (component.type === 'sidebar') {
          navStyle = 'sidebar';
          navPosition = 'sidebar';
        } else if (component.type === 'navigation') {
          if (component.bounds.left < 20 && component.bounds.width < 30) {
            navStyle = 'sidebar';
            navPosition = 'sidebar';
          }
        }
      }
    }

    // If no nav items were detected from components, create from page list
    if (navItems.length === 0) {
      for (const page of pages) {
        navItems.push({
          label: page.name,
          targetPageSlug: page.slug,
          order: page.order,
          isActive: page.isMain,
        });
      }
    }

    return {
      items: navItems.sort((a, b) => a.order - b.order),
      style: navStyle,
      position: navPosition,
      confidence: 0.7,
    };
  }

  /**
   * Infer routes from analyzed pages
   */
  inferRoutesFromPages(pages: PageReference[]): InferredRoute[] {
    const routes: InferredRoute[] = [];

    for (const page of pages) {
      const isIndex = page.isMain || page.slug === 'home' || page.slug === 'index';
      const pageRole = page.analysis?.pageRole;

      // Determine route path based on page role and name
      let path = `/${page.slug}`;
      const params: string[] = [];

      if (isIndex) {
        path = '/';
      } else if (pageRole === 'detail') {
        // Detail pages often have dynamic params
        path = `/${page.slug}/:id`;
        params.push(':id');
      } else if (pageRole === 'profile') {
        path = '/profile/:userId';
        params.push(':userId');
      }

      routes.push({
        path,
        pageId: page.id,
        isIndex,
        params: params.length > 0 ? params : undefined,
        pageName: page.name,
      });
    }

    return routes;
  }

  // =========================================================================
  // PRIVATE HELPERS FOR MULTI-PAGE
  // =========================================================================

  /**
   * Extract shared design tokens from multiple pages
   */
  private extractSharedDesign(
    pages: PageReference[]
  ): Partial<import('@/types/layoutDesign').LayoutDesign> {
    if (pages.length === 0) return {};

    // Use the first page's colors as the base (most pages share the same palette)
    const firstAnalysis = pages[0].analysis;
    if (!firstAnalysis) return {};

    // Find most common values across pages
    const colorPalettes = pages.filter((p) => p.analysis).map((p) => p.analysis!.colorPalette);
    const typographies = pages.filter((p) => p.analysis).map((p) => p.analysis!.typography);
    const spacings = pages.filter((p) => p.analysis).map((p) => p.analysis!.spacing);
    const effects = pages.filter((p) => p.analysis).map((p) => p.analysis!.effects);

    // Use mode (most common) for each property, defaulting to first page's values
    return {
      globalStyles: {
        colors: {
          primary:
            this.findMostCommon(colorPalettes.map((c) => c.primary)) ||
            firstAnalysis.colorPalette.primary,
          secondary:
            this.findMostCommon(colorPalettes.map((c) => c.secondary)) ||
            firstAnalysis.colorPalette.secondary,
          accent:
            this.findMostCommon(colorPalettes.map((c) => c.accent)) ||
            firstAnalysis.colorPalette.accent,
          background:
            this.findMostCommon(colorPalettes.map((c) => c.background)) ||
            firstAnalysis.colorPalette.background,
          surface:
            this.findMostCommon(colorPalettes.map((c) => c.surface)) ||
            firstAnalysis.colorPalette.surface,
          text:
            this.findMostCommon(colorPalettes.map((c) => c.text)) ||
            firstAnalysis.colorPalette.text,
          textMuted:
            this.findMostCommon(colorPalettes.map((c) => c.textMuted)) ||
            firstAnalysis.colorPalette.textMuted,
          border: firstAnalysis.colorPalette.textMuted,
        },
        typography: {
          fontFamily: firstAnalysis.typography.estimatedBodyFont || 'Inter',
          headingFont: firstAnalysis.typography.estimatedHeadingFont,
          headingWeight: firstAnalysis.typography.headingWeight,
          bodyWeight: firstAnalysis.typography.bodyWeight,
          headingSize: 'lg' as const,
          bodySize: 'base' as const,
          lineHeight: 'normal' as const,
          letterSpacing: 'normal' as const,
        },
        spacing: {
          density:
            this.findMostCommon(spacings.map((s) => s.density)) || firstAnalysis.spacing.density,
          containerWidth: 'standard' as const,
          sectionPadding:
            this.findMostCommon(spacings.map((s) => s.sectionPadding)) ||
            firstAnalysis.spacing.sectionPadding,
          componentGap:
            this.findMostCommon(spacings.map((s) => s.componentGap)) ||
            firstAnalysis.spacing.componentGap,
        },
        effects: {
          borderRadius:
            this.findMostCommon(effects.map((e) => e.borderRadius)) ||
            firstAnalysis.effects.borderRadius,
          shadows:
            this.findMostCommon(effects.map((e) => e.shadows)) || firstAnalysis.effects.shadows,
          animations: effects.some((e) => e.hasAnimations) ? 'smooth' : 'subtle',
          blur: effects.some((e) => e.hasBlur) ? 'subtle' : 'none',
          gradients: effects.some((e) => e.hasGradients),
          backgroundEffect: this.mergeBackgroundEffects(effects),
        },
      },
    };
  }

  /**
   * Merge background effects from multiple page analyses
   * Prioritizes the first detected non-none background effect
   * Returns BackgroundEffectConfig compatible object for EffectsSettings
   */
  private mergeBackgroundEffects(effects: Array<VisualAnalysis['effects']>):
    | {
        type:
          | 'particles'
          | 'floating-shapes'
          | 'gradient-animation'
          | 'parallax-dots'
          | 'mesh-gradient'
          | 'aurora'
          | 'waves'
          | 'none';
        enabled: boolean;
        intensity: 'subtle' | 'medium' | 'strong';
        colors?: string[];
      }
    | undefined {
    // Find the first page with a background effect
    for (const effect of effects) {
      if (effect.backgroundEffect && effect.backgroundEffect.type !== 'none') {
        return {
          type: effect.backgroundEffect.type,
          enabled: true,
          intensity: effect.backgroundEffect.intensity,
          colors: effect.backgroundEffect.colors,
        };
      }
    }
    return undefined;
  }

  /**
   * Find the most common value in an array
   */
  private findMostCommon<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    let maxCount = 0;
    let mostCommon: T | undefined;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }
    return mostCommon;
  }

  /**
   * Generate URL-friendly slug from page name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Format slug back to human-readable label
   */
  private formatSlugAsLabel(slug: string): string {
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let geminiServiceInstance: GeminiLayoutService | null = null;

export function getGeminiLayoutService(): GeminiLayoutService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiLayoutService();
  }
  return geminiServiceInstance;
}

// For direct import where singleton is acceptable
export const geminiLayoutService = {
  analyzeScreenshot: (imageBase64: string) =>
    getGeminiLayoutService().analyzeScreenshot(imageBase64),
  generateLayoutDirection: (imageBase64: string, userIntent: string) =>
    getGeminiLayoutService().generateLayoutDirection(imageBase64, userIntent),
  extractColorPalette: (imageBase64: string) =>
    getGeminiLayoutService().extractColorPalette(imageBase64),
  detectLayoutStructure: (imageBase64: string) =>
    getGeminiLayoutService().detectLayoutStructure(imageBase64),
  extractApplicableStyles: (imageBase64: string) =>
    getGeminiLayoutService().extractApplicableStyles(imageBase64),
  chat: (request: GeminiChatRequest) => getGeminiLayoutService().chat(request),
  checkAvailability: () => getGeminiLayoutService().checkAvailability(),
  clearCache: () => getGeminiLayoutService().clearCache(),
  getCacheStats: () => getGeminiLayoutService().getCacheStats(),
  // Multi-page analysis methods
  analyzePageEnhanced: (imageBase64: string, pageName?: string) =>
    getGeminiLayoutService().analyzePageEnhanced(imageBase64, pageName),
  analyzeMultiplePages: (pages: Array<{ id: string; imageBase64: string; name?: string }>) =>
    getGeminiLayoutService().analyzeMultiplePages(pages),
  detectNavigationFromPages: (pages: PageReference[]) =>
    getGeminiLayoutService().detectNavigationFromPages(pages),
  inferRoutesFromPages: (pages: PageReference[]) =>
    getGeminiLayoutService().inferRoutesFromPages(pages),
};

export default geminiLayoutService;
