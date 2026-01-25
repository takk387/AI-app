/**
 * useGeminiLayoutState Hook
 *
 * Provides essential state management for Gemini 3 Layout Builder:
 * - Undo/Redo functionality
 * - Draft auto-save to localStorage
 * - Error retry logic
 *
 * This is a minimal implementation focused on critical UX features.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { LayoutManifest } from '@/types/schema';
import { LayoutMessage } from '@/types/layoutDesign';

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFT_STORAGE_KEY = 'gemini3_draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_HISTORY_SIZE = 50;

// ============================================================================
// TYPES
// ============================================================================

interface DraftState {
  manifest: LayoutManifest | null;
  messages: LayoutMessage[];
  savedAt: string;
}

export interface MessageError {
  type: 'network' | 'timeout' | 'rate_limit' | 'server' | 'unknown';
  message: string;
  canRetry: boolean;
  retryAfter?: number;
  originalMessage?: string;
}

interface UseGeminiLayoutStateOptions {
  onDraftRecovered?: (draft: DraftState) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Save draft to localStorage
 */
function saveDraftToStorage(draft: DraftState): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Failed to save draft:', error);
  }
}

/**
 * Load draft from localStorage
 */
function loadDraftFromStorage(): DraftState | null {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as DraftState;
    }
  } catch (error) {
    console.warn('Failed to load draft:', error);
  }
  return null;
}

/**
 * Clear draft from localStorage
 */
function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear draft:', error);
  }
}

/**
 * Categorize errors and return user-friendly message with retry info
 */
export function categorizeError(error: unknown, statusCode?: number): MessageError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network connection failed. Check your internet and try again.',
      canRetry: true,
    };
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'TimeoutError') {
    return {
      type: 'timeout',
      message: 'Request timed out. Please try again.',
      canRetry: true,
    };
  }

  // HTTP status codes
  if (statusCode) {
    switch (statusCode) {
      case 429:
        return {
          type: 'rate_limit',
          message: 'Too many requests. Please wait before trying again.',
          canRetry: true,
          retryAfter: 30000,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'server',
          message: 'Server temporarily unavailable. Please try again.',
          canRetry: true,
        };
      case 401:
      case 403:
        return {
          type: 'server',
          message: 'Authentication error. Please refresh and try again.',
          canRetry: false,
        };
      default:
        if (statusCode >= 400) {
          return {
            type: 'server',
            message: `Request error (${statusCode}). Please try again.`,
            canRetry: true,
          };
        }
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    canRetry: true,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useGeminiLayoutState(options: UseGeminiLayoutStateOptions = {}) {
  const { onDraftRecovered } = options;

  // Undo/Redo state
  const [manifestHistory, setManifestHistory] = useState<(LayoutManifest | null)[]>([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Draft recovery state
  const [hasDraftToRecover, setHasDraftToRecover] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftState | null>(null);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================================================
  // DRAFT RECOVERY
  // ========================================================================

  // Check for draft on mount
  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (draft) {
      // Check if draft is less than 24 hours old
      const draftAge = Date.now() - new Date(draft.savedAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (draftAge < maxAge) {
        setPendingDraft(draft);
        setHasDraftToRecover(true);
        if (onDraftRecovered) {
          onDraftRecovered(draft);
        }
      } else {
        clearDraftFromStorage();
      }
    }
  }, [onDraftRecovered]);

  /**
   * Recover the pending draft
   */
  const recoverDraft = useCallback(() => {
    if (pendingDraft) {
      setPendingDraft(null);
      setHasDraftToRecover(false);
      clearDraftFromStorage();
      return pendingDraft;
    }
    return null;
  }, [pendingDraft]);

  /**
   * Discard the pending draft
   */
  const discardDraft = useCallback(() => {
    setPendingDraft(null);
    setHasDraftToRecover(false);
    clearDraftFromStorage();
  }, []);

  // ========================================================================
  // UNDO/REDO
  // ========================================================================

  /**
   * Add a manifest to history
   */
  const addToHistory = useCallback(
    (manifest: LayoutManifest | null) => {
      setManifestHistory((history) => {
        // Truncate any redo states
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(manifest);

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
          setHistoryIndex((prev) => prev - 1);
          return newHistory;
        }

        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  /**
   * Undo the last change
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return manifestHistory[newIndex];
    }
    return null;
  }, [historyIndex, manifestHistory]);

  /**
   * Redo the last undone change
   */
  const redo = useCallback(() => {
    if (historyIndex < manifestHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return manifestHistory[newIndex];
    }
    return null;
  }, [historyIndex, manifestHistory]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < manifestHistory.length - 1;

  // ========================================================================
  // AUTO-SAVE
  // ========================================================================

  /**
   * Set up auto-save for manifest and messages
   */
  const enableAutoSave = useCallback(
    (manifest: LayoutManifest | null, messages: LayoutMessage[]) => {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set up new timer
      autoSaveTimerRef.current = setTimeout(() => {
        const draft: DraftState = {
          manifest,
          messages,
          savedAt: new Date().toISOString(),
        };
        saveDraftToStorage(draft);
      }, AUTO_SAVE_INTERVAL);
    },
    []
  );

  /**
   * Clear auto-save (call when user explicitly saves)
   */
  const clearAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    clearDraftFromStorage();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    // Undo/Redo
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,

    // Draft recovery
    hasDraftToRecover,
    recoverDraft,
    discardDraft,

    // Auto-save
    enableAutoSave,
    clearAutoSave,
  };
}
