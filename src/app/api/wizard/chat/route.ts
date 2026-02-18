/**
 * Natural Conversation Wizard - API Route
 *
 * Handles the AI-powered planning conversation using Claude.
 * Unlike the old wizard, this uses actual AI responses, not hardcoded templates.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { WIZARD_SYSTEM_PROMPT } from '@/prompts/wizardSystemPrompt';
import type { WizardState } from '@/types/wizardState';

// Vercel serverless function config
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

interface WizardMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface WizardRequest {
  message: string;
  conversationHistory: WizardMessage[];
  currentState: WizardState;
  referenceImages?: string[]; // Base64 encoded images
  contextSummary?: string; // Compressed summary of older conversation messages
}

interface WizardResponse {
  message: string;
  updatedState: WizardState;
  suggestedActions?: Array<{
    label: string;
    action: string;
  }>;
  isConceptComplete: boolean;
  hadCodeStripped?: boolean;
  tokensUsed: {
    input: number;
    output: number;
  };
}

// ============================================================================
// CODE STRIPPING (Safety Net)
// ============================================================================

/**
 * Strip any code blocks from PLAN mode responses
 * This is a safety net in case the AI generates code despite prompt constraints
 */
function stripCodeBlocks(text: string): string {
  let cleaned = text;

  // Remove fenced code blocks (```...```)
  cleaned = cleaned.replace(
    /```[\s\S]*?```/g,
    '[Code removed - code generation happens after planning]'
  );

  // Remove <create_files> XML blocks
  cleaned = cleaned.replace(/<create_files>[\s\S]*?<\/create_files>/g, '[Code removed]');

  // Remove <file> XML blocks
  cleaned = cleaned.replace(/<file[\s\S]*?<\/file>/g, '[Code removed]');

  // Remove self-closing component-like XML that looks like JSX (but keep normal markdown/text)
  // Only remove if it looks like a React component pattern
  cleaned = cleaned.replace(/<[A-Z][a-zA-Z]*\s+[\s\S]*?\/>/g, '[Component removed]');

  return cleaned;
}

// ============================================================================
// STATE EXTRACTION
// ============================================================================

/**
 * Extract app concept information from the conversation
 * This uses Claude to analyze the conversation and update the state
 */
async function extractStateFromConversation(
  conversationHistory: WizardMessage[],
  currentState: WizardState
): Promise<WizardState> {
  // Only extract if we have meaningful conversation
  if (conversationHistory.length < 4) {
    return currentState;
  }

  const extractionPrompt = `Analyze this conversation and extract the app concept information discussed. Return a JSON object with the following structure:

{
  "name": "app name if mentioned, or null",
  "description": "one sentence description if clear, or null",
  "purpose": "what problem it solves if discussed, or null",
  "targetUsers": "who uses it if discussed, or null",
  "features": [
    {"name": "feature name", "description": "what it does", "priority": "high|medium|low"}
  ],
  "technical": {
    "needsAuth": true or false or null,
    "authType": "email|phone|oauth" or null,
    "needsDatabase": true or false or null,
    "needsRealtime": true or false or null,
    "needsFileUpload": true or false or null,
    "needsAPI": true or false or null
  },
  "roles": [
    {"name": "role name", "capabilities": ["what they can do"]}
  ],
  "isComplete": true if all major areas covered, false otherwise
}

IMPORTANT for "technical" fields:
- Use true ONLY if the user explicitly said they NEED this feature (e.g., "I need login", "users should authenticate")
- Use false ONLY if the user explicitly said they DON'T need this feature (e.g., "no auth needed", "doesn't need a database", "local storage only")
- Use null if the topic hasn't been discussed yet or is unclear

Only include information that was explicitly discussed. Use null for anything not yet determined.

CONVERSATION:
${conversationHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

Return ONLY the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      // Clean up the response - remove markdown code blocks if present
      let jsonText = textBlock.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText
          .replace(/```json?\n?/g, '')
          .replace(/```$/g, '')
          .trim();
      }

      const extracted = JSON.parse(jsonText);

      // Merge with current state, preferring new information
      return {
        name: extracted.name || currentState.name,
        description: extracted.description || currentState.description,
        purpose: extracted.purpose || currentState.purpose,
        targetUsers: extracted.targetUsers || currentState.targetUsers,
        features: extracted.features?.length > 0 ? extracted.features : currentState.features,
        technical: { ...currentState.technical, ...extracted.technical },
        uiPreferences: currentState.uiPreferences,
        roles: extracted.roles?.length > 0 ? extracted.roles : currentState.roles,
        isComplete: extracted.isComplete || false,
        readyForPhases: currentState.readyForPhases,
      };
    }
  } catch (error) {
    console.error('State extraction error:', error);
  }

  return currentState;
}

/**
 * Check if the user is confirming completion
 */
function isConfirmingCompletion(message: string): boolean {
  const confirmPatterns = [
    /yes.*ready/i,
    /looks? good/i,
    /that'?s? (correct|right|everything)/i,
    /confirmed?/i,
    /let'?s? (build|start|go|proceed)/i,
    /generate.*phases?/i,
    /create.*plan/i,
    /ready to build/i,
  ];

  return confirmPatterns.some((pattern) => pattern.test(message));
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: WizardRequest = await request.json();
    const { message, conversationHistory, currentState, referenceImages, contextSummary } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured',
        },
        { status: 500 }
      );
    }

    // Build conversation messages for Claude
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message (with images if provided)
    if (referenceImages && referenceImages.length > 0) {
      const content: Anthropic.ContentBlockParam[] = [];

      // Add images first
      for (const imageData of referenceImages) {
        // Extract base64 data and media type
        const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: match[2],
            },
          });
        }
      }

      // Add text message
      content.push({ type: 'text', text: message });

      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Build system prompt with context
    let systemPrompt = WIZARD_SYSTEM_PROMPT;

    // Add compressed conversation summary if provided (for large conversations)
    if (contextSummary) {
      systemPrompt += `

## CONVERSATION HISTORY SUMMARY

The following is a compressed summary of the earlier conversation. Use this context to maintain continuity:

${contextSummary}

---
`;
    }

    // Add current state context if we have gathered information
    // We frame this as "background notes" so the AI doesn't feel compelled to repeat it
    if (currentState.name || currentState.features.length > 0 || currentState.roles) {
      const stateContext = `

## BACKGROUND CONTEXT (Auto-extracted state)

These are notes on what has been identified so far. Use this for consistency, but do not recite it back to the user unless asked.

${currentState.name ? `- Name: ${currentState.name}` : ''}
${currentState.description ? `- Desc: ${currentState.description}` : ''}
${currentState.targetUsers ? `- Users: ${currentState.targetUsers}` : ''}
${currentState.features.length > 0 ? `- Features: ${currentState.features.length} identified` : ''}
${Object.keys(currentState.technical).length > 0 ? `- Tech: ${Object.keys(currentState.technical).length} decisions made` : ''}

Continue the conversation naturally.`;

      systemPrompt += stateContext;
    }

    // Check for completion signals
    const isComplete = currentState.isComplete || isConfirmingCompletion(message);

    // Call Claude API with extended thinking for deeper reasoning
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000, // Increased to accommodate thinking budget + response
      temperature: 1, // Required for extended thinking
      thinking: {
        type: 'enabled',
        budget_tokens: 8000, // Allow deep reasoning for planning conversations
      },
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    // Extract response text (skip thinking blocks)
    const textBlock = response.content.find((block) => block.type === 'text');
    const rawAssistantMessage = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // Strip any code blocks from PLAN mode responses (safety net)
    const cleanedMessage = stripCodeBlocks(rawAssistantMessage);
    const hadCodeStripped = cleanedMessage !== rawAssistantMessage;
    const assistantMessage = cleanedMessage;

    if (hadCodeStripped) {
      console.warn('[wizard/chat] Code blocks were stripped from PLAN mode response');
    }

    // Update state by analyzing the full conversation
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: assistantMessage },
    ];

    const updatedState = await extractStateFromConversation(updatedHistory, currentState);

    // Check if concept is sufficiently defined to move forward
    const isConceptSufficient =
      updatedState.isComplete ||
      (updatedState.features.length >= 3 &&
        updatedState.name &&
        updatedState.technical.needsAuth !== undefined);

    // Generate suggested actions based on conversation state
    const suggestedActions: Array<{ label: string; action: string }> = [];

    // Check if backend is needed
    const needsBackend =
      updatedState.technical.needsAuth ||
      updatedState.technical.needsDatabase ||
      updatedState.technical.needsRealtime ||
      updatedState.technical.needsFileUpload;

    if (isConceptSufficient) {
      // If backend is needed, suggest architecture generation
      if (needsBackend) {
        suggestedActions.push({
          label: 'Analyze Backend Architecture',
          action: 'generate_architecture',
        });
      }
      suggestedActions.push({
        label: 'Continue to Design',
        action: 'continue_to_design',
      });
    }

    if (referenceImages?.length === 0 && updatedState.features.length > 0) {
      suggestedActions.push({
        label: 'Upload Design Reference',
        action: 'upload_reference',
      });
    }

    const result: WizardResponse = {
      message: assistantMessage,
      updatedState,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      isConceptComplete: isComplete,
      hadCodeStripped: hadCodeStripped || undefined,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Wizard chat error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process wizard message',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Return wizard configuration
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Natural Conversation Wizard',
    version: '2.0',
    description: 'AI-powered app planning through natural conversation',
    features: [
      'Real AI responses (not hardcoded)',
      'Natural conversation flow',
      'Progressive concept building',
      'Image reference support',
      'Architecture generation',
    ],
    endpoints: {
      chat: 'POST /api/wizard/chat',
      generateArchitecture: 'POST /api/wizard/generate-architecture',
    },
  });
}
