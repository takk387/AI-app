/**
 * useSendMessage Hook
 *
 * Extracted from MainBuilderView.tsx to reduce component size.
 * Handles all message sending logic including:
 * - PLAN mode wizard chat
 * - ACT mode builder chat
 * - Build/modify/design triggers
 * - Phase completion tracking
 * - Error handling
 */

import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type {
  ChatMessage,
  GeneratedComponent,
  PendingDiff,
  AppVersion,
} from '@/types/aiBuilderTypes';
import type { AppConcept } from '@/types/appConcept';
import type { LayoutDesign, DesignChange } from '@/types/layoutDesign';
import type { PhaseExecutionResult, DynamicPhasePlan } from '@/types/dynamicPhases';
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
} from '@/utils/contextCompression';
import { captureLayoutPreview } from '@/utils/screenshotCapture';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Wizard state for PLAN mode conversations
 */
export interface WizardState {
  name?: string;
  description?: string;
  features: Array<{ name: string; description: string; priority: string }>;
  technical: Record<string, boolean | string | undefined>;
  isComplete: boolean;
  readyForPhases: boolean;
}

/**
 * Return type from useMessageSender hook
 */
interface MessageSenderReturn {
  isQuestion: (input: string) => boolean;
  getProgressMessages: (isQuestion: boolean, isModification: boolean) => string[];
}

/**
 * Return type from useStreamingGeneration hook
 */
interface StreamingGenerationReturn {
  generate: (requestBody: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
}

/**
 * Return type from useVersionControl hook
 */
interface VersionControlReturn {
  pushToUndoStack: (version: AppVersion) => void;
  clearRedoStack: () => void;
}

/**
 * Dynamic build phases interface (subset of useDynamicBuildPhases)
 */
interface DynamicBuildPhasesReturn {
  currentPhase: { number: number; name: string; features: string[] } | null;
  completePhase: (result: PhaseExecutionResult) => void;
  plan: DynamicPhasePlan | null;
}

/**
 * Options for useSendMessage hook
 */
export interface UseSendMessageOptions {
  wizardState: WizardState;
  appConcept: AppConcept | null;
  messageSender: MessageSenderReturn;
  streaming: StreamingGenerationReturn;
  versionControl: VersionControlReturn;
  dynamicBuildPhases: DynamicBuildPhasesReturn;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  // Callbacks
  onWizardStateUpdate: (state: WizardState) => void;
  onSaveComponent: (
    component: GeneratedComponent
  ) => Promise<{ success: boolean; error?: unknown }>;
  saveVersion: (
    component: GeneratedComponent,
    changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE',
    description: string
  ) => GeneratedComponent;
}

/**
 * Return type for useSendMessage hook
 */
export interface UseSendMessageReturn {
  sendMessage: () => Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for messages and components
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract component name from user prompt
 */
function extractComponentName(prompt: string): string {
  const words = prompt.split(' ').slice(0, 3).join(' ');
  return words.length > 30 ? words.slice(0, 27) + '...' : words;
}

/**
 * Compress conversation history for ACT mode requests
 */
function compressForACTMode(
  messages: ChatMessage[],
  maxTokens = 50000
): { history: Array<{ role: 'user' | 'assistant'; content: string }>; summary?: string } {
  const filteredMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp,
    }));

  if (needsCompression(filteredMessages, maxTokens)) {
    const compressed = compressConversation(filteredMessages, {
      maxTokens,
      preserveLastN: 30,
    });

    return {
      history: compressed.recentMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      summary: compressed.summary.messageCount > 0 ? buildCompressedContext(compressed) : undefined,
    };
  }

  return {
    history: filteredMessages.slice(-50).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  };
}

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
        endpoint = '/api/builder/chat';
        const compressed = compressForACTMode(chatMessages);

        fetchBody = JSON.stringify({
          message: userInput,
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

      // Handle ACT mode build trigger
      if (currentMode === 'ACT' && data?.shouldTriggerBuild) {
        await handleBuildTrigger(userInput, userMessage);
        return;
      }

      // Handle ACT mode modify trigger
      if (currentMode === 'ACT' && data?.shouldTriggerModify && currentComponent) {
        await handleModifyTrigger(userInput, userMessage);
        return;
      }

      // Handle ACT mode design trigger
      if (currentMode === 'ACT' && data?.shouldTriggerDesign && currentComponent) {
        await handleDesignTrigger(userInput);
        return;
      }

      // Handle diff response
      if (data?.changeType === 'MODIFICATION' && data?.files) {
        setPendingDiff({
          id: generateId(),
          summary: data.summary as string,
          files: data.files as PendingDiff['files'],
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
        await handleFullAppResponse(data, userMessage, isModification);
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

    // ========================================================================
    // NESTED HANDLERS (to avoid recreating on each render)
    // ========================================================================

    /**
     * Handle build trigger from builder expert
     */
    async function handleBuildTrigger(prompt: string, userMsg: ChatMessage) {
      const buildCompressed = compressForACTMode(chatMessages);

      const buildRequestBody: Record<string, unknown> = {
        prompt,
        conversationHistory: buildCompressed.history,
        contextSummary: buildCompressed.summary,
        isModification: false,
        image: uploadedImage || undefined,
        hasImage: !!uploadedImage,
        layoutDesign: appConcept?.layoutDesign || undefined,
        architectureSpec: dynamicBuildPhases.plan?.architectureSpec || undefined,
        phaseContexts: dynamicBuildPhases.plan?.phaseContexts || undefined,
      };

      const buildingMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "🔨 **Building your app...**\n\nI'm generating the code for your application.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, buildingMessage]);

      const streamResult = await streaming.generate(buildRequestBody);

      if (streamResult) {
        const aiAppMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `🚀 App created!\n\n${streamResult.description || `I've created your ${streamResult.name} app!`}`,
          timestamp: new Date().toISOString(),
          componentCode: JSON.stringify(streamResult),
          componentPreview: !!(streamResult.files as unknown[])?.length,
        };
        setChatMessages((prev) => [...prev, aiAppMessage]);

        const files = streamResult.files as Array<{ path: string; content: string }>;

        if (process.env.NODE_ENV === 'development') {
          console.debug('[useSendMessage] handleBuildTrigger result:', {
            name: streamResult.name,
            filesCount: files?.length ?? 0,
            hasFiles: !!(files && files.length > 0),
          });
        }

        if (files && files.length > 0) {
          let newComponent: GeneratedComponent = {
            id: generateId(),
            name: (streamResult.name as string) || extractComponentName(prompt),
            code: JSON.stringify(streamResult, null, 2),
            description: prompt,
            timestamp: new Date().toISOString(),
            isFavorite: false,
            conversationHistory: [...chatMessages, userMsg, aiAppMessage],
            versions: [],
          };

          newComponent = saveVersion(newComponent, 'NEW_APP', prompt);
          setCurrentComponent(newComponent);
          setComponents((prev) => [newComponent, ...prev].slice(0, 50));
          await onSaveComponent(newComponent);

          // Small delay to ensure React has processed state updates
          await new Promise((resolve) => setTimeout(resolve, 50));
          setActiveTab('preview');
        } else {
          // Files array is empty - show error message
          const emptyFilesMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content:
              '⚠️ The app was created but no code files were generated. This might be due to a formatting issue. Please try rephrasing your request or try again.',
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, emptyFilesMessage]);
        }
      } else {
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content:
            '❌ Failed to generate the app. The streaming request returned no result. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    }

    /**
     * Handle modify trigger from builder expert
     */
    async function handleModifyTrigger(prompt: string, userMsg: ChatMessage) {
      if (!currentComponent) return;

      const modifyCompressed = compressForACTMode(chatMessages);

      const modifyRequestBody: Record<string, unknown> = {
        prompt,
        conversationHistory: modifyCompressed.history,
        contextSummary: modifyCompressed.summary,
        isModification: true,
        currentAppName: currentComponent.name,
        currentAppState: JSON.parse(currentComponent.code),
        image: uploadedImage || undefined,
        hasImage: !!uploadedImage,
        layoutDesign: appConcept?.layoutDesign || undefined,
        architectureSpec: dynamicBuildPhases.plan?.architectureSpec || undefined,
        phaseContexts: dynamicBuildPhases.plan?.phaseContexts || undefined,
      };

      const modifyingMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '🔧 **Updating your app...**',
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, modifyingMessage]);

      const streamResult = await streaming.generate(modifyRequestBody);

      if (streamResult) {
        const aiAppMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `✅ App updated!\n\n${streamResult.description || 'Changes applied.'}`,
          timestamp: new Date().toISOString(),
          componentCode: JSON.stringify(streamResult),
          componentPreview: !!(streamResult.files as unknown[])?.length,
        };
        setChatMessages((prev) => [...prev, aiAppMessage]);

        const files = streamResult.files as Array<{ path: string; content: string }>;

        if (process.env.NODE_ENV === 'development') {
          console.debug('[useSendMessage] handleModifyTrigger result:', {
            name: streamResult.name,
            filesCount: files?.length ?? 0,
            hasFiles: !!(files && files.length > 0),
          });
        }

        if (files && files.length > 0) {
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
            code: JSON.stringify(streamResult, null, 2),
            description: prompt,
            timestamp: new Date().toISOString(),
            conversationHistory: [...chatMessages, userMsg, aiAppMessage],
          };

          updatedComponent = saveVersion(updatedComponent, 'MAJOR_CHANGE', prompt);
          setCurrentComponent(updatedComponent);
          setComponents((prev) =>
            prev.map((c) => (c.id === currentComponent.id ? updatedComponent : c))
          );
          await onSaveComponent(updatedComponent);

          // Small delay to ensure React has processed state updates
          await new Promise((resolve) => setTimeout(resolve, 50));
          setActiveTab('preview');

          // Complete phase tracking
          if (dynamicBuildPhases.currentPhase) {
            const phaseResult: PhaseExecutionResult = {
              phaseNumber: dynamicBuildPhases.currentPhase.number,
              phaseName: dynamicBuildPhases.currentPhase.name,
              success: true,
              generatedCode: JSON.stringify(streamResult, null, 2),
              generatedFiles: files.map((f) => f.path),
              implementedFeatures: dynamicBuildPhases.currentPhase.features,
              duration: 0,
              tokensUsed: { input: 0, output: 0 },
            };
            dynamicBuildPhases.completePhase(phaseResult);
          }
        } else {
          // Files array is empty - show error message
          const emptyFilesMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content:
              '⚠️ The modification was processed but no updated code files were returned. Please try again.',
            timestamp: new Date().toISOString(),
          };
          setChatMessages((prev) => [...prev, emptyFilesMessage]);
        }
      } else {
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content:
            '❌ Failed to update the app. The streaming request returned no result. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    }

    /**
     * Handle design trigger from builder expert
     */
    async function handleDesignTrigger(prompt: string) {
      let previewScreenshot: string | undefined;
      try {
        const captureResult = await captureLayoutPreview('sandpack-preview');
        if (captureResult.success && captureResult.dataUrl) {
          previewScreenshot = captureResult.dataUrl;
        }
      } catch (captureError) {
        console.warn('Failed to capture preview for design chat:', captureError);
      }

      const designRequestBody = {
        message: prompt,
        conversationHistory: chatMessages.slice(-50).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        previewScreenshot,
        currentLayoutDesign: appConcept?.layoutDesign || undefined,
      };

      const designingMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '🎨 **Updating design...**\n\nAnalyzing your layout and applying changes.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, designingMessage]);

      try {
        const designResponse = await fetch('/api/builder/design-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(designRequestBody),
        });

        const designData = await designResponse.json();

        if (designData?.error) {
          throw new Error(designData.error);
        }

        // Update appConcept.layoutDesign with merged design
        if (designData?.updatedDesign && Object.keys(designData.updatedDesign).length > 0) {
          const currentLayoutDesign = (appConcept?.layoutDesign || {}) as Partial<LayoutDesign>;
          const updatedDesign = designData.updatedDesign as Partial<LayoutDesign>;
          const mergedDesign = {
            ...currentLayoutDesign,
            ...updatedDesign,
            globalStyles: {
              ...currentLayoutDesign?.globalStyles,
              ...updatedDesign?.globalStyles,
              colors: {
                ...currentLayoutDesign?.globalStyles?.colors,
                ...updatedDesign?.globalStyles?.colors,
              },
              typography: {
                ...currentLayoutDesign?.globalStyles?.typography,
                ...updatedDesign?.globalStyles?.typography,
              },
              spacing: {
                ...currentLayoutDesign?.globalStyles?.spacing,
                ...updatedDesign?.globalStyles?.spacing,
              },
              effects: {
                ...currentLayoutDesign?.globalStyles?.effects,
                ...updatedDesign?.globalStyles?.effects,
              },
            },
          } as LayoutDesign;

          if (appConcept) {
            setAppConcept({
              ...appConcept,
              layoutDesign: mergedDesign,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Build response message
        let responseContent = designData?.message || 'Design updated successfully.';

        if (designData?.designChanges && designData.designChanges.length > 0) {
          const changesSummary = (designData.designChanges as DesignChange[])
            .slice(0, 5)
            .map((c: DesignChange) => `• **${c.property}**: ${c.reason}`)
            .join('\n');
          responseContent += `\n\n**Changes applied:**\n${changesSummary}`;
        }

        if (designData?.toolsUsed && designData.toolsUsed.length > 0) {
          responseContent += `\n\n_Tools used: ${designData.toolsUsed.join(', ')}_`;
        }

        const designResultMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, designResultMessage]);
      } catch (designError) {
        console.error('Design chat error:', designError);
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `❌ Failed to update design: ${designError instanceof Error ? designError.message : 'Unknown error'}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    }

    /**
     * Handle full app response (non-streaming or legacy)
     */
    async function handleFullAppResponse(
      data: Record<string, unknown>,
      userMsg: ChatMessage,
      isMod: boolean
    ) {
      const aiAppMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `🚀 App created\n\n${data.description || `I've created your ${data.name} app!`}`,
        timestamp: new Date().toISOString(),
        componentCode: JSON.stringify(data),
        componentPreview: !!(data.files as unknown[])?.length,
      };
      setChatMessages((prev) => [...prev, aiAppMessage]);

      const files = data.files as Array<{ path: string; content: string }>;
      if (files && files.length > 0) {
        if (isMod && currentComponent) {
          versionControl.pushToUndoStack({
            id: generateId(),
            versionNumber: (currentComponent.versions?.length || 0) + 1,
            code: currentComponent.code,
            description: currentComponent.description,
            timestamp: currentComponent.timestamp,
            changeType: 'MINOR_CHANGE',
          });
          versionControl.clearRedoStack();
        }

        let newComponent: GeneratedComponent = {
          id: isMod && currentComponent ? currentComponent.id : generateId(),
          name: (data.name as string) || extractComponentName(userInput),
          code: JSON.stringify(data, null, 2),
          description: userInput,
          timestamp: new Date().toISOString(),
          isFavorite: isMod && currentComponent ? currentComponent.isFavorite : false,
          conversationHistory: [...chatMessages, userMsg, aiAppMessage],
          versions: isMod && currentComponent ? currentComponent.versions : [],
        };

        newComponent = saveVersion(
          newComponent,
          isMod ? 'MAJOR_CHANGE' : 'NEW_APP',
          (data.description as string) || userInput
        );

        setCurrentComponent(newComponent);

        if (isMod && currentComponent) {
          setComponents((prev) =>
            prev.map((comp) => (comp.id === currentComponent.id ? newComponent : comp))
          );
        } else {
          setComponents((prev) => [newComponent, ...prev].slice(0, 50));
        }

        await onSaveComponent(newComponent);
        setActiveTab('preview');

        // Complete phase tracking
        if (dynamicBuildPhases.currentPhase) {
          const phaseResult: PhaseExecutionResult = {
            phaseNumber: dynamicBuildPhases.currentPhase.number,
            phaseName: dynamicBuildPhases.currentPhase.name,
            success: true,
            generatedCode: JSON.stringify(data, null, 2),
            generatedFiles: files.map((f) => f.path),
            implementedFeatures: dynamicBuildPhases.currentPhase.features,
            duration: 0,
            tokensUsed: { input: 0, output: 0 },
          };
          dynamicBuildPhases.completePhase(phaseResult);

          setNewAppStagePlan((prev) =>
            prev
              ? {
                  ...prev,
                  currentPhase: phaseResult.phaseNumber,
                  phases: prev.phases.map((p) =>
                    p.number === phaseResult.phaseNumber ? { ...p, status: 'complete' as const } : p
                  ),
                }
              : null
          );
        }
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

  return { sendMessage };
}

export default useSendMessage;
