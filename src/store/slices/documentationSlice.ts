import type { StateCreator } from 'zustand';
import type { ProjectDocumentation } from '@/types/projectDocumentation';
import type { AppState } from '../useAppStore';

/**
 * Documentation slice state for Project Documentation System
 */
export type DocumentationPanelTab = 'concept' | 'design' | 'plan' | 'progress';

export interface DocumentationSlice {
  // Current documentation
  currentDocumentation: ProjectDocumentation | null;
  // Loading states
  isLoadingDocumentation: boolean;
  isSavingDocumentation: boolean;
  // Panel state
  showDocumentationPanel: boolean;
  documentationPanelTab: DocumentationPanelTab;
  // App identification
  currentAppId: string | null; // The current app being worked on (set when wizard completes)
  // Build lifecycle - locked appId during build
  buildingAppId: string | null;
  // Actions
  setCurrentDocumentation: (doc: ProjectDocumentation | null) => void;
  setIsLoadingDocumentation: (loading: boolean) => void;
  setIsSavingDocumentation: (saving: boolean) => void;
  setShowDocumentationPanel: (show: boolean) => void;
  setDocumentationPanelTab: (tab: DocumentationPanelTab) => void;
  setCurrentAppId: (appId: string | null) => void;
  setBuildingAppId: (appId: string | null) => void;
}

export const createDocumentationSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  DocumentationSlice
> = (set) => ({
  currentDocumentation: null as ProjectDocumentation | null,
  isLoadingDocumentation: false,
  isSavingDocumentation: false,
  showDocumentationPanel: false,
  documentationPanelTab: 'concept',
  currentAppId: null as string | null,
  buildingAppId: null as string | null,

  setCurrentDocumentation: (doc) => set({ currentDocumentation: doc }),
  setIsLoadingDocumentation: (loading) => set({ isLoadingDocumentation: loading }),
  setIsSavingDocumentation: (saving) => set({ isSavingDocumentation: saving }),
  setShowDocumentationPanel: (show) => set({ showDocumentationPanel: show }),
  setDocumentationPanelTab: (tab) => set({ documentationPanelTab: tab }),
  setCurrentAppId: (appId) => set({ currentAppId: appId }),
  setBuildingAppId: (appId) => set({ buildingAppId: appId }),
});
