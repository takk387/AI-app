"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  BuildPhase,
  PhaseId,
  PhaseResult,
  ValidationResult,
  BuildProgress,
  PhasedAppConcept,
} from '../types/buildPhases';
import {
  PhaseOrchestrator,
  createPhaseOrchestrator,
} from '../services/PhaseOrchestrator';

export interface UseBuildPhasesOptions {
  onPhaseStart?: (phase: BuildPhase) => void;
  onPhaseComplete?: (phase: BuildPhase, result: PhaseResult) => void;
  onValidationComplete?: (phase: BuildPhase, result: ValidationResult) => void;
  onBuildComplete?: (progress: BuildProgress) => void;
  onError?: (error: Error, phase?: BuildPhase) => void;
}

export interface UseBuildPhasesReturn {
  // State
  phases: BuildPhase[];
  currentPhase: BuildPhase | null;
  progress: BuildProgress;
  isBuilding: boolean;
  isPaused: boolean;
  isPhasedMode: boolean;
  accumulatedCode: string;
  
  // Actions
  startPhasedBuild: (concept: PhasedAppConcept) => Promise<void>;
  executeCurrentPhase: () => Promise<PhaseResult | null>;
  validateCurrentPhase: () => Promise<ValidationResult | null>;
  proceedToNextPhase: () => Promise<void>;
  skipCurrentPhase: () => Promise<void>;
  retryCurrentPhase: () => Promise<void>;
  pauseBuild: () => void;
  resumeBuild: () => void;
  resetBuild: () => void;
  enablePhasedMode: () => void;
  disablePhasedMode: () => void;
  
  // Phase navigation
  selectPhase: (phaseId: PhaseId) => void;
  getPhaseById: (phaseId: PhaseId) => BuildPhase | undefined;
  
  // Code management
  setPhaseCode: (code: string) => void;
}

/**
 * Hook for managing build phases state and actions
 */
export function useBuildPhases(options: UseBuildPhasesOptions = {}): UseBuildPhasesReturn {
  const [orchestrator] = useState(() =>
    createPhaseOrchestrator({
      onPhaseStart: options.onPhaseStart,
      onPhaseComplete: options.onPhaseComplete,
      onValidationComplete: options.onValidationComplete,
      onBuildComplete: options.onBuildComplete,
      onError: options.onError,
    })
  );

  const [phases, setPhases] = useState<BuildPhase[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPhasedMode, setIsPhasedMode] = useState(false);
  const [accumulatedCode, setAccumulatedCode] = useState('');
  const [progress, setProgress] = useState<BuildProgress>({
    currentPhaseId: null,
    currentPhaseIndex: -1,
    totalPhases: 0,
    completedPhases: [],
    percentComplete: 0,
    estimatedTimeRemaining: '',
    startedAt: '',
    lastUpdated: '',
  });

  // Sync state with orchestrator
  const syncState = useCallback(() => {
    const state = orchestrator.getState();
    setPhases([...state.phases]);
    setIsBuilding(state.isBuilding);
    setIsPaused(state.isPaused);
    setAccumulatedCode(state.accumulatedCode);
    setProgress(orchestrator.getProgress());
  }, [orchestrator]);

  // Current phase
  const currentPhase = useMemo(() => {
    return phases.find((p) => p.id === progress.currentPhaseId) || null;
  }, [phases, progress.currentPhaseId]);

  // Start phased build
  const startPhasedBuild = useCallback(async (concept: PhasedAppConcept) => {
    await orchestrator.startBuild(concept);
    setIsPhasedMode(true);
    syncState();
  }, [orchestrator, syncState]);

  // Execute current phase
  const executeCurrentPhase = useCallback(async (): Promise<PhaseResult | null> => {
    const current = orchestrator.getCurrentPhase();
    if (!current) return null;

    const result = await orchestrator.executePhase(current.id);
    syncState();
    return result;
  }, [orchestrator, syncState]);

  // Validate current phase
  const validateCurrentPhase = useCallback(async (): Promise<ValidationResult | null> => {
    const current = orchestrator.getCurrentPhase();
    if (!current) return null;

    const result = await orchestrator.validatePhase(current.id);
    syncState();
    return result;
  }, [orchestrator, syncState]);

  // Proceed to next phase
  const proceedToNextPhase = useCallback(async () => {
    await orchestrator.proceedToNextPhase();
    syncState();
  }, [orchestrator, syncState]);

  // Skip current phase
  const skipCurrentPhase = useCallback(async () => {
    const current = orchestrator.getCurrentPhase();
    if (!current) return;

    await orchestrator.skipPhase(current.id);
    await orchestrator.proceedToNextPhase();
    syncState();
  }, [orchestrator, syncState]);

  // Retry current phase
  const retryCurrentPhase = useCallback(async () => {
    const current = orchestrator.getCurrentPhase();
    if (!current) return;

    await orchestrator.retryPhase(current.id);
    syncState();
  }, [orchestrator, syncState]);

  // Pause build
  const pauseBuild = useCallback(() => {
    orchestrator.pause();
    setIsPaused(true);
  }, [orchestrator]);

  // Resume build
  const resumeBuild = useCallback(() => {
    orchestrator.resume();
    setIsPaused(false);
  }, [orchestrator]);

  // Reset build
  const resetBuild = useCallback(() => {
    orchestrator.reset();
    setIsPhasedMode(false);
    syncState();
  }, [orchestrator, syncState]);

  // Enable phased mode
  const enablePhasedMode = useCallback(() => {
    setIsPhasedMode(true);
  }, []);

  // Disable phased mode
  const disablePhasedMode = useCallback(() => {
    setIsPhasedMode(false);
    resetBuild();
  }, [resetBuild]);

  // Select phase (for viewing details)
  const selectPhase = useCallback((phaseId: PhaseId) => {
    // This is for UI purposes - doesn't change orchestrator state
    // Just updates what phase details are being viewed
  }, []);

  // Get phase by ID
  const getPhaseById = useCallback(
    (phaseId: PhaseId): BuildPhase | undefined => {
      return phases.find((p) => p.id === phaseId);
    },
    [phases]
  );

  // Set phase code
  const setPhaseCode = useCallback(
    (code: string) => {
      orchestrator.setAccumulatedCode(code);
      setAccumulatedCode(code);
    },
    [orchestrator]
  );

  // Initialize phases on mount
  useEffect(() => {
    setPhases(orchestrator.getPhases());
    setProgress(orchestrator.getProgress());
  }, [orchestrator]);

  return {
    // State
    phases,
    currentPhase,
    progress,
    isBuilding,
    isPaused,
    isPhasedMode,
    accumulatedCode,

    // Actions
    startPhasedBuild,
    executeCurrentPhase,
    validateCurrentPhase,
    proceedToNextPhase,
    skipCurrentPhase,
    retryCurrentPhase,
    pauseBuild,
    resumeBuild,
    resetBuild,
    enablePhasedMode,
    disablePhasedMode,

    // Phase navigation
    selectPhase,
    getPhaseById,

    // Code management
    setPhaseCode,
  };
}

export default useBuildPhases;
