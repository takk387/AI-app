/**
 * Semantic Memory Types
 *
 * Type definitions for the semantic memory system.
 * Extracted from semanticMemory.ts for modularity.
 */

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
// SUPABASE TYPES
// ============================================================================

/**
 * Chainable query builder for Supabase select operations
 */
export interface SelectQueryBuilder {
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
export interface UpdateQueryBuilder {
  eq: (column: string, value: string) => UpdateQueryBuilder & Promise<{ error: Error | null }>;
}

/**
 * Supabase client type (avoiding direct import for flexibility)
 */
export interface SupabaseClient {
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
