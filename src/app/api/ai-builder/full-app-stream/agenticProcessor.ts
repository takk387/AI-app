/**
 * Agentic validation processor for the full-app-stream route.
 * Runs Claude with tool-based validation during generation.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { runAgenticGeneration } from '@/utils/agenticCodeGeneration';
import type { StreamResult, SSEWriter } from './types';

interface AgenticProcessorParams {
  anthropic: Anthropic;
  modelName: string;
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tokenBudget: { max_tokens: number; thinking_budget: number };
  sse: SSEWriter;
}

/**
 * Run agentic generation with tool-based validation.
 * Returns the result or null if generation failed.
 */
export async function processAgentic(params: AgenticProcessorParams): Promise<StreamResult | null> {
  const { anthropic, modelName, systemPrompt, messages, tokenBudget, sse } = params;

  await sse.writeEvent({
    type: 'thinking',
    timestamp: Date.now(),
    message: 'Using agentic validation mode - AI will validate code during generation...',
  });

  try {
    const agenticResult = await runAgenticGeneration(anthropic, {
      maxToolIterations: 3,
      systemPrompt,
      messages,
      model: modelName,
      maxTokens: tokenBudget.max_tokens,
      thinkingBudget: tokenBudget.thinking_budget,
      onProgress: async (message) => {
        await sse.writeEvent({
          type: 'thinking',
          timestamp: Date.now(),
          message,
        });
      },
    });

    if (!agenticResult.success) {
      await sse.writeEvent({
        type: 'error',
        timestamp: Date.now(),
        message: agenticResult.error || 'Agentic generation failed',
        code: 'AGENTIC_ERROR',
        recoverable: true,
      });
      return null;
    }

    if (!agenticResult.responseText) {
      await sse.writeEvent({
        type: 'error',
        timestamp: Date.now(),
        message: 'No response from Claude',
        code: 'EMPTY_RESPONSE',
        recoverable: true,
      });
      return null;
    }

    return {
      responseText: agenticResult.responseText,
      inputTokens: agenticResult.inputTokens,
      outputTokens: agenticResult.outputTokens,
      cachedTokens: agenticResult.cachedTokens,
      agenticToolCalls: agenticResult.toolCallsMade,
    };
  } catch (agenticError) {
    console.error('Agentic generation error:', agenticError);
    await sse.writeEvent({
      type: 'error',
      timestamp: Date.now(),
      message: agenticError instanceof Error ? agenticError.message : 'Agentic generation failed',
      code: 'AGENTIC_ERROR',
      recoverable: false,
    });
    return null;
  }
}
