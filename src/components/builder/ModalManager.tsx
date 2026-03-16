'use client';

import { useBuilder } from '@/contexts/BuilderContext';
import { useAppStore } from '@/store/useAppStore';
import { ExportModal } from '@/components/modals/ExportModal';
import { VersionHistoryModal } from '@/components/modals/VersionHistoryModal';
import { DiffPreviewModal } from '@/components/modals/DiffPreviewModal';
import { NameAppModal } from '@/components/modals/NameAppModal';
import ShareModal from '@/components/modals/ShareModal';
import { CreateBranchModal } from '@/components/modals/CreateBranchModal';
import type { AppFile } from '@/types/railway';
import type { AppVersion } from '@/types/aiBuilderTypes';

function parseFilesFromComponent(code: string | undefined): AppFile[] {
  if (!code) return [];
  try {
    const parsed = JSON.parse(code);
    return (parsed?.files as AppFile[]) ?? [];
  } catch {
    return [];
  }
}

export function ModalManager() {
  const { activeModal, closeModal, currentComponent, appConcept, undo } = useBuilder();

  // Store values needed by legacy modals but not exposed via useBuilder()
  const currentAppId = useAppStore((s) => s.currentAppId);
  const pendingDiff = useAppStore((s) => s.pendingDiff);
  const setPendingDiff = useAppStore((s) => s.setPendingDiff);
  const setCurrentComponent = useAppStore((s) => s.setCurrentComponent);

  if (!activeModal) return null;

  const appName = appConcept?.name ?? currentComponent?.name ?? 'My App';
  const files = parseFilesFromComponent(currentComponent?.code);

  return (
    <div
      onClick={closeModal}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {activeModal === 'export' && (
          <ExportModal isOpen onClose={closeModal} appName={appName} files={files} />
        )}

        {activeModal === 'versionHistory' && (
          <VersionHistoryModal
            isOpen
            onClose={closeModal}
            currentComponent={currentComponent}
            onRevertToVersion={(version: AppVersion) => {
              if (currentComponent) {
                setCurrentComponent({
                  ...currentComponent,
                  code: version.code,
                  description: version.description,
                  timestamp: new Date().toISOString(),
                });
              }
              closeModal();
            }}
            onForkVersion={() => {
              // Fork wiring deferred to branch management session
              closeModal();
            }}
            onCompareVersions={() => {
              // Compare wiring deferred to later session
              closeModal();
            }}
          />
        )}

        {activeModal === 'diff' && (
          <DiffPreviewModal
            isOpen
            onClose={closeModal}
            pendingDiff={pendingDiff}
            onApprove={() => {
              // Apply diff — wiring deferred
              setPendingDiff(null);
              closeModal();
            }}
            onReject={() => {
              setPendingDiff(null);
              undo();
              closeModal();
            }}
          />
        )}

        {activeModal === 'nameApp' && (
          <NameAppModal
            isOpen
            onClose={closeModal}
            onSubmit={(name: string) => {
              if (currentComponent) {
                setCurrentComponent({ ...currentComponent, name });
              }
              closeModal();
            }}
            defaultName={appName}
          />
        )}

        {activeModal === 'share' && currentAppId && (
          <ShareModal isOpen onClose={closeModal} appId={currentAppId} appTitle={appName} />
        )}

        {activeModal === 'createBranch' && (
          <CreateBranchModal
            isOpen
            onClose={closeModal}
            onCreateBranch={() => {
              // Branch creation wiring deferred
              closeModal();
            }}
            existingBranches={[]}
          />
        )}
      </div>
    </div>
  );
}
