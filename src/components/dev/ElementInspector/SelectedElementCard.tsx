'use client';

/**
 * SelectedElementCard - Card showing info about a selected element
 */

import React, { useState } from 'react';
import type { InspectedElement } from '@/types/elementInspector';

interface SelectedElementCardProps {
  element: InspectedElement;
  index: number;
  onRemove: () => void;
}

export function SelectedElementCard({
  element,
  index,
  onRemove,
}: SelectedElementCardProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 text-xs rounded-full">
            {index}
          </span>
          <span className="text-sm text-white truncate font-mono">{element.displayName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
          </button>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Remove"
          >
            <span className="text-red-400 text-xs">✕</span>
          </button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="px-3 py-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Tag:</span>
          <code className="text-cyan-400">&lt;{element.tagName}&gt;</code>
        </div>

        {element.reactComponentName && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Component:</span>
            <code className="text-purple-400">{element.reactComponentName}</code>
          </div>
        )}

        {element.classNames.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 flex-shrink-0">Classes:</span>
            <code className="text-yellow-400 break-all">
              {element.classNames.slice(0, 3).join(' ')}
              {element.classNames.length > 3 && ` +${element.classNames.length - 3}`}
            </code>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-gray-700 text-xs space-y-2">
          {/* Selector Path */}
          <div>
            <span className="text-gray-500 block mb-1">Selector:</span>
            <code className="text-green-400 block bg-gray-900 px-2 py-1 rounded text-[10px] break-all">
              {element.selectorPath}
            </code>
          </div>

          {/* Source File Guesses */}
          {element.guessedSourceFiles.length > 0 && (
            <div>
              <span className="text-gray-500 block mb-1">Likely files:</span>
              <div className="space-y-0.5">
                {element.guessedSourceFiles.slice(0, 3).map((file, i) => (
                  <code key={i} className="text-blue-400 block text-[10px]">
                    {file}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Key Styles */}
          <div>
            <span className="text-gray-500 block mb-1">Key styles:</span>
            <div className="bg-gray-900 px-2 py-1 rounded text-[10px] text-gray-300 font-mono">
              {element.computedStyles.display !== 'block' && (
                <div>display: {element.computedStyles.display}</div>
              )}
              <div>
                size: {element.computedStyles.width} × {element.computedStyles.height}
              </div>
              <div>color: {element.computedStyles.color}</div>
              {element.computedStyles.backgroundColor !== 'transparent' && (
                <div>bg: {element.computedStyles.backgroundColor}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectedElementCard;
