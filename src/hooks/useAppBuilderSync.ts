'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  LayoutExportService,
  type LayoutExport,
  type DesignTokens,
} from '@/services/LayoutExportService';
import type { LayoutDesign } from '@/types/layoutDesign';
import type { AppConcept } from '@/types/appConcept';

interface UseAppBuilderSyncOptions {
  /** Auto-sync layout changes to app concept */
  autoSync?: boolean;
  /** Debounce delay for auto-sync in ms */
  debounceMs?: number;
  /** Callback when sync completes */
  onSyncComplete?: (exportedLayout: LayoutExport) => void;
  /** Callback on sync error */
  onSyncError?: (error: Error) => void;
}

interface UseAppBuilderSyncReturn {
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Last synced timestamp */
  lastSyncedAt: Date | null;
  /** Whether there are pending changes to sync */
  hasPendingChanges: boolean;
  /** Exported layout data */
  exportedLayout: LayoutExport | null;
  /** Design tokens */
  designTokens: DesignTokens | null;
  /** Sync current layout to app builder */
  syncToAppBuilder: () => Promise<void>;
  /** Import layout from app concept */
  importFromAppConcept: (appConcept: AppConcept) => void;
  /** Export layout for use in app */
  exportLayout: (format: 'react' | 'css' | 'tailwind' | 'figma') => string;
  /** Clear synced data */
  clearSync: () => void;
}

/**
 * useAppBuilderSync Hook
 *
 * Manages bidirectional synchronization between the Layout Builder
 * and the main App Builder. Exports design tokens, components,
 * and configuration for consistent app generation.
 */
export function useAppBuilderSync(
  layoutDesign: Partial<LayoutDesign> | null,
  options: UseAppBuilderSyncOptions = {}
): UseAppBuilderSyncReturn {
  const { autoSync = false, debounceMs = 1000, onSyncComplete, onSyncError } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [exportedLayout, setExportedLayout] = useState<LayoutExport | null>(null);
  const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastDesignRef = useRef<string>('');

  // Get app store methods
  const updateAppConceptField = useAppStore((state) => state.updateAppConceptField);

  /**
   * Sync layout design to app builder
   */
  const syncToAppBuilder = useCallback(async () => {
    if (!layoutDesign) return;

    setIsSyncing(true);

    try {
      // Export layout using the service
      const exported = LayoutExportService.export(layoutDesign);

      // Update state
      setExportedLayout(exported);
      setDesignTokens(exported.tokens);
      setLastSyncedAt(new Date());
      setHasPendingChanges(false);

      // Update app concept with layout design
      updateAppConceptField('layoutDesign', layoutDesign as LayoutDesign);

      // Store the current design hash
      lastDesignRef.current = JSON.stringify(layoutDesign);

      // Callback
      onSyncComplete?.(exported);
    } catch (error) {
      console.error('Sync error:', error);
      onSyncError?.(error as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [layoutDesign, updateAppConceptField, onSyncComplete, onSyncError]);

  /**
   * Import layout from an existing app concept
   */
  const importFromAppConcept = useCallback((appConcept: AppConcept) => {
    if (!appConcept.layoutDesign) {
      console.warn('App concept has no layout design to import');
      return;
    }

    // The layout design from app concept can be used directly
    // This is handled by the parent component setting the layoutDesign
    const tokens = LayoutExportService.extractDesignTokens(appConcept.layoutDesign);
    setDesignTokens(tokens);
    setHasPendingChanges(false);
  }, []);

  /**
   * Export layout in different formats
   */
  const exportLayout = useCallback(
    (format: 'react' | 'css' | 'tailwind' | 'figma'): string => {
      if (!layoutDesign) return '';

      switch (format) {
        case 'react': {
          const exported = LayoutExportService.export(layoutDesign);
          return exported.components.map((c) => c.code).join('\n\n// ---\n\n');
        }
        case 'css': {
          const tokens = LayoutExportService.extractDesignTokens(layoutDesign);
          return LayoutExportService.generateCSSVariables(tokens);
        }
        case 'tailwind': {
          const tokens = LayoutExportService.extractDesignTokens(layoutDesign);
          return LayoutExportService.generateTailwindConfig(tokens);
        }
        case 'figma': {
          return LayoutExportService.exportForFigma(layoutDesign);
        }
        default:
          return '';
      }
    },
    [layoutDesign]
  );

  /**
   * Clear synced data
   */
  const clearSync = useCallback(() => {
    setExportedLayout(null);
    setDesignTokens(null);
    setLastSyncedAt(null);
    setHasPendingChanges(false);
    lastDesignRef.current = '';
  }, []);

  /**
   * Track pending changes
   */
  useEffect(() => {
    if (!layoutDesign) {
      setHasPendingChanges(false);
      return;
    }

    const currentDesign = JSON.stringify(layoutDesign);
    if (currentDesign !== lastDesignRef.current && lastDesignRef.current !== '') {
      setHasPendingChanges(true);
    }
  }, [layoutDesign]);

  /**
   * Auto-sync with debounce
   */
  useEffect(() => {
    if (!autoSync || !layoutDesign || !hasPendingChanges) return;

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounced sync
    debounceRef.current = setTimeout(() => {
      syncToAppBuilder();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [autoSync, layoutDesign, hasPendingChanges, debounceMs, syncToAppBuilder]);

  /**
   * Extract initial tokens when layout design is provided
   */
  useEffect(() => {
    if (layoutDesign && !designTokens) {
      const tokens = LayoutExportService.extractDesignTokens(layoutDesign);
      setDesignTokens(tokens);
    }
  }, [layoutDesign, designTokens]);

  return {
    isSyncing,
    lastSyncedAt,
    hasPendingChanges,
    exportedLayout,
    designTokens,
    syncToAppBuilder,
    importFromAppConcept,
    exportLayout,
    clearSync,
  };
}

export default useAppBuilderSync;
