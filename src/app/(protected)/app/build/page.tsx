'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { useDynamicBuildPhases } from '@/hooks/useDynamicBuildPhases';
import { PhasedBuildPanel } from '@/components/modals';
import { AppConceptPanel } from '@/components/concept-panel';
import { RocketIcon, WandIcon } from '@/components/ui/Icons';

export default function BuildPage() {
  const router = useRouter();

  // Get state from store
  const dynamicPhasePlan = useAppStore((state) => state.dynamicPhasePlan);
  const appConcept = useAppStore((state) => state.appConcept);
  const updateAppConceptField = useAppStore((state) => state.updateAppConceptField);

  // Collapsible concept panel state
  const [isConceptPanelCollapsed, setConceptPanelCollapsed] = useState(false);

  // Dynamic build phases hook
  const dynamicBuildPhases = useDynamicBuildPhases({
    onPhaseComplete: (phase, result) => {
      console.log('Phase completed:', phase.name, result);
    },
    onBuildComplete: () => {
      console.log('All phases complete!');
    },
  });

  const handleClose = useCallback(() => {
    router.push('/app');
  }, [router]);

  const handleStartWizard = useCallback(() => {
    router.push('/app/wizard');
  }, [router]);

  // If no plan exists, show empty state
  if (!dynamicPhasePlan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-[calc(100vh-56px)] flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-center max-w-md px-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto"
            style={{
              background: 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)',
              border: '1px solid var(--border-color)',
            }}
          >
            <RocketIcon size={40} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            No Build Plan Yet
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Start with the Wizard to create your app concept and generate a build plan, or skip
            directly to the Builder.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleStartWizard}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-garden-600 to-garden-500 hover:from-garden-500 hover:to-garden-400 rounded-xl shadow-lg shadow-garden-500/25 hover:shadow-garden-500/40 transition-all"
            >
              <WandIcon size={18} />
              Start with Wizard
            </button>
            <button
              onClick={() => router.push('/app')}
              className="px-6 py-3 text-sm font-medium rounded-xl transition-colors"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Skip to Builder
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-56px)] md:h-[calc(100vh-56px)] flex"
    >
      {/* Concept Panel - collapsible sidebar */}
      <div
        className={`h-full transition-all duration-300 flex-shrink-0 ${
          isConceptPanelCollapsed ? 'w-12' : 'w-80'
        }`}
        style={{
          borderRight: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <AppConceptPanel
          appConcept={appConcept}
          phasePlan={dynamicPhasePlan}
          mode="act"
          isCollapsed={isConceptPanelCollapsed}
          onToggleCollapse={() => setConceptPanelCollapsed(!isConceptPanelCollapsed)}
          onConceptUpdate={updateAppConceptField}
          buildState={{
            uiPhases: dynamicBuildPhases.uiPhases,
            dynamicPhases: dynamicBuildPhases.phases,
            progress: dynamicBuildPhases.progress,
            isBuilding: dynamicBuildPhases.isBuilding,
            isPaused: dynamicBuildPhases.isPaused,
            currentPhase: dynamicBuildPhases.currentPhase,
          }}
          onPauseBuild={dynamicBuildPhases.pauseBuild}
          onResumeBuild={dynamicBuildPhases.resumeBuild}
          onSkipPhase={(phaseNumber) => dynamicBuildPhases.skipPhase(phaseNumber)}
          onRetryPhase={(phaseNumber) => dynamicBuildPhases.retryPhase(phaseNumber)}
        />
      </div>

      {/* Build Panel - takes remaining space */}
      <div className="flex-1 h-full overflow-hidden">
        <PhasedBuildPanel
          isOpen={true}
          onClose={handleClose}
          phases={dynamicBuildPhases.uiPhases}
          progress={dynamicBuildPhases.progress}
          currentPhase={
            dynamicBuildPhases.currentPhase
              ? dynamicBuildPhases.uiPhases.find(
                  (p) => p.order === dynamicBuildPhases.currentPhase?.number
                ) || null
              : null
          }
          isBuilding={dynamicBuildPhases.isBuilding}
          isPaused={dynamicBuildPhases.isPaused}
          isValidating={false}
          onStartBuild={() => {
            const nextPhase = dynamicBuildPhases.getNextPhase();
            if (nextPhase) {
              dynamicBuildPhases.startPhase(nextPhase.number);
            }
          }}
          onPauseBuild={dynamicBuildPhases.pauseBuild}
          onResumeBuild={dynamicBuildPhases.resumeBuild}
          onSkipPhase={(phaseId) => {
            const phase = dynamicBuildPhases.uiPhases.find((p) => p.id === phaseId);
            if (phase) {
              dynamicBuildPhases.skipPhase(phase.order);
            }
          }}
          onRetryPhase={(phaseId) => {
            const phase = dynamicBuildPhases.uiPhases.find((p) => p.id === phaseId);
            if (phase) {
              dynamicBuildPhases.retryPhase(phase.order);
            }
          }}
          onViewPhaseDetails={() => {}}
          onRunValidation={() => {}}
          onResetBuild={dynamicBuildPhases.resetBuild}
          onExecuteCurrentPhase={async () => {
            const nextPhase = dynamicBuildPhases.getNextPhase();
            if (nextPhase) {
              dynamicBuildPhases.startPhase(nextPhase.number);
            }
          }}
          onProceedToNextPhase={() => {
            const nextPhase = dynamicBuildPhases.getNextPhase();
            if (nextPhase) {
              dynamicBuildPhases.startPhase(nextPhase.number);
            }
          }}
          dynamicPlan={dynamicPhasePlan}
          isFullPage
          qualityReport={dynamicBuildPhases.qualityReport}
          pipelineState={dynamicBuildPhases.pipelineState}
          isReviewing={dynamicBuildPhases.isReviewing}
          strictness={dynamicBuildPhases.reviewStrictness}
          onRunReview={dynamicBuildPhases.runFinalQualityCheck}
          onStrictnessChange={dynamicBuildPhases.setReviewStrictness}
        />
      </div>
    </motion.div>
  );
}
