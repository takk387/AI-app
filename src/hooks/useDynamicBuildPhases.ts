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
import type { QualityReport, QualityPipelineState, ReviewStrictness } from '@/types/codeReview';
import { PhaseExecutionManager, buildPhaseExecutionPrompt } from '@/services/PhaseExecutionManager';

// Dynamic import for CodeReviewService to avoid bundling tree-sitter in client
// getPipelineState is only called during quality review (which happens server-side via API)
// Using webpackIgnore to prevent webpack from analyzing this import at build time
async function getCodeReviewPipelineState(): Promise<QualityPipelineState> {
  const { getPipelineState } = await import(
    /* webpackIgnore: true */ '@/services/CodeReviewService'
  );
  return getPipelineState();
}
import {
  adaptAllPhasesToUI,
  adaptDynamicProgressToUI,
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

  // Quality enforcement
  runPreGenerationChecks: (phaseNumber: number) => {
    passed: boolean;
    warnings: string[];
    suggestions: string[];
    requiredActions: string[];
  } | null;
  runPostGenerationValidations: (phaseNumber: number) => {
    passed: boolean;
    issues: Array<{ file: string; message: string; suggestion: string; line?: number }>;
    summary: string;
  } | null;
  getQualityPromptAdditions: () => string;
  validateBuildPlan: () => { isValid: boolean; warnings: string[]; recommendations: string[] } | null;
  getFolderStructureRecommendations: () => {
    description: string;
    structure: string[];
    requiredFiles: string[];
    guidelines: string[];
  } | null;
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

  // ========== Quality Actions ==========

  /**
   * Run quality check for a specific phase
   */
  const runPhaseQualityCheck = useCallback(
    async (phaseNumber: number) => {
      if (!mountedRef.current || !manager) return;

      setIsReviewing(true);
      setPipelineState(await getCodeReviewPipelineState());

      try {
        const result = await manager.runPhaseQualityReview(phaseNumber);
        if (result && mountedRef.current) {
          setQualityReport(result.report);
          setPipelineState(await getCodeReviewPipelineState());
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
    setPipelineState(await getCodeReviewPipelineState());

    try {
      const result = await manager.runFinalQualityReview();
      if (result && mountedRef.current) {
        setQualityReport(result.report);
        setPipelineState(await getCodeReviewPipelineState());
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

  // ========== Quality Enforcement ==========

  /**
   * Run pre-generation checks before executing a phase
   */
  const runPreGenerationChecks = useCallback(
    (phaseNumber: number) => {
      if (!manager) return null;
      return manager.runPreGenerationChecks(phaseNumber);
    },
    [manager]
  );

  /**
   * Run post-generation validations after phase completion
   */
  const runPostGenerationValidations = useCallback(
    (phaseNumber: number) => {
      if (!manager) return null;
      return manager.runPostGenerationValidations(phaseNumber);
    },
    [manager]
  );

  /**
   * Get quality-enhanced prompt additions
   */
  const getQualityPromptAdditions = useCallback(() => {
    if (!manager) return '';
    return manager.getQualityPromptAdditions();
  }, [manager]);

  /**
   * Validate the entire build plan
   */
  const validateBuildPlan = useCallback(() => {
    if (!manager) return null;
    return manager.validateBuildPlan();
  }, [manager]);

  /**
   * Get folder structure recommendations
   */
  const getFolderStructureRecommendations = useCallback(() => {
    if (!manager) return null;
    return manager.getFolderStructureRecommendations();
  }, [manager]);

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

    // Quality enforcement
    runPreGenerationChecks,
    runPostGenerationValidations,
    getQualityPromptAdditions,
    validateBuildPlan,
    getFolderStructureRecommendations,
  };
}

export default useDynamicBuildPhases;
