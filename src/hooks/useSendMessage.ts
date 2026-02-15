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
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
} from '@/utils/contextCompression';

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
import type { WizardState } from '@/types/wizardState';

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
    setAppConcept,
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
      let endpoint: string;
      let fetchBody: string;

      if (currentMode === 'PLAN') {
        // PLAN mode: Use wizard API
        endpoint = '/api/wizard/chat';
        const MAX_CONTEXT_TOKENS = 100000;
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
        let contextSummary: string | undefined;

        const filteredMessages = chatMessages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp,
          }));

        if (needsCompression(filteredMessages, MAX_CONTEXT_TOKENS)) {
          const compressed = compressConversation(filteredMessages, {
            maxTokens: MAX_CONTEXT_TOKENS,
            preserveLastN: 20,
          });

          conversationHistory = compressed.recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

          if (compressed.summary.messageCount > 0) {
            contextSummary = buildCompressedContext(compressed);
          }
        } else {
          conversationHistory = filteredMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        }

        fetchBody = JSON.stringify({
          message: userInput,
          conversationHistory,
          contextSummary,
          currentState: wizardState,
          referenceImages: uploadedImage ? [uploadedImage] : undefined,
        });
      } else {
        // ACT mode: Use builder expert
        endpoint = '/api/ai-builder';
        const compressed = compressForACTMode(chatMessages);

        fetchBody = JSON.stringify({
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
      }

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

      // Update wizard state from PLAN mode response
      if (currentMode === 'PLAN' && data?.updatedState) {
        onWizardStateUpdate(data.updatedState as WizardState);
      }

      // Store suggested actions from PLAN mode response
      if (currentMode === 'PLAN' && data?.suggestedActions) {
        setSuggestedActions(data.suggestedActions as SuggestedAction[]);
      }

      // Handle ACT mode build trigger
      if (currentMode === 'ACT' && data?.shouldTriggerBuild) {
        await handleBuildTrigger(ctx, userInput, userMessage);
        return;
      }

      // Handle ACT mode modify trigger
      if (currentMode === 'ACT' && data?.shouldTriggerModify && currentComponent) {
        await handleModifyTrigger(ctx, userInput, userMessage);
        return;
      }

      // Handle ACT mode design trigger
      if (currentMode === 'ACT' && data?.shouldTriggerDesign && currentComponent) {
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
      const isBuilderResponse = currentMode === 'ACT' && data?.message && data?.responseType;
      const isWizardResponse = currentMode === 'PLAN' && data?.message;
      const isChatResponse =
        isQuestion || data?.type === 'chat' || isWizardResponse || isBuilderResponse;

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
