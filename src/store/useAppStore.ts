/**
 * Zustand Store for AIBuilder State Management
 * 
 * This store mirrors all useState calls from AIBuilder.tsx for modular architecture.
 * It uses Zustand with devtools middleware for debugging.
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
import type { PhaseId } from '@/types/buildPhases';
import type { FileMetadata, StorageStats } from '@/types/storage';
import type { DeploymentInstructions } from '@/utils/exportApp';

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
  setComponents: (components: GeneratedComponent[] | ((prev: GeneratedComponent[]) => GeneratedComponent[])) => void;
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
  showNewAppStagingModal: boolean;
  showConceptWizard: boolean;
  showConversationalWizard: boolean;
  showSettings: boolean;
  showAdvancedPhasedBuild: boolean;
  showQualityReport: boolean;
  showPerformanceReport: boolean;
  // Search
  searchQuery: string;
  // Actions
  setIsClient: (isClient: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setShowLibrary: (show: boolean) => void;
  setShowDiffPreview: (show: boolean) => void;
  setShowApprovalModal: (show: boolean) => void;
  setShowDeploymentModal: (show: boolean) => void;
  setShowCompareModal: (show: boolean) => void;
  setShowNewAppStagingModal: (show: boolean) => void;
  setShowConceptWizard: (show: boolean) => void;
  setShowConversationalWizard: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowAdvancedPhasedBuild: (show: boolean) => void;
  setShowQualityReport: (show: boolean) => void;
  setShowPerformanceReport: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
}

/**
 * Data slice state
 */
interface DataSlice {
  pendingChange: PendingChange | null;
  pendingDiff: PendingDiff | null;
  pendingNewAppRequest: string;
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
  // Actions
  setPendingChange: (change: PendingChange | null) => void;
  setPendingDiff: (diff: PendingDiff | null) => void;
  setPendingNewAppRequest: (request: string) => void;
  setDeploymentInstructions: (instructions: DeploymentInstructions | null) => void;
  setExportingApp: (app: GeneratedComponent | null) => void;
  setCompareVersions: (versions: CompareVersions) => void;
  setCurrentStagePlan: (plan: CurrentStagePlan | null) => void;
  setNewAppStagePlan: (plan: StagePlan | null | ((prev: StagePlan | null) => StagePlan | null)) => void;
  setAppConcept: (concept: AppConcept | null) => void;
  setImplementationPlan: (plan: ImplementationPlan | null) => void;
  setQualityReport: (report: QualityReport | null) => void;
  setPerformanceReport: (report: PerformanceReport | null) => void;
  setSelectedPhaseId: (phaseId: PhaseId | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  setUploadedImage: (image: string | null) => void;
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
export interface AppState extends 
  ChatSlice, 
  ModeSlice, 
  ComponentsSlice, 
  VersionControlSlice, 
  UISlice, 
  DataSlice, 
  FileStorageSlice {}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Main Zustand store with all slices
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // ========================================================================
      // CHAT SLICE
      // ========================================================================
      chatMessages: [],
      userInput: '',
      isGenerating: false,
      generationProgress: '',
      
      setChatMessages: (messages) => set((state) => ({
        chatMessages: typeof messages === 'function' ? messages(state.chatMessages) : messages
      })),
      setUserInput: (input) => set({ userInput: input }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message]
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
      components: [],
      currentComponent: null,
      loadingApps: true,
      dbSyncError: null,
      
      setComponents: (components) => set((state) => ({
        components: typeof components === 'function' ? components(state.components) : components
      })),
      setCurrentComponent: (component) => set({ currentComponent: component }),
      setLoadingApps: (loading) => set({ loadingApps: loading }),
      setDbSyncError: (error) => set({ dbSyncError: error }),
      addComponent: (component) => set((state) => ({
        components: [...state.components, component]
      })),
      updateComponent: (id, updates) => set((state) => ({
        components: state.components.map(comp => 
          comp.id === id ? { ...comp, ...updates } : comp
        )
      })),
      removeComponent: (id) => set((state) => ({
        components: state.components.filter(comp => comp.id !== id)
      })),

      // ========================================================================
      // VERSION CONTROL SLICE
      // ========================================================================
      undoStack: [],
      redoStack: [],
      showVersionHistory: false,
      
      setUndoStack: (stack) => set((state) => ({
        undoStack: typeof stack === 'function' ? stack(state.undoStack) : stack
      })),
      setRedoStack: (stack) => set((state) => ({
        redoStack: typeof stack === 'function' ? stack(state.redoStack) : stack
      })),
      setShowVersionHistory: (show) => set({ showVersionHistory: show }),
      pushToUndoStack: (version) => set((state) => ({
        undoStack: [...state.undoStack, version]
      })),
      pushToRedoStack: (version) => set((state) => ({
        redoStack: [...state.redoStack, version]
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
      showNewAppStagingModal: false,
      showConceptWizard: false,
      showConversationalWizard: false,
      showSettings: false,
      showAdvancedPhasedBuild: false,
      showQualityReport: false,
      showPerformanceReport: false,
      searchQuery: '',
      
      setIsClient: (isClient) => set({ isClient }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowLibrary: (show) => set({ showLibrary: show }),
      setShowDiffPreview: (show) => set({ showDiffPreview: show }),
      setShowApprovalModal: (show) => set({ showApprovalModal: show }),
      setShowDeploymentModal: (show) => set({ showDeploymentModal: show }),
      setShowCompareModal: (show) => set({ showCompareModal: show }),
      setShowNewAppStagingModal: (show) => set({ showNewAppStagingModal: show }),
      setShowConceptWizard: (show) => set({ showConceptWizard: show }),
      setShowConversationalWizard: (show) => set({ showConversationalWizard: show }),
      setShowSettings: (show) => set({ showSettings: show }),
      setShowAdvancedPhasedBuild: (show) => set({ showAdvancedPhasedBuild: show }),
      setShowQualityReport: (show) => set({ showQualityReport: show }),
      setShowPerformanceReport: (show) => set({ showPerformanceReport: show }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // ========================================================================
      // DATA SLICE
      // ========================================================================
      pendingChange: null,
      pendingDiff: null,
      pendingNewAppRequest: '',
      deploymentInstructions: null,
      exportingApp: null,
      compareVersions: { v1: null, v2: null },
      currentStagePlan: null,
      newAppStagePlan: null,
      appConcept: null,
      implementationPlan: null,
      qualityReport: null,
      performanceReport: null,
      selectedPhaseId: null,
      isValidating: false,
      uploadedImage: null,
      
      setPendingChange: (change) => set({ pendingChange: change }),
      setPendingDiff: (diff) => set({ pendingDiff: diff }),
      setPendingNewAppRequest: (request) => set({ pendingNewAppRequest: request }),
      setDeploymentInstructions: (instructions) => set({ deploymentInstructions: instructions }),
      setExportingApp: (app) => set({ exportingApp: app }),
      setCompareVersions: (versions) => set({ compareVersions: versions }),
      setCurrentStagePlan: (plan) => set({ currentStagePlan: plan }),
      setNewAppStagePlan: (plan) => set((state) => ({
        newAppStagePlan: typeof plan === 'function' ? plan(state.newAppStagePlan) : plan
      })),
      setAppConcept: (concept) => set({ appConcept: concept }),
      setImplementationPlan: (plan) => set({ implementationPlan: plan }),
      setQualityReport: (report) => set({ qualityReport: report }),
      setPerformanceReport: (report) => set({ performanceReport: report }),
      setSelectedPhaseId: (phaseId) => set({ selectedPhaseId: phaseId }),
      setIsValidating: (isValidating) => set({ isValidating }),
      setUploadedImage: (image) => set({ uploadedImage: image }),

      // ========================================================================
      // FILE STORAGE SLICE
      // ========================================================================
      contentTab: 'apps',
      storageFiles: [],
      loadingFiles: false,
      selectedFiles: new Set<string>(),
      fileSearchQuery: '',
      fileTypeFilter: 'all',
      fileSortBy: 'created_at',
      fileSortOrder: 'desc',
      storageStats: null,
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
      toggleFileSelection: (fileId) => set((state) => {
        const newSelection = new Set(state.selectedFiles);
        if (newSelection.has(fileId)) {
          newSelection.delete(fileId);
        } else {
          newSelection.add(fileId);
        }
        return { selectedFiles: newSelection };
      }),
      clearFileSelection: () => set({ selectedFiles: new Set<string>() }),
    }),
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
 * Select chat-related state
 */
export const useChatState = () => useAppStore((state) => ({
  chatMessages: state.chatMessages,
  userInput: state.userInput,
  isGenerating: state.isGenerating,
  generationProgress: state.generationProgress,
}));

/**
 * Select mode-related state
 */
export const useModeState = () => useAppStore((state) => ({
  currentMode: state.currentMode,
  lastUserRequest: state.lastUserRequest,
}));

/**
 * Select component-related state
 */
export const useComponentsState = () => useAppStore((state) => ({
  components: state.components,
  currentComponent: state.currentComponent,
  loadingApps: state.loadingApps,
  dbSyncError: state.dbSyncError,
}));

/**
 * Select version control state
 */
export const useVersionControlState = () => useAppStore((state) => ({
  undoStack: state.undoStack,
  redoStack: state.redoStack,
  showVersionHistory: state.showVersionHistory,
}));

/**
 * Select UI state
 */
export const useUIState = () => useAppStore((state) => ({
  isClient: state.isClient,
  activeTab: state.activeTab,
  showLibrary: state.showLibrary,
  showDiffPreview: state.showDiffPreview,
  showApprovalModal: state.showApprovalModal,
  showDeploymentModal: state.showDeploymentModal,
  showCompareModal: state.showCompareModal,
  showNewAppStagingModal: state.showNewAppStagingModal,
  showConceptWizard: state.showConceptWizard,
  showConversationalWizard: state.showConversationalWizard,
  showSettings: state.showSettings,
  showAdvancedPhasedBuild: state.showAdvancedPhasedBuild,
  showQualityReport: state.showQualityReport,
  showPerformanceReport: state.showPerformanceReport,
  searchQuery: state.searchQuery,
}));

/**
 * Select file storage state
 */
export const useFileStorageState = () => useAppStore((state) => ({
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
}));

export default useAppStore;
