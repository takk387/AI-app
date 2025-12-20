'use client';

import React, { useEffect, useRef } from 'react';
import { useSandpack, SandpackState } from '@codesandbox/sandpack-react';

export type SandpackFiles = Record<string, { code: string }>;

interface SandpackControllerProps {
  /** Files to sync with Sandpack */
  files: SandpackFiles;
  /** Callback when Sandpack status changes */
  onStatusChange?: (status: SandpackState['status']) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Child components to render */
  children: React.ReactNode;
}

/**
 * Controller component that manages incremental file updates to Sandpack.
 * Must be a child of SandpackProvider.
 *
 * Instead of replacing the entire files object (which causes full recompilation),
 * this component uses Sandpack's internal `updateFile` method to only update
 * files that have changed.
 */
export function SandpackController({
  files,
  onStatusChange,
  onError,
  children,
}: SandpackControllerProps) {
  const { sandpack } = useSandpack();
  const prevFilesRef = useRef<SandpackFiles>({});
  const isInitialMount = useRef(true);

  // Track file changes and update incrementally
  useEffect(() => {
    // Skip on initial mount - SandpackProvider already has the files
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevFilesRef.current = files;
      return;
    }

    const prevFiles = prevFilesRef.current;
    let hasChanges = false;

    try {
      // Handle new files first (must add before we can update)
      Object.entries(files).forEach(([path, { code }]) => {
        if (!(path in prevFiles)) {
          hasChanges = true;
          sandpack.addFile(path, code);
        }
      });

      // Update changed files (only existing files, not new ones)
      Object.entries(files).forEach(([path, { code }]) => {
        const prevCode = prevFiles[path]?.code;

        // Only update if file existed before AND content changed
        if (path in prevFiles && prevCode !== code) {
          hasChanges = true;
          sandpack.updateFile(path, code);
        }
      });

      // Handle deleted files
      Object.keys(prevFiles).forEach((path) => {
        if (!(path in files)) {
          hasChanges = true;
          sandpack.deleteFile(path);
        }
      });

      // Store current files for next comparison
      prevFilesRef.current = files;

      // If we made changes, trigger a rerun to apply them
      if (hasChanges) {
        // Small delay to batch multiple file changes
        setTimeout(() => {
          sandpack.runSandpack();
        }, 100);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, [files, sandpack, onError]);

  // Monitor status changes
  useEffect(() => {
    onStatusChange?.(sandpack.status);

    // Check for errors
    if (sandpack.status === 'timeout' || sandpack.error) {
      const errorMessage = sandpack.error?.message || 'Sandpack bundler timeout';
      onError?.(new Error(errorMessage));
    }
  }, [sandpack.status, sandpack.error, onStatusChange, onError]);

  return <>{children}</>;
}

/**
 * Hook to get file diff between two file objects.
 * Useful for debugging or logging changes.
 */
export function getFileDiff(
  prevFiles: SandpackFiles,
  nextFiles: SandpackFiles
): {
  added: string[];
  removed: string[];
  modified: string[];
} {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // Check for added and modified files
  Object.entries(nextFiles).forEach(([path, { code }]) => {
    if (!(path in prevFiles)) {
      added.push(path);
    } else if (prevFiles[path].code !== code) {
      modified.push(path);
    }
  });

  // Check for removed files
  Object.keys(prevFiles).forEach((path) => {
    if (!(path in nextFiles)) {
      removed.push(path);
    }
  });

  return { added, removed, modified };
}
