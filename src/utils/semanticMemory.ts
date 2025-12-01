/**
 * Semantic Memory Utility
 * 
 * Cross-session semantic memory using Supabase for persistent storage.
 * Uses keyword-based search for simplicity (no embeddings required).
 */

import type { ChatMessage } from '@/types/aiBuilderTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Type of memory entry
 */
export type MemoryType = 'preference' | 'decision' | 'project' | 'feature' | 'style' | 'error_solution';

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
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

/**
 * Common stop words to filter out from keywords
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under',
  'above', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either',
  'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very',
  'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'any', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
  'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
  'who', 'whom', 'as', 'if', 'then', 'because', 'while', 'although',
  'though', 'unless', 'since', 'until', 'make', 'want', 'like', 'use',
  'add', 'get', 'set', 'put', 'let', 'please', 'thanks', 'thank',
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
    .filter(word => word.length > 2) // Filter short words
    .filter(word => !STOP_WORDS.has(word)); // Remove stop words
  
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
 * Calculate keyword similarity between query and memory
 * 
 * @param queryKeywords - Keywords from search query
 * @param memoryKeywords - Keywords from memory entry
 * @returns Similarity score (0-1)
 */
export function calculateKeywordSimilarity(queryKeywords: string[], memoryKeywords: string[]): number {
  if (queryKeywords.length === 0 || memoryKeywords.length === 0) return 0;
  
  const querySet = new Set(queryKeywords.map(k => k.toLowerCase()));
  const memorySet = new Set(memoryKeywords.map(k => k.toLowerCase()));
  
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
  ],
  error_solution: [
    /(?:fixed|solved|resolved)\s+(?:the|a|an)?\s*(.{5,100}?)(?:\.|,|$)/gi,
    /(?:error|bug|issue|problem)\s+(?:was|is)\s+(.{5,80}?)(?:\.|,|$)/gi,
    /(?:solution|fix|workaround)\s*:\s*(.{5,80}?)(?:\.|,|$)/gi,
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
    const isDuplicate = uniqueMemories.some(existing => {
      // Check for similar content
      const similarity = calculateKeywordSimilarity(
        memory.keywords || [],
        existing.keywords || []
      );
      return similarity > 0.7 || existing.content.includes(memory.content) || memory.content.includes(existing.content);
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
 * Supabase client type (avoiding direct import for flexibility)
 */
interface SupabaseClient {
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }>;
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options?: { ascending: boolean }) => {
          limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
        };
        gte: (column: string, value: string) => {
          delete: () => Promise<{ error: Error | null }>;
        };
      };
      contains: (column: string, values: string[]) => {
        eq: (column: string, value: string) => {
          order: (column: string, options?: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
          };
        };
      };
      overlaps: (column: string, values: string[]) => {
        eq: (column: string, value: string) => {
          order: (column: string, options?: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: SemanticMemory[] | null; error: Error | null }>;
          };
        };
      };
    };
    update: (data: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    };
    delete: () => {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      lt: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  };
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } | null; error: Error | null }>;
  };
  rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
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
        console.warn('[SemanticMemory] No authenticated user found');
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
      console.warn('[SemanticMemory] Not initialized, cannot store memory');
      return;
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
    };
    
    const { error } = await this.supabase.from('semantic_memories').insert(memory);
    
    if (error) {
      console.error('[SemanticMemory] Error storing memory:', error);
    }
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
      const ranked = data.map(memory => ({
        memory,
        score: calculateKeywordSimilarity(queryKeywords, memory.keywords) * memory.importance,
      }));
      
      ranked.sort((a, b) => b.score - a.score);
      
      // Update access counts for returned memories
      const topMemories = ranked.slice(0, limit).map(r => r.memory);
      await this.updateAccessCounts(topMemories.map(m => m.id));
      
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
      await this.supabase
        .from('semantic_memories')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: this.supabase.rpc('increment_access_count', { memory_id: id }),
        })
        .eq('id', id);
    }
  }
  
  /**
   * Get context for a prompt based on query
   * 
   * @param query - User query to find relevant context for
   * @returns Formatted context string
   */
  async getContextForPrompt(query: string): Promise<string> {
    const memories = await this.search(query, 5);
    
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
        },
        averageImportance: 0,
        oldestMemory: null,
        mostAccessedKeywords: [],
      };
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
