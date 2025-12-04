/**
 * AI Generation Logic for Modify Route
 * Phase 5.2: Extracted for retry support
 *
 * Separates AI generation logic from route handler to enable intelligent retries
 */

import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import type { ErrorCategory } from '@/utils/analytics';

export interface GenerationContext {
  anthropic: Anthropic;
  systemPrompt: string;
  messages: any[];
  modelName: string;
  currentAppState: any;
  correctionPrompt?: string; // Added for retry with specific fixes
}

export interface GenerationResult {
  diffResponse: any;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  validationErrors: Array<{ file: string; change: number; errors: ValidationError[] }>;
  totalSnippets: number;
  validatedSnippets: number;
  errorsFound: number;
}

export interface GenerationError extends Error {
  category: ErrorCategory;
  originalResponse?: string;
  validationDetails?: any;
}

/**
 * Generate modifications from AI with validation
 */
export async function generateModifications(
  context: GenerationContext,
  attemptNumber: number = 1
): Promise<GenerationResult> {
  const { anthropic, systemPrompt, messages, modelName, correctionPrompt } = context;

  // Add correction prompt if this is a retry
  const enhancedMessages =
    correctionPrompt && attemptNumber > 1
      ? [...messages, { role: 'user', content: correctionPrompt }]
      : messages;

  console.log(
    attemptNumber > 1
      ? `🔄 Retry attempt ${attemptNumber} with correction prompt`
      : 'Generating modifications with Claude Sonnet 4.5...'
  );

  // Use streaming for better handling with timeout
  const stream = await anthropic.messages.stream({
    model: modelName,
    max_tokens: 28000, // Match foundation phase for complex modifications
    temperature: 1, // Required for extended thinking
    thinking: {
      type: 'enabled',
      budget_tokens: 12000, // Increased for complex modification planning
    },
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: enhancedMessages,
  });

  // Collect the full response with timeout
  let responseText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  const timeout = 120000; // 120 seconds (2 minutes) - matches foundation phase
  const startTime = Date.now();

  try {
    for await (const chunk of stream) {
      if (Date.now() - startTime > timeout) {
        const error = new Error(
          'AI response timeout - the modification was taking too long. Please try a simpler request or try again.'
        ) as GenerationError;
        error.category = 'timeout_error';
        throw error;
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
    const error = new Error(
      streamError instanceof Error ? streamError.message : 'Failed to receive AI response'
    ) as GenerationError;
    error.category = 'ai_error';
    throw error;
  }

  console.log('Modification response length:', responseText.length, 'chars');
  console.log('Response preview:', responseText.substring(0, 500));

  if (!responseText) {
    const error = new Error('No response from Claude') as GenerationError;
    error.category = 'ai_error';
    throw error;
  }

  // Parse JSON response
  let diffResponse: any;

  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : responseText;

    diffResponse = JSON.parse(jsonString.trim());

    // Validate response structure
    if (!diffResponse.changeType || !diffResponse.summary || !diffResponse.files) {
      const error = new Error('Invalid diff response structure') as GenerationError;
      error.category = 'parsing_error';
      error.originalResponse = responseText;
      throw error;
    }

    console.log('Parsed diff response:', {
      changeType: diffResponse.changeType,
      summary: diffResponse.summary,
      filesCount: diffResponse.files.length,
    });
  } catch (parseError) {
    console.error('Failed to parse diff response:', parseError);
    console.error('Response text:', responseText);

    const error = parseError as GenerationError;
    error.category = 'parsing_error';
    error.originalResponse = responseText;
    throw error;
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
  for (const fileDiff of diffResponse.files) {
    // Only validate .tsx/.ts/.jsx/.js files
    if (!fileDiff.path.match(/\.(tsx|ts|jsx|js)$/)) {
      continue;
    }

    for (const [index, change] of fileDiff.changes.entries()) {
      // Collect code snippets to validate
      const snippetsToValidate: Array<{ field: string; code: string }> = [];

      if (change.content) snippetsToValidate.push({ field: 'content', code: change.content });
      if (change.replaceWith)
        snippetsToValidate.push({ field: 'replaceWith', code: change.replaceWith });
      if (change.jsx) snippetsToValidate.push({ field: 'jsx', code: change.jsx });
      if (change.body) snippetsToValidate.push({ field: 'body', code: change.body });

      for (const { field, code } of snippetsToValidate) {
        totalSnippets++;
        const validation = await validateGeneratedCode(code, fileDiff.path);

        if (!validation.valid) {
          console.log(
            `⚠️ Found ${validation.errors.length} error(s) in ${fileDiff.path} change #${index + 1} (${field})`
          );
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
              errors: validation.errors,
            });
          }
        } else {
          validatedSnippets++;
        }
      }
    }
  }

  // Log validation summary
  if (totalSnippets > 0) {
    console.log(`📊 Validation Summary:`);
    console.log(`   Code snippets checked: ${totalSnippets}`);
    console.log(`   Errors found: ${errorsFound}`);
    console.log(`   Successfully validated/fixed: ${validatedSnippets}`);
    console.log(`   Remaining issues: ${validationErrors.length}`);
  }

  // If validation failed and we have unfixed errors, throw for retry
  if (validationErrors.length > 0 && attemptNumber === 1) {
    const error = new Error(
      `Validation failed: ${validationErrors.length} issues found`
    ) as GenerationError;
    error.category = 'validation_error';
    error.validationDetails = validationErrors;
    error.originalResponse = responseText;
    throw error;
  }

  return {
    diffResponse,
    responseText,
    inputTokens,
    outputTokens,
    cachedTokens,
    validationErrors,
    totalSnippets,
    validatedSnippets,
    errorsFound,
  };
}
