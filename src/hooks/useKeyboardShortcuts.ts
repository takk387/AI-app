/**
 * useKeyboardShortcuts Hook - Handles keyboard shortcuts for undo/redo and other actions
 *
 * Extracted from AIBuilder.tsx for reusability and better separation of concerns.
 * Provides keyboard shortcut handling for common operations.
 */

import { useEffect, useCallback } from 'react';

/**
 * Options for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Callback for undo action (Ctrl+Z / Cmd+Z) */
  onUndo?: () => void;
  /** Callback for redo action (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y) */
  onRedo?: () => void;
  /** Callback for save action (Ctrl+S / Cmd+S) */
  onSave?: () => void;
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 *
 * @param options - Configuration options for keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onUndo: () => handleUndo(),
 *   onRedo: () => handleRedo(),
 *   onSave: () => handleSave(),
 *   enabled: currentComponent !== null,
 * });
 * ```
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { onUndo, onRedo, onSave, enabled = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Ctrl+S or Cmd+S for Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }
    },
    [enabled, onUndo, onRedo, onSave]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
