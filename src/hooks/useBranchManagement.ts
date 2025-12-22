/**
 * useBranchManagement Hook - Handles branch creation, switching, and management
 *
 * Provides branch CRUD operations for GeneratedComponents, allowing multiple
 * development paths within the same app that share the same Railway project.
 */

import { useCallback, useMemo } from 'react';
import type { GeneratedComponent, AppBranch } from '@/types/aiBuilderTypes';
import {
  migrateToBranchFormat,
  createBranch as createBranchUtil,
  switchBranch as switchBranchUtil,
  deleteBranch as deleteBranchUtil,
  renameBranch as renameBranchUtil,
  syncToActiveBranch,
  getActiveBranch,
  getDefaultBranch,
  hasBranches,
  validateBranchName,
} from '@/utils/branchMigration';

/**
 * Options for useBranchManagement hook
 */
export interface UseBranchManagementOptions {
  /** Current component being edited */
  currentComponent: GeneratedComponent | null;
  /** Callback when component is updated */
  onComponentUpdate: (component: GeneratedComponent) => void;
  /** Callback when undo/redo stacks should be cleared (on branch switch) */
  onClearUndoRedo?: () => void;
}

/**
 * Return type for useBranchManagement hook
 */
export interface UseBranchManagementReturn {
  /** All branches in the current component */
  branches: AppBranch[];
  /** Currently active branch */
  activeBranch: AppBranch | null;
  /** Default (main) branch */
  defaultBranch: AppBranch | null;
  /** Whether the component has branches */
  hasBranches: boolean;
  /** Create a new branch */
  createBranch: (name: string, description?: string, sourceBranchId?: string) => void;
  /** Switch to a different branch */
  switchBranch: (branchId: string) => void;
  /** Delete a branch */
  deleteBranch: (branchId: string) => void;
  /** Rename a branch */
  renameBranch: (branchId: string, newName: string) => void;
  /** Get a branch by ID */
  getBranchById: (branchId: string) => AppBranch | undefined;
  /** Validate a branch name */
  validateName: (name: string) => { valid: boolean; error?: string };
  /** Migrate component to branch format if needed */
  ensureBranches: () => void;
}

/**
 * Hook for managing branches within a component
 *
 * @param options - Configuration options
 * @returns Branch management methods and state
 *
 * @example
 * ```tsx
 * const {
 *   branches,
 *   activeBranch,
 *   createBranch,
 *   switchBranch,
 *   deleteBranch,
 * } = useBranchManagement({
 *   currentComponent,
 *   onComponentUpdate: (comp) => setCurrentComponent(comp),
 *   onClearUndoRedo: () => { setUndoStack([]); setRedoStack([]); },
 * });
 * ```
 */
export function useBranchManagement(
  options: UseBranchManagementOptions
): UseBranchManagementReturn {
  const { currentComponent, onComponentUpdate, onClearUndoRedo } = options;

  // Derived state
  const branches = useMemo(() => currentComponent?.branches || [], [currentComponent?.branches]);

  const activeBranch = useMemo(
    () => (currentComponent ? getActiveBranch(currentComponent) || null : null),
    [currentComponent]
  );

  const defaultBranch = useMemo(
    () => (currentComponent ? getDefaultBranch(currentComponent) || null : null),
    [currentComponent]
  );

  const componentHasBranches = useMemo(
    () => (currentComponent ? hasBranches(currentComponent) : false),
    [currentComponent]
  );

  /**
   * Create a new branch from the current or specified source branch
   */
  const createBranchHandler = useCallback(
    (name: string, description?: string, sourceBranchId?: string) => {
      if (!currentComponent) {
        console.warn('Cannot create branch: no current component');
        return;
      }

      try {
        const updatedComponent = createBranchUtil(
          currentComponent,
          name,
          description,
          sourceBranchId
        );
        onComponentUpdate(updatedComponent);

        // Clear undo/redo since we're on a new branch
        onClearUndoRedo?.();
      } catch (error) {
        console.error('Failed to create branch:', error);
        throw error;
      }
    },
    [currentComponent, onComponentUpdate, onClearUndoRedo]
  );

  /**
   * Switch to a different branch
   * Saves current code to active branch before switching
   */
  const switchBranchHandler = useCallback(
    (branchId: string) => {
      if (!currentComponent) {
        console.warn('Cannot switch branch: no current component');
        return;
      }

      // Don't switch if already on this branch
      if (currentComponent.activeBranchId === branchId) {
        return;
      }

      try {
        // First, save any unsaved changes (code + conversation) to the current active branch
        const componentWithSavedState = syncToActiveBranch(currentComponent);

        // Then switch to the new branch
        const updatedComponent = switchBranchUtil(componentWithSavedState, branchId);
        onComponentUpdate(updatedComponent);

        // Clear undo/redo when switching branches
        onClearUndoRedo?.();
      } catch (error) {
        console.error('Failed to switch branch:', error);
        throw error;
      }
    },
    [currentComponent, onComponentUpdate, onClearUndoRedo]
  );

  /**
   * Delete a branch (cannot delete default branch)
   */
  const deleteBranchHandler = useCallback(
    (branchId: string) => {
      if (!currentComponent) {
        console.warn('Cannot delete branch: no current component');
        return;
      }

      try {
        const updatedComponent = deleteBranchUtil(currentComponent, branchId);
        onComponentUpdate(updatedComponent);

        // If we deleted the active branch, clear undo/redo
        if (currentComponent.activeBranchId === branchId) {
          onClearUndoRedo?.();
        }
      } catch (error) {
        console.error('Failed to delete branch:', error);
        throw error;
      }
    },
    [currentComponent, onComponentUpdate, onClearUndoRedo]
  );

  /**
   * Rename a branch
   */
  const renameBranchHandler = useCallback(
    (branchId: string, newName: string) => {
      if (!currentComponent) {
        console.warn('Cannot rename branch: no current component');
        return;
      }

      try {
        const updatedComponent = renameBranchUtil(currentComponent, branchId, newName);
        onComponentUpdate(updatedComponent);
      } catch (error) {
        console.error('Failed to rename branch:', error);
        throw error;
      }
    },
    [currentComponent, onComponentUpdate]
  );

  /**
   * Get a branch by its ID
   */
  const getBranchById = useCallback(
    (branchId: string): AppBranch | undefined => {
      return branches.find((b) => b.id === branchId);
    },
    [branches]
  );

  /**
   * Validate a branch name
   */
  const validateName = useCallback(
    (name: string): { valid: boolean; error?: string } => {
      return validateBranchName(name, branches);
    },
    [branches]
  );

  /**
   * Ensure the component has branches (migrate if needed)
   */
  const ensureBranches = useCallback(() => {
    if (!currentComponent) {
      return;
    }

    if (!hasBranches(currentComponent)) {
      const migratedComponent = migrateToBranchFormat(currentComponent);
      onComponentUpdate(migratedComponent);
    }
  }, [currentComponent, onComponentUpdate]);

  return {
    branches,
    activeBranch,
    defaultBranch,
    hasBranches: componentHasBranches,
    createBranch: createBranchHandler,
    switchBranch: switchBranchHandler,
    deleteBranch: deleteBranchHandler,
    renameBranch: renameBranchHandler,
    getBranchById,
    validateName,
    ensureBranches,
  };
}

export default useBranchManagement;
