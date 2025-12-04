'use client';

import React from 'react';
import { MessageIcon, CodeIcon, EyeIcon, ColumnsIcon } from '../ui/Icons';

type ViewMode = 'chat' | 'code' | 'preview' | 'split';

interface ViewModeToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const viewModes: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
  { id: 'chat', icon: <MessageIcon size={16} />, label: 'Chat' },
  { id: 'code', icon: <CodeIcon size={16} />, label: 'Code' },
  { id: 'preview', icon: <EyeIcon size={16} />, label: 'Preview' },
  { id: 'split', icon: <ColumnsIcon size={16} />, label: 'Split' },
];

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex items-center bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
      {viewModes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onViewChange(mode.id)}
          className={`
            px-2.5 py-1.5 rounded text-sm flex items-center gap-1.5 transition-colors
            ${
              currentView === mode.id
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }
          `}
          title={mode.label}
          aria-label={mode.label}
          aria-pressed={currentView === mode.id}
        >
          {mode.icon}
          <span className="hidden lg:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeToggle;
