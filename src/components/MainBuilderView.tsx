'use client';

/**
 * MainBuilderView - The core builder interface
 *
 * This component contains the main chat + preview builder interface.
 * Main builder view component used on the /app page.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';

// Extracted components
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { ToastProvider } from './Toast';
import { AppConceptPanel } from './concept-panel';

// UI components
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui';

// Modal components
import {
  LibraryModal,
  VersionHistoryModal,
  DiffPreviewModal,
  CompareVersionsModal,
  NameAppModal,
} from './modals';
import ShareModal from './modals/ShareModal';
import { ExportModal } from './modals/ExportModal';
import { CreateBranchModal } from './modals/CreateBranchModal';
import SettingsPage from './SettingsPage';

// Documentation components
import { ProjectDocumentationPanel } from './documentation';

// Custom hooks
import {
  useDatabaseSync,
  useFileStorage,
  useVersionControl,
  useKeyboardShortcuts,
  useMessageSender,
  useSendMessage,
  useVersionHandlers,
  useAppCrud,
} from '@/hooks';
import { useBranchManagement } from '@/hooks/useBranchManagement';
import type { WizardState } from '@/hooks';
import { useDynamicBuildPhases } from '@/hooks/useDynamicBuildPhases';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';
import { useSmartContext } from '@/hooks/useSmartContext';
import { useProjectDocumentation } from '@/hooks/useProjectDocumentation';
import { useAppBuilderSync } from '@/hooks/useAppBuilderSync';

// Types
import type { GeneratedComponent, ChatMessage, AppVersion, Phase } from '../types/aiBuilderTypes';

// Utils
import { parseAppFiles } from '../utils/exportApp';
import { captureLayoutPreview } from '../utils/screenshotCapture';

// Services
import { createClient } from '@/utils/supabase/client';
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

// Helper function
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Welcome message generator
function getWelcomeMessage(): ChatMessage {
  return {
    id: generateId(),
    role: 'assistant',
    content: `👋 **Welcome to AI App Builder!**

I'm ready to help you build React components and full applications.

**Getting Started:**
- Describe what you want to build in natural language
- Upload a design image for visual guidance
- Use PLAN mode for planning, ACT mode for building

What would you like to create today?`,
    timestamp: new Date().toISOString(),
  };
}

export function MainBuilderView() {
  const router = useRouter();
  const { user, sessionReady } = useAuth();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wizardState, setWizardState] = useState<WizardState>({
    features: [],
    technical: {},
    isComplete: false,
    readyForPhases: false,
  });
  // Track if user wants to deploy after saving the app
  const [pendingDeployAfterSave, setPendingDeployAfterSave] = useState(false);

  // Initialize StorageService
  const [storageService] = useState(() => {
    const supabase = createClient();
    const analytics = new StorageAnalyticsService(supabase);
    return new StorageService(supabase, analytics);
  });

  // ============================================================================
  // ZUSTAND STORE STATE
  // ============================================================================
  const {
    // Chat
    chatMessages,
    setChatMessages,
    userInput,
    setUserInput,
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,

    // Mode
    currentMode,
    setCurrentMode,

    // Components
    components,
    setComponents,
    currentComponent,
    setCurrentComponent,
    loadingApps,
    setLoadingApps,
    setDbSyncError,

    // UI
    setIsClient,
    activeTab,
    setActiveTab,
    showLibrary,
    setShowLibrary,
    showVersionHistory,
    setShowVersionHistory,
    showSettings,
    setShowSettings,
    showDiffPreview,
    setShowDiffPreview,
    showCompareModal,
    setShowCompareModal,
    showNameAppModal,
    setShowNameAppModal,
    showShareModal,
    setShowShareModal,
    showExportModal,
    setShowExportModal,
    exportModalComponent,
    setExportModalComponent,
    showCreateBranchModal,
    setShowCreateBranchModal,
    searchQuery,

    // Data
    pendingDiff,
    setPendingDiff,
    exportingApp,
    setExportingApp,
    compareVersions,
    setCompareVersions,
    newAppStagePlan,
    setNewAppStagePlan,
    appConcept,
    dynamicPhasePlan,
    uploadedImage,
    setUploadedImage,

    // Concept Panel
    isConceptPanelCollapsed,
    setConceptPanelCollapsed,
    updateAppConceptField,

    // Documentation
    showDocumentationPanel,
    setShowDocumentationPanel,
    currentAppId,
  } = useAppStore();

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================

  const handleDbError = useCallback(
    (error: string) => {
      setDbSyncError(error);
    },
    [setDbSyncError]
  );

  const {
    saveComponent: saveComponentToDb,
    deleteComponent: deleteComponentFromDb,
    loadComponents: loadComponentsFromDb,
  } = useDatabaseSync({
    userId: user?.id || null,
    onError: handleDbError,
  });

  const versionControl = useVersionControl({
    currentComponent,
    onComponentUpdate: (updated) => {
      setCurrentComponent(updated);
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent?.id ? updated : comp))
      );
    },
  });

  const branchManagement = useBranchManagement({
    currentComponent,
    onComponentUpdate: (updated) => {
      setCurrentComponent(updated);
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent?.id ? updated : comp))
      );
      saveComponentToDb(updated);
    },
    onClearUndoRedo: () => {
      versionControl.setUndoStack([]);
      versionControl.setRedoStack([]);
    },
  });

  const fileStorage = useFileStorage({
    userId: user?.id || null,
    storageService,
  });

  const smartContext = useSmartContext();

  // Project Documentation - auto-captures concept and plan snapshots
  // This hook enables the auto-capture effects that save documentation when appConcept changes
  const projectDocumentation = useProjectDocumentation({
    userId: user?.id || null,
    appId: currentAppId,
    autoLoad: true,
  });

  // Auto-create documentation when we have a concept but no documentation yet
  useEffect(() => {
    if (!user?.id || !currentAppId || !appConcept || projectDocumentation.documentation) return;

    // Create documentation for this app
    projectDocumentation.getOrCreateDocumentation(appConcept.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id,
    currentAppId,
    appConcept,
    projectDocumentation.documentation,
    projectDocumentation.getOrCreateDocumentation,
  ]);

  // App Builder Sync - bidirectional sync between Layout Builder and App Builder
  const appBuilderSync = useAppBuilderSync(appConcept?.layoutManifest || null, {
    autoSync: true,
    debounceMs: 1500,
    onSyncComplete: (tokens) => {
      console.log('[AppBuilderSync] Layout synced:', {
        hasColors: !!tokens.colors,
        hasTypography: !!tokens.typography,
      });
    },
    onSyncError: (error) => {
      console.error('[AppBuilderSync] Sync error:', error.message);
    },
  });

  const messageSender = useMessageSender({
    chatMessages,
    setChatMessages,
    currentComponent,
    setCurrentComponent,
    currentMode,
    newAppStagePlan,
    setNewAppStagePlan,
    onComponentCreated: (component) => {
      setComponents((prev) => [component, ...prev].slice(0, 50));
    },
    onShowDiffPreview: (diff) => {
      setPendingDiff(diff);
      setShowDiffPreview(true);
    },
    onSaveComponent: async (component) => {
      await saveComponentToDb(component);
    },
    uploadedImage,
    onClearImage: () => {
      setUploadedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const streaming = useStreamingGeneration({
    onStart: () => {
      setGenerationProgress('Starting generation...');
    },
    onFileStart: (filePath) => {
      setGenerationProgress(`Generating ${filePath.split('/').pop()}...`);
    },
    onComplete: () => {},
    onError: (message) => {
      console.error('Streaming error:', message);
    },
  });

  const dynamicBuildPhases = useDynamicBuildPhases({
    onPhaseComplete: (phase, result) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: result.success
          ? `✅ **Phase ${phase.number} Complete!**\n\nImplemented ${result.implementedFeatures.length} features`
          : `⚠️ **Phase ${phase.number} had issues**`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, notification]);
    },
  });

  // Save version helper
  const saveVersion = useCallback(
    (
      component: GeneratedComponent,
      changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE',
      description: string
    ): GeneratedComponent => {
      const versions = component.versions || [];
      const newVersion: AppVersion = {
        id: generateId(),
        versionNumber: versions.length + 1,
        code: component.code,
        description: description,
        timestamp: new Date().toISOString(),
        changeType,
      };

      return {
        ...component,
        versions: [...versions, newVersion],
      };
    },
    []
  );

  // Message sending
  const { sendMessage } = useSendMessage({
    wizardState,
    appConcept,
    messageSender,
    streaming,
    versionControl,
    dynamicBuildPhases,
    fileInputRef,
    onWizardStateUpdate: setWizardState,
    onSaveComponent: saveComponentToDb,
    saveVersion,
  });

  // Version handlers hook
  const { approveDiff, rejectDiff, revertToVersion, handleCompareVersions, handleForkApp } =
    useVersionHandlers({
      versionControl,
      saveVersion,
      onSaveComponent: saveComponentToDb,
    });

  // App CRUD hook
  const { handleNameAppSubmit, loadComponent, deleteComponent, toggleFavorite } = useAppCrud({
    onSaveComponent: saveComponentToDb,
    onDeleteComponent: deleteComponentFromDb,
    getWelcomeMessage,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (currentComponent) {
        saveComponentToDb(currentComponent);
      }
    },
    onUndo: versionControl.undo,
    onRedo: versionControl.redo,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [setUploadedImage]
  );

  const removeImage = useCallback(() => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setUploadedImage]);

  const handleExportApp = useCallback(
    (comp: GeneratedComponent) => {
      setExportModalComponent(comp);
      setShowExportModal(true);
    },
    [setExportModalComponent, setShowExportModal]
  );

  const downloadCode = useCallback(() => {
    if (!currentComponent) return;
    const blob = new Blob([currentComponent.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentComponent.name.replace(/\s+/g, '-')}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentComponent]);

  const handleBuildPhase = useCallback(
    (phase: Phase) => {
      const buildPrompt = `Build ${phase.name}: ${phase.description}. Features to implement: ${phase.features.join(', ')}`;
      setUserInput(buildPrompt);
      setNewAppStagePlan((prev) =>
        prev
          ? {
              ...prev,
              currentPhase: phase.number,
              phases: prev.phases.map((p) =>
                p.number === phase.number ? { ...p, status: 'building' as const } : p
              ),
            }
          : null
      );
    },
    [setUserInput, setNewAppStagePlan]
  );

  // Deploy handler - redirects to dashboard for deployment
  const handleDeploy = useCallback(() => {
    if (!currentAppId) {
      // App not saved yet - prompt to save first, then deploy
      setPendingDeployAfterSave(true);
      setShowNameAppModal(true);
      return;
    }
    // Redirect to dashboard with deploy query param
    router.push(`/app/dashboard?deploy=${currentAppId}`);
  }, [currentAppId, setShowNameAppModal, router]);

  // Filtered components
  const filteredComponents = useMemo(
    () =>
      components.filter(
        (comp) =>
          searchQuery === '' ||
          comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [components, searchQuery]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  // Load components on auth ready
  useEffect(() => {
    const loadApps = async () => {
      if (sessionReady && user?.id) {
        setLoadingApps(true);
        const apps = await loadComponentsFromDb();
        setComponents(apps);
        setLoadingApps(false);
      }
    };
    loadApps();
  }, [sessionReady, user?.id, loadComponentsFromDb, setComponents, setLoadingApps]);

  // Handle pending deploy after app is saved
  useEffect(() => {
    if (pendingDeployAfterSave && currentAppId) {
      // App was saved, now redirect to dashboard for deployment
      setPendingDeployAfterSave(false);
      router.push(`/app/dashboard?deploy=${currentAppId}`);
    }
  }, [pendingDeployAfterSave, currentAppId, router]);

  // Show naming modal if no app is loaded (after initial load completes)
  useEffect(() => {
    // Wait for session to be ready and initial app load to complete
    if (sessionReady && !loadingApps && !currentComponent && !showNameAppModal) {
      setShowNameAppModal(true);
    }
  }, [sessionReady, loadingApps, currentComponent, showNameAppModal, setShowNameAppModal]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ToastProvider>
      <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 min-h-0 max-w-[1800px] mx-auto w-full px-4 py-2">
          <ResizablePanelGroup
            direction="horizontal"
            persistenceKey="ai-builder-layout-v2"
            className="h-full"
          >
            {/* Chat Panel */}
            <ResizablePanel
              defaultSize={isConceptPanelCollapsed ? 35 : 30}
              minSize={15}
              maxSize={50}
            >
              <div className="h-full flex flex-col relative">
                <ChatPanel
                  messages={chatMessages}
                  isGenerating={isGenerating}
                  generationProgress={generationProgress}
                  userInput={userInput}
                  onUserInputChange={setUserInput}
                  onSendMessage={sendMessage}
                  uploadedImage={uploadedImage}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={removeImage}
                  currentMode={currentMode}
                  onModeChange={setCurrentMode}
                  stagePlan={newAppStagePlan}
                  onBuildPhase={handleBuildPhase}
                  onViewComponent={() => setActiveTab('preview')}
                  streamingProgress={streaming.progress}
                  isStreamingActive={streaming.isStreaming}
                  hasLayoutDesign={!!appConcept?.layoutManifest}
                  onCapturePreview={async () => {
                    try {
                      const result = await captureLayoutPreview('sandpack-preview');
                      if (result.success && result.dataUrl) {
                        setUploadedImage(result.dataUrl);
                      }
                    } catch (err) {
                      console.error('Failed to capture preview:', err);
                    }
                  }}
                  canUndo={versionControl.canUndo}
                  canRedo={versionControl.canRedo}
                  onUndo={versionControl.undo}
                  onRedo={versionControl.redo}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* App Concept Panel - Collapsible middle panel */}
            <ResizablePanel
              defaultSize={isConceptPanelCollapsed ? 2 : 25}
              minSize={isConceptPanelCollapsed ? 2 : 15}
              maxSize={isConceptPanelCollapsed ? 2 : 40}
            >
              <AppConceptPanel
                appConcept={appConcept}
                phasePlan={dynamicPhasePlan}
                mode={currentMode === 'PLAN' ? 'plan' : 'act'}
                isCollapsed={isConceptPanelCollapsed}
                onToggleCollapse={() => setConceptPanelCollapsed(!isConceptPanelCollapsed)}
                onConceptUpdate={updateAppConceptField}
                onStartBuilding={() => {
                  setCurrentMode('ACT');
                }}
                buildState={{
                  uiPhases: dynamicBuildPhases.uiPhases,
                  dynamicPhases: dynamicBuildPhases.phases,
                  progress: dynamicBuildPhases.progress,
                  isBuilding: dynamicBuildPhases.isBuilding,
                  isPaused: dynamicBuildPhases.isPaused,
                  currentPhase: dynamicBuildPhases.currentPhase,
                }}
                onPauseBuild={dynamicBuildPhases.pauseBuild}
                onResumeBuild={dynamicBuildPhases.resumeBuild}
                onSkipPhase={(phaseNumber) => dynamicBuildPhases.skipPhase(phaseNumber)}
                onRetryPhase={(phaseNumber) => dynamicBuildPhases.retryPhase(phaseNumber)}
              />
            </ResizablePanel>

            <ResizableHandle />

            {/* Preview Panel */}
            <ResizablePanel
              defaultSize={isConceptPanelCollapsed ? 63 : 45}
              minSize={25}
              maxSize={75}
            >
              <PreviewPanel
                currentComponent={currentComponent}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                canUndo={versionControl.canUndo}
                canRedo={versionControl.canRedo}
                onUndo={versionControl.undo}
                onRedo={versionControl.redo}
                undoCount={versionControl.undoStack.length}
                redoCount={versionControl.redoStack.length}
                onExport={handleExportApp}
                onDownload={downloadCode}
                onDeploy={handleDeploy}
                isExporting={!!exportingApp}
                onScreenshot={(image) => {
                  setUploadedImage(image);
                }}
                onBranchSwitch={branchManagement.switchBranch}
                onCreateBranch={() => setShowCreateBranchModal(true)}
                onDeleteBranch={branchManagement.deleteBranch}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Modals */}
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          components={components}
          filteredComponents={filteredComponents}
          searchQuery={searchQuery}
          onSearchChange={(q) => useAppStore.getState().setSearchQuery(q)}
          onLoadComponent={(comp) => {
            loadComponent(comp);
            setShowLibrary(false);
          }}
          onToggleFavorite={toggleFavorite}
          onDeleteComponent={deleteComponent}
          onExportComponent={handleExportApp}
          exportingAppId={exportingApp?.id ?? null}
          contentTab={useAppStore.getState().contentTab}
          onContentTabChange={(tab) => useAppStore.getState().setContentTab(tab)}
          storageFiles={fileStorage.files}
          filteredFiles={fileStorage.files}
          fileSearchQuery={fileStorage.searchQuery}
          onFileSearchChange={fileStorage.setSearchQuery}
          fileTypeFilter={fileStorage.typeFilter}
          onFileTypeFilterChange={fileStorage.setTypeFilter}
          fileSortBy={fileStorage.sortBy}
          fileSortOrder={fileStorage.sortOrder}
          onSortChange={(sortBy, order) => {
            fileStorage.setSortBy(sortBy);
            fileStorage.setSortOrder(order);
          }}
          selectedFiles={fileStorage.selectedFiles}
          onFileSelect={fileStorage.selectFile}
          onFileUpload={fileStorage.uploadFiles}
          onFileDownload={fileStorage.downloadFile}
          onFileDelete={fileStorage.deleteFile}
          onBulkDelete={fileStorage.bulkDelete}
          onClearSelection={fileStorage.clearSelection}
          deletingFiles={fileStorage.deletingFiles}
          storageStats={fileStorage.storageStats}
          loadingFiles={fileStorage.isLoading}
          user={user}
        />

        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          currentComponent={currentComponent}
          onRevertToVersion={revertToVersion}
          onForkVersion={(comp, version) => {
            handleForkApp(comp, version);
          }}
          onCompareVersions={handleCompareVersions}
        />

        {compareVersions.v1 && compareVersions.v2 && (
          <CompareVersionsModal
            isOpen={showCompareModal}
            onClose={() => {
              setShowCompareModal(false);
              setCompareVersions({ v1: null, v2: null });
            }}
            version1={compareVersions.v1}
            version2={compareVersions.v2}
            onRevertToVersion={revertToVersion}
            onForkVersion={(version) => {
              if (currentComponent) {
                handleForkApp(currentComponent, version);
              }
            }}
            currentComponent={currentComponent}
          />
        )}

        {pendingDiff && (
          <DiffPreviewModal
            isOpen={showDiffPreview}
            onClose={() => {
              setShowDiffPreview(false);
              setPendingDiff(null);
            }}
            pendingDiff={pendingDiff}
            onApprove={approveDiff}
            onReject={rejectDiff}
          />
        )}

        <NameAppModal
          isOpen={showNameAppModal}
          onClose={() => {
            setShowNameAppModal(false);
            setPendingDeployAfterSave(false); // Clear pending deploy if user cancels
            // If no app loaded, redirect to dashboard (can't use AI Builder without app)
            if (!currentComponent) {
              router.push('/app/dashboard');
            }
          }}
          onSubmit={(name) => {
            handleNameAppSubmit(name);
            setShowNameAppModal(false);
            // Note: If pendingDeployAfterSave is true, the effect will redirect after currentAppId is set
          }}
        />

        {showShareModal && currentComponent && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            appId={currentComponent.id}
            appTitle={currentComponent.name}
            initialShareState={{
              isPublic: currentComponent.isPublic ?? false,
              previewSlug: currentComponent.previewSlug ?? null,
            }}
          />
        )}

        {showExportModal && exportModalComponent && (
          <ExportModal
            isOpen={showExportModal}
            onClose={() => {
              setShowExportModal(false);
              setExportModalComponent(null);
            }}
            appName={exportModalComponent.name}
            files={parseAppFiles(exportModalComponent.code)}
          />
        )}

        {showCreateBranchModal && (
          <CreateBranchModal
            isOpen={showCreateBranchModal}
            onClose={() => setShowCreateBranchModal(false)}
            onCreateBranch={(name, description) => {
              branchManagement.createBranch(name, description);
              setShowCreateBranchModal(false);
            }}
            existingBranches={currentComponent?.branches || []}
            sourceBranch={currentComponent?.branches?.find(
              (b) => b.id === currentComponent.activeBranchId
            )}
          />
        )}

        {showSettings && (
          <SettingsPage isOpen={showSettings} onClose={() => setShowSettings(false)} />
        )}

        {/* Project Documentation Panel */}
        {showDocumentationPanel && <ProjectDocumentationPanel />}
      </div>
    </ToastProvider>
  );
}

export default MainBuilderView;
