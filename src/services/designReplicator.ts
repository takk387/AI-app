/**
 * Design Replicator Service
 *
 * AI-powered service for pixel-perfect design analysis and replication.
 * Uses Claude's vision capabilities to extract complete design specifications
 * from images and videos.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  CompleteDesignAnalysis,
  QuickAnalysis,
  ColorSwatch,
  FontSpec,
  TypeScale,
  GradientDefinition,
  HoverAnimation,
  ButtonSpec,
  CardSpec,
  ResponsiveValue,
  AnalysisPhase,
  AnalysisProgress,
  defaultAnalysisPhases,
} from '@/types/layoutDesign';
import {
  matchFontFromDescription,
  getFontByFamily,
  getRecommendedPairing,
  type FontEntry,
} from '@/data/fontDatabase';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract MIME type from a base64 data URL
 * Returns the actual MIME type to ensure correct image format is sent to Claude
 */
function getMediaType(
  imageBase64: string
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const match = imageBase64.match(/^data:(image\/[^;]+);base64,/);
  if (match) {
    const mimeType = match[1];
    if (
      mimeType === 'image/jpeg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/gif' ||
      mimeType === 'image/webp'
    ) {
      return mimeType;
    }
  }
  // Default to PNG if we can't determine the type (lossless, safe default)
  return 'image/png';
}

// ============================================================================
// TYPES
// ============================================================================

export interface AnalysisCallbacks {
  onPhaseStart?: (phaseId: string) => void;
  onPhaseProgress?: (phaseId: string, progress: number, detail?: string) => void;
  onPhaseComplete?: (phaseId: string) => void;
  onPhaseError?: (phaseId: string, error: string) => void;
  onQuickAnalysisComplete?: (analysis: QuickAnalysis) => void;
  onDeepAnalysisComplete?: (analysis: CompleteDesignAnalysis) => void;
}

export interface AnalysisOptions {
  mode: 'quick' | 'deep' | 'full';
  includeAnimations?: boolean;
  includeResponsive?: boolean;
  targetFramework?: 'tailwind' | 'css' | 'both';
}

// ============================================================================
// PROMPTS
// ============================================================================

const QUICK_ANALYSIS_PROMPT = `Analyze this design image and extract the essential design elements quickly.

Return a JSON object with this exact structure:
{
  "dominantColors": [
    { "hex": "#hexcode", "usage": "primary/background/text/etc", "frequency": 0-100 }
  ],
  "layoutType": "landing|dashboard|e-commerce|blog|portfolio|app|other",
  "primaryFont": "font family name or description",
  "overallStyle": "minimal|modern|playful|corporate|luxury|brutalist|glassmorphism|neumorphism",
  "confidence": 0.0-1.0
}

Extract 5-8 dominant colors. Be precise with hex values.
Identify the primary font family if recognizable, otherwise describe it (e.g., "geometric sans-serif").`;

const DEEP_ANALYSIS_PROMPT = `Analyze this design image with extreme precision for pixel-perfect replication.

Extract EVERY visual detail and return a comprehensive JSON object:

{
  "colors": {
    "palette": [{ "hex": "#code", "rgba": "rgba()", "usage": "description", "frequency": 0-100 }],
    "primary": "#hex",
    "primaryHover": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "surfaceAlt": "#hex",
    "text": "#hex",
    "textMuted": "#hex",
    "border": "#hex",
    "success": "#hex",
    "warning": "#hex",
    "error": "#hex",
    "info": "#hex",
    "gradients": [{ "type": "linear|radial", "direction": "deg/direction", "stops": [{"color":"#hex","position":"0%"}], "css": "full css", "usage": "where used" }],
    "overlays": [{ "color": "rgba()", "opacity": 0-1, "usage": "where" }]
  },
  "typography": {
    "headingFont": {
      "detected": "description of font characteristics",
      "family": "best match font name",
      "confidence": 0-1
    },
    "bodyFont": {
      "detected": "description",
      "family": "best match",
      "confidence": 0-1
    },
    "displaySizes": {
      "h1": { "size": "48px", "weight": 700, "lineHeight": 1.2, "letterSpacing": "-0.02em" },
      "h2": { "size": "36px", "weight": 600, "lineHeight": 1.3, "letterSpacing": "-0.01em" },
      "h3": { "size": "28px", "weight": 600, "lineHeight": 1.4, "letterSpacing": "0" },
      "h4": { "size": "24px", "weight": 500, "lineHeight": 1.4, "letterSpacing": "0" },
      "h5": { "size": "20px", "weight": 500, "lineHeight": 1.5, "letterSpacing": "0" },
      "h6": { "size": "18px", "weight": 500, "lineHeight": 1.5, "letterSpacing": "0" }
    },
    "bodySizes": {
      "xs": { "size": "12px", "weight": 400, "lineHeight": 1.5, "letterSpacing": "0" },
      "sm": { "size": "14px", "weight": 400, "lineHeight": 1.5, "letterSpacing": "0" },
      "base": { "size": "16px", "weight": 400, "lineHeight": 1.6, "letterSpacing": "0" },
      "lg": { "size": "18px", "weight": 400, "lineHeight": 1.6, "letterSpacing": "0" },
      "xl": { "size": "20px", "weight": 400, "lineHeight": 1.6, "letterSpacing": "0" }
    },
    "fontWeights": [400, 500, 600, 700]
  },
  "spacing": {
    "baseUnit": 4 or 8,
    "scale": [4, 8, 12, 16, 24, 32, 48, 64],
    "containerMaxWidth": "1280px",
    "containerPadding": { "mobile": "16px", "tablet": "24px", "desktop": "32px" },
    "sectionPadding": { "mobile": "48px", "tablet": "64px", "desktop": "96px" },
    "componentGap": { "mobile": "16px", "tablet": "24px", "desktop": "32px" },
    "cardPadding": "24px",
    "buttonPadding": "12px 24px",
    "inputPadding": "12px 16px"
  },
  "effects": {
    "borderRadius": {
      "none": "0",
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "xl": "16px",
      "full": "9999px",
      "button": "8px",
      "card": "12px",
      "input": "8px"
    },
    "shadows": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px rgba(0,0,0,0.1)",
      "lg": "0 10px 15px rgba(0,0,0,0.1)",
      "xl": "0 20px 25px rgba(0,0,0,0.15)",
      "card": "0 4px 12px rgba(0,0,0,0.08)",
      "button": "0 2px 4px rgba(0,0,0,0.1)",
      "buttonHover": "0 4px 8px rgba(0,0,0,0.15)"
    },
    "blur": {
      "sm": "4px",
      "md": "8px",
      "lg": "16px",
      "backdrop": "12px"
    },
    "transitions": {
      "fast": "150ms ease",
      "normal": "200ms ease",
      "slow": "300ms ease"
    }
  },
  "components": {
    "buttons": [{
      "variant": "primary",
      "states": {
        "default": { "background": "#hex", "color": "#hex", "border": "none" },
        "hover": { "background": "#hex", "transform": "translateY(-1px)" },
        "focus": { "outline": "2px solid #hex", "outlineOffset": "2px" },
        "active": { "transform": "translateY(0)" },
        "disabled": { "opacity": "0.5", "cursor": "not-allowed" }
      },
      "borderRadius": "8px",
      "padding": "12px 24px",
      "fontSize": "14px",
      "fontWeight": 500,
      "transition": "all 200ms ease"
    }],
    "cards": [{
      "variant": "default",
      "states": {
        "default": { "background": "#hex", "border": "1px solid #hex" },
        "hover": { "shadow": "0 8px 16px rgba(0,0,0,0.1)", "transform": "translateY(-2px)" }
      },
      "borderRadius": "12px",
      "padding": "24px",
      "shadow": "0 4px 12px rgba(0,0,0,0.08)",
      "border": "1px solid #hex",
      "background": "#hex"
    }]
  },
  "layout": {
    "type": "flex|grid|mixed",
    "gridColumns": 12,
    "gridGutter": "24px",
    "containerWidth": "1280px",
    "contentWidth": "720px"
  },
  "animations": {
    "hover": [{
      "element": "button/card/link",
      "properties": { "transform": { "from": "none", "to": "translateY(-2px)" } },
      "duration": "200ms",
      "easing": "ease-out",
      "css": "transition: transform 200ms ease-out;",
      "tailwind": "transition-transform hover:-translate-y-0.5"
    }],
    "entrance": [{
      "element": "section/card",
      "animation": "fadeInUp",
      "duration": "600ms",
      "delay": "0ms",
      "css": "@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }"
    }]
  }
}

Be extremely precise with measurements and colors. Use exact hex values.
For fonts, describe characteristics if you can't identify the exact family.`;

// ============================================================================
// DESIGN REPLICATOR CLASS
// ============================================================================

export class DesignReplicator {
  private anthropic: Anthropic;
  private model = 'claude-sonnet-4-5-20250929';

  constructor(apiKey?: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Perform quick analysis (2-3 seconds)
   * Extracts essential design elements for immediate preview
   */
  async quickAnalysis(imageBase64: string, callbacks?: AnalysisCallbacks): Promise<QuickAnalysis> {
    callbacks?.onPhaseStart?.('quick');
    callbacks?.onPhaseProgress?.('quick', 10, 'Starting quick analysis');

    try {
      // Extract media type before stripping prefix
      const mediaType = getMediaType(imageBase64);
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

      callbacks?.onPhaseProgress?.('quick', 30, 'Analyzing colors');

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: QUICK_ANALYSIS_PROMPT,
              },
            ],
          },
        ],
      });

      callbacks?.onPhaseProgress?.('quick', 80, 'Parsing results');

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }

      const analysis: QuickAnalysis = JSON.parse(jsonMatch[0]);

      callbacks?.onPhaseProgress?.('quick', 100, 'Complete');
      callbacks?.onPhaseComplete?.('quick');
      callbacks?.onQuickAnalysisComplete?.(analysis);

      return analysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      callbacks?.onPhaseError?.('quick', message);
      throw error;
    }
  }

  /**
   * Perform deep analysis (10-15 seconds)
   * Extracts complete design specifications for pixel-perfect replication
   */
  async deepAnalysis(
    imageBase64: string,
    quickAnalysis?: QuickAnalysis,
    callbacks?: AnalysisCallbacks
  ): Promise<CompleteDesignAnalysis> {
    callbacks?.onPhaseStart?.('deep');
    callbacks?.onPhaseProgress?.('deep', 5, 'Starting deep analysis');

    try {
      // Extract media type before stripping prefix
      const mediaType = getMediaType(imageBase64);
      const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

      // Build enhanced prompt with quick analysis context
      let prompt = DEEP_ANALYSIS_PROMPT;
      if (quickAnalysis) {
        prompt += `\n\nPrevious quick analysis found:
- Layout type: ${quickAnalysis.layoutType}
- Style: ${quickAnalysis.overallStyle}
- Primary font hint: ${quickAnalysis.primaryFont}
- Dominant colors: ${quickAnalysis.dominantColors.map((c) => c.hex).join(', ')}

Use this as a starting point and expand with full details.`;
      }

      callbacks?.onPhaseProgress?.('deep', 15, 'Extracting colors');

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 16000,
        temperature: 1,
        thinking: {
          type: 'enabled',
          budget_tokens: 8000,
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      callbacks?.onPhaseProgress?.('deep', 70, 'Processing typography');

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      // Parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from response');
      }

      const rawAnalysis = JSON.parse(jsonMatch[0]);

      callbacks?.onPhaseProgress?.('deep', 85, 'Matching fonts');

      // Enhance with font database matching
      const analysis = await this.enhanceWithFontMatching(rawAnalysis);

      callbacks?.onPhaseProgress?.('deep', 95, 'Finalizing analysis');

      // Add metadata
      const completeAnalysis: CompleteDesignAnalysis = {
        id: `analysis_${Date.now()}`,
        analyzedAt: new Date().toISOString(),
        sourceType: 'image',
        confidence: quickAnalysis?.confidence || 0.85,
        ...analysis,
        // Use ONLY Gemini-extracted colors - no hardcoded fallbacks that contaminate the design
        // Neutral grays used only when Gemini doesn't extract a specific color
        colors: {
          palette: [],
          primary: '#6B7280', // Neutral gray - will be overridden by Gemini extraction
          secondary: '#9CA3AF',
          accent: '#6B7280',
          background: '#F9FAFB',
          surface: '#FFFFFF',
          text: '#374151',
          textMuted: '#6B7280',
          border: '#E5E7EB',
          success: '#6B7280',
          warning: '#6B7280',
          error: '#6B7280',
          info: '#6B7280',
          gradients: [],
          overlays: [],
          ...analysis.colors, // Gemini's extracted colors override all defaults
        },
        typography: {
          headingFont: {
            family: 'Inter',
            googleFontUrl:
              'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            fallbacks: ['system-ui', 'sans-serif'],
            weights: [400, 500, 600, 700],
            confidence: 0.8,
            detected: 'geometric sans-serif',
          },
          bodyFont: {
            family: 'Inter',
            googleFontUrl:
              'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            fallbacks: ['system-ui', 'sans-serif'],
            weights: [400, 500, 600, 700],
            confidence: 0.8,
            detected: 'geometric sans-serif',
          },
          displaySizes: {
            h1: { size: '48px', weight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
            h2: { size: '36px', weight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
            h3: { size: '28px', weight: 600, lineHeight: 1.4, letterSpacing: '0' },
            h4: { size: '24px', weight: 500, lineHeight: 1.4, letterSpacing: '0' },
            h5: { size: '20px', weight: 500, lineHeight: 1.5, letterSpacing: '0' },
            h6: { size: '18px', weight: 500, lineHeight: 1.5, letterSpacing: '0' },
          },
          bodySizes: {
            xs: { size: '12px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
            sm: { size: '14px', weight: 400, lineHeight: 1.5, letterSpacing: '0' },
            base: { size: '16px', weight: 400, lineHeight: 1.6, letterSpacing: '0' },
            lg: { size: '18px', weight: 400, lineHeight: 1.6, letterSpacing: '0' },
            xl: { size: '20px', weight: 400, lineHeight: 1.6, letterSpacing: '0' },
          },
          lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
          letterSpacing: { tight: '-0.02em', normal: '0', wide: '0.05em' },
          fontWeights: [400, 500, 600, 700],
          ...analysis.typography,
        },
        spacing: {
          baseUnit: 8,
          scale: [4, 8, 12, 16, 24, 32, 48, 64, 96],
          containerMaxWidth: '1280px',
          containerPadding: { mobile: '16px', tablet: '24px', desktop: '32px' },
          sectionPadding: { mobile: '48px', tablet: '64px', desktop: '96px' },
          componentGap: { mobile: '16px', tablet: '24px', desktop: '32px' },
          cardPadding: '24px',
          buttonPadding: '12px 24px',
          inputPadding: '12px 16px',
          ...analysis.spacing,
        },
        effects: {
          borderRadius: {
            none: '0',
            sm: '4px',
            md: '8px',
            lg: '12px',
            xl: '16px',
            full: '9999px',
            button: '8px',
            card: '12px',
            input: '8px',
          },
          shadows: {
            sm: '0 1px 2px rgba(0,0,0,0.05)',
            md: '0 4px 6px rgba(0,0,0,0.1)',
            lg: '0 10px 15px rgba(0,0,0,0.1)',
            xl: '0 20px 25px rgba(0,0,0,0.15)',
            card: '0 4px 12px rgba(0,0,0,0.08)',
            dropdown: '0 10px 40px rgba(0,0,0,0.15)',
            modal: '0 25px 50px rgba(0,0,0,0.25)',
            button: '0 2px 4px rgba(0,0,0,0.1)',
            buttonHover: '0 4px 8px rgba(0,0,0,0.15)',
          },
          blur: {
            sm: '4px',
            md: '8px',
            lg: '16px',
            backdrop: '12px',
          },
          transitions: {
            fast: '150ms ease',
            normal: '200ms ease',
            slow: '300ms ease',
            bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            spring: '500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          },
          ...analysis.effects,
        },
        components: {
          cards: [],
          buttons: [],
          inputs: [],
          ...analysis.components,
        },
        layout: {
          type: 'flex',
          gridColumns: 12,
          gridGutter: '24px',
          regions: [],
          breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
          zIndexScale: [10, 20, 30, 40, 50],
          containerWidth: '1280px',
          contentWidth: '720px',
          ...analysis.layout,
        },
        animations: {
          hover: [],
          scroll: [],
          entrance: [],
          transitions: [],
          microInteractions: [],
          pageTransitions: [],
          ...analysis.animations,
        },
        responsive: {
          mobile: {},
          tablet: {},
          desktop: {},
          ...analysis.responsive,
        },
      };

      callbacks?.onPhaseProgress?.('deep', 100, 'Complete');
      callbacks?.onPhaseComplete?.('deep');
      callbacks?.onDeepAnalysisComplete?.(completeAnalysis);

      return completeAnalysis;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      callbacks?.onPhaseError?.('deep', message);
      throw error;
    }
  }

  /**
   * Perform full analysis (quick + deep)
   * Returns quick results immediately, then deep results
   */
  async fullAnalysis(
    imageBase64: string,
    callbacks?: AnalysisCallbacks
  ): Promise<{ quick: QuickAnalysis; deep: CompleteDesignAnalysis }> {
    // Quick pass first
    const quick = await this.quickAnalysis(imageBase64, callbacks);

    // Deep pass with quick context
    const deep = await this.deepAnalysis(imageBase64, quick, callbacks);

    return { quick, deep };
  }

  /**
   * Enhance analysis with font database matching
   */
  private async enhanceWithFontMatching(
    rawAnalysis: Partial<CompleteDesignAnalysis>
  ): Promise<Partial<CompleteDesignAnalysis>> {
    const enhanced = { ...rawAnalysis };

    // Match heading font
    if (rawAnalysis.typography?.headingFont) {
      const headingDescription =
        typeof rawAnalysis.typography.headingFont === 'object'
          ? (rawAnalysis.typography.headingFont as { detected?: string }).detected || ''
          : String(rawAnalysis.typography.headingFont);

      const headingMatches = matchFontFromDescription(headingDescription, 'sans-serif');
      if (headingMatches.length > 0) {
        const bestMatch = headingMatches[0];
        enhanced.typography = {
          ...enhanced.typography,
          headingFont: {
            family: bestMatch.font.family,
            googleFontUrl: bestMatch.font.googleFontUrl,
            fallbacks: bestMatch.font.fallbacks,
            weights: bestMatch.font.weights,
            confidence: bestMatch.confidence,
            detected: headingDescription,
          },
        } as CompleteDesignAnalysis['typography'];
      }
    }

    // Match body font
    if (rawAnalysis.typography?.bodyFont) {
      const bodyDescription =
        typeof rawAnalysis.typography.bodyFont === 'object'
          ? (rawAnalysis.typography.bodyFont as { detected?: string }).detected || ''
          : String(rawAnalysis.typography.bodyFont);

      const bodyMatches = matchFontFromDescription(bodyDescription, 'sans-serif');
      if (bodyMatches.length > 0) {
        const bestMatch = bodyMatches[0];
        if (enhanced.typography) {
          enhanced.typography.bodyFont = {
            family: bestMatch.font.family,
            googleFontUrl: bestMatch.font.googleFontUrl,
            fallbacks: bestMatch.font.fallbacks,
            weights: bestMatch.font.weights,
            confidence: bestMatch.confidence,
            detected: bodyDescription,
          };
        }
      }
    }

    return enhanced;
  }

  /**
   * Convert analysis to LayoutDesign format
   */
  analysisToLayoutDesign(
    analysis: CompleteDesignAnalysis
  ): Partial<import('@/types/layoutDesign').LayoutDesign> {
    return {
      globalStyles: {
        typography: {
          fontFamily: analysis.typography.bodyFont.family,
          headingFont: analysis.typography.headingFont.family,
          headingWeight: this.weightToPreset(analysis.typography.displaySizes.h1.weight),
          bodyWeight: this.weightToPreset(analysis.typography.bodySizes.base.weight),
          headingSize: 'lg',
          bodySize: 'base',
          lineHeight: 'normal',
          letterSpacing: 'normal',
        },
        colors: {
          primary: analysis.colors.primary,
          secondary: analysis.colors.secondary,
          accent: analysis.colors.accent,
          background: analysis.colors.background,
          surface: analysis.colors.surface,
          text: analysis.colors.text,
          textMuted: analysis.colors.textMuted,
          border: analysis.colors.border,
          success: analysis.colors.success,
          warning: analysis.colors.warning,
          error: analysis.colors.error,
          info: analysis.colors.info,
        },
        spacing: {
          density: 'normal',
          containerWidth: 'standard',
          sectionPadding: 'lg',
          componentGap: 'md',
        },
        effects: {
          borderRadius: this.radiusToPreset(analysis.effects.borderRadius.card),
          shadows: this.shadowToPreset(analysis.effects.shadows.card),
          animations: 'smooth',
          blur: 'none',
          gradients: analysis.colors.gradients.length > 0,
        },
      },
    };
  }

  private weightToPreset(weight: number): 'light' | 'normal' | 'medium' | 'semibold' | 'bold' {
    if (weight <= 300) return 'light';
    if (weight <= 400) return 'normal';
    if (weight <= 500) return 'medium';
    if (weight <= 600) return 'semibold';
    return 'bold';
  }

  private radiusToPreset(radius: string): 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' {
    const px = parseInt(radius);
    if (px === 0) return 'none';
    if (px <= 4) return 'sm';
    if (px <= 8) return 'md';
    if (px <= 12) return 'lg';
    if (px <= 16) return 'xl';
    return 'full';
  }

  private shadowToPreset(shadow: string): 'none' | 'subtle' | 'medium' | 'strong' {
    if (!shadow || shadow === 'none') return 'none';
    // Check shadow blur/spread values
    const match = shadow.match(/(\d+)px/g);
    if (!match) return 'subtle';
    const values = match.map((v) => parseInt(v));
    const maxValue = Math.max(...values);
    if (maxValue <= 4) return 'subtle';
    if (maxValue <= 10) return 'medium';
    return 'strong';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let replicatorInstance: DesignReplicator | null = null;

export function getDesignReplicator(): DesignReplicator {
  if (!replicatorInstance) {
    replicatorInstance = new DesignReplicator();
  }
  return replicatorInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract base64 data from data URL
 */
export function extractBase64FromDataUrl(dataUrl: string): {
  mediaType: string;
  data: string;
} | null {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mediaType: match[1],
    data: match[2],
  };
}

/**
 * Validate image for analysis
 */
export function validateImageForAnalysis(dataUrl: string): { valid: boolean; error?: string } {
  const extracted = extractBase64FromDataUrl(dataUrl);
  if (!extracted) {
    return { valid: false, error: 'Invalid image data URL format' };
  }

  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!supportedTypes.includes(extracted.mediaType)) {
    return {
      valid: false,
      error: `Unsupported image type: ${extracted.mediaType}`,
    };
  }

  // Check approximate file size (base64 is ~33% larger than binary)
  const approximateSize = (extracted.data.length * 3) / 4;
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (approximateSize > maxSize) {
    return { valid: false, error: 'Image too large (max 20MB)' };
  }

  return { valid: true };
}
