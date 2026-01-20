/**
 * useKeyboardShortcuts Hook - Comprehensive keyboard shortcuts for the app
 *
 * Handles all keyboard shortcuts documented in KeyboardShortcutsPanel:
 * - General: Save, Undo, Redo, Export, ?, Esc
 * - View: 1-3 for breakpoints, G for grid, F for fullscreen, Ctrl+B for sidebar
 * - Design: C for color, T for typography, S for spacing, E for effects, A for accessibility
 * - Components: H, N, R, D, L, O for various component toggles
 * - Code: P for code preview, Ctrl+C for copy CSS, Ctrl+Shift+C for copy all
 */

import { useEffect, useCallback } from 'react';

/**
 * Options for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  // ============================================================================
  // GENERAL SHORTCUTS
  // ============================================================================
  /** Callback for undo action (Ctrl+Z / Cmd+Z) */
  onUndo?: () => void;
  /** Callback for redo action (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y) */
  onRedo?: () => void;
  /** Callback for save action (Ctrl+S / Cmd+S) */
  onSave?: () => void;
  /** Callback for export action (Ctrl+E / Cmd+E) */
  onExport?: () => void;
  /** Callback for showing keyboard shortcuts (?) */
  onShowShortcuts?: () => void;
  /** Callback for escape key */
  onEscape?: () => void;

  // ============================================================================
  // VIEW SHORTCUTS
  // ============================================================================
  /** Callback for mobile view (1) */
  onMobileView?: () => void;
  /** Callback for tablet view (2) */
  onTabletView?: () => void;
  /** Callback for desktop view (3) */
  onDesktopView?: () => void;
  /** Callback for large desktop view (4) */
  onLargeDesktopView?: () => void;
  /** Callback for extra large view (5) */
  onExtraLargeView?: () => void;
  /** Callback for custom breakpoint (6) */
  onCustomBreakpoint?: () => void;
  /** Callback for toggling grid overlay (G) */
  onToggleGrid?: () => void;
  /** Callback for toggling fullscreen (F) */
  onToggleFullscreen?: () => void;
  /** Callback for toggling sidebar (Ctrl+B / Cmd+B) */
  onToggleSidebar?: () => void;
  /** Callback for reset view (R) - only when not a component toggle */
  onResetView?: () => void;

  // ============================================================================
  // DESIGN PANEL SHORTCUTS
  // ============================================================================
  /** Callback for color panel (C) */
  onColorPanel?: () => void;
  /** Callback for typography panel (T) */
  onTypographyPanel?: () => void;
  /** Callback for spacing panel (S) */
  onSpacingPanel?: () => void;
  /** Callback for effects panel (E) */
  onEffectsPanel?: () => void;
  /** Callback for accessibility panel (A) */
  onAccessibilityPanel?: () => void;

  // ============================================================================
  // COMPONENT TOGGLE SHORTCUTS
  // ============================================================================
  /** Callback for toggle header (H) */
  onToggleHeader?: () => void;
  /** Callback for toggle nav/sidebar (N) */
  onToggleNav?: () => void;
  /** Callback for toggle hero (R) - conflicts with reset, context-dependent */
  onToggleHero?: () => void;
  /** Callback for toggle cards (D) */
  onToggleCards?: () => void;
  /** Callback for toggle list (L) */
  onToggleList?: () => void;
  /** Callback for toggle footer (O) */
  onToggleFooter?: () => void;

  // ============================================================================
  // CODE SHORTCUTS
  // ============================================================================
  /** Callback for code preview (P) */
  onCodePreview?: () => void;
  /** Callback for copy CSS (Ctrl+C / Cmd+C) - only when no text selected */
  onCopyCSS?: () => void;
  /** Callback for copy all code (Ctrl+Shift+C / Cmd+Shift+C) */
  onCopyAllCode?: () => void;

  // ============================================================================
  // OPTIONS
  // ============================================================================
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean;
  /** Context for component shortcuts - 'layout' uses component toggles, 'builder' uses reset */
  context?: 'layout' | 'builder';
}

/**
 * Check if the target element is an input/textarea where shortcuts should be disabled
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}

/**
 * Hook for handling comprehensive keyboard shortcuts
 *
 * @param options - Configuration options for keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onUndo: () => handleUndo(),
 *   onRedo: () => handleRedo(),
 *   onSave: () => handleSave(),
 *   onMobileView: () => selectBreakpoint('sm'),
 *   onTabletView: () => selectBreakpoint('md'),
 *   onDesktopView: () => selectBreakpoint('lg'),
 *   onToggleGrid: () => togglePanel('gridOverlay'),
 *   onShowShortcuts: () => togglePanel('keyboardShortcuts'),
 *   enabled: true,
 *   context: 'layout',
 * });
 * ```
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    // General
    onUndo,
    onRedo,
    onSave,
    onExport,
    onShowShortcuts,
    onEscape,
    // View
    onMobileView,
    onTabletView,
    onDesktopView,
    onLargeDesktopView,
    onExtraLargeView,
    onCustomBreakpoint,
    onToggleGrid,
    onToggleFullscreen,
    onToggleSidebar,
    onResetView,
    // Design panels
    onColorPanel,
    onTypographyPanel,
    onSpacingPanel,
    onEffectsPanel,
    onAccessibilityPanel,
    // Components
    onToggleHeader,
    onToggleNav,
    onToggleHero,
    onToggleCards,
    onToggleList,
    onToggleFooter,
    // Code
    onCodePreview,
    onCopyCSS,
    onCopyAllCode,
    // Options
    enabled = true,
    context = 'builder',
  } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const isModified = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key?.toLowerCase() ?? '';
      if (!key) return; // Guard against undefined e.key (dead keys, special keys)

      // Skip shortcuts when typing in input fields (except for specific ones)
      if (isInputElement(e.target)) {
        // Still allow Esc and some ctrl shortcuts in inputs
        if (key === 'escape') {
          onEscape?.();
          return;
        }
        // Allow save shortcut in inputs
        if (isModified && key === 's') {
          e.preventDefault();
          onSave?.();
          return;
        }
        return; // Skip other shortcuts when in input
      }

      // ========================================================================
      // GENERAL SHORTCUTS (with modifiers)
      // ========================================================================

      // Ctrl+Z or Cmd+Z for Undo
      if (isModified && key === 'z' && !isShift) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for Redo
      if ((isModified && key === 'z' && isShift) || (isModified && key === 'y')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Ctrl+S or Cmd+S for Save
      if (isModified && key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl+E or Cmd+E for Export
      if (isModified && key === 'e') {
        e.preventDefault();
        onExport?.();
        return;
      }

      // Ctrl+B or Cmd+B for Toggle Sidebar
      if (isModified && key === 'b') {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Ctrl+Shift+C or Cmd+Shift+C for Copy All Code
      if (isModified && isShift && key === 'c') {
        e.preventDefault();
        onCopyAllCode?.();
        return;
      }

      // Ctrl+C or Cmd+C for Copy CSS (only if no text selected)
      if (isModified && key === 'c' && !isShift) {
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
          // Only intercept if nothing is selected
          if (onCopyCSS) {
            e.preventDefault();
            onCopyCSS();
            return;
          }
        }
        // Let default copy behavior happen if text is selected
        return;
      }

      // ========================================================================
      // ESCAPE KEY
      // ========================================================================
      if (key === 'escape') {
        onEscape?.();
        return;
      }

      // ========================================================================
      // SINGLE KEY SHORTCUTS (no modifiers)
      // ========================================================================
      if (isModified) return; // Skip single-key shortcuts if modifier is held

      // ? for Show Shortcuts
      if (e.key === '?' || (isShift && key === '/')) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // Number keys for breakpoints
      switch (key) {
        case '1':
          e.preventDefault();
          onMobileView?.();
          return;
        case '2':
          e.preventDefault();
          onTabletView?.();
          return;
        case '3':
          e.preventDefault();
          onDesktopView?.();
          return;
        case '4':
          e.preventDefault();
          onLargeDesktopView?.();
          return;
        case '5':
          e.preventDefault();
          onExtraLargeView?.();
          return;
        case '6':
          e.preventDefault();
          onCustomBreakpoint?.();
          return;
      }

      // Letter shortcuts
      switch (key) {
        // View shortcuts
        case 'g':
          e.preventDefault();
          onToggleGrid?.();
          return;
        case 'f':
          e.preventDefault();
          onToggleFullscreen?.();
          return;

        // Design panel shortcuts
        case 'c':
          e.preventDefault();
          onColorPanel?.();
          return;
        case 't':
          e.preventDefault();
          onTypographyPanel?.();
          return;
        case 's':
          e.preventDefault();
          onSpacingPanel?.();
          return;
        case 'e':
          e.preventDefault();
          onEffectsPanel?.();
          return;
        case 'a':
          e.preventDefault();
          onAccessibilityPanel?.();
          return;

        // Component toggle shortcuts
        case 'h':
          e.preventDefault();
          onToggleHeader?.();
          return;
        case 'n':
          e.preventDefault();
          onToggleNav?.();
          return;
        case 'r':
          e.preventDefault();
          // R can mean "reset view" or "toggle hero" depending on context
          if (context === 'layout') {
            onToggleHero?.();
          } else {
            onResetView?.();
          }
          return;
        case 'd':
          e.preventDefault();
          onToggleCards?.();
          return;
        case 'l':
          e.preventDefault();
          onToggleList?.();
          return;
        case 'o':
          e.preventDefault();
          onToggleFooter?.();
          return;

        // Code shortcuts
        case 'p':
          e.preventDefault();
          onCodePreview?.();
          return;
      }
    },
    [
      enabled,
      context,
      onUndo,
      onRedo,
      onSave,
      onExport,
      onShowShortcuts,
      onEscape,
      onMobileView,
      onTabletView,
      onDesktopView,
      onLargeDesktopView,
      onExtraLargeView,
      onCustomBreakpoint,
      onToggleGrid,
      onToggleFullscreen,
      onToggleSidebar,
      onResetView,
      onColorPanel,
      onTypographyPanel,
      onSpacingPanel,
      onEffectsPanel,
      onAccessibilityPanel,
      onToggleHeader,
      onToggleNav,
      onToggleHero,
      onToggleCards,
      onToggleList,
      onToggleFooter,
      onCodePreview,
      onCopyCSS,
      onCopyAllCode,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
