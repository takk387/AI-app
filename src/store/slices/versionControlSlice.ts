import type { StateCreator } from 'zustand';
import type { AppVersion } from '@/types/aiBuilderTypes';
import type { AppState } from '../useAppStore';

/**
 * Version control slice state
 */
export interface VersionControlSlice {
  undoStack: AppVersion[];
  redoStack: AppVersion[];
  showVersionHistory: boolean;
  // Actions
  setUndoStack: (stack: AppVersion[] | ((prev: AppVersion[]) => AppVersion[])) => void;
  setRedoStack: (stack: AppVersion[] | ((prev: AppVersion[]) => AppVersion[])) => void;
  setShowVersionHistory: (show: boolean) => void;
  pushToUndoStack: (version: AppVersion) => void;
  pushToRedoStack: (version: AppVersion) => void;
  clearRedoStack: () => void;
}

export const createVersionControlSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  VersionControlSlice
> = (set) => ({
  undoStack: [] as AppVersion[],
  redoStack: [] as AppVersion[],
  showVersionHistory: false,

  setUndoStack: (stack) =>
    set((state) => ({
      undoStack: typeof stack === 'function' ? stack(state.undoStack) : stack,
    })),
  setRedoStack: (stack) =>
    set((state) => ({
      redoStack: typeof stack === 'function' ? stack(state.redoStack) : stack,
    })),
  setShowVersionHistory: (show) => set({ showVersionHistory: show }),
  pushToUndoStack: (version) =>
    set((state) => ({
      undoStack: [...state.undoStack, version],
    })),
  pushToRedoStack: (version) =>
    set((state) => ({
      redoStack: [...state.redoStack, version],
    })),
  clearRedoStack: () => set({ redoStack: [] }),
});
