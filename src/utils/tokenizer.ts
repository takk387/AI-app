/**
 * Token Counting Utility
 *
 * Provides accurate token counting using tiktoken (cl100k_base encoding).
 * This encoding is used by GPT-4 and is a reasonable approximation for Claude.
 *
 * For Claude-specific tokenization, the actual count may vary slightly,
 * but cl100k_base provides a good estimate that's much more accurate than
 * simple character-based estimation.
 */

import { getEncoding, Tiktoken } from 'js-tiktoken';

// ============================================================================
// TOKENIZER SINGLETON
// ============================================================================

let encoder: Tiktoken | null = null;

/**
 * Get or create the tokenizer instance
 * Uses cl100k_base encoding (GPT-4/Claude compatible)
 */
function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = getEncoding('cl100k_base');
  }
  return encoder;
}

// ============================================================================
// TOKEN COUNTING
// ============================================================================

/**
 * Count tokens in a string using tiktoken
 *
 * @param text - Text to count tokens for
 * @returns Number of tokens
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  try {
    const enc = getEncoder();
    return enc.encode(text).length;
  } catch (error) {
    // Fallback to estimation if encoding fails
    console.warn('[Tokenizer] Encoding failed, falling back to estimation:', error);
    return estimateTokensFallback(text);
  }
}

/**
 * Count tokens in an array of strings
 *
 * @param texts - Array of texts
 * @returns Total token count
 */
export function countTokensArray(texts: string[]): number {
  return texts.reduce((sum, text) => sum + countTokens(text), 0);
}

/**
 * Count tokens for a message (role + content)
 * Adds overhead for message formatting
 *
 * @param role - Message role (user/assistant/system)
 * @param content - Message content
 * @returns Token count including message overhead
 */
export function countMessageTokens(role: string, content: string): number {
  // Message format overhead: ~4 tokens per message for role/formatting
  const MESSAGE_OVERHEAD = 4;
  return countTokens(content) + MESSAGE_OVERHEAD;
}

/**
 * Count tokens for an array of messages
 *
 * @param messages - Array of {role, content} objects
 * @returns Total token count
 */
export function countMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  // Base overhead for conversation structure
  const CONVERSATION_OVERHEAD = 3;

  const messageTokens = messages.reduce(
    (sum, msg) => sum + countMessageTokens(msg.role, msg.content),
    0
  );

  return messageTokens + CONVERSATION_OVERHEAD;
}

// ============================================================================
// FALLBACK ESTIMATION
// ============================================================================

/**
 * Fallback token estimation when tiktoken fails
 * Uses improved heuristics based on token patterns
 *
 * @param text - Text to estimate
 * @returns Estimated token count
 */
function estimateTokensFallback(text: string): number {
  if (!text) return 0;

  // More accurate estimation based on content type
  let tokens = 0;

  // Split into words and punctuation
  const parts = text.split(/(\s+|[^\w\s]+)/);

  for (const part of parts) {
    if (!part || part.trim() === '') continue;

    // Whitespace
    if (/^\s+$/.test(part)) {
      // Whitespace is usually merged with adjacent tokens
      continue;
    }

    // Punctuation (usually 1 token each)
    if (/^[^\w\s]+$/.test(part)) {
      tokens += part.length;
      continue;
    }

    // Words
    const word = part.toLowerCase();

    // Common short words are usually 1 token
    if (word.length <= 4) {
      tokens += 1;
    }
    // Medium words might be 1-2 tokens
    else if (word.length <= 8) {
      tokens += Math.ceil(word.length / 5);
    }
    // Longer words are often split into subwords
    else {
      tokens += Math.ceil(word.length / 4);
    }

    // Technical terms, camelCase, snake_case add extra tokens
    if (/[A-Z]/.test(part) && /[a-z]/.test(part)) {
      // camelCase adds ~1 token per case change
      const caseChanges = (part.match(/[a-z][A-Z]/g) || []).length;
      tokens += caseChanges;
    }
    if (part.includes('_') || part.includes('-')) {
      // snake_case/kebab-case adds tokens
      const separators = (part.match(/[_-]/g) || []).length;
      tokens += separators;
    }
  }

  // Numbers are tokenized specially
  const numbers = text.match(/\d+/g) || [];
  for (const num of numbers) {
    // Each 3-4 digits is roughly 1 token
    tokens += Math.ceil(num.length / 3);
  }

  return Math.max(1, Math.ceil(tokens));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if text exceeds token limit
 *
 * @param text - Text to check
 * @param limit - Token limit
 * @returns True if exceeds limit
 */
export function exceedsTokenLimit(text: string, limit: number): boolean {
  return countTokens(text) > limit;
}

/**
 * Truncate text to fit within token limit
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  suffix: string = '...'
): string {
  const currentTokens = countTokens(text);
  if (currentTokens <= maxTokens) return text;

  const suffixTokens = countTokens(suffix);
  const targetTokens = maxTokens - suffixTokens;

  if (targetTokens <= 0) return suffix;

  // Binary search for the right truncation point
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const truncated = text.slice(0, mid);
    const tokens = countTokens(truncated);

    if (tokens <= targetTokens) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  // Find a good break point (word boundary)
  let breakPoint = low;
  const lastSpace = text.lastIndexOf(' ', breakPoint);
  if (lastSpace > breakPoint * 0.8) {
    breakPoint = lastSpace;
  }

  return text.slice(0, breakPoint).trim() + suffix;
}

/**
 * Get token count statistics for debugging
 *
 * @param text - Text to analyze
 * @returns Statistics object
 */
export function getTokenStats(text: string): {
  tokens: number;
  characters: number;
  charsPerToken: number;
  words: number;
  tokensPerWord: number;
} {
  const tokens = countTokens(text);
  const characters = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;

  return {
    tokens,
    characters,
    charsPerToken: characters / tokens,
    words,
    tokensPerWord: tokens / words,
  };
}

/**
 * Compare estimated vs actual token counts
 * Useful for debugging and calibration
 *
 * @param text - Text to compare
 * @returns Comparison object
 */
export function compareTokenCounts(text: string): {
  actual: number;
  estimated: number;
  difference: number;
  percentError: number;
} {
  const actual = countTokens(text);
  const estimated = Math.ceil(text.length / 4); // Old estimation method

  return {
    actual,
    estimated,
    difference: estimated - actual,
    percentError: Math.abs((estimated - actual) / actual) * 100,
  };
}
