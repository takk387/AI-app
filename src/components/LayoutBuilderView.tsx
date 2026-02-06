/**
 * Layout Builder View
 *
 * Main orchestrator for the Universal Visual Editor.
 * Combines the chat panel (left) with the Sandpack preview canvas (right).
 *
 * This component:
 *   - Owns the useLayoutBuilder hook (single source of truth)
 *   - Converts chat input (text + media) into pipeline calls
 *   - Passes generated code + progress to both panels
 *
 * All generation scenarios flow through one path:
 *   handleAnalyzeMedia / handleSendMessage → useLayoutBuilder.runPipeline()
 *   The Router on the backend decides CREATE / MERGE / EDIT mode.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LayoutBuilderChatPanel,
  LayoutChatMessage,
  UploadedMedia,
} from './layout-builder/LayoutBuilderChatPanel';
import { LayoutCanvas } from './layout-builder/LayoutCanvas';
import { useLayoutBuilder } from '@/hooks/useLayoutBuilder';
import { useAppStore } from '@/store/useAppStore';
import type { AppContext } from '@/types/titanPipeline';

// ============================================================================
// HELPERS
// ============================================================================

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LayoutBuilderView: React.FC = () => {
  // --- App context for personalized generation ---
  const appConcept = useAppStore((state) => state.appConcept);

  const appContext: AppContext | undefined = useMemo(() => {
    if (!appConcept) return undefined;
    return {
      name: appConcept.name,
      colorScheme: appConcept.uiPreferences?.colorScheme,
      primaryColor: appConcept.uiPreferences?.primaryColor,
      style: appConcept.uiPreferences?.style,
    };
  }, [appConcept]);

  // --- Welcome message ---
  const welcomeMessage = useMemo(() => {
    if (appConcept?.name) {
      const themeInfo = appConcept.uiPreferences?.colorScheme
        ? ` I'll use your ${appConcept.uiPreferences.colorScheme} theme preferences as guidance.`
        : '';
      return `Welcome to the Layout Builder for **${appConcept.name}**! Upload an image or video of a design you'd like to replicate, or describe what you want to build.${themeInfo}`;
    }
    return "Welcome to the Layout Builder! Upload an image or video of a design you'd like to replicate, or describe what you want to build. You can also type instructions to customize the result.";
  }, [appConcept?.name, appConcept?.uiPreferences?.colorScheme]);

  // --- Chat messages ---
  const [messages, setMessages] = useState<LayoutChatMessage[]>([
    {
      id: generateMessageId(),
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);

  // --- Layout builder hook (single source of truth) ---
  const {
    generatedFiles,
    isProcessing,
    pipelineProgress,
    errors,
    warnings,
    canvasSize,
    runPipeline,
    refineComponent,
    undo,
    redo,
    exportCode,
    clearErrors,
    canUndo,
    canRedo,
  } = useLayoutBuilder();

  // --- Handle media analysis (image/video uploads) ---
  // Defined before handleSendMessage so it can be called from there
  const handleAnalyzeMedia = useCallback(
    async (media: UploadedMedia[], instructions?: string) => {
      if (media.length === 0) return;

      // Add user message with media previews
      const userMessage: LayoutChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: instructions || 'Analyze this design and create a layout',
        timestamp: new Date(),
        mediaUrls: media.map((m) => m.previewUrl),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Extract raw File objects from UploadedMedia
        const files = media.map((m) => m.file);

        // Run the Titan pipeline (Router determines CREATE/MERGE/EDIT)
        await runPipeline(files, instructions || '', appContext);

        // Success message
        const modeHint =
          media.length > 1
            ? `I've analyzed ${media.length} files and created a merged layout.`
            : `I've analyzed the ${media[0].type} and created a layout.`;

        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content: `${modeHint} Click on any component in the preview to edit it, or send more instructions to refine the design.`,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'system',
            content: `Failed to analyze media: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
          },
        ]);
      }
    },
    [runPipeline, appContext]
  );

  // --- Handle text-only messages (or text + media) ---
  const handleSendMessage = useCallback(
    (message: string, media: UploadedMedia[]) => {
      if (!message.trim() && media.length === 0) return;

      // If there are media files, delegate to handleAnalyzeMedia with the user's text.
      // This ensures instructions like "Copy this layout but make it blue" are
      // passed to the pipeline as the instructions argument alongside the media.
      if (media.length > 0) {
        handleAnalyzeMedia(media, message);
        return;
      }

      // Add user message to chat (text-only path)
      const userMessage: LayoutChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Text-only: run pipeline with no files
      // The Router will determine CREATE (no existing code) or EDIT (has currentCode)
      if (message.trim()) {
        const hasExistingCode = generatedFiles.length > 0;

        runPipeline([], message.trim(), appContext)
          .then(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: generateMessageId(),
                role: 'assistant',
                content: hasExistingCode
                  ? "I've updated the layout based on your instructions. Click on any component in the preview to make further edits."
                  : "I've generated a layout based on your description. Click on any component in the preview to refine it.",
                timestamp: new Date(),
              },
            ]);
          })
          .catch((error) => {
            setMessages((prev) => [
              ...prev,
              {
                id: generateMessageId(),
                role: 'system',
                content: `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date(),
              },
            ]);
          });
      }
    },
    [handleAnalyzeMedia, runPipeline, appContext, generatedFiles.length]
  );

  // --- Handle file drops on the canvas ---
  const handleDropFiles = useCallback(
    (files: File[]) => {
      const mediaFiles = files.filter(
        (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
      );
      if (mediaFiles.length === 0) return;

      // Add a chat message about the drop
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          role: 'user',
          content: `Dropped ${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''} for analysis`,
          timestamp: new Date(),
        },
      ]);

      // Run pipeline
      runPipeline(mediaFiles, '', appContext)
        .then(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: generateMessageId(),
              role: 'assistant',
              content: 'Layout generated from dropped files. Click on any component to edit it.',
              timestamp: new Date(),
            },
          ]);
        })
        .catch((error) => {
          setMessages((prev) => [
            ...prev,
            {
              id: generateMessageId(),
              role: 'system',
              content: `Failed to process dropped files: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
            },
          ]);
        });
    },
    [runPipeline, appContext]
  );

  return (
    <div className="flex h-full w-full">
      {/* Left Panel: Chat */}
      <div className="w-[400px] min-w-[320px] max-w-[500px] flex-shrink-0 h-full">
        <LayoutBuilderChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isAnalyzing={isProcessing}
          onAnalyzeMedia={handleAnalyzeMedia}
          pipelineProgress={pipelineProgress}
        />
      </div>

      {/* Right Panel: Preview Canvas */}
      <div className="flex-1 h-full overflow-hidden">
        <LayoutCanvas
          generatedFiles={generatedFiles}
          isProcessing={isProcessing}
          pipelineProgress={pipelineProgress}
          errors={errors}
          warnings={warnings}
          canvasSize={canvasSize}
          onDropFiles={handleDropFiles}
          onRefineComponent={refineComponent}
          onUndo={undo}
          onRedo={redo}
          onExportCode={exportCode}
          onClearErrors={clearErrors}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
    </div>
  );
};

export default LayoutBuilderView;
