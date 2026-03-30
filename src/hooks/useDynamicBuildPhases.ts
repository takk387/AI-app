'use client';

/**
 * useDynamicBuildPhases Hook
 *
 * React wrapper for PhaseExecutionManager that provides dynamic phase
 * management for the AI Builder. Replaces useBuildPhases with support
 * for variable phase counts (3-25+) based on app complexity.
 *
 * ## Build Lifecycle State Machine
 *
 * ```
 * uninitialized ──initializePlan()──> ready
 *        ready ──startPhase(N)──────> building
 *     building ──completePhase()────> ready     (if more phases remain)
 *     building ──completePhase()────> complete  (if all phases done)
 *     building ──pauseBuild()───────> paused
 *       paused ──resumeBuild()──────> building
 *     building ──onError───────────> error
 *        error ──retryPhase()──────> building
 *          any ──resetBuild()──────> uninitialized
 * ```
 *
 * ## Method Preconditions
 *
 * | Method               | Valid States                          | Precondition Notes                          |
 * |----------------------|---------------------------------------|---------------------------------------------|
 * | initializePlan()     | any                                   | Resets all state; safe to call anytime       |
 * | startPhase(N)        | ready, building                       | plan + manager must exist (initializePlan)   |
 * | completePhase()      | building                              | A phase must be in-progress                  |
 * | skipPhase(N)         | ready, building                       | plan + manager must exist                    |
 * | retryPhase(N)        | error, ready                          | Phase must exist and have failed/completed   |
 * | pauseBuild()         | building                              | Noop if already paused                       |
 * | resumeBuild()        | paused                                | Noop if not paused                           |
 * | resetBuild()         | any                                   | Clears all state back to uninitialized       |
 * | rollbackToPhase(N)   | ready, building, paused               | Snapshot for phase N must exist              |
 * | getExecutionContext() | ready, building                      | plan + manager must exist                    |
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  DynamicPhase,
  DynamicPhasePlan,
  PhaseExecutionContext,
  PhaseExecutionResult,
} from '@/types/dynamicPhases';
import type { BuildPhase, BuildProgress, PhaseId } from '@/types/buildPhases';
import type { QualityReport, QualityPipelineState, ReviewStrictness } from '@/types/codeReview';
import { PhaseExecutionManager, buildPhaseExecutionPrompt } from '@/services/PhaseExecutionManager';

import {
  adaptAllPhasesToUI,
  adaptDynamicProgressToUI,
  getPlanSummary,
  type PlanSummary,
} from '@/types/phaseAdapters';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Discriminated union representing the build lifecycle states.
 * Mirrors the state machine documented above. The `status` discriminant
 * determines which fields are guaranteed present.
 */
export type BuildLifecycleState =
  | { status: 'uninitialized' }
  | { status: 'ready'; plan: DynamicPhasePlan }
  | { status: 'building'; plan: DynamicPhasePlan; currentPhase: DynamicPhase }
  | { status: 'paused'; plan: DynamicPhasePlan; currentPhase: DynamicPhase }
  | { status: 'complete'; plan: DynamicPhasePlan }
  | { status: 'error'; plan: DynamicPhasePlan; error: Error };

export interface UseDynamicBuildPhasesOptions {
  onPhaseStart?: (phase: DynamicPhase) => void;
  onPhaseComplete?: (phase: DynamicPhase, result: PhaseExecutionResult) => void;
  onBuildComplete?: (plan: DynamicPhasePlan) => void;
  onBuildFailed?: (error: Error, phase?: DynamicPhase) => void;
  onPlanInitialized?: (plan: DynamicPhasePlan) => void;
  onError?: (error: Error, phase?: DynamicPhase) => void;
  /**
   * If true, automatically starts the next phase upon successful completion of the current one.
   * @default false
   */
  autoAdvance?: boolean;
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

  // Quality state
  qualityReport: QualityReport | null;
  pipelineState: QualityPipelineState;
  isReviewing: boolean;
  reviewStrictness: ReviewStrictness;

  // Actions
  initializePlan: (plan: DynamicPhasePlan) => void;
  startPhase: (phaseNumber: number) => void;
  completePhase: (result: PhaseExecutionResult) => void;
  skipPhase: (phaseNumber: number) => void;
  retryPhase: (phaseNumber: number) => void;
  pauseBuild: () => void;
  resumeBuild: () => void;
  resetBuild: () => void;

  // Quality actions
  runPhaseQualityCheck: (phaseNumber: number) => Promise<void>;
  runFinalQualityCheck: () => Promise<void>;
  setReviewStrictness: (strictness: ReviewStrictness) => void;

  // Phase integrity actions (P3)
  rollbackToPhase: (phaseNumber: number) => boolean;

  // Phase execution helpers
  getExecutionContext: (phaseNumber: number) => PhaseExecutionContext | null;
  getExecutionContextAsync: (phaseNumber: number) => Promise<PhaseExecutionContext | null>;
  getExecutionPrompt: (phaseNumber: number) => string | null;
  getExecutionPromptAsync: (phaseNumber: number) => Promise<string | null>;
  getNextPhase: () => DynamicPhase | null;
  isComplete: () => boolean;

  // Phase navigation
  getPhaseByNumber: (phaseNumber: number) => DynamicPhase | undefined;
  getPhaseById: (phaseId: PhaseId) => BuildPhase | undefined;

  // Code management
  setAccumulatedCode: (code: string) => void;
  addGeneratedFiles: (files: string[]) => void;
  addImplementedFeatures: (features: string[]) => void;

  // Code context (for UI display — matches singleton key used by PhaseExecutionManager)
  codeContextAppId: string | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDynamicBuildPhases(
  options: UseDynamicBuildPhasesOptions = {}
): UseDynamicBuildPhasesReturn {
  const {
    onPhaseStart,
    onPhaseComplete,
    onBuildComplete,
    onBuildFailed: _onBuildFailed,
    onPlanInitialized,
    onError,
    autoAdvance = false,
  } = options;

  // Track mounted state
  const mountedRef = useRef(true);

  // Core state
  const [plan, setPlan] = useState<DynamicPhasePlan | null>(null);
  const [manager, setManager] = useState<PhaseExecutionManager | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  const [accumulatedCode, setAccumulatedCodeState] = useState('');

  // Quality state
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [pipelineState, setPipelineState] = useState<QualityPipelineState>({
    currentStep: 'idle',
    validationStatus: 'pending',
    reviewStatus: 'pending',
    fixStatus: 'pending',
    progress: 0,
  });
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStrictness, setReviewStrictnessState] = useState<ReviewStrictness>('standard');

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
  const initializePlan = useCallback(
    (newPlan: DynamicPhasePlan) => {
      if (!mountedRef.current) return;

      const newManager = new PhaseExecutionManager(newPlan);
      setManager(newManager);
      setPlan(newPlan);
      setIsBuilding(false);
      setIsPaused(false);
      setAccumulatedCodeState('');

      // Notify about plan initialization (for documentation capture)
      onPlanInitialized?.(newPlan);
    },
    [onPlanInitialized]
  );

  /**
   * Start executing a specific phase
   */
  const startPhase = useCallback(
    (phaseNumber: number) => {
      if (!mountedRef.current || !plan || !manager) {
        if (process.env.NODE_ENV === 'development' && !plan) {
          console.warn(
            '[useDynamicBuildPhases] startPhase() called before initializePlan(). ' +
              'Call initializePlan(plan) first to transition from "uninitialized" to "ready" state.'
          );
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
    [plan, manager, onPhaseStart, onError]
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
        } else if (autoAdvance && updatedPlan.currentPhaseNumber) {
          // Auto-advance to next phase if enabled
          const nextPhaseNumber = manager.getNextPhase()?.number;
          if (nextPhaseNumber) {
            // Use a timeout to allow UI update before starting next phase
            setTimeout(() => {
              if (mountedRef.current && !isPausedRef.current) {
                startPhase(nextPhaseNumber);
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
    [plan, manager, onPhaseComplete, onBuildComplete, onError, autoAdvance, startPhase]
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
    },
    [plan, manager]
  );

  /**
   * P3: Rollback to state before a specific phase
   * Restores all accumulated state to the snapshot taken before the phase started
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
   * Get execution context with CodeContextService initialized (async)
   * This populates the smart context snapshot for richer code context.
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
      if (!mountedRef.current || !plan || !manager) return;

      manager.addFiles(files);
      setPlan({ ...manager.getPlan() });
    },
    [plan, manager]
  );

  /**
   * Add implemented features to tracking
   */
  const addImplementedFeatures = useCallback(
    (features: string[]) => {
      if (!mountedRef.current || !plan || !manager) return;

      manager.addFeatures(features);
      setPlan({ ...manager.getPlan() });
    },
    [plan, manager]
  );

  // ========== Quality Actions ==========

  /**
   * Run quality check for a specific phase
   */
  const runPhaseQualityCheck = useCallback(
    async (phaseNumber: number) => {
      if (!mountedRef.current || !manager) return;

      setIsReviewing(true);
      setPipelineState({
        currentStep: 'reviewing',
        validationStatus: 'pending',
        reviewStatus: 'pending',
        fixStatus: 'pending',
        progress: 25,
      });

      try {
        const result = await manager.runPhaseQualityReview(phaseNumber);
        if (result.status === 'success' && mountedRef.current) {
          setQualityReport(result.data.report);
          setPipelineState({
            currentStep: 'idle',
            validationStatus: 'passed',
            reviewStatus: 'passed',
            fixStatus: 'pending',
            progress: 100,
          });
        } else if (result.status === 'error') {
          onError?.(new Error(result.error));
        }
      } catch (error) {
        onError?.(error as Error);
      } finally {
        if (mountedRef.current) {
          setIsReviewing(false);
        }
      }
    },
    [manager, onError]
  );

  /**
   * Run final comprehensive quality check
   */
  const runFinalQualityCheck = useCallback(async () => {
    if (!mountedRef.current || !manager) return;

    setIsReviewing(true);
    setPipelineState({
      currentStep: 'reviewing',
      validationStatus: 'pending',
      reviewStatus: 'pending',
      fixStatus: 'pending',
      progress: 25,
    });

    try {
      const result = await manager.runFinalQualityReview();
      if (result.status === 'success' && mountedRef.current) {
        setQualityReport(result.data.report);
        setPipelineState({
          currentStep: 'idle',
          validationStatus: 'passed',
          reviewStatus: 'passed',
          fixStatus: 'pending',
          progress: 100,
        });
      } else if (result.status === 'error') {
        onError?.(new Error(result.error));
      }
    } catch (error) {
      onError?.(error as Error);
    } finally {
      if (mountedRef.current) {
        setIsReviewing(false);
      }
    }
  }, [manager, onError]);

  /**
   * Set review strictness level
   */
  const setReviewStrictness = useCallback(
    (strictness: ReviewStrictness) => {
      if (!mountedRef.current) return;
      setReviewStrictnessState(strictness);
      if (manager) {
        manager.setReviewStrictness(strictness);
      }
    },
    [manager]
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

    // Quality state
    qualityReport,
    pipelineState,
    isReviewing,
    reviewStrictness,

    // Actions
    initializePlan,
    startPhase,
    completePhase,
    skipPhase,
    retryPhase,
    pauseBuild,
    resumeBuild,
    resetBuild,

    // Quality actions
    runPhaseQualityCheck,
    runFinalQualityCheck,
    setReviewStrictness,

    // Phase integrity actions
    rollbackToPhase,

    // Execution helpers
    getExecutionContext,
    getExecutionContextAsync,
    getExecutionPrompt,
    getExecutionPromptAsync,
    getNextPhase,
    isComplete,

    // Navigation
    getPhaseByNumber,
    getPhaseById,

    // Code management
    setAccumulatedCode,
    addGeneratedFiles,
    addImplementedFeatures,

    // Code context
    codeContextAppId: plan?.appName ?? null,
  };
}

export default useDynamicBuildPhases;
