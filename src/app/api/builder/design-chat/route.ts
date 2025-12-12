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
import { getAnimationPreset } from '@/data/animationPresets';
import { getAdvancedEffectPreset, type AdvancedEffectPreset } from '@/data/advancedEffectsPresets';
import { getComponentStatePreset, type ComponentStatePreset } from '@/data/componentStatePresets';
import {
  getMicroInteractionPreset,
  type MicroInteractionPreset,
} from '@/data/microInteractionPresets';

// External API Service Integrations
import {
  generateColorPalette,
  generatePaletteVariations,
  type ColormindModel,
} from '@/services/colormindService';
import { searchIcons, getIcon, type IconSetId } from '@/services/iconifyService';
import {
  searchLottieAnimations,
  getCategories as getLottieCategories,
} from '@/services/lottieService';
import {
  getGoogleFontsAlternatives,
  getFontPairings,
  generateFontCSS,
  type FontMatch,
} from '@/services/fontIdentificationService';
import { auditAccessibility, checkColorContrast } from '@/services/accessibilityAuditService';
import { generateComponent, getAvailableTemplates } from '@/services/v0Service';

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
          enum: ['standard', 'hd'],
          description: 'Image quality - standard ($0.04) or hd ($0.08-0.12)',
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
    const quality = input.quality || 'standard';
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
      style: input.style === 'vivid' ? 'vivid' : 'natural',
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
  const preset = input.presetId ? getAnimationPreset(input.presetId) : null;

  const animation: DetectedAnimation = {
    id: `anim-${Date.now()}`,
    type: (preset?.type || 'custom') as DetectedAnimation['type'],
    element: input.targetElement,
    property: 'transform',
    fromValue: 'initial',
    toValue: 'animated',
    duration: input.duration || `${preset?.duration || 300}ms`,
    easing: input.easing || preset?.easing || 'ease-out',
    cssAnimation: preset?.css.animation,
    tailwindConfig: preset?.tailwind ? { class: preset.tailwind.class } : undefined,
    confidence: preset ? 0.9 : 0.7,
  };

  return {
    success: true,
    data: {
      animation,
      message: `Applied ${preset?.name || input.animationType} animation to ${input.targetElement}`,
    },
  };
}

function executeApplyEffect(input: {
  effectType: string;
  targetElement: string;
  presetId?: string;
}): ToolResult {
  const preset = input.presetId ? getAdvancedEffectPreset(input.presetId) : null;

  return {
    success: true,
    data: {
      effect: {
        type: input.effectType,
        preset: preset || undefined,
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
  const preset = input.presetId ? getComponentStatePreset(input.presetId) : null;

  return {
    success: true,
    data: {
      componentState: {
        state: input.state,
        preset: preset || undefined,
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
  const preset = getMicroInteractionPreset(input.interactionId);

  return {
    success: true,
    data: {
      microInteraction: {
        id: input.interactionId,
        preset: preset || undefined,
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
    } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

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
          system: [{ type: 'text', text: systemPrompt }],
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
    version: '1.0',
    description: 'AI-powered design editing for the main AI Builder',
    tools: LAYOUT_BUILDER_TOOLS.map((t) => t.name),
    features: [
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
    ],
  });
}
