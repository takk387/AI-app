/**
 * Gemini Layout Service
 *
 * Core intelligence engine for the "Ultimate Layout Builder".
 * Uses Gemini 3 Flash for high-speed multimodal analysis of:
 * - Images (Layout Detection)
 * - Videos (Motion & Flow Extraction)
 * - Hybrid Inputs (Layout + Style mixing)
 *
 * Capabilities:
 * - "Vision Loop": Critiques generated layouts against originals
 * - "Motion Extraction": Analyzes video keyframes for animation configs
 * - "Zero-Preset": Detects arbitrary values (px, hex) for exact replication
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DetectedComponentEnhanced, PageAnalysis, LayoutStructure } from '@/types/layoutDesign';
import {
  sanitizeComponents,
  inferContainerLayouts,
  resolveRootOverlaps,
} from '@/utils/layoutValidation';
import type { DesignSpec } from '@/types/designSpec';
import type {
  LayoutAnalysisResult,
  LayoutCritiqueEnhanced,
  LayoutDiscrepancy,
} from '@/types/layoutAnalysis';
import type { VideoMotionAnalysis } from '@/types/motionConfig';
import { validateFontSizeForContainer } from '@/utils/responsiveTypography';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';
// const MODEL_PRO_IMAGE = 'gemini-3-pro-preview'; // Future use for assets

interface LayoutCritique {
  score: number; // 0-100
  discrepancies: {
    componentId?: string;
    issue: string; // "Padding too small", "Wrong color"
    suggestion: string; // "Increase padding to 24px"
    correctionJSON?: Partial<DetectedComponentEnhanced>;
  }[];
}

/**
 * Post-processing: Validate and correct typography scaling.
 * Ensures font sizes don't exceed container dimensions to prevent overflow.
 */
function validateTypographyScaling(
  components: DetectedComponentEnhanced[]
): DetectedComponentEnhanced[] {
  return components.map((component) => {
    if (!component.style?.fontSize || !component.bounds?.height) return component;

    const validation = validateFontSizeForContainer(
      component.style.fontSize,
      component.bounds.height
    );

    if (!validation.valid && validation.recommendedFontSize) {
      console.log(
        `[GeminiLayoutService] Typography fix: ${component.id} fontSize ${component.style.fontSize} → ${validation.recommendedFontSize}px (container height: ${component.bounds.height}%)`
      );
      return {
        ...component,
        style: {
          ...component.style,
          fontSize: `${validation.recommendedFontSize}px`,
        },
      };
    }

    return component;
  });
}

class GeminiLayoutService {
  private client: GoogleGenerativeAI | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.isAvailable = true;
    } else {
      console.warn('[GeminiLayoutService] API key not configured');
    }
  }

  /**
   * STAGE 1: The Architect
   * Extract high-level design specification (colors, fonts, structure)
   * This provides context for Stage 2 to build accurate components
   */
  async extractDesignSpec(imageBase64: string, instructions?: string): Promise<DesignSpec> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are "The Architect" - a design system expert with exceptional vision.
      
      USER INSTRUCTIONS: ${instructions || 'Analyze this design.'}

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

    const imagePart = this.fileToPart(imageBase64);
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

  /**
   * STAGE 2: The Engineer
   * Build specific component list using the DesignSpec from Stage 1
   * Colors are provided, so no guessing needed
   */
  async buildComponentsFromSpec(
    imageBase64: string,
    designSpec: DesignSpec,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are "The Engineer" - a pixel-perfect layout reconstruction specialist.

      USER INSTRUCTIONS: ${instructions || 'Build component list.'}

      DESIGN SPEC (from Stage 1 - The Architect):
      ${JSON.stringify(designSpec, null, 2)}

      YOUR TASK: Create a HIERARCHICAL JSON Scene Graph of every visible UI element.

      COORDINATE SYSTEM: Use normalized 0-1000 scale where:
      - 0 = left/top edge of the image/parent
      - 1000 = right/bottom edge of the image/parent
      - 500 = center

      COMPONENT ROLES:
      1. "container" - Has children, uses flex/grid layout to arrange them
      2. "leaf" - No children, renders actual content (text, image, button, icon)
      3. "overlay" - Positioned absolutely over other content (modals, tooltips, dropdowns)

      For EACH element, return:
      {
        "id": "descriptive-unique-id",
        "type": "header|sidebar|hero|section|container|cards|navigation|footer|form|logo|button|text|image|input|link|icon|badge|avatar|divider|list|menu|card|unknown",
        "role": "container|leaf|overlay",
        "parentId": "<parent-id or null for root sections>",
        "children": ["child-id-1", "child-id-2"],
        "bounds": {
          "top": <0-1000>,
          "left": <0-1000>,
          "width": <0-1000>,
          "height": <0-1000>
        },
        "layout": {
          // MANDATORY for containers - DO NOT OMIT
          "type": "flex|grid",  // REQUIRED - never use "none" for real containers
          "direction": "row|column",  // REQUIRED for flex
          "gap": "24px",  // REQUIRED - measure EXACT pixels from image
          "justify": "start|center|end|between|evenly",  // REQUIRED
          "align": "start|center|end|stretch"  // REQUIRED
        },
        "style": {
          // Colors
          "backgroundColor": "<hex or linear-gradient(135deg, #667eea 0%, #764ba2 100%)>",
          "textColor": "<hex>",

          // Typography
          "fontFamily": "<font name if different from body font>",
          "fontSize": "<px value>",
          "fontWeight": "<weight>",
          "fontStyle": "normal|italic",
          "textAlign": "left|center|right|justify",
          "textTransform": "uppercase|lowercase|capitalize|none",
          "textDecoration": "none|underline|line-through",
          "textShadow": "<shadow value for glowing text>",
          "letterSpacing": "<px or em value>",
          "lineHeight": "<number or px value>",
          "whiteSpace": "normal|nowrap|pre-wrap",
          "textOverflow": "clip|ellipsis",
          "wordBreak": "normal|break-all|keep-all|break-word",

          // Backgrounds
          "backgroundImage": "<url(...) or linear-gradient(...)>",
          "backgroundSize": "cover|contain|<px>",
          "backgroundPosition": "center|top left|<px px>",
          "backgroundRepeat": "no-repeat|repeat|repeat-x|repeat-y",

          // Spacing
          "padding": "<px value>",
          "margin": "<px value for external spacing>",
          "gap": "<px value>",

          // Sizing
          "maxWidth": "<px or %>",
          "maxHeight": "<px or %>",
          "minHeight": "<px>",
          "aspectRatio": "16/9 or 1/1 or auto",

          // Borders
          "borderRadius": "<px value>",
          "borderWidth": "<px value>",
          "borderColor": "<hex>",
          "borderStyle": "solid|dashed|dotted|none",

          // Effects
          "shadow": "<box-shadow value>",
          "opacity": "<0-1 value>",
          "backdropFilter": "blur(10px) - for glassmorphism",
          "filter": "blur(5px) or grayscale(100%) or brightness(1.2)",
          "mixBlendMode": "normal|multiply|screen|overlay",
          "transform": "<rotate(5deg) scale(1.1) skew(10deg) - detect any transformation>",

          // Layout control
          "overflow": "hidden|visible|scroll|auto",
          "objectFit": "cover|contain - for images",
          "objectPosition": "center|top - for images",

          // Position (for sticky/fixed)
          "position": "static|relative|absolute|fixed|sticky",
          "top": "<px or %>",
          "left": "<px or %>",

          // Cursor
          "cursor": "pointer|text|default|grab",

          // Animations & Transitions (first-class support for motion)
          "animation": "<CSS animation shorthand e.g., 'gradient-shift 3s ease infinite'>",
          "animationKeyframes": {
            // Define @keyframes inline - the renderer will inject a <style> tag
            // Use percentage keys for keyframe stops
            "0%": { "backgroundPosition": "0% 50%" },
            "50%": { "backgroundPosition": "100% 50%" },
            "100%": { "backgroundPosition": "0% 50%" }
          },
          "transition": "<CSS transition shorthand e.g., 'all 0.3s ease'>",

          // Flex control
          "flexGrow": "<number>",
          "flexShrink": "<number>",
          "order": "<number>",

          // CRITICAL - CUSTOM CSS CATCH-ALL:
          // Put ANY CSS property not listed above in customCSS.
          // This ensures 100% visual fidelity for ANY design.
          "customCSS": {
             "clipPath": "polygon(...) or circle(...)",
             "maskImage": "linear-gradient(...)",
             "WebkitBackgroundClip": "text",
             "perspective": "1000px",
             "columnCount": "2",
             "writingMode": "vertical-rl",
             "<literally-any-css-property>": "<value>"
          }
        },
        "content": {
          "text": "<EXACT visible text>",
          "hasImage": true/false,
          "imageDescription": "<detailed description of the image for AI generation, e.g., 'Company logo: blue shield with white lightning bolt on dark navy background'>",
          "imageAlt": "<alt text for accessibility, e.g., 'Acme Corp logo'>",
          "hasIcon": true/false,
          // ICON EXTRACTION - For exact replicas, provide SVG path data when possible
          "iconSvgPath": "<SVG path d attribute - e.g., 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5M2 12l10 5 10-5' - PREFERRED for exact replication>",
          "iconViewBox": "0 0 24 24",  // viewBox dimensions if different from 24x24
          "iconName": "<Lucide icon name — ONLY for standard UI icons (Home, User, Menu, Search, ArrowRight, Settings, Check, Plus, Star, Heart). For custom logos/brand icons, leave empty and set hasCustomVisual instead.>",
          "iconColor": "<hex color of the icon - MEASURE from image>",
          "iconPosition": "left|right|center|top|bottom - use 'top' when icon is ABOVE text",
          "iconSize": "sm|md|lg",
          "iconContainerStyle": {
            "shape": "circle|square|rounded - DETECT if icon has a background shape/container",
            "backgroundColor": "<hex - background color of the icon container>",
            "borderColor": "<hex - border color if icon container has a border>",
            "borderWidth": "<px value - e.g. 1px, 2px>",
            "size": "sm|md|lg - container size (sm=32px, md=48px, lg=64px)"
          }
        },
        "zIndex": <number>,
        "interactions": {
          "hover": {
            "backgroundColor": "<hex - background color on hover, if button/link>",
            "textColor": "<hex - text color on hover>",
            "transform": "scale(1.05) or translateY(-2px) - transform on hover",
            "boxShadow": "<shadow value on hover - often larger than default>",
            "opacity": "<0-1 opacity on hover, e.g. 0.8>",
            "borderColor": "<hex - border color on hover>"
          },
          "active": {
            "backgroundColor": "<hex - background color when pressed/clicked>",
            "textColor": "<hex - text color when pressed>",
            "transform": "scale(0.95) - slight shrink on press",
            "scale": "<number e.g., 0.95 - scale factor when active>"
          },
          "focus": {
            "outline": "<CSS outline value, e.g., '2px solid #3b82f6'>",
            "boxShadow": "<focus ring shadow, e.g., '0 0 0 3px rgba(59,130,246,0.5)'>",
            "borderColor": "<hex - border color on focus>"
          }
        },
        "visualEffects": [
          // DETECT: Non-CSS visual effects like particles, canvas animations, complex motion
          {
            "description": "<what the effect looks like, e.g., 'Particle trail streaming from button on hover'>",
            "type": "css-animation|particle-system|canvas-effect",
            "trigger": "always|hover|click|scroll",
            "cssKeyframes": {
              // For CSS-achievable effects, provide the keyframe definition
              "0%": { "<property>": "<value>" },
              "100%": { "<property>": "<value>" }
            },
            "particleConfig": {
              // For particle effects, describe the particle system
              "count": 20,
              "shape": "circle|square|star|custom",
              "colors": ["#hex1", "#hex2"],
              "direction": "up|down|left|right|radial|random",
              "speed": "slow|medium|fast",
              "size": { "min": 2, "max": 8 },
              "opacity": { "start": 1, "end": 0 },
              "lifetime": "1s|2s|3s"
            }
          }
        ],
        "confidence": 0.9
      }

      HIERARCHY RULES:

      1. **DETECT VISUAL CONTAINERS**:
         - Headers are containers with logo, nav, and CTA as children
         - Hero sections contain heading, subheading, and buttons as children
         - Card groups are containers with individual cards as children
         - Footers contain columns which contain links

      2. **ASSIGN PARENT-CHILD RELATIONSHIPS**:
         Every component (except root sections) MUST have a parentId.

         Example header structure:
         - "header-container" (parentId: null, role: "container", children: ["logo", "nav-container", "cta-button"])
         - "logo" (parentId: "header-container", role: "leaf")
         - "nav-container" (parentId: "header-container", role: "container", children: ["nav-1", "nav-2", "nav-3"])
         - "nav-1" (parentId: "nav-container", role: "leaf")
         - "nav-2" (parentId: "nav-container", role: "leaf")
         - "nav-3" (parentId: "nav-container", role: "leaf")
         - "cta-button" (parentId: "header-container", role: "leaf")

      3. **CRITICAL - SPECIFY CONTAINER LAYOUTS (MANDATORY)**:
         Every component with role: "container" MUST include a complete "layout" object.
         DO NOT omit layout - the renderer CANNOT guess layouts correctly.

         REQUIRED layout properties:
         - type: "flex" or "grid" (NEVER omit this)
         - direction: "row" or "column" (for flex layouts)
         - gap: EXACT pixel value like "24px", "16px", "32px" (MEASURE from image)
         - justify: "start", "center", "end", "between", "evenly" (how items spread horizontally)
         - align: "start", "center", "end", "stretch" (how items align vertically)

         EXAMPLES - Use these patterns:
         - Header with horizontal items: { "type": "flex", "direction": "row", "gap": "24px", "justify": "between", "align": "center" }
         - Card grid (3 columns): { "type": "grid", "gap": "24px" }
         - Vertical stack: { "type": "flex", "direction": "column", "gap": "16px", "align": "start" }
         - Centered content: { "type": "flex", "direction": "column", "gap": "12px", "justify": "center", "align": "center" }
         - Navigation links: { "type": "flex", "direction": "row", "gap": "32px", "align": "center" }
         - Footer columns: { "type": "flex", "direction": "row", "gap": "48px", "justify": "between" }

         WARNING: If you omit layout, the system will guess incorrectly and the design will break.

      4. **ROOT COMPONENTS** (parentId: null):
         These are major page sections positioned with absolute bounds on the viewport:
         - header (top: 0, height: ~60-80)
         - hero (below header)
         - features/content sections
         - footer (bottom)

          Typically 3-7 root sections for a landing page.

          ROOT COMPONENTS MUST NOT OVERLAP. Stack them vertically:
          - Each root section's top MUST be >= the previous section's (top + height)
          - Leave a small gap (20-40 in 0-1000 scale) between sections
          - Full-width sections: left=0, width=1000
          - Assign heights based on content: header ~60-80, hero ~300-500, sections ~200-400, footer ~150-250

      5. **CHILD BOUNDS ARE RELATIVE**:
         - Root components: bounds relative to viewport (0-1000)
         - Children: bounds relative to parent's content area (0-1000 within parent)
         - CRITICAL: Sibling children's widths MUST fit within their container.
           For a row layout, the sum of children widths + gaps MUST NOT exceed 1000.
           For a column layout, each child's width should be ≤ 1000 (full parent width).
           If children would exceed the container, REDUCE their widths proportionally.

      6. **LEAF COMPONENTS**:
         These have role: "leaf", no children array, and render actual content:
         - Buttons, text, images, icons, links, inputs, badges, avatars

      7. **COLOR HANDLING - VISUAL FIDELITY OVER SYSTEM CONSISTENCY**:
         - MEASURE the actual hex color from the image for each component
         - Use designSpec.colorPalette colors when they closely match what you see
         - If a component's actual color is NOT in the Design Spec, use the EXACT measured hex
         - NEVER return undefined or empty string for visible colors - always provide the hex
         - Transparent backgrounds should explicitly use "transparent" or "rgba(0,0,0,0)"
         - Font sizes from designSpec.typography.fontSizes
         - Spacing from designSpec.spacing.scale
         - TYPOGRAPHY SIZING (MANDATORY — prevents overflow):
           * fontSize MUST be proportional to the component's container height
           * Max fontSize ≈ (containerHeight% / 100) × 800 × 0.4 pixels
           * Example: height 5% → max ~16px, height 10% → max ~32px, height 60% → max ~192px
           * ALWAYS include lineHeight (unitless multiplier like 1.2 or 1.4) for ALL text components
           * For single-line text (nav items, buttons, labels): add "whiteSpace": "nowrap" in customCSS
           * Multi-line text: ensure container height fits all lines at fontSize × lineHeight

      8. **ICON DETECTION - EXACT SVG REPLICATION**:
         - When you see an icon, set hasIcon: true
         - FOR EXACT REPLICAS: Extract the actual SVG path data and provide it in iconSvgPath
           Example: "iconSvgPath": "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5"
         - If you cannot extract the SVG path:
           * For standard UI icons (arrows, checkmarks, menus, etc.) → use iconName with Lucide name:
             "Home", "User", "Menu", "Search", "ArrowRight", "ArrowLeft", "Settings", "Check", "Plus", "Minus", "Heart", "Star", "Close", "ChevronDown", "ChevronRight", "Mail", "Phone", "MapPin", "Calendar", "Clock", "Bell", "ShoppingCart", "CreditCard"
           * For custom logos, brand icons, or complex graphics → set hasCustomVisual: true and
             extractionAction: "crop" with extractionBounds. Do NOT guess a Lucide name.
         - Specify iconPosition relative to text content: "left" (before), "right" (after), "top" (above), "bottom" (below), or "center" (standalone)
         - ALWAYS measure iconColor from the image - don't guess

      9. **FOOTER HIERARCHY - DETECT MULTI-COLUMN FOOTERS**:
         - Footers typically have 2-4 columns arranged horizontally
         - EACH column should be a separate container with role: "container"
         - Column children (links, text, icons) have role: "leaf"

         Example footer structure:
         - "footer" (parentId: null, role: "container", layout: { type: "flex", direction: "row", justify: "between" }, children: ["footer-col-1", "footer-col-2", "footer-col-3", "footer-col-4"])
         - "footer-col-1" (parentId: "footer", role: "container", layout: { type: "flex", direction: "column" }, children: ["footer-logo", "footer-tagline"])
         - "footer-col-2" (parentId: "footer", role: "container", layout: { type: "flex", direction: "column" }, children: ["footer-heading-1", "footer-link-1", "footer-link-2"])
         - "footer-link-1" (parentId: "footer-col-2", role: "leaf", content: { text: "About Us" })

         IMPORTANT: Do NOT flatten footer content into a single container. Preserve the column structure.

      10. **CUSTOM CSS CATCH-ALL - 100% VISUAL FIDELITY**:
          If you detect ANY visual property that is NOT in the explicit style schema above,
          put it in the "customCSS" object. This ensures we can replicate ANY design.

          Examples of properties that should go in customCSS:
          - clip-path, mask-image, perspective, column-count, writing-mode
          - animation, transition (specific values)
          - scroll-behavior, overscroll-behavior
          - user-select, pointer-events
          - text-indent, vertical-align, word-spacing
          - ANY vendor prefixes (-webkit-*, -moz-*)
          - box-decoration-break, hyphens, tab-size
          - ANY CSS property that exists but isn't in the schema

          The customCSS object is our guarantee of 100% visual fidelity.

      11. **ANIMATION & TRANSITION DETECTION**:
          - If a component appears to have CSS animations (gradient shifts, pulsing, shimmer, glow):
            Set style.animation with the shorthand and provide animationKeyframes with the full definition.
          - If a component has visible transitions (smooth hover effects, entrance animations):
            Set style.transition with the appropriate shorthand.
          - For complex animations that need @keyframes, ALWAYS provide the animationKeyframes object.
            The renderer will generate a unique keyframe name and inject a <style> tag.

      12. **VISUAL EFFECTS — CRITICAL FOR DESIGN FIDELITY**:
          You MUST detect and create visualEffects entries for any non-standard visual treatment.
          Missing visual effects make the layout look flat and lifeless.

          DETECTION GUIDE — create visualEffects for ANY of these:
            * Animated or shimmer gradients → type: "css-animation", provide cssKeyframes with gradient shifts
            * Particle effects (sparkles, confetti, floating dots) → type: "particle-system", provide FULL particleConfig
            * Glowing or pulsing elements → type: "css-animation", provide cssKeyframes with opacity/box-shadow changes
            * Floating/drifting decorative shapes → type: "particle-system" with direction and shape config
            * Aurora or mesh gradient backgrounds → type: "css-animation" with gradient-position keyframes

          RULES:
            - ALWAYS use type "css-animation" or "particle-system" — NEVER use "canvas-effect"
            - Provide COMPLETE cssKeyframes or particleConfig — never leave them empty or undefined
            - For hero sections with gradient backgrounds: ALSO set style.backgroundImage with the CSS gradient
            - For animated backgrounds: set BOTH style.backgroundImage AND a visualEffects css-animation entry

      13. **IMAGE & LOGO DETECTION**:
          - When you see a logo, photograph, illustration, or any image:
            * Set content.hasImage = true
            * Set content.imageDescription with a DETAILED description of what the image shows
              (e.g., "Company logo: blue shield icon with white lightning bolt on dark navy background")
            * Set content.imageAlt with proper accessibility alt text
          - For photographs, illustrations, or complex graphics: also set hasCustomVisual: true
            with extractionAction: "crop" and extractionBounds so the system can extract exact
            pixels from the original. The imageDescription serves as fallback context only.
          - Do NOT just set hasImage: true with no description - the description is critical.

      Return ONLY a JSON array of components. No markdown, no explanation, no wrapping object.
    `;

    const imagePart = this.fileToPart(imageBase64);
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());

      // CRITICAL FIX: Normalize 0-1000 scale to 0-100 scale
      // The Stage 2 prompt (The Engineer) asks for 0-1000 scale for precision.
      // However, the renderer and validator expect 0-100 scale (percentage).
      // We must normalize before validation to prevent small items (e.g., width 50)
      // from being misinterpreted as 50% instead of 5% by the validator's heuristic.
      const normalizedData = this.normalizeCoordinates(rawData);

      const { components: sanitizedComponents, errors } = sanitizeComponents(normalizedData);
      if (errors.length > 0) {
        console.warn('[GeminiLayoutService] Validation issues in buildComponentsFromSpec:', errors);
      }

      // CRITICAL: Infer layout for containers that are missing layout data
      // This fixes containers where AI didn't specify layout.type, layout.gap, etc.
      const withInferredLayouts = inferContainerLayouts(sanitizedComponents);

      // Post-process: Validate typography scaling to prevent font overflow
      const withValidatedTypography = validateTypographyScaling(withInferredLayouts);

      // CRITICAL FIX: Resolve root overlaps
      // Stack root sections vertically to prevent them from piling on top of each other
      const components = resolveRootOverlaps(withValidatedTypography);

      console.log('[GeminiLayoutService] After inferContainerLayouts & resolveRootOverlaps:', {
        before: sanitizedComponents.filter((c) => c.role === 'container' && !c.layout?.type).length,
        after: components.filter((c) => c.role === 'container' && !c.layout?.type).length,
        overlapsResolved: components.length > 0,
      });

      // Debug: Log Stage 2 output to verify colors, hierarchy, AND LAYOUT DATA
      const containersWithLayout = components.filter(
        (c) => c.role === 'container' && c.layout?.type
      );
      const containersWithoutLayout = components.filter(
        (c) => c.role === 'container' && !c.layout?.type
      );

      console.log('[GeminiLayoutService] Stage 2 result:', {
        count: components.length,
        hasHierarchy: components.some((c) => c.parentId || (c.children && c.children.length > 0)),
        layoutStats: {
          containersWithLayout: containersWithLayout.length,
          containersWithoutLayout: containersWithoutLayout.length,
          missingLayoutIds: containersWithoutLayout.map((c) => c.id),
        },
        layoutSample: containersWithLayout.slice(0, 3).map((c) => ({
          id: c.id,
          layout: c.layout,
        })),
        colorsSample: components.slice(0, 5).map((c) => ({
          id: c.id,
          bg: c.style?.backgroundColor,
          text: c.style?.textColor,
          role: c.role,
          parentId: c.parentId,
        })),
      });

      return components;
    } catch (e) {
      console.error('[GeminiLayoutService] Failed to parse components', e);
      return [];
    }
  }

  /**
   * Two-Stage Analysis: Extract DesignSpec, then build components
   * This is the new recommended approach
   *
   * Returns a structured result with both components AND designSpec
   * so the design system is preserved throughout the pipeline.
   */
  async analyzeImageTwoStage(
    imageBase64: string,
    instructions?: string
  ): Promise<LayoutAnalysisResult> {
    console.log('[GeminiLayoutService] Starting two-stage analysis...');

    const result: LayoutAnalysisResult = {
      success: false,
      components: [],
      designSpec: null,
      errors: [],
      warnings: [],
      metadata: {
        componentCount: 0,
        parseAttempts: 0,
        recoveredComponents: 0,
        designSpecExtracted: false,
        componentsBuilt: false,
      },
    };

    // Stage 1: Extract design specification
    console.log('[GeminiLayoutService] Stage 1: Extracting DesignSpec...');
    try {
      const designSpec = await this.extractDesignSpec(imageBase64, instructions);
      result.designSpec = designSpec;
      result.metadata.designSpecExtracted = true;
      console.log('[GeminiLayoutService] DesignSpec extracted:', {
        colors: designSpec.colorPalette.primary,
        structure: designSpec.structure.type,
        componentTypes: designSpec.componentTypes.length,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error extracting design spec';
      result.errors.push(`Stage 1 (DesignSpec): ${errorMsg}`);
      console.error('[GeminiLayoutService] Stage 1 failed:', errorMsg);
      // Continue to Stage 2 even if Stage 1 fails - components may still be extractable
    }

    // Stage 2: Build components using the spec
    console.log('[GeminiLayoutService] Stage 2: Building components from spec...');
    try {
      // Use default spec if Stage 1 failed
      const specForStage2 = result.designSpec || this.getDefaultDesignSpec();
      const components = await this.buildComponentsFromSpec(
        imageBase64,
        specForStage2,
        instructions
      );
      result.components = components;
      result.metadata.componentCount = components.length;
      result.metadata.componentsBuilt = true;
      console.log('[GeminiLayoutService] Built', components.length, 'components');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error building components';
      result.errors.push(`Stage 2 (Components): ${errorMsg}`);
      console.error('[GeminiLayoutService] Stage 2 failed:', errorMsg);
    }

    // Determine overall success
    result.success = result.metadata.componentsBuilt && result.components.length > 0;

    // Add warning if design spec extraction failed but components succeeded
    if (!result.metadata.designSpecExtracted && result.metadata.componentsBuilt) {
      result.warnings.push(
        'Design specification extraction failed; using default colors. Layout may not match original design precisely.'
      );
    }

    return result;
  }

  /**
   * Get default design spec for fallback scenarios
   */
  private getDefaultDesignSpec(): DesignSpec {
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
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSizes: { h1: '48px', h2: '36px', h3: '24px', body: '16px', small: '14px' },
        fontWeights: { heading: 700, body: 400, bold: 600 },
      },
      spacing: {
        unit: 8,
        scale: [4, 8, 12, 16, 24, 32, 48, 64],
        containerPadding: '24px',
        sectionGap: '48px',
      },
      structure: {
        type: 'header-top',
        hasHeader: true,
        hasSidebar: false,
        hasFooter: true,
        mainContentWidth: 'standard',
      },
      componentTypes: [],
      effects: {
        borderRadius: '8px',
        shadows: 'subtle',
        hasGradients: false,
        hasBlur: false,
      },
      vibe: 'Modern and clean',
      confidence: 0.5, // Low confidence for default
    } as DesignSpec;
  }

  /**
   * Helper to normalize component coordinates.
   * Handles 0-1000 scale (from new prompts) and converts to 0-100 scale (percentage).
   * Uses Max Value Heuristic to auto-detect scale.
   */
  private normalizeCoordinates(components: any[]): any[] {
    if (!Array.isArray(components) || components.length === 0) return components;

    // Deep clone to avoid mutating input
    const normalized = JSON.parse(JSON.stringify(components));

    // Heuristic: Check for values > 100 to detect 0-1000 scale
    let maxCoord = 0;

    // Scan all components to find the maximum coordinate value
    normalized.forEach((c: any) => {
      if (c?.bounds) {
        const top = typeof c.bounds.top === 'string' ? parseFloat(c.bounds.top) : c.bounds.top;
        const left = typeof c.bounds.left === 'string' ? parseFloat(c.bounds.left) : c.bounds.left;
        const width =
          typeof c.bounds.width === 'string' ? parseFloat(c.bounds.width) : c.bounds.width;
        const height =
          typeof c.bounds.height === 'string' ? parseFloat(c.bounds.height) : c.bounds.height;

        maxCoord = Math.max(maxCoord, top || 0, left || 0, width || 0, height || 0);
      }
    });

    // If max coordinate exceeds 100, assume 0-1000 scale and divide everything by 10
    // We use a threshold slightly above 100 to account for potential small floating point errors or 101%
    const isThousandsScale = maxCoord > 105;

    if (isThousandsScale) {
      console.log(
        '[GeminiLayoutService] Detected 0-1000 scale (max=' +
          maxCoord +
          '). Normalizing to percentages.'
      );
      normalized.forEach((c: any) => {
        if (c?.bounds) {
          const normalize = (val: any) => {
            const num = typeof val === 'string' ? parseFloat(val) : val;
            return isNaN(num) ? 0 : num / 10;
          };

          c.bounds.top = normalize(c.bounds.top);
          c.bounds.left = normalize(c.bounds.left);
          c.bounds.width = normalize(c.bounds.width);
          c.bounds.height = normalize(c.bounds.height);
        }
      });
    } else {
      console.log(
        '[GeminiLayoutService] Detected 0-100 scale (max=' + maxCoord + '). Keeping as percentages.'
      );
    }

    return normalized;
  }

  /**
   * LEGACY: Single-stage analysis (kept for backward compatibility)
   * Analyze an image to extract pixel-perfect layout components
   * Uses Gemini 3 Flash for speed and high context window
   */
  async analyzeImage(
    imageBase64: string,
    instructions?: string
  ): Promise<DetectedComponentEnhanced[]> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: {
        responseMimeType: 'application/json',
        // Note: thinking_level parameter not yet supported in SDK, will be added in future update
      },
    });

    const prompt = `
      You are an expert UI designer with pixel-perfect vision. Analyze this screenshot and create a complete JSON representation of EVERY visible UI element.

      USER INSTRUCTIONS: ${instructions || 'Create a pixel-perfect replica of this design.'}

      YOUR TASK:
      Return a JSON array where EACH visible element (text, button, image, icon, container, etc.) is a separate object.

      REQUIRED JSON SCHEMA FOR EACH COMPONENT:
      {
        "id": "unique-descriptive-id",
        "type": "header|sidebar|hero|cards|navigation|footer|form|table|carousel|timeline|stepper|stats|testimonials|pricing|features|cta|breadcrumb|pagination|tabs|modal-trigger|search-bar|user-menu|logo|content-section|image-gallery|video-player|map|chart|button|input|list|menu|modal|dropdown|badge|avatar|divider|progress|unknown",
        "bounds": {
          "top": <number 0-100, percentage from top of viewport>,
          "left": <number 0-100, percentage from left edge>,
          "width": <number 0-100, percentage of viewport width>,
          "height": <number 0-100, percentage of viewport height>
        },
        "style": {
          "backgroundColor": "<exact hex color like #1a1a2e - NEVER use 'transparent' or 'white' - use the ACTUAL visible color>",
          "textColor": "<exact hex color - measure the actual text color you see>",
          "fontSize": "<exact size like 48px, 16px>",
          "fontWeight": "<bold|normal|600|700>",
          "padding": "<exact value like 16px or 12px 24px>",
          "borderRadius": "<exact value like 8px, 12px>",
          "borderColor": "<hex color if bordered>",
          "borderWidth": "<1px, 2px etc>",
          "shadow": "<box-shadow value if present>",
          "customCSS": { "<any other CSS properties>": "<values>" }
        },
        "content": {
          "text": "<actual text content you can read - be thorough, extract ALL visible text>",
          "hasImage": true/false,
          "hasIcon": true/false
        },
        "confidence": <0.0-1.0>
      }

      CRITICAL REQUIREMENTS:
      1. **EXHAUSTIVE DETECTION**: Find 20-50+ components. Include EVERY:
         - Heading, paragraph, and text element
         - Button, link, and clickable element
         - Image, icon, and graphic
         - Input field, form element
         - Card, container, section
         - Navigation item, menu item
         - Badge, tag, label

      2. **PIXEL-PERFECT BOUNDS**: Measure precisely where each element sits:
         - top: 0 = very top, 50 = middle, 100 = bottom
         - left: 0 = left edge, 50 = center, 100 = right edge
         - width/height: as percentage of total viewport

      3. **EXTRACT ACTUAL TEXT**: Read ALL visible text and put it in content.text
         - DO NOT leave text empty - extract everything you can read
         - For logos, extract the company/brand name
         - For buttons, extract the button text
         - For headings, extract the full heading text

      4. **MEASURE ACTUAL COLORS**: Look at the screenshot and identify the REAL colors:
         - DO NOT use "transparent" - instead measure what color you actually see
         - DO NOT use "white" unless the background is truly #FFFFFF
         - For dark backgrounds, use colors like #1a1a1a, #2d2d2d, #000000
         - For red backgrounds, use colors like #cc0000, #ff0000, #8b0000
         - For blue backgrounds, use colors like #0066cc, #1e3a8a, #003d82
         - ALWAYS use exact hex codes based on what you see

      5. **USE EXACT CSS VALUES**: No Tailwind classes. Use "padding": "16px", "fontSize": "24px", "backgroundColor": "#1a1a2e"

      6. **UNIQUE IDS**: Give each component a descriptive ID like "header-logo", "hero-main-heading", "cta-primary-button", "footer-social-links"

      SPECIAL RULE FOR COLORS:
      - If an element appears to have a dark background, measure the darkness and return a hex like #1a1a1a or #2d2d2d
      - If an element has a colored background (red, blue, green, etc.), return the actual hex color
      - Only use "transparent" if the element truly has no background and you can see through to elements behind it
      - When in doubt, provide a color - it's better to have a slightly wrong color than "transparent"

      TYPOGRAPHY SIZING:
      - Font sizes must be proportional to the component's bounds height
      - Max fontSize ≈ (height% / 100) × 800 × 0.4 pixels. Example: height 5% → max ~16px, height 10% → max ~32px
      - Always include lineHeight (1.2 or 1.4) for text elements
      - For single-line text (nav items, buttons): add "whiteSpace": "nowrap" in customCSS

      Return ONLY the JSON array. No markdown, no explanation.
    `;

    const imagePart = this.fileToPart(imageBase64);
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());
      const { components: sanitizedComponents, errors } = sanitizeComponents(rawData);
      if (errors.length > 0) {
        console.warn('[GeminiLayoutService] Validation issues in analyzeImage:', errors);
      }
      // Infer layout for containers missing layout data
      const withInferredLayouts = inferContainerLayouts(sanitizedComponents);
      // Validate typography scaling to prevent font overflow
      const withValidatedTypography = validateTypographyScaling(withInferredLayouts);
      // Resolve root overlaps
      const components = resolveRootOverlaps(withValidatedTypography);
      return components;
    } catch (e) {
      console.error('Failed to parse Gemini response', e);
      return [];
    }
  }

  /**
   * Analyze video keyframes to extract motion and flow
   * @param frames Array of base64 images (Start, Middle, End)
   */
  async analyzeVideoFlow(frames: string[], instructions?: string): Promise<VideoMotionAnalysis> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Analyze these 3 video frames (Start, Middle, End) to reverse-engineer the web animations.
      
      USER INSTRUCTIONS: ${instructions || 'Analyze the natural motion flow.'}

      Look for:
      1. **Entrance Animations**: Do elements fade in? Slide up? Scale up?
      2. **Timing**: Based on the difference between frames, estimate duration.
      3. **Scroll Parallax**: Do background elements move slower than foreground?
      
      Return a 'VideoMotionAnalysis' JSON object describing the detected framer-motion configs.
    `;

    // Convert all frames to parts
    const imageParts = frames.map((f) => this.fileToPart(f));

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;

    try {
      return JSON.parse(response.text()) as VideoMotionAnalysis;
    } catch (e) {
      console.error('Failed to parse Video Motion response', e);
      return {
        keyframes: { start: 0, end: 1 },
        transitions: [],
        hoverEffects: false,
        scrollEffects: false,
      };
    }
  }

  /**
   * The "Vision Loop" Critiquer (Legacy)
   * Compares the original reference vs. the generated output (screenshot)
   */
  async critiqueLayout(originalImage: string, generatedImage: string): Promise<LayoutCritique> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are a QA Design Engineer.
      Image 1: Original Design Reference.
      Image 2: Current AI-Generated Output.

      Compare them pixel-by-pixel. Identify discrepancies in:
      - Padding/Margins (e.g., "Button padding is 10px too small")
      - Alignment (e.g., "Logo is not vertically centered")
      - Colors (e.g., "Background is #FFF, needs to be #F5F5F5")
      - Font Weights

      Return a 'LayoutCritique' JSON with specific, executable corrections.
    `;

    const originalPart = this.fileToPart(originalImage);
    const generatedPart = this.fileToPart(generatedImage);

    const result = await model.generateContent([prompt, originalPart, generatedPart]);
    const response = result.response;

    try {
      return JSON.parse(response.text()) as LayoutCritique;
    } catch (e) {
      console.error('Failed to parse Critique response', e);
      return { score: 0, discrepancies: [] };
    }
  }

  /**
   * Enhanced Vision Loop Critiquer for Self-Healing
   *
   * Compares original design vs generated layout and returns structured
   * corrections that can be automatically applied by the AutoFixEngine.
   *
   * @param originalImage - Base64 encoded original design reference
   * @param generatedImage - Base64 encoded screenshot of current layout
   * @param components - Current component array for context
   * @param targetFidelity - Target fidelity score (default: 95)
   */
  async critiqueLayoutEnhanced(
    originalImage: string,
    generatedImage: string,
    components: DetectedComponentEnhanced[],
    targetFidelity: number = 95
  ): Promise<LayoutCritiqueEnhanced> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    // Build rich component context for the AI (enables content + style corrections)
    const componentContext = components.map((c) => ({
      id: c.id,
      type: c.type,
      bounds: c.bounds,
      style: {
        backgroundColor: c.style?.backgroundColor,
        textColor: c.style?.textColor,
        fontSize: c.style?.fontSize,
        fontWeight: c.style?.fontWeight,
        borderRadius: c.style?.borderRadius,
        backgroundImage: c.style?.backgroundImage,
        opacity: c.style?.opacity,
      },
      content: {
        text: typeof c.content?.text === 'string' ? c.content.text.substring(0, 80) : undefined,
        hasIcon: c.content?.hasIcon,
        hasImage: c.content?.hasImage,
        iconName: c.content?.iconName,
        iconSvgPath: c.content?.iconSvgPath ? '[SVG path present]' : undefined,
      },
    }));

    const prompt = `
      You are an expert QA Design Engineer performing pixel-perfect visual comparison.

      **Image 1**: Original Design Reference (the target we want to match)
      **Image 2**: Current AI-Generated Layout (what we've built so far)

      **Current Components** (for reference when creating corrections):
      ${JSON.stringify(componentContext, null, 2)}

      **Your Task**: Compare the two images and identify ALL visual discrepancies.

      For each discrepancy, provide:
      1. Which component is affected (use the component ID from the list above)
      2. What type of issue it is
      3. How severe it is
      4. What the expected value should be
      5. What the actual value is
      6. A JSON patch to fix it

      **Return this exact JSON structure**:
      {
        "fidelityScore": <0-100, how close is the generated layout to the original>,
        "overallAssessment": "<brief summary of the layout quality>",
        "discrepancies": [
          {
            "componentId": "<id from components list, or 'unknown' if can't identify>",
            "issue": "<descriptive_snake_case_type>",
            "severity": "minor|moderate|critical",
            "expected": "<what it should be, e.g., '#FF0000' or '24px'>",
            "actual": "<what it currently is>",
            "correctionJSON": {
              "style": { "<css_property>": "<corrected value>" },
              "content": { "<content_property>": "<corrected value>" },
              "bounds": { "<bounds_property>": <corrected number> }
            }
          }
        ],
        "passesThreshold": <true if fidelityScore >= ${targetFidelity}>,
        "recommendation": "accept|refine|regenerate"
      }

      **correctionJSON rules**:
      - "style": Use for ANY CSS property (color, padding, flexDirection, clipPath, zIndex, etc.)
      - "content": Use for text, icons, images, SVG paths (text, iconName, iconSvgPath, src, etc.)
      - "bounds": Use for position/size (width, height, top, left)
      - Include only the sections that need corrections (omit empty sections)

      **Severity Guidelines**:
      - critical: Major visual difference that breaks the design (wrong colors, missing elements, broken layout)
      - moderate: Noticeable difference that affects quality (spacing off by >10px, wrong font weight)
      - minor: Small difference that most users wouldn't notice (spacing off by <5px, slight color variation)

      **Issue Types** (use descriptive snake_case - these are examples, use ANY type that fits):
      color_drift, spacing_error, typography_mismatch, position_offset, size_mismatch,
      missing_element, extra_element, content_mismatch, effect_missing, image_missing,
      gradient_mismatch, animation_missing, layout_mismatch, shape_mismatch,
      border_mismatch, icon_mismatch, shadow_mismatch, opacity_mismatch, or any other descriptive type

      **Recommendation Logic**:
      - "accept": fidelityScore >= ${targetFidelity} and no critical issues
      - "refine": fidelityScore >= 70 and fixable discrepancies
      - "regenerate": fidelityScore < 70 or unfixable structural issues

      Return ONLY valid JSON. No markdown, no explanation.
    `;

    const originalPart = this.fileToPart(originalImage);
    const generatedPart = this.fileToPart(generatedImage);

    try {
      const result = await model.generateContent([prompt, originalPart, generatedPart]);
      const response = result.response;
      const critique = JSON.parse(response.text()) as LayoutCritiqueEnhanced;

      // Validate and sanitize the response
      return {
        fidelityScore: Math.min(100, Math.max(0, critique.fidelityScore || 0)),
        overallAssessment: critique.overallAssessment || 'No assessment provided',
        discrepancies: Array.isArray(critique.discrepancies) ? critique.discrepancies : [],
        passesThreshold: critique.fidelityScore >= targetFidelity,
        recommendation:
          critique.recommendation ||
          (critique.fidelityScore >= targetFidelity ? 'accept' : 'refine'),
      };
    } catch (e) {
      console.error('[GeminiLayoutService] Failed to parse enhanced critique response', e);
      return {
        fidelityScore: 0,
        overallAssessment: 'Failed to analyze layout comparison',
        discrepancies: [],
        passesThreshold: false,
        recommendation: 'regenerate',
      };
    }
  }

  /**
   * Edit a specific component based on User Instruction
   */
  async editComponent(
    component: DetectedComponentEnhanced,
    prompt: string
  ): Promise<DetectedComponentEnhanced> {
    if (!this.client) throw new Error('Gemini API not configured');

    const model = this.client.getGenerativeModel({
      model: MODEL_FLASH,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const systemPrompt = `
      You constitute the "Mutation Engine" of a Zero-Preset Layout Builder.
      
      Task: Modify the given JSON component based on the User's Request.
      User Request: "${prompt}"
      
      Input Component:
      ${JSON.stringify(component, null, 2)}
      
      Rules:
      1. Return ONLY the modified component JSON.
      2. If the request implies a style change (e.g. "make blue"), update 'style'.
      3. If the request implies content change (e.g. "change text"), update 'content'.
      4. Maintain the 'id' and 'type' unless explicitly asked to change structure.
    `;

    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    try {
      const rawData = JSON.parse(response.text());
      // Merge with original component to preserve bounds if AI omits them
      const merged = { ...component, ...rawData };
      const { components } = sanitizeComponents([merged]);
      return components[0] || component; // Fallback to original if validation fails
    } catch (e) {
      console.error('Failed to parse Edit response', e);
      return component; // Fallback to original
    }
  }

  // --- Helper ---
  private fileToPart(base64: string) {
    // Extract MIME type from data URI (handles PNG, JPEG, SVG, WebP, etc.)
    const mimeMatch = base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    // Remove the data URI prefix - broader regex handles uppercase and special chars
    const data = base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    return {
      inlineData: {
        data,
        mimeType,
      },
    };
  }
}

// Singleton export
let geminiLayoutService: GeminiLayoutService | null = null;

export function getGeminiLayoutService(): GeminiLayoutService {
  if (!geminiLayoutService) {
    geminiLayoutService = new GeminiLayoutService();
  }
  return geminiLayoutService;
}
