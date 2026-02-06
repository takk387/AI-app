---
paths:
  - src/services/TitanPipelineService.ts
  - src/services/GeminiLayoutService.ts
  - src/services/GeminiImageService.ts
  - src/services/AppImageGenerator.ts
  - src/services/AssetExtractionService.ts
  - src/services/VisionLoopEngine.ts
  - src/services/LayoutAutoFixEngine.ts
  - src/services/BackgroundPlanningOrchestrator.ts
  - src/services/ConsensusNegotiator.ts
  - src/services/DualValidationOrchestrator.ts
  - src/services/LiveIntelligenceGatherer.ts
  - src/services/LayoutBackendAnalyzer.ts
  - src/services/CodeContextService.ts
  - src/services/ContextCache.ts
  - src/services/CodeParser.ts
  - src/utils/contextCompression.ts
  - src/utils/layoutValidation.ts
  - src/utils/semanticMemory.ts
  - src/utils/architectureToPhaseContext.ts
  - src/hooks/useSmartContext.ts
---

# Services Layer

## Overview

This layer contains three major service groups:

1. **Titan Pipeline Services** - Gemini-powered vision, image generation, and code synthesis
2. **Dual AI Planning Services** - Claude + Gemini consensus architecture pipeline
3. **Context & Parsing Services** - Context extraction, compression, and caching for AI code generation

---

## Titan Pipeline Services

### TitanPipelineService

**Location:** `src/services/TitanPipelineService.ts` (~1074 lines)

Main pipeline orchestrator. Executes a 6-step pipeline to transform user input (images + instructions) into generated React/Tailwind code.

```typescript
class TitanPipelineService {
  static async execute(
    input: PipelineInput,
    onProgress?: (progress: PipelineProgress) => void
  ): Promise<PipelineResult>;
}
```

**Pipeline steps:** Router → Surveyor → Architect (bypassed) → Physicist (bypassed) → Photographer → Builder

**Key patterns:**

- Each step is a separate Gemini API call with specialized prompts
- Router determines `MergeStrategy` (CREATE | MERGE | EDIT)
- Router detects reference images vs UI screenshots
- Surveyor produces `VisualManifest[]` from screenshots
- Photographer generates material assets via `GeminiImageService`
- Builder synthesizes final code with multimodal input (image + manifest + assets)
- Progress reported via callback for UI updates

### GeminiLayoutService

**Location:** `src/services/GeminiLayoutService.ts` (~1364 lines)

Gemini Vision-based layout analysis, component building, and critique. Used by both the Layout Builder (Step 2) and the self-healing vision loop.

```typescript
class GeminiLayoutService {
  // Two-stage layout analysis from image
  static async analyzeLayoutImage(
    imageBase64: string,
    mimeType: string
  ): Promise<LayoutAnalysisResult>;

  // Critique rendered output against original
  static async critiqueLayout(
    originalImage: string,
    renderedScreenshot: string,
    components: DetectedComponentEnhanced[]
  ): Promise<LayoutCritiqueEnhanced>;
}
```

**Key patterns:**

- Two-stage analysis: Stage 1 extracts `DesignSpec`, Stage 2 builds `DetectedComponentEnhanced[]`
- Zod validation with `.passthrough()` for open-ended AI outputs
- Critique produces `fidelityScore` (0-100) and `correctionJSON` patches
- Open-ended issue types (string, not enum) for flexible AI critique

### GeminiImageService

**Location:** `src/services/GeminiImageService.ts` (~116 lines)

Multimodal image generation via `gemini-3-pro-image-preview` model.

```typescript
class GeminiImageService {
  static async generateBackgroundFromReference(
    request: BackgroundGenerationRequest
  ): Promise<{ imageBase64: string; mimeType: string } | null>;
}
```

**Key patterns:**

- Accepts optional `referenceImage` for multimodal (image+text) generation
- Contextual prompt: shaped elements (button, card) get "incorporate this photo" prompt; backgrounds get "match visual style" prompt
- `isShapedElement` detection for prompt switching
- Returns base64 image for Supabase upload

### AppImageGenerator

**Location:** `src/services/AppImageGenerator.ts` (~277 lines)

Coordinates image generation requests and uploads results to Supabase.

```typescript
class AppImageGenerator {
  static async generateAndUpload(request: BackgroundGenerationRequest): Promise<string | null>; // Returns public URL or null
}
```

**Key patterns:**

- Calls `GeminiImageService` for generation
- Uploads result to Supabase Storage
- Returns public URL for injection into Builder context
- Used by Photographer step in Titan Pipeline

### AssetExtractionService

**Location:** `src/services/AssetExtractionService.ts` (~251 lines)

Sharp-based image cropping from screenshots, with Supabase upload.

```typescript
class AssetExtractionService {
  static async extractCustomVisualAssets(
    screenshotBase64: string,
    manifest: VisualManifest
  ): Promise<ExtractedAsset[]>;
}
```

**Key patterns:**

- Uses Sharp library for server-side image manipulation
- Crops individual components from full-page screenshots
- Uploads cropped images to Supabase Storage
- Returns public URLs for Builder to use as `background-image`
- Wired into pipeline after Surveyor step

### VisionLoopEngine

**Location:** `src/services/VisionLoopEngine.ts` (~499 lines)

Self-healing vision loop that iteratively improves layout fidelity.

```typescript
class VisionLoopEngine {
  async executeStep(
    components: DetectedComponentEnhanced[],
    designSpec: DesignSpec | null,
    config: SelfHealingConfig
  ): Promise<SelfHealingResult>;
}
```

**Key patterns:**

- Captures Puppeteer screenshots of rendered HTML
- Sends to `GeminiLayoutService.critiqueLayout()` for fidelity scoring
- Applies corrections via `LayoutAutoFixEngine.applyCritique()`
- Iterates up to `maxIterations` (default 2)
- Stops on: target fidelity reached, max iterations, or diminishing returns

### LayoutAutoFixEngine

**Location:** `src/services/LayoutAutoFixEngine.ts` (~465 lines)

Applies corrections from AI critique to layout components.

```typescript
class LayoutAutoFixEngine {
  applyCritique(
    components: DetectedComponentEnhanced[],
    critique: LayoutCritiqueEnhanced
  ): LayoutAutoFixResult;
}
```

**Key patterns:**

- **Blocklist security strategy**: blocks only dangerous properties (`content`, `behavior`, `-moz-binding`), allows everything else
- Applies style, bounds, and content corrections from `correctionJSON`
- Mirrors content properties to top-level for backwards compatibility
- Validates bounds changes don't break layout (0-1000 range)
- Returns audit trail of all applied/failed/skipped fixes

### Layout Validation

**Location:** `src/utils/layoutValidation.ts` (~1111 lines)

Zod schema validation for AI-generated layout data.

**Key patterns:**

- Zod schemas with `.passthrough()` to accept unknown properties from AI
- Open-ended component types and roles (not restricted to enums)
- Recovery path for partial/malformed data
- Transforms and sanitizes AI output before pipeline consumption

---

## Dual AI Planning Services

### BackgroundPlanningOrchestrator

**Location:** `src/services/BackgroundPlanningOrchestrator.ts` (~500 lines)

5-stage pipeline orchestrator that runs Claude and Gemini in parallel to generate consensus architecture.

**Pipeline stages:**

1. Layout Analysis (`LayoutBackendAnalyzer`) - Analyzes layout manifest for backend requirements
2. Intelligence Gathering (`LiveIntelligenceGatherer`) - Web search + AI analysis, skips if `cachedIntelligence` provided
3. Parallel Architecture Generation - Claude + Gemini generate proposals concurrently
4. Consensus Negotiation (`ConsensusNegotiator`) - Finds agreement/disagreements between proposals
5. Dual Validation (`DualValidationOrchestrator`) - Cross-validates final architecture

**Key patterns:**

- Accepts `cachedIntelligence` to skip redundant Stage 2 work (pre-cached by `useBackgroundIntelligence`)
- Reports progress via SSE events through `/api/planning/stream`
- Sessions stored in `planningSessionStore` (in-memory Map with TTL)
- Result saved as `dualArchitectureResult` in Zustand store

### ConsensusNegotiator

**Location:** `src/services/ConsensusNegotiator.ts` (~300 lines)

Compares Claude and Gemini architecture proposals to find consensus.

**Key patterns:**

- Identifies areas of agreement and disagreement
- Produces a merged architecture when consensus is reached
- Escalation path via `ConsensusEscalationDialog` for user to resolve disagreements

### DualValidationOrchestrator

**Location:** `src/services/DualValidationOrchestrator.ts` (~250 lines)

Cross-validates the final consensus architecture.

### LiveIntelligenceGatherer

**Location:** `src/services/LiveIntelligenceGatherer.ts` (~400 lines)

Gathers real-time intelligence via web search and AI analysis for best practices, library recommendations.

**Key patterns:**

- Called via `/api/planning/intelligence` and `/api/web-search`
- Results cached in Zustand as `cachedIntelligence`
- Pre-cached during Design step by `useBackgroundIntelligence` hook

### LayoutBackendAnalyzer

**Location:** `src/services/LayoutBackendAnalyzer.ts` (~200 lines)

Analyzes layout manifest to determine backend requirements (API routes, database schema, auth needs).

---

## Context & Parsing Services

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
