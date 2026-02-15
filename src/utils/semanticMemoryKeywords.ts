/**
 * Semantic Memory Keywords & Extraction
 *
 * Keyword extraction, design keyword matching, similarity scoring,
 * and conversation memory extraction logic.
 * Extracted from semanticMemory.ts for modularity.
 */

import type { ChatMessage } from '@/types/aiBuilderTypes';
import type { MemoryType, StoreMemoryOptions } from './semanticMemoryTypes';

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

/**
 * Common stop words to filter out from keywords
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'up',
  'about',
  'into',
  'over',
  'after',
  'beneath',
  'under',
  'above',
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'not',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'any',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'what',
  'which',
  'who',
  'whom',
  'as',
  'if',
  'then',
  'because',
  'while',
  'although',
  'though',
  'unless',
  'since',
  'until',
  'make',
  'want',
  'like',
  'use',
  'add',
  'get',
  'set',
  'put',
  'let',
  'please',
  'thanks',
  'thank',
]);

/**
 * Extract keywords from text
 *
 * @param text - Text to extract keywords from
 * @returns Array of keywords
 */
export function extractKeywords(text: string): string[] {
  // Normalize and split text
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
    .split(/\s+/)
    .filter((word) => word.length > 2) // Filter short words
    .filter((word) => !STOP_WORDS.has(word)); // Remove stop words

  // Count word frequency
  const frequency: Map<string, number> = new Map();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  // Sort by frequency and take top keywords
  const sortedWords = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return sortedWords;
}

/**
 * Design-specific keyword sets for memory extraction (P0-P1 Phase 7b)
 */
const DESIGN_KEYWORDS = new Set([
  // Colors
  'primary',
  'secondary',
  'accent',
  'background',
  'text',
  'border',
  'dark',
  'light',
  'color',
  'palette',
  'scheme',
  'theme',
  // Typography
  'font',
  'typography',
  'heading',
  'body',
  'sans',
  'serif',
  'mono',
  'bold',
  'light',
  'regular',
  'medium',
  'weight',
  // Layout
  'layout',
  'grid',
  'flex',
  'container',
  'responsive',
  'mobile',
  'desktop',
  'header',
  'footer',
  'sidebar',
  'navigation',
  'nav',
  // Effects
  'shadow',
  'border',
  'rounded',
  'radius',
  'animation',
  'transition',
  'hover',
  'focus',
  'blur',
  'gradient',
  // Style
  'minimal',
  'modern',
  'clean',
  'bold',
  'vibrant',
  'elegant',
  'professional',
  'style',
  'aesthetic',
  'look',
  'feel',
  // Spacing
  'spacing',
  'padding',
  'margin',
  'gap',
  'compact',
  'relaxed',
]);

/**
 * Extract design-specific keywords from design changes or updates
 * Used for storing design memories with relevant search terms
 *
 * @param designChanges - Object containing design property changes
 * @returns Array of design-relevant keywords
 */
export function extractDesignKeywords(designChanges: Record<string, unknown>): string[] {
  const keywords: string[] = [];

  function extractFromValue(value: unknown, prefix = ''): void {
    if (typeof value === 'string') {
      // Extract color hex codes
      const hexMatches = value.match(/#[0-9A-Fa-f]{3,6}/g);
      if (hexMatches) {
        keywords.push(...hexMatches);
      }
      // Extract design-related words
      const words = value.toLowerCase().split(/[\s,_-]+/);
      for (const word of words) {
        if (DESIGN_KEYWORDS.has(word) || word.length > 2) {
          keywords.push(prefix ? `${prefix}-${word}` : word);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        // Add the key itself if it's design-related
        if (DESIGN_KEYWORDS.has(key.toLowerCase())) {
          keywords.push(key.toLowerCase());
        }
        extractFromValue(val, key.toLowerCase());
      }
    }
  }

  extractFromValue(designChanges);

  // Deduplicate and return
  return [...new Set(keywords)].slice(0, 20);
}

/**
 * Calculate keyword similarity between query and memory
 *
 * @param queryKeywords - Keywords from search query
 * @param memoryKeywords - Keywords from memory entry
 * @returns Similarity score (0-1)
 */
export function calculateKeywordSimilarity(
  queryKeywords: string[],
  memoryKeywords: string[]
): number {
  if (queryKeywords.length === 0 || memoryKeywords.length === 0) return 0;

  const querySet = new Set(queryKeywords.map((k) => k.toLowerCase()));
  const memorySet = new Set(memoryKeywords.map((k) => k.toLowerCase()));

  let matches = 0;
  for (const keyword of querySet) {
    if (memorySet.has(keyword)) {
      matches++;
    }
    // Also check for partial matches
    for (const memKeyword of memorySet) {
      if (memKeyword.includes(keyword) || keyword.includes(memKeyword)) {
        matches += 0.5;
      }
    }
  }

  // Jaccard-like similarity with partial match boost
  const union = querySet.size + memorySet.size - matches;
  return union > 0 ? Math.min(1, matches / union) : 0;
}

// ============================================================================
// MEMORY EXTRACTION FROM CONVERSATIONS
// ============================================================================

/**
 * Patterns for extracting different types of memories from conversations
 */
const MEMORY_PATTERNS: Record<MemoryType, RegExp[]> = {
  preference: [
    /(?:I prefer|I like|I want|I'd rather|always use|please use)\s+(.{5,100}?)(?:\.|,|$)/gi,
    /(?:make it|keep it|should be)\s+(dark|light|minimal|modern|clean|simple)\s*/gi,
  ],
  decision: [
    /(?:decided|chose|going with|will use|agreed on|confirmed)\s+(.{5,80}?)(?:\.|,|$)/gi,
    /(?:let's|we'll|gonna|going to)\s+(.{5,80}?)(?:\.|,|$)/gi,
  ],
  project: [
    /(?:building|creating|developing|working on)\s+(?:a|an|the)?\s*(.{10,100}?)(?:\.|,|$)/gi,
    /(?:project|app|application|website)\s+(?:is|called|named)\s+(.{5,50}?)(?:\.|,|$)/gi,
  ],
  feature: [
    /(?:added|created|built|implemented|finished)\s+(?:a|an|the)?\s*(.{5,80}?)(?:\.|,|$)/gi,
    /(?:feature|component|function)\s*:\s*(.{5,60}?)(?:\.|,|$)/gi,
  ],
  style: [
    /(?:using|use|with)\s+(tailwind|css|styled-components|sass|less)/gi,
    /(?:color|colors|theme)\s*:\s*(.{5,40}?)(?:\.|,|$)/gi,
    /(?:font|typography)\s*:\s*(.{5,40}?)(?:\.|,|$)/gi,
    // Design-specific patterns (P0-P1 Phase 7b)
    /(?:prefer|like|want)\s+(?:a\s+)?(\w+)\s+(?:style|look|feel|aesthetic)/gi,
    /(?:make it|should be|want it)\s+(more\s+)?(minimal|modern|clean|bold|vibrant|elegant|professional)/gi,
    /(?:primary|main|brand)\s+color\s+(?:is|should be|:)\s*(#[0-9A-Fa-f]{3,6}|\w+)/gi,
    /(?:background|bg)\s+(?:color)?\s*(?:is|should be|:)\s*(#[0-9A-Fa-f]{3,6}|\w+)/gi,
    /(?:use|prefer|like)\s+(?:the\s+)?(\w+)\s+(?:font|typeface)/gi,
    /(?:rounded|border-radius|corners)\s+(?:should be|:)?\s*(none|sm|md|lg|xl|full|\d+px)/gi,
    /(?:shadow|drop-shadow)\s+(?:should be|:)?\s*(none|sm|md|lg|xl)/gi,
    /(?:spacing|padding|margin)\s+(?:should be|:)?\s*(compact|normal|relaxed|tight|loose)/gi,
    /(?:dark|light)\s+(?:mode|theme)/gi,
  ],
  error_solution: [
    /(?:fixed|solved|resolved)\s+(?:the|a|an)?\s*(.{5,100}?)(?:\.|,|$)/gi,
    /(?:error|bug|issue|problem)\s+(?:was|is)\s+(.{5,80}?)(?:\.|,|$)/gi,
    /(?:solution|fix|workaround)\s*:\s*(.{5,80}?)(?:\.|,|$)/gi,
  ],
  // New types for complex app building
  data_model: [
    /(?:model|entity|schema|table)\s+(?:for|called|named)?\s*(.{5,60}?)(?:\.|,|$)/gi,
    /(?:fields?|columns?|properties)\s*:\s*(.{10,100}?)(?:\.|,|$)/gi,
    /(?:relationship|foreign key|references)\s+(.{5,60}?)(?:\.|,|$)/gi,
  ],
  workflow: [
    /(?:user|admin|customer)\s+(?:can|will|should)\s+(.{10,100}?)(?:\.|,|$)/gi,
    /(?:when|if|after)\s+(.{10,60})\s+(?:then|the system)/gi,
    /(?:flow|process|workflow)\s*:\s*(.{10,80}?)(?:\.|,|$)/gi,
  ],
  integration: [
    /(?:integrate|connect|use)\s+(?:with)?\s*(api|service|third-party)?\s*(.{5,60}?)(?:\.|,|$)/gi,
    /(?:api|endpoint|webhook)\s+(?:for|at)\s+(.{5,60}?)(?:\.|,|$)/gi,
  ],
  constraint: [
    /(?:must|should|needs to|has to)\s+(.{10,80}?)(?:\.|,|$)/gi,
    /(?:cannot|shouldn't|must not|never)\s+(.{10,80}?)(?:\.|,|$)/gi,
    /(?:limit|max|min|require)\s+(.{5,60}?)(?:\.|,|$)/gi,
  ],
  api_contract: [
    /(?:endpoint|route|api)\s+(?:returns?|accepts?|expects?)\s+(.{10,80}?)(?:\.|,|$)/gi,
    /(?:request|response)\s+(?:body|format|structure)\s*:\s*(.{10,80}?)(?:\.|,|$)/gi,
  ],
};

/**
 * Extract memories from a single message
 *
 * @param message - Message to extract from
 * @returns Array of memory options to store
 */
function extractMemoriesFromMessage(message: ChatMessage): StoreMemoryOptions[] {
  const memories: StoreMemoryOptions[] = [];

  for (const [type, patterns] of Object.entries(MEMORY_PATTERNS) as [MemoryType, RegExp[]][]) {
    for (const pattern of patterns) {
      // Reset pattern for new message
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(message.content)) !== null) {
        const content = match[1] || match[0];
        if (content && content.length >= 5 && content.length <= 200) {
          const keywords = extractKeywords(content);

          // Determine importance based on role and content
          let importance = 0.5;
          if (message.role === 'user') importance += 0.1; // User statements are slightly more important
          if (type === 'error_solution') importance += 0.2; // Solutions are very valuable
          if (type === 'preference') importance += 0.1; // Preferences matter

          memories.push({
            type,
            content: content.trim(),
            keywords,
            importance: Math.min(1, importance),
            context: message.content.slice(0, 200),
          });
        }
      }
    }
  }

  return memories;
}

/**
 * Extract all memories from a conversation
 *
 * @param messages - Messages to extract from
 * @returns Array of memory options to store
 */
export function extractMemoriesFromConversation(messages: ChatMessage[]): StoreMemoryOptions[] {
  const allMemories: StoreMemoryOptions[] = [];

  for (const message of messages) {
    // Skip system messages
    if (message.role === 'system') continue;

    const extracted = extractMemoriesFromMessage(message);
    allMemories.push(...extracted);
  }

  // Deduplicate by content similarity
  const uniqueMemories: StoreMemoryOptions[] = [];
  for (const memory of allMemories) {
    const isDuplicate = uniqueMemories.some((existing) => {
      // Check for similar content
      const similarity = calculateKeywordSimilarity(memory.keywords || [], existing.keywords || []);
      return (
        similarity > 0.7 ||
        existing.content.includes(memory.content) ||
        memory.content.includes(existing.content)
      );
    });

    if (!isDuplicate) {
      uniqueMemories.push(memory);
    }
  }

  return uniqueMemories;
}
