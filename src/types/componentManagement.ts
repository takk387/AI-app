/**
 * Component Management Types
 *
 * Types for the component tree panel and grouping system (Gap 4).
 * Used by ComponentTreePanel and ComponentGroupManager.
 */

/** Node state in the component tree UI */
export interface TreeNodeState {
  /** Whether children are expanded (for containers) */
  expanded: boolean;
  /** Whether the rename input is active */
  isRenaming: boolean;
}

/** Map of component ID to tree node UI state */
export type TreeStateMap = Record<string, TreeNodeState>;

/** Context menu action for a tree node */
export type TreeNodeAction =
  | 'rename'
  | 'delete'
  | 'duplicate'
  | 'group'
  | 'ungroup'
  | 'select-children'
  | 'move-up'
  | 'move-down';
