/**
 * useVersionHandlers Hook
 *
 * Extracted from MainBuilderView.tsx to reduce component size.
 * Handles all version-related operations:
 * - Approve/reject changes
 * - Approve/reject diffs
 * - Revert to version
 * - Compare versions
 * - Fork app
 */

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { GeneratedComponent, ChatMessage, AppVersion } from '@/types/aiBuilderTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Return type from useVersionControl hook
 */
interface VersionControlReturn {
  pushToUndoStack: (version: AppVersion) => void;
  clearRedoStack: () => void;
  revertToVersion: (version: AppVersion) => void;
  forkFromVersion: (sourceApp: GeneratedComponent, version?: AppVersion) => GeneratedComponent;
}

/**
 * Options for useVersionHandlers hook
 */
export interface UseVersionHandlersOptions {
  versionControl: VersionControlReturn;
  saveVersion: (
    component: GeneratedComponent,
    changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE',
    description: string
  ) => GeneratedComponent;
  onSaveComponent: (
    component: GeneratedComponent
  ) => Promise<{ success: boolean; error?: unknown }>;
}

/**
 * Return type for useVersionHandlers hook
 */
export interface UseVersionHandlersReturn {
  approveChange: () => void;
  rejectChange: () => void;
  approveDiff: () => Promise<void>;
  rejectDiff: () => void;
  revertToVersion: (version: AppVersion) => void;
  handleCompareVersions: (v1: AppVersion, v2: AppVersion) => void;
  handleForkApp: (sourceApp: GeneratedComponent, versionToFork?: AppVersion) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling version-related operations in MainBuilderView
 */
export function useVersionHandlers(options: UseVersionHandlersOptions): UseVersionHandlersReturn {
  const { versionControl, saveVersion, onSaveComponent } = options;

  // Get state and setters from Zustand store
  const {
    currentComponent,
    setCurrentComponent,
    setComponents,
    pendingChange,
    setPendingChange,
    pendingDiff,
    setPendingDiff,
    setChatMessages,
    setActiveTab,
    setShowApprovalModal,
    setShowDiffPreview,
    setShowVersionHistory,
    setCompareVersions,
    setShowCompareModal,
  } = useAppStore();

  /**
   * Approve pending change
   */
  const approveChange = useCallback(() => {
    if (!pendingChange || !currentComponent) return;

    try {
      versionControl.pushToUndoStack({
        id: generateId(),
        versionNumber: (currentComponent.versions?.length || 0) + 1,
        code: currentComponent.code,
        description: currentComponent.description,
        timestamp: currentComponent.timestamp,
        changeType: 'MINOR_CHANGE',
      });
      versionControl.clearRedoStack();

      let updatedComponent: GeneratedComponent = {
        ...currentComponent,
        code: pendingChange.newCode,
        description: pendingChange.changeDescription,
        timestamp: new Date().toISOString(),
      };

      updatedComponent = saveVersion(
        updatedComponent,
        'MAJOR_CHANGE',
        pendingChange.changeDescription
      );

      setCurrentComponent(updatedComponent);
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent.id ? updatedComponent : comp))
      );

      onSaveComponent(updatedComponent);

      const approvalMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `✅ Changes approved and applied! (Version ${updatedComponent.versions?.length || 1} saved)`,
        timestamp: new Date().toISOString(),
        componentCode: pendingChange.newCode,
        componentPreview: true,
      };

      setChatMessages((prev) => [...prev, approvalMessage]);
      setActiveTab('preview');
    } catch (error) {
      console.error('Error applying changes:', error);
    } finally {
      setPendingChange(null);
      setShowApprovalModal(false);
    }
  }, [
    pendingChange,
    currentComponent,
    versionControl,
    saveVersion,
    setCurrentComponent,
    setComponents,
    onSaveComponent,
    setChatMessages,
    setActiveTab,
    setPendingChange,
    setShowApprovalModal,
  ]);

  /**
   * Reject pending change
   */
  const rejectChange = useCallback(() => {
    const rejectionMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `❌ Changes rejected. Your app remains unchanged.`,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, rejectionMessage]);
    setPendingChange(null);
    setShowApprovalModal(false);
    setActiveTab('chat');
  }, [setChatMessages, setPendingChange, setShowApprovalModal, setActiveTab]);

  /**
   * Approve diff
   */
  const approveDiff = useCallback(async () => {
    if (!pendingDiff || !currentComponent) return;

    try {
      const currentAppData = JSON.parse(currentComponent.code);
      const currentFiles = currentAppData.files.map((f: { path: string; content: string }) => ({
        path: f.path,
        content: f.content,
      }));

      const response = await fetch('/api/ai-builder/apply-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFiles,
          diffs: pendingDiff.files,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to apply diff');
      }

      const updatedAppData = {
        ...currentAppData,
        files: result.modifiedFiles.map((f: { path: string; content: string }) => ({
          path: f.path,
          content: f.content,
        })),
      };

      versionControl.pushToUndoStack({
        id: generateId(),
        versionNumber: (currentComponent.versions?.length || 0) + 1,
        code: currentComponent.code,
        description: currentComponent.description,
        timestamp: currentComponent.timestamp,
        changeType: 'MINOR_CHANGE',
      });
      versionControl.clearRedoStack();

      let updatedComponent: GeneratedComponent = {
        ...currentComponent,
        code: JSON.stringify(updatedAppData, null, 2),
        description: pendingDiff.summary,
        timestamp: new Date().toISOString(),
      };

      updatedComponent = saveVersion(updatedComponent, 'MINOR_CHANGE', pendingDiff.summary);

      setCurrentComponent(updatedComponent);
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent.id ? updatedComponent : comp))
      );

      onSaveComponent(updatedComponent);

      const successMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `✅ Changes applied successfully!\n\n${pendingDiff.summary}`,
        timestamp: new Date().toISOString(),
        componentCode: JSON.stringify(updatedAppData, null, 2),
        componentPreview: true,
      };

      setChatMessages((prev) => [...prev, successMessage]);
      setActiveTab('preview');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `❌ **Error Applying Changes**\n\n${errorMsg}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingDiff(null);
      setShowDiffPreview(false);
    }
  }, [
    pendingDiff,
    currentComponent,
    versionControl,
    saveVersion,
    setCurrentComponent,
    setComponents,
    onSaveComponent,
    setChatMessages,
    setActiveTab,
    setPendingDiff,
    setShowDiffPreview,
  ]);

  /**
   * Reject diff
   */
  const rejectDiff = useCallback(() => {
    const rejectionMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `❌ Changes rejected. Your app remains unchanged.`,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, rejectionMessage]);
    setPendingDiff(null);
    setShowDiffPreview(false);
    setActiveTab('chat');
  }, [setChatMessages, setPendingDiff, setShowDiffPreview, setActiveTab]);

  /**
   * Revert to a specific version
   */
  const revertToVersion = useCallback(
    (version: AppVersion) => {
      if (!currentComponent) return;

      versionControl.revertToVersion(version);

      const revertMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `🔄 Successfully reverted to Version ${version.versionNumber}\n\n**Reverted to:** ${version.description}`,
        timestamp: new Date().toISOString(),
        componentCode: version.code,
        componentPreview: true,
      };

      setChatMessages((prev) => [...prev, revertMessage]);
      setShowVersionHistory(false);
      setActiveTab('preview');
    },
    [currentComponent, versionControl, setChatMessages, setShowVersionHistory, setActiveTab]
  );

  /**
   * Open compare versions modal
   */
  const handleCompareVersions = useCallback(
    (v1: AppVersion, v2: AppVersion) => {
      setCompareVersions({ v1, v2 });
      setShowCompareModal(true);
    },
    [setCompareVersions, setShowCompareModal]
  );

  /**
   * Fork an app from a specific version
   */
  const handleForkApp = useCallback(
    (sourceApp: GeneratedComponent, versionToFork?: AppVersion) => {
      const forkedApp = versionControl.forkFromVersion(sourceApp, versionToFork);

      setComponents((prev) => [forkedApp, ...prev]);
      setCurrentComponent(forkedApp);
      setChatMessages([
        {
          id: generateId(),
          role: 'assistant',
          content: `🍴 Successfully forked "${sourceApp.name}"!\n\nYou can now make changes to this forked version without affecting the original.`,
          timestamp: new Date().toISOString(),
          componentCode: forkedApp.code,
          componentPreview: true,
        },
      ]);
      setShowVersionHistory(false);
      setActiveTab('preview');
    },
    [
      versionControl,
      setComponents,
      setCurrentComponent,
      setChatMessages,
      setShowVersionHistory,
      setActiveTab,
    ]
  );

  return {
    approveChange,
    rejectChange,
    approveDiff,
    rejectDiff,
    revertToVersion,
    handleCompareVersions,
    handleForkApp,
  };
}

export default useVersionHandlers;
