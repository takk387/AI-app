/**
 * Gemini Component Builder - Stage 2: "The Engineer"
 *
 * Extracted from GeminiLayoutService.ts
 * Builds specific component list using the DesignSpec from Stage 1.
 * Colors are provided by the spec, so no guessing needed.
 *
 * SDK: @google/generative-ai (older SDK)
 */

import type { GoogleGenerativeAI } from '@google/generative-ai';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import {
  sanitizeComponents,
  inferContainerLayouts,
  resolveRootOverlaps,
} from '@/utils/layoutValidation';
import type { DesignSpec } from '@/types/designSpec';
import { validateFontSizeForContainer } from '@/utils/responsiveTypography';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_FLASH = 'gemini-3-flash-preview';

// ============================================================================
// SHARED HELPERS
// ============================================================================

/**
 * Post-processing: Validate and correct typography scaling.
 * Ensures font sizes don't exceed container dimensions to prevent overflow.
 */
export function validateTypographyScaling(
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

/**
 * Normalize component coordinates.
 * Handles 0-1000 scale (from new prompts) and converts to 0-100 scale (percentage).
 * Uses Max Value Heuristic to auto-detect scale.
 */
export function normalizeCoordinates(components: any[]): any[] {
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

// ============================================================================
// STAGE 2 PROMPT
// ============================================================================

const COMPONENT_BUILDER_PROMPT = `
      You are "The Engineer" - a pixel-perfect layout reconstruction specialist.

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
           For a column layout, each child's width should be <= 1000 (full parent width).
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
           * Max fontSize ~ (containerHeight% / 100) x 800 x 0.4 pixels
           * Example: height 5% -> max ~16px, height 10% -> max ~32px, height 60% -> max ~192px
           * ALWAYS include lineHeight (unitless multiplier like 1.2 or 1.4) for ALL text components
           * For single-line text (nav items, buttons, labels): add "whiteSpace": "nowrap" in customCSS
           * Multi-line text: ensure container height fits all lines at fontSize x lineHeight

      8. **ICON DETECTION - EXACT SVG REPLICATION**:
         - When you see an icon, set hasIcon: true
         - FOR EXACT REPLICAS: Extract the actual SVG path data and provide it in iconSvgPath
           Example: "iconSvgPath": "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5"
         - If you cannot extract the SVG path:
           * For standard UI icons (arrows, checkmarks, menus, etc.) -> use iconName with Lucide name:
             "Home", "User", "Menu", "Search", "ArrowRight", "ArrowLeft", "Settings", "Check", "Plus", "Minus", "Heart", "Star", "Close", "ChevronDown", "ChevronRight", "Mail", "Phone", "MapPin", "Calendar", "Clock", "Bell", "ShoppingCart", "CreditCard"
           * For custom logos, brand icons, or complex graphics -> set hasCustomVisual: true and
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
            * Animated or shimmer gradients -> type: "css-animation", provide cssKeyframes with gradient shifts
            * Particle effects (sparkles, confetti, floating dots) -> type: "particle-system", provide FULL particleConfig
            * Glowing or pulsing elements -> type: "css-animation", provide cssKeyframes with opacity/box-shadow changes
            * Floating/drifting decorative shapes -> type: "particle-system" with direction and shape config
            * Aurora or mesh gradient backgrounds -> type: "css-animation" with gradient-position keyframes

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

// ============================================================================
// STAGE 2 IMPLEMENTATION
// ============================================================================

/**
 * Build specific component list using the DesignSpec from Stage 1.
 *
 * @param client - Initialized GoogleGenerativeAI client
 * @param fileToPart - Helper to convert base64 image to Gemini inline data part
 * @param imageBase64 - Base64-encoded screenshot
 * @param designSpec - Design specification from Stage 1
 * @param instructions - Optional user instructions
 */
export async function buildComponentsFromSpec(
  client: GoogleGenerativeAI,
  fileToPart: (base64: string) => { inlineData: { data: string; mimeType: string } },
  imageBase64: string,
  designSpec: DesignSpec,
  instructions?: string
): Promise<DetectedComponentEnhanced[]> {
  const model = client.getGenerativeModel({
    model: MODEL_FLASH,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt = `${COMPONENT_BUILDER_PROMPT}

      USER INSTRUCTIONS: ${instructions || 'Build component list.'}

      DESIGN SPEC (from Stage 1 - The Architect):
      ${JSON.stringify(designSpec, null, 2)}
    `;

  const imagePart = fileToPart(imageBase64);
  const result = await model.generateContent([prompt, imagePart]);
  const response = result.response;

  try {
    const rawData = JSON.parse(response.text());

    // CRITICAL FIX: Normalize 0-1000 scale to 0-100 scale
    // The Stage 2 prompt (The Engineer) asks for 0-1000 scale for precision.
    // However, the renderer and validator expect 0-100 scale (percentage).
    // We must normalize before validation to prevent small items (e.g., width 50)
    // from being misinterpreted as 50% instead of 5% by the validator's heuristic.
    const normalizedData = normalizeCoordinates(rawData);

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
    const containersWithLayout = components.filter((c) => c.role === 'container' && c.layout?.type);
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
