/**
 * usePhaseExecution - Phase build orchestration
 *
 * Extracted from MainBuilderView.tsx for modular architecture.
 * Contains tryStartPhase1, executePhase, auto-start effect,
 * auto-execute effect, and phase plan sync.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { PhaseExecutionResult } from '@/types/dynamicPhases';
import type { AppConcept } from '@/types/appConcept';
import type { ChatMessage, GeneratedComponent, ActiveTab } from '../types/aiBuilderTypes';

// Helper function (same as in MainBuilderView)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export interface UsePhaseExecutionOptions {
  currentMode: string;
  isReviewed: boolean;
  appConcept: AppConcept | null;
  dynamicPhasePlan: any;
  dynamicBuildPhases: {
    plan: any;
    isBuilding: boolean;
    isPaused: boolean;
    currentPhase: any;
    startPhase: (phaseNumber: number) => void;
    completePhase: (result: PhaseExecutionResult) => void;
    initializePlan: (plan: any) => void;
    getExecutionPromptAsync: (phaseNumber: number) => Promise<string | null>;
    getExecutionContext: (phaseNumber: number) => any;
  };
  streaming: {
    isStreaming: boolean;
    generate: (body: Record<string, unknown>) => Promise<any>;
  };
  currentComponent: GeneratedComponent | null;
  layoutBuilderFiles: Array<{ path: string; content: string }> | null;
  isGenerating: boolean;
  setChatMessages: (fn: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setIsGenerating: (value: boolean) => void;
  setCurrentComponent: (component: GeneratedComponent | null) => void;
  setComponents: (fn: (prev: GeneratedComponent[]) => GeneratedComponent[]) => void;
  setActiveTab: (tab: ActiveTab) => void;
  saveVersion: (
    component: GeneratedComponent,
    type: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE',
    label: string
  ) => GeneratedComponent;
  saveComponentToDb: (component: GeneratedComponent) => Promise<any>;
}

export interface UsePhaseExecutionReturn {
  tryStartPhase1: () => boolean;
}

export function usePhaseExecution(options: UsePhaseExecutionOptions): UsePhaseExecutionReturn {
  const {
    currentMode,
    isReviewed,
    appConcept,
    dynamicPhasePlan,
    dynamicBuildPhases,
    streaming,
    currentComponent,
    layoutBuilderFiles,
    isGenerating,
    setChatMessages,
    setIsGenerating,
    setCurrentComponent,
    setComponents,
    setActiveTab,
    saveVersion,
    saveComponentToDb,
  } = options;

  // Ref for tracking which phase is currently executing (prevents duplicate runs)
  const executingPhaseRef = useRef<number | null>(null);
  // Retry counter per phase — prevents infinite retry loops on persistent errors
  const phaseRetryCountRef = useRef<Map<number, number>>(new Map());
  const MAX_PHASE_RETRIES = 3;

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

    const phase1 = dynamicBuildPhases.plan.phases.find((p: any) => p.number === 1);
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
  const executePhase = useCallback(
    async (phaseNumber: number) => {
      if (!dynamicBuildPhases.plan) return;

      // Build the structured phase prompt via PhaseExecutionManager
      // Async version initializes CodeContextService for richer dependency-graph-based code context
      const executionPrompt = await dynamicBuildPhases.getExecutionPromptAsync(phaseNumber);
      const executionContext = dynamicBuildPhases.getExecutionContext(phaseNumber);

      if (!executionPrompt || !executionContext) {
        const retries = (phaseRetryCountRef.current.get(phaseNumber) ?? 0) + 1;
        phaseRetryCountRef.current.set(phaseNumber, retries);
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          content:
            retries >= MAX_PHASE_RETRIES
              ? `**Phase ${phaseNumber} Failed Permanently:** Could not build execution context after ${retries} attempts. Please check the phase configuration.`
              : `**Phase ${phaseNumber} Error:** Could not build execution context. The phase may be misconfigured. (Attempt ${retries}/${MAX_PHASE_RETRIES})`,
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
            allPhases: executionContext.allPhases?.map((p: any) => ({
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
              updatedComponent = saveVersion(
                updatedComponent,
                'MAJOR_CHANGE',
                `Phase ${phaseNumber}: ${executionContext.phaseName}`
              );
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
              updatedComponent = saveVersion(
                updatedComponent,
                'NEW_APP',
                `Phase ${phaseNumber}: ${executionContext.phaseName}`
              );
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
            const retries = (phaseRetryCountRef.current.get(phaseNumber) ?? 0) + 1;
            phaseRetryCountRef.current.set(phaseNumber, retries);
            const noFilesMsg: ChatMessage = {
              id: generateId(),
              role: 'system',
              content:
                retries >= MAX_PHASE_RETRIES
                  ? `**Phase ${phaseNumber} Failed Permanently:** AI generated no code files after ${retries} attempts.`
                  : `**Phase ${phaseNumber} Warning:** The AI responded but generated no code files. (Attempt ${retries}/${MAX_PHASE_RETRIES})`,
              timestamp: new Date().toISOString(),
            };
            setChatMessages((prev) => [...prev, noFilesMsg]);
            executingPhaseRef.current = null;
          }
        } else {
          // Streaming returned null
          const retries = (phaseRetryCountRef.current.get(phaseNumber) ?? 0) + 1;
          phaseRetryCountRef.current.set(phaseNumber, retries);
          const failMsg: ChatMessage = {
            id: generateId(),
            role: 'system',
            content:
              retries >= MAX_PHASE_RETRIES
                ? `**Phase ${phaseNumber} Failed Permanently:** No response from AI after ${retries} attempts.`
                : `**Phase ${phaseNumber} Failed:** No response from AI. (Attempt ${retries}/${MAX_PHASE_RETRIES})`,
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, failMsg]);
          executingPhaseRef.current = null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const retries = (phaseRetryCountRef.current.get(phaseNumber) ?? 0) + 1;
        phaseRetryCountRef.current.set(phaseNumber, retries);
        const errorMsg: ChatMessage = {
          id: generateId(),
          role: 'system',
          content:
            retries >= MAX_PHASE_RETRIES
              ? `**Phase ${phaseNumber} Failed Permanently:** ${errorMessage} (after ${retries} attempts)`
              : `**Phase ${phaseNumber} Error:** ${errorMessage} (Attempt ${retries}/${MAX_PHASE_RETRIES})`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMsg]);
        executingPhaseRef.current = null;
      } finally {
        setIsGenerating(false);
      }
    },
    [
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
    ]
  );

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

  // Auto-execute phases when they become "in-progress" (all phases including Phase 1).
  // Layout injection phases are excluded — they are handled synchronously by tryStartPhase1.
  // This effect connects startPhase() → executePhase() for automatic AI generation.
  useEffect(() => {
    const phase = dynamicBuildPhases.currentPhase;
    if (
      phase &&
      !phase.isLayoutInjection &&
      !streaming.isStreaming &&
      !isGenerating &&
      !dynamicBuildPhases.isPaused &&
      executingPhaseRef.current !== phase.number &&
      (phaseRetryCountRef.current.get(phase.number) ?? 0) < MAX_PHASE_RETRIES
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

  return { tryStartPhase1 };
}
