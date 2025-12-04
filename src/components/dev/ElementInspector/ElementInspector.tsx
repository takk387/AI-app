'use client';

/**
 * ElementInspector - Visual Element Inspector Dev Tool
 *
 * Allows developers to visually select elements, describe problems,
 * and generate Claude-ready prompts for assistance.
 *
 * Only renders in development mode.
 */

import React from 'react';
import { useElementInspector } from '@/hooks/useElementInspector';
import { SHOW_DEV_TOOLS } from '@/utils/debug';
import { InspectorButton } from './InspectorButton';
import { InspectorOverlay } from './InspectorOverlay';
import { InspectorPanel } from './InspectorPanel';
import { PromptGeneratorModal } from './PromptGeneratorModal';

export function ElementInspector(): React.ReactElement | null {
  const inspector = useElementInspector();

  // Don't render if dev tools are disabled
  if (!SHOW_DEV_TOOLS) {
    return null;
  }

  return (
    <>
      {/* Toggle Button - positioned next to Debug button */}
      <InspectorButton
        isActive={inspector.isActive}
        onClick={inspector.toggleInspectMode}
        selectedCount={inspector.selectedElements.length}
      />

      {/* Overlay for hover/click detection */}
      {inspector.isActive && (
        <InspectorOverlay
          hoveredElement={inspector.hoveredElement}
          selectedElements={inspector.selectedElements}
          onHover={inspector.setHoveredElement}
          onSelect={inspector.toggleElementSelection}
        />
      )}

      {/* Side Panel with selection details and input */}
      {inspector.isActive && (
        <InspectorPanel
          selectedElements={inspector.selectedElements}
          problemDescription={inspector.problemDescription}
          desiredChange={inspector.desiredChange}
          onProblemDescriptionChange={inspector.setProblemDescription}
          onDesiredChangeChange={inspector.setDesiredChange}
          onRemoveElement={inspector.removeSelectedElement}
          onClearAll={inspector.clearAllSelections}
          onGeneratePrompt={inspector.generatePrompt}
          onClose={inspector.toggleInspectMode}
        />
      )}

      {/* Prompt Generation Modal */}
      <PromptGeneratorModal
        isOpen={inspector.isPromptModalOpen}
        prompt={inspector.generatedPrompt}
        onClose={() => inspector.setPromptModalOpen(false)}
        onCopy={inspector.copyPromptToClipboard}
      />
    </>
  );
}

export default ElementInspector;
