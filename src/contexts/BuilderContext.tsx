'use client';

/**
 * BuilderContext — the context engine for the rebuilt Builder page.
 *
 * Replaces MainBuilderView's 21 hook calls and 85+ store destructures with a
 * single provider. Every new builder UI component consumes this via useBuilder().
 *
 * Core innovation: sendMessage() detects intent and assembles ONLY relevant
 * context per request, replacing the old PLAN/ACT mode split.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { createClient } from '@/utils/supabase/client';

// Hook imports
import { useDynamicBuildPhases } from '@/hooks/useDynamicBuildPhases';
import { useVersionControl } from '@/hooks/useVersionControl';
import { useDatabaseSync } from '@/hooks/useDatabaseSync';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFileStorage } from '@/hooks/useFileStorage';
import { useMessageSender } from '@/hooks/useMessageSender';
import { useBuilderHandlers } from '@/hooks/useBuilderHandlers';
import { useBuilderEffects } from '@/hooks/useBuilderEffects';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';
import { useProjectDocumentation } from '@/hooks/useProjectDocumentation';
import { useAppCrud } from '@/hooks/useAppCrud';
import { useBranchManagement } from '@/hooks/useBranchManagement';
import { useConceptSync } from '@/hooks/useConceptSync';
import { useConceptUpdates } from '@/hooks/useConceptUpdates';
import { useAppBuilderSync } from '@/hooks/useAppBuilderSync';
import { usePhaseExecution } from '@/hooks/usePhaseExecution';

// Service imports
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

// Type imports
import type { ChatMessage, GeneratedComponent } from '@/types/aiBuilderTypes';
import type { DynamicPhase, DynamicPhasePlan } from '@/types/dynamicPhases';
import type { BuildProgress } from '@/types/buildPhases';
import type { AppConcept } from '@/types/appConcept';
import type { WizardState } from '@/types/wizardState';
import type { ConceptChange } from '@/types/reviewTypes';

// ============================================================================
// TYPES
// ============================================================================

export type IntentType = 'BUILD' | 'MODIFY' | 'DEBUG' | 'CONCEPT' | 'QUESTION';

export interface DebugEntry {
  type: string;
  endpoint?: string;
  intent?: IntentType;
  tokensUsed?: number;
  duration?: number;
  timestamp: string;
  details?: string;
}

export type ModalType =
  | 'library'
  | 'export'
  | 'deploy'
  | 'settings'
  | 'share'
  | 'diff'
  | 'compare'
  | 'quality'
  | 'performance'
  | 'nameApp'
  | 'createBranch'
  | 'versionHistory'
  | null;

export interface BuilderContextValue {
  // Chat
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  isGenerating: boolean;
  generationProgress: string;
  lastIntent: IntentType | null;

  // Phases
  phases: DynamicPhase[];
  currentPhase: DynamicPhase | null;
  phaseProgress: BuildProgress;
  isBuilding: boolean;
  isPaused: boolean;
  startBuilding: () => void;
  pauseBuild: () => void;
  resumeBuild: () => void;
  skipPhase: (n: number) => void;
  retryPhase: (n: number) => void;

  // Preview
  currentComponent: GeneratedComponent | null;
  activeTab: 'preview' | 'code';
  setActiveTab: (tab: 'preview' | 'code') => void;
  consoleErrors: string[];

  // Version Control
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Concept
  appConcept: AppConcept | null;
  updateConcept: (path: string, value: unknown) => void;

  // Actions
  exportApp: () => void;
  downloadCode: () => void;
  deployApp: () => void;
  uploadImage: (file: File) => void;
  capturePreview: () => Promise<void>;

  // Modals
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  activeModal: ModalType;

  // Concept Drawer
  isConceptDrawerOpen: boolean;
  toggleConceptDrawer: () => void;

  // Debug
  debugLog: DebugEntry[];
}

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function detectIntent(text: string, errors: string[]): IntentType {
  const lower = text.toLowerCase();

  // Phase references
  if (/build phase \d|start phase \d|execute phase \d/i.test(lower)) return 'BUILD';
  if (/^(build|create|generate|make)\s/i.test(lower)) return 'BUILD';

  // Modify
  if (/^(change|fix|update|modify|replace|move|add .* to)\s/i.test(lower)) return 'MODIFY';

  // Debug
  if (errors.length > 0 && /(error|broken|not working|crash|blank|white screen)/i.test(lower))
    return 'DEBUG';
  if (/^(why is|debug|what's wrong|investigate)\s/i.test(lower)) return 'DEBUG';

  // Concept
  if (/^(add .* feature|rename|change the name|update the description)/i.test(lower))
    return 'CONCEPT';

  return 'QUESTION';
}

function isPhaseReference(text: string): boolean {
  return /(?:build|start|execute) phase (\d+)/i.test(text);
}

function extractPhaseNumber(text: string): number {
  const match = text.match(/(?:build|start|execute) phase (\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
}

function buildProjectSummary(concept: AppConcept | null): string {
  if (!concept) return 'No project loaded.';
  return [
    concept.name && `Project: ${concept.name}`,
    concept.description && `Description: ${concept.description}`,
    concept.purpose && `Purpose: ${concept.purpose}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function safeParseJSON(code: string | undefined): Record<string, unknown> | undefined {
  if (!code) return undefined;
  try {
    return JSON.parse(code);
  } catch {
    return undefined;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const BuilderContext = createContext<BuilderContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function BuilderProvider({ children }: { children: ReactNode }) {
  // ---- Auth ----
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ---- Local state ----
  const [lastIntent, setLastIntent] = useState<IntentType | null>(null);
  const [consoleErrors] = useState<string[]>([]);
  const [debugLog, setDebugLog] = useState<DebugEntry[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isConceptDrawerOpen, setIsConceptDrawerOpen] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    features: [],
    isComplete: false,
    technical: {},
  });
  const [pendingDeployAfterSave, setPendingDeployAfterSave] = useState(false);
  const [pendingConceptUpdate, setPendingConceptUpdate] = useState<{
    changes: ConceptChange[];
    updatedConcept: AppConcept;
    phasePlan: DynamicPhasePlan | null;
  } | null>(null);
  const [_suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const clearSuggestedActions = useCallback(() => setSuggestedActions([]), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Storage service (lazy init) ----
  const [storageService] = useState(() => {
    const supabase = createClient();
    const analytics = new StorageAnalyticsService(supabase);
    return new StorageService(supabase, analytics);
  });

  // ---- Zustand store (individual selectors — no shallow needed) ----
  // Chat
  const chatMessages = useAppStore((s) => s.chatMessages);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setIsGenerating = useAppStore((s) => s.setIsGenerating);
  const generationProgress = useAppStore((s) => s.generationProgress);
  const setGenerationProgress = useAppStore((s) => s.setGenerationProgress);
  const userInput = useAppStore((s) => s.userInput);
  const setUserInput = useAppStore((s) => s.setUserInput);
  const setLastUserRequest = useAppStore((s) => s.setLastUserRequest);
  // Mode
  const currentMode = useAppStore((s) => s.currentMode);
  const setCurrentMode = useAppStore((s) => s.setCurrentMode);
  // Components
  const components = useAppStore((s) => s.components);
  const setComponents = useAppStore((s) => s.setComponents);
  const currentComponent = useAppStore((s) => s.currentComponent);
  const setCurrentComponent = useAppStore((s) => s.setCurrentComponent);
  const loadingApps = useAppStore((s) => s.loadingApps);
  const setLoadingApps = useAppStore((s) => s.setLoadingApps);
  // UI
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setIsClient = useAppStore((s) => s.setIsClient);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setShowLibrary = useAppStore((s) => s.setShowLibrary);
  const setShowExportModal = useAppStore((s) => s.setShowExportModal);
  const setExportModalComponent = useAppStore((s) => s.setExportModalComponent);
  const setShowNameAppModal = useAppStore((s) => s.setShowNameAppModal);
  const setShowDeploymentModal = useAppStore((s) => s.setShowDeploymentModal);
  const setShowDiffPreview = useAppStore((s) => s.setShowDiffPreview);
  // Data
  const appConcept = useAppStore((s) => s.appConcept);
  const setAppConcept = useAppStore((s) => s.setAppConcept);
  const updateAppConceptField = useAppStore((s) => s.updateAppConceptField);
  const currentLayoutManifest = useAppStore((s) => s.currentLayoutManifest);
  const layoutBuilderFiles = useAppStore((s) => s.layoutBuilderFiles);
  const dynamicPhasePlan = useAppStore((s) => s.dynamicPhasePlan);
  const setDynamicPhasePlan = useAppStore((s) => s.setDynamicPhasePlan);
  const uploadedImage = useAppStore((s) => s.uploadedImage);
  const setUploadedImage = useAppStore((s) => s.setUploadedImage);
  const isReviewed = useAppStore((s) => s.isReviewed);
  const currentAppId = useAppStore((s) => s.currentAppId);
  const setPendingDiff = useAppStore((s) => s.setPendingDiff);
  const setNewAppStagePlan = useAppStore((s) => s.setNewAppStagePlan);
  const newAppStagePlan = useAppStore((s) => s.newAppStagePlan);
  const implementationPlan = useAppStore((s) => s.implementationPlan);
  const phasePlanGeneratedAt = useAppStore((s) => s.phasePlanGeneratedAt);
  const setPhasePlanGeneratedAt = useAppStore((s) => s.setPhasePlanGeneratedAt);
  // Version control (store-level for direct push/clear)
  const pushToUndoStack = useAppStore((s) => s.pushToUndoStack);
  const clearRedoStack = useAppStore((s) => s.clearRedoStack);

  // ---- Hooks (ordered by dependency chain) ----

  // 1. Streaming generation (no hook deps)
  const streaming = useStreamingGeneration();

  // 2. Dynamic build phases (no hook deps)
  const dynamicPhases = useDynamicBuildPhases();

  // 3. Database sync (needs userId)
  const databaseSync = useDatabaseSync({ userId });

  // 4. Version control (needs currentComponent from store)
  const versionControl = useVersionControl({
    currentComponent,
    onComponentUpdate: setCurrentComponent,
  });

  // 5. Branch management (needs currentComponent, versionControl for clear)
  const branchMgmt = useBranchManagement({
    currentComponent,
    onComponentUpdate: (comp: GeneratedComponent) => setCurrentComponent(comp),
    onClearUndoRedo: () => {
      versionControl.setUndoStack([]);
      versionControl.setRedoStack([]);
    },
  });

  // 6. Project documentation (needs userId, appId)
  const projectDocs = useProjectDocumentation({
    userId,
    appId: currentAppId,
  });

  // 7. Message sender utility (isQuestion, getProgressMessages)
  const messageSender = useMessageSender({
    chatMessages,
    setChatMessages,
    currentComponent,
    setCurrentComponent,
    currentMode,
    newAppStagePlan,
    setNewAppStagePlan,
    onComponentCreated: (comp: GeneratedComponent) =>
      setComponents((prev: GeneratedComponent[]) => [comp, ...prev].slice(0, 50)),
    onShowDiffPreview: (diff) => {
      setPendingDiff(diff);
      setShowDiffPreview(true);
    },
    onSaveComponent: async (comp: GeneratedComponent) => {
      await databaseSync.saveComponent(comp);
    },
    uploadedImage,
    onClearImage: () => setUploadedImage(null),
  });

  // 8. App CRUD (needs databaseSync)
  const appCrud = useAppCrud({
    onSaveComponent: databaseSync.saveComponent,
    onDeleteComponent: databaseSync.deleteComponent,
    getWelcomeMessage: () => ({
      id: generateId(),
      role: 'assistant' as const,
      content: "Welcome! Describe what you want to build, and I'll help you create it.",
      timestamp: new Date().toISOString(),
    }),
  });

  // 9. Concept sync (optional wizard state)
  const conceptSync = useConceptSync({
    wizardState,
    onWizardStateUpdate: (updates) => setWizardState((prev) => ({ ...prev, ...updates })),
  });

  // 10. Concept updates
  const conceptUpdates = useConceptUpdates({
    currentMode,
    appConcept,
    dynamicPhasePlan,
    userInput,
    pendingConceptUpdate,
    setChatMessages,
    setUserInput,
    setAppConcept,
    setDynamicPhasePlan,
    setPhasePlanGeneratedAt,
    setPendingConceptUpdate,
  });

  // 11. App builder sync (design tokens from layout)
  const appBuilderSync = useAppBuilderSync(currentLayoutManifest);

  // 12. File storage (needs userId + StorageService)
  const fileStorage = useFileStorage({
    userId,
    storageService,
  });

  // 13. Phase execution (needs dynamicPhases, streaming, versionControl, databaseSync)
  const phaseExecution = usePhaseExecution({
    currentMode,
    isReviewed,
    appConcept,
    dynamicPhasePlan,
    dynamicBuildPhases: dynamicPhases,
    streaming,
    currentComponent,
    layoutBuilderFiles,
    isGenerating,
    setChatMessages,
    setIsGenerating,
    setCurrentComponent,
    setComponents,
    setActiveTab,
    saveVersion: versionControl.saveVersion,
    saveComponentToDb: databaseSync.saveComponent,
  });

  // 14. Builder handlers (needs store setters)
  const builderHandlers = useBuilderHandlers({
    setChatMessages,
    setCurrentMode,
    setShowLibrary,
    fileInputRef,
    clearSuggestedActions,
    setUploadedImage,
    setExportModalComponent,
    setShowExportModal,
    currentComponent,
    setUserInput,
    setNewAppStagePlan,
    currentAppId,
    setPendingDeployAfterSave,
    setShowNameAppModal,
    components,
    searchQuery,
  });

  // 15. Builder effects (side effects — data loading, auto-save, etc.)
  useBuilderEffects({
    currentMode,
    clearSuggestedActions,
    setIsClient,
    loadComponentsFromDb: databaseSync.loadComponents,
    setComponents,
    setLoadingApps,
    loadingApps,
    components,
    currentComponent,
    loadComponent: appCrud.loadComponent,
    pendingDeployAfterSave,
    setPendingDeployAfterSave,
    currentAppId,
    appConcept,
    dynamicPhasePlan,
    isGenerating,
    chatMessages,
    implementationPlan,
    saveComponentToDb: databaseSync.saveComponent,
    setCurrentComponent,
    activeTab,
    setActiveTab,
    userInput,
    setUserInput,
    uploadedImage,
    setUploadedImage,
    wizardState,
    setWizardState,
  });

  // 16. Keyboard shortcuts (side effects)
  useKeyboardShortcuts({
    onUndo: versionControl.undo,
    onRedo: versionControl.redo,
    enabled: true,
    context: 'builder',
  });

  // ---- Debug tracking ----
  const trackDebug = useCallback((entry: Omit<DebugEntry, 'timestamp'>) => {
    setDebugLog((prev) => [
      ...prev.slice(-99), // keep last 100
      { ...entry, timestamp: new Date().toISOString() },
    ]);
  }, []);

  // ---- Context assembly (focused per intent) ----
  const assembleContext = useCallback(
    (intent: IntentType, text: string) => {
      const base = { projectSummary: buildProjectSummary(appConcept) };

      const getCurrentFiles = (): Array<{ path: string; content: string }> => {
        if (!currentComponent?.code) return [];
        const parsed = safeParseJSON(currentComponent.code);
        return (parsed?.files as Array<{ path: string; content: string }>) || [];
      };

      const getDesignTokens = () => appBuilderSync.designTokens ?? null;

      switch (intent) {
        case 'BUILD':
          return {
            ...base,
            phaseContext: dynamicPhases.currentPhase
              ? {
                  phaseNumber: dynamicPhases.currentPhase.number,
                  phaseName: dynamicPhases.currentPhase.name,
                  features: dynamicPhases.currentPhase.features,
                }
              : null,
            designTokens: getDesignTokens(),
            layoutManifest: currentLayoutManifest,
          };
        case 'MODIFY':
          return {
            ...base,
            currentFiles: getCurrentFiles(),
            designTokens: getDesignTokens(),
          };
        case 'DEBUG':
          return {
            ...base,
            currentFiles: getCurrentFiles(),
            consoleErrors,
          };
        case 'QUESTION':
          return {
            ...base,
            relevantPhase: dynamicPhases.currentPhase,
            relevantFiles: getCurrentFiles(),
          };
        case 'CONCEPT':
          return base;
        default:
          return base;
      }
    },
    [
      appConcept,
      currentComponent,
      currentLayoutManifest,
      appBuilderSync.designTokens,
      dynamicPhases.currentPhase,
      consoleErrors,
    ]
  );

  // ---- Refs for frequently-changing values in sendMessage closure ----
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const currentComponentRef = useRef(currentComponent);
  currentComponentRef.current = currentComponent;

  // ---- Core: sendMessage ----
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isGenerating) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev: ChatMessage[]) => [...prev, userMessage]);
      setLastUserRequest(text);
      setIsGenerating(true);
      setGenerationProgress('');

      const startTime = Date.now();
      const intent = detectIntent(text, consoleErrors);
      setLastIntent(intent);
      const context = assembleContext(intent, text);
      const comp = currentComponentRef.current;

      try {
        switch (intent) {
          case 'BUILD': {
            if (isPhaseReference(text)) {
              const phaseNum = extractPhaseNumber(text);
              if (dynamicPhases.phases.length === 0) {
                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content:
                      'No build phases available. Go through the Review step first, or click Start in the phase bar.',
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else {
                dynamicPhases.startPhase(phaseNum);
                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content: `Starting Phase ${phaseNum}...`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            } else {
              const result = await streaming.generate({
                prompt: text,
                ...context,
                isModification: !!comp,
                currentAppState: safeParseJSON(comp?.code),
              });

              if (result) {
                const files = result.files as Array<{ path: string; content: string }> | undefined;
                if (files?.length) {
                  let newComp: GeneratedComponent = {
                    id: comp?.id || generateId(),
                    name: (result.name as string) || appConcept?.name || 'App',
                    code: JSON.stringify(result, null, 2),
                    description: text,
                    timestamp: new Date().toISOString(),
                    isFavorite: comp?.isFavorite || false,
                    conversationHistory: [...chatMessagesRef.current, userMessage],
                    versions: comp?.versions || [],
                  };
                  newComp = versionControl.saveVersion(
                    newComp,
                    comp ? 'MAJOR_CHANGE' : 'NEW_APP',
                    text
                  );
                  setCurrentComponent(newComp);
                  setComponents((prev: GeneratedComponent[]) => {
                    const exists = prev.find((c) => c.id === newComp.id);
                    if (exists) return prev.map((c) => (c.id === newComp.id ? newComp : c));
                    return [newComp, ...prev].slice(0, 50);
                  });
                  await databaseSync.saveComponent(newComp);
                  setActiveTab('preview');
                }

                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content: result.description
                      ? String(result.description)
                      : `App ${comp ? 'updated' : 'created'}.`,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else {
                // streaming.generate() returned null — timeout, SSE failure, or empty response
                setChatMessages((prev: ChatMessage[]) => [
                  ...prev,
                  {
                    id: generateId(),
                    role: 'assistant' as const,
                    content:
                      "Generation failed — the AI didn't return a response. Please try again.",
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }
            break;
          }

          case 'MODIFY': {
            if (!comp) {
              setChatMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  id: generateId(),
                  role: 'assistant' as const,
                  content: 'No app loaded to modify. Build something first.',
                  timestamp: new Date().toISOString(),
                },
              ]);
              break;
            }

            setGenerationProgress('Generating targeted modifications...');

            const modResponse = await fetch('/api/ai-builder/modify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: text,
                currentAppState: safeParseJSON(comp.code),
                conversationHistory: chatMessagesRef.current.slice(-20),
              }),
            });
            const modData = await modResponse.json();

            if (modData?.error) {
              throw new Error(modData.error as string);
            }

            if (modData?.files?.length) {
              // Show diff preview modal for user approval
              setPendingDiff({
                id: generateId(),
                summary: (modData.summary as string) || text,
                files: modData.files,
                timestamp: new Date().toISOString(),
              });
              setShowDiffPreview(true);
              setActiveModal('diff');

              setChatMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  id: generateId(),
                  role: 'assistant' as const,
                  content: `Proposed changes: ${(modData.summary as string) || text}. Review the diff to approve or reject.`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            } else {
              setChatMessages((prev: ChatMessage[]) => [
                ...prev,
                {
                  id: generateId(),
                  role: 'assistant' as const,
                  content: (modData.summary as string) || 'No changes needed.',
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
            break;
          }

          case 'DEBUG': {
            const debugResult = await streaming.generate({
              prompt: `Debug this issue: ${text}`,
              ...context,
              isModification: true,
              currentAppState: safeParseJSON(comp?.code),
            });

            setChatMessages((prev: ChatMessage[]) => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant' as const,
                content: debugResult?.description
                  ? String(debugResult.description)
                  : 'Debug analysis complete.',
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          }

          case 'CONCEPT': {
            updateAppConceptField(
              'description',
              text.replace(
                /^(add .* feature|rename|change the name|update the description)\s*/i,
                ''
              )
            );
            setChatMessages((prev: ChatMessage[]) => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant' as const,
                content: 'Concept updated.',
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          }

          default: {
            // QUESTION — call builder expert API for a chat response
            const response = await fetch('/api/ai-builder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: text,
                ...context,
                hasAppConcept: !!appConcept,
                currentAppState: safeParseJSON(comp?.code),
              }),
            });
            const data = await response.json();
            if (data?.error) throw new Error(data.error as string);

            setChatMessages((prev: ChatMessage[]) => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant' as const,
                content: (data?.message ||
                  data?.answer ||
                  "I couldn't generate a response.") as string,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        }

        // Debug tracking
        trackDebug({
          type: 'api_request',
          intent,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        setChatMessages((prev: ChatMessage[]) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant' as const,
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            timestamp: new Date().toISOString(),
          },
        ]);

        trackDebug({
          type: 'error',
          intent,
          details: error instanceof Error ? error.message : 'Unknown',
          duration: Date.now() - startTime,
        });
      } finally {
        setIsGenerating(false);
        setGenerationProgress('');
      }
    },
    [
      isGenerating,
      consoleErrors,
      assembleContext,
      appConcept,
      dynamicPhases,
      streaming,
      versionControl,
      databaseSync,
      setChatMessages,
      setIsGenerating,
      setGenerationProgress,
      setLastUserRequest,
      setCurrentComponent,
      setComponents,
      setActiveTab,
      updateAppConceptField,
      pushToUndoStack,
      clearRedoStack,
      trackDebug,
      setPendingDiff,
      setShowDiffPreview,
    ]
  );

  // ---- Modal management ----
  const openModal = useCallback(
    (modal: ModalType) => {
      setActiveModal(modal);
      // Sync to store modals for backward compatibility
      if (modal === 'export') setShowExportModal(true);
      if (modal === 'deploy') setShowDeploymentModal(true);
      if (modal === 'nameApp') setShowNameAppModal(true);
    },
    [setShowExportModal, setShowDeploymentModal, setShowNameAppModal]
  );

  const closeModal = useCallback(() => setActiveModal(null), []);

  // ---- Start building ----
  const startBuilding = useCallback(() => {
    const handled = phaseExecution.tryStartPhase1();
    if (!handled) {
      const next = dynamicPhases.getNextPhase();
      if (next) dynamicPhases.startPhase(next.number);
    }
  }, [phaseExecution, dynamicPhases]);

  // ---- Actions ----
  const exportApp = useCallback(() => {
    if (currentComponent) builderHandlers.handleExportApp(currentComponent);
  }, [currentComponent, builderHandlers]);

  const downloadCode = useCallback(() => {
    builderHandlers.downloadCode();
  }, [builderHandlers]);

  const deployApp = useCallback(() => {
    builderHandlers.handleDeploy();
  }, [builderHandlers]);

  const uploadImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setUploadedImage(e.target.result as string);
      };
      reader.readAsDataURL(file);
    },
    [setUploadedImage]
  );

  const capturePreview = useCallback(async () => {
    // Placeholder — preview capture will be wired in a later session
  }, []);

  const toggleConceptDrawer = useCallback(() => setIsConceptDrawerOpen((prev) => !prev), []);

  // ---- Context value (memoized) ----
  const value = useMemo<BuilderContextValue>(
    () => ({
      messages: chatMessages,
      sendMessage,
      isGenerating,
      generationProgress,
      lastIntent,

      phases: dynamicPhases.phases,
      currentPhase: dynamicPhases.currentPhase,
      phaseProgress: dynamicPhases.progress,
      isBuilding: dynamicPhases.isBuilding,
      isPaused: dynamicPhases.isPaused,
      startBuilding,
      pauseBuild: dynamicPhases.pauseBuild,
      resumeBuild: dynamicPhases.resumeBuild,
      skipPhase: dynamicPhases.skipPhase,
      retryPhase: dynamicPhases.retryPhase,

      currentComponent,
      activeTab: activeTab as 'preview' | 'code',
      setActiveTab: setActiveTab as (tab: 'preview' | 'code') => void,
      consoleErrors,

      canUndo: versionControl.canUndo,
      canRedo: versionControl.canRedo,
      undo: versionControl.undo,
      redo: versionControl.redo,

      appConcept,
      updateConcept: updateAppConceptField,

      exportApp,
      downloadCode,
      deployApp,
      uploadImage,
      capturePreview,

      openModal,
      closeModal,
      activeModal,

      isConceptDrawerOpen,
      toggleConceptDrawer,

      debugLog,
    }),
    [
      chatMessages,
      sendMessage,
      isGenerating,
      generationProgress,
      lastIntent,
      dynamicPhases.phases,
      dynamicPhases.currentPhase,
      dynamicPhases.progress,
      dynamicPhases.isBuilding,
      dynamicPhases.isPaused,
      dynamicPhases.pauseBuild,
      dynamicPhases.resumeBuild,
      dynamicPhases.skipPhase,
      dynamicPhases.retryPhase,
      startBuilding,
      currentComponent,
      activeTab,
      setActiveTab,
      consoleErrors,
      versionControl.canUndo,
      versionControl.canRedo,
      versionControl.undo,
      versionControl.redo,
      appConcept,
      updateAppConceptField,
      exportApp,
      downloadCode,
      deployApp,
      uploadImage,
      capturePreview,
      openModal,
      closeModal,
      activeModal,
      isConceptDrawerOpen,
      toggleConceptDrawer,
      debugLog,
    ]
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return ctx;
}
