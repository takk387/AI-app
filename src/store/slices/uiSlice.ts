import type { StateCreator } from 'zustand';
import type { ActiveTab, GeneratedComponent } from '@/types/aiBuilderTypes';
import type { PreviewMode } from '@/types/railway';
import type { AppState } from '../useAppStore';

type WebContainerStatus = 'idle' | 'booting' | 'ready' | 'error';

/**
 * UI state slice
 */
export interface UISlice {
  isClient: boolean;
  activeTab: ActiveTab;
  // Modal visibility states
  showLibrary: boolean;
  showDiffPreview: boolean;
  showApprovalModal: boolean;
  showDeploymentModal: boolean;
  showCompareModal: boolean;
  showConversationalWizard: boolean;
  showLayoutBuilder: boolean;
  showSettings: boolean;
  showAdvancedPhasedBuild: boolean;
  showQualityReport: boolean;
  showPerformanceReport: boolean;
  showNameAppModal: boolean;
  showShareModal: boolean;
  showExportModal: boolean;
  exportModalComponent: GeneratedComponent | null;
  showCreateBranchModal: boolean;
  // Search
  searchQuery: string;
  // Preview mode (WebContainers support)
  previewMode: PreviewMode;
  webContainerStatus: WebContainerStatus;
  // Concept Panel state
  isConceptPanelCollapsed: boolean;
  conceptPanelEditMode: boolean;
  // Actions
  setIsClient: (isClient: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setShowLibrary: (show: boolean) => void;
  setShowDiffPreview: (show: boolean) => void;
  setShowApprovalModal: (show: boolean) => void;
  setShowDeploymentModal: (show: boolean) => void;
  setShowCompareModal: (show: boolean) => void;
  setShowConversationalWizard: (show: boolean) => void;
  setShowLayoutBuilder: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowAdvancedPhasedBuild: (show: boolean) => void;
  setShowQualityReport: (show: boolean) => void;
  setShowPerformanceReport: (show: boolean) => void;
  setShowNameAppModal: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setExportModalComponent: (component: GeneratedComponent | null) => void;
  setShowCreateBranchModal: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setWebContainerStatus: (status: WebContainerStatus) => void;
  setConceptPanelCollapsed: (collapsed: boolean) => void;
  setConceptPanelEditMode: (editMode: boolean) => void;
}

export const createUISlice: StateCreator<AppState, [['zustand/immer', never]], [], UISlice> = (
  set
) => ({
  isClient: false,
  activeTab: 'chat',
  showLibrary: false,
  showDiffPreview: false,
  showApprovalModal: false,
  showDeploymentModal: false,
  showCompareModal: false,
  showConversationalWizard: false,
  showLayoutBuilder: false,
  showSettings: false,
  showAdvancedPhasedBuild: false,
  showQualityReport: false,
  showPerformanceReport: false,
  showNameAppModal: false,
  showShareModal: false,
  showExportModal: false,
  exportModalComponent: null as GeneratedComponent | null,
  showCreateBranchModal: false,
  searchQuery: '',
  // Preview mode (browser = esbuild-wasm, railway = full-stack)
  previewMode: 'browser',
  webContainerStatus: 'idle',
  // Concept Panel state
  isConceptPanelCollapsed: false,
  conceptPanelEditMode: false,

  setIsClient: (isClient) => set({ isClient }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowLibrary: (show) => set({ showLibrary: show }),
  setShowDiffPreview: (show) => set({ showDiffPreview: show }),
  setShowApprovalModal: (show) => set({ showApprovalModal: show }),
  setShowDeploymentModal: (show) => set({ showDeploymentModal: show }),
  setShowCompareModal: (show) => set({ showCompareModal: show }),
  setShowConversationalWizard: (show) => set({ showConversationalWizard: show }),
  setShowLayoutBuilder: (show) => set({ showLayoutBuilder: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAdvancedPhasedBuild: (show) => set({ showAdvancedPhasedBuild: show }),
  setShowQualityReport: (show) => set({ showQualityReport: show }),
  setShowPerformanceReport: (show) => set({ showPerformanceReport: show }),
  setShowNameAppModal: (show) => set({ showNameAppModal: show }),
  setShowShareModal: (show) => set({ showShareModal: show }),
  setShowExportModal: (show) => set({ showExportModal: show }),
  setExportModalComponent: (component) => set({ exportModalComponent: component }),
  setShowCreateBranchModal: (show) => set({ showCreateBranchModal: show }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setWebContainerStatus: (status) => set({ webContainerStatus: status }),
  setConceptPanelCollapsed: (collapsed) => set({ isConceptPanelCollapsed: collapsed }),
  setConceptPanelEditMode: (editMode) => set({ conceptPanelEditMode: editMode }),
});
