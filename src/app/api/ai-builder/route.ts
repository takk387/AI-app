import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode } from '@/utils/codeValidator';
import {
  analytics,
  generateRequestId,
  categorizeError,
  PerformanceTracker,
} from '@/utils/analytics';
import { isMockAIEnabled, mockComponentResponse } from '@/utils/mockAI';
import { logAPI } from '@/utils/debug';
import {
  BUILDER_EXPERT_PROMPT,
  generateBuilderContext,
  RESPONSE_TYPES,
} from '@/prompts/builderExpertPrompt';

// Vercel serverless function config
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // ============================================================================
  // MOCK AI MODE - Return instant mock response if enabled
  // ============================================================================
  if (isMockAIEnabled()) {
    logAPI('POST', '/api/ai-builder', { mock: true });
    return NextResponse.json({
      code: mockComponentResponse.code,
      explanation: mockComponentResponse.explanation,
      name: 'Mock Component',
      _mock: true,
      _mockWarning: 'Mock AI Mode is enabled. Set NEXT_PUBLIC_MOCK_AI=false for real AI.',
    });
  }

  // ============================================================================
  // ANALYTICS - Phase 4: Track request metrics
  // ============================================================================
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();

  try {
    const { prompt, conversationHistory, currentAppState } = await request.json();
    perfTracker.checkpoint('request_parsed');

    // Log request start after parsing body
    analytics.logRequestStart('ai-builder', requestId, {
      hasConversationHistory: !!conversationHistory,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Anthropic API key not configured, using demo mode');
      return NextResponse.json({
        code: `import { useState } from 'react';\n\nexport default function GeneratedComponent() {\n  const [value, setValue] = useState('');\n  \n  return (\n    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">\n      <h2 className="text-2xl font-bold mb-4 text-gray-800">Demo Component</h2>\n      <p className="text-sm text-gray-600 mb-4">Add your Anthropic API key to .env.local for full AI generation</p>\n      <input \n        value={value}\n        onChange={(e) => setValue(e.target.value)}\n        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"\n        placeholder="Type something..."\n      />\n      <p className="mt-3 text-sm text-gray-500">You typed: {value}</p>\n    </div>\n  );\n}`,
        explanation:
          'This is a demo component. Configure your Anthropic API key (ANTHROPIC_API_KEY) in .env.local to enable full AI generation with Claude.',
        name: 'Demo Component',
      });
    }

    // Build intent-aware system prompt using BUILDER_EXPERT_PROMPT
    const appContext = generateBuilderContext(currentAppState || null);
    const systemPrompt = `${BUILDER_EXPERT_PROMPT}${appContext}

## RESPONSE FORMAT

You MUST respond in one of these formats depending on user intent.
CRITICAL: Always start with ===RESPONSE_TYPE=== to indicate your intent.

### For QUESTIONS (user asks a question, wants explanation):
===RESPONSE_TYPE===
question
===MESSAGE===
Your helpful answer here

### For BUILD requests (user wants a NEW app/component created):
===RESPONSE_TYPE===
build
===MESSAGE===
Brief description of what you're building
===NAME===
Short component name (3-5 words)
===EXPLANATION===
Brief explanation of what you built and key features
===CODE===
The complete TypeScript/React component code here
===END===

CODE RULES for BUILD:
- Use functional components with TypeScript
- Use Tailwind CSS for styling
- Generate a default export function that returns PURE HTML with hardcoded values for preview
- NO props in the main return statement - use actual text values
- Use the EXACT delimiters shown above
- Do NOT wrap in markdown code blocks

### For MODIFY requests (user wants to change/update/fix existing code):
===RESPONSE_TYPE===
modify
===MESSAGE===
Brief description of the changes you'll make (e.g., "I'll change the button color to red and keep everything else the same.")

### For CLARIFY (ambiguous request, need more info):
===RESPONSE_TYPE===
clarify
===MESSAGE===
Your clarifying question

DETECTION RULES:
- If the user has an existing app loaded (see CURRENT APP CONTEXT above) AND asks to change, update, fix, add to, or modify something → respond with "modify" type.
- If the user wants a brand new app/component → respond with "build" type.
- If the user asks a question → respond with "question" type.
- If ambiguous → respond with "clarify" type.`;

    // Build conversation context for Claude
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add current user prompt
    messages.push({ role: 'user', content: prompt });

    perfTracker.checkpoint('prompt_built');

    const modelName = 'claude-sonnet-4-5-20250929';

    // Use streaming for better responsiveness and timeout handling
    const stream = await anthropic.messages.stream({
      model: modelName,
      max_tokens: 16000, // Must be > budget_tokens (8000 thinking + 8000 response)
      temperature: 1, // Required for extended thinking
      thinking: {
        type: 'enabled',
        budget_tokens: 8000,
      },
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages,
    });

    perfTracker.checkpoint('ai_request_sent');

    // Collect the full response with timeout
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedTokens = 0;
    const timeout = 60000; // 60 seconds (increased for extended thinking)
    const startTime = Date.now();

    try {
      for await (const chunk of stream) {
        if (Date.now() - startTime > timeout) {
          throw new Error(
            'AI response timeout - the component generation was taking too long. Please try a simpler request or try again.'
          );
        }
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          responseText += chunk.delta.text;
        }
        // Capture token usage from final message
        if (chunk.type === 'message_stop') {
          const finalMessage = await stream.finalMessage();
          inputTokens = finalMessage.usage.input_tokens || 0;
          outputTokens = finalMessage.usage.output_tokens || 0;
          cachedTokens = finalMessage.usage.cache_read_input_tokens || 0;
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      analytics.logRequestError(requestId, streamError as Error, 'ai_error');
      throw new Error(
        streamError instanceof Error ? streamError.message : 'Failed to receive AI response'
      );
    }

    perfTracker.checkpoint('ai_response_received');

    // Log token usage
    if (inputTokens > 0 || outputTokens > 0) {
      analytics.logTokenUsage(requestId, inputTokens, outputTokens, cachedTokens);
    }
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // ========================================================================
    // INTENT DETECTION: Parse ===RESPONSE_TYPE=== first
    // ========================================================================
    const responseTypeMatch = responseText.match(/===RESPONSE_TYPE===\s*(\w+)/);
    const detectedType = responseTypeMatch?.[1]?.trim().toLowerCase();
    const messageMatch = responseText.match(
      /===MESSAGE===\s*([\s\S]*?)(?====(?:NAME|RESPONSE_TYPE|EXPLANATION|CODE|END)===|$)/
    );
    const intentMessage = messageMatch?.[1]?.trim() || '';

    // --- MODIFY: Route to surgical edit path ---
    if (detectedType === 'modify') {
      perfTracker.checkpoint('response_parsed');
      analytics.logRequestComplete(requestId, {
        modelUsed: modelName,
        promptLength: Math.round(systemPrompt.length / 4),
        responseLength: responseText.length,
        validationRan: false,
        validationIssuesFound: 0,
        validationIssuesFixed: 0,
        metadata: { responseType: 'modify' },
      });
      return NextResponse.json({
        shouldTriggerModify: true,
        message: intentMessage,
        responseType: RESPONSE_TYPES.MODIFY,
      });
    }

    // --- QUESTION / CLARIFY: Return message only, no code ---
    if (detectedType === 'question' || detectedType === 'clarify') {
      perfTracker.checkpoint('response_parsed');
      analytics.logRequestComplete(requestId, {
        modelUsed: modelName,
        promptLength: Math.round(systemPrompt.length / 4),
        responseLength: responseText.length,
        validationRan: false,
        validationIssuesFound: 0,
        validationIssuesFixed: 0,
        metadata: { responseType: detectedType },
      });
      return NextResponse.json({
        message: intentMessage,
        responseType: detectedType === 'clarify' ? RESPONSE_TYPES.CLARIFY : RESPONSE_TYPES.QUESTION,
      });
    }

    // --- BUILD (explicit or fallback): Parse name/explanation/code ---
    // Parse using delimiters - primary method
    const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===EXPLANATION===/);
    const explanationMatch = responseText.match(/===EXPLANATION===\s*([\s\S]*?)\s*===CODE===/);
    const codeMatch = responseText.match(/===CODE===\s*([\s\S]*?)\s*===END===/);

    let aiResponse: { name: string; explanation: string; code: string };

    if (nameMatch && explanationMatch && codeMatch) {
      aiResponse = {
        name: nameMatch[1].trim(),
        explanation: explanationMatch[1].trim(),
        code: codeMatch[1].trim(),
      };
    } else {
      // Fallback 1: Try markdown code block extraction
      const markdownCodeMatch = responseText.match(
        /```(?:tsx?|typescript|javascript|jsx?)?\s*([\s\S]*?)```/
      );

      if (markdownCodeMatch) {
        const code = markdownCodeMatch[1].trim();
        const componentNameMatch = code.match(/export\s+default\s+function\s+(\w+)/);
        const name = componentNameMatch
          ? componentNameMatch[1].replace(/([A-Z])/g, ' $1').trim()
          : 'Generated Component';
        const beforeCode = responseText.substring(0, responseText.indexOf('```')).trim();
        const explanation =
          beforeCode.length > 10 ? beforeCode.substring(0, 500) : 'Component generated by AI';

        aiResponse = { name, explanation, code };

        analytics.logRequestError(requestId, 'Used markdown fallback parsing', 'parsing_error', {
          modelUsed: modelName,
          metadata: { method: 'markdown', fallback: true },
        });
      } else {
        // Fallback 2: Try to extract any React component pattern
        const componentPattern = /(import[\s\S]*?export\s+default\s+function\s+\w+[\s\S]*?^\})/m;
        const componentMatch = responseText.match(componentPattern);

        if (componentMatch) {
          const code = componentMatch[1].trim();
          const componentNameMatch = code.match(/export\s+default\s+function\s+(\w+)/);
          const name = componentNameMatch
            ? componentNameMatch[1].replace(/([A-Z])/g, ' $1').trim()
            : 'Generated Component';

          aiResponse = { name, explanation: 'Component generated by AI', code };

          analytics.logRequestError(
            requestId,
            'Used component pattern fallback parsing',
            'parsing_error',
            { modelUsed: modelName, metadata: { method: 'component_pattern', fallback: true } }
          );
        } else {
          // All parsing methods failed
          console.error('All parsing methods failed');
          console.error('Response preview (first 500 chars):', responseText.substring(0, 500));

          analytics.logRequestError(
            requestId,
            'Failed to parse AI response with all methods',
            'parsing_error',
            {
              modelUsed: modelName,
              metadata: {
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 200),
              },
            }
          );

          throw new Error('Invalid response format from AI. Please try again.');
        }
      }
    }

    perfTracker.checkpoint('response_parsed');

    // Ensure code is a string
    if (aiResponse.code && typeof aiResponse.code === 'object') {
      aiResponse.code = JSON.stringify(aiResponse.code);
    }

    // ============================================================================
    // VALIDATION LAYER - Validate generated component code
    // ============================================================================
    const validation = await validateGeneratedCode(aiResponse.code, 'Component.tsx');

    let validationWarnings;

    if (!validation.valid) {
      const fixedCode = autoFixCode(aiResponse.code, validation.errors);
      if (fixedCode !== aiResponse.code) {
        aiResponse.code = fixedCode;
        const revalidation = await validateGeneratedCode(fixedCode, 'Component.tsx');
        if (!revalidation.valid) {
          validationWarnings = {
            hasWarnings: true,
            message: `Code validation detected ${revalidation.errors.length} potential issue(s). The component has been generated but may need manual review.`,
            errors: revalidation.errors,
          };
        }
      } else {
        validationWarnings = {
          hasWarnings: true,
          message: `Code validation detected ${validation.errors.length} potential issue(s). The component has been generated but may need manual review.`,
          errors: validation.errors,
        };
      }
    }

    perfTracker.checkpoint('validation_complete');

    const totalErrors = validation.valid ? 0 : validation.errors.length;
    const fixedErrors = validationWarnings
      ? totalErrors - (validationWarnings.errors?.length || 0)
      : totalErrors;

    if (totalErrors > 0) {
      analytics.logValidation(requestId, totalErrors, fixedErrors);
    }

    perfTracker.checkpoint('response_prepared');

    analytics.logRequestComplete(requestId, {
      modelUsed: modelName,
      promptLength: Math.round(systemPrompt.length / 4),
      responseLength: responseText.length,
      validationRan: true,
      validationIssuesFound: totalErrors,
      validationIssuesFixed: fixedErrors,
      metadata: {
        componentName: aiResponse.name,
        codeLength: aiResponse.code.length,
        responseType: detectedType || 'build',
      },
    });

    if (process.env.NODE_ENV === 'development') {
      perfTracker.log('AI Builder Route');
    }

    return NextResponse.json({
      shouldTriggerBuild: true,
      message: intentMessage || aiResponse.explanation,
      ...aiResponse,
      responseType: RESPONSE_TYPES.BUILD,
      ...(validationWarnings && { validationWarnings }),
    });
  } catch (error) {
    console.error('Error in AI builder route:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // Log error to analytics
    analytics.logRequestError(requestId, error as Error, categorizeError(error as Error));

    // If model not found, provide helpful error message
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (error.message.includes('model')) {
        return NextResponse.json(
          {
            error: `Model not found: ${error.message}. Please check your Anthropic console at https://console.anthropic.com/ for available models.`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
