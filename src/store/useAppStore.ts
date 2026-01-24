/**
 * Zustand Store for MainBuilderView State Management
 *
 * This store mirrors all useState calls from MainBuilderView.tsx for modular architecture.
 * It uses Zustand with:
 * - Immer middleware for safe immutable state updates (allows direct mutations in reducers)
 * - Devtools middleware for debugging in development
 * - Shallow comparison in selectors to prevent unnecessary re-renders
 *
 * Slices:
 * - Chat: messages, userInput, isGenerating, generationProgress
 * - Mode: currentMode (PLAN/ACT), lastUserRequest
 * - Components: components array, currentComponent, loadingApps, dbSyncError
 * - Version Control: undoStack, redoStack, showVersionHistory
 * - UI State: activeTab, layoutMode, all modal visibility states
 * - Data: pendingChange, pendingDiff, deploymentInstructions, etc.
 * - File Storage: contentTab, storageFiles, loadingFiles, etc.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import type {
  ChatMessage,
  AppVersion,
  GeneratedComponent,
  PendingChange,
  PendingDiff,
  StagePlan,
  ActiveTab,
  ContentTab,
  BuilderMode,
  QualityReport,
  PerformanceReport,
  CurrentStagePlan,
  CompareVersions,
} from '@/types/aiBuilderTypes';
import type { AppConcept, ImplementationPlan } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type { PhaseId } from '@/types/buildPhases';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { FileMetadata, StorageStats } from '@/types/storage';
import type { DeploymentInstructions } from '@/utils/exportApp';
import type { ProjectDocumentation } from '@/types/projectDocumentation';
import type { PreviewMode } from '@/types/railway';

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

/**
 * Chat slice state
 */
interface ChatSlice {
  chatMessages: ChatMessage[];
  userInput: string;
  isGenerating: boolean;
  generationProgress: string;
  // Actions
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setUserInput: (input: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
}

/**
 * Mode slice state
 */
interface ModeSlice {
  currentMode: BuilderMode;
  lastUserRequest: string;
  // Actions
  setCurrentMode: (mode: BuilderMode) => void;
  setLastUserRequest: (request: string) => void;
}

/**
 * Components slice state
 */
interface ComponentsSlice {
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

/**
 * Version control slice state
 */
interface VersionControlSlice {
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

// Note: PreviewMode is imported from @/types/railway
type WebContainerStatus = 'idle' | 'booting' | 'ready' | 'error';

/**
 * UI state slice
 */
interface UISlice {
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

/**
 * Data slice state
 */
interface DataSlice {
  pendingChange: PendingChange | null;
  pendingDiff: PendingDiff | null;
  deploymentInstructions: DeploymentInstructions | null;
  exportingApp: GeneratedComponent | null;
  compareVersions: CompareVersions;
  currentStagePlan: CurrentStagePlan | null;
  newAppStagePlan: StagePlan | null;
  appConcept: AppConcept | null;
  implementationPlan: ImplementationPlan | null;
  qualityReport: QualityReport | null;
  performanceReport: PerformanceReport | null;
  // Advanced phase build
  selectedPhaseId: PhaseId | null;
  isValidating: boolean;
  // Image upload
  uploadedImage: string | null;
  // Layout Builder (Gemini 3 system uses LayoutManifest)
  currentLayoutManifest: LayoutManifest | null;
  savedLayoutManifests: LayoutManifest[];
  // Dynamic Phase Plan
  dynamicPhasePlan: DynamicPhasePlan | null;
  // Actions
  setPendingChange: (change: PendingChange | null) => void;
  setPendingDiff: (diff: PendingDiff | null) => void;
  setDeploymentInstructions: (instructions: DeploymentInstructions | null) => void;
  setExportingApp: (app: GeneratedComponent | null) => void;
  setCompareVersions: (versions: CompareVersions) => void;
  setCurrentStagePlan: (plan: CurrentStagePlan | null) => void;
  setNewAppStagePlan: (
    plan: StagePlan | null | ((prev: StagePlan | null) => StagePlan | null)
  ) => void;
  setAppConcept: (concept: AppConcept | null) => void;
  setImplementationPlan: (plan: ImplementationPlan | null) => void;
  setQualityReport: (report: QualityReport | null) => void;
  setPerformanceReport: (report: PerformanceReport | null) => void;
  setSelectedPhaseId: (phaseId: PhaseId | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  setUploadedImage: (image: string | null) => void;
  // Layout Builder actions (Gemini 3 system uses LayoutManifest)
  setCurrentLayoutManifest: (manifest: LayoutManifest | null) => void;
  setSavedLayoutManifests: (manifests: LayoutManifest[]) => void;
  addSavedLayoutManifest: (manifest: LayoutManifest) => void;
  removeSavedLayoutManifest: (id: string) => void;
  // App Concept field updates
  updateAppConceptField: (path: string, value: unknown) => void;
  // Dynamic Phase Plan action
  setDynamicPhasePlan: (plan: DynamicPhasePlan | null) => void;
}

/**
 * Documentation slice state for Project Documentation System
 */
type DocumentationPanelTab = 'concept' | 'design' | 'plan' | 'progress';

interface DocumentationSlice {
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

/**
 * File storage slice state
 */
interface FileStorageSlice {
  contentTab: ContentTab;
  storageFiles: FileMetadata[];
  loadingFiles: boolean;
  selectedFiles: Set<string>;
  fileSearchQuery: string;
  fileTypeFilter: string;
  fileSortBy: 'name' | 'size' | 'created_at' | 'updated_at';
  fileSortOrder: 'asc' | 'desc';
  storageStats: StorageStats | null;
  uploadingFiles: Set<string>;
  deletingFiles: Set<string>;
  // Actions
  setContentTab: (tab: ContentTab) => void;
  setStorageFiles: (files: FileMetadata[]) => void;
  setLoadingFiles: (loading: boolean) => void;
  setSelectedFiles: (files: Set<string>) => void;
  setFileSearchQuery: (query: string) => void;
  setFileTypeFilter: (filter: string) => void;
  setFileSortBy: (sortBy: 'name' | 'size' | 'created_at' | 'updated_at') => void;
  setFileSortOrder: (order: 'asc' | 'desc') => void;
  setStorageStats: (stats: StorageStats | null) => void;
  setUploadingFiles: (files: Set<string>) => void;
  setDeletingFiles: (files: Set<string>) => void;
  toggleFileSelection: (fileId: string) => void;
  clearFileSelection: () => void;
}

/**
 * Complete store state combining all slices
 */
export interface AppState
  extends
    ChatSlice,
    ModeSlice,
    ComponentsSlice,
    VersionControlSlice,
    UISlice,
    DataSlice,
    DocumentationSlice,
    FileStorageSlice {}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Main Zustand store with all slices
 */
export const useAppStore = create<AppState>()(
  devtools(
    immer((set, _get) => ({
      // ========================================================================
      // CHAT SLICE
      // ========================================================================
      chatMessages: [] as ChatMessage[],
      userInput: '',
      isGenerating: false,
      generationProgress: '',

      setChatMessages: (messages) =>
        set((state) => ({
          chatMessages: typeof messages === 'function' ? messages(state.chatMessages) : messages,
        })),
      setUserInput: (input) => set({ userInput: input }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      clearChatMessages: () => set({ chatMessages: [] }),

      // ========================================================================
      // MODE SLICE
      // ========================================================================
      currentMode: 'PLAN',
      lastUserRequest: '',

      setCurrentMode: (mode) => set({ currentMode: mode }),
      setLastUserRequest: (request) => set({ lastUserRequest: request }),

      // ========================================================================
      // COMPONENTS SLICE
      // ========================================================================
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
          components: state.components.map((comp) =>
            comp.id === id ? { ...comp, ...updates } : comp
          ),
        })),
      removeComponent: (id) =>
        set((state) => ({
          components: state.components.filter((comp) => comp.id !== id),
        })),

      // ========================================================================
      // VERSION CONTROL SLICE
      // ========================================================================
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

      // ========================================================================
      // UI SLICE
      // ========================================================================
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

      // ========================================================================
      // DATA SLICE
      // ========================================================================
      pendingChange: null as PendingChange | null,
      pendingDiff: null as PendingDiff | null,
      deploymentInstructions: null as DeploymentInstructions | null,
      exportingApp: null as GeneratedComponent | null,
      compareVersions: { v1: null, v2: null } as CompareVersions,
      currentStagePlan: null as CurrentStagePlan | null,
      newAppStagePlan: null as StagePlan | null,
      appConcept: null as AppConcept | null,
      implementationPlan: null as ImplementationPlan | null,
      qualityReport: null as QualityReport | null,
      performanceReport: null as PerformanceReport | null,
      selectedPhaseId: null as PhaseId | null,
      isValidating: false,
      uploadedImage: null as string | null,
      currentLayoutManifest: null as LayoutManifest | null,
      savedLayoutManifests: [] as LayoutManifest[],
      dynamicPhasePlan: null as DynamicPhasePlan | null,

      setPendingChange: (change) => set({ pendingChange: change }),
      setPendingDiff: (diff) => set({ pendingDiff: diff }),
      setDeploymentInstructions: (instructions) => set({ deploymentInstructions: instructions }),
      setExportingApp: (app) => set({ exportingApp: app }),
      setCompareVersions: (versions) => set({ compareVersions: versions }),
      setCurrentStagePlan: (plan) => set({ currentStagePlan: plan }),
      setNewAppStagePlan: (plan) =>
        set((state) => ({
          newAppStagePlan: typeof plan === 'function' ? plan(state.newAppStagePlan) : plan,
        })),
      setAppConcept: (concept) => set({ appConcept: concept }),
      setImplementationPlan: (plan) => set({ implementationPlan: plan }),
      setQualityReport: (report) => set({ qualityReport: report }),
      setPerformanceReport: (report) => set({ performanceReport: report }),
      setSelectedPhaseId: (phaseId) => set({ selectedPhaseId: phaseId }),
      setIsValidating: (isValidating) => set({ isValidating }),
      setUploadedImage: (image) => set({ uploadedImage: image }),
      setCurrentLayoutManifest: (manifest) => set({ currentLayoutManifest: manifest }),
      setSavedLayoutManifests: (manifests) => set({ savedLayoutManifests: manifests }),
      addSavedLayoutManifest: (manifest) =>
        set((state) => ({
          savedLayoutManifests: [...state.savedLayoutManifests, manifest],
        })),
      removeSavedLayoutManifest: (id) =>
        set((state) => ({
          savedLayoutManifests: state.savedLayoutManifests.filter((m) => m.id !== id),
        })),
      updateAppConceptField: (path, value) =>
        set((state) => {
          if (!state.appConcept) return state;
          const keys = path.split('.');
          const updated = { ...state.appConcept };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let current: any = updated;
          for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
          }
          current[keys[keys.length - 1]] = value;
          // Update timestamp to trigger auto-capture in documentation
          updated.updatedAt = new Date().toISOString();
          return { appConcept: updated };
        }),
      setDynamicPhasePlan: (plan) => set({ dynamicPhasePlan: plan }),

      // ========================================================================
      // DOCUMENTATION SLICE
      // ========================================================================
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

      // ========================================================================
      // FILE STORAGE SLICE
      // ========================================================================
      contentTab: 'apps',
      storageFiles: [] as FileMetadata[],
      loadingFiles: false,
      selectedFiles: new Set<string>(),
      fileSearchQuery: '',
      fileTypeFilter: 'all',
      fileSortBy: 'created_at',
      fileSortOrder: 'desc',
      storageStats: null as StorageStats | null,
      uploadingFiles: new Set<string>(),
      deletingFiles: new Set<string>(),

      setContentTab: (tab) => set({ contentTab: tab }),
      setStorageFiles: (files) => set({ storageFiles: files }),
      setLoadingFiles: (loading) => set({ loadingFiles: loading }),
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
      setFileTypeFilter: (filter) => set({ fileTypeFilter: filter }),
      setFileSortBy: (sortBy) => set({ fileSortBy: sortBy }),
      setFileSortOrder: (order) => set({ fileSortOrder: order }),
      setStorageStats: (stats) => set({ storageStats: stats }),
      setUploadingFiles: (files) => set({ uploadingFiles: files }),
      setDeletingFiles: (files) => set({ deletingFiles: files }),
      toggleFileSelection: (fileId) =>
        set((state) => {
          const newSelection = new Set(state.selectedFiles);
          if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
          } else {
            newSelection.add(fileId);
          }
          return { selectedFiles: newSelection };
        }),
      clearFileSelection: () => set({ selectedFiles: new Set<string>() }),
    })),
    {
      name: 'app-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// ============================================================================

/**
 * Select chat-related state (uses shallow comparison to prevent unnecessary re-renders)
 */
export const useChatState = () =>
  useAppStore(
    useShallow((state) => ({
      chatMessages: state.chatMessages,
      userInput: state.userInput,
      isGenerating: state.isGenerating,
      generationProgress: state.generationProgress,
    }))
  );

/**
 * Select mode-related state
 */
export const useModeState = () =>
  useAppStore(
    useShallow((state) => ({
      currentMode: state.currentMode,
      lastUserRequest: state.lastUserRequest,
    }))
  );

/**
 * Select component-related state
 */
export const useComponentsState = () =>
  useAppStore(
    useShallow((state) => ({
      components: state.components,
      currentComponent: state.currentComponent,
      loadingApps: state.loadingApps,
      dbSyncError: state.dbSyncError,
    }))
  );

/**
 * Select version control state
 */
export const useVersionControlState = () =>
  useAppStore(
    useShallow((state) => ({
      undoStack: state.undoStack,
      redoStack: state.redoStack,
      showVersionHistory: state.showVersionHistory,
    }))
  );

/**
 * Select UI state
 */
export const useUIState = () =>
  useAppStore(
    useShallow((state) => ({
      isClient: state.isClient,
      activeTab: state.activeTab,
      showLibrary: state.showLibrary,
      showDiffPreview: state.showDiffPreview,
      showApprovalModal: state.showApprovalModal,
      showDeploymentModal: state.showDeploymentModal,
      showCompareModal: state.showCompareModal,
      showConversationalWizard: state.showConversationalWizard,
      showLayoutBuilder: state.showLayoutBuilder,
      showSettings: state.showSettings,
      showAdvancedPhasedBuild: state.showAdvancedPhasedBuild,
      showQualityReport: state.showQualityReport,
      showPerformanceReport: state.showPerformanceReport,
      showNameAppModal: state.showNameAppModal,
      searchQuery: state.searchQuery,
    }))
  );

/**
 * Select layout builder state
 */
export const useLayoutBuilderState = () =>
  useAppStore(
    useShallow((state) => ({
      showLayoutBuilder: state.showLayoutBuilder,
      currentLayoutManifest: state.currentLayoutManifest,
      savedLayoutManifests: state.savedLayoutManifests,
    }))
  );

/**
 * Select file storage state
 */
export const useFileStorageState = () =>
  useAppStore(
    useShallow((state) => ({
      contentTab: state.contentTab,
      storageFiles: state.storageFiles,
      loadingFiles: state.loadingFiles,
      selectedFiles: state.selectedFiles,
      fileSearchQuery: state.fileSearchQuery,
      fileTypeFilter: state.fileTypeFilter,
      fileSortBy: state.fileSortBy,
      fileSortOrder: state.fileSortOrder,
      storageStats: state.storageStats,
      uploadingFiles: state.uploadingFiles,
      deletingFiles: state.deletingFiles,
    }))
  );

/**
 * Select documentation state
 */
export const useDocumentationState = () =>
  useAppStore(
    useShallow((state) => ({
      currentDocumentation: state.currentDocumentation,
      isLoadingDocumentation: state.isLoadingDocumentation,
      isSavingDocumentation: state.isSavingDocumentation,
      showDocumentationPanel: state.showDocumentationPanel,
      documentationPanelTab: state.documentationPanelTab,
    }))
  );

/**
 * Select concept panel state
 */
export const useConceptPanelState = () =>
  useAppStore(
    useShallow((state) => ({
      appConcept: state.appConcept,
      isConceptPanelCollapsed: state.isConceptPanelCollapsed,
      conceptPanelEditMode: state.conceptPanelEditMode,
      currentMode: state.currentMode,
    }))
  );

export default useAppStore;
