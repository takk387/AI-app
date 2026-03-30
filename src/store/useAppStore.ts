/**
 * Zustand Store for MainBuilderView State Management
 *
 * This store mirrors all useState calls from MainBuilderView.tsx for modular architecture.
 * It uses Zustand with:
 * - Persist middleware for localStorage persistence (workflow-critical data survives page refresh)
 * - Immer middleware for safe immutable state updates (allows direct mutations in reducers)
 * - Devtools middleware for debugging in development
 * - Shallow comparison in selectors to prevent unnecessary re-renders
 *
 * Persisted data (survives page refresh):
 * - appConcept, dynamicPhasePlan, currentLayoutManifest, currentAppId, currentDesignSpec
 * - components, currentComponent (for builder to work after refresh)
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
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';

// Slice creators
import { createChatSlice } from './slices/chatSlice';
import { createModeSlice } from './slices/modeSlice';
import { createComponentsSlice } from './slices/componentsSlice';
import { createVersionControlSlice } from './slices/versionControlSlice';
import { createUISlice } from './slices/uiSlice';
import { createDataSlice } from './slices/dataSlice';
import { createDocumentationSlice } from './slices/documentationSlice';
import { createFileStorageSlice } from './slices/fileStorageSlice';
import { createDualPlanningSlice } from './slices/dualPlanningSlice';

// Slice interfaces (re-exported for consumers)
import type { ChatSlice } from './slices/chatSlice';
import type { ModeSlice } from './slices/modeSlice';
import type { ComponentsSlice } from './slices/componentsSlice';
import type { VersionControlSlice } from './slices/versionControlSlice';
import type { UISlice } from './slices/uiSlice';
import type { DataSlice } from './slices/dataSlice';
import type { DocumentationSlice } from './slices/documentationSlice';
import type { FileStorageSlice } from './slices/fileStorageSlice';
import type { DualPlanningSlice } from './slices/dualPlanningSlice';

// Re-export slice interfaces for external use
export type {
  ChatSlice,
  ModeSlice,
  ComponentsSlice,
  VersionControlSlice,
  UISlice,
  DataSlice,
  DocumentationSlice,
  FileStorageSlice,
  DualPlanningSlice,
};

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

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
    FileStorageSlice,
    DualPlanningSlice {}

// ============================================================================
// PERSISTENCE CONFIGURATION
// ============================================================================

/**
 * Fields persisted to localStorage. Adding/removing a field here automatically
 * updates the `partialize` function below — no manual sync needed.
 *
 * TypeScript enforces that every entry is a valid key of AppState at compile time
 * via `satisfies`. If you rename or remove a store field, this will fail to compile.
 *
 * Ownership (which slice provides each field):
 *   ModeSlice:          currentMode
 *   DataSlice:          appConcept, dynamicPhasePlan, currentLayoutManifest,
 *                       currentDesignSpec, isReviewed, buildSettings, layoutThumbnail,
 *                       phasePlanGeneratedAt, layoutBuilderFiles
 *   ComponentsSlice:    components, currentComponent
 *   DocumentationSlice: currentAppId
 *   DualPlanningSlice:  dualArchitectureResult, userAISelection, cachedIntelligence
 */
const PERSISTED_FIELDS = [
  // ModeSlice — build resumption requires persisted mode
  'currentMode',
  // DataSlice — workflow-critical
  'appConcept',
  'dynamicPhasePlan',
  'currentLayoutManifest',
  'currentDesignSpec',
  // ComponentsSlice — builder needs these after refresh
  'components',
  'currentComponent',
  // DocumentationSlice
  'currentAppId',
  // DataSlice — review state persists across navigation
  'isReviewed',
  'buildSettings',
  'layoutThumbnail',
  'phasePlanGeneratedAt',
  'layoutBuilderFiles',
  // DualPlanningSlice — persists across navigation
  'dualArchitectureResult',
  'userAISelection',
  'cachedIntelligence',
] as const satisfies readonly (keyof AppState)[];

/** Type-safe subset of AppState that gets persisted to localStorage */
type PersistedState = Pick<AppState, (typeof PERSISTED_FIELDS)[number]>;

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Main Zustand store with all slices
 */
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((...a) => ({
        ...createChatSlice(...a),
        ...createModeSlice(...a),
        ...createComponentsSlice(...a),
        ...createVersionControlSlice(...a),
        ...createUISlice(...a),
        ...createDataSlice(...a),
        ...createDocumentationSlice(...a),
        ...createFileStorageSlice(...a),
        ...createDualPlanningSlice(...a),
      })),
      {
        name: 'ai-app-builder-storage',
        version: 6, // Bumped: now persists currentMode

        /**
         * Migration chain: v0 → v1 → v2 → v3 → v4 → v5
         *
         * Migrations cascade: a user on v1 gets v1→v2→v3→v4→v5 applied sequentially.
         * Each `if (version < N)` block adds fields introduced in version N.
         *
         * ## HOW TO ADD A MIGRATION
         *
         * 1. Bump `version` above (e.g. 5 → 6)
         * 2. Add a new `if (version < 6)` block at the bottom of `migrate()`
         *    that defaults the new persisted field(s)
         * 3. Add the field name(s) to `PERSISTED_FIELDS` above
         * 4. Verify: `npm run typecheck` — `satisfies` will catch typos
         * 5. Test: clear localStorage, reload — old users should migrate cleanly
         */
        migrate: (persistedState: unknown, version: number) => {
          let state = persistedState as Record<string, unknown>;
          if (version < 2) {
            // v2: persist components for builder-after-refresh
            state = {
              ...state,
              components: state.components ?? [],
              currentComponent: state.currentComponent ?? null,
            };
          }
          if (version < 3) {
            // v3: persist layout builder generated code
            state = {
              ...state,
              layoutBuilderFiles: state.layoutBuilderFiles ?? null,
            };
          }
          if (version < 4) {
            // v4: persist dual AI planning results
            state = {
              ...state,
              dualArchitectureResult: state.dualArchitectureResult ?? null,
              userAISelection: state.userAISelection ?? null,
            };
          }
          if (version < 5) {
            // v5: persist cached intelligence from background gathering
            state = {
              ...state,
              cachedIntelligence: state.cachedIntelligence ?? null,
            };
          }
          if (version < 6) {
            // v6: persist currentMode so build resumes correctly after page reload
            state = {
              ...state,
              currentMode: state.currentMode ?? 'ACT',
            };
          }
          return state;
        },

        /**
         * Partialize — only persist workflow-critical fields (not UI, chat, etc.)
         * Driven by PERSISTED_FIELDS array. Add new fields there, not here.
         */
        partialize: (state): PersistedState => {
          const persisted = {} as Record<string, unknown>;
          for (const key of PERSISTED_FIELDS) {
            persisted[key] = state[key];
          }
          return persisted as PersistedState;
        },
      }
    ),
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
      currentDesignSpec: state.currentDesignSpec,
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

/**
 * Select dual AI planning state
 */
export const useDualPlanningState = () =>
  useAppStore(
    useShallow((state) => ({
      dualArchitectureResult: state.dualArchitectureResult,
      dualArchitectureEscalation: state.dualArchitectureEscalation,
      userAISelection: state.userAISelection,
      dualPlanProgress: state.dualPlanProgress,
    }))
  );

export default useAppStore;
