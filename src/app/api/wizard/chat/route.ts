/**
 * Natural Conversation Wizard - Chat API Route
 * 
 * Provides AI-powered conversation for the natural conversation wizard.
 * Uses Claude to understand user intent and guide them through app concept creation.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { WIZARD_SYSTEM_PROMPT } from '@/prompts/wizardSystemPrompt';
import type { Feature, TechnicalRequirements, UIPreferences } from '@/types/appConcept';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES
// ============================================================================

interface WizardState {
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;
  features: Feature[];
  technical: Partial<TechnicalRequirements>;
  uiPreferences: Partial<UIPreferences>;
  roles?: Array<{ name: string; capabilities: string[] }>;
  isComplete: boolean;
  readyForPhases: boolean;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory: ConversationMessage[];
  currentState: WizardState;
  referenceImages?: string[];
}

interface SuggestedAction {
  label: string;
  action: string;
}

interface ChatResponse {
  message: string;
  updatedState: WizardState;
  suggestedActions?: SuggestedAction[];
  isConceptComplete: boolean;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory, currentState, referenceImages } = body;
    
    // Validate request
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        error: 'Message is required',
      }, { status: 400 });
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Build Claude messages
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: buildUserMessage(message, currentState, referenceImages),
      },
    ];
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: WIZARD_SYSTEM_PROMPT,
      messages,
    });
    
    // Extract response
    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }
    
    const responseText = assistantMessage.text;
    
    // Parse the response to extract state updates
    const updatedState = parseStateUpdates(responseText, currentState);
    
    // Generate suggested actions based on current state
    const suggestedActions = generateSuggestedActions(updatedState);
    
    // Determine if concept is complete
    const isConceptComplete = checkIfConceptComplete(updatedState);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Wizard chat completed in ${duration}ms`);
    console.log(`   Input tokens: ${response.usage.input_tokens}`);
    console.log(`   Output tokens: ${response.usage.output_tokens}`);
    
    const chatResponse: ChatResponse = {
      message: responseText,
      updatedState,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      isConceptComplete,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
    
    return NextResponse.json(chatResponse);
    
  } catch (error) {
    console.error('❌ Wizard chat error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process chat',
    }, { status: 500 });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildUserMessage(
  message: string,
  currentState: WizardState,
  referenceImages?: string[]
): string {
  let content = message;
  
  // Add current state context for Claude
  if (currentState.name || currentState.features.length > 0) {
    content += '\n\n---CURRENT STATE---\n';
    content += JSON.stringify({
      name: currentState.name,
      description: currentState.description,
      features: currentState.features,
      technical: currentState.technical,
      uiPreferences: currentState.uiPreferences,
    }, null, 2);
  }
  
  // Add image references if provided
  if (referenceImages && referenceImages.length > 0) {
    content += `\n\n[User has attached ${referenceImages.length} reference image(s)]`;
  }
  
  return content;
}

function parseStateUpdates(
  responseText: string,
  currentState: WizardState
): WizardState {
  // Try to extract structured data from the response
  // Look for JSON blocks or structured information
  
  const updatedState = { ...currentState };
  
  // Simple keyword-based extraction
  // In a production system, you might want Claude to output structured JSON
  
  // Extract app name
  const nameMatch = responseText.match(/(?:app name|called|named)[\s:]*["']?([A-Z][a-zA-Z0-9\s]+)["']?/i);
  if (nameMatch && !updatedState.name) {
    updatedState.name = nameMatch[1].trim();
  }
  
  // Extract description
  const descMatch = responseText.match(/(?:description|about)[\s:]*["']?([^"'\n]{20,})["']?/i);
  if (descMatch && !updatedState.description) {
    updatedState.description = descMatch[1].trim();
  }
  
  // Check if concept seems complete
  const hasMinimumInfo = !!(
    updatedState.name &&
    updatedState.description &&
    updatedState.features.length >= 2
  );
  
  // Look for completion signals in the response
  const completionPhrases = [
    'looks good',
    'ready to generate',
    'ready to build',
    'concept is complete',
    'all set',
  ];
  
  const hasCompletionSignal = completionPhrases.some(phrase =>
    responseText.toLowerCase().includes(phrase)
  );
  
  if (hasMinimumInfo && hasCompletionSignal) {
    updatedState.readyForPhases = true;
  }
  
  return updatedState;
}

function generateSuggestedActions(state: WizardState): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  
  // Suggest next steps based on what's missing
  if (!state.name) {
    actions.push({
      label: '💡 Suggest app name',
      action: 'Can you suggest a good name for my app?',
    });
  }
  
  if (state.features.length < 3) {
    actions.push({
      label: '➕ Add more features',
      action: 'What other features would be useful?',
    });
  }
  
  if (!state.technical.needsAuth && state.features.length > 0) {
    actions.push({
      label: '🔐 Discuss authentication',
      action: 'Does this app need user authentication?',
    });
  }
  
  if (state.features.length >= 3 && state.name) {
    actions.push({
      label: '✅ Finalize concept',
      action: "I'm happy with this concept. Let's generate the build phases!",
    });
  }
  
  return actions;
}

function checkIfConceptComplete(state: WizardState): boolean {
  return !!(
    state.name &&
    state.description &&
    state.features.length >= 2 &&
    state.readyForPhases
  );
}

/**
 * GET - Return wizard chat info
 */
export async function GET() {
  return NextResponse.json({
    name: 'Natural Conversation Wizard Chat',
    version: '1.0',
    description: 'AI-powered conversation for app concept creation',
    
    features: [
      'Natural language understanding',
      'Progressive concept building',
      'Context-aware responses',
      'Image reference support',
      'Intelligent state tracking',
    ],
    
    model: 'claude-3-5-sonnet-20241022',
    maxDuration: 60,
  });
}
