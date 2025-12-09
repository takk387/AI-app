'use client';

import type { SuggestedAction } from '@/types/layoutDesign';

interface SuggestedActionsBarProps {
  actions: SuggestedAction[];
  onAction: (action: string) => void;
}

/**
 * Suggested actions bar
 */
export function SuggestedActionsBar({ actions, onAction }: SuggestedActionsBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-700">
      {actions.map((action) => (
        <button
          key={action.action}
          onClick={() => onAction(action.action)}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default SuggestedActionsBar;
