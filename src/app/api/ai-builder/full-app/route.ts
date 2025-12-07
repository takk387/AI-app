import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import { buildFullAppPrompt } from '@/prompts/builder';
import {
  analytics,
  generateRequestId,
  categorizeError,
  PerformanceTracker,
} from '@/utils/analytics';
import { generateRetryStrategy, type RetryContext, DEFAULT_RETRY_CONFIG } from '@/utils/retryLogic';
import {
  generateFullApp,
  type GenerationContext,
  type GenerationError,
  type PhaseContext,
} from './generation-logic';
import { isMockAIEnabled, mockFullAppResponse } from '@/utils/mockAI';
import { logAPI } from '@/utils/debug';

// Vercel serverless function config
export const maxDuration = 60; // 60 seconds max
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // ============================================================================
  // MOCK AI MODE - Return instant mock response if enabled
  // ============================================================================
  if (isMockAIEnabled()) {
    logAPI('POST', '/api/ai-builder/full-app', { mock: true });
    return NextResponse.json({
      files: mockFullAppResponse.files,
      explanation: mockFullAppResponse.explanation,
      tokensUsed: mockFullAppResponse.tokensUsed,
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
    const {
      prompt,
      conversationHistory,
      isModification,
      currentAppName,
      image,
      hasImage,
      // NEW: Phase building context
      isPhaseBuilding,
      phaseContext: rawPhaseContext,
      currentAppState,
      // NEW: Image generation options
      generateImages,
      imageQuality,
      maxImages,
      layoutDesign,
      appFeatures,
    } = await request.json();

    perfTracker.checkpoint('request_parsed');

    // Log request start after parsing body
    analytics.logRequestStart('ai-builder/full-app', requestId, {
      hasConversationHistory: !!conversationHistory,
      isModification: !!isModification,
      hasImage: !!hasImage,
      isPhaseBuilding: !!isPhaseBuilding,
      phaseNumber: rawPhaseContext?.phaseNumber,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local',
        },
        { status: 500 }
      );
    }

    // ============================================================================
    // OPTIMIZED PROMPT SYSTEM - Phase 3 Implementation
    // Old prompt: ~8,500 tokens | New prompt: ~2,800 tokens | Reduction: 67%
    // ============================================================================

    // Build current app context section if we have an existing app loaded
    let currentAppContext = '';
    if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
      currentAppContext = `

===CURRENT APP CONTEXT===
The user has an existing app loaded. Here is the current state:

App Name: ${currentAppState.name || 'Unnamed App'}
App Type: ${currentAppState.appType || 'Unknown'}
Files in the app:
${currentAppState.files.map((f: any) => `- ${f.path}`).join('\n')}

FILE CONTENTS:
${currentAppState.files
  .map(
    (f: any) => `
--- ${f.path} ---
${f.content}
--- END ${f.path} ---
`
  )
  .join('\n')}
===END CURRENT APP CONTEXT===

When building new features or making changes, reference the actual code above. Preserve existing functionality unless explicitly asked to change it.`;
    }

    const baseInstructions = `You are an expert FULL-STACK Next.js application architect. Generate complete, production-ready applications with both frontend AND backend capabilities.
${currentAppContext ? '\nIMPORTANT: The user has an existing app loaded. See CURRENT APP CONTEXT at the end of this prompt. When adding features, integrate with the existing code structure.' : ''}

APPLICATION TYPE DETECTION:
- FRONTEND_ONLY: UI components, calculators, games (preview sandbox)
- FULL_STACK: Database, auth, API routes (local dev required)

COMPLEX APPS - STAGING STRATEGY:
- Target 8K-10K tokens for Stage 1 (core architecture + 2-3 features)
- Build complete apps through conversation, not simplified versions
- NEVER truncate code mid-line/tag/string/function
- Stage 1: Solid foundation, invite extensions
- Conversational descriptions: "I've created your [app]! Want to add [X], [Y], [Z]?"

INTERNAL_PLAN SYSTEM (Hidden from user):
- Track architecture, completed features, deferred features
- Update on modifications for consistency
- Reference when extending app

${
  isModification
    ? `
MODIFICATION MODE for "${currentAppName}":
- Check ===INTERNAL_PLAN=== in conversation history
- Classify: MAJOR_CHANGE (new features, redesigns) or MINOR_CHANGE (bug fixes, tweaks)
- PRESERVE all existing UI/styling/functionality not mentioned
- Use EXACT delimiter format (===NAME===, ===FILE:===, etc.)
- Think: "What's the MINIMUM change needed?"
`
    : ''
}${currentAppContext}`;

    // Build compressed prompt using modular sections from src/prompts/
    const systemPrompt = buildFullAppPrompt(baseInstructions, hasImage, isModification);
    const estimatedPromptTokens = Math.round(systemPrompt.length / 4);

    console.log('✅ Phase 3: Using compressed modular prompts');
    console.log('📊 Token estimate:', estimatedPromptTokens, 'tokens');
    console.log('Generating app with prompt:', prompt);

    perfTracker.checkpoint('prompt_built');

    // Build conversation context
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

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

        console.log('Image media type:', normalizedType, 'Original:', mediaType);

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
              text: prompt,
            },
          ],
        });
      } else {
        console.error('Invalid image data URL format');
        messages.push({ role: 'user', content: prompt });
      }
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    // ============================================================================
    // PHASE 5.2: RETRY LOGIC WITH SPECIFIC FIXES
    // ============================================================================
    const modelName = 'claude-sonnet-4-5-20250929';
    const maxRetries = DEFAULT_RETRY_CONFIG.maxAttempts;

    // Build phase context if this is a phased build
    const phaseContext: PhaseContext | undefined =
      isPhaseBuilding && rawPhaseContext
        ? {
            phaseNumber: rawPhaseContext.phaseNumber || 1,
            previousPhaseCode: rawPhaseContext.previousPhaseCode || null,
            allPhases: rawPhaseContext.allPhases || [],
            completedPhases: rawPhaseContext.completedPhases || [],
            cumulativeFeatures: rawPhaseContext.cumulativeFeatures || [],
          }
        : undefined;

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
          correctionPrompt: undefined, // Will be set below if retry
          phaseContext, // Pass phase context for multi-phase builds
          // Image generation options
          imageOptions:
            generateImages !== false
              ? {
                  generateImages: generateImages ?? !!layoutDesign, // Default: true if layoutDesign exists
                  imageQuality: imageQuality || 'standard',
                  maxImages: maxImages || 4,
                  appName: currentAppName,
                  appDescription: prompt,
                  layoutDesign: layoutDesign,
                  features: appFeatures,
                }
              : undefined,
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
            console.log(`❌ Retry not allowed for error category: ${lastError.category}`);
            throw lastError;
          }

          console.log(`🔄 Retry attempt ${attemptNumber}/${maxRetries} - ${lastError.category}`);
          generationContext.correctionPrompt = retryStrategy.correctionPrompt;

          // Wait if retry delay specified
          if (retryStrategy.retryDelay && retryStrategy.retryDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryStrategy.retryDelay));
          }
        }

        perfTracker.checkpoint('ai_request_sent');

        // Generate full app with retry support
        result = await generateFullApp(generationContext, attemptNumber);

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

        perfTracker.checkpoint('response_parsed');
        perfTracker.checkpoint('validation_complete');

        // Success! Break out of retry loop
        console.log(
          attemptNumber > 1
            ? `✅ Retry attempt ${attemptNumber} succeeded!`
            : '✅ Generation successful on first attempt'
        );
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
                error: 'Invalid response format from Claude',
                debug: {
                  responseLength: lastError.originalResponse?.length || 0,
                  preview: lastError.originalResponse?.substring(0, 1000),
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
    const name = result.name;
    const descriptionText = result.description;
    const appType = result.appType;
    const changeType = result.changeType;
    const changeSummary = result.changeSummary;
    const files = result.files;
    const dependencies = result.dependencies;
    const setupInstructions = result.setupInstructions;
    const responseText = result.responseText;
    const validationErrors = result.validationErrors;
    const totalErrors = result.totalErrors;
    const autoFixedCount = result.autoFixedCount;
    const images = result.images;

    const validationWarnings =
      validationErrors.length > 0
        ? {
            hasWarnings: true,
            message: `Code validation detected ${totalErrors - autoFixedCount} potential issue(s).`,
            details: validationErrors,
          }
        : undefined;

    const appData = {
      name,
      description: descriptionText,
      appType,
      changeType,
      changeSummary,
      files,
      dependencies,
      setupInstructions,
      ...(validationWarnings && { validationWarnings }),
      ...(images && { images }),
    };

    perfTracker.checkpoint('response_prepared');

    // Log successful completion
    analytics.logRequestComplete(requestId, {
      modelUsed: modelName,
      promptLength: estimatedPromptTokens,
      responseLength: responseText.length,
      validationRan: true,
      validationIssuesFound: totalErrors,
      validationIssuesFixed: autoFixedCount,
      metadata: {
        appName: name,
        appType: appType,
        changeType: changeType,
        isModification: isModification,
        hasImage: hasImage,
        filesGenerated: files.length,
        hasDependencies: Object.keys(dependencies).length > 0,
        retryAttempts: attemptNumber,
        retriedSuccessfully: attemptNumber > 1,
        imagesGenerated: images ? !images.fallbackUsed : false,
        imageCost: images?.cost || 0,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      perfTracker.log('Full-App Route');
    }

    return NextResponse.json(appData);
  } catch (error) {
    console.error('Error in full app builder route:', error);

    // Log error to analytics
    analytics.logRequestError(requestId, error as Error, categorizeError(error as Error));

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate app' },
      { status: 500 }
    );
  }
}
