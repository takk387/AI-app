/**
 * useToast Hook
 *
 * A simple toast notification system for displaying messages to users.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastOptions {
  type?: ToastType;
  message: string;
  duration?: number;
}

interface UseToastReturn {
  toasts: Toast[];
  toast: (options: ToastOptions) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DURATION = 4000; // 4 seconds
const MAX_TOASTS = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // Dismiss a specific toast
  const dismiss = useCallback((id: string) => {
    // Clear timeout if exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current.clear();
    setToasts([]);
  }, []);

  // Add a new toast
  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = generateToastId();
      const duration = options.duration ?? DEFAULT_DURATION;

      const newToast: Toast = {
        id,
        type: options.type || 'info',
        message: options.message,
        duration,
      };

      setToasts((prev) => {
        // Limit number of toasts
        const updated = [...prev, newToast];
        if (updated.length > MAX_TOASTS) {
          // Remove oldest toast
          const removed = updated.shift();
          if (removed) {
            const timeout = timeoutRefs.current.get(removed.id);
            if (timeout) {
              clearTimeout(timeout);
              timeoutRefs.current.delete(removed.id);
            }
          }
        }
        return updated;
      });

      // Auto-dismiss after duration
      if (duration > 0) {
        const timeout = setTimeout(() => {
          dismiss(id);
        }, duration);
        timeoutRefs.current.set(id, timeout);
      }

      return id;
    },
    [dismiss]
  );

  // Convenience methods
  const success = useCallback(
    (message: string, duration?: number): string => {
      return toast({ type: 'success', message, duration });
    },
    [toast]
  );

  const error = useCallback(
    (message: string, duration?: number): string => {
      return toast({ type: 'error', message, duration });
    },
    [toast]
  );

  const info = useCallback(
    (message: string, duration?: number): string => {
      return toast({ type: 'info', message, duration });
    },
    [toast]
  );

  const warning = useCallback(
    (message: string, duration?: number): string => {
      return toast({ type: 'warning', message, duration });
    },
    [toast]
  );

  return {
    toasts,
    toast,
    success,
    error,
    info,
    warning,
    dismiss,
    dismissAll,
  };
}

export default useToast;
