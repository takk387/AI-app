/**
 * Builder API Route - Vibe Coding Operations
 *
 * Server-side route for BuilderService operations using Gemini AI.
 * Handles applyVibe and refineElement operations.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LayoutManifest, LayoutManifestSchema, UISpecNode } from '@/types/schema';
import { sanitizeManifest } from '@/utils/manifestSanitizer';

// Vercel serverless function config
export const maxDuration = 60; // 1 minute timeout
export const dynamic = 'force-dynamic';

// Safe JSON parsing helper to prevent crashes from malformed AI responses
function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    console.error('JSON parse failed:', text.slice(0, 200));
    return fallback;
  }
}

interface VibeRequest {
  action: 'applyVibe' | 'refineElement';
  manifest?: LayoutManifest;
  node?: UISpecNode;
  prompt: string;
  metaphor?: string;
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

    const body: VibeRequest = await request.json();
    const { action, manifest, node, prompt, metaphor } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (action === 'applyVibe') {
      if (!manifest) {
        return NextResponse.json({ error: 'Manifest required for applyVibe' }, { status: 400 });
      }

      try {
        // PHASE 1: THE METAPHOR (Physics & Texture)
        const generatedMetaphor = await generatePhysicalMetaphor(model, prompt);
        console.log('Active Metaphor:', generatedMetaphor);

        // PHASE 2: THE SYNTHESIS (Flash UI Persona)
        const styledManifest = await synthesizeStyles(model, manifest, generatedMetaphor);

        // Sanitize void elements before validation
        const { manifest: sanitizedManifest } = sanitizeManifest(styledManifest);

        // Self-Healing Pass
        const validatedManifest = await validateAndFix(model, sanitizedManifest);

        return NextResponse.json({ manifest: validatedManifest, metaphor: generatedMetaphor });
      } catch (e) {
        console.error('Vibe Coding Failed:', e);
        // Fail safe - return original manifest with default metaphor
        return NextResponse.json({ manifest, metaphor: 'Clean minimal matte paper' });
      }
    }

    if (action === 'refineElement') {
      if (!node || !metaphor) {
        return NextResponse.json({ error: 'Node and metaphor required for refineElement' }, { status: 400 });
      }

      const refinePrompt = `
        ROLE: You are "Flash UI".
        CONTEXT: The overall design metaphor is: "${metaphor}".
        TASK: Refine this specific component based on: "${prompt}".

        CRITICAL RULE: Interpret adjectives as PHYSICAL properties.
        - "Heavier" -> Increase shadow opacity, darken background, thicken border.
        - "Lighter" -> Reduce alpha channels, increase backdrop-blur.
        - "More obsidian" -> Deeper blacks, sharper edges.
        - "More glass" -> More transparency, more blur.

        INPUT NODE: ${JSON.stringify(node)}
        OUTPUT: The same node with updated 'styles.tailwindClasses'.
      `;

      const result = await model.generateContent(refinePrompt);
      const updatedNode = safeJsonParse(result.response.text(), node);

      // Validate required fields exist
      if (!updatedNode.id || !updatedNode.type || !updatedNode.styles) {
        console.warn('AI returned incomplete node, using original');
        return NextResponse.json({ node });
      }

      // Localized Self-Healing
      const lintedNode = lintTailwindClasses(updatedNode);

      return NextResponse.json({ node: lintedNode });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Builder vibe route error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process vibe request' },
      { status: 500 }
    );
  }
}

// --- INTERNAL HELPERS ---

async function generatePhysicalMetaphor(model: any, userPrompt: string): Promise<string> {
  const prompt = `
    TASK: Convert this UI request into a "Physical Material Metaphor".
    USER REQUEST: "${userPrompt}"

    RULES:
    1. Do NOT use web terms (no "sidebar", "header", "css").
    2. Describe lighting, texture, material physics, and motion.
    3. Example: "Obsidian Glass" -> "Volcanic black glass, high gloss reflection, razor sharp edges, internal purple refraction."

    OUTPUT: Return as JSON: { "metaphor": "your description here" }
  `;

  const result = await model.generateContent(prompt);
  const parsed = safeJsonParse(result.response.text(), { metaphor: 'Clean minimal matte paper' });
  return parsed.metaphor || 'Clean minimal matte paper';
}

async function synthesizeStyles(model: any, manifest: LayoutManifest, metaphor: string): Promise<LayoutManifest> {
  const prompt = `
ROLE: "Flash UI" - Tailwind CSS styling engine.
TASK: Apply styles to the provided LayoutManifest based on the physical metaphor.

CRITICAL: Return the COMPLETE manifest with ALL fields preserved. Do NOT omit any fields.

METAPHOR: "${metaphor}"

STYLE MAPPING:
- Glass/Liquid -> backdrop-blur-xl, bg-opacity-*, bg-white/10, border-white/20
- Steel/Metal -> bg-gradient-to-br from-gray-100 to-gray-300, border-gray-400, shadow-md
- Neon/Light -> shadow-[0_0_15px_rgba(...)], ring-2 ring-cyan-400, text-cyan-400
- Obsidian/Volcanic -> bg-black, border-0, rounded-none, text-white
- Paper/Matte -> bg-white, shadow-sm, border border-gray-200, rounded-lg

INSTRUCTIONS:
1. Modify ONLY the styles.tailwindClasses values to match the metaphor
2. Preserve ALL other fields exactly: id, type, semanticTag, attributes, children structure
3. Return the COMPLETE manifest JSON - do NOT omit any fields
4. Every node MUST still have: id, type, semanticTag, styles (with tailwindClasses), attributes
5. Preserve the entire tree structure including all nested children

REQUIRED OUTPUT STRUCTURE:
{
  "id": "...",
  "version": "...",
  "root": { /* complete UISpecNode tree */ },
  "definitions": { /* preserve all */ },
  "detectedFeatures": [ /* preserve all */ ],
  "designSystem": { "colors": {...}, "fonts": {...} }
}

Return ONLY the complete styled JSON manifest.
  `;

  const result = await model.generateContent([{ text: prompt }, { text: JSON.stringify(manifest) }]);
  return safeJsonParse(result.response.text(), manifest);
}

async function validateAndFix(model: any, jsonInput: any, attempt = 1): Promise<LayoutManifest> {
  const MAX_RETRIES = 3;
  try {
    const parsed = LayoutManifestSchema.parse(jsonInput);
    const cleanRoot = lintTailwindClasses(parsed.root);
    const cleanDefs: Record<string, UISpecNode> = {};
    Object.entries(parsed.definitions ?? {}).forEach(([key, node]) => {
      if (node) {
        cleanDefs[key] = lintTailwindClasses(node as UISpecNode);
      }
    });
    return {
      ...parsed,
      root: cleanRoot,
      definitions: cleanDefs,
      designSystem: {
        ...parsed.designSystem,
        colors: Object.fromEntries(Object.entries(parsed.designSystem?.colors ?? {}).map(([k, v]) => [k, String(v)])),
        fonts: parsed.designSystem?.fonts ?? { heading: 'sans-serif', body: 'sans-serif' },
      },
    };
  } catch (error: any) {
    if (attempt > MAX_RETRIES) {
      console.error('Critical: Repair failed 3 times. Engaging Safe Mode.');
      return generateSafeModeManifest();
    }
    console.warn(`Validation Error (Attempt ${attempt}):`, error.message);
    const fixedJson = await repairJson(model, JSON.stringify(jsonInput), error.message);
    return validateAndFix(model, fixedJson, attempt + 1);
  }
}

async function repairJson(model: any, brokenJson: string, error: string): Promise<any> {
  const prompt = `Fix this JSON structure based on the error: ${error}.\n\n${brokenJson.slice(0, 2000)}`;
  const result = await model.generateContent(prompt);
  // Try to parse AI response, fall back to parsing the original broken JSON
  try {
    return JSON.parse(result.response.text());
  } catch {
    console.error('Repair JSON parse failed, attempting to return original');
    return JSON.parse(brokenJson);
  }
}

function lintTailwindClasses(node: UISpecNode): UISpecNode {
  // Guard against missing styles
  if (!node.styles?.tailwindClasses) {
    return {
      ...node,
      styles: { ...node.styles, tailwindClasses: '' },
      children: node.children?.filter(Boolean).map((c) => lintTailwindClasses(c)),
    };
  }

  const validClassPattern = /^[a-z0-9\-:[\]/#.%]+$/i;
  const cleanClasses = node.styles.tailwindClasses
    .split(' ')
    .filter((cls) => cls.trim() && validClassPattern.test(cls))
    .join(' ');

  // Void element types cannot have children (maps to HTML void elements)
  const VOID_ELEMENT_TYPES = ['image', 'input'];
  const isVoidElement = VOID_ELEMENT_TYPES.includes(node.type);

  return {
    ...node,
    styles: { ...node.styles, tailwindClasses: cleanClasses },
    children: isVoidElement ? undefined : node.children?.filter(Boolean).map((c) => lintTailwindClasses(c)),
  };
}

function generateSafeModeManifest(): LayoutManifest {
  return {
    id: 'safe-mode-fallback',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'container',
      semanticTag: 'safe-mode-container',
      styles: { tailwindClasses: 'min-h-screen flex items-center justify-center bg-gray-100 p-8' },
      attributes: {},
      children: [
        {
          id: 'error-card',
          type: 'container',
          semanticTag: 'error-card',
          styles: { tailwindClasses: 'bg-white rounded-lg shadow-lg p-8 max-w-md text-center' },
          attributes: {},
          children: [
            {
              id: 'error-icon',
              type: 'icon',
              semanticTag: 'warning-icon',
              styles: { tailwindClasses: 'w-16 h-16 text-amber-500 mx-auto mb-4' },
              attributes: { src: 'AlertTriangle' },
            },
            {
              id: 'error-title',
              type: 'text',
              semanticTag: 'error-title',
              styles: { tailwindClasses: 'text-xl font-semibold text-gray-900 mb-2' },
              attributes: { text: 'Layout Generation Issue' },
            },
            {
              id: 'error-description',
              type: 'text',
              semanticTag: 'error-description',
              styles: { tailwindClasses: 'text-gray-600' },
              attributes: { text: 'The layout could not be fully generated. This is a safe fallback view. Please try regenerating.' },
            },
          ],
        },
      ],
    },
    definitions: {},
    detectedFeatures: [],
    designSystem: {
      colors: { primary: '#3b82f6', secondary: '#6b7280', background: '#f3f4f6', surface: '#ffffff', text: '#111827' },
      fonts: { heading: 'Inter', body: 'Inter' },
    },
  };
}

export async function GET() {
  return NextResponse.json({
    name: 'Builder API - Vibe Coding',
    version: '1.0',
    description: 'Apply styles and refine elements using Gemini AI',
    endpoints: {
      applyVibe: 'POST /api/builder/vibe { action: "applyVibe", manifest, prompt }',
      refineElement: 'POST /api/builder/vibe { action: "refineElement", node, prompt, metaphor }',
    },
    requiredEnv: ['GOOGLE_AI_API_KEY or GEMINI_API_KEY'],
  });
}
