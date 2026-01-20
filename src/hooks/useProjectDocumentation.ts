/**
 * useProjectDocumentation Hook
 *
 * Provides React integration for the ProjectDocumentationService.
 * Handles automatic capture triggers and state synchronization.
 *
 * Features:
 * - Auto-load documentation when appId changes
 * - Capture methods for concept, layout, plan, and phases
 * - Message count tracking for auto-capture every 15-20 messages
 * - Build lifecycle management
 *
 * @example
 * ```typescript
 * const {
 *   documentation,
 *   captureConceptSnapshot,
 *   capturePlanSnapshot,
 * } = useProjectDocumentation({ userId, appId });
 * ```
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import { ProjectDocumentationService } from '@/services/ProjectDocumentationService';
import type { ProjectDocumentation } from '@/types/projectDocumentation';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutDesign } from '@/types/layoutDesign';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { ChatMessage } from '@/types/aiBuilderTypes';

// Auto-capture threshold (capture every N messages)
const MESSAGE_CAPTURE_THRESHOLD = 15;

interface UseProjectDocumentationOptions {
  userId: string | null;
  appId: string | null;
  autoLoad?: boolean;
}

interface UseProjectDocumentationReturn {
  // State
  documentation: ProjectDocumentation | null;
  isLoading: boolean;
  isSaving: boolean;

  // Manual capture methods
  captureConceptSnapshot: (
    concept: AppConcept,
    options?: {
      source?: 'wizard' | 'builder-chat';
      conversationContext?: string;
      chatMessages?: ChatMessage[];
      messageCountAtCapture?: number;
    }
  ) => Promise<void>;
  captureBuilderChatSnapshot: (
    chatMessages: ChatMessage[],
    partialConcept?: Partial<AppConcept>
  ) => Promise<void>;
  captureLayoutSnapshot: (layout: LayoutDesign, previewImageUrl?: string) => Promise<void>;
  capturePlanSnapshot: (plan: DynamicPhasePlan) => Promise<void>;
  recordPhaseStart: (
    phaseNumber: number,
    phaseName: string,
    plannedInfo: {
      domain: string;
      features: string[];
      description: string;
      estimatedTokens: number;
    }
  ) => Promise<void>;
  recordPhaseComplete: (
    phaseNumber: number,
    result: {
      success: boolean;
      generatedCode?: string;
      generatedFiles?: string[];
      implementedFeatures?: string[];
      errors?: string[];
      tokensUsed?: { input: number; output: number };
    }
  ) => Promise<void>;

  // Build lifecycle
  startBuild: () => Promise<void>;
  completeBuild: () => Promise<void>;
  failBuild: (error?: string) => Promise<void>;

  // Utilities
  refreshDocumentation: () => Promise<void>;
  createDocumentation: (projectName: string) => Promise<ProjectDocumentation | null>;
  getOrCreateDocumentation: (projectName: string) => Promise<ProjectDocumentation | null>;

  // Auto-capture helpers
  shouldCaptureAtMessageCount: (messageCount: number) => boolean;
  getLastCapturedMessageCount: () => number;
}

export function useProjectDocumentation(
  options: UseProjectDocumentationOptions
): UseProjectDocumentationReturn {
  const { userId, appId, autoLoad = true } = options;

  // Get store state and actions (using useShallow to prevent unnecessary re-renders)
  const {
    currentDocumentation,
    isLoadingDocumentation,
    isSavingDocumentation,
    buildingAppId,
    setCurrentDocumentation,
    setIsLoadingDocumentation,
    setIsSavingDocumentation,
    setBuildingAppId,
    // For auto-capture
    appConcept,
    dynamicPhasePlan,
  } = useAppStore(
    useShallow((state) => ({
      currentDocumentation: state.currentDocumentation,
      isLoadingDocumentation: state.isLoadingDocumentation,
      isSavingDocumentation: state.isSavingDocumentation,
      buildingAppId: state.buildingAppId,
      setCurrentDocumentation: state.setCurrentDocumentation,
      setIsLoadingDocumentation: state.setIsLoadingDocumentation,
      setIsSavingDocumentation: state.setIsSavingDocumentation,
      setBuildingAppId: state.setBuildingAppId,
      // For auto-capture
      appConcept: state.appConcept,
      dynamicPhasePlan: state.dynamicPhasePlan,
    }))
  );

  // Use buildingAppId during build, fallback to appId prop
  const effectiveAppId = buildingAppId || appId;

  // Track last captured message count
  const lastCapturedMessageCountRef = useRef(0);

  // Track previous values for auto-capture change detection
  const prevConceptUpdatedAtRef = useRef<string | null>(null);
  const prevPlanIdRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  // Service instance (memoized)
  const service = useMemo(() => {
    const supabase = createClient();
    return new ProjectDocumentationService(supabase);
  }, []);

  // Load documentation when effectiveAppId changes
  useEffect(() => {
    if (!autoLoad || !effectiveAppId) return;

    const loadDocumentation = async () => {
      // Skip loading if Supabase is not configured (placeholder URL)
      if (!isSupabaseConfigured()) {
        console.log('[Documentation] Supabase not configured - skipping documentation fetch');
        return;
      }

      setIsLoadingDocumentation(true);
      try {
        const result = await service.getByAppId(effectiveAppId);
        if (result.success) {
          setCurrentDocumentation(result.data ?? null);
          // Restore last captured message count if available
          if (result.data?.conceptSnapshot?.messageCountAtCapture) {
            lastCapturedMessageCountRef.current = result.data.conceptSnapshot.messageCountAtCapture;
          }
        } else {
          console.error('Failed to load documentation:', result.error);
        }
      } catch (error) {
        console.error('Error loading documentation:', error);
      } finally {
        setIsLoadingDocumentation(false);
      }
    };

    loadDocumentation();
  }, [effectiveAppId, autoLoad, service, setCurrentDocumentation, setIsLoadingDocumentation]);

  // ============================================================================
  // AUTO-CAPTURE EFFECTS
  // ============================================================================

  /**
   * Auto-capture concept when appConcept changes
   * Triggers automatically when the concept is updated in the store
   */
  useEffect(() => {
    // Guard: need documentation and concept
    if (!currentDocumentation || !appConcept) {
      // On initial mount without documentation, don't set prevConceptUpdatedAtRef
      // This ensures we capture when documentation is first created
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }
      return;
    }

    // Skip if same updatedAt (no change) - but not on first capture after doc creation
    if (prevConceptUpdatedAtRef.current === appConcept.updatedAt) {
      return;
    }

    // Update previous value before capture to prevent duplicate captures
    prevConceptUpdatedAtRef.current = appConcept.updatedAt;

    // Auto-capture the concept
    const autoCaptureAsync = async () => {
      try {
        console.log('[Documentation] Auto-capturing concept snapshot...');
        const result = await service.captureConceptSnapshot(
          currentDocumentation.id,
          appConcept,
          'wizard',
          { conversationContext: appConcept.conversationContext }
        );

        if (result.success) {
          console.log('[Documentation] Concept snapshot captured successfully');
          // Refresh to update local state
          const refreshResult = await service.getByAppId(currentDocumentation.appId);
          if (refreshResult.success) {
            setCurrentDocumentation(refreshResult.data ?? null);
          }
        } else {
          console.error('[Documentation] Failed to auto-capture concept:', result.error);
        }
      } catch (error) {
        console.error('[Documentation] Error auto-capturing concept:', error);
      }
    };

    autoCaptureAsync();
  }, [appConcept, currentDocumentation, service, setCurrentDocumentation]);

  /**
   * Auto-capture plan when dynamicPhasePlan changes
   * Triggers automatically when a new plan is generated
   */
  useEffect(() => {
    // Guard: need documentation and plan
    if (!currentDocumentation || !dynamicPhasePlan) return;

    // Skip if same plan ID (no change)
    if (prevPlanIdRef.current === dynamicPhasePlan.id) return;

    // Update previous value
    prevPlanIdRef.current = dynamicPhasePlan.id;

    // Auto-capture the plan
    const autoCaptureAsync = async () => {
      try {
        console.log('[Documentation] Auto-capturing plan snapshot...');
        const result = await service.capturePlanSnapshot(currentDocumentation.id, dynamicPhasePlan);

        if (result.success) {
          console.log('[Documentation] Plan snapshot captured successfully');
          // Refresh to update local state
          const refreshResult = await service.getByAppId(currentDocumentation.appId);
          if (refreshResult.success) {
            setCurrentDocumentation(refreshResult.data ?? null);
          }
        } else {
          console.error('[Documentation] Failed to auto-capture plan:', result.error);
        }
      } catch (error) {
        console.error('[Documentation] Error auto-capturing plan:', error);
      }
    };

    autoCaptureAsync();
  }, [dynamicPhasePlan, currentDocumentation, service, setCurrentDocumentation]);

  // Refresh documentation
  const refreshDocumentation = useCallback(async () => {
    if (!effectiveAppId) {
      console.warn('[Documentation] Cannot refresh: no appId available');
      return;
    }

    setIsLoadingDocumentation(true);
    try {
      const result = await service.getByAppId(effectiveAppId);
      if (result.success) {
        setCurrentDocumentation(result.data ?? null);
      }
    } catch (error) {
      console.error('Error refreshing documentation:', error);
    } finally {
      setIsLoadingDocumentation(false);
    }
  }, [effectiveAppId, service, setCurrentDocumentation, setIsLoadingDocumentation]);

  // Create documentation
  const createDocumentation = useCallback(
    async (projectName: string): Promise<ProjectDocumentation | null> => {
      if (!userId || !appId) return null;

      setIsSavingDocumentation(true);
      try {
        const result = await service.createDocumentation(appId, userId, projectName);
        if (result.success && result.data) {
          setCurrentDocumentation(result.data);
          return result.data;
        }
        console.error('Failed to create documentation:', result.error);
        return null;
      } catch (error) {
        console.error('Error creating documentation:', error);
        return null;
      } finally {
        setIsSavingDocumentation(false);
      }
    },
    [userId, appId, service, setCurrentDocumentation, setIsSavingDocumentation]
  );

  // Get or create documentation
  const getOrCreateDocumentation = useCallback(
    async (projectName: string): Promise<ProjectDocumentation | null> => {
      if (!userId || !appId) return null;

      // If we already have documentation loaded, return it
      if (currentDocumentation && currentDocumentation.appId === appId) {
        return currentDocumentation;
      }

      setIsSavingDocumentation(true);
      try {
        const result = await service.getOrCreate(appId, userId, projectName);
        if (result.success && result.data) {
          setCurrentDocumentation(result.data);
          return result.data;
        }
        console.error('Failed to get/create documentation:', result.error);
        return null;
      } catch (error) {
        console.error('Error getting/creating documentation:', error);
        return null;
      } finally {
        setIsSavingDocumentation(false);
      }
    },
    [
      userId,
      appId,
      currentDocumentation,
      service,
      setCurrentDocumentation,
      setIsSavingDocumentation,
    ]
  );

  // Capture concept snapshot
  const captureConceptSnapshot = useCallback(
    async (
      concept: AppConcept,
      captureOptions?: {
        source?: 'wizard' | 'builder-chat';
        conversationContext?: string;
        chatMessages?: ChatMessage[];
        messageCountAtCapture?: number;
      }
    ) => {
      if (!currentDocumentation) return;

      setIsSavingDocumentation(true);
      try {
        const result = await service.captureConceptSnapshot(
          currentDocumentation.id,
          concept,
          captureOptions?.source || 'wizard',
          {
            conversationContext: captureOptions?.conversationContext,
            chatMessages: captureOptions?.chatMessages,
            messageCountAtCapture: captureOptions?.messageCountAtCapture,
          }
        );

        if (result.success) {
          // Update last captured message count
          if (captureOptions?.messageCountAtCapture) {
            lastCapturedMessageCountRef.current = captureOptions.messageCountAtCapture;
          }
          await refreshDocumentation();
        } else {
          console.error('Failed to capture concept:', result.error);
        }
      } catch (error) {
        console.error('Error capturing concept:', error);
      } finally {
        setIsSavingDocumentation(false);
      }
    },
    [currentDocumentation, service, refreshDocumentation, setIsSavingDocumentation]
  );

  // Capture builder chat snapshot
  const captureBuilderChatSnapshot = useCallback(
    async (chatMessages: ChatMessage[], partialConcept?: Partial<AppConcept>) => {
      if (!currentDocumentation) return;

      setIsSavingDocumentation(true);
      try {
        const result = await service.captureBuilderChatSnapshot(
          currentDocumentation.id,
          chatMessages,
          partialConcept,
          chatMessages.length
        );

        if (result.success) {
          lastCapturedMessageCountRef.current = chatMessages.length;
          await refreshDocumentation();
        } else {
          console.error('Failed to capture builder chat:', result.error);
        }
      } catch (error) {
        console.error('Error capturing builder chat:', error);
      } finally {
        setIsSavingDocumentation(false);
      }
    },
    [currentDocumentation, service, refreshDocumentation, setIsSavingDocumentation]
  );

  // Capture layout snapshot
  const captureLayoutSnapshot = useCallback(
    async (layout: LayoutDesign, previewImageUrl?: string) => {
      if (!currentDocumentation) return;

      setIsSavingDocumentation(true);
      try {
        const result = await service.captureLayoutSnapshot(currentDocumentation.id, layout, {
          previewImageUrl,
        });

        if (result.success) {
          await refreshDocumentation();
        } else {
          console.error('Failed to capture layout:', result.error);
        }
      } catch (error) {
        console.error('Error capturing layout:', error);
      } finally {
        setIsSavingDocumentation(false);
      }
    },
    [currentDocumentation, service, refreshDocumentation, setIsSavingDocumentation]
  );

  // Capture plan snapshot
  const capturePlanSnapshot = useCallback(
    async (plan: DynamicPhasePlan) => {
      if (!currentDocumentation) return;

      setIsSavingDocumentation(true);
      try {
        const result = await service.capturePlanSnapshot(currentDocumentation.id, plan);

        if (result.success) {
          await refreshDocumentation();
        } else {
          console.error('Failed to capture plan:', result.error);
        }
      } catch (error) {
        console.error('Error capturing plan:', error);
      } finally {
        setIsSavingDocumentation(false);
      }
    },
    [currentDocumentation, service, refreshDocumentation, setIsSavingDocumentation]
  );

  // Record phase start
  const recordPhaseStart = useCallback(
    async (
      phaseNumber: number,
      phaseName: string,
      plannedInfo: {
        domain: string;
        features: string[];
        description: string;
        estimatedTokens: number;
      }
    ) => {
      if (!currentDocumentation) return;

      try {
        await service.recordPhaseStart(
          currentDocumentation.id,
          phaseNumber,
          phaseName,
          plannedInfo
        );
        await refreshDocumentation();
      } catch (error) {
        console.error('Error recording phase start:', error);
      }
    },
    [currentDocumentation, service, refreshDocumentation]
  );

  // Record phase completion
  const recordPhaseComplete = useCallback(
    async (
      phaseNumber: number,
      result: {
        success: boolean;
        generatedCode?: string;
        generatedFiles?: string[];
        implementedFeatures?: string[];
        errors?: string[];
        tokensUsed?: { input: number; output: number };
      }
    ) => {
      if (!currentDocumentation) return;

      try {
        await service.recordPhaseComplete(currentDocumentation.id, phaseNumber, result);
        await refreshDocumentation();
      } catch (error) {
        console.error('Error recording phase complete:', error);
      }
    },
    [currentDocumentation, service, refreshDocumentation]
  );

  // Build lifecycle methods
  const startBuild = useCallback(async () => {
    if (!currentDocumentation) return;

    // LOCK the appId for the duration of the build
    setBuildingAppId(currentDocumentation.appId);

    try {
      await service.startBuild(currentDocumentation.id);
      await refreshDocumentation();
    } catch (error) {
      console.error('Error starting build:', error);
    }
  }, [currentDocumentation, service, refreshDocumentation, setBuildingAppId]);

  const completeBuild = useCallback(async () => {
    if (!currentDocumentation) return;

    try {
      await service.completeBuild(currentDocumentation.id);
      await refreshDocumentation();
    } catch (error) {
      console.error('Error completing build:', error);
    } finally {
      // UNLOCK the appId after build completes
      setBuildingAppId(null);
    }
  }, [currentDocumentation, service, refreshDocumentation, setBuildingAppId]);

  const failBuild = useCallback(
    async (error?: string) => {
      if (!currentDocumentation) return;

      try {
        await service.failBuild(currentDocumentation.id, error);
        await refreshDocumentation();
      } catch (err) {
        console.error('Error failing build:', err);
      } finally {
        // UNLOCK the appId after build fails
        setBuildingAppId(null);
      }
    },
    [currentDocumentation, service, refreshDocumentation, setBuildingAppId]
  );

  // Auto-capture helpers
  const shouldCaptureAtMessageCount = useCallback((messageCount: number): boolean => {
    const lastCaptured = lastCapturedMessageCountRef.current;
    return messageCount - lastCaptured >= MESSAGE_CAPTURE_THRESHOLD;
  }, []);

  const getLastCapturedMessageCount = useCallback((): number => {
    return lastCapturedMessageCountRef.current;
  }, []);

  return {
    documentation: currentDocumentation,
    isLoading: isLoadingDocumentation,
    isSaving: isSavingDocumentation,

    captureConceptSnapshot,
    captureBuilderChatSnapshot,
    captureLayoutSnapshot,
    capturePlanSnapshot,
    recordPhaseStart,
    recordPhaseComplete,

    startBuild,
    completeBuild,
    failBuild,

    refreshDocumentation,
    createDocumentation,
    getOrCreateDocumentation,

    shouldCaptureAtMessageCount,
    getLastCapturedMessageCount,
  };
}

export default useProjectDocumentation;
