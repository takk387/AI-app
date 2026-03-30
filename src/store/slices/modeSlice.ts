import type { StateCreator } from 'zustand';
import type { BuilderMode } from '@/types/aiBuilderTypes';
import type { AppState } from '../useAppStore';

/**
 * Mode slice state
 */
export interface ModeSlice {
  currentMode: BuilderMode;
  lastUserRequest: string;
  // Actions
  setCurrentMode: (mode: BuilderMode) => void;
  setLastUserRequest: (request: string) => void;
}

export const createModeSlice: StateCreator<AppState, [['zustand/immer', never]], [], ModeSlice> = (
  set
) => ({
  currentMode: 'ACT',
  lastUserRequest: '',

  setCurrentMode: (mode) => set({ currentMode: mode }),
  setLastUserRequest: (request) => set({ lastUserRequest: request }),
});
