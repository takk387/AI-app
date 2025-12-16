import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildModifyPrompt } from '@/prompts/builder';
import {
  analytics,
  generateRequestId,
  categorizeError,
  PerformanceTracker,
} from '@/utils/analytics';
import { generateRetryStrategy, type RetryContext, DEFAULT_RETRY_CONFIG } from '@/utils/retryLogic';
import {
  generateModifications,
  type GenerationContext,
  type GenerationError,
} from './generation-logic';

// Vercel serverless function config
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// TypeScript interfaces for diff format (kept for documentation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface DiffChange {
  type:
    | 'ADD_IMPORT'
    | 'INSERT_AFTER'
    | 'INSERT_BEFORE'
    | 'REPLACE'
    | 'DELETE'
    | 'APPEND'
    | 'AST_WRAP_ELEMENT'
    | 'AST_ADD_STATE'
    | 'AST_ADD_IMPORT'
    | 'AST_MODIFY_CLASSNAME'
    | 'AST_INSERT_JSX'
    | 'AST_ADD_USEEFFECT'
    | 'AST_MODIFY_PROP'
    | 'AST_ADD_AUTHENTICATION'
    | 'AST_ADD_REF'
    | 'AST_ADD_MEMO'
    | 'AST_ADD_CALLBACK'
    | 'AST_ADD_REDUCER';
  line?: number;
  searchFor?: string;
  content?: string;
  replaceWith?: string;
  // AST operation fields
  targetElement?: string;
  wrapperComponent?: string;
  wrapperProps?: Record<string, string>;
  name?: string;
  setter?: string;
  initialValue?: string;
  source?: string;
  defaultImport?: string;
  namedImports?: string[];
  namespaceImport?: string;
  import?: {
    source: string;
    defaultImport?: string;
    namedImports?: string[];
    namespaceImport?: string;
  };
  // AST_MODIFY_CLASSNAME fields
  staticClasses?: string[];
  template?: {
    variable: string;
    trueValue: string;
    falseValue?: string;
    operator?: '?' | '&&';
  };
  rawTemplate?: string;
  // AST_INSERT_JSX fields
  jsx?: string;
  position?: 'before' | 'after' | 'inside_start' | 'inside_end';
  // AST_ADD_USEEFFECT fields
  body?: string;
  dependencies?: string[];
  cleanup?: string;
  // AST_MODIFY_PROP fields
  propName?: string;
  propValue?: string;
  action?: 'add' | 'update' | 'remove';
  // AST_ADD_REF fields
  // name and initialValue already defined above
  // AST_ADD_MEMO fields
  computation?: string;
  // name and dependencies already defined above
  // AST_ADD_CALLBACK fields
  params?: string[];
  // name, body, and dependencies already defined above
  // AST_ADD_REDUCER fields
  dispatchName?: string;
  reducerName?: string;
  initialState?: string;
  actions?: Array<{
    type: string;
    handler: string;
  }>;
}

export async function POST(request: Request) {
  // ============================================================================
  // ANALYTICS - Phase 4: Track request metrics
  // ============================================================================
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();

  try {
    const { prompt, currentAppState, conversationHistory, image, hasImage } = await request.json();
    perfTracker.checkpoint('request_parsed');

    // Log request start after parsing body
    analytics.logRequestStart('ai-builder/modify', requestId, {
      hasConversationHistory: !!conversationHistory,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local',
        },
        { status: 500 }
      );
    }

    if (!currentAppState) {
      return NextResponse.json(
        {
          error: 'Current app state is required for modifications',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // OPTIMIZED PROMPT SYSTEM - Phase 3 Implementation
    // Old prompt: ~6,500 tokens | New prompt: ~2,000 tokens | Reduction: 69%
    // ============================================================================

    const baseInstructions = `You are an expert code modification assistant. Generate MINIMAL, TARGETED changes to existing code - NOT rewrite entire files.

CRITICAL RULES:
1. Change ONLY what user explicitly requested
2. Preserve ALL existing code not mentioned
3. Use surgical edits, not rewrites
4. Think: "What's the SMALLEST change?"

DIFF FORMAT:
- Respond in exact JSON diff format
- NO conversational text, NO markdown, ONLY valid JSON
- Each change must be precise and targeted

CHANGE TYPES: ADD_IMPORT, INSERT_AFTER, INSERT_BEFORE, REPLACE, DELETE, APPEND

SEARCH PATTERNS:
- Use unique, exact code snippets for searchFor
- Include enough context to be unambiguous
- Use actual code from file, not summaries

RESPONSE FORMAT:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Brief description",
  "files": [{
    "path": "src/App.tsx",
    "action": "MODIFY",
    "changes": [
      {"type": "ADD_IMPORT", "content": "import { useState } from 'react';"},
      {"type": "INSERT_AFTER", "searchFor": "export default function App() {", "content": "  const [count, setCount] = useState(0);"},
      {"type": "REPLACE", "searchFor": "old code", "replaceWith": "new code"}
    ]
  }]
}
\`\`\`

STAGED MODIFICATIONS:
When conversation history shows "Complex Modification Detected" + user approved:
1. Read ===INTERNAL_PLAN=== from history
2. Plan stages mentally (2-4 stages)
3. Implement ONLY current stage
4. Include stagePlan in response with currentStage, totalStages, nextStages

Current App State:
${JSON.stringify(currentAppState, null, 2)}`;

    // Build compressed prompt using modular sections from src/prompts/
    const systemPrompt = buildModifyPrompt(baseInstructions);
    const estimatedPromptTokens = Math.round(systemPrompt.length / 4);

    perfTracker.checkpoint('prompt_built');

    // Extract current file contents for AI reference
    let fileContentsSection = '';
    if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
      fileContentsSection =
        '\n\n📁 **CURRENT FILE CONTENTS** (Read these EXACTLY for your SEARCH blocks):\n\n';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentAppState.files.forEach((file: any) => {
        fileContentsSection += `\n${'='.repeat(60)}\n`;
        fileContentsSection += `FILE: ${file.path}\n`;
        fileContentsSection += `${'='.repeat(60)}\n`;
        fileContentsSection += file.content;
        fileContentsSection += `\n${'='.repeat(60)}\n`;
      });
      fileContentsSection +=
        '\n⚠️ CRITICAL: Your SEARCH blocks must match the code above EXACTLY (character-for-character, including all whitespace and indentation).\n';
    }

    // Build conversation context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

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

    // Add current modification request WITH file contents and optional image
    const enhancedPrompt = fileContentsSection
      ? `${fileContentsSection}\n\n🎯 **USER REQUEST:**\n${prompt}`
      : prompt;

    // Add user message with optional image
    if (hasImage && image) {
      const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (imageMatch) {
        const mediaType = imageMatch[1];
        const base64Data = imageMatch[2];

        const validMediaTypes: { [key: string]: string } = {
          'image/jpeg': 'image/jpeg',
          'image/jpg': 'image/jpeg',
          'image/png': 'image/png',
          'image/gif': 'image/gif',
          'image/webp': 'image/webp',
        };

        const normalizedType = validMediaTypes[mediaType.toLowerCase()];
        if (!normalizedType) {
          console.error('Unsupported image type:', mediaType);
          throw new Error(
            `Unsupported image type: ${mediaType}. Please use JPEG, PNG, GIF, or WebP.`
          );
        }

        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: normalizedType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: enhancedPrompt,
            },
          ],
        });
      } else {
        console.error('Invalid image data URL format');
        messages.push({ role: 'user', content: enhancedPrompt });
      }
    } else {
      messages.push({ role: 'user', content: enhancedPrompt });
    }

    // ============================================================================
    // PHASE 5.2: RETRY LOGIC WITH SPECIFIC FIXES
    // ============================================================================
    const modelName = 'claude-sonnet-4-5-20250929';
    const maxRetries = DEFAULT_RETRY_CONFIG.maxAttempts;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    let lastError: GenerationError | null = null;
    let attemptNumber = 1;

    for (attemptNumber = 1; attemptNumber <= maxRetries; attemptNumber++) {
      try {
        // Build generation context
        const generationContext: GenerationContext = {
          anthropic,
          systemPrompt,
          messages,
          modelName,
          currentAppState,
          correctionPrompt: undefined, // Will be set below if this is a retry
        };

        // If this is a retry, add correction prompt
        if (attemptNumber > 1 && lastError) {
          const retryContext: RetryContext = {
            attemptNumber: attemptNumber - 1,
            previousError: lastError.message,
            errorCategory: lastError.category,
            originalResponse: lastError.originalResponse,
            validationDetails: lastError.validationDetails,
          };

          const retryStrategy = generateRetryStrategy(retryContext, DEFAULT_RETRY_CONFIG);

          if (!retryStrategy.shouldRetry) {
            throw lastError;
          }

          generationContext.correctionPrompt = retryStrategy.correctionPrompt;

          // Wait if retry delay specified
          if (retryStrategy.retryDelay && retryStrategy.retryDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryStrategy.retryDelay));
          }
        }

        perfTracker.checkpoint('ai_request_sent');

        // Generate modifications with retry support
        result = await generateModifications(generationContext, attemptNumber);

        perfTracker.checkpoint('ai_response_received');

        // Log token usage
        if (result.inputTokens > 0 || result.outputTokens > 0) {
          analytics.logTokenUsage(
            requestId,
            result.inputTokens,
            result.outputTokens,
            result.cachedTokens
          );
        }

        perfTracker.checkpoint('validation_complete');

        // Success! Break out of retry loop
        break;
      } catch (error) {
        lastError = error as GenerationError;

        console.error(`❌ Attempt ${attemptNumber}/${maxRetries} failed:`, lastError.message);

        // If this was the last attempt, throw the error
        if (attemptNumber >= maxRetries) {
          console.error(`❌ All ${maxRetries} retry attempts exhausted`);

          // Log final error to analytics
          analytics.logRequestError(requestId, lastError, lastError.category || 'unknown_error', {
            modelUsed: modelName,
            responseLength: lastError.originalResponse?.length || 0,
            metadata: {
              attemptsUsed: attemptNumber,
            },
          });

          // Return user-friendly error based on category
          if (lastError.category === 'parsing_error') {
            return NextResponse.json(
              {
                error:
                  'The AI had trouble understanding how to modify your app. This can happen with complex changes. Try breaking your request into smaller steps, or use simpler language.',
                suggestion:
                  'Try asking for one change at a time, like "add a button" or "change the color to blue".',
                technicalDetails: {
                  responsePreview: lastError.originalResponse?.substring(0, 500),
                  parseError: lastError.message,
                  attempts: attemptNumber,
                },
              },
              { status: 500 }
            );
          }

          throw lastError;
        }

        // Otherwise, continue to next retry attempt
      }
    }

    // Extract results from successful generation
    const diffResponse = result.diffResponse;
    const responseText = result.responseText;
    const validationErrors = result.validationErrors;
    const totalSnippets = result.totalSnippets;
    const errorsFound = result.errorsFound;

    // Add validation warnings if errors remain
    const validationWarnings =
      validationErrors.length > 0
        ? {
            hasWarnings: true,
            message: `Code validation detected ${validationErrors.length} issue(s) in modification instructions. Review before applying.`,
            details: validationErrors,
          }
        : undefined;

    perfTracker.checkpoint('response_prepared');

    // Log successful completion
    analytics.logRequestComplete(requestId, {
      modelUsed: modelName,
      promptLength: estimatedPromptTokens,
      responseLength: responseText.length,
      validationRan: totalSnippets > 0,
      validationIssuesFound: errorsFound,
      validationIssuesFixed: errorsFound - validationErrors.length,
      metadata: {
        filesModified: diffResponse.files.length,
        totalChanges: diffResponse.files.reduce((sum, f) => sum + f.changes.length, 0),
        hasStaging: !!diffResponse.stagePlan,
        retryAttempts: attemptNumber,
        retriedSuccessfully: attemptNumber > 1,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      perfTracker.log('Modify Route');
    }

    return NextResponse.json({
      ...diffResponse,
      ...(validationWarnings && { validationWarnings }),
    });
  } catch (error) {
    console.error('Error in modify route:', error);

    // Log error to analytics
    analytics.logRequestError(requestId, error as Error, categorizeError(error as Error));

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate modifications' },
      { status: 500 }
    );
  }
}
