/**
 * Text Embedding Utility
 *
 * Provides text embeddings for semantic similarity search.
 * Supports multiple embedding providers with fallback options.
 *
 * Providers (in order of preference):
 * 1. Voyage AI (recommended by Anthropic) - requires VOYAGE_API_KEY
 * 2. OpenAI Embeddings - requires OPENAI_API_KEY
 * 3. Local TF-IDF-like embeddings (no API required)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: 'voyage' | 'openai' | 'local';
  dimensions: number;
}

export interface EmbeddingConfig {
  provider?: 'voyage' | 'openai' | 'local' | 'auto';
  voyageApiKey?: string;
  openaiApiKey?: string;
  model?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Local embedding dimensions (smaller for efficiency)
const LOCAL_EMBEDDING_DIMENSIONS = 384;

// Common words for TF-IDF vocabulary (expanded for better coverage)
const VOCABULARY = [
  // Technical terms
  'api', 'database', 'server', 'client', 'frontend', 'backend', 'auth', 'authentication',
  'user', 'admin', 'role', 'permission', 'feature', 'component', 'function', 'method',
  'class', 'interface', 'type', 'variable', 'constant', 'module', 'import', 'export',
  'async', 'await', 'promise', 'callback', 'event', 'handler', 'listener', 'middleware',
  'route', 'endpoint', 'request', 'response', 'status', 'error', 'success', 'fail',
  'test', 'mock', 'stub', 'fixture', 'assert', 'expect', 'describe', 'it', 'before',
  'after', 'setup', 'teardown', 'config', 'settings', 'options', 'params', 'args',
  'data', 'model', 'schema', 'table', 'column', 'row', 'record', 'field', 'value',
  'key', 'id', 'uuid', 'timestamp', 'date', 'time', 'duration', 'interval', 'timeout',
  'cache', 'store', 'memory', 'storage', 'file', 'directory', 'path', 'url', 'uri',
  'http', 'https', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options',
  'json', 'xml', 'html', 'css', 'javascript', 'typescript', 'react', 'next', 'node',
  'npm', 'yarn', 'package', 'dependency', 'version', 'update', 'upgrade', 'install',
  'build', 'compile', 'bundle', 'minify', 'optimize', 'deploy', 'release', 'publish',
  'log', 'debug', 'info', 'warn', 'error', 'trace', 'monitor', 'metric', 'alert',
  'security', 'encrypt', 'decrypt', 'hash', 'salt', 'token', 'session', 'cookie',
  'login', 'logout', 'register', 'signup', 'signin', 'password', 'email', 'username',
  'profile', 'account', 'settings', 'preferences', 'notification', 'message', 'chat',
  'list', 'array', 'object', 'map', 'set', 'queue', 'stack', 'tree', 'graph',
  'sort', 'filter', 'reduce', 'map', 'find', 'search', 'query', 'index', 'cursor',
  'page', 'pagination', 'limit', 'offset', 'count', 'total', 'sum', 'average', 'max',
  'min', 'create', 'read', 'update', 'delete', 'crud', 'insert', 'select', 'join',
  'where', 'order', 'group', 'having', 'distinct', 'union', 'intersect', 'except',
  // UI/UX terms
  'button', 'input', 'form', 'modal', 'dialog', 'dropdown', 'menu', 'nav', 'header',
  'footer', 'sidebar', 'content', 'layout', 'grid', 'flex', 'container', 'wrapper',
  'card', 'panel', 'tab', 'accordion', 'carousel', 'slider', 'progress', 'spinner',
  'icon', 'image', 'avatar', 'badge', 'tag', 'label', 'tooltip', 'popover', 'toast',
  'table', 'row', 'column', 'cell', 'header', 'body', 'footer', 'pagination',
  'dark', 'light', 'theme', 'color', 'font', 'size', 'spacing', 'margin', 'padding',
  'border', 'shadow', 'radius', 'animation', 'transition', 'transform', 'opacity',
  'responsive', 'mobile', 'tablet', 'desktop', 'breakpoint', 'media', 'query',
  // Project management
  'task', 'project', 'milestone', 'deadline', 'priority', 'status', 'progress',
  'assign', 'complete', 'pending', 'blocked', 'review', 'approve', 'reject',
  'comment', 'mention', 'notify', 'remind', 'schedule', 'calendar', 'event',
  // Common verbs
  'add', 'remove', 'edit', 'save', 'load', 'fetch', 'send', 'receive', 'process',
  'validate', 'sanitize', 'format', 'parse', 'stringify', 'encode', 'decode',
  'enable', 'disable', 'show', 'hide', 'toggle', 'expand', 'collapse', 'open',
  'close', 'start', 'stop', 'pause', 'resume', 'reset', 'clear', 'refresh',
  // Common adjectives
  'new', 'old', 'active', 'inactive', 'enabled', 'disabled', 'visible', 'hidden',
  'public', 'private', 'protected', 'internal', 'external', 'local', 'remote',
  'primary', 'secondary', 'default', 'custom', 'optional', 'required', 'readonly',
  'async', 'sync', 'static', 'dynamic', 'lazy', 'eager', 'cached', 'fresh',
];

// ============================================================================
// EMBEDDING PROVIDERS
// ============================================================================

/**
 * Generate embeddings using Voyage AI
 */
async function getVoyageEmbedding(
  text: string,
  apiKey: string,
  model: string = 'voyage-3-large'
): Promise<EmbeddingResult> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: model,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error: ${error}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  return {
    embedding,
    model,
    provider: 'voyage',
    dimensions: embedding.length,
  };
}

/**
 * Generate embeddings using OpenAI
 */
async function getOpenAIEmbedding(
  text: string,
  apiKey: string,
  model: string = 'text-embedding-3-small'
): Promise<EmbeddingResult> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: model,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${error}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  return {
    embedding,
    model,
    provider: 'openai',
    dimensions: embedding.length,
  };
}

/**
 * Generate local TF-IDF-like embeddings (no API required)
 * Uses a fixed vocabulary for consistent dimensions
 */
function getLocalEmbedding(text: string): EmbeddingResult {
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\W+/).filter(Boolean);

  // Calculate word frequencies
  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }

  // Create embedding based on vocabulary
  const embedding: number[] = new Array(LOCAL_EMBEDDING_DIMENSIONS).fill(0);

  // Map vocabulary words to embedding dimensions
  for (let i = 0; i < VOCABULARY.length && i < LOCAL_EMBEDDING_DIMENSIONS; i++) {
    const vocabWord = VOCABULARY[i];
    if (wordFreq[vocabWord]) {
      // TF component: frequency normalized by text length
      const tf = wordFreq[vocabWord] / words.length;
      embedding[i] = tf;
    }

    // Also check for partial matches (substrings)
    for (const word of Object.keys(wordFreq)) {
      if (word.includes(vocabWord) || vocabWord.includes(word)) {
        const partialTf = wordFreq[word] / words.length * 0.5;
        embedding[i] = Math.max(embedding[i], partialTf);
      }
    }
  }

  // Add n-gram features for remaining dimensions
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`);
  }

  // Hash bigrams to remaining dimensions
  const bigramStart = Math.min(VOCABULARY.length, LOCAL_EMBEDDING_DIMENSIONS - 50);
  for (const bigram of bigrams) {
    const hash = simpleHash(bigram) % 50;
    embedding[bigramStart + hash] += 1 / bigrams.length;
  }

  // Normalize the embedding vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return {
    embedding,
    model: 'local-tfidf',
    provider: 'local',
    dimensions: LOCAL_EMBEDDING_DIMENSIONS,
  };
}

/**
 * Simple hash function for consistent dimension mapping
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Generate text embeddings using the best available provider
 *
 * @param text - Text to embed
 * @param config - Optional configuration
 * @returns Embedding result
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = {}
): Promise<EmbeddingResult> {
  const {
    provider = 'auto',
    voyageApiKey = process.env.VOYAGE_API_KEY,
    openaiApiKey = process.env.OPENAI_API_KEY,
    model,
  } = config;

  // Determine which provider to use
  if (provider === 'voyage' || (provider === 'auto' && voyageApiKey)) {
    if (!voyageApiKey) {
      throw new Error('Voyage API key required for Voyage embeddings');
    }
    return getVoyageEmbedding(text, voyageApiKey, model || 'voyage-3-large');
  }

  if (provider === 'openai' || (provider === 'auto' && openaiApiKey)) {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key required for OpenAI embeddings');
    }
    return getOpenAIEmbedding(text, openaiApiKey, model || 'text-embedding-3-small');
  }

  // Fall back to local embeddings
  return getLocalEmbedding(text);
}

/**
 * Generate embeddings for multiple texts
 *
 * @param texts - Texts to embed
 * @param config - Optional configuration
 * @returns Array of embedding results
 */
export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig = {}
): Promise<EmbeddingResult[]> {
  // For local embeddings, process all at once
  if (config.provider === 'local' || (!config.voyageApiKey && !config.openaiApiKey)) {
    return texts.map(text => getLocalEmbedding(text));
  }

  // For API providers, process in batches to avoid rate limits
  const results: EmbeddingResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text, config))
    );
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// SIMILARITY FUNCTIONS
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score (0-1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two vectors
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Distance (lower is more similar)
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Find most similar items from a collection
 *
 * @param queryEmbedding - Query embedding vector
 * @param embeddings - Collection of embeddings to search
 * @param topK - Number of results to return
 * @returns Indices and scores of most similar items
 */
export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: number[][],
  topK: number = 5
): Array<{ index: number; score: number }> {
  const scores = embeddings.map((embedding, index) => ({
    index,
    score: cosineSimilarity(queryEmbedding, embedding),
  }));

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, topK);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an embedding API is available
 */
export function hasEmbeddingAPI(): boolean {
  return !!(process.env.VOYAGE_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Get the active embedding provider name
 */
export function getEmbeddingProvider(): 'voyage' | 'openai' | 'local' {
  if (process.env.VOYAGE_API_KEY) return 'voyage';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'local';
}

/**
 * Serialize embedding to string for storage
 */
export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding);
}

/**
 * Deserialize embedding from string
 */
export function deserializeEmbedding(serialized: string): number[] {
  return JSON.parse(serialized);
}
