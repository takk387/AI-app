/**
 * Utils Index
 *
 * Re-exports all utility functions and classes from the utils directory.
 * Import utilities from this file for cleaner imports.
 *
 * @example
 * ```tsx
 * import {
 *   compressConversation,
 *   createSemanticMemory,
 *   estimateTokens,
 * } from '@/utils';
 * ```
 */

// ============================================================================
// Context Compression
// ============================================================================

export {
  estimateTokens,
  estimateMessagesTokens,
  needsCompression,
  summarizeConversation,
  compressConversation,
  buildCompressedContext,
  getCompressionStats,
} from './contextCompression';

export type {
  ConversationSummary,
  CompressionOptions,
  CompressedContext,
} from './contextCompression';

// ============================================================================
// Semantic Memory
// ============================================================================

export {
  extractKeywords,
  calculateKeywordSimilarity,
  extractMemoriesFromConversation,
  SemanticMemoryManager,
  createSemanticMemory,
} from './semanticMemory';

export type { MemoryType, SemanticMemory, MemoryStats, StoreMemoryOptions } from './semanticMemory';

// ============================================================================
// Existing Utilities (for completeness)
// ============================================================================

export { supabase, supabaseConfig } from './supabaseClient';
export { applyDiff } from './applyDiff';
export { validateGeneratedCode, autoFixCode } from './codeValidator';
export { exportAppAsZip } from './exportApp';
export { shouldRetryError, generateRetryStrategy, isPatternMatchingError } from './retryLogic';
export { sanitizeHtml } from './sanitizeHtml';
export { saveSettings, loadSettings, clearSettings } from './settingsStorage';
export {
  savePanelLayout,
  loadPanelLayout,
  clearPanelLayout,
  clearAllPanelLayouts,
  normalizeSizes,
  constrainSizes,
  calculateInitialSizes,
  mergePersistedLayout,
} from './panelPersistence';

export type { PanelLayout, PersistenceOptions } from './panelPersistence';
