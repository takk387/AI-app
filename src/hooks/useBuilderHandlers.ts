/**
 * useBuilderHandlers - UI event handlers for the builder
 *
 * Extracted from MainBuilderView.tsx for modular architecture.
 * Contains handlePlanAction, image upload/remove, export, download,
 * build phase, deploy, and filtered components.
 */

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedComponent, ChatMessage, Phase, BuilderMode } from '../types/aiBuilderTypes';

// Helper function (same as in MainBuilderView)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export interface UseBuilderHandlersOptions {
  setChatMessages: (fn: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setCurrentMode: (mode: BuilderMode) => void;
  setShowLibrary: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  clearSuggestedActions: () => void;
  setUploadedImage: (image: string | null) => void;
  setExportModalComponent: (comp: GeneratedComponent | null) => void;
  setShowExportModal: (show: boolean) => void;
  currentComponent: GeneratedComponent | null;
  setUserInput: (value: string) => void;
  setNewAppStagePlan: (fn: (prev: any) => any) => void;
  currentAppId: string | null;
  setPendingDeployAfterSave: (pending: boolean) => void;
  setShowNameAppModal: (show: boolean) => void;
  components: GeneratedComponent[];
  searchQuery: string;
}

export interface UseBuilderHandlersReturn {
  handlePlanAction: (action: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
  handleExportApp: (comp: GeneratedComponent) => void;
  downloadCode: () => void;
  handleBuildPhase: (phase: Phase) => void;
  handleDeploy: () => void;
  filteredComponents: GeneratedComponent[];
}

export function useBuilderHandlers(options: UseBuilderHandlersOptions): UseBuilderHandlersReturn {
  const {
    setChatMessages,
    setCurrentMode,
    setShowLibrary,
    fileInputRef,
    clearSuggestedActions,
    setUploadedImage,
    setExportModalComponent,
    setShowExportModal,
    currentComponent,
    setUserInput,
    setNewAppStagePlan,
    currentAppId,
    setPendingDeployAfterSave,
    setShowNameAppModal,
    components,
    searchQuery,
  } = options;

  const router = useRouter();

  // Handle PLAN mode suggested actions
  const handlePlanAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'generate_architecture':
          // For architecture generation, guide user to use the full wizard flow
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant' as const,
              content:
                '🏗️ **Architecture Analysis**\n\nTo generate a full backend architecture analysis, please use the **Wizard** (Step 1) to complete your app planning. The architecture analyzer works best with a fully defined app concept.\n\nOnce you have your concept ready, you can proceed to design and build phases.',
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'generate_phases':
          // For phase generation, guide user to use the full wizard flow
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant' as const,
              content:
                '📋 **Implementation Plan**\n\nTo generate a detailed implementation plan with phases, please complete the planning process in the **Wizard** (Step 1). The phase generator creates optimized build phases based on your complete app concept.\n\nOnce your concept is finalized, you can move through Design and Build steps.',
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'start_building':
          // Switch to ACT mode to start building
          setCurrentMode('ACT');
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'system' as const,
              content:
                '🚀 **Switched to ACT mode!**\n\nYou can now build and modify your application. Describe what you want to create or change.',
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'adjust_plan':
          // Clear actions and let user continue chatting
          setChatMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant' as const,
              content: "Sure, let's refine the plan. What would you like to adjust or add?",
              timestamp: new Date().toISOString(),
            },
          ]);
          break;
        case 'browse_templates':
          // Open library modal to browse templates
          setShowLibrary(true);
          break;
        case 'upload_reference':
          // Trigger file input for image upload
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
          break;
        default:
          // Handle unknown actions
          console.log('[MainBuilderView] Unknown plan action:', action);
      }
      clearSuggestedActions();
    },
    [setChatMessages, setCurrentMode, setShowLibrary, fileInputRef, clearSuggestedActions]
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [setUploadedImage]
  );

  const removeImage = useCallback(() => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setUploadedImage]);

  const handleExportApp = useCallback(
    (comp: GeneratedComponent) => {
      setExportModalComponent(comp);
      setShowExportModal(true);
    },
    [setExportModalComponent, setShowExportModal]
  );

  const downloadCode = useCallback(() => {
    if (!currentComponent) return;
    const blob = new Blob([currentComponent.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentComponent.name.replace(/\s+/g, '-')}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentComponent]);

  const handleBuildPhase = useCallback(
    (phase: Phase) => {
      const buildPrompt = `Build ${phase.name}: ${phase.description}. Features to implement: ${phase.features.join(', ')}`;
      setUserInput(buildPrompt);
      setNewAppStagePlan((prev: any) =>
        prev
          ? {
              ...prev,
              currentPhase: phase.number,
              phases: prev.phases.map((p: any) =>
                p.number === phase.number ? { ...p, status: 'building' as const } : p
              ),
            }
          : null
      );
    },
    [setUserInput, setNewAppStagePlan]
  );

  // Deploy handler - redirects to dashboard for deployment
  const handleDeploy = useCallback(() => {
    if (!currentAppId) {
      // App not saved yet - prompt to save first, then deploy
      setPendingDeployAfterSave(true);
      setShowNameAppModal(true);
      return;
    }
    // Redirect to dashboard with deploy query param
    router.push(`/app/dashboard?deploy=${currentAppId}`);
  }, [currentAppId, setShowNameAppModal, router]);

  // Filtered components
  const filteredComponents = useMemo(
    () =>
      components.filter(
        (comp) =>
          searchQuery === '' ||
          comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [components, searchQuery]
  );

  return {
    handlePlanAction,
    handleImageUpload,
    removeImage,
    handleExportApp,
    downloadCode,
    handleBuildPhase,
    handleDeploy,
    filteredComponents,
  };
}
