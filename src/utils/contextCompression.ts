/**
 * Context Compression Utility
 *
 * Token-aware conversation compression for optimizing API calls.
 * Preserves recent messages while summarizing older context.
 */

import type { ChatMessage } from '@/types/aiBuilderTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Summary of a conversation for compression
 */
export interface ConversationSummary {
  /** Project description extracted from conversation */
  projectDescription: string;
  /** Features that have been built */
  featuresBuilt: string[];
  /** User preferences mentioned in conversation */
  userPreferences: string[];
  /** Key decisions made during conversation */
  keyDecisions: string[];
  /** Number of messages summarized */
  messageCount: number;
  /** Estimated tokens in original messages */
  originalTokens: number;
  /** Estimated tokens in summary */
  summaryTokens: number;
}

/**
 * Options for conversation compression
 */
export interface CompressionOptions {
  /** Maximum total tokens (default: 4000) */
  maxTokens?: number;
  /** Number of recent messages to preserve verbatim (default: 4) */
  preserveLastN?: number;
  /** Whether to include timestamps in compressed context (default: false) */
  includeTimestamps?: boolean;
}

/**
 * Compressed conversation context
 */
export interface CompressedContext {
  /** Summary of older messages */
  summary: ConversationSummary;
  /** Recent messages preserved verbatim */
  recentMessages: ChatMessage[];
  /** Total estimated tokens */
  totalTokens: number;
  /** Compression ratio (original/compressed) */
  compressionRatio: number;
}

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

/**
 * Estimate the number of tokens in text
 * Uses rough approximation: 1 token ≈ 4 characters
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough approximation: 1 token ≈ 4 characters
  // This is a simplified estimation; actual tokenization varies by model
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for an array of messages
 *
 * @param messages - Messages to estimate tokens for
 * @returns Total estimated tokens
 */
export function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, msg) => {
    // Include role, content, and some overhead for message structure
    const roleTokens = estimateTokens(msg.role);
    const contentTokens = estimateTokens(msg.content);
    const overheadTokens = 4; // Overhead for message structure
    return total + roleTokens + contentTokens + overheadTokens;
  }, 0);
}

// ============================================================================
// COMPRESSION DETECTION
// ============================================================================

/**
 * Check if conversation needs compression
 *
 * @param messages - Conversation messages
 * @param maxTokens - Maximum allowed tokens (default: 8000)
 * @returns True if compression is needed
 */
export function needsCompression(messages: ChatMessage[], maxTokens: number = 8000): boolean {
  const estimatedTokens = estimateMessagesTokens(messages);
  return estimatedTokens > maxTokens;
}

// ============================================================================
// INFORMATION EXTRACTION
// ============================================================================

/**
 * Extract key information patterns from text
 *
 * @param text - Text to extract patterns from
 * @param patterns - Array of regex patterns to match
 * @returns Array of matched strings
 */
function extractPatterns(text: string, patterns: RegExp[]): string[] {
  const results: string[] = [];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      // Add unique matches only
      for (const match of matches) {
        const cleaned = match.trim();
        if (cleaned && !results.includes(cleaned)) {
          results.push(cleaned);
        }
      }
    }
  }

  return results;
}

/**
 * Extract project description from messages
 *
 * @param messages - Messages to analyze
 * @returns Project description or empty string
 */
function extractProjectDescription(messages: ChatMessage[]): string {
  const descriptions: string[] = [];

  // Patterns that often contain project descriptions
  const projectPatterns = [
    /(?:build|create|make|develop)\s+(?:a|an|the)?\s*(.{10,100}?)(?:\.|,|$)/gi,
    /(?:I want|I need|I'd like|We need)\s+(?:a|an|to)?\s*(.{10,100}?)(?:\.|,|$)/gi,
    /(?:app|application|website|tool|dashboard)\s+(?:that|for|to)\s+(.{10,80}?)(?:\.|,|$)/gi,
  ];

  for (const msg of messages) {
    if (msg.role === 'user') {
      const extracted = extractPatterns(msg.content, projectPatterns);
      descriptions.push(...extracted);
    }
  }

  // Return the first meaningful description or combine top ones
  if (descriptions.length === 0) return '';
  if (descriptions.length === 1) return descriptions[0];

  // Take the longest description as it's likely the most complete
  return descriptions.reduce((a, b) => (a.length > b.length ? a : b));
}

/**
 * Extract features built from messages
 *
 * @param messages - Messages to analyze
 * @returns Array of features mentioned as built
 */
function extractFeaturesBuilt(messages: ChatMessage[]): string[] {
  const features: string[] = [];

  // Patterns that indicate completed features
  const featurePatterns = [
    /(?:added|created|built|implemented|added|finished)\s+(?:a|an|the)?\s*(.{5,60}?)(?:\.|,|$)/gi,
    /(?:now has|includes|features)\s+(.{5,60}?)(?:\.|,|$)/gi,
    /✅\s*(.{5,60}?)(?:\.|,|$)/gi,
  ];

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const extracted = extractPatterns(msg.content, featurePatterns);
      features.push(...extracted);
    }
  }

  // Deduplicate and limit
  return [...new Set(features)].slice(0, 10);
}

/**
 * Extract user preferences from messages
 *
 * @param messages - Messages to analyze
 * @returns Array of preferences mentioned
 */
function extractUserPreferences(messages: ChatMessage[]): string[] {
  const preferences: string[] = [];

  // Patterns that indicate user preferences
  const prefPatterns = [
    /(?:I prefer|I like|I want|I'd rather|please use|let's use)\s+(.{5,60}?)(?:\.|,|$)/gi,
    /(?:make it|keep it|should be)\s+(.{5,40}?)(?:\.|,|$)/gi,
    /(?:use|with)\s+(dark|light|minimal|modern|clean|simple)\s*(?:mode|theme|style|design)?/gi,
  ];

  for (const msg of messages) {
    if (msg.role === 'user') {
      const extracted = extractPatterns(msg.content, prefPatterns);
      preferences.push(...extracted);
    }
  }

  // Deduplicate and limit
  return [...new Set(preferences)].slice(0, 8);
}

/**
 * Extract key decisions from messages
 *
 * @param messages - Messages to analyze
 * @returns Array of key decisions made
 */
function extractKeyDecisions(messages: ChatMessage[]): string[] {
  const decisions: string[] = [];

  // Patterns that indicate decisions
  const decisionPatterns = [
    /(?:decided|chose|going with|will use|agreed on)\s+(.{5,60}?)(?:\.|,|$)/gi,
    /(?:yes|okay|sounds good|let's do|approved|confirmed)[,:]?\s*(.{5,60}?)(?:\.|,|$)/gi,
  ];

  // Check for decision confirmations in user messages
  for (const msg of messages) {
    const extracted = extractPatterns(msg.content, decisionPatterns);
    decisions.push(...extracted);
  }

  // Deduplicate and limit
  return [...new Set(decisions)].slice(0, 8);
}

// ============================================================================
// SUMMARIZATION
// ============================================================================

/**
 * Summarize a conversation by extracting key information
 *
 * @param messages - Messages to summarize
 * @returns Conversation summary
 */
export function summarizeConversation(messages: ChatMessage[]): ConversationSummary {
  const originalTokens = estimateMessagesTokens(messages);

  const summary: ConversationSummary = {
    projectDescription: extractProjectDescription(messages),
    featuresBuilt: extractFeaturesBuilt(messages),
    userPreferences: extractUserPreferences(messages),
    keyDecisions: extractKeyDecisions(messages),
    messageCount: messages.length,
    originalTokens,
    summaryTokens: 0, // Will be calculated after building summary
  };

  // Calculate summary tokens
  const summaryText = buildSummaryText(summary);
  summary.summaryTokens = estimateTokens(summaryText);

  return summary;
}

/**
 * Build a text representation of the summary
 *
 * @param summary - Summary to convert to text
 * @returns Text representation
 */
function buildSummaryText(summary: ConversationSummary): string {
  const parts: string[] = [];

  if (summary.projectDescription) {
    parts.push(`Project: ${summary.projectDescription}`);
  }

  if (summary.featuresBuilt.length > 0) {
    parts.push(`Features built: ${summary.featuresBuilt.join(', ')}`);
  }

  if (summary.userPreferences.length > 0) {
    parts.push(`User preferences: ${summary.userPreferences.join(', ')}`);
  }

  if (summary.keyDecisions.length > 0) {
    parts.push(`Key decisions: ${summary.keyDecisions.join(', ')}`);
  }

  return parts.join('\n');
}

// ============================================================================
// COMPRESSION
// ============================================================================

/**
 * Compress a conversation to reduce token count
 * Preserves recent messages verbatim while summarizing older ones
 *
 * @param messages - Messages to compress
 * @param options - Compression options
 * @returns Compressed context
 */
export function compressConversation(
  messages: ChatMessage[],
  options: CompressionOptions = {}
): CompressedContext {
  const { maxTokens = 4000, preserveLastN = 4 } = options;

  const originalTokens = estimateMessagesTokens(messages);

  // If already under limit, no compression needed
  if (originalTokens <= maxTokens) {
    return {
      summary: {
        projectDescription: '',
        featuresBuilt: [],
        userPreferences: [],
        keyDecisions: [],
        messageCount: 0,
        originalTokens: 0,
        summaryTokens: 0,
      },
      recentMessages: messages,
      totalTokens: originalTokens,
      compressionRatio: 1,
    };
  }

  // Split messages: older ones to summarize, recent ones to preserve
  const splitIndex = Math.max(0, messages.length - preserveLastN);
  const olderMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  // Summarize older messages
  const summary = summarizeConversation(olderMessages);

  // Calculate total tokens
  const recentTokens = estimateMessagesTokens(recentMessages);
  const totalTokens = summary.summaryTokens + recentTokens;

  // Calculate compression ratio
  const compressionRatio = originalTokens / Math.max(1, totalTokens);

  return {
    summary,
    recentMessages,
    totalTokens,
    compressionRatio,
  };
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

/**
 * Build a context string for API calls from compressed context
 *
 * @param compressed - Compressed context
 * @returns Context string ready for API prompt
 */
export function buildCompressedContext(compressed: CompressedContext): string {
  const parts: string[] = [];

  // Add summary if there are summarized messages
  if (compressed.summary.messageCount > 0) {
    parts.push('=== Conversation Summary ===');

    if (compressed.summary.projectDescription) {
      parts.push(`Project: ${compressed.summary.projectDescription}`);
    }

    if (compressed.summary.featuresBuilt.length > 0) {
      parts.push(`Features built: ${compressed.summary.featuresBuilt.join(', ')}`);
    }

    if (compressed.summary.userPreferences.length > 0) {
      parts.push(`User preferences: ${compressed.summary.userPreferences.join(', ')}`);
    }

    if (compressed.summary.keyDecisions.length > 0) {
      parts.push(`Key decisions: ${compressed.summary.keyDecisions.join(', ')}`);
    }

    parts.push(`(Summarized from ${compressed.summary.messageCount} messages)`);
    parts.push('');
    parts.push('=== Recent Messages ===');
  }

  // Add recent messages
  for (const msg of compressed.recentMessages) {
    const roleLabel =
      msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
    parts.push(`${roleLabel}: ${msg.content}`);
  }

  return parts.join('\n');
}

/**
 * Get compression statistics for display
 *
 * @param compressed - Compressed context
 * @returns Statistics object
 */
export function getCompressionStats(compressed: CompressedContext): {
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  compressionRatio: number;
  percentReduction: number;
} {
  const originalTokens =
    compressed.summary.originalTokens + estimateMessagesTokens(compressed.recentMessages);
  const compressedTokens = compressed.totalTokens;
  const tokensSaved = originalTokens - compressedTokens;
  const percentReduction = originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0;

  return {
    originalTokens,
    compressedTokens,
    tokensSaved,
    compressionRatio: compressed.compressionRatio,
    percentReduction,
  };
}
