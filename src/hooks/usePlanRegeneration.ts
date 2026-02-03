/**
 * Plan Regeneration Hook
 *
 * Monitors wizardState for significant changes after a plan exists
 * and triggers automatic regeneration with debouncing.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { ArchitectureSpec } from '@/types/architectureSpec';
import type { WizardState } from '@/types/wizardState';
import {
  computeConceptSignature,
  detectConceptChanges,
  type ConceptChangeResult,
} from '@/utils/conceptChangeDetection';

interface UsePlanRegenerationOptions {
  wizardState: WizardState;
  phasePlan: DynamicPhasePlan | null;
  generatePhases: (architecture?: ArchitectureSpec) => Promise<void>;
  architectureSpec: ArchitectureSpec | null;
  isGeneratingPhases: boolean;
  isGeneratingArchitecture?: boolean;
  debounceMs?: number;
}

interface UsePlanRegenerationReturn {
  isRegenerating: boolean;
  pendingRegeneration: boolean;
  regenerationReason: string | null;
  lastChangeResult: ConceptChangeResult | null;
  triggerRegeneration: () => void;
  cancelPendingRegeneration: () => void;
}

export function usePlanRegeneration({
  wizardState,
  phasePlan,
  generatePhases,
  architectureSpec,
  isGeneratingPhases,
  isGeneratingArchitecture = false,
  debounceMs = 500,
}: UsePlanRegenerationOptions): UsePlanRegenerationReturn {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [pendingRegeneration, setPendingRegeneration] = useState(false);
  const [regenerationReason, setRegenerationReason] = useState<string | null>(null);
  const [lastChangeResult, setLastChangeResult] = useState<ConceptChangeResult | null>(null);

  // Store previous state for comparison
  const previousStateRef = useRef<WizardState | null>(null);
  const previousSignatureRef = useRef<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Manual trigger for regeneration
  const triggerRegeneration = useCallback(async () => {
    if (!phasePlan || isGeneratingPhases || isRegenerating) {
      return;
    }

    setIsRegenerating(true);
    setPendingRegeneration(false);
    setRegenerationReason('manual');

    try {
      await generatePhases(architectureSpec || undefined);
    } finally {
      setIsRegenerating(false);
      setRegenerationReason(null);
    }
  }, [phasePlan, isGeneratingPhases, isRegenerating, generatePhases, architectureSpec]);

  // Cancel any pending regeneration
  const cancelPendingRegeneration = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    setPendingRegeneration(false);
    setRegenerationReason(null);
  }, []);

  // Watch for wizard state changes
  useEffect(() => {
    // Skip if no plan exists yet (nothing to regenerate)
    if (!phasePlan) {
      previousStateRef.current = wizardState;
      previousSignatureRef.current = computeConceptSignature(wizardState);
      return;
    }

    // Skip if plan has been confirmed by user (locked state)
    // User must explicitly unlock via "adjust_plan" action to allow regeneration
    if (wizardState.planConfirmed) {
      return;
    }

    // Skip if currently generating phases or architecture
    if (isGeneratingPhases || isRegenerating || isGeneratingArchitecture) {
      return;
    }

    // Initialize on first run with plan
    if (!isInitializedRef.current) {
      previousStateRef.current = wizardState;
      previousSignatureRef.current = computeConceptSignature(wizardState);
      isInitializedRef.current = true;
      return;
    }

    // Compute current signature
    const currentSignature = computeConceptSignature(wizardState);

    // Skip if signature hasn't changed
    if (currentSignature === previousSignatureRef.current) {
      return;
    }

    // Detect changes
    const changeResult = detectConceptChanges(previousStateRef.current, wizardState);
    setLastChangeResult(changeResult);

    // Only regenerate if changes are significant
    if (!changeResult.hasSignificantChanges) {
      previousStateRef.current = wizardState;
      previousSignatureRef.current = currentSignature;
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set pending state and reason
    setPendingRegeneration(true);
    const reason = changeResult.changes.changedFields.join(', ');
    setRegenerationReason(reason);

    // Debounced regeneration
    debounceTimeoutRef.current = setTimeout(async () => {
      // Update refs before regenerating
      previousStateRef.current = wizardState;
      previousSignatureRef.current = currentSignature;

      setIsRegenerating(true);
      setPendingRegeneration(false);

      try {
        await generatePhases(architectureSpec || undefined);
      } finally {
        setIsRegenerating(false);
        setRegenerationReason(null);
      }
    }, debounceMs);
  }, [
    wizardState,
    phasePlan,
    isGeneratingPhases,
    isRegenerating,
    isGeneratingArchitecture,
    generatePhases,
    architectureSpec,
    debounceMs,
  ]);

  return {
    isRegenerating,
    pendingRegeneration,
    regenerationReason,
    lastChangeResult,
    triggerRegeneration,
    cancelPendingRegeneration,
  };
}
