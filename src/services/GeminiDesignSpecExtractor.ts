/**
 * Gemini Design Spec Extractor - Stage 1: "The Architect"
 *
 * Extracted from GeminiLayoutService.ts
 * Extracts high-level design specification (colors, fonts, structure)
 * from a screenshot, providing context for Stage 2 component building.
 *
 * SDK: @google/generative-ai (older SDK)
 */

import type { GoogleGenerativeAI } from '@google/generative-ai';
import type { DesignSpec } from '@/types/designSpec';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';

// ============================================================================
// STAGE 1 PROMPT
// ============================================================================

const DESIGN_SPEC_PROMPT = `
      You are "The Architect" - a design system expert with exceptional vision.

      YOUR TASK: Extract the design system specification from this screenshot.
      DO NOT detect individual components yet. Focus on the DESIGN SYSTEM:

      Return this JSON structure:
      {
        "colorPalette": {
          "primary": "<hex>",
          "secondary": "<hex>",
          "accent": "<hex>",
          "background": "<hex>",
          "surface": "<hex>",
          "text": "<hex>",
          "textMuted": "<hex>",
          "border": "<hex>",
          "additional": [
            // IMPORTANT: List ALL unique colors visible in the image
            {"name": "button-bg", "hex": "#...", "usage": "primary buttons"},
            {"name": "header-bg", "hex": "#...", "usage": "header background"},
            {"name": "card-border", "hex": "#...", "usage": "card borders"},
            // Include: gradients, shadows, hover states, dividers, icons, etc.
          ]
        },
        "typography": {
          "headingFont": "font name or 'Inter' if unsure",
          "bodyFont": "font name or 'Inter' if unsure",
          "fontSizes": {
            "h1": "48px",
            "h2": "36px",
            "h3": "24px",
            "body": "16px",
            "small": "14px"
          },
          "fontWeights": {
            "heading": 700,
            "body": 400,
            "bold": 600
          }
        },
        "spacing": {
          "unit": 8,
          "scale": [4, 8, 12, 16, 24, 32, 48, 64],
          "containerPadding": "24px",
          "sectionGap": "48px"
        },
        "structure": {
          "type": "header-top|sidebar-left|sidebar-right|centered|split|dashboard",
          "hasHeader": true/false,
          "hasSidebar": true/false,
          "hasFooter": true/false,
          "mainContentWidth": "narrow|standard|wide|full"
        },
        "componentTypes": [
          {"type": "hero", "count": 1, "locations": ["top"]},
          {"type": "navigation", "count": 1, "locations": ["top"]},
          {"type": "cards", "count": 3, "locations": ["middle"]}
        ],
        "effects": {
          "borderRadius": "8px",
          "shadows": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          "hasGradients": true/false,
          "hasBlur": true/false,
          "gradients": [
            // List ALL gradients visible in the design
            { "type": "linear|radial|mesh", "colors": ["#hex1", "#hex2"], "angle": "135deg" }
          ],
          "glassmorphism": {
            // DETECT: Semi-transparent backgrounds with blur behind them
            "detected": true/false,
            "blur": "12px",
            "opacity": 0.1,
            "borderOpacity": 0.2,
            "saturation": 180
          },
          "neumorphism": {
            // DETECT: Elements that appear extruded from the background using double shadows (light & dark)
            "detected": true/false,
            "lightShadow": "-5px -5px 10px #ffffff",
            "darkShadow": "5px 5px 10px #d1d1d1",
            "intensity": "subtle|medium|strong"
          },
          "animations": [
            // DETECT: Any visible motion, transitions, or animated effects
            { "description": "gradient shift background animation", "type": "css|particle|scroll" }
          ],
          "backgroundEffects": [
            // DETECT: Particles, aurora, floating shapes, waves, mesh gradient backgrounds
            { "type": "particles|aurora|floating-shapes|waves|mesh-gradient", "description": "...", "colors": ["#hex1", "#hex2"] }
          ]
        },
        "vibe": "Modern and minimalist" or "Bold and colorful" etc,
        "confidence": 0.9
      }

      FOCUS: Extract the DESIGN SYSTEM, not individual components.

      ## Advanced Effects Detection (CRITICAL)
      Look closely for these high-end UI patterns and extract exact values:

      - **Glassmorphism**: Semi-transparent backgrounds with blur behind them.
        Extract: backdrop-filter blur value, background opacity, border opacity.
      - **Mesh Gradients / Auroras**: Soft, multi-colored blended backgrounds that are NOT simple linear gradients.
        Extract: The specific 3-5 colors used and their approximate positions.
      - **Neumorphism (Soft UI)**: Elements that appear extruded from the background using double shadows (light & dark).
        Extract: Both shadow values (light and dark).
      - **Inner Glows / Borders**: Subtle 1px inner highlights on buttons or cards.
        Extract: box-shadow inset values.
      - **Particle Effects**: Floating dots, sparkles, or animated particles in the background.
        Describe the effect type and colors.
      - **Animations**: Any visible motion - gradient shifts, floating elements, pulsing effects.
        Describe what's animating and how.

      IMPORTANT FOR COLORS: Extract ALL unique colors visible in the image.
      The more complete the color palette, the better Stage 2 can match the design.
      Include subtle variations (e.g., both #f3f4f6 and #f9fafb if both appear).
      Don't limit yourself to named roles - capture every distinct color you see.

      Return ONLY valid JSON. No markdown, no explanation.
    `;

// ============================================================================
// STAGE 1 IMPLEMENTATION
// ============================================================================

/**
 * Extract high-level design specification from a screenshot image.
 *
 * @param client - Initialized GoogleGenerativeAI client
 * @param fileToPart - Helper to convert base64 image to Gemini inline data part
 * @param imageBase64 - Base64-encoded screenshot
 * @param instructions - Optional user instructions
 */
export async function extractDesignSpec(
  client: GoogleGenerativeAI,
  fileToPart: (base64: string) => { inlineData: { data: string; mimeType: string } },
  imageBase64: string,
  instructions?: string
): Promise<DesignSpec> {
  const model = client.getGenerativeModel({
    model: MODEL_FLASH,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `${DESIGN_SPEC_PROMPT}

      USER INSTRUCTIONS: ${instructions || 'Analyze this design.'}
    `;

  const imagePart = fileToPart(imageBase64);
  const result = await model.generateContent([prompt, imagePart]);
  const response = result.response;

  try {
    const spec = JSON.parse(response.text());

    // Basic validation - ensure required fields exist with defaults
    if (!spec.colorPalette || !spec.typography || !spec.structure) {
      console.warn('[GeminiLayoutService] Incomplete DesignSpec, applying defaults');
      return {
        colorPalette: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#f59e0b',
          background: '#ffffff',
          surface: '#f3f4f6',
          text: '#1f2937',
          textMuted: '#6b7280',
          border: '#e5e7eb',
          additional: [],
          ...spec.colorPalette,
        },
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          fontSizes: { h1: '48px', h2: '36px', h3: '24px', body: '16px', small: '14px' },
          fontWeights: { heading: 700, body: 400, bold: 600 },
          ...spec.typography,
        },
        spacing: {
          unit: 8,
          scale: [4, 8, 12, 16, 24, 32, 48, 64],
          containerPadding: '24px',
          sectionGap: '48px',
          ...spec.spacing,
        },
        structure: {
          type: 'header-top',
          hasHeader: true,
          hasSidebar: false,
          hasFooter: true,
          mainContentWidth: 'standard',
          ...spec.structure,
        },
        componentTypes: spec.componentTypes || [],
        effects: {
          borderRadius: '8px',
          shadows: 'subtle',
          hasGradients: false,
          hasBlur: false,
          ...spec.effects,
        },
        vibe: spec.vibe || 'Modern and clean',
        confidence: spec.confidence || 0.8,
      } as DesignSpec;
    }

    return spec as DesignSpec;
  } catch (e) {
    console.error('[GeminiLayoutService] Failed to parse DesignSpec', e);
    throw new Error('Failed to extract design specification');
  }
}
