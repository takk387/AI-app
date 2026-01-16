/**
 * Layout Builder Gemini-Only Chat - API Route
 *
 * Gemini-only architecture for the Layout Builder:
 * - Gemini handles visual analysis, color extraction, layout detection
 * - Gemini is the conversational AI users interact with
 * - Automatic application of detected components
 * - No Claude - simpler, faster, one clear voice
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiLayoutService, type VisualAnalysis } from '@/services/GeminiLayoutService';
import type {
  LayoutDesign,
  LayoutChatRequest,
  LayoutChatResponse,
  DesignChange,
  SuggestedAction,
  PageAnalysis,
  DetectedComponentEnhanced,
} from '@/types/layoutDesign';
import {
  mapGeminiLayoutToStructureType,
  mapStructureTypeToLayout,
} from '@/utils/layoutTypeMapping';
import { GEMINI_LAYOUT_BUILDER_SYSTEM_PROMPT } from '@/prompts/geminiLayoutBuilderPrompt';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GeminiOnlyResponse extends LayoutChatResponse {
  geminiAnalysis?: VisualAnalysis | PageAnalysis;
  modelUsed: 'gemini';
  componentCount?: number;
  autoApplied?: boolean;
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const GeminiRequestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.any()).optional().default([]),
  currentDesign: z.record(z.string(), z.any()).optional().default({}),
  selectedElement: z.string().optional(),
  previewScreenshot: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  memoriesContext: z.string().optional(),
  workflowState: z.any().optional(),
  currentDevice: z.enum(['mobile', 'tablet', 'desktop']).optional(),
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedRequest = GeminiRequestSchema.parse(body);

    const { message, currentDesign, previewScreenshot, referenceImages } = validatedRequest;

    // Check for Gemini API key
    const hasGeminiKey = !!process.env.GOOGLE_API_KEY;

    if (!hasGeminiKey) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY not configured' }, { status: 500 });
    }

    // Collect images - prioritize reference images for color extraction
    const allImages: string[] = [];
    if (referenceImages && referenceImages.length > 0) {
      allImages.push(...referenceImages);
    } else if (previewScreenshot) {
      allImages.push(previewScreenshot);
    }

    const hasImages = allImages.length > 0;
    const hasReferenceImages = referenceImages && referenceImages.length > 0;

    // =========================================================================
    // GEMINI VISUAL ANALYSIS & CONVERSATION
    // =========================================================================

    let geminiAnalysis: VisualAnalysis | PageAnalysis | undefined;
    let geminiMessage: string;
    let updatedDesign: Partial<LayoutDesign> = {};
    let designChanges: DesignChange[] = [];
    let suggestedActions: SuggestedAction[] = [];
    let componentCount = 0;
    let autoApplied = false;

    const geminiService = getGeminiLayoutService();

    // Use conversational chat if no images (natural language interaction)
    if (!hasImages && geminiService.checkAvailability()) {
      try {
        const chatResponse = await geminiService.chat({
          message,
          currentDesign: currentDesign as Record<string, unknown>,
          conversationHistory: validatedRequest.conversationHistory,
        });

        geminiMessage = chatResponse.message;

        if (chatResponse.designUpdates) {
          updatedDesign = chatResponse.designUpdates as Partial<LayoutDesign>;
          designChanges = [
            {
              property: 'design',
              oldValue: undefined,
              newValue: JSON.stringify(chatResponse.designUpdates),
              reason: 'Updated from conversation',
            },
          ];
        }

        if (chatResponse.suggestedActions) {
          suggestedActions = chatResponse.suggestedActions;
        }
      } catch (error) {
        console.error('[Gemini-Only] Chat failed:', error);
        geminiMessage = 'I encountered an issue processing your request. Please try again.';
      }
    } else if (hasImages && geminiService.checkAvailability()) {
      try {
        const imageToAnalyze = allImages[0];
        const isReferenceImage = hasReferenceImages;

        console.log(
          `[Gemini-Only] Analyzing ${isReferenceImage ? 'reference image' : 'preview screenshot'}`
        );

        // Use analyzePageEnhanced for reference images (precise bounds for replication)
        if (isReferenceImage) {
          geminiAnalysis = await geminiService.analyzePageEnhanced(imageToAnalyze);
          componentCount = geminiAnalysis.components?.length || 0;

          // AUTOMATIC APPLICATION: Reference images are auto-applied
          const geminiDesignUpdates = convertGeminiToDesignUpdates(geminiAnalysis);
          updatedDesign = geminiDesignUpdates.updates;
          designChanges = geminiDesignUpdates.changes;
          autoApplied = true;

          // Build user-friendly message
          geminiMessage = buildAutoAppliedMessage(geminiAnalysis, componentCount);

          console.log(
            `[Gemini-Only] ✅ Auto-applied ${componentCount} components from reference image`
          );
        } else {
          // Preview screenshot - analyze for context
          geminiAnalysis = await geminiService.analyzeScreenshot(imageToAnalyze);
          geminiMessage = buildGeminiSummary(geminiAnalysis);
        }

        // Generate suggested actions
        suggestedActions = generateSuggestedActions(message, geminiAnalysis);
      } catch (geminiError) {
        console.error('[Gemini-Only] Analysis failed:', geminiError);
        geminiMessage =
          'I encountered an issue analyzing the image. Please try again or describe what you need.';
      }
    } else {
      // No images - conversational response
      geminiMessage = `I'm ready to help you build your layout! You can:

- Upload a reference image and I'll replicate the exact design
- Describe what you want ("create a modern dashboard layout")
- Ask me to modify specific elements ("make the header blue")
- Request design improvements ("add more spacing")

What would you like to create?`;
    }

    // Merge with current design
    const mergedDesign = mergeDesigns(currentDesign as Partial<LayoutDesign>, updatedDesign);

    // CRITICAL: Force Gemini's colors and structure if analysis exists
    if (geminiAnalysis) {
      const geminiDesignUpdates = convertGeminiToDesignUpdates(geminiAnalysis);

      // Force Gemini's colors (bypass any merge issues)
      const geminiColors = geminiDesignUpdates.updates.globalStyles?.colors;
      if (geminiColors && mergedDesign.globalStyles) {
        mergedDesign.globalStyles.colors = geminiColors;
      }

      // Force Gemini's structure
      const geminiStructure = geminiDesignUpdates.updates.structure;
      if (geminiStructure) {
        mergedDesign.structure = {
          ...mergedDesign.structure,
          ...geminiStructure,
        };

        // Sync basePreferences.layout with structure.type
        if (geminiStructure.type && mergedDesign.basePreferences) {
          mergedDesign.basePreferences.layout = mapStructureTypeToLayout(geminiStructure.type);
        }
      }
    }

    // Debug logging
    console.log('[Gemini-Only] Response:', {
      hasGeminiAnalysis: !!geminiAnalysis,
      componentCount,
      autoApplied,
      finalColors: mergedDesign.globalStyles?.colors?.primary,
      finalStructure: mergedDesign.structure?.type,
    });

    const duration = Date.now() - startTime;

    const response: GeminiOnlyResponse = {
      message: geminiMessage,
      updatedDesign: mergedDesign,
      suggestedActions,
      designChanges,
      tokensUsed: { input: 0, output: 0 }, // Gemini doesn't expose token counts
      geminiAnalysis,
      modelUsed: 'gemini',
      componentCount,
      autoApplied,
    };

    console.log(`[Gemini-Only] Request completed in ${duration}ms`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Gemini-Only] Error:', error);

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
 * Build auto-applied message for reference images
 */
function buildAutoAppliedMessage(
  analysis: VisualAnalysis | PageAnalysis,
  componentCount: number
): string {
  const parts: string[] = [];

  parts.push(`✅ **I've created your layout!**`);
  parts.push(`\nDetected **${componentCount} components** and applied the complete design:`);

  if (analysis.colorPalette) {
    parts.push(
      `\n🎨 **Colors extracted:**\n` +
        `- Primary: ${analysis.colorPalette.primary}\n` +
        `- Background: ${analysis.colorPalette.background}\n` +
        `- Text: ${analysis.colorPalette.text}`
    );
  }

  if (analysis.components?.length > 0) {
    const componentTypes = [...new Set(analysis.components.map((c) => c.type))].filter(
      (t) => t !== 'unknown'
    );
    if (componentTypes.length > 0) {
      parts.push(`\n📦 **Components:** ${componentTypes.join(', ')}`);
    }
  }

  parts.push(
    `\n💡 The layout is now live in the preview! You can refine it by asking me to adjust colors, spacing, or add/remove components.`
  );

  return parts.join('\n');
}

/**
 * Build summary message for non-reference analysis
 */
function buildGeminiSummary(analysis: VisualAnalysis | PageAnalysis): string {
  const parts: string[] = [];

  parts.push(`I analyzed the design and detected a **${analysis.layoutType}** layout.`);

  if (analysis.vibe) {
    parts.push(`\nThe overall vibe is: "${analysis.vibe}"`);
  }

  if (analysis.colorPalette) {
    parts.push(
      `\n🎨 **Color palette:**\n` +
        `- Primary: ${analysis.colorPalette.primary}\n` +
        `- Secondary: ${analysis.colorPalette.secondary}\n` +
        `- Background: ${analysis.colorPalette.background}`
    );
  }

  if (analysis.components?.length > 0) {
    const componentTypes = analysis.components.map((c) => c.type).filter((t) => t !== 'unknown');
    if (componentTypes.length > 0) {
      parts.push(`\n📦 **Detected components:** ${componentTypes.join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Convert Gemini's visual analysis to design updates
 */
function convertGeminiToDesignUpdates(analysis: VisualAnalysis | PageAnalysis): {
  updates: Partial<LayoutDesign>;
  changes: DesignChange[];
} {
  // Detect structure from components
  const hasHeader = analysis.components?.some((c) => c.type === 'header') ?? false;
  const hasSidebar = analysis.components?.some((c) => c.type === 'sidebar') ?? false;
  const hasFooter = analysis.components?.some((c) => c.type === 'footer') ?? false;

  // Determine sidebar position
  const sidebarComponent = analysis.components?.find((c) => c.type === 'sidebar');
  let sidebarPosition: 'left' | 'right' = 'left';
  if (sidebarComponent) {
    if ('bounds' in sidebarComponent && sidebarComponent.bounds) {
      sidebarPosition = sidebarComponent.bounds.left > 50 ? 'right' : 'left';
    } else if ('position' in sidebarComponent && sidebarComponent.position) {
      sidebarPosition = sidebarComponent.position.area === 'right' ? 'right' : 'left';
    }
  }

  // Map layoutType to structure type
  const structureType = mapGeminiLayoutToStructureType(analysis.layoutType);

  // Extract detected components for DynamicLayoutRenderer
  let detectedComponents: DetectedComponentEnhanced[] | undefined;
  if (analysis.components && analysis.components.length > 0) {
    const firstComponent = analysis.components[0];
    if ('bounds' in firstComponent && firstComponent.bounds) {
      detectedComponents = analysis.components as DetectedComponentEnhanced[];
      console.log(
        `[convertGeminiToDesignUpdates] Including ${detectedComponents.length} components with bounds`
      );
    }
  }

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
        border: analysis.colorPalette.textMuted,
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
    structure: {
      type: structureType,
      hasHeader,
      hasSidebar,
      hasFooter,
      sidebarPosition,
      headerType: 'sticky' as const,
      contentLayout: 'centered' as const,
      mainContentWidth: 'standard' as const,
      detectedComponents,
    },
  };

  const componentCount = detectedComponents?.length || 0;

  const changes: DesignChange[] = [
    {
      property: 'globalStyles.colors',
      oldValue: undefined,
      newValue: JSON.stringify(updates.globalStyles?.colors),
      reason: 'Extracted from visual analysis',
    },
    {
      property: 'structure',
      oldValue: undefined,
      newValue: JSON.stringify(updates.structure),
      reason: `Layout structure detected: ${structureType} with ${componentCount} components`,
    },
  ];

  return { updates, changes };
}

/**
 * Generate suggested actions
 */
function generateSuggestedActions(
  message: string,
  analysis?: VisualAnalysis | PageAnalysis
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  if (analysis) {
    actions.push({
      label: 'Refine colors',
      action: `Adjust the color palette`,
    });

    actions.push({
      label: 'Adjust spacing',
      action: `Modify spacing and density`,
    });

    if (analysis.components && analysis.components.length > 0) {
      actions.push({
        label: 'Add components',
        action: `Add more UI components`,
      });
    }
  }

  // Contextual actions based on message
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('dark')) {
    actions.push({
      label: 'Enable dark mode',
      action: 'Switch to dark color scheme',
    });
  }

  return actions.slice(0, 4);
}

/**
 * Merge designs
 */
function mergeDesigns(
  current: Partial<LayoutDesign>,
  updates: Partial<LayoutDesign>
): Partial<LayoutDesign> {
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
