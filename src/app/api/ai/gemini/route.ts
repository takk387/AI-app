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
import { createObservableRequest } from '@/lib/observability';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const obs = createObservableRequest('/api/ai/gemini');

  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    const { prompt, model } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const modelId = model ?? MODEL_IDS.GEMINI_PRO;

    const genAI = new GoogleGenAI({ apiKey });

    const gen = obs.startGeneration('gemini-proxy', {
      model: modelId,
      input: prompt,
    });

    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    const content = response.text ?? '';

    gen.end({
      output: content,
      usage: response.usageMetadata
        ? {
            input: response.usageMetadata.promptTokenCount ?? 0,
            output: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    });

    await obs.finish();

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
    obs.captureError(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gemini API call failed' },
      { status: 500 }
    );
  }
}
