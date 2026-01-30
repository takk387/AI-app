/**
 * Layout Builder View
 *
 * Main orchestrator component for the layout builder that combines:
 * - Left panel: LayoutBuilderChatPanel for user interaction
 * - Right panel: LayoutCanvas for visual editing
 *
 * This component manages:
 * - Chat message state
 * - Media upload and analysis flow
 * - Single source of truth for layout state via useLayoutBuilder
 *
 * IMPORTANT: This component owns the useLayoutBuilder hook state.
 * The LayoutCanvas is stateless and receives all state via props.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LayoutBuilderChatPanel,
  LayoutChatMessage,
  UploadedMedia,
} from './layout-builder/LayoutBuilderChatPanel';
import { LayoutCanvas } from './layout-builder/LayoutCanvas';
import ComponentTreePanel from './layout-builder/ComponentTreePanel';
import { useLayoutBuilder } from '@/hooks/useLayoutBuilder';
import { useSourceRegistry } from '@/hooks/useSourceRegistry';
import { useDirectManipulation } from '@/hooks/useDirectManipulation';
import { useAppStore } from '@/store/useAppStore';
import { Layers, PanelRightClose, PanelRightOpen } from 'lucide-react';

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
  // Read app context from store for personalized experience
  const appConcept = useAppStore((state) => state.appConcept);

  // Generate welcome message based on app context
  const welcomeMessage = useMemo(() => {
    if (appConcept?.name) {
      const themeInfo = appConcept.uiPreferences?.colorScheme
        ? ` I'll use your ${appConcept.uiPreferences.colorScheme} theme preferences as guidance.`
        : '';
      return `Welcome to the Layout Builder for **${appConcept.name}**! Upload an image or video of a design you'd like to replicate, and I'll analyze it to create a matching layout.${themeInfo} You can also add instructions to customize the result.`;
    }
    return "Welcome to the Layout Builder! Upload an image or video of a design you'd like to replicate, and I'll analyze it to create a matching layout. You can also add instructions to customize the result.";
  }, [appConcept?.name, appConcept?.uiPreferences?.colorScheme]);

  const [messages, setMessages] = useState<LayoutChatMessage[]>([
    {
      id: generateMessageId(),
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);

  // Single source of truth for all layout state (including originalImage for self-healing)
  const {
    analyzeImage,
    analyzeVideo,
    isAnalyzing,
    components,
    applyAIEdit,
    selectedId,
    selectComponent,
    deleteComponent,
    duplicateComponent,
    undo,
    redo,
    exportCode,
    canUndo,
    canRedo,
    analysisErrors,
    analysisWarnings,
    clearErrors,
    // Component Management (Gap 4)
    groupComponents,
    ungroupComponent,
    reparentComponent: _reparentComponent,
    renameComponent,
    toggleComponentVisibility,
    toggleComponentLock,
    // Direct Manipulation (Gap 3)
    updateComponentBounds,
    // Self-Healing State
    isHealing,
    healingProgress,
    lastHealingResult,
    originalImage,
    runSelfHealingLoop,
    cancelHealing,
    registerRenderToHtml,
  } = useLayoutBuilder();

  // Source registry for multi-source merge pipeline
  const { sources: _sources, addSource, updateSource, generateSourceId } = useSourceRegistry();

  // Direct manipulation for drag/resize on canvas
  const {
    editMode,
    setEditMode,
    dragState,
    activeSnapLines,
    startMove,
    startResize,
    updateDrag,
    endDrag,
  } = useDirectManipulation();

  // Commit bounds after drag/resize
  const handleCommitBounds = useCallback(
    (id: string, bounds: { top: number; left: number; width: number; height: number }) => {
      updateComponentBounds(id, bounds);
    },
    [updateComponentBounds]
  );

  // Tree panel collapse state
  const [isTreeOpen, setIsTreeOpen] = useState(true);

  // Debug: Log component count changes
  console.log('[LayoutBuilderView] components:', components.length, 'isAnalyzing:', isAnalyzing);

  // Handle sending a text message (no media)
  const handleSendMessage = useCallback(
    (message: string, media: UploadedMedia[]) => {
      if (!message.trim() && media.length === 0) return;

      // Add user message
      const userMessage: LayoutChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: message || 'Uploaded media for analysis',
        timestamp: new Date(),
        mediaUrls: media.map((m) => m.previewUrl),
      };
      setMessages((prev) => [...prev, userMessage]);

      // If there's a selected component and just text, treat as edit instruction
      if (selectedId && message.trim() && media.length === 0) {
        applyAIEdit(selectedId, message)
          .then(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: generateMessageId(),
                role: 'assistant',
                content: `I've applied the changes to the selected component.`,
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
                content: `Failed to apply edit: ${error.message}`,
                timestamp: new Date(),
              },
            ]);
          });
      } else if (message.trim() && components.length > 0 && media.length === 0) {
        // General instruction without selection - inform user
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content:
              'To edit a specific component, click on it in the preview first, then send your instruction. Or upload new media to analyze a different design.',
            timestamp: new Date(),
          },
        ]);
      }
    },
    [selectedId, applyAIEdit, components.length]
  );

  // Handle media analysis
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

      // Build enhanced instructions with app context
      let enhancedInstructions = instructions || '';
      if (appConcept) {
        const contextParts: string[] = [];
        if (appConcept.name) {
          contextParts.push(`This design is for an app called "${appConcept.name}".`);
        }
        if (appConcept.uiPreferences?.colorScheme) {
          contextParts.push(`Preferred color scheme: ${appConcept.uiPreferences.colorScheme}.`);
        }
        if (appConcept.uiPreferences?.primaryColor) {
          contextParts.push(`Primary color: ${appConcept.uiPreferences.primaryColor}.`);
        }
        if (appConcept.uiPreferences?.style) {
          contextParts.push(`Design style: ${appConcept.uiPreferences.style}.`);
        }
        if (contextParts.length > 0) {
          const contextPrefix = `[App Context: ${contextParts.join(' ')}] `;
          enhancedInstructions = contextPrefix + enhancedInstructions;
        }
      }

      try {
        // Process each media file with source tracking
        for (const item of media) {
          const sourceId = generateSourceId();
          const source = addSource({
            id: sourceId,
            type: item.type === 'video' ? 'video' : 'image',
            name: item.file.name,
            base64: item.previewUrl,
            instructions: enhancedInstructions || undefined,
          });

          updateSource(source.id, { status: 'analyzing' });

          try {
            if (item.type === 'video') {
              await analyzeVideo(item.file, enhancedInstructions || undefined, source.id);
            } else {
              await analyzeImage(item.file, enhancedInstructions || undefined, source.id);
            }
            updateSource(source.id, { status: 'complete' });
          } catch (sourceError) {
            updateSource(source.id, {
              status: 'error',
              error: sourceError instanceof Error ? sourceError.message : 'Analysis failed',
            });
            throw sourceError;
          }
        }

        // Add success message
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content: `I've analyzed the ${media.length > 1 ? 'media files' : media[0].type} and created a layout. You can now click on any component in the preview to edit it, or upload more media to refine the design.`,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        // Add error message
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
    [analyzeImage, analyzeVideo, appConcept, generateSourceId, addSource, updateSource]
  );

  return (
    <div className="flex h-full w-full">
      {/* Left Panel: Chat */}
      <div className="w-[400px] min-w-[320px] max-w-[500px] flex-shrink-0 h-full">
        <LayoutBuilderChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isAnalyzing={isAnalyzing}
          onAnalyzeMedia={handleAnalyzeMedia}
        />
      </div>

      {/* Center Panel: Preview Canvas */}
      <div className="flex-1 h-full overflow-hidden relative">
        <LayoutCanvas
          components={components}
          selectedId={selectedId}
          isAnalyzing={isAnalyzing}
          analysisErrors={analysisErrors}
          analysisWarnings={analysisWarnings}
          onSelectComponent={selectComponent}
          onAnalyzeImage={analyzeImage}
          onAnalyzeVideo={analyzeVideo}
          onApplyAIEdit={applyAIEdit}
          onDeleteComponent={deleteComponent}
          onDuplicateComponent={duplicateComponent}
          onUndo={undo}
          onRedo={redo}
          onExportCode={exportCode}
          onClearErrors={clearErrors}
          canUndo={canUndo}
          canRedo={canRedo}
          // Self-Healing Props
          isHealing={isHealing}
          healingProgress={healingProgress}
          lastHealingResult={lastHealingResult}
          originalImage={originalImage}
          onRunSelfHealing={runSelfHealingLoop}
          onCancelHealing={cancelHealing}
          registerRenderToHtml={registerRenderToHtml}
          // Direct Manipulation Props
          editMode={editMode}
          onToggleEditMode={setEditMode}
          dragState={dragState}
          activeSnapLines={activeSnapLines}
          onStartMove={startMove}
          onStartResize={startResize}
          onUpdateDrag={updateDrag}
          onEndDrag={endDrag}
          onCommitBounds={handleCommitBounds}
        />

        {/* Tree panel toggle button (when tree is collapsed) */}
        {!isTreeOpen && (
          <button
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => setIsTreeOpen(true)}
            title="Open layers panel"
          >
            <PanelRightOpen size={16} />
          </button>
        )}
      </div>

      {/* Right Panel: Component Tree (collapsible) */}
      {isTreeOpen && (
        <div className="w-[280px] flex-shrink-0 h-full border-l border-gray-200 flex flex-col">
          {/* Tree panel header with close button */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Layers size={14} />
              <span>Component Tree</span>
            </div>
            <button
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setIsTreeOpen(false)}
              title="Close layers panel"
            >
              <PanelRightClose size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ComponentTreePanel
              components={components}
              selectedId={selectedId}
              onSelectComponent={selectComponent}
              onToggleVisibility={toggleComponentVisibility}
              onToggleLock={toggleComponentLock}
              onDeleteComponent={deleteComponent}
              onDuplicateComponent={duplicateComponent}
              onGroupComponents={groupComponents}
              onUngroupComponent={ungroupComponent}
              onRenameComponent={renameComponent}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutBuilderView;
