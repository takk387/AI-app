'use client';

/**
 * Temporary test page for BuilderProvider / useBuilder().
 * Renders inside <BuilderProvider> and logs the context value.
 * DELETE after verifying Session 1.
 */

import { BuilderProvider, useBuilder } from '@/contexts/BuilderContext';

function BuilderTestInner() {
  const builder = useBuilder();

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13 }}>
      <h1>BuilderProvider Test</h1>
      <pre>
        {JSON.stringify(
          {
            messagesCount: builder.messages.length,
            isGenerating: builder.isGenerating,
            generationProgress: builder.generationProgress,
            lastIntent: builder.lastIntent,
            phasesCount: builder.phases.length,
            currentPhase: builder.currentPhase?.name ?? null,
            isBuilding: builder.isBuilding,
            isPaused: builder.isPaused,
            currentComponent: builder.currentComponent?.name ?? null,
            activeTab: builder.activeTab,
            consoleErrorsCount: builder.consoleErrors.length,
            canUndo: builder.canUndo,
            canRedo: builder.canRedo,
            appConcept: builder.appConcept?.name ?? null,
            activeModal: builder.activeModal,
            isConceptDrawerOpen: builder.isConceptDrawerOpen,
            debugLogCount: builder.debugLog.length,
            hasSendMessage: typeof builder.sendMessage === 'function',
            hasStartBuilding: typeof builder.startBuilding === 'function',
            hasPauseBuild: typeof builder.pauseBuild === 'function',
            hasResumeBuild: typeof builder.resumeBuild === 'function',
            hasSkipPhase: typeof builder.skipPhase === 'function',
            hasRetryPhase: typeof builder.retryPhase === 'function',
            hasUndo: typeof builder.undo === 'function',
            hasRedo: typeof builder.redo === 'function',
            hasExportApp: typeof builder.exportApp === 'function',
            hasDownloadCode: typeof builder.downloadCode === 'function',
            hasDeployApp: typeof builder.deployApp === 'function',
            hasUploadImage: typeof builder.uploadImage === 'function',
            hasCapturePreview: typeof builder.capturePreview === 'function',
            hasOpenModal: typeof builder.openModal === 'function',
            hasCloseModal: typeof builder.closeModal === 'function',
            hasUpdateConcept: typeof builder.updateConcept === 'function',
            hasToggleConceptDrawer: typeof builder.toggleConceptDrawer === 'function',
            hasSetActiveTab: typeof builder.setActiveTab === 'function',
          },
          null,
          2
        )}
      </pre>
      <p>All fields resolved without errors.</p>
    </div>
  );
}

export default function BuilderTestPage() {
  return (
    <BuilderProvider>
      <BuilderTestInner />
    </BuilderProvider>
  );
}
