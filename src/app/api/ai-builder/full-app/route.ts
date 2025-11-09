import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import { buildFullAppPrompt } from '@/prompts/builder';
import { analytics, generateRequestId, categorizeError, PerformanceTracker } from '@/utils/analytics';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // ============================================================================
  // ANALYTICS - Phase 4: Track request metrics
  // ============================================================================
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();
  
  try {
    const { prompt, conversationHistory, isModification, currentAppName, image, hasImage } = await request.json();
    perfTracker.checkpoint('request_parsed');
    
    // Log request start after parsing body
    analytics.logRequestStart('ai-builder/full-app', requestId, {
      hasConversationHistory: !!conversationHistory,
      isModification: !!isModification,
      hasImage: !!hasImage,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
    }

    // ============================================================================
    // OPTIMIZED PROMPT SYSTEM - Phase 3 Implementation
    // Old prompt: ~8,500 tokens | New prompt: ~2,800 tokens | Reduction: 67%
    // ============================================================================
    
    const baseInstructions = `You are an expert FULL-STACK Next.js application architect. Generate complete, production-ready applications with both frontend AND backend capabilities.

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

${isModification ? `
MODIFICATION MODE for "${currentAppName}":
- Check ===INTERNAL_PLAN=== in conversation history
- Classify: MAJOR_CHANGE (new features, redesigns) or MINOR_CHANGE (bug fixes, tweaks)
- PRESERVE all existing UI/styling/functionality not mentioned
- Use EXACT delimiter format (===NAME===, ===FILE:===, etc.)
- Think: "What's the MINIMUM change needed?"
` : ''}`;

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
        let mediaType = imageMatch[1];
        const base64Data = imageMatch[2];
        
        const validMediaTypes: { [key: string]: string } = {
          'image/jpeg': 'image/jpeg',
          'image/jpg': 'image/jpeg',
          'image/png': 'image/png',
          'image/gif': 'image/gif',
          'image/webp': 'image/webp'
        };
        
        const normalizedType = validMediaTypes[mediaType.toLowerCase()];
        if (!normalizedType) {
          console.error('Unsupported image type:', mediaType);
          throw new Error(`Unsupported image type: ${mediaType}. Please use JPEG, PNG, GIF, or WebP.`);
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
                data: base64Data
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        });
      } else {
        console.error('Invalid image data URL format');
        messages.push({ role: 'user', content: prompt });
      }
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    console.log('Generating full app with Claude Sonnet 4.5...');

    const modelName = 'claude-sonnet-4-5-20250929';
    const stream = await anthropic.messages.stream({
      model: modelName,
      max_tokens: 16384,
      temperature: 0.7,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: messages
    });
    
    perfTracker.checkpoint('ai_request_sent');

    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedTokens = 0;
    
    try {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          responseText += chunk.delta.text;
        }
        // Capture token usage from final message
        if (chunk.type === 'message_stop') {
          const finalMessage = await stream.finalMessage();
          inputTokens = finalMessage.usage.input_tokens || 0;
          outputTokens = finalMessage.usage.output_tokens || 0;
          // @ts-ignore - cache_read_input_tokens might not be in types yet
          cachedTokens = finalMessage.usage.cache_read_input_tokens || 0;
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      analytics.logRequestError(requestId, streamError as Error, 'ai_error');
      throw new Error(streamError instanceof Error ? streamError.message : 'Failed to receive AI response');
    }
    
    perfTracker.checkpoint('ai_response_received');
    
    // Log token usage
    if (inputTokens > 0 || outputTokens > 0) {
      analytics.logTokenUsage(requestId, inputTokens, outputTokens, cachedTokens);
    }
      
    console.log('Generated response length:', responseText.length, 'chars');
    console.log('Estimated output tokens:', outputTokens);
    
    if (outputTokens > 15000) {
      console.warn('⚠️ Response approaching 16K token limit - may be truncated!');
    }
    
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse delimiter-based response
    const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===/);
    const descriptionMatch = responseText.match(/===DESCRIPTION===\s*([\s\S]*?)\s*===/);
    const appTypeMatch = responseText.match(/===APP_TYPE===\s*([\s\S]*?)\s*===/);
    const changeTypeMatch = responseText.match(/===CHANGE_TYPE===\s*([\s\S]*?)\s*===/);
    const changeSummaryMatch = responseText.match(/===CHANGE_SUMMARY===\s*([\s\S]*?)\s*===/);
    const dependenciesMatch = responseText.match(/===DEPENDENCIES===\s*([\s\S]*?)\s*===/);
    const setupMatch = responseText.match(/===SETUP===\s*([\s\S]*?)\s*===END===/);
    if (!nameMatch || !descriptionMatch) {
      console.error('Failed to parse response');
      
      analytics.logRequestError(requestId, 'Failed to parse delimiter-based response', 'parsing_error', {
        modelUsed: modelName,
        responseLength: responseText.length,
      });
      
      return NextResponse.json({
        error: 'Invalid response format from Claude',
        debug: {
          responseLength: responseText.length,
          preview: responseText.substring(0, 1000)
        }
      }, { status: 500 });
    }
    
    const name = nameMatch[1].trim().split('\n')[0].trim();
    const descriptionText = descriptionMatch[1].trim().split('\n')[0].trim();
    const appType = appTypeMatch ? appTypeMatch[1].trim().split('\n')[0].trim() : 'FRONTEND_ONLY';

    // Extract files
    const fileMatches = responseText.matchAll(/===FILE:([\s\S]*?)===\s*([\s\S]*?)(?====FILE:|===DEPENDENCIES===|===SETUP===|===END===|$)/g);
    const files: Array<{ path: string; content: string; description: string }> = [];
    
    for (const match of fileMatches) {
      const path = match[1].trim();
      const content = match[2].trim();
      files.push({
        path,
        content,
        description: `${path.split('/').pop()} file`
      });
    }
    
    console.log('Parsed files:', files.length);
    perfTracker.checkpoint('response_parsed');

    // Validation layer
    console.log('🔍 Validating generated code...');
    
    const validationErrors: Array<{ file: string; errors: ValidationError[] }> = [];
    let totalErrors = 0;
    let autoFixedCount = 0;
    
    files.forEach(file => {
      if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || 
          file.path.endsWith('.jsx') || file.path.endsWith('.js')) {
        
        const validation = validateGeneratedCode(file.content, file.path);
        
        if (!validation.valid) {
          console.log(`⚠️ Found ${validation.errors.length} error(s) in ${file.path}`);
          totalErrors += validation.errors.length;
          
          const fixedCode = autoFixCode(file.content, validation.errors);
          if (fixedCode !== file.content) {
            console.log(`✅ Auto-fixed errors in ${file.path}`);
            file.content = fixedCode;
            autoFixedCount += validation.errors.filter(e => e.type === 'UNCLOSED_STRING').length;
            
            const revalidation = validateGeneratedCode(fixedCode, file.path);
            if (!revalidation.valid) {
              validationErrors.push({
                file: file.path,
                errors: revalidation.errors
              });
            }
          } else {
            validationErrors.push({
              file: file.path,
              errors: validation.errors
            });
          }
        }
      }
    });
    
    if (totalErrors > 0) {
      console.log(`📊 Validation Summary:`);
      console.log(`   Total errors found: ${totalErrors}`);
      console.log(`   Auto-fixed: ${autoFixedCount}`);
      console.log(`   Remaining: ${totalErrors - autoFixedCount}`);
      
      // Log validation to analytics
      analytics.logValidation(requestId, totalErrors, autoFixedCount);
    } else {
      console.log(`✅ All code validated successfully`);
    }
    
    perfTracker.checkpoint('validation_complete');
    
    const validationWarnings = validationErrors.length > 0 ? {
      hasWarnings: true,
      message: `Code validation detected ${totalErrors - autoFixedCount} potential issue(s).`,
      details: validationErrors
    } : undefined;
    
    // Parse dependencies
    const dependencies: Record<string, string> = {};
    if (dependenciesMatch) {
      const depsText = dependenciesMatch[1].trim();
      const depsLines = depsText.split('\n');
      for (const line of depsLines) {
        const [pkg, version] = line.split(':').map(s => s.trim());
        if (pkg && version) {
          dependencies[pkg] = version;
        }
      }
    }

    const changeType = changeTypeMatch ? changeTypeMatch[1].trim().split('\n')[0].trim() : 'NEW_APP';
    
    const appData = {
      name: name,
      description: descriptionText,
      appType: appType,
      changeType: changeType,
      changeSummary: changeSummaryMatch ? changeSummaryMatch[1].trim() : '',
      files,
      dependencies,
      setupInstructions: setupMatch ? setupMatch[1].trim() : 'Run npm install && npm run dev',
      ...(validationWarnings && { validationWarnings })
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
      },
    });
    
    if (process.env.NODE_ENV === 'development') {
      perfTracker.log('Full-App Route');
    }

    return NextResponse.json(appData);
  } catch (error) {
    console.error('Error in full app builder route:', error);
    
    // Log error to analytics
    analytics.logRequestError(
      requestId,
      error as Error,
      categorizeError(error as Error)
    );
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate app' },
      { status: 500 }
    );
  }
}
