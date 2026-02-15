/**
 * Semantic Memory Embeddings
 *
 * Pure functions for embedding-based search operations:
 * vector similarity search, hybrid search, and batch embedding generation.
 * Extracted from SemanticMemoryManager for modularity.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
  generateEmbedding,
  cosineSimilarity,
} from './embeddings';
import type {
  SemanticMemory,
  SupabaseClient,
} from './semanticMemoryTypes';

// ============================================================================
// EMBEDDING-BASED SEARCH FUNCTIONS
// ============================================================================

/**
 * Search memories using embedding similarity
 *
 * Falls back to keyword search results (passed via fallbackSearch) if embeddings
 * are not available or no matches found.
 *
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param query - Search query
 * @param limit - Maximum results (default: 10)
 * @param minSimilarity - Minimum similarity score (default: 0.3)
 * @param fallbackSearch - Fallback keyword search function
 * @returns Array of memories with similarity scores
 */
export async function searchByEmbedding(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.3,
  fallbackSearch: (query: string, limit: number) => Promise<SemanticMemory[]>
): Promise<Array<SemanticMemory & { similarity: number }>> {
  try {
    // Generate embedding for query
    const queryResult = await generateEmbedding(query);
    const queryEmbedding = queryResult.embedding;

    // Get all memories with embeddings for this user
    const { data: memories, error } = await supabase
      .from('semantic_memories')
      .select('*')
      .eq('user_id', userId)
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
    const keywordResults = await fallbackSearch(query, limit);
    return keywordResults.map((m) => ({ ...m, similarity: 0 }));
  } catch (error) {
    console.error('[SemanticMemory] Embedding search error:', error);
    // Fallback to keyword search
    const keywordResults = await fallbackSearch(query, limit);
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
 * @param keywordSearch - Keyword search function
 * @param embeddingSearch - Embedding search function
 * @returns Array of memories with combined scores
 */
export async function hybridSearch(
  query: string,
  limit: number = 10,
  embeddingWeight: number = 0.7,
  keywordSearch: (query: string, limit: number) => Promise<SemanticMemory[]>,
  embeddingSearch: (query: string, limit: number, minSimilarity: number) => Promise<Array<SemanticMemory & { similarity: number }>>
): Promise<
  Array<SemanticMemory & { score: number; embeddingScore: number; keywordScore: number }>
> {
  const keywordWeight = 1 - embeddingWeight;

  try {
    // Run both searches in parallel for better performance
    const [keywordResults, embeddingResults] = await Promise.all([
      keywordSearch(query, limit * 2),
      embeddingSearch(query, limit * 2, 0.2),
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
    const keywordResults = await keywordSearch(query, limit);
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
 * @param supabase - Supabase client
 * @param userId - Current user ID
 * @param batchSize - Number of memories to process at once (default: 10)
 * @param concurrency - Number of parallel embedding generations (default: 3)
 * @returns Number of memories processed
 */
export async function generateMissingEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  batchSize: number = 10,
  concurrency: number = 3
): Promise<number> {
  try {
    // Get memories without embeddings
    const { data: memories, error } = await supabase
      .from('semantic_memories')
      .select('id, content')
      .eq('user_id', userId)
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
      supabase
        .from('semantic_memories')
        .update({
          embedding: result.embedding,
          embedding_model: result.model,
        })
        .eq('id', result.id)
        .eq('user_id', userId)
    );

    const updateResults = await Promise.all(updatePromises);
    const processed = updateResults.filter((r) => !r.error).length;

    return processed;
  } catch (error) {
    console.error('[SemanticMemory] Error generating missing embeddings:', error);
    return 0;
  }
}
