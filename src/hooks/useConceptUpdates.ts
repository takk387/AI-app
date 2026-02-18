/**
 * useConceptUpdates - PLAN mode concept update logic
 *
 * Extracted from MainBuilderView.tsx for modular architecture.
 * Handles detecting concept changes, updating concepts via API,
 * confirming/canceling updates, and regenerating phases.
 */

import { useCallback } from 'react';
import type { ConceptChange, ConceptUpdateResponse } from '@/types/reviewTypes';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { AppConcept } from '@/types/appConcept';
import type { ChatMessage } from '../types/aiBuilderTypes';

// Helper function (same as in MainBuilderView)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export interface UseConceptUpdatesOptions {
  currentMode: string;
  appConcept: AppConcept | null;
  dynamicPhasePlan: DynamicPhasePlan | null;
  userInput: string;
  pendingConceptUpdate: {
    changes: ConceptChange[];
    updatedConcept: AppConcept;
    phasePlan: DynamicPhasePlan | null;
  } | null;
  setChatMessages: (fn: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setUserInput: (value: string) => void;
  setAppConcept: (concept: AppConcept | null) => void;
  setDynamicPhasePlan: (plan: DynamicPhasePlan | null) => void;
  setPhasePlanGeneratedAt: (date: string) => void;
  setPendingConceptUpdate: (
    update: {
      changes: ConceptChange[];
      updatedConcept: AppConcept;
      phasePlan: DynamicPhasePlan | null;
    } | null
  ) => void;
}

export interface UseConceptUpdatesReturn {
  detectNonConceptIntent: (message: string) => boolean;
  handlePlanModeMessage: () => Promise<boolean>;
  confirmConceptUpdate: (regeneratePhases: boolean) => Promise<void>;
  cancelConceptUpdate: () => void;
  handleRegeneratePhases: () => Promise<void>;
}

export function useConceptUpdates(options: UseConceptUpdatesOptions): UseConceptUpdatesReturn {
  const {
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
  } = options;

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

  return {
    detectNonConceptIntent,
    handlePlanModeMessage,
    confirmConceptUpdate,
    cancelConceptUpdate,
    handleRegeneratePhases,
  };
}
