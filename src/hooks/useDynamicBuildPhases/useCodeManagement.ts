'use client';

import { useCallback } from 'react';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { PhaseExecutionManager } from '@/services/PhaseExecutionManager';

export interface UseCodeManagementDeps {
  mountedRef: React.RefObject<boolean>;
  plan: DynamicPhasePlan | null;
  manager: PhaseExecutionManager | null;
  setPlan: React.Dispatch<React.SetStateAction<DynamicPhasePlan | null>>;
  setAccumulatedCodeState: React.Dispatch<React.SetStateAction<string>>;
}

export function useCodeManagement(deps: UseCodeManagementDeps) {
  const { mountedRef, plan, manager, setPlan, setAccumulatedCodeState } = deps;

  /**
   * Set accumulated code
   */
  const setAccumulatedCode = useCallback(
    (code: string) => {
      if (!mountedRef.current) return;
      setAccumulatedCodeState(code);
    },
    [mountedRef, setAccumulatedCodeState]
  );

  /**
   * Add generated files to tracking
   */
  const addGeneratedFiles = useCallback(
    (files: string[]) => {
      if (!mountedRef.current || !plan || !manager) return;

      manager.addFiles(files);
      setPlan({ ...manager.getPlan() });
    },
    [plan, manager, mountedRef, setPlan]
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
    [plan, manager, mountedRef, setPlan]
  );

  return {
    setAccumulatedCode,
    addGeneratedFiles,
    addImplementedFeatures,
  };
}
