/**
 * useDualAIPlan Hook
 *
 * Client-side hook for managing the Dual AI Planning pipeline.
 * Handles SSE connection, progress tracking, escalation resolution,
 * and AI selection state.
 *
 * Usage:
 *   const { startPlanning, isPlanning, progress, result, ... } = useDualAIPlan();
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type {
  FinalValidatedArchitecture,
  EscalationData,
  DualPlanProgress,
  DualPlanSSEEvent,
  UserAISelection,
  ArchitecturePosition,
  DualPlanStage,
} from '@/types/dualPlanning';

// ============================================================================
// STAGE LABEL MAP
// ============================================================================

const STAGE_LABELS: Record<DualPlanStage, string> = {
  idle: 'Ready',
  'layout-analysis': 'Analyzing Layout',
  intelligence: 'Gathering Intelligence',
  'parallel-generation': 'Generating Architectures',
  consensus: 'Negotiating Consensus',
  validation: 'Validating Architecture',
  complete: 'Complete',
  error: 'Error',
  escalated: 'Needs Your Input',
};

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseDualAIPlanReturn {
  // State
  isPlanning: boolean;
  progress: DualPlanProgress | null;
  result: FinalValidatedArchitecture | null;
  error: string | null;
  isEscalated: boolean;
  escalation: EscalationData | null;
  stageLabel: string;
  isComplete: boolean;
  /** Whether the user has reviewed and confirmed the architecture */
  architectureReviewed: boolean;
  /** Whether review dialog should be shown (pipeline done + both archs available + not yet reviewed) */
  needsArchitectureReview: boolean;
  /** Individual architecture from Claude */
  claudeArchitecture: ArchitecturePosition | null;
  /** Individual architecture from Gemini */
  geminiArchitecture: ArchitecturePosition | null;
  /** Number of negotiation rounds */
  negotiationRounds: number;

  // Actions
  startPlanning: (concept: AppConcept, manifest: LayoutManifest) => Promise<void>;
  cancelPlanning: () => void;
  retryPlanning: () => void;
  resolveEscalation: (choice: 'claude' | 'gemini' | 'merge') => void;
  /** Confirm architecture choice (used for both consensus and escalation) */
  confirmArchitectureChoice: (choice: 'claude' | 'gemini' | 'merge' | 'consensus') => void;
  setUserAISelection: (selection: UserAISelection) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDualAIPlan(): UseDualAIPlanReturn {
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastConceptRef = useRef<AppConcept | null>(null);
  const lastManifestRef = useRef<LayoutManifest | null>(null);

  // Store selectors (individual to avoid unnecessary re-renders)
  const progress = useAppStore((s) => s.dualPlanProgress);
  const result = useAppStore((s) => s.dualArchitectureResult);
  const escalation = useAppStore((s) => s.dualArchitectureEscalation);
  const claudeArchitecture = useAppStore((s) => s.claudeArchitecturePosition);
  const geminiArchitecture = useAppStore((s) => s.geminiArchitecturePosition);
  const negotiationRounds = useAppStore((s) => s.architectureNegotiationRounds);
  const architectureReviewed = useAppStore((s) => s.architectureReviewed);

  const cachedIntelligence = useAppStore((s) => s.cachedIntelligence);
  const setDualPlanProgress = useAppStore((s) => s.setDualPlanProgress);
  const setDualArchitectureResult = useAppStore((s) => s.setDualArchitectureResult);
  const setDualArchitectureEscalation = useAppStore((s) => s.setDualArchitectureEscalation);
  const setUserAISelectionStore = useAppStore((s) => s.setUserAISelection);
  const setClaudeArchitecturePosition = useAppStore((s) => s.setClaudeArchitecturePosition);
  const setGeminiArchitecturePosition = useAppStore((s) => s.setGeminiArchitecturePosition);
  const setArchitectureNegotiationRounds = useAppStore((s) => s.setArchitectureNegotiationRounds);
  const setArchitectureReviewed = useAppStore((s) => s.setArchitectureReviewed);

  const isEscalated = escalation !== null;
  const isComplete = result !== null;
  const stageLabel = STAGE_LABELS[progress?.stage ?? 'idle'];

  // Review is needed when: pipeline is done, both architectures are available, and user hasn't reviewed yet
  const needsArchitectureReview =
    (isComplete || isEscalated) &&
    claudeArchitecture !== null &&
    geminiArchitecture !== null &&
    !architectureReviewed;

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  /**
   * Start the planning pipeline.
   * POSTs to /api/planning/start, then connects EventSource for SSE.
   */
  const startPlanning = useCallback(
    async (concept: AppConcept, manifest: LayoutManifest) => {
      // Save for retry
      lastConceptRef.current = concept;
      lastManifestRef.current = manifest;

      // Reset state
      setIsPlanning(true);
      setError(null);
      setDualPlanProgress({ stage: 'idle', percent: 0, message: 'Starting pipeline...' });
      setDualArchitectureResult(null);
      setDualArchitectureEscalation(null);
      setClaudeArchitecturePosition(null);
      setGeminiArchitecturePosition(null);
      setArchitectureNegotiationRounds(0);
      setArchitectureReviewed(false);

      try {
        // Step 1: Create session (include cached intelligence if available)
        const startResponse = await fetch('/api/planning/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept,
            layoutManifest: manifest,
            cachedIntelligence: cachedIntelligence ?? undefined,
          }),
        });

        if (!startResponse.ok) {
          const errData = await startResponse.json().catch(() => ({}));
          throw new Error(errData.error ?? `Failed to start planning: ${startResponse.status}`);
        }

        const { sessionId } = await startResponse.json();

        // Step 2: Connect EventSource for SSE streaming
        const eventSource = new EventSource(`/api/planning/stream/${sessionId}`);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const sseEvent: DualPlanSSEEvent = JSON.parse(event.data);

            switch (sseEvent.type) {
              case 'progress':
                setDualPlanProgress({
                  stage: sseEvent.data.stage,
                  percent: sseEvent.data.progress,
                  message: sseEvent.data.message,
                  details: sseEvent.data.details,
                });
                break;

              case 'complete':
                if (sseEvent.data.architecture) {
                  setDualArchitectureResult(sseEvent.data.architecture);
                }
                // Store individual architectures for the review dialog
                if (sseEvent.data.claudeArchitecture) {
                  setClaudeArchitecturePosition(sseEvent.data.claudeArchitecture);
                }
                if (sseEvent.data.geminiArchitecture) {
                  setGeminiArchitecturePosition(sseEvent.data.geminiArchitecture);
                }
                if (sseEvent.data.negotiationRounds) {
                  setArchitectureNegotiationRounds(sseEvent.data.negotiationRounds);
                }
                setDualPlanProgress({
                  stage: 'complete',
                  percent: 100,
                  message: sseEvent.data.message,
                });
                setIsPlanning(false);
                eventSource.close();
                break;

              case 'escalation':
                if (sseEvent.data.escalation) {
                  setDualArchitectureEscalation(sseEvent.data.escalation);
                  // Store individual architectures from escalation data for the review dialog
                  setClaudeArchitecturePosition(sseEvent.data.escalation.claudeArchitecture);
                  setGeminiArchitecturePosition(sseEvent.data.escalation.geminiArchitecture);
                  setArchitectureNegotiationRounds(sseEvent.data.escalation.negotiationRounds);
                }
                setDualPlanProgress({
                  stage: 'escalated',
                  percent: sseEvent.data.progress,
                  message: sseEvent.data.message,
                });
                setIsPlanning(false);
                eventSource.close();
                break;

              case 'error':
                setError(sseEvent.data.error ?? sseEvent.data.message);
                setDualPlanProgress({
                  stage: 'error',
                  percent: 0,
                  message: sseEvent.data.message,
                });
                setIsPlanning(false);
                eventSource.close();
                break;
            }
          } catch {
            // Ignore malformed SSE data
          }
        };

        eventSource.onerror = () => {
          // EventSource auto-reconnects on error, but if it fails completely:
          if (eventSource.readyState === EventSource.CLOSED) {
            setError('Connection to planning server lost');
            setIsPlanning(false);
          }
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start planning';
        setError(message);
        setDualPlanProgress({ stage: 'error', percent: 0, message });
        setIsPlanning(false);
      }
    },
    [
      setDualPlanProgress,
      setDualArchitectureResult,
      setDualArchitectureEscalation,
      cachedIntelligence,
    ]
  );

  /**
   * Cancel the current planning session.
   */
  const cancelPlanning = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsPlanning(false);
    setDualPlanProgress(null);
  }, [setDualPlanProgress]);

  /**
   * Retry planning with the last concept/manifest.
   */
  const retryPlanning = useCallback(() => {
    if (lastConceptRef.current && lastManifestRef.current) {
      startPlanning(lastConceptRef.current, lastManifestRef.current);
    }
  }, [startPlanning]);

  /**
   * Resolve an escalation by choosing an architecture.
   */
  const resolveEscalation = useCallback(
    (choice: 'claude' | 'gemini' | 'merge') => {
      if (!escalation) return;

      let chosenArchitecture: ArchitecturePosition;

      switch (choice) {
        case 'claude':
          chosenArchitecture = escalation.claudeArchitecture;
          break;
        case 'gemini':
          chosenArchitecture = escalation.geminiArchitecture;
          break;
        case 'merge':
          // Simple merge: use Claude as base with Gemini's agentic section
          chosenArchitecture = {
            ...escalation.claudeArchitecture,
            agentic: escalation.geminiArchitecture.agentic,
          };
          break;
      }

      // Create a FinalValidatedArchitecture from the user's choice
      const finalArchitecture: FinalValidatedArchitecture = {
        ...chosenArchitecture,
        consensusReport: {
          rounds: escalation.negotiationRounds,
          finalAgreements: [`User chose ${choice} architecture`],
          compromises: choice === 'merge' ? ['User-directed merge of both architectures'] : [],
        },
        validation: {
          approvedAt: new Date().toISOString(),
          coverage: 85, // Conservative estimate for user-resolved escalation
          issuesResolved: 0,
          replanAttempts: 0,
        },
      };

      setDualArchitectureResult(finalArchitecture);
      setDualArchitectureEscalation(null);
      setDualPlanProgress({
        stage: 'complete',
        percent: 100,
        message: `Architecture selected (${choice})`,
      });
    },
    [escalation, setDualArchitectureResult, setDualArchitectureEscalation, setDualPlanProgress]
  );

  /**
   * Confirm architecture choice from the review dialog.
   * Works for both consensus (accept/override) and escalation cases.
   */
  const confirmArchitectureChoice = useCallback(
    (choice: 'claude' | 'gemini' | 'merge' | 'consensus') => {
      if (!claudeArchitecture || !geminiArchitecture) return;

      if (choice === 'consensus') {
        // Accept the consensus architecture as-is (result is already set)
        setArchitectureReviewed(true);
        setDualArchitectureEscalation(null);
        return;
      }

      // User chose a specific architecture over the consensus
      let chosenArchitecture: ArchitecturePosition;

      switch (choice) {
        case 'claude':
          chosenArchitecture = claudeArchitecture;
          break;
        case 'gemini':
          chosenArchitecture = geminiArchitecture;
          break;
        case 'merge':
          chosenArchitecture = {
            ...claudeArchitecture,
            agentic: geminiArchitecture.agentic,
          };
          break;
      }

      // Create a FinalValidatedArchitecture from the user's choice
      const finalArchitecture: FinalValidatedArchitecture = {
        ...chosenArchitecture,
        consensusReport: {
          rounds: negotiationRounds,
          finalAgreements: [`User chose ${choice} architecture`],
          compromises: choice === 'merge' ? ['User-directed merge of both architectures'] : [],
        },
        validation: {
          approvedAt: new Date().toISOString(),
          coverage: result?.validation?.coverage ?? 85,
          issuesResolved: 0,
          replanAttempts: 0,
        },
      };

      setDualArchitectureResult(finalArchitecture);
      setDualArchitectureEscalation(null);
      setArchitectureReviewed(true);
      setDualPlanProgress({
        stage: 'complete',
        percent: 100,
        message: `Architecture confirmed (${choice})`,
      });
    },
    [
      claudeArchitecture,
      geminiArchitecture,
      negotiationRounds,
      result,
      setDualArchitectureResult,
      setDualArchitectureEscalation,
      setArchitectureReviewed,
      setDualPlanProgress,
    ]
  );

  /**
   * Save the user's AI tier/model selection.
   */
  const setUserAISelection = useCallback(
    (selection: UserAISelection) => {
      setUserAISelectionStore(selection);
    },
    [setUserAISelectionStore]
  );

  return {
    isPlanning,
    progress,
    result,
    error,
    isEscalated,
    escalation,
    stageLabel,
    isComplete,
    architectureReviewed,
    needsArchitectureReview,
    claudeArchitecture,
    geminiArchitecture,
    negotiationRounds,
    startPlanning,
    cancelPlanning,
    retryPlanning,
    resolveEscalation,
    confirmArchitectureChoice,
    setUserAISelection,
  };
}
