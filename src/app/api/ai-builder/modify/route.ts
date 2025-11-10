import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { executeASTOperation, isASTOperation, type ASTOperation } from '@/utils/astExecutor';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import { buildModifyPrompt } from '@/prompts/builder';
import { analytics, generateRequestId, categorizeError, PerformanceTracker, type ErrorCategory } from '@/utils/analytics';
import { 
  generateRetryStrategy, 
  type RetryContext, 
  DEFAULT_RETRY_CONFIG,
  type RetryConfig 
} from '@/utils/retryLogic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// TypeScript interfaces for diff format
interface DiffChange {
  type: 'ADD_IMPORT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'REPLACE' | 'DELETE' | 'APPEND' 
      | 'AST_WRAP_ELEMENT' | 'AST_ADD_STATE' | 'AST_ADD_IMPORT' | 'AST_MODIFY_CLASSNAME'
      | 'AST_INSERT_JSX' | 'AST_ADD_USEEFFECT' | 'AST_MODIFY_PROP' | 'AST_ADD_AUTHENTICATION'
      | 'AST_ADD_REF' | 'AST_ADD_MEMO' | 'AST_ADD_CALLBACK' | 'AST_ADD_REDUCER';
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

interface FileDiff {
  path: string;
  action: 'MODIFY' | 'CREATE' | 'DELETE';
  changes: DiffChange[];
}

interface StagePlan {
  currentStage: number;
  totalStages: number;
  stageDescription: string;
  nextStages: string[];
}

interface DiffResponse {
  changeType: 'MODIFICATION';
  summary: string;
  files: FileDiff[];
  stagePlan?: StagePlan;
}

export async function POST(request: Request) {
  // ============================================================================
  // ANALYTICS - Phase 4: Track request metrics
  // ============================================================================
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();
  
  try {
    const { prompt, currentAppState, conversationHistory } = await request.json();
    perfTracker.checkpoint('request_parsed');
    
    // Log request start after parsing body
    analytics.logRequestStart('ai-builder/modify', requestId, {
      hasConversationHistory: !!conversationHistory,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
    }

    if (!currentAppState) {
      return NextResponse.json({
        error: 'Current app state is required for modifications'
      }, { status: 400 });
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

    console.log('✅ Phase 3: Using compressed modular prompts');
    console.log('📊 Token estimate:', estimatedPromptTokens, 'tokens');
    
    perfTracker.checkpoint('prompt_built');

    console.log('Generating modifications with Claude Sonnet 4.5...');

    // Extract current file contents for AI reference
    let fileContentsSection = '';
    if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
      fileContentsSection = '\n\n📁 **CURRENT FILE CONTENTS** (Read these EXACTLY for your SEARCH blocks):\n\n';
      currentAppState.files.forEach((file: any) => {
        fileContentsSection += `\n${'='.repeat(60)}\n`;
        fileContentsSection += `FILE: ${file.path}\n`;
        fileContentsSection += `${'='.repeat(60)}\n`;
        fileContentsSection += file.content;
        fileContentsSection += `\n${'='.repeat(60)}\n`;
      });
      fileContentsSection += '\n⚠️ CRITICAL: Your SEARCH blocks must match the code above EXACTLY (character-for-character, including all whitespace and indentation).\n';
    }

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

    // Add current modification request WITH file contents
    const enhancedPrompt = fileContentsSection 
      ? `${fileContentsSection}\n\n🎯 **USER REQUEST:**\n${prompt}`
      : prompt;
    
    messages.push({ role: 'user', content: enhancedPrompt });

    // Use streaming for better handling with timeout
    const modelName = 'claude-sonnet-4-5-20250929';
    const stream = await anthropic.messages.stream({
      model: modelName,
      max_tokens: 4096,
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

    // Collect the full response with timeout
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedTokens = 0;
    const timeout = 45000; // 45 seconds
    const startTime = Date.now();
    
    try {
      for await (const chunk of stream) {
        if (Date.now() - startTime > timeout) {
          throw new Error('AI response timeout - the modification was taking too long. Please try a simpler request or try again.');
        }
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
      
    console.log('Modification response length:', responseText.length, 'chars');
    console.log('Response preview:', responseText.substring(0, 500));
    
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse JSON response
    let diffResponse: DiffResponse;
    
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      
      diffResponse = JSON.parse(jsonString.trim());
      
      // Validate response structure
      if (!diffResponse.changeType || !diffResponse.summary || !diffResponse.files) {
        throw new Error('Invalid diff response structure');
      }
      
      console.log('Parsed diff response:', {
        changeType: diffResponse.changeType,
        summary: diffResponse.summary,
        filesCount: diffResponse.files.length
      });
      
    } catch (parseError) {
      console.error('Failed to parse diff response:', parseError);
      console.error('Response text:', responseText);
      
      analytics.logRequestError(requestId, parseError as Error, 'parsing_error', {
        modelUsed: modelName,
        responseLength: responseText.length,
      });
      
      return NextResponse.json({
        error: 'The AI had trouble understanding how to modify your app. This can happen with complex changes. Try breaking your request into smaller steps, or use simpler language.',
        suggestion: 'Try asking for one change at a time, like "add a button" or "change the color to blue".',
        technicalDetails: {
          responsePreview: responseText.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

    // ============================================================================
    // VALIDATION LAYER - Validate code snippets in diff instructions
    // ============================================================================
    console.log('🔍 Validating code snippets in modification instructions...');
    
    const validationErrors: Array<{ file: string; change: number; errors: ValidationError[] }> = [];
    let totalSnippets = 0;
    let validatedSnippets = 0;
    let errorsFound = 0;
    
    // Validate code snippets in each file's changes
    diffResponse.files.forEach(fileDiff => {
      // Only validate .tsx/.ts/.jsx/.js files
      if (!fileDiff.path.match(/\.(tsx|ts|jsx|js)$/)) {
        return;
      }
      
      fileDiff.changes.forEach((change, index) => {
        // Collect code snippets to validate
        const snippetsToValidate: Array<{ field: string; code: string }> = [];
        
        if (change.content) snippetsToValidate.push({ field: 'content', code: change.content });
        if (change.replaceWith) snippetsToValidate.push({ field: 'replaceWith', code: change.replaceWith });
        if (change.jsx) snippetsToValidate.push({ field: 'jsx', code: change.jsx });
        if (change.body) snippetsToValidate.push({ field: 'body', code: change.body });
        
        snippetsToValidate.forEach(({ field, code }) => {
          totalSnippets++;
          const validation = validateGeneratedCode(code, fileDiff.path);
          
          if (!validation.valid) {
            console.log(`⚠️ Found ${validation.errors.length} error(s) in ${fileDiff.path} change #${index + 1} (${field})`);
            errorsFound += validation.errors.length;
            
            // Attempt auto-fix
            const fixedCode = autoFixCode(code, validation.errors);
            if (fixedCode !== code) {
              console.log(`✅ Auto-fixed errors in ${field}`);
              // Update the change with fixed code
              if (field === 'content') change.content = fixedCode;
              else if (field === 'replaceWith') change.replaceWith = fixedCode;
              else if (field === 'jsx') change.jsx = fixedCode;
              else if (field === 'body') change.body = fixedCode;
              
              validatedSnippets++;
            } else {
              // Couldn't auto-fix, add to errors
              validationErrors.push({
                file: fileDiff.path,
                change: index + 1,
                errors: validation.errors
              });
            }
          } else {
            validatedSnippets++;
          }
        });
      });
    });
    
    // Log validation summary
    if (totalSnippets > 0) {
      console.log(`📊 Validation Summary:`);
      console.log(`   Code snippets checked: ${totalSnippets}`);
      console.log(`   Errors found: ${errorsFound}`);
      console.log(`   Successfully validated/fixed: ${validatedSnippets}`);
      console.log(`   Remaining issues: ${validationErrors.length}`);
      
      // Log validation to analytics
      analytics.logValidation(requestId, errorsFound, errorsFound - validationErrors.length);
    }
    
    perfTracker.checkpoint('validation_complete');
    
    // Add validation warnings if errors remain
    const validationWarnings = validationErrors.length > 0 ? {
      hasWarnings: true,
      message: `Code validation detected ${validationErrors.length} issue(s) in modification instructions. Review before applying.`,
      details: validationErrors
    } : undefined;
    
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
      },
    });
    
    if (process.env.NODE_ENV === 'development') {
      perfTracker.log('Modify Route');
    }

    return NextResponse.json({
      ...diffResponse,
      ...(validationWarnings && { validationWarnings })
    });
    
  } catch (error) {
    console.error('Error in modify route:', error);
    
    // Log error to analytics
    analytics.logRequestError(
      requestId,
      error as Error,
      categorizeError(error as Error)
    );
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate modifications' },
      { status: 500 }
    );
  }
}
