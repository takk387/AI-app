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
  hasEmbeddingAPI,
  getEmbeddingProvider,
} from './embeddings';

// Re-export types for API compatibility
export type {
  MemoryType,
  MemoryCategory,
  MemorySpecificity,
  SemanticMemory,
  MemoryStats,
  StoreMemoryOptions,
} from './semanticMemoryTypes';

// Re-export keyword/extraction functions for API compatibility
export {
  extractKeywords,
  extractDesignKeywords,
  calculateKeywordSimilarity,
  extractMemoriesFromConversation,
} from './semanticMemoryKeywords';

// Import types needed internally
import type {
  MemoryType,
  MemoryCategory,
  SemanticMemory,
  MemoryStats,
  StoreMemoryOptions,
  SupabaseClient,
} from './semanticMemoryTypes';

import {
  extractKeywords,
  calculateKeywordSimilarity,
  extractMemoriesFromConversation,
} from './semanticMemoryKeywords';

import {
  queryByCategory,
  queryByProject,
  queryChildMemories,
  buildHierarchicalContext,
  linkMemoryToParent,
  addRelatedMemoryLinks,
} from './semanticMemoryHierarchy';

import {
  searchByEmbedding,
  hybridSearch,
  generateMissingEmbeddings,
} from './semanticMemoryEmbeddings';

// ============================================================================
// SEMANTIC MEMORY CLASS
// ============================================================================

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
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .select('*')
        .overlaps('keywords', queryKeywords)
        .eq('user_id', this.userId!)
        .order('importance', { ascending: false })
        .limit(limit * 2);

      if (error) {
        console.error('[SemanticMemory] Search error:', error);
        return [];
      }

      if (!data) return [];

      const ranked = data.map((memory) => ({
        memory,
        score: calculateKeywordSimilarity(queryKeywords, memory.keywords) * memory.importance,
      }));

      ranked.sort((a, b) => b.score - a.score);

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
    let memories: SemanticMemory[];

    if (hasEmbeddingAPI()) {
      const hybridResults = await this.hybridSearch(query, limit);
      memories = hybridResults;
    } else {
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
          preference: 0, decision: 0, project: 0, feature: 0, style: 0,
          error_solution: 0, data_model: 0, workflow: 0, integration: 0,
          constraint: 0, api_contract: 0,
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
            preference: 0, decision: 0, project: 0, feature: 0, style: 0,
            error_solution: 0, data_model: 0, workflow: 0, integration: 0,
            constraint: 0, api_contract: 0,
          },
          averageImportance: 0,
          oldestMemory: null,
          mostAccessedKeywords: [],
        };
      }

      const byType: Record<MemoryType, number> = {
        preference: 0, decision: 0, project: 0, feature: 0, style: 0,
        error_solution: 0, data_model: 0, workflow: 0, integration: 0,
        constraint: 0, api_contract: 0,
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
          preference: 0, decision: 0, project: 0, feature: 0, style: 0,
          error_solution: 0, data_model: 0, workflow: 0, integration: 0,
          constraint: 0, api_contract: 0,
        },
        averageImportance: 0,
        oldestMemory: null,
        mostAccessedKeywords: [],
      };
    }
  }

  // ============================================================================
  // HIERARCHICAL MEMORY METHODS (delegated)
  // ============================================================================

  async searchByCategory(category: MemoryCategory, limit: number = 20): Promise<SemanticMemory[]> {
    if (!this.isReady()) return [];
    return queryByCategory(this.supabase, this.userId!, category, limit);
  }

  async searchByProject(projectId: string, limit: number = 50): Promise<SemanticMemory[]> {
    if (!this.isReady()) return [];
    return queryByProject(this.supabase, this.userId!, projectId, limit);
  }

  async getChildMemories(parentId: string): Promise<SemanticMemory[]> {
    if (!this.isReady()) return [];
    return queryChildMemories(this.supabase, this.userId!, parentId);
  }

  async getHierarchicalContext(projectId?: string, maxTokens: number = 3000): Promise<string> {
    if (!this.isReady()) return '';

    const categories: MemoryCategory[] = ['app', 'feature', 'technical', 'ui', 'workflow', 'user'];
    const categorizedMemories = new Map<MemoryCategory, SemanticMemory[]>();

    for (const category of categories) {
      let memories: SemanticMemory[];
      if (projectId) {
        const allProjectMemories = await this.searchByProject(projectId, 100);
        memories = allProjectMemories.filter((m) => m.category === category);
      } else {
        memories = await this.searchByCategory(category, 10);
      }
      if (memories.length > 0) {
        categorizedMemories.set(category, memories);
      }
    }

    return buildHierarchicalContext(categorizedMemories, maxTokens);
  }

  async linkToParent(memoryId: string, parentId: string): Promise<void> {
    if (!this.isReady()) return;
    return linkMemoryToParent(this.supabase, this.userId!, memoryId, parentId);
  }

  async addRelatedMemories(memoryId: string, relatedIds: string[]): Promise<void> {
    if (!this.isReady()) return;
    return addRelatedMemoryLinks(this.supabase, this.userId!, memoryId, relatedIds);
  }

  // ============================================================================
  // EMBEDDING-BASED SEARCH (delegated)
  // ============================================================================

  hasEmbeddingSupport(): boolean {
    return hasEmbeddingAPI();
  }

  getEmbeddingProvider(): string {
    return getEmbeddingProvider();
  }

  async searchByEmbedding(
    query: string,
    limit: number = 10,
    minSimilarity: number = 0.3
  ): Promise<Array<SemanticMemory & { similarity: number }>> {
    if (!this.isReady()) return [];
    return searchByEmbedding(
      this.supabase,
      this.userId!,
      query,
      limit,
      minSimilarity,
      (q, l) => this.search(q, l)
    );
  }

  async hybridSearch(
    query: string,
    limit: number = 10,
    embeddingWeight: number = 0.7
  ): Promise<
    Array<SemanticMemory & { score: number; embeddingScore: number; keywordScore: number }>
  > {
    if (!this.isReady()) return [];
    return hybridSearch(
      query,
      limit,
      embeddingWeight,
      (q, l) => this.search(q, l),
      (q, l, ms) => this.searchByEmbedding(q, l, ms)
    );
  }

  async generateMissingEmbeddings(
    batchSize: number = 10,
    concurrency: number = 3
  ): Promise<number> {
    if (!this.isReady()) return 0;
    return generateMissingEmbeddings(this.supabase, this.userId!, batchSize, concurrency);
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
