'use client';

import { useState, useCallback } from 'react';
import type { ElementInteractions } from '@/types/layoutDesign';
import { loadingPresets, type InteractionPreset } from '@/data/interactionPresets';

interface StateEditorProps {
  /** Current interactions configuration */
  interactions?: ElementInteractions;
  /** Callback when interactions change */
  onChange: (interactions: ElementInteractions) => void;
  /** Element being edited */
  elementId: string;
  /** Optional class name */
  className?: string;
}

type StateType = 'focus' | 'disabled' | 'loading';

/**
 * StateEditor Component
 *
 * Allows editing focus, disabled, and loading states for an element.
 */
export function StateEditor({
  interactions = {},
  onChange,
  elementId,
  className = '',
}: StateEditorProps) {
  const [activeState, setActiveState] = useState<StateType>('focus');
  const [previewState, setPreviewState] = useState<StateType | null>(null);

  // Update a specific state
  const updateState = useCallback(
    (state: StateType, value: ElementInteractions[StateType]) => {
      onChange({
        ...interactions,
        [state]: value,
      });
    },
    [interactions, onChange]
  );

  // Clear a state
  const clearState = useCallback(
    (state: StateType) => {
      const updated = { ...interactions };
      delete updated[state];
      onChange(updated);
    },
    [interactions, onChange]
  );

  // Apply loading preset
  const applyLoadingPreset = useCallback(
    (preset: InteractionPreset) => {
      if (preset.interactions.loading) {
        updateState('loading', preset.interactions.loading);
      }
    },
    [updateState]
  );

  // Render focus state editor
  const renderFocusEditor = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Configure how the element appears when focused (keyboard navigation).
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ring Style</label>
          <select
            value={interactions.focus?.ring || 'default'}
            onChange={(e) =>
              updateState('focus', {
                ...interactions.focus,
                ring: e.target.value,
              })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="default">Default Browser</option>
            <option value="ring-2 ring-blue-500">Blue Ring</option>
            <option value="ring-2 ring-offset-2 ring-blue-500">Blue Ring with Offset</option>
            <option value="ring-2 ring-green-500">Green Ring</option>
            <option value="ring-2 ring-purple-500">Purple Ring</option>
            <option value="none">No Ring (not recommended)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Border Color</label>
          <input
            type="color"
            value={interactions.focus?.borderColor || '#3B82F6'}
            onChange={(e) =>
              updateState('focus', {
                ...interactions.focus,
                borderColor: e.target.value,
              })
            }
            className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        {interactions.focus && Object.keys(interactions.focus).length > 0 && (
          <button
            type="button"
            onClick={() => clearState('focus')}
            className="w-full px-3 py-2 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
          >
            Clear Focus State
          </button>
        )}
      </div>
    </div>
  );

  // Render disabled state editor
  const renderDisabledEditor = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Configure how the element appears when disabled.</p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Opacity ({((interactions.disabled?.opacity ?? 0.5) * 100).toFixed(0)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={interactions.disabled?.opacity ?? 0.5}
            onChange={(e) =>
              updateState('disabled', {
                ...interactions.disabled,
                opacity: parseFloat(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Cursor</label>
          <select
            value={interactions.disabled?.cursor || 'not-allowed'}
            onChange={(e) =>
              updateState('disabled', {
                ...interactions.disabled,
                cursor: e.target.value,
              })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="not-allowed">Not Allowed</option>
            <option value="default">Default</option>
            <option value="wait">Wait</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Filter Effect</label>
          <select
            value={interactions.disabled?.filter || 'none'}
            onChange={(e) =>
              updateState('disabled', {
                ...interactions.disabled,
                filter: e.target.value === 'none' ? undefined : e.target.value,
              })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="none">None</option>
            <option value="grayscale(100%)">Grayscale</option>
            <option value="grayscale(50%)">Partial Grayscale</option>
            <option value="blur(2px)">Blur</option>
          </select>
        </div>

        {interactions.disabled && Object.keys(interactions.disabled).length > 0 && (
          <button
            type="button"
            onClick={() => clearState('disabled')}
            className="w-full px-3 py-2 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
          >
            Clear Disabled State
          </button>
        )}
      </div>
    </div>
  );

  // Render loading state editor
  const renderLoadingEditor = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Configure how the element appears when loading.</p>

      <h4 className="text-sm font-medium text-slate-300">Presets</h4>
      <div className="grid grid-cols-2 gap-2">
        {loadingPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyLoadingPreset(preset)}
            className={`p-3 text-left rounded-lg border transition-colors ${
              interactions.loading?.type === preset.interactions.loading?.type
                ? 'bg-blue-900/30 border-blue-500'
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <div className="font-medium text-white text-sm">{preset.name}</div>
            <div className="text-xs text-slate-400 mt-1">{preset.description}</div>
          </button>
        ))}
      </div>

      {interactions.loading && (
        <div className="space-y-3 pt-3 border-t border-slate-700">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Size</label>
            <select
              value={interactions.loading.size || 'md'}
              onChange={(e) =>
                updateState('loading', {
                  type: interactions.loading?.type || 'spinner',
                  ...interactions.loading,
                  size: e.target.value as 'sm' | 'md' | 'lg',
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>

          {interactions.loading.type === 'spinner' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Color</label>
              <input
                type="color"
                value={interactions.loading.color || '#3B82F6'}
                onChange={(e) =>
                  updateState('loading', {
                    type: interactions.loading?.type || 'spinner',
                    ...interactions.loading,
                    color: e.target.value,
                  })
                }
                className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => clearState('loading')}
            className="w-full px-3 py-2 text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
          >
            Clear Loading State
          </button>
        </div>
      )}
    </div>
  );

  const states: { id: StateType; label: string; color: string }[] = [
    { id: 'focus', label: 'Focus', color: 'blue' },
    { id: 'disabled', label: 'Disabled', color: 'slate' },
    { id: 'loading', label: 'Loading', color: 'yellow' },
  ];

  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-medium text-white">Element States</h3>
        <p className="text-xs text-slate-400 mt-0.5">{elementId}</p>
      </div>

      {/* State Tabs */}
      <div className="flex border-b border-slate-700">
        {states.map((state) => (
          <button
            key={state.id}
            type="button"
            onClick={() => setActiveState(state.id)}
            onMouseEnter={() => setPreviewState(state.id)}
            onMouseLeave={() => setPreviewState(null)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeState === state.id
                ? `text-${state.color}-400 border-b-2 border-${state.color}-400`
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {state.label}
            {interactions[state.id] && (
              <span className="ml-1.5 w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeState === 'focus' && renderFocusEditor()}
        {activeState === 'disabled' && renderDisabledEditor()}
        {activeState === 'loading' && renderLoadingEditor()}
      </div>
    </div>
  );
}

export default StateEditor;
