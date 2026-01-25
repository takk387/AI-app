'use client';

/**
 * LayerPanel Component
 *
 * Visual layer stack for z-index management with drag-and-drop reordering,
 * visibility toggles, and layer grouping.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  type LayerDefinition,
  type LayerGroup,
  LAYER_GROUP_INFO,
  DEFAULT_LAYERS,
  sortLayersByZIndex,
  groupLayers,
  toggleLayerVisibility,
  toggleLayerLock,
  updateLayer,
  removeLayer,
  addLayer,
  findZIndexConflicts,
} from '@/utils/layerUtils';

// ============================================================================
// TYPES
// ============================================================================

interface LayerPanelProps {
  layers?: LayerDefinition[];
  selectedLayerId?: string | null;
  onSelect?: (id: string) => void;
  onChange?: (layers: LayerDefinition[]) => void;
  className?: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LayerGroupHeader({
  group,
  isExpanded,
  onToggle,
  layerCount,
  showUseCases,
}: {
  group: LayerGroup;
  isExpanded: boolean;
  onToggle: () => void;
  layerCount: number;
  showUseCases: boolean;
}) {
  const info = LAYER_GROUP_INFO[group];

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700/50 transition-colors"
    >
      <svg
        className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
      <span className="text-xs font-medium text-slate-300">
        {showUseCases ? info.useCase : info.name}
      </span>
      <span className="text-[10px] text-slate-500 ml-auto">
        z: {info.zRange[0]}-{info.zRange[1]}
      </span>
      <span className="text-[10px] text-slate-600">({layerCount})</span>
    </button>
  );
}

function LayerItem({
  layer,
  isSelected,
  isDragging,
  onSelect,
  onVisibilityToggle,
  onLockToggle,
  onZIndexChange,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  layer: LayerDefinition;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
  onZIndexChange: (zIndex: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(layer.zIndex));
  const groupInfo = LAYER_GROUP_INFO[layer.group];

  const handleEditSubmit = () => {
    const newValue = parseInt(editValue);
    if (!isNaN(newValue)) {
      onZIndexChange(newValue);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all
        ${isSelected ? 'bg-garden-500/20 border-l-2 border-garden-500' : 'hover:bg-slate-700/50 border-l-2 border-transparent'}
        ${isDragging ? 'opacity-50' : ''}
        ${layer.locked ? 'opacity-70' : ''}
      `}
      onClick={onSelect}
      draggable={!layer.locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag handle */}
      <div className="cursor-move text-slate-600 hover:text-slate-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </div>

      {/* Visibility toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVisibilityToggle();
        }}
        className={`text-xs ${layer.visible ? 'text-slate-400' : 'text-slate-600'}`}
        title={layer.visible ? 'Hide layer' : 'Show layer'}
      >
        {layer.visible ? '👁️' : '👁️‍🗨️'}
      </button>

      {/* Layer color indicator */}
      <span className="w-1.5 h-4 rounded-sm" style={{ backgroundColor: groupInfo.color }} />

      {/* Layer name */}
      <span
        className={`flex-1 text-xs truncate ${layer.visible ? 'text-slate-300' : 'text-slate-500'}`}
      >
        {layer.name}
      </span>

      {/* Z-index */}
      {isEditing ? (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="w-12 px-1 py-0.5 text-[10px] bg-slate-700 border border-slate-600 rounded text-slate-200 text-center"
        />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditValue(String(layer.zIndex));
            setIsEditing(true);
          }}
          className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          z:{layer.zIndex}
        </button>
      )}

      {/* Lock toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLockToggle();
        }}
        className={`text-xs ${layer.locked ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'}`}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {layer.locked ? '🔒' : '🔓'}
      </button>

      {/* Remove button */}
      {!layer.locked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-slate-600 hover:text-error-400 transition-colors"
          title="Remove layer"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function AddLayerForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, group: LayerGroup, zIndex: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<LayerGroup>('content');
  const [zIndex, setZIndex] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), group, zIndex);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3"
    >
      <div>
        <label className="block text-xs text-slate-400 mb-1">Layer Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Drawer"
          className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 focus:border-garden-500 focus:outline-none"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Group</label>
          <select
            value={group}
            onChange={(e) => {
              const newGroup = e.target.value as LayerGroup;
              setGroup(newGroup);
              setZIndex(LAYER_GROUP_INFO[newGroup].zRange[0]);
            }}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200"
          >
            {Object.entries(LAYER_GROUP_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Z-Index</label>
          <input
            type="number"
            value={zIndex}
            onChange={(e) => setZIndex(parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-3 py-1.5 text-xs bg-garden-600 text-white rounded hover:bg-garden-500 transition-colors"
        >
          Add Layer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LayerPanel({
  layers: initialLayers,
  selectedLayerId,
  onSelect,
  onChange,
  className = '',
}: LayerPanelProps) {
  const [layers, setLayers] = useState<LayerDefinition[]>(initialLayers || DEFAULT_LAYERS);
  const [expandedGroups, setExpandedGroups] = useState<Set<LayerGroup>>(
    new Set(['content', 'overlay', 'modal'])
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUseCases, setShowUseCases] = useState(true); // Default to friendly names for new users

  // Group layers
  const groupedLayers = useMemo(() => groupLayers(layers), [layers]);

  // Check for conflicts
  const conflicts = useMemo(() => findZIndexConflicts(layers), [layers]);

  // Notify parent of changes
  const updateLayers = useCallback(
    (newLayers: LayerDefinition[]) => {
      setLayers(newLayers);
      onChange?.(newLayers);
    },
    [onChange]
  );

  // Toggle group expansion
  const toggleGroup = (group: LayerGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  // Handlers
  const handleVisibilityToggle = useCallback(
    (layerId: string) => {
      updateLayers(toggleLayerVisibility(layers, layerId));
    },
    [layers, updateLayers]
  );

  const handleLockToggle = useCallback(
    (layerId: string) => {
      updateLayers(toggleLayerLock(layers, layerId));
    },
    [layers, updateLayers]
  );

  const handleZIndexChange = useCallback(
    (layerId: string, zIndex: number) => {
      updateLayers(updateLayer(layers, layerId, { zIndex }));
    },
    [layers, updateLayers]
  );

  const handleRemove = useCallback(
    (layerId: string) => {
      updateLayers(removeLayer(layers, layerId));
    },
    [layers, updateLayers]
  );

  const handleAddLayer = useCallback(
    (name: string, group: LayerGroup, zIndex: number) => {
      updateLayers(
        addLayer(layers, {
          name,
          group,
          zIndex,
          visible: true,
          locked: false,
          cssVariable: `--z-${name.toLowerCase().replace(/\s+/g, '-')}`,
        })
      );
      setShowAddForm(false);
    },
    [layers, updateLayers]
  );

  // Drag and drop handlers
  const handleDragStart = (layerId: string) => {
    setDraggingId(layerId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggingId || draggingId === targetId) return;

      const dragLayer = layers.find((l) => l.id === draggingId);
      const targetLayer = layers.find((l) => l.id === targetId);

      if (dragLayer && targetLayer) {
        // Swap z-indices
        const newLayers = layers.map((layer) => {
          if (layer.id === draggingId) {
            return { ...layer, zIndex: targetLayer.zIndex };
          }
          if (layer.id === targetId) {
            return { ...layer, zIndex: dragLayer.zIndex };
          }
          return layer;
        });
        updateLayers(sortLayersByZIndex(newLayers));
      }
    },
    [draggingId, layers, updateLayers]
  );

  const groupOrder: LayerGroup[] = ['tooltip', 'toast', 'modal', 'overlay', 'content', 'base'];

  return (
    <div className={`bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Layers</span>
          <span className="text-xs text-slate-500">({layers.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Use Case / Technical Toggle */}
          <button
            onClick={() => setShowUseCases(!showUseCases)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              showUseCases
                ? 'bg-gold-600/30 text-gold-300 hover:bg-gold-600/40'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title={showUseCases ? 'Show technical names' : 'Show use cases'}
          >
            {showUseCases ? 'Use Cases' : 'Technical'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs px-2 py-1 rounded bg-garden-600 text-white hover:bg-garden-500 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Conflicts warning */}
      {conflicts.length > 0 && (
        <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <span>⚠️</span>
            <span>{conflicts.length} z-index conflict(s) detected</span>
          </div>
        </div>
      )}

      {/* Add layer form */}
      {showAddForm && (
        <div className="p-2 border-b border-slate-700">
          <AddLayerForm onAdd={handleAddLayer} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {/* Layer list */}
      <div className="max-h-80 overflow-y-auto">
        {groupOrder.map((group) => {
          const groupLayerList = groupedLayers.get(group) || [];
          if (groupLayerList.length === 0) return null;

          return (
            <div key={group} className="border-b border-slate-700/50 last:border-b-0">
              <LayerGroupHeader
                group={group}
                isExpanded={expandedGroups.has(group)}
                onToggle={() => toggleGroup(group)}
                layerCount={groupLayerList.length}
                showUseCases={showUseCases}
              />
              {expandedGroups.has(group) && (
                <div className="pl-2">
                  {groupLayerList.map((layer) => (
                    <LayerItem
                      key={layer.id}
                      layer={layer}
                      isSelected={selectedLayerId === layer.id}
                      isDragging={draggingId === layer.id}
                      onSelect={() => onSelect?.(layer.id)}
                      onVisibilityToggle={() => handleVisibilityToggle(layer.id)}
                      onLockToggle={() => handleLockToggle(layer.id)}
                      onZIndexChange={(z) => handleZIndexChange(layer.id, z)}
                      onRemove={() => handleRemove(layer.id)}
                      onDragStart={() => handleDragStart(layer.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(layer.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-500">
        Drag layers to reorder • Click z-index to edit
      </div>
    </div>
  );
}

export default LayerPanel;
