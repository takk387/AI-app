/**
 * Gemini Image Service (The Photographer)
 * Macro Lens prompt, Safety Fallback, Singleton accessor
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface BackgroundGenerationRequest {
  referenceImage?: string;
  vibe: string;
  vibeKeywords: string[];
  targetElement?: string; // "button", "card", "hero", "background"
}

class GeminiImageService {
  private client: GoogleGenerativeAI | null = null;
  private supabase: SupabaseClient | null = null;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) this.client = new GoogleGenerativeAI(apiKey);

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sbUrl && sbKey) this.supabase = createClient(sbUrl, sbKey);
  }

  // Required by API routes
  checkAvailability(): boolean {
    return !!this.client;
  }

  // Required for analysis flows
  async describeBackground(imageUrl: string): Promise<string> {
    if (!this.client) return 'Neutral background';
    const model = this.client.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    const result = await model.generateContent([
      'Describe the visual texture and material of this background in 3 keywords.',
      { inlineData: { data: imageUrl.split(',')[1], mimeType: 'image/jpeg' } },
    ]);
    return result.response.text();
  }

  async generateBackgroundFromReference(request: BackgroundGenerationRequest) {
    if (!this.client) throw new Error('Gemini API not configured');

    const isShapedElement =
      request.targetElement && !['background', 'hero section'].includes(request.targetElement);

    const prompt = isShapedElement
      ? `Generate a photorealistic image of a ${request.vibeKeywords.join(', ')}.
        Style: ${request.vibe}, photorealistic, high detail.
        Requirements: Render the full object with depth and lighting. Suitable for use as a UI element background with clip-path masking. No text, no people.
        Include: Realistic shadows, highlights, and 3D volume.`
      : `Generate a photorealistic texture image ${request.targetElement ? `for use as a ${request.targetElement} background in a web UI` : 'as a seamless texture'}.
        Subject: ${request.vibeKeywords.join(', ')}.
        Style: ${request.vibe}, photorealistic, high detail.
        Requirements: Suitable for web UI use. Clean edges. No text, no people.
        If for a button: include subtle depth, lighting, and edge highlights.`;

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

      // Build multimodal content: reference image (if available) + text prompt
      const contentParts: any[] = [];
      if (request.referenceImage) {
        const base64Data = request.referenceImage.includes(',')
          ? request.referenceImage.split(',')[1]
          : request.referenceImage;
        contentParts.push({
          inlineData: { data: base64Data, mimeType: 'image/png' },
        });
        contentParts.push({
          text: `Reference image provided. Generate a texture matching this design's visual style.\n\n${prompt}`,
        });
      } else {
        contentParts.push({ text: prompt });
      }

      const result = await model.generateContent(contentParts);
      const base64 = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64) throw new Error('Generation failed');
      const imageUrl = await this.uploadToSupabase(base64);
      return { imageUrl, uploaded: true };
    } catch (error) {
      console.error('Image Gen Error:', error);
      return {
        imageUrl: null,
        uploaded: false,
      };
    }
  }

  private async uploadToSupabase(base64: string): Promise<string> {
    if (!this.supabase) return `data:image/png;base64,${base64}`;
    const buffer = Buffer.from(base64, 'base64');
    const filename = `gen-${Date.now()}.png`;
    const { data } = await this.supabase.storage.from('ai-images').upload(filename, buffer);
    return this.supabase.storage.from('ai-images').getPublicUrl(data?.path || '').data.publicUrl;
  }
}

// Singleton accessor
let instance: GeminiImageService | null = null;
export function getGeminiImageService() {
  if (!instance) instance = new GeminiImageService();
  return instance;
}

export const geminiImageService = getGeminiImageService();
