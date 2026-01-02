'use client';

import type { ElementType } from '@/types/layoutDesign';
import { getQuickActionsForElement, type QuickAction } from '@/data/elementQuickActions';

interface SuggestedAction {
  label: string;
  action: string;
}

interface SuggestedActionsBarProps {
  /** Pre-defined actions to display */
  actions?: SuggestedAction[];
  /** Callback when an action is clicked */
  onAction: (action: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Element type for context-aware quick actions (Click + Talk mode) */
  elementType?: ElementType;
  /** Optional selected element ID for context */
  selectedElementId?: string;
}

/**
 * Suggested actions bar for wizard conversation
 *
 * When elementType is provided, displays context-aware quick actions
 * based on the selected element type from elementQuickActions.ts.
 * Otherwise, displays the passed actions array.
 */
export function SuggestedActionsBar({
  actions = [],
  onAction,
  disabled = false,
  elementType,
  selectedElementId,
}: SuggestedActionsBarProps) {
  // Get element-specific quick actions if elementType is provided
  const elementActions: QuickAction[] = elementType ? getQuickActionsForElement(elementType) : [];

  // Combine: element-specific actions take priority when an element is selected
  const displayActions: Array<SuggestedAction | QuickAction> =
    elementType && elementActions.length > 0 ? elementActions : actions;

  if (displayActions.length === 0) return null;

  // Helper to get action string from either SuggestedAction or QuickAction
  const getActionString = (action: SuggestedAction | QuickAction): string => {
    // QuickAction uses 'prompt', SuggestedAction uses 'action'
    if ('prompt' in action) {
      // Add element context to the prompt if we have a selected element
      return selectedElementId ? `[Element: ${selectedElementId}] ${action.prompt}` : action.prompt;
    }
    return action.action;
  };

  return (
    <div className="px-6 py-2 flex flex-wrap gap-2">
      {elementType && (
        <span className="flex items-center text-xs text-zinc-500 mr-2">{elementType}:</span>
      )}
      {displayActions.map((action) => (
        <button
          key={'prompt' in action ? action.prompt : action.action}
          onClick={() => onAction(getActionString(action))}
          disabled={disabled}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default SuggestedActionsBar;
