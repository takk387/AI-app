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
import type { LayoutManifest, UISpecNode } from '@/types/schema';
import { sanitizeManifest } from '@/utils/manifestSanitizer';
import type { ColorPalette } from '@/utils/colorExtraction';
import { geminiImageService } from '@/services/GeminiImageService';
import { AssetExtractionService, type ExtractedAssets } from '@/services/AssetExtractionService';

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

/**
 * Recursively find a node tagged for background generation.
 * Looks for nodes with semanticTag: 'custom-background-layer'.
 */
function findBackgroundNode(node: UISpecNode): UISpecNode | null {
  if (node.semanticTag === 'custom-background-layer') return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findBackgroundNode(child);
      if (found) return found;
    }
  }
  return null;
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

    // --- SINGLE-PROMPT FLOW (All sources: image, video, merge, or none) ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
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
      // STATIC IMAGE HARDCOPY with PIXEL-PRECISION (Phase 18 Enhanced)
      strategyInstruction = `
STRATEGY: **STATIC IMAGE HARDCOPY (Exact Replica with Pixel Precision)**
The user wants an EXACT REPLICA of this specific screen.

1. **LAYOUT (HARDCOPY MODE)**:
   - **ROOT NODE EXCEPTION**: The root container MUST use 'layout.mode: "flow"' with "relative" class.
   - **ALL CHILDREN**: Use 'layout.mode: "absolute"' with bounds.
   - Every button, text, icon, and card gets a bounding box: { x, y, width, height, unit: "%" }.
   - Root acts as positioning container. Children are absolutely positioned inside it.

2. **PIXEL-PRECISION RULES (CRITICAL)**:
   - **Do NOT use vague terms.** Estimate exact values:
     - Hero Height: "850px" not "tall"
     - Border Radius: "16px" or "24px" not "rounded"
     - Font Sizes: "64px" heading, "16px" body - not "large" or "small"
     - Padding/Margin: "80px" not "spacious"
     - Gap/Spacing: "24px" not "normal"
   - Store these in 'styles.customCSS' or use Tailwind arbitrary values: 'h-[850px]', 'rounded-[16px]'

3. **ADVANCED EFFECTS DETECTION**:
   - **Glassmorphism**: If you see blurred, semi-transparent backgrounds:
     Extract: 'backdrop-filter: blur(Xpx)', 'background: rgba(255,255,255,0.X)'
   - **Mesh Gradients / Auroras**: Soft multi-color blends (not linear):
     Extract the 3-5 colors and positions
   - **Neumorphism**: Elements with double shadows (light + dark):
     Extract: 'box-shadow: -Xpx -Ypx #light, Xpx Ypx #dark'
   - Store effects in 'styles.customCSS'

4. **BOUNDS CALCULATION**:
   - X/Y/Width/Height as PERCENTAGES (0-100) relative to viewport.
   - SPATIAL PROTOCOL: HEADER (0-15%), HERO (15-50%), CONTENT (50-90%), FOOTER (90-100%).

5. **EXHAUSTIVE COMPONENT DETECTION**:
   - Detect 20-30+ components minimum
   - Every button, icon, text, card, image you see = a UISpecNode
   - Don't summarize: "navigation with links" → wrong
   - Be specific: "sticky nav with logo, 5 menu items, search icon, CTA button" → correct

6. **FIDELITY RULES**:
   - If there is an icon visible, use type: "icon" with correct attributes.src.
   - If there is a background image/gradient, use customCSS on the container.
   - Match colors, spacing, and typography EXACTLY using the pixel values you detected.
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

**ICON PROTOCOL (ZERO TOLERANCE):**
- **ICONS ARE VOID ELEMENTS.** They CANNOT have children or text content.
- **NEVER** use { "type": "text", "attributes": { "text": "icon" } }. This is lazy and FORBIDDEN.
- **NEVER** use attributes.text on icon nodes. Icons have NO text content.
- **ALWAYS** use { "type": "icon", "attributes": { "src": "IconName" } }.
- Detect the icon shape: Hamburger/3-lines -> "Menu", Magnifier -> "Search", Chevron -> "ChevronDown", Person -> "User", X -> "X".
- Valid Lucide names: "Menu", "Search", "User", "Heart", "Star", "ChevronDown", "ChevronUp", "ChevronLeft", "ChevronRight", "X", "Check", "Plus", "Minus", "Settings", "Home", "Mail", "Github", "ArrowRight", "ArrowLeft", "AlertTriangle", "Bell", "Calendar", "Camera", "Clock", "Download", "Edit", "Eye", "EyeOff", "Filter", "Folder", "Image", "Info", "Link", "Lock", "MapPin", "MoreHorizontal", "MoreVertical", "Phone", "Play", "Pause", "Send", "Share", "ShoppingCart", "Trash", "Upload", "Circle"
- If unsure of the icon, use "Circle".
- Example: { "type": "icon", "attributes": { "src": "Menu" }, "styles": { "tailwindClasses": "w-6 h-6" } }

NAVIGATION SPACING PROTOCOL:
- Nav containers MUST use "flex items-center gap-4" or "gap-6".
- Headers should use "justify-between" to spread logo/nav apart.

TEXT SPACING PROTOCOL:
- Text containers: "flex flex-col gap-4" or "space-y-4".
- Headlines: "text-4xl font-bold leading-tight mb-4".
- Paragraphs: "text-lg leading-relaxed mb-4".

**BACKGROUND PROTOCOL:**
- Root MUST have "bg-background min-h-screen w-full".
- Each section needs an explicit bg- class (bg-background, bg-surface, bg-primary).
- Dark backgrounds pair with "text-white".
- **FOR COMPLEX BACKGROUNDS (gradient, pattern, photo):**
  - The ROOT or section container MUST have a customCSS style.
  - Set 'styles.customCSS': "background-image: url('https://placehold.co/1920x1080/333/666?text=Background'); background-size: cover;"
  - For gradients: 'styles.customCSS': "background: linear-gradient(135deg, #hex1, #hex2);"
  - Tag it as 'semanticTag': 'custom-background-layer'.

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

**ADVANCED VISUAL FIDELITY PROTOCOL:**
1. **Glassmorphism**: If semi-transparent blur is seen, apply 'backdrop-filter: blur(12px)' and 'background: rgba(255,255,255,0.1)' in styles.customCSS.
2. **Mesh Gradients**: Detect multi-color backgrounds; use 'background: linear-gradient(...)' in customCSS with extracted colors.
3. **Precision Spacing**: Use Tailwind arbitrary values like 'p-[24px]', 'gap-[18px]', 'h-[850px]' - NOT vague presets.
4. **Neumorphism**: Double shadows → 'box-shadow: -4px -4px 8px #light, 4px 4px 8px #dark' in customCSS.
5. **Border Radius Precision**: Extract exact values - 'rounded-[16px]' or 'rounded-[24px]', not 'rounded-lg'.
6. **Font Size Precision**: Detect exact sizes - 'text-[64px]' for hero headings, 'text-[16px]' for body.

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

VOID ELEMENTS (image, input, icon, video) MUST NOT have children arrays or text attributes.

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

    // --- AUTOMATIC BACKGROUND GENERATION (The Wiring) ---
    const backgroundNode = manifest.root ? findBackgroundNode(manifest.root) : null;
    const hasReferenceImage = images && images.length > 0;

    if (backgroundNode && hasReferenceImage) {
      console.log('[Architect] Custom background layer detected. Triggering Artist...');
      try {
        const generationResult = await geminiImageService.generateBackgroundFromReference({
          referenceImage: images[0].base64,
          colorPalette: extractedColors || {
            primary: '#000000',
            secondary: '#333333',
            accent: '#666666',
            background: '#ffffff',
            surface: '#f5f5f5',
            text: '#333333',
            textMuted: '#888888',
          },
          vibe: userPrompt || 'Professional UI background',
          vibeKeywords: ['ui', 'background', 'website', 'abstract'],
          resolution: '1K',
        });

        if (generationResult.imageUrl) {
          console.log('[Architect] Background generated:', generationResult.imageUrl);
          backgroundNode.styles.customCSS = `background-image: url('${generationResult.imageUrl}'); background-size: cover; background-position: center;`;
        }
      } catch (error) {
        console.error('[Architect] Background generation failed:', error);
      }
    }

    // --- ASSET EXTRACTION PIPELINE (NEW) ---
    // Extract real icons, images, and button styles from reference
    if (hasImages && !hasVideo) {
      console.log('[generate-manifest] Starting asset extraction pipeline...');
      try {
        const extractor = new AssetExtractionService();
        const extractedAssets = await extractor.extractAllAssets(images![0].base64);

        // Apply extracted assets to manifest
        manifest = applyExtractedAssets(manifest, extractedAssets);

        console.log('[generate-manifest] Asset extraction complete');
      } catch (error) {
        console.error('[generate-manifest] Asset extraction failed:', error);
        // Continue without extraction - don't block generation
      }
    }

    // Force root background & layout
    if (manifest.root) {
      if (!manifest.root.styles) manifest.root.styles = { tailwindClasses: '' };
      let classes = manifest.root.styles.tailwindClasses || '';
      if (!classes.includes('min-h-screen')) classes = `min-h-screen ${classes}`;
      if (!classes.includes('w-full')) classes = `w-full ${classes}`;
      if (!classes.includes('bg-background')) classes = `${classes} bg-background`;
      // CRITICAL: Root must have relative positioning to contain absolute children
      if (!classes.includes('relative')) classes = `relative ${classes}`;
      manifest.root.styles.tailwindClasses = classes.trim();

      // CRITICAL: Force root to flow mode - root must NEVER be absolute
      // When root is absolute, it has no height guarantee and collapses to 0px (invisible layout)
      if (manifest.root.layout?.mode === 'absolute') {
        manifest.root.layout.mode = 'flow';
        delete manifest.root.layout.bounds;
        console.log('[Architect] Forced root from absolute to flow mode');
      }
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

/**
 * Apply extracted assets (icons, images, buttons) to the manifest
 * Matches by bounding box coordinates with tolerance
 */
function applyExtractedAssets(manifest: LayoutManifest, assets: ExtractedAssets): LayoutManifest {
  interface BoundsLike {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  function boundsMatch(b1: BoundsLike | undefined, b2: BoundsLike | undefined): boolean {
    if (!b1 || !b2) return false;
    const threshold = 5; // 5% tolerance for matching
    return (
      Math.abs((b1.x || 0) - (b2.x || 0)) < threshold &&
      Math.abs((b1.y || 0) - (b2.y || 0)) < threshold &&
      Math.abs((b1.width || 0) - (b2.width || 0)) < threshold &&
      Math.abs((b1.height || 0) - (b2.height || 0)) < threshold
    );
  }

  function matchAndApply(node: UISpecNode): UISpecNode {
    const nodeBounds = node.layout?.bounds;

    // Match and apply icons
    if (node.type === 'icon' && nodeBounds) {
      const match = assets.icons.find((icon) => boundsMatch(nodeBounds, icon.bounds));
      if (match) {
        console.log(`[AssetExtraction] Matched icon: ${match.semanticId} -> ${match.url}`);
        node.attributes = {
          ...node.attributes,
          src: match.url,
        };
      }
    }

    // Match and apply images
    if (node.type === 'image' && nodeBounds) {
      const match = assets.images.find((img) => boundsMatch(nodeBounds, img.bounds));
      if (match) {
        console.log(`[AssetExtraction] Matched image: ${match.semanticId} -> ${match.url}`);
        node.attributes = {
          ...node.attributes,
          src: match.url,
          alt: match.semanticId,
        };
      }
    }

    // Match and apply button styles
    if (node.type === 'button' && nodeBounds) {
      const match = assets.buttons.find((btn) => boundsMatch(nodeBounds, btn.bounds));
      if (match) {
        console.log(`[AssetExtraction] Matched button: ${match.semanticId}`);
        const styles = match.styles;

        // Build custom CSS from extracted styles
        const customCSS = `
          background: ${styles.background};
          border-radius: ${styles.borderRadius};
          border: ${styles.borderWidth} solid ${styles.borderColor};
          box-shadow: ${styles.boxShadow};
          color: ${styles.textColor};
          font-size: ${styles.fontSize};
          font-weight: ${styles.fontWeight};
          padding: ${styles.padding};
        `
          .trim()
          .replace(/\s+/g, ' ');

        node.styles = {
          ...node.styles,
          customCSS: customCSS,
        };
      }
    }

    // Match and apply logos (treated like icons)
    if ((node.type === 'icon' || node.type === 'image') && nodeBounds) {
      const match = assets.logos.find((logo) => boundsMatch(nodeBounds, logo.bounds));
      if (match) {
        console.log(`[AssetExtraction] Matched logo: ${match.semanticId} -> ${match.url}`);
        node.attributes = {
          ...node.attributes,
          src: match.url,
          alt: match.semanticId,
        };
      }
    }

    // Recurse through children
    if (node.children && Array.isArray(node.children)) {
      node.children = node.children.map(matchAndApply);
    }

    return node;
  }

  return {
    ...manifest,
    root: matchAndApply(manifest.root),
  };
}

export async function GET() {
  return NextResponse.json({
    name: 'Architect API - Multi-Strategy Layout Generator',
    version: '3.1',
    description: 'Generate layouts with smart source detection + asset extraction',
    strategies: {
      IMAGE: 'Visual Fidelity with absolute bounds + extracted assets',
      VIDEO: 'Precision Flow with arbitrary Tailwind (no absolute)',
      MERGE: 'Directors Cut - Image visuals + Video motions',
    },
    features: {
      assetExtraction: 'Automatic extraction of icons, images, and button styles',
      backgroundGeneration: 'Custom background image generation',
      colorExtraction: 'Client-side color palette detection',
    },
  });
}
