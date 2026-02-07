/**
 * Titan Builder - Code Synthesis
 *
 * Extracted from TitanPipelineService.ts
 * Generates final React code (App.tsx + styles.css + index.tsx) from manifests.
 *
 * SDK: @google/genai (new SDK with agentic features)
 */

import { GoogleGenAI, createPartFromUri } from '@google/genai';
import type { AppFile } from '@/types/railway';
import type {
  VisualManifest,
  ComponentStructure,
  MotionPhysics,
  MergeStrategy,
  AppContext,
} from '@/types/titanPipeline';

// ============================================================================
// CONFIGURATION
// ============================================================================

const GEMINI_PRO_MODEL = 'gemini-3-pro-preview';

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key missing');
  return key;
}

// ============================================================================
// BUILDER PROMPT
// ============================================================================

const BUILDER_PROMPT = `### Role
You are the **Universal Builder**. Write the final React code.

### Instructions
1. **Use the Assets (Priority #1):**
   - Assets maps names to URLs: {"button_bg": "https://...", "hero_bg": "https://..."}
   - Match names to elements: "button_bg" -> apply to buttons, "hero_bg" -> hero section, "card_bg" -> cards.
   - Apply via: style={{ backgroundImage: \`url(\${assetUrl})\`, backgroundSize: 'cover', backgroundPosition: 'center' }}
   - Do NOT set backgroundColor when a background image is active.
   - Do NOT use CSS gradients if an image asset is available.

2. **DATA-ID ATTRIBUTES (MANDATORY — DO NOT SKIP):**
   - You MUST add a unique data-id attribute to EVERY HTML element you generate.
   - Format: data-id="descriptive_name" (e.g., "hero_section", "nav_logo", "cta_button")
   - This is REQUIRED for the visual inspector. Without data-id, the editor breaks.
   - Every div, button, p, h1, span, img, nav, section, footer MUST have data-id.

3. **REPLICATION MODE (CRITICAL):**
   - If the Manifests contain a 'dom_tree', you MUST recursively build that exact structure.
   - Map 'type' to HTML tags. Apply styles with EXACT values from the manifest — do not approximate.
   - **Style application strategy:**
     - Use inline style={{}} with the exact CSS values from the manifest for all visual properties.
     - Use Tailwind only for structural layout (flex, grid, display, positioning).
     - Use CSS classes in styles.css for anything that needs selectors (hover, focus, active,
       transitions, @keyframes, pseudo-elements).
   - NEVER replace an exact value with a "close enough" Tailwind utility class.
   - If the manifest says boxShadow: "0 8px 32px rgba(0,0,0,0.15)", use that exact value.
   - Pixel-perfect accuracy is the goal.
   - **SIZING FROM MANIFEST (CRITICAL):**
     - The manifest "canvas" object provides viewport reference dimensions (width x height in px).
     - Each node may include a "bounds" field with percentage coordinates (0-100).
     - Use canvas dimensions to calculate pixel sizes: element_width_px = (bounds.width / 100) * canvas.width
     - Apply explicit width/height from the styles object when provided (e.g., "width": "320px").
     - For root sections, ensure proper vertical stacking with heights matching the manifest proportions.
     - MEASURE element sizes from the original image. If a button looks ~120px wide and ~48px tall, set those dimensions explicitly.
     - Preserve spacing between elements — use the exact gap, margin, and padding values from the manifest styles.
     - Do NOT let elements auto-size when explicit dimensions are available. Set width and height.

4. **Icons (Rendering):**
   - **Priority 1:** If \`iconSvgPath\` exists → render inline \`<svg>\` with the path data,
     applying \`iconColor\` as stroke/fill and \`iconViewBox\`.
   - **Priority 2:** If \`hasCustomVisual\` is true on the node AND the node's \`id\` appears
     as a key in the ASSETS map → render as \`<img src={assets[nodeId]} alt="..." />\`
     with appropriate width/height from iconSize. This preserves custom logos and brand
     icons that were cropped from the original image.
   - **Priority 3:** If only \`iconName\` exists → import from \`lucide-react\` and render
     \`<IconName />\`. Only use this for standard UI icons.
   - Apply positioning via flex layout.
   - Map sizes: sm=16px, md=20px, lg=24px, or use explicit pixel values from styles.
   - If \`iconContainerStyle\` exists → wrap icon in a styled container div.
   - Available Lucide icons: Home, User, Menu, Search, Settings, Star, Heart, Check, Plus, ArrowRight, etc.
   - NEVER use a generic Lucide icon as a stand-in for a brand logo or custom graphic.

5. **Physics (CONDITIONAL — Read Carefully):**
   - You will receive a PHYSICS section below. If it is absent, null, or contains an empty
     "component_motions" array, then the design is STATIC. Do NOT add any Framer Motion
     imports, animations, motion.div wrappers, spring physics, or transition effects.
   - ONLY use Framer Motion if the PHYSICS section contains actual motion data with
     non-empty "component_motions" entries that specify velocity, mass, and spring values.
   - Zero Hallucination Policy: Never invent animations. If the physics data is empty,
     the output must be completely static. No "subtle" animations, no "gentle" transitions,
     no hover motion effects beyond what is specified in interactionStates from the manifest.

6. **Shaped & Textured Elements (CRITICAL for photorealism):**
   - When the user asks for an element that "looks like" a real object (cloud, stone, wood, etc.),
     create BOTH the shape AND the texture:
     a) **Shape:** Use CSS clip-path, SVG clipPath, or creative border-radius to form the silhouette.
        Examples: cloud -> clip-path with rounded bumps, leaf -> custom polygon, stone -> irregular rounded.
     b) **Texture:** If an asset URL exists, apply it as backgroundImage with backgroundSize: cover.
        If no asset, use CSS gradients, box-shadows, and filters to approximate the material.
     c) **Depth:** Add box-shadow, inner highlights, and subtle gradients for 3D realism.
     d) **Interactivity:** The element must still function (clickable, hover states).
   - Example: "photorealistic cloud button" ->
     clip-path: path('M25,60 a20,20 0,0,1 0,-40 a20,20 0,0,1 35,0 a20,20 0,0,1 0,40 z');
     backgroundImage: url(cloud_texture.png); backgroundSize: cover;
     box-shadow for depth; filter: drop-shadow for floating effect.
   - Do NOT just set a backgroundColor. Use real CSS shape techniques.

7. **ORIGINAL DESIGN REFERENCE (CRITICAL):**
   - You may receive an original design image alongside these instructions.
   - If provided, use it as the GROUND TRUTH for visual accuracy.
   - Match exact colors, gradients, spacing, typography, and element positioning.
   - MEASURE element sizes from the image — if a card appears ~320px wide, set that explicitly.
   - Pay attention to spacing BETWEEN elements — gaps, margins, section spacing must match.
   - The canvas dimensions in the manifest tell you the reference viewport size. Scale accordingly.
   - Pay special attention to: logos (use extracted asset if available), icons (use asset or inline SVG),
     custom button styles, background patterns, and gradient directions.
   - For logos/icons you cannot extract as SVG: check if the node's id exists in the ASSETS
     map (from extraction). If so, render as \`<img src={assets[nodeId]} />\`. Only if no
     extracted asset exists, describe the element in a comment with its data-id for manual replacement.
   - The manifests provide structured data, but the image is the ultimate reference.

8. **Interaction States (REQUIRED for buttons and links):**
   - For every button and interactive element, implement hover, active, and focus states.
   - If the manifest includes "interactionStates", use those exact values in styles.css.
   - If no explicit states are provided, derive natural transitions from the default styles
     (e.g., subtle shadow increase on hover, slight scale on active, ring on focus).
   - Define these as CSS classes in styles.css and apply them in App.tsx.

### Output Format
Return TWO files separated by markers:

--- FILE: App.tsx ---
[Full App.tsx code with import './styles.css' at the top]

--- FILE: styles.css ---
[@keyframes, CSS custom properties, complex hover/focus selectors. Leave empty if not needed.]

Rules:
- App.tsx MUST include: import './styles.css';
- Use CSS classes from styles.css for animations, complex hover effects, and pseudo-selectors.
- Use inline styles for simple properties (colors, spacing, sizing).
- No markdown fences. Just the raw code.`;

// ============================================================================
// BUILDER IMPLEMENTATION
// ============================================================================

export async function assembleCode(
  _structure: ComponentStructure | null,
  manifests: VisualManifest[],
  physics: MotionPhysics | null,
  strategy: MergeStrategy,
  currentCode: string | null,
  instructions: string,
  assets: Record<string, string>,
  originalImageRef?: { fileUri: string; mimeType: string },
  healingContext?: {
    iteration: number;
    previousFidelityScore: number;
    modifiedComponentIds: string[];
    issuesSummary: string;
  },
  appContext?: AppContext
): Promise<AppFile[]> {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const hasAssets = Object.keys(assets).length > 0;
  const assetContext = hasAssets
    ? `\n\n### ASSET CONTEXT (CRITICAL — Use these for custom visuals!)
These assets were EXTRACTED from the original design (icons, logos, textures):
${Object.entries(assets)
  .map(([name, url]) => `- "${name}" → ${url}`)
  .join('\n')}

RULES:
1. For ANY manifest node where id matches a key above AND hasCustomVisual=true:
   → Use <img src="${'{'}assets[nodeId]{'}'}" /> — NOT a Lucide icon!
2. For textured backgrounds: apply via backgroundImage: url(...)
3. NEVER substitute a Lucide icon for an extracted asset.`
    : '';

  const hasPhysicsData =
    physics && Array.isArray(physics.component_motions) && physics.component_motions.length > 0;

  const physicsSection = hasPhysicsData
    ? `\n  ### PHYSICS (Implement these motions using Framer Motion)\n  ${JSON.stringify(physics, null, 2)}`
    : `\n  ### PHYSICS\n  No motion data provided. This design is STATIC. Do NOT add Framer Motion or any animations.`;

  const healingSection = healingContext
    ? `\n  ### HEALING CONTEXT (Refinement iteration #${healingContext.iteration})
  Fidelity: ${healingContext.previousFidelityScore.toFixed(1)}%.

  IMPORTANT: The manifest has ALREADY been patched with corrections.
  ${healingContext.issuesSummary}

  Rules for healing iterations:
  - The components listed above have ALREADY been fixed in the manifest.
  - USE THE MANIFEST VALUES EXACTLY — do NOT re-interpret, re-calculate, or re-fix them.
  - Preserve everything from the previous version that is not explicitly changed in the manifest.
  - If a discrepancy mentions "unwanted animation" or "unexpected motion", remove ALL
    Framer Motion usage for that component.`
    : '';

  const mergeSection =
    currentCode && (strategy.mode === 'EDIT' || strategy.mode === 'MERGE')
      ? `\n  ### EXISTING CODE (You MUST merge with this)
  Mode: ${strategy.mode}
  ${
    strategy.mode === 'EDIT'
      ? 'Modify the existing code below according to the user instructions. Preserve all existing functionality, styles, and structure unless the user specifically asks to change them.'
      : 'Merge the new layout/design with the existing code below. Keep existing components and add new ones from the manifests.'
  }

  Existing App.tsx:
  \`\`\`tsx
  ${currentCode}
  \`\`\``
      : '';

  // Build app context section so the Builder knows the app's concept, features, and preferences
  const appContextSection = appContext
    ? `\n  ### APP CONTEXT (Use this to inform your design decisions)
  App: ${appContext.name ?? 'Untitled'}${appContext.description ? ` — ${appContext.description}` : ''}
  ${appContext.purpose ? `Purpose: ${appContext.purpose}` : ''}
  ${appContext.targetUsers ? `Target Users: ${appContext.targetUsers}` : ''}
  ${appContext.layout ? `Layout Type: ${appContext.layout}` : ''}
  ${appContext.coreFeatures?.length ? `Features:\n${appContext.coreFeatures.map((f) => `  - ${f.name}: ${f.description} (${f.priority} priority)`).join('\n')}` : ''}
  ${appContext.needsAuth ? 'Auth: Yes — include login/signup pages' : ''}
  ${appContext.roles?.length ? `User Roles: ${appContext.roles.map((r) => `${r.name} (${r.capabilities.join(', ')})`).join('; ')}` : ''}
  ${appContext.workflows?.length ? `Workflows:\n${appContext.workflows.map((w) => `  - ${w.name}: ${w.steps.join(' → ')}`).join('\n')}` : ''}
  Color Scheme: ${appContext.colorScheme ?? 'auto'}${appContext.primaryColor ? `, Primary: ${appContext.primaryColor}` : ''}${appContext.secondaryColor ? `, Secondary: ${appContext.secondaryColor}` : ''}${appContext.accentColor ? `, Accent: ${appContext.accentColor}` : ''}
  ${appContext.style ? `Style: ${appContext.style}` : ''}
  ${appContext.fontFamily ? `Font: ${appContext.fontFamily}` : ''}
  ${appContext.borderRadius ? `Border Radius: ${appContext.borderRadius}` : ''}
  ${appContext.spacing ? `Spacing: ${appContext.spacing}` : ''}`
    : '';

  // GENERATE mode: concept-driven full app generation (no manifests/images needed)
  const isGenerateMode = strategy.mode === 'GENERATE' && appContext;

  const generateModePrompt = isGenerateMode
    ? `### Role
You are the **Full App Layout Generator**. Build a complete, production-quality React application from a concept specification.

### Instructions
1. Create a COMPLETE multi-page React app with client-side routing (use React Router via \`react-router-dom\`).
2. Generate ALL pages implied by the features, auth requirements, and user roles.
3. Include a shared navigation component (sidebar for dashboard layout, top navbar for others).
4. Every page must have realistic placeholder content that matches the feature description.
5. Apply the specified color scheme, style, fonts, and spacing throughout.
6. Add a unique data-id attribute to EVERY HTML element for the visual inspector.
7. Make it responsive (mobile + desktop).
8. Include proper hover/focus states on all interactive elements.

### Output Format
Return TWO files separated by markers:

--- FILE: App.tsx ---
[Full App.tsx with React Router, all page components, navigation, and import './styles.css']

--- FILE: styles.css ---
[CSS custom properties for theme, hover/focus styles, responsive breakpoints, animations]

Rules:
- App.tsx MUST include: import './styles.css';
- Define CSS custom properties in :root for all theme colors.
- Use inline styles for component-specific properties, CSS classes for shared styles.
- No markdown fences. Just the raw code.
${appContextSection}

### INSTRUCTIONS
${instructions}`
    : '';

  const prompt = isGenerateMode
    ? generateModePrompt
    : `${BUILDER_PROMPT}

  ### ASSETS (Use these URLs!)
  ${JSON.stringify(assets, null, 2)}
  ${assetContext}
  ${appContextSection}

  ### INSTRUCTIONS
  ${instructions}

  ### MANIFESTS (Look for dom_tree)
  ${JSON.stringify(manifests, null, 2)}
  ${physicsSection}
  ${healingSection}
  ${mergeSection}
  `;

  // Build multimodal content: original image (if available) + text prompt
  const contentParts: any[] = [];
  if (originalImageRef) {
    contentParts.push(createPartFromUri(originalImageRef.fileUri, originalImageRef.mimeType));
  }
  contentParts.push({ text: prompt });

  const result = await ai.models.generateContent({
    model: GEMINI_PRO_MODEL,
    contents: contentParts,
    config: { maxOutputTokens: 65536 },
  });
  const responseText = (result.text ?? '')
    .replace(/^```(?:tsx?|jsx?|typescript|javascript|css)?\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();

  // Parse multi-file output (App.tsx + optional styles.css)
  const appMatch = responseText.match(
    /---\s*FILE:\s*App\.tsx\s*---\s*\n([\s\S]*?)(?=---\s*FILE:|$)/
  );
  const cssMatch = responseText.match(/---\s*FILE:\s*styles\.css\s*---\s*\n([\s\S]*?)$/);

  const files: AppFile[] = [];

  // App.tsx: use parsed content, or entire response as fallback with validation
  let appContent: string;
  if (appMatch) {
    appContent = appMatch[1].trim();
  } else {
    appContent = responseText;
    if (!responseText.includes('export default') && !responseText.includes('function App')) {
      console.warn(
        '[TitanPipeline] Builder output missing file markers and does not appear to be React code'
      );
    }
  }

  files.push({
    path: '/src/App.tsx',
    content: appContent,
  });

  // styles.css: always include (App.tsx imports it; missing file breaks Sandpack)
  files.push({
    path: '/src/styles.css',
    content: cssMatch && cssMatch[1].trim() ? cssMatch[1].trim() : '/* Generated styles */',
  });

  // index.tsx: always include
  files.push({
    path: '/src/index.tsx',
    content: `import './preflight-undo';\nimport React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './inspector';\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<React.StrictMode><App /></React.StrictMode>);`,
  });

  return files;
}
