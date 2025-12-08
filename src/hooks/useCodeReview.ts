'use client';

/**
 * useCodeReview Hook
 *
 * React hook for managing code review state and triggering reviews.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ReviewFile,
  ReviewIssue,
  AppliedFix,
  QualityReport,
  QualityPipelineState,
  PhaseReviewContext,
  ComprehensiveReviewContext,
  ReviewStrictness,
  ReviewResponse,
} from '@/types/codeReview';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCodeReviewOptions {
  strictness?: ReviewStrictness;
  enableAutoFix?: boolean;
  onReviewStart?: () => void;
  onReviewComplete?: (report: QualityReport) => void;
  onError?: (error: Error) => void;
}

export interface UseCodeReviewReturn {
  // State
  isReviewing: boolean;
  pipelineState: QualityPipelineState;
  currentReport: QualityReport | null;
  issues: ReviewIssue[];
  fixes: AppliedFix[];
  modifiedFiles: ReviewFile[];

  // Actions
  performLightReview: (
    files: ReviewFile[],
    phaseContext?: PhaseReviewContext
  ) => Promise<ReviewResponse | null>;
  performComprehensiveReview: (
    files: ReviewFile[],
    requirements: ComprehensiveReviewContext
  ) => Promise<ReviewResponse | null>;
  resetReview: () => void;
  setStrictness: (strictness: ReviewStrictness) => void;

  // Computed
  overallScore: number;
  passed: boolean;
  hasIssues: boolean;
  hasFixes: boolean;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const DEFAULT_PIPELINE_STATE: QualityPipelineState = {
  currentStep: 'idle',
  validationStatus: 'pending',
  reviewStatus: 'pending',
  fixStatus: 'pending',
  progress: 0,
};

const _DEFAULT_REPORT: QualityReport = {
  timestamp: '',
  reviewType: 'light',
  totalIssues: 0,
  fixedIssues: 0,
  remainingIssues: 0,
  issuesByCategory: {},
  issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
  scores: {
    syntax: 100,
    security: 100,
    bestPractices: 100,
    performance: 100,
    accessibility: 100,
  },
  overallScore: 100,
  passed: true,
  issues: [],
  fixes: [],
  validationComplete: false,
  reviewComplete: false,
  durationMs: 0,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCodeReview(options: UseCodeReviewOptions = {}): UseCodeReviewReturn {
  const {
    strictness: initialStrictness = 'standard',
    enableAutoFix: _enableAutoFix = true,
    onReviewStart,
    onReviewComplete,
    onError,
  } = options;

  // State
  const [isReviewing, setIsReviewing] = useState(false);
  const [pipelineState, setPipelineState] = useState<QualityPipelineState>(DEFAULT_PIPELINE_STATE);
  const [currentReport, setCurrentReport] = useState<QualityReport | null>(null);
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [fixes, setFixes] = useState<AppliedFix[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<ReviewFile[]>([]);
  const [strictness, setStrictness] = useState<ReviewStrictness>(initialStrictness);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform light review
   */
  const performLightReview = useCallback(
    async (
      files: ReviewFile[],
      phaseContext?: PhaseReviewContext
    ): Promise<ReviewResponse | null> => {
      if (isReviewing) return null;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsReviewing(true);
      setPipelineState({
        ...DEFAULT_PIPELINE_STATE,
        currentStep: 'validating',
        validationStatus: 'running',
      });
      onReviewStart?.();

      try {
        const response = await fetch('/api/ai-builder/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewType: 'light',
            files,
            phaseContext,
            strictness,
          }),
          signal: abortControllerRef.current.signal,
        });

        const data: ReviewResponse = await response.json();

        if (data.success) {
          setCurrentReport(data.report);
          setIssues(data.issues);
          setFixes(data.fixes);
          setModifiedFiles(data.modifiedFiles || files);
          setPipelineState({
            currentStep: 'complete',
            validationStatus: 'passed',
            reviewStatus: data.report.passed ? 'passed' : 'warning',
            fixStatus: data.fixes.length > 0 ? 'complete' : 'skipped',
            progress: 100,
          });
          onReviewComplete?.(data.report);
        } else {
          setPipelineState({
            ...DEFAULT_PIPELINE_STATE,
            currentStep: 'error',
            error: data.error,
          });
          onError?.(new Error(data.error || 'Review failed'));
        }

        return data;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return null;
        }

        const err = error instanceof Error ? error : new Error('Unknown error');
        setPipelineState({
          ...DEFAULT_PIPELINE_STATE,
          currentStep: 'error',
          error: err.message,
        });
        onError?.(err);
        return null;
      } finally {
        setIsReviewing(false);
      }
    },
    [isReviewing, strictness, onReviewStart, onReviewComplete, onError]
  );

  /**
   * Perform comprehensive review
   */
  const performComprehensiveReview = useCallback(
    async (
      files: ReviewFile[],
      requirements: ComprehensiveReviewContext
    ): Promise<ReviewResponse | null> => {
      if (isReviewing) return null;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsReviewing(true);
      setPipelineState({
        ...DEFAULT_PIPELINE_STATE,
        currentStep: 'validating',
        validationStatus: 'running',
      });
      onReviewStart?.();

      try {
        const response = await fetch('/api/ai-builder/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewType: 'comprehensive',
            files,
            requirements,
            strictness,
          }),
          signal: abortControllerRef.current.signal,
        });

        const data: ReviewResponse = await response.json();

        if (data.success) {
          setCurrentReport(data.report);
          setIssues(data.issues);
          setFixes(data.fixes);
          setModifiedFiles(data.modifiedFiles || files);
          setPipelineState({
            currentStep: 'complete',
            validationStatus: 'passed',
            reviewStatus: data.report.passed ? 'passed' : 'warning',
            fixStatus: data.fixes.length > 0 ? 'complete' : 'skipped',
            progress: 100,
          });
          onReviewComplete?.(data.report);
        } else {
          setPipelineState({
            ...DEFAULT_PIPELINE_STATE,
            currentStep: 'error',
            error: data.error,
          });
          onError?.(new Error(data.error || 'Review failed'));
        }

        return data;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return null;
        }

        const err = error instanceof Error ? error : new Error('Unknown error');
        setPipelineState({
          ...DEFAULT_PIPELINE_STATE,
          currentStep: 'error',
          error: err.message,
        });
        onError?.(err);
        return null;
      } finally {
        setIsReviewing(false);
      }
    },
    [isReviewing, strictness, onReviewStart, onReviewComplete, onError]
  );

  /**
   * Reset review state
   */
  const resetReview = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsReviewing(false);
    setPipelineState(DEFAULT_PIPELINE_STATE);
    setCurrentReport(null);
    setIssues([]);
    setFixes([]);
    setModifiedFiles([]);
  }, []);

  // Computed values
  const overallScore = currentReport?.overallScore ?? 100;
  const passed = currentReport?.passed ?? true;
  const hasIssues = issues.length > 0;
  const hasFixes = fixes.length > 0;

  return {
    // State
    isReviewing,
    pipelineState,
    currentReport,
    issues,
    fixes,
    modifiedFiles,

    // Actions
    performLightReview,
    performComprehensiveReview,
    resetReview,
    setStrictness,

    // Computed
    overallScore,
    passed,
    hasIssues,
    hasFixes,
  };
}

export default useCodeReview;
