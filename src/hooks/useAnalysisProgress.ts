/**
 * useAnalysisProgress Hook
 *
 * Manages the state and progress tracking for design analysis workflow.
 * Supports both quick-pass and deep-pass analysis phases.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  AnalysisPhase,
  AnalysisSubPhase,
  QuickAnalysis,
  CompleteDesignAnalysis,
} from '@/types/layoutDesign';

// ============================================================================
// TYPES
// ============================================================================

export type AnalysisPhaseId = 'upload' | 'quick' | 'deep' | 'generate' | 'render' | 'complete';

export interface AnalysisSubPhaseState {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export interface AnalysisPhaseState {
  id: AnalysisPhaseId;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';
  progress: number;
  subPhases: AnalysisSubPhaseState[];
  startTime?: number;
  endTime?: number;
  duration?: string;
  error?: string;
}

export interface AnalysisProgressState {
  isAnalyzing: boolean;
  currentPhase: AnalysisPhaseId;
  phases: AnalysisPhaseState[];
  overallProgress: number;
  startTime: number | null;
  elapsedTime: number;
  estimatedTimeRemaining: string;
  quickAnalysis: QuickAnalysis | null;
  deepAnalysis: CompleteDesignAnalysis | null;
  error: string | null;
  canCancel: boolean;
}

export interface UseAnalysisProgressReturn {
  state: AnalysisProgressState;
  startAnalysis: () => void;
  updatePhase: (phaseId: AnalysisPhaseId, update: Partial<AnalysisPhaseState>) => void;
  updateSubPhase: (
    phaseId: AnalysisPhaseId,
    subPhaseId: string,
    update: Partial<AnalysisSubPhaseState>
  ) => void;
  completePhase: (phaseId: AnalysisPhaseId) => void;
  startPhase: (phaseId: AnalysisPhaseId) => void;
  setQuickAnalysis: (analysis: QuickAnalysis) => void;
  setDeepAnalysis: (analysis: CompleteDesignAnalysis) => void;
  setError: (error: string) => void;
  reset: () => void;
  cancel: () => void;
}

// ============================================================================
// DEFAULT PHASES CONFIGURATION
// ============================================================================

const createDefaultPhases = (): AnalysisPhaseState[] => [
  {
    id: 'upload',
    label: 'Uploading',
    status: 'pending',
    progress: 0,
    subPhases: [
      { id: 'validate', label: 'Validating file', status: 'pending', progress: 0 },
      { id: 'compress', label: 'Optimizing image', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'quick',
    label: 'Quick Analysis',
    status: 'pending',
    progress: 0,
    duration: '2-3s',
    subPhases: [
      { id: 'colors', label: 'Extracting colors', status: 'pending', progress: 0 },
      { id: 'layout', label: 'Detecting layout', status: 'pending', progress: 0 },
      { id: 'fonts', label: 'Identifying fonts', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'deep',
    label: 'Deep Analysis',
    status: 'pending',
    progress: 0,
    duration: '10-15s',
    subPhases: [
      { id: 'typography', label: 'Measuring typography', status: 'pending', progress: 0 },
      { id: 'spacing', label: 'Calculating spacing', status: 'pending', progress: 0 },
      { id: 'effects', label: 'Analyzing effects', status: 'pending', progress: 0 },
      { id: 'components', label: 'Mapping components', status: 'pending', progress: 0 },
      { id: 'animations', label: 'Detecting animations', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'generate',
    label: 'Generating Layout',
    status: 'pending',
    progress: 0,
    subPhases: [
      { id: 'structure', label: 'Building structure', status: 'pending', progress: 0 },
      { id: 'styling', label: 'Applying styles', status: 'pending', progress: 0 },
    ],
  },
  {
    id: 'render',
    label: 'Rendering Preview',
    status: 'pending',
    progress: 0,
    subPhases: [{ id: 'preview', label: 'Creating preview', status: 'pending', progress: 0 }],
  },
  {
    id: 'complete',
    label: 'Complete',
    status: 'pending',
    progress: 0,
    subPhases: [],
  },
];

const createDefaultState = (): AnalysisProgressState => ({
  isAnalyzing: false,
  currentPhase: 'upload',
  phases: createDefaultPhases(),
  overallProgress: 0,
  startTime: null,
  elapsedTime: 0,
  estimatedTimeRemaining: 'Calculating...',
  quickAnalysis: null,
  deepAnalysis: null,
  error: null,
  canCancel: true,
});

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAnalysisProgress(): UseAnalysisProgressReturn {
  const [state, setState] = useState<AnalysisProgressState>(createDefaultState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  // Calculate overall progress from phases
  const calculateOverallProgress = useCallback((phases: AnalysisPhaseState[]): number => {
    const weights: Record<AnalysisPhaseId, number> = {
      upload: 5,
      quick: 15,
      deep: 50,
      generate: 20,
      render: 10,
      complete: 0,
    };

    let totalProgress = 0;
    phases.forEach((phase) => {
      const weight = weights[phase.id] || 0;
      totalProgress += (phase.progress / 100) * weight;
    });

    return Math.min(100, Math.round(totalProgress));
  }, []);

  // Calculate estimated time remaining
  const calculateTimeRemaining = useCallback(
    (overallProgress: number, elapsedTime: number): string => {
      if (overallProgress < 5) return 'Calculating...';
      if (overallProgress >= 100) return 'Complete';

      const estimatedTotal = (elapsedTime / overallProgress) * 100;
      const remaining = estimatedTotal - elapsedTime;

      if (remaining < 1000) return 'Almost done...';
      if (remaining < 60000) return `~${Math.ceil(remaining / 1000)}s remaining`;
      return `~${Math.ceil(remaining / 60000)} min remaining`;
    },
    []
  );

  // Start elapsed time tracking
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.startTime || !prev.isAnalyzing) return prev;
        const elapsed = Date.now() - prev.startTime;
        return {
          ...prev,
          elapsedTime: elapsed,
          estimatedTimeRemaining: calculateTimeRemaining(prev.overallProgress, elapsed),
        };
      });
    }, 100);
  }, [calculateTimeRemaining]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start analysis
  const startAnalysis = useCallback(() => {
    cancelledRef.current = false;
    const now = Date.now();
    setState({
      ...createDefaultState(),
      isAnalyzing: true,
      startTime: now,
      phases: createDefaultPhases().map((p, i) => ({
        ...p,
        status: i === 0 ? 'in_progress' : 'pending',
        startTime: i === 0 ? now : undefined,
      })),
    });
    startTimer();
  }, [startTimer]);

  // Update a phase
  const updatePhase = useCallback(
    (phaseId: AnalysisPhaseId, update: Partial<AnalysisPhaseState>) => {
      setState((prev) => {
        const newPhases = prev.phases.map((phase) => {
          if (phase.id === phaseId) {
            return { ...phase, ...update };
          }
          return phase;
        });

        const overallProgress = calculateOverallProgress(newPhases);

        return {
          ...prev,
          phases: newPhases,
          overallProgress,
          estimatedTimeRemaining: calculateTimeRemaining(overallProgress, prev.elapsedTime),
        };
      });
    },
    [calculateOverallProgress, calculateTimeRemaining]
  );

  // Update a sub-phase
  const updateSubPhase = useCallback(
    (phaseId: AnalysisPhaseId, subPhaseId: string, update: Partial<AnalysisSubPhaseState>) => {
      setState((prev) => {
        const newPhases = prev.phases.map((phase) => {
          if (phase.id === phaseId) {
            const newSubPhases = phase.subPhases.map((sub) => {
              if (sub.id === subPhaseId) {
                return { ...sub, ...update };
              }
              return sub;
            });

            // Calculate phase progress from sub-phases
            const completedSubs = newSubPhases.filter((s) => s.status === 'completed').length;
            const inProgressSubs = newSubPhases.filter((s) => s.status === 'in_progress');
            const inProgressProgress =
              inProgressSubs.reduce((sum, s) => sum + s.progress, 0) / (inProgressSubs.length || 1);
            const totalProgress =
              newSubPhases.length > 0
                ? ((completedSubs + inProgressProgress / 100) / newSubPhases.length) * 100
                : phase.progress;

            return {
              ...phase,
              subPhases: newSubPhases,
              progress: Math.round(totalProgress),
            };
          }
          return phase;
        });

        const overallProgress = calculateOverallProgress(newPhases);

        return {
          ...prev,
          phases: newPhases,
          overallProgress,
          estimatedTimeRemaining: calculateTimeRemaining(overallProgress, prev.elapsedTime),
        };
      });
    },
    [calculateOverallProgress, calculateTimeRemaining]
  );

  // Start a phase
  const startPhase = useCallback((phaseId: AnalysisPhaseId) => {
    setState((prev) => {
      const phaseIndex = prev.phases.findIndex((p) => p.id === phaseId);
      const now = Date.now();

      const newPhases = prev.phases.map((phase, index) => {
        if (phase.id === phaseId) {
          return {
            ...phase,
            status: 'in_progress' as const,
            startTime: now,
            subPhases: phase.subPhases.map((sub, i) => ({
              ...sub,
              status: i === 0 ? ('in_progress' as const) : ('pending' as const),
            })),
          };
        }
        // Mark previous phases as completed if still in progress
        if (index < phaseIndex && phase.status === 'in_progress') {
          return { ...phase, status: 'completed' as const, progress: 100 };
        }
        return phase;
      });

      return {
        ...prev,
        currentPhase: phaseId,
        phases: newPhases,
      };
    });
  }, []);

  // Complete a phase
  const completePhase = useCallback(
    (phaseId: AnalysisPhaseId) => {
      setState((prev) => {
        const now = Date.now();
        const phaseIndex = prev.phases.findIndex((p) => p.id === phaseId);
        const nextPhaseId = prev.phases[phaseIndex + 1]?.id;

        const newPhases = prev.phases.map((phase) => {
          if (phase.id === phaseId) {
            return {
              ...phase,
              status: 'completed' as const,
              progress: 100,
              endTime: now,
              subPhases: phase.subPhases.map((sub) => ({
                ...sub,
                status: 'completed' as const,
                progress: 100,
              })),
            };
          }
          return phase;
        });

        const overallProgress = calculateOverallProgress(newPhases);
        const isComplete = phaseId === 'render' || phaseId === 'complete';

        if (isComplete) {
          stopTimer();
        }

        return {
          ...prev,
          currentPhase: isComplete ? 'complete' : nextPhaseId || prev.currentPhase,
          phases: newPhases,
          overallProgress,
          isAnalyzing: !isComplete,
          estimatedTimeRemaining: isComplete ? 'Complete' : prev.estimatedTimeRemaining,
        };
      });
    },
    [calculateOverallProgress, stopTimer]
  );

  // Set quick analysis result
  const setQuickAnalysis = useCallback((analysis: QuickAnalysis) => {
    setState((prev) => ({
      ...prev,
      quickAnalysis: analysis,
    }));
  }, []);

  // Set deep analysis result
  const setDeepAnalysis = useCallback((analysis: CompleteDesignAnalysis) => {
    setState((prev) => ({
      ...prev,
      deepAnalysis: analysis,
    }));
  }, []);

  // Set error
  const setError = useCallback(
    (error: string) => {
      stopTimer();
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error,
        phases: prev.phases.map((phase) => {
          if (phase.status === 'in_progress') {
            return { ...phase, status: 'error' as const, error };
          }
          return phase;
        }),
      }));
    },
    [stopTimer]
  );

  // Reset
  const reset = useCallback(() => {
    stopTimer();
    cancelledRef.current = false;
    setState(createDefaultState());
  }, [stopTimer]);

  // Cancel
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stopTimer();
    setState((prev) => ({
      ...prev,
      isAnalyzing: false,
      canCancel: false,
      phases: prev.phases.map((phase) => {
        if (phase.status === 'in_progress') {
          return { ...phase, status: 'error' as const, error: 'Cancelled by user' };
        }
        return phase;
      }),
    }));
  }, [stopTimer]);

  return {
    state,
    startAnalysis,
    updatePhase,
    updateSubPhase,
    completePhase,
    startPhase,
    setQuickAnalysis,
    setDeepAnalysis,
    setError,
    reset,
    cancel,
  };
}

export default useAnalysisProgress;
