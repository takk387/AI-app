/**
 * Vision Document Generator - API Route
 *
 * Parallel non-blocking endpoint that progressively builds a VisionBoard-format
 * Vision Document from the wizard conversation. Fires alongside (not instead of)
 * the main wizard chat call.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { VisionDocument } from '@/types/wizardState';

// Vercel serverless function config
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

interface VisionRequest {
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentVision: VisionDocument | null;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const VISION_EXTRACTION_PROMPT = `You are a Product Visionary analyzing a planning conversation to build a rich Vision Document (PRD).

Your task: read the conversation and produce a comprehensive, specification-grade vision document. Every field should be detailed enough that a developer could build the product without asking clarifying questions.

### Output Standards

- **overview**: 2-4 paragraphs. The product's soul — what it is, why it exists, who it's for, what makes it special.
- **corePurpose**: The core problem being solved and why this solution matters. Be specific, not generic.
- **targetAudience**: Real personas with pain points, behaviors, and goals. Not just demographic labels.
- **competitiveEdge**: What makes this different. Be concrete.
- **features**: Each feature MUST include ALL of:
  - **id**: A stable identifier like "f1", "f2", etc.
  - **title**: Clear feature name
  - **userStory**: "As a [persona], I want to [action] so that [benefit]."
  - **description**: 3-5 sentences. What it does, how the user interacts with it, what information is displayed.
  - **behavior**: Every state described — initial load, active use, empty state, loading state, error state, success state. Mention animations and feedback.
  - **acceptanceCriteria**: 3-5 specific, testable items.
  - **edgeCases**: No data, invalid input, network failure, long text, rapid clicks.
  - **uxNotes**: How it should FEEL. Microinteractions, pacing, personality.
  - **complexityLevel**: "low", "medium", or "high"
- **userFlow**: A complete narrative journey through the app from first visit to key actions.
- **pageBreakdown**: Every page/screen with its sections, content, and layout described.
- **designMood**: Color palette mood, typography personality, spacing philosophy, animation style.

### Rules

- NEVER mention specific tools, products, libraries, APIs, or brand names. Describe capabilities, not implementations.
- NEVER discuss technical implementation (databases, frameworks, APIs).
- NEVER produce thin one-liner descriptions. If a feature description is less than 3 sentences, it's too short.
- Only include information grounded in what was actually discussed. Infer reasonable detail from context, but don't fabricate features not implied by the conversation.

### Response Format

Return ONLY a JSON object with a "visionUpdate" key containing the document fields. Include only fields you can meaningfully populate from the conversation. Omit fields that don't have enough context yet.

Example:
{
  "visionUpdate": {
    "name": "AppName",
    "overview": "...",
    "features": [...]
  }
}`;

// ============================================================================
// RESPONSE PARSING (3-tier, adapted from VisionBoard)
// ============================================================================

function parseVisionResponse(text: string): Partial<VisionDocument> {
  // Tier 1: Full JSON parse
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      const parsed = JSON.parse(jsonStr);
      return parsed.visionUpdate || parsed;
    }
  } catch {
    console.warn('[generate-vision] Full JSON parse failed, trying extraction...');
  }

  // Tier 2: Extract visionUpdate with brace balancing
  try {
    const visionMatch = text.match(/"visionUpdate"\s*:\s*(\{[\s\S]*)/);
    if (visionMatch) {
      const visionStr = visionMatch[1];
      let depth = 0;
      let validEnd = -1;
      for (let i = 0; i < visionStr.length; i++) {
        if (visionStr[i] === '{') depth++;
        if (visionStr[i] === '}') {
          depth--;
          if (depth === 0) {
            validEnd = i;
            break;
          }
        }
      }
      if (validEnd > 0) {
        return JSON.parse(visionStr.substring(0, validEnd + 1));
      }
    }
  } catch {
    console.warn('[generate-vision] Brace-balanced extraction failed.');
  }

  // Tier 3: Return empty — don't corrupt existing data
  console.warn('[generate-vision] All parsing tiers failed. Returning empty update.');
  return {};
}

// ============================================================================
// MERGE LOGIC
// ============================================================================

function mergeVisionDocument(
  current: VisionDocument | null,
  update: Partial<VisionDocument>
): VisionDocument {
  const base: VisionDocument = current || { features: [] };

  // Merge features by id: update existing, add new, keep unmentioned
  let mergedFeatures = [...base.features];
  if (update.features && update.features.length > 0) {
    for (const newFeat of update.features) {
      const existingIdx = mergedFeatures.findIndex((f) => f.id === newFeat.id);
      if (existingIdx >= 0) {
        mergedFeatures[existingIdx] = newFeat;
      } else {
        mergedFeatures.push(newFeat);
      }
    }
  }

  return {
    name: update.name ?? base.name,
    overview: update.overview ?? base.overview,
    corePurpose: update.corePurpose ?? base.corePurpose,
    targetAudience: update.targetAudience ?? base.targetAudience,
    competitiveEdge: update.competitiveEdge ?? base.competitiveEdge,
    features: mergedFeatures,
    userFlow: update.userFlow ?? base.userFlow,
    pageBreakdown: update.pageBreakdown ?? base.pageBreakdown,
    designMood: update.designMood ?? base.designMood,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: VisionRequest = await request.json();
    const { conversationHistory, currentVision } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    // Gate: only process if we have meaningful conversation
    if (!conversationHistory || conversationHistory.length < 4) {
      return NextResponse.json({
        visionDocument: currentVision || { features: [] },
        updated: false,
      });
    }

    // Build conversation context for the extraction
    const conversationText = conversationHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const visionContext = currentVision
      ? `\n\n### Current Vision Document State\n${JSON.stringify(currentVision, null, 2)}`
      : '\n\n### Current Vision Document State\n(Empty - Build from scratch)';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      temperature: 0.7,
      system: VISION_EXTRACTION_PROMPT + visionContext,
      messages: [
        {
          role: 'user',
          content: `Analyze this planning conversation and produce/update the Vision Document.\n\nCONVERSATION:\n${conversationText}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const rawText = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    const visionUpdate = parseVisionResponse(rawText);
    const mergedDocument = mergeVisionDocument(currentVision, visionUpdate);

    return NextResponse.json({
      visionDocument: mergedDocument,
      updated: true,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('[generate-vision] Error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate vision document',
      },
      { status: 500 }
    );
  }
}
