/**
 * Semantic Memory Utility
 *
 * Cross-session semantic memory using Supabase for persistent storage.
 * Supports both keyword-based and embedding-based (vector) search.
 *
 * P3 Enhancement: Added embedding support for semantic similarity search
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { ChatMessage } from '@/types/aiBuilderTypes';
import {
  generateEmbedding,
  cosineSimilarity,
  hasEmbeddingAPI,
  getEmbeddingProvider,
} from './embeddings';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Type of memory entry
 */
export type MemoryType =
  | 'preference'
  | 'decision'
  | 'project'
  | 'feature'
  | 'style'
  | 'error_solution'
  // Enhanced types for complex app building
  | 'data_model'
  | 'workflow'
  | 'integration'
  | 'constraint'
  | 'api_contract';

/**
 * Hierarchical memory category for organizing memories
 */
export type MemoryCategory = 'app' | 'feature' | 'ui' | 'technical' | 'workflow' | 'user';

/**
 * Specificity level of a memory
 */
export type MemorySpecificity = 'high' | 'medium' | 'low';

/**
 * A semantic memory entry stored in Supabase
 */
export interface SemanticMemory {
  id: string;
  user_id: string;
  type: MemoryType;
  content: string;
  keywords: string[];
  importance: number; // 0-1
  context?: string;
  created_at: Date;
  last_accessed_at: Date;
  access_count: number;
  // Hierarchical fields
  category?: MemoryCategory;
  parent_id?: string; // Reference to parent memory (e.g., feature → app)
  related_ids?: string[]; // Cross-references to related memories
  specificity?: MemorySpecificity; // How detailed is this memory
  project_id?: string; // Group memories by project/app
  // Embedding fields (P3)
  embedding?: number[]; // Vector embedding for semantic search
  embedding_model?: string; // Model used to generate embedding
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  averageImportance: number;
  oldestMemory: Date | null;
  mostAccessedKeywords: string[];
}

/**
 * Options for storing a memory
 */
export interface StoreMemoryOptions {
  type: MemoryType;
  content: string;
  keywords?: string[];
  importance?: number;
  context?: string;
  // Hierarchical options
  category?: MemoryCategory;
  parentId?: string;
  relatedIds?: string[];
  specificity?: MemorySpecificity;
  projectId?: string;
  // Embedding options (P3)
  generateEmbedding?: boolean; // Auto-generate embedding for this memory
  embedding?: number[]; // Pre-computed embedding
  embeddingModel?: string; // Model name for pre-computed embedding
}

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

// ============================================================================
// SEMANTIC MEMORY CLASS
// ============================================================================

/**
 * Chainable query builder for Supabase select operations
 */
interface SelectQueryBuilder {
  eq: (
    column: string,
    value: string
  ) => SelectQueryBuilder & {
    order: (
      column: string,
      options?: { ascending: boolean }
    ) => {
      limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
    };
    limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
  };
  order: (
    column: string,
    options?: { ascending: boolean }
  ) => {
    limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
  };
  gte: (
    column: string,
    value: string
  ) => SelectQueryBuilder & {
    delete: () => Promise<{ error: Error | null }>;
  };
  contains: (column: string, values: string[]) => SelectQueryBuilder;
  overlaps: (column: string, values: string[]) => SelectQueryBuilder;
  limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
}

/**
 * Chainable query builder for Supabase update operations
 */
interface UpdateQueryBuilder {
  eq: (column: string, value: string) => UpdateQueryBuilder & Promise<{ error: Error | null }>;
}

/**
 * Supabase client type (avoiding direct import for flexibility)
 */
interface SupabaseClient {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }>;
    select: (columns?: string) => SelectQueryBuilder;
    update: (data: Record<string, unknown>) => UpdateQueryBuilder;
    delete: () => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      lt: (
        column: string,
        value: string
      ) => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  };
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } | null; error: Error | null }>;
  };
  rpc: (
    name: string,
    params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: Error | null }>;
}

/**
 * Semantic Memory Manager
 *
 * Manages cross-session memories using Supabase for persistence
 */
export class SemanticMemoryManager {
  private supabase: SupabaseClient;
  private userId: string | null = null;
  private initialized: boolean = false;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Initialize the manager with current user
   */
  async initialize(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (error || !data?.user) {
        return false;
      }
      this.userId = data.user.id;
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[SemanticMemory] Initialization error:', error);
      return false;
    }
  }

  /**
   * Check if manager is ready to use
   */
  isReady(): boolean {
    return this.initialized && this.userId !== null;
  }

  /**
   * Store a new memory
   *
   * @param options - Memory to store
   */
  async store(options: StoreMemoryOptions): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    // Generate embedding if requested OR if importance is high (> 0.6)
    // This enables semantic search by default for important memories
    let embedding = options.embedding;
    let embeddingModel = options.embeddingModel;
    const importance = options.importance ?? 0.5;
    const shouldGenerateEmbedding =
      options.generateEmbedding || (importance > 0.6 && !embedding && hasEmbeddingAPI());

    if (shouldGenerateEmbedding && !embedding) {
      try {
        const result = await generateEmbedding(options.content);
        embedding = result.embedding;
        embeddingModel = result.model;
      } catch {
        // Continue without embedding - keyword search still works
      }
    }

    const memory = {
      user_id: this.userId,
      type: options.type,
      content: options.content,
      keywords: options.keywords || extractKeywords(options.content),
      importance: options.importance ?? 0.5,
      context: options.context,
      created_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
      access_count: 0,
      // Hierarchical fields
      category: options.category || this.inferCategory(options.type),
      parent_id: options.parentId,
      related_ids: options.relatedIds,
      specificity: options.specificity || 'medium',
      project_id: options.projectId,
      // Embedding fields (P3)
      embedding: embedding,
      embedding_model: embeddingModel,
    };

    const { error } = await this.supabase.from('semantic_memories').insert(memory);

    if (error) {
      console.error('[SemanticMemory] Error storing memory:', error);
    }
  }

  /**
   * Infer category from memory type
   */
  private inferCategory(type: MemoryType): MemoryCategory {
    const typeToCategory: Record<MemoryType, MemoryCategory> = {
      preference: 'user',
      decision: 'app',
      project: 'app',
      feature: 'feature',
      style: 'ui',
      error_solution: 'technical',
      // New types for complex app building
      data_model: 'technical',
      workflow: 'workflow',
      integration: 'technical',
      constraint: 'app',
      api_contract: 'technical',
    };
    return typeToCategory[type] || 'app';
  }

  /**
   * Search memories by query
   *
   * @param query - Search query
   * @param limit - Maximum results (default: 10)
   * @returns Array of matching memories
   */
  async search(query: string, limit: number = 10): Promise<SemanticMemory[]> {
    if (!this.isReady()) {
      return [];
    }

    const queryKeywords = extractKeywords(query);

    if (queryKeywords.length === 0) {
      return [];
    }

    try {
      // Search for memories with overlapping keywords
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .overlaps('keywords', queryKeywords)
        .eq('user_id', this.userId!)
        .order('importance', { ascending: false })
        .limit(limit * 2); // Get more to filter/rank

      if (error) {
        console.error('[SemanticMemory] Search error:', error);
        return [];
      }

      if (!data) return [];

      // Rank by keyword similarity and importance
      const ranked = data.map((memory) => ({
        memory,
        score: calculateKeywordSimilarity(queryKeywords, memory.keywords) * memory.importance,
      }));

      ranked.sort((a, b) => b.score - a.score);

      // Update access counts for returned memories
      const topMemories = ranked.slice(0, limit).map((r) => r.memory);
      await this.updateAccessCounts(topMemories.map((m) => m.id));

      return topMemories;
    } catch (error) {
      console.error('[SemanticMemory] Search error:', error);
      return [];
    }
  }

  /**
   * Update access counts for memories
   */
  private async updateAccessCounts(ids: string[]): Promise<void> {
    for (const id of ids) {
      // Use the RPC function which handles both the increment and update
      await this.supabase.rpc('increment_access_count', { memory_id: id });
    }
  }

  /**
   * Get context for a prompt based on query
   *
   * @param query - User query to find relevant context for
   * @returns Formatted context string
   */
  async getContextForPrompt(query: string, limit: number = 10): Promise<string> {
    // Use hybrid search for better semantic matching when embeddings are available
    let memories: SemanticMemory[];

    if (hasEmbeddingAPI()) {
      // Hybrid search combines keyword and embedding scores
      const hybridResults = await this.hybridSearch(query, limit);
      memories = hybridResults;
    } else {
      // Fallback to keyword-only search
      memories = await this.search(query, limit);
    }

    if (memories.length === 0) {
      return '';
    }

    const parts: string[] = ['=== Relevant Memories ==='];

    for (const memory of memories) {
      const typeLabel = memory.type.replace('_', ' ');
      parts.push(`[${typeLabel}] ${memory.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Store memories extracted from a conversation
   *
   * @param messages - Conversation messages
   */
  async storeFromConversation(messages: ChatMessage[]): Promise<void> {
    if (!this.isReady()) return;

    const memories = extractMemoriesFromConversation(messages);

    for (const memory of memories) {
      await this.store(memory);
    }
  }

  /**
   * Clear all memories for current user
   */
  async clearAll(): Promise<void> {
    if (!this.isReady()) return;

    const { error } = await this.supabase
      .from('semantic_memories')
      .delete()
      .eq('user_id', this.userId!);

    if (error) {
      console.error('[SemanticMemory] Error clearing memories:', error);
    }
  }

  /**
   * Clean up old/unused memories
   *
   * @param daysOld - Remove memories older than this (default: 90)
   */
  async cleanupOldMemories(daysOld: number = 90): Promise<void> {
    if (!this.isReady()) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await this.supabase
      .from('semantic_memories')
      .delete()
      .lt('last_accessed_at', cutoffDate.toISOString())
      .eq('user_id', this.userId!);

    if (error) {
      console.error('[SemanticMemory] Error cleaning up memories:', error);
    }
  }

  /**
   * Get memory statistics
   *
   * @returns Memory stats
   */
  async getStats(): Promise<MemoryStats> {
    if (!this.isReady()) {
      return {
        totalMemories: 0,
        byType: {
          preference: 0,
          decision: 0,
          project: 0,
          feature: 0,
          style: 0,
          error_solution: 0,
          data_model: 0,
          workflow: 0,
          integration: 0,
          constraint: 0,
          api_contract: 0,
        },
        averageImportance: 0,
        oldestMemory: null,
        mostAccessedKeywords: [],
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .eq('user_id', this.userId!)
        .order('created_at', { ascending: true })
        .limit(1000);

      if (error || !data) {
        return {
          totalMemories: 0,
          byType: {
            preference: 0,
            decision: 0,
            project: 0,
            feature: 0,
            style: 0,
            error_solution: 0,
            data_model: 0,
            workflow: 0,
            integration: 0,
            constraint: 0,
            api_contract: 0,
          },
          averageImportance: 0,
          oldestMemory: null,
          mostAccessedKeywords: [],
        };
      }

      // Calculate stats
      const byType: Record<MemoryType, number> = {
        preference: 0,
        decision: 0,
        project: 0,
        feature: 0,
        style: 0,
        error_solution: 0,
        // New types for complex app building
        data_model: 0,
        workflow: 0,
        integration: 0,
        constraint: 0,
        api_contract: 0,
      };

      let totalImportance = 0;
      const keywordCounts: Map<string, number> = new Map();

      for (const memory of data) {
        byType[memory.type as MemoryType]++;
        totalImportance += memory.importance;

        for (const keyword of memory.keywords) {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + memory.access_count + 1);
        }
      }

      const sortedKeywords = [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword]) => keyword);

      return {
        totalMemories: data.length,
        byType,
        averageImportance: data.length > 0 ? totalImportance / data.length : 0,
        oldestMemory: data.length > 0 ? new Date(data[0].created_at) : null,
        mostAccessedKeywords: sortedKeywords,
      };
    } catch (error) {
      console.error('[SemanticMemory] Error getting stats:', error);
      return {
        totalMemories: 0,
        byType: {
          preference: 0,
          decision: 0,
          project: 0,
          feature: 0,
          style: 0,
          error_solution: 0,
          data_model: 0,
          workflow: 0,
          integration: 0,
          constraint: 0,
          api_contract: 0,
        },
        averageImportance: 0,
        oldestMemory: null,
        mostAccessedKeywords: [],
      };
    }
  }

  // ============================================================================
  // HIERARCHICAL MEMORY METHODS
  // ============================================================================

  /**
   * Search memories by category
   *
   * @param category - Category to search
   * @param limit - Maximum results
   * @returns Memories in the category
   */
  async searchByCategory(category: MemoryCategory, limit: number = 20): Promise<SemanticMemory[]> {
    if (!this.isReady()) return [];

    try {
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .eq('user_id', this.userId!)
        .eq('category', category)
        .order('importance', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[SemanticMemory] Error searching by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[SemanticMemory] Error searching by category:', error);
      return [];
    }
  }

  /**
   * Search memories by project
   *
   * @param projectId - Project ID to search
   * @param limit - Maximum results
   * @returns Memories for the project
   */
  async searchByProject(projectId: string, limit: number = 50): Promise<SemanticMemory[]> {
    if (!this.isReady()) return [];

    try {
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .eq('user_id', this.userId!)
        .eq('project_id', projectId)
        .order('importance', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[SemanticMemory] Error searching by project:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[SemanticMemory] Error searching by project:', error);
      return [];
    }
  }

  /**
   * Get child memories of a parent memory
   *
   * @param parentId - Parent memory ID
   * @returns Child memories
   */
  async getChildMemories(parentId: string): Promise<SemanticMemory[]> {
    if (!this.isReady()) return [];

    try {
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .eq('user_id', this.userId!)
        .eq('parent_id', parentId)
        .order('importance', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[SemanticMemory] Error getting child memories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[SemanticMemory] Error getting child memories:', error);
      return [];
    }
  }

  /**
   * Build hierarchical context for a project
   * Returns memories organized by category with high-importance items first
   *
   * @param projectId - Optional project ID
   * @param maxTokens - Maximum estimated tokens
   * @returns Formatted context string
   */
  async getHierarchicalContext(projectId?: string, maxTokens: number = 3000): Promise<string> {
    if (!this.isReady()) return '';

    const categories: MemoryCategory[] = ['app', 'feature', 'technical', 'ui', 'workflow', 'user'];
    const parts: string[] = [];
    let tokenCount = 0;

    for (const category of categories) {
      // Get memories for this category
      let memories: SemanticMemory[];
      if (projectId) {
        const allProjectMemories = await this.searchByProject(projectId, 100);
        memories = allProjectMemories.filter((m) => m.category === category);
      } else {
        memories = await this.searchByCategory(category, 10);
      }

      if (memories.length === 0) continue;

      // Sort by importance and specificity
      memories.sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (importanceDiff !== 0) return importanceDiff;
        const specificityOrder = { high: 0, medium: 1, low: 2 };
        return (
          (specificityOrder[a.specificity || 'medium'] || 1) -
          (specificityOrder[b.specificity || 'medium'] || 1)
        );
      });

      // Add to context
      const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
      const categoryContent: string[] = [`=== ${categoryLabel} ===`];

      for (const memory of memories) {
        const memoryText = `[${memory.type}] ${memory.content}`;
        const memoryTokens = Math.ceil(memoryText.length / 4);

        if (tokenCount + memoryTokens > maxTokens) break;

        categoryContent.push(memoryText);
        tokenCount += memoryTokens;
      }

      if (categoryContent.length > 1) {
        parts.push(categoryContent.join('\n'));
      }

      if (tokenCount >= maxTokens) break;
    }

    return parts.join('\n\n');
  }

  /**
   * Link a memory to a parent
   *
   * @param memoryId - Memory to update
   * @param parentId - Parent memory ID
   */
  async linkToParent(memoryId: string, parentId: string): Promise<void> {
    if (!this.isReady()) return;

    const { error } = await this.supabase
      .from('semantic_memories')
      .update({ parent_id: parentId })
      .eq('id', memoryId)
      .eq('user_id', this.userId!);

    if (error) {
      console.error('[SemanticMemory] Error linking to parent:', error);
    }
  }

  /**
   * Add related memory links
   *
   * @param memoryId - Memory to update
   * @param relatedIds - Related memory IDs to add
   */
  async addRelatedMemories(memoryId: string, relatedIds: string[]): Promise<void> {
    if (!this.isReady()) return;

    // Get current related IDs
    const { data } = await this.supabase
      .from('semantic_memories')
      .select('related_ids')
      .eq('id', memoryId)
      .eq('user_id', this.userId!)
      .limit(1);

    const currentRelated = data?.[0]?.related_ids || [];
    const newRelated = [...new Set([...currentRelated, ...relatedIds])];

    const { error } = await this.supabase
      .from('semantic_memories')
      .update({ related_ids: newRelated })
      .eq('id', memoryId)
      .eq('user_id', this.userId!);

    if (error) {
      console.error('[SemanticMemory] Error adding related memories:', error);
    }
  }

  // ============================================================================
  // EMBEDDING-BASED SEARCH (P3)
  // ============================================================================

  /**
   * Check if embedding-based search is available
   *
   * @returns True if embedding API is configured
   */
  hasEmbeddingSupport(): boolean {
    return hasEmbeddingAPI();
  }

  /**
   * Get current embedding provider
   *
   * @returns Provider name
   */
  getEmbeddingProvider(): string {
    return getEmbeddingProvider();
  }

  /**
   * Search memories using embedding similarity
   *
   * Falls back to keyword search if embeddings are not available.
   *
   * @param query - Search query
   * @param limit - Maximum results (default: 10)
   * @param minSimilarity - Minimum similarity score (default: 0.3)
   * @returns Array of memories with similarity scores
   */
  async searchByEmbedding(
    query: string,
    limit: number = 10,
    minSimilarity: number = 0.3
  ): Promise<Array<SemanticMemory & { similarity: number }>> {
    if (!this.isReady()) return [];

    try {
      // Generate embedding for query
      const queryResult = await generateEmbedding(query);
      const queryEmbedding = queryResult.embedding;

      // Get all memories with embeddings for this user
      const { data: memories, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .eq('user_id', this.userId!)
        .order('importance', { ascending: false })
        .limit(500); // Get more for embedding filtering

      if (error || !memories) {
        console.error('[SemanticMemory] Error fetching memories for embedding search:', error);
        return [];
      }

      // Filter memories that have embeddings and calculate similarity
      const memoriesWithSimilarity = memories
        .filter((m: SemanticMemory) => m.embedding && m.embedding.length > 0)
        .map((memory: SemanticMemory) => {
          const similarity = cosineSimilarity(queryEmbedding, memory.embedding!);
          return { ...memory, similarity };
        })
        .filter((m) => m.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // If we found good embedding matches, return them
      if (memoriesWithSimilarity.length > 0) {
        return memoriesWithSimilarity;
      }

      // Fallback: use keyword search for memories without embeddings
      const keywordResults = await this.search(query, limit);
      return keywordResults.map((m) => ({ ...m, similarity: 0 }));
    } catch (error) {
      console.error('[SemanticMemory] Embedding search error:', error);
      // Fallback to keyword search
      const keywordResults = await this.search(query, limit);
      return keywordResults.map((m) => ({ ...m, similarity: 0 }));
    }
  }

  /**
   * Hybrid search combining embedding similarity and keyword matching
   *
   * Uses a weighted combination of embedding similarity and keyword overlap.
   *
   * @param query - Search query
   * @param limit - Maximum results (default: 10)
   * @param embeddingWeight - Weight for embedding score (default: 0.7)
   * @returns Array of memories with combined scores
   */
  async hybridSearch(
    query: string,
    limit: number = 10,
    embeddingWeight: number = 0.7
  ): Promise<
    Array<SemanticMemory & { score: number; embeddingScore: number; keywordScore: number }>
  > {
    if (!this.isReady()) return [];

    const keywordWeight = 1 - embeddingWeight;

    try {
      // Run both searches in parallel for better performance
      const [keywordResults, embeddingResults] = await Promise.all([
        this.search(query, limit * 2),
        this.searchByEmbedding(query, limit * 2, 0.2),
      ]);

      // Normalize keyword scores (higher rank = higher score)
      const keywordScores = new Map<string, number>();
      keywordResults.forEach((memory, index) => {
        const score = 1 - index / keywordResults.length;
        keywordScores.set(memory.id, score);
      });

      // Map embedding similarity scores
      const embeddingScores = new Map<string, number>();
      embeddingResults.forEach((memory) => {
        embeddingScores.set(memory.id, memory.similarity);
      });

      // Combine all unique memories
      const allMemoryIds = new Set([
        ...keywordResults.map((m) => m.id),
        ...embeddingResults.map((m) => m.id),
      ]);

      // Create combined results
      const combinedResults: Array<
        SemanticMemory & {
          score: number;
          embeddingScore: number;
          keywordScore: number;
        }
      > = [];

      for (const id of allMemoryIds) {
        const memory =
          keywordResults.find((m) => m.id === id) || embeddingResults.find((m) => m.id === id);

        if (!memory) continue;

        const keywordScore = keywordScores.get(id) || 0;
        const embeddingScore = embeddingScores.get(id) || 0;
        const combinedScore = keywordWeight * keywordScore + embeddingWeight * embeddingScore;

        combinedResults.push({
          ...memory,
          score: combinedScore,
          embeddingScore,
          keywordScore,
        });
      }

      // Sort by combined score and return top results
      combinedResults.sort((a, b) => b.score - a.score);

      return combinedResults.slice(0, limit);
    } catch (error) {
      console.error('[SemanticMemory] Hybrid search error:', error);
      // Fallback to keyword search
      const keywordResults = await this.search(query, limit);
      return keywordResults.map((m) => ({
        ...m,
        score: 0,
        embeddingScore: 0,
        keywordScore: 0,
      }));
    }
  }

  /**
   * Generate and store embeddings for all memories without embeddings
   *
   * Useful for batch processing existing memories.
   * Uses parallel processing with controlled concurrency for better performance.
   *
   * @param batchSize - Number of memories to process at once (default: 10)
   * @param concurrency - Number of parallel embedding generations (default: 3)
   * @returns Number of memories processed
   */
  async generateMissingEmbeddings(
    batchSize: number = 10,
    concurrency: number = 3
  ): Promise<number> {
    if (!this.isReady()) return 0;

    try {
      // Get memories without embeddings
      const { data: memories, error } = await this.supabase
        .from('semantic_memories')
        .select('id, content')
        .eq('user_id', this.userId!)
        .order('created_at', { ascending: false })
        .limit(batchSize * 10);

      if (error || !memories) {
        console.error('[SemanticMemory] Error fetching memories:', error);
        return 0;
      }

      // Filter to only memories without embeddings
      const memoriesNeedingEmbeddings = memories
        .filter((m: { id: string; content: string; embedding?: number[] }) => !m.embedding)
        .slice(0, batchSize);

      if (memoriesNeedingEmbeddings.length === 0) return 0;

      // Process embeddings in parallel with controlled concurrency
      const processMemory = async (memory: { id: string; content: string }) => {
        try {
          const result = await generateEmbedding(memory.content);
          return { id: memory.id, embedding: result.embedding, model: result.model };
        } catch {
          return null;
        }
      };

      // Process in batches of 'concurrency' at a time
      const results: Array<{ id: string; embedding: number[]; model: string } | null> = [];
      for (let i = 0; i < memoriesNeedingEmbeddings.length; i += concurrency) {
        const batch = memoriesNeedingEmbeddings.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(processMemory));
        results.push(...batchResults);
      }

      // Filter successful results and batch update
      const successfulResults = results.filter(
        (r): r is { id: string; embedding: number[]; model: string } => r !== null
      );

      // Update all at once using individual updates (Supabase doesn't support bulk update with different values)
      // But we can at least run them in parallel
      const updatePromises = successfulResults.map((result) =>
        this.supabase
          .from('semantic_memories')
          .update({
            embedding: result.embedding,
            embedding_model: result.model,
          })
          .eq('id', result.id)
          .eq('user_id', this.userId!)
      );

      const updateResults = await Promise.all(updatePromises);
      const processed = updateResults.filter((r) => !r.error).length;

      return processed;
    } catch (error) {
      console.error('[SemanticMemory] Error generating missing embeddings:', error);
      return 0;
    }
  }
}

/**
 * Create a semantic memory manager instance
 *
 * @param supabaseClient - Supabase client instance
 * @returns SemanticMemoryManager instance
 */
export function createSemanticMemory(supabaseClient: SupabaseClient): SemanticMemoryManager {
  return new SemanticMemoryManager(supabaseClient);
}
