/**
 * useSourceRegistry Hook
 *
 * State management for the multi-source merge pipeline (Gap 1).
 * Tracks uploaded media sources, their analysis results, and merge operations.
 *
 * This hook is composed alongside useLayoutBuilder in LayoutBuilderView.
 * It does NOT own the components array — it coordinates with useLayoutBuilder
 * via callbacks to tag and merge components.
 *
 * Pipeline: Upload → tag with sourceId → analyze → merge → setComponents
 * Completely independent from the future preset library pipeline.
 */

import { useState, useCallback } from 'react';
import type { MediaSource, MergeStrategy, MergedResult } from '@/types/mediaSource';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { mergeComponentSets } from '@/services/SourceMergeEngine';

// ============================================================================
// TYPES
// ============================================================================

interface UseSourceRegistryReturn {
  /** All registered media sources */
  sources: MediaSource[];

  /** Add a new source (before analysis) */
  addSource: (source: Omit<MediaSource, 'addedAt' | 'componentIds' | 'status'>) => MediaSource;

  /** Update a source's status and analysis results */
  updateSource: (id: string, updates: Partial<MediaSource>) => void;

  /** Remove a source and its associated components */
  removeSource: (id: string) => string[]; // returns removed component IDs

  /** Get a source by ID */
  getSource: (id: string) => MediaSource | undefined;

  /** Merge all (or selected) sources using a strategy */
  mergeSources: (
    strategy: MergeStrategy,
    allComponents: DetectedComponentEnhanced[]
  ) => MergedResult;

  /** Generate a unique source ID */
  generateSourceId: () => string;

  /** Check if there are 2+ completed sources (merge-ready) */
  canMerge: boolean;

  /** Clear all sources */
  clearSources: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useSourceRegistry(): UseSourceRegistryReturn {
  const [sources, setSources] = useState<MediaSource[]>([]);

  const generateSourceId = useCallback(() => {
    return `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }, []);

  const addSource = useCallback(
    (input: Omit<MediaSource, 'addedAt' | 'componentIds' | 'status'>): MediaSource => {
      const source: MediaSource = {
        ...input,
        addedAt: new Date().toISOString(),
        componentIds: [],
        status: 'pending',
      };
      setSources((prev) => [...prev, source]);
      return source;
    },
    []
  );

  const updateSource = useCallback((id: string, updates: Partial<MediaSource>) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const removeSource = useCallback((id: string): string[] => {
    let removedComponentIds: string[] = [];
    setSources((prev) => {
      const source = prev.find((s) => s.id === id);
      removedComponentIds = source?.componentIds ?? [];
      return prev.filter((s) => s.id !== id);
    });
    return removedComponentIds;
  }, []);

  const getSource = useCallback(
    (id: string): MediaSource | undefined => {
      return sources.find((s) => s.id === id);
    },
    [sources]
  );

  const mergeSources = useCallback(
    (strategy: MergeStrategy, allComponents: DetectedComponentEnhanced[]): MergedResult => {
      return mergeComponentSets(sources, allComponents, strategy);
    },
    [sources]
  );

  const clearSources = useCallback(() => {
    setSources([]);
  }, []);

  const canMerge = sources.filter((s) => s.status === 'complete').length >= 2;

  return {
    sources,
    addSource,
    updateSource,
    removeSource,
    getSource,
    mergeSources,
    generateSourceId,
    canMerge,
    clearSources,
  };
}
