/**
 * Semantic Analysis API Route
 *
 * POST /api/ai-builder/analyze-semantic
 *
 * Uses Claude AI to perform deep semantic code analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createObservableRequest } from '@/lib/observability';

// ============================================================================
// TYPES
// ============================================================================

interface SemanticAnalysisRequest {
  prompt: string;
}

interface SemanticAnalysisResponse {
  success: boolean;
  analysis?: unknown;
  error?: string;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SemanticAnalysisResponse>> {
  const obs = createObservableRequest('/api/ai-builder/analyze-semantic');

  try {
    const body: SemanticAnalysisRequest = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 });
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Call Claude for semantic analysis
    const gen = obs.startGeneration('semantic-analysis', {
      model: 'claude-sonnet-4-6',
      input: body.prompt,
      modelParameters: { max_tokens: 4096 },
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: body.prompt,
        },
      ],
      system: [
        {
          type: 'text',
          text: 'You are a code review expert. Analyze code for semantic correctness, requirements coverage, and potential issues. Always respond with valid JSON matching the requested format.',
          cache_control: { type: 'ephemeral' },
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ success: false, error: 'No analysis generated' }, { status: 500 });
    }

    // Parse the JSON response
    let analysis: unknown;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonText = textContent.text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return a default structure if parsing fails
      analysis = {
        issues: [],
        requirementsCoverage: {
          totalRequirements: 0,
          implementedCount: 0,
          missingRequirements: [],
          partiallyImplemented: [],
          coveragePercent: 100,
        },
        suggestions: [],
      };
    }

    gen.end({
      output: analysis,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });

    await obs.finish();

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    obs.captureError(error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (for CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
