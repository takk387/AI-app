'use client';

import { useCallback } from 'react';
import type { DynamicPhase, PhaseExecutionContext } from '@/types/dynamicPhases';
import type { BuildPhase, PhaseId } from '@/types/buildPhases';
import type { PhaseExecutionManager } from '@/services/PhaseExecutionManager';
import { buildPhaseExecutionPrompt } from '@/services/PhaseExecutionManager';

export interface UsePhaseExecutionContextDeps {
  manager: PhaseExecutionManager | null;
  phases: DynamicPhase[];
  uiPhases: BuildPhase[];
}

export function usePhaseExecutionContext(deps: UsePhaseExecutionContextDeps) {
  const { manager, phases, uiPhases } = deps;

  /**
   * Get execution context for a phase
   */
  const getExecutionContext = useCallback(
    (phaseNumber: number): PhaseExecutionContext | null => {
      if (!manager) return null;

      try {
        return manager.getExecutionContext(phaseNumber);
      } catch {
        return null;
      }
    },
    [manager]
  );

  /**
   * Get the prompt for executing a phase
   */
  const getExecutionPrompt = useCallback(
    (phaseNumber: number): string | null => {
      const context = getExecutionContext(phaseNumber);
      if (!context) return null;

      return buildPhaseExecutionPrompt(context);
    },
    [getExecutionContext]
  );

  /**
   * Get execution context with CodeContextService initialized (async)
   */
  const getExecutionContextAsync = useCallback(
    async (phaseNumber: number): Promise<PhaseExecutionContext | null> => {
      if (!manager) return null;

      try {
        return await manager.getExecutionContextAsync(phaseNumber);
      } catch {
        return null;
      }
    },
    [manager]
  );

  /**
   * Get the prompt for executing a phase with async context (CodeContextService)
   */
  const getExecutionPromptAsync = useCallback(
    async (phaseNumber: number): Promise<string | null> => {
      const context = await getExecutionContextAsync(phaseNumber);
      if (!context) return null;

      return buildPhaseExecutionPrompt(context);
    },
    [getExecutionContextAsync]
  );

  /**
   * Get the next pending phase
   */
  const getNextPhase = useCallback((): DynamicPhase | null => {
    if (!manager) return null;
    return manager.getNextPhase();
  }, [manager]);

  /**
   * Check if all phases are complete
   */
  const isComplete = useCallback((): boolean => {
    if (!manager) return false;
    return manager.isComplete();
  }, [manager]);

  /**
   * Get phase by number
   */
  const getPhaseByNumber = useCallback(
    (phaseNumber: number): DynamicPhase | undefined => {
      return phases.find((p) => p.number === phaseNumber);
    },
    [phases]
  );

  /**
   * Get UI phase by ID (for legacy compatibility)
   */
  const getPhaseById = useCallback(
    (phaseId: PhaseId): BuildPhase | undefined => {
      return uiPhases.find((p) => p.id === phaseId);
    },
    [uiPhases]
  );

  return {
    getExecutionContext,
    getExecutionContextAsync,
    getExecutionPrompt,
    getExecutionPromptAsync,
    getNextPhase,
    isComplete,
    getPhaseByNumber,
    getPhaseById,
  };
}
