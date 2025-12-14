'use client';

/**
 * Keyboard Shortcuts Panel Component
 *
 * Modal overlay showing all available keyboard shortcuts for the Layout Builder.
 * Features:
 * - Grouped shortcuts by category
 * - Platform-specific modifier keys (Cmd/Ctrl)
 * - Visual key representations
 * - Search/filter functionality
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FocusTrap } from './ui/FocusTrap';

// ============================================================================
// TYPES
// ============================================================================

interface Shortcut {
  keys: string[];
  action: string;
  description?: string;
}

interface ShortcutCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  shortcuts: Shortcut[];
}

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Detect platform for modifier key display
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const MOD_KEY = isMac ? 'Cmd' : 'Ctrl';

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'general',
    title: 'General',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    shortcuts: [
      {
        keys: [MOD_KEY, 'S'],
        action: 'Save design',
        description: 'Save current design to history',
      },
      { keys: [MOD_KEY, 'Z'], action: 'Undo', description: 'Undo last change' },
      { keys: [MOD_KEY, 'Shift', 'Z'], action: 'Redo', description: 'Redo last undone change' },
      { keys: [MOD_KEY, 'E'], action: 'Export', description: 'Open export options' },
      { keys: ['?'], action: 'Show shortcuts', description: 'Toggle this panel' },
      { keys: ['Esc'], action: 'Close panel', description: 'Close current modal or panel' },
    ],
  },
  {
    id: 'view',
    title: 'View',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    shortcuts: [
      { keys: ['1'], action: 'Mobile view', description: 'Switch to mobile breakpoint' },
      { keys: ['2'], action: 'Tablet view', description: 'Switch to tablet breakpoint' },
      { keys: ['3'], action: 'Desktop view', description: 'Switch to desktop breakpoint' },
      { keys: ['G'], action: 'Toggle grid overlay', description: 'Show/hide 12-column grid' },
      {
        keys: ['F'],
        action: 'Toggle fullscreen preview',
        description: 'Expand preview to fullscreen',
      },
      {
        keys: [MOD_KEY, 'B'],
        action: 'Toggle sidebar',
        description: 'Show/hide the control sidebar',
      },
    ],
  },
  {
    id: 'design',
    title: 'Design',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
    shortcuts: [
      { keys: ['C'], action: 'Color panel', description: 'Open color settings' },
      { keys: ['T'], action: 'Typography panel', description: 'Open typography settings' },
      { keys: ['S'], action: 'Spacing panel', description: 'Open spacing settings' },
      { keys: ['E'], action: 'Effects panel', description: 'Open effects settings' },
      { keys: ['A'], action: 'Accessibility panel', description: 'Open accessibility checker' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    shortcuts: [
      { keys: ['H'], action: 'Toggle header', description: 'Show/hide header component' },
      { keys: ['N'], action: 'Toggle nav/sidebar', description: 'Show/hide navigation' },
      { keys: ['R'], action: 'Toggle hero', description: 'Show/hide hero section' },
      { keys: ['D'], action: 'Toggle cards', description: 'Show/hide card components' },
      { keys: ['L'], action: 'Toggle list', description: 'Show/hide list component' },
      { keys: ['O'], action: 'Toggle footer', description: 'Show/hide footer component' },
    ],
  },
  {
    id: 'code',
    title: 'Code',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
    shortcuts: [
      { keys: ['P'], action: 'Code preview', description: 'Open code preview panel' },
      { keys: [MOD_KEY, 'C'], action: 'Copy CSS', description: 'Copy current CSS to clipboard' },
      { keys: [MOD_KEY, 'Shift', 'C'], action: 'Copy all', description: 'Copy all code files' },
    ],
  },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual key representation
 */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium bg-slate-700 border border-slate-600 rounded shadow-sm">
      {children}
    </kbd>
  );
}

/**
 * Shortcut row component
 */
function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-800/50 rounded transition-colors">
      <div className="flex-1">
        <div className="text-sm text-slate-300">{shortcut.action}</div>
        {shortcut.description && (
          <div className="text-xs text-slate-500 mt-0.5">{shortcut.description}</div>
        )}
      </div>
      <div className="flex items-center gap-1 ml-4">
        {shortcut.keys.map((key, i) => (
          <React.Fragment key={key}>
            <Key>{formatKey(key)}</Key>
            {i < shortcut.keys.length - 1 && <span className="text-slate-600 text-xs">+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Format key for display
 */
function formatKey(key: string): string {
  const keyMap: Record<string, string> = {
    Cmd: '⌘',
    Ctrl: 'Ctrl',
    Shift: '⇧',
    Alt: isMac ? '⌥' : 'Alt',
    Enter: '↵',
    Esc: 'Esc',
    Space: '␣',
    Backspace: '⌫',
    Delete: '⌦',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  return keyMap[key] || key;
}

/**
 * Category section component
 */
function CategorySection({ category }: { category: ShortcutCategory }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 px-3 mb-2 text-slate-400">
        {category.icon}
        <h3 className="text-sm font-medium">{category.title}</h3>
      </div>
      <div className="divide-y divide-slate-700/50">
        {category.shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.action} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

/**
 * Search input component
 */
function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search shortcuts..."
        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter shortcuts based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return SHORTCUT_CATEGORIES;
    }

    const query = searchQuery.toLowerCase();
    return SHORTCUT_CATEGORIES.map((category) => ({
      ...category,
      shortcuts: category.shortcuts.filter(
        (shortcut) =>
          shortcut.action.toLowerCase().includes(query) ||
          shortcut.description?.toLowerCase().includes(query) ||
          shortcut.keys.some((key) => key.toLowerCase().includes(query))
      ),
    })).filter((category) => category.shortcuts.length > 0);
  }, [searchQuery]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <FocusTrap onEscape={onClose}>
        <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-xs text-slate-500">
                  {isMac ? 'macOS' : 'Windows/Linux'} shortcuts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-700/50">
            <SearchInput value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-180px)] p-6">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <CategorySection key={category.id} category={category} />
              ))
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-12 h-12 mx-auto text-slate-600 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-slate-400">No shortcuts found for &quot;{searchQuery}&quot;</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-3 bg-slate-800/80 border-t border-slate-700 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Press <Key>?</Key> to toggle this panel
              </span>
              <span>
                Press <Key>Esc</Key> to close
              </span>
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default KeyboardShortcutsPanel;
