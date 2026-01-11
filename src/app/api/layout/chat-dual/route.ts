/**
 * Layout Builder Dual-Model Chat - API Route
 *
 * Implements the dual-model pipeline:
 * 1. Gemini (Creative Director): Visual analysis, color extraction, vibe interpretation
 * 2. Claude (Precision Architect): Structural refinement, accessibility, tool execution
 *
 * This route automatically chains both models for comprehensive design assistance.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  getGeminiLayoutService,
  type VisualAnalysis,
  type GeminiChatResponse,
} from '@/services/GeminiLayoutService';
import { buildLayoutBuilderPrompt } from '@/prompts/layoutBuilderSystemPrompt';
import {
  getRoutingForElement,
  getRoutingForRequest,
  type ModelRouting,
} from '@/services/modelRouter';
import type {
  LayoutDesign,
  LayoutChatRequest,
  LayoutChatResponse,
  DesignChange,
  SuggestedAction,
  LayoutWorkflowState,
  ElementType,
} from '@/types/layoutDesign';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DualModelRequest extends LayoutChatRequest {
  modelMode?: 'claude' | 'gemini' | 'dual' | 'auto';
  skipClaudeRefinement?: boolean;
}

interface DualModelResponse extends LayoutChatResponse {
  geminiAnalysis?: VisualAnalysis;
  modelUsed: 'gemini' | 'claude' | 'dual';
  pipelineStages?: {
    gemini?: {
      completed: boolean;
      duration: number;
      analysis?: VisualAnalysis;
    };
    claude?: {
      completed: boolean;
      duration: number;
    };
  };
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const DualModelRequestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.any()).optional().default([]),
  currentDesign: z.record(z.string(), z.any()).optional().default({}),
  selectedElement: z.string().optional(),
  previewScreenshot: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  modelMode: z.enum(['claude', 'gemini', 'dual', 'auto']).optional().default('dual'),
  skipClaudeRefinement: z.boolean().optional().default(false),
  memoriesContext: z.string().optional(),
  workflowState: z.any().optional(),
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedRequest = DualModelRequestSchema.parse(body);

    const {
      message,
      conversationHistory,
      currentDesign,
      previewScreenshot,
      referenceImages,
      modelMode,
      skipClaudeRefinement,
    } = validatedRequest;

    // Check for required API keys
    const hasGeminiKey = !!process.env.GOOGLE_API_KEY;
    const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;

    if (!hasGeminiKey && !hasClaudeKey) {
      return NextResponse.json(
        { error: 'No AI API keys configured (GOOGLE_API_KEY or ANTHROPIC_API_KEY required)' },
        { status: 500 }
      );
    }

    // Collect all images
    const allImages: string[] = [];
    if (previewScreenshot) allImages.push(previewScreenshot);
    if (referenceImages) allImages.push(...referenceImages);

    const hasImages = allImages.length > 0;

    // Determine effective model mode using smart routing when 'auto'
    let effectiveModelMode = modelMode;
    let _routingReason = ''; // Prefixed for future debugging use

    if (modelMode === 'auto') {
      const selectedElement = validatedRequest.selectedElement;
      if (selectedElement) {
        // Element-based routing
        const routing = getRoutingForElement(selectedElement as ElementType, message);
        effectiveModelMode =
          routing.primary === 'DUAL' ? 'dual' : routing.primary === 'GEMINI' ? 'gemini' : 'claude';
        _routingReason = routing.reason;
      } else {
        // General request routing
        const routing = getRoutingForRequest(message, hasImages);
        effectiveModelMode =
          routing.primary === 'DUAL' ? 'dual' : routing.primary === 'GEMINI' ? 'gemini' : 'claude';
        _routingReason = routing.reason;
      }
    }

    // =========================================================================
    // STAGE 1: GEMINI VISUAL ANALYSIS
    // =========================================================================

    let geminiAnalysis: VisualAnalysis | undefined;
    let geminiMessage: string | undefined;
    let geminiDuration = 0;

    if (hasGeminiKey && hasImages) {
      const geminiStart = Date.now();

      try {
        const geminiService = getGeminiLayoutService();

        if (geminiService.checkAvailability()) {
          // Analyze the first image (typically the preview screenshot)
          geminiAnalysis = await geminiService.analyzeScreenshot(allImages[0]);
          geminiDuration = Date.now() - geminiStart;

          geminiMessage = buildGeminiSummary(geminiAnalysis);
        }
      } catch (geminiError) {
        console.error('Gemini analysis failed:', geminiError);
        // Continue without Gemini analysis
      }
    }

    // =========================================================================
    // STAGE 2: CLAUDE STRUCTURAL REFINEMENT
    // =========================================================================

    let claudeMessage = '';
    let updatedDesign: Partial<LayoutDesign> = {};
    let designChanges: DesignChange[] = [];
    let suggestedActions: SuggestedAction[] = [];
    let claudeDuration = 0;
    let tokensUsed = { input: 0, output: 0 };

    // Skip Claude if explicitly requested or if no Claude key
    const shouldUseClaude = !skipClaudeRefinement && hasClaudeKey;

    if (shouldUseClaude) {
      const claudeStart = Date.now();

      try {
        // Build context with Gemini analysis
        const systemPrompt = buildLayoutBuilderPrompt(
          currentDesign as Partial<LayoutDesign>,
          validatedRequest.selectedElement || null,
          !!previewScreenshot,
          referenceImages?.length || 0
        );
        const geminiContext = geminiAnalysis
          ? `\n\n## Creative Director's Visual Analysis (from Gemini)\n${JSON.stringify(geminiAnalysis, null, 2)}\n\nUse this analysis to inform your structural decisions.`
          : '';

        // Build messages array
        const messages: Anthropic.MessageParam[] = [];

        // Add conversation history (last 10 messages)
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role,
              content: msg.content,
            });
          }
        }

        // Add current message with Gemini context
        const userContent = geminiContext
          ? `${message}\n\n[Note: Visual analysis from Gemini is available above. Use it to guide your response.]`
          : message;

        messages.push({
          role: 'user',
          content: userContent,
        });

        // Call Claude
        const claudeResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt + geminiContext,
          messages,
        });

        claudeDuration = Date.now() - claudeStart;
        tokensUsed = {
          input: claudeResponse.usage.input_tokens,
          output: claudeResponse.usage.output_tokens,
        };

        // Extract text response
        for (const block of claudeResponse.content) {
          if (block.type === 'text') {
            claudeMessage = block.text;
          }
        }

        // Try to extract design updates from Claude's response
        const extractionResult = await extractDesignUpdates(claudeMessage, currentDesign);
        if (extractionResult) {
          updatedDesign = extractionResult.updates;
          designChanges = extractionResult.changes;
        }

        // Generate suggested actions based on the conversation
        suggestedActions = generateSuggestedActions(message, geminiAnalysis);
      } catch (claudeError) {
        console.error('Claude refinement failed:', claudeError);
        claudeMessage =
          'I encountered an issue during structural refinement. Using Gemini analysis directly.';
      }
    }

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================

    // Combine messages
    const combinedMessage = buildCombinedMessage(geminiMessage, claudeMessage, effectiveModelMode);

    // Always apply Gemini's visual analysis when available
    // Gemini provides accurate colors/typography from the image, Claude provides structural changes
    if (geminiAnalysis) {
      const geminiDesignUpdates = convertGeminiToDesignUpdates(geminiAnalysis);
      const geminiStyles = geminiDesignUpdates.updates.globalStyles;

      // Merge Gemini's visual updates with Claude's structural updates
      // Gemini takes priority for globalStyles (colors, typography, effects, spacing)
      // Claude takes priority for structure and components
      if (geminiStyles) {
        updatedDesign = {
          ...updatedDesign,
          globalStyles: {
            ...updatedDesign.globalStyles,
            // Gemini's visual analysis takes priority for all visual elements
            colors: geminiStyles.colors,
            typography: geminiStyles.typography,
            spacing: geminiStyles.spacing,
            effects: geminiStyles.effects,
          },
        };
      }

      // Include Gemini's design changes
      designChanges = [...designChanges, ...geminiDesignUpdates.changes];
    }

    // Merge with current design
    const mergedDesign = mergeDesigns(currentDesign as Partial<LayoutDesign>, updatedDesign);

    const totalDuration = Date.now() - startTime;

    const response: DualModelResponse = {
      message: combinedMessage,
      updatedDesign: mergedDesign,
      suggestedActions,
      designChanges,
      tokensUsed,
      geminiAnalysis,
      modelUsed: geminiAnalysis && claudeMessage ? 'dual' : geminiAnalysis ? 'gemini' : 'claude',
      pipelineStages: {
        gemini: {
          completed: !!geminiAnalysis,
          duration: geminiDuration,
          analysis: geminiAnalysis,
        },
        claude: {
          completed: !!claudeMessage,
          duration: claudeDuration,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dual-model chat error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a human-readable summary of Gemini's visual analysis
 */
function buildGeminiSummary(analysis: VisualAnalysis): string {
  const parts: string[] = [];

  parts.push(`I analyzed the design and detected a **${analysis.layoutType}** layout.`);

  if (analysis.vibe) {
    parts.push(`The overall vibe is: "${analysis.vibe}"`);
  }

  if (analysis.vibeKeywords?.length > 0) {
    parts.push(`Key aesthetic qualities: ${analysis.vibeKeywords.join(', ')}`);
  }

  if (analysis.colorPalette) {
    parts.push(
      `\nColor palette extracted:\n` +
        `- Primary: ${analysis.colorPalette.primary}\n` +
        `- Secondary: ${analysis.colorPalette.secondary}\n` +
        `- Background: ${analysis.colorPalette.background}`
    );
  }

  if (analysis.components?.length > 0) {
    const componentTypes = analysis.components.map((c) => c.type).filter((t) => t !== 'unknown');
    if (componentTypes.length > 0) {
      parts.push(`\nDetected components: ${componentTypes.join(', ')}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Build combined message from both models
 */
function buildCombinedMessage(
  geminiMessage: string | undefined,
  claudeMessage: string | undefined,
  modelMode: string | undefined
): string {
  if (geminiMessage && claudeMessage) {
    return `## Visual Analysis (Gemini)\n\n${geminiMessage}\n\n---\n\n## Implementation Details (Claude)\n\n${claudeMessage}`;
  }

  if (geminiMessage) {
    return geminiMessage;
  }

  if (claudeMessage) {
    return claudeMessage;
  }

  return 'I was unable to analyze the design. Please try again.';
}

/**
 * Named color to hex mapping for natural language parsing
 */
const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  grey: '#6B7280',
};

/**
 * Extract design updates from Claude's response
 * Tries JSON first, then falls back to natural language parsing
 */
async function extractDesignUpdates(
  response: string,
  currentDesign: Record<string, unknown>
): Promise<{ updates: Partial<LayoutDesign>; changes: DesignChange[] } | null> {
  // First, try to find JSON in the response (preferred method)
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const changes: DesignChange[] = [];

      // Track changes
      if (parsed.globalStyles) {
        for (const [key, value] of Object.entries(parsed.globalStyles)) {
          changes.push({
            property: `globalStyles.${key}`,
            oldValue: JSON.stringify(
              (currentDesign as Record<string, Record<string, unknown>>).globalStyles?.[key]
            ),
            newValue: JSON.stringify(value),
            reason: 'Updated based on analysis',
          });
        }
      }

      return {
        updates: parsed,
        changes,
      };
    } catch {
      // JSON parsing failed, fall through to natural language parsing
    }
  }

  // Fallback: Try to extract colors from natural language
  const colorUpdates: Record<string, string> = {};
  const changes: DesignChange[] = [];

  // Pattern for "primary color to #XXXXXX" or "primary color to blue"
  const colorPatterns = [
    {
      key: 'primary',
      patterns: [
        /primary\s+colou?r\s+(?:to|=|:)\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|\w+)/i,
        /set\s+primary\s+(?:to|=|:)\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|\w+)/i,
      ],
    },
    {
      key: 'secondary',
      patterns: [/secondary\s+colou?r\s+(?:to|=|:)\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|\w+)/i],
    },
    {
      key: 'accent',
      patterns: [/accent\s+colou?r\s+(?:to|=|:)\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|\w+)/i],
    },
    {
      key: 'background',
      patterns: [/background\s+(?:colou?r\s+)?(?:to|=|:)\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|\w+)/i],
    },
    {
      key: 'text',
      patterns: [/text\s+colou?r\s+(?:to|=|:)\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|\w+)/i],
    },
  ];

  for (const { key, patterns } of colorPatterns) {
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        let colorValue = match[1].toLowerCase();
        // Convert named color to hex if needed
        if (!colorValue.startsWith('#')) {
          colorValue = COLOR_NAME_TO_HEX[colorValue] || colorValue;
        }
        if (colorValue.startsWith('#')) {
          colorUpdates[key] = colorValue.toUpperCase();
          changes.push({
            property: `globalStyles.colors.${key}`,
            oldValue: JSON.stringify(
              (currentDesign as Record<string, Record<string, Record<string, unknown>>>)
                .globalStyles?.colors?.[key]
            ),
            newValue: colorValue.toUpperCase(),
            reason: 'Extracted from natural language response',
          });
        }
        break;
      }
    }
  }

  // If we found any colors, return them as updates
  if (Object.keys(colorUpdates).length > 0) {
    return {
      updates: {
        globalStyles: {
          colors: colorUpdates as unknown as LayoutDesign['globalStyles']['colors'],
        },
      } as Partial<LayoutDesign>,
      changes,
    };
  }

  return null;
}

/**
 * Convert Gemini's visual analysis to design updates
 */
function convertGeminiToDesignUpdates(analysis: VisualAnalysis): {
  updates: Partial<LayoutDesign>;
  changes: DesignChange[];
} {
  const updates: Partial<LayoutDesign> = {
    globalStyles: {
      colors: {
        primary: analysis.colorPalette.primary,
        secondary: analysis.colorPalette.secondary,
        accent: analysis.colorPalette.accent,
        background: analysis.colorPalette.background,
        surface: analysis.colorPalette.surface,
        text: analysis.colorPalette.text,
        textMuted: analysis.colorPalette.textMuted,
        border: analysis.colorPalette.textMuted, // Use textMuted as border fallback
      },
      typography: {
        fontFamily: analysis.typography.estimatedBodyFont || 'Inter',
        headingFont: analysis.typography.estimatedHeadingFont,
        headingWeight: analysis.typography.headingWeight,
        bodyWeight: analysis.typography.bodyWeight,
        headingSize: 'lg' as const,
        bodySize: 'base' as const,
        lineHeight: 'normal' as const,
        letterSpacing: 'normal' as const,
      },
      spacing: {
        density: analysis.spacing.density,
        containerWidth: 'standard' as const,
        sectionPadding: analysis.spacing.sectionPadding,
        componentGap: analysis.spacing.componentGap,
      },
      effects: {
        borderRadius: analysis.effects.borderRadius,
        shadows: analysis.effects.shadows,
        animations: analysis.effects.hasAnimations ? 'smooth' : 'subtle',
        blur: analysis.effects.hasBlur ? 'subtle' : 'none',
        gradients: analysis.effects.hasGradients,
      },
    },
  };

  const changes: DesignChange[] = [
    {
      property: 'globalStyles.colors',
      oldValue: undefined,
      newValue: JSON.stringify(updates.globalStyles?.colors),
      reason: 'Extracted from visual analysis',
    },
    {
      property: 'globalStyles.typography',
      oldValue: undefined,
      newValue: JSON.stringify(updates.globalStyles?.typography),
      reason: 'Detected from screenshot',
    },
    {
      property: 'globalStyles.effects',
      oldValue: undefined,
      newValue: JSON.stringify(updates.globalStyles?.effects),
      reason: 'Identified visual effects',
    },
  ];

  return { updates, changes };
}

/**
 * Generate suggested actions based on the conversation
 */
function generateSuggestedActions(message: string, analysis?: VisualAnalysis): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  if (analysis) {
    actions.push({
      label: 'Apply colors',
      action: `Apply the extracted color palette: primary ${analysis.colorPalette.primary}`,
    });

    if (analysis.typography.estimatedHeadingFont) {
      actions.push({
        label: 'Apply typography',
        action: `Set heading font to ${analysis.typography.estimatedHeadingFont}`,
      });
    }

    actions.push({
      label: 'Apply spacing',
      action: `Set spacing density to ${analysis.spacing.density}`,
    });
  }

  // Add contextual actions based on message
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('dark')) {
    actions.push({
      label: 'Enable dark mode',
      action: 'Switch to dark color scheme',
    });
  }

  if (lowerMessage.includes('animation')) {
    actions.push({
      label: 'Add animations',
      action: 'Apply smooth entrance animations',
    });
  }

  return actions.slice(0, 4); // Limit to 4 actions
}

/**
 * Merge current design with updates
 */
function mergeDesigns(
  current: Partial<LayoutDesign>,
  updates: Partial<LayoutDesign>
): Partial<LayoutDesign> {
  // Deep merge utility
  const deepMerge = (
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> => {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(
          (target[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>
        );
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }

    return result;
  };

  return deepMerge(
    current as Record<string, unknown>,
    updates as Record<string, unknown>
  ) as Partial<LayoutDesign>;
}
