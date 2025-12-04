/**
 * useStateInspector - Development hook for debugging Zustand state
 *
 * Exposes the app state to window.__APP_STATE__ for console debugging.
 * Only active when NEXT_PUBLIC_DEBUG_STATE=true in development.
 *
 * @example In browser console:
 * ```javascript
 * __APP_STATE__.chatMessages
 * __APP_STATE__.currentMode
 * __APP_STATE__.components
 * ```
 */

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { DEBUG, printDebugStatus } from '@/utils/debug';

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __APP_STATE__: ReturnType<typeof useAppStore.getState>;
    __DEBUG__: typeof DEBUG;
    __STORE__: typeof useAppStore;
  }
}

/**
 * Hook to expose app state to window for debugging
 *
 * Usage: Call this hook once in your root component (e.g., layout.tsx)
 *
 * @example
 * ```tsx
 * // In your root layout or app component
 * function RootLayout({ children }) {
 *   useStateInspector();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useStateInspector(): void {
  useEffect(() => {
    // Only run in browser and development
    if (typeof window === 'undefined') return;
    if (!DEBUG.EXPOSE_STATE && !DEBUG.SHOW_PANEL) return;

    // Print debug status on first load
    printDebugStatus();

    // Expose debug flags
    window.__DEBUG__ = DEBUG;

    // Expose the store itself for advanced debugging
    window.__STORE__ = useAppStore;

    // Subscribe to store changes and update window object
    const unsubscribe = useAppStore.subscribe((state) => {
      window.__APP_STATE__ = state;
    });

    // Set initial state
    window.__APP_STATE__ = useAppStore.getState();

    // Log availability
    if (DEBUG.EXPOSE_STATE) {
      console.log('🔍 State Inspector Active');
      console.log('   Available globals:');
      console.log('   - window.__APP_STATE__ (current state snapshot)');
      console.log('   - window.__STORE__ (Zustand store with getState/setState)');
      console.log('   - window.__DEBUG__ (debug flags)');
    }

    return () => {
      unsubscribe();
      // Clean up on unmount (though this rarely happens in practice)
      if (typeof window !== 'undefined') {
        delete (window as Partial<Window>).__APP_STATE__;
        delete (window as Partial<Window>).__DEBUG__;
        delete (window as Partial<Window>).__STORE__;
      }
    };
  }, []);
}

/**
 * Utility function to log current state (can be called from anywhere)
 */
export function logCurrentState(slice?: string): void {
  if (!DEBUG.EXPOSE_STATE && !DEBUG.VERBOSE_ERRORS) return;

  const state = useAppStore.getState();

  if (slice) {
    console.log(`[STATE] ${slice}:`, (state as unknown as Record<string, unknown>)[slice]);
  } else {
    console.log('[STATE] Full snapshot:', {
      mode: state.currentMode,
      isGenerating: state.isGenerating,
      messagesCount: state.chatMessages?.length || 0,
      componentsCount: state.components?.length || 0,
      undoStackSize: state.undoStack?.length || 0,
      redoStackSize: state.redoStack?.length || 0,
      activeTab: state.activeTab,
      hasPendingChange: !!state.pendingChange,
      hasAppConcept: !!state.appConcept,
    });
  }
}

/**
 * Utility function to get state value (for conditional logic based on state)
 */
export function getDebugState<K extends keyof ReturnType<typeof useAppStore.getState>>(
  key: K
): ReturnType<typeof useAppStore.getState>[K] {
  return useAppStore.getState()[key];
}

export default useStateInspector;
