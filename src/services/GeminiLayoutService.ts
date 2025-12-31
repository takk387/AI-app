/**
 * Gemini Layout Service
 *
 * Provides visual analysis capabilities using Google's Gemini Pro 3 model.
 * Acts as the "Creative Director" in the dual-model Layout Builder pipeline.
 * Handles screenshot analysis, color extraction, layout structure detection,
 * and "vibe" interpretation.
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';

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
      this.model = this.client.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      this.isAvailable = true;
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
        mimeType: 'image/png',
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
    "hasAnimations": true/false
  },
  "vibe": "One sentence describing the overall aesthetic/vibe",
  "vibeKeywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.0-1.0
}

Analyze the screenshot carefully. Extract exact hex colors where visible. Identify all UI components. Describe the overall design aesthetic.

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
        mimeType: 'image/png',
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
        mimeType: 'image/png',
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
        mimeType: 'image/png',
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
            mimeType: 'image/png',
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
    return `You are a Creative Director AI assistant specializing in visual design for web applications.

Your role:
- Analyze visual designs with exceptional accuracy
- Suggest design improvements based on modern UI/UX principles
- Extract colors, typography, spacing, and layout patterns
- Describe design aesthetics and "vibes" in creative terms
- Help users clone, replicate, or improve designs

${currentDesign ? `Current design context:\n${JSON.stringify(currentDesign, null, 2).slice(0, 2000)}` : ''}

When suggesting design changes, provide specific values (hex colors, spacing values, etc.).
When analyzing images, be thorough and accurate with color extraction.
Always maintain a helpful, creative, and enthusiastic tone.`;
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
    // Create a simple hash for caching
    let hash = 0;
    const sample = imageBase64.slice(0, 1000); // Use first 1000 chars for hash
    for (let i = 0; i < sample.length; i++) {
      const char = sample.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `gemini-${hash.toString(36)}`;
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
  chat: (request: GeminiChatRequest) => getGeminiLayoutService().chat(request),
  checkAvailability: () => getGeminiLayoutService().checkAvailability(),
  clearCache: () => getGeminiLayoutService().clearCache(),
  getCacheStats: () => getGeminiLayoutService().getCacheStats(),
};

export default geminiLayoutService;
