/**
 * Embeddings API Endpoint
 *
 * Generates text embeddings for semantic search.
 * Uses Voyage AI or OpenAI if available, falls back to local embeddings.
 */

import { NextResponse } from 'next/server';
import {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  getEmbeddingProvider,
  hasEmbeddingAPI,
} from '@/utils/embeddings';

// ============================================================================
// TYPES
// ============================================================================

interface EmbeddingRequest {
  text?: string;
  texts?: string[];
  provider?: 'voyage' | 'openai' | 'local' | 'auto';
}

interface SimilarityRequest {
  query: string;
  documents: string[];
  topK?: number;
}

// ============================================================================
// POST - Generate Embeddings
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is a similarity request
    if ('query' in body && 'documents' in body) {
      return handleSimilarityRequest(body as SimilarityRequest);
    }

    // Handle embedding generation
    const { text, texts, provider } = body as EmbeddingRequest;

    if (!text && !texts) {
      return NextResponse.json(
        { error: 'Either "text" or "texts" is required' },
        { status: 400 }
      );
    }

    // Single text embedding
    if (text) {
      const result = await generateEmbedding(text, { provider });
      return NextResponse.json({
        success: true,
        embedding: result.embedding,
        model: result.model,
        provider: result.provider,
        dimensions: result.dimensions,
      });
    }

    // Multiple text embeddings
    if (texts && Array.isArray(texts)) {
      if (texts.length > 100) {
        return NextResponse.json(
          { error: 'Maximum 100 texts per request' },
          { status: 400 }
        );
      }

      const results = await generateEmbeddings(texts, { provider });
      return NextResponse.json({
        success: true,
        embeddings: results.map(r => ({
          embedding: r.embedding,
          model: r.model,
          provider: r.provider,
          dimensions: r.dimensions,
        })),
      });
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Embeddings API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Similarity Search Handler
// ============================================================================

async function handleSimilarityRequest(body: SimilarityRequest) {
  const { query, documents, topK = 5 } = body;

  if (!query || !documents || !Array.isArray(documents)) {
    return NextResponse.json(
      { error: 'Query and documents array are required' },
      { status: 400 }
    );
  }

  if (documents.length > 100) {
    return NextResponse.json(
      { error: 'Maximum 100 documents per request' },
      { status: 400 }
    );
  }

  try {
    // Generate embeddings for query and all documents
    const [queryResult, ...documentResults] = await generateEmbeddings(
      [query, ...documents]
    );

    // Calculate similarities
    const similarities = documentResults.map((docResult, index) => ({
      index,
      document: documents[index],
      score: cosineSimilarity(queryResult.embedding, docResult.embedding),
    }));

    // Sort by score and return top K
    similarities.sort((a, b) => b.score - a.score);
    const results = similarities.slice(0, Math.min(topK, similarities.length));

    return NextResponse.json({
      success: true,
      provider: queryResult.provider,
      results,
    });
  } catch (error) {
    console.error('[Embeddings API] Similarity error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate similarity' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Provider Info
// ============================================================================

export async function GET() {
  return NextResponse.json({
    provider: getEmbeddingProvider(),
    hasExternalAPI: hasEmbeddingAPI(),
    supportedProviders: ['voyage', 'openai', 'local'],
    endpoints: {
      generateSingle: 'POST { text: string }',
      generateBatch: 'POST { texts: string[] }',
      similarity: 'POST { query: string, documents: string[], topK?: number }',
    },
  });
}
