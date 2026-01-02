/**
 * Layout Builder Chat - API Route
 *
 * Handles AI-powered layout design conversations with vision capabilities.
 * Claude can "see" the layout preview via screenshots and provide visual feedback.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  buildDynamicContext,
  buildPixelPerfectPrompt,
  LAYOUT_BUILDER_SYSTEM_PROMPT,
} from '@/prompts/layoutBuilderSystemPrompt';
import type {
  LayoutDesign,
  LayoutChatRequest,
  LayoutChatResponse,
  DesignChange,
  SuggestedAction,
  CompleteDesignAnalysis,
  QuickAnalysis,
  DesignContext,
  LayoutWorkflowState,
} from '@/types/layoutDesign';
import {
  matchDesignPattern,
  applyPatternToDesign,
  type DesignPattern,
} from '@/utils/designPatterns';
import { parseDesignDescription } from '@/utils/designLanguageParser';
import { DesignReplicator } from '@/services/designReplicator';
// Context Compression (P0-P1 optimization)
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
  getTruncationInfo,
  buildTruncationNotice,
  type CompressedContext,
} from '@/utils/contextCompression';
import type { ChatMessage } from '@/types/aiBuilderTypes';
// Semantic Memory (P0-P1 Phase 7b)
import { createSemanticMemory, extractDesignKeywords } from '@/utils/semanticMemory';
import { createClient } from '@/utils/supabase/server';
import { getDalleService, getImageCost } from '@/services/dalleService';
import { getAnimationPreset, ANIMATION_PRESETS } from '@/data/animationPresets';
import {
  getAdvancedEffectPreset,
  ADVANCED_EFFECT_PRESETS,
  type AdvancedEffectPreset,
} from '@/data/advancedEffectsPresets';
import {
  getComponentStatePreset,
  COMPONENT_STATE_PRESETS,
  type ComponentStatePreset,
} from '@/data/componentStatePresets';
import {
  getMicroInteractionPreset,
  MICRO_INTERACTION_PRESETS,
  type MicroInteractionPreset,
} from '@/data/microInteractionPresets';
import type {
  DetectedAnimation,
  AppliedComponentState,
  AppliedMicroInteraction,
} from '@/types/layoutDesign';

// Phase 4: External API Service Integrations
import {
  generateColorPalette,
  generatePaletteVariations,
  type GeneratedPalette,
  type ColormindModel,
} from '@/services/colormindService';
import { searchIcons, getIcon } from '@/services/iconifyService';
import {
  searchLottieAnimations,
  getCategories as getLottieCategories,
} from '@/services/lottieService';
import {
  identifyFontFromImage,
  getGoogleFontsAlternatives,
  getFontPairings,
  generateFontCSS,
  type FontIdentificationResult,
  type FontMatch,
} from '@/services/fontIdentificationService';
import { auditAccessibility, checkColorContrast } from '@/services/accessibilityAuditService';
import { generateComponent, getAvailableTemplates } from '@/services/v0Service';

// Phase 5: AI Enhancement Imports
import { analyzeDesign } from '@/utils/designAnalyzer';
import { critiqueDesign, formatCritiqueReport } from '@/utils/designCritiqueEngine';
import { generateDesignVariants, type VariationStyle } from '@/utils/variantGenerator';
import {
  getWorkflow,
  getAllWorkflows,
  getWorkflowStep,
  createWorkflowState,
  getWorkflowProgress,
  formatWorkflowStatus,
  type WorkflowState,
} from '@/data/designWorkflows';
import {
  generateDesignSystem,
  getAvailableFormats,
  type ExportFormat,
} from '@/services/designSystemGenerator';
import {
  analyzeExtractedStyles,
  formatAnalysisReport,
  type CompetitorAnalysis,
} from '@/services/competitorAnalyzer';
import type { AnalysisDepth, DesignAnalysisArea, ProactiveAnalysis } from '@/types/layoutDesign';
import type { CritiquePrinciple } from '@/data/designCritiqueRules';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Hex color validation regex
const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// Typography settings schema
const TypographySchema = z
  .object({
    fontFamily: z.string().optional(),
    headingWeight: z.enum(['light', 'normal', 'medium', 'semibold', 'bold']).optional(),
    bodyWeight: z.enum(['light', 'normal', 'medium', 'semibold']).optional(),
    headingSize: z.enum(['sm', 'base', 'lg', 'xl', '2xl']).optional(),
    bodySize: z.enum(['xs', 'sm', 'base', 'lg']).optional(),
    lineHeight: z.enum(['tight', 'normal', 'relaxed']).optional(),
    letterSpacing: z.enum(['tight', 'normal', 'wide']).optional(),
  })
  .strict()
  .optional();

// Color settings schema with hex validation
const ColorSchema = z
  .object({
    primary: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    secondary: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    accent: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    background: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    surface: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    text: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    textMuted: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    border: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    success: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    warning: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    error: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
    info: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  })
  .strict()
  .optional();

// Spacing settings schema
const SpacingSchema = z
  .object({
    density: z.enum(['compact', 'normal', 'relaxed']).optional(),
    containerWidth: z.enum(['narrow', 'standard', 'wide', 'full']).optional(),
    sectionPadding: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
    componentGap: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  })
  .strict()
  .optional();

// Effects settings schema
const EffectsSchema = z
  .object({
    borderRadius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
    shadows: z.enum(['none', 'subtle', 'medium', 'strong']).optional(),
    animations: z.enum(['none', 'subtle', 'smooth', 'playful']).optional(),
    blur: z.enum(['none', 'subtle', 'medium', 'strong']).optional(),
    gradients: z.boolean().optional(),
  })
  .strict()
  .optional();

// Global styles schema
const GlobalStylesSchema = z
  .object({
    typography: TypographySchema,
    colors: ColorSchema,
    spacing: SpacingSchema,
    effects: EffectsSchema,
  })
  .strict()
  .optional();

// Base preferences schema
const BasePreferencesSchema = z
  .object({
    style: z.enum(['modern', 'minimalist', 'playful', 'professional', 'custom']).optional(),
    colorScheme: z.enum(['light', 'dark', 'auto', 'custom']).optional(),
    layout: z.enum(['single-page', 'multi-page', 'dashboard', 'custom']).optional(),
  })
  .strict()
  .optional();

// Component schemas
const HeaderDesignSchema = z
  .object({
    visible: z.boolean().optional(),
    height: z.enum(['compact', 'standard', 'tall']).optional(),
    style: z.enum(['solid', 'gradient', 'blur', 'transparent']).optional(),
    logoPosition: z.enum(['left', 'center', 'right']).optional(),
    navPosition: z.enum(['left', 'center', 'right']).optional(),
    hasSearch: z.boolean().optional(),
    hasCTA: z.boolean().optional(),
    ctaText: z.string().optional(),
    ctaStyle: z.enum(['filled', 'outline', 'ghost']).optional(),
  })
  .strict()
  .optional();

const SidebarDesignSchema = z
  .object({
    visible: z.boolean().optional(),
    position: z.enum(['left', 'right']).optional(),
    width: z.enum(['narrow', 'standard', 'wide']).optional(),
    collapsible: z.boolean().optional(),
    defaultCollapsed: z.boolean().optional(),
    style: z.enum(['standard', 'minimal', 'floating']).optional(),
    iconOnly: z.boolean().optional(),
    hasLogo: z.boolean().optional(),
  })
  .strict()
  .optional();

const HeroDesignSchema = z
  .object({
    visible: z.boolean().optional(),
    height: z.enum(['compact', 'standard', 'tall', 'fullscreen']).optional(),
    layout: z.enum(['centered', 'split', 'offset']).optional(),
    hasImage: z.boolean().optional(),
    imagePosition: z.enum(['left', 'right', 'background']).optional(),
    hasSubtitle: z.boolean().optional(),
    hasCTA: z.boolean().optional(),
    ctaCount: z.number().min(1).max(3).optional(),
  })
  .strict()
  .optional();

const CardDesignSchema = z
  .object({
    style: z.enum(['minimal', 'bordered', 'elevated', 'filled']).optional(),
    imagePosition: z.enum(['none', 'top', 'left', 'right', 'background']).optional(),
    showBadge: z.boolean().optional(),
    showFooter: z.boolean().optional(),
    hoverEffect: z.enum(['none', 'lift', 'glow', 'scale', 'border']).optional(),
    aspectRatio: z.enum(['auto', 'square', 'portrait', 'landscape', 'video']).optional(),
  })
  .strict()
  .optional();

const FooterDesignSchema = z
  .object({
    visible: z.boolean().optional(),
    style: z.enum(['minimal', 'standard', 'rich']).optional(),
    columns: z.number().min(1).max(5).optional(),
    showSocial: z.boolean().optional(),
    showNewsletter: z.boolean().optional(),
    showCopyright: z.boolean().optional(),
    position: z.enum(['static', 'fixed', 'sticky']).optional(),
  })
  .strict()
  .optional();

// Components schema
const ComponentsSchema = z
  .object({
    header: HeaderDesignSchema,
    sidebar: SidebarDesignSchema,
    hero: HeroDesignSchema,
    cards: CardDesignSchema,
    footer: FooterDesignSchema,
  })
  .strict()
  .optional();

// Structure schema
const StructureSchema = z
  .object({
    type: z.enum(['single-page', 'multi-page', 'dashboard', 'landing']).optional(),
    hasHeader: z.boolean().optional(),
    hasSidebar: z.boolean().optional(),
    hasFooter: z.boolean().optional(),
    sidebarPosition: z.enum(['left', 'right']).optional(),
    headerType: z.enum(['fixed', 'sticky', 'static']).optional(),
    contentLayout: z.enum(['centered', 'full-width', 'offset']).optional(),
    mainContentWidth: z.enum(['narrow', 'standard', 'wide', 'full']).optional(),
  })
  .strict()
  .optional();

// Responsive schema
const ResponsiveSchema = z
  .object({
    mobileBreakpoint: z.number().optional(),
    tabletBreakpoint: z.number().optional(),
    mobileLayout: z.enum(['stack', 'drawer', 'bottom-nav']).optional(),
    mobileHeader: z.enum(['hamburger', 'bottom-tabs', 'minimal']).optional(),
    hideSidebarOnMobile: z.boolean().optional(),
    stackCardsOnMobile: z.boolean().optional(),
  })
  .strict()
  .optional();

// Complete design updates schema
const DesignUpdatesSchema = z
  .object({
    basePreferences: BasePreferencesSchema,
    globalStyles: GlobalStylesSchema,
    components: ComponentsSchema,
    structure: StructureSchema,
    responsive: ResponsiveSchema,
  })
  .strict();

// Design change schema
const DesignChangeSchema = z.object({
  property: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  reason: z.string(),
});

// Complete extraction response schema
const ExtractionResponseSchema = z.object({
  updates: DesignUpdatesSchema.optional().default({}),
  changes: z.array(DesignChangeSchema).optional().default([]),
});

// ============================================================================
// TOOL DEFINITIONS FOR ANIMATION & BACKGROUND GENERATION
// ============================================================================

const LAYOUT_BUILDER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_background',
    description:
      'Generate a custom background image using DALL-E 3. Use this when the user asks for a generated background, custom image, or AI-created visual asset. Returns the generated image URL and cost info.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description:
            'Detailed description of the background to generate. Include style, colors, mood, and pattern preferences.',
        },
        targetElement: {
          type: 'string',
          description:
            'CSS selector or element name where the background should be applied (e.g., ".hero-section", "header", "body")',
        },
        style: {
          type: 'string',
          enum: ['abstract', 'geometric', 'gradient', 'texture', 'natural', 'vivid'],
          description: 'Visual style for the generated background',
        },
        quality: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Image quality - low ($0.012), medium ($0.016), high ($0.032-0.064)',
        },
      },
      required: ['prompt', 'targetElement'],
    },
  },
  {
    name: 'apply_animation',
    description:
      'Apply an animation to a specific element in the layout. Use this when the user wants to add motion, transitions, or effects to elements. Can use preset animations or create custom ones.',
    input_schema: {
      type: 'object' as const,
      properties: {
        animationType: {
          type: 'string',
          description:
            'Type of animation (fade, slide, scale, rotate, gradient-shift, particle-flow, wave, morph, aurora, noise-texture, etc.)',
        },
        targetElement: {
          type: 'string',
          description: 'CSS selector or element name to apply animation to',
        },
        presetId: {
          type: 'string',
          description:
            'Optional: ID of a preset animation to use (e.g., fadeIn, hoverLift, gradientShift)',
        },
        duration: {
          type: 'string',
          description: 'Animation duration (e.g., "0.3s", "2s", "500ms")',
        },
        easing: {
          type: 'string',
          description:
            'Easing function (e.g., "ease-out", "ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)")',
        },
        delay: {
          type: 'string',
          description: 'Animation delay (e.g., "0.1s")',
        },
        iterations: {
          type: 'string',
          description: 'Number of iterations ("1", "3", "infinite")',
        },
      },
      required: ['animationType', 'targetElement'],
    },
  },
  {
    name: 'list_elements',
    description:
      'List the available elements in the current layout that can be selected for animation or styling. Use this when the user needs to choose an element or when clarification is needed about which element to target.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'sections', 'components', 'interactive'],
          description: 'Filter elements by category',
        },
      },
      required: [],
    },
  },
  {
    name: 'apply_effect',
    description:
      'Apply advanced visual effects like glassmorphism, neumorphism, gradient borders, text gradients, or glow effects to elements. Use this when the user asks for glass effects, soft shadows, gradient borders, neon text, or other modern CSS effects.',
    input_schema: {
      type: 'object' as const,
      properties: {
        effectType: {
          type: 'string',
          enum: ['glassmorphism', 'neumorphism', 'gradient-border', 'text-effect', 'shadow'],
          description: 'Type of advanced effect to apply',
        },
        presetId: {
          type: 'string',
          description:
            'Preset ID (e.g., glass-subtle, glass-dark, neu-flat, neu-pressed, gradient-border-rainbow, text-gradient-purple, text-glow-green, shadow-elevated)',
        },
        targetElement: {
          type: 'string',
          description: 'CSS selector or element name to apply effect to',
        },
        customConfig: {
          type: 'object',
          description: 'Optional custom configuration to override preset defaults',
        },
      },
      required: ['effectType', 'targetElement'],
    },
  },
  {
    name: 'apply_component_state',
    description:
      'Apply interactive state styling (hover, active, focus, disabled, loading) to UI components. Use this when the user wants hover effects, focus rings, button press feedback, disabled states, or loading animations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        state: {
          type: 'string',
          enum: ['hover', 'active', 'focus', 'disabled', 'loading'],
          description: 'Component state to style',
        },
        presetId: {
          type: 'string',
          description:
            'Preset ID (e.g., hover-lift, hover-glow, hover-scale, focus-ring, active-press, disabled-muted, loading-pulse)',
        },
        targetElement: {
          type: 'string',
          description: 'Component selector to apply state styling',
        },
      },
      required: ['state', 'targetElement'],
    },
  },
  {
    name: 'apply_micro_interaction',
    description:
      'Apply micro-interactions like ripple effects, magnetic pull, 3D tilt, bounce animations, or typewriter effects. Use this when the user wants click ripples, elements that follow the cursor, card tilting, scroll animations, or text typing effects.',
    input_schema: {
      type: 'object' as const,
      properties: {
        interactionId: {
          type: 'string',
          enum: [
            'ripple',
            'ripple-dark',
            'magnetic',
            'tilt-3d',
            'float',
            'wobble',
            'jello',
            'shine',
            'bounce-in',
            'slide-up',
            'slide-left',
            'slide-right',
            'zoom-in',
            'flip-in',
            'stagger-children',
            'heartbeat',
            'rubber-band',
            'shake',
          ],
          description: 'Micro-interaction type to apply',
        },
        targetElement: {
          type: 'string',
          description: 'Element to add interaction to',
        },
        trigger: {
          type: 'string',
          enum: ['hover', 'click', 'focus', 'scroll'],
          description: 'What triggers the interaction',
        },
      },
      required: ['interactionId', 'targetElement'],
    },
  },
  {
    name: 'apply_custom_css',
    description:
      'Apply arbitrary custom CSS to any element. Use this when the user wants precise pixel-level control, custom styles not covered by presets, or any CSS property/value combination. This tool removes all preset limitations and allows expert-level design control.',
    input_schema: {
      type: 'object' as const,
      properties: {
        targetElement: {
          type: 'string',
          description:
            'CSS selector or element name to apply styles to (e.g., ".hero-section", "header", ".card:hover")',
        },
        css: {
          type: 'string',
          description:
            'Raw CSS properties to apply (e.g., "padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);")',
        },
        cssVariables: {
          type: 'object',
          description:
            'Optional CSS custom properties/variables to define (e.g., {"--primary-color": "#6366f1", "--spacing-unit": "8px"})',
        },
        pseudoSelectors: {
          type: 'object',
          description:
            'Optional CSS for pseudo-selectors like :hover, :focus, :active, ::before, ::after (e.g., {":hover": "transform: scale(1.05);", "::after": "content: \\"\\"; position: absolute;"})',
        },
        mediaQueries: {
          type: 'object',
          description:
            'Optional responsive CSS for different breakpoints (e.g., {"@media (max-width: 768px)": "padding: 12px; font-size: 14px;"})',
        },
        keyframes: {
          type: 'string',
          description:
            'Optional @keyframes animation definition (e.g., "@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }")',
        },
      },
      required: ['targetElement', 'css'],
    },
  },
  // ============================================================================
  // PHASE 4: EXTERNAL API INTEGRATION TOOLS
  // ============================================================================
  {
    name: 'generate_color_palette',
    description:
      'Generate a harmonious color palette using AI (Colormind). Use when the user wants color suggestions, a cohesive color scheme, or asks for palette recommendations. Can generate from scratch or from a seed color. Returns 5 colors with role assignments (primary, secondary, accent, background, surface) plus CSS variables and Tailwind config.',
    input_schema: {
      type: 'object' as const,
      properties: {
        seedColor: {
          type: 'string',
          description: 'Optional starting hex color to build palette around (e.g., "#6366F1")',
        },
        model: {
          type: 'string',
          enum: ['default', 'ui'],
          description:
            'Generation model: "default" for general palettes, "ui" for interface-focused colors',
        },
        generateVariations: {
          type: 'boolean',
          description: 'Generate light, dark, and muted variations of the palette',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_icons',
    description:
      'Search for icons across multiple icon libraries (150K+ icons). Use when the user needs icons for buttons, navigation, features, or any UI element. Returns SVG icons from popular sets like Heroicons, Lucide, Material Design, Tabler, and Phosphor.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "shopping cart", "settings", "user", "arrow")',
        },
        iconSets: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific icon sets to search: heroicons, lucide, mdi, tabler, ph, carbon, fa6-solid, fa6-regular',
        },
        style: {
          type: 'string',
          enum: ['outline', 'solid', 'all'],
          description: 'Icon style preference',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_icon',
    description:
      'Get a specific icon by ID with customization options. Returns the SVG markup, React component code, and CSS usage examples.',
    input_schema: {
      type: 'object' as const,
      properties: {
        iconId: {
          type: 'string',
          description:
            'Full icon ID in format "prefix:name" (e.g., "heroicons:shopping-cart", "lucide:settings")',
        },
        size: {
          type: 'number',
          description: 'Icon size in pixels (default: 24)',
        },
        color: {
          type: 'string',
          description: 'Icon color as hex (e.g., "#6366F1") or CSS color name',
        },
      },
      required: ['iconId'],
    },
  },
  {
    name: 'search_lottie_animations',
    description:
      'Search for Lottie animations for loading states, success/error feedback, transitions, and UI illustrations. Use when the user wants animated assets, loading spinners, success checkmarks, or decorative animations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "loading", "success", "error", "confetti", "toggle")',
        },
        category: {
          type: 'string',
          enum: [
            'loading',
            'success',
            'error',
            'warning',
            'ui',
            'icons',
            'illustrations',
            'transitions',
          ],
          description: 'Animation category to filter by',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'identify_font',
    description:
      'Identify fonts or get Google Fonts alternatives for a known font name. Use when the user asks about fonts, wants font suggestions, or needs Google Fonts equivalents for commercial fonts like Helvetica, Gotham, or Proxima Nova.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fontName: {
          type: 'string',
          description:
            'Font name to find alternatives for (e.g., "Helvetica", "Gotham", "Proxima Nova")',
        },
        imageBase64: {
          type: 'string',
          description: 'Optional base64 image data for font identification from a screenshot',
        },
        includePairings: {
          type: 'boolean',
          description: 'Include font pairing suggestions',
        },
      },
      required: [],
    },
  },
  {
    name: 'audit_accessibility',
    description:
      'Run a WCAG accessibility audit on HTML content. Use when the user wants to check accessibility, ensure compliance, or find issues with their design. Returns violations with impact levels and fix suggestions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        html: {
          type: 'string',
          description: 'HTML content to audit',
        },
        wcagLevel: {
          type: 'string',
          enum: ['A', 'AA', 'AAA'],
          description: 'WCAG compliance level to check (default: AA)',
        },
        includeImpact: {
          type: 'array',
          items: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
          description: 'Impact levels to include in results',
        },
      },
      required: ['html'],
    },
  },
  {
    name: 'check_color_contrast',
    description:
      'Check the color contrast ratio between foreground and background colors for WCAG compliance. Use when verifying text readability or color accessibility.',
    input_schema: {
      type: 'object' as const,
      properties: {
        foreground: {
          type: 'string',
          description: 'Foreground (text) color as hex (e.g., "#333333")',
        },
        background: {
          type: 'string',
          description: 'Background color as hex (e.g., "#FFFFFF")',
        },
      },
      required: ['foreground', 'background'],
    },
  },
  {
    name: 'generate_ui_component',
    description:
      'Generate a production-ready React + Tailwind component from a natural language description. Use when the user wants a complex UI component like a pricing table, data table, user card, or form. Returns TypeScript React code with proper types.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description:
            'Description of the component to generate (e.g., "A pricing table with 3 tiers", "A user profile card with avatar and stats")',
        },
        framework: {
          type: 'string',
          enum: ['react', 'nextjs'],
          description: 'Target framework (default: react)',
        },
        styling: {
          type: 'string',
          enum: ['tailwind', 'css-modules', 'styled-components'],
          description: 'Styling approach (default: tailwind)',
        },
        includeTypes: {
          type: 'boolean',
          description: 'Include TypeScript types (default: true)',
        },
        darkMode: {
          type: 'boolean',
          description: 'Include dark mode support',
        },
        responsive: {
          type: 'boolean',
          description: 'Include responsive design (default: true)',
        },
      },
      required: ['prompt'],
    },
  },
  // ============================================================================
  // PHASE 5: AI ENHANCEMENT TOOLS
  // ============================================================================
  {
    name: 'analyze_design_proactively',
    description:
      'Automatically analyze current design for issues and opportunities. Use this when the user asks for design feedback, quality check, or when auto_analyze is enabled after screenshot capture. Returns a design score, issue detection, and improvement suggestions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        analysisDepth: {
          type: 'string',
          enum: ['quick', 'standard', 'thorough'],
          description:
            'How deep to analyze (quick=contrast+spacing, standard=+hierarchy+consistency, thorough=+accessibility+patterns)',
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific areas to focus on: contrast, spacing, hierarchy, consistency, accessibility, color, typography',
        },
      },
      required: [],
    },
  },
  {
    name: 'critique_design',
    description:
      'Provide honest, constructive criticism of the current design with severity-ranked issues and specific fixes. Use this when the user asks for a "critique", "roast", "honest feedback", or "what\'s wrong" with their design. Returns a detailed analysis with scores per design principle.',
    input_schema: {
      type: 'object' as const,
      properties: {
        focusAreas: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'visualHierarchy',
              'consistency',
              'contrast',
              'whitespace',
              'colorHarmony',
              'alignment',
              'typography',
              'accessibility',
            ],
          },
          description: 'Specific design principles to focus the critique on',
        },
        severityThreshold: {
          type: 'string',
          enum: ['all', 'major', 'critical'],
          description: 'Minimum severity to report (default: all)',
        },
        includeStrengths: {
          type: 'boolean',
          description: 'Include positive aspects of the design (default: true)',
        },
      },
      required: [],
    },
  },
  {
    name: 'generate_design_variants',
    description:
      'Generate multiple design variations for A/B comparison. Use this when the user asks for "variations", "alternatives", "other options", or "different versions" of their design. Returns 2-5 variants with trade-offs and use cases.',
    input_schema: {
      type: 'object' as const,
      properties: {
        targetElement: {
          type: 'string',
          description:
            'Element to generate variants for (hero, header, global, etc.) or "global" for overall design variations',
        },
        variantCount: {
          type: 'number',
          minimum: 2,
          maximum: 5,
          description: 'Number of variants to generate (default: 3)',
        },
        variationStyle: {
          type: 'string',
          enum: ['subtle', 'moderate', 'dramatic'],
          description: 'How different variants should be from the current design',
        },
        preserveProperties: {
          type: 'array',
          items: { type: 'string' },
          description: 'Properties to keep unchanged across variants (e.g., "colors.primary")',
        },
      },
      required: [],
    },
  },
  {
    name: 'start_design_workflow',
    description:
      'Start a guided multi-step design workflow. Use when the user says "guide me through", "step by step", "design workflow", or "walk me through" designing something. Tracks progress and provides contextual guidance at each step.',
    input_schema: {
      type: 'object' as const,
      properties: {
        workflowType: {
          type: 'string',
          enum: ['landing-page', 'dashboard', 'e-commerce', 'portfolio', 'blog', 'saas-app'],
          description: 'Type of design workflow to start',
        },
      },
      required: ['workflowType'],
    },
  },
  {
    name: 'advance_workflow',
    description:
      'Move to the next step in the current design workflow, mark the current step as complete, skip a step, or go back. Use this to navigate through an active workflow.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['next', 'previous', 'skip', 'complete-step', 'abandon'],
          description: 'Workflow navigation action',
        },
        stepNotes: {
          type: 'string',
          description: 'Optional notes about the current step completion',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'get_workflow_status',
    description:
      'Get the current workflow progress, next recommended actions, and what has been completed. Use to check progress or remind the user where they are.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  // Design System Generation tool
  {
    name: 'generate_design_system',
    description:
      'Extract all design decisions into a formal design system with tokens, documentation, and export formats. Use when users say "generate design system", "export tokens", "create style guide", or want to export their design for developers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        outputFormats: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'style-dictionary',
              'figma-tokens',
              'tailwind-config',
              'css-variables',
              'scss-variables',
              'json',
            ],
          },
          description:
            'Export formats to generate. Available: style-dictionary, figma-tokens, tailwind-config, css-variables, scss-variables, json',
        },
        includeDocumentation: {
          type: 'boolean',
          description: 'Generate usage documentation with guidelines (default: true)',
        },
        namespace: {
          type: 'string',
          description: 'Token namespace prefix (e.g., "app", "brand"). Used in variable names.',
        },
      },
      required: [],
    },
  },
  // Competitive Website Analysis tool
  {
    name: 'analyze_competitor_website',
    description:
      'Capture and analyze a competitor website design, extracting colors, typography, spacing, and patterns. Use when users say "analyze [url]", "competitor analysis", "what does [site] do", or want to compare designs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'URL of the website to analyze (e.g., "stripe.com", "https://linear.app")',
        },
        compareWithCurrent: {
          type: 'boolean',
          description: 'Compare findings with current design (default: true)',
        },
        extractionDepth: {
          type: 'string',
          enum: ['colors-only', 'visual-basics', 'full-analysis'],
          description:
            'How much detail to extract. colors-only is fastest, full-analysis is most comprehensive.',
        },
      },
      required: ['url'],
    },
  },
];

// ============================================================================
// TOOL EXECUTION HANDLERS
// ============================================================================

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  cost?: number;
  remaining?: number;
}

/**
 * Execute the generate_background tool
 */
async function executeGenerateBackground(input: {
  prompt: string;
  targetElement: string;
  style?: string;
  quality?: 'standard' | 'hd';
}): Promise<ToolResult> {
  const dalleService = getDalleService();

  if (!dalleService.checkAvailability()) {
    return {
      success: false,
      error: 'DALL-E service not available. OPENAI_API_KEY not configured.',
    };
  }

  try {
    // Map old quality types to new GPT Image 1.5 types
    const quality = input.quality === 'hd' ? 'high' : 'medium';
    const size = '1024x1024';
    const cost = getImageCost(quality, size);

    // Build enhanced prompt for background generation
    const enhancedPrompt = `Create a web application background image. ${input.prompt}

Style: ${input.style || 'abstract'}
Requirements:
- Suitable as a website background for ${input.targetElement}
- Must not be distracting, allowing content to remain readable
- Professional, modern aesthetic
- No text or logos`;

    const result = await dalleService.generateImage({
      prompt: enhancedPrompt,
      size,
      quality,
    });

    return {
      success: true,
      data: {
        imageUrl: result.url,
        revisedPrompt: result.revisedPrompt,
        targetElement: input.targetElement,
        size,
        quality,
      },
      cost,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate background image',
    };
  }
}

/**
 * Execute the apply_animation tool
 */
function executeApplyAnimation(input: {
  animationType: string;
  targetElement: string;
  presetId?: string;
  duration?: string;
  easing?: string;
  delay?: string;
  iterations?: string;
}): ToolResult {
  // If preset ID provided, use the preset
  let animation: Partial<DetectedAnimation> = {};

  if (input.presetId) {
    const preset = getAnimationPreset(input.presetId);
    if (preset) {
      animation = {
        id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: input.animationType as DetectedAnimation['type'],
        element: `Animation for ${input.targetElement}`,
        targetElement: input.targetElement,
        property: 'transform',
        fromValue: '0',
        toValue: '1',
        duration: input.duration || `${preset.duration}ms`,
        easing: input.easing || preset.easing,
        delay: input.delay,
        iterations:
          input.iterations === 'infinite' ? 'infinite' : parseInt(input.iterations || '1'),
        cssKeyframes: preset.css.keyframes,
        cssAnimation: preset.css.animation,
        tailwindConfig: preset.tailwind,
        framerMotionVariants: preset.framerMotion,
        confidence: 1,
        matchedPreset: preset.id,
        presetConfidence: 1,
      };
    }
  }

  // If no preset or preset not found, create custom animation
  if (!animation.id) {
    animation = {
      id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: input.animationType as DetectedAnimation['type'],
      element: `Custom animation for ${input.targetElement}`,
      targetElement: input.targetElement,
      property: getPropertyForAnimationType(input.animationType),
      fromValue: '0',
      toValue: '1',
      duration: input.duration || '0.3s',
      easing: input.easing || 'ease-out',
      delay: input.delay,
      iterations: input.iterations === 'infinite' ? 'infinite' : parseInt(input.iterations || '1'),
      confidence: 0.9,
    };
  }

  return {
    success: true,
    data: {
      animation,
      targetElement: input.targetElement,
      message: `Applied ${input.animationType} animation to ${input.targetElement}`,
    },
  };
}

/**
 * Get the CSS property for an animation type
 */
function getPropertyForAnimationType(type: string): string {
  const propertyMap: Record<string, string> = {
    fade: 'opacity',
    slide: 'transform',
    scale: 'transform',
    rotate: 'transform',
    'color-change': 'background-color',
    blur: 'filter',
    parallax: 'transform',
    'hover-effect': 'transform',
    'scroll-reveal': 'opacity, transform',
    'page-transition': 'opacity, transform',
    loading: 'transform',
    'micro-interaction': 'transform',
    'gradient-shift': 'background-position',
    'particle-flow': 'transform',
    wave: 'transform',
    morph: 'border-radius',
    aurora: 'opacity, transform',
    'noise-texture': 'transform',
  };
  return propertyMap[type] || 'transform';
}

/**
 * Execute the list_elements tool
 */
function executeListElements(currentDesign: Partial<LayoutDesign>, category?: string): ToolResult {
  // Build list of available elements based on current design
  const elements: Array<{ selector: string; name: string; category: string }> = [];

  // Add structure elements
  if (currentDesign.structure?.hasHeader || currentDesign.components?.header?.visible) {
    elements.push({ selector: 'header', name: 'Header', category: 'sections' });
    elements.push({ selector: '.nav-item', name: 'Navigation Items', category: 'interactive' });
  }

  if (currentDesign.components?.hero?.visible) {
    elements.push({ selector: '.hero-section', name: 'Hero Section', category: 'sections' });
    elements.push({ selector: '.hero-title', name: 'Hero Title', category: 'components' });
    elements.push({ selector: '.hero-subtitle', name: 'Hero Subtitle', category: 'components' });
    if (currentDesign.components.hero.hasCTA) {
      elements.push({ selector: '.hero-cta', name: 'Hero CTA Button', category: 'interactive' });
    }
  }

  if (currentDesign.structure?.hasSidebar || currentDesign.components?.sidebar?.visible) {
    elements.push({ selector: '.sidebar', name: 'Sidebar', category: 'sections' });
  }

  // Add card elements if cards are configured
  if (currentDesign.components?.cards) {
    elements.push({ selector: '.card', name: 'Card Component', category: 'components' });
    elements.push({ selector: '.card-grid', name: 'Card Grid', category: 'sections' });
  }

  if (currentDesign.structure?.hasFooter || currentDesign.components?.footer?.visible) {
    elements.push({ selector: 'footer', name: 'Footer', category: 'sections' });
  }

  // Always include common elements
  elements.push({ selector: 'body', name: 'Page Background', category: 'sections' });
  elements.push({ selector: '.main-content', name: 'Main Content Area', category: 'sections' });
  elements.push({ selector: '.button', name: 'Buttons', category: 'interactive' });
  elements.push({ selector: '.section', name: 'Content Sections', category: 'sections' });

  // Filter by category if specified
  const filteredElements =
    category && category !== 'all' ? elements.filter((el) => el.category === category) : elements;

  return {
    success: true,
    data: {
      elements: filteredElements,
      totalCount: filteredElements.length,
      availablePresets: ANIMATION_PRESETS.slice(0, 10).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
      })),
    },
  };
}

/**
 * Execute the apply_effect tool
 */
function executeApplyEffect(input: {
  effectType: string;
  targetElement: string;
  presetId?: string;
  customConfig?: Record<string, unknown>;
}): ToolResult {
  const { effectType, targetElement, presetId, customConfig } = input;

  // Try to find a preset
  let preset: AdvancedEffectPreset | undefined;
  if (presetId) {
    preset = getAdvancedEffectPreset(presetId);
  } else {
    // Find a default preset for the effect type
    preset = ADVANCED_EFFECT_PRESETS.find((p) => p.type === effectType);
  }

  if (!preset) {
    return {
      success: false,
      error: `No preset found for effect type "${effectType}"${presetId ? ` with id "${presetId}"` : ''}. Available presets: ${ADVANCED_EFFECT_PRESETS.filter(
        (p) => p.type === effectType
      )
        .map((p) => p.id)
        .join(', ')}`,
    };
  }

  return {
    success: true,
    data: {
      effect: {
        id: preset.id,
        name: preset.name,
        type: preset.type,
        targetElement,
        css: preset.css,
        tailwind: preset.tailwind,
        config: customConfig ? { ...preset.config, ...customConfig } : preset.config,
      },
      message: `Applied ${preset.name} effect to ${targetElement}`,
      availablePresets: ADVANCED_EFFECT_PRESETS.filter((p) => p.type === effectType).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
    },
  };
}

/**
 * Execute the apply_component_state tool
 */
function executeApplyComponentState(input: {
  state: string;
  targetElement: string;
  presetId?: string;
}): ToolResult {
  const { state, targetElement, presetId } = input;

  // Try to find a preset
  let preset: ComponentStatePreset | undefined;
  if (presetId) {
    preset = getComponentStatePreset(presetId);
  } else {
    // Find a default preset for the state
    preset = COMPONENT_STATE_PRESETS.find((p) => p.state === state);
  }

  if (!preset) {
    return {
      success: false,
      error: `No preset found for state "${state}"${presetId ? ` with id "${presetId}"` : ''}. Available presets: ${COMPONENT_STATE_PRESETS.filter(
        (p) => p.state === state
      )
        .map((p) => p.id)
        .join(', ')}`,
    };
  }

  const appliedState: AppliedComponentState = {
    state: preset.state,
    presetId: preset.id,
    targetElement,
    css: `${preset.css.base} ${preset.css.transition}`.trim(),
    tailwind: preset.tailwind,
  };

  return {
    success: true,
    data: {
      componentState: appliedState,
      preset: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        css: preset.css,
        tailwind: preset.tailwind,
        framerMotion: preset.framerMotion,
      },
      message: `Applied ${preset.name} to ${targetElement}`,
      availablePresets: COMPONENT_STATE_PRESETS.filter((p) => p.state === state).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      })),
    },
  };
}

/**
 * Execute the apply_micro_interaction tool
 */
function executeApplyMicroInteraction(input: {
  interactionId: string;
  targetElement: string;
  trigger?: string;
}): ToolResult {
  const { interactionId, targetElement, trigger } = input;

  const preset = getMicroInteractionPreset(interactionId);

  if (!preset) {
    return {
      success: false,
      error: `No micro-interaction found with id "${interactionId}". Available interactions: ${MICRO_INTERACTION_PRESETS.map((p) => p.id).join(', ')}`,
    };
  }

  const appliedInteraction: AppliedMicroInteraction = {
    interactionId: preset.id,
    targetElement,
    trigger: (trigger as AppliedMicroInteraction['trigger']) || preset.trigger,
    css: `${preset.css.keyframes}\n${preset.css.base || ''}\n${preset.css.animation}`.trim(),
    tailwind: preset.tailwind,
  };

  return {
    success: true,
    data: {
      microInteraction: appliedInteraction,
      preset: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        trigger: preset.trigger,
        css: preset.css,
        tailwind: preset.tailwind,
        framerMotion: preset.framerMotion,
        requiresJS: preset.requiresJS,
      },
      message: `Applied ${preset.name} to ${targetElement}`,
      note: preset.requiresJS
        ? 'This interaction requires JavaScript for full functionality (e.g., mouse tracking).'
        : undefined,
    },
  };
}

/**
 * Custom CSS application result type
 */
interface AppliedCustomCSS {
  id: string;
  targetElement: string;
  css: string;
  cssVariables?: Record<string, string>;
  pseudoSelectors?: Record<string, string>;
  mediaQueries?: Record<string, string>;
  keyframes?: string;
  generatedStyleBlock: string;
}

/**
 * Execute the apply_custom_css tool
 * Allows arbitrary CSS injection for expert-level design control
 */
function executeApplyCustomCSS(input: {
  targetElement: string;
  css: string;
  cssVariables?: Record<string, string>;
  pseudoSelectors?: Record<string, string>;
  mediaQueries?: Record<string, string>;
  keyframes?: string;
}): ToolResult {
  const { targetElement, css, cssVariables, pseudoSelectors, mediaQueries, keyframes } = input;

  // Validate target element isn't empty
  if (!targetElement.trim()) {
    return {
      success: false,
      error: 'Target element selector cannot be empty',
    };
  }

  // Validate CSS isn't empty
  if (!css.trim()) {
    return {
      success: false,
      error: 'CSS properties cannot be empty',
    };
  }

  // Build the complete style block
  let generatedStyleBlock = '';

  // Add CSS variables if provided (at :root level)
  if (cssVariables && Object.keys(cssVariables).length > 0) {
    const varsCSS = Object.entries(cssVariables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');
    generatedStyleBlock += `:root {\n${varsCSS}\n}\n\n`;
  }

  // Add keyframes if provided
  if (keyframes) {
    generatedStyleBlock += `${keyframes}\n\n`;
  }

  // Add main element styles
  generatedStyleBlock += `${targetElement} {\n  ${css
    .split(';')
    .filter((s) => s.trim())
    .map((s) => s.trim())
    .join(';\n  ')};\n}\n`;

  // Add pseudo-selector styles
  if (pseudoSelectors && Object.keys(pseudoSelectors).length > 0) {
    for (const [pseudo, styles] of Object.entries(pseudoSelectors)) {
      const selector = pseudo.startsWith(':')
        ? `${targetElement}${pseudo}`
        : `${targetElement}:${pseudo}`;
      generatedStyleBlock += `\n${selector} {\n  ${styles
        .split(';')
        .filter((s) => s.trim())
        .map((s) => s.trim())
        .join(';\n  ')};\n}\n`;
    }
  }

  // Add media query styles
  if (mediaQueries && Object.keys(mediaQueries).length > 0) {
    for (const [query, styles] of Object.entries(mediaQueries)) {
      const mediaQuery = query.startsWith('@media') ? query : `@media ${query}`;
      generatedStyleBlock += `\n${mediaQuery} {\n  ${targetElement} {\n    ${styles
        .split(';')
        .filter((s) => s.trim())
        .map((s) => s.trim())
        .join(';\n    ')};\n  }\n}\n`;
    }
  }

  const appliedCSS: AppliedCustomCSS = {
    id: `custom_css_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    targetElement,
    css,
    cssVariables,
    pseudoSelectors,
    mediaQueries,
    keyframes,
    generatedStyleBlock: generatedStyleBlock.trim(),
  };

  return {
    success: true,
    data: {
      customCSS: appliedCSS,
      message: `Applied custom CSS to ${targetElement}`,
      styleBlock: generatedStyleBlock.trim(),
      properties: {
        baseStyles: css,
        hasVariables: !!(cssVariables && Object.keys(cssVariables).length > 0),
        hasPseudoSelectors: !!(pseudoSelectors && Object.keys(pseudoSelectors).length > 0),
        hasMediaQueries: !!(mediaQueries && Object.keys(mediaQueries).length > 0),
        hasKeyframes: !!keyframes,
      },
    },
  };
}

// ============================================================================
// PHASE 4: EXTERNAL API TOOL EXECUTORS
// ============================================================================

/**
 * Execute the generate_color_palette tool (Colormind API)
 */
async function executeGenerateColorPalette(input: {
  seedColor?: string;
  model?: string;
  generateVariations?: boolean;
}): Promise<ToolResult> {
  try {
    const { seedColor, model = 'default', generateVariations: includeVariations = false } = input;

    // Generate the main palette
    const palette = await generateColorPalette({
      seedColor,
      model: model as ColormindModel,
    });

    // Generate variations if requested (uses the primary color as seed)
    let variations: GeneratedPalette[] | undefined;
    if (includeVariations && palette.roles.primary) {
      variations = await generatePaletteVariations(palette.roles.primary, 3);
    }

    return {
      success: true,
      data: {
        palette: {
          colors: palette.colors,
          roles: palette.roles,
          css: palette.css,
        },
        variations:
          variations && variations.length > 0
            ? variations.map((v, i) => ({
                name: ['Variation 1', 'Variation 2', 'Variation 3'][i],
                colors: v.colors,
                roles: v.roles,
              }))
            : undefined,
        message: `Generated ${includeVariations && variations ? `${1 + variations.length} palettes (main + variations)` : 'a harmonious color palette'} ${seedColor ? `based on ${seedColor}` : 'from scratch'}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate color palette',
    };
  }
}

/**
 * Execute the search_icons tool (Iconify API)
 */
async function executeSearchIcons(input: {
  query: string;
  iconSets?: string[];
  style?: string;
  limit?: number;
}): Promise<ToolResult> {
  try {
    const { query, iconSets, style = 'all', limit = 10 } = input;

    const results = await searchIcons({
      query,
      iconSets: iconSets as Parameters<typeof searchIcons>[0]['iconSets'],
      style: style as 'outline' | 'solid' | 'all',
      limit,
    });

    return {
      success: true,
      data: {
        icons: results.map((icon) => ({
          id: icon.fullId,
          name: icon.name,
          prefix: icon.prefix,
          title: icon.title,
        })),
        totalResults: results.length,
        message: `Found ${results.length} icons matching "${query}"`,
        suggestion:
          results.length > 0
            ? `Use get_icon with iconId "${results[0].fullId}" to get the SVG and usage code`
            : 'Try a different search query',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search icons',
    };
  }
}

/**
 * Execute the get_icon tool (Iconify API)
 */
async function executeGetIcon(input: {
  iconId: string;
  size?: number;
  color?: string;
}): Promise<ToolResult> {
  try {
    const { iconId, size = 24, color } = input;

    const icon = await getIcon(iconId, { size, color });

    if (!icon) {
      return {
        success: false,
        error: `Icon "${iconId}" not found. Make sure the format is "prefix:name" (e.g., "heroicons:home")`,
      };
    }

    return {
      success: true,
      data: {
        id: icon.id,
        svg: icon.svg,
        svgDataUri: icon.svgDataUri,
        react: icon.react,
        css: icon.css,
        size: icon.size,
        message: `Retrieved icon "${iconId}" (${size}x${size}px)`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get icon',
    };
  }
}

/**
 * Execute the search_lottie_animations tool (LottieFiles)
 */
async function executeSearchLottieAnimations(input: {
  query: string;
  category?: string;
  limit?: number;
}): Promise<ToolResult> {
  try {
    const { query, category, limit = 5 } = input;

    const results = await searchLottieAnimations({
      query,
      category: category as Parameters<typeof searchLottieAnimations>[0]['category'],
      limit,
    });

    return {
      success: true,
      data: {
        animations: results.animations.map((anim) => ({
          id: anim.id,
          name: anim.name,
          lottieUrl: anim.lottieUrl,
          previewUrl: anim.previewUrl,
          tags: anim.tags,
          duration: anim.duration,
        })),
        totalResults: results.total,
        hasMore: results.hasMore,
        message: `Found ${results.animations.length} Lottie animations for "${query}"`,
        categories: getLottieCategories().map((c) => c.id),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search Lottie animations',
    };
  }
}

/**
 * Execute the identify_font tool (WhatTheFont / Google Fonts)
 */
async function executeIdentifyFont(input: {
  fontName?: string;
  imageBase64?: string;
  includePairings?: boolean;
}): Promise<ToolResult> {
  try {
    const { fontName, imageBase64, includePairings = false } = input;

    if (!fontName && !imageBase64) {
      return {
        success: false,
        error: 'Either fontName or imageBase64 must be provided',
      };
    }

    let alternatives: FontMatch[] = [];
    let identificationResult: FontIdentificationResult | null = null;
    let pairings: Array<{ heading: string; body: string; reason: string }> = [];

    if (fontName) {
      // Get Google Fonts alternatives for a known font
      alternatives = getGoogleFontsAlternatives(fontName);

      if (includePairings && alternatives.length > 0) {
        pairings = getFontPairings(alternatives[0].name);
      }
    }

    if (imageBase64) {
      // Identify font from image
      identificationResult = await identifyFontFromImage(imageBase64);
    }

    return {
      success: true,
      data: {
        alternatives:
          alternatives.length > 0
            ? alternatives.map((alt) => ({
                name: alt.name,
                family: alt.family,
                confidence: alt.confidence,
                googleFontsUrl: alt.googleFontsUrl,
              }))
            : undefined,
        identification: identificationResult,
        pairings: pairings.length > 0 ? pairings : undefined,
        css: alternatives.length > 0 ? generateFontCSS(alternatives[0].name) : undefined,
        message: fontName
          ? `Found ${alternatives.length} Google Fonts alternatives for "${fontName}"`
          : 'Font identification requires WhatTheFont API access',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to identify font',
    };
  }
}

/**
 * Execute the audit_accessibility tool (axe-core)
 */
async function executeAuditAccessibility(input: {
  html: string;
  wcagLevel?: string;
  includeImpact?: string[];
}): Promise<ToolResult> {
  try {
    const { html, wcagLevel = 'AA', includeImpact } = input;

    const result = await auditAccessibility({
      html,
      wcagLevel: wcagLevel as 'A' | 'AA' | 'AAA',
      includeImpact: includeImpact as ('critical' | 'serious' | 'moderate' | 'minor')[] | undefined,
    });

    return {
      success: true,
      data: {
        score: result.score,
        summary: result.summary,
        violations: result.violations.map((v) => ({
          id: v.id,
          description: v.description,
          impact: v.impact,
          wcagCriteria: v.wcagCriteria,
          help: v.help,
          helpUrl: v.helpUrl,
          nodeCount: v.nodes.length,
          fixes: v.nodes.slice(0, 3).map((n) => n.fix), // Show first 3 fixes
        })),
        passes: result.passes,
        recommendations: result.recommendations,
        message:
          result.violations.length === 0
            ? `Accessibility audit passed! Score: ${result.score}/100`
            : `Found ${result.violations.length} accessibility issues. Score: ${result.score}/100`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run accessibility audit',
    };
  }
}

/**
 * Execute the check_color_contrast tool
 */
function executeCheckColorContrast(input: { foreground: string; background: string }): ToolResult {
  try {
    const { foreground, background } = input;

    const result = checkColorContrast(foreground, background);

    return {
      success: true,
      data: {
        ratio: result.ratio,
        passAA: result.passAA,
        passAAA: result.passAAA,
        passLargeAA: result.passLargeAA,
        message: `Contrast ratio: ${result.ratio}:1 - ${result.passAA ? '✓ Passes WCAG AA' : '✗ Fails WCAG AA'} (normal text), ${result.passLargeAA ? '✓ Passes' : '✗ Fails'} (large text)`,
        requirements: {
          'WCAG AA (normal text)': '4.5:1 minimum',
          'WCAG AA (large text)': '3:1 minimum',
          'WCAG AAA (normal text)': '7:1 minimum',
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check color contrast',
    };
  }
}

/**
 * Execute the generate_ui_component tool (v0.dev style)
 */
async function executeGenerateUIComponent(input: {
  prompt: string;
  framework?: string;
  styling?: string;
  includeTypes?: boolean;
  darkMode?: boolean;
  responsive?: boolean;
}): Promise<ToolResult> {
  try {
    const {
      prompt,
      framework = 'react',
      styling = 'tailwind',
      includeTypes = true,
      darkMode = false,
      responsive = true,
    } = input;

    const result = await generateComponent({
      prompt,
      framework: framework as 'react' | 'nextjs',
      styling: styling as 'tailwind' | 'css-modules' | 'styled-components',
      includeTypes,
      darkMode,
      responsive,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to generate component',
      };
    }

    return {
      success: true,
      data: {
        component: result.component
          ? {
              name: result.component.name,
              code: result.component.code,
              dependencies: result.component.dependencies,
              files: result.component.files,
            }
          : undefined,
        usage: result.usage,
        availableTemplates: getAvailableTemplates(),
        message: result.component
          ? `Generated "${result.component.name}" component with ${result.component.dependencies.length} dependencies`
          : 'Component generation requires v0.dev API access',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate UI component',
    };
  }
}

// ============================================================================
// PHASE 5: AI ENHANCEMENT TOOL HANDLERS
// ============================================================================

/**
 * Execute the analyze_design_proactively tool
 * Performs automatic design analysis for issues and opportunities
 */
function executeAnalyzeDesignProactively(
  currentDesign: Partial<LayoutDesign>,
  input: {
    analysisDepth?: string;
    focusAreas?: string[];
  }
): ToolResult {
  try {
    const depth = (input.analysisDepth || 'standard') as AnalysisDepth;
    const focusAreas = input.focusAreas as DesignAnalysisArea[] | undefined;

    const analysis = analyzeDesign(currentDesign, depth, focusAreas);

    // Build summary message
    const criticalCount = analysis.autoDetectedIssues.filter(
      (i) => i.severity === 'critical'
    ).length;
    const warningCount = analysis.autoDetectedIssues.filter((i) => i.severity === 'warning').length;
    const infoCount = analysis.autoDetectedIssues.filter((i) => i.severity === 'info').length;

    let gradeEmoji = '🎉';
    if (analysis.designScore < 60) gradeEmoji = '⚠️';
    else if (analysis.designScore < 80) gradeEmoji = '👍';

    const message = `${gradeEmoji} Design Score: ${analysis.designScore}/100 (Grade: ${analysis.grade || getGradeFromScore(analysis.designScore)})

Issues Found: ${criticalCount} critical, ${warningCount} warnings, ${infoCount} info
Top Areas for Improvement: ${Object.entries(analysis.scoreBreakdown)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([area, score]) => `${area} (${score}/100)`)
      .join(', ')}`;

    return {
      success: true,
      data: {
        score: analysis.designScore,
        grade: analysis.grade || getGradeFromScore(analysis.designScore),
        scoreBreakdown: analysis.scoreBreakdown,
        issues: analysis.autoDetectedIssues,
        opportunities: analysis.opportunities,
        message,
        analysisDepth: depth,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze design',
    };
  }
}

/**
 * Get letter grade from numeric score
 */
function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Execute the critique_design tool
 * Provides detailed design critique with scores per principle
 */
function executeCritiqueDesign(
  currentDesign: Partial<LayoutDesign>,
  input: {
    focusAreas?: string[];
    severityThreshold?: string;
    includeStrengths?: boolean;
  }
): ToolResult {
  try {
    const critique = critiqueDesign(currentDesign, {
      focusAreas: input.focusAreas as CritiquePrinciple[] | undefined,
      severityThreshold: (input.severityThreshold as 'all' | 'major' | 'critical') || 'all',
      includeStrengths: input.includeStrengths ?? true,
    });

    // Build formatted message
    const criticalCount = critique.priorityFixes.filter((f) => f.severity === 'critical').length;
    const majorCount = critique.priorityFixes.filter((f) => f.severity === 'major').length;
    const minorCount = critique.priorityFixes.filter((f) => f.severity === 'minor').length;

    let gradeEmoji = '🎉';
    if (critique.overallScore < 60) gradeEmoji = '😬';
    else if (critique.overallScore < 70) gradeEmoji = '🤔';
    else if (critique.overallScore < 80) gradeEmoji = '👍';

    // Format report for AI to use
    const report = formatCritiqueReport(critique);

    const message = `${gradeEmoji} Design Critique: ${critique.overallScore}/100 (Grade: ${critique.grade})

Issues: ${criticalCount} critical, ${majorCount} major, ${minorCount} minor
Strengths: ${critique.strengths.length} identified

${critique.summary}`;

    return {
      success: true,
      data: {
        score: critique.overallScore,
        grade: critique.grade,
        principleScores: critique.principleScores,
        priorityFixes: critique.priorityFixes,
        strengths: critique.strengths,
        quickFixActions: critique.quickFixActions,
        report,
        message,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to critique design',
    };
  }
}

/**
 * Execute the generate_design_variants tool
 * Generates multiple design variations for A/B comparison
 */
function executeGenerateDesignVariants(
  currentDesign: Partial<LayoutDesign>,
  input: {
    targetElement?: string;
    variantCount?: number;
    variationStyle?: string;
    preserveProperties?: string[];
  }
): ToolResult {
  try {
    const variants = generateDesignVariants(currentDesign, {
      targetElement: input.targetElement || 'global',
      variantCount: input.variantCount || 3,
      variationStyle: (input.variationStyle as VariationStyle) || 'moderate',
      preserveProperties: input.preserveProperties,
    });

    // Build formatted message
    const variantNames = variants.variants.map((v) => v.name).join(', ');

    const message = `Generated ${variants.variants.length} design variants: ${variantNames}

${variants.variants
  .map(
    (v, i) => `**${i + 1}. ${v.name}**
${v.description}
Best for: ${v.bestFor.join(', ')}`
  )
  .join('\n\n')}

${variants.comparisonNotes}`;

    return {
      success: true,
      data: {
        baseDesign: variants.baseDesign,
        variants: variants.variants.map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          changes: v.changes,
          tradeOffs: v.tradeOffs,
          bestFor: v.bestFor,
          previewDescription: v.previewDescription,
        })),
        comparisonNotes: variants.comparisonNotes,
        message,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate design variants',
    };
  }
}

// Workflow state - initialized from request, updated during processing
let currentWorkflowState: WorkflowState | null = null;

/**
 * Initialize workflow state from request
 */
function initializeWorkflowState(requestState?: LayoutWorkflowState): void {
  if (requestState) {
    currentWorkflowState = {
      workflowId: requestState.workflowId,
      workflowType: requestState.workflowType,
      currentStepIndex: requestState.currentStepIndex,
      completedSteps: [...requestState.completedSteps],
      skippedSteps: [...requestState.skippedSteps],
      stepNotes: { ...requestState.stepNotes },
      startedAt: requestState.startedAt,
    };
  } else {
    currentWorkflowState = null;
  }
}

/**
 * Get current workflow state for response
 */
function getWorkflowStateForResponse(): LayoutWorkflowState | undefined {
  if (!currentWorkflowState) return undefined;
  return {
    workflowId: currentWorkflowState.workflowId,
    workflowType: currentWorkflowState.workflowType,
    currentStepIndex: currentWorkflowState.currentStepIndex,
    completedSteps: currentWorkflowState.completedSteps,
    skippedSteps: currentWorkflowState.skippedSteps,
    stepNotes: currentWorkflowState.stepNotes,
    startedAt: currentWorkflowState.startedAt,
  };
}

/**
 * Execute the start_design_workflow tool
 */
function executeStartDesignWorkflow(input: { workflowType: string }): ToolResult {
  try {
    const workflow = getWorkflow(input.workflowType);
    if (!workflow) {
      const available = getAllWorkflows()
        .map((w) => w.id)
        .join(', ');
      return {
        success: false,
        error: `Unknown workflow type: ${input.workflowType}. Available: ${available}`,
      };
    }

    // Create new workflow state
    currentWorkflowState = createWorkflowState(input.workflowType);
    if (!currentWorkflowState) {
      return { success: false, error: 'Failed to create workflow state' };
    }

    const firstStep = workflow.steps[0];

    const message = `**Starting: ${workflow.name}**
${workflow.description}

This workflow has ${workflow.steps.length} steps. Let's begin!

---

**Step 1/${workflow.steps.length}: ${firstStep.name}**
${firstStep.description}

**Suggested Actions:**
${firstStep.suggestedActions.map((a) => `- ${a}`).join('\n')}

**Tips:**
${firstStep.tips.map((t) => `💡 ${t}`).join('\n')}

Let me know when you're ready to work on this step, or say "next" to skip ahead.`;

    return {
      success: true,
      data: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        totalSteps: workflow.steps.length,
        currentStep: {
          index: 0,
          id: firstStep.id,
          name: firstStep.name,
          description: firstStep.description,
          suggestedActions: firstStep.suggestedActions,
          tips: firstStep.tips,
        },
        state: currentWorkflowState,
        message,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start workflow',
    };
  }
}

/**
 * Execute the advance_workflow tool
 */
function executeAdvanceWorkflow(input: { action: string; stepNotes?: string }): ToolResult {
  try {
    if (!currentWorkflowState) {
      return {
        success: false,
        error: 'No active workflow. Use start_design_workflow to begin.',
      };
    }

    const workflow = getWorkflow(currentWorkflowState.workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const currentStep = workflow.steps[currentWorkflowState.currentStepIndex];

    switch (input.action) {
      case 'complete-step':
      case 'next': {
        // Mark current step as complete
        if (currentStep && !currentWorkflowState.completedSteps.includes(currentStep.id)) {
          currentWorkflowState.completedSteps.push(currentStep.id);
        }
        if (input.stepNotes && currentStep) {
          currentWorkflowState.stepNotes[currentStep.id] = input.stepNotes;
        }

        // Move to next step
        currentWorkflowState.currentStepIndex++;

        if (currentWorkflowState.currentStepIndex >= workflow.steps.length) {
          // Workflow complete
          const message = `🎉 **Workflow Complete: ${workflow.name}**

You've completed all ${workflow.steps.length} steps!

**Completed Steps:**
${workflow.steps.map((s, i) => `${i + 1}. ${s.name} ✓`).join('\n')}

Your design is ready! Would you like me to:
- Run a critique to check for any issues
- Generate variants for comparison
- Start a new workflow`;

          return {
            success: true,
            data: {
              workflowComplete: true,
              progress: 100,
              completedSteps: currentWorkflowState.completedSteps,
              message,
            },
          };
        }

        const nextStep = workflow.steps[currentWorkflowState.currentStepIndex];
        const progress = getWorkflowProgress(currentWorkflowState);

        const message = `✓ Step completed! Moving to next step.

---

**Step ${currentWorkflowState.currentStepIndex + 1}/${workflow.steps.length}: ${nextStep.name}** (${progress}% complete)
${nextStep.description}

**Suggested Actions:**
${nextStep.suggestedActions.map((a) => `- ${a}`).join('\n')}

**Tips:**
${nextStep.tips.map((t) => `💡 ${t}`).join('\n')}`;

        return {
          success: true,
          data: {
            progress,
            currentStep: {
              index: currentWorkflowState.currentStepIndex,
              id: nextStep.id,
              name: nextStep.name,
              description: nextStep.description,
              suggestedActions: nextStep.suggestedActions,
              tips: nextStep.tips,
            },
            state: currentWorkflowState,
            message,
          },
        };
      }

      case 'skip': {
        if (currentStep) {
          currentWorkflowState.skippedSteps.push(currentStep.id);
        }
        currentWorkflowState.currentStepIndex++;

        if (currentWorkflowState.currentStepIndex >= workflow.steps.length) {
          return {
            success: true,
            data: {
              workflowComplete: true,
              progress: 100,
              message: '🎉 Workflow complete (with skipped steps).',
            },
          };
        }

        const nextStep = workflow.steps[currentWorkflowState.currentStepIndex];
        return {
          success: true,
          data: {
            skipped: currentStep?.id,
            progress: getWorkflowProgress(currentWorkflowState),
            currentStep: { index: currentWorkflowState.currentStepIndex, ...nextStep },
            message: `Skipped "${currentStep?.name}". Now on: ${nextStep.name}`,
          },
        };
      }

      case 'previous': {
        if (currentWorkflowState.currentStepIndex > 0) {
          currentWorkflowState.currentStepIndex--;
          const prevStep = workflow.steps[currentWorkflowState.currentStepIndex];
          return {
            success: true,
            data: {
              progress: getWorkflowProgress(currentWorkflowState),
              currentStep: { index: currentWorkflowState.currentStepIndex, ...prevStep },
              message: `Going back to: ${prevStep.name}`,
            },
          };
        }
        return { success: false, error: 'Already at the first step' };
      }

      case 'abandon': {
        currentWorkflowState = null;
        return {
          success: true,
          data: {
            abandoned: true,
            message: 'Workflow abandoned. You can start a new one anytime.',
          },
        };
      }

      default:
        return { success: false, error: `Unknown action: ${input.action}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to advance workflow',
    };
  }
}

/**
 * Execute the get_workflow_status tool
 */
function executeGetWorkflowStatus(): ToolResult {
  try {
    if (!currentWorkflowState) {
      const workflows = getAllWorkflows();
      return {
        success: true,
        data: {
          hasActiveWorkflow: false,
          availableWorkflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            steps: w.steps.length,
          })),
          message: `No active workflow. Available workflows:
${workflows.map((w) => `- **${w.name}** (${w.id}): ${w.description}`).join('\n')}

Say "start [workflow-type] workflow" to begin.`,
        },
      };
    }

    const workflow = getWorkflow(currentWorkflowState.workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const currentStep = workflow.steps[currentWorkflowState.currentStepIndex];
    const progress = getWorkflowProgress(currentWorkflowState);
    const status = formatWorkflowStatus(currentWorkflowState);

    const message = `${status}

**Current Step: ${currentStep?.name || 'Complete'}**
${currentStep?.description || ''}

**Progress:**
${workflow.steps
  .map((s, i) => {
    const isComplete = currentWorkflowState!.completedSteps.includes(s.id);
    const isSkipped = currentWorkflowState!.skippedSteps.includes(s.id);
    const isCurrent = i === currentWorkflowState!.currentStepIndex;
    const icon = isComplete ? '✓' : isSkipped ? '⊘' : isCurrent ? '→' : '○';
    return `${icon} ${i + 1}. ${s.name}`;
  })
  .join('\n')}`;

    return {
      success: true,
      data: {
        hasActiveWorkflow: true,
        workflowId: currentWorkflowState.workflowId,
        workflowName: workflow.name,
        progress,
        currentStepIndex: currentWorkflowState.currentStepIndex,
        currentStep: currentStep
          ? {
              id: currentStep.id,
              name: currentStep.name,
              description: currentStep.description,
            }
          : null,
        completedSteps: currentWorkflowState.completedSteps,
        skippedSteps: currentWorkflowState.skippedSteps,
        totalSteps: workflow.steps.length,
        message,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get workflow status',
    };
  }
}

/**
 * Execute the generate_design_system tool
 */
function executeGenerateDesignSystem(
  input: {
    outputFormats?: string[];
    includeDocumentation?: boolean;
    namespace?: string;
  },
  currentDesign: Partial<LayoutDesign>
): ToolResult {
  try {
    // Validate output formats
    const validFormats: ExportFormat[] = [
      'style-dictionary',
      'figma-tokens',
      'tailwind-config',
      'css-variables',
      'scss-variables',
      'json',
    ];

    const requestedFormats = (input.outputFormats || [
      'css-variables',
      'tailwind-config',
      'json',
    ]) as ExportFormat[];

    const invalidFormats = requestedFormats.filter((f) => !validFormats.includes(f));
    if (invalidFormats.length > 0) {
      return {
        success: false,
        error: `Invalid formats: ${invalidFormats.join(', ')}. Valid formats: ${validFormats.join(', ')}`,
      };
    }

    // Generate the design system
    const designSystem = generateDesignSystem(currentDesign, {
      outputFormats: requestedFormats,
      includeDocumentation: input.includeDocumentation ?? true,
      namespace: input.namespace || 'app',
    });

    // Format a summary message
    const tokenCounts = {
      colors: Object.keys(designSystem.tokens.colors).length,
      typography: Object.keys(designSystem.tokens.typography).length,
      spacing: Object.keys(designSystem.tokens.spacing).length,
      borderRadius: Object.keys(designSystem.tokens.borderRadius).length,
      shadows: Object.keys(designSystem.tokens.shadows).length,
      animations: Object.keys(designSystem.tokens.animations).length,
    };

    const totalTokens = Object.values(tokenCounts).reduce((a, b) => a + b, 0);

    const exportSummary = Object.entries(designSystem.exports)
      .filter(([, value]) => value)
      .map(([format]) => format)
      .join(', ');

    const message = `**Design System Generated**

**Tokens Extracted:** ${totalTokens} total
- Colors: ${tokenCounts.colors}
- Typography: ${tokenCounts.typography}
- Spacing: ${tokenCounts.spacing}
- Border Radius: ${tokenCounts.borderRadius}
- Shadows: ${tokenCounts.shadows}
- Animations: ${tokenCounts.animations}

**Export Formats:** ${exportSummary}

${input.includeDocumentation !== false ? '**Documentation:** Included with usage guidelines\n' : ''}
The design system is ready for export. You can copy the generated code from the exports below.`;

    return {
      success: true,
      data: {
        metadata: designSystem.metadata,
        tokenCounts,
        totalTokens,
        exports: designSystem.exports,
        documentation: designSystem.documentation,
        message,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate design system',
    };
  }
}

/**
 * Execute the analyze_competitor_website tool
 */
async function executeAnalyzeCompetitorWebsite(
  input: {
    url: string;
    compareWithCurrent?: boolean;
    extractionDepth?: 'colors-only' | 'visual-basics' | 'full-analysis';
  },
  currentDesign: Partial<LayoutDesign>
): Promise<ToolResult> {
  try {
    // Validate URL
    let url = input.url.trim();
    if (!url) {
      return { success: false, error: 'URL is required' };
    }

    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Call the capture-website API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const captureResponse = await fetch(`${baseUrl}/api/layout/capture-website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        extractStyles: input.extractionDepth !== 'colors-only',
        viewport: { width: 1440, height: 900 },
      }),
    });

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      return {
        success: false,
        error: errorData.error || `Failed to capture website (${captureResponse.status})`,
      };
    }

    const captureData = await captureResponse.json();

    if (!captureData.success) {
      return { success: false, error: captureData.error || 'Failed to capture website' };
    }

    // Analyze the extracted styles
    const analysis = analyzeExtractedStyles(
      url,
      {
        styles: captureData.extractedStyles || [],
        computedStyles: captureData.computedStyles || {},
      },
      input.compareWithCurrent !== false ? currentDesign : undefined
    );

    // Include screenshot if available
    if (captureData.screenshotBase64) {
      analysis.screenshotBase64 = captureData.screenshotBase64;
    }

    // Generate the report
    const report = formatAnalysisReport(analysis);

    return {
      success: true,
      data: {
        analysis,
        report,
        message: `Successfully analyzed ${url}. Here's what I found:`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze competitor website',
    };
  }
}

/**
 * Process tool calls from Claude's response
 */
async function processToolCalls(
  toolUseBlocks: Anthropic.ToolUseBlock[],
  currentDesign: Partial<LayoutDesign>
): Promise<{
  results: Array<{ toolName: string; result: ToolResult }>;
  animations: DetectedAnimation[];
  generatedImages: Array<{ url: string; targetElement: string; prompt: string }>;
}> {
  const results: Array<{ toolName: string; result: ToolResult }> = [];
  const animations: DetectedAnimation[] = [];
  const generatedImages: Array<{ url: string; targetElement: string; prompt: string }> = [];

  for (const toolUse of toolUseBlocks) {
    let result: ToolResult;
    const input = toolUse.input as Record<string, unknown>;

    switch (toolUse.name) {
      case 'generate_background':
        result = await executeGenerateBackground({
          prompt: input.prompt as string,
          targetElement: input.targetElement as string,
          style: input.style as string | undefined,
          quality: input.quality as 'standard' | 'hd' | undefined,
        });
        if (result.success && result.data) {
          const data = result.data as {
            imageUrl: string;
            targetElement: string;
            revisedPrompt: string;
          };
          generatedImages.push({
            url: data.imageUrl,
            targetElement: data.targetElement,
            prompt: data.revisedPrompt,
          });
        }
        break;

      case 'apply_animation':
        result = executeApplyAnimation({
          animationType: input.animationType as string,
          targetElement: input.targetElement as string,
          presetId: input.presetId as string | undefined,
          duration: input.duration as string | undefined,
          easing: input.easing as string | undefined,
          delay: input.delay as string | undefined,
          iterations: input.iterations as string | undefined,
        });
        if (result.success && result.data) {
          const data = result.data as { animation: DetectedAnimation };
          animations.push(data.animation);
        }
        break;

      case 'list_elements':
        result = executeListElements(currentDesign, input.category as string | undefined);
        break;

      case 'apply_effect':
        result = executeApplyEffect({
          effectType: input.effectType as string,
          targetElement: input.targetElement as string,
          presetId: input.presetId as string | undefined,
          customConfig: input.customConfig as Record<string, unknown> | undefined,
        });
        break;

      case 'apply_component_state':
        result = executeApplyComponentState({
          state: input.state as string,
          targetElement: input.targetElement as string,
          presetId: input.presetId as string | undefined,
        });
        break;

      case 'apply_micro_interaction':
        result = executeApplyMicroInteraction({
          interactionId: input.interactionId as string,
          targetElement: input.targetElement as string,
          trigger: input.trigger as string | undefined,
        });
        break;

      case 'apply_custom_css':
        result = executeApplyCustomCSS({
          targetElement: input.targetElement as string,
          css: input.css as string,
          cssVariables: input.cssVariables as Record<string, string> | undefined,
          pseudoSelectors: input.pseudoSelectors as Record<string, string> | undefined,
          mediaQueries: input.mediaQueries as Record<string, string> | undefined,
          keyframes: input.keyframes as string | undefined,
        });
        break;

      // ================================================================
      // PHASE 4: EXTERNAL API INTEGRATION TOOL CASES
      // ================================================================

      case 'generate_color_palette':
        result = await executeGenerateColorPalette({
          seedColor: input.seedColor as string | undefined,
          model: input.model as string | undefined,
          generateVariations: input.generateVariations as boolean | undefined,
        });
        break;

      case 'search_icons':
        result = await executeSearchIcons({
          query: input.query as string,
          iconSets: input.iconSets as string[] | undefined,
          style: input.style as string | undefined,
          limit: input.limit as number | undefined,
        });
        break;

      case 'get_icon':
        result = await executeGetIcon({
          iconId: input.iconId as string,
          size: input.size as number | undefined,
          color: input.color as string | undefined,
        });
        break;

      case 'search_lottie_animations':
        result = await executeSearchLottieAnimations({
          query: input.query as string,
          category: input.category as string | undefined,
          limit: input.limit as number | undefined,
        });
        break;

      case 'identify_font':
        result = await executeIdentifyFont({
          fontName: input.fontName as string | undefined,
          imageBase64: input.imageBase64 as string | undefined,
          includePairings: input.includePairings as boolean | undefined,
        });
        break;

      case 'audit_accessibility':
        result = await executeAuditAccessibility({
          html: input.html as string,
          wcagLevel: input.wcagLevel as string | undefined,
          includeImpact: input.includeImpact as string[] | undefined,
        });
        break;

      case 'check_color_contrast':
        result = executeCheckColorContrast({
          foreground: input.foreground as string,
          background: input.background as string,
        });
        break;

      case 'generate_ui_component':
        result = await executeGenerateUIComponent({
          prompt: input.prompt as string,
          framework: input.framework as string | undefined,
          styling: input.styling as string | undefined,
          includeTypes: input.includeTypes as boolean | undefined,
          darkMode: input.darkMode as boolean | undefined,
          responsive: input.responsive as boolean | undefined,
        });
        break;

      // ================================================================
      // PHASE 5: AI ENHANCEMENT TOOL CASES
      // ================================================================

      case 'analyze_design_proactively':
        result = executeAnalyzeDesignProactively(currentDesign, {
          analysisDepth: input.analysisDepth as string | undefined,
          focusAreas: input.focusAreas as string[] | undefined,
        });
        break;

      case 'critique_design':
        result = executeCritiqueDesign(currentDesign, {
          focusAreas: input.focusAreas as string[] | undefined,
          severityThreshold: input.severityThreshold as string | undefined,
          includeStrengths: input.includeStrengths as boolean | undefined,
        });
        break;

      case 'generate_design_variants':
        result = executeGenerateDesignVariants(currentDesign, {
          targetElement: input.targetElement as string | undefined,
          variantCount: input.variantCount as number | undefined,
          variationStyle: input.variationStyle as string | undefined,
          preserveProperties: input.preserveProperties as string[] | undefined,
        });
        break;

      case 'start_design_workflow':
        result = executeStartDesignWorkflow({
          workflowType: input.workflowType as string,
        });
        break;

      case 'advance_workflow':
        result = executeAdvanceWorkflow({
          action: input.action as string,
          stepNotes: input.stepNotes as string | undefined,
        });
        break;

      case 'get_workflow_status':
        result = executeGetWorkflowStatus();
        break;

      case 'generate_design_system':
        result = executeGenerateDesignSystem(
          {
            outputFormats: input.outputFormats as string[] | undefined,
            includeDocumentation: input.includeDocumentation as boolean | undefined,
            namespace: input.namespace as string | undefined,
          },
          currentDesign
        );
        break;

      case 'analyze_competitor_website':
        result = await executeAnalyzeCompetitorWebsite(
          {
            url: input.url as string,
            compareWithCurrent: input.compareWithCurrent as boolean | undefined,
            extractionDepth: input.extractionDepth as
              | 'colors-only'
              | 'visual-basics'
              | 'full-analysis'
              | undefined,
          },
          currentDesign
        );
        break;

      default:
        result = { success: false, error: `Unknown tool: ${toolUse.name}` };
    }

    results.push({ toolName: toolUse.name, result });
  }

  return { results, animations, generatedImages };
}

// ============================================================================
// DESIGN EXTRACTION
// ============================================================================

/**
 * Extract design changes from the AI response
 * Looks for specific property change suggestions
 * Uses Zod validation to ensure extracted data is valid
 */
async function extractDesignUpdates(
  response: string,
  currentDesign: Partial<LayoutDesign>
): Promise<{
  updates: Partial<LayoutDesign>;
  changes: DesignChange[];
  validationErrors?: string[];
}> {
  const extractionPrompt = `Analyze this design assistant response and extract any specific design changes mentioned.

Return a JSON object with:
1. "updates" - A partial LayoutDesign object with only the fields that should be changed
2. "changes" - An array describing each change

**IMPORTANT VALIDATION RULES:**
- Color values MUST be valid hex codes (e.g., "#3B82F6" or "#FFF")
- borderRadius must be one of: "none", "sm", "md", "lg", "xl", "full"
- shadows must be one of: "none", "subtle", "medium", "strong"
- animations must be one of: "none", "subtle", "smooth", "playful"
- style must be one of: "modern", "minimalist", "playful", "professional", "custom"
- colorScheme must be one of: "light", "dark", "auto", "custom"
- layout must be one of: "single-page", "multi-page", "dashboard", "custom"

**RESPONSE TO ANALYZE:**
${response}

**CURRENT DESIGN STATE:**
${JSON.stringify(currentDesign, null, 2)}

Return ONLY valid JSON in this format:
{
  "updates": {
    "globalStyles": {
      "colors": { "primary": "#6366F1" },
      "effects": { "borderRadius": "xl" }
    }
  },
  "changes": [
    {
      "property": "globalStyles.colors.primary",
      "oldValue": "#3B82F6",
      "newValue": "#6366F1",
      "reason": "Changed to purple for a more vibrant feel"
    }
  ]
}

If no specific changes were suggested, return:
{
  "updates": {},
  "changes": []
}`;

  try {
    const extractResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    const textBlock = extractResponse.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      let jsonText = textBlock.text.trim();
      // Clean markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText
          .replace(/```json?\n?/g, '')
          .replace(/```$/g, '')
          .trim();
      }

      const rawExtracted = JSON.parse(jsonText);

      // Validate using Zod schema
      const validationResult = ExtractionResponseSchema.safeParse(rawExtracted);

      if (validationResult.success) {
        // Validation passed - use validated data (cast to Partial<LayoutDesign>)
        return {
          updates: validationResult.data.updates as Partial<LayoutDesign>,
          changes: (validationResult.data.changes || []) as DesignChange[],
        };
      } else {
        // Validation failed - log errors and attempt partial recovery
        const errors = validationResult.error.issues.map(
          (e) => `${e.path.join('.')}: ${e.message}`
        );
        console.warn('Design extraction validation errors:', errors);

        // Try to salvage valid parts by removing invalid fields
        const sanitizedUpdates = sanitizeDesignUpdates(rawExtracted.updates || {});
        const sanitizedChanges = (rawExtracted.changes || [])
          .filter((c: unknown) => {
            const result = DesignChangeSchema.safeParse(c);
            return result.success;
          })
          .map((c: unknown) => c as DesignChange);

        return {
          updates: sanitizedUpdates,
          changes: sanitizedChanges,
          validationErrors: errors,
        };
      }
    }
  } catch (error) {
    console.error('Design extraction error:', error);
  }

  return { updates: {}, changes: [] };
}

/**
 * Sanitize design updates by removing invalid fields
 * Attempts to preserve valid data while discarding invalid values
 * Uses explicit type casting since we're dealing with partial/validated data
 */
function sanitizeDesignUpdates(updates: Record<string, unknown>): Partial<LayoutDesign> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: Record<string, any> = {};

  // Validate and sanitize basePreferences
  if (updates.basePreferences && typeof updates.basePreferences === 'object') {
    const baseResult = BasePreferencesSchema.safeParse(updates.basePreferences);
    if (baseResult.success && baseResult.data) {
      sanitized.basePreferences = baseResult.data;
    }
  }

  // Validate and sanitize globalStyles
  if (updates.globalStyles && typeof updates.globalStyles === 'object') {
    const stylesInput = updates.globalStyles as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizedStyles: Record<string, any> = {};

    // Validate each sub-section separately
    if (stylesInput.typography) {
      const typoResult = TypographySchema.safeParse(stylesInput.typography);
      if (typoResult.success && typoResult.data) {
        sanitizedStyles.typography = typoResult.data;
      }
    }
    if (stylesInput.colors) {
      const colorsResult = ColorSchema.safeParse(stylesInput.colors);
      if (colorsResult.success && colorsResult.data) {
        sanitizedStyles.colors = colorsResult.data;
      } else {
        // Try to salvage valid colors individually
        const validColors = sanitizeColors(stylesInput.colors as Record<string, unknown>);
        if (Object.keys(validColors).length > 0) {
          sanitizedStyles.colors = validColors;
        }
      }
    }
    if (stylesInput.spacing) {
      const spacingResult = SpacingSchema.safeParse(stylesInput.spacing);
      if (spacingResult.success && spacingResult.data) {
        sanitizedStyles.spacing = spacingResult.data;
      }
    }
    if (stylesInput.effects) {
      const effectsResult = EffectsSchema.safeParse(stylesInput.effects);
      if (effectsResult.success && effectsResult.data) {
        sanitizedStyles.effects = effectsResult.data;
      }
    }

    if (Object.keys(sanitizedStyles).length > 0) {
      sanitized.globalStyles = sanitizedStyles;
    }
  }

  // Validate and sanitize components
  if (updates.components && typeof updates.components === 'object') {
    const componentsResult = ComponentsSchema.safeParse(updates.components);
    if (componentsResult.success && componentsResult.data) {
      sanitized.components = componentsResult.data;
    }
  }

  // Validate and sanitize structure
  if (updates.structure && typeof updates.structure === 'object') {
    const structureResult = StructureSchema.safeParse(updates.structure);
    if (structureResult.success && structureResult.data) {
      sanitized.structure = structureResult.data;
    }
  }

  // Validate and sanitize responsive
  if (updates.responsive && typeof updates.responsive === 'object') {
    const responsiveResult = ResponsiveSchema.safeParse(updates.responsive);
    if (responsiveResult.success && responsiveResult.data) {
      sanitized.responsive = responsiveResult.data;
    }
  }

  return sanitized as Partial<LayoutDesign>;
}

/**
 * Sanitize individual color values, keeping only valid hex colors
 */
function sanitizeColors(colors: Record<string, unknown>): Record<string, string> {
  const validColors: Record<string, string> = {};

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string' && hexColorRegex.test(value)) {
      validColors[key] = value;
    }
  }

  return validColors;
}

/**
 * Deep merge design updates into current design
 */
function mergeDesignUpdates(
  current: Partial<LayoutDesign>,
  updates: Partial<LayoutDesign>
): Partial<LayoutDesign> {
  const merged = { ...current };

  // Merge globalStyles
  if (updates.globalStyles) {
    merged.globalStyles = {
      ...current.globalStyles,
      ...updates.globalStyles,
      typography: {
        ...current.globalStyles?.typography,
        ...updates.globalStyles?.typography,
      },
      colors: {
        ...current.globalStyles?.colors,
        ...updates.globalStyles?.colors,
      },
      spacing: {
        ...current.globalStyles?.spacing,
        ...updates.globalStyles?.spacing,
      },
      effects: {
        ...current.globalStyles?.effects,
        ...updates.globalStyles?.effects,
      },
    } as LayoutDesign['globalStyles'];
  }

  // Merge components
  if (updates.components) {
    merged.components = {
      ...current.components,
      ...updates.components,
    };
  }

  // Merge structure
  if (updates.structure) {
    merged.structure = {
      ...current.structure,
      ...updates.structure,
    } as LayoutDesign['structure'];
  }

  // Merge responsive
  if (updates.responsive) {
    merged.responsive = {
      ...current.responsive,
      ...updates.responsive,
    } as LayoutDesign['responsive'];
  }

  // Merge base preferences
  if (updates.basePreferences) {
    merged.basePreferences = {
      ...current.basePreferences,
      ...updates.basePreferences,
    } as LayoutDesign['basePreferences'];
  }

  return merged;
}

/**
 * Detect and apply design patterns from user message
 * Returns pattern info and enhanced updates if a pattern was detected
 */
function detectAndApplyPattern(
  userMessage: string,
  currentDesign: Partial<LayoutDesign>,
  extractedUpdates: Partial<LayoutDesign>
): {
  updates: Partial<LayoutDesign>;
  detectedPattern: DesignPattern | null;
  patternApplied: boolean;
} {
  // Try to match a design pattern from the user's message
  const detectedPattern = matchDesignPattern(userMessage);

  if (detectedPattern) {
    // Pattern detected - apply it to the design and merge with extracted updates
    const patternAppliedDesign = applyPatternToDesign(currentDesign, detectedPattern);

    // Merge extracted updates on top of pattern (user explicit requests override pattern defaults)
    const mergedUpdates: Partial<LayoutDesign> = {
      ...patternAppliedDesign,
      ...extractedUpdates,
      globalStyles: {
        ...patternAppliedDesign.globalStyles,
        ...extractedUpdates.globalStyles,
        colors: {
          ...patternAppliedDesign.globalStyles?.colors,
          ...extractedUpdates.globalStyles?.colors,
        },
        typography: {
          ...patternAppliedDesign.globalStyles?.typography,
          ...extractedUpdates.globalStyles?.typography,
        },
        spacing: {
          ...patternAppliedDesign.globalStyles?.spacing,
          ...extractedUpdates.globalStyles?.spacing,
        },
        effects: {
          ...patternAppliedDesign.globalStyles?.effects,
          ...extractedUpdates.globalStyles?.effects,
        },
      } as LayoutDesign['globalStyles'],
    };

    return {
      updates: mergedUpdates,
      detectedPattern,
      patternApplied: true,
    };
  }

  // No pattern matched - try parsing design vocabulary from message
  const parsedDesign = parseDesignDescription(userMessage);

  if (Object.keys(parsedDesign).length > 0) {
    // Design vocabulary found - merge with extracted updates
    // Use type assertion since DeepPartial types don't match Partial exactly
    const mergedUpdates = {
      ...parsedDesign,
      ...extractedUpdates,
      globalStyles: {
        ...parsedDesign.globalStyles,
        ...extractedUpdates.globalStyles,
        colors: {
          ...parsedDesign.globalStyles?.colors,
          ...extractedUpdates.globalStyles?.colors,
        },
        typography: {
          ...parsedDesign.globalStyles?.typography,
          ...extractedUpdates.globalStyles?.typography,
        },
        spacing: {
          ...parsedDesign.globalStyles?.spacing,
          ...extractedUpdates.globalStyles?.spacing,
        },
        effects: {
          ...parsedDesign.globalStyles?.effects,
          ...extractedUpdates.globalStyles?.effects,
        },
      } as LayoutDesign['globalStyles'],
    } as Partial<LayoutDesign>;

    return {
      updates: mergedUpdates,
      detectedPattern: null,
      patternApplied: false,
    };
  }

  // No pattern or vocabulary detected
  return {
    updates: extractedUpdates,
    detectedPattern: null,
    patternApplied: false,
  };
}

/**
 * Generate suggested actions based on conversation state
 */
function generateSuggestedActions(
  design: Partial<LayoutDesign>,
  messageCount: number,
  hasScreenshot: boolean
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Always suggest capturing if no screenshot was provided
  if (!hasScreenshot && messageCount > 0) {
    actions.push({
      label: 'Capture Preview',
      action: 'capture_preview',
      icon: '📸',
    });
  }

  // Suggest reference upload if none exist
  if (!design.referenceMedia?.length) {
    actions.push({
      label: 'Upload Inspiration',
      action: 'upload_reference',
      icon: '🎨',
    });
  }

  // Suggest theme toggle
  const isDark = design.basePreferences?.colorScheme === 'dark';
  actions.push({
    label: isDark ? 'Try Light Mode' : 'Try Dark Mode',
    action: 'toggle_theme',
    icon: isDark ? '☀️' : '🌙',
  });

  // Suggest saving after some conversation
  if (messageCount >= 4) {
    actions.push({
      label: 'Save Design',
      action: 'save_design',
      icon: '💾',
    });
  }

  // Suggest applying to concept after significant progress
  if (messageCount >= 6 && design.globalStyles?.colors?.primary) {
    actions.push({
      label: 'Apply to App Concept',
      action: 'apply_to_concept',
      icon: '✨',
    });
  }

  return actions;
}

// ============================================================================
// CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract design context from user message
 * Detects purpose, target users, and requirements from natural language
 */
function extractDesignContext(
  userMessage: string,
  existingContext?: DesignContext
): DesignContext | null {
  const context: DesignContext = { ...existingContext };
  let hasNewContext = false;

  // Purpose detection patterns
  const purposePatterns = [
    /(?:building|creating|designing|making|working on)\s+(?:a|an|the)?\s*([^,.]+?)(?:\s+(?:for|aimed|targeted|designed)|\s*[,.]|$)/i,
    /(?:this is|it's|its)\s+(?:a|an|the)?\s*([^,.]+?)(?:\s+(?:for|aimed)|\s*[,.]|$)/i,
    /(?:app|site|website|platform|dashboard|portal|store|shop)\s+(?:for|about|to)\s+([^,.]+)/i,
  ];

  for (const pattern of purposePatterns) {
    const match = userMessage.match(pattern);
    if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
      const purpose = match[1].trim();
      // Avoid matching design-related terms
      if (!/^(modern|dark|light|minimal|clean|professional)/i.test(purpose)) {
        context.purpose = purpose;
        hasNewContext = true;
        break;
      }
    }
  }

  // Target users detection patterns
  const userPatterns = [
    /(?:for|aimed at|targeting|designed for|meant for)\s+([^,.]+?)(?:\s+(?:who|that|and)|\s*[,.]|$)/i,
    /(?:users?|audience|customers?|clients?)\s+(?:are|will be|include)\s+([^,.]+)/i,
    /(?:small business|enterprise|developers?|designers?|teams?|professionals?|students?|creators?)/i,
  ];

  for (const pattern of userPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const users = match[1] ? match[1].trim() : match[0].trim();
      if (users.length > 2 && users.length < 100) {
        context.targetUsers = users;
        hasNewContext = true;
        break;
      }
    }
  }

  // Requirements detection
  const requirementPatterns = [
    { pattern: /mobile[- ]?first/i, req: 'Mobile-first' },
    { pattern: /accessible|accessibility|a11y/i, req: 'Accessible' },
    { pattern: /fast|performance|speed/i, req: 'Fast loading' },
    { pattern: /premium|luxury|high[- ]?end/i, req: 'Premium feel' },
    { pattern: /simple|minimal|clean/i, req: 'Simple & clean' },
    { pattern: /professional|corporate|business/i, req: 'Professional' },
    { pattern: /playful|fun|friendly/i, req: 'Playful' },
    { pattern: /dark\s*mode/i, req: 'Dark mode' },
    { pattern: /responsive/i, req: 'Responsive' },
  ];

  const requirements = new Set(existingContext?.requirements || []);
  for (const { pattern, req } of requirementPatterns) {
    if (pattern.test(userMessage)) {
      requirements.add(req);
      hasNewContext = true;
    }
  }

  if (requirements.size > 0) {
    context.requirements = Array.from(requirements);
  }

  if (hasNewContext) {
    context.lastUpdated = new Date().toISOString();
    return context;
  }

  return null;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

// Track last known design for delta optimization
let lastKnownDesign: Partial<LayoutDesign> = {};

export async function POST(request: Request) {
  try {
    const body: LayoutChatRequest = await request.json();
    const {
      message,
      conversationHistory,
      currentDesign: rawCurrentDesign,
      designUnchanged, // Token optimization: true when design hasn't changed
      selectedElement,
      previewScreenshot,
      referenceImages,
      analysisMode = 'standard',
      requestedAnalysis,
      memoriesContext: clientMemoriesContext, // Cross-session memories from client (P0-P1 Phase 7b)
      workflowState: requestWorkflowState, // Multi-step workflow state from client
      currentDevice = 'desktop', // Current device view for responsive context
    } = body;

    // Handle design delta optimization: use cached design if unchanged
    // Safeguard: If designUnchanged but cache is empty (cold start), use raw design or empty
    const hasValidCache = Object.keys(lastKnownDesign).length > 0;
    const currentDesign: Partial<LayoutDesign> =
      designUnchanged && hasValidCache ? lastKnownDesign : rawCurrentDesign || {};

    // Update cache when new design is provided
    if (rawCurrentDesign && !designUnchanged) {
      lastKnownDesign = rawCurrentDesign;
    }

    // Initialize workflow state from request (for multi-step workflows)
    initializeWorkflowState(requestWorkflowState);

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured',
        },
        { status: 500 }
      );
    }

    // Handle pixel-perfect mode with reference images
    let pixelPerfectAnalysis: CompleteDesignAnalysis | null = null;
    let quickAnalysisResult: QuickAnalysis | null = null;

    if (analysisMode === 'pixel-perfect' && referenceImages && referenceImages.length > 0) {
      const replicator = new DesignReplicator(process.env.ANTHROPIC_API_KEY);

      try {
        if (requestedAnalysis === 'quick') {
          // Quick analysis only
          quickAnalysisResult = await replicator.quickAnalysis(referenceImages[0]);
        } else if (requestedAnalysis === 'deep' || requestedAnalysis === 'full') {
          // Full analysis (quick + deep)
          const fullResult = await replicator.fullAnalysis(referenceImages[0]);
          pixelPerfectAnalysis = fullResult.deep;
          quickAnalysisResult = fullResult.quick;
        } else {
          // Default: quick analysis for faster response
          quickAnalysisResult = await replicator.quickAnalysis(referenceImages[0]);
        }
      } catch (analysisError) {
        console.error('Pixel-perfect analysis error:', analysisError);
        // Continue with standard mode if analysis fails
      }
    }

    // Build Claude messages from conversation history with smart compression (P0-P1)
    const messages: Anthropic.MessageParam[] = [];

    // Token budget for conversation context (matches AIBuilder settings)
    const MAX_CONTEXT_TOKENS = 100000;
    const PRESERVE_LAST_N = 15;

    // Hard limit on conversation history to reduce token costs
    // Most layout design conversations don't need more than 15 messages of context
    const MAX_HISTORY_MESSAGES = 15;
    const trimmedHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);

    // Convert LayoutMessage to ChatMessage format for compression
    const chatMessages: ChatMessage[] = trimmedHistory.map((msg, index) => ({
      id: msg.id || `layout-msg-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString(),
    }));

    // Apply smart compression if needed
    let processedMessages: ChatMessage[];
    let truncationNotice = '';

    if (needsCompression(chatMessages, MAX_CONTEXT_TOKENS)) {
      const compressed = compressConversation(chatMessages, {
        maxTokens: MAX_CONTEXT_TOKENS,
        preserveLastN: PRESERVE_LAST_N,
      });

      // Get truncation info with topic extraction
      const truncationInfo = getTruncationInfo(chatMessages, compressed);
      truncationNotice = buildTruncationNotice(truncationInfo);

      processedMessages = compressed.recentMessages;
    } else {
      // No compression needed - history already limited to MAX_HISTORY_MESSAGES
      processedMessages = chatMessages;
    }

    // Add truncation notice if history was limited
    if (truncationNotice) {
      messages.push({
        role: 'user',
        content: truncationNotice,
      });
    }

    // Add conversation history
    for (const msg of processedMessages) {
      messages.push({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      });
    }

    // Build current message with images
    const currentContent: Anthropic.ContentBlockParam[] = [];

    // Add preview screenshot if provided
    if (previewScreenshot) {
      const match = previewScreenshot.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        currentContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: match[2],
          },
        });
      }
    }

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      for (const imageData of referenceImages) {
        const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          currentContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: match[2],
            },
          });
        }
      }
    }

    // Add text message
    let messageText = message;

    // Add device context to message for responsive design
    const deviceWidths = { desktop: 1280, tablet: 820, mobile: 390 };
    const deviceContext =
      currentDevice !== 'desktop'
        ? `[User is viewing in ${currentDevice.toUpperCase()} mode (${deviceWidths[currentDevice]}px width)]\n\n`
        : '';

    // Add selected element context to message
    if (selectedElement) {
      const elementId = selectedElement.id;
      const elementType = selectedElement.type || 'element';
      const elementName = selectedElement.displayName || elementId;
      messageText = `${deviceContext}[User has selected the "${elementName}" ${elementType} in the preview]\n\n${message}`;
    } else if (deviceContext) {
      messageText = `${deviceContext}${message}`;
    }

    currentContent.push({ type: 'text', text: messageText });

    // Add current message
    messages.push({
      role: 'user',
      content: currentContent.length > 1 ? currentContent : messageText,
    });

    // Build system prompt with context
    // Use two-block approach for better Anthropic caching:
    // - Static block (cached): The core system prompt that rarely changes
    // - Dynamic block: Design state, element context, memories, device context
    let systemBlocks: Anthropic.TextBlockParam[];

    if (analysisMode === 'pixel-perfect' && referenceImages?.length) {
      // Use pixel-perfect prompt for design replication (single block, not cacheable)
      const hasAnalysis = !!(pixelPerfectAnalysis || quickAnalysisResult);
      const pixelPerfectPrompt = buildPixelPerfectPrompt(
        hasAnalysis,
        quickAnalysisResult
          ? {
              layoutType: quickAnalysisResult.layoutType,
              overallStyle: quickAnalysisResult.overallStyle,
              primaryFont: quickAnalysisResult.primaryFont,
              dominantColors: quickAnalysisResult.dominantColors?.map((c) => c.hex),
            }
          : undefined
      );
      systemBlocks = [{ type: 'text', text: pixelPerfectPrompt }];
    } else {
      // Use split prompt for better caching
      // Static part: ~8K tokens, cached across requests
      const staticPrompt = LAYOUT_BUILDER_SYSTEM_PROMPT;

      // Dynamic part: Changes per request based on current state
      let dynamicContext = buildDynamicContext(
        currentDesign,
        selectedElement?.id || null,
        !!previewScreenshot,
        referenceImages?.length || 0
      );

      // Add cross-session memories context (P0-P1 Phase 7b)
      if (clientMemoriesContext) {
        dynamicContext += `\n\n## User Design Preferences (from past sessions)\n${clientMemoriesContext}`;
      }

      // Add responsive design context
      if (currentDevice !== 'desktop') {
        dynamicContext += `\n\n## Responsive Design Context
The user is currently viewing in ${currentDevice.toUpperCase()} mode (${deviceWidths[currentDevice]}px width).
When making changes:
- Focus on ${currentDevice}-specific adjustments unless explicitly asked otherwise
- Consider using responsive overrides for ${currentDevice} instead of global changes
- Test that changes work well at this breakpoint
- Common ${currentDevice} patterns: ${currentDevice === 'mobile' ? 'stacked layouts, hamburger menu, larger touch targets' : 'two-column layouts, collapsible sidebars, medium touch targets'}`;
      }

      // Two blocks: static (cached) + dynamic (per-request)
      systemBlocks = [
        { type: 'text', text: staticPrompt, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicContext },
      ];
    }

    // Call Claude API with tools enabled
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemBlocks,
      messages,
      tools: LAYOUT_BUILDER_TOOLS,
    });

    // Process response - may contain tool_use blocks
    let assistantMessage = '';
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    let processedAnimations: DetectedAnimation[] = [];
    let generatedImages: Array<{ url: string; targetElement: string; prompt: string }> = [];
    const toolResults: Array<{ toolName: string; result: ToolResult }> = [];

    // Extract text and tool_use blocks from response
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // Process any tool calls
    if (toolUseBlocks.length > 0) {
      const toolProcessingResult = await processToolCalls(toolUseBlocks, currentDesign);
      toolResults.push(...toolProcessingResult.results);
      processedAnimations = toolProcessingResult.animations;
      generatedImages = toolProcessingResult.generatedImages;

      // If tools were called, we might need to continue the conversation
      // to get Claude's final response incorporating tool results
      if (response.stop_reason === 'tool_use') {
        // Build tool results message
        const toolResultsContent: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
          (toolUse, index) => ({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResults[index]?.result || { error: 'Unknown error' }),
          })
        );

        // Continue conversation with tool results
        const continuationMessages: Anthropic.MessageParam[] = [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResultsContent },
        ];

        const continuationResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          temperature: 0.7,
          system: systemBlocks, // Reuse the same system blocks for continuation
          messages: continuationMessages,
          tools: LAYOUT_BUILDER_TOOLS,
        });

        // Extract final text response
        const finalTextBlock = continuationResponse.content.find((block) => block.type === 'text');
        if (finalTextBlock && finalTextBlock.type === 'text') {
          assistantMessage = finalTextBlock.text;
        }
      }
    }

    // Extract design updates from the response
    const { updates: extractedUpdates, changes } = await extractDesignUpdates(
      assistantMessage,
      currentDesign
    );

    // Detect and apply design patterns from user message
    const {
      updates: enhancedUpdates,
      detectedPattern,
      patternApplied,
    } = detectAndApplyPattern(message, currentDesign, extractedUpdates);

    // Add pattern detection to changes if a pattern was applied
    const allChanges = [...changes];
    if (patternApplied && detectedPattern) {
      allChanges.unshift({
        property: 'designPattern',
        oldValue: 'none',
        newValue: detectedPattern.id,
        reason: `Applied "${detectedPattern.name}" design pattern: ${detectedPattern.description}`,
      });
    }

    // Merge updates into current design
    const updatedDesign = mergeDesignUpdates(currentDesign, enhancedUpdates);

    // Update conversation context
    const newMessageCount = (currentDesign.conversationContext?.messageCount || 0) + 2;
    updatedDesign.conversationContext = {
      ...currentDesign.conversationContext,
      messageCount: newMessageCount,
      lastUpdated: new Date().toISOString(),
      keyDecisions: [
        ...(currentDesign.conversationContext?.keyDecisions || []),
        ...changes.map((c) => c.reason),
      ].slice(-10), // Keep last 10 decisions
      userPreferences: currentDesign.conversationContext?.userPreferences || [],
    };

    // Generate suggested actions
    const suggestedActions = generateSuggestedActions(
      updatedDesign,
      newMessageCount,
      !!previewScreenshot
    );

    // If we have pixel-perfect analysis, merge it into the design
    if (pixelPerfectAnalysis) {
      const replicator = new DesignReplicator(process.env.ANTHROPIC_API_KEY!);
      const analysisDesign = replicator.analysisToLayoutDesign(pixelPerfectAnalysis);
      Object.assign(updatedDesign, analysisDesign);
    }

    // Extract design context from user message (auto-detection)
    const extractedContext = extractDesignContext(message, currentDesign.designContext);
    if (extractedContext) {
      updatedDesign.designContext = extractedContext;
    }

    // Build extended result with tool outputs
    const result: LayoutChatResponse & {
      animations?: DetectedAnimation[];
      generatedBackgrounds?: Array<{ url: string; targetElement: string; prompt: string }>;
      toolsUsed?: string[];
    } = {
      message: assistantMessage,
      updatedDesign,
      suggestedActions,
      designChanges: allChanges.length > 0 ? allChanges : undefined,
      detectedPattern: detectedPattern
        ? {
            id: detectedPattern.id,
            name: detectedPattern.name,
            description: detectedPattern.description,
          }
        : undefined,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      // Include pixel-perfect analysis results if available
      pixelPerfectAnalysis: pixelPerfectAnalysis || undefined,
      quickAnalysis: quickAnalysisResult || undefined,
      // Include extracted context if detected from user message
      extractedContext: extractedContext || undefined,
      // Include tool outputs: animations and generated backgrounds
      animations: processedAnimations.length > 0 ? processedAnimations : undefined,
      generatedBackgrounds: generatedImages.length > 0 ? generatedImages : undefined,
      toolsUsed: toolResults.length > 0 ? toolResults.map((t) => t.toolName) : undefined,
      // Include updated workflow state for multi-step workflows
      workflowState: getWorkflowStateForResponse(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Layout chat error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process layout message',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Return layout builder configuration
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Layout Builder Chat',
    version: '1.0',
    description: 'AI-powered layout design with vision capabilities',
    features: [
      'Visual analysis via screenshots',
      'Element selection awareness',
      'Reference image comparison',
      'Real-time design updates',
      'Design change tracking',
    ],
    endpoints: {
      chat: 'POST /api/layout/chat',
    },
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxImageSize: '5MB',
  });
}
