/**
 * Gemini Image Generation Service
 *
 * Uses Gemini's Imagen API (Nano Banana Pro) to generate background images
 * from reference screenshots, matching detected colors and visual style.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent?: string;
  background: string;
  surface?: string;
  text?: string;
  textMuted?: string;
}

export interface BackgroundGenerationRequest {
  /** Base64 encoded reference image */
  referenceImage: string;
  /** Detected color palette from the reference */
  colorPalette: ColorPalette;
  /** One-sentence vibe description */
  vibe: string;
  /** Keywords describing the aesthetic */
  vibeKeywords: string[];
  /** Optional specific style instructions */
  styleInstructions?: string;
  /** Desired resolution */
  resolution?: '1K' | '2K' | '4K';
}

export interface BackgroundGenerationResult {
  /** URL to the generated background image */
  imageUrl: string;
  /** Whether the image was successfully uploaded to storage */
  uploaded: boolean;
  /** Generation prompt used */
  prompt: string;
}

// ============================================================================
// Service Implementation
// ============================================================================

class GeminiImageService {
  private client: GoogleGenerativeAI | null = null;
  private supabase: SupabaseClient | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Support both GOOGLE_API_KEY and GEMINI_API_KEY
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.isAvailable = true;
      console.log('[GeminiImageService] Initialized');
    } else {
      console.warn('[GeminiImageService] API key not configured');
      this.isAvailable = false;
    }

    // Initialize Supabase for image storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  /**
   * Check if the service is available
   */
  public checkAvailability(): boolean {
    return this.isAvailable;
  }

  /**
   * Generate a background image from a reference screenshot
   */
  async generateBackgroundFromReference(
    request: BackgroundGenerationRequest
  ): Promise<BackgroundGenerationResult> {
    if (!this.client) {
      throw new Error('Gemini API not configured');
    }

    const {
      referenceImage,
      colorPalette,
      vibe,
      vibeKeywords,
      styleInstructions,
      resolution = '1K',
    } = request;

    // Build the generation prompt
    const prompt = this.buildBackgroundPrompt(vibe, vibeKeywords, colorPalette, styleInstructions);

    try {
      // Use Gemini 3 Pro Image (Nano Banana Pro) for highest quality
      // Professional asset production with advanced reasoning ("Thinking")
      const modelName = 'gemini-3-pro-image-preview';
      const model = this.client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          // @ts-expect-error - responseModalities and image_size are valid for image generation models
          responseModalities: ['image', 'text'],
          image_size: resolution,
        },
      });

      // Prepare the reference image
      const imagePart = {
        inlineData: {
          data: referenceImage.replace(/^data:image\/[a-z]+;base64,/, ''),
          mimeType: 'image/jpeg' as const,
        },
      };

      // Generate the background
      const result = await model.generateContent([
        imagePart,
        {
          text: prompt,
        },
      ]);

      const response = result.response;

      // Extract the generated image from the response
      let generatedImageBase64: string | null = null;

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ('inlineData' in part && part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }

      if (!generatedImageBase64) {
        // If no image in response, the model might not support image generation
        // Fall back to returning a gradient based on colors
        console.warn('[GeminiImageService] No image in response, model may not support generation');
        throw new Error('Image generation not available - model did not return an image');
      }

      // Upload to Supabase
      const imageUrl = await this.uploadToSupabase(generatedImageBase64);

      return {
        imageUrl,
        uploaded: !imageUrl.startsWith('data:'),
        prompt,
      };
    } catch (error) {
      console.error('[GeminiImageService] Generation failed:', error);

      // If generation fails, we can still provide the prompt for debugging
      throw error;
    }
  }

  /**
   * Build a prompt for background generation
   */
  private buildBackgroundPrompt(
    vibe: string,
    keywords: string[],
    palette?: ColorPalette,
    instructions?: string
  ): string {
    // The "Macro Lens" Prompt Strategy
    let prompt = `CRITICAL INSTRUCTION: GENERATE A RAW, MACRO PHOTOGRAPH. 
    DO NOT CREATE AN ILLUSTRATION, DRAWING, OR 3D RENDER.
    
    Subject: A close-up texture of ${keywords.join(', ')}.
    Visual Style: ${vibe}, National Geographic style, 8k resolution, raw camera input.
    Material details: Focus on surface roughness, light scattering, microscopic imperfections, and realistic grain.
    Lighting: Natural volumetric lighting, cinematic depth of field.`;
    
    if (palette) {
        // Use colors as "tint" hints rather than strict paint
        const colors = [palette.primary, palette.secondary].filter(Boolean).join(', ');
        prompt += ` Color Tones: ${colors} (natural materials).`;
    }

    if (instructions) {
        prompt += ` Specifics: ${instructions}`;
    }

    prompt += `\nConstraint: The image must be seamless and tileable if possible. No text overlays.`;
    
    return prompt;
  }

  /**
   * Upload base64 image to Supabase Storage
   */
  private async uploadToSupabase(base64: string): Promise<string> {
    if (!this.supabase) {
      // Fallback to data URL if Supabase not configured
      return `data:image/png;base64,${base64}`;
    }

    try {
      const buffer = Buffer.from(base64, 'base64');
      const filename = `backgrounds/${Date.now()}-${crypto.randomUUID()}.png`;

      const { data, error } = await this.supabase.storage
        .from('ai-images')
        .upload(filename, buffer, {
          contentType: 'image/png',
          cacheControl: '31536000', // 1 year cache
        });

      if (error) {
        console.error('[GeminiImageService] Supabase upload error:', error);
        return `data:image/png;base64,${base64}`;
      }

      const { data: urlData } = this.supabase.storage.from('ai-images').getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('[GeminiImageService] Upload failed:', error);
      return `data:image/png;base64,${base64}`;
    }
  }

  /**
   * Describe a background from an image (for detection)
   */
  async describeBackground(imageBase64: string): Promise<{
    hasCustomBackground: boolean;
    description: string;
    suggestedType:
      | 'custom-image'
      | 'particles'
      | 'gradient-animation'
      | 'aurora'
      | 'waves'
      | 'none';
  }> {
    if (!this.client) {
      throw new Error('Gemini API not configured');
    }

    const model = this.client.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

    const imagePart = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        mimeType: 'image/jpeg' as const,
      },
    };

    const prompt = `Analyze the background of this UI screenshot.

Determine if the background is:
1. A solid color or simple gradient (type: "none" or "gradient-animation")
2. Has floating particles or dots (type: "particles")
3. Has aurora/wave-like effects (type: "aurora" or "waves")
4. Has a custom artistic background that would need AI generation to recreate (type: "custom-image")

Return JSON:
{
  "hasCustomBackground": true/false,
  "description": "Brief description of the background",
  "suggestedType": "custom-image" | "particles" | "gradient-animation" | "aurora" | "waves" | "none"
}

Only return "custom-image" if the background has custom artwork, illustrations, or complex patterns that can't be replicated with CSS effects.`;

    const result = await model.generateContent([imagePart, { text: prompt }]);
    const text = result.response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Parsing failed
    }

    return {
      hasCustomBackground: false,
      description: 'Unable to analyze background',
      suggestedType: 'none',
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let geminiImageServiceInstance: GeminiImageService | null = null;

export function getGeminiImageService(): GeminiImageService {
  if (!geminiImageServiceInstance) {
    geminiImageServiceInstance = new GeminiImageService();
  }
  return geminiImageServiceInstance;
}

// Convenience exports
export const geminiImageService = {
  generateBackgroundFromReference: (request: BackgroundGenerationRequest) =>
    getGeminiImageService().generateBackgroundFromReference(request),
  describeBackground: (imageBase64: string) =>
    getGeminiImageService().describeBackground(imageBase64),
  checkAvailability: () => getGeminiImageService().checkAvailability(),
};

export default geminiImageService;
