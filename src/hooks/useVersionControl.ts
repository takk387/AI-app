/**
 * useVersionControl Hook - Handles undo/redo functionality and version management
 * 
 * Extracted from AIBuilder.tsx for reusability and better separation of concerns.
 * Provides version history management, undo/redo stacks, and version comparison.
 */

import { useState, useCallback } from 'react';
import type { GeneratedComponent, AppVersion } from '@/types/aiBuilderTypes';

/**
 * Options for useVersionControl hook
 */
export interface UseVersionControlOptions {
  /** Current component being edited */
  currentComponent: GeneratedComponent | null;
  /** Callback when component is updated */
  onComponentUpdate: (component: GeneratedComponent) => void;
}

/**
 * Return type for useVersionControl hook
 */
export interface UseVersionControlReturn {
  /** Stack of versions for undo */
  undoStack: AppVersion[];
  /** Stack of versions for redo */
  redoStack: AppVersion[];
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Undo the last change */
  undo: () => void;
  /** Redo the last undone change */
  redo: () => void;
  /** Push a version to the undo stack */
  pushToUndoStack: (version: AppVersion) => void;
  /** Clear the redo stack */
  clearRedoStack: () => void;
  /** Revert to a specific version */
  revertToVersion: (version: AppVersion) => void;
  /** Save the current state as a new version */
  saveVersion: (component: GeneratedComponent, changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE', description: string) => GeneratedComponent;
  /** Compare two versions */
  compareVersions: (v1: AppVersion, v2: AppVersion) => { v1: AppVersion; v2: AppVersion };
  /** Fork from a specific version */
  forkFromVersion: (sourceApp: GeneratedComponent, version?: AppVersion) => GeneratedComponent;
  /** Set the undo stack directly */
  setUndoStack: React.Dispatch<React.SetStateAction<AppVersion[]>>;
  /** Set the redo stack directly */
  setRedoStack: React.Dispatch<React.SetStateAction<AppVersion[]>>;
}

/**
 * Hook for managing version control functionality
 * 
 * @param options - Configuration options
 * @returns Version control methods and state
 * 
 * @example
 * ```tsx
 * const { 
 *   undoStack, 
 *   redoStack, 
 *   canUndo, 
 *   canRedo, 
 *   undo, 
 *   redo,
 *   saveVersion 
 * } = useVersionControl({
 *   currentComponent,
 *   onComponentUpdate: (comp) => setCurrentComponent(comp),
 * });
 * ```
 */
export function useVersionControl(options: UseVersionControlOptions): UseVersionControlReturn {
  const { currentComponent, onComponentUpdate } = options;
  const [undoStack, setUndoStack] = useState<AppVersion[]>([]);
  const [redoStack, setRedoStack] = useState<AppVersion[]>([]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  /**
   * Push a version to the undo stack
   */
  const pushToUndoStack = useCallback((version: AppVersion) => {
    setUndoStack(prev => [...prev, version]);
  }, []);

  /**
   * Clear the redo stack
   */
  const clearRedoStack = useCallback(() => {
    setRedoStack([]);
  }, []);

  /**
   * Save the current state as a new version
   */
  const saveVersion = useCallback((
    component: GeneratedComponent, 
    changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE', 
    description: string
  ): GeneratedComponent => {
    const versions = component.versions || [];
    
    const newVersion: AppVersion = {
      id: crypto.randomUUID(),
      versionNumber: versions.length + 1,
      code: component.code,
      description: description,
      timestamp: new Date().toISOString(),
      changeType
    };
    
    return {
      ...component,
      versions: [...versions, newVersion]
    };
  }, []);

  /**
   * Undo the last change
   */
  const undo = useCallback(() => {
    if (!currentComponent || undoStack.length === 0) return;

    const previousVersion = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Save current state to redo stack
    const currentVersion: AppVersion = {
      id: crypto.randomUUID(),
      versionNumber: (currentComponent.versions?.length || 0) + 1,
      code: currentComponent.code,
      description: currentComponent.description,
      timestamp: currentComponent.timestamp,
      changeType: 'MINOR_CHANGE'
    };
    setRedoStack(prev => [...prev, currentVersion]);
    setUndoStack(newUndoStack);

    // Apply previous version
    const undoneComponent: GeneratedComponent = {
      ...currentComponent,
      code: previousVersion.code,
      description: previousVersion.description,
      timestamp: new Date().toISOString()
    };

    onComponentUpdate(undoneComponent);
  }, [currentComponent, undoStack, onComponentUpdate]);

  /**
   * Redo the last undone change
   */
  const redo = useCallback(() => {
    if (!currentComponent || redoStack.length === 0) return;

    const nextVersion = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Save current state to undo stack
    const currentVersion: AppVersion = {
      id: crypto.randomUUID(),
      versionNumber: (currentComponent.versions?.length || 0) + 1,
      code: currentComponent.code,
      description: currentComponent.description,
      timestamp: currentComponent.timestamp,
      changeType: 'MINOR_CHANGE'
    };
    setUndoStack(prev => [...prev, currentVersion]);
    setRedoStack(newRedoStack);

    // Apply next version
    const redoneComponent: GeneratedComponent = {
      ...currentComponent,
      code: nextVersion.code,
      description: nextVersion.description,
      timestamp: new Date().toISOString()
    };

    onComponentUpdate(redoneComponent);
  }, [currentComponent, redoStack, onComponentUpdate]);

  /**
   * Revert to a specific version
   */
  const revertToVersion = useCallback((version: AppVersion) => {
    if (!currentComponent) return;

    // Save current state to undo stack before reverting
    const currentVersion: AppVersion = {
      id: crypto.randomUUID(),
      versionNumber: (currentComponent.versions?.length || 0) + 1,
      code: currentComponent.code,
      description: currentComponent.description,
      timestamp: currentComponent.timestamp,
      changeType: 'MINOR_CHANGE'
    };
    setUndoStack(prev => [...prev, currentVersion]);
    setRedoStack([]); // Clear redo stack on new action

    // Revert to the selected version
    const revertedComponent: GeneratedComponent = {
      ...currentComponent,
      code: version.code,
      description: `Reverted to version ${version.versionNumber}`,
      timestamp: new Date().toISOString()
    };

    onComponentUpdate(revertedComponent);
  }, [currentComponent, onComponentUpdate]);

  /**
   * Compare two versions
   */
  const compareVersions = useCallback((v1: AppVersion, v2: AppVersion): { v1: AppVersion; v2: AppVersion } => {
    return { v1, v2 };
  }, []);

  /**
   * Fork from a specific version
   */
  const forkFromVersion = useCallback((sourceApp: GeneratedComponent, version?: AppVersion): GeneratedComponent => {
    const codeToFork = version ? version.code : sourceApp.code;
    const descriptionSuffix = version ? ` (forked from v${version.versionNumber})` : ' (forked)';

    const forkedApp: GeneratedComponent = {
      id: crypto.randomUUID(),
      name: `${sourceApp.name} - Fork`,
      code: codeToFork,
      description: sourceApp.description + descriptionSuffix,
      timestamp: new Date().toISOString(),
      isFavorite: false,
      conversationHistory: [],
      versions: [{
        id: crypto.randomUUID(),
        versionNumber: 1,
        code: codeToFork,
        description: `Forked from ${sourceApp.name}`,
        timestamp: new Date().toISOString(),
        changeType: 'NEW_APP'
      }]
    };

    return forkedApp;
  }, []);

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    undo,
    redo,
    pushToUndoStack,
    clearRedoStack,
    revertToVersion,
    saveVersion,
    compareVersions,
    forkFromVersion,
    setUndoStack,
    setRedoStack,
  };
}

export default useVersionControl;
