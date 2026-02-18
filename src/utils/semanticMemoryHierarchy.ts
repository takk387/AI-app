/**
 * Semantic Memory Hierarchy
 *
 * Pure functions for hierarchical memory operations:
 * category search, project search, child queries, parent linking, and related memory management.
 * Extracted from SemanticMemoryManager for modularity.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { MemoryCategory, SemanticMemory, SupabaseClient } from './semanticMemoryTypes';

// ============================================================================
// HIERARCHICAL MEMORY FUNCTIONS
// ============================================================================

/**
 * Search memories by category
 *
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param category - Category to search
 * @param limit - Maximum results
 * @returns Memories in the category
 */
export async function queryByCategory(
  supabase: SupabaseClient,
  userId: string,
  category: MemoryCategory,
  limit: number = 20
): Promise<SemanticMemory[]> {
  try {
    const { data, error } = await supabase
      .from('semantic_memories')
      .select('*')
      .eq('user_id', userId)
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
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param projectId - Project ID to search
 * @param limit - Maximum results
 * @returns Memories for the project
 */
export async function queryByProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  limit: number = 50
): Promise<SemanticMemory[]> {
  try {
    const { data, error } = await supabase
      .from('semantic_memories')
      .select('*')
      .eq('user_id', userId)
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
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param parentId - Parent memory ID
 * @returns Child memories
 */
export async function queryChildMemories(
  supabase: SupabaseClient,
  userId: string,
  parentId: string
): Promise<SemanticMemory[]> {
  try {
    const { data, error } = await supabase
      .from('semantic_memories')
      .select('*')
      .eq('user_id', userId)
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
 * @param categorizedMemories - Map of category to memories (pre-fetched by caller)
 * @param maxTokens - Maximum estimated tokens
 * @returns Formatted context string
 */
export function buildHierarchicalContext(
  categorizedMemories: Map<MemoryCategory, SemanticMemory[]>,
  maxTokens: number = 3000
): string {
  const categories: MemoryCategory[] = ['app', 'feature', 'technical', 'ui', 'workflow', 'user'];
  const parts: string[] = [];
  let tokenCount = 0;

  for (const category of categories) {
    const memories = categorizedMemories.get(category);
    if (!memories || memories.length === 0) continue;

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
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param memoryId - Memory to update
 * @param parentId - Parent memory ID
 */
export async function linkMemoryToParent(
  supabase: SupabaseClient,
  userId: string,
  memoryId: string,
  parentId: string
): Promise<void> {
  const { error } = await supabase
    .from('semantic_memories')
    .update({ parent_id: parentId })
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('[SemanticMemory] Error linking to parent:', error);
  }
}

/**
 * Add related memory links
 *
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param memoryId - Memory to update
 * @param relatedIds - Related memory IDs to add
 */
export async function addRelatedMemoryLinks(
  supabase: SupabaseClient,
  userId: string,
  memoryId: string,
  relatedIds: string[]
): Promise<void> {
  // Get current related IDs
  const { data } = await supabase
    .from('semantic_memories')
    .select('related_ids')
    .eq('id', memoryId)
    .eq('user_id', userId)
    .limit(1);

  const currentRelated = data?.[0]?.related_ids || [];
  const newRelated = [...new Set([...currentRelated, ...relatedIds])];

  const { error } = await supabase
    .from('semantic_memories')
    .update({ related_ids: newRelated })
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('[SemanticMemory] Error adding related memories:', error);
  }
}
