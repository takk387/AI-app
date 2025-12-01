/**
 * useSmartContext Hook
 * 
 * Integration hook combining context compression and semantic memory
 * for optimized AI prompts with cross-session memory.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { ChatMessage } from '@/types/aiBuilderTypes';
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
  estimateTokens,
  type CompressionOptions,
  type CompressedContext,
} from '@/utils/contextCompression';
import {
  SemanticMemoryManager,
  createSemanticMemory,
  type MemoryStats,
  type StoreMemoryOptions,
} from '@/utils/semanticMemory';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for building smart context
 */
export interface SmartContextOptions {
  /** Maximum total tokens for context (default: 4000) */
  maxTokens?: number;
  /** Number of recent messages to preserve (default: 4) */
  preserveLastN?: number;
  /** Number of memories to include (default: 5) */
  maxMemories?: number;
  /** Whether to include semantic memories (default: true) */
  includeMemories?: boolean;
}

/**
 * Result from building smart context
 */
export interface SmartContextResult {
  /** Combined context string for API prompt */
  context: string;
  /** Compressed conversation data */
  compressed: CompressedContext;
  /** Semantic memories included */
  memoriesContext: string;
  /** Total estimated tokens */
  totalTokens: number;
  /** Whether compression was applied */
  wasCompressed: boolean;
  /** Number of memories included */
  memoriesCount: number;
}

/**
 * Return type for useSmartContext hook
 */
export interface UseSmartContextReturn {
  /** Build combined context from messages and memories */
  buildSmartContext: (messages: ChatMessage[], query: string, options?: SmartContextOptions) => Promise<SmartContextResult>;
  /** Store memories from a conversation */
  storeConversationMemories: (messages: ChatMessage[]) => Promise<void>;
  /** Search for relevant memories */
  searchMemories: (query: string, limit?: number) => Promise<string>;
  /** Clear all memories for current user */
  clearMemories: () => Promise<void>;
  /** Clean up old/unused memories */
  cleanupMemories: (daysOld?: number) => Promise<void>;
  /** Get memory statistics */
  getMemoryStats: () => Promise<MemoryStats>;
  /** Store a single memory manually */
  storeMemory: (options: StoreMemoryOptions) => Promise<void>;
  /** Whether semantic memory is enabled (user authenticated) */
  isMemoryEnabled: boolean;
  /** Whether the hook is initialized */
  isInitialized: boolean;
  /** Whether initialization is in progress */
  isInitializing: boolean;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for intelligent context management
 * Combines conversation compression with semantic memory for optimal prompts
 * 
 * @returns Smart context management methods and state
 * 
 * @example
 * ```tsx
 * const {
 *   buildSmartContext,
 *   storeConversationMemories,
 *   isMemoryEnabled,
 * } = useSmartContext();
 * 
 * // Build context for API call
 * const { context, totalTokens } = await buildSmartContext(messages, userQuery);
 * 
 * // Store memories after conversation
 * await storeConversationMemories(messages);
 * ```
 */
export function useSmartContext(): UseSmartContextReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(false);
  
  const memoryManagerRef = useRef<SemanticMemoryManager | null>(null);
  
  // Initialize memory manager on mount
  useEffect(() => {
    let mounted = true;
    
    async function initializeMemory() {
      if (isInitialized || isInitializing) return;
      
      setIsInitializing(true);
      
      try {
        const supabase = createClient();
        const manager = createSemanticMemory(supabase as unknown as Parameters<typeof createSemanticMemory>[0]);
        const ready = await manager.initialize();
        
        if (mounted) {
          memoryManagerRef.current = manager;
          setIsMemoryEnabled(ready);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[useSmartContext] Initialization error:', error);
        if (mounted) {
          setIsMemoryEnabled(false);
          setIsInitialized(true);
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }
    
    initializeMemory();
    
    return () => {
      mounted = false;
    };
  }, [isInitialized, isInitializing]);
  
  /**
   * Build smart context combining compression and memories
   */
  const buildSmartContext = useCallback(async (
    messages: ChatMessage[],
    query: string,
    options: SmartContextOptions = {}
  ): Promise<SmartContextResult> => {
    const {
      maxTokens = 4000,
      preserveLastN = 4,
      maxMemories = 5,
      includeMemories = true,
    } = options;
    
    // Get semantic memories if available
    let memoriesContext = '';
    let memoriesCount = 0;
    
    if (includeMemories && isMemoryEnabled && memoryManagerRef.current) {
      try {
        memoriesContext = await memoryManagerRef.current.getContextForPrompt(query);
        // Count memories (each memory is a line starting with [)
        memoriesCount = (memoriesContext.match(/\[/g) || []).length;
        // Limit memories by token budget
        const memoryTokens = estimateTokens(memoriesContext);
        if (memoryTokens > maxTokens * 0.25) {
          // Truncate memories to stay within budget
          const lines = memoriesContext.split('\n');
          let truncated: string[] = [lines[0]]; // Keep header
          let tokens = estimateTokens(lines[0]);
          
          for (let i = 1; i < lines.length && tokens < maxTokens * 0.2; i++) {
            tokens += estimateTokens(lines[i]);
            truncated.push(lines[i]);
          }
          
          memoriesContext = truncated.join('\n');
          memoriesCount = (memoriesContext.match(/\[/g) || []).length;
        }
      } catch (error) {
        console.error('[useSmartContext] Error fetching memories:', error);
      }
    }
    
    // Calculate remaining token budget for conversation
    const memoryTokens = estimateTokens(memoriesContext);
    const conversationBudget = maxTokens - memoryTokens;
    
    // Compress conversation if needed
    const wasCompressed = needsCompression(messages, conversationBudget);
    const compressionOptions: CompressionOptions = {
      maxTokens: conversationBudget,
      preserveLastN,
    };
    
    const compressed = compressConversation(messages, compressionOptions);
    const conversationContext = buildCompressedContext(compressed);
    
    // Combine contexts
    const parts: string[] = [];
    
    if (memoriesContext) {
      parts.push(memoriesContext);
      parts.push('');
    }
    
    parts.push(conversationContext);
    
    const context = parts.join('\n');
    const totalTokens = estimateTokens(context);
    
    return {
      context,
      compressed,
      memoriesContext,
      totalTokens,
      wasCompressed,
      memoriesCount,
    };
  }, [isMemoryEnabled]);
  
  /**
   * Store memories from a conversation
   */
  const storeConversationMemories = useCallback(async (messages: ChatMessage[]): Promise<void> => {
    if (!isMemoryEnabled || !memoryManagerRef.current) {
      return;
    }
    
    try {
      await memoryManagerRef.current.storeFromConversation(messages);
    } catch (error) {
      console.error('[useSmartContext] Error storing memories:', error);
    }
  }, [isMemoryEnabled]);
  
  /**
   * Search for relevant memories
   */
  const searchMemories = useCallback(async (query: string, limit?: number): Promise<string> => {
    if (!isMemoryEnabled || !memoryManagerRef.current) {
      return '';
    }
    
    try {
      return await memoryManagerRef.current.getContextForPrompt(query);
    } catch (error) {
      console.error('[useSmartContext] Error searching memories:', error);
      return '';
    }
  }, [isMemoryEnabled]);
  
  /**
   * Clear all memories
   */
  const clearMemories = useCallback(async (): Promise<void> => {
    if (!isMemoryEnabled || !memoryManagerRef.current) {
      return;
    }
    
    try {
      await memoryManagerRef.current.clearAll();
    } catch (error) {
      console.error('[useSmartContext] Error clearing memories:', error);
    }
  }, [isMemoryEnabled]);
  
  /**
   * Clean up old memories
   */
  const cleanupMemories = useCallback(async (daysOld?: number): Promise<void> => {
    if (!isMemoryEnabled || !memoryManagerRef.current) {
      return;
    }
    
    try {
      await memoryManagerRef.current.cleanupOldMemories(daysOld);
    } catch (error) {
      console.error('[useSmartContext] Error cleaning up memories:', error);
    }
  }, [isMemoryEnabled]);
  
  /**
   * Get memory statistics
   */
  const getMemoryStats = useCallback(async (): Promise<MemoryStats> => {
    if (!isMemoryEnabled || !memoryManagerRef.current) {
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
      return await memoryManagerRef.current.getStats();
    } catch (error) {
      console.error('[useSmartContext] Error getting stats:', error);
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
  }, [isMemoryEnabled]);
  
  /**
   * Store a single memory manually
   */
  const storeMemory = useCallback(async (options: StoreMemoryOptions): Promise<void> => {
    if (!isMemoryEnabled || !memoryManagerRef.current) {
      return;
    }
    
    try {
      await memoryManagerRef.current.store(options);
    } catch (error) {
      console.error('[useSmartContext] Error storing memory:', error);
    }
  }, [isMemoryEnabled]);
  
  return {
    buildSmartContext,
    storeConversationMemories,
    searchMemories,
    clearMemories,
    cleanupMemories,
    getMemoryStats,
    storeMemory,
    isMemoryEnabled,
    isInitialized,
    isInitializing,
  };
}

export default useSmartContext;
