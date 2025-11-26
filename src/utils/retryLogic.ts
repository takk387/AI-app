/**
 * Retry Logic with Specific Fixes
 * Phase 5.2: Architectural Improvements
 * 
 * Implements intelligent retry mechanism with error-specific correction prompts
 * to guide the AI toward successful responses.
 */

import { ErrorCategory } from './analytics';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;        // Maximum retry attempts (default: 2)
  retryableErrors: ErrorCategory[]; // Which error types can be retried
  includeOriginalPrompt: boolean;   // Include original request in retry
}

export interface RetryContext {
  attemptNumber: number;      // Current attempt (1-based)
  previousError: string;      // Error message from previous attempt
  errorCategory: ErrorCategory; // Categorized error type
  originalResponse?: string;  // AI's problematic response
  validationDetails?: any;    // Validation error details
}

export interface RetryResult {
  shouldRetry: boolean;       // Whether to attempt retry
  correctionPrompt?: string;  // Additional prompt to guide AI
  retryDelay?: number;        // Milliseconds to wait before retry
}

// Phase-specific error categories
export type PhaseErrorCategory = ErrorCategory | 'phase_extraction_error' | 'phase_too_large' | 'phase_truncation';

export interface PhaseRetryContext extends RetryContext {
  errorCategory: PhaseErrorCategory;
  phaseNumber?: number;
  estimatedTokens?: number;
}

// ============================================================================
// RETRY DECISION ENGINE
// ============================================================================

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  retryableErrors: [
    'parsing_error',
    'validation_error',
    'ai_error',
    'timeout_error',
  ],
  includeOriginalPrompt: true,
};

/**
 * Determine if an error should be retried
 */
export function shouldRetryError(
  error: Error | string,
  errorCategory: ErrorCategory,
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // Don't retry if max attempts reached
  if (attemptNumber >= config.maxAttempts) {
    return false;
  }
  
  // Don't retry non-retryable errors
  if (!config.retryableErrors.includes(errorCategory)) {
    return false;
  }
  
  // Don't retry rate limit errors (they need exponential backoff)
  if (errorCategory === 'rate_limit_error') {
    return false;
  }
  
  return true;
}

/**
 * Generate error-specific retry strategy
 */
export function generateRetryStrategy(
  context: RetryContext,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryResult {
  // Check if retry is allowed
  if (!shouldRetryError(
    context.previousError,
    context.errorCategory,
    context.attemptNumber,
    config
  )) {
    return { shouldRetry: false };
  }
  
  // Generate error-specific correction prompt
  const correctionPrompt = generateCorrectionPrompt(context);
  
  // Calculate retry delay (if needed)
  const retryDelay = calculateRetryDelay(context);
  
  return {
    shouldRetry: true,
    correctionPrompt,
    retryDelay,
  };
}

// ============================================================================
// ERROR-SPECIFIC CORRECTION PROMPTS
// ============================================================================

/**
 * Generate correction prompt based on error type
 */
function generateCorrectionPrompt(context: RetryContext): string {
  switch (context.errorCategory) {
    case 'parsing_error':
      return generateParsingErrorPrompt(context);
    
    case 'validation_error':
      return generateValidationErrorPrompt(context);
    
    case 'ai_error':
      return generateAIErrorPrompt(context);
    
    case 'timeout_error':
      return generateTimeoutErrorPrompt(context);
    
    default:
      return generateGenericErrorPrompt(context);
  }
}

/**
 * Correction prompt for JSON parsing errors
 */
function generateParsingErrorPrompt(context: RetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - JSON PARSING ERROR

**Error**: ${context.previousError}

**Problem**: Your previous response could not be parsed as valid JSON.

**CRITICAL FIXES NEEDED**:
1. ✅ Return ONLY valid JSON - NO markdown code blocks
2. ✅ Use proper JSON syntax (double quotes, no trailing commas)
3. ✅ Ensure all braces and brackets are balanced
4. ✅ Escape special characters in strings properly

**CORRECT FORMAT EXAMPLE**:
{
  "changeType": "MODIFICATION",
  "summary": "Brief description",
  "files": [{
    "path": "src/App.tsx",
    "action": "MODIFY",
    "changes": [
      {"type": "ADD_IMPORT", "content": "import { useState } from 'react';"},
      {"type": "INSERT_AFTER", "searchFor": "export default function App() {", "content": "  const [count, setCount] = useState(0);"}
    ]
  }]
}

**IMPORTANT**: Start your response with { and end with } - nothing else.

Now, please retry the request with valid JSON output:`;
}

/**
 * Correction prompt for validation errors
 */
function generateValidationErrorPrompt(context: RetryContext): string {
  const validationIssues = context.validationDetails 
    ? formatValidationIssues(context.validationDetails)
    : 'See error details above';
    
  return `
⚠️ PREVIOUS ATTEMPT FAILED - CODE VALIDATION ERROR

**Error**: ${context.previousError}

**Validation Issues Found**:
${validationIssues}

**CRITICAL FIXES NEEDED**:
1. ✅ Fix all unclosed strings (check quotes and template literals)
2. ✅ Balance all JSX tags (every <div> needs </div>)
3. ✅ Don't use TypeScript syntax in .jsx files
4. ✅ Avoid nested function declarations (use arrow functions or move functions outside)

**VALIDATION CHECKLIST**:
- [ ] All strings are properly closed
- [ ] All JSX tags are balanced
- [ ] No TypeScript in .jsx files
- [ ] No nested function declarations

Now, please retry with corrected code that passes validation:`;
}

/**
 * Correction prompt for AI/API errors
 */
function generateAIErrorPrompt(context: RetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - AI PROCESSING ERROR

**Error**: ${context.previousError}

**Problem**: The AI service encountered an error processing your request.

**SIMPLIFICATION STRATEGIES**:
1. ✅ Break complex changes into smaller, focused modifications
2. ✅ Reduce the number of files being modified at once
3. ✅ Use more specific search patterns
4. ✅ Simplify the modification approach

**TIPS FOR SUCCESS**:
- Focus on ONE main change at a time
- Use exact code snippets from the file (not summaries)
- Keep changes minimal and surgical
- Verify your searchFor patterns are unique

Now, please retry with a simplified approach:`;
}

/**
 * Correction prompt for timeout errors
 */
function generateTimeoutErrorPrompt(context: RetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - REQUEST TIMEOUT

**Error**: ${context.previousError}

**Problem**: The modification took too long to process.

**REQUIRED ACTIONS**:
1. ✅ Reduce scope - make FEWER changes
2. ✅ Simplify modifications - use simpler approaches
3. ✅ Break into stages if needed
4. ✅ Focus on the most critical change only

**GUIDELINES**:
- Modify maximum 1-2 files per request
- Use maximum 3-5 changes per file
- Prefer simple string operations over complex AST operations
- Save complex changes for follow-up requests

Now, please retry with a MUCH simpler, focused modification:`;
}

/**
 * Generic correction prompt for other errors
 */
function generateGenericErrorPrompt(context: RetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED

**Error**: ${context.previousError}

**Attempt ${context.attemptNumber + 1}** - Please address the error and try again.

**GENERAL GUIDELINES**:
1. ✅ Double-check your JSON syntax
2. ✅ Verify your search patterns match the file exactly
3. ✅ Keep modifications minimal and focused
4. ✅ Follow the response format precisely

Now, please retry addressing the error above:`;
}

// ============================================================================
// VALIDATION ERROR FORMATTING
// ============================================================================

/**
 * Format validation errors for display in correction prompt
 */
function formatValidationIssues(validationDetails: any): string {
  if (!validationDetails || !Array.isArray(validationDetails)) {
    return '(validation details unavailable)';
  }
  
  const issues: string[] = [];
  
  validationDetails.forEach((detail: any, index: number) => {
    if (detail.errors && Array.isArray(detail.errors)) {
      detail.errors.forEach((error: any) => {
        issues.push(`${index + 1}. [${detail.file}] ${error.type}: ${error.message}`);
      });
    }
  });
  
  return issues.length > 0 
    ? issues.join('\n')
    : '(no specific issues listed)';
}

// ============================================================================
// RETRY TIMING & BACKOFF
// ============================================================================

/**
 * Calculate retry delay based on attempt number and error type
 */
function calculateRetryDelay(context: RetryContext): number {
  // No delay for first retry
  if (context.attemptNumber === 1) {
    return 0;
  }
  
  // Exponential backoff for rate limit errors
  if (context.errorCategory === 'rate_limit_error') {
    return Math.min(1000 * Math.pow(2, context.attemptNumber), 30000);
  }
  
  // Small delay for other errors to avoid overwhelming the API
  return 500 * context.attemptNumber;
}

// ============================================================================
// RETRY EXECUTION HELPER
// ============================================================================

/**
 * Execute a function with retry logic
 * 
 * @param fn - Async function to execute
 * @param createRetryContext - Function to create retry context from error
 * @param config - Retry configuration
 * @returns Result or throws final error
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  createRetryContext: (error: Error, attempt: number) => RetryContext,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Create retry context
      const context = createRetryContext(lastError, attempt + 1);
      
      // Check if should retry
      const strategy = generateRetryStrategy(context, config);
      
      if (!strategy.shouldRetry) {
        // No more retries, throw error
        throw lastError;
      }
      
      // Log retry attempt
      console.log(`[Retry] Attempt ${attempt + 1}/${config.maxAttempts} failed. Retrying with correction...`);
      
      // Wait before retry if needed
      if (strategy.retryDelay && strategy.retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
      }
      
      // Continue to next iteration with correction prompt available
      // (caller should check for retry context and include correction prompt)
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Unknown error during retry');
}

// ============================================================================
// PATTERN MATCHING ERROR DETECTION
// ============================================================================

/**
 * Detect if error is likely due to pattern matching failure
 */
export function isPatternMatchingError(error: string, errorCategory: ErrorCategory): boolean {
  if (errorCategory !== 'ai_error' && errorCategory !== 'unknown_error') {
    return false;
  }
  
  const patterns = [
    'could not find',
    'not found',
    'no match',
    'unable to locate',
    'search pattern',
    'searchfor',
  ];
  
  const errorLower = error.toLowerCase();
  return patterns.some(pattern => errorLower.includes(pattern));
}

/**
 * Generate enhanced prompt for pattern matching errors
 */
export function generatePatternMatchingPrompt(
  fileContents: string,
  searchPattern: string
): string {
  return `
⚠️ PATTERN MATCHING ERROR DETECTED

**Problem**: Your search pattern did not match the file exactly.

**Your Search Pattern**:
\`\`\`
${searchPattern}
\`\`\`

**Actual File Contents**:
\`\`\`
${fileContents.substring(0, 2000)}${fileContents.length > 2000 ? '...(truncated)' : ''}
\`\`\`

**CRITICAL REQUIREMENTS**:
1. ✅ Copy code EXACTLY from the file above (character-for-character)
2. ✅ Include ALL whitespace and indentation exactly as shown
3. ✅ Don't paraphrase or summarize - use EXACT text
4. ✅ Include enough context to be unique (5-10 lines usually works)

**EXAMPLE OF EXACT MATCH**:
If file contains:
  const [count, setCount] = useState(0);
  
Your searchFor must be EXACTLY:
  "searchFor": "  const [count, setCount] = useState(0);"

Notice: Same indentation, same spacing, same everything.

Now retry with EXACT pattern matching:`;
}

// ============================================================================
// PHASE-SPECIFIC RETRY STRATEGIES (Fix 3.4)
// ============================================================================

/**
 * Generate phase extraction error correction prompt
 */
export function generatePhaseExtractionPrompt(context: PhaseRetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - PHASE EXTRACTION ERROR

**Error**: ${context.previousError}

**Problem**: Your phase plan response could not be parsed.

**REQUIRED FORMAT** (follow EXACTLY):

===TOTAL_PHASES===
[number between 2 and 5]
===PHASE:1===
NAME: [5 words max]
DESCRIPTION: [One sentence, 20 words max]
FEATURES:
- [Feature 1]
- [Feature 2]
===PHASE:2===
NAME: [5 words max]
DESCRIPTION: [One sentence, 20 words max]
FEATURES:
- [Feature 1]
===END_PHASES===

**CRITICAL RULES**:
1. ✅ Start IMMEDIATELY with ===TOTAL_PHASES=== (no preamble)
2. ✅ Use EXACT delimiters shown above
3. ✅ Keep NAME short (5 words max)
4. ✅ Keep DESCRIPTION to ONE sentence
5. ✅ Features as bullet points with "-"
6. ✅ End with ===END_PHASES===

Now, please retry with the EXACT format above:`;
}

/**
 * Generate phase too large correction prompt
 */
export function generatePhaseTooLargePrompt(context: PhaseRetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - PHASE TOO LARGE

**Error**: ${context.previousError}
${context.phaseNumber ? `**Phase**: ${context.phaseNumber}` : ''}
${context.estimatedTokens ? `**Estimated Tokens**: ${context.estimatedTokens}` : ''}

**Problem**: The phase has too many features and will exceed token limits.

**SOLUTION**: Break this phase into smaller sub-phases.

**RULES FOR SPLITTING**:
1. ✅ Maximum 3-4 features per phase
2. ✅ Complex features (auth, database, payments) should be isolated
3. ✅ Each phase must produce working code
4. ✅ Phase 1 must be a functional foundation

**EXAMPLE SPLIT**:
Original: "Build e-commerce with auth, products, cart, checkout, payments"

Better:
- Phase 1: Basic product listing and display
- Phase 2: Shopping cart functionality  
- Phase 3: User authentication
- Phase 4: Checkout and payments

Now, please provide a phase plan with smaller, focused phases:`;
}

/**
 * Generate phase truncation recovery prompt
 */
export function generatePhaseTruncationPrompt(context: PhaseRetryContext): string {
  return `
⚠️ PREVIOUS ATTEMPT FAILED - RESPONSE TRUNCATED

**Error**: ${context.previousError}
${context.phaseNumber ? `**Phase**: ${context.phaseNumber}` : ''}

**Problem**: The generated code was cut off before completion.

**RECOVERY STRATEGY**:
1. ✅ Generate FEWER files this time
2. ✅ Focus on the CORE functionality only
3. ✅ Defer secondary features to next phase
4. ✅ Keep each file under 200 lines

**WHAT TO PRIORITIZE**:
- Main component/page file
- Essential styles
- Core logic

**WHAT TO DEFER**:
- Utility functions (can add later)
- Animation/transitions
- Edge case handling
- Comments/documentation

Now, please retry with a MORE FOCUSED output:`;
}

/**
 * Generate retry strategy for phase-specific errors
 */
export function generatePhaseRetryStrategy(context: PhaseRetryContext): RetryResult {
  // Check if retry is allowed
  if (context.attemptNumber >= 2) {
    return { shouldRetry: false };
  }
  
  let correctionPrompt: string;
  
  switch (context.errorCategory) {
    case 'phase_extraction_error':
      correctionPrompt = generatePhaseExtractionPrompt(context);
      break;
    case 'phase_too_large':
      correctionPrompt = generatePhaseTooLargePrompt(context);
      break;
    case 'phase_truncation':
      correctionPrompt = generatePhaseTruncationPrompt(context);
      break;
    default:
      correctionPrompt = generateGenericErrorPrompt(context);
  }
  
  return {
    shouldRetry: true,
    correctionPrompt,
    retryDelay: 500,
  };
}
