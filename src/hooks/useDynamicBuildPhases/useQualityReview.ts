'use client';

import { useState, useCallback } from 'react';
import type { QualityReport, QualityPipelineState, ReviewStrictness } from '@/types/codeReview';
import type { PhaseExecutionManager } from '@/services/PhaseExecutionManager';

export interface UseQualityReviewDeps {
  mountedRef: React.RefObject<boolean>;
  manager: PhaseExecutionManager | null;
  onError?: (error: Error) => void;
}

export function useQualityReview(deps: UseQualityReviewDeps) {
  const { mountedRef, manager, onError } = deps;

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
    [manager, mountedRef, onError]
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
  }, [manager, mountedRef, onError]);

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
    [manager, mountedRef]
  );

  return {
    qualityReport,
    pipelineState,
    isReviewing,
    reviewStrictness,
    runPhaseQualityCheck,
    runFinalQualityCheck,
    setReviewStrictness,
  };
}
