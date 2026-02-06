/**
 * AI Plan Page - Step 3 in the 5-step navigation
 *
 * Dual AI Architecture Planning page:
 * - Pipeline starts automatically on mount
 * - Shows PipelineStagesView during execution
 * - Shows ConsensusResultView + AISelectionPanel on completion
 * - Shows ConsensusEscalationDialog on escalation
 * - "Continue to Review" navigates to /app/review
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDualAIPlan } from '@/hooks/useDualAIPlan';
import { PipelineStagesView, ConsensusResultView, AISelectionPanel } from '@/components/ai-plan';
import { ConsensusEscalationDialog } from '@/components/ConsensusEscalationDialog';

export default function AIPlanPage() {
  const router = useRouter();
  const hasStartedRef = useRef(false);

  // Store state
  const appConcept = useAppStore((s) => s.appConcept);
  const currentLayoutManifest = useAppStore((s) => s.currentLayoutManifest);
  const userAISelection = useAppStore((s) => s.userAISelection);

  // Hook
  const {
    isPlanning,
    progress,
    result,
    error,
    isEscalated,
    escalation,
    stageLabel,
    isComplete,
    startPlanning,
    cancelPlanning: _cancelPlanning,
    retryPlanning,
    resolveEscalation,
    setUserAISelection,
  } = useDualAIPlan();

  // Auto-start pipeline on mount (once)
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (!appConcept || !currentLayoutManifest) return;
    // Don't restart if we already have a result
    if (result) return;

    hasStartedRef.current = true;
    startPlanning(appConcept, currentLayoutManifest);
  }, [appConcept, currentLayoutManifest, result, startPlanning]);

  const handleContinueToReview = useCallback(() => {
    router.push('/app/review');
  }, [router]);

  // Guard: redirect if no concept
  if (!appConcept) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>No app concept found.</p>
          <button
            onClick={() => router.push('/app/wizard')}
            className="px-4 py-2 rounded-lg transition-colors text-sm"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            Start with Wizard
          </button>
        </div>
      </div>
    );
  }

  // Guard: redirect if no layout
  if (!currentLayoutManifest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>No layout design found.</p>
          <button
            onClick={() => router.push('/app/design')}
            className="px-4 py-2 rounded-lg transition-colors text-sm"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            Design Layout First
          </button>
        </div>
      </div>
    );
  }

  const canContinue = isComplete && (userAISelection !== null || result !== null);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 backdrop-blur-md border-b"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-muted)' }}
            >
              <Brain className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {appConcept.name}
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isPlanning
                  ? stageLabel
                  : isComplete
                    ? 'Architecture ready'
                    : 'AI Architecture Planning'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {error && !isPlanning && (
              <button
                onClick={retryPlanning}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}

            <button
              onClick={handleContinueToReview}
              disabled={!canContinue}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                canContinue
                  ? { background: 'var(--accent-primary)', color: 'white' }
                  : {
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed',
                    }
              }
            >
              Continue to Review
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Pipeline Progress (shown during planning or if not complete) */}
          {(isPlanning || (!isComplete && !isEscalated)) && (
            <PipelineStagesView progress={progress} />
          )}

          {/* Error State */}
          {error && !isPlanning && (
            <div
              className="p-6 rounded-xl"
              style={{
                background: 'var(--error-muted, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--error-muted, rgba(239, 68, 68, 0.2))',
              }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--error-primary, #ef4444)' }}
              >
                Planning Error
              </h3>
              <p className="text-sm" style={{ color: 'var(--error-primary, #ef4444)' }}>
                {error}
              </p>
            </div>
          )}

          {/* Completion: Architecture Result + AI Selection */}
          {isComplete && result && (
            <>
              <ConsensusResultView architecture={result} />

              <div className="border-t pt-8" style={{ borderColor: 'var(--border-color)' }}>
                <AISelectionPanel
                  concept={appConcept}
                  architecture={result}
                  initialSelection={userAISelection}
                  onSelectionChange={setUserAISelection}
                />
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Escalation Dialog (modal overlay) */}
      {isEscalated && escalation && (
        <ConsensusEscalationDialog escalation={escalation} onResolve={resolveEscalation} />
      )}
    </div>
  );
}
