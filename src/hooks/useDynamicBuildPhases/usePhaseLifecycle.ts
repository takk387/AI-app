'use client';

import { useCallback, useRef } from 'react';
import type { DynamicPhase, DynamicPhasePlan, PhaseExecutionResult } from '@/types/dynamicPhases';
import { PhaseExecutionManager } from '@/services/PhaseExecutionManager';
import { logger } from '@/utils/logger';

export interface UsePhaseLifecycleOptions {
  autoAdvance: boolean;
  onPhaseStart?: (phase: DynamicPhase) => void;
  onPhaseComplete?: (phase: DynamicPhase, result: PhaseExecutionResult) => void;
  onBuildComplete?: (plan: DynamicPhasePlan) => void;
  onPlanInitialized?: (plan: DynamicPhasePlan) => void;
  onError?: (error: Error, phase?: DynamicPhase) => void;
}

export interface UsePhaseLifecycleDeps {
  mountedRef: React.RefObject<boolean>;
  isPausedRef: React.RefObject<boolean>;
  plan: DynamicPhasePlan | null;
  manager: PhaseExecutionManager | null;
  setPlan: React.Dispatch<React.SetStateAction<DynamicPhasePlan | null>>;
  setManager: React.Dispatch<React.SetStateAction<PhaseExecutionManager | null>>;
  setIsBuilding: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  setAccumulatedCodeState: React.Dispatch<React.SetStateAction<string>>;
}

export function usePhaseLifecycle(deps: UsePhaseLifecycleDeps, options: UsePhaseLifecycleOptions) {
  const {
    mountedRef,
    isPausedRef,
    plan,
    manager,
    setPlan,
    setManager,
    setIsBuilding,
    setIsPaused,
    setAccumulatedCodeState,
  } = deps;

  const {
    autoAdvance,
    onPhaseStart,
    onPhaseComplete,
    onBuildComplete,
    onPlanInitialized,
    onError,
  } = options;

  /**
   * Initialize with a new plan
   */
  const initializePlan = useCallback(
    (newPlan: DynamicPhasePlan) => {
      if (!mountedRef.current) return;

      const newManager = new PhaseExecutionManager(newPlan);
      setManager(newManager);
      setPlan(newPlan);
      setIsBuilding(false);
      setIsPaused(false);
      setAccumulatedCodeState('');

      onPlanInitialized?.(newPlan);
    },
    [
      mountedRef,
      setManager,
      setPlan,
      setIsBuilding,
      setIsPaused,
      setAccumulatedCodeState,
      onPlanInitialized,
    ]
  );

  /**
   * Start executing a specific phase
   */
  const startPhase = useCallback(
    (phaseNumber: number) => {
      if (!mountedRef.current || !plan || !manager) {
        if (process.env.NODE_ENV === 'development' && !plan) {
          logger.warn('[useDynamicBuildPhases] startPhase() called before initializePlan()');
        }
        return;
      }

      const phaseIndex = plan.phases.findIndex((p) => p.number === phaseNumber);
      if (phaseIndex === -1) {
        onError?.(new Error(`Phase ${phaseNumber} not found`));
        return;
      }

      // P3: Capture snapshot before starting phase (for rollback capability)
      manager.capturePhaseSnapshot(phaseNumber);

      // Update phase status immutably (avoid mutating frozen objects)
      const updatedPhases = plan.phases.map((p, idx) =>
        idx === phaseIndex ? { ...p, status: 'in-progress' as const } : p
      );
      const updatedPlan = { ...plan, phases: updatedPhases, currentPhaseNumber: phaseNumber };
      setPlan(updatedPlan);
      setIsBuilding(true);

      onPhaseStart?.(updatedPhases[phaseIndex]);
    },
    [plan, manager, mountedRef, setPlan, setIsBuilding, onPhaseStart, onError]
  );

  // Ref to hold latest startPhase — prevents stale closure in setTimeout
  const startPhaseRef = useRef(startPhase);
  startPhaseRef.current = startPhase;

  /**
   * Record phase completion
   */
  const completePhase = useCallback(
    (result: PhaseExecutionResult) => {
      if (!mountedRef.current || !plan || !manager) return;

      try {
        manager.recordPhaseResult(result);
        const updatedPlan = manager.getPlan();
        setPlan({ ...updatedPlan });

        const phase = updatedPlan.phases.find((p) => p.number === result.phaseNumber);
        if (phase) {
          onPhaseComplete?.(phase, result);
        }

        // Update accumulated code
        if (result.success && result.generatedCode) {
          setAccumulatedCodeState(result.generatedCode);
        }

        // Check if build is complete
        if (manager.isComplete()) {
          setIsBuilding(false);
          onBuildComplete?.(updatedPlan);
        } else if (autoAdvance && updatedPlan.currentPhaseNumber) {
          // Auto-advance to next phase if enabled
          const nextPhaseNumber = manager.getNextPhase()?.number;
          if (nextPhaseNumber) {
            // Use a timeout to allow UI update before starting next phase
            setTimeout(() => {
              if (mountedRef.current && !isPausedRef.current) {
                startPhaseRef.current(nextPhaseNumber);
              }
            }, 1500);
          } else {
            setIsBuilding(false);
          }
        } else {
          setIsBuilding(false);
        }
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [
      plan,
      manager,
      mountedRef,
      isPausedRef,
      setPlan,
      setIsBuilding,
      setAccumulatedCodeState,
      onPhaseComplete,
      onBuildComplete,
      onError,
      autoAdvance,
    ]
  );

  /**
   * Skip a phase
   */
  const skipPhase = useCallback(
    (phaseNumber: number) => {
      if (!mountedRef.current || !plan || !manager) return;

      manager.skipPhase(phaseNumber);
      const updatedPlan = manager.getPlan();
      setPlan({ ...updatedPlan });
    },
    [plan, manager, mountedRef, setPlan]
  );

  /**
   * Retry a failed phase
   */
  const retryPhase = useCallback(
    (phaseNumber: number) => {
      if (!mountedRef.current || !plan || !manager) return;

      manager.resetPhase(phaseNumber);
      const updatedPlan = manager.getPlan();
      setPlan({ ...updatedPlan });
    },
    [plan, manager, mountedRef, setPlan]
  );

  /**
   * P3: Rollback to state before a specific phase
   */
  const rollbackToPhase = useCallback(
    (phaseNumber: number): boolean => {
      if (!mountedRef.current || !plan || !manager) return false;

      const success = manager.rollbackToSnapshot(phaseNumber);
      if (success) {
        const updatedPlan = manager.getPlan();
        setPlan({ ...updatedPlan });
        setAccumulatedCodeState(manager.getAccumulatedCode());
      }
      return success;
    },
    [plan, manager, mountedRef, setPlan, setAccumulatedCodeState]
  );

  /**
   * Pause the build
   */
  const pauseBuild = useCallback(() => {
    if (!mountedRef.current) return;
    setIsPaused(true);
  }, [mountedRef, setIsPaused]);

  /**
   * Resume the build
   */
  const resumeBuild = useCallback(() => {
    if (!mountedRef.current) return;
    setIsPaused(false);
  }, [mountedRef, setIsPaused]);

  /**
   * Reset everything
   */
  const resetBuild = useCallback(() => {
    if (!mountedRef.current) return;

    setPlan(null);
    setManager(null);
    setIsBuilding(false);
    setIsPaused(false);
    setAccumulatedCodeState('');
  }, [mountedRef, setPlan, setManager, setIsBuilding, setIsPaused, setAccumulatedCodeState]);

  return {
    initializePlan,
    startPhase,
    completePhase,
    skipPhase,
    retryPhase,
    rollbackToPhase,
    pauseBuild,
    resumeBuild,
    resetBuild,
  };
}
