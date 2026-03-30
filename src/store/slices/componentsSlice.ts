import type { StateCreator } from 'zustand';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import type { AppState } from '../useAppStore';

/**
 * Components slice state
 */
export interface ComponentsSlice {
  components: GeneratedComponent[];
  currentComponent: GeneratedComponent | null;
  loadingApps: boolean;
  dbSyncError: string | null;
  // Actions
  setComponents: (
    components: GeneratedComponent[] | ((prev: GeneratedComponent[]) => GeneratedComponent[])
  ) => void;
  setCurrentComponent: (component: GeneratedComponent | null) => void;
  setLoadingApps: (loading: boolean) => void;
  setDbSyncError: (error: string | null) => void;
  addComponent: (component: GeneratedComponent) => void;
  updateComponent: (id: string, updates: Partial<GeneratedComponent>) => void;
  removeComponent: (id: string) => void;
}

export const createComponentsSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  ComponentsSlice
> = (set) => ({
  components: [] as GeneratedComponent[],
  currentComponent: null as GeneratedComponent | null,
  loadingApps: true,
  dbSyncError: null as string | null,

  setComponents: (components) =>
    set((state) => ({
      components: typeof components === 'function' ? components(state.components) : components,
    })),
  setCurrentComponent: (component) => set({ currentComponent: component }),
  setLoadingApps: (loading) => set({ loadingApps: loading }),
  setDbSyncError: (error) => set({ dbSyncError: error }),
  addComponent: (component) =>
    set((state) => ({
      components: [...state.components, component],
    })),
  updateComponent: (id, updates) =>
    set((state) => ({
      components: state.components.map((comp) => (comp.id === id ? { ...comp, ...updates } : comp)),
    })),
  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((comp) => comp.id !== id),
    })),
});
