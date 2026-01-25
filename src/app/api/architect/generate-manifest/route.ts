/**
 * Architect API Route - Generate Layout Manifest
 *
 * Server-side route for generating layout manifests using Gemini AI.
 * Handles file uploads via GoogleAIFileManager which requires server-side Node.js.
 *
 * Supports:
 * - Multi-image upload with indexed references (Image 1, Image 2, etc.)
 * - Selective merging: "buttons from Image 1, colors from Image 2"
 * - Video upload for temporal inference (loading states, transitions)
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import { sanitizeManifest } from '@/utils/manifestSanitizer';
import type { ColorPalette } from '@/utils/colorExtraction';

// Vercel serverless function config
export const maxDuration = 120; // 2 minutes for video processing
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
      return NextResponse.json(
        {
          error:
            'Google AI API key not configured. Set GOOGLE_AI_API_KEY or GEMINI_API_KEY in environment.',
        },
        { status: 500 }
      );
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    // Gemini 3 Flash for fast, high-quality vision with multimodal support
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: { responseMimeType: 'application/json' },
    });

    // Build context based on whether concept is provided
    const contextLine = concept
      ? `CONTEXT: App "${concept.name}" - ${concept.purpose}.`
      : 'CONTEXT: Analyzing provided reference image/video to create a UI layout.';

    // Build system prompt with multi-image awareness
    const hasMultipleImages = images && images.length > 1;
    const imageContextLine =
      images && images.length > 0
        ? `\nREFERENCE IMAGES: ${images.length} image(s) provided, indexed as Image 1${images.length > 1 ? `, Image 2${images.length > 2 ? ', etc.' : ''}` : ''}.
The user may request selective elements from different images. Follow their instructions precisely.`
        : '';

    // Build color injection context - USE SEMANTIC CLASSES (production-safe)
    const colorInjectionLine = extractedColors
      ? `
DESIGN SYSTEM (GROUND TRUTH - EXTRACTED FROM IMAGE):
The following colors were algorithmically extracted using k-means clustering.
These will be injected as CSS variables at runtime.

YOU MUST USE SEMANTIC TAILWIND CLASSES (not arbitrary hex values):
- Primary: ${extractedColors.primary} → USE CLASS: "bg-primary" or "text-primary"
- Secondary: ${extractedColors.secondary} → USE CLASS: "bg-secondary" or "text-secondary"
- Accent: ${extractedColors.accent} → USE CLASS: "bg-accent" or "text-accent"
- Background: ${extractedColors.background} → USE CLASS: "bg-background"
- Surface: ${extractedColors.surface} → USE CLASS: "bg-surface"
- Text: ${extractedColors.text} → USE CLASS: "text-text"
- Text Muted: ${extractedColors.textMuted} → USE CLASS: "text-text-muted"
- Border: ${extractedColors.border} → USE CLASS: "border-border"

CRITICAL RULES:
✓ USE semantic classes: bg-primary, bg-background, text-text, border-border
✓ USE opacity modifiers: bg-primary/80, text-text/60
✓ USE state modifiers: hover:bg-primary, focus:border-accent
❌ DO NOT use arbitrary hex values like bg-[#123456] (purged in production)
❌ DO NOT use generic Tailwind colors like bg-slate-900, text-gray-600`
      : '';

    // Layout structure and component detection protocol
    const componentTargets = `
LAYOUT_STRUCTURE_PROTOCOL (CRITICAL):
Analyze the image from TOP to BOTTOM in this order:

1. **HEADER DETECTION (Top 15% of image)**:
   - Look for navigation bar, logo, menu items, search bar, user avatar.
   - Create a container with semanticTag "header" or "navigation".
   - All nav items should be type: "button".

2. **HERO DETECTION (Below header, top 30-50% of image)**:
   - Look for large headlines, subheadlines, hero images, CTA buttons.
   - Create a container with semanticTag "hero-section".
   - CTA buttons MUST be type: "button".

3. **CONTENT DETECTION (Middle sections)**:
   - Cards, features, testimonials, pricing tables.
   - Each distinct section gets its own container.

4. **FOOTER DETECTION (Bottom 10-15% of image)**:
   - Links, social icons, copyright text.
   - Create a container with semanticTag "footer".

BUTTON_DETECTION_PROTOCOL:
- ANY rectangular element that looks interactive = type: "button"
- Navigation links, CTAs, "Sign Up", "Login", "Get Started" = type: "button"
- Do NOT use "text" nodes for buttons - they must be type: "button"
- If in doubt, make it a button.

BACKGROUND VISUAL RULE:
- The ROOT container MUST have "bg-background" in tailwindClasses
- If header has different color, use "bg-surface" or "bg-primary" for that node

COMPONENT DENSITY TARGETS:
- Landing Page: 15-20 distinct components
- Dashboard: 25-35 distinct components
- Complex App: 40+ distinct components

For EVERY visible element in the image, create a corresponding node.`;

    // ========================================
    // PHASE 8: RESTRUCTURED MULTIMODAL PROMPT
    // Images come EARLY, spatial instructions come AFTER images
    // ========================================

    // PART 1: Brief pre-image context (keep it short so image is near the start)
    const preImageContext = `
ROLE: Expert Frontend Architect specializing in UI replication and composition.
${contextLine}${imageContextLine}

TASK: Analyze the reference image(s) provided below to generate a complete LayoutManifest.
Pay close attention to the visual layout structure - the image(s) will appear next.
`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: preImageContext }];

    // PART 2: Add images IMMEDIATELY after brief context (critical for spatial anchoring)
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} image(s) for analysis...`);

      images.forEach((img, index) => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        });
        parts.push({
          text: `[IMAGE ${index + 1}] - Filename: ${img.name}`,
        });
      });

      if (images.length > 1) {
        parts.push({
          text: `You have been provided ${images.length} reference images. The user's request may specify which elements to take from which image.`,
        });
      }
    }

    // PART 3: Detailed analysis instructions AFTER the image (so spatial rules anchor to visual content)
    const multiImageRules = hasMultipleImages
      ? `
MULTI-IMAGE EXTRACTION RULES:
1. If user says "replicate Image 1" → Extract ALL elements, colors, and structure from Image 1
2. If user says "buttons from Image 1, colors from Image 2" →
   - Extract button styles/shapes from Image 1
   - Extract color palette from Image 2
   - Merge them in the output manifest
3. If user says "layout from Image 1, header from Image 2" →
   - Use Image 1's overall structure
   - Replace/use Image 2's header component
4. For each image, extract:
   - Exact hex color values (#RRGGBB format)
   - Component structure (buttons, cards, headers, etc.)
   - Spacing and proportions
   - Typography (font styles, sizes)
`
      : '';

    const postImageInstructions = `
NOW ANALYZE THE IMAGE(S) ABOVE using these protocols:

${colorInjectionLine}

${componentTargets}

${multiImageRules}

USER INTENT HANDLING - Follow the user's instructions precisely:
- REPLICA: If user wants an exact copy, replicate every visible element, spacing, and style.
- SELECTIVE: If user specifies "only the header" or "just the buttons", extract ONLY those elements.
- MERGE: If user provides multiple images and says "hero from image 1, footer from image 2", combine them accurately.
- STYLE TRANSFER: If user says "structure from A, colors from B", apply the style transfer.

IMAGE ANALYSIS - EXACT REPLICATION REQUIRED:
1. Extract the EXACT color palette from the image(s) (hex values for primary, secondary, background, surface, text)
2. Identify EVERY visible UI component (headers, buttons, cards, forms, navigation, etc.)
3. Capture the precise spacing, padding, and layout structure
4. Note typography: font families, sizes, weights visible in the image
5. The output LayoutManifest MUST faithfully replicate the design - every element, every color, every spacing value

TEMPORAL INFERENCE RULES (Video Only):
- INFER STATE: If a spinner appears, set 'state.isLoading = true'.
- INFER TRANSITIONS: If a menu slides/fades, set 'state.isHidden = true' and 'styles.motion' props.
- INFER TRIGGERS: If an element reacts to a cursor, set 'state.trigger = hover'.

REQUIRED OUTPUT SCHEMA - Every field is MANDATORY:
{
  "id": "unique-manifest-id",
  "version": "1.0.0",
  "root": { /* UISpecNode - see below */ },
  "definitions": {},
  "detectedFeatures": [],
  "designSystem": {
    "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex", "surface": "#hex", "text": "#hex", "textMuted": "#hex", "border": "#hex", "accent": "#hex" },
    "fonts": { "heading": "font-name", "body": "font-name" }
  }
}

UISpecNode REQUIRED FIELDS (every node MUST have ALL of these):
- id: string (unique identifier like "hero-section-1")
- type: "container" | "text" | "button" | "input" | "list" | "icon" | "image"
- semanticTag: string (descriptive tag like "hero-section", "nav-link", "cta-button")
- styles: { tailwindClasses: "space-separated tailwind classes" }
- attributes: {} (can be empty object, but MUST exist)
- children?: UISpecNode[] (only for non-void elements)

VOID ELEMENTS (image, input) MUST NOT have children arrays.

OUTPUT: Complete JSON LayoutManifest with ALL required fields populated. No omissions.
`;

    parts.push({ text: postImageInstructions });

    // PART 4: User prompt LAST
    if (userPrompt) {
      parts.push({ text: `USER REQUEST: ${userPrompt}` });
    }

    // Handle video upload if provided - with graceful fallback
    if (videoBase64 && videoMimeType) {
      console.log('Uploading video for Temporal Inference...');

      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(videoBase64, 'base64');

        // Upload to Google File API
        const uploadResponse = await fileManager.uploadFile(buffer, {
          mimeType: videoMimeType,
          displayName: videoFileName || 'uploaded-video',
        });

        // Wait for processing (video takes time to ingest)
        let fileState = await fileManager.getFile(uploadResponse.file.name);
        let attempts = 0;
        const maxAttempts = 30; // 1 minute max wait (reduced for better UX)

        while (fileState.state === FileState.PROCESSING && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          fileState = await fileManager.getFile(uploadResponse.file.name);
          attempts++;
        }

        if (fileState.state === FileState.ACTIVE) {
          // Add file reference to the prompt
          parts.push({
            fileData: {
              mimeType: fileState.mimeType,
              fileUri: fileState.uri,
            },
          });

          parts.push({
            text: 'VIDEO ANALYSIS: Identify hidden states, transitions, and loading sequences.',
          });
        } else {
          throw new Error(`Video processing state: ${fileState.state}`);
        }
      } catch (e) {
        // Graceful fallback - continue with images/prompt only
        console.error('⚠️ Video processing failed, falling back to prompt-only:', e);
        parts.push({
          text: '[SYSTEM: Video analysis failed. Proceed using user prompt and any provided images.]',
        });
        // Don't return 500 - continue with degraded functionality
      }
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    // Helper to strip Markdown code blocks (Gemini sometimes wraps JSON in ```json...```)
    const cleanJson = (text: string): string => {
      return text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    };

    let manifest: LayoutManifest;
    try {
      const cleanedJson = cleanJson(responseText);
      manifest = JSON.parse(cleanedJson);
    } catch {
      console.error('[generate-manifest] Failed to parse JSON:', responseText.slice(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', rawResponse: responseText },
        { status: 500 }
      );
    }

    // Ensure root.children is always an array (Gemini may return undefined)
    if (manifest.root && !Array.isArray(manifest.root.children)) {
      console.log('[generate-manifest] Defaulting root.children to empty array');
      manifest.root.children = [];
    }

    // HARD OVERWRITE: Force extracted colors into manifest - don't trust AI
    // This guarantees color fidelity even if AI ignores prompt instructions
    if (extractedColors) {
      console.log('HARD OVERWRITE: Force-applying extracted colors to Architect result');

      // Ensure designSystem exists
      if (!manifest.designSystem) {
        manifest.designSystem = { colors: {}, fonts: { heading: 'Inter', body: 'Inter' } };
      }
      if (!manifest.designSystem.colors) {
        manifest.designSystem.colors = {};
      }

      // Force all extracted colors - these are mathematically accurate from k-means
      manifest.designSystem.colors = {
        ...manifest.designSystem.colors, // Keep any AI-detected colors as fallback
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

    // POST-PROCESSING: FORCE ROOT BACKGROUND & LAYOUT
    // Ensures root has proper dimensions and background even if AI forgets
    if (manifest.root) {
      // Ensure styles object exists
      if (!manifest.root.styles) manifest.root.styles = { tailwindClasses: '' };

      let classes = manifest.root.styles.tailwindClasses || '';

      // Force minimum height and width
      if (!classes.includes('min-h-screen')) classes = `min-h-screen ${classes}`;
      if (!classes.includes('w-full')) classes = `w-full ${classes}`;

      // Force background color if missing
      if (!classes.includes('bg-background')) {
        console.log('POST-FIX: Injecting missing bg-background class');
        classes = `${classes} bg-background`;
      }

      manifest.root.styles.tailwindClasses = classes.trim();
    }

    // Sanitize manifest: Strip children from void elements (image, input)
    const {
      manifest: sanitizedManifest,
      totalRemovedChildren,
      affectedNodes,
    } = sanitizeManifest(manifest);

    if (totalRemovedChildren > 0) {
      console.log(
        `Manifest sanitized: Removed ${totalRemovedChildren} children from ${affectedNodes.length} void element nodes:`,
        affectedNodes
      );
    }

    return NextResponse.json({ manifest: sanitizedManifest });
  } catch (error) {
    console.error('Architect generate-manifest error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate layout manifest',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Architect API - Generate Layout Manifest',
    version: '2.0',
    description:
      'Generate LayoutManifest from app concept using Gemini AI with multi-image and video analysis',
    endpoints: {
      generate: 'POST /api/architect/generate-manifest',
    },
    requiredEnv: ['GOOGLE_AI_API_KEY or GEMINI_API_KEY'],
    features: [
      'App concept to layout manifest conversion',
      'Multi-image upload with indexed references (Image 1, Image 2, etc.)',
      'Selective merging: "buttons from Image 1, colors from Image 2"',
      'Video upload and temporal inference',
      'Exact color extraction from images',
      'Recursive UI schema generation',
    ],
  });
}
