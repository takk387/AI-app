/**
 * Gemini AI Proxy Route
 *
 * Generic Gemini API proxy for the Dual AI Planning system.
 *
 * POST: { prompt, model? } → { content, model, usage? }
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { MODEL_IDS } from '@/constants/aiModels';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 });
    }

    const { prompt, model } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const modelId = model ?? MODEL_IDS.GEMINI_PRO;

    const genAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    const content = response.text ?? '';

    return NextResponse.json({
      content,
      model: modelId,
      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    });
  } catch (error) {
    console.error('[ai/gemini] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gemini API call failed' },
      { status: 500 }
    );
  }
}
