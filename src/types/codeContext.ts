/**
 * Code Context API Types
 * Comprehensive type definitions for semantic code analysis, dependency tracking,
 * and intelligent context selection for the AI App Builder.
 */

// ============================================================================
// FILE TYPE CLASSIFICATION
// ============================================================================

/**
 * Classification of file types for importance scoring and context selection
 */
export type FileType =
  | 'component' // React component
  | 'page' // Next.js page or app route page
  | 'api-route' // Next.js API route handler
  | 'hook' // Custom React hook
  | 'context-provider' // React context provider
  | 'type-definition' // TypeScript types/interfaces file
  | 'utility' // Utility functions
  | 'style' // CSS/SCSS/styled-components
  | 'config' // Configuration files
  | 'test' // Test files
  | 'layout' // Layout components
  | 'other'; // Uncategorized

// ============================================================================
// EXPORT/IMPORT ANALYSIS
// ============================================================================

/**
 * Information about a single export from a file
 */
export interface ExportInfo {
  name: string;
  kind: 'function' | 'class' | 'const' | 'let' | 'type' | 'interface' | 'enum' | 'default';
  isDefault: boolean;
  isAsync: boolean;
  signature?: string; // For functions: (params) => returnType
  typeSignature?: string; // For types/interfaces: full definition
  line?: number; // Line number in source
}

/**
 * Information about a single import in a file
 */
export interface ImportInfo {
  source: string; // The import path as written
  resolvedPath?: string; // Resolved to actual file path (if local)
  isExternal: boolean; // npm package vs local file
  isTypeOnly: boolean; // import type { ... }
  imports: ImportedSymbol[];
}

/**
 * A single imported symbol
 */
export interface ImportedSymbol {
  name: string;
  alias?: string; // import { name as alias }
  isDefault: boolean; // import Default from ...
  isNamespace: boolean; // import * as Namespace from ...
}

// ============================================================================
// CODE ELEMENT ANALYSIS
// ============================================================================

/**
 * Information about a React component
 */
export interface ComponentInfo {
  name: string;
  isDefault: boolean;
  isFunctionComponent: boolean;
  isClassComponent: boolean;
  props: PropInfo[];
  hooks: string[]; // Hook names used (useState, useEffect, etc.)
  childComponents: string[]; // Components rendered in JSX
  hasForwardRef: boolean;
  hasMemo: boolean;
  line?: number;
}

/**
 * Information about a component prop
 */
export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Information about a custom hook
 */
export interface HookInfo {
  name: string;
  isCustom: boolean; // Custom hook (use*) vs built-in
  parameters: string[]; // Parameter types
  returnType?: string;
  dependencies: string[]; // Dependency array items for effects
  line?: number;
}

/**
 * Information about a type or interface definition
 */
export interface TypeInfo {
  name: string;
  kind: 'interface' | 'type' | 'enum';
  exported: boolean;
  definition: string; // Full type definition
  tokenCount: number; // Token count for budget calculation
  extends?: string[]; // Extended types/interfaces
  line?: number;
}

/**
 * Information about an API endpoint (Next.js route handler)
 */
export interface APIEndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string; // API route path
  hasAuth: boolean; // Requires authentication
  requestType?: string; // Request body type
  responseType?: string; // Response type
  description?: string; // JSDoc description
  line?: number;
}

// ============================================================================
// FILE ANALYSIS
// ============================================================================

/**
 * Complete semantic analysis of a single file
 */
export interface FileAnalysis {
  path: string;
  hash: string; // Content hash for change detection
  type: FileType;

  // Semantic information
  exports: ExportInfo[];
  imports: ImportInfo[];
  dependencies: string[]; // Resolved paths of local imports
  dependents: string[]; // Paths of files that import this

  // AST-derived metadata
  components: ComponentInfo[];
  hooks: HookInfo[];
  types: TypeInfo[];
  apiEndpoints: APIEndpointInfo[];

  // Context metrics
  tokenCount: number;
  importanceScore: number; // 0-1 priority score
  lastModified: number; // Timestamp

  // Quick reference
  summary: string; // Human-readable summary
}

/**
 * File content with metadata
 */
export interface FileContent {
  path: string;
  content: string;
  hash: string;
  tokenCount: number;
  lastModified: number;
}

// ============================================================================
// DEPENDENCY GRAPH
// ============================================================================

/**
 * Complete dependency graph for the codebase
 */
export interface DependencyGraph {
  files: Map<string, FileNode>;
  edges: DependencyEdge[];
  roots: string[]; // Entry points (pages, app.tsx, etc.)
  leaves: string[]; // Files with no dependents
  cycles: string[][]; // Detected circular dependencies
  stats: GraphStats;
}

/**
 * A node in the dependency graph
 */
export interface FileNode {
  path: string;
  analysis: FileAnalysis;
  depth: number; // Distance from nearest root
  inDegree: number; // Number of files importing this
  outDegree: number; // Number of files this imports
}

/**
 * An edge in the dependency graph
 */
export interface DependencyEdge {
  from: string; // Importing file path
  to: string; // Imported file path
  importType: 'direct' | 'type-only' | 'dynamic';
  symbols: string[]; // What's being imported
}

/**
 * Statistics about the dependency graph
 */
export interface GraphStats {
  totalFiles: number;
  totalEdges: number;
  maxDepth: number;
  avgInDegree: number;
  avgOutDegree: number;
  circularDependencies: number;
}

// ============================================================================
// CODE CONTEXT STATE
// ============================================================================

/**
 * Complete code context state for an app
 */
export interface CodeContextState {
  appId: string;
  appName: string;
  appType: 'FRONTEND_ONLY' | 'FULL_STACK';

  // File system
  files: Map<string, FileContent>;

  // Semantic analysis
  analysis: Map<string, FileAnalysis>;
  dependencyGraph: DependencyGraph;

  // Cache metadata
  version: number;
  lastFullAnalysis: number;
  dirtyFiles: Set<string>; // Files needing re-analysis

  // Phase tracking
  phasesSeen: number[];
  filesByPhase: Map<number, string[]>;
}

// ============================================================================
// CONTEXT SELECTION
// ============================================================================

/**
 * Intent for context selection - what are we trying to do?
 */
export type ContextIntent =
  | { type: 'new-phase'; features: string[]; dependencies: string[] }
  | { type: 'modification'; targetFile: string; changeDescription: string }
  | { type: 'cross-reference'; fromFile: string; symbol: string }
  | { type: 'type-check'; files: string[] }
  | { type: 'full-context' };

/**
 * Request for context selection
 */
export interface ContextSelectionRequest {
  intent: ContextIntent;
  maxTokens: number;
  reservedTokens?: number; // For system prompts
  focusFiles?: string[]; // Files definitely relevant
  excludeFiles?: string[]; // Files to skip
  modificationTarget?: string;
  phaseNumber?: number;
  previousPhaseFiles?: string[];
}

/**
 * Result of context selection
 */
export interface ContextSelectionResult {
  files: SelectedFile[];
  totalTokens: number;
  strategy: string;
  selectionReason: Map<string, string>;
  excluded: ExcludedFile[];
  warnings: string[];
}

/**
 * A file selected for context
 */
export interface SelectedFile {
  path: string;
  content: string;
  representation: FileRepresentation;
  tokenCount: number;
  priority: number; // 0-1 how important
  reason: string; // Why it was included
}

/**
 * A file excluded from context
 */
export interface ExcludedFile {
  path: string;
  reason: string;
}

/**
 * How a file is represented in context
 */
export type FileRepresentation =
  | 'full' // Complete file content
  | 'summary' // File description + export list
  | 'signature' // Function/component signatures only
  | 'types-only'; // Just type definitions

// ============================================================================
// CONTEXT SNAPSHOT (API PAYLOAD)
// ============================================================================

/**
 * Compact representation for API transmission
 */
export interface CodeContextSnapshot {
  appId: string;
  appName: string;
  version: number;

  // Selected context
  context: SelectedFile[];

  // Summary of what's not included
  omittedSummary: OmittedSummary;

  // Dependency hints for AI
  dependencyHints: DependencyHint[];
}

/**
 * Summary of files not included in context
 */
export interface OmittedSummary {
  fileCount: number;
  totalTokens: number;
  categories: Record<FileType, number>;
}

/**
 * Dependency hint for AI to understand relationships
 */
export interface DependencyHint {
  file: string;
  imports: Array<{ from: string; symbols: string[] }>;
  usedBy: string[];
}

// ============================================================================
// PARSER CONFIGURATION
// ============================================================================

/**
 * Configuration for the code parser
 */
export interface CodeParserConfig {
  includeTestFiles: boolean;
  includeNodeModules: boolean;
  maxFileSize: number; // Skip files larger than this (bytes)
  supportedExtensions: string[];
}

/**
 * Default parser configuration
 */
export const DEFAULT_CODE_PARSER_CONFIG: CodeParserConfig = {
  includeTestFiles: false,
  includeNodeModules: false,
  maxFileSize: 500000, // 500KB
  supportedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
};

// ============================================================================
// CONTEXT SELECTOR CONFIGURATION
// ============================================================================

/**
 * Configuration for context selection
 */
export interface ContextSelectorConfig {
  defaultMaxTokens: number;
  typePriorityBoost: number; // Extra priority for type files
  apiRoutePriorityBoost: number; // Extra priority for API routes
  hookPriorityBoost: number; // Extra priority for hooks
  contextProviderBoost: number; // Extra priority for context providers
  modificationDepthLimit: number; // How deep to follow dependencies
}

/**
 * Default context selector configuration
 */
export const DEFAULT_CONTEXT_SELECTOR_CONFIG: ContextSelectorConfig = {
  defaultMaxTokens: 16000,
  typePriorityBoost: 0.35,
  apiRoutePriorityBoost: 0.25,
  hookPriorityBoost: 0.15,
  contextProviderBoost: 0.25,
  modificationDepthLimit: 3,
};

// ============================================================================
// IMPORTANCE SCORING
// ============================================================================

/**
 * Base importance scores by file type
 */
export const FILE_TYPE_IMPORTANCE: Record<FileType, number> = {
  'type-definition': 0.85,
  'context-provider': 0.8,
  'api-route': 0.75,
  hook: 0.7,
  layout: 0.65,
  page: 0.6,
  component: 0.55,
  utility: 0.5,
  config: 0.45,
  style: 0.3,
  test: 0.2,
  other: 0.4,
};
