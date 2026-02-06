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
          <p className="text-zinc-400">No app concept found.</p>
          <button
            onClick={() => router.push('/app/wizard')}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
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
          <p className="text-zinc-400">No layout design found.</p>
          <button
            onClick={() => router.push('/app/design')}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
          >
            Design Layout First
          </button>
        </div>
      </div>
    );
  }

  const canContinue = isComplete && (userAISelection !== null || result !== null);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">{appConcept.name}</h1>
              <p className="text-xs text-zinc-500">
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}

            <button
              onClick={handleContinueToReview}
              disabled={!canContinue}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                canContinue
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
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
            <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
              <h3 className="text-sm font-medium text-red-400 mb-2">Planning Error</h3>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          )}

          {/* Completion: Architecture Result + AI Selection */}
          {isComplete && result && (
            <>
              <ConsensusResultView architecture={result} />

              <div className="border-t border-zinc-800 pt-8">
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
