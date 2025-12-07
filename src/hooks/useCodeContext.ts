/**
 * useCodeContext - React hook for code context management
 * Provides access to CodeContextService functionality in React components
 *
 * IMPORTANT: This hook uses the CodeParser service which depends on the TypeScript
 * compiler API. This means it should only be used in:
 * - Server Components (Next.js App Router)
 * - Server-side rendering contexts
 * - Or via API routes that call the CodeContextService
 *
 * For client-side usage, consider creating API routes that expose the
 * CodeContextService functionality and calling those from client components.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CodeContextState,
  FileAnalysis,
  DependencyGraph,
  ContextSelectionRequest,
  CodeContextSnapshot,
  FileType,
} from '@/types/codeContext';
import {
  CodeContextService,
  getCodeContextService,
  clearCodeContextService,
} from '@/services/CodeContextService';

// ============================================================================
// HOOK TYPES
// ============================================================================

interface UseCodeContextOptions {
  /** Auto-initialize when files are provided */
  autoInitialize?: boolean;
  /** App type for context service */
  appType?: 'FRONTEND_ONLY' | 'FULL_STACK';
}

interface UseCodeContextReturn {
  /** Current context state */
  contextState: CodeContextState | null;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Whether the service is initialized */
  isInitialized: boolean;

  // Actions
  /** Initialize or reset the context service */
  initialize: (appName?: string) => void;
  /** Update context with files */
  updateFiles: (
    files: Array<{ path: string; content: string }>,
    options?: { incremental?: boolean; phaseNumber?: number }
  ) => Promise<void>;
  /** Remove files from context */
  removeFiles: (paths: string[]) => void;
  /** Clear all context */
  clearContext: () => void;

  // Context Selection
  /** Get context for a specific request */
  getContextForRequest: (request: ContextSelectionRequest) => Promise<CodeContextSnapshot | null>;
  /** Get context for a build phase */
  getPhaseContext: (
    phaseNumber: number,
    features: string[],
    maxTokens?: number
  ) => Promise<CodeContextSnapshot | null>;
  /** Get context for modifying a file */
  getModificationContext: (
    targetFile: string,
    changeDescription: string,
    maxTokens?: number
  ) => Promise<CodeContextSnapshot | null>;
  /** Get minimal context (types only) */
  getMinimalContext: (maxTokens?: number) => CodeContextSnapshot | null;

  // Graph Queries
  /** Get the dependency graph */
  getDependencyGraph: () => DependencyGraph | null;
  /** Get analysis for a specific file */
  getFileAnalysis: (path: string) => FileAnalysis | undefined;
  /** Get dependencies of a file */
  getDependencies: (filePath: string) => string[];
  /** Get files that depend on a file */
  getDependents: (filePath: string) => string[];
  /** Get files by type */
  getFilesByType: (types: FileType[]) => string[];
  /** Find file that exports a symbol */
  findFileExporting: (symbol: string) => string | null;

  // Stats
  /** Get cache statistics */
  getCacheStats: () => { hits: number; misses: number; hitRate: number } | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCodeContext(
  appId: string,
  options: UseCodeContextOptions = {}
): UseCodeContextReturn {
  const { autoInitialize = true, appType = 'FRONTEND_ONLY' } = options;

  const [contextState, setContextState] = useState<CodeContextState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const serviceRef = useRef<CodeContextService | null>(null);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  const initialize = useCallback(
    (appName?: string) => {
      try {
        // Clear existing service for this app
        clearCodeContextService(appId);

        // Create new service
        serviceRef.current = getCodeContextService(appId, appName ?? appId, appType);
        setContextState(serviceRef.current.getState());
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize context service');
        setIsInitialized(false);
      }
    },
    [appId, appType]
  );

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // ==========================================================================
  // FILE MANAGEMENT
  // ==========================================================================

  const updateFiles = useCallback(
    async (
      files: Array<{ path: string; content: string }>,
      updateOptions?: { incremental?: boolean; phaseNumber?: number }
    ) => {
      if (!serviceRef.current) {
        setError('Context service not initialized');
        return;
      }

      setIsAnalyzing(true);
      setError(null);

      try {
        await serviceRef.current.updateContext(files, updateOptions);
        setContextState(serviceRef.current.getState());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update files');
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const removeFiles = useCallback((paths: string[]) => {
    if (!serviceRef.current) return;

    serviceRef.current.removeFiles(paths);
    setContextState(serviceRef.current.getState());
  }, []);

  const clearContext = useCallback(() => {
    clearCodeContextService(appId);
    serviceRef.current = null;
    setContextState(null);
    setIsInitialized(false);
  }, [appId]);

  // ==========================================================================
  // CONTEXT SELECTION
  // ==========================================================================

  const getContextForRequest = useCallback(
    async (request: ContextSelectionRequest): Promise<CodeContextSnapshot | null> => {
      if (!serviceRef.current) {
        setError('Context service not initialized');
        return null;
      }

      try {
        return await serviceRef.current.getContextForRequest(request);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get context');
        return null;
      }
    },
    []
  );

  const getPhaseContext = useCallback(
    async (
      phaseNumber: number,
      features: string[],
      maxTokens: number = 16000
    ): Promise<CodeContextSnapshot | null> => {
      if (!serviceRef.current) {
        setError('Context service not initialized');
        return null;
      }

      try {
        return await serviceRef.current.getPhaseContext(phaseNumber, features, maxTokens);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get phase context');
        return null;
      }
    },
    []
  );

  const getModificationContext = useCallback(
    async (
      targetFile: string,
      changeDescription: string,
      maxTokens: number = 16000
    ): Promise<CodeContextSnapshot | null> => {
      if (!serviceRef.current) {
        setError('Context service not initialized');
        return null;
      }

      try {
        return await serviceRef.current.getModificationContext(
          targetFile,
          changeDescription,
          maxTokens
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get modification context');
        return null;
      }
    },
    []
  );

  const getMinimalContext = useCallback((maxTokens: number = 8000): CodeContextSnapshot | null => {
    if (!serviceRef.current) return null;
    return serviceRef.current.getMinimalContext(maxTokens);
  }, []);

  // ==========================================================================
  // GRAPH QUERIES
  // ==========================================================================

  const getDependencyGraph = useCallback((): DependencyGraph | null => {
    return serviceRef.current?.getDependencyGraph() ?? null;
  }, []);

  const getFileAnalysis = useCallback((path: string): FileAnalysis | undefined => {
    return serviceRef.current?.getFileAnalysis(path);
  }, []);

  const getDependencies = useCallback((filePath: string): string[] => {
    return serviceRef.current?.getDependencies(filePath) ?? [];
  }, []);

  const getDependents = useCallback((filePath: string): string[] => {
    return serviceRef.current?.getDependents(filePath) ?? [];
  }, []);

  const getFilesByType = useCallback((types: FileType[]): string[] => {
    return serviceRef.current?.getFilesByType(types) ?? [];
  }, []);

  const findFileExporting = useCallback((symbol: string): string | null => {
    return serviceRef.current?.findFileExporting(symbol) ?? null;
  }, []);

  // ==========================================================================
  // STATS
  // ==========================================================================

  const getCacheStats = useCallback(() => {
    return serviceRef.current?.getCacheStats() ?? null;
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    contextState,
    isAnalyzing,
    error,
    isInitialized,

    initialize,
    updateFiles,
    removeFiles,
    clearContext,

    getContextForRequest,
    getPhaseContext,
    getModificationContext,
    getMinimalContext,

    getDependencyGraph,
    getFileAnalysis,
    getDependencies,
    getDependents,
    getFilesByType,
    findFileExporting,

    getCacheStats,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for tracking file dependencies
 */
export function useFileDependencies(
  appId: string,
  filePath: string | null
): {
  dependencies: string[];
  dependents: string[];
  transitiveDeps: string[];
} {
  const { getDependencies, getDependents, isInitialized } = useCodeContext(appId);

  const [dependencies, setDependencies] = useState<string[]>([]);
  const [dependents, setDependents] = useState<string[]>([]);
  const [transitiveDeps, setTransitiveDeps] = useState<string[]>([]);

  useEffect(() => {
    if (!isInitialized || !filePath) {
      setDependencies([]);
      setDependents([]);
      setTransitiveDeps([]);
      return;
    }

    setDependencies(getDependencies(filePath));
    setDependents(getDependents(filePath));

    // Get transitive dependencies (up to depth 5)
    const seen = new Set<string>();
    const queue = [...getDependencies(filePath)];
    while (queue.length > 0 && seen.size < 50) {
      const dep = queue.shift()!;
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(...getDependencies(dep));
      }
    }
    setTransitiveDeps(Array.from(seen));
  }, [filePath, isInitialized, getDependencies, getDependents]);

  return { dependencies, dependents, transitiveDeps };
}

/**
 * Hook for getting file analysis
 */
export function useFileAnalysis(appId: string, filePath: string | null): FileAnalysis | null {
  const { getFileAnalysis, isInitialized } = useCodeContext(appId);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);

  useEffect(() => {
    if (!isInitialized || !filePath) {
      setAnalysis(null);
      return;
    }

    setAnalysis(getFileAnalysis(filePath) ?? null);
  }, [filePath, isInitialized, getFileAnalysis]);

  return analysis;
}
