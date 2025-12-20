import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRateLimiter } from '@/utils/rateLimit';

export type SandpackFiles = Record<string, { code: string }>;

export interface UseSandpackStabilityOptions {
  /** Debounce delay in milliseconds (default: 500) */
  debounceMs?: number;
  /** Maximum updates per second (default: 2) */
  maxUpdatesPerSecond?: number;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseSandpackStabilityReturn {
  /** Debounced and rate-limited files ready for Sandpack */
  stableFiles: SandpackFiles;
  /** Whether an update is pending (debounce in progress) */
  isUpdating: boolean;
  /** Number of updates waiting in queue */
  updatesPending: number;
  /** Last successfully applied files (for graceful degradation) */
  lastStableFiles: SandpackFiles | null;
  /** Whether an error has occurred */
  hasError: boolean;
  /** The last error that occurred */
  lastError: Error | null;
  /** Force an immediate update, bypassing debounce */
  forceUpdate: () => void;
  /** Clear the current error state */
  clearError: () => void;
}

/**
 * Hook that provides stable file updates for Sandpack by implementing:
 * - Debouncing to prevent rapid recompilations
 * - Rate limiting to prevent queue overflow
 * - Graceful degradation by preserving last stable state
 *
 * @param rawFiles - The raw files object from parent component
 * @param options - Configuration options
 * @returns Stable files and status information
 */
export function useSandpackStability(
  rawFiles: SandpackFiles,
  options: UseSandpackStabilityOptions = {}
): UseSandpackStabilityReturn {
  const { debounceMs = 500, maxUpdatesPerSecond = 2, onError } = options;

  // Current stable files (what Sandpack is rendering)
  const [stableFiles, setStableFiles] = useState<SandpackFiles>(rawFiles);

  // Update status tracking
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatesPending, setUpdatesPending] = useState(0);

  // Error state
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Last stable files for graceful degradation
  const lastStableFilesRef = useRef<SandpackFiles | null>(null);

  // Rate limiter instance (persists across renders)
  const rateLimiterRef = useRef(createRateLimiter(maxUpdatesPerSecond, 1000));

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending updates queue
  const pendingUpdatesRef = useRef<SandpackFiles[]>([]);

  // Track the raw files string for deep comparison
  const rawFilesKey = useMemo(() => {
    try {
      return JSON.stringify(rawFiles);
    } catch {
      return String(Date.now());
    }
  }, [rawFiles]);

  // Process pending updates
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0) {
      setUpdatesPending(0);
      return;
    }

    const rateLimiter = rateLimiterRef.current;

    if (rateLimiter.canExecute()) {
      const nextUpdate = pendingUpdatesRef.current.shift();
      if (nextUpdate) {
        rateLimiter.execute(() => {
          // Store current stable files before update (use functional update to avoid stale closure)
          setStableFiles((prevStableFiles) => {
            lastStableFilesRef.current = prevStableFiles;
            return nextUpdate;
          });
          setUpdatesPending(pendingUpdatesRef.current.length);
        });
      }

      // Schedule processing of remaining updates
      if (pendingUpdatesRef.current.length > 0) {
        setTimeout(processPendingUpdates, 300);
      }
    } else {
      // Rate limited - try again later
      setTimeout(processPendingUpdates, 300);
    }
  }, []); // No dependencies - uses refs and functional updates

  // Track previous rawFilesKey to detect actual changes
  const prevRawFilesKeyRef = useRef<string>(rawFilesKey);

  // Track if we've ever had meaningful content
  const hasHadContentRef = useRef<boolean>(Object.keys(rawFiles).length > 0);

  // Sync stableFiles immediately when rawFiles changes from empty to non-empty
  // This handles the initial data load case
  useEffect(() => {
    const hasContent = Object.keys(rawFiles).length > 0;
    const stableHasContent = Object.keys(stableFiles).length > 0;

    // If we're going from empty to having content, update immediately
    if (hasContent && !stableHasContent && !hasHadContentRef.current) {
      hasHadContentRef.current = true;
      setStableFiles(rawFiles);
      prevRawFilesKeyRef.current = rawFilesKey;
    }
  }, [rawFiles, rawFilesKey, stableFiles]);

  // Debounced update effect for subsequent changes
  useEffect(() => {
    // Skip if files haven't actually changed
    if (rawFilesKey === prevRawFilesKeyRef.current) {
      return;
    }

    // Skip debounce logic if we haven't had content yet (handled by effect above)
    if (!hasHadContentRef.current) {
      return;
    }

    prevRawFilesKeyRef.current = rawFilesKey;
    setIsUpdating(true);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        // Add to pending queue
        pendingUpdatesRef.current.push(rawFiles);
        setUpdatesPending(pendingUpdatesRef.current.length);

        // Process the queue
        processPendingUpdates();

        setIsUpdating(false);
        setHasError(false);
        setLastError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setHasError(true);
        setLastError(err);
        setIsUpdating(false);
        onError?.(err);
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [rawFilesKey, debounceMs, onError, processPendingUpdates, rawFiles]);

  // Force update function - bypasses debounce
  const forceUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Clear pending updates
    pendingUpdatesRef.current = [];
    setUpdatesPending(0);

    // Reset rate limiter
    rateLimiterRef.current.reset();

    // Apply immediately (use functional update to capture current state)
    setStableFiles((prevStableFiles) => {
      lastStableFilesRef.current = prevStableFiles;
      return rawFiles;
    });
    setIsUpdating(false);
  }, [rawFiles]);

  // Clear error function
  const clearError = useCallback(() => {
    setHasError(false);
    setLastError(null);
  }, []);

  return {
    stableFiles,
    isUpdating,
    updatesPending,
    lastStableFiles: lastStableFilesRef.current,
    hasError,
    lastError,
    forceUpdate,
    clearError,
  };
}
