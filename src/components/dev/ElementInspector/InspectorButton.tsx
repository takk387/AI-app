'use client';

/**
 * InspectorButton - Toggle button for the Element Inspector
 * Positioned next to the existing Debug button in bottom-right corner.
 */

import React from 'react';

interface InspectorButtonProps {
  isActive: boolean;
  onClick: () => void;
  selectedCount: number;
}

export function InspectorButton({
  isActive,
  onClick,
  selectedCount,
}: InspectorButtonProps): React.ReactElement {
  const handleClick = () => {
    // eslint-disable-next-line no-console
    console.log('[InspectorButton] Clicked! Current isActive:', isActive);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      data-inspector-button
      className={`
        fixed bottom-4 right-4 z-[9999]
        px-3 py-2 rounded-lg shadow-lg
        font-mono text-sm transition-all
        ${
          isActive
            ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/50'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }
      `}
      title={isActive ? 'Exit Inspect Mode (Esc)' : 'Enter Inspect Mode'}
    >
      <span className="mr-1">{isActive ? '🎯' : '🔍'}</span>
      <span>Inspect</span>
      {selectedCount > 0 && (
        <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/30 rounded text-xs">{selectedCount}</span>
      )}
    </button>
  );
}

export default InspectorButton;
