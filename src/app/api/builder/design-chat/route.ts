/**
 * Builder Design Chat - API Route
 *
 * Handles design/layout modification requests from the main AI Builder.
 * Provides the same AI design capabilities as the Layout Builder chat,
 * enabling users to make visual changes without switching to the Layout Builder.
 *
 * This route:
 * - Uses Claude with vision capabilities to see the current preview
 * - Has access to all Layout Builder tools (DALL-E, animations, effects, etc.)
 * - Returns design updates that can be merged into appConcept.layoutDesign
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { buildLayoutBuilderPrompt } from '@/prompts/layoutBuilderSystemPrompt';
import type { LayoutDesign, DesignChange, DetectedAnimation } from '@/types/layoutDesign';
import { matchDesignPattern, applyPatternToDesign } from '@/utils/designPatterns';
import { parseDesignDescription } from '@/utils/designLanguageParser';
// Context Compression (P0-P1 optimization)
import {
  compressConversation,
  needsCompression,
  getTruncationInfo,
  buildTruncationNotice,
} from '@/utils/contextCompression';
import type { ChatMessage } from '@/types/aiBuilderTypes';
import { getDalleService, getImageCost } from '@/services/dalleService';
// NOTE: Preset files removed - AI generates styles dynamically instead

// External API Service Integrations
import {
  generateColorPalette,
  generatePaletteVariations,
  type ColormindModel,
} from '@/services/colormindService';
import { searchIcons, getIcon, type IconSetId } from '@/services/iconifyService';
import { searchLottieAnimations } from '@/services/lottieService';
import {
  getGoogleFontsAlternatives,
  getFontPairings,
  generateFontCSS,
} from '@/services/fontIdentificationService';
import { auditAccessibility, checkColorContrast } from '@/services/accessibilityAuditService';
import { generateComponent, getAvailableTemplates } from '@/services/v0Service';
import { getGeminiLayoutService, type VisualAnalysis } from '@/services/GeminiLayoutService';

// AI Enhancement Imports (Phase 5 tools)
import { analyzeDesign } from '@/utils/designAnalyzer';
import { critiqueDesign, formatCritiqueReport } from '@/utils/designCritiqueEngine';
import { generateDesignVariants, type VariationStyle } from '@/utils/variantGenerator';
import {
  getWorkflow,
  getAllWorkflows,
  createWorkflowState,
  getWorkflowProgress,
  formatWorkflowStatus,
  type WorkflowState,
} from '@/data/designWorkflows';
import { generateDesignSystem, type ExportFormat } from '@/services/designSystemGenerator';
import { analyzeExtractedStyles, formatAnalysisReport } from '@/services/competitorAnalyzer';
import type { CritiquePrinciple } from '@/data/designCritiqueRules';

// Vercel/Railway serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DesignChatRequest {
  message: string;
  conversationHistory: BuilderMessage[];
  previewScreenshot?: string; // Base64 encoded screenshot
  currentLayoutDesign?: Partial<LayoutDesign>;
  selectedElement?: string;
  /** Cross-session memories context from semantic memory (P0-P1 Phase 7b) */
  memoriesContext?: string;
  /** Workflow state for multi-step design workflows */
  workflowState?: {
    workflowId: string;
    workflowType: string;
    currentStepIndex: number;
    completedSteps: string[];
    skippedSteps: string[];
    stepNotes: Record<string, string>;
    startedAt: string;
  };
}

interface DesignChatResponse {
  message: string;
  responseType: 'design';
  updatedDesign?: Partial<LayoutDesign>;
  designChanges?: DesignChange[];
  animations?: DetectedAnimation[];
  generatedBackgrounds?: Array<{ url: string; targetElement: string; prompt: string }>;
  toolsUsed?: string[];
  tokensUsed: {
    input: number;
    output: number;
  };
  /** Updated workflow state to persist across requests */
  workflowState?: {
    workflowId: string;
    workflowType: string;
    currentStepIndex: number;
    completedSteps: string[];
    skippedSteps: string[];
    stepNotes: Record<string, string>;
    startedAt: string;
  };
  /** Gemini visual analysis (dual-model enhancement) */
  geminiAnalysis?: VisualAnalysis;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS (simplified for builder context)
// ============================================================================

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const ColorSchema = z
  .object({
    primary: z.string().regex(hexColorRegex).optional(),
    secondary: z.string().regex(hexColorRegex).optional(),
    accent: z.string().regex(hexColorRegex).optional(),
    background: z.string().regex(hexColorRegex).optional(),
    surface: z.string().regex(hexColorRegex).optional(),
    text: z.string().regex(hexColorRegex).optional(),
    textMuted: z.string().regex(hexColorRegex).optional(),
    border: z.string().regex(hexColorRegex).optional(),
  })
  .strict()
  .optional();

const TypographySchema = z
  .object({
    fontFamily: z.string().optional(),
    headingWeight: z.enum(['light', 'normal', 'medium', 'semibold', 'bold']).optional(),
    bodyWeight: z.enum(['light', 'normal', 'medium', 'semibold']).optional(),
    headingSize: z.enum(['sm', 'base', 'lg', 'xl', '2xl']).optional(),
    bodySize: z.enum(['xs', 'sm', 'base', 'lg']).optional(),
    lineHeight: z.enum(['tight', 'normal', 'relaxed']).optional(),
  })
  .strict()
  .optional();

const SpacingSchema = z
  .object({
    density: z.enum(['compact', 'normal', 'relaxed']).optional(),
    containerWidth: z.enum(['narrow', 'standard', 'wide', 'full']).optional(),
    sectionPadding: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
    componentGap: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  })
  .strict()
  .optional();

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

const GlobalStylesSchema = z
  .object({
    typography: TypographySchema,
    colors: ColorSchema,
    spacing: SpacingSchema,
    effects: EffectsSchema,
  })
  .strict()
  .optional();

const DesignUpdatesSchema = z
  .object({
    globalStyles: GlobalStylesSchema,
    basePreferences: z
      .object({
        style: z.enum(['modern', 'minimalist', 'playful', 'professional', 'custom']).optional(),
        colorScheme: z.enum(['light', 'dark', 'auto', 'custom']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// ============================================================================
// LAYOUT BUILDER TOOLS (same as layout/chat)
// ============================================================================

const LAYOUT_BUILDER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_background',
    description:
      'Generate a custom background image using DALL-E 3. Use this when the user asks for a generated background, custom image, or AI-created visual asset.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the background to generate.',
        },
        targetElement: {
          type: 'string',
          description: 'CSS selector or element name where the background should be applied.',
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
      'Apply an animation to a specific element in the layout. Use this when the user wants to add motion, transitions, or effects to elements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        animationType: {
          type: 'string',
          description: 'Type of animation (fade, slide, scale, rotate, gradient-shift, etc.)',
        },
        targetElement: {
          type: 'string',
          description: 'CSS selector or element name to apply animation to',
        },
        presetId: {
          type: 'string',
          description: 'Optional: ID of a preset animation to use (e.g., fadeIn, hoverLift)',
        },
        duration: { type: 'string', description: 'Animation duration (e.g., "0.3s", "2s")' },
        easing: { type: 'string', description: 'Easing function' },
      },
      required: ['animationType', 'targetElement'],
    },
  },
  {
    name: 'apply_effect',
    description:
      'Apply advanced visual effects like glassmorphism, neumorphism, gradient borders, text gradients, or glow effects.',
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
          description: 'Preset ID (e.g., glass-subtle, neu-flat, gradient-border-rainbow)',
        },
        targetElement: {
          type: 'string',
          description: 'CSS selector or element name to apply effect to',
        },
      },
      required: ['effectType', 'targetElement'],
    },
  },
  {
    name: 'apply_component_state',
    description:
      'Apply interactive state styling (hover, active, focus, disabled, loading) to UI components.',
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
          description: 'Preset ID (e.g., hover-lift, hover-glow, focus-ring)',
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
      'Apply micro-interactions like ripple effects, magnetic pull, 3D tilt, bounce animations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        interactionId: {
          type: 'string',
          enum: [
            'ripple',
            'magnetic',
            'tilt-3d',
            'float',
            'wobble',
            'jello',
            'shine',
            'bounce-in',
            'slide-up',
            'zoom-in',
            'flip-in',
            'heartbeat',
            'shake',
          ],
          description: 'Micro-interaction type to apply',
        },
        targetElement: { type: 'string', description: 'Element to add interaction to' },
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
    description: 'Apply arbitrary custom CSS to any element. Use for precise pixel-level control.',
    input_schema: {
      type: 'object' as const,
      properties: {
        targetElement: { type: 'string', description: 'CSS selector or element name' },
        css: { type: 'string', description: 'Raw CSS properties to apply' },
        cssVariables: { type: 'object', description: 'Optional CSS custom properties' },
        pseudoSelectors: { type: 'object', description: 'CSS for pseudo-selectors' },
      },
      required: ['targetElement', 'css'],
    },
  },
  {
    name: 'generate_color_palette',
    description:
      'Generate a harmonious color palette using AI (Colormind). Use when the user wants color suggestions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        seedColor: { type: 'string', description: 'Optional starting hex color' },
        model: { type: 'string', enum: ['default', 'ui'], description: 'Generation model' },
        generateVariations: { type: 'boolean', description: 'Generate variations' },
      },
      required: [],
    },
  },
  {
    name: 'search_icons',
    description: 'Search for icons across multiple icon libraries (150K+ icons).',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        iconSets: { type: 'array', items: { type: 'string' }, description: 'Specific icon sets' },
        style: { type: 'string', enum: ['outline', 'solid', 'all'], description: 'Icon style' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_lottie_animations',
    description: 'Search for Lottie animations for loading states, feedback, transitions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: {
          type: 'string',
          enum: ['loading', 'success', 'error', 'warning', 'ui', 'icons', 'illustrations'],
          description: 'Animation category',
        },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['query'],
    },
  },
  {
    name: 'identify_font',
    description: 'Get Google Fonts alternatives for a known font name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fontName: { type: 'string', description: 'Font name to find alternatives for' },
        includePairings: { type: 'boolean', description: 'Include font pairing suggestions' },
      },
      required: [],
    },
  },
  {
    name: 'check_color_contrast',
    description: 'Check color contrast ratio for WCAG compliance.',
    input_schema: {
      type: 'object' as const,
      properties: {
        foreground: { type: 'string', description: 'Foreground (text) color as hex' },
        background: { type: 'string', description: 'Background color as hex' },
      },
      required: ['foreground', 'background'],
    },
  },
  // ============================================================================
  // MISSING ORIGINAL TOOLS (4)
  // ============================================================================
  {
    name: 'list_elements',
    description:
      'List all available design elements that can be targeted for styling, animations, or effects. Returns a structured list of header, navigation, hero, cards, sidebar, footer elements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'sections', 'interactive', 'content', 'effects'],
          description: 'Filter by element category',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_icon',
    description: 'Get a specific icon by name from one of the icon libraries.',
    input_schema: {
      type: 'object' as const,
      properties: {
        iconSet: {
          type: 'string',
          enum: ['heroicons', 'lucide', 'material-design', 'tabler', 'phosphor'],
          description: 'Icon library to use',
        },
        iconName: {
          type: 'string',
          description: 'Name of the icon to retrieve',
        },
        variant: {
          type: 'string',
          enum: ['outline', 'solid', 'filled'],
          description: 'Icon variant/style',
        },
      },
      required: ['iconSet', 'iconName'],
    },
  },
  {
    name: 'audit_accessibility',
    description:
      'Run a full WCAG accessibility audit on the current design. Checks color contrast, touch targets, focus indicators, and more.',
    input_schema: {
      type: 'object' as const,
      properties: {
        level: {
          type: 'string',
          enum: ['A', 'AA', 'AAA'],
          description: 'WCAG conformance level to check against (default: AA)',
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Include fix recommendations (default: true)',
        },
      },
      required: [],
    },
  },
  {
    name: 'generate_ui_component',
    description:
      'Generate a UI component using v0.dev style generation. Creates React/Tailwind components from descriptions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string',
          description: 'Natural language description of the component to generate',
        },
        componentType: {
          type: 'string',
          enum: ['button', 'card', 'form', 'modal', 'navigation', 'table', 'custom'],
          description: 'Type of component to generate',
        },
        styling: {
          type: 'string',
          enum: ['tailwind', 'css-modules', 'styled-components'],
          description: 'Styling approach (default: tailwind)',
        },
      },
      required: ['description'],
    },
  },
  // ============================================================================
  // NEW AI ENHANCEMENT TOOLS (8)
  // ============================================================================
  {
    name: 'analyze_design_proactively',
    description:
      'Proactively analyze the current design for issues, inconsistencies, and opportunities. Returns a scored assessment with actionable suggestions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        analysisDepth: {
          type: 'string',
          enum: ['quick', 'standard', 'thorough'],
          description: 'How deep to analyze (default: standard)',
        },
        focusAreas: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'color',
              'typography',
              'spacing',
              'hierarchy',
              'consistency',
              'accessibility',
              'contrast',
            ],
          },
          description: 'Specific areas to focus analysis on',
        },
      },
      required: [],
    },
  },
  {
    name: 'critique_design',
    description:
      'Provide honest, constructive criticism of the design based on established design principles. Returns severity-ranked issues with actionable fixes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        focusAreas: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'visual-hierarchy',
              'color-theory',
              'typography',
              'spacing-rhythm',
              'consistency',
              'accessibility',
              'usability',
              'modern-trends',
            ],
          },
          description: 'Design principles to evaluate',
        },
        severityThreshold: {
          type: 'string',
          enum: ['all', 'major-only', 'critical-only'],
          description: 'Minimum severity to report (default: all)',
        },
        includeStrengths: {
          type: 'boolean',
          description: 'Include what the design does well (default: true)',
        },
      },
      required: [],
    },
  },
  {
    name: 'generate_design_variants',
    description:
      'Generate multiple design variations for A/B comparison. Each variant includes trade-offs, pros/cons, and best-use scenarios.',
    input_schema: {
      type: 'object' as const,
      properties: {
        variationStyle: {
          type: 'string',
          enum: ['subtle', 'moderate', 'dramatic'],
          description: 'How different the variants should be from current design',
        },
        count: {
          type: 'number',
          description: 'Number of variants to generate (1-5, default: 3)',
        },
        focusOn: {
          type: 'string',
          enum: ['colors', 'typography', 'spacing', 'overall'],
          description: 'What aspect to vary (default: overall)',
        },
      },
      required: [],
    },
  },
  {
    name: 'start_design_workflow',
    description:
      'Start a guided multi-step design workflow for a specific design goal. Workflows include landing-page, dashboard, e-commerce, portfolio, blog, and saas-app.',
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
      'Move to the next step in the current design workflow, mark the current step as complete, skip a step, or go back.',
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
      'Get the current workflow progress, next recommended actions, and what has been completed.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_design_system',
    description:
      'Extract all design decisions into a formal design system with tokens, documentation, and export formats.',
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
          description: 'Export formats to generate',
        },
        includeDocumentation: {
          type: 'boolean',
          description: 'Generate usage documentation (default: true)',
        },
        namespace: {
          type: 'string',
          description: 'Token namespace prefix (e.g., "app", "brand")',
        },
      },
      required: [],
    },
  },
  {
    name: 'analyze_competitor_website',
    description:
      'Capture and analyze a competitor website design, extracting colors, typography, spacing, and patterns. Compares with current design.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'URL of the website to analyze (e.g., "stripe.com")',
        },
        compareWithCurrent: {
          type: 'boolean',
          description: 'Compare findings with current design (default: true)',
        },
        extractionDepth: {
          type: 'string',
          enum: ['colors-only', 'visual-basics', 'full-analysis'],
          description: 'How much detail to extract',
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
}

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
      },
      cost,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate background',
    };
  }
}

function executeApplyAnimation(input: {
  animationType: string;
  targetElement: string;
  presetId?: string;
  duration?: string;
  easing?: string;
}): ToolResult {
  // Presets removed - AI generates animations dynamically
  const animation: DetectedAnimation = {
    id: `anim-${Date.now()}`,
    type: 'custom' as DetectedAnimation['type'],
    element: input.targetElement,
    property: 'transform',
    fromValue: 'initial',
    toValue: 'animated',
    duration: input.duration || '300ms',
    easing: input.easing || 'ease-out',
    confidence: 0.7,
  };

  return {
    success: true,
    data: {
      animation,
      message: `Applied ${input.animationType} animation to ${input.targetElement}`,
    },
  };
}

function executeApplyEffect(input: {
  effectType: string;
  targetElement: string;
  presetId?: string;
}): ToolResult {
  // Presets removed - AI generates effects dynamically
  return {
    success: true,
    data: {
      effect: {
        type: input.effectType,
        targetElement: input.targetElement,
      },
      message: `Applied ${input.effectType} effect to ${input.targetElement}`,
    },
  };
}

function executeApplyComponentState(input: {
  state: string;
  targetElement: string;
  presetId?: string;
}): ToolResult {
  // Presets removed - AI generates states dynamically
  return {
    success: true,
    data: {
      componentState: {
        state: input.state,
        targetElement: input.targetElement,
      },
      message: `Applied ${input.state} state styling to ${input.targetElement}`,
    },
  };
}

function executeApplyMicroInteraction(input: {
  interactionId: string;
  targetElement: string;
  trigger?: string;
}): ToolResult {
  // Presets removed - AI generates micro-interactions dynamically
  return {
    success: true,
    data: {
      microInteraction: {
        id: input.interactionId,
        targetElement: input.targetElement,
        trigger: input.trigger || 'hover',
      },
      message: `Applied ${input.interactionId} micro-interaction to ${input.targetElement}`,
    },
  };
}

function executeApplyCustomCSS(input: {
  targetElement: string;
  css: string;
  cssVariables?: Record<string, string>;
  pseudoSelectors?: Record<string, string>;
}): ToolResult {
  return {
    success: true,
    data: {
      customCSS: {
        targetElement: input.targetElement,
        css: input.css,
        cssVariables: input.cssVariables,
        pseudoSelectors: input.pseudoSelectors,
      },
      message: `Applied custom CSS to ${input.targetElement}`,
    },
  };
}

async function executeGenerateColorPalette(input: {
  seedColor?: string;
  model?: string;
  generateVariations?: boolean;
}): Promise<ToolResult> {
  try {
    const model = (input.model || 'ui') as ColormindModel;

    const palette = await generateColorPalette({
      model,
      seedColor: input.seedColor,
    });

    let variations;
    if (input.generateVariations && palette && palette.colors.length > 0) {
      // Pass the first color as the seed for variations
      variations = generatePaletteVariations(palette.colors[0]);
    }

    return {
      success: true,
      data: {
        palette: palette
          ? {
              colors: palette.colors,
              roles: palette.roles,
            }
          : null,
        variations,
        message: palette
          ? `Generated color palette with ${palette.colors.length} colors`
          : 'Failed to generate palette',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate palette',
    };
  }
}

async function executeSearchIcons(input: {
  query: string;
  iconSets?: string[];
  style?: string;
  limit?: number;
}): Promise<ToolResult> {
  try {
    const results = await searchIcons({
      query: input.query,
      iconSets: input.iconSets as IconSetId[] | undefined,
      style: (input.style as 'outline' | 'solid' | 'all') || 'all',
      limit: input.limit || 10,
    });

    return {
      success: true,
      data: {
        icons: results.slice(0, input.limit || 10).map((icon) => ({
          id: icon.fullId,
          name: icon.name,
          prefix: icon.prefix,
        })),
        total: results.length,
        message: `Found ${results.length} icons for "${input.query}"`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search icons',
    };
  }
}

async function executeSearchLottieAnimations(input: {
  query: string;
  category?: string;
  limit?: number;
}): Promise<ToolResult> {
  try {
    const results = await searchLottieAnimations({
      query: input.query,
      category: input.category as Parameters<typeof searchLottieAnimations>[0]['category'],
      limit: input.limit || 5,
    });

    return {
      success: true,
      data: {
        animations: results.animations.map((anim) => ({
          id: anim.id,
          name: anim.name,
          lottieUrl: anim.lottieUrl,
          previewUrl: anim.previewUrl,
        })),
        message: `Found ${results.animations.length} Lottie animations for "${input.query}"`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search animations',
    };
  }
}

function executeIdentifyFont(input: { fontName?: string; includePairings?: boolean }): ToolResult {
  if (!input.fontName) {
    return { success: false, error: 'fontName is required' };
  }

  const alternatives = getGoogleFontsAlternatives(input.fontName);
  let pairings: Array<{ heading: string; body: string; reason: string }> = [];

  if (input.includePairings && alternatives.length > 0) {
    pairings = getFontPairings(alternatives[0].name);
  }

  return {
    success: true,
    data: {
      alternatives: alternatives.map((alt) => ({
        name: alt.name,
        family: alt.family,
        confidence: alt.confidence,
        googleFontsUrl: alt.googleFontsUrl,
      })),
      pairings: pairings.length > 0 ? pairings : undefined,
      css: alternatives.length > 0 ? generateFontCSS(alternatives[0].name) : undefined,
      message: `Found ${alternatives.length} Google Fonts alternatives for "${input.fontName}"`,
    },
  };
}

function executeCheckColorContrast(input: { foreground: string; background: string }): ToolResult {
  try {
    const result = checkColorContrast(input.foreground, input.background);

    return {
      success: true,
      data: {
        ratio: result.ratio,
        passAA: result.passAA,
        passAAA: result.passAAA,
        passLargeAA: result.passLargeAA,
        message: `Contrast ratio: ${result.ratio}:1 - ${result.passAA ? '✓ Passes WCAG AA' : '✗ Fails WCAG AA'}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check contrast',
    };
  }
}

// ============================================================================
// WORKFLOW STATE MANAGEMENT
// ============================================================================

// Workflow state type for request/response
interface DesignChatWorkflowState {
  workflowId: string;
  workflowType: string;
  currentStepIndex: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepNotes: Record<string, string>;
  startedAt: string;
}

// Workflow state - initialized from request, updated during processing
let currentWorkflowState: WorkflowState | null = null;

/**
 * Initialize workflow state from request
 */
function initializeWorkflowState(requestState?: DesignChatWorkflowState): void {
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
function getWorkflowStateForResponse(): DesignChatWorkflowState | undefined {
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
 * Get letter grade from numeric score
 */
function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ============================================================================
// ADDITIONAL HANDLER FUNCTIONS (Phase 5 - AI Enhancements)
// ============================================================================

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
      categories: ['all', 'sections', 'interactive', 'components'],
    },
  };
}

/**
 * Execute the get_icon tool
 */
async function executeGetIcon(input: {
  iconSet: string;
  iconName: string;
  variant?: string;
}): Promise<ToolResult> {
  try {
    const { iconSet, iconName, variant } = input;

    // Map iconSet names to Iconify prefixes
    const prefixMap: Record<string, string> = {
      heroicons: variant === 'solid' ? 'heroicons-solid' : 'heroicons-outline',
      lucide: 'lucide',
      'material-design': 'mdi',
      tabler: 'tabler',
      phosphor: variant === 'filled' ? 'ph-fill' : 'ph',
    };

    const prefix = prefixMap[iconSet] || iconSet;
    const iconId = `${prefix}:${iconName}`;

    const icon = await getIcon(iconId, { size: 24 });

    if (!icon) {
      return {
        success: false,
        error: `Icon "${iconName}" not found in ${iconSet}. Try searching with search_icons first.`,
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
        message: `Retrieved ${iconName} from ${iconSet}`,
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
 * Execute the audit_accessibility tool
 */
async function executeAuditAccessibility(
  currentDesign: Partial<LayoutDesign>,
  input: {
    level?: string;
    includeRecommendations?: boolean;
  }
): Promise<ToolResult> {
  try {
    const { level = 'AA', includeRecommendations = true } = input;

    // Build a basic HTML representation from the design for auditing
    const colors = currentDesign.globalStyles?.colors;
    const html = `
      <html>
        <body style="background-color: ${colors?.background || '#ffffff'}; color: ${colors?.text || '#000000'}">
          <header>
            <nav><a href="#">Navigation</a></nav>
          </header>
          <main>
            <h1 style="color: ${colors?.primary || '#000000'}">Page Title</h1>
            <p>Content text</p>
            <button style="background: ${colors?.primary || '#007bff'}; color: white">Button</button>
          </main>
        </body>
      </html>
    `;

    const result = await auditAccessibility({
      html,
      wcagLevel: level as 'A' | 'AA' | 'AAA',
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
          fixes: includeRecommendations ? v.nodes.slice(0, 3).map((n) => n.fix) : undefined,
        })),
        passes: result.passes,
        recommendations: includeRecommendations ? result.recommendations : undefined,
        message:
          result.violations.length === 0
            ? `✅ Accessibility audit passed! Score: ${result.score}/100`
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
 * Execute the generate_ui_component tool
 */
async function executeGenerateUIComponent(input: {
  description: string;
  componentType?: string;
  styling?: string;
}): Promise<ToolResult> {
  try {
    const { description, componentType = 'custom', styling = 'tailwind' } = input;

    const result = await generateComponent({
      prompt: description,
      framework: 'react',
      styling: styling as 'tailwind' | 'css-modules' | 'styled-components',
      includeTypes: true,
      darkMode: false,
      responsive: true,
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
          ? `Generated "${result.component.name}" component (${componentType})`
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

/**
 * Execute the analyze_design_proactively tool
 */
function executeAnalyzeDesignProactively(
  currentDesign: Partial<LayoutDesign>,
  input: {
    analysisDepth?: string;
    focusAreas?: string[];
  }
): ToolResult {
  try {
    const depth = (input.analysisDepth || 'standard') as 'quick' | 'standard' | 'thorough';
    const focusAreas = input.focusAreas as
      | (
          | 'color'
          | 'typography'
          | 'spacing'
          | 'hierarchy'
          | 'consistency'
          | 'accessibility'
          | 'contrast'
        )[]
      | undefined;

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
 * Execute the critique_design tool
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
 */
function executeGenerateDesignVariants(
  currentDesign: Partial<LayoutDesign>,
  input: {
    variationStyle?: string;
    count?: number;
    focusOn?: string;
  }
): ToolResult {
  try {
    const variants = generateDesignVariants(currentDesign, {
      targetElement: input.focusOn || 'global',
      variantCount: input.count || 3,
      variationStyle: (input.variationStyle as VariationStyle) || 'moderate',
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

    // Store for use in map callback (avoids non-null assertions)
    const completedSteps = currentWorkflowState.completedSteps;
    const skippedSteps = currentWorkflowState.skippedSteps;
    const currentStepIdx = currentWorkflowState.currentStepIndex;

    const message = `${status}

**Current Step: ${currentStep?.name || 'Complete'}**
${currentStep?.description || ''}

**Progress:**
${workflow.steps
  .map((s, i) => {
    const isComplete = completedSteps.includes(s.id);
    const isSkipped = skippedSteps.includes(s.id);
    const isCurrent = i === currentStepIdx;
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
  currentDesign: Partial<LayoutDesign>,
  input: {
    outputFormats?: string[];
    includeDocumentation?: boolean;
    namespace?: string;
  }
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
  currentDesign: Partial<LayoutDesign>,
  input: {
    url: string;
    compareWithCurrent?: boolean;
    extractionDepth?: string;
  }
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

// ============================================================================
// PROCESS TOOL CALLS
// ============================================================================

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
        });
        if (result.success && result.data) {
          const data = result.data as { animation: DetectedAnimation };
          animations.push(data.animation);
        }
        break;

      case 'apply_effect':
        result = executeApplyEffect({
          effectType: input.effectType as string,
          targetElement: input.targetElement as string,
          presetId: input.presetId as string | undefined,
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
        });
        break;

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

      case 'search_lottie_animations':
        result = await executeSearchLottieAnimations({
          query: input.query as string,
          category: input.category as string | undefined,
          limit: input.limit as number | undefined,
        });
        break;

      case 'identify_font':
        result = executeIdentifyFont({
          fontName: input.fontName as string | undefined,
          includePairings: input.includePairings as boolean | undefined,
        });
        break;

      case 'check_color_contrast':
        result = executeCheckColorContrast({
          foreground: input.foreground as string,
          background: input.background as string,
        });
        break;

      // ================================================================
      // NEW TOOLS (Phase 5 - AI Enhancements)
      // ================================================================

      case 'list_elements':
        result = executeListElements(currentDesign, input.category as string | undefined);
        break;

      case 'get_icon':
        result = await executeGetIcon({
          iconSet: input.iconSet as string,
          iconName: input.iconName as string,
          variant: input.variant as string | undefined,
        });
        break;

      case 'audit_accessibility':
        result = await executeAuditAccessibility(currentDesign, {
          level: input.level as string | undefined,
          includeRecommendations: input.includeRecommendations as boolean | undefined,
        });
        break;

      case 'generate_ui_component':
        result = await executeGenerateUIComponent({
          description: input.description as string,
          componentType: input.componentType as string | undefined,
          styling: input.styling as string | undefined,
        });
        break;

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
          variationStyle: input.variationStyle as string | undefined,
          count: input.count as number | undefined,
          focusOn: input.focusOn as string | undefined,
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
        result = executeGenerateDesignSystem(currentDesign, {
          outputFormats: input.outputFormats as string[] | undefined,
          includeDocumentation: input.includeDocumentation as boolean | undefined,
          namespace: input.namespace as string | undefined,
        });
        break;

      case 'analyze_competitor_website':
        result = await executeAnalyzeCompetitorWebsite(currentDesign, {
          url: input.url as string,
          compareWithCurrent: input.compareWithCurrent as boolean | undefined,
          extractionDepth: input.extractionDepth as string | undefined,
        });
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

async function extractDesignUpdates(
  response: string,
  currentDesign: Partial<LayoutDesign>
): Promise<{
  updates: Partial<LayoutDesign>;
  changes: DesignChange[];
}> {
  const extractionPrompt = `Analyze this design assistant response and extract any specific design changes mentioned.

Return a JSON object with:
1. "updates" - A partial LayoutDesign object with only the fields that should be changed
2. "changes" - An array describing each change

**IMPORTANT VALIDATION RULES:**
- Color values MUST be valid hex codes (e.g., "#3B82F6" or "#FFF")
- borderRadius must be one of: "none", "sm", "md", "lg", "xl", "full"
- shadows must be one of: "none", "subtle", "medium", "strong"

**RESPONSE TO ANALYZE:**
${response}

**CURRENT DESIGN STATE:**
${JSON.stringify(currentDesign, null, 2)}

Return ONLY valid JSON:
{
  "updates": {
    "globalStyles": {
      "colors": { "primary": "#6366F1" }
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

If no specific changes, return: { "updates": {}, "changes": [] }`;

  try {
    const extractionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    const extractedText = extractionResponse.content.find((b) => b.type === 'text')?.text || '{}';

    // Parse JSON from response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { updates: {}, changes: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate with Zod
    const validationResult = DesignUpdatesSchema.safeParse(parsed.updates || {});

    if (!validationResult.success) {
      console.warn('Design extraction validation errors:', validationResult.error.issues);
      return { updates: {}, changes: [] };
    }

    return {
      updates: validationResult.data as Partial<LayoutDesign>,
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    };
  } catch (error) {
    console.error('Design extraction error:', error);
    return { updates: {}, changes: [] };
  }
}

// ============================================================================
// MERGE DESIGN UPDATES
// ============================================================================

function mergeDesignUpdates(
  current: Partial<LayoutDesign>,
  updates: Partial<LayoutDesign>
): Partial<LayoutDesign> {
  const merged = { ...current };

  if (updates.globalStyles) {
    merged.globalStyles = {
      ...current.globalStyles,
      colors: { ...current.globalStyles?.colors, ...updates.globalStyles.colors },
      typography: { ...current.globalStyles?.typography, ...updates.globalStyles.typography },
      spacing: { ...current.globalStyles?.spacing, ...updates.globalStyles.spacing },
      effects: { ...current.globalStyles?.effects, ...updates.globalStyles.effects },
    } as LayoutDesign['globalStyles'];
  }

  if (updates.basePreferences) {
    merged.basePreferences = {
      ...current.basePreferences,
      ...updates.basePreferences,
    } as LayoutDesign['basePreferences'];
  }

  if (updates.components) {
    merged.components = {
      ...current.components,
      ...updates.components,
    } as LayoutDesign['components'];
  }

  return merged;
}

// ============================================================================
// DETECT AND APPLY PATTERN
// ============================================================================

function detectAndApplyPattern(
  userMessage: string,
  currentDesign: Partial<LayoutDesign>,
  extractedUpdates: Partial<LayoutDesign>
): Partial<LayoutDesign> {
  // Try to match a design pattern from the user's message
  const detectedPattern = matchDesignPattern(userMessage);

  if (detectedPattern) {
    const patternAppliedDesign = applyPatternToDesign(currentDesign, detectedPattern);

    // Merge extracted updates on top of pattern
    return {
      ...patternAppliedDesign,
      ...extractedUpdates,
      globalStyles: {
        ...patternAppliedDesign.globalStyles,
        ...extractedUpdates.globalStyles,
        colors: {
          ...patternAppliedDesign.globalStyles?.colors,
          ...extractedUpdates.globalStyles?.colors,
        },
      } as LayoutDesign['globalStyles'],
    };
  }

  // Try parsing design vocabulary
  const parsedDesign = parseDesignDescription(userMessage);

  if (Object.keys(parsedDesign).length > 0) {
    return {
      ...parsedDesign,
      ...extractedUpdates,
      globalStyles: {
        ...parsedDesign.globalStyles,
        ...extractedUpdates.globalStyles,
      } as LayoutDesign['globalStyles'],
    } as Partial<LayoutDesign>;
  }

  return extractedUpdates;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: DesignChatRequest = await request.json();
    const {
      message,
      conversationHistory,
      previewScreenshot,
      currentLayoutDesign,
      selectedElement,
      memoriesContext, // Cross-session memories (P0-P1 Phase 7b)
      workflowState, // Workflow state for multi-step workflows
    } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Initialize workflow state from request (for serverless persistence)
    initializeWorkflowState(workflowState);

    // Build Claude messages with smart compression (P0-P1 optimization)
    const messages: Anthropic.MessageParam[] = [];

    // Token budget for conversation context (matches AIBuilder settings)
    const MAX_CONTEXT_TOKENS = 100000;
    const PRESERVE_LAST_N = 20;

    // Convert BuilderMessage to ChatMessage format for compression
    const chatMessages: ChatMessage[] = conversationHistory.map((msg, index) => ({
      id: `design-msg-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: new Date().toISOString(),
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
      // No compression needed, but still limit to last 50 messages as safety
      processedMessages = chatMessages.slice(-50);
      if (chatMessages.length > 50) {
        truncationNotice = `⚠️ CONTEXT NOTICE: This conversation has ${chatMessages.length} total messages. You are seeing the 50 most recent. If you need details about earlier design decisions, ask the user to clarify rather than assuming.`;
      }
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

    // Build current message with screenshot
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

    // Add text message
    let messageText = message;
    if (selectedElement) {
      messageText = `[User has selected the "${selectedElement}" element]\n\n${message}`;
    }
    currentContent.push({ type: 'text', text: messageText });

    messages.push({
      role: 'user',
      content: currentContent.length > 1 ? currentContent : messageText,
    });

    // Build system prompt
    let systemPrompt = buildLayoutBuilderPrompt(
      currentLayoutDesign || {},
      selectedElement || null,
      !!previewScreenshot,
      0 // No reference images in builder design chat
    );

    // Add cross-session memories context to system prompt (P0-P1 Phase 7b)
    if (memoriesContext) {
      systemPrompt += `\n\n## User Design Preferences (from past sessions)\n${memoriesContext}`;
    }

    // =========================================================================
    // GEMINI VISUAL ANALYSIS (Dual-Model Enhancement)
    // Gemini provides visual intuition + color extraction + "vibe" detection
    // This compensates for Claude's limitations in visual interpretation
    // =========================================================================
    let geminiAnalysis: VisualAnalysis | undefined;
    if (previewScreenshot) {
      try {
        const geminiService = getGeminiLayoutService();
        if (geminiService.checkAvailability()) {
          geminiAnalysis = await geminiService.analyzeScreenshot(previewScreenshot);

          // Add Gemini's visual analysis to system prompt for Claude's reasoning
          const geminiContext = `

## Creative Director's Visual Analysis (from Gemini)
${JSON.stringify(geminiAnalysis, null, 2)}

Use this visual analysis to inform your structural decisions. Gemini has identified:
- Layout type: ${geminiAnalysis.layoutType}
- Color palette: Primary ${geminiAnalysis.colorPalette?.primary}, Background ${geminiAnalysis.colorPalette?.background}
- Visual vibe: ${geminiAnalysis.vibe || 'Not detected'}
- Key qualities: ${geminiAnalysis.vibeKeywords?.join(', ') || 'None detected'}

When the user asks for changes, consider both their request AND this visual context.`;

          systemPrompt += geminiContext;
        }
      } catch (geminiError) {
        // Gemini failed - continue with Claude only (graceful degradation)
        console.warn('Gemini visual analysis failed, continuing with Claude only:', geminiError);
      }
    }

    // Call Claude with tools
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools: LAYOUT_BUILDER_TOOLS,
      messages,
    });

    // Process tool calls if any
    let animations: DetectedAnimation[] = [];
    let generatedImages: Array<{ url: string; targetElement: string; prompt: string }> = [];
    const toolsUsed: string[] = [];

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length > 0) {
        const toolResults = await processToolCalls(toolUseBlocks, currentLayoutDesign || {});
        animations = toolResults.animations;
        generatedImages = toolResults.generatedImages;
        toolsUsed.push(...toolResults.results.map((r) => r.toolName));

        // Send tool results back to Claude for final response
        const toolResultMessages: Anthropic.MessageParam[] = [
          ...messages,
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: toolResults.results.map((r) => ({
              type: 'tool_result' as const,
              tool_use_id: toolUseBlocks.find((b) => b.name === r.toolName)?.id || '',
              content: JSON.stringify(r.result),
            })),
          },
        ];

        const finalResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4000,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          tools: LAYOUT_BUILDER_TOOLS,
          messages: toolResultMessages,
        });

        const textBlock = finalResponse.content.find((b) => b.type === 'text');
        const assistantMessage = textBlock && textBlock.type === 'text' ? textBlock.text : '';

        // Extract design updates
        const { updates: extractedUpdates, changes } = await extractDesignUpdates(
          assistantMessage,
          currentLayoutDesign || {}
        );

        // Apply pattern detection and merge
        const finalUpdates = detectAndApplyPattern(
          message,
          currentLayoutDesign || {},
          extractedUpdates
        );

        const mergedDesign = mergeDesignUpdates(currentLayoutDesign || {}, finalUpdates);

        const result: DesignChatResponse = {
          message: assistantMessage,
          responseType: 'design',
          updatedDesign: mergedDesign,
          designChanges: changes,
          animations: animations.length > 0 ? animations : undefined,
          generatedBackgrounds: generatedImages.length > 0 ? generatedImages : undefined,
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
          tokensUsed: {
            input: response.usage.input_tokens + finalResponse.usage.input_tokens,
            output: response.usage.output_tokens + finalResponse.usage.output_tokens,
          },
          workflowState: getWorkflowStateForResponse(),
          geminiAnalysis,
        };

        return NextResponse.json(result);
      }
    }

    // No tool use - extract design from text response
    const textBlock = response.content.find((b) => b.type === 'text');
    const assistantMessage = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // Extract design updates
    const { updates: extractedUpdates, changes } = await extractDesignUpdates(
      assistantMessage,
      currentLayoutDesign || {}
    );

    // Apply pattern detection and merge
    const finalUpdates = detectAndApplyPattern(
      message,
      currentLayoutDesign || {},
      extractedUpdates
    );

    const mergedDesign = mergeDesignUpdates(currentLayoutDesign || {}, finalUpdates);

    const result: DesignChatResponse = {
      message: assistantMessage,
      responseType: 'design',
      updatedDesign: Object.keys(mergedDesign).length > 0 ? mergedDesign : undefined,
      designChanges: changes.length > 0 ? changes : undefined,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      workflowState: getWorkflowStateForResponse(),
      geminiAnalysis,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Design chat error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process design request' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Return design chat configuration
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Builder Design Chat',
    version: '2.0',
    description:
      'AI-powered design editing for the main AI Builder with full parity to Layout Builder',
    tools: LAYOUT_BUILDER_TOOLS.map((t) => t.name),
    toolCount: LAYOUT_BUILDER_TOOLS.length,
    features: [
      // Core capabilities
      'Vision capability (sees preview screenshots)',
      'DALL-E background generation',
      'Animation presets',
      'Advanced effects (glassmorphism, neumorphism)',
      'Component state styling',
      'Micro-interactions',
      'Color palette generation',
      'Icon search (150K+ icons)',
      'Lottie animation search',
      'Font identification',
      'Color contrast checking',
      // New AI Enhancement features
      'List targetable design elements',
      'Get specific icons by name',
      'Full WCAG accessibility audit',
      'UI component generation (v0.dev style)',
      'Proactive design analysis with scoring',
      'Detailed design critique with recommendations',
      'A/B design variant generation',
      'Multi-step guided design workflows',
      'Design system token export',
      'Competitor website analysis',
    ],
  });
}
