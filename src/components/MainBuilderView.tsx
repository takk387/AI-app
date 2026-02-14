'use client';

/**
 * MainBuilderView - The core builder interface
 *
 * This component contains the main chat + preview builder interface.
 * Main builder view component used on the /app page.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ConceptUpdateConfirmDialog } from './modals/ConceptUpdateConfirmDialog';

// Types for PLAN mode concept updates
import type { ConceptChange, ConceptUpdateResponse } from '@/types/reviewTypes';
import type { DynamicPhasePlan, PhaseExecutionResult } from '@/types/dynamicPhases';
import type { AppConcept } from '@/types/appConcept';
import { generateFeatureId } from '@/types/wizardState';
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
import { useConceptSync } from '@/hooks/useConceptSync';
import type { WizardState } from '@/hooks';
import { useDynamicBuildPhases } from '@/hooks/useDynamicBuildPhases';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';
import { useSmartContext } from '@/hooks/useSmartContext';
import { useProjectDocumentation } from '@/hooks/useProjectDocumentation';
import { useAppBuilderSync } from '@/hooks/useAppBuilderSync';

// Types
import type { GeneratedComponent, ChatMessage, AppVersion, Phase } from '../types/aiBuilderTypes';
import { toImplementationPlanSnapshot } from '../types/aiBuilderTypes';

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
  const searchParams = useSearchParams();
  const { user, sessionReady } = useAuth();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const executingPhaseRef = useRef<number | null>(null);
  const [wizardState, setWizardState] = useState<WizardState>({
    features: [],
    technical: {},
    isComplete: false,
    readyForPhases: false,
  });
  // Track if user wants to deploy after saving the app
  const [pendingDeployAfterSave, setPendingDeployAfterSave] = useState(false);

  // PLAN mode concept update state
  const [pendingConceptUpdate, setPendingConceptUpdate] = useState<{
    changes: ConceptChange[];
    updatedConcept: AppConcept;
    phasePlan: DynamicPhasePlan | null;
  } | null>(null);

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
    setAppConcept,
    dynamicPhasePlan,
    setDynamicPhasePlan,
    implementationPlan,
    uploadedImage,
    setUploadedImage,
    setPhasePlanGeneratedAt,

    // Concept Panel
    isConceptPanelCollapsed,
    setConceptPanelCollapsed,
    updateAppConceptField,

    // Documentation
    showDocumentationPanel,
    setShowDocumentationPanel,
    currentAppId,

    // Review state
    isReviewed,
    buildSettings,

    // Layout Builder data
    layoutBuilderFiles,
  } = useAppStore();

  // Sync wizard state to app concept in store during PLAN mode
  // Adapt wizardState to useConceptSync's expected format (features need id)
  const adaptedWizardState = useMemo(
    () => ({
      ...wizardState,
      features: wizardState.features.map((f) => ({
        id: f.id || generateFeatureId(),
        name: f.name,
        description: f.description || '',
        priority: f.priority as 'high' | 'medium' | 'low',
      })),
    }),
    [wizardState]
  );

  useConceptSync({
    wizardState: adaptedWizardState,
    enabled: currentMode === 'PLAN',
  });

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
    autoAdvance: buildSettings.autoAdvance,
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
  const { sendMessage, suggestedActions, clearSuggestedActions } = useSendMessage({
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

  // Handle PLAN mode suggested actions
  const handlePlanAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'generate_architecture':
          // For architecture generation, guide user to use the full wizard flow
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant' as const,
              content:
                '🏗️ **Architecture Analysis**\n\nTo generate a full backend architecture analysis, please use the **Wizard** (Step 1) to complete your app planning. The architecture analyzer works best with a fully defined app concept.\n\nOnce you have your concept ready, you can proceed to design and build phases.',
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'generate_phases':
          // For phase generation, guide user to use the full wizard flow
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant' as const,
              content:
                '📋 **Implementation Plan**\n\nTo generate a detailed implementation plan with phases, please complete the planning process in the **Wizard** (Step 1). The phase generator creates optimized build phases based on your complete app concept.\n\nOnce your concept is finalized, you can move through Design and Build steps.',
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'start_building':
          // Switch to ACT mode to start building
          setCurrentMode('ACT');
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'system' as const,
              content:
                '🚀 **Switched to ACT mode!**\n\nYou can now build and modify your application. Describe what you want to create or change.',
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'adjust_plan':
          // Clear actions and let user continue chatting
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant' as const,
              content: "Sure, let's refine the plan. What would you like to adjust or add?",
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'browse_templates':
          // Open library modal to browse templates
          setShowLibrary(true);
          break;
        case 'upload_reference':
          // Trigger file input for image upload
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
          break;
        default:
          // Handle unknown actions
          console.log('[MainBuilderView] Unknown plan action:', action);
      }
      clearSuggestedActions();
    },
    [setChatMessages, setCurrentMode, setShowLibrary, fileInputRef, clearSuggestedActions]
  );

  /**
   * INVERTED LOGIC: Detect messages that are NOT concept changes
   * This is a smaller, more predictable set than trying to detect all concept changes
   *
   * Non-concept messages include:
   * - Questions (what, how, why, etc.)
   * - Information requests (help, show, list)
   * - Messages ending with question marks
   * - Acknowledgments (thanks, ok, etc.)
   */
  const detectNonConceptIntent = useCallback((message: string): boolean => {
    const trimmed = message.trim();

    const nonConceptPatterns = [
      /^(what|how|why|when|where|who|which|can you|could you|would you|will you|do you|is there|are there)\b/i,
      /^(explain|tell me|show me|help|list|display|describe)\b/i,
      /^(thanks|thank you|ok|okay|got it|understood|i see)\b/i,
      /\?$/, // Ends with question mark
    ];

    return nonConceptPatterns.some((p) => p.test(trimmed));
  }, []);

  /**
   * Handle messages in PLAN mode that may be concept updates
   * Uses inverted logic: everything except known non-concept patterns
   * is treated as a potential concept change
   */
  const handlePlanModeMessage = useCallback(async (): Promise<boolean> => {
    const message = userInput.trim();
    if (!message) return false;

    // Skip if not in PLAN mode or no concept exists
    if (currentMode !== 'PLAN' || !appConcept) {
      return false; // Let normal flow handle it
    }

    // If it's explicitly not a concept change, let normal flow handle it
    if (detectNonConceptIntent(message)) {
      return false;
    }

    // Clear input and add user message
    setUserInput('');
    setChatMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Snapshot current state for rollback
    const previousConcept = appConcept;

    try {
      // Add loading message
      const loadingMsgId = generateId();
      setChatMessages((prev) => [
        ...prev,
        {
          id: loadingMsgId,
          role: 'assistant' as const,
          content: 'Analyzing your request...',
          timestamp: new Date().toISOString(),
          isLoading: true,
        },
      ]);

      // Call update API (initially without regenerating phases)
      const response = await fetch('/api/builder/update-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentConcept: appConcept,
          userMessage: message,
          regeneratePhases: false,
        }),
      });

      const data: ConceptUpdateResponse = await response.json();

      // Remove loading message
      setChatMessages((prev) => prev.filter((m) => m.id !== loadingMsgId));

      if (!data.success) {
        throw new Error(data.error || 'Failed to update concept');
      }

      // If no changes detected, respond conversationally
      if (!data.changes || data.changes.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant' as const,
            content:
              "I didn't detect any concept changes in your message. Could you clarify what you'd like to modify? For example: 'Add a dark mode feature' or 'Change the app description to...'",
            timestamp: new Date().toISOString(),
          },
        ]);
        return true; // Handled, don't continue to normal flow
      }

      // Show confirmation dialog with diff
      if (data.updatedConcept) {
        setPendingConceptUpdate({
          changes: data.changes,
          updatedConcept: data.updatedConcept,
          phasePlan: null,
        });
      }

      return true; // Handled
    } catch (error) {
      // Show error message
      setChatMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant' as const,
          content: `Failed to analyze concept update: ${error instanceof Error ? error.message : 'Unknown error'}. No changes were made.`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
      return true; // Handled (with error)
    }
  }, [currentMode, appConcept, userInput, detectNonConceptIntent, setChatMessages, setUserInput]);

  /**
   * Confirm and apply the pending concept update
   */
  const confirmConceptUpdate = useCallback(
    async (regeneratePhases: boolean) => {
      if (!pendingConceptUpdate) return;

      const previousConcept = appConcept;
      const previousPhasePlan = dynamicPhasePlan;

      try {
        // Apply the concept update
        setAppConcept(pendingConceptUpdate.updatedConcept);

        // Regenerate phases if requested
        if (regeneratePhases) {
          const response = await fetch('/api/builder/update-concept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentConcept: pendingConceptUpdate.updatedConcept,
              userMessage: '',
              regeneratePhases: true,
            }),
          });

          const data: ConceptUpdateResponse = await response.json();
          if (data.phasePlan) {
            setDynamicPhasePlan(data.phasePlan);
            setPhasePlanGeneratedAt(new Date().toISOString());
          }
        }

        // Success message
        setChatMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant' as const,
            content: `Concept updated successfully.${regeneratePhases ? ' Phases regenerated.' : ''} Switch to ACT mode when ready to build.`,
            timestamp: new Date().toISOString(),
          },
        ]);

        setPendingConceptUpdate(null);
      } catch (error) {
        // Rollback on error
        setAppConcept(previousConcept);
        setDynamicPhasePlan(previousPhasePlan);

        setChatMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant' as const,
            content: `Phase regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}. Concept reverted to previous state.`,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);

        setPendingConceptUpdate(null);
      }
    },
    [
      pendingConceptUpdate,
      appConcept,
      dynamicPhasePlan,
      setAppConcept,
      setDynamicPhasePlan,
      setPhasePlanGeneratedAt,
      setChatMessages,
    ]
  );

  /**
   * Cancel the pending concept update
   */
  const cancelConceptUpdate = useCallback(() => {
    setPendingConceptUpdate(null);
    setChatMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant' as const,
        content: 'Concept update cancelled. No changes were made.',
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [setChatMessages]);

  /**
   * Handle regenerating phases from current concept
   */
  const handleRegeneratePhases = useCallback(async () => {
    if (!appConcept) return;

    const previousPhasePlan = dynamicPhasePlan;

    try {
      // Add loading message
      const loadingMsgId = generateId();
      setChatMessages((prev) => [
        ...prev,
        {
          id: loadingMsgId,
          role: 'assistant' as const,
          content: 'Regenerating phases...',
          timestamp: new Date().toISOString(),
          isLoading: true,
        },
      ]);

      const response = await fetch('/api/wizard/generate-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: appConcept }),
      });

      const data = await response.json();

      // Remove loading message
      setChatMessages((prev) => prev.filter((m) => m.id !== loadingMsgId));

      if (data.phasePlan) {
        setDynamicPhasePlan(data.phasePlan);
        setPhasePlanGeneratedAt(new Date().toISOString());

        setChatMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant' as const,
            content: `Phases regenerated: ${data.phasePlan.phases.length} phases created.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      setDynamicPhasePlan(previousPhasePlan);
      setChatMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant' as const,
          content: `Failed to regenerate phases: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    }
  }, [appConcept, dynamicPhasePlan, setChatMessages, setDynamicPhasePlan, setPhasePlanGeneratedAt]);

  /**
   * Wrapped send message that intercepts PLAN mode concept updates
   */
  const handleSendMessage = useCallback(async () => {
    // Try to handle as PLAN mode concept update
    const handled = await handlePlanModeMessage();

    // If not handled as concept update, use normal flow
    if (!handled) {
      sendMessage();
    }
  }, [handlePlanModeMessage, sendMessage]);

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

  // Clear suggested actions when switching to ACT mode
  useEffect(() => {
    if (currentMode === 'ACT') {
      clearSuggestedActions();
    }
  }, [currentMode, clearSuggestedActions]);

  useEffect(() => {
    setIsClient(true);
  }, [setIsClient]);

  // Load components on auth ready
  useEffect(() => {
    const loadApps = async () => {
      if (sessionReady && user?.id) {
        setLoadingApps(true);
        try {
          const apps = await loadComponentsFromDb();
          setComponents(apps);
          if (apps.length === 0) {
            console.warn('[MainBuilderView] No apps loaded from database. User may need to create a new app.');
          }
        } catch (err) {
          console.error('[MainBuilderView] Failed to load apps from database:', err);
        } finally {
          setLoadingApps(false);
        }
      }
    };
    loadApps();
  }, [sessionReady, user?.id, loadComponentsFromDb, setComponents, setLoadingApps]);

  // Restore active app from URL param or localStorage after components load
  useEffect(() => {
    // Wait for components to finish loading
    if (loadingApps || components.length === 0) return;
    // Don't override if user already has a component loaded
    if (currentComponent) return;

    // Priority 1: Check URL for appId param (from dashboard navigation)
    const urlAppId = searchParams.get('appId');
    if (urlAppId) {
      const matchingComponent = components.find((c) => c.id === urlAppId);
      if (matchingComponent) {
        loadComponent(matchingComponent);
        // Also save to localStorage for refresh persistence
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('current_app_id', urlAppId);
          } catch {
            // Failed to save to localStorage
          }
        }
        return;
      }
    }

    // Priority 2: Check localStorage for previously active app
    if (typeof window !== 'undefined') {
      try {
        const storedAppId = localStorage.getItem('current_app_id');
        if (storedAppId) {
          const matchingComponent = components.find((c) => c.id === storedAppId);
          if (matchingComponent) {
            loadComponent(matchingComponent);
          } else {
            // Stale app ID - component no longer exists, clear localStorage
            localStorage.removeItem('current_app_id');
          }
        }
      } catch {
        // Failed to read from localStorage
      }
    }
  }, [loadingApps, components, currentComponent, searchParams, loadComponent]);

  // Handle pending deploy after app is saved
  useEffect(() => {
    if (pendingDeployAfterSave && currentAppId) {
      // App was saved, now redirect to dashboard for deployment
      setPendingDeployAfterSave(false);
      router.push(`/app/dashboard?deploy=${currentAppId}`);
    }
  }, [pendingDeployAfterSave, currentAppId, router]);

  // Redirect to wizard if no app is loaded (after initial load completes)
  // This matches the live server behavior where users go through the guided flow
  useEffect(() => {
    // Skip if URL restoration is in progress
    const urlAppId = searchParams.get('appId');
    if (urlAppId) return;

    // Skip if localStorage restoration is pending (app exists and will be loaded)
    const storedAppId =
      typeof window !== 'undefined' ? localStorage.getItem('current_app_id') : null;
    if (storedAppId && components.length > 0 && components.some((c) => c.id === storedAppId))
      return;

    // Skip if user has gone through the guided flow (has concept or plan in store)
    // This prevents the redirect when the database query fails but the user
    // navigated here intentionally from the wizard → design → review flow
    if (appConcept || dynamicPhasePlan) return;

    // Wait for session to be ready and initial app load to complete
    // Redirect to wizard for guided flow instead of showing name modal
    if (sessionReady && !loadingApps && !currentComponent) {
      router.push('/app/wizard');
    }
  }, [sessionReady, loadingApps, currentComponent, searchParams, components, router, appConcept, dynamicPhasePlan]);

  // Get layout manifest from store for auto-save sync
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);
  const layoutThumbnail = useAppStore((state) => state.layoutThumbnail);

  // Debounced auto-save for chat messages, code changes, phase plans, AND wizard data (2000ms)
  // This ensures that modifications to appConcept, layoutManifest, etc. are persisted
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<{
    chatLength: number;
    code: string;
    phasePlanId: string | null;
    hasImplPlan: boolean;
    appConceptUpdatedAt: string | null;
    layoutManifestId: string | null;
  } | null>(null);

  // Track if there are unsaved changes for beforeunload protection
  const hasUnsavedChangesRef = useRef(false);

  useEffect(() => {
    // Don't auto-save if no component is loaded or if still loading
    if (!currentComponent || loadingApps || isGenerating) return;

    // Skip if nothing has changed since last save (including wizard data)
    const currentState = {
      chatLength: chatMessages.length,
      code: currentComponent.code,
      phasePlanId: dynamicPhasePlan?.id ?? null,
      hasImplPlan: !!implementationPlan,
      appConceptUpdatedAt: appConcept?.updatedAt ?? null,
      layoutManifestId: currentLayoutManifest?.id ?? null,
    };
    if (
      lastSavedRef.current &&
      lastSavedRef.current.chatLength === currentState.chatLength &&
      lastSavedRef.current.code === currentState.code &&
      lastSavedRef.current.phasePlanId === currentState.phasePlanId &&
      lastSavedRef.current.hasImplPlan === currentState.hasImplPlan &&
      lastSavedRef.current.appConceptUpdatedAt === currentState.appConceptUpdatedAt &&
      lastSavedRef.current.layoutManifestId === currentState.layoutManifestId
    ) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set up debounced save (2000ms)
    autoSaveTimerRef.current = setTimeout(async () => {
      // Convert runtime implementation plan to snapshot for DB persistence
      const implPlanSnapshot = implementationPlan
        ? toImplementationPlanSnapshot(implementationPlan)
        : currentComponent.implementationPlan;

      // CRITICAL FIX: Sync ALL store state (including wizard data) to component before saving
      // This ensures appConcept, layoutManifest, layoutThumbnail modifications are persisted
      const updatedComponent = {
        ...currentComponent,
        conversationHistory: chatMessages,
        dynamicPhasePlan: dynamicPhasePlan ?? currentComponent.dynamicPhasePlan,
        implementationPlan: implPlanSnapshot,
        // Sync wizard/design data from store
        appConcept: appConcept ?? currentComponent.appConcept,
        layoutManifest: currentLayoutManifest ?? currentComponent.layoutManifest,
        layoutThumbnail: layoutThumbnail ?? currentComponent.layoutThumbnail,
        // Update build status based on what data we have
        buildStatus: appConcept
          ? currentLayoutManifest
            ? currentComponent.code
              ? 'building'
              : 'designing'
            : 'planning'
          : currentComponent.buildStatus,
      };

      // Update store with synced component
      setCurrentComponent(updatedComponent);
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent.id ? updatedComponent : comp))
      );

      await saveComponentToDb(updatedComponent);
      lastSavedRef.current = currentState;
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    chatMessages,
    currentComponent,
    loadingApps,
    isGenerating,
    saveComponentToDb,
    dynamicPhasePlan,
    implementationPlan,
    appConcept,
    currentLayoutManifest,
    layoutThumbnail,
    setCurrentComponent,
    setComponents,
  ]);

  // Sync global dynamic phase plan to local hook manager
  useEffect(() => {
    if (dynamicPhasePlan && !dynamicBuildPhases.plan) {
      dynamicBuildPhases.initializePlan(dynamicPhasePlan);
    }
  }, [dynamicPhasePlan, dynamicBuildPhases.plan, dynamicBuildPhases.initializePlan]);

  /**
   * Attempt to start Phase 1. If it's a Layout Injection phase, inject
   * pre-built files directly (no AI call). Otherwise, start Phase 1 normally.
   * Returns true if Phase 1 was handled, false otherwise.
   */
  const tryStartPhase1 = useCallback(() => {
    if (!dynamicBuildPhases.plan) return false;

    const phase1 = dynamicBuildPhases.plan.phases.find((p) => p.number === 1);
    const isPhase1Done = phase1?.status === 'completed' || phase1?.status === 'skipped';

    // Layout Injection: if Phase 1 is layout injection, inject pre-built code directly
    // Guard: skip if currentComponent already has injected code (prevents re-injection on refresh).
    // The review page sets currentComponent with code: '' (empty shell), so we check for
    // non-empty code to detect a previously-injected component.
    const hasInjectedCode = currentComponent?.code && currentComponent.code.length > 2;
    if (
      phase1?.isLayoutInjection &&
      layoutBuilderFiles?.length &&
      !isPhase1Done &&
      !hasInjectedCode
    ) {
      dynamicBuildPhases.startPhase(1);

      // Build FullAppData structure (matches what FullAppPreview/BrowserPreview expects)
      const appData = {
        name: appConcept?.name || 'App',
        description: appConcept?.description || '',
        appType: 'FRONTEND_ONLY' as const,
        files: layoutBuilderFiles,
        dependencies: {},
        setupInstructions: '',
      };

      setCurrentComponent({
        id: generateId(),
        name: appConcept?.name || 'My App',
        code: JSON.stringify(appData, null, 2),
        description: 'Layout injected from Layout Builder',
        timestamp: new Date().toISOString(),
        isFavorite: false,
        conversationHistory: [] as ChatMessage[],
        versions: [],
        appConcept: appConcept,
        layoutManifest: appConcept?.layoutManifest ?? null,
        dynamicPhasePlan: dynamicBuildPhases.plan,
      });

      // Auto-complete Phase 1 — no AI call needed
      dynamicBuildPhases.completePhase({
        phaseNumber: 1,
        phaseName: 'Layout Injection',
        success: true,
        generatedCode: JSON.stringify(appData),
        generatedFiles: layoutBuilderFiles.map((f) => f.path),
        implementedFeatures: ['Layout structure', 'Design system', 'Navigation'],
        duration: 0,
        tokensUsed: { input: 0, output: 0 },
      });

      // Notify user via chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'system' as const,
          content: `**Phase 1: Layout Injection Complete!**\n\nYour layout from the Layout Builder has been injected as the starting code. ${layoutBuilderFiles.length} file(s) loaded.\n\nPhase 2 is ready — send a message to continue building.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      return true;
    }

    if (!isPhase1Done) {
      dynamicBuildPhases.startPhase(1);
      return true;
    }

    return false;
  }, [
    dynamicBuildPhases.plan,
    dynamicBuildPhases.startPhase,
    dynamicBuildPhases.completePhase,
    layoutBuilderFiles,
    appConcept,
    currentComponent,
    setCurrentComponent,
    setChatMessages,
  ]);

  /**
   * Execute a phase via streaming generation using the structured phase prompt.
   * This is the core function that connects startPhase() (UI status) to actual AI generation.
   */
  const executePhase = useCallback(async (phaseNumber: number) => {
    if (!dynamicBuildPhases.plan) return;

    // Build the structured phase prompt via PhaseExecutionManager
    // Async version initializes CodeContextService for richer dependency-graph-based code context
    const executionPrompt = await dynamicBuildPhases.getExecutionPromptAsync(phaseNumber);
    const executionContext = dynamicBuildPhases.getExecutionContext(phaseNumber);

    if (!executionPrompt || !executionContext) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `**Phase ${phaseNumber} Error:** Could not build execution context. The phase may be misconfigured.`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      executingPhaseRef.current = null;
      return;
    }

    setIsGenerating(true);

    // Notify user
    const buildingMsg: ChatMessage = {
      id: generateId(),
      role: 'system',
      content: `**Building Phase ${phaseNumber}: ${executionContext.phaseName}...**\n\nFeatures: ${executionContext.features.join(', ')}`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, buildingMsg]);

    try {
      // Parse current app state from existing component code
      let currentAppState: Record<string, unknown> | undefined;
      if (currentComponent?.code) {
        try {
          currentAppState = JSON.parse(currentComponent.code);
        } catch {
          // Code is not JSON — skip currentAppState
        }
      }

      // Build request body matching what the API route already destructures (route.ts:169-210)
      const requestBody: Record<string, unknown> = {
        prompt: executionPrompt,
        isPhaseBuilding: true,
        isModification: phaseNumber > 1,
        phaseContext: {
          phaseNumber,
          phaseName: executionContext.phaseName,
          previousPhaseCode: executionContext.previousPhaseCode,
          allPhases: executionContext.allPhases?.map((p) => ({
            number: p.number,
            name: p.name,
            features: p.features,
            status: p.status,
          })),
          completedPhases: executionContext.completedPhases,
          cumulativeFeatures: executionContext.cumulativeFeatures,
        },
        currentAppState,
        layoutManifest: appConcept?.layoutManifest || undefined,
        architectureSpec: dynamicBuildPhases.plan?.architectureSpec || undefined,
        phaseContexts: dynamicBuildPhases.plan?.phaseContexts || undefined,
      };

      const streamResult = await streaming.generate(requestBody);

      if (streamResult) {
        const files = streamResult.files as Array<{ path: string; content: string }>;

        if (files && files.length > 0) {
          // Update or create component with generated code
          let updatedComponent: GeneratedComponent;

          if (currentComponent) {
            updatedComponent = {
              ...currentComponent,
              code: JSON.stringify(streamResult, null, 2),
              description: `Phase ${phaseNumber}: ${executionContext.phaseName}`,
              timestamp: new Date().toISOString(),
            };
            updatedComponent = saveVersion(updatedComponent, 'MAJOR_CHANGE', `Phase ${phaseNumber}: ${executionContext.phaseName}`);
          } else {
            updatedComponent = {
              id: generateId(),
              name: appConcept?.name || 'My App',
              code: JSON.stringify(streamResult, null, 2),
              description: `Phase ${phaseNumber}: ${executionContext.phaseName}`,
              timestamp: new Date().toISOString(),
              isFavorite: false,
              conversationHistory: [] as ChatMessage[],
              versions: [],
              appConcept: appConcept,
              layoutManifest: appConcept?.layoutManifest ?? null,
              dynamicPhasePlan: dynamicBuildPhases.plan,
            };
            updatedComponent = saveVersion(updatedComponent, 'NEW_APP', `Phase ${phaseNumber}: ${executionContext.phaseName}`);
          }

          setCurrentComponent(updatedComponent);
          setComponents((prev) => {
            const exists = prev.find((c) => c.id === updatedComponent.id);
            if (exists) {
              return prev.map((c) => (c.id === updatedComponent.id ? updatedComponent : c));
            }
            return [updatedComponent, ...prev].slice(0, 50);
          });
          await saveComponentToDb(updatedComponent);

          // Switch to preview
          await new Promise((resolve) => setTimeout(resolve, 50));
          setActiveTab('preview');

          // Complete the phase — this triggers auto-advance if enabled
          const phaseResult: PhaseExecutionResult = {
            phaseNumber,
            phaseName: executionContext.phaseName,
            success: true,
            generatedCode: JSON.stringify(streamResult, null, 2),
            generatedFiles: files.map((f) => f.path),
            implementedFeatures: executionContext.features,
            duration: 0,
            tokensUsed: { input: 0, output: 0 },
          };
          dynamicBuildPhases.completePhase(phaseResult);
        } else {
          // No files generated
          const noFilesMsg: ChatMessage = {
            id: generateId(),
            role: 'system',
            content: `**Phase ${phaseNumber} Warning:** The AI responded but generated no code files. The phase remains in-progress for retry.`,
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, noFilesMsg]);
          executingPhaseRef.current = null;
        }
      } else {
        // Streaming returned null
        const failMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `**Phase ${phaseNumber} Failed:** No response from AI. The phase remains in-progress for retry.`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, failMsg]);
        executingPhaseRef.current = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `**Phase ${phaseNumber} Error:** ${errorMessage}\n\nThe phase remains in-progress for retry.`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      executingPhaseRef.current = null;
    } finally {
      setIsGenerating(false);
    }
  }, [
    dynamicBuildPhases.plan,
    dynamicBuildPhases.getExecutionPromptAsync,
    dynamicBuildPhases.getExecutionContext,
    dynamicBuildPhases.completePhase,
    streaming,
    currentComponent,
    appConcept,
    setChatMessages,
    setIsGenerating,
    setCurrentComponent,
    setComponents,
    setActiveTab,
    saveVersion,
    saveComponentToDb,
  ]);

  // Auto-start build if in ACT mode, reviewed, and ready (Zombie State Prevention)
  useEffect(() => {
    if (
      currentMode === 'ACT' &&
      isReviewed &&
      dynamicBuildPhases.plan &&
      !dynamicBuildPhases.isBuilding &&
      !dynamicBuildPhases.currentPhase
    ) {
      tryStartPhase1();
    }
  }, [
    currentMode,
    isReviewed,
    dynamicBuildPhases.plan,
    dynamicBuildPhases.isBuilding,
    dynamicBuildPhases.currentPhase,
    tryStartPhase1,
  ]);

  // Auto-execute phases when they become "in-progress" (Phase 2+)
  // Phase 1 is handled by tryStartPhase1 (layout injection or manual).
  // This effect connects startPhase() → executePhase() for automatic AI generation.
  useEffect(() => {
    const phase = dynamicBuildPhases.currentPhase;
    if (
      phase &&
      phase.number > 1 &&
      !streaming.isStreaming &&
      !isGenerating &&
      !dynamicBuildPhases.isPaused &&
      executingPhaseRef.current !== phase.number
    ) {
      executingPhaseRef.current = phase.number;
      executePhase(phase.number);
    }
  }, [
    dynamicBuildPhases.currentPhase,
    dynamicBuildPhases.isPaused,
    streaming.isStreaming,
    isGenerating,
    executePhase,
  ]);

  // Persist UI state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ai_builder_active_tab', activeTab);
    } catch {
      // Failed to save UI state
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ai_builder_user_input', userInput);
    } catch {
      // Failed to save user input
    }
  }, [userInput]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (uploadedImage) {
        localStorage.setItem('ai_builder_uploaded_image', uploadedImage);
      } else {
        localStorage.removeItem('ai_builder_uploaded_image');
      }
    } catch {
      // Failed to save uploaded image
    }
  }, [uploadedImage]);

  // Restore UI state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedTab = localStorage.getItem('ai_builder_active_tab');
      if (savedTab && (savedTab === 'chat' || savedTab === 'preview' || savedTab === 'code')) {
        setActiveTab(savedTab);
      }

      const savedInput = localStorage.getItem('ai_builder_user_input');
      if (savedInput) {
        setUserInput(savedInput);
      }

      const savedImage = localStorage.getItem('ai_builder_uploaded_image');
      if (savedImage) {
        setUploadedImage(savedImage);
      }
    } catch {
      // Failed to restore UI state
    }
  }, [setActiveTab, setUserInput, setUploadedImage]);

  // Persist wizard state for PLAN mode
  useEffect(() => {
    if (typeof window === 'undefined' || currentMode !== 'PLAN') return;
    try {
      localStorage.setItem('ai_builder_wizard_state', JSON.stringify(wizardState));
    } catch {
      // Failed to save wizard state
    }
  }, [wizardState, currentMode]);

  // Restore wizard state on mount if in PLAN mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedWizardState = localStorage.getItem('ai_builder_wizard_state');
      if (savedWizardState) {
        const parsed = JSON.parse(savedWizardState);
        setWizardState(parsed);
      }
    } catch {
      // Failed to restore wizard state
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  onSendMessage={currentMode === 'PLAN' ? handleSendMessage : sendMessage}
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
                  suggestedActions={suggestedActions}
                  onAction={handlePlanAction}
                  onRegeneratePhases={handleRegeneratePhases}
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
                  // Auto-start first phase if ready and not already building
                  if (
                    dynamicBuildPhases.plan &&
                    !dynamicBuildPhases.isBuilding &&
                    !dynamicBuildPhases.currentPhase
                  ) {
                    tryStartPhase1();
                  }
                }}
                buildState={{
                  uiPhases: dynamicBuildPhases.uiPhases,
                  dynamicPhases: dynamicBuildPhases.phases,
                  progress: dynamicBuildPhases.progress,
                  isBuilding: dynamicBuildPhases.isBuilding,
                  isPaused: dynamicBuildPhases.isPaused,
                  currentPhase: dynamicBuildPhases.currentPhase,
                  codeContextAppId: dynamicBuildPhases.codeContextAppId,
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
          defaultName={appConcept?.name}
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

        {/* Concept Update Confirmation Dialog */}
        <ConceptUpdateConfirmDialog
          isOpen={pendingConceptUpdate !== null}
          changes={pendingConceptUpdate?.changes || []}
          onConfirm={confirmConceptUpdate}
          onCancel={cancelConceptUpdate}
        />

        {/* Project Documentation Panel */}
        {showDocumentationPanel && <ProjectDocumentationPanel />}
      </div>
    </ToastProvider>
  );
}

export default MainBuilderView;
