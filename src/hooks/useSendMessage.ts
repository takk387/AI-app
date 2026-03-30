/**
 * useSendMessage Hook
 *
 * Extracted from MainBuilderView.tsx to reduce component size.
 * Handles all message sending logic including:
 * - PLAN mode wizard chat
 * - ACT mode builder chat
 * - Build/modify/design triggers (delegated to handlers)
 * - Phase completion tracking
 * - Error handling
 */

import { useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage } from '@/types/aiBuilderTypes';

// Re-export types for API compatibility
export type {
  WizardState,
  UseSendMessageOptions,
  UseSendMessageReturn,
  SuggestedAction,
} from './useSendMessageTypes';

import type {
  UseSendMessageOptions,
  UseSendMessageReturn,
  SuggestedAction,
} from './useSendMessageTypes';
import {
  generateId,
  handleBuildTrigger,
  handleModifyTrigger,
  handleDesignTrigger,
  handleFullAppResponse,
  compressForACTMode,
} from './useSendMessageHandlers';
import type { HandlerContext } from './useSendMessageHandlers';

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for handling message sending in MainBuilderView
 *
 * This hook extracts the complex sendMessage logic from MainBuilderView.tsx,
 * reducing the component size while preserving all functionality.
 */
export function useSendMessage(options: UseSendMessageOptions): UseSendMessageReturn {
  const {
    wizardState,
    appConcept,
    messageSender,
    streaming,
    versionControl,
    dynamicBuildPhases,
    fileInputRef,
    onWizardStateUpdate,
    onSaveComponent,
    saveVersion,
  } = options;

  // Suggested actions state for PLAN mode
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);

  // Clear suggested actions
  const clearSuggestedActions = useCallback(() => {
    setSuggestedActions([]);
  }, []);

  // Get state and setters from Zustand store
  const {
    userInput,
    setUserInput,
    isGenerating,
    setIsGenerating,
    setGenerationProgress,
    chatMessages,
    setChatMessages,
    currentMode,
    setLastUserRequest,
    currentComponent,
    setCurrentComponent,
    setComponents,
    setActiveTab,
    uploadedImage,
    setUploadedImage,
    setPendingDiff,
    setShowDiffPreview,
    setNewAppStagePlan,
  } = useAppStore();

  // Track progress interval for cleanup
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Main message sending function
   */
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || isGenerating) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };

    setLastUserRequest(userInput);
    setChatMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);

    // Determine if this is a modification
    const isModification = currentComponent !== null;
    const isQuestion = messageSender.isQuestion(userInput);
    const progressMessages = messageSender.getProgressMessages(isQuestion, isModification);

    let progressIndex = 0;
    progressIntervalRef.current = setInterval(() => {
      if (progressIndex < progressMessages.length) {
        setGenerationProgress(progressMessages[progressIndex]);
        progressIndex++;
      }
    }, 3000);

    // Build handler context for delegation
    const ctx: HandlerContext = {
      chatMessages,
      setChatMessages,
      currentComponent,
      setCurrentComponent,
      setComponents,
      setActiveTab,
      setPendingDiff,
      setShowDiffPreview,
      setNewAppStagePlan,
      uploadedImage,
      streaming,
      versionControl,
      dynamicBuildPhases,
      appConcept,
      onSaveComponent,
      saveVersion,
    };

    try {
      let data: Record<string, unknown> | null = null;

      // Builder always uses ACT mode — PLAN mode is handled by NaturalConversationWizard
      const endpoint = '/api/ai-builder';
      const compressed = compressForACTMode(chatMessages);

      const fetchBody = JSON.stringify({
        prompt: userInput,
        conversationHistory: compressed.history,
        contextSummary: compressed.summary,
        currentAppState: currentComponent
          ? {
              name: currentComponent.name,
              files: [{ path: 'App.tsx', content: currentComponent.code }],
            }
          : undefined,
        image: uploadedImage || undefined,
        hasImage: !!uploadedImage,
        hasAppConcept: !!appConcept,
        hasPhasePlan: !!dynamicBuildPhases.plan,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: fetchBody,
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setGenerationProgress('');

      data = await response.json();

      if (data?.error) {
        throw new Error(data.error as string);
      }

      // Handle build trigger
      if (data?.shouldTriggerBuild) {
        await handleBuildTrigger(ctx, userInput, userMessage);
        return;
      }

      // Handle modify trigger
      if (data?.shouldTriggerModify && currentComponent) {
        await handleModifyTrigger(ctx, userInput, userMessage);
        return;
      }

      // Handle design trigger
      if (data?.shouldTriggerDesign && currentComponent) {
        await handleDesignTrigger(ctx, userInput);
        return;
      }

      // Handle diff response
      if (data?.changeType === 'MODIFICATION' && data?.files) {
        setPendingDiff({
          id: generateId(),
          summary: data.summary as string,
          files: data.files as import('@/types/aiBuilderTypes').PendingDiff['files'],
          timestamp: new Date().toISOString(),
        });
        setShowDiffPreview(true);

        const diffMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `🔍 **Changes Ready for Review**\n\n${data.summary}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, diffMessage]);
        return;
      }

      // Handle chat response
      const isBuilderResponse = data?.message && data?.responseType;
      const isChatResponse = isQuestion || data?.type === 'chat' || isBuilderResponse;

      if (isChatResponse) {
        const chatResponse: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: (data?.message || data?.answer || data?.description) as string,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, chatResponse]);
      } else if (data) {
        // Handle full-app response
        await handleFullAppResponse(ctx, data, userMessage, isModification, userInput);
      }
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setGenerationProgress('');

      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setUploadedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userInput,
    isGenerating,
    currentMode,
    currentComponent,
    chatMessages,
    uploadedImage,
    messageSender,
    streaming,
    versionControl,
    dynamicBuildPhases,
    wizardState,
    appConcept,
    saveVersion,
    onWizardStateUpdate,
    onSaveComponent,
  ]);

  return { sendMessage, suggestedActions, clearSuggestedActions };
}

export default useSendMessage;
