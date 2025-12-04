/**
 * Builder Expert Chat - ACT Mode API Route
 *
 * Handles intelligent conversations in ACT mode using:
 * - Extended thinking for deep reasoning
 * - Intent detection (question vs build vs modify)
 * - Accuracy-focused responses
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  BUILDER_EXPERT_PROMPT,
  generateBuilderContext,
  RESPONSE_TYPES,
  type ResponseType,
} from '@/prompts/builderExpertPrompt';

// Railway serverless function config
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

interface CurrentAppState {
  name?: string;
  files?: Array<{ path: string; content: string }>;
  appType?: string;
}

interface BuilderRequest {
  message: string;
  conversationHistory: BuilderMessage[];
  currentAppState?: CurrentAppState;
  image?: string; // Base64 encoded image
  hasImage?: boolean;
}

interface BuilderResponse {
  message: string;
  responseType: ResponseType;
  shouldTriggerBuild: boolean;
  shouldTriggerModify: boolean;
  tokensUsed: {
    input: number;
    output: number;
  };
}

// ============================================================================
// INTENT ANALYSIS
// ============================================================================

/**
 * Analyze the AI's response to determine the response type
 */
function analyzeResponseType(
  userMessage: string,
  aiResponse: string,
  hasCurrentApp: boolean
): { responseType: ResponseType; shouldTriggerBuild: boolean; shouldTriggerModify: boolean } {
  const lowerUser = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();

  // Check if AI is asking for clarification
  if (
    lowerResponse.includes('would you like me to') ||
    lowerResponse.includes('do you want me to') ||
    lowerResponse.includes('should i') ||
    lowerResponse.includes('let me know if')
  ) {
    return {
      responseType: RESPONSE_TYPES.CLARIFY,
      shouldTriggerBuild: false,
      shouldTriggerModify: false,
    };
  }

  // Check if response contains code blocks (indicates build/modify)
  const hasCodeBlocks = aiResponse.includes('```');

  // Check for explicit build indicators in user message
  const buildPatterns = [
    /^(build|create|make|generate)\s+(me\s+)?(a|an|the)?\s*/i,
    /^(give me|show me)\s+(a|an)?\s*(new\s+)?(app|component|page)/i,
  ];
  const isExplicitBuild = buildPatterns.some((p) => p.test(userMessage.trim()));

  // Check for modification indicators
  const modifyPatterns = [
    /^(change|update|fix|modify|edit|add|remove|delete)\s/i,
    /(change|update|fix|modify)\s+(the|this|my)/i,
  ];
  const isModification = hasCurrentApp && modifyPatterns.some((p) => p.test(userMessage.trim()));

  // If response has substantial code and user asked for build
  if (hasCodeBlocks && isExplicitBuild) {
    return {
      responseType: RESPONSE_TYPES.BUILD,
      shouldTriggerBuild: true,
      shouldTriggerModify: false,
    };
  }

  // If response has code and user asked for modification
  if (hasCodeBlocks && isModification) {
    return {
      responseType: RESPONSE_TYPES.MODIFY,
      shouldTriggerBuild: false,
      shouldTriggerModify: true,
    };
  }

  // Default to question (conversational response)
  return {
    responseType: RESPONSE_TYPES.QUESTION,
    shouldTriggerBuild: false,
    shouldTriggerModify: false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: BuilderRequest = await request.json();
    const { message, conversationHistory, currentAppState, image, hasImage } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Build system prompt with app context
    const appContext = generateBuilderContext(currentAppState || null);
    const fullSystemPrompt = BUILDER_EXPERT_PROMPT + appContext;

    // Build conversation messages
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message (with image if provided)
    if (hasImage && image) {
      const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (imageMatch) {
        const mediaType = imageMatch[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        const base64Data = imageMatch[2];

        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: message,
            },
          ],
        });
      } else {
        messages.push({ role: 'user', content: message });
      }
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Call Claude API with extended thinking for deep reasoning
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      temperature: 1, // Required for extended thinking
      thinking: {
        type: 'enabled',
        budget_tokens: 8000, // Deep reasoning for accurate intent detection
      },
      system: [
        {
          type: 'text',
          text: fullSystemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    // Extract response text (skip thinking blocks)
    const textBlock = response.content.find((block) => block.type === 'text');
    const assistantMessage = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    if (!assistantMessage) {
      throw new Error('No response from Claude');
    }

    // Analyze response type
    const hasCurrentApp = !!(currentAppState?.files && currentAppState.files.length > 0);
    const { responseType, shouldTriggerBuild, shouldTriggerModify } = analyzeResponseType(
      message,
      assistantMessage,
      hasCurrentApp
    );

    const result: BuilderResponse = {
      message: assistantMessage,
      responseType,
      shouldTriggerBuild,
      shouldTriggerModify,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };

    console.log(
      `Builder chat response in ${Date.now() - startTime}ms (${response.usage.input_tokens} in, ${response.usage.output_tokens} out) - Type: ${responseType}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Builder chat error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process builder message',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Return builder configuration
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Builder Expert Chat',
    version: '1.0',
    description: 'AI-powered ACT mode with intelligent intent detection',
    features: [
      'Extended thinking for deep reasoning',
      'Intent detection (question vs build vs modify)',
      'Accuracy-focused responses',
      'Context-aware conversations',
      'Image support for visual references',
    ],
    responseTypes: RESPONSE_TYPES,
  });
}
