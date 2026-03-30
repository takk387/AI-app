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
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import type {
  DynamicPhase,
  DynamicPhasePlan,
  PhaseExecutionContext,
  PhaseExecutionResult,
} from '@/types/dynamicPhases';
import type { BuildPhase, BuildProgress, PhaseId } from '@/types/buildPhases';
import type { QualityReport, QualityPipelineState, ReviewStrictness } from '@/types/codeReview';
import type { PhaseExecutionManager } from '@/services/PhaseExecutionManager';

import {
  adaptAllPhasesToUI,
  adaptDynamicProgressToUI,
  getPlanSummary,
  type PlanSummary,
} from '@/types/phaseAdapters';

import { usePhaseLifecycle } from './useDynamicBuildPhases/usePhaseLifecycle';
import { usePhaseExecutionContext } from './useDynamicBuildPhases/usePhaseExecutionContext';
import { useCodeManagement } from './useDynamicBuildPhases/useCodeManagement';
import { useQualityReview } from './useDynamicBuildPhases/useQualityReview';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Discriminated union representing the build lifecycle states.
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
  autoAdvance?: boolean;
}

export interface UseDynamicBuildPhasesReturn {
  // State
  plan: DynamicPhasePlan | null;
  phases: DynamicPhase[];
  uiPhases: BuildPhase[];
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

  // Code context
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

  // Shared deps for sub-hooks
  const lifecycleDeps = {
    mountedRef,
    isPausedRef,
    plan,
    manager,
    setPlan,
    setManager,
    setIsBuilding,
    setIsPaused,
    setAccumulatedCodeState,
  };

  // Compose sub-hooks
  const lifecycle = usePhaseLifecycle(lifecycleDeps, {
    autoAdvance,
    onPhaseStart,
    onPhaseComplete,
    onBuildComplete,
    onPlanInitialized,
    onError,
  });

  const execution = usePhaseExecutionContext({ manager, phases, uiPhases });

  const code = useCodeManagement({ mountedRef, plan, manager, setPlan, setAccumulatedCodeState });

  const quality = useQualityReview({ mountedRef, manager, onError });

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
    ...quality,

    // Actions
    ...lifecycle,

    // Execution helpers
    ...execution,

    // Code management
    ...code,

    // Code context
    codeContextAppId: plan?.appName ?? null,
  };
}

export default useDynamicBuildPhases;
