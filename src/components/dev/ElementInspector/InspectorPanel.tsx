'use client';

/**
 * InspectorPanel - Side panel showing selection details and input areas
 */

import React from 'react';
import type { InspectedElement } from '@/types/elementInspector';
import { SelectedElementCard } from './SelectedElementCard';

interface InspectorPanelProps {
  selectedElements: InspectedElement[];
  problemDescription: string;
  desiredChange: string;
  onProblemDescriptionChange: (text: string) => void;
  onDesiredChangeChange: (text: string) => void;
  onRemoveElement: (id: string) => void;
  onClearAll: () => void;
  onGeneratePrompt: () => void;
  onClose: () => void;
}

export function InspectorPanel({
  selectedElements,
  problemDescription,
  desiredChange,
  onProblemDescriptionChange,
  onDesiredChangeChange,
  onRemoveElement,
  onClearAll,
  onGeneratePrompt,
  onClose,
}: InspectorPanelProps): React.ReactElement {
  return (
    <div
      data-inspector-panel
      className="fixed top-4 left-4 bottom-4 w-96 z-[9999] bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <h2 className="font-semibold text-white">Element Inspector</h2>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
            {selectedElements.length} selected
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Close (Esc)"
        >
          <span className="text-gray-400 hover:text-white">✕</span>
        </button>
      </div>

      {/* Selected Elements */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Selected Elements
          </span>
          {selectedElements.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {selectedElements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Click on elements in the page to select them</p>
            <p className="text-xs mt-2">Click again to deselect</p>
          </div>
        ) : (
          selectedElements.map((element, index) => (
            <SelectedElementCard
              key={element.id}
              element={element}
              index={index + 1}
              onRemove={() => onRemoveElement(element.id)}
            />
          ))
        )}
      </div>

      {/* Input Areas */}
      <div className="p-4 border-t border-gray-700 space-y-4">
        {/* Problem Description */}
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-2">
            What&apos;s the problem?
          </label>
          <textarea
            value={problemDescription}
            onChange={(e) => onProblemDescriptionChange(e.target.value)}
            placeholder="Describe what's wrong with these elements..."
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        {/* Desired Change */}
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-2">
            What do you want changed?
          </label>
          <textarea
            value={desiredChange}
            onChange={(e) => onDesiredChangeChange(e.target.value)}
            placeholder="Describe the desired outcome..."
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('[InspectorPanel] Generate button clicked!');
            onGeneratePrompt();
          }}
          disabled={selectedElements.length === 0}
          className={`
            w-full py-3 rounded-lg font-medium transition-all
            ${selectedElements.length > 0
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Generate Claude Prompt
        </button>
      </div>
    </div>
  );
}

export default InspectorPanel;
