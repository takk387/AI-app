'use client';

import type { DesignOption } from './DesignOptionsPanel';

interface OptionCardProps {
  /** The design option to display */
  option: DesignOption;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when the option is clicked */
  onClick: () => void;
  /** Optional index for display */
  index?: number;
}

/**
 * OptionCard Component
 *
 * Displays a single design option with preview and description.
 * Used in the design options carousel.
 */
export function OptionCard({ option, isSelected, onClick, index }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg overflow-hidden transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900'
          : 'hover:ring-1 hover:ring-slate-600'
      }`}
    >
      {/* Preview area */}
      <div className="bg-slate-800 aspect-video relative overflow-hidden">
        {option.thumbnail ? (
          <img
            src={option.thumbnail}
            alt={option.description}
            className="w-full h-full object-cover"
          />
        ) : option.preview ? (
          <div
            className="w-full h-full overflow-hidden text-xs"
            dangerouslySetInnerHTML={{ __html: option.preview }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-400">
                  {index !== undefined ? String.fromCharCode(65 + index) : '?'}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Option {index !== undefined ? index + 1 : ''}
              </p>
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="p-3 bg-slate-800/50">
        <h4 className="font-medium text-white text-sm truncate">{option.description}</h4>
        {Object.keys(option.changes).length > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            {Object.keys(option.changes).length} change
            {Object.keys(option.changes).length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </button>
  );
}

export default OptionCard;
