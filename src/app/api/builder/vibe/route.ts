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
        {
          error:
            'Google AI API key not configured. Set GOOGLE_AI_API_KEY or GEMINI_API_KEY in environment.',
        },
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
        // Pass user's original prompt so styles respect their intent
        const styledManifest = await synthesizeStyles(model, manifest, generatedMetaphor, prompt);

        // Sanitize void elements before validation
        const { manifest: sanitizedManifest } = sanitizeManifest(styledManifest);

        // Self-Healing Pass - pass original manifest to preserve design system on fallback
        const validatedManifest = await validateAndFix(model, sanitizedManifest, manifest);

        // Structure validation - log warnings if header is missing
        validateLayoutStructure(validatedManifest);

        return NextResponse.json({ manifest: validatedManifest, metaphor: generatedMetaphor });
      } catch (e) {
        console.error('Vibe Coding Failed:', e);
        // Fail safe - return original manifest with default metaphor
        const fallbackMetaphor = deriveMetaphorFromPrompt(prompt);
        console.log('Using fallback metaphor from user prompt:', fallbackMetaphor);
        return NextResponse.json({ manifest, metaphor: fallbackMetaphor });
      }
    }

    if (action === 'refineElement') {
      if (!node || !metaphor) {
        return NextResponse.json(
          { error: 'Node and metaphor required for refineElement' },
          { status: 400 }
        );
      }

      const refinePrompt = `
        ROLE: You are "Flash UI".
        CONTEXT: The overall design metaphor is: "${metaphor}".
        TASK: Refine this specific component based on: "${prompt}".

        CRITICAL RULE: Interpret adjectives as PHYSICAL properties.
        - "Heavier" -> Increase shadow opacity, add stronger shadows, thicken border.
        - "Lighter" -> Reduce opacity (bg-surface/80), increase backdrop-blur.
        - "More obsidian" -> Sharper edges (rounded-none), darker overlays.
        - "More glass" -> More transparency (bg-surface/60), more blur (backdrop-blur-2xl).

        USE SEMANTIC COLOR CLASSES ONLY:
        ✓ bg-background, bg-surface, bg-primary, bg-secondary, bg-accent
        ✓ text-text, text-text-muted, text-primary
        ✓ border-border, border-primary
        ✓ Opacity modifiers: bg-primary/80, text-text/60
        ❌ DO NOT use bg-[#hex] or generic colors like bg-slate-900

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

/**
 * Derive a basic metaphor from user's prompt when AI generation fails.
 * Preserves user's design intent instead of defaulting to generic styles.
 */
function deriveMetaphorFromPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase();

  const keywords: Record<string, string> = {
    dark: 'Deep obsidian with sharp edges and minimal contrast',
    light: 'Bright clean paper with soft shadows',
    glass: 'Translucent frosted glass with soft blur',
    neon: 'Dark surface with glowing neon accents',
    modern: 'Clean minimal surfaces with precise geometry',
    warm: 'Warm natural materials with soft textures',
    cool: 'Cool steel with crisp edges',
    elegant: 'Refined surfaces with subtle gradients',
    bold: 'High contrast with strong visual weight',
    minimal: 'Clean white space with essential elements only',
    professional: 'Polished corporate with muted tones',
    playful: 'Rounded shapes with vibrant energy',
  };

  for (const [keyword, metaphor] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) return metaphor;
  }

  // Preserve user's words in the fallback
  return `Clean design inspired by: ${prompt.slice(0, 50)}`;
}

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
  const fallbackMetaphor = deriveMetaphorFromPrompt(userPrompt);
  const parsed = safeJsonParse(result.response.text(), { metaphor: fallbackMetaphor });
  return parsed.metaphor || fallbackMetaphor;
}

async function synthesizeStyles(
  model: any,
  manifest: LayoutManifest,
  metaphor: string,
  userPrompt: string
): Promise<LayoutManifest> {
  // Extract colors for reference in the prompt (actual colors will be injected via CSS variables)
  const colors = manifest.designSystem?.colors || {};

  const prompt = `
ROLE: "Flash UI" - Tailwind CSS styling engine.

USER'S ORIGINAL REQUEST: "${userPrompt}"
DERIVED METAPHOR: "${metaphor}"

PRIORITY ORDER:
1. Follow the user's explicit styling instructions from their request
2. Apply the metaphor's texture/physics (blur, shadow, border-radius)
3. Use SEMANTIC color classes (not arbitrary hex values)

**SEMANTIC COLOR CLASSES** - CRITICAL REQUIREMENT:
The runtime has CSS variables configured for the design system.
You MUST use these semantic class names to ensure color fidelity:

| Role       | Tailwind Class    | Mapped Color |
|------------|-------------------|--------------|
| Background | bg-background     | ${colors.background || 'N/A'} |
| Surface    | bg-surface        | ${colors.surface || 'N/A'} |
| Primary    | bg-primary        | ${colors.primary || 'N/A'} |
| Secondary  | bg-secondary      | ${colors.secondary || 'N/A'} |
| Accent     | bg-accent         | ${colors.accent || 'N/A'} |
| Text       | text-text         | ${colors.text || 'N/A'} |
| Muted Text | text-text-muted   | ${colors.textMuted || 'N/A'} |
| Border     | border-border     | ${colors.border || 'N/A'} |

BANNED PATTERNS (will be purged in production):
❌ bg-[#123456] (arbitrary hex values)
❌ bg-slate-900 (generic Tailwind colors)
❌ text-gray-600 (overrides design system)

ALLOWED PATTERNS:
✓ bg-background (semantic - maps to extracted color)
✓ bg-primary/80 (opacity modifier - works with semantic)
✓ hover:bg-primary (state modifier - works with semantic)
✓ backdrop-blur-xl (texture - not a color)
✓ shadow-lg (texture - not a color)
✓ rounded-xl (shape - not a color)

STYLE MAPPING (Apply textures/effects ONLY):
- Glass/Liquid → backdrop-blur-xl, bg-surface/80, border-border/20
- Steel/Metal → bg-gradient-to-br from-surface to-background, shadow-md
- Neon/Light → shadow-lg shadow-primary/50, ring-2 ring-accent
- Obsidian/Volcanic → border-0, rounded-none, bg-background
- Paper/Matte → shadow-sm, rounded-lg, bg-surface

INSTRUCTIONS:
1. Apply the Metaphor's texture using Tailwind (blur, shadow, border-radius)
2. Use ONLY semantic color classes (bg-primary, text-text, etc.)
3. Modify ONLY the styles.tailwindClasses values
4. Preserve ALL other fields exactly: id, type, semanticTag, attributes, children structure
5. Return the COMPLETE manifest JSON - do NOT omit any fields
6. Every node MUST still have: id, type, semanticTag, styles (with tailwindClasses), attributes
7. Preserve the entire tree structure including all nested children

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

  const result = await model.generateContent([
    { text: prompt },
    { text: JSON.stringify(manifest) },
  ]);
  return safeJsonParse(result.response.text(), manifest);
}

async function validateAndFix(
  model: any,
  jsonInput: any,
  originalManifest: LayoutManifest,
  attempt = 1
): Promise<LayoutManifest> {
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
        colors: Object.fromEntries(
          Object.entries(parsed.designSystem?.colors ?? {}).map(([k, v]) => [k, String(v)])
        ),
        fonts: parsed.designSystem?.fonts ?? { heading: 'sans-serif', body: 'sans-serif' },
      },
    };
  } catch (error: any) {
    if (attempt > MAX_RETRIES) {
      console.error('Critical: Repair failed 3 times. Engaging Safe Mode.');
      return generateSafeModeManifest(originalManifest);
    }
    console.warn(`Validation Error (Attempt ${attempt}):`, error.message);
    const fixedJson = await repairJson(model, JSON.stringify(jsonInput), error.message);
    return validateAndFix(model, fixedJson, originalManifest, attempt + 1);
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

  // Logged filtering: catch nodes that are silently removed
  const filteredChildren = isVoidElement
    ? undefined
    : node.children
        ?.filter((c, i) => {
          if (!c) {
            console.warn(
              `[lintTailwindClasses] Removed falsy child at index ${i} in node "${node.id}"`
            );
            return false;
          }
          return true;
        })
        .map((c) => lintTailwindClasses(c));

  return {
    ...node,
    styles: { ...node.styles, tailwindClasses: cleanClasses },
    children: filteredChildren,
  };
}

/**
 * Generate a safe fallback manifest when styling completely fails.
 * Preserves the original manifest's design system (colors/fonts extracted from user's images/videos).
 */
function generateSafeModeManifest(originalManifest?: LayoutManifest): LayoutManifest {
  // Preserve colors extracted from user's uploaded image/video
  // Fallback to neutral grays if no original colors exist
  const preservedColors = originalManifest?.designSystem?.colors ?? {
    primary: '#6B7280',
    secondary: '#9CA3AF',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#374151',
  };

  const preservedFonts = originalManifest?.designSystem?.fonts ?? {
    heading: 'Inter',
    body: 'Inter',
  };

  // Safe mode uses semantic color classes - CSS variables will be injected by LayoutPreview
  // This ensures colors from the original manifest are preserved
  return {
    id: 'safe-mode-fallback',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'container',
      semanticTag: 'safe-mode-container',
      styles: {
        tailwindClasses: 'min-h-screen flex items-center justify-center bg-background p-8',
      },
      attributes: {},
      children: [
        {
          id: 'error-card',
          type: 'container',
          semanticTag: 'error-card',
          styles: {
            tailwindClasses:
              'bg-surface rounded-lg shadow-lg p-8 max-w-md text-center border border-border',
          },
          attributes: {},
          children: [
            {
              id: 'error-icon',
              type: 'icon',
              semanticTag: 'warning-icon',
              styles: { tailwindClasses: 'w-16 h-16 text-accent mx-auto mb-4' },
              attributes: { src: 'AlertTriangle' },
            },
            {
              id: 'error-title',
              type: 'text',
              semanticTag: 'error-title',
              styles: {
                tailwindClasses: 'text-xl font-semibold text-text mb-2',
              },
              attributes: { text: 'Layout Generation Issue' },
            },
            {
              id: 'error-description',
              type: 'text',
              semanticTag: 'error-description',
              styles: { tailwindClasses: 'text-text-muted' },
              attributes: {
                text: 'The layout could not be fully generated. Your design colors have been preserved. Please try regenerating.',
              },
            },
          ],
        },
      ],
    },
    definitions: {},
    detectedFeatures: originalManifest?.detectedFeatures ?? [],
    designSystem: {
      colors: preservedColors,
      fonts: preservedFonts,
    },
  };
}

/**
 * Validates that the manifest has expected layout structure.
 * Logs warnings if header/nav is missing or if unexpected structure detected.
 * This helps debug cases where Gemini generates flat structures without proper hierarchy.
 */
function validateLayoutStructure(manifest: LayoutManifest): void {
  const root = manifest.root;

  if (!root.children || root.children.length === 0) {
    console.warn('[vibe] WARNING: Root has no children - layout may be malformed');
    return;
  }

  const firstChild = root.children[0];
  const headerTags = ['header', 'navigation', 'nav', 'navbar', 'site-header', 'top-bar'];
  const hasHeader = headerTags.some((tag) => firstChild.semanticTag?.toLowerCase().includes(tag));

  if (!hasHeader) {
    console.warn(
      `[vibe] WARNING: First child semanticTag "${firstChild.semanticTag}" does not look like a header. Expected one of: ${headerTags.join(', ')}`
    );
  }

  // Log structure summary for debugging
  const structureSummary = root.children.map((c) => c.semanticTag).join(' → ');
  console.log('[vibe] Layout structure:', structureSummary);
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
