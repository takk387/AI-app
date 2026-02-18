/**
 * useSendMessage Handlers
 *
 * Pure handler functions for build, modify, design, and full-app responses.
 * Extracted from useSendMessage hook for modularity.
 */

import type {
  ChatMessage,
  GeneratedComponent,
  PendingDiff,
  StagePlan,
  ActiveTab,
} from '@/types/aiBuilderTypes';
import type { PhaseExecutionResult } from '@/types/dynamicPhases';
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
} from '@/utils/contextCompression';
import type {
  StreamingGenerationReturn,
  VersionControlReturn,
  DynamicBuildPhasesReturn,
  SuggestedAction,
} from './useSendMessageTypes';
import type { AppConcept } from '@/types/appConcept';

// ============================================================================
// SHARED HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for messages and components
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract component name from user prompt
 */
export function extractComponentName(prompt: string): string {
  const words = prompt.split(' ').slice(0, 3).join(' ');
  return words.length > 30 ? words.slice(0, 27) + '...' : words;
}

/**
 * Compress conversation history for ACT mode requests
 */
export function compressForACTMode(
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
// HANDLER CONTEXT
// ============================================================================

/**
 * Context object passed to all handler functions.
 * Contains the Zustand setters and options they need.
 */
export interface HandlerContext {
  chatMessages: ChatMessage[];
  setChatMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  currentComponent: GeneratedComponent | null;
  setCurrentComponent: (component: GeneratedComponent) => void;
  setComponents: (updater: (prev: GeneratedComponent[]) => GeneratedComponent[]) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setPendingDiff: (diff: PendingDiff) => void;
  setShowDiffPreview: (show: boolean) => void;
  setNewAppStagePlan: (
    plan: StagePlan | null | ((prev: StagePlan | null) => StagePlan | null)
  ) => void;
  uploadedImage: string | null;
  streaming: StreamingGenerationReturn;
  versionControl: VersionControlReturn;
  dynamicBuildPhases: DynamicBuildPhasesReturn;
  appConcept: AppConcept | null;
  onSaveComponent: (
    component: GeneratedComponent
  ) => Promise<{ success: boolean; error?: unknown }>;
  saveVersion: (
    component: GeneratedComponent,
    changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE',
    description: string
  ) => GeneratedComponent;
}

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

/**
 * Handle build trigger from builder expert
 */
export async function handleBuildTrigger(
  ctx: HandlerContext,
  prompt: string,
  userMsg: ChatMessage
): Promise<void> {
  const buildCompressed = compressForACTMode(ctx.chatMessages);

  const buildRequestBody: Record<string, unknown> = {
    prompt,
    conversationHistory: buildCompressed.history,
    contextSummary: buildCompressed.summary,
    isModification: false,
    image: ctx.uploadedImage || undefined,
    hasImage: !!ctx.uploadedImage,
    layoutManifest: ctx.appConcept?.layoutManifest || undefined,
    architectureSpec: ctx.dynamicBuildPhases.plan?.architectureSpec || undefined,
    phaseContexts: ctx.dynamicBuildPhases.plan?.phaseContexts || undefined,
  };

  const buildingMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: "🔨 **Building your app...**\n\nI'm generating the code for your application.",
    timestamp: new Date().toISOString(),
  };
  ctx.setChatMessages((prev) => [...prev, buildingMessage]);

  const streamResult = await ctx.streaming.generate(buildRequestBody);

  if (streamResult) {
    const aiAppMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `🚀 App created!\n\n${streamResult.description || `I've created your ${streamResult.name} app!`}`,
      timestamp: new Date().toISOString(),
      componentCode: JSON.stringify(streamResult),
      componentPreview: !!(streamResult.files as unknown[])?.length,
    };
    ctx.setChatMessages((prev) => [...prev, aiAppMessage]);

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
        conversationHistory: [...ctx.chatMessages, userMsg, aiAppMessage],
        versions: [],
      };

      newComponent = ctx.saveVersion(newComponent, 'NEW_APP', prompt);
      ctx.setCurrentComponent(newComponent);
      ctx.setComponents((prev) => [newComponent, ...prev].slice(0, 50));
      await ctx.onSaveComponent(newComponent);

      // Small delay to ensure React has processed state updates
      await new Promise((resolve) => setTimeout(resolve, 50));
      ctx.setActiveTab('preview');

      // Complete phase tracking (matches handleModifyTrigger pattern)
      if (ctx.dynamicBuildPhases.currentPhase) {
        const phaseResult: PhaseExecutionResult = {
          phaseNumber: ctx.dynamicBuildPhases.currentPhase.number,
          phaseName: ctx.dynamicBuildPhases.currentPhase.name,
          success: true,
          generatedCode: JSON.stringify(streamResult, null, 2),
          generatedFiles: files.map((f) => f.path),
          implementedFeatures: ctx.dynamicBuildPhases.currentPhase.features,
          duration: 0,
          tokensUsed: { input: 0, output: 0 },
        };
        ctx.dynamicBuildPhases.completePhase(phaseResult);
      }
    } else {
      // Files array is empty - show error message
      const emptyFilesMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content:
          '⚠️ The app was created but no code files were generated. This might be due to a formatting issue. Please try rephrasing your request or try again.',
        timestamp: new Date().toISOString(),
      };
      ctx.setChatMessages((prev) => [...prev, emptyFilesMessage]);
    }
  } else {
    const errorMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content:
        '❌ Failed to generate the app. The streaming request returned no result. Please try again.',
      timestamp: new Date().toISOString(),
    };
    ctx.setChatMessages((prev) => [...prev, errorMessage]);
  }
}

/**
 * Handle modify trigger from builder expert
 */
export async function handleModifyTrigger(
  ctx: HandlerContext,
  prompt: string,
  userMsg: ChatMessage
): Promise<void> {
  if (!ctx.currentComponent) return;

  const modifyCompressed = compressForACTMode(ctx.chatMessages);

  const modifyRequestBody: Record<string, unknown> = {
    prompt,
    conversationHistory: modifyCompressed.history,
    contextSummary: modifyCompressed.summary,
    isModification: true,
    currentAppName: ctx.currentComponent.name,
    currentAppState: JSON.parse(ctx.currentComponent.code),
    image: ctx.uploadedImage || undefined,
    hasImage: !!ctx.uploadedImage,
    layoutManifest: ctx.appConcept?.layoutManifest || undefined,
    architectureSpec: ctx.dynamicBuildPhases.plan?.architectureSpec || undefined,
    phaseContexts: ctx.dynamicBuildPhases.plan?.phaseContexts || undefined,
  };

  const modifyingMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: '🔧 **Updating your app...**',
    timestamp: new Date().toISOString(),
  };
  ctx.setChatMessages((prev) => [...prev, modifyingMessage]);

  const streamResult = await ctx.streaming.generate(modifyRequestBody);

  if (streamResult) {
    const aiAppMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `✅ App updated!\n\n${streamResult.description || 'Changes applied.'}`,
      timestamp: new Date().toISOString(),
      componentCode: JSON.stringify(streamResult),
      componentPreview: !!(streamResult.files as unknown[])?.length,
    };
    ctx.setChatMessages((prev) => [...prev, aiAppMessage]);

    const files = streamResult.files as Array<{ path: string; content: string }>;

    if (process.env.NODE_ENV === 'development') {
      console.debug('[useSendMessage] handleModifyTrigger result:', {
        name: streamResult.name,
        filesCount: files?.length ?? 0,
        hasFiles: !!(files && files.length > 0),
      });
    }

    if (files && files.length > 0) {
      ctx.versionControl.pushToUndoStack({
        id: generateId(),
        versionNumber: (ctx.currentComponent.versions?.length || 0) + 1,
        code: ctx.currentComponent.code,
        description: ctx.currentComponent.description,
        timestamp: ctx.currentComponent.timestamp,
        changeType: 'MINOR_CHANGE',
      });
      ctx.versionControl.clearRedoStack();

      let updatedComponent: GeneratedComponent = {
        ...ctx.currentComponent,
        code: JSON.stringify(streamResult, null, 2),
        description: prompt,
        timestamp: new Date().toISOString(),
        conversationHistory: [...ctx.chatMessages, userMsg, aiAppMessage],
      };

      updatedComponent = ctx.saveVersion(updatedComponent, 'MAJOR_CHANGE', prompt);
      ctx.setCurrentComponent(updatedComponent);
      ctx.setComponents((prev) =>
        prev.map((c) => (c.id === ctx.currentComponent!.id ? updatedComponent : c))
      );
      await ctx.onSaveComponent(updatedComponent);

      // Small delay to ensure React has processed state updates
      await new Promise((resolve) => setTimeout(resolve, 50));
      ctx.setActiveTab('preview');

      // Complete phase tracking
      if (ctx.dynamicBuildPhases.currentPhase) {
        const phaseResult: PhaseExecutionResult = {
          phaseNumber: ctx.dynamicBuildPhases.currentPhase.number,
          phaseName: ctx.dynamicBuildPhases.currentPhase.name,
          success: true,
          generatedCode: JSON.stringify(streamResult, null, 2),
          generatedFiles: files.map((f) => f.path),
          implementedFeatures: ctx.dynamicBuildPhases.currentPhase.features,
          duration: 0,
          tokensUsed: { input: 0, output: 0 },
        };
        ctx.dynamicBuildPhases.completePhase(phaseResult);
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
      ctx.setChatMessages((prev) => [...prev, emptyFilesMessage]);
    }
  } else {
    const errorMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content:
        '❌ Failed to update the app. The streaming request returned no result. Please try again.',
      timestamp: new Date().toISOString(),
    };
    ctx.setChatMessages((prev) => [...prev, errorMessage]);
  }
}

/**
 * Handle design trigger from builder expert
 * Note: Legacy design-chat API has been removed. Design is now handled through the Layout Builder Wizard.
 */
export async function handleDesignTrigger(ctx: HandlerContext, prompt: string): Promise<void> {
  // Design chat API has been removed in favor of the Layout Builder Wizard
  const infoMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: `🎨 **Design Changes**\n\nTo modify the design, please use the **Layout Builder** in the Design step. The inline design chat has been replaced with the more powerful visual Layout Builder.\n\nYour request: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
    timestamp: new Date().toISOString(),
  };
  ctx.setChatMessages((prev) => [...prev, infoMessage]);
}

/**
 * Handle full app response (non-streaming or legacy)
 */
export async function handleFullAppResponse(
  ctx: HandlerContext,
  data: Record<string, unknown>,
  userMsg: ChatMessage,
  isMod: boolean,
  userInput: string
): Promise<void> {
  const aiAppMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: `🚀 App created\n\n${data.description || `I've created your ${data.name} app!`}`,
    timestamp: new Date().toISOString(),
    componentCode: JSON.stringify(data),
    componentPreview: !!(data.files as unknown[])?.length,
  };
  ctx.setChatMessages((prev) => [...prev, aiAppMessage]);

  const files = data.files as Array<{ path: string; content: string }>;
  if (files && files.length > 0) {
    if (isMod && ctx.currentComponent) {
      ctx.versionControl.pushToUndoStack({
        id: generateId(),
        versionNumber: (ctx.currentComponent.versions?.length || 0) + 1,
        code: ctx.currentComponent.code,
        description: ctx.currentComponent.description,
        timestamp: ctx.currentComponent.timestamp,
        changeType: 'MINOR_CHANGE',
      });
      ctx.versionControl.clearRedoStack();
    }

    let newComponent: GeneratedComponent = {
      id: isMod && ctx.currentComponent ? ctx.currentComponent.id : generateId(),
      name: (data.name as string) || extractComponentName(userInput),
      code: JSON.stringify(data, null, 2),
      description: userInput,
      timestamp: new Date().toISOString(),
      isFavorite: isMod && ctx.currentComponent ? ctx.currentComponent.isFavorite : false,
      conversationHistory: [...ctx.chatMessages, userMsg, aiAppMessage],
      versions: isMod && ctx.currentComponent ? ctx.currentComponent.versions : [],
    };

    newComponent = ctx.saveVersion(
      newComponent,
      isMod ? 'MAJOR_CHANGE' : 'NEW_APP',
      (data.description as string) || userInput
    );

    ctx.setCurrentComponent(newComponent);

    if (isMod && ctx.currentComponent) {
      ctx.setComponents((prev) =>
        prev.map((comp) => (comp.id === ctx.currentComponent!.id ? newComponent : comp))
      );
    } else {
      ctx.setComponents((prev) => [newComponent, ...prev].slice(0, 50));
    }

    await ctx.onSaveComponent(newComponent);
    ctx.setActiveTab('preview');

    // Complete phase tracking
    if (ctx.dynamicBuildPhases.currentPhase) {
      const phaseResult: PhaseExecutionResult = {
        phaseNumber: ctx.dynamicBuildPhases.currentPhase.number,
        phaseName: ctx.dynamicBuildPhases.currentPhase.name,
        success: true,
        generatedCode: JSON.stringify(data, null, 2),
        generatedFiles: files.map((f) => f.path),
        implementedFeatures: ctx.dynamicBuildPhases.currentPhase.features,
        duration: 0,
        tokensUsed: { input: 0, output: 0 },
      };
      ctx.dynamicBuildPhases.completePhase(phaseResult);

      ctx.setNewAppStagePlan((prev) =>
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
