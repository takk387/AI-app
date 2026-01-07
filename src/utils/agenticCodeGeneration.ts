/**
 * Agentic Code Generation Utility
 *
 * Provides tool-use based code generation where Claude can validate
 * code incrementally during generation. This is an ENHANCEMENT that
 * runs ALONGSIDE existing post-hoc validation, not a replacement.
 *
 * Option A Implementation: Minimal SDK Integration
 * - Adds validation tools that Claude can use during generation
 * - Handles tool call loop
 * - Returns same format as non-agentic generation for seamless integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, type ValidationResult } from '@/utils/codeValidator';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Tools available to Claude during agentic code generation
 * These allow Claude to validate code DURING generation, not after
 */
export const CODE_VALIDATION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'validate_typescript',
    description: `Validate TypeScript/TSX code for syntax errors. Use this tool to check your code BEFORE including it in the final output.

    Returns validation results including:
    - valid: boolean indicating if code is valid
    - errors: array of syntax errors with line numbers and descriptions

    Use this when generating complex components or logic to catch errors early.`,
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The TypeScript/TSX code to validate',
        },
        filePath: {
          type: 'string',
          description:
            'The file path (e.g., src/App.tsx) - used to determine TS vs JS validation rules',
        },
      },
      required: ['code', 'filePath'],
    },
  },
  {
    name: 'check_react_patterns',
    description: `Check React code for common issues including:
    - React hooks rules violations (hooks in conditionals, loops, etc.)
    - Missing key props in lists
    - Nested function declarations (causes strict mode errors)

    Use this after generating React components to ensure they follow best practices.`,
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The React component code to check',
        },
      },
      required: ['code'],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'validate_typescript': {
      const code = toolInput.code as string;
      const filePath = (toolInput.filePath as string) || 'src/App.tsx';

      try {
        const result = await validateGeneratedCode(code, filePath);
        return formatValidationResult(result, 'TypeScript validation');
      } catch (error) {
        return JSON.stringify({
          valid: false,
          error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    case 'check_react_patterns': {
      const code = toolInput.code as string;

      try {
        // Use existing validator which includes React pattern checks
        const result = await validateGeneratedCode(code, 'src/Component.tsx');
        return formatValidationResult(result, 'React pattern check');
      } catch (error) {
        return JSON.stringify({
          valid: false,
          error: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    default:
      return JSON.stringify({
        error: `Unknown tool: ${toolName}`,
      });
  }
}

/**
 * Format validation result for Claude to understand
 */
function formatValidationResult(result: ValidationResult, checkType: string): string {
  if (result.valid) {
    return JSON.stringify({
      valid: true,
      message: `${checkType} passed - no errors found`,
    });
  }

  // Format errors for Claude to understand and fix
  const formattedErrors = result.errors.map((error) => ({
    type: error.type,
    message: error.message,
    line: error.line,
    severity: error.severity,
    fix: error.fix,
    code: error.code?.substring(0, 100), // Truncate long code snippets
  }));

  return JSON.stringify({
    valid: false,
    errorCount: result.errors.length,
    errors: formattedErrors,
    suggestion: 'Fix the errors above before including this code in the final output',
  });
}

// ============================================================================
// AGENTIC GENERATION LOOP
// ============================================================================

/**
 * Configuration for agentic generation
 */
export interface AgenticGenerationConfig {
  maxToolIterations: number; // Max tool call rounds (default: 3)
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  model: string;
  maxTokens: number;
  thinkingBudget: number;
  onProgress?: (message: string) => Promise<void>;
}

/**
 * Result from agentic generation
 */
export interface AgenticGenerationResult {
  success: boolean;
  responseText: string;
  toolCallsMade: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  error?: string;
}

/**
 * Run agentic code generation with tool use
 *
 * This function implements a tool-use loop where Claude can:
 * 1. Generate code
 * 2. Call validation tools to check the code
 * 3. See validation results
 * 4. Fix any issues before final output
 *
 * The loop continues until Claude produces a final response without tool calls
 * or max iterations is reached.
 */
export async function runAgenticGeneration(
  anthropic: Anthropic,
  config: AgenticGenerationConfig
): Promise<AgenticGenerationResult> {
  const {
    maxToolIterations = 3,
    systemPrompt,
    messages,
    model,
    maxTokens,
    thinkingBudget,
    onProgress,
  } = config;

  let currentMessages = [...messages];
  let totalToolCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cachedTokens = 0;

  // Add tool use instructions to help Claude know tools are available
  const enhancedSystemPrompt = `${systemPrompt}

## VALIDATION TOOLS AVAILABLE
You have access to validation tools to check your code DURING generation:
- validate_typescript: Check TypeScript/TSX syntax before including code
- check_react_patterns: Verify React best practices (hooks rules, key props, etc.)

Use these tools when generating complex components to catch and fix errors early.
You do NOT have to use them for every piece of code - use your judgment.
After validation, include the corrected code in your final response.`;

  for (let iteration = 0; iteration < maxToolIterations; iteration++) {
    if (onProgress) {
      await onProgress(
        iteration === 0
          ? 'AI is generating code with validation...'
          : `AI is refining code (iteration ${iteration + 1})...`
      );
    }

    try {
      // Call Claude with tools enabled
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 1,
        thinking: {
          type: 'enabled',
          budget_tokens: thinkingBudget,
        },
        tools: CODE_VALIDATION_TOOLS,
        system: [
          {
            type: 'text',
            text: enhancedSystemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: currentMessages,
      });

      // Track token usage
      totalInputTokens += response.usage.input_tokens || 0;
      totalOutputTokens += response.usage.output_tokens || 0;
      cachedTokens += response.usage.cache_read_input_tokens || 0;

      // Check if response contains tool use
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // If no tool calls, we have the final response
      if (toolUseBlocks.length === 0) {
        // Extract text from response
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === 'text'
        );
        const responseText = textBlocks.map((b) => b.text).join('');

        return {
          success: true,
          responseText,
          toolCallsMade: totalToolCalls,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cachedTokens,
        };
      }

      // Handle tool calls
      totalToolCalls += toolUseBlocks.length;

      if (onProgress) {
        await onProgress(
          `Validating code (${toolUseBlocks.length} check${toolUseBlocks.length > 1 ? 's' : ''})...`
        );
      }

      // Execute each tool call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeToolCall(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add assistant response and tool results to messages for next iteration
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    } catch (error) {
      return {
        success: false,
        responseText: '',
        toolCallsMade: totalToolCalls,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cachedTokens,
        error: error instanceof Error ? error.message : 'Unknown error during agentic generation',
      };
    }
  }

  // Max iterations reached - return whatever we have
  return {
    success: false,
    responseText: '',
    toolCallsMade: totalToolCalls,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cachedTokens,
    error: `Max tool iterations (${maxToolIterations}) reached without final response`,
  };
}

// ============================================================================
// PROMPT ENHANCEMENT
// ============================================================================

/**
 * Enhance a prompt to encourage tool use for validation
 * This is OPTIONAL - Claude will still work without calling tools
 */
export function getToolUseEncouragement(): string {
  return `
TIP: You can use the validate_typescript and check_react_patterns tools to verify your code before including it in the final output. This helps catch syntax errors and React issues early.`;
}
