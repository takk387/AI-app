'use client';

/**
 * AIBuilder - Refactored Orchestrator Component
 *
 * This component has been refactored from 3182 lines to ~1570 lines (50% reduction).
 * It now uses:
 * - Zustand store for state management
 * - Extracted ChatPanel and PreviewPanel components
 * - Custom hooks (useVersionControl, useDatabaseSync, useKeyboardShortcuts, useFileStorage, useMessageSender, useDynamicBuildPhases)
 * - Modal components from ./modals
 *
 * All functionality is preserved from the original implementation.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore, type MainView } from '@/store/useAppStore';

// Extracted components
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { ToastProvider } from './Toast';
import NaturalConversationWizard from './NaturalConversationWizard';
import LayoutBuilderWizard from './LayoutBuilderWizard';
import SettingsPage from './SettingsPage';
import BuilderHeader from './BuilderHeader';
import TabNavigation from './TabNavigation';

// UI components
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui';

// Modal components
import {
  LibraryModal,
  ApprovalModal,
  VersionHistoryModal,
  DeploymentModal,
  DiffPreviewModal,
  StagingConsentModal,
  CompareVersionsModal,
  PhasedBuildPanel,
  NameAppModal,
} from './modals';
import ShareModal from './modals/ShareModal';

// Build system components
import { PhaseDetailView } from './build';

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
import type { WizardState } from '@/hooks';
import { useDynamicBuildPhases } from '@/hooks/useDynamicBuildPhases';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';
import { useSmartContext } from '@/hooks/useSmartContext';
import { useProjectDocumentation } from '@/hooks/useProjectDocumentation';

// Documentation components
import { ProjectDocumentationPanel } from './documentation';

// Context Compression
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
} from '@/utils/contextCompression';

// Types
import type { AppConcept, ImplementationPlan, BuildPhase } from '../types/appConcept';
import type {
  GeneratedComponent,
  ChatMessage,
  AppVersion,
  StagePlan,
  Phase,
  PendingDiff,
} from '../types/aiBuilderTypes';
import type { PhaseId } from '../types/buildPhases';
import type { DynamicPhasePlan, PhaseExecutionResult } from '../types/dynamicPhases';
import { buildPhaseExecutionPrompt } from '../services/PhaseExecutionManager';

// Utils
import {
  exportAppAsZip,
  downloadBlob,
  parseAppFiles,
  getDeploymentInstructions,
} from '../utils/exportApp';
import { captureLayoutPreview } from '../utils/screenshotCapture';
import type { LayoutDesign, DesignChange } from '../types/layoutDesign';

// Services
import { createClient } from '@/utils/supabase/client';
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for messages and components
 * Uses crypto.randomUUID() with fallback for older environments
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get welcome message for new conversations
 */
function getWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'system',
    content:
      "👋 Hi! I'm your AI App Builder.\n\n🎯 **How It Works:**\n\n**💭 PLAN Mode** (Current):\n• Discuss what you want to build\n• Design requirements and architecture\n• No code - just planning and roadmapping\n\n**⚡ ACT Mode:**\n• Generates working code from our plan\n• Modifies apps with surgical precision\n• Real-time streaming progress\n\n**🔒 Smart Protection:**\n• Every change saved to version history\n• One-click undo/redo anytime\n• Review changes before applying\n\n**✨ Pro Features:**\n🧙‍♂️ Use Wizards for guided planning • 🏗️ Build in phases • 🖼️ Upload design inspiration • 📦 Export & deploy\n\n💡 **Start by telling me what you want to build, and we'll plan it together!**",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extract component name from user prompt
 */
function extractComponentName(prompt: string): string {
  const words = prompt.split(' ').slice(0, 3).join(' ');
  return words.length > 30 ? words.slice(0, 27) + '...' : words;
}

/**
 * Phase data structure from API response
 * Properties are optional since API responses may be incomplete
 */
interface PhaseApiData {
  number?: number;
  name?: string;
  description?: string;
  features?: string[];
}

/**
 * Format phase data from API response into displayable content
 * Safely handles potentially missing properties with defaults
 */
function formatPhaseContent(phases: PhaseApiData[]): string {
  if (!Array.isArray(phases) || phases.length === 0) {
    return 'No phases defined';
  }

  return phases
    .map((phase, index) => {
      const phaseNumber = phase.number ?? index + 1;
      const phaseName = phase.name ?? 'Unnamed Phase';
      const phaseDescription = phase.description ?? '';
      const features = Array.isArray(phase.features)
        ? phase.features.map((f) => `  • ${f}`).join('\n')
        : '';

      return `**Phase ${phaseNumber}: ${phaseName}**\n${phaseDescription}${features ? '\n' + features : ''}`;
    })
    .join('\n\n');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIBuilder() {
  // Authentication
  const { user, sessionReady } = useAuth();

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
    setLastUserRequest,

    // Components
    components,
    setComponents,
    currentComponent,
    setCurrentComponent,
    addComponent,
    setLoadingApps,
    setDbSyncError,

    // UI
    isClient,
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
    showApprovalModal,
    setShowApprovalModal,
    showDeploymentModal,
    setShowDeploymentModal,
    showCompareModal,
    setShowCompareModal,
    showNewAppStagingModal,
    setShowNewAppStagingModal,
    showConversationalWizard,
    setShowConversationalWizard,
    showLayoutBuilder,
    setShowLayoutBuilder,
    showAdvancedPhasedBuild,
    setShowAdvancedPhasedBuild,
    showNameAppModal,
    setShowNameAppModal,
    showShareModal,
    setShowShareModal,
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,

    // Data
    pendingChange,
    setPendingChange,
    pendingDiff,
    setPendingDiff,
    pendingNewAppRequest,
    setPendingNewAppRequest,
    deploymentInstructions,
    setDeploymentInstructions,
    exportingApp,
    setExportingApp,
    compareVersions,
    setCompareVersions,
    newAppStagePlan,
    setNewAppStagePlan,
    appConcept,
    setAppConcept,
    setImplementationPlan,
    selectedPhaseId,
    setSelectedPhaseId,
    isValidating,
    setIsValidating,
    uploadedImage,
    setUploadedImage,

    // File storage
    contentTab,
    setContentTab,
  } = useAppStore();

  // ============================================================================
  // LOCAL STATE (refs, computed values, etc)
  // ============================================================================
  const previousModeRef = useRef<'PLAN' | 'ACT'>('PLAN');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart Conversations: Wizard state for PLAN mode
  const [wizardState, setWizardState] = useState<WizardState>({
    features: [],
    technical: {},
    isComplete: false,
    readyForPhases: false,
  });

  // Dynamic Phase Generation state
  const [dynamicPhasePlan, setDynamicPhasePlan] = useState<DynamicPhasePlan | null>(null);

  // Initialize StorageService
  const [storageService] = useState(() => {
    const supabase = createClient();
    const analytics = new StorageAnalyticsService(supabase);
    return new StorageService(supabase, analytics);
  });

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================

  // Memoized error handler for database sync to prevent infinite loops
  const handleDbError = useCallback(
    (error: string) => {
      setDbSyncError(error);
    },
    [setDbSyncError]
  );

  // Database sync hook
  const {
    saveComponent: saveComponentToDb,
    deleteComponent: deleteComponentFromDb,
    loadComponents: loadComponentsFromDb,
  } = useDatabaseSync({
    userId: user?.id || null,
    onError: handleDbError,
  });

  // Version control hook
  const versionControl = useVersionControl({
    currentComponent,
    onComponentUpdate: (updated) => {
      setCurrentComponent(updated);
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent?.id ? updated : comp))
      );
    },
  });

  // File storage hook
  const fileStorage = useFileStorage({
    userId: user?.id || null,
    storageService,
  });

  // Smart context management (compression + semantic memory combined)
  const smartContext = useSmartContext();

  // Project documentation hook for auto-capture
  const projectDocumentation = useProjectDocumentation({
    userId: user?.id || null,
    appId: currentComponent?.id || null,
  });

  // Message sender utilities
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
    onShowStagingModal: (request) => {
      setPendingNewAppRequest(request);
      setShowNewAppStagingModal(true);
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

  // Streaming generation hook for real-time progress
  const streaming = useStreamingGeneration({
    onStart: () => {
      setGenerationProgress('Starting generation...');
    },
    onFileStart: (filePath) => {
      setGenerationProgress(`Generating ${filePath.split('/').pop()}...`);
    },
    onComplete: () => {
      // Generation complete
    },
    onError: (message) => {
      console.error('Streaming error:', message);
    },
  });

  // Dynamic build phases hook (replaces useBuildPhases)
  const dynamicBuildPhases = useDynamicBuildPhases({
    onPlanInitialized: (plan) => {
      // Capture plan snapshot to documentation
      projectDocumentation.capturePlanSnapshot(plan);
      projectDocumentation.startBuild();
    },
    onPhaseStart: (phase) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `🚀 **Starting Phase ${phase.number}: ${phase.name}**\n\n${phase.description}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, notification]);

      // Record phase start in documentation
      projectDocumentation.recordPhaseStart(phase.number, phase.name, {
        domain: phase.domain,
        features: phase.features,
        description: phase.description,
        estimatedTokens: phase.estimatedTokens,
      });
    },
    onPhaseComplete: (phase, result) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: result.success
          ? `✅ **Phase ${phase.number} Complete!**\n\nImplemented ${result.implementedFeatures.length} features in ${(result.duration / 1000).toFixed(1)}s`
          : `⚠️ **Phase ${phase.number} had issues**\n\n${result.errors?.join('\n') || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, notification]);

      // Record phase completion in documentation
      projectDocumentation.recordPhaseComplete(phase.number, {
        success: result.success,
        generatedCode: result.generatedCode,
        generatedFiles: result.generatedFiles,
        implementedFeatures: result.implementedFeatures,
        errors: result.errors,
        tokensUsed: result.tokensUsed,
      });
    },
    onBuildComplete: (plan) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `🎉 **Build Complete!**\n\nAll ${plan.totalPhases} phases finished. Your app is ready!`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, notification]);

      // Mark build as complete in documentation
      projectDocumentation.completeBuild();

      // Store semantic memories from the conversation for cross-session learning
      // This extracts preferences, decisions, and patterns for future builds
      // Uses useSmartContext hook which handles initialization and error cases
      smartContext.storeConversationMemories(chatMessages).catch((err) => {
        console.warn('[SemanticMemory] Failed to store memories:', err);
      });
    },
    onBuildFailed: (error, phase) => {
      // Record build failure in documentation
      projectDocumentation.failBuild(`${phase ? `Phase ${phase.number}: ` : ''}${error.message}`);
    },
    onError: (error, phase) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `❌ **Build Error${phase ? ` in Phase ${phase.number}` : ''}**\n\n${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, notification]);
    },
  });

  // Helper: Compress conversation history for ACT mode requests
  // Uses the same compression as PLAN mode to reduce token usage
  const compressForACTMode = useCallback(
    (
      messages: ChatMessage[],
      maxTokens = 50000
    ): { history: Array<{ role: 'user' | 'assistant'; content: string }>; summary?: string } => {
      // Filter out system messages and map to API format
      const filteredMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        }));

      // Check if compression is needed
      if (needsCompression(filteredMessages, maxTokens)) {
        const compressed = compressConversation(filteredMessages, {
          maxTokens,
          preserveLastN: 30, // Keep more recent for ACT mode context
        });

        return {
          history: compressed.recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          summary:
            compressed.summary.messageCount > 0 ? buildCompressedContext(compressed) : undefined,
        };
      }

      // No compression needed - return last 50 messages
      return {
        history: filteredMessages.slice(-50).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      };
    },
    []
  );

  // Helper: Build smart context with compression + semantic memories
  // This is an async version that uses the useSmartContext hook
  // Prefixed with _ as it's prepared for future use when callers are refactored to async
  const _buildSmartContextForRequest = useCallback(
    async (
      messages: ChatMessage[],
      query: string,
      maxTokens = 50000
    ): Promise<{
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
      contextSummary?: string;
      memoriesContext?: string;
    }> => {
      // If smart context is ready and memory is enabled, use it
      if (smartContext.isInitialized && smartContext.isMemoryEnabled) {
        const result = await smartContext.buildSmartContext(messages, query, {
          maxTokens,
          preserveLastN: 30,
          includeMemories: true,
        });

        return {
          history: result.compressed.recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          contextSummary:
            result.compressed.summary.messageCount > 0
              ? buildCompressedContext(result.compressed)
              : undefined,
          memoriesContext: result.memoriesContext || undefined,
        };
      }

      // Fallback to regular compression
      const compressed = compressForACTMode(messages, maxTokens);
      return {
        history: compressed.history,
        contextSummary: compressed.summary,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [smartContext.isInitialized, smartContext.isMemoryEnabled, compressForACTMode]
  );

  // Handle escape to close open modals/panels in priority order
  const handleEscapeKey = useCallback(() => {
    if (showSettings) {
      setShowSettings(false);
    } else if (showLibrary) {
      setShowLibrary(false);
    } else if (showVersionHistory) {
      setShowVersionHistory(false);
    } else if (showDiffPreview) {
      setShowDiffPreview(false);
    } else if (showApprovalModal) {
      setShowApprovalModal(false);
    } else if (showDeploymentModal) {
      setShowDeploymentModal(false);
    } else if (showCompareModal) {
      setShowCompareModal(false);
    }
  }, [
    showSettings,
    showLibrary,
    showVersionHistory,
    showDiffPreview,
    showApprovalModal,
    showDeploymentModal,
    showCompareModal,
    setShowSettings,
    setShowLibrary,
    setShowVersionHistory,
    setShowDiffPreview,
    setShowApprovalModal,
    setShowDeploymentModal,
    setShowCompareModal,
  ]);

  // Keyboard shortcuts - comprehensive handling
  useKeyboardShortcuts({
    onUndo: versionControl.undo,
    onRedo: versionControl.redo,
    onSave: () => {
      if (currentComponent) {
        saveComponentToDb(currentComponent);
      }
    },
    onEscape: handleEscapeKey,
    enabled: !!currentComponent,
    context: 'builder',
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize client-side only
  useEffect(() => {
    setIsClient(true);
    setChatMessages([getWelcomeMessage()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - setters are stable

  // Detect mode transitions
  useEffect(() => {
    const previousMode = previousModeRef.current;
    previousModeRef.current = currentMode;

    if (previousMode === 'PLAN' && currentMode === 'ACT') {
      const transitionMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `⚡ **Switched to ACT Mode**\n\nReady to build! I'll read the plan we discussed and implement it.\n\n**To build:** Type "build it" or "implement the plan" and I'll create your app based on our conversation.`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, transitionMessage]);
    }

    if (previousMode === 'ACT' && currentMode === 'PLAN') {
      const transitionMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `💭 **Switched to PLAN Mode**\n\nLet's plan your next feature or discuss improvements. I won't generate code in this mode - we'll design the requirements first.`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, transitionMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode]); // Only react to mode changes - setChatMessages is stable

  // Load components from database
  useEffect(() => {
    let mounted = true;

    const loadApps = async () => {
      if (!sessionReady) return;
      if (!mounted) return;

      setLoadingApps(true);
      setDbSyncError(null);

      try {
        if (user) {
          // Load from database
          const dbComponents = await loadComponentsFromDb();

          // Load from localStorage
          let localComponents: GeneratedComponent[] = [];
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ai_components');
            if (stored) {
              try {
                localComponents = JSON.parse(stored);
              } catch {
                // Error parsing localStorage
              }
            }
          }

          // Merge components
          const mergedMap = new Map<string, GeneratedComponent>();
          localComponents.forEach((comp) => mergedMap.set(comp.id, comp));
          dbComponents.forEach((comp) => mergedMap.set(comp.id, comp));

          const mergedComponents = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          setComponents(mergedComponents);

          // Cache in localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('ai_components', JSON.stringify(mergedComponents));

              // Restore last active app
              const lastAppId = localStorage.getItem('current_app_id');
              if (lastAppId && mergedComponents.length > 0) {
                const lastApp = mergedComponents.find((c) => c.id === lastAppId);
                if (lastApp) {
                  setCurrentComponent(lastApp);
                  if (lastApp.conversationHistory && lastApp.conversationHistory.length > 0) {
                    setChatMessages(lastApp.conversationHistory);
                  }
                  setActiveTab('preview');
                }
              }
            } catch {
              // Failed to save to localStorage
            }
          }
        } else {
          // Load from localStorage only
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ai_components');
            if (stored) {
              try {
                const parsedComponents = JSON.parse(stored);
                setComponents(parsedComponents);

                const lastAppId = localStorage.getItem('current_app_id');
                if (lastAppId && parsedComponents.length > 0) {
                  const lastApp = parsedComponents.find(
                    (c: GeneratedComponent) => c.id === lastAppId
                  );
                  if (lastApp) {
                    setCurrentComponent(lastApp);
                    if (lastApp.conversationHistory && lastApp.conversationHistory.length > 0) {
                      setChatMessages(lastApp.conversationHistory);
                    }
                    setActiveTab('preview');
                  }
                }
              } catch {
                // Error loading components from localStorage
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in loadApps:', error);
        setDbSyncError('Failed to load apps');
      } finally {
        setLoadingApps(false);
      }
    };

    loadApps();

    return () => {
      mounted = false;
    };
    // Note: This effect should only run when sessionReady or user changes.
    // loadComponentsFromDb is stable after we memoized handleDbError.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, user?.id]);

  // Save components to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && components.length > 0) {
      try {
        localStorage.setItem('ai_components', JSON.stringify(components));
      } catch {
        // Failed to save components to localStorage
      }
    }
  }, [components]);

  // Save current app ID to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentComponent) {
      try {
        localStorage.setItem('current_app_id', currentComponent.id);
      } catch {
        // Failed to save current app ID to localStorage
      }
    }
  }, [currentComponent?.id]);

  // Load files when storage tab is active
  useEffect(() => {
    if (user && showLibrary && contentTab === 'files') {
      fileStorage.loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showLibrary, contentTab]); // fileStorage.loadFiles is stable

  // Sync StagePlan with dynamicBuildPhases state changes
  // This keeps newAppStagePlan in sync with the hook's internal plan state
  useEffect(() => {
    if (dynamicBuildPhases.plan) {
      setNewAppStagePlan({
        totalPhases: dynamicBuildPhases.plan.totalPhases,
        currentPhase: dynamicBuildPhases.plan.currentPhaseNumber || 0,
        phases: dynamicBuildPhases.plan.phases.map((p) => ({
          number: p.number,
          name: p.name,
          description: p.description,
          features: p.features,
          // Map dynamic phase status to StagePlan PhaseStatus
          // StagePlan only supports: 'pending' | 'building' | 'complete'
          status:
            p.status === 'completed'
              ? ('complete' as const)
              : p.status === 'in-progress'
                ? ('building' as const)
                : ('pending' as const), // failed/skipped/pending all map to pending
        })),
      });
    }
  }, [dynamicBuildPhases.plan, dynamicBuildPhases.phases, setNewAppStagePlan]);

  // ============================================================================
  // AUTO-CAPTURE EFFECTS FOR PROJECT DOCUMENTATION
  // ============================================================================

  // Auto-create documentation when a new app is created
  // This effect watches for: currentComponent exists + no documentation + not loading
  const docCreationAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if no app, no user, or already loading/saving
    if (
      !currentComponent?.id ||
      !user?.id ||
      projectDocumentation.isLoading ||
      projectDocumentation.isSaving
    ) {
      return;
    }

    // Skip if documentation already exists for this app
    if (projectDocumentation.documentation?.appId === currentComponent.id) {
      return;
    }

    // Skip if we already attempted to create for this app ID
    if (docCreationAttemptedRef.current === currentComponent.id) {
      return;
    }

    // Mark that we're attempting creation for this app
    docCreationAttemptedRef.current = currentComponent.id;

    // Create documentation for this app
    const createDocs = async () => {
      const doc = await projectDocumentation.getOrCreateDocumentation(
        currentComponent.name || 'Untitled App'
      );

      if (doc) {
        // If we have a pending concept from wizard, capture it
        if (appConcept && appConcept.name) {
          await projectDocumentation.captureConceptSnapshot(appConcept, {
            source: 'wizard',
          });
        }

        // If we have a pending plan from wizard, it will be captured
        // when dynamicBuildPhases.initializePlan is called (via onPlanInitialized callback)
        // But if plan already exists, capture it now
        if (dynamicPhasePlan && !projectDocumentation.documentation?.planSnapshot) {
          await projectDocumentation.capturePlanSnapshot(dynamicPhasePlan);
        }
      }
    };

    createDocs().catch((err) => {
      console.error('Failed to auto-create documentation:', err);
    });
  }, [
    currentComponent?.id,
    currentComponent?.name,
    user?.id,
    projectDocumentation,
    appConcept,
    dynamicPhasePlan,
  ]);

  // Track previous activeView for layout capture on tab switch
  const previousActiveViewRef = useRef<MainView>(activeView);

  // Capture layout design when switching away from layout tab
  useEffect(() => {
    const previousView = previousActiveViewRef.current;
    previousActiveViewRef.current = activeView;

    // If we're switching away from layout view and have a layout design, capture it
    if (
      previousView === 'layout' &&
      activeView !== 'layout' &&
      currentComponent?.id &&
      projectDocumentation.documentation
    ) {
      const currentLayoutDesign = useAppStore.getState().currentLayoutDesign;
      if (currentLayoutDesign) {
        // Capture layout snapshot (screenshot capture would be added separately if needed)
        projectDocumentation.captureLayoutSnapshot(currentLayoutDesign).catch((err) => {
          console.error('Failed to capture layout snapshot:', err);
        });
      }
    }
  }, [activeView, currentComponent?.id, projectDocumentation]);

  // Track previous mode for capturing when switching PLAN -> ACT
  const previousModeForDocRef = useRef<'PLAN' | 'ACT'>(currentMode);

  // Capture builder chat context when switching from PLAN to ACT mode
  useEffect(() => {
    const previousMode = previousModeForDocRef.current;
    previousModeForDocRef.current = currentMode;

    // If switching from PLAN to ACT and have documentation, capture the planning context
    if (
      previousMode === 'PLAN' &&
      currentMode === 'ACT' &&
      projectDocumentation.documentation &&
      chatMessages.length > 1
    ) {
      projectDocumentation
        .captureBuilderChatSnapshot(chatMessages, {
          name: currentComponent?.name,
          description: wizardState.description,
        })
        .catch((err) => {
          console.error('Failed to capture builder chat snapshot:', err);
        });
    }
  }, [
    currentMode,
    chatMessages,
    currentComponent?.name,
    wizardState.description,
    projectDocumentation,
  ]);

  // Auto-capture builder chat every 15 messages in PLAN mode
  useEffect(() => {
    if (
      currentMode === 'PLAN' &&
      projectDocumentation.documentation &&
      chatMessages.length > 1 &&
      projectDocumentation.shouldCaptureAtMessageCount(chatMessages.length)
    ) {
      projectDocumentation
        .captureBuilderChatSnapshot(chatMessages, {
          name: currentComponent?.name,
          description: wizardState.description,
        })
        .catch((err) => {
          console.error('Failed to auto-capture builder chat:', err);
        });
    }
  }, [
    chatMessages.length,
    currentMode,
    currentComponent?.name,
    wizardState.description,
    projectDocumentation,
  ]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Image upload handler
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [setUploadedImage]
  );

  // Remove uploaded image
  const removeImage = useCallback(() => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setUploadedImage]);

  // Generate implementation plan from app concept
  const generateImplementationPlan = useCallback(
    (concept: AppConcept) => {
      const phases: BuildPhase[] = [];
      let phaseNumber = 1;

      // Phase 1: Foundation & Layout
      phases.push({
        id: `phase-${phaseNumber}`,
        phaseNumber,
        name: 'Foundation & Layout',
        description: `Set up the base structure with ${concept.uiPreferences.layout} layout, ${concept.uiPreferences.style} style, and ${concept.uiPreferences.colorScheme} color scheme`,
        objectives: [
          'Create main layout structure',
          'Set up navigation',
          'Implement responsive design',
          'Apply theme and styling',
        ],
        prompt: `Create a ${concept.uiPreferences.layout} layout for "${concept.name}" with ${concept.uiPreferences.style} styling and ${concept.uiPreferences.colorScheme} color scheme.`,
        dependencies: [],
        features: [],
        estimatedComplexity: 'moderate',
        status: 'pending',
      });
      phaseNumber++;

      // Phase 2: Core Features (High Priority)
      const highPriorityFeatures = concept.coreFeatures.filter((f) => f.priority === 'high');
      if (highPriorityFeatures.length > 0) {
        phases.push({
          id: `phase-${phaseNumber}`,
          phaseNumber,
          name: 'Core Features',
          description: 'Implement high-priority features',
          objectives: highPriorityFeatures.map((f) => f.name),
          prompt: `Add these core features to "${concept.name}": ${highPriorityFeatures.map((f) => `${f.name} - ${f.description}`).join('; ')}`,
          dependencies: [`phase-${phaseNumber - 1}`],
          features: highPriorityFeatures.map((f) => f.id),
          estimatedComplexity: 'complex',
          status: 'pending',
        });
        phaseNumber++;
      }

      // More phases can be added here...

      const plan: ImplementationPlan = {
        concept,
        phases,
        estimatedSteps: phases.length,
        createdAt: new Date().toISOString(),
      };

      setImplementationPlan(plan);

      // Add system message about the plan
      const planMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content:
          `🎯 **Implementation Plan Created for "${concept.name}"**\n\n` +
          `I've analyzed your app concept and created a ${phases.length}-phase build plan:\n\n` +
          phases
            .map((p) => `**Phase ${p.phaseNumber}: ${p.name}**\n${p.description}`)
            .join('\n\n') +
          `\n\n💡 **Ready to start building?** Switch to **⚡ ACT Mode** and type "build phase 1" or "start building" to begin!`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, planMessage]);

      // Convert to StagePlan format
      const stagePlan: StagePlan = {
        totalPhases: phases.length,
        currentPhase: 0,
        phases: phases.map((p) => ({
          number: p.phaseNumber,
          name: p.name,
          description: p.description,
          features: p.objectives,
          status: 'pending' as const,
        })),
      };
      setNewAppStagePlan(stagePlan);
    },
    [setChatMessages, setImplementationPlan, setNewAppStagePlan]
  );

  // Handle natural wizard completion with dynamic phase plan
  const handleNaturalWizardComplete = useCallback(
    (concept: AppConcept, phasePlan?: DynamicPhasePlan) => {
      setAppConcept(concept);
      setShowConversationalWizard(false);

      if (phasePlan) {
        setDynamicPhasePlan(phasePlan);
        // Initialize the dynamic build phases hook with the plan
        dynamicBuildPhases.initializePlan(phasePlan);

        // Convert to existing StagePlan format for compatibility
        const stagePlan: StagePlan = {
          totalPhases: phasePlan.totalPhases,
          currentPhase: 0,
          phases: phasePlan.phases.map((p) => ({
            number: p.number,
            name: p.name,
            description: p.description,
            features: p.features,
            status: 'pending' as const,
          })),
        };
        setNewAppStagePlan(stagePlan);

        // Show phase plan message with optional design system indicator
        const designSystemInfo = concept.layoutDesign
          ? `\n🎨 **Design System:** Using "${concept.layoutDesign.name || 'Custom Layout'}" - exact colors, typography & styles will be applied\n`
          : '';
        const planMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content:
            `🎯 **${phasePlan.totalPhases}-Phase Build Plan Created for "${concept.name}"**\n\n` +
            `**Complexity:** ${phasePlan.complexity}\n` +
            `**Estimated Time:** ${phasePlan.estimatedTotalTime}${designSystemInfo}\n\n` +
            phasePlan.phases
              .map((p) => `**Phase ${p.number}: ${p.name}** (${p.estimatedTime})\n${p.description}`)
              .join('\n\n') +
            `\n\n💡 **Ready to start?** Switch to ACT mode and type "build phase 1"!`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, planMessage]);
      } else {
        // No phase plan, just show concept created message
        const designInfo = concept.layoutDesign
          ? `\n🎨 **Design System:** Using "${concept.layoutDesign.name || 'Custom Layout'}"\n`
          : '';
        const welcomeMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content:
            `✨ **App Concept Created: "${concept.name}"**\n\n` +
            `**Description:** ${concept.description}\n\n` +
            `**Target Users:** ${concept.targetUsers}\n\n` +
            `**Features:** ${concept.coreFeatures.length} defined${designInfo}\n\n` +
            `I'm now generating your implementation plan...`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, welcomeMessage]);
        generateImplementationPlan(concept);
      }
    },
    [
      setAppConcept,
      setShowConversationalWizard,
      setChatMessages,
      setNewAppStagePlan,
      generateImplementationPlan,
      dynamicBuildPhases,
    ]
  );

  // Start building with dynamic phase plan (context-chained execution)
  const startDynamicPhasedBuild = useCallback(
    async (phaseNumber: number = 1) => {
      if (!dynamicPhasePlan) {
        console.error('No dynamic phase plan available');
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: '❌ No phase plan available. Please use the Wizard to create a plan first.',
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
        return;
      }

      // Use the hook's execution context and prompt builder (avoids creating duplicate managers)
      const context = dynamicBuildPhases.getExecutionContext(phaseNumber);
      if (!context) {
        // Fallback: If hook's manager not ready, create temporary context from plan
        const phase = dynamicPhasePlan.phases.find((p) => p.number === phaseNumber);
        if (!phase) {
          console.error(`Phase ${phaseNumber} not found in plan`);
          return;
        }

        // Build a basic prompt for the fallback case
        const fallbackPrompt = `Build Phase ${phaseNumber}: ${phase.name}\n\nDescription: ${phase.description}\n\nFeatures to implement:\n${phase.features.map((f) => `- ${f}`).join('\n')}`;

        const startMessage: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🚀 **Starting Phase ${phaseNumber}: ${phase.name}**\n\n${phase.description}\n\n**Features to implement:**\n${phase.features.map((f) => `- ${f}`).join('\n')}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, startMessage]);
        setUserInput(fallbackPrompt);
      } else {
        const prompt =
          dynamicBuildPhases.getExecutionPrompt(phaseNumber) || buildPhaseExecutionPrompt(context);

        // Add a message showing we're starting this phase
        const startMessage: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🚀 **Starting Phase ${phaseNumber}: ${context.phaseName}**\n\n${context.phaseDescription}\n\n**Features to implement:**\n${context.features.map((f) => `- ${f}`).join('\n')}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, startMessage]);

        // Set the prompt in the input for the user to send or modify
        setUserInput(prompt);
      }

      // Auto-open the phased build panel when building starts
      setShowAdvancedPhasedBuild(true);

      // Mark phase as in-progress in the hook's state
      dynamicBuildPhases.startPhase(phaseNumber);
      setCurrentMode('ACT');

      // Update the stage plan to show this phase as in-progress
      setNewAppStagePlan((prev) =>
        prev
          ? {
              ...prev,
              currentPhase: phaseNumber,
              phases: prev.phases.map((p) =>
                p.number === phaseNumber ? { ...p, status: 'building' as const } : p
              ),
            }
          : null
      );
    },
    [
      dynamicPhasePlan,
      dynamicBuildPhases,
      setChatMessages,
      setUserInput,
      setCurrentMode,
      setNewAppStagePlan,
      setShowAdvancedPhasedBuild,
    ]
  );

  // Handle advanced phased build start - generates dynamic phases from app concept
  const handleStartAdvancedPhasedBuild = useCallback(async () => {
    if (!appConcept) return;

    // Show generating message
    const generatingMessage: ChatMessage = {
      id: generateId(),
      role: 'system',
      content: `🔄 **Generating Phase Plan...**\n\nAnalyzing "${appConcept.name}" to create an optimal build plan.`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, generatingMessage]);

    try {
      // Call API to generate dynamic phases
      const response = await fetch('/api/wizard/generate-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: appConcept }),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        const phasePlan: DynamicPhasePlan = data.plan;
        setDynamicPhasePlan(phasePlan);
        dynamicBuildPhases.initializePlan(phasePlan);
        setShowAdvancedPhasedBuild(true);

        // Sync with StagePlan for ChatPanel display
        const stagePlan: StagePlan = {
          totalPhases: phasePlan.totalPhases,
          currentPhase: 0,
          phases: phasePlan.phases.map((p) => ({
            number: p.number,
            name: p.name,
            description: p.description,
            features: p.features,
            status: 'pending' as const,
          })),
        };
        setNewAppStagePlan(stagePlan);

        const notification: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🏗️ **${phasePlan.totalPhases}-Phase Build Plan Created**\n\nBuilding "${appConcept.name}" with ${phasePlan.complexity} complexity.\n\n**Estimated time:** ${phasePlan.estimatedTotalTime}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, notification]);
      } else {
        throw new Error(data.error || 'Failed to generate phase plan');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `❌ **Failed to generate phase plan**\n\n${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    }
  }, [
    appConcept,
    dynamicBuildPhases,
    setShowAdvancedPhasedBuild,
    setChatMessages,
    setNewAppStagePlan,
  ]);

  // Handle phase detail view
  const handleViewPhaseDetails = useCallback(
    (phaseId: PhaseId) => {
      setSelectedPhaseId(phaseId);
    },
    [setSelectedPhaseId]
  );

  // Handle phase validation
  const handleRunValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      // For now, validation is handled by the streaming generation API
      // Future: Add specific validation logic for dynamic phases
      const currentPhase = dynamicBuildPhases.currentPhase;
      if (currentPhase) {
        const notification: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🔍 **Validating Phase ${currentPhase.number}...**\n\nChecking: ${currentPhase.testCriteria.join(', ')}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, notification]);
      }
    } finally {
      setIsValidating(false);
    }
  }, [dynamicBuildPhases, setIsValidating, setChatMessages]);

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

  // Send message hook (extracted from inline sendMessage function)
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

  // Version handlers hook (extracted from inline handlers)
  const {
    approveChange,
    rejectChange,
    approveDiff,
    rejectDiff,
    revertToVersion,
    handleCompareVersions,
    handleForkApp,
  } = useVersionHandlers({
    versionControl,
    saveVersion,
    onSaveComponent: saveComponentToDb,
  });

  // App CRUD hook (extracted from inline handlers)
  const { handleNewApp, handleNameAppSubmit, loadComponent, deleteComponent, toggleFavorite } =
    useAppCrud({
      onSaveComponent: saveComponentToDb,
      onDeleteComponent: deleteComponentFromDb,
      getWelcomeMessage,
    });

  // Export app
  const handleExportApp = useCallback(
    async (comp: GeneratedComponent) => {
      setExportingApp(comp);

      try {
        const appData = JSON.parse(comp.code);
        const files = parseAppFiles(appData);

        const zipBlob = await exportAppAsZip({
          appName: comp.name,
          files: files,
        });

        const filename = `${comp.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
        downloadBlob(zipBlob, filename);

        setDeploymentInstructions(getDeploymentInstructions('vercel', comp.name));
        setShowDeploymentModal(true);
      } catch (error) {
        console.error('Error exporting app:', error);
        alert('Failed to export app. Please try again.');
      } finally {
        setExportingApp(null);
      }
    },
    [setExportingApp, setDeploymentInstructions, setShowDeploymentModal]
  );

  // Download code
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

  // Filtered components - memoized to avoid recalculating on every render
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

  // Handle build phase in chat panel
  const handleBuildPhase = useCallback(
    (phase: Phase) => {
      // If we have a dynamic phase plan, use context-aware execution
      if (dynamicPhasePlan) {
        startDynamicPhasedBuild(phase.number);
        return;
      }

      // Fallback to simple prompt for non-dynamic plans
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
    [dynamicPhasePlan, startDynamicPhasedBuild, setUserInput, setNewAppStagePlan]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  // Prevent hydration errors
  if (!isClient) {
    return (
      <div className="h-full bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="h-full bg-zinc-950">
        {/* Header */}
        <BuilderHeader
          projectName={currentComponent?.name || 'Untitled App'}
          onProjectNameChange={(name) => {
            if (currentComponent) {
              // Update component name in store
              const updated = { ...currentComponent, name };
              setCurrentComponent(updated);
            }
          }}
          projectStatus={isGenerating ? 'generating' : currentComponent ? 'saved' : 'draft'}
          hasUnsavedChanges={false}
          currentView={activeTab as 'chat' | 'code' | 'preview' | 'split'}
          onViewChange={(view) => {
            // Map 'split' to 'preview' for the store since ActiveTab doesn't support 'split'
            const mappedView = view === 'split' ? 'preview' : view;
            setActiveTab(mappedView as 'chat' | 'preview' | 'code');
          }}
          onNewProject={handleNewApp}
          onSave={() => {
            if (currentComponent) {
              saveComponentToDb(currentComponent);
            }
          }}
          onExport={(format) => {
            if (currentComponent) {
              switch (format) {
                case 'zip':
                  handleExportApp(currentComponent);
                  break;
                case 'clipboard':
                  navigator.clipboard.writeText(currentComponent.code);
                  break;
                case 'html':
                case 'react':
                  // For HTML/React, use the ZIP export which packages everything
                  handleExportApp(currentComponent);
                  break;
              }
            }
          }}
          onOpenSettings={() => setShowSettings(true)}
          onHelp={() => {
            /* Could open help modal */
          }}
          onWizard={() => setActiveView('wizard')}
          onLayoutBuilder={() => setActiveView('layout')}
          onPhasedBuild={() => setActiveView('build')}
          hasAppConcept={!!appConcept}
          isPhasedMode={activeView === 'build'}
          showPhasedBuildPanel={activeView === 'build'}
          onTogglePhasedPanel={() => setActiveView(activeView === 'build' ? 'main' : 'build')}
          versionCount={currentComponent?.versions?.length || 0}
          onShowHistory={() => setShowVersionHistory(!showVersionHistory)}
          appCount={components.length}
          onShowLibrary={() => setShowLibrary(!showLibrary)}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          onNewApp={handleNewApp}
          onShare={currentComponent ? () => setShowShareModal(true) : undefined}
        />

        {/* Tab Navigation */}
        <TabNavigation />

        {/* Main Content - Builder View */}
        {activeView === 'main' && (
          <div className="max-w-[1800px] mx-auto px-4 py-4 h-[calc(100vh-120px)]">
            <ResizablePanelGroup
              direction="horizontal"
              persistenceKey="ai-builder-layout"
              className="h-full"
            >
              {/* Chat Panel */}
              <ResizablePanel defaultSize={35} minSize={20} maxSize={60}>
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
                    hasLayoutDesign={!!appConcept?.layoutDesign}
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

              {/* Preview Panel */}
              <ResizablePanel defaultSize={65} minSize={30} maxSize={80}>
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
                  onFork={handleForkApp}
                  onExport={handleExportApp}
                  onDownload={downloadCode}
                  isExporting={!!exportingApp}
                  onScreenshot={(image) => {
                    setUploadedImage(image);
                  }}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}

        {/* Wizard View */}
        {activeView === 'wizard' && (
          <div className="h-[calc(100vh-120px)]">
            <NaturalConversationWizard
              onComplete={handleNaturalWizardComplete}
              onCancel={() => setActiveView('main')}
              isFullPage
            />
          </div>
        )}

        {/* Layout View */}
        {activeView === 'layout' && (
          <div className="h-[calc(100vh-120px)]">
            <LayoutBuilderWizard
              isOpen={true}
              onClose={() => setActiveView('main')}
              onApplyToAppConcept={() => {
                // Optionally close the wizard or show a success message
              }}
              isFullPage
            />
          </div>
        )}

        {/* Build View */}
        {activeView === 'build' && dynamicPhasePlan && (
          <div className="h-[calc(100vh-120px)]">
            <PhasedBuildPanel
              isOpen={true}
              onClose={() => setActiveView('main')}
              phases={dynamicBuildPhases.uiPhases}
              progress={dynamicBuildPhases.progress}
              currentPhase={
                dynamicBuildPhases.currentPhase
                  ? dynamicBuildPhases.uiPhases.find(
                      (p) => p.order === dynamicBuildPhases.currentPhase?.number
                    ) || null
                  : null
              }
              isBuilding={dynamicBuildPhases.isBuilding}
              isPaused={dynamicBuildPhases.isPaused}
              isValidating={isValidating}
              onStartBuild={handleStartAdvancedPhasedBuild}
              onPauseBuild={dynamicBuildPhases.pauseBuild}
              onResumeBuild={dynamicBuildPhases.resumeBuild}
              onSkipPhase={(phaseId) => {
                const phase = dynamicBuildPhases.uiPhases.find((p) => p.id === phaseId);
                if (phase) {
                  dynamicBuildPhases.skipPhase(phase.order);
                }
              }}
              onRetryPhase={(phaseId) => {
                const phase = dynamicBuildPhases.uiPhases.find((p) => p.id === phaseId);
                if (phase) {
                  dynamicBuildPhases.retryPhase(phase.order);
                }
              }}
              onViewPhaseDetails={handleViewPhaseDetails}
              onRunValidation={handleRunValidation}
              onResetBuild={dynamicBuildPhases.resetBuild}
              onExecuteCurrentPhase={async () => {
                const nextPhase = dynamicBuildPhases.getNextPhase();
                if (nextPhase) {
                  startDynamicPhasedBuild(nextPhase.number);
                }
              }}
              onProceedToNextPhase={() => {
                const nextPhase = dynamicBuildPhases.getNextPhase();
                if (nextPhase) {
                  startDynamicPhasedBuild(nextPhase.number);
                }
              }}
              dynamicPlan={dynamicPhasePlan}
              isFullPage
              qualityReport={dynamicBuildPhases.qualityReport}
              pipelineState={dynamicBuildPhases.pipelineState}
              isReviewing={dynamicBuildPhases.isReviewing}
              strictness={dynamicBuildPhases.reviewStrictness}
              onRunReview={dynamicBuildPhases.runFinalQualityCheck}
              onStrictnessChange={dynamicBuildPhases.setReviewStrictness}
            />
          </div>
        )}

        {/* Build View - No Plan Yet */}
        {activeView === 'build' && !dynamicPhasePlan && (
          <div className="h-[calc(100vh-120px)] flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 mx-auto">
                <svg
                  className="w-10 h-10 text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-2">No Build Plan</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Use the Wizard to create an app concept and generate a phased build plan first.
              </p>
              <button onClick={() => setActiveView('wizard')} className="btn-primary">
                Start with Wizard
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          components={components}
          filteredComponents={filteredComponents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLoadComponent={loadComponent}
          onToggleFavorite={toggleFavorite}
          onDeleteComponent={deleteComponent}
          onExportComponent={handleExportApp}
          exportingAppId={exportingApp?.id}
          contentTab={contentTab}
          onContentTabChange={setContentTab}
          storageFiles={fileStorage.files}
          filteredFiles={fileStorage.filteredFiles}
          fileSearchQuery={fileStorage.searchQuery}
          onFileSearchChange={fileStorage.setSearchQuery}
          fileTypeFilter={fileStorage.typeFilter}
          onFileTypeFilterChange={fileStorage.setTypeFilter}
          fileSortBy={fileStorage.sortBy}
          fileSortOrder={fileStorage.sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            fileStorage.setSortBy(newSortBy);
            fileStorage.setSortOrder(newSortOrder);
          }}
          selectedFiles={fileStorage.selectedFiles}
          onFileSelect={fileStorage.selectFile}
          onFileUpload={fileStorage.uploadFiles}
          onFileDownload={fileStorage.downloadFile}
          onFileDelete={fileStorage.deleteFile}
          onBulkDelete={fileStorage.bulkDelete}
          onClearSelection={fileStorage.clearSelection}
          loadingFiles={fileStorage.isLoading}
          deletingFiles={fileStorage.deletingFiles}
          storageStats={fileStorage.storageStats}
          user={user}
        />

        <ApprovalModal
          isOpen={showApprovalModal}
          pendingChange={pendingChange}
          onApprove={approveChange}
          onReject={rejectChange}
        />

        <NameAppModal
          isOpen={showNameAppModal}
          onClose={() => setShowNameAppModal(false)}
          onSubmit={handleNameAppSubmit}
        />

        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          currentComponent={currentComponent}
          onRevertToVersion={revertToVersion}
          onForkVersion={handleForkApp}
          onCompareVersions={handleCompareVersions}
        />

        <DeploymentModal
          isOpen={showDeploymentModal}
          onClose={() => {
            setShowDeploymentModal(false);
            setDeploymentInstructions(null);
          }}
          deploymentInstructions={deploymentInstructions}
          onPlatformChange={(platform) =>
            setDeploymentInstructions(
              getDeploymentInstructions(platform, exportingApp?.name || 'app')
            )
          }
          appName={exportingApp?.name}
        />

        {currentComponent && (
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

        <DiffPreviewModal
          isOpen={showDiffPreview}
          onClose={() => {
            setPendingDiff(null);
            setShowDiffPreview(false);
          }}
          pendingDiff={pendingDiff}
          onApprove={approveDiff}
          onReject={rejectDiff}
        />

        <StagingConsentModal
          isOpen={showNewAppStagingModal}
          pendingRequest={pendingNewAppRequest}
          onBuildAllAtOnce={() => {
            setShowNewAppStagingModal(false);
            setPendingNewAppRequest('');
            setUserInput(pendingNewAppRequest);
          }}
          onBuildInPhases={async () => {
            setShowNewAppStagingModal(false);
            setIsGenerating(true);

            try {
              const response = await fetch('/api/ai-builder/plan-phases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: pendingNewAppRequest,
                  conversationHistory: chatMessages.slice(-50),
                }),
              });

              const data = await response.json();

              if (data.error) {
                throw new Error(data.error);
              }

              setNewAppStagePlan(data);

              // Use helper function to format phase content safely
              const phaseContent = formatPhaseContent(data.phases);

              const phasePlanMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: `🏗️ **${data.totalPhases ?? 0}-Phase Build Plan Created**\n\n${phaseContent}\n\n**Ready to start?** Type **'start'** or **'begin'** to build Phase 1!`,
                timestamp: new Date().toISOString(),
              };

              setChatMessages((prev) => [...prev, phasePlanMessage]);
            } catch (error) {
              const errorMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: `❌ Failed to create phase plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date().toISOString(),
              };
              setChatMessages((prev) => [...prev, errorMessage]);
            } finally {
              setIsGenerating(false);
              setPendingNewAppRequest('');
            }
          }}
        />

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

        {showConversationalWizard && (
          <NaturalConversationWizard
            onComplete={handleNaturalWizardComplete}
            onCancel={() => setShowConversationalWizard(false)}
          />
        )}

        <LayoutBuilderWizard
          isOpen={showLayoutBuilder}
          onClose={() => setShowLayoutBuilder(false)}
          onApplyToAppConcept={() => {
            // Optionally close the wizard or show a success message
          }}
        />

        <SettingsPage isOpen={showSettings} onClose={() => setShowSettings(false)} />

        {dynamicPhasePlan && (
          <PhasedBuildPanel
            isOpen={showAdvancedPhasedBuild}
            onClose={() => setShowAdvancedPhasedBuild(false)}
            phases={dynamicBuildPhases.uiPhases}
            progress={dynamicBuildPhases.progress}
            currentPhase={
              dynamicBuildPhases.currentPhase
                ? dynamicBuildPhases.uiPhases.find(
                    (p) => p.order === dynamicBuildPhases.currentPhase?.number
                  ) || null
                : null
            }
            isBuilding={dynamicBuildPhases.isBuilding}
            isPaused={dynamicBuildPhases.isPaused}
            isValidating={isValidating}
            onStartBuild={handleStartAdvancedPhasedBuild}
            onPauseBuild={dynamicBuildPhases.pauseBuild}
            onResumeBuild={dynamicBuildPhases.resumeBuild}
            onSkipPhase={(phaseId) => {
              const phase = dynamicBuildPhases.uiPhases.find((p) => p.id === phaseId);
              if (phase) {
                dynamicBuildPhases.skipPhase(phase.order);
              }
            }}
            onRetryPhase={(phaseId) => {
              const phase = dynamicBuildPhases.uiPhases.find((p) => p.id === phaseId);
              if (phase) {
                dynamicBuildPhases.retryPhase(phase.order);
              }
            }}
            onViewPhaseDetails={handleViewPhaseDetails}
            onRunValidation={handleRunValidation}
            onResetBuild={dynamicBuildPhases.resetBuild}
            onExecuteCurrentPhase={async () => {
              const nextPhase = dynamicBuildPhases.getNextPhase();
              if (nextPhase) {
                startDynamicPhasedBuild(nextPhase.number);
              }
            }}
            onProceedToNextPhase={() => {
              const nextPhase = dynamicBuildPhases.getNextPhase();
              if (nextPhase) {
                startDynamicPhasedBuild(nextPhase.number);
              }
            }}
            dynamicPlan={dynamicPhasePlan}
            qualityReport={dynamicBuildPhases.qualityReport}
            pipelineState={dynamicBuildPhases.pipelineState}
            isReviewing={dynamicBuildPhases.isReviewing}
            strictness={dynamicBuildPhases.reviewStrictness}
            onRunReview={dynamicBuildPhases.runFinalQualityCheck}
            onStrictnessChange={dynamicBuildPhases.setReviewStrictness}
          />
        )}

        {selectedPhaseId &&
          dynamicBuildPhases.uiPhases.length > 0 &&
          (() => {
            const uiPhase =
              dynamicBuildPhases.uiPhases.find((p) => p.id === selectedPhaseId) ||
              dynamicBuildPhases.uiPhases[0];
            // Find matching DynamicPhase for Phase Comparison
            const dynamicPhase = dynamicBuildPhases.phases.find((p) => p.number === uiPhase.order);
            return (
              <PhaseDetailView
                phase={uiPhase}
                isOpen={!!selectedPhaseId}
                onClose={() => setSelectedPhaseId(null)}
                onBuildPhase={async () => {
                  if (uiPhase) {
                    startDynamicPhasedBuild(uiPhase.order);
                  }
                  setSelectedPhaseId(null);
                }}
                onSkipPhase={async () => {
                  if (uiPhase) {
                    dynamicBuildPhases.skipPhase(uiPhase.order);
                  }
                  setSelectedPhaseId(null);
                }}
                onRetryPhase={async () => {
                  if (uiPhase) {
                    dynamicBuildPhases.retryPhase(uiPhase.order);
                  }
                  setSelectedPhaseId(null);
                }}
                generatedCode={dynamicBuildPhases.accumulatedCode}
                dynamicPhase={dynamicPhase}
              />
            );
          })()}

        {/* Project Documentation Panel */}
        <ProjectDocumentationPanel />
      </div>
    </ToastProvider>
  );
}
