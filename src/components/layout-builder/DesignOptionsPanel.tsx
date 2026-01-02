'use client';

import { useState, useCallback } from 'react';
import type { LayoutDesign } from '@/types/layoutDesign';

/**
 * A single design option/variation
 */
export interface DesignOption {
  id: string;
  /** Human-readable description (e.g., "Clean and minimal") */
  description: string;
  /** Preview HTML for rendering */
  preview?: string;
  /** The design changes this option would apply */
  changes: Partial<LayoutDesign>;
  /** Optional thumbnail image */
  thumbnail?: string;
}

interface DesignOptionsPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Available design options to display */
  options: DesignOption[];
  /** Currently selected option index */
  selectedIndex: number;
  /** Callback when an option is selected */
  onSelect: (option: DesignOption) => void;
  /** Callback to close the panel */
  onClose: () => void;
  /** Whether options are being generated */
  isGenerating?: boolean;
  /** Title for the options panel */
  title?: string;
}

/**
 * DesignOptionsPanel Component
 *
 * A slide-over panel with carousel navigation showing 2-3 AI-generated
 * design variations. Users can navigate through options and apply one.
 */
export function DesignOptionsPanel({
  isOpen,
  options,
  selectedIndex: initialSelectedIndex,
  onSelect,
  onClose,
  isGenerating = false,
  title = 'Design Options',
}: DesignOptionsPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

  // Navigate to previous option
  const handlePrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
  }, [options.length]);

  // Navigate to next option
  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
  }, [options.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (options[selectedIndex]) {
          onSelect(options[selectedIndex]);
        }
      }
    },
    [handlePrevious, handleNext, onClose, onSelect, options, selectedIndex]
  );

  if (!isOpen) return null;

  const currentOption = options[selectedIndex];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 w-[500px] max-w-full bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {options.length > 0 && (
              <p className="text-sm text-slate-400">
                Option {selectedIndex + 1} of {options.length}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-300">Generating design options...</p>
            </div>
          ) : options.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <svg
                className="w-16 h-16 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <div>
                <p className="text-slate-300 font-medium">No options available</p>
                <p className="text-slate-500 text-sm">
                  Ask the AI for design suggestions to see options here.
                </p>
              </div>
            </div>
          ) : currentOption ? (
            <div className="space-y-4">
              {/* Option preview */}
              <div className="bg-slate-800 rounded-lg overflow-hidden">
                {currentOption.thumbnail ? (
                  <img
                    src={currentOption.thumbnail}
                    alt={currentOption.description}
                    className="w-full h-64 object-cover"
                  />
                ) : currentOption.preview ? (
                  <div
                    className="w-full h-64 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: currentOption.preview }}
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center bg-slate-700">
                    <div className="text-center">
                      <svg
                        className="w-12 h-12 mx-auto text-slate-500 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-slate-400 text-sm">Preview not available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Option description */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">
                  Option {selectedIndex + 1}: {currentOption.description}
                </h3>
                {Object.keys(currentOption.changes).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Changes included:
                    </p>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {Object.keys(currentOption.changes).map((key) => (
                        <li key={key} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Navigation dots */}
              <div className="flex justify-center gap-2">
                {options.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === selectedIndex
                        ? 'bg-blue-500 scale-125'
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                    aria-label={`Go to option ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer with navigation and apply button */}
        {options.length > 0 && (
          <div className="p-4 border-t border-slate-700 flex items-center justify-between">
            {/* Navigation arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={options.length <= 1}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous option"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={options.length <= 1}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next option"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              <span className="text-sm text-slate-400 ml-2">
                Use <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">←</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">→</kbd> to navigate
              </span>
            </div>

            {/* Apply button */}
            <button
              type="button"
              onClick={() => currentOption && onSelect(currentOption)}
              disabled={!currentOption}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Apply This
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default DesignOptionsPanel;
