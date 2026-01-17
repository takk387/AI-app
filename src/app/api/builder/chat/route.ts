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
  contextSummary?: string; // Compressed context from older messages
  currentAppState?: CurrentAppState;
  image?: string; // Base64 encoded image
  hasImage?: boolean;
  hasAppConcept?: boolean; // Indicates if an appConcept exists
  hasPhasePlan?: boolean; // Indicates if a phase plan exists
}

interface BuilderResponse {
  message: string;
  responseType: ResponseType;
  shouldTriggerBuild: boolean;
  shouldTriggerModify: boolean;
  shouldTriggerDesign: boolean;
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
  hasCurrentApp: boolean,
  hasConceptReady: boolean = false
): {
  responseType: ResponseType;
  shouldTriggerBuild: boolean;
  shouldTriggerModify: boolean;
  shouldTriggerDesign: boolean;
} {
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
      shouldTriggerDesign: false,
    };
  }

  // Check if response contains code blocks (indicates build/modify)
  const hasCodeBlocks = aiResponse.includes('```');

  // Context-aware: if user has a concept ready and confirms, trigger build
  const isSimpleConfirmation =
    /^(yes|yep|yeah|sure|ok|okay|go|do it|sounds good|perfect|great|ready|let's go|build it|let's build|make it|create it)$/i.test(
      userMessage.trim()
    );
  if (hasConceptReady && isSimpleConfirmation) {
    return {
      responseType: RESPONSE_TYPES.BUILD,
      shouldTriggerBuild: true,
      shouldTriggerModify: false,
      shouldTriggerDesign: false,
    };
  }

  // Check for explicit build indicators in user message
  const buildPatterns = [
    // Direct build commands (removed restrictive $ anchors)
    /^(build|create|make|generate)\s+(it|this|that)/i,
    /^(build|create|make|generate)\s+(me\s+)?(a|an|the)?\s+/i,
    /^(give me|show me)\s+(a|an)?\s*(new\s+)?(app|component|page)/i,
    /^(implement|start)\s+(it|this|that|the\s+plan|building)/i,

    // Simple confirmations (removed $ anchor so "yes, build it" works)
    /^(go|do\s+it|let'?s\s+go|let'?s\s+build|yes|yep|yeah|sure|ok|okay)/i,

    // Natural language confirmations with build intent
    /(yes|yep|yeah|sure|ok|okay|sounds good|perfect|great|exactly).*(build|create|make|generate|do it|go ahead)/i,
    /(build|create|make|generate).*(yes|please|now|for me|that)/i,

    // Affirmative responses to "Ready to build?" prompts
    /^(i'?m ready|ready to|let'?s do|go for it|start building|make it|do it)/i,

    // Confirmations that indicate approval
    /^(that'?s|this is).*(what i want|perfect|exactly|right)/i,
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
      shouldTriggerDesign: false,
    };
  }

  // If response has code and user asked for modification
  if (hasCodeBlocks && isModification) {
    return {
      responseType: RESPONSE_TYPES.MODIFY,
      shouldTriggerBuild: false,
      shouldTriggerModify: true,
      shouldTriggerDesign: false,
    };
  }

  // Check for design/layout modification requests (only if not build or modify)
  // Design requests are visual changes: colors, fonts, spacing, effects, etc.
  const designPatterns = [
    /^(change|update|fix|make|adjust)\s+(the\s+)?(color|font|background|shadow|spacing|border|style|header|footer|sidebar|card|button)/i,
    /(more|less)\s+(rounded|subtle|dark|light|spacious|compact|bold|soft)/i,
    /change\s+.*\s+to\s+#[0-9A-Fa-f]{3,6}/i, // "change X to #color"
    /(glassmorphism|neumorphism|gradient|animation|effect|hover\s+effect)/i,
    /subtler|bolder|darker|lighter|bigger|smaller/i,
    /(increase|decrease|reduce)\s+(the\s+)?(font\s+size|padding|margin|spacing|gap|border|shadow|opacity)/i,
    /make\s+(it|the|this)\s+(look|appear|feel)\s+(more|less)/i,
    /(add|remove|apply)\s+(a\s+)?(shadow|border|gradient|animation|effect|glow|blur)/i,
  ];
  const isDesignRequest =
    hasCurrentApp &&
    !isExplicitBuild &&
    !isModification &&
    designPatterns.some((p) => p.test(userMessage.trim()));

  if (isDesignRequest) {
    return {
      responseType: RESPONSE_TYPES.DESIGN,
      shouldTriggerBuild: false,
      shouldTriggerModify: false,
      shouldTriggerDesign: true,
    };
  }

  // Default to question (conversational response)
  return {
    responseType: RESPONSE_TYPES.QUESTION,
    shouldTriggerBuild: false,
    shouldTriggerModify: false,
    shouldTriggerDesign: false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: BuilderRequest = await request.json();
    const { message, conversationHistory, contextSummary, currentAppState, image, hasImage } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    // Build system prompt with app context
    const appContext = generateBuilderContext(currentAppState || null);
    const fullSystemPrompt = BUILDER_EXPERT_PROMPT + appContext;

    // Build conversation messages
    const messages: Anthropic.MessageParam[] = [];

    // Add compressed context summary if available (provides context from older messages)
    if (contextSummary) {
      messages.push({
        role: 'user',
        content: `[Context from earlier conversation]\n${contextSummary}`,
      });
      messages.push({
        role: 'assistant',
        content: 'I understand the context from the earlier conversation. How can I help you now?',
      });
    }

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
    const hasConceptReady = !!(body.hasAppConcept || body.hasPhasePlan);
    const { responseType, shouldTriggerBuild, shouldTriggerModify, shouldTriggerDesign } =
      analyzeResponseType(message, assistantMessage, hasCurrentApp, hasConceptReady);

    const result: BuilderResponse = {
      message: assistantMessage,
      responseType,
      shouldTriggerBuild,
      shouldTriggerModify,
      shouldTriggerDesign,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };

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
