'use client';

/**
 * Component Tree Panel
 *
 * Collapsible tree view of the component hierarchy.
 * Syncs selection with canvas, provides visibility/lock toggles,
 * and supports grouping/ungrouping operations.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  Box,
  Type,
  Image,
  MousePointer,
  LayoutGrid,
  Menu,
  Star,
  Circle,
  Square,
  Minus,
  Trash2,
  Copy,
  Group,
} from 'lucide-react';
import type { DetectedComponentEnhanced } from '@/types/layoutDesign';
import type { TreeStateMap } from '@/types/componentManagement';
import { buildComponentTree } from '@/utils/layoutValidation';

// ============================================================================
// TYPES
// ============================================================================

interface ComponentTreePanelProps {
  components: DetectedComponentEnhanced[];
  selectedId: string | null;
  onSelectComponent: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onGroupComponents?: (ids: string[]) => void;
  onUngroupComponent?: (id: string) => void;
  onRenameComponent?: (id: string, name: string) => void;
}

// ============================================================================
// ICON MAP
// ============================================================================

const COMPONENT_TYPE_ICONS: Record<string, React.ElementType> = {
  header: Menu,
  sidebar: LayoutGrid,
  hero: Star,
  cards: LayoutGrid,
  navigation: Menu,
  footer: Minus,
  form: Square,
  button: MousePointer,
  input: Type,
  image: Image,
  'image-gallery': Image,
  logo: Circle,
  'content-section': Box,
  text: Type,
  list: Menu,
  modal: Square,
  unknown: Box,
};

function getComponentIcon(type: string): React.ElementType {
  return COMPONENT_TYPE_ICONS[type] || Box;
}

// ============================================================================
// TREE NODE
// ============================================================================

interface TreeNodeProps {
  component: DetectedComponentEnhanced;
  componentMap: Map<string, DetectedComponentEnhanced>;
  depth: number;
  selectedId: string | null;
  treeState: TreeStateMap;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onContextAction: (id: string, action: string) => void;
  renamingId: string | null;
  renameValue: string;
  onRenameStart: (id: string, currentName: string) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: (id: string) => void;
  onRenameCancel: () => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  component,
  componentMap,
  depth,
  selectedId,
  treeState,
  onToggleExpand,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onContextAction,
  renamingId,
  renameValue,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}) => {
  const { id, type, children, role, visible, locked, displayName, sourceId } = component;
  const isSelected = id === selectedId;
  const isContainer = role === 'container' || (children && children.length > 0);
  const isExpanded = treeState[id]?.expanded ?? true;
  const isVisible = visible !== false;
  const isLocked = locked === true;
  const isRenaming = renamingId === id;

  const Icon = getComponentIcon(type);
  const label = displayName || type;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRenameStart(id, label);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Simple context actions via keyboard shortcuts for now
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isRenaming) {
      if (e.key === 'Enter') {
        onRenameCommit(id);
      } else if (e.key === 'Escape') {
        onRenameCancel();
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      onContextAction(id, 'delete');
    } else if (e.key === 'F2') {
      onRenameStart(id, label);
    }
  };

  // Get child components in order
  const childComponents = useMemo(() => {
    if (!children || !isExpanded) return [];
    return children
      .map((childId) => componentMap.get(childId))
      .filter(Boolean) as DetectedComponentEnhanced[];
  }, [children, isExpanded, componentMap]);

  return (
    <div onContextMenu={handleContextMenu}>
      {/* Node Row */}
      <div
        className={`
          flex items-center gap-1 px-2 py-1 cursor-pointer text-xs
          hover:bg-gray-100 transition-colors group
          ${isSelected ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-gray-700'}
          ${!isVisible ? 'opacity-40' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isContainer ? isExpanded : undefined}
      >
        {/* Expand/Collapse Toggle */}
        {isContainer ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(id);
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Component Icon */}
        <Icon
          size={14}
          className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
        />

        {/* Label / Rename Input */}
        {isRenaming ? (
          <input
            className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 outline-none min-w-0"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={() => onRenameCommit(id)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate min-w-0" title={`${type} (${id})`}>
            {label}
          </span>
        )}

        {/* Source Badge */}
        {sourceId && (
          <span
            className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-600 flex-shrink-0"
            title={`Source: ${sourceId}`}
          >
            S
          </span>
        )}

        {/* Action Buttons (visible on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(id);
            }}
            title={isVisible ? 'Hide' : 'Show'}
          >
            {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(id);
            }}
            title={isLocked ? 'Unlock' : 'Lock'}
          >
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      </div>

      {/* Children */}
      {isContainer && isExpanded && childComponents.length > 0 && (
        <div role="group">
          {childComponents.map((child) => (
            <TreeNode
              key={child.id}
              component={child}
              componentMap={componentMap}
              depth={depth + 1}
              selectedId={selectedId}
              treeState={treeState}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onContextAction={onContextAction}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameStart={onRenameStart}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PANEL
// ============================================================================

const ComponentTreePanel: React.FC<ComponentTreePanelProps> = ({
  components,
  selectedId,
  onSelectComponent,
  onToggleVisibility,
  onToggleLock,
  onDeleteComponent,
  onDuplicateComponent,
  onGroupComponents,
  onUngroupComponent,
  onRenameComponent,
}) => {
  const [treeState, setTreeState] = useState<TreeStateMap>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [multiSelect, setMultiSelect] = useState<string[]>([]);

  // Build tree from flat component array
  const { roots, componentMap } = useMemo(() => {
    return buildComponentTree(components);
  }, [components]);

  // Sort roots by vertical position (top → bottom)
  const sortedRoots = useMemo(() => {
    return [...roots].sort((a, b) => (a.bounds?.top ?? 0) - (b.bounds?.top ?? 0));
  }, [roots]);

  const handleToggleExpand = useCallback((id: string) => {
    setTreeState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        expanded: prev[id]?.expanded === false,
        isRenaming: false,
      },
    }));
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectComponent(id);
    },
    [onSelectComponent]
  );

  const handleRenameStart = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const handleRenameCommit = useCallback(
    (id: string) => {
      if (renameValue.trim() && onRenameComponent) {
        onRenameComponent(id, renameValue.trim());
      }
      setRenamingId(null);
      setRenameValue('');
    },
    [renameValue, onRenameComponent]
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const handleContextAction = useCallback(
    (id: string, action: string) => {
      switch (action) {
        case 'delete':
          onDeleteComponent(id);
          break;
        case 'duplicate':
          onDuplicateComponent(id);
          break;
        case 'group':
          if (multiSelect.length >= 2 && onGroupComponents) {
            onGroupComponents(multiSelect);
            setMultiSelect([]);
          }
          break;
        case 'ungroup':
          if (onUngroupComponent) {
            onUngroupComponent(id);
          }
          break;
      }
    },
    [onDeleteComponent, onDuplicateComponent, onGroupComponents, onUngroupComponent, multiSelect]
  );

  // Toolbar actions
  const handleGroupSelected = useCallback(() => {
    if (multiSelect.length >= 2 && onGroupComponents) {
      onGroupComponents(multiSelect);
      setMultiSelect([]);
    }
  }, [multiSelect, onGroupComponents]);

  const handleCollapseAll = useCallback(() => {
    const newState: TreeStateMap = {};
    components.forEach((c) => {
      if (c.children && c.children.length > 0) {
        newState[c.id] = { expanded: false, isRenaming: false };
      }
    });
    setTreeState(newState);
  }, [components]);

  const handleExpandAll = useCallback(() => {
    setTreeState({});
  }, []);

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs p-4">
        <Layers size={24} className="mb-2 opacity-50" />
        <span>No components yet</span>
        <span className="text-[10px] mt-1">Upload media to detect components</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar (header is rendered by parent LayoutBuilderView) */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-100">
        <span className="text-[10px] text-gray-400">{components.length} layers</span>
        <div className="flex items-center gap-0.5">
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            onClick={handleExpandAll}
            title="Expand all"
          >
            <ChevronDown size={12} />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            onClick={handleCollapseAll}
            title="Collapse all"
          >
            <ChevronRight size={12} />
          </button>
          {multiSelect.length >= 2 && onGroupComponents && (
            <button
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100 text-blue-500"
              onClick={handleGroupSelected}
              title="Group selected"
            >
              <Group size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1" role="tree" aria-label="Component tree">
        {sortedRoots.map((root) => (
          <TreeNode
            key={root.id}
            component={root}
            componentMap={componentMap}
            depth={0}
            selectedId={selectedId}
            treeState={treeState}
            onToggleExpand={handleToggleExpand}
            onSelect={handleSelect}
            onToggleVisibility={onToggleVisibility}
            onToggleLock={onToggleLock}
            onContextAction={handleContextAction}
            renamingId={renamingId}
            renameValue={renameValue}
            onRenameStart={handleRenameStart}
            onRenameChange={setRenameValue}
            onRenameCommit={handleRenameCommit}
            onRenameCancel={handleRenameCancel}
          />
        ))}
      </div>

      {/* Footer with selected component info */}
      {selectedId && (
        <div className="border-t border-gray-200 px-3 py-2 text-[10px] text-gray-500">
          <div className="flex items-center justify-between">
            <span className="truncate">{selectedId}</span>
            <div className="flex gap-1">
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => onDuplicateComponent(selectedId)}
                title="Duplicate"
              >
                <Copy size={10} />
              </button>
              <button
                className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                onClick={() => onDeleteComponent(selectedId)}
                title="Delete"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentTreePanel;
