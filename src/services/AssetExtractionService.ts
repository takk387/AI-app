/**
 * AssetExtractionService
 *
 * Extracts visual assets (icons, images, buttons) from reference screenshots
 * using Gemini vision + image processing for pixel-perfect replication
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// ============================================================================
// Type Definitions
// ============================================================================

interface BoundingBox {
  x: number; // 0-100 (percentage)
  y: number; // 0-100
  width: number; // 0-100
  height: number; // 0-100
}

interface DetectedAsset {
  type: 'icon' | 'image' | 'button' | 'logo';
  bounds: BoundingBox;
  description: string;
  semanticId?: string; // e.g., "header-logo", "cta-button"
}

interface ButtonStyles {
  background: string; // CSS value
  borderRadius: string; // e.g., "8px"
  borderWidth: string; // e.g., "2px"
  borderColor: string; // e.g., "#333"
  boxShadow: string; // e.g., "0 2px 8px rgba(0,0,0,0.1)"
  textColor: string; // e.g., "#FFF"
  fontSize: string; // e.g., "16px"
  fontWeight: string; // e.g., "600"
  padding: string; // e.g., "12px 24px"
}

export interface ExtractedAssets {
  icons: Array<{ semanticId: string; url: string; bounds: BoundingBox }>;
  images: Array<{ semanticId: string; url: string; bounds: BoundingBox }>;
  buttons: Array<{ semanticId: string; styles: ButtonStyles; bounds: BoundingBox }>;
  logos: Array<{ semanticId: string; url: string; bounds: BoundingBox }>;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AssetExtractionService {
  private genAI: GoogleGenerativeAI;
  private supabase: SupabaseClient | null = null;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    this.genAI = new GoogleGenerativeAI(apiKey);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * PHASE 1: Detect all extractable assets in the reference image
   */
  async detectAssets(imageBase64: string): Promise<{
    icons: DetectedAsset[];
    images: DetectedAsset[];
    buttons: DetectedAsset[];
    logos: DetectedAsset[];
  }> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-thinking-exp-01-21',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Analyze this UI screenshot and detect ALL extractable visual assets with precise bounding boxes.

ASSET CATEGORIES TO DETECT:

1. **ICONS** (Small graphical symbols):
   - Menu icons (hamburger, close X, etc.)
   - Action icons (search, settings, user avatar, etc.)
   - Social media icons
   - Feature icons
   - Any icon-sized graphical element under 64x64px

2. **IMAGES** (Photos, illustrations, graphics):
   - Product photos
   - Hero images
   - Team member photos
   - Decorative illustrations
   - Screenshots
   - Any photographic or illustrated content

3. **BUTTONS** (Interactive elements):
   - Primary CTA buttons
   - Secondary buttons
   - Icon buttons
   - Link buttons styled as buttons
   - Any clickable pill-shaped or rectangular element with text

4. **LOGOS** (Brand identifiers):
   - Company logos
   - Product logos
   - Partner/client logos
   - Any branded graphic

BOUNDING BOX RULES:
- Use percentages (0-100) relative to viewport
- x: distance from left edge (0 = left, 100 = right)
- y: distance from top edge (0 = top, 100 = bottom)
- width: horizontal span (0-100)
- height: vertical span (0-100)
- Be PRECISE - tight bounds around the actual visual element

OUTPUT SCHEMA:
{
  "icons": [
    {
      "type": "icon",
      "bounds": { "x": 2, "y": 2, "width": 3, "height": 3 },
      "description": "Hamburger menu icon",
      "semanticId": "header-menu-icon"
    }
  ],
  "images": [],
  "buttons": [],
  "logos": []
}

Return ONLY the JSON. Detect 15-30+ assets minimum. Be exhaustive.`;

    const cleanBase64 = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
      { text: prompt },
    ]);

    const responseText = result.response.text();
    const response = JSON.parse(responseText);
    return response;
  }

  /**
   * PHASE 2: Extract button styles using Gemini vision
   */
  async extractButtonStyles(imageBase64: string, buttonBounds: BoundingBox): Promise<ButtonStyles> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-thinking-exp-01-21',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Analyze the button at bounds (${buttonBounds.x}%, ${buttonBounds.y}%, ${buttonBounds.width}%, ${buttonBounds.height}%) and extract EXACT CSS properties.

PROPERTIES TO EXTRACT:

1. **background**: 
   - Solid color: "#HEX"
   - Linear gradient: "linear-gradient(135deg, #HEX1, #HEX2)"
   - Radial gradient: "radial-gradient(circle, #HEX1, #HEX2)"
   - Image: "url('...')"

2. **borderRadius**: Exact pixel value (e.g., "8px", "24px", "50%")

3. **borderWidth**: Exact pixel value (e.g., "0", "1px", "2px")

4. **borderColor**: "#HEX" or "transparent"

5. **boxShadow**: Complete box-shadow CSS (e.g., "0 4px 12px rgba(0,0,0,0.15)")

6. **textColor**: "#HEX"

7. **fontSize**: Exact pixel value (e.g., "14px", "16px")

8. **fontWeight**: "400", "500", "600", "700", etc.

9. **padding**: "Ypx Xpx" (e.g., "12px 24px")

MEASUREMENT RULES:
- Use EXACT pixel values, not approximate
- Measure border radius precisely
- Extract shadow blur, spread, offset, and color
- If gradient, identify ALL color stops

OUTPUT SCHEMA:
{
  "background": "...",
  "borderRadius": "...",
  "borderWidth": "...",
  "borderColor": "...",
  "boxShadow": "...",
  "textColor": "...",
  "fontSize": "...",
  "fontWeight": "...",
  "padding": "..."
}

Return ONLY the JSON with precise measurements.`;

    const cleanBase64 = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
      { text: prompt },
    ]);

    return JSON.parse(result.response.text());
  }

  /**
   * PHASE 3: Crop a region from the reference image
   */
  async cropRegion(imageBase64: string, bounds: BoundingBox): Promise<Buffer> {
    // Convert base64 to buffer
    const cleanBase64 = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width!;
    const imgHeight = metadata.height!;

    // Convert percentage bounds to pixels
    const left = Math.round((bounds.x / 100) * imgWidth);
    const top = Math.round((bounds.y / 100) * imgHeight);
    const width = Math.round((bounds.width / 100) * imgWidth);
    const height = Math.round((bounds.height / 100) * imgHeight);

    // Crop and return
    return sharp(imageBuffer).extract({ left, top, width, height }).png().toBuffer();
  }

  /**
   * PHASE 4: Generate SVG icon from cropped raster using Gemini Imagen 4 Ultra
   */
  async generateSVGIcon(croppedImageBuffer: Buffer): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-thinking-exp-01-21', // Using thinking model for SVG generation
    });

    const base64 = croppedImageBuffer.toString('base64');

    const prompt = `Convert this icon into clean, optimized SVG code.

REQUIREMENTS:
- Output ONLY the <svg>...</svg> code
- Use simple, clean paths (no complex filters)
- ViewBox should be "0 0 24 24" for consistency
- Remove unnecessary attributes
- Use currentColor for fill/stroke when possible (allows color theming)
- Optimize path data (remove excessive decimal places)
- If multiple colors, preserve them but simplify
- Match the shape and style EXACTLY

Return ONLY the SVG code, nothing else.`;

    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/png', data: base64 } },
      { text: prompt },
    ]);

    const svgCode = result.response.text().trim();

    // Clean up any markdown code blocks
    return svgCode
      .replace(/```svg\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  /**
   * PHASE 5: Upload asset to Supabase Storage
   */
  async uploadAsset(
    buffer: Buffer,
    type: 'icon' | 'image' | 'button',
    format: 'svg' | 'png' | 'jpg'
  ): Promise<string> {
    if (!this.supabase) {
      // Fallback to data URL if Supabase not configured
      const base64 = buffer.toString('base64');
      const mimeType = format === 'svg' ? 'image/svg+xml' : `image/${format}`;
      return `data:${mimeType};base64,${base64}`;
    }

    const filename = `layout-assets/${type}s/${Date.now()}-${crypto.randomUUID()}.${format}`;

    const { data, error } = await this.supabase.storage.from('ai-images').upload(filename, buffer, {
      contentType: format === 'svg' ? 'image/svg+xml' : `image/${format}`,
      cacheControl: '31536000', // 1 year cache
    });

    if (error) {
      console.error('[AssetExtraction] Upload failed:', error);
      const base64 = buffer.toString('base64');
      return `data:image/${format};base64,${base64}`;
    }

    const { data: urlData } = this.supabase.storage.from('ai-images').getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  /**
   * ORCHESTRATOR: Complete asset extraction pipeline
   */
  async extractAllAssets(imageBase64: string): Promise<ExtractedAssets> {
    console.log('[AssetExtraction] Starting full extraction pipeline...');

    // Step 1: Detect all assets
    const detected = await this.detectAssets(imageBase64);
    console.log(
      `[AssetExtraction] Detected: ${detected.icons.length} icons, ${detected.images.length} images, ${detected.buttons.length} buttons, ${detected.logos.length} logos`
    );

    const results: ExtractedAssets = {
      icons: [],
      images: [],
      buttons: [],
      logos: [],
    };

    // Step 2: Process icons (in parallel for efficiency)
    const iconPromises = detected.icons.map(async (icon) => {
      try {
        const cropped = await this.cropRegion(imageBase64, icon.bounds);
        const svg = await this.generateSVGIcon(cropped);
        const svgBuffer = Buffer.from(svg, 'utf-8');
        const url = await this.uploadAsset(svgBuffer, 'icon', 'svg');

        return {
          semanticId: icon.semanticId || `icon-${results.icons.length}`,
          url,
          bounds: icon.bounds,
        };
      } catch (error) {
        console.error(`[AssetExtraction] Failed to extract icon:`, error);
        return null;
      }
    });

    // Step 3: Process images (in parallel)
    const imagePromises = detected.images.map(async (image) => {
      try {
        const cropped = await this.cropRegion(imageBase64, image.bounds);
        const url = await this.uploadAsset(cropped, 'image', 'png');

        return {
          semanticId: image.semanticId || `image-${results.images.length}`,
          url,
          bounds: image.bounds,
        };
      } catch (error) {
        console.error(`[AssetExtraction] Failed to extract image:`, error);
        return null;
      }
    });

    // Step 4: Process buttons (extract styles, not images)
    const buttonPromises = detected.buttons.map(async (button) => {
      try {
        const styles = await this.extractButtonStyles(imageBase64, button.bounds);

        return {
          semanticId: button.semanticId || `button-${results.buttons.length}`,
          styles,
          bounds: button.bounds,
        };
      } catch (error) {
        console.error(`[AssetExtraction] Failed to extract button styles:`, error);
        return null;
      }
    });

    // Step 5: Process logos (in parallel)
    const logoPromises = detected.logos.map(async (logo) => {
      try {
        const cropped = await this.cropRegion(imageBase64, logo.bounds);
        const svg = await this.generateSVGIcon(cropped);
        const svgBuffer = Buffer.from(svg, 'utf-8');
        const url = await this.uploadAsset(svgBuffer, 'icon', 'svg');

        return {
          semanticId: logo.semanticId || `logo-${results.logos.length}`,
          url,
          bounds: logo.bounds,
        };
      } catch (error) {
        console.error(`[AssetExtraction] Failed to extract logo:`, error);
        return null;
      }
    });

    // Wait for all parallel operations to complete
    const [icons, images, buttons, logos] = await Promise.all([
      Promise.all(iconPromises),
      Promise.all(imagePromises),
      Promise.all(buttonPromises),
      Promise.all(logoPromises),
    ]);

    // Filter out null results (failed extractions)
    results.icons = icons.filter((i): i is NonNullable<typeof i> => i !== null);
    results.images = images.filter((i): i is NonNullable<typeof i> => i !== null);
    results.buttons = buttons.filter((b): b is NonNullable<typeof b> => b !== null);
    results.logos = logos.filter((l): l is NonNullable<typeof l> => l !== null);

    console.log(
      `[AssetExtraction] Extraction complete: ${results.icons.length} icons, ${results.images.length} images, ${results.buttons.length} buttons, ${results.logos.length} logos processed`
    );

    return results;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let assetExtractionServiceInstance: AssetExtractionService | null = null;

export function getAssetExtractionService(): AssetExtractionService {
  if (!assetExtractionServiceInstance) {
    assetExtractionServiceInstance = new AssetExtractionService();
  }
  return assetExtractionServiceInstance;
}

export const assetExtractionService = {
  extractAllAssets: (imageBase64: string) =>
    getAssetExtractionService().extractAllAssets(imageBase64),
};

export default assetExtractionService;
