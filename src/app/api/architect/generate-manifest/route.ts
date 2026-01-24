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
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google AI API key not configured. Set GOOGLE_AI_API_KEY or GEMINI_API_KEY in environment.' },
        { status: 500 }
      );
    }

    const body: GenerateManifestRequest = await request.json();
    const { concept, userPrompt, images, videoBase64, videoMimeType, videoFileName } = body;

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
    const imageContextLine = images && images.length > 0
      ? `\nREFERENCE IMAGES: ${images.length} image(s) provided, indexed as Image 1${images.length > 1 ? `, Image 2${images.length > 2 ? ', etc.' : ''}` : ''}.
The user may request selective elements from different images. Follow their instructions precisely.`
      : '';

    const systemPrompt = `
ROLE: Expert Frontend Architect specializing in UI replication and composition.
${contextLine}${imageContextLine}

TASK: Generate a complete LayoutManifest based on the user's specific instructions.

USER INTENT HANDLING - Follow the user's instructions precisely:
- REPLICA: If user wants an exact copy, replicate every visible element, spacing, and style.
- SELECTIVE: If user specifies "only the header" or "just the buttons", extract ONLY those elements.
- MERGE: If user provides multiple images and says "hero from image 1, footer from image 2", combine them accurately.
- STYLE TRANSFER: If user says "structure from A, colors from B", apply the style transfer.

${hasMultipleImages ? `
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
` : ''}

ALWAYS follow the user's explicit instructions. If they say "make it exactly like this", prioritize fidelity over simplification.

${images && images.length > 0 ? `
IMAGE ANALYSIS - EXACT REPLICATION REQUIRED:
1. Extract the EXACT color palette from the image(s) (hex values for primary, secondary, background, surface, text)
2. Identify EVERY visible UI component (headers, buttons, cards, forms, navigation, etc.)
3. Capture the precise spacing, padding, and layout structure
4. Note typography: font families, sizes, weights visible in the image
5. The output LayoutManifest MUST faithfully replicate the design - every element, every color, every spacing value
` : ''}

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: systemPrompt }];

    // Handle images - send inline as base64 with indexed labels
    if (images && images.length > 0) {
      console.log(`Processing ${images.length} image(s) for analysis...`);

      images.forEach((img, index) => {
        // Add the image inline
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        });
        // Add indexed label for the AI to reference
        parts.push({
          text: `[IMAGE ${index + 1}] - Reference this as "Image ${index + 1}" in your analysis. Filename: ${img.name}`,
        });
      });

      // Add specific analysis instructions after all images
      if (images.length > 1) {
        parts.push({
          text: `
MULTI-IMAGE ANALYSIS:
You have been provided ${images.length} reference images, labeled "Image 1" through "Image ${images.length}".
The user's request below may specify which elements to take from which image.
If no specific instructions, default to using Image 1 as the primary reference.
`,
        });
      }
    }

    // Add user prompt
    if (userPrompt) {
      parts.push({ text: `USER REQUEST: ${userPrompt}` });
    }

    // Handle video upload if provided
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
        const maxAttempts = 60; // 2 minutes max wait

        while (fileState.state === FileState.PROCESSING && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          fileState = await fileManager.getFile(uploadResponse.file.name);
          attempts++;
        }

        if (fileState.state === FileState.FAILED) {
          throw new Error('Video processing failed.');
        }

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
      } catch (e) {
        console.error('Video Ingest Failed', e);
        return NextResponse.json(
          { error: `Video upload failed: ${e instanceof Error ? e.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    let manifest: LayoutManifest;
    try {
      manifest = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', rawResponse: responseText },
        { status: 500 }
      );
    }

    // Sanitize manifest: Strip children from void elements (image, input)
    const { manifest: sanitizedManifest, totalRemovedChildren, affectedNodes } =
      sanitizeManifest(manifest);

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
    description: 'Generate LayoutManifest from app concept using Gemini AI with multi-image and video analysis',
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
