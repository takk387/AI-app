/**
 * Architect API Route - Generate Layout Manifest
 *
 * Multi-Strategy Architecture for source types:
 * - STATIC IMAGE: Visual Fidelity with absolute bounds
 * - VIDEO: Precision Flow with arbitrary Tailwind (NO absolute - kills animation)
 * - DUAL-SOURCE (Director's Cut): Image for visuals, Video for motions
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import { sanitizeManifest } from '@/utils/manifestSanitizer';
import type { ColorPalette } from '@/utils/colorExtraction';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface GenerateManifestRequest {
  concept?: AppConcept;
  userPrompt: string;
  images?: Array<{ base64: string; mimeType: string; name: string }>;
  videoBase64?: string;
  videoMimeType?: string;
  videoFileName?: string;
  extractedColors?: ColorPalette;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI API key not configured.' }, { status: 500 });
    }

    const body: GenerateManifestRequest = await request.json();
    const {
      concept,
      userPrompt,
      images,
      videoBase64,
      videoMimeType,
      videoFileName,
      extractedColors,
    } = body;

    // --- SOURCE DETECTION ---
    const hasVideo = !!videoBase64;
    const hasImages = images && images.length > 0;
    const isMergeMode = hasVideo && hasImages;

    console.log('[generate-manifest] Source detection:', {
      hasVideo,
      hasImages,
      isMergeMode,
      imageCount: images?.length ?? 0,
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const contextLine = concept
      ? `CONTEXT: App "${concept.name}" - ${concept.purpose}.`
      : 'CONTEXT: Analyzing provided reference material to create a UI layout.';

    // Color injection for design system
    const colorInjectionLine = extractedColors
      ? `
DESIGN SYSTEM (GROUND TRUTH - EXTRACTED FROM SOURCE):
- Primary: ${extractedColors.primary} → USE CLASS: "bg-primary" or "text-primary"
- Secondary: ${extractedColors.secondary} → USE CLASS: "bg-secondary"
- Accent: ${extractedColors.accent} → USE CLASS: "bg-accent"
- Background: ${extractedColors.background} → USE CLASS: "bg-background"
- Surface: ${extractedColors.surface} → USE CLASS: "bg-surface"
- Text: ${extractedColors.text} → USE CLASS: "text-text"
- Text Muted: ${extractedColors.textMuted} → USE CLASS: "text-text-muted"
- Border: ${extractedColors.border} → USE CLASS: "border-border"

USE SEMANTIC CLASSES (bg-primary, text-text, etc.) - NOT arbitrary hex values.
`
      : '';

    // --- STRATEGY SELECTION ---
    let strategyInstruction = '';

    if (isMergeMode) {
      strategyInstruction = `
STRATEGY: **DUAL-SOURCE MERGE (The "Director's Cut")**
The user wants to combine the VISUALS of the Image with the MOTIONS of the Video.

1. **VISUAL SOURCE (The Image)**:
   - Use the Image to define the Layout, Colors, Typography, and Component Structure.
   - Use "layout.bounds" to replicate the Image's exact spacing and positioning.
   - The 'styles.tailwindClasses' MUST match the Image.

2. **MOTION SOURCE (The Video)**:
   - Ignore the Video's visual layout/colors.
   - ANALYZE ONLY THE MOVEMENT: transitions, hover states, scroll effects, entrance animations.
   - APPLY these motions to the Image's components via 'styles.motion'.

3. **MAPPING LOGIC**:
   - If Video shows a list sliding in -> Make the Image's list slide in.
   - If Video buttons bounce on click -> Make the Image's buttons bounce.
   - If Video header is sticky -> Make the Image's header sticky.

4. **OUTPUT GOAL**:
   - A layout that LOOKS like the Image but BEHAVES like the Video.
`;
    } else if (hasVideo) {
      strategyInstruction = `
STRATEGY: **VIDEO DETECTED -> ENABLE "PRECISION FLOW" MODE**
The user wants the EXACT "Look and Feel" of this video.

1. **THE LOOK (Precision Flow)**:
   - Do NOT use absolute positioning (it kills animation).
   - MUST USE ARBITRARY VALUES: 'w-[375px]', 'gap-[18px]', 'rounded-[22px]'.
   - This creates a pixel-perfect layout that can still animate.
   - Use 'layout.mode: "flow"' for ALL elements.

2. **THE FEEL (Motion Extraction)**:
   - Analyze movement between frames.
   - Populate 'styles.motion' objects with Framer Motion props.
   - Example: { "initial": { "opacity": 0, "y": 20 }, "animate": { "opacity": 1, "y": 0 } }
`;
    } else {
      strategyInstruction = `
STRATEGY: **STATIC IMAGE DETECTED -> PRIORITIZE VISUAL FIDELITY**
The user wants an EXACT REPLICA of this specific screen.

1. **VISUAL PRECISION**:
   - You MUST provide precise 'layout.bounds' for every structural element.
   - Use 'layout.mode: "absolute"' for elements that overlap or break the grid.
   - Use 'layout.mode: "flow"' for content that flows naturally (text, lists).

2. **SPATIAL PROTOCOL (Top-to-Bottom)**:
   - HEADER (0-15%): Logo, Nav.
   - HERO (15-50%): Headline, CTA.
   - CONTENT (50-90%): Features, Grid.
   - FOOTER (90-100%): Links.

3. **BOUNDS CALCULATION**:
   - X/Y/Width/Height must be PERCENTAGES (0-100) relative to viewport.
   - Calculate bounds by VISUALLY ANALYZING the image zones.
`;
    }

    const preImageContext = `
ROLE: Expert Frontend Architect (Multimodal).
${contextLine}
${strategyInstruction}
TASK: Generate a complete Hybrid LayoutManifest (JSON).
`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: preImageContext }];

    // --- ADD MEDIA ---

    // 1. Add Image (Visual Truth)
    if (images && images.length > 0) {
      console.log(`[generate-manifest] Processing ${images.length} image(s)...`);
      images.forEach((img, index) => {
        parts.push({
          inlineData: { mimeType: img.mimeType, data: img.base64 },
        });
        parts.push({
          text: `[VISUAL SOURCE: Image ${index + 1}] - Use this for Layout & Style`,
        });
      });
    }

    // 2. Add Video (Motion Truth)
    if (videoBase64 && videoMimeType) {
      console.log('[generate-manifest] Uploading video for motion analysis...');
      try {
        const buffer = Buffer.from(videoBase64, 'base64');
        const uploadResponse = await fileManager.uploadFile(buffer, {
          mimeType: videoMimeType,
          displayName: videoFileName || 'uploaded-video',
        });

        let fileState = await fileManager.getFile(uploadResponse.file.name);
        let attempts = 0;
        while (fileState.state === FileState.PROCESSING && attempts < 15) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          fileState = await fileManager.getFile(uploadResponse.file.name);
          attempts++;
        }

        if (fileState.state === FileState.ACTIVE) {
          parts.push({
            fileData: { mimeType: fileState.mimeType, fileUri: fileState.uri },
          });
          parts.push({
            text: '[MOTION SOURCE: Video] - Use this for Animation & Behavior ONLY',
          });
          console.log('[generate-manifest] Video uploaded successfully');
        } else {
          throw new Error(`Video processing state: ${fileState.state}`);
        }
      } catch (e) {
        console.error('[generate-manifest] Video upload failed:', e);
        parts.push({
          text: '[SYSTEM: Video upload failed. Ignoring motion source.]',
        });
      }
    }

    const postImageInstructions = `
${colorInjectionLine}

**COMPONENT PROTOCOLS:**

BUTTON_DETECTION_PROTOCOL:
- Any element that looks clickable (Pills, Rectangles with text) IS A BUTTON.
- Use type: "button" for these. DO NOT simplify to text.

ICON PROTOCOL:
- Use type: "icon" with attributes.src set to Lucide icon name.
- Valid names: "Menu", "Search", "User", "Heart", "Star", "ChevronDown", "X", "Check", "Plus", "Settings", "Home", "Mail", "Github", "ArrowRight"
- Example: { "type": "icon", "attributes": { "src": "Menu" }, "styles": { "tailwindClasses": "w-6 h-6" } }

NAVIGATION SPACING PROTOCOL:
- Nav containers MUST use "flex items-center gap-4" or "gap-6".
- Headers should use "justify-between" to spread logo/nav apart.

TEXT SPACING PROTOCOL:
- Text containers: "flex flex-col gap-4" or "space-y-4".
- Headlines: "text-4xl font-bold leading-tight mb-4".
- Paragraphs: "text-lg leading-relaxed mb-4".

BACKGROUND PROTOCOL:
- Root MUST have "bg-background min-h-screen w-full".
- Each section needs an explicit bg- class (bg-background, bg-surface, bg-primary).
- Dark backgrounds pair with "text-white".

**HYBRID LAYOUT PROTOCOL:**
1. **Flow Truth (Tailwind)**: Standard classes (flex, grid, gap).
2. **Visual Truth (Bounds)**: Exact percentage coordinates.

For structural elements, populate the "layout" field:
"layout": {
  "mode": "flow" | "absolute",
  "bounds": { "x": 0, "y": 0, "width": 100, "height": 10, "unit": "%" },
  "zIndex": 10
}

MODE DECISION RULES:
- Is it a section container (header, hero, footer)? → Consider "absolute" for exact replica
- Is it text flowing naturally? → "flow"
- Is it a floating/overlapping element? → "absolute"
- VIDEO SOURCE? → Always "flow" (absolute kills animation)

**MOTION PROTOCOL (For Video/Merge):**
- Populate 'styles.motion' with Framer Motion props.
- Example: "initial": { "opacity": 0, "y": 20 }, "animate": { "opacity": 1, "y": 0 }

REQUIRED OUTPUT SCHEMA:
{
  "id": "manifest-id",
  "version": "1.0.0",
  "root": { /* UISpecNode */ },
  "definitions": {},
  "detectedFeatures": [],
  "designSystem": { "colors": {...}, "fonts": {...} }
}

UISpecNode REQUIRED FIELDS:
- id: string (unique like "hero-section-1")
- type: "container" | "text" | "button" | "input" | "list" | "icon" | "image"
- semanticTag: string (like "hero-section", "cta-button")
- styles: { tailwindClasses: "..." }
- attributes: {}
- children?: UISpecNode[] (only for non-void elements)
- layout?: { mode, bounds, zIndex }

VOID ELEMENTS (image, input, icon) MUST NOT have children arrays.

IMAGE URL RULE:
- Use placeholder URLs like "https://placehold.co/400x300/e2e8f0/64748b?text=Image"
- NEVER use local filenames.

OUTPUT: Complete JSON LayoutManifest with ALL required fields.
`;

    parts.push({ text: postImageInstructions });

    if (userPrompt) {
      parts.push({ text: `USER REQUEST: ${userPrompt}` });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    const cleanJson = (text: string): string => {
      return text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    };

    let manifest: LayoutManifest;
    try {
      manifest = JSON.parse(cleanJson(responseText));
    } catch {
      console.error('[generate-manifest] Failed to parse JSON:', responseText.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', rawResponse: responseText },
        { status: 500 }
      );
    }

    // --- POST-PROCESSING ---

    // Ensure root.children is always an array
    if (manifest.root && !Array.isArray(manifest.root.children)) {
      manifest.root.children = [];
    }

    // Force extracted colors into manifest
    if (extractedColors) {
      console.log('[generate-manifest] Force-applying extracted colors');
      if (!manifest.designSystem) {
        manifest.designSystem = { colors: {}, fonts: { heading: 'Inter', body: 'Inter' } };
      }
      if (!manifest.designSystem.colors) {
        manifest.designSystem.colors = {};
      }
      manifest.designSystem.colors = {
        ...manifest.designSystem.colors,
        primary: extractedColors.primary,
        secondary: extractedColors.secondary,
        background: extractedColors.background,
        surface: extractedColors.surface,
        text: extractedColors.text,
        textMuted: extractedColors.textMuted || extractedColors.text,
        border: extractedColors.border,
        accent: extractedColors.accent,
      };
    }

    // Sanitize image URLs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sanitizeImageUrls(node: any): any {
      if (!node) return node;
      if (node.type === 'image' && node.attributes) {
        const src = node.attributes.src;
        if (src && typeof src === 'string') {
          const isValidUrl =
            src.startsWith('http://') ||
            src.startsWith('https://') ||
            src.startsWith('data:') ||
            src.startsWith('/');
          if (!isValidUrl) {
            const width = node.attributes.width || 400;
            const height = node.attributes.height || 300;
            node.attributes.src = `https://placehold.co/${width}x${height}/e2e8f0/64748b?text=Image`;
            if (!node.attributes.alt) node.attributes.alt = 'Placeholder image';
          }
        }
      }
      if (node.children && Array.isArray(node.children)) {
        node.children = node.children.map(sanitizeImageUrls);
      }
      return node;
    }

    if (manifest.root) {
      manifest.root = sanitizeImageUrls(manifest.root);
    }

    // Force root background & layout
    if (manifest.root) {
      if (!manifest.root.styles) manifest.root.styles = { tailwindClasses: '' };
      let classes = manifest.root.styles.tailwindClasses || '';
      if (!classes.includes('min-h-screen')) classes = `min-h-screen ${classes}`;
      if (!classes.includes('w-full')) classes = `w-full ${classes}`;
      if (!classes.includes('bg-background')) classes = `${classes} bg-background`;
      manifest.root.styles.tailwindClasses = classes.trim();
    }

    // Sanitize manifest (remove children from void elements)
    const {
      manifest: sanitizedManifest,
      totalRemovedChildren,
      affectedNodes,
    } = sanitizeManifest(manifest);

    if (totalRemovedChildren > 0) {
      console.log(
        `[generate-manifest] Sanitized: Removed ${totalRemovedChildren} children from ${affectedNodes.length} void elements`
      );
    }

    console.log('[generate-manifest] FINAL MANIFEST:', {
      id: sanitizedManifest.id,
      rootType: sanitizedManifest.root?.type,
      rootChildrenCount: sanitizedManifest.root?.children?.length ?? 0,
      strategy: isMergeMode ? 'MERGE' : hasVideo ? 'VIDEO_FLOW' : 'IMAGE_FIDELITY',
    });

    return NextResponse.json({ manifest: sanitizedManifest });
  } catch (error) {
    console.error('[generate-manifest] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Architect API - Multi-Strategy Layout Generator',
    version: '3.0',
    description: 'Generate layouts with smart source detection',
    strategies: {
      IMAGE: 'Visual Fidelity with absolute bounds',
      VIDEO: 'Precision Flow with arbitrary Tailwind (no absolute)',
      MERGE: 'Directors Cut - Image visuals + Video motions',
    },
  });
}
