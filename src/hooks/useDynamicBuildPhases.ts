'use client';

/**
 * useDynamicBuildPhases Hook
 *
 * React wrapper for PhaseExecutionManager that provides dynamic phase
 * management for the AI Builder. Replaces useBuildPhases with support
 * for variable phase counts (3-25+) based on app complexity.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  DynamicPhase,
  DynamicPhasePlan,
  PhaseExecutionContext,
  PhaseExecutionResult,
} from '@/types/dynamicPhases';
import type { BuildPhase, BuildProgress, PhaseId } from '@/types/buildPhases';
import { PhaseExecutionManager, buildPhaseExecutionPrompt } from '@/services/PhaseExecutionManager';
import {
  adaptDynamicPhaseToUI,
  adaptAllPhasesToUI,
  adaptDynamicProgressToUI,
  generatePhaseId,
  getPlanSummary,
  type PlanSummary,
} from '@/types/phaseAdapters';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDynamicBuildPhasesOptions {
  onPhaseStart?: (phase: DynamicPhase) => void;
  onPhaseComplete?: (phase: DynamicPhase, result: PhaseExecutionResult) => void;
  onBuildComplete?: (plan: DynamicPhasePlan) => void;
  onError?: (error: Error, phase?: DynamicPhase) => void;
}

export interface UseDynamicBuildPhasesReturn {
  // State
  plan: DynamicPhasePlan | null;
  phases: DynamicPhase[];
  uiPhases: BuildPhase[]; // Adapted for legacy UI components
  currentPhase: DynamicPhase | null;
  progress: BuildProgress;
  planSummary: PlanSummary | null;
  isBuilding: boolean;
  isPaused: boolean;
  accumulatedCode: string;

  // Actions
  initializePlan: (plan: DynamicPhasePlan) => void;
  startPhase: (phaseNumber: number) => void;
  completePhase: (result: PhaseExecutionResult) => void;
  skipPhase: (phaseNumber: number) => void;
  retryPhase: (phaseNumber: number) => void;
  pauseBuild: () => void;
  resumeBuild: () => void;
  resetBuild: () => void;

  // Phase execution helpers
  getExecutionContext: (phaseNumber: number) => PhaseExecutionContext | null;
  getExecutionPrompt: (phaseNumber: number) => string | null;
  getNextPhase: () => DynamicPhase | null;
  isComplete: () => boolean;

  // Phase navigation
  getPhaseByNumber: (phaseNumber: number) => DynamicPhase | undefined;
  getPhaseById: (phaseId: PhaseId) => BuildPhase | undefined;

  // Code management
  setAccumulatedCode: (code: string) => void;
  addGeneratedFiles: (files: string[]) => void;
  addImplementedFeatures: (features: string[]) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDynamicBuildPhases(
  options: UseDynamicBuildPhasesOptions = {}
): UseDynamicBuildPhasesReturn {
  const { onPhaseStart, onPhaseComplete, onBuildComplete, onError } = options;

  // Track mounted state
  const mountedRef = useRef(true);

  // Core state
  const [plan, setPlan] = useState<DynamicPhasePlan | null>(null);
  const [manager, setManager] = useState<PhaseExecutionManager | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [accumulatedCode, setAccumulatedCodeState] = useState('');

  // Force re-render trigger for manager state changes
  const [, forceUpdate] = useState({});

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Derived state
  const phases = useMemo(() => plan?.phases || [], [plan]);

  const uiPhases = useMemo(() => {
    if (!plan) return [];
    return adaptAllPhasesToUI(plan);
  }, [plan]);

  const currentPhase = useMemo(() => {
    return phases.find((p) => p.status === 'in-progress') || null;
  }, [phases]);

  const progress = useMemo((): BuildProgress => {
    if (!plan) {
      return {
        currentPhaseId: null,
        currentPhaseIndex: -1,
        totalPhases: 0,
        completedPhases: [],
        percentComplete: 0,
        estimatedTimeRemaining: '',
        startedAt: '',
        lastUpdated: '',
      };
    }
    return adaptDynamicProgressToUI(plan, manager || undefined);
  }, [plan, manager]);

  const planSummary = useMemo((): PlanSummary | null => {
    if (!plan) return null;
    return getPlanSummary(plan);
  }, [plan]);

  // ========== Actions ==========

  /**
   * Initialize with a new plan
   */
  const initializePlan = useCallback((newPlan: DynamicPhasePlan) => {
    if (!mountedRef.current) return;

    const newManager = new PhaseExecutionManager(newPlan);
    setManager(newManager);
    setPlan(newPlan);
    setIsBuilding(false);
    setIsPaused(false);
    setAccumulatedCodeState('');
  }, []);

  /**
   * Start executing a specific phase
   */
  const startPhase = useCallback(
    (phaseNumber: number) => {
      if (!mountedRef.current || !plan) return;

      const phase = plan.phases.find((p) => p.number === phaseNumber);
      if (!phase) {
        onError?.(new Error(`Phase ${phaseNumber} not found`));
        return;
      }

      // Update phase status
      phase.status = 'in-progress';
      setPlan({ ...plan, currentPhaseNumber: phaseNumber });
      setIsBuilding(true);

      onPhaseStart?.(phase);
      forceUpdate({});
    },
    [plan, onPhaseStart, onError]
  );

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
        }

        forceUpdate({});
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [plan, manager, onPhaseComplete, onBuildComplete, onError]
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
      forceUpdate({});
    },
    [plan, manager]
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
      forceUpdate({});
    },
    [plan, manager]
  );

  /**
   * Pause the build
   */
  const pauseBuild = useCallback(() => {
    if (!mountedRef.current) return;
    setIsPaused(true);
  }, []);

  /**
   * Resume the build
   */
  const resumeBuild = useCallback(() => {
    if (!mountedRef.current) return;
    setIsPaused(false);
  }, []);

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
  }, []);

  // ========== Execution Helpers ==========

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

  // ========== Navigation ==========

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

  // ========== Code Management ==========

  /**
   * Set accumulated code
   */
  const setAccumulatedCode = useCallback((code: string) => {
    if (!mountedRef.current) return;
    setAccumulatedCodeState(code);
  }, []);

  /**
   * Add generated files to tracking
   */
  const addGeneratedFiles = useCallback(
    (files: string[]) => {
      if (!mountedRef.current || !plan) return;

      const updated = {
        ...plan,
        accumulatedFiles: [...plan.accumulatedFiles, ...files],
      };
      setPlan(updated);
    },
    [plan]
  );

  /**
   * Add implemented features to tracking
   */
  const addImplementedFeatures = useCallback(
    (features: string[]) => {
      if (!mountedRef.current || !plan) return;

      const updated = {
        ...plan,
        accumulatedFeatures: [...plan.accumulatedFeatures, ...features],
      };
      setPlan(updated);
    },
    [plan]
  );

  // ========== Return ==========

  return {
    // State
    plan,
    phases,
    uiPhases,
    currentPhase,
    progress,
    planSummary,
    isBuilding,
    isPaused,
    accumulatedCode,

    // Actions
    initializePlan,
    startPhase,
    completePhase,
    skipPhase,
    retryPhase,
    pauseBuild,
    resumeBuild,
    resetBuild,

    // Execution helpers
    getExecutionContext,
    getExecutionPrompt,
    getNextPhase,
    isComplete,

    // Navigation
    getPhaseByNumber,
    getPhaseById,

    // Code management
    setAccumulatedCode,
    addGeneratedFiles,
    addImplementedFeatures,
  };
}

export default useDynamicBuildPhases;
