/**
 * useAutoSaveOnNavigation Hook
 *
 * Automatically saves the current component when:
 * 1. User navigates between pages (route changes)
 * 2. User is about to leave the app (beforeunload)
 *
 * This ensures that wizard/design data is persisted even if the user
 * doesn't explicitly click Save.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useDatabaseSync } from './useDatabaseSync';
import { useAuth } from '@/contexts/AuthContext';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';

export interface UseAutoSaveOnNavigationOptions {
  /** Enable/disable the hook */
  enabled?: boolean;
  /** Callback when save completes */
  onSaveComplete?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: string) => void;
}

/**
 * Helper to sync store state to component before saving
 * This ensures wizard/design data is included in the saved component
 */
function syncStoreToComponent(
  component: GeneratedComponent,
  storeState: {
    appConcept: ReturnType<typeof useAppStore.getState>['appConcept'];
    currentLayoutManifest: ReturnType<typeof useAppStore.getState>['currentLayoutManifest'];
    layoutThumbnail: ReturnType<typeof useAppStore.getState>['layoutThumbnail'];
    dynamicPhasePlan: ReturnType<typeof useAppStore.getState>['dynamicPhasePlan'];
    chatMessages: ReturnType<typeof useAppStore.getState>['chatMessages'];
  }
): GeneratedComponent {
  return {
    ...component,
    appConcept: storeState.appConcept ?? component.appConcept,
    layoutManifest: storeState.currentLayoutManifest ?? component.layoutManifest,
    layoutThumbnail: storeState.layoutThumbnail ?? component.layoutThumbnail,
    dynamicPhasePlan: storeState.dynamicPhasePlan ?? component.dynamicPhasePlan,
    conversationHistory: storeState.chatMessages,
    // Update build status based on what data we have
    buildStatus: storeState.appConcept
      ? storeState.currentLayoutManifest
        ? component.code
          ? 'building'
          : 'designing'
        : 'planning'
      : component.buildStatus,
  };
}

/**
 * Hook that auto-saves the current component when navigating between pages
 */
export function useAutoSaveOnNavigation(options: UseAutoSaveOnNavigationOptions = {}) {
  const { enabled = true, onSaveComplete, onSaveError } = options;

  const pathname = usePathname();
  const { user } = useAuth();

  const { saveComponent } = useDatabaseSync({
    userId: user?.id || null,
    onError: onSaveError,
    onSuccess: onSaveComplete,
  });

  // Track the previous pathname to detect navigation
  const previousPathnameRef = useRef<string>(pathname);
  const isSavingRef = useRef<boolean>(false);

  /**
   * Perform save with synced store state
   */
  const performSave = useCallback(async () => {
    if (isSavingRef.current) return;

    const state = useAppStore.getState();
    const {
      currentComponent,
      appConcept,
      currentLayoutManifest,
      layoutThumbnail,
      dynamicPhasePlan,
      chatMessages,
    } = state;

    // Don't save if no component is loaded
    if (!currentComponent) return;

    // Don't save if user is not authenticated
    if (!user?.id) return;

    isSavingRef.current = true;

    try {
      // Sync store state to component
      const syncedComponent = syncStoreToComponent(currentComponent, {
        appConcept,
        currentLayoutManifest,
        layoutThumbnail,
        dynamicPhasePlan,
        chatMessages,
      });

      // Update store with synced component
      state.setCurrentComponent(syncedComponent);
      state.setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent.id ? syncedComponent : comp))
      );

      // Save to database
      await saveComponent(syncedComponent);

      console.log('[AutoSaveOnNavigation] Saved component on navigation');
    } catch (error) {
      console.error('[AutoSaveOnNavigation] Failed to save:', error);
      onSaveError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      isSavingRef.current = false;
    }
  }, [saveComponent, user?.id, onSaveError]);

  // Auto-save on route change
  useEffect(() => {
    if (!enabled) return;

    // Detect if pathname has changed (navigation occurred)
    if (previousPathnameRef.current !== pathname) {
      // Save before the navigation completes
      performSave();
      previousPathnameRef.current = pathname;
    }
  }, [pathname, enabled, performSave]);

  // Auto-save on beforeunload (user leaving the page/app)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = useAppStore.getState();
      const { currentComponent } = state;

      // Only prevent unload if there's unsaved data
      if (currentComponent && user?.id) {
        // Attempt synchronous save via sendBeacon for better reliability
        try {
          const syncedComponent = syncStoreToComponent(currentComponent, {
            appConcept: state.appConcept,
            currentLayoutManifest: state.currentLayoutManifest,
            layoutThumbnail: state.layoutThumbnail,
            dynamicPhasePlan: state.dynamicPhasePlan,
            chatMessages: state.chatMessages,
          });

          // Use sendBeacon for reliable async save during page unload
          // Note: This requires a dedicated endpoint that can handle the request
          const payload = JSON.stringify({
            component: syncedComponent,
            userId: user.id,
          });

          // Try sendBeacon first (more reliable during page unload)
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/builder/beacon-save', payload);
          }
        } catch (error) {
          console.error('[AutoSaveOnNavigation] Failed to save on unload:', error);
        }

        // Don't show confirmation dialog - just save silently
        // If you want to show a confirmation, uncomment below:
        // event.preventDefault();
        // event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, user?.id]);

  // Return the performSave function for manual triggering if needed
  return { saveNow: performSave };
}

export default useAutoSaveOnNavigation;
