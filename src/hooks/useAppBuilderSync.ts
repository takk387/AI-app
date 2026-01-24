'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  LayoutExportService,
  type DesignTokens,
} from '@/services/LayoutExportService';
import type { LayoutManifest } from '@/types/schema';
import type { AppConcept } from '@/types/appConcept';

interface UseAppBuilderSyncOptions {
  /** Auto-sync layout changes to app concept */
  autoSync?: boolean;
  /** Debounce delay for auto-sync in ms */
  debounceMs?: number;
  /** Callback when sync completes */
  onSyncComplete?: (tokens: DesignTokens) => void;
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
  /** Design tokens extracted from layout */
  designTokens: DesignTokens | null;
  /** Sync current layout to app builder */
  syncToAppBuilder: () => Promise<void>;
  /** Import layout from app concept */
  importFromAppConcept: (appConcept: AppConcept) => void;
  /** Export layout for use in app */
  exportLayout: (format: 'css' | 'tailwind' | 'json') => string;
  /** Clear synced data */
  clearSync: () => void;
}

/**
 * useAppBuilderSync Hook
 *
 * Manages bidirectional synchronization between the Layout Builder
 * and the main App Builder. Exports design tokens and configuration
 * for consistent app generation.
 *
 * Updated for LayoutManifest (Gemini 3 system).
 */
export function useAppBuilderSync(
  layoutManifest: LayoutManifest | null,
  options: UseAppBuilderSyncOptions = {}
): UseAppBuilderSyncReturn {
  const { autoSync = false, debounceMs = 1000, onSyncComplete, onSyncError } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [designTokens, setDesignTokens] = useState<DesignTokens | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastManifestRef = useRef<string>('');

  // Get app store methods
  const updateAppConceptField = useAppStore((state) => state.updateAppConceptField);

  /**
   * Sync layout manifest to app builder
   */
  const syncToAppBuilder = useCallback(async () => {
    if (!layoutManifest) return;

    setIsSyncing(true);

    try {
      // Extract design tokens using the service
      const tokens = LayoutExportService.extractDesignTokens(layoutManifest);

      // Update state
      setDesignTokens(tokens);
      setLastSyncedAt(new Date());
      setHasPendingChanges(false);

      // Update app concept with layout manifest
      updateAppConceptField('layoutManifest', layoutManifest);

      // Store the current manifest hash
      lastManifestRef.current = JSON.stringify(layoutManifest);

      // Callback
      onSyncComplete?.(tokens);
    } catch (error) {
      console.error('Sync error:', error);
      onSyncError?.(error as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [layoutManifest, updateAppConceptField, onSyncComplete, onSyncError]);

  /**
   * Import layout from an existing app concept
   */
  const importFromAppConcept = useCallback((appConcept: AppConcept) => {
    if (!appConcept.layoutManifest) {
      console.warn('App concept has no layout manifest to import');
      return;
    }

    // Extract tokens from the manifest
    const tokens = LayoutExportService.extractDesignTokens(appConcept.layoutManifest);
    setDesignTokens(tokens);
    setHasPendingChanges(false);
  }, []);

  /**
   * Export layout in different formats
   */
  const exportLayout = useCallback(
    (format: 'css' | 'tailwind' | 'json'): string => {
      if (!layoutManifest) return '';

      const tokens = LayoutExportService.extractDesignTokens(layoutManifest);

      switch (format) {
        case 'css':
          return LayoutExportService.generateCSSVariables(tokens);
        case 'tailwind':
          return LayoutExportService.generateTailwindConfig(tokens);
        case 'json':
          return LayoutExportService.exportTokensAsJSON(layoutManifest);
        default:
          return '';
      }
    },
    [layoutManifest]
  );

  /**
   * Clear synced data
   */
  const clearSync = useCallback(() => {
    setDesignTokens(null);
    setLastSyncedAt(null);
    setHasPendingChanges(false);
    lastManifestRef.current = '';
  }, []);

  /**
   * Track pending changes
   */
  useEffect(() => {
    if (!layoutManifest) {
      setHasPendingChanges(false);
      return;
    }

    const currentManifest = JSON.stringify(layoutManifest);
    if (currentManifest !== lastManifestRef.current && lastManifestRef.current !== '') {
      setHasPendingChanges(true);
    }
  }, [layoutManifest]);

  /**
   * Auto-sync with debounce
   */
  useEffect(() => {
    if (!autoSync || !layoutManifest || !hasPendingChanges) return;

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
  }, [autoSync, layoutManifest, hasPendingChanges, debounceMs, syncToAppBuilder]);

  /**
   * Extract initial tokens when layout manifest is provided
   */
  useEffect(() => {
    if (layoutManifest && !designTokens) {
      const tokens = LayoutExportService.extractDesignTokens(layoutManifest);
      setDesignTokens(tokens);
    }
  }, [layoutManifest, designTokens]);

  return {
    isSyncing,
    lastSyncedAt,
    hasPendingChanges,
    designTokens,
    syncToAppBuilder,
    importFromAppConcept,
    exportLayout,
    clearSync,
  };
}

export default useAppBuilderSync;
