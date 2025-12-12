---
paths:
  - src/services/CodeContextService.ts
  - src/services/ContextCache.ts
  - src/services/CodeParser.ts
  - src/utils/contextCompression.ts
  - src/utils/semanticMemory.ts
  - src/hooks/useSmartContext.ts
---

# Context & Parsing Services

## Overview

These services handle context extraction, compression, and caching for AI code generation.

## CodeContextService

**Location:** `src/services/CodeContextService.ts`

Extracts relevant code context for a given phase:

```typescript
class CodeContextService {
  // Extract context for a specific phase
  static extractContext(
    files: FileMap,
    phase: DynamicPhase,
    options?: ContextOptions
  ): ExtractedContext;

  // Get dependencies for a file
  static getDependencies(file: string, files: FileMap): string[];

  // Compress context to fit token budget
  static compressContext(context: ExtractedContext, maxTokens: number): string;
}
```

**Key Patterns:**

- Uses Tree-sitter AST for accurate dependency tracking
- Respects phase dependencies when extracting context
- Compresses context using semantic prioritization

## ContextCache

**Location:** `src/services/ContextCache.ts`

Caches extracted context to avoid recomputation:

```typescript
class ContextCache {
  // Get cached context or compute and cache
  static getOrCompute(key: string, compute: () => Context): Context;

  // Invalidate cache entries
  static invalidate(pattern: string | RegExp): void;

  // Clear entire cache
  static clear(): void;
}
```

**Cache Invalidation Rules:**

- Invalidate when file content changes
- Invalidate when dependencies change
- Invalidate when phase configuration changes
- TTL-based expiration for long-running sessions

## CodeParser

**Location:** `src/services/CodeParser.ts`

Parses code using Tree-sitter for AST analysis:

```typescript
class CodeParser {
  // Parse file and extract structure
  static parseFile(content: string, language: string): ParsedFile;

  // Extract exports from a file
  static getExports(content: string): Export[];

  // Extract imports from a file
  static getImports(content: string): Import[];

  // Find function/component by name
  static findSymbol(content: string, name: string): Symbol | null;
}
```

**Supported Languages:**

- TypeScript/TSX (primary)
- JavaScript/JSX
- JSON (for config files)

## Context Compression

**Location:** `src/utils/contextCompression.ts`

Compresses code context to fit within token limits:

```typescript
// Compress context with semantic prioritization
function compressContext(
  context: string,
  maxTokens: number,
  options?: CompressionOptions
): CompressedContext;

// Strategies
type CompressionStrategy =
  | 'semantic' // Prioritize by relevance
  | 'structural' // Keep structure, remove bodies
  | 'truncate'; // Simple truncation
```

**Compression Priority (highest to lowest):**

1. Type definitions and interfaces
2. Function signatures
3. Export statements
4. Import statements
5. Function bodies
6. Comments

## Semantic Memory

**Location:** `src/utils/semanticMemory.ts`

Maintains semantic understanding across phases:

```typescript
// Store semantic context for later retrieval
function storeSemanticContext(phaseId: string, context: SemanticContext): void;

// Retrieve relevant context for current phase
function retrieveRelevantContext(phase: DynamicPhase): SemanticContext[];

// Build cumulative understanding
function buildCumulativeContext(phases: DynamicPhase[]): string;
```

## useSmartContext Hook

**Location:** `src/hooks/useSmartContext.ts`

React hook wrapping context services:

```typescript
function useSmartContext(phase: DynamicPhase) {
  return {
    context: string; // Extracted and compressed context
    isLoading: boolean;
    tokenCount: number;
    refreshContext(): void;
  };
}
```

## Critical Patterns

### Token Counting

Always use js-tiktoken for accurate counts:

```typescript
import { getEncoding } from 'js-tiktoken';

const encoding = getEncoding('cl100k_base'); // Claude's encoding
const tokenCount = encoding.encode(text).length;
```

### Cache Keys

Use deterministic keys for reliable caching:

```typescript
// Good - deterministic
const key = `${phaseId}:${hashFiles(files)}:${options.maxTokens}`;

// Bad - non-deterministic
const key = `${Date.now()}:${phaseId}`;
```

### Error Handling

Services should throw typed errors:

```typescript
class ContextError extends Error {
  constructor(
    message: string,
    public code: 'PARSE_ERROR' | 'CACHE_ERROR' | 'COMPRESS_ERROR',
    public details?: unknown
  ) {
    super(message);
  }
}
```

## Testing

Services have tests in:

- `src/services/__tests__/CodeParser.test.ts`
- `tests/context-compression.test.ts`

When modifying these services:

1. Run `npm run test:services` to verify
2. Check token count accuracy with sample files
3. Verify cache invalidation works correctly
