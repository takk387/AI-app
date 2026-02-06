/**
 * Claude AI Proxy Route
 *
 * Generic Claude API proxy for the Dual AI Planning system.
 * Supports standard and extended thinking modes.
 *
 * POST: { prompt, model?, extendedThinking? } → { content, model, usage? }
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL_IDS } from '@/constants/aiModels';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const { prompt, model, extendedThinking } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const modelId = model ?? MODEL_IDS.CLAUDE_OPUS;

    // Build message parameters
    const params: Anthropic.MessageCreateParams = {
      model: modelId,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    };

    // Extended thinking requires temperature=1 and thinking config
    if (extendedThinking) {
      params.temperature = 1;
      params.thinking = {
        type: 'enabled',
        budget_tokens: 10000,
      };
    }

    const response = await anthropic.messages.create(params);

    // Extract text content (skip thinking blocks)
    let content = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }

    return NextResponse.json({
      content,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('[ai/claude] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Claude API call failed' },
      { status: 500 }
    );
  }
}
