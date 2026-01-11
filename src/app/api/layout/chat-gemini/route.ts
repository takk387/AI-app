/**
 * Layout Builder Gemini-Only Chat - API Route
 *
 * Handles Gemini-only requests for visual/creative tasks.
 * Used when the intelligent router determines Claude is not needed:
 * - Color changes
 * - Vibe/style adjustments
 * - Simple visual analysis
 * - Screenshot analysis without cloning intent
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getGeminiLayoutService,
  type GeminiChatRequest,
  type GeminiChatResponse,
} from '@/services/GeminiLayoutService';
import type {
  LayoutDesign,
  LayoutChatRequest,
  SuggestedAction,
  DesignChange,
} from '@/types/layoutDesign';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedRequest = GeminiRequestSchema.parse(body);

    const { message, conversationHistory, currentDesign, previewScreenshot, referenceImages } =
      validatedRequest;

    // Check for Gemini API key
    const hasGeminiKey = !!process.env.GOOGLE_API_KEY;

    if (!hasGeminiKey) {
      // Fall back to a helpful message if Gemini is not configured
      return NextResponse.json({
        message:
          'Gemini is not configured. Please add GOOGLE_API_KEY to your environment variables to enable visual analysis features.',
        updatedDesign: currentDesign,
        suggestedActions: [],
        designChanges: [],
        tokensUsed: { input: 0, output: 0 },
        modelUsed: 'gemini' as const,
      });
    }

    // Collect all images
    const allImages: string[] = [];
    if (previewScreenshot) allImages.push(previewScreenshot);
    if (referenceImages) allImages.push(...referenceImages);

    // Use Gemini service
    const geminiService = getGeminiLayoutService();

    if (!geminiService.checkAvailability()) {
      return NextResponse.json({
        message: 'Gemini service is not available. Please check your GOOGLE_API_KEY configuration.',
        updatedDesign: currentDesign,
        suggestedActions: [],
        designChanges: [],
        tokensUsed: { input: 0, output: 0 },
        modelUsed: 'gemini' as const,
      });
    }

    // Build Gemini request
    const geminiRequest: GeminiChatRequest = {
      message,
      images: allImages,
      currentDesign: currentDesign as Record<string, unknown>,
      conversationHistory: conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    };

    // Call Gemini
    const geminiResponse: GeminiChatResponse = await geminiService.chat(geminiRequest);

    const duration = Date.now() - startTime;

    // Convert visual analysis to design updates if available
    let designUpdates: Partial<LayoutDesign> =
      (geminiResponse.designUpdates as Partial<LayoutDesign>) || {};

    // If Gemini returned a visual analysis (with colors, typography, etc.), convert it to design updates
    if (geminiResponse.analysis) {
      const analysis = geminiResponse.analysis;
      designUpdates = {
        ...designUpdates,
        globalStyles: {
          ...designUpdates.globalStyles,
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
      };
    }

    // Build response
    const response = {
      message: geminiResponse.message,
      updatedDesign:
        Object.keys(designUpdates).length > 0
          ? mergeDesigns(currentDesign as Partial<LayoutDesign>, designUpdates)
          : currentDesign,
      suggestedActions:
        (geminiResponse.suggestedActions?.map((a) => ({
          label: a.label,
          action: a.action,
        })) as SuggestedAction[]) || [],
      designChanges: [] as DesignChange[],
      tokensUsed: { input: 0, output: 0 }, // Gemini doesn't expose token counts the same way
      geminiAnalysis: geminiResponse.analysis,
      modelUsed: 'gemini' as const,
      duration,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Gemini chat error:', error);

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
 * Merge current design with updates
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
